# 02 — Contrat d'API (Google Apps Script)

Source : `Code.gs` (`doGet`, `doPost` et fonctions appelées), côté client `js/donnees.js` (`stateUrl`, `hedgedRead`, `apiGet`, `postJson`, `apiPost`, `fetchAdminState`), `js/reservation.js`, `js/collegue.js` (appels collègue, cités pour la forme des requêtes).
Le backend **n'est pas réécrit** : ce document décrit ce que la version React doit envoyer et savoir interpréter.

## 1. Transport

### 1.1 URL

Une seule URL, celle du déploiement « Application Web » : `APPS_SCRIPT_URL` (se termine par `/exec`). Accès « tout le monde », exécuté « en tant que moi ».

### 1.2 Lecture : `GET`

```
GET {APPS_SCRIPT_URL}
GET {APPS_SCRIPT_URL}?since={encodeURIComponent(etag)}
```
- Aucun en-tête particulier, aucun cookie (`fetch` par défaut, `credentials: 'same-origin'`).
- Seul paramètre lu : `since`.
- Google répond `302` vers `https://script.googleusercontent.com/macros/echo?…` ; `fetch` suit la redirection automatiquement (d'où le `preconnect` vers `script.googleusercontent.com`). Réponse finale `200`, `Content-Type: application/json`, CORS ouvert.

### 1.3 Écriture et lecture collègue : `POST`

```
POST {APPS_SCRIPT_URL}
Content-Type: text/plain;charset=utf-8
Body: JSON.stringify({ action: "<nom>", ...paramètres })
```
- `text/plain` est **obligatoire** : c'est un type « simple » qui évite la requête de pré-vérification CORS (`OPTIONS`), qu'Apps Script ne sait pas traiter. Ne pas utiliser `application/json`.
- Le serveur lit `e.postData.contents` et le parse en JSON ; un corps invalide renvoie `{ "error": "<message de JSON.parse>" }`.
- Apps Script exécute `doPost` puis répond `302` vers une URL `googleusercontent.com` que `fetch` suit en `GET`. La réponse finale est toujours HTTP `200` : **les erreurs métier sont dans le corps** (`{ "error": "…" }`).

### 1.4 Réponse

- Toujours un objet JSON. Erreur : `{ "error": "<message en français>" }` (sauf réponses texte/HTML de Google, § 1.6).
- Après lecture, le client applique `withTicketFlags` à toute réponse contenant `r2Items` (voir `01` § 3.5).

### 1.5 Délais, nouvelles tentatives, lecture doublée

| Opération | Délai d'expiration | Nouvelle tentative | Lecture doublée |
| --- | --- | --- | --- |
| `GET` (état public) | **aucun** (pas d'`AbortController`) | 1 seule, **1500 ms** après l'échec de la 1re, si l'échec est une exception (réseau, JSON invalide) **et** `navigator.onLine` est vrai. Une erreur renvoyée par le script (`data.error`) n'est **pas** retentée. | Oui : si la lecture n'a pas répondu après **6000 ms** (`HEDGE_MS`), une seconde lecture identique part ; la **première réponse réussie** l'emporte ; l'échec n'est retenu que si **toutes** les lectures lancées ont échoué. Chaque tentative peut être doublée (jusqu'à 4 requêtes). |
| `POST` (toute action) | aucun | **jamais** | **jamais** (une écriture n'est jamais rejouée automatiquement) |

Algorithme `hedgedRead(first, since)` à reproduire :
```
left = 1, over = false
watch(p): p.then(v => finish(resolve, v), e => { if (--left === 0) finish(reject, e) })
watch(first)
après 6000 ms, si !over : left++, watch(fetch(stateUrl(since)).then(r => r.json()))
finish(fn, v): si !over → over = true, annuler le minuteur, fn(v)
```
La première lecture de la page est lancée dans le `<head>` (voir `03`) ; `apiGet` la réutilise une seule fois, et seulement si elle a été faite avec le même `since`.

### 1.6 Réponses non JSON de Google

Google renvoie parfois une page HTML passagère (403/404, quota, démarrage). `r.json()` échoue alors (`SyntaxError`) :
- en lecture : traité comme un échec réseau → 2e tentative après 1,5 s ;
- en écriture : l'exception remonte telle quelle et son message brut (en anglais, ex. `Unexpected token '<'…` ou `Failed to fetch`) est affiché dans un toast d'erreur (voir points d'attention).

### 1.7 Verrou et concurrence

Toutes les actions `POST` **sauf** `checkPassword` et `getAdminState` s'exécutent sous `LockService.getScriptLock()` avec `tryLock(20000)`. Si le verrou n'est pas obtenu en 20 s :
```json
{ "error": "Le serveur est très sollicité : réessayez dans quelques secondes." }
```
Les e-mails sont mis en file pendant la requête et envoyés **après** la libération du verrou, avant la réponse : le statut d'e-mail renvoyé est donc définitif.

---

## 2. Mot de passe du mode collègue

- Stocké côté serveur dans la propriété de script `ADMIN_PASSWORD` (jamais dans le code). Sans cette propriété, toute vérification échoue.
- Côté client : saisi dans `#pwdInput`, gardé **en mémoire uniquement** (`adminPassword`), envoyé dans le **corps JSON** (`"password": "…"`) de chaque `POST` collègue. Jamais dans l'URL, jamais dans `localStorage`.
- Comparaison stricte `String(pwd) === ADMIN_PASSWORD`. Échec : `{ "error": "Mot de passe incorrect." }`.
- **Détection d'expiration** (mot de passe changé côté script pendant une session) : dans `postJson`, si `isAdmin` est vrai et que la réponse vaut exactement `error === 'Mot de passe incorrect.'`, le client appelle `adminSessionExpired()` :
  1. `logoutAdmin()` (mode client, mot de passe effacé, rendu) ;
  2. toast d'erreur `Le mot de passe du mode collègue a changé. Reconnectez-vous.` ;
  3. `loadAll(true)` (état public à la place de l'état complet) ;
  4. lève une `Error` portant le même message (l'appelant l'affiche à son tour en toast).
- La déconnexion après 10 min d'inactivité est purement client (`collegue.js`).
- Les réservations publiques (`addBookingR1`, `addBookingR2Multi`) n'utilisent pas de mot de passe, **même lorsqu'elles sont faites par un collègue** (« + Ajouter une personne »).

---

## 3. Lecture publique : `doGet`

### 3.1 Requête

```
GET {APPS_SCRIPT_URL}?since=Xq3v0Gk1bWq9u2yYc5n3tA
```

### 3.2 Réponse « état public »

```json
{
  "etag": "Xq3v0Gk1bWq9u2yYc5n3tA",
  "r1Days": [
    { "Date": "2026-10-05", "Capacite": 20, "Menu": "Velouté, suprême de volaille, tarte fine", "Theme": "Automne" }
  ],
  "r1Bookings": [ { "Date": "2026-10-05", "Qte": 12 } ],
  "r2Days": [ { "Date": "2026-10-06", "Note": "", "Theme": "Semaine italienne" } ],
  "r2Items": [
    { "ID": "3f1c2a9e-…", "Date": "2026-10-06", "Nom": "Lasagnes", "Stock": 15, "Prix": 4.5 },
    { "ID": "8b7d0c11-…", "Date": "2026-10-06", "Nom": "Bowl (ticket restaurant)", "Stock": 10, "Prix": "" }
  ],
  "r2Bookings": [ { "ItemID": "3f1c2a9e-…", "Qte": 3 } ],
  "name1": "Restaurant Pédagogique",
  "name2": "Aristide",
  "desc1": "Table réservée par nombre de couverts, avec le menu du jour.",
  "desc2": "Plats à emporter ou sur place, chacun avec son propre stock.",
  "contactAnnulation": "l'établissement",
  "priceEleve": "4.95",
  "priceProf": "6.10",
  "priceExterieur": "9.90"
}
```
- Aucune donnée personnelle : pas de `OuvertPar`, pas de réservation nominative. `r1Bookings` = totaux par date, `r2Bookings` = totaux par plat (voir `01` § 2.3 et 2.6).
- Champs absents de la feuille → `""`.
- `etag` = MD5 (UTF-8) du JSON de l'état **sans** l'etag, encodé base64 web-safe, `=` finaux retirés. Il change dès que le contenu public change, et seulement dans ce cas.

### 3.3 Réponse « inchangé »

Si `since` est égal à l'etag courant :
```json
{ "unchanged": true, "etag": "Xq3v0Gk1bWq9u2yYc5n3tA" }
```
Le client garde alors l'état affiché (copie locale comprise) et le considère à jour (`dataStale = false`).

### 3.4 Erreur

```json
{ "error": "<message>" }
```
Le client ne l'affiche pas telle quelle : il montre l'encadré d'échec de chargement (voir `03` § 4).

### 3.5 Mémoire serveur (comportement observable)

- L'état public est servi depuis `CacheService` (6 h), rangé sous une version `state_ver` changée à **chaque** écriture faite par le site ; un état périmé n'est jamais resservi après une écriture du site.
- Une modification faite **directement dans Sheets** n'est visible qu'après le prochain `rafraichirCache` (toutes les 5 min entre 6 h et 21 h, fuseau du script) ou un appel manuel à `viderCache`.
- Si `CacheService` est indisponible, l'état est relu dans la feuille (réponse identique, plus lente).

---

## 4. Actions `POST`

Pour chaque action : corps envoyé par le client actuel, paramètres lus par le serveur, réponse, erreurs, traitement côté client.
« État complet » = `getState()` (§ 4.3) ; « état public » = forme du § 3.2 (avec `etag`).

### 4.1 Récapitulatif

| Action | Mot de passe | Verrou | Réponse en succès | Utilisée par |
| --- | --- | --- | --- | --- |
| `checkPassword` | (vérifié) | non | `{ "ok": bool }` | Repli de `fetchAdminState` (ancien script) |
| `getAdminState` | oui | non | état complet | Connexion collègue, actualisations collègue |
| `addBookingR1` | **non** | oui | état public + `_emailStatus` (ou `_duplicate`) | Réservation publique R1, ajout collègue |
| `addBookingR2Multi` | **non** | oui | état public + `_bookingResult` + `_emailStatus` (ou `_duplicate`) | Commande publique R2, ajout collègue |
| `addBookingR2` | non | oui | état public | **Obsolète**, non utilisée par la page |
| `addDayR1` | oui | oui | état complet | Collègue |
| `editDayR1` | oui | oui | état complet | Collègue |
| `deleteDayR1` | oui | oui | état complet | Collègue |
| `deleteBookingR1` | oui | oui | état complet | Collègue |
| `editBookingR1` | oui | oui | état complet | Collègue |
| `addDayR2` | oui | oui | état complet | Collègue |
| `addItemR2` | oui | oui | état complet | Collègue |
| `editItemR2` | oui | oui | état complet | Collègue |
| `deleteItemR2` | oui | oui | état complet | Collègue |
| `deleteDayR2` | oui | oui | état complet | Collègue |
| `deleteBookingR2` | oui | oui | état complet | Collègue |
| `editBookingR2` | oui | oui | état complet | Collègue |
| `setConfigField` | oui | oui | état complet | Collègue |

Erreurs communes à toutes les actions :

| Message exact | Cause |
| --- | --- |
| `Action inconnue: <action>` | `action` absente ou inconnue (note : deux-points sans espace avant). |
| `Le serveur est très sollicité : réessayez dans quelques secondes.` | Verrou non obtenu en 20 s. |
| `Mot de passe incorrect.` | Action protégée, mot de passe absent ou faux. |
| message de `JSON.parse` (anglais) | Corps illisible. |

Côté client, sauf mention contraire : `catch(e) { showToast(e.message || 'Erreur', true); clearBusy(btn, orig); }` — toast rouge avec le message serveur, bouton rétabli, formulaire laissé tel quel.

### 4.2 `checkPassword`

```json
{ "action": "checkPassword", "password": "secret" }
```
Réponse : `{ "ok": true }` ou `{ "ok": false }` (jamais d'erreur de mot de passe). Utilisée seulement si `getAdminState` répond `Action inconnue…` (script pas encore mis à jour) : `ok:false` → erreur `Mot de passe incorrect.` ; `ok:true` → le client relit `GET` et exige que `r1Bookings` soit un tableau, sinon erreur `Réponse inattendue du service.`

### 4.3 `getAdminState`

```json
{ "action": "getAdminState", "password": "secret" }
```
Réponse (état complet, **sans `etag`**) :
```json
{
  "r1Days": [ { "Date": "2026-10-05", "Capacite": 20, "Menu": "…", "Theme": "", "OuvertPar": "M. Dupont" } ],
  "r1Bookings": [ { "ID": "c0a8…", "Date": "2026-10-05", "Nom": "Cyrille Ungerer", "Contact": "c.ungerer@exemple.fr", "Classe": "TS2", "Qte": 3, "Timestamp": "2026-10-01", "Observation": "", "NbEleve": 2, "NbProf": 1, "NbExt": 0, "PrixTotal": 16 } ],
  "r2Days": [ { "Date": "2026-10-06", "Note": "", "Theme": "", "OuvertPar": "" } ],
  "r2Items": [ { "ID": "3f1c…", "Date": "2026-10-06", "Nom": "Lasagnes", "Stock": 15, "Prix": 4.5 } ],
  "r2Bookings": [ { "ID": "77aa…", "ItemID": "3f1c…", "Date": "2026-10-06", "Nom": "Ariele Gsell", "Contact": "a.gsell@exemple.fr", "Classe": "Vie scolaire", "Qte": 2, "Mode": "surplace", "Timestamp": "2026-10-02", "Observation": "" } ],
  "name1": "…", "name2": "…", "desc1": "…", "desc2": "…", "contactAnnulation": "…",
  "priceEleve": "4.95", "priceProf": "6.10", "priceExterieur": "9.90"
}
```
Erreur : `Mot de passe incorrect.` Client (connexion) : toast `Mot de passe incorrect.` ; toute autre erreur → toast `Erreur de connexion. Réessayez.`

### 4.4 `addBookingR1` — réservation R1

**Requête (formulaire public)** :
```json
{
  "action": "addBookingR1",
  "date": "2026-10-05",
  "nom": "Cyrille Ungerer",
  "contact": "c.ungerer@exemple.fr",
  "classe": "TS2",
  "nbEleve": 2,
  "nbProf": 1,
  "nbExt": 0,
  "observation": "Table partagée",
  "requestId": "1b4e28ba-2fa1-11d2-883f-0016d3cca427"
}
```
- `nbEleve`, `nbProf`, `nbExt` : entiers ≥ 0 envoyés en nombres (le client applique `max(0, parseInt(v) || 0)`).
- L'ajout collègue envoie les mêmes champs (`contact` peut être `""`), **sans** `password`.

**Traitement serveur (ordre exact)** :
1. Si `requestId` déjà traité (§ 5.3) → état public + `"_duplicate": true`, rien d'autre (pas d'e-mail, pas de `_emailStatus`). *Ce contrôle précède la validation.*
2. `toCount` sur chaque nombre : `""`/`null` → 0 ; non entier ou négatif → erreur `Quantité invalide : indiquez un nombre entier positif.`
3. `qte = nbEleve + nbProf + nbExt` ; `qte <= 0` → `Merci de renseigner au moins une personne.`
4. Jour introuvable → `Ce jour n'existe plus.`
5. `qte > Capacite − déjà réservé` → `Il ne reste que {remaining} couvert(s) pour ce jour.`
6. Écrit la ligne (`ID` UUID, `Timestamp`, `PrixTotal` arrondi au centime aux tarifs courants), marque le `requestId`.
7. E-mail de confirmation si `contact` ressemble à un e-mail (`/\S+@\S+\.\S+/`).
8. Réponse = état public (relu après écriture) + `_emailStatus`.

Aucune vérification de `nom`, `classe`, de la date passée, ni du format de l'e-mail.

**Réponse (succès)** :
```json
{ "etag": "…", "r1Days": [ … ], "r1Bookings": [ { "Date": "2026-10-05", "Qte": 15 } ], "…": "…",
  "_emailStatus": { "sent": true } }
```
`_emailStatus` vaut l'une des formes :
| Valeur | Sens |
| --- | --- |
| `{ "sent": true }` | E-mail envoyé. |
| `{ "sent": false, "reason": "no-email" }` | `contact` n'est pas une adresse e-mail : rien à envoyer (normal pour un ajout collègue sans e-mail). |
| `{ "sent": false, "reason": "<message d'erreur MailApp>" }` | Échec d'envoi (quota…). |

**Réponse (doublon)** : `{ …état public…, "_duplicate": true }`.

**E-mail** (texte brut, pour information) — objet `Confirmation de réservation - {name1} - {dateLongue}` ; corps : `Bonjour {nom},` / `Votre réservation est confirmée :` / `- Restaurant : …` / `- Date : jeudi 1er octobre 2026` / `- Nombre de couverts : 3` / `- 2 élève(s) x 4,95 €` / `- 1 professeur(s)/personnel x 6,10 €` / `- N extérieur(s) x 9,90 €` (lignes à 0 omises) / `- Total : 16,00 €` / `- Menu du jour : …` (si menu) / `- Observation : …` (si saisie) / `Pour annuler ou modifier cette réservation, contactez {contactAnnulation}.`

**Client** : voir `04` § 6. En résumé : `_duplicate` → toast neutre `Cette réservation était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.` ; succès → récapitulatif ; `_emailStatus.sent === false` avec `reason !== 'no-email'` → avertissement dans le récapitulatif.

### 4.5 `addBookingR2Multi` — commande R2

**Requête (formulaire public)** :
```json
{
  "action": "addBookingR2Multi",
  "date": "2026-10-06",
  "nom": "Ariele Gsell",
  "contact": "a.gsell@exemple.fr",
  "classe": "Vie scolaire",
  "mode": "surplace",
  "items": [ { "itemId": "3f1c2a9e-…", "qte": 2 }, { "itemId": "8b7d0c11-…", "qte": 1 } ],
  "observation": "",
  "requestId": "6fa459ea-ee8a-3ca4-894e-db77e160355e"
}
```
- `mode` = `serviceMode(date)` (`'emporter'` | `'surplace'`).
- `items` : une entrée par plat avec quantité > 0 (ordre d'insertion dans `multiBookingQty`).
- L'ajout collègue envoie `items: [{ itemId, qte }]` (un seul plat), `date: item.Date`, sans `password`.

**Traitement serveur (ordre exact)** :
1. `items` n'est pas un tableau → `Choisissez au moins un plat.`
2. Normalisation : `qte = toCount(qte)` (erreur `Quantité invalide : indiquez un nombre entier positif.` si invalide), entrées à 0 retirées.
3. `requestId` déjà traité → état public + `"_duplicate": true`.
4. Pour chaque plat, dans l'ordre : introuvable → `skipped: { nom: "(plat supprimé)" }` ; sinon `remaining = Stock − déjà réservé − déjà accordé dans cette commande` ; `accordé = max(0, min(demandé, remaining))` ; 0 → `skipped: { nom }` ; sinon ligne écrite, `confirmed` ; si `accordé < demandé` → `adjusted`.
5. `requestId` marqué **seulement si au moins un plat est confirmé**.
6. E-mail si au moins un plat confirmé et `contact` e-mail.
7. Réponse = état public + `_bookingResult` + `_emailStatus`.

**Aucune** erreur n'est levée pour stock insuffisant : la commande est réduite. Pas de contrôle du cut-off, du mode, de la date passée, ni de l'appartenance des plats à `date`.

**Réponse** :
```json
{
  "etag": "…", "r1Days": [ … ], "r2Bookings": [ … ], "…": "…",
  "_bookingResult": {
    "confirmed": [
      { "itemId": "3f1c2a9e-…", "nom": "Lasagnes", "qte": 2, "prix": 4.5 },
      { "itemId": "8b7d0c11-…", "nom": "Bowl (ticket restaurant)", "qte": 1, "prix": "" }
    ],
    "adjusted": [ { "nom": "Lasagnes", "demande": 3, "accorde": 2 } ],
    "skipped": [ { "nom": "Tiramisu" } ],
    "totalPrix": 9,
    "hasPriceGap": true
  },
  "_emailStatus": { "sent": true }
}
```
- `prix` : `Prix` du plat ou `""`.
- `_emailStatus` : mêmes formes qu'au § 4.4, ou `null` si aucun plat confirmé.
- `totalPrix` / `hasPriceGap` : ignorés par le client (le serveur compte un plat au ticket comme « sans prix »).

**E-mail** — objet `Confirmation de réservation - {name2} - {dateLongue}` ; corps : salutation, `- Restaurant`, `- Date`, `- Mode : à emporter|sur place`, une ligne par plat `- {nom} x{qte} ({prix} € x {qte})`, `Total[ (hors plats sans prix indiqué)] : X €` si `totalPrix > 0`, bloc « Attention, certaines quantités ont été réduites faute de stock suffisant : » (`- {nom} : {demande} demandé(s), {accorde} accordé(s)`), bloc « Ces plats n'ont pas pu être réservés (stock épuisé) : », `Observation : …`, contact d'annulation.

**Client** : voir `04` § 6. `confirmed` vide → toast d'erreur `Aucun des plats choisis n'est disponible en quantité suffisante.` (ajout collègue : erreur `Plus assez de portions disponibles pour ce plat.`).

### 4.6 `addBookingR2` (obsolète)

Paramètres `date, itemId, nom, contact, classe, qte, mode`. Conservée pour d'anciennes pages en cache. Erreurs : `Indiquez une quantité supérieure à 0.`, `Ce plat n'existe plus.`, `Il ne reste que {n} portion(s) de ce plat.`, `Quantité invalide…`. Pas d'anti-doublon, pas d'`Observation`, pas de `_emailStatus`. **Ne pas utiliser** dans la version React.

### 4.7 Actions collègue (contrat seulement ; parcours spécifiés ailleurs)

Toutes renvoient l'**état complet** ; le client fait `state = réponse`, toast de succès, ferme le formulaire concerné et `render()`.

| Action | Corps envoyé par le client | Paramètres lus par le serveur | Erreurs spécifiques | Toast succès client |
| --- | --- | --- | --- | --- |
| `addDayR1` | `{ password, date, capacity, menu, theme, collegue }` | idem | — (aucune validation ; date existante = mise à jour de `Capacite`, `Menu`, `Theme`, `OuvertPar`) | `Jour ajouté.` |
| `editDayR1` | `{ password, date, capacity, menu, theme }` | idem | `Impossible : {used} couvert(s) déjà réservé(s) pour ce jour, la capacité ne peut pas être inférieure.` ; date absente → aucune erreur, rien n'est modifié | `Jour modifié.` |
| `deleteDayR1` | `{ password, date }` | idem | — (supprime le jour et **toutes** ses réservations, sans e-mail) | `Jour supprimé.` |
| `deleteBookingR1` | `{ password, id }` | idem | — (e-mail d'annulation si `Contact` est un e-mail ; statut non renvoyé) | `Réservation supprimée.` |
| `editBookingR1` | `{ password, id, nom, contact, classe, qte, nbEleve, nbProf, nbExt, prixTotal, observation }` | `id, nom, contact, classe, nbEleve, nbProf, nbExt, observation` (**`qte` et `prixTotal` ignorés**, recalculés) | `Quantité invalide : indiquez un nombre entier positif.`, `Merci de renseigner au moins une personne.`, `Réservation introuvable.`, `Il ne reste que {n} couvert(s) disponible(s) pour ce jour.` | `Réservation modifiée.` |
| `addDayR2` | `{ password, date, note, items: [{ name, stock, price }], theme, collegue }` (`name` avec suffixe ticket éventuel, `price` nombre ou `""`) | idem | — (jour existant : mis à jour, plats de nom nouveau ajoutés) | `Jour ajouté.` |
| `addItemR2` | `{ password, date, name, stock, price }` | idem | `Ce jour n'est pas ouvert.` | `Plat ajouté.` |
| `editItemR2` | `{ password, itemId, name, stock, price }` | idem | `Plat introuvable.` | `Plat modifié.` |
| `deleteItemR2` | `{ password, itemId }` | idem | — (les réservations du plat **restent**) | `Plat supprimé.` |
| `deleteDayR2` | `{ password, date }` | idem | — (supprime jour, plats et réservations de la date, sans e-mail) | `Jour supprimé.` |
| `deleteBookingR2` | `{ password, id }` | idem | — (e-mail d'annulation) | `Réservation supprimée.` |
| `editBookingR2` | `{ password, id, nom, contact, classe, qte, mode, observation }` | idem | `Quantité invalide…`, `Indiquez une quantité supérieure à 0.`, `Réservation introuvable.`, `Il ne reste que {n} portion(s) disponible(s) pour ce plat.` | `Réservation modifiée.` |
| `setConfigField` | `{ password, key, value }` (une requête par paramètre modifié, en séquence) | idem (aucune liste blanche de clés) | — | `Paramètre enregistré.` / `Paramètres enregistrés.` |

Suppressions côté client : en cas d'erreur, le bouton armé est désarmé (`disarm`) puis toast d'erreur.

---

## 5. Sémantique transverse

### 5.1 `etag` / `since` / `unchanged`

- Le client envoie l'etag de **l'état public qu'il affiche** (`state.etag`, y compris celui de la copie locale). L'état complet n'a pas d'etag : en mode collègue, aucune lecture conditionnelle (toujours `getAdminState` complet).
- Réponse `{ unchanged: true, etag }` : le client ne remplace pas `state`.
- L'etag n'est **pas** un en-tête HTTP (`ETag`/`If-None-Match`) : c'est un champ JSON et un paramètre de requête.
- Après une réservation publique, la réponse contient le nouvel etag : `state = res` le met à jour.

### 5.2 Ce qui est renvoyé après une écriture

| Écriture | Réponse | Ce que fait le client |
| --- | --- | --- |
| Réservation publique (`addBookingR1`, `addBookingR2Multi`) faite en mode client | état public + `_…` | Retire `_emailStatus`, `_bookingResult`, `_duplicate` ; `adoptBookingState` → `state = res`, `dataStale = false`. Le cache local est mis à jour au rendu suivant. |
| Même réservation, mais un collègue s'est connecté pendant l'envoi | état public | **Ne remplace pas** l'état complet ; relance `loadAll(true)` (relit `getAdminState`). |
| Ajout manuel par un collègue (`addBookingR1`/`addBookingR2Multi` sans mot de passe) | état public | Toast, puis relit l'état complet via `getAdminState` ; si la relecture échoue ou si une autre écriture a eu lieu entre-temps (`writeSeq` changé) → `loadAll(true)`. |
| Action collègue | état complet | `state = réponse`. |

### 5.3 `requestId` et `_duplicate`

- Généré à l'**ouverture** de chaque formulaire de réservation (`crypto.randomUUID()`, sinon `Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)`), stocké dans `openBookingTarget.requestId` (public) ou `addBookingOpen.requestId` (collègue).
- **Conservé** tant que le formulaire reste ouvert, notamment après une erreur : un nouvel essai renvoie le même identifiant. Un nouveau formulaire (fermeture puis réouverture) en reçoit un nouveau.
- Serveur : clé `req_` + 100 premiers caractères, gardée 6 h dans `CacheService` après une écriture réussie. Une seconde réception renvoie l'état public avec `_duplicate: true` sans rien écrire ni envoyer.
- Si `CacheService` est indisponible, la réservation est acceptée (un doublon est jugé moins grave qu'un refus).
- Conséquence : si l'utilisateur corrige le formulaire après une réponse perdue alors que la 1re requête avait abouti, le nouvel envoi est ignoré (`_duplicate`).

### 5.4 Champs de réponse préfixés `_`

| Champ | Actions | Contenu |
| --- | --- | --- |
| `_duplicate` | `addBookingR1`, `addBookingR2Multi` | `true` si déjà traité. |
| `_emailStatus` | `addBookingR1`, `addBookingR2Multi` | Voir § 4.4 ; `null` possible (R2 sans plat confirmé). |
| `_bookingResult` | `addBookingR2Multi` | `{ confirmed, adjusted, skipped, totalPrix, hasPriceGap }`. |

Ils doivent être retirés avant de stocker la réponse comme état (sinon ils finiraient dans le cache ou dans les index).

---

## Points d'attention

1. **Pas de délai d'expiration** : ni les lectures ni les écritures n'ont de timeout ; une écriture bloquée laisse le bouton « Envoi en cours… » indéfiniment.
2. **Messages bruts en anglais** : une panne réseau (`Failed to fetch`) ou une page HTML de Google (`Unexpected token '<'…`) pendant une écriture affiche le message technique du navigateur dans le toast.
3. **Écritures publiques sans authentification** : `addBookingR1` / `addBookingR2Multi` sont appelables par n'importe qui avec n'importe quelle date, heure, mode ou plat ; seules les quantités et les places/stocks sont revérifiées. Le cut-off et la règle « sur place » ne sont qu'une protection d'interface.
4. **Champs envoyés mais ignorés** : `editBookingR1` reçoit `qte` et `prixTotal` du client, le serveur les recalcule (cohérent, mais deux sources de vérité pour le prix).
5. **`setConfigField` sans liste blanche** : toute clé est acceptée (avec mot de passe).
6. **Suppression d'un jour** (`deleteDayR1`, `deleteDayR2`) : les personnes inscrites ne sont pas prévenues, contrairement à la suppression d'une réservation.
7. **`editDayR1` sur une date inexistante** : succès silencieux sans effet.
8. **Ajout collègue = deux allers-retours** : la réponse publique oblige à relire l'état complet.
9. **Actualisation collègue coûteuse** : `getAdminState` renvoie tout l'état complet à chaque actualisation (pas d'etag), sans mémoire serveur.
10. **`Action inconnue:`** : le repli `checkPassword` de `fetchAdminState` ne sert qu'avec un script antérieur ; il peut être supprimé si le script déployé est à jour.
