# 03 — Cache local, chargement et actualisation

Sources : `index.html` (script inline du `<head>`, structure), `js/donnees.js` (`saveCache`, `loadCache`, `renderTexts`, `saveTexts`, `showLoader`, `hideLoader`, `hedgedRead`, `apiGet`, `loadAll`, `showLoadError`, `retryLoad`), `js/main.js` (démarrage, `autoRefresh`, `scheduleR2Cutoff`).

## 1. Stockage navigateur

Deux clés `localStorage`, aucune autre (ni `sessionStorage`, ni cookie, ni IndexedDB). Toute lecture/écriture est enveloppée dans `try/catch` : navigation privée, quota plein ou stockage bloqué → la page fonctionne sans cache.

### 1.1 `reservations-cache-v1` — copie locale de l'état

**Forme exacte** (`saveCache`, `donnees.js` l. 39-55) :
```json
{
  "savedAt": 1759480000000,
  "etag": "Xq3v0Gk1bWq9u2yYc5n3tA",
  "config": {
    "name1": "Restaurant Pédagogique", "name2": "Aristide",
    "desc1": "…", "desc2": "…", "contactAnnulation": "l'établissement",
    "priceEleve": "4.95", "priceProf": "6.10", "priceExterieur": "9.90"
  },
  "r1Used": { "2026-10-05": 15 },
  "r2Used": { "3f1c2a9e-…": 3 },
  "r1Days":  [ { "Date": "2026-10-05", "Capacite": 20, "Theme": "Automne", "Menu": "…" } ],
  "r2Days":  [ { "Date": "2026-10-06", "Theme": "", "Note": "" } ],
  "r2Items": [ { "ID": "8b7d0c11-…", "Date": "2026-10-06", "Nom": "Bowl", "Stock": 10, "Prix": "", "Ticket": true } ]
}
```
- `savedAt` : `Date.now()` à l'écriture (ms).
- `etag` : etag de `state` ; **absent** si l'état est l'état complet du mode collègue (qui n'a pas d'etag).
- `r1Used` / `r2Used` : sommes de `Qte` par date (R1) et par `ItemID` (R2), calculées depuis `state.r1Bookings` / `state.r2Bookings` — que ce soient des agrégats publics ou des réservations détaillées.
- `r2Items[].Nom` est **sans** le suffixe « (ticket restaurant) » et `Ticket` est conservé.

**Exclu** (aucune donnée personnelle) : `Nom`, `Contact`, `Classe`, `Observation`, `ID` de réservation, `Timestamp`, `NbEleve/NbProf/NbExt`, `PrixTotal`, `Mode`, `OuvertPar`. Même en mode collègue, seules ces sommes anonymes sont écrites.

**Quand on écrit** : dans `renderAll()` (rendu complet), si `firstLoadDone` est vrai, et seulement si `state` a changé d'identité depuis la dernière sauvegarde (`cachedFor`). Donc après chaque chargement réussi qui remplace l'état, après chaque écriture (réservation, action collègue), et à la première confirmation `unchanged` (qui réécrit la copie avec un `savedAt` neuf). **Jamais** pendant l'affichage initial depuis le cache (`firstLoadDone` encore faux).

**Quand on lit** :
1. Dans le `<head>` (`index.html` l. 25-29) : seulement pour récupérer `etag`, si `c.etag` est non vide et `Date.now() - c.savedAt < CACHE_MAX_AGE`.
2. Au démarrage (`loadCache()`, `main.js` l. 86) : si l'instantané existe et `Date.now() - snap.savedAt < CACHE_MAX_AGE` (14 jours). Toute exception (JSON invalide, champ manquant) → `null`.

**Reconstruction** (`loadCache`) :
```js
withTicketFlags({
  ...snap.config, etag: snap.etag,
  r1Days: snap.r1Days, r2Days: snap.r2Days, r2Items: snap.r2Items,
  r1Bookings: Object.entries(snap.r1Used).map(([Date, Qte]) => ({ Date, Qte })),
  r2Bookings: Object.entries(snap.r2Used).map(([ItemID, Qte]) => ({ ItemID, Qte }))
})
```
Les calculs de places restantes fonctionnent sans modification sur ces réservations anonymes.

**Invalidation** : uniquement par l'âge (> 14 jours : ignorée, mais pas supprimée) et par le nom de clé versionné (`-v1`). Aucune suppression explicite. Une copie plus récente remplace l'ancienne à chaque sauvegarde.

### 1.2 `reservations-textes` — titres et descriptions

```json
{ "name1": "…", "name2": "…", "desc1": "…", "desc2": "…" }
```
- Écrite par `saveTexts(state)` dans `renderAll()` quand `firstLoadDone` (à chaque rendu complet).
- Lue au tout début de `main.js` et fusionnée dans l'état initial (`Object.assign(state, saved)`), puis `renderTexts(state, true)` (sans animation). Ainsi les titres de la dernière visite s'affichent même sans copie locale valide.
- **Aucune expiration.**

---

## 2. Séquence de démarrage exacte

### 2.1 `<head>` (avant tout CSS)

1. `<meta charset>`, `viewport` (`width=device-width, initial-scale=1.0, viewport-fit=cover`), `theme-color #FFFFFF`, `description` (`Réservation des repas aux restaurants pédagogiques du Lycée professionnel Aristide Briand.`), `<title>Réservations — Restaurants pédagogiques</title>`, favicon SVG en data-URI.
2. **Script inline** :
   - `APPS_SCRIPT_URL`, `CACHE_KEY`, `CACHE_MAX_AGE` (globaux, repris par `donnees.js`) ;
   - `earlySince` = etag de la copie locale valide, sinon `''` ;
   - `stateUrl(since)` ;
   - `earlyGet = fetch(stateUrl(earlySince)).then(r => r.json())` — **la lecture des données part ici**, avant le téléchargement des feuilles de styles, des polices et des scripts ;
   - `earlyGet.catch(() => {})` pour éviter l'avertissement « promesse rejetée non gérée » (l'erreur est traitée plus tard par `apiGet`).
3. `<link rel="preconnect" href="https://script.googleusercontent.com" crossorigin>` (destination de la redirection 302 d'Apps Script), puis `preconnect` vers `https://fonts.googleapis.com` et `https://fonts.gstatic.com` (`crossorigin`).
4. Polices Google (Outfit 500/600/700, Work Sans 400/500/600, `display=swap`) en `rel="preload" as="style"` avec `onload="this.onload=null;this.rel='stylesheet'"` : **non bloquantes**, la police système est utilisée en attendant. Repli `<noscript>` en `stylesheet` classique.
5. `design-system.css?v=21` puis `app.css?v=21` (bloquants).

### 2.2 `<body>` statique (affiché avant tout JavaScript)

Ordre : `#setupBanner` (caché), bande décorative `.ab-stripe`, `.wrap` contenant : en-tête (logo inline base64, sur-titre `Lycée professionnel Aristide Briand`, `<h1>Réservations des restaurants pédagogiques et Aristide</h1>`, `#page-subtitle` `Table côté Restaurant Pédagogique · Plats à emporter ou sur place côté Aristide`, `#modeBox` vide), `#dashboard`, `#settings`, encadré d'erreur `.load-error-box` (caché par CSS), `#summary-tomorrow`, `<datalist id="price-suggestions">`, deux colonnes (`#col-r1.accent-green`, `#col-r2.accent-magenta`) avec titre `h2`, description, zone admin, **squelette de calendrier** (`.skeleton`, `aria-hidden="true"`) dans `#cal-r1`/`#cal-r2`, fiche `#detail-r1`/`#detail-r2` vide ; pied de page `Les places se mettent à jour automatiquement toutes les 3 minutes. Vous pouvez aussi actualiser la page.` et `Lycée professionnel Aristide Briand · Restaurants pédagogiques` ; hors `.wrap` : `#toast` (`role="status" aria-live="polite"`) et `#loader`.

### 2.3 Scripts (fin du `<body>`, classiques, dans cet ordre)

`donnees.js`, `outils.js`, `impression.js`, `interface.js`, `collegue.js`, `reservation.js`, `calendrier.js`, `main.js`, tous en `?v=21`.

1. `donnees.js` : si `APPS_SCRIPT_URL` contient `COLLE_ICI` → `#setupBanner` affiché ; déclaration de `state` initial et des variables.
2. `main.js` (exécution immédiate) :
   1. lecture de `reservations-textes` → fusion dans `state` ;
   2. `renderTexts(state, true)` ;
   3. `renderModeBox()` (sélecteur Client / Collègue) ;
   4. `cached = loadCache()` ; si non nul : `state = cached`, `dataStale = true`, `render()` → **calendriers et fiches de la dernière visite affichés tout de suite** (le squelette est remplacé) ;
   5. `loadAll()` (premier chargement, non « background ») ;
   6. `setInterval(autoRefresh, 180000)` ;
   7. `scheduleR2Cutoff()` (minuteur jusqu'à 10 h, § 5.3) ;
   8. écouteur de 5 clics sur le logo (easter egg) ;
   9. écouteur `visibilitychange`.

### 2.4 Premier chargement (`loadAll()`)

`apiGet(true, state.etag || '')` : silencieux (pas de voile). Le premier appel **réutilise `earlyGet`** si `earlySince === since` (cas normal : même etag, ou `''` des deux côtés), sinon lance un nouveau `fetch` (la lecture anticipée est alors perdue). Puis lecture doublée à 6 s et 2e tentative à 1,5 s (voir `02` § 1.5).

Résultats :
| Réponse | Effet |
| --- | --- |
| État public | `state = data` ; `firstLoadDone = true` ; `dataStale = false` ; `body.load-error` retiré ; `render()` (et sauvegarde du cache). |
| `{ unchanged: true }` | `state` (copie locale) conservé ; mêmes effets (`firstLoadDone`, `dataStale = false`, `render()`). |
| Exception (réseau, JSON, `data.error`) | `showLoadError()` ; pas de toast au premier chargement. |
| Lecture devenue obsolète (une écriture, une connexion ou une déconnexion a eu lieu pendant la lecture : `writeSeq` ou `isAdmin` a changé) | Résultat jeté ; si `firstLoadDone` est encore faux, `loadAll(background)` est relancé. |

---

## 3. États d'écran

| État | Condition | Rendu |
| --- | --- | --- |
| **Squelette** | Pas de copie locale, première réponse non arrivée | Squelette animé dans les deux calendriers (`aria-hidden`), fiches vides, titres de la dernière visite ou par défaut. Pas de voile, pas de texte « Chargement ». |
| **Copie locale** (`dataStale`) | Copie locale valide, réponse non arrivée | Page complète interactive. Le bouton « Réserver » est **actif** (on peut ouvrir et remplir un formulaire, et même envoyer : le serveur recompte les places sous verrou). La connexion collègue est refusée : toast d'erreur `Les données se chargent. Réessayez dans un instant.` |
| **À jour** | Après un chargement réussi | Page complète, `dataStale = false`. |
| **Échec de chargement** | `showLoadError()` | `body.load-error` → l'encadré `.load-error-box` (`display:flex`) apparaît sous l'en-tête, l'animation du squelette s'arrête. Contenu de `#loadErrorText` (`role="alert"`), vidé puis réinséré au `requestAnimationFrame` suivant pour être annoncé à chaque échec. Bouton `Réessayer`. |
| **Voile de chargement** | Écriture sans bouton occupé (suppressions collègue), connexion collègue | Voir § 4.2. |
| **Configuration manquante** | `APPS_SCRIPT_URL` contient `COLLE_ICI` | Bandeau rouge en haut : `⚠ Configuration manquante : ouvre ce fichier et remplace APPS_SCRIPT_URL par l'URL de ton déploiement Apps Script (tout en haut du fichier, dans le <head>).` (la lecture échoue aussi → encadré d'échec). |

### 3.1 Textes exacts de l'encadré d'échec (HTML)

En ligne (`navigator.onLine` vrai) :
```html
<b>Le service de réservation ne répond pas.</b><br>Réessayez dans un instant. Si le problème continue, prévenez l'établissement.
```
Hors ligne :
```html
<b>Vous semblez hors ligne.</b><br>Vérifiez votre connexion internet, puis réessayez.
```
Suffixe ajouté si `dataStale` (copie locale affichée) :
```html
<br>Le calendrier affiché date de votre dernière visite : les places restantes ont pu changer depuis.
```

### 3.2 Bouton « Réessayer » (`retryLoad`)

`setBusy(btn, 'Nouvelle tentative…')` (désactivé, `aria-busy="true"`), `await loadAll()` (non background), `clearBusy`. L'encadré reste affiché pendant la tentative ; il disparaît en cas de succès. Si l'échec se répète après un premier chargement réussi, un toast d'erreur `Impossible de charger les données. Réessayez.` s'ajoute. En pratique ce toast est **inatteignable** : l'encadré n'est affiché que tant qu'aucun chargement n'a réussi (`firstLoadDone` faux), et le premier succès le masque ; `loadAll()` non « background » n'est appelé qu'au démarrage et par ce bouton.

---

## 4. Indicateurs d'activité

### 4.1 Bouton occupé

`setBusy(btn, label)` : `disabled = true`, `aria-busy="true"`, texte = `label`, renvoie l'ancien texte ; `clearBusy(btn, orig)` restaure. Tant qu'un bouton `aria-busy="true"` existe, `apiPost` n'affiche pas le voile (`quiet`).

### 4.2 Voile de chargement (`showLoader` / `hideLoader`)

- Compteur réentrant `loaderCount`.
- `showLoader` (1er appel) : mémorise l'élément focalisé ; `#loader` reçoit la classe `blocking` (capte tous les clics) et perd `aria-hidden` ; `.wrap.inert = true` (souris **et** clavier bloqués immédiatement). Après `--dur-slow` (350 ms) seulement : classe `show` (voile visible) et texte `Chargement…` inséré dans le `<p role="status">` (annoncé). Le délai est en JavaScript, donc valable même en mouvement réduit.
- `hideLoader` (dernier appel) : annule le minuteur, retire `show`/`blocking`, remet `aria-hidden="true"`, vide le texte, `.wrap.inert = false`, rend le focus à l'élément mémorisé s'il est encore dans le DOM et si le focus est sur `body`.
- Spinner : `<svg class="spinner" role="progressbar" aria-label="Chargement en cours">`.
- Les lectures (`loadAll`) sont toujours silencieuses : le voile ne sert qu'aux écritures et à la connexion.

---

## 5. Actualisation automatique

### 5.1 Intervalle et conditions (`autoRefresh`, `main.js` l. 93-100)

Toutes les **180 000 ms (3 min)**, `autoRefresh()` appelle `loadAll(true)` **sauf** si l'une des conditions suivantes est vraie :
| Condition | Raison |
| --- | --- |
| `document.hidden` (onglet caché) | Économie ; rattrapé au retour. |
| L'élément focalisé est un `INPUT`, `SELECT` ou `TEXTAREA` | L'utilisateur tape. |
| Un bouton `aria-busy="true"` existe ou `loaderCount > 0` | Un envoi est en cours (le bouton occupé serait remplacé et recliquable). |
| `openBookingTarget !== null` | Un formulaire de réservation public est ouvert. |
| `datePicker.rest` non nul | Le sélecteur de date « Ouvrir un jour » (collègue) est déplié. |

En cas de saut : `refreshMissed = document.hidden`. À l'événement `visibilitychange`, si l'onglet redevient visible et que `refreshMissed` est vrai : `refreshMissed = false` puis `autoRefresh()` immédiat (soumis aux mêmes conditions).

En **mode collègue**, l'actualisation appelle `getAdminState` (état complet) au lieu du `GET` public.

### 5.2 Résultat d'une actualisation (`loadAll(true)`)

- `unchanged` et données déjà à jour (`firstLoadDone && !dataStale`) : **rien** (pas de rendu).
- Nouvel état : `state = data`, `render()` complet. Les saisies (champs avec `id`, sauf mots de passe) et le focus sont capturés avant et restaurés après (`captureUi`/`restoreUi`).
- Échec après un premier chargement réussi : **silencieux** (aucun message, l'état affiché est conservé).
- Échec alors qu'aucun chargement n'a encore réussi : `showLoadError()` (l'alerte est réannoncée toutes les 3 min).
- Lecture rendue obsolète par une écriture/connexion/déconnexion : jetée.

### 5.3 Passage de 10 h (`scheduleR2Cutoff`)

Minuteur jusqu'au prochain `10:00:00.000` local (aujourd'hui si avant 10 h, sinon demain). À l'échéance : si le formulaire public ouvert est un formulaire R2 dont la date est désormais close (`r2OrdersClosed`), il est fermé (`openBookingTarget = null`, sans message) ; puis `render()` complet ; puis reprogrammation pour le lendemain.

---

## 6. À préserver dans la version React (et pourquoi)

Apps Script est lent et irrégulier (démarrage à froid fréquent, parfois > 10 s, pages d'erreur passagères). Toute la perception de rapidité repose sur les mécanismes suivants :

1. **Lecture lancée avant le bundle** : garder un petit script inline dans `index.html` qui lit l'etag du cache et lance le `fetch` (exposer la promesse, par ex. `window.__earlyState = { since, promise }`). Le bundle React (JS + CSS) peut prendre plusieurs centaines de ms à arriver ; la requête Apps Script doit déjà être en vol. Le premier chargement de l'application consomme cette promesse **une seule fois** et seulement si `since` correspond.
2. **`preconnect`** vers `script.googleusercontent.com` (avec `crossorigin`) et Google Fonts ; polices non bloquantes (`display=swap`, preload + bascule).
3. **Affichage immédiat de la copie locale** : lire `localStorage` **de façon synchrone dans l'état initial** (pas dans un `useEffect`), pour que le premier rendu montre le calendrier de la dernière visite sans clignotement de squelette. Garder la clé et le format `reservations-cache-v1` pour réutiliser les copies des visiteurs existants (ou migrer explicitement ; changer de clé rend la première visite post-migration lente pour tous).
4. **Réservation possible sur données périmées** : ne pas désactiver « Réserver » tant que `dataStale` ; le serveur fait foi.
5. **etag / `since`** à chaque lecture publique, y compris la première et les actualisations ; traiter `{ unchanged: true }` sans remplacer l'état.
6. **Lecture doublée à 6 s, 2e tentative à 1,5 s, jamais pour une écriture.**
7. **Lectures obsolètes jetées** : compteur d'écritures (`writeSeq`) et mode au début de la lecture ; ignorer la réponse si l'un a changé (en React : compteur de séquence dans une ref ou `AbortController`).
8. **Actualisation discrète** : 3 min, pas quand l'onglet est caché (rattrapage au retour), ni pendant une saisie, un envoi ou un formulaire ouvert. En React, une actualisation ne doit **pas** remonter les composants de formulaire : les valeurs saisies et le focus doivent survivre naturellement (clés stables, état de formulaire hors de l'état serveur).
9. **Aucune donnée personnelle dans le navigateur** : cache anonymisé uniquement ; mot de passe en mémoire seulement ; l'état complet ne doit jamais être persisté ni partagé avec un service worker / cache HTTP.
10. **Messages d'échec** distinguant hors ligne et service muet, réannoncés (`role="alert"`) à chaque échec, avec mention de la copie locale.
11. **Pas de voile pour les lectures**, voile différé de 350 ms et bouton occupé pour les écritures.

---

## Points d'attention

1. **Rattrapage incomplet** : `refreshMissed` n'est mis à vrai que si l'onglet est caché ; une actualisation sautée parce que l'utilisateur tapait ou avait un formulaire ouvert n'est rattrapée qu'au tic suivant (jusqu'à 3 min plus tard).
2. **Formulaire ouvert = plus d'actualisation** : tant qu'un formulaire public reste ouvert, les places affichées ne sont jamais rafraîchies (sans limite de durée).
3. **Copie locale sans etag après le mode collègue** : `saveCache` sauvegarde aussi l'état complet (agrégé, sans etag) ; la visite suivante fait alors une lecture complète au lieu d'une réponse `unchanged`.
4. **`reservations-textes` n'expire jamais** et le `<h1>` statique contient « Aristide » en dur (`Réservations des restaurants pédagogiques et Aristide`), non mis à jour par `name2` ; le `<title>` du document n'est pas mis à jour non plus.
5. **Détection « Configuration manquante »** limitée à la sous-chaîne `COLLE_ICI` (une URL vide ou erronée n'affiche pas le bandeau, contrairement à ce qu'indique le README) ; le texte du bandeau est au tutoiement, contraire à la charte (vouvoiement).
6. **Échec répété avant tout succès** : l'alerte est réinsérée et réannoncée à chaque actualisation (toutes les 3 min).
7. **Fermeture silencieuse à 10 h** : un formulaire Aristide ouvert est fermé sans explication (les saisies sont perdues), seul le message de clôture apparaît dans la fiche.
8. **Easter egg** : 5 clics rapides sur le logo ouvrent une vidéo YouTube (« Rickroll ») dans un nouvel onglet. À conserver ou retirer selon décision produit.
9. **Lecture anticipée perdue** si l'etag lu dans le `<head>` diffère de celui de `loadCache()` (copie locale partiellement invalide) : une seconde requête est lancée.
