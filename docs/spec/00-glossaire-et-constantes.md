# 00 — Glossaire, constantes et fonctions utilitaires

Périmètre : `index.html` (script inline du `<head>`), `js/donnees.js`, `js/outils.js`, `js/reservation.js`, `js/main.js`, contrat de `Code.gs`.
Les fichiers `js/collegue.js`, `js/calendrier.js`, `js/interface.js`, `js/impression.js` sont spécifiés ailleurs ; seules les fonctions qu'ils fournissent au périmètre sont citées (§ 4).

Conventions de ce document :
- `␣` désigne une espace insécable U+00A0 lorsqu'elle compte (ex. `12,50␣€`).
- « client » = navigateur ; « script » ou « serveur » = Google Apps Script (`Code.gs`).

---

## 1. Glossaire

| Terme | Définition |
| --- | --- |
| **R1**, restaurant 1, « Restaurant Pédagogique » | Restaurant à table. On réserve des **couverts** sur un **jour de service** qui a une **capacité** (nombre de couverts) et éventuellement un thème et un menu. Couleur verte (`.accent-green`). Nom configurable (`name1`). |
| **R2**, restaurant 2, « **Aristide** » | Vente de **plats** en **portions** limitées (un **stock** par plat), **sur place** ou **à emporter**. Couleur magenta (`.accent-magenta`). Nom configurable (`name2`). « Aristide » est le nom par défaut côté client (et le nom du lycée : Aristide Briand). Les commandes en ligne ferment à 10 h le jour même. |
| **Jour de service** / **jour ouvert** | Une date (`YYYY-MM-DD`) pour laquelle un collègue a « ouvert » le restaurant (ligne dans `R1_Days` ou `R2_Days`). Sans jour ouvert : « Aucune réservation possible ce jour-là. » |
| **Couvert** | Une personne attablée au R1. Une réservation R1 compte `Qte` couverts = élèves + personnels + extérieurs. |
| **Élèves / Personnels / Extérieurs** | Les trois catégories de convives R1, chacune à son tarif (`priceEleve`, `priceProf`, `priceExterieur`). « Personnels » = « professeur/personnel » dans les paramètres et les e-mails. |
| **Plat** (item) | Ligne de `R2_Items` rattachée à une date : nom, stock, prix (en euros, optionnel) ou « ticket restaurant ». |
| **Portion** | Une unité d'un plat R2. Une réservation R2 (ligne) = un plat × `Qte` portions. Une **commande** R2 du public peut contenir plusieurs plats : le script crée une ligne de réservation par plat. |
| **Stock** | Nombre total de portions d'un plat proposées ce jour-là. |
| **Places restantes** / **portions restantes** | Capacité (ou stock) − somme des quantités déjà réservées. Recalculées côté client pour l'affichage, et côté serveur sous verrou au moment d'écrire. |
| **Ticket restaurant** | Mode de paiement d'un plat R2 : pas de prix en euros, « prix d'un ticket restaurant ». Codé dans le **nom** du plat par le suffixe ` (ticket restaurant)`. Un jour avec au moins un plat au ticket → commande **sur place uniquement** ; une commande compte **un seul** ticket, quel que soit le nombre de plats/portions au ticket. |
| **Mode de service** | `emporter` (« À emporter ») ou `surplace` (« Sur place »). Ne concerne que R2. |
| **Cut-off** / **commandes clôturées** | À partir de 10 h (heure locale de l'appareil) le jour J, et pour tout jour passé, le public ne peut plus commander à Aristide en ligne ; il est invité à venir commander sur place à partir de 12 h. |
| **Mode client** | Mode par défaut, public, sans mot de passe. Ne reçoit que l'**état public** (aucune donnée personnelle). |
| **Mode collègue** (admin) | Mode équipe, protégé par mot de passe (`ADMIN_PASSWORD`, propriété du script). Reçoit l'**état complet** (réservations nominatives). Déconnexion après 10 min d'inactivité ou si le mot de passe change côté script. |
| **État public** | Réponse de `doGet` : jours, plats, paramètres, et **totaux anonymes** de quantités réservées (par jour au R1, par plat au R2), plus un `etag`. |
| **État complet** (admin) | Réponse de `getAdminState` et des actions collègue : toutes les lignes de toutes les feuilles, sans `etag`. |
| **etag** | Empreinte (MD5, base64 web-safe sans `=`) du JSON de l'état public. Renvoyé par le client dans `?since=` ; si inchangé, réponse `{ "unchanged": true, "etag": "…" }`. |
| **requestId** | Identifiant unique (UUID) d'un envoi de réservation, généré à l'ouverture du formulaire, conservé en cas de nouvel essai. Anti-doublon serveur (6 h). |
| **`_duplicate`** | Drapeau de réponse : le `requestId` a déjà été traité, rien n'a été ajouté. |
| **Copie locale** / **cache local** | Instantané anonymisé de l'état public dans `localStorage` (`reservations-cache-v1`), affiché dès l'ouverture de la page suivante. |
| **`dataStale`** | Drapeau client : l'état affiché vient de la copie locale et n'a pas encore été confirmé par le serveur. |
| **Lecture doublée** (hedging) | Si une lecture GET n'a pas répondu après 6 s, une seconde lecture identique part en parallèle ; la première réponse arrivée l'emporte. Jamais pour une écriture. |
| **Mémoire de l'état** (serveur) | `CacheService` d'Apps Script contenant le JSON de l'état public (6 h), invalidé par une « version » (`state_ver`) changée à chaque écriture. |
| **Voile de chargement** (loader) | Overlay plein écran bloquant (page `inert`), visible après 350 ms, utilisé pour les écritures sans bouton occupé. |
| **Bouton occupé** | Bouton d'envoi désactivé avec `aria-busy="true"` et un libellé d'attente (« Envoi en cours… ») ; remplace le voile. |
| **Fiche du jour** | Carte affichée sous le calendrier pour le jour sélectionné (`#detail-r1`, `#detail-r2`). |
| **Récapitulatif** (confirmation) | Panneau « Réservation enregistrée » affiché au-dessus de la fiche du jour après une réservation réussie. |
| **Suppression en deux clics** | 1er clic = armement (« Confirmer ? »), 2e clic dans les 4 s = exécution (mode collègue). |

---

## 2. Constantes

### 2.1 Client

| Constante | Valeur | Fichier | Rôle |
| --- | --- | --- | --- |
| `APPS_SCRIPT_URL` | `"https://script.google.com/macros/s/AKfycbzLVvpP6oSS-qCm01LZp_3BlP9PKQy6bBWDj2AHaJ4y6a4nvDIjTQRF0todJhZ0W_xu/exec"` | `index.html` l. 16 | URL de l'API (GET et POST). À rendre configurable (variable d'environnement de build). |
| Marqueur « non configuré » | sous-chaîne `'COLLE_ICI'` dans `APPS_SCRIPT_URL` | `donnees.js` l. 4 | Si présente : affiche `#setupBanner`. |
| `CACHE_KEY` | `'reservations-cache-v1'` | `index.html` l. 23 | Clé `localStorage` de la copie locale. |
| `CACHE_MAX_AGE` | `14 * 24 * 3600 * 1000` = 1 209 600 000 ms (14 jours) | `index.html` l. 24 | Au-delà, la copie locale est ignorée. |
| `stateUrl(since)` | `APPS_SCRIPT_URL + (since ? '?since=' + encodeURIComponent(since) : '')` | `index.html` l. 31 | URL de lecture publique. |
| `TEXTS_KEY` | `'reservations-textes'` | `donnees.js` l. 13 | Clé `localStorage` des noms/descriptions (sans expiration). |
| `CONFIG_KEYS` | `['name1','name2','desc1','desc2','contactAnnulation','priceEleve','priceProf','priceExterieur']` | `donnees.js` l. 37 | Paramètres copiés dans le cache local. |
| `HEDGE_MS` | `6000` ms | `donnees.js` l. 114 | Délai avant lecture doublée. |
| Délai entre deux tentatives de lecture | `1500` ms | `donnees.js` l. 136 | Seconde tentative si la 1re a échoué (réseau / JSON invalide). |
| Nombre max. de tentatives de lecture | `2` (chacune pouvant être doublée) | `donnees.js` l. 135 | Pas de 2e tentative si `navigator.onLine === false`. |
| Délai d'apparition du voile | `--dur-slow` (`.35s` → 350 ms ; repli 350) | `donnees.js` l. 95 | Le blocage est immédiat, l'affichage différé. |
| `TICKET_MARK` | `' (ticket restaurant)'` (espace normale en tête) | `donnees.js` l. 210 | Suffixe ajouté au nom d'un plat au ticket à l'envoi. |
| `TICKET_RE` | `/\s*\(ticket restaurant\)\s*$/i` | `donnees.js` l. 211 | Détection du suffixe à la réception. |
| `R2_CUTOFF_HOUR` | `10` | `donnees.js` l. 310 | Heure de clôture des commandes en ligne Aristide (jour J). |
| `R2_ONSITE_HOUR` | `12` | `donnees.js` l. 310 | Heure annoncée pour commander sur place. |
| Seuil « bientôt complet » | `rem < cap * 0.5` | `donnees.js` l. 318 | Moins de la moitié des places restantes. |
| Seuil « complet » | `rem <= 0` | `donnees.js` l. 317 | |
| État initial par défaut | voir `01-modele-de-donnees.md` § 4.1 | `donnees.js` l. 10 | `name1:'Restaurant Pédagogique'`, `name2:'Aristide'`, tarifs `'4.95'`, `'6.10'`, `'9.90'`… |
| Durée d'un toast | `3500` ms | `outils.js` l. 17 | |
| Fenêtre de confirmation (2 clics) | `4000` ms | `outils.js` l. 56 | |
| Libellé armé | `'Confirmer ?'` | `outils.js` l. 54 | |
| Préfixe des id de champs générés | `'champ-'` + compteur | `outils.js` l. 95 | |
| Suffixes d'id | `'-aide'` (texte d'aide), `'-error'` (message d'erreur) | `outils.js` | |
| Regex e-mail client | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | `outils.js` l. 112 | |
| Intervalle d'actualisation | `180000` ms (3 min) | `main.js` l. 100 | |
| Easter egg logo | 5 clics en moins de `2000` ms → ouvre `https://youtu.be/dQw4w9WgXcQ?list=RDdQw4w9WgXcQ` (`_blank`, `noopener`) | `main.js` l. 112-124 | Voir points d'attention de `03`. |
| `INACTIVITY_MS` | `600000` ms (10 min) | `collegue.js` | Déconnexion du mode collègue (autre spécification). |
| Animation de fermeture d'un formulaire | `--dur-fast` (`.12s` → 120 ms ; repli 120) | `interface.js` (`leaveThen`) | Ignorée si `prefers-reduced-motion: reduce`. |
| Jetons de mouvement CSS | `--dur-fast: .12s; --dur: .2s; --dur-slow: .35s` | `design-system.css` l. 105 | |
| Version des ressources | `?v=21` sur tous les CSS/JS | `index.html` | Cache-busting manuel (remplacé par le hash de build en React). |
| Polices | Outfit 500/600/700, Work Sans 400/500/600, `display=swap` | `index.html` l. 41 | Chargement non bloquant (`preload` + `onload`). |

### 2.2 Serveur (`Code.gs`) — vues par le client

| Constante | Valeur | Rôle |
| --- | --- | --- |
| `STATE_TTL` | `21600` s (6 h) | Durée de la mémoire de l'état public. |
| `STATE_CHUNK` | `30000` caractères | Taille d'un morceau de l'état en mémoire. |
| `REFRESH_FROM_HOUR` / `REFRESH_TO_HOUR` | `6` / `21` | Plage horaire (fuseau du script) de `rafraichirCache`. |
| Déclencheurs | `sendReminders` chaque jour à 18 h ; `archiveOldData` chaque jour à 3 h ; `rafraichirCache` toutes les 5 min | Rappels, archivage, mémoire. |
| `ARCHIVE_AFTER_DAYS` | `60` | Jours passés depuis plus de 60 jours → onglets `Archive_*`, invisibles du site. |
| Verrou d'écriture | `tryLock(20000)` (20 s) | Sinon erreur « Le serveur est très sollicité : réessayez dans quelques secondes. » |
| Verrou d'archivage | `waitLock(30000)` | |
| Anti-doublon | clé `'req_' + requestId.slice(0, 100)`, valeur `'1'`, TTL `21600` s (6 h) | |
| `state_ver` | UUID, TTL 21600 s | Version de l'état public. |
| Paramètres par défaut serveur | `name1:'Restaurant 1'`, `name2:'Restaurant 2'`, `desc1:'Table réservée par nombre de couverts, avec le menu du jour.'`, `desc2:'Plats à emporter ou sur place, chacun avec son propre stock.'`, `contactAnnulation:"l'établissement"`, `priceEleve:'4.95'`, `priceProf:'6.10'`, `priceExterieur:'9.90'` | Utilisés si la clé est absente/vide dans `Config`. **Les noms par défaut diffèrent de ceux du client** (voir points d'attention de `01`). |
| Fuseau | `Session.getScriptTimeZone()` (fuseau du projet Apps Script) | Conversion des dates de la feuille en `yyyy-MM-dd`, rappels, archivage. |

### 2.3 Textes récurrents

| Texte (exact) | Où |
| --- | --- |
| `Réserver` | Bouton d'ouverture du formulaire (R1 et R2). |
| `Confirmer la réservation` | Bouton d'envoi des formulaires publics. |
| `Annuler` | Bouton de fermeture d'un formulaire. |
| `Envoi en cours…` | Libellé du bouton occupé (réservation publique). |
| `Réservation confirmée.` | Toast de succès. |
| `Réservation enregistrée` | Titre du récapitulatif. |
| `Pour annuler ou modifier, contactez {contactAnnulation}.` | Pied du récapitulatif (repli `l'établissement`). |
| `Fermer` | Bouton du récapitulatif. |
| `Aucune réservation possible ce jour-là.` | Fiche d'un jour non ouvert (mode client). |
| `Épuisé` | Plat sans portion restante dans le formulaire R2. |
| `Chargement…` | Texte du voile. |
| `Réessayer` / `Nouvelle tentative…` | Bouton de l'encadré d'erreur de chargement. |
| `Commandes en ligne clôturées à 10h. Venez au restaurant {name2} à partir de 12h pour commander sur place.` | Cut-off Aristide (heures issues des constantes). |
| `prix d'un ticket restaurant` | Prix affiché d'un plat au ticket. |
| `Les places se mettent à jour automatiquement toutes les 3 minutes. Vous pouvez aussi actualiser la page.` | Pied de page statique. |

---

## 3. Fonctions utilitaires (`js/outils.js`) — à réécrire en TypeScript

Toutes les dates « ISO » sont des chaînes `YYYY-MM-DD` en **heure locale de l'appareil** (jamais `toISOString`, qui donnerait la date UTC).

| Signature (TS proposée) | Comportement exact |
| --- | --- |
| `toISO(d: Date): string` | `YYYY-MM-DD` à partir de `getFullYear/getMonth/getDate` (local), mois et jour sur 2 chiffres. |
| `todayISO(): string` | `toISO(new Date())`. |
| `addDaysISO(iso: string, n: number): string` | `new Date(iso + 'T00:00:00')` (minuit local), `setDate(+n)`, retour `toISO`. Gère les changements de mois/année et d'heure d'été. |
| `mondayOf(d: Date): Date` | Lundi de la semaine de `d` (dimanche → lundi précédent, −6 j), heure remise à 00:00:00.000. |
| `showToast(msg: string, isError?: boolean): void` | Écrit `msg` dans `#toast` (`role="status"`, `aria-live="polite"`), classes `toast show` (+ `error`). Retire `show` après **3500 ms**. Le minuteur précédent **n'est pas annulé** (voir points d'attention de `04`). |
| `formatDate(iso: string): string` | `Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })` sur `new Date(iso+'T00:00:00')`. Ex. `'2026-10-01'` → `jeudi 1 octobre 2026` (minuscule, sans « 1er »). Date invalide → `String(iso)`. Résultat mémoïsé par `iso` (Map). La majuscule initiale est ajoutée par CSS (`::first-letter`) dans `.day-date`, `.confirm-sub`, `.cal-label span`, `.date-trigger span`. |
| `escapeHtml(str: unknown): string` | `String(str ?? '')` avec `& < > " '` → `&amp; &lt; &gt; &quot; &#39;`. (Inutile en React sauf `dangerouslySetInnerHTML`.) |
| `formatEuro(n: number \| string): string` | `Number(n).toFixed(2).replace('.', ',') + '␣€'` (U+00A0). Ex. `12.5` → `12,50␣€` ; `'4.95'` → `4,95␣€`. Pas de séparateur de milliers. `NaN` → `NaN␣€`. |
| `gaugeStyle(rem: number, cap: number): string` | `--pct:{p}%;` avec `p = clamp(rem/cap*100, 0, 100)` à 1 décimale ; `cap <= 0` → `0.0`. Sert à la jauge des pastilles de capacité. |
| `confirmClick(btn: HTMLElement \| null, detail?: string): boolean` | Suppression en deux clics. `btn` nul → `true`. Déjà armé (`data-armed="1"`) → `true` (exécuter). Sinon : arme (mémorise `innerHTML`, fige `min-width` à la largeur courante, classe `armed`, texte `Confirmer ?`, `aria-label` et `title` = `detail`), programme `disarm` après 4000 ms, renvoie `false`. |
| `disarm(btn): void` | Annule l'armement : restaure libellé, retire classe, `min-width`, `aria-label`, `title`. |
| `clearFieldErrors(scope?: ParentNode): void` | Retire tous les `.field-error`, les classes `has-error`, et `aria-invalid` (via `unmarkInvalid`) dans `scope` (défaut `document`). |
| `markInvalid(input, msgId): void` | `aria-invalid="true"` ; `aria-describedby = msgId + ' ' + (data-help ?? '')` (trim). |
| `unmarkInvalid(input): void` | Retire `aria-invalid` ; `aria-describedby` = id de l'aide s'il existe, sinon retiré. |
| `linkLabels(root?): void` | Pour chaque `.field` : relie le `<label>` enfant direct au premier `input/select/textarea` (génère `id="champ-N"` si absent) ; si un `.field-help` enfant direct existe, lui donne l'id `{ctrlId}-aide`, le mémorise dans `data-help` et l'ajoute à `aria-describedby` (sauf si le champ est en erreur). En React : `htmlFor`/`useId`. |
| `contactFieldHtml(): string` | Champ e-mail des formulaires publics : label `Adresse email`, `input type="email" id="bk-contact" placeholder="Ex. Ariele.gsell@exemple.fr" autocomplete="email" inputmode="email" spellcheck="false"`, aide `Pour vous envoyer la confirmation.` |
| `emailError(v: string): string` | `''` si correct ; `'Indiquez votre adresse email.'` si vide ; `'Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr).'` si la regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` échoue. |
| `plural(n: number, word: string): string` | `n + ' ' + word + (n > 1 ? 's' : '')`. Ex. `0 couvert`, `1 couvert`, `2 couverts` (règle française : 0 et 1 au singulier). |
| `dash(text: string, sep = '␣— '): string` | `sep + text` si `text` non vide, sinon `''`. Séparateur par défaut : U+00A0, tiret cadratin, espace normale. Ex. `Bowl` + `dash('3,50␣€')` → `Bowl␣— 3,50␣€`. |
| `checkFields(btn, rules: [target: string \| Element, invalid: boolean, msg: string][]): boolean` | Formulaire = `btn.closest('.booking-form, .add-day, .settings-body')` (sinon `document`). Efface les erreurs du formulaire, puis pour chaque règle invalide : `fieldError(id, msg)` si `target` est un id, `blockError(el, msg)` sinon. S'il y a au moins une erreur : focus sur la première (`focusFirstError`) et `false`. Sinon `true`. Les règles sont évaluées dans l'ordre : l'ordre d'affichage suit l'ordre des règles. |
| `fieldError(inputId, msg): void` | Conteneur = `.field` ou `.item-row` ou parent ; ajoute `has-error`, ajoute `<p class="field-error" id="{inputId}-error">msg</p>` en fin de conteneur, `markInvalid`. |
| `blockError(el, msg): void` | Ajoute `has-error` à `el`, insère `<p class="field-error">msg</p>` **juste après** `el` (ex. rangée Élèves/Personnels/Extérieurs, ligne de total R2). Si `el` est un champ avec id : id du message + `markInvalid`. |
| `focusFirstError(scope?): void` | Focus sur le premier `.has-error input`, `.has-error select` ou `.has-error .date-trigger`. |
| Écouteur global `input` | À toute saisie dans un élément situé dans un `.has-error` : retire `has-error`, les `.field-error` internes, les `aria-invalid` internes (et de l'élément lui-même), et le `.field-error` frère suivant (cas `blockError`). L'erreur disparaît donc dès la première frappe. |
| `calState` (variable) | Déclarée dans `outils.js` : `{ r1: { mode:'week', anchor: todayISO(), selected: todayISO() }, r2: { … } }`. Jour sélectionné et vue de chaque calendrier (détail : spécification du calendrier). |

---

## 4. Fonctions fournies par les fichiers hors périmètre et utilisées par le périmètre

| Fichier | Fonctions / variables utilisées |
| --- | --- |
| `interface.js` | `bookingConfirmation` (variable), `confirmationHtml(rest)`, `closeConfirmation()`, `ICONS`, `renderPriceSuggestions()`, `segGroup(ariaLabel, items, cls)`, `enterKey`/`enterOnce(key)`, `reduceMotion`, `leaveThen(key, done)`, `lastCard`, `cardKey`, `cardEnter`, `popSeg(key)`. |
| `calendrier.js` | `renderCalendar`, `renderDetailR1`, `renderDetailR2` (fiches du jour, qui appellent `bookingFormHtml`, `bookingFormMultiHtml`, `reserveButtonHtml`), `selectDate`, `pickDate`, `menuAnim` (variable), `CAL_STATUS_WORD`. |
| `collegue.js` | `renderModeBox()`, `logoutAdmin()`, `renderDashboard()`, `renderSettings()`, `renderAdminFormR1/R2()`, `datePicker` / `dateChoice` (variables), `syncTicketPrice(cb)`, `editMaxR1(b)`, `addBookingButtonHtml`, `addBookingFormR1Html/R2Html`, `itemFormHtml`, `bookingActions`, `bookingEditForm`, `CHEVRON_PREV/NEXT`, `WEEKDAY_INITIALS`, `addBookingOpen`, `INACTIVITY_MS`. |
| `impression.js` | `getTomorrowISO()`, `showTomorrowSummary()`, `printDayR1/R2`. |

Inversement, le périmètre fournit aux autres fichiers : `state`, `isAdmin`, `adminPassword`, `dataStale`, `firstLoadDone`, `writeSeq`, `openBookingTarget`, `chosenServiceMode`, `multiBookingQty`, `draftItems`, `editBookingTarget`, `editItemTarget`, `addItemFormOpen`, `editDayR1Open`, `addDayOpen`, `apiGet`, `apiPost`, `fetchAdminState`, `loadAll`, `setBusy`/`clearBusy`, `showLoader`/`hideLoader`, `tokenMs`, `idx`, `remainingR1`, `remainingItem`, `itemsR2`, `dayHasTicket`, `serviceMode`, `r2OrdersClosed`, `r2ClosedMsg`, `capacityClass`, `dayStatusR1/R2`, `sumBy`, `plainName`, `withTicketMark`, `isTicket`, `flagTicket`, `itemPriceText`, `r2Amounts`, `amountsText`, `itemAmountText`, `ticketsText`, `newRequestId`, `emailWarning`, `priceR1`, `countsFieldsetR1Html`, `countsR1`, `updateR1PriceLive`, `formActionsHtml`, `editBookingFormR1Html/R2Html`, `render`, `restParts`, `resetFields`.

### Fonctions de `donnees.js` (référence rapide ; détail dans `01` et `02`)

| Fonction | Rôle |
| --- | --- |
| `renderTexts(s, initial)` / `saveTexts(s)` | Titres, descriptions, sous-titre ; mémorisation dans `reservations-textes`. |
| `saveCache(s)` / `loadCache()` | Copie locale anonymisée (voir `03`). |
| `reserveButtonHtml(onclick)` | `<div class="day-actions"><button class="btn primary">Réserver</button></div>`. |
| `tokenMs(token, fallback)` | Lit un jeton CSS de durée (`.35s`) en ms. |
| `showLoader()` / `hideLoader()` | Voile de chargement compté (réentrant). |
| `hedgedRead(first, since)` / `apiGet(silent, since)` | Lecture publique avec doublement et 2e tentative. |
| `setBusy(btn, label)` / `clearBusy(btn, orig)` | Bouton occupé. |
| `postJson(action, payload)` / `apiPost(action, payload)` | Écriture POST. |
| `adminSessionExpired()` | Déconnexion sur « Mot de passe incorrect. » en mode collègue. |
| `fetchAdminState(password)` | État complet (avec repli `checkPassword` pour un ancien script). |
| `adoptBookingState(res)` | Adopte la réponse d'une réservation publique. |
| `sumBy(list, key)` | Somme numérique d'une colonne (vide = 0). |
| `plainName`, `withTicketMark`, `isTicket`, `flagTicket`, `withTicketFlags` | Gestion du suffixe « (ticket restaurant) ». |
| `ticketsText(n)` | `plural(n,'ticket') + ' restaurant'` → `1 ticket restaurant`, `2 tickets restaurant`. |
| `itemPriceText(item)` | `prix d'un ticket restaurant` / `3,50␣€` / `''`. |
| `r2Amounts(lines)` / `amountsText(sum)` / `itemAmountText(item, qte)` | Montants R2 (voir `01` § 3.4). |
| `loadAll(background)` / `showLoadError()` / `retryLoad(btn)` | Chargement (voir `03`). |
| `idx()` | Index mémoïsés des données (Maps). |
| `remainingR1(day)`, `remainingItem(item)`, `itemsR2(iso)` | Places/portions restantes. |
| `dayHasTicket(iso)`, `serviceMode(iso)` | Règle ticket → sur place. |
| `r2OrdersClosed(iso)`, `r2ClosedMsg()` | Cut-off 10 h. |
| `capacityClass(rem, cap)`, `cachedStatus`, `dayStatusR1(iso)`, `dayStatusR2(iso)` | Disponibilité (`cap-ok` / `cap-low` / `cap-full`). |
