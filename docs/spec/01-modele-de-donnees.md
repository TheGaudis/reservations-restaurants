# 01 — Modèle de données

Sources : `Code.gs` (`SHEETS`, `table()`, `cell()`, `getConfig()`, `getState()`, `buildPublicState()`), `js/donnees.js`, `js/reservation.js`, `js/main.js`.

## 1. Stockage et conventions communes

Les données vivent dans une feuille Google Sheets, un onglet par entité. Le script crée les onglets et colonnes manquants **à la première écriture** (`ensureTable`) ; un onglet absent se lit comme vide.

| Onglet | Colonnes (ordre de création) |
| --- | --- |
| `Config` | `Key`, `Value` |
| `R1_Days` | `Date`, `Capacite`, `Menu`, `Theme`, `OuvertPar` |
| `R1_Bookings` | `ID`, `Date`, `Nom`, `Contact`, `Classe`, `Qte`, `Timestamp`, `Observation`, `NbEleve`, `NbProf`, `NbExt`, `PrixTotal` |
| `R2_Days` | `Date`, `Note`, `Theme`, `OuvertPar` |
| `R2_Items` | `ID`, `Date`, `Nom`, `Stock`, `Prix` |
| `R2_Bookings` | `ID`, `ItemID`, `Date`, `Nom`, `Contact`, `Classe`, `Qte`, `Mode`, `Timestamp`, `Observation` |

Archives (non lues par le site) : `Archive_R1_Days`, `Archive_R1_Bookings`, `Archive_R2_Days`, `Archive_R2_Items`, `Archive_R2_Bookings` (jours passés depuis plus de 60 jours, déplacés chaque nuit vers 3 h).

**Règles de sérialisation (serveur → JSON)** :
- Les noms de champs JSON sont **exactement** les en-têtes de colonnes (casse comprise : `Capacite`, `Qte`, `ItemID`…).
- Toute cellule de type date de Sheets est convertie en chaîne `yyyy-MM-dd` dans le fuseau du script (`Session.getScriptTimeZone()`). Cela concerne `Date`, mais **aussi `Timestamp`** (l'heure est perdue, voir points d'attention).
- Les nombres restent des `number` JSON ; une cellule vide vaut `""` (chaîne vide), jamais `null`.
- Le texte saisi est écrit précédé d'une apostrophe (`'0612345678`) pour que Sheets le garde tel quel ; l'apostrophe n'apparaît pas à la lecture. La colonne `Date` est l'exception : la chaîne `YYYY-MM-DD` est écrite sans apostrophe, Sheets la convertit en date, relue en `yyyy-MM-dd`.
- Dans l'**état complet**, chaque objet contient toutes les colonnes réellement présentes dans l'onglet (y compris d'éventuelles colonnes ajoutées à la main ; une colonne absente donne un champ absent). Dans l'**état public**, seuls les champs listés sont présents ; un champ manquant y vaut `""`.

**Types côté client** : le client applique `Number(…)` à `Capacite`, `Stock`, `Qte`, `Prix`, `PrixTotal`, `priceX` : il doit accepter indifféremment nombre ou chaîne numérique. Le prix « absent » se teste par `Prix === '' || Prix == null`.

**Fuseau horaire** :
- Client : **heure locale de l'appareil** pour « aujourd'hui » (`todayISO`), « jour passé », le cut-off 10 h (`new Date().getHours()`), « demain ».
- Serveur : fuseau du projet Apps Script pour convertir les dates lues, les rappels (veille à 18 h), l'archivage, `rafraichirCache`.
- Aucune règle métier n'est vérifiée côté serveur avec l'heure (pas de cut-off serveur).

---

## 2. Entités

Légende « Visibilité » : **P** = présent dans l'état public (tout visiteur) ; **C** = seulement dans l'état complet (mode collègue) ; **Cache** = recopié dans le cache `localStorage`.

### 2.1 Paramètres (`Config`)

Lignes clé/valeur, exposées à plat à la racine de l'état (public et complet).

| Clé | Type JSON | Défaut serveur (`getConfig`) | Défaut client (`state` initial) | Visibilité | Usage |
| --- | --- | --- | --- | --- | --- |
| `name1` | string | `'Restaurant 1'` | `'Restaurant Pédagogique'` | P, Cache | Titre colonne R1, sous-titre, e-mails. |
| `name2` | string | `'Restaurant 2'` | `'Aristide'` | P, Cache | Titre colonne R2, sous-titre, message de cut-off, e-mails. |
| `desc1` | string | `'Table réservée par nombre de couverts, avec le menu du jour.'` | idem | P, Cache | Description sous le titre R1. |
| `desc2` | string | `'Plats à emporter ou sur place, chacun avec son propre stock.'` | idem | P, Cache | Description sous le titre R2. |
| `contactAnnulation` | string | `"l'établissement"` | `"l'établissement"` | P, Cache | « Pour annuler ou modifier, contactez … » (récapitulatif, e-mails). |
| `priceEleve` | string (ou number si saisi à la main) | `'4.95'` | `'4.95'` | P, Cache | Tarif élève R1, en euros, point décimal. |
| `priceProf` | string/number | `'6.10'` | `'6.10'` | P, Cache | Tarif professeur/personnel R1. |
| `priceExterieur` | string/number | `'9.90'` | `'9.90'` | P, Cache | Tarif extérieur R1. |

- Une valeur vide dans la feuille est remplacée par le défaut serveur (`cfg.x || défaut`).
- Écriture : action `setConfigField` (mode collègue), une requête par clé modifiée. Le serveur **n'impose aucune liste de clés** ni aucun format (une clé quelconque serait ajoutée à `Config`).
- Les tarifs sont définis **uniquement** dans `Config` (onglet Paramètres du mode collègue) ; les défauts sont dupliqués dans `Code.gs` et `donnees.js`.

### 2.2 Jour R1 (`R1_Days`)

| Champ | Type | Format / valeurs | Obligatoire | Visibilité |
| --- | --- | --- | --- | --- |
| `Date` | string | `YYYY-MM-DD` ; clé unique (l'ajout d'une date existante la met à jour) | oui | P, C, Cache |
| `Capacite` | number | entier > 0 (validé côté client seulement, `parseInt`) | oui | P, C, Cache |
| `Menu` | string | texte libre, `""` si absent | non | P, C, Cache |
| `Theme` | string | texte libre, `""` si absent | non | P, C, Cache |
| `OuvertPar` | string | nom du collègue qui a ouvert le jour, `""` si absent | non | **C** uniquement |

### 2.3 Réservation R1 (`R1_Bookings`)

| Champ | Type | Format / valeurs | Obligatoire | Visibilité |
| --- | --- | --- | --- | --- |
| `ID` | string | UUID (`Utilities.getUuid()`) | oui | C |
| `Date` | string | `YYYY-MM-DD` du jour réservé | oui | C (P : agrégé) |
| `Nom` | string | « Nom et prénom » | oui côté client, **non vérifié côté serveur** | C |
| `Contact` | string | adresse e-mail (formulaire public : obligatoire et vérifiée côté client ; ajout collègue : facultative, vérifiée si saisie ; modification collègue : champ « Téléphone ou email », obligatoire mais sans contrôle de format) | voir ci-contre | C |
| `Classe` | string | « Classe ou service » (ex. `TS2`, `vie scolaire`) | oui côté client | C |
| `Qte` | number | entier ≥ 1 = `NbEleve + NbProf + NbExt` (calculé par le serveur) | oui | C (P : agrégé) |
| `Timestamp` | string | date d'enregistrement, **renvoyée en `yyyy-MM-dd`** | oui | C |
| `Observation` | string | texte libre, `""` si vide | non | C |
| `NbEleve` | number | entier ≥ 0 ; `""` pour les anciennes réservations | non | C |
| `NbProf` | number | entier ≥ 0 ; `""` possible | non | C |
| `NbExt` | number | entier ≥ 0 ; `""` possible | non | C |
| `PrixTotal` | number | euros arrondis au centime, calculé par le serveur aux tarifs en vigueur | non (anciennes) | C |

**Agrégat public** (`r1Bookings` de l'état public) : un objet par date ayant au moins une réservation, dans l'ordre de première apparition dans la feuille :
```json
{ "Date": "2026-10-05", "Qte": 17 }
```
`Qte` = somme des `Qte` (cellules non numériques comptées 0).

### 2.4 Jour R2 (`R2_Days`)

| Champ | Type | Format / valeurs | Obligatoire | Visibilité |
| --- | --- | --- | --- | --- |
| `Date` | string | `YYYY-MM-DD`, clé unique (ajout = mise à jour) | oui | P, C, Cache |
| `Note` | string | texte libre (bloc « Note » de la fiche) | non | P, C, Cache |
| `Theme` | string | texte libre (bloc « Thème du jour ») | non | P, C, Cache |
| `OuvertPar` | string | nom du collègue | non | **C** uniquement |

Un jour R2 sans aucun plat n'a pas de pastille dans le calendrier et n'offre pas de bouton « Réserver ».

### 2.5 Plat R2 (`R2_Items`)

| Champ | Type | Format / valeurs | Obligatoire | Visibilité |
| --- | --- | --- | --- | --- |
| `ID` | string | UUID | oui | P, C, Cache |
| `Date` | string | `YYYY-MM-DD` du jour | oui | P, C, Cache |
| `Nom` | string | nom affiché ; **dans la feuille et sur le fil**, suffixé ` (ticket restaurant)` si le plat est au ticket | oui | P, C, Cache (sans le suffixe) |
| `Stock` | number | entier > 0 (validé côté client seulement) | oui | P, C, Cache |
| `Prix` | number ou `""` | euros, décimales autorisées (`step 0.01`) ; `""` = pas de prix en euros | non | P, C, Cache |
| `Ticket` | boolean | **champ client uniquement**, dérivé du nom (voir § 3.5) | — | client, Cache |

Unicité : lors de `addDayR2` sur un jour déjà ouvert, un plat dont le nom (comparé en minuscules, suffixe ticket compris) existe déjà ce jour-là n'est pas ajouté.

### 2.6 Réservation R2 (`R2_Bookings`)

| Champ | Type | Format / valeurs | Obligatoire | Visibilité |
| --- | --- | --- | --- | --- |
| `ID` | string | UUID | oui | C |
| `ItemID` | string | `ID` du plat | oui | C (P : agrégé) |
| `Date` | string | `YYYY-MM-DD` (fourni par le client, **non vérifié** contre la date du plat) | oui | C |
| `Nom` | string | nom et prénom | oui côté client | C |
| `Contact` | string | e-mail (public : obligatoire ; ajout collègue : facultatif ; modification collègue : « Téléphone ou email », obligatoire, format libre) | — | C |
| `Classe` | string | classe ou service | oui côté client | C |
| `Qte` | number | entier ≥ 1, portions **accordées** (éventuellement réduites au stock restant) | oui | C (P : agrégé) |
| `Mode` | string | `'emporter'` ou `'surplace'` (non vérifié côté serveur) | oui | C |
| `Timestamp` | string | `yyyy-MM-dd` | oui | C |
| `Observation` | string | `""` si vide | non | C |

Une commande publique multi-plats produit **une ligne par plat** (mêmes `Nom`, `Contact`, `Classe`, `Mode`, `Observation`, `Date`, `Timestamp`).

**Agrégat public** (`r2Bookings`) : un objet par plat réservé :
```json
{ "ItemID": "9b0e…", "Qte": 6 }
```

---

## 3. Règles dérivées

### 3.1 Places restantes R1

```
remainingR1(day) = Number(day.Capacite) − Σ Number(b.Qte) pour b ∈ r1Bookings où b.Date === day.Date
```
- Côté client : index `idx().r1Used` (Map date → somme), reconstruit à chaque remplacement de `state`. Fonctionne identiquement avec l'état public (un agrégat par date), l'état complet (une ligne par réservation) et le cache local (agrégats reconstitués).
- Côté serveur (sous verrou) : même calcul dans `addBookingR1` (`remaining = Capacite − used` ; refus si `qte > remaining`), `editBookingR1` (en excluant la réservation modifiée), `editDayR1` (refus si nouvelle capacité < réservé).
- Peut être négatif si la capacité a été réécrite par `addDayR1` sous le total réservé (pas de contrôle dans `addDayR1`).

### 3.2 Portions restantes par plat R2

```
remainingItem(item) = Number(item.Stock) − Σ Number(b.Qte) pour b ∈ r2Bookings où b.ItemID === item.ID
```
- Client : `idx().r2Used`. Serveur : `addBookingR2Multi` calcule `remaining = Stock − déjà réservé − déjà accordé dans cette commande` et **accorde `min(demandé, remaining)`** (au lieu de refuser).
- Peut être négatif si `editItemR2` baisse le stock sous le réservé (pas de contrôle serveur).

### 3.3 Disponibilité : « places disponibles », « bientôt complet », « complet »

`capacityClass(rem, cap)` (`donnees.js`) :

| Condition (dans cet ordre) | Classe | Mot (aria / calendrier) | Couleur |
| --- | --- | --- | --- |
| `rem <= 0` | `cap-full` | `complet` | `--danger` |
| `rem < cap * 0.5` | `cap-low` | `bientôt complet` | `--warning` |
| sinon | `cap-ok` | `places disponibles` | `--success` |

- R1 (jour) : `rem = remainingR1(day)`, `cap = day.Capacite`.
- R2 (jour, pastille du calendrier) : `rem = Σ remainingItem(it)`, `cap = Σ Stock` sur les plats du jour ; `null` (pas de pastille, « aucun service ») si le jour n'est pas ouvert ou n'a aucun plat.
- R2 (plat, pastille de la fiche) : `rem = remainingItem(item)`, `cap = item.Stock`.
- Résultat mémoïsé par date jusqu'au prochain remplacement de `state` (`cachedStatus`).
- Côté formulaire : un plat avec `rem <= 0` est affiché « Épuisé » sans champ de quantité ; le bouton « Réserver » R1 n'apparaît que si `rem > 0` ; le bouton R2 que si au moins un plat a `rem > 0`.

### 3.4 Prix R1

- Tarifs : `state.priceEleve`, `state.priceProf`, `state.priceExterieur` (paramètres `Config`, § 2.1).
- Client (affichage en direct et récapitulatif) : `priceR1(nbEleve, nbProf, nbExt) = nbEleve × Number(priceEleve) + nbProf × Number(priceProf) + nbExt × Number(priceExterieur)` (non arrondi ; affiché par `formatEuro`, donc arrondi à 2 décimales par `toFixed`).
- Serveur (fait foi, enregistré dans `PrixTotal`) : même formule, `Math.round(x × 100) / 100`, avec les tarifs **lus au moment de l'écriture**.
- Les libellés des champs affichent le tarif : `Élèves · 4,95␣€`, `Personnels · 6,10␣€`, `Extérieurs · 9,90␣€`.

### 3.5 Prix R2, ticket restaurant

**Codage du ticket** (`donnees.js`) : le script n'a pas de colonne « ticket ». La mention est rangée à la fin du nom :
- À l'envoi (collègue, ajout/modification de plat) : `withTicketMark(name, ticket) = plainName(name) + (ticket ? ' (ticket restaurant)' : '')`, et `price: ''` si ticket.
- À la réception (`withTicketFlags`, appliqué à **toute** réponse API contenant `r2Items`, et au cache) : `flagTicket(it) = { ...it, Nom: plainName(it.Nom), Ticket: it.Ticket === true || TICKET_RE.test(it.Nom) }` avec `TICKET_RE = /\s*\(ticket restaurant\)\s*$/i`. Idempotent.
- `isTicket(item) = !!item && item.Ticket === true`.
- Les e-mails du script affichent donc « Bowl (ticket restaurant) ».

**Prix affiché d'un plat** (`itemPriceText`) : `prix d'un ticket restaurant` si ticket ; sinon `formatEuro(Prix)` si `Prix` est « vrai » (non vide et ≠ 0) ; sinon rien. (Un prix `0` n'est donc pas affiché.)

**Somme de lignes** `r2Amounts([{ item, qte }])` → `{ euros, tickets, gap }` :
- plat au ticket : `tickets += qte` ;
- sinon, `Prix` non vide et non nul (`!== ''` et `!= null`) : `euros += Number(Prix) × qte` ;
- sinon, si `qte > 0` : `gap = true` (plat réservé sans prix).

**Commande d'un client** (`orderAmounts`, `reservation.js`) : `r2Amounts` puis `tickets = min(tickets, 1)` — **une commande compte au plus un ticket restaurant**, quels que soient le nombre de plats au ticket et leurs portions, plus les plats payés en euros.

**Texte d'un montant** (`amountsText`) : parties non nulles jointes par ` + ` : `formatEuro(euros)` si `euros > 0`, `ticketsText(tickets)` si `tickets > 0`. Ex. `12,00␣€ + 1 ticket restaurant`, `1 ticket restaurant`, `7,00␣€`, ou `''`.

**Côté serveur** (`addBookingR2Multi`) : `totalPrix = Σ Prix × qte` sur les plats confirmés ayant un prix ; un plat sans prix — **y compris un plat au ticket** — met `hasPriceGap = true`. Le client **ignore** `totalPrix`/`hasPriceGap` et recalcule avec `orderAmounts`.

### 3.6 Sur place / à emporter

- Valeurs : `'emporter'` (libellé « À emporter »), `'surplace'` (« Sur place »).
- Choix du client : `chosenServiceMode`, `'emporter'` par défaut, remis à `'emporter'` à chaque ouverture du formulaire R2.
- Mode réellement retenu : `serviceMode(iso) = dayHasTicket(iso) ? 'surplace' : chosenServiceMode`, avec `dayHasTicket(iso) = itemsR2(iso).some(isTicket)`. Un jour avec au moins un plat au ticket (même épuisé) → **sur place uniquement** ; le segment « À emporter » n'est pas affiché. Le choix mémorisé du client n'est pas modifié.
- Règle **uniquement côté client** : le serveur enregistre le `mode` reçu sans contrôle.
- Le mode collègue (ajout manuel, modification) propose les deux modes sans appliquer la règle du ticket.

### 3.7 Cut-off d'Aristide (10 h) et commande sur place (12 h)

- `R2_CUTOFF_HOUR = 10`, `R2_ONSITE_HOUR = 12` (`donnees.js`).
- `r2OrdersClosed(iso) = iso < todayISO() || (iso === todayISO() && new Date().getHours() >= 10)` — heure locale de l'appareil.
- Message : `r2ClosedMsg()` = `Commandes en ligne clôturées à 10h. Venez au restaurant {state.name2} à partir de 12h pour commander sur place.`
- Effets : voir `04` § 5.6. Le menu, les prix et les stocks restent affichés.
- Mode collègue : pas de cut-off (commentaire du code : « Pas d'heure limite à Aristide : un collègue peut enregistrer une commande prise sur place. ») ; le message de clôture n'est pas affiché en mode collègue.
- **Non vérifié côté serveur** (`addBookingR2Multi` accepte toute date et toute heure).
- R1 n'a **aucun** cut-off horaire : seul un jour passé (`iso < todayISO()`) masque « Réserver ».

### 3.8 Jour passé

`iso < todayISO()` (comparaison lexicographique de chaînes `YYYY-MM-DD`). Fiche grisée (classe `is-past`), pas de bouton « Réserver » (R1 et R2), pas de message de cut-off R2. Aucune vérification serveur.

---

## 4. État client (`js/donnees.js` et voisins)

### 4.1 `state` — forme et valeur initiale

```ts
type State = {
  etag?: string;                 // présent seulement si l'état vient de la lecture publique ou du cache
  r1Days: R1Day[];               // public: {Date, Capacite, Menu, Theme} ; complet: + OuvertPar
  r1Bookings: R1Booking[] | {Date: string, Qte: number}[];
  r2Days: R2Day[];               // public: {Date, Note, Theme} ; complet: + OuvertPar
  r2Items: (R2Item & { Ticket: boolean })[];  // Nom sans suffixe ticket
  r2Bookings: R2Booking[] | {ItemID: string, Qte: number}[];
  name1: string; name2: string; desc1: string; desc2: string;
  contactAnnulation: string;
  priceEleve: string | number; priceProf: string | number; priceExterieur: string | number;
};
```
Valeur initiale (`donnees.js` l. 10) :
```js
{ r1Days:[], r1Bookings:[], r2Days:[], r2Items:[], r2Bookings:[],
  name1:'Restaurant Pédagogique', name2:'Aristide',
  desc1:"Table réservée par nombre de couverts, avec le menu du jour.",
  desc2:"Plats à emporter ou sur place, chacun avec son propre stock.",
  contactAnnulation:"l'établissement", priceEleve:'4.95', priceProf:'6.10', priceExterieur:'9.90' }
```
Puis, au démarrage, fusionnée avec `localStorage['reservations-textes']` (`{name1,name2,desc1,desc2}`).

**Invariant** : `state` n'est **jamais modifié sur place** ; il est toujours remplacé par un nouvel objet. Les index (`idx()`) et le cache local (`saveCache`) se basent sur l'identité de l'objet.

### 4.2 Construction de `state`

| Source | Construction |
| --- | --- |
| Lecture publique `doGet` | `state = withTicketFlags(data)` (si `data.unchanged`, `state` est conservé tel quel). |
| Cache local | `loadCache()` : `withTicketFlags({ ...snap.config, etag: snap.etag, r1Days, r2Days, r2Items, r1Bookings: [{Date, Qte}…] depuis snap.r1Used, r2Bookings: [{ItemID, Qte}…] depuis snap.r2Used })`. Les champs `Menu`/`Theme`/`Note` sont conservés. |
| `getAdminState` / actions collègue | `state = withTicketFlags(réponse)` (état complet, sans `etag`). |
| Réservation publique (`addBookingR1`, `addBookingR2Multi`) | Réponse = état public + champs `_…`. Le client retire `_emailStatus`, `_bookingResult` (et `_duplicate`), puis `adoptBookingState(res)` : si `isAdmin` (collègue connecté pendant l'envoi) → ne remplace pas, relance `loadAll(true)` ; sinon `state = res` et `dataStale = false`. |

### 4.3 Index dérivés (`idx()`)

Reconstruits paresseusement quand `state` change d'identité :
```ts
{ r1Days: Map<date, R1Day>, r2Days: Map<date, R2Day>,
  r1Used: Map<date, number>, r2Used: Map<itemId, number>,
  r2ItemsByDate: Map<date, R2Item[]>,          // ordre de la feuille
  status: { r1: Map<date, cls|null>, r2: Map<date, cls|null> } }  // mémo de capacityClass
```
En React : `useMemo` sur `state`.

### 4.4 Autres variables globales du périmètre

| Variable | Type / valeurs | Rôle |
| --- | --- | --- |
| `isAdmin` | boolean, `false` | Mode collègue actif. |
| `adminPassword` | string, `''` | Mot de passe en mémoire (jamais stocké), envoyé dans chaque requête collègue. |
| `dataStale` | boolean | `true` quand `state` vient du cache local et n'est pas encore confirmé. Remis à `false` par un chargement réussi ou une réservation réussie. Bloque la connexion collègue ; n'empêche pas de réserver. |
| `cachedFor` | objet | Dernier `state` sauvegardé dans le cache (évite les écritures redondantes). |
| `firstLoadDone` | boolean | Un premier chargement serveur a réussi. |
| `writeSeq` | number | Incrémenté à chaque `apiPost` ; une lecture commencée avant une écriture est jetée. |
| `openBookingTarget` | `null` ou `{ rest: 'r1'\|'r2', date: string, requestId: string }` | Formulaire public ouvert (un seul à la fois, toutes colonnes confondues). |
| `chosenServiceMode` | `'emporter'` \| `'surplace'` | Choix de mode du client (R2). |
| `multiBookingQty` | `Record<itemId, number>` (entiers > 0 seulement) | Quantités saisies dans le formulaire R2. |
| `bookingConfirmation` (`interface.js`) | `null` ou `{ rest, date, lines: {label, value}[], total: string, warning: string, shown?: boolean }` | Récapitulatif affiché. |
| `loaderCount`, `loaderTimer`, `loaderFocus` | | Voile de chargement réentrant. |
| `draftItems`, `editBookingTarget`, `editItemTarget`, `addItemFormOpen`, `editDayR1Open`, `addDayOpen` | | États de formulaires du mode collègue (spécifiés ailleurs). |
| `fieldsToReset` (`main.js`) | `Set<string>` | Ids de champs à vider au prochain rendu. |
| `refreshMissed` (`main.js`) | boolean | Actualisation manquée pendant que l'onglet était caché. |

---

## Points d'attention

1. **Noms par défaut divergents** : le serveur renvoie `Restaurant 1` / `Restaurant 2` si `name1`/`name2` ne sont pas renseignés, alors que le client affiche `Restaurant Pédagogique` / `Aristide` avant la réponse. Sur une installation neuve, les titres changent à l'arrivée des données.
2. **`Timestamp` tronqué** : `table()` convertit toute cellule date en `yyyy-MM-dd` ; l'heure de réservation n'est jamais transmise au client.
3. **Plat supprimé, réservations orphelines** : `deleteItemR2` ne supprime pas les lignes `R2_Bookings` du plat. Elles restent dans l'état complet (comptées dans « Demain : N portions réservées » du tableau de bord, qui filtre par `Date`) et dans les agrégats publics (avec un `ItemID` inexistant, sans effet visible).
4. **Restants négatifs possibles** : `addDayR1` sur une date existante écrase `Capacite` sans contrôle ; `editItemR2` / `addItemR2` ne contrôlent pas le stock. Les pastilles peuvent afficher `-2 / 5`.
5. **Ticket codé dans le nom** : renommer un plat en retirant le suffixe à la main dans Sheets change son mode de paiement. Le total des e-mails serveur traite un plat au ticket comme « sans prix » (« Total (hors plats sans prix indiqué) : … ») et ne mentionne pas la règle « un seul ticket par commande » appliquée par le client.
6. **Règles métier client uniquement** : cut-off 10 h, « sur place uniquement » les jours de ticket, jour passé, validité de l'e-mail, présence du nom et de la classe : rien n'est revérifié par le serveur. `addBookingR2Multi` ne vérifie pas non plus que les plats appartiennent à la `date` envoyée. Le serveur ne revérifie que les quantités (entiers ≥ 0) et les places/stock.
7. **Heure de l'appareil** : « aujourd'hui », le cut-off et « jour passé » dépendent de l'horloge et du fuseau du navigateur (un appareil mal réglé ou à l'étranger voit d'autres règles), alors que les dates de la feuille sont interprétées dans le fuseau du script.
8. **Regex e-mail différentes** : client `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, serveur `/\S+@\S+\.\S+/` (plus permissive) pour décider d'envoyer un e-mail.
9. **Prix 0** : `itemPriceText` n'affiche rien pour `Prix = 0`, mais `r2Amounts` compte 0 € (pas de `gap`).
