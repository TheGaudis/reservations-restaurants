# 06 — Mode collègue

Sources : `js/collegue.js` (intégralité). Dépendances utilisées : `js/donnees.js` (`isAdmin`, `adminPassword`, `state`, `dataStale`, `firstLoadDone`, `apiPost`, `postJson`, `fetchAdminState`, `adminSessionExpired`, `loadAll`, `writeSeq`, `showLoader`/`hideLoader`, `setBusy`/`clearBusy`, `withTicketMark`, `isTicket`, `newDraftItem`, `draftItems`, `addDayOpen`, `editBookingTarget`, `editItemTarget`, `addItemFormOpen`, `editDayR1Open`, `remainingR1`, `remainingItem`, `idx`, `sumBy`), `js/outils.js` (`showToast`, `confirmClick`, `disarm`, `checkFields`, `clearFieldErrors`, `emailError`, `plural`, `formatDate`, `escapeHtml`), `js/reservation.js` (`formActionsHtml`, `countsFieldsetR1Html`, `countsR1`, `priceR1`, `editBookingFormR1Html`, `editBookingFormR2Html`, `readEditIdentity`, `editIdentityRules`, `newRequestId`, `emailWarning`, `focusFirstField`), `js/interface.js` (`segGroup`, `popSeg`, `enterOnce`, `enterKey`, `leaveThen`, `ICONS`), `js/main.js` (`render`, `resetFields`, `autoRefresh`). API : `Code.gs` (`doPost`).

Conventions de ce document :
- « toast » = notification `#toast` (`showToast(msg, isError)`), affichée 3,5 s, verte (succès) ou rouge (`isError = true`) ;
- « bouton occupé » = `setBusy(btn, libellé)` : bouton désactivé, `aria-busy="true"`, libellé remplacé ; `clearBusy` le rétablit ;
- « voile » = voile de chargement plein écran (`showLoader`) : page inerte immédiatement, voile visible après 0,35 s avec « Chargement… » ; **il n'est pas affiché** quand un bouton est déjà occupé (`apiPost` détecte `button[aria-busy="true"]`) ;
- erreurs de champ : `checkFields(btn, règles)` (message `.field-error` sous le champ, `aria-invalid`, focus sur le premier champ en erreur ; le message disparaît dès qu'on tape dans le champ) ;
- toute réponse d'écriture « collègue » renvoie l'**état complet** ; la page fait `state = réponse` puis `render()` (toute la page).

---

## 1. Accès : sélecteur de mode et connexion

### 1.1 Interface (`renderModeBox`, dans `#modeBox`, en haut à droite de l'en-tête)

Le balisage est créé **une seule fois** (attribut `data-ready`), puis seulement mis à jour (pour que les transitions jouent).

```html
<div class="seg-group mode-switch" role="group" aria-label="Mode d'accès">
  <button class="seg-btn" data-seg="mode-client" id="segClient" aria-pressed="true">✓ Client</button>
  <button class="seg-btn" data-seg="mode-colleague" id="segColleague" aria-pressed="false"
          aria-controls="adminLogin" aria-expanded="false">Collègue</button>
</div>
<div class="admin-login [open]" id="adminLogin" [inert]>
  <div class="admin-login-inner">
    <input type="password" id="pwdInput" placeholder="Mot de passe" aria-label="Mot de passe collègue" autocomplete="current-password">
    <button type="button" class="icon-btn" id="pwdToggle" aria-label="Afficher le mot de passe">(œil)</button>
    <button type="button" class="btn primary">Valider</button>
  </div>
</div>
```

État dérivé à chaque rendu :

| Attribut | Valeur |
| --- | --- |
| `segClient[aria-pressed]` | `!(isAdmin || loginOpen)` |
| `segColleague[aria-pressed]` | `isAdmin || loginOpen` |
| `segColleague[aria-expanded]` | `loginOpen && !isAdmin` |
| `#adminLogin.open` et `inert` | ouvert si `loginOpen && !isAdmin`, sinon `inert` |
| Panneau fermé | le champ est vidé, repassé en `type="password"`, l'icône remise sur « Afficher » |

Le panneau se déplie sous le sélecteur (grille `0fr → 1fr`, entrée 0,35 s `--ease-enter`, sortie 0,2 s `--ease-exit`). Champ de 170 px de large (pleine largeur sous 640 px).

### 1.2 Comportements

| Action | Effet |
| --- | --- |
| Clic « Collègue » (ni connecté, ni panneau ouvert) | `loginOpen = true`, panneau ouvert, animation du segment, focus dans le champ mot de passe |
| Clic « Collègue » (déjà ouvert ou connecté) | rien |
| Clic « Client » quand le panneau est ouvert (non connecté) | `loginOpen = false`, panneau fermé |
| Clic « Client » quand connecté | **déconnexion** (`logoutAdmin`) + toast « Retour au mode client. » |
| Clic « Client » déjà en mode client | rien |
| `Entrée` dans le champ | `tryLogin()` |
| `Échap` dans le champ | retour au mode client (panneau fermé) et focus sur « Client » |
| Bouton œil | bascule `type` password/text ; icône `EYE_ON` (visibility) ↔ `EYE_OFF` (visibility_off) ; `aria-label` « Afficher le mot de passe » ↔ « Masquer le mot de passe » |

### 1.3 Connexion (`tryLogin`)

1. Si `dataStale` (la page affiche encore la copie locale de la dernière visite, données fraîches pas arrivées) : toast d'erreur « Les données se chargent. Réessayez dans un instant. » et arrêt.
2. Lecture du champ (sans `trim`, valeur vide acceptée et envoyée).
3. Voile de chargement.
4. Appel `fetchAdminState(motDePasse)` = action API **`getAdminState`** `{ password }` (une seule requête qui vérifie le mot de passe et renvoie l'état complet, réservations nominatives comprises). Repli automatique si le script n'est pas à jour (erreur « Action inconnue… ») : `checkPassword` puis lecture publique (voir `02-contrat-api.md` et `03-cache-local-et-chargement.md`).
5. Succès :
   - `state = réponse` ; `isAdmin = true` ; `adminPassword = motDePasse` ; `loginOpen = false` ;
   - toast « Mode collègue activé. » ;
   - `lastActivity = maintenant` et armement du minuteur d'inactivité ;
   - `render()` complet si le premier chargement est terminé, sinon seulement le sélecteur (le chargement en cours sera relancé en mode collègue) ;
   - focus sur le segment « Collègue ».
6. Échec : toast d'erreur
   - « Mot de passe incorrect. » si le script a répondu exactement ce message (mot de passe faux, vide, ou propriété `ADMIN_PASSWORD` absente côté script) ;
   - « Erreur de connexion. Réessayez. » pour toute autre erreur (réseau, JSON invalide, serveur occupé…).
7. Dans tous les cas, fin du voile.

### 1.4 Conservation du mot de passe

- **Uniquement en mémoire** : variable globale `adminPassword` (et `isAdmin`). Rien dans `localStorage`, `sessionStorage` ni cookie.
- Recharger la page ou ouvrir un nouvel onglet = retour au mode client.
- Le mot de passe est joint (`password`) à **chaque** appel d'écriture collègue et à chaque actualisation (`getAdminState`).
- `render()` ne mémorise/restaure jamais les champs `type="password"`.

### 1.5 Déconnexion (`logoutAdmin`)

```text
isAdmin = false ; adminPassword = '' ; loginOpen = false ; addBookingOpen = null
clearTimeout(minuteur d'inactivité) ; render()
```

Déclenchée par : clic « Client » (toast « Retour au mode client. »), inactivité (toast « Déconnecté du mode collègue après 10 minutes d'inactivité. »), mot de passe changé (toast d'erreur « Le mot de passe du mode collègue a changé. Reconnectez-vous. »).

### 1.6 Déconnexion automatique après 10 minutes d'inactivité

- Constante `INACTIVITY_MS = 600000` (10 min).
- **Activité** = tout événement `click`, `keydown`, `mousemove` ou `touchstart` sur `document` (écouteurs passifs, actifs en permanence) : ils ne font que noter `lastActivity = Date.now()`. Le défilement (`scroll`, `wheel`), le focus, les actualisations automatiques ne comptent pas.
- Un **seul minuteur** (`setTimeout`) est armé à la connexion pour `INACTIVITY_MS − (maintenant − lastActivity)`. À l'échéance :
  - si plus en mode collègue : rien ;
  - si une activité a eu lieu depuis moins de 10 min : réarmement pour le temps restant ;
  - sinon : `logoutAdmin()` + toast (non-erreur) « Déconnecté du mode collègue après 10 minutes d'inactivité. ».
- Comme la vérification compare des horodatages, une mise en veille de l'appareil conduit à la déconnexion au réveil (dès que le minuteur s'exécute).

### 1.7 Mot de passe changé côté script

Toute requête POST (`postJson`) qui reçoit `{ error: 'Mot de passe incorrect.' }` **alors que `isAdmin` est vrai** (actualisation, écriture, relecture) appelle `adminSessionExpired()` :
1. `logoutAdmin()` ;
2. toast d'erreur « Le mot de passe du mode collègue a changé. Reconnectez-vous. » ;
3. `loadAll(true)` : relecture de l'état public ;
4. l'action en cours échoue avec ce même message (son propre toast d'erreur éventuel l'affiche à nouveau).

### 1.8 Actualisation en mode collègue

- Même minuterie que le public : `setInterval(autoRefresh, 180000)` (3 min), définie dans `main.js`.
- `autoRefresh` ne fait rien (et reporte) si : onglet caché (rattrapé au retour sur l'onglet), focus dans un `INPUT`/`SELECT`/`TEXTAREA`, un bouton est occupé ou le voile actif, un formulaire public est ouvert (`openBookingTarget`), **ou le sélecteur de date est déplié** (`datePicker.rest`).
- Sinon `loadAll(true)` ; en mode collègue elle appelle `getAdminState` (pas d'`etag`, réponse complète à chaque fois) puis `render()`. Les saisies et le focus sont préservés par `render()`.
- Une réponse arrivée après une écriture, une connexion ou une déconnexion intervenue pendant la lecture est jetée.
- Échec silencieux en arrière-plan (sauf mot de passe changé, voir 1.7).
- L'actualisation ne compte pas comme une activité (1.6).

---

## 2. Éléments affichés en plus en mode collègue

Ordre dans la page (sous l'en-tête) : `#dashboard` (« Demain »), `#settings` (« Paramètres »), encadré d'erreur de chargement, `#summary-tomorrow` (« Résumé pour demain »), puis les colonnes avec, dans chacune, `#admin-rX` (« Ouvrir un jour ») au-dessus du calendrier, et les blocs collègue dans les fiches (voir 05 §5.3 et §6.3).

### 2.1 Panneau « Demain » (`renderDashboard`)

```html
<div class="panel">
  <h3 class="dash-title">Demain ({formatDate(demain)})</h3>
  <div class="summary-row">
    <div class="summary-item">{name1} : <b>{N}</b> couverts réservés|couvert réservé</div>
    <div class="summary-item">{name2} : <b>{M}</b> portions réservées|portion réservée</div>
  </div>
</div>
```

- `demain = addDaysISO(todayISO(), 1)` (date locale).
- `N` = somme des `Qte` de `r1Bookings` du lendemain ; `M` = somme des `Qte` de `r2Bookings` dont `Date` = demain.
- Pluriel si `> 1` (« 0 couvert réservé », « 1 couvert réservé », « 2 couverts réservés »).
- Les nombres sont en `--ab-blue`, chiffres tabulaires.

Le « Résumé pour demain » (plus détaillé, avec boutons d'impression) est décrit dans `07-impression.md` §5.

### 2.2 Paramètres (`renderSettings`)

Panneau dépliant `<details class="panel settings-panel disclosure">`, fermé par défaut ; l'état ouvert est mémorisé (`settingsOpen`) entre deux rendus (pas entre deux visites). Résumé : icône `ICONS.settings` + « Paramètres » + chevron (pivote de 180° à l'ouverture).

Champs (grille 2 colonnes, 1 colonne sous 600 px) :

| Libellé exact | id | Clé envoyée | Type | Largeur | Valeur initiale |
| --- | --- | --- | --- | --- | --- |
| Nom du restaurant 1 | `cfg-name1` | `name1` | text | ½ | `state.name1` |
| Nom du restaurant 2 | `cfg-name2` | `name2` | text | ½ | `state.name2` |
| Description du restaurant 1 | `cfg-desc1` | `desc1` | text | pleine | `state.desc1` |
| Description du restaurant 2 | `cfg-desc2` | `desc2` | text | pleine | `state.desc2` |
| Contact à indiquer pour une annulation (affiché dans les emails) | `cfg-contact` | `contactAnnulation` | text, placeholder « Ex. le secrétariat au 03 00 00 00 00 » | pleine | `state.contactAnnulation` |
| Tarif élève (€) | `cfg-priceEleve` | `priceEleve` | number, step 0.01, min 0 | ½ | `state.priceEleve` |
| Tarif professeur/personnel (€) | `cfg-priceProf` | `priceProf` | number, step 0.01, min 0 | ½ | `state.priceProf` |
| Tarif extérieur (€) | `cfg-priceExterieur` | `priceExterieur` | number, step 0.01, min 0 | ½ | `state.priceExterieur` |

Bouton : « Enregistrer les paramètres » (`.btn.primary`).

**Enregistrement (`saveSettings`)** :
1. Pour chaque champ : valeur `trim()`ée ; on ne garde que les champs **non vides** et **différents** de `String(state[clé] ?? '').trim()`.
2. Aucun changement → toast « Aucune modification à enregistrer. » (non-erreur).
3. Bouton occupé « Enregistrement… ».
4. **Une requête par champ modifié, en séquence** : action **`setConfigField`** `{ password, key, value }` ; `state` = réponse après chaque requête.
5. Succès : toast « Paramètres enregistrés. » (plusieurs champs) ou « Paramètre enregistré. » (un seul) ; `render()`. Les noms et descriptions sont aussi réécrits dans l'en-tête et les colonnes (avec un court fondu `text-updated`) et mémorisés dans `localStorage` (`reservations-textes`).
6. Erreur : toast d'erreur (message du script ou « Erreur ») ; bouton rétabli. Les champs déjà envoyés avant l'erreur restent enregistrés.

Aucune validation côté page (les prix ne sont pas vérifiés, un champ vidé est simplement ignoré).

Effets des paramètres : noms → titres des colonnes, sous-titre de page (« Table côté {name1} · Plats à emporter ou sur place côté {name2} »), documents imprimés, e-mails ; contact d'annulation → récapitulatif de réservation et e-mails ; tarifs → prix affichés dans les formulaires R1 et prix calculés par le script.

---

## 3. Sélecteur de date (champ « Date » de « Ouvrir un jour »)

Composant propre au mode collègue, partagé par R1 et R2 (`dateFieldHtml(rest)`).

### 3.1 Champ

```html
<div class="field date-field">
  <label for="date-r1">Date</label>
  <button type="button" class="date-trigger" id="date-r1" value="2026-10-05" aria-haspopup="dialog" aria-expanded="false">
    <span>{formatDate(iso)}</span> (icône calendrier)
  </button>
  (calendrier déplié si ouvert)
</div>
```

- Valeur = `dateChoice[rest]` si une date a été choisie dans ce sélecteur, sinon **le jour sélectionné dans le calendrier du restaurant** (`calState[rest].selected`). `dateChoice[rest]` est remis à `null` à chaque sélection dans le calendrier.
- Le bouton porte la date ISO dans `value` (relue par `addDayR1`/`addDayR2`).
- Affichage : date en toutes lettres, première lettre en majuscule (CSS).

### 3.2 Calendrier déplié (`datePickerHtml`)

```html
<div class="date-picker" role="dialog" aria-label="Choisir la date">
  <div class="dp-head">
    <button class="icon-btn" data-nav="dp-r1-prev" aria-label="Mois précédent">‹</button>
    <span class="dp-label" aria-live="polite">Octobre 2026</span>
    <button class="icon-btn" data-nav="dp-r1-next" aria-label="Mois suivant">›</button>
  </div>
  <div class="dp-grid">
    <span class="dp-wd" aria-hidden="true">L</span> … D
    <span aria-hidden="true"></span>        <!-- cases hors du mois : vides -->
    <button class="dp-day [dp-today]" data-iso="…" aria-label="…" aria-pressed="true|false"
            [aria-disabled="true"] [aria-current="date"] tabindex="0|-1">5<span class="dp-dot" aria-hidden="true"></span></button>
  </div>
  <p class="dp-legend"><span class="dp-dot" aria-hidden="true"></span> déjà ouvert</p>
</div>
```

- Mois affiché à l'ouverture : celui de la date du champ.
- Grille de 42 cases (lundi en premier) ; les jours hors du mois sont des cases vides.
- `aria-label` d'un jour : « `{formatDate}`[, déjà ouvert][, passé] ».
- « déjà ouvert » = le restaurant a un statut pour ce jour (`dayStatusR1/R2` non nul) → pastille `.dp-dot` (pour R2 : jour avec au moins un plat).
- Jour passé : `aria-disabled="true"`, opacité .38, **non sélectionnable** (clic ignoré).
- Aujourd'hui : contour d'accent ; jour choisi : aplat d'accent.
- `tabindex="0"` sur : la date choisie si elle est dans ce mois, sinon le premier jour du mois ≥ aujourd'hui, sinon le premier jour du mois.

### 3.3 Comportements

| Action | Effet |
| --- | --- |
| Clic sur le champ | ouvre (ferme l'autre sélecteur s'il était ouvert) ; focus sur le jour choisi ; seul le champ Date est réaffiché, le reste du formulaire garde la saisie |
| Clic sur le champ ouvert | ferme, focus rendu au champ |
| ‹ / › | mois précédent / suivant, focus conservé sur le bouton |
| Flèches, Début, Fin, Page ↑/↓ | **déplacent seulement le focus** (même table que le calendrier, voir 05 §3.2) ; changent de mois si besoin |
| Entrée / Espace / clic sur un jour non passé | `dateChoice[rest] = iso`, efface l'erreur du champ, ferme le calendrier, focus rendu au champ |
| Échap | ferme, focus rendu au champ |
| `pointerdown` hors de `.date-field` | ferme sans déplacer le focus |

Pendant que le sélecteur est déplié, l'actualisation automatique est suspendue.

---

## 4. Ouvrir un jour

Panneau `#admin-rX` = `.panel.add-day` contenant `<details class="disclosure">` ; résumé « **+** Ouvrir un jour » (le « + » pivote de 45° à l'ouverture). Fermé par défaut ; l'état est mémorisé dans `addDayOpen[rest]` entre deux rendus. Bordure pointillée teintée quand il est fermé, pleine quand il est ouvert.

### 4.1 Restaurant 1 (`renderAdminFormR1` / `addDayR1`)

| Ordre | Libellé exact | id | Type / placeholder | Obligatoire |
| --- | --- | --- | --- | --- |
| 1 | Date | `date-r1` | sélecteur (§3) | oui |
| 2 | Votre nom (collègue qui ouvre ce jour) | `collegue-r1` | text, « Ex. M. Dupont », `autocomplete="name"` | non |
| 3 | Nombre de couverts disponibles | `cap-r1` | number, min 1, « Ex. 20 » | oui |
| 4 | Thème du jour (optionnel) | `theme-r1` | text, « Ex. cuisine italienne » | non |
| 5 | Menu du jour (optionnel) | `note-r1` | text, « Ex. menu gastronomique, classe TS2 » | non |

Bouton : « Ouvrir ce jour » (`.btn.primary`).

Validations (`checkFields`) :

| Champ | Condition d'erreur | Message exact |
| --- | --- | --- |
| `date-r1` | pas de valeur | « Choisissez une date. » |
| `cap-r1` | `parseInt` vide/NaN/0 ou ≤ 0 | « Indiquez un nombre de couverts supérieur à 0. » |

Envoi : bouton occupé « Ouverture en cours… » ; action **`addDayR1`** `{ password, date, capacity: entier, menu, theme, collegue }` (textes `trim()`és).

Succès : toast « Jour ajouté. » ; champs nom, couverts, thème et menu vidés (la date reste) ; le calendrier R1 sélectionne et affiche la date ouverte (`selected = anchor = date`) ; `render()`.
Erreur : toast d'erreur (message du script ou « Erreur ») ; bouton rétabli.

Côté script : si la date existe déjà, la ligne est **mise à jour** (capacité, menu, thème, « ouvert par ») sans contrôle des réservations existantes ; sinon elle est créée.

### 4.2 Restaurant 2 (`renderAdminFormR2` / `addDayR2`)

| Ordre | Libellé exact | id | Type / placeholder |
| --- | --- | --- | --- |
| 1 | Date | `date-r2` | sélecteur (§3) |
| 2 | Votre nom (collègue qui ouvre ce jour) | `collegue-r2` | text, « Ex. Cyrille Ungerer » |
| 3 | Note (optionnel) | `note-r2` | text, « Ex. semaine du menu bistrot » |
| 4 | Thème du jour (optionnel) | `theme-r2` | text, « Ex. semaine italienne » |
| 5 | groupe « Plats disponibles ce jour-là » (`fieldset.field-group`, `legend`) | — | lignes de plats |

**Lignes de plats** (état `draftItems`, tableau de `{ name, stock, price, ticket }`, une ligne vide au départ, conservé entre deux rendus) :
- en-tête visuel (`aria-hidden`) : « Plat », « Stock », « Prix (optionnel) » ;
- par ligne `i` (numérotée à partir de 1) :
  - nom : text, placeholder « Ex. salade César », `aria-label="Plat {i} : nom"` ;
  - stock : number min 1, placeholder « 10 », `aria-label="Plat {i} : stock"` ;
  - prix : number step 0.01 min 0, `aria-label="Plat {i} : prix en euros (optionnel)"`, suggestions `list="price-suggestions"`, placeholder « 3,50 » (ou « Ticket » et désactivé si ticket) ;
  - bouton icône croix, `aria-label="Retirer le plat {i}"` (retirer la dernière ligne en recrée une vide) ;
  - case « Ticket restaurant » (`aria-label="Plat {i} : au prix d'un ticket restaurant"`), sur toute la largeur sous les champs ;
- bouton « + Ajouter un plat » (`.btn.ghost.small`) : ajoute une ligne vide.

Bouton : « Ouvrir ce jour » (`.btn.primary`, dans `.form-submit`).

Préparation des plats : on garde les lignes dont le nom (trim) est non vide **et** `parseInt(stock) > 0` ; chaque plat devient `{ name: withTicketMark(nom, ticket), stock: entier, price: ticket ? '' : (prix ? parseFloat(prix) : '') }`.

Validations :

| Cible | Condition | Message exact |
| --- | --- | --- |
| `date-r2` | pas de valeur | « Choisissez une date. » |
| dernière ligne de plat | aucun plat valide | « Ajoutez au moins un plat avec un nom et un stock. » (message placé juste après la dernière ligne) |

Envoi : « Ouverture en cours… » ; action **`addDayR2`** `{ password, date, note, items, theme, collegue }`.
Succès : toast « Jour ajouté. » ; champs nom, note, thème vidés ; `draftItems` remis à une ligne vide ; calendrier R2 positionné sur la date ; `render()`.
Erreur : toast d'erreur, bouton rétabli.

Côté script : date existante → mise à jour de Note/Thème/« ouvert par » et ajout des **seuls plats dont le nom (insensible à la casse) n'existe pas déjà** ce jour-là ; les autres sont ignorés sans message.

### 4.3 Case « Ticket restaurant »

- Cochée : le champ Prix associé est **vidé, désactivé**, placeholder « Ticket » (`syncTicketPrice`) ; décochée : réactivé, placeholder d'origine (`data-example`).
- À l'envoi, la mention « ` (ticket restaurant)` » est ajoutée à la fin du nom (`withTicketMark`) et le prix envoyé est vide. Le script n'a pas de colonne dédiée : c'est le nom qui porte l'information (« Bowl (ticket restaurant) »), repris tel quel dans les e-mails.
- À la réception, `withTicketFlags` retire la mention du nom et pose `Ticket: true` (regex `/\s*\(ticket restaurant\)\s*$/i`). Dans toute l'interface, le prix affiché devient « prix d'un ticket restaurant ».
- Effets côté public (rappel) : un jour avec au moins un plat au ticket est « Sur place » uniquement, et la commande compte un seul ticket quel que soit le nombre de plats/portions au ticket.

---

## 5. Gestion d'un jour existant

### 5.1 Modifier ce jour (R1 uniquement)

Bouton « Modifier ce jour » dans la fiche → `editDayR1Open = date` ; le formulaire apparaît en bas de la fiche (animation `rise`).

| Libellé | id | Type | Valeur initiale |
| --- | --- | --- | --- |
| Nombre de couverts disponibles | `edd-cap` | number min 1 | `Capacite` |
| Thème du jour (optionnel) | `edd-theme` | text | `Theme` |
| Menu du jour (optionnel) | `edd-menu` | text | `Menu` |

Boutons : « Enregistrer » (primary) / « Annuler » (ghost ; fermeture animée `sink` 0,12 s).
Validation : `edd-cap` vide ou ≤ 0 → « Indiquez un nombre de couverts supérieur à 0. »
Envoi : « Enregistrement… » ; action **`editDayR1`** `{ password, date, capacity, menu, theme }`.
Succès : toast « Jour modifié. », formulaire fermé, `render()`.
Erreur script possible : « Impossible : {n} couvert(s) déjà réservé(s) pour ce jour, la capacité ne peut pas être inférieure. »
Le champ « ouvert par » n'est pas modifiable ici. **R2 n'a pas de formulaire équivalent** (voir Points d'attention).

### 5.2 Supprimer un jour (R1 et R2) — suppression en deux clics

Bouton « Supprimer ce jour » (`.btn.danger.small`).

Mécanique commune (`confirmClick` dans `outils.js`, utilisée par toutes les suppressions) :
1. **1er clic** : le bouton est « armé » : `data-armed="1"`, largeur figée (`min-width` = largeur actuelle), classe `.armed` (aplat rouge, onde `pulse-armed` unique), libellé visible « Confirmer ? », `aria-label` et `title` = détail de la suppression. Rien n'est envoyé.
2. **Réarmement** : au bout de **4 secondes** sans second clic, le bouton est désarmé (libellé, largeur, `aria-label`, `title` d'origine rétablis). Tout réaffichage de la page recrée aussi le bouton désarmé.
3. **2e clic dans les 4 s** : envoi. Le bouton reste « Confirmer ? » ; le voile de chargement s'affiche (pas de bouton occupé).
4. Succès : `state = réponse`, toast, `render()`. Erreur : bouton désarmé, toast d'erreur.

| Suppression | Détail (`aria-label`/`title` armé) | Action API | Champs | Toast succès |
| --- | --- | --- | --- | --- |
| Jour R1 | « Confirmer la suppression du jour et de toutes ses réservations » | `deleteDayR1` | `{ password, date }` | « Jour supprimé. » |
| Jour R2 | idem | `deleteDayR2` | `{ password, date }` | « Jour supprimé. » |
| Réservation R1 | « Confirmer la suppression de cette réservation » | `deleteBookingR1` | `{ password, id }` | « Réservation supprimée. » |
| Réservation R2 | idem | `deleteBookingR2` | `{ password, id }` | « Réservation supprimée. » |
| Plat R2 | « Confirmer la suppression de ce plat » | `deleteItemR2` | `{ password, itemId }` | « Plat supprimé. » |

Effets côté script : `deleteDayR1` supprime le jour et ses réservations ; `deleteDayR2` supprime le jour, ses plats et ses réservations ; **aucun e-mail** n'est envoyé aux personnes concernées. `deleteBookingR1/R2` envoient un **e-mail d'annulation** si le contact est une adresse e-mail (objet « Annulation de réservation - {nom du restaurant} - {date longue} ») ; la page n'indique pas si l'e-mail est parti. `deleteItemR2` supprime le plat **sans supprimer ses réservations**.

---

## 6. Plats du restaurant 2

### 6.1 Formulaire de plat (`itemFormHtml`, commun à l'ajout « nit » et à la modification « eit »)

| Libellé | id | Type | Ajout | Modification |
| --- | --- | --- | --- | --- |
| Nom du plat | `{p}-name` | text | placeholder « Ex. salade César » | valeur = nom sans la mention ticket |
| Stock | `{p}-stock` | number min 1 | placeholder « Ex. 10 » | valeur = `Stock` |
| Prix (optionnel) | `{p}-price` | number step 0.01 min 0, `list="price-suggestions"` | vide, placeholder « Ex. 3,50 » | `Prix` ; placeholder « Ticket » et désactivé si plat au ticket |
| Ticket restaurant (case) | `{p}-ticket` | checkbox | décochée | cochée si `Ticket` |

`price-suggestions` : liste unique (`<datalist>`) des prix déjà utilisés par les plats, sans doublon, triés par ordre croissant.

Validations (`readItemForm`) :

| Champ | Condition | Message exact |
| --- | --- | --- |
| nom | vide après trim | « Indiquez le nom du plat. » |
| stock | `parseInt` vide/NaN/0 ou ≤ 0 | « Indiquez un stock supérieur à 0. » |

Champs envoyés : `{ name: withTicketMark(nom, ticket), stock: entier, price: ticket ? '' : (prix ? parseFloat(prix) : '') }`.

### 6.2 Ajouter un plat

Bouton « + Ajouter un plat à ce jour » (small, sous la liste des plats) → formulaire à la place du bouton. Boutons « Ajouter ce plat » / « Annuler ».
Envoi : « Ajout en cours… » ; action **`addItemR2`** `{ password, date, name, stock, price }`. Succès : toast « Plat ajouté. », formulaire fermé, `render()`. Erreur script possible : « Ce jour n'est pas ouvert. »

### 6.3 Modifier un plat

Bouton « Modifier ce plat » → formulaire sous les actions du plat. Boutons « Enregistrer » / « Annuler ».
Envoi : « Enregistrement… » ; action **`editItemR2`** `{ password, itemId, name, stock, price }`. Succès : toast « Plat modifié. », formulaire fermé, `render()`. Erreur script possible : « Plat introuvable. » Le script n'empêche pas de descendre le stock sous le nombre de portions réservées.

### 6.4 Supprimer un plat

Bouton « Supprimer ce plat » (danger, deux clics, §5.2).

---

## 7. Réservations : liste, modification

### 7.1 Liste

Dans chaque fiche (R1 : sous la carte du jour ; R2 : sous chaque plat), voir 05 §4.6 : une ligne par réservation, ordre de la feuille, **pas de colonnes ni de tri**. Chaque ligne a deux boutons small : « Modifier » (`aria-expanded="true"` quand son formulaire est ouvert) et « Supprimer » (danger, deux clics).

Un seul formulaire de modification ouvert à la fois (`editBookingTarget = { rest, id }`), affiché juste sous la ligne. Fermeture animée par « Annuler ».

### 7.2 Champs d'identité communs (préfixe `ebk`)

| Libellé | id | Valeur initiale | Règle | Message exact |
| --- | --- | --- | --- | --- |
| Nom | `ebk-nom` | `Nom` | non vide | « Indiquez le nom. » |
| Classe ou service | `ebk-classe` | `Classe` | non vide | « Indiquez la classe ou le service. » |
| Téléphone ou email | `ebk-contact` | `Contact` | non vide (aucun contrôle de format) | « Indiquez un téléphone ou un email. » |
| Observation (optionnel) | `ebk-obs` | `Observation` | — | — |

### 7.3 Modifier une réservation R1

Ordre : Nom / Classe ou service (même ligne), Téléphone ou email, groupe « Nombre de personnes ({max} au maximum) » avec trois champs « Élèves · 4,95 € », « Personnels · 6,10 € », « Extérieurs · 9,90 € » (tarifs actuels des paramètres ; ids `ebk-nbEleve`, `ebk-nbProf`, `ebk-nbExt`, number min 0, placeholder « 0 »), total en direct, Observation, boutons « Enregistrer » / « Annuler ».

- Valeurs initiales : `NbEleve`, `NbProf`, `NbExt` ; champs **laissés vides** si la valeur est vide (anciennes réservations).
- Si aucune des trois valeurs n'est > 0 (réservation antérieure aux tarifs), aide sous la légende : « Réservation enregistrée avant les tarifs : indiquez la répartition de ses {n couvert(s)}. »
- **Maximum** (`editMaxR1`) = `max(Qte actuelle, places restantes du jour + Qte actuelle)` ; si le jour n'existe plus : `Qte actuelle`.
- Total en direct (`#ebk-r1-total`, `aria-live="polite"`) : « `{n couvert(s)} · Total : {prix}` » avec prix = `nbEleve × tarif élève + nbProf × tarif personnel + nbExt × tarif extérieur`.

Validations (en plus du §7.2), message placé après la rangée des trois champs :

| Condition | Message exact |
| --- | --- |
| total ≤ 0 | « Indiquez au moins une personne. » |
| total > maximum | « {max couvert(s)} au maximum pour cette réservation (places restantes ce jour-là). » |

Envoi : « Enregistrement… » ; action **`editBookingR1`** `{ password, id, nom, contact, classe, qte, nbEleve, nbProf, nbExt, prixTotal, observation }` avec `prixTotal` arrondi au centime. Le script **ignore `qte` et `prixTotal`** envoyés : il recalcule la quantité et le prix aux tarifs en vigueur. Erreurs script possibles : « Merci de renseigner au moins une personne. », « Réservation introuvable. », « Il ne reste que {n} couvert(s) disponible(s) pour ce jour. », « Quantité invalide : indiquez un nombre entier positif. »
Succès : toast « Réservation modifiée. », formulaire fermé, `render()`. Aucun e-mail n'est envoyé.

### 7.4 Modifier une réservation R2

Ordre : Nom / Classe ou service, puis Téléphone ou email / Portions (`ebk-qte`, number min 1, valeur `Qte`) sur une ligne, « Mode de service » (`select#ebk-mode` : « À emporter » = `emporter`, « Sur place » = `surplace`, valeur actuelle présélectionnée), Observation, « Enregistrer » / « Annuler ». Le plat lui-même n'est pas modifiable.

Validation (en plus du §7.2) : `ebk-qte` vide ou ≤ 0 → « Indiquez une quantité supérieure à 0. » **Aucun contrôle du stock côté page.**
Envoi : « Enregistrement… » ; action **`editBookingR2`** `{ password, id, nom, contact, classe, qte, mode, observation }`. Erreurs script possibles : « Indiquez une quantité supérieure à 0. », « Réservation introuvable. », « Il ne reste que {n} portion(s) disponible(s) pour ce plat. »
Succès : toast « Réservation modifiée. », formulaire fermé, `render()`.

---

## 8. Ajout manuel d'une personne

Bouton « + Ajouter une personne » (small) : R1 dans `.day-actions` de la fiche ; R2 dans les actions de chaque plat. **Affiché seulement s'il reste au moins une place** (R1 : `remainingR1(day) > 0` ; R2 : `remainingItem(plat) > 0`), y compris pour un jour passé.

Ouverture (`openAddBooking(rest, clé)`) : `addBookingOpen = { rest, key: date (R1) ou ID du plat (R2), requestId: newRequestId() }` ; un seul formulaire d'ajout ouvert à la fois ; focus sur le premier champ. L'identifiant `requestId` est conservé si l'on réessaie après une erreur (anti-doublon), renouvelé à chaque ouverture.

### 8.1 Champs communs (préfixe `abk`)

| Libellé | id | Type / placeholder | Règle | Message exact |
| --- | --- | --- | --- | --- |
| Nom et prénom | `abk-nom` | text, « Ex. Cyrille Ungerer » | non vide | « Indiquez le nom. » |
| Classe ou service | `abk-classe` | text, « Ex. TS2 ou vie scolaire » | non vide | « Indiquez la classe ou le service. » |
| Adresse email (optionnel) | `abk-contact` | email, « Ex. Ariele.gsell@exemple.fr », `inputmode="email"`, `spellcheck="false"` ; aide « Si elle est indiquée, la confirmation y est envoyée. » | **facultatif** ; si saisi, format `^[^\s@]+@[^\s@]+\.[^\s@]+$` | « Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr). » |
| Observation (optionnel) | `abk-obs` | text, « Ex. table partagée, allergie… » | — | — |

### 8.2 Restaurant 1

Ordre : Nom et prénom / Classe ou service, Adresse email, groupe « Nombre de personnes ({places restantes} au maximum) » (Élèves / Personnels / Extérieurs avec tarifs, ids `abk-nbEleve`…), total en direct (`#abk-r1-total`), Observation, « Ajouter cette personne » / « Annuler ».

Validations supplémentaires (message après la rangée) : total ≤ 0 → « Indiquez au moins une personne. » ; total > places restantes → « {max couvert(s)} au maximum (places restantes ce jour-là). »
Envoi : « Ajout en cours… » ; action publique **`addBookingR1`** `{ date, nom, contact, classe, nbEleve, nbProf, nbExt, observation, requestId }` (**sans mot de passe**).

### 8.3 Restaurant 2

Ordre : Nom et prénom / Classe ou service, Adresse email, puis « Portions ({restant} au maximum) » (`abk-qte`, number min 1, valeur 1, `inputmode="numeric"`) / « Mode de service » (`select#abk-mode`, « À emporter » par défaut, « Sur place »), Observation, « Ajouter cette personne » / « Annuler ».

Validations supplémentaires : `abk-qte` non > 0 → « Indiquez une quantité supérieure à 0. » ; > restant → « {max portion(s)} au maximum (stock restant). »
Envoi : « Ajout en cours… » ; action publique **`addBookingR2Multi`** `{ date: plat.Date, nom, contact, classe, mode, items: [{ itemId, qte }], observation, requestId }`.
Résultat (`_bookingResult`) : aucun plat confirmé → erreur affichée « Plus assez de portions disponibles pour ce plat. » ; quantité accordée inférieure → message de succès « Personne ajoutée avec {n portion(s)} seulement (stock restant). »

### 8.4 Différences avec le formulaire public

| Point | Public | Ajout par un collègue |
| --- | --- | --- |
| E-mail | obligatoire | facultatif (vérifié s'il est saisi) |
| Heure limite R2 (10 h) | appliquée côté page | **non appliquée** : commande prise sur place possible après 10 h (le script ne contrôle pas l'heure) |
| R2 | plusieurs plats dans une commande, mode imposé « Sur place » un jour au ticket | un seul plat, mode libre (« À emporter » par défaut même un jour au ticket) |
| Réponse | récapitulatif affiché | toast puis relecture de l'état complet |
| Contrôle des places | par le script, sous verrou | identique (même action) |
| E-mail de confirmation | envoyé | envoyé seulement si une adresse est saisie |

### 8.5 Après l'envoi (`afterAddBooking`)

1. `addBookingOpen = null` (formulaire fermé).
2. Toast :
   - doublon (`_duplicate`) : « Cette personne était déjà enregistrée : elle n'a pas été ajoutée une seconde fois. » (non-erreur) ;
   - sinon message de succès (« Personne ajoutée. » ou variante partielle R2) suivi, si l'e-mail a échoué (`_emailStatus.sent === false` et raison ≠ `no-email`), de « L'email de confirmation n'a pas pu être envoyé. » — dans ce cas le toast est en style erreur.
3. La réponse ne contient que l'état public : la page relit l'**état complet** (`getAdminState`) pour afficher le nom. Si la relecture échoue ou si une autre écriture a eu lieu entre-temps, `loadAll(true)` est relancé. Si l'on a été déconnecté entre-temps, rien de plus.
4. `render()`.

Erreur à l'envoi : toast d'erreur (message du script), bouton rétabli, formulaire laissé ouvert avec le même `requestId`. Erreurs script possibles : « Ce jour n'existe plus. », « Il ne reste que {n} couvert(s) pour ce jour. », « Merci de renseigner au moins une personne. », « Quantité invalide : indiquez un nombre entier positif. », « Le serveur est très sollicité : réessayez dans quelques secondes. »

---

## 9. Impression

Boutons « Imprimer la liste » (fiches R1 et R2) et icônes « Imprimer » du résumé du lendemain : voir `07-impression.md`.

---

## 10. Récapitulatif des actions API du mode collègue

| Action | Champs envoyés | Réponse | Déclencheur |
| --- | --- | --- | --- |
| `getAdminState` | `password` | état complet | connexion, actualisation, relecture après ajout |
| `checkPassword` | `password` | `{ ok }` | repli si `getAdminState` inconnue |
| `setConfigField` | `password, key, value` | état complet | Paramètres (une requête par champ) |
| `addDayR1` | `password, date, capacity, menu, theme, collegue` | état complet | Ouvrir un jour R1 |
| `editDayR1` | `password, date, capacity, menu, theme` | état complet | Modifier ce jour |
| `deleteDayR1` | `password, date` | état complet | Supprimer ce jour R1 |
| `addDayR2` | `password, date, note, items[{name, stock, price}], theme, collegue` | état complet | Ouvrir un jour R2 |
| `deleteDayR2` | `password, date` | état complet | Supprimer ce jour R2 |
| `addItemR2` | `password, date, name, stock, price` | état complet | Ajouter un plat |
| `editItemR2` | `password, itemId, name, stock, price` | état complet | Modifier ce plat |
| `deleteItemR2` | `password, itemId` | état complet | Supprimer ce plat |
| `editBookingR1` | `password, id, nom, contact, classe, qte, nbEleve, nbProf, nbExt, prixTotal, observation` | état complet | Modifier une réservation R1 |
| `editBookingR2` | `password, id, nom, contact, classe, qte, mode, observation` | état complet | Modifier une réservation R2 |
| `deleteBookingR1` / `deleteBookingR2` | `password, id` | état complet (+ e-mail d'annulation) | Supprimer une réservation |
| `addBookingR1` | `date, nom, contact, classe, nbEleve, nbProf, nbExt, observation, requestId` | état public + `_emailStatus` / `_duplicate` | Ajouter une personne R1 |
| `addBookingR2Multi` | `date, nom, contact, classe, mode, items[{itemId, qte}], observation, requestId` | état public + `_bookingResult` / `_emailStatus` / `_duplicate` | Ajouter une personne R2 |

Toutes les requêtes : `POST APPS_SCRIPT_URL`, en-tête `Content-Type: text/plain;charset=utf-8`, corps JSON `{ action, ...champs }`. Les écritures ne sont jamais rejouées automatiquement.

---

## 11. Recommandations pour la migration React

- Garder le mot de passe **en mémoire uniquement** (contexte React), jamais dans l'URL ni le stockage ; la session doit tomber au rechargement, comme aujourd'hui (ou décider explicitement d'un `sessionStorage`, changement fonctionnel à valider).
- Un hook `useInactivityLogout(600000, ['click','keydown','mousemove','touchstart'])` reproduisant la logique « horodatage + minuteur unique ».
- Centraliser la gestion de l'erreur « Mot de passe incorrect. » en mode collègue (intercepteur de la couche API).
- Un composant `<BoutonSuppression detail onConfirm>` encapsulant le double clic (4 s, largeur figée, « Confirmer ? », `aria-label` détaillé).
- Les formulaires ouverts (édition d'une réservation, d'un plat, d'un jour, ajout d'une personne) se prêtent à des paramètres d'URL (voir `09-inventaire-des-ecrans.md`).
- À la déconnexion, **remplacer l'état détaillé par l'état public** (voir Points d'attention n° 1).

---

## 12. Points d'attention

1. **Données personnelles conservées après déconnexion** : `logoutAdmin` ne remplace pas `state` ; l'état complet (noms, e-mails, téléphones, observations) reste en mémoire jusqu'à la prochaine actualisation (3 min) après une déconnexion manuelle ou par inactivité. Il n'est pas affiché, ni écrit dans la copie locale (qui ne garde que des totaux), mais il reste lisible dans la console.
2. **Actualisation bloquée après une déconnexion avec le sélecteur de date ouvert** : `logoutAdmin` ne remet pas `datePicker.rest` à `null` ; `autoRefresh` reste suspendu jusqu'au prochain `pointerdown` dans la page. Cas typique : déconnexion par inactivité avec le calendrier « Date » déplié → la page publique ne s'actualise plus (utilisateur clavier ou poste laissé ouvert).
3. Les autres états d'édition (`editBookingTarget`, `editItemTarget`, `addItemFormOpen`, `editDayR1Open`, `addDayOpen`, `settingsOpen`, `draftItems`) ne sont pas réinitialisés à la déconnexion : ils réapparaissent à la connexion suivante.
4. **Rouvrir un jour R1 existant** via « Ouvrir un jour » écrase capacité, menu, thème et « ouvert par » **sans contrôle** des réservations (contrairement à « Modifier ce jour ») : capacité possible sous le nombre de réservés (jauge négative). Le sélecteur signale « déjà ouvert » mais ne bloque pas.
5. **Date passée possible** pour « Ouvrir un jour » : le sélecteur interdit de cliquer un jour passé, mais la valeur par défaut est le jour sélectionné dans le calendrier, qui peut être passé ; seule l'absence de date est vérifiée.
6. **R2 : pas de « Modifier ce jour »** : pour changer le thème ou la note d'un jour R2, il faut repasser par « Ouvrir un jour » (qui exige au moins un plat valide, les plats déjà existants étant ignorés sans message).
7. **R2 : lignes de plat incomplètes ignorées en silence** dans « Ouvrir un jour » (nom sans stock, stock sans nom) dès qu'au moins une ligne est valide.
8. **Prix 0** : un prix saisi « 0 » devient « sans prix » (le script enregistre `price || ''`).
9. **Stock d'un plat** modifiable sous le nombre de portions déjà réservées (aucun contrôle) → jauge négative.
10. **Suppression d'un plat** : ses réservations restent dans la feuille (orphelines) et **aucun e-mail** n'est envoyé ; elles sont encore comptées dans le panneau « Demain » (somme par date) mais plus dans le résumé ni dans les impressions (calculés par plat).
11. **Suppression d'un jour** : aucun e-mail d'annulation aux personnes inscrites (alors que la suppression d'une réservation en envoie un).
12. **Contact obligatoire à la modification** (« Indiquez un téléphone ou un email. ») alors que l'ajout manuel permet de ne rien saisir : une personne ajoutée sans e-mail ne peut être modifiée qu'en inventant un contact. Le libellé « Téléphone ou email » diffère aussi du formulaire public (e-mail obligatoire).
13. **Maximum de modification R1** : le commentaire de `editMaxR1` promet qu'on peut toujours garder ses couverts actuels si la capacité a été baissée, mais le script refuse dès que `qte > capacité − autres réservations`.
14. **Modification R2 sans contrôle de stock côté page** (contrairement à R1) : seul le script refuse.
15. **Ajout manuel R2** : « À emporter » proposé par défaut même un jour au ticket restaurant, alors que le public est forcé en « Sur place ».
16. **Toasts qui se chevauchent** : `showToast` ne réinitialise pas le minuteur précédent ; un second message affiché peu après un premier disparaît au terme des 3,5 s du premier (ex. connexion puis action rapide).
17. **Double clic de suppression** : le minuteur de 4 s du premier armement n'est pas annulé ; après une erreur, un réarmement rapide peut être désarmé prématurément par l'ancien minuteur.
18. La charte mentionne le libellé « Revenir en mode client » : il n'existe pas, le retour se fait par le segment « Client ».
