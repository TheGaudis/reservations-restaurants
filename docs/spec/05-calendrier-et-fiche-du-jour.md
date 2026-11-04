# 05 — Calendriers et fiches du jour

Sources : `js/calendrier.js` (rendu, clavier, fiches), avec des fonctions venant de `js/donnees.js` (`idx`, `remainingR1`, `remainingItem`, `itemsR2`, `capacityClass`, `dayStatusR1`, `dayStatusR2`, `r2OrdersClosed`, `r2ClosedMsg`, `reserveButtonHtml`, `itemPriceText`, `itemAmountText`), `js/outils.js` (`calState`, `toISO`, `todayISO`, `addDaysISO`, `mondayOf`, `formatDate`, `formatEuro`, `gaugeStyle`, `plural`, `dash`, `escapeHtml`), `js/interface.js` (`segGroup`, `popSeg`, `cardEnter`, `lastCard`, `cardKey`, `confirmationHtml`, `ICONS`, `reduceMotion`), `js/collegue.js` (`CHEVRON_PREV`, `CHEVRON_NEXT`, `WEEKDAY_INITIALS`, formulaires collègue) et `js/main.js` (`render`, `restParts`, `PARTS`). Styles : `app.css` (sections « Calendrier » et « Fiche du jour »).

Le formulaire de réservation du public (contenu, validations, envoi) est spécifié dans `04-parcours-public-reservation.md`. Ce document indique seulement **où** et **quand** il apparaît dans la fiche. Les formulaires du mode collègue qui s'ouvrent dans la fiche sont détaillés dans `06-mode-collegue.md`.

---

## 1. Vue d'ensemble

La page affiche **deux colonnes indépendantes**, une par restaurant :

| Colonne | Conteneur | Thème | Titre (`#title-rX`, nom réglable) | Description (`#desc-rX`) |
| --- | --- | --- | --- | --- |
| Restaurant 1 (« R1 ») | `#col-r1.col.accent-green` | vert | `state.name1` (défaut « Restaurant Pédagogique ») | `state.desc1` |
| Restaurant 2 (« R2 », « Aristide ») | `#col-r2.col.accent-magenta` | magenta | `state.name2` (défaut « Aristide ») | `state.desc2` |

Chaque colonne contient, dans cet ordre :

1. `.col-head` avec le titre `h2.slash-mark` (marque oblique devant le nom) ;
2. `p.desc` (description) ;
3. `#admin-rX` : panneau « Ouvrir un jour » (mode collègue uniquement, vide sinon) ;
4. `#cal-rX` : le calendrier (contient un squelette de chargement tant qu'aucune donnée n'est rendue) ;
5. `#detail-rX` : le récapitulatif de réservation éventuel puis la **fiche du jour sélectionné**.

Chaque restaurant a son propre état de calendrier (`calState.r1`, `calState.r2`), initialisé au chargement :

```js
{ mode: 'week', anchor: todayISO(), selected: todayISO() }
```

- `mode` : `'week'` (défaut) ou `'month'` ;
- `anchor` : une date ISO (`AAAA-MM-JJ`) qui détermine la semaine ou le mois affiché ;
- `selected` : la date ISO du jour sélectionné (celui dont la fiche est affichée) ;
- `slide` (transitoire) : `1`, `-1` ou `0`, sens du glissement du libellé quand les transitions de vue ne sont pas disponibles.

Les deux calendriers sont **totalement indépendants** (navigation, mode, sélection). L'état n'est pas persistant : au rechargement, chaque calendrier revient à la semaine courante, aujourd'hui sélectionné.

Toutes les dates sont calculées en **heure locale du navigateur** (`toISO` lit `getFullYear/getMonth/getDate`), jamais en UTC.

---

## 2. Rendu du calendrier (`renderCalendar(rest, containerId, statusFn)`)

`statusFn` vaut `dayStatusR1` pour R1 et `dayStatusR2` pour R2.

### 2.1 Cases affichées

| Mode | Cases | Calcul |
| --- | --- | --- |
| Semaine | **7** cases, du lundi au dimanche de la semaine contenant `anchor` | `mondayOf(anchor)` puis +0…+6 jours ; toutes marquées « dans le mois » (`inMonth: true`) |
| Mois | **42** cases (6 semaines complètes), du lundi de la semaine contenant le 1er du mois de `anchor` | `inMonth` = la case appartient au mois de `anchor` |

- La semaine commence **toujours le lundi** (`mondayOf` : dimanche → lundi précédent).
- Un seul mois (ou une seule semaine) est affiché à la fois. **Aucune borne** : on peut naviguer indéfiniment dans le passé et le futur.
- Au premier affichage : semaine courante, aujourd'hui sélectionné.

### 2.2 Structure HTML produite

```html
<div class="cal-header">
  <button class="icon-btn tonal" data-nav="r1-prev" aria-label="Semaine précédente">‹ (CHEVRON_PREV)</button>
  <div class="cal-label" aria-live="polite"><span class="[axis-next|axis-prev]">21 – 27 sept. 2026</span></div>
  <button class="icon-btn tonal" data-nav="r1-next" aria-label="Semaine suivante">› (CHEVRON_NEXT)</button>
</div>
<div class="cal-toggle">
  <div class="seg-group small" role="group" aria-label="Affichage du calendrier">
    <button class="seg-btn" data-seg="cal-r1-week" aria-pressed="true">✓ Semaine</button>
    <button class="seg-btn" data-seg="cal-r1-month" aria-pressed="false">Mois</button>
  </div>
  <button class="btn ghost small" data-nav="r1-today">Aujourd'hui</button>
</div>
<div class="cal-grid" role="group" aria-label="Jours de la semaine — flèches pour changer de jour">
  <div class="wd-label" aria-hidden="true">L</div> … (L M M J V S D)
  <button type="button" class="cal-cell …" data-iso="2026-09-21" aria-label="…" aria-pressed="false" tabindex="-1">
    <span class="cal-num" aria-hidden="true">21</span>
    <span class="cal-dot dot-cap-ok" aria-hidden="true"></span>   <!-- seulement si jour de service -->
  </button>
  …
</div>
```

### 2.3 Libellés exacts

| Élément | Mode semaine | Mode mois |
| --- | --- | --- |
| Libellé central (`.cal-label`) | `{jour du lundi} – {jour du dimanche} {mois abrégé du dimanche} {année du dimanche}`, ex. « 21 – 27 sept. 2026 » (formateurs `Intl` fr-FR : `{day:'numeric'}` et `{day:'numeric', month:'short'}`) | `{mois} {année}` avec majuscule initiale, ex. « Octobre 2026 » |
| `aria-label` bouton ‹ | « Semaine précédente » | « Mois précédent » |
| `aria-label` bouton › | « Semaine suivante » | « Mois suivant » |
| `aria-label` de la grille | « Jours de la semaine — flèches pour changer de jour » | « Jours du mois — flèches pour changer de jour » |
| Groupe segmenté | `aria-label="Affichage du calendrier"`, segments « Semaine » et « Mois » | idem |
| Bouton | « Aujourd'hui » | idem |
| En-têtes de colonnes | `L M M J V S D` (`aria-hidden="true"`) | idem |

Le séparateur du libellé de semaine est un tiret demi-cadratin entouré d'espaces (« – »). Le libellé de mois est capitalisé en JS ; le CSS ajoute aussi `.cal-label span::first-letter{text-transform:uppercase}`.

### 2.4 Statut d'un jour (pastille)

`dayStatusR1(iso)` / `dayStatusR2(iso)` renvoient `'cap-ok'`, `'cap-low'`, `'cap-full'` ou `null` (pas de service). Le résultat est mémorisé par date jusqu'au prochain remplacement de `state` (`idx().status`).

**Règle de seuil commune** (`capacityClass(rem, cap)`) :

| Condition (évaluée dans cet ordre) | Classe | Mot (`CAL_STATUS_WORD`) | Couleur de la pastille |
| --- | --- | --- | --- |
| `rem <= 0` | `cap-full` | « complet » | `--danger` (#B7372F) |
| `rem < cap * 0.5` (strictement moins de la moitié restante) | `cap-low` | « bientôt complet » | `--warning` (#9A600A) |
| sinon | `cap-ok` | « places disponibles » | `--success` (#4E7A12) |
| aucun jour de service | `null` | « aucun service » | pas de pastille |

- **R1** : jour présent dans `r1Days` → `rem = Capacite − somme des Qte des réservations du jour`, `cap = Capacite`.
- **R2** : le jour doit exister dans `r2Days` **et** avoir au moins un plat ; sinon `null`. `rem = somme des stocks restants de tous les plats du jour`, `cap = somme des Stock`. (Un jour peut donc être « places disponibles » alors qu'un plat est épuisé.)
- Exemple : capacité 20 → `cap-ok` de 20 à 10 restants, `cap-low` de 9 à 1, `cap-full` à 0 ou moins.

La clôture des commandes R2 à 10 h **n'influe pas** sur la pastille ni sur l'`aria-label` du calendrier.

### 2.5 Classes et attributs d'une case

| Condition | Classe / attribut | Effet visuel (app.css) |
| --- | --- | --- |
| Toujours | `.cal-cell`, `data-iso`, `type="button"` | carré (`aspect-ratio:1/1`), fond `--surface`, bordure `--border`, rayon `--radius-sm`, chiffre en `--fw-semibold`, chiffres tabulaires |
| Jour hors du mois affiché (mode mois uniquement) | `.cal-dim` | opacité `--outside-opacity` (.35), sauf si sélectionné |
| Jour passé (`iso < aujourd'hui`) | `.cal-past` | opacité `--past-opacity` (.55), sauf si sélectionné ; si à la fois passé et hors mois, c'est .35 qui s'applique (règle déclarée après) |
| Aujourd'hui | `.cal-today` + `aria-current="date"` | contour 2 px couleur d'accent (`border-color` + `inset 0 0 0 1px`) ; si aussi sélectionné, seul l'aplat compte |
| Jour sélectionné | `.cal-selected` + `aria-pressed="true"` (sinon `"false"`) | aplat `--accent`, texte `--text-on-accent` ; la pastille reçoit un anneau blanc de 2 px |
| Jour de service (a une pastille) | `:has(.cal-dot)` | fond `--accent-soft`, bordure `color-mix(--accent 35 %, --border)` |
| Survol (souris) | — | fond `--tint`, bordure `--accent` |
| Appui | — | `transform: scale(.96)` |
| Écran tactile (`pointer:coarse`) | — | `aspect-ratio:auto; min-height:48px` |

La pastille `.cal-dot` mesure `--dot-size` (6 px), ronde, `margin-top: --space-1`, classe `dot-cap-ok|dot-cap-low|dot-cap-full`.

**`aria-label` d'une case** (texte exact) :

```
{formatDate(iso)}, {mot du statut ou « aucun service »}[, passé]
```

Exemples : « vendredi 25 septembre 2026, places disponibles » ; « lundi 21 septembre 2026, aucun service, passé ». `formatDate` = `Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'})`, donc en minuscules.

### 2.6 Focus « roving tabindex »

- Une seule case a `tabindex="0"` : le jour sélectionné s'il est affiché, **sinon la première case affichée** ; toutes les autres ont `tabindex="-1"`.
- Tab entre donc une fois dans la grille, puis les flèches déplacent la **sélection** (pas seulement le focus, contrairement au sélecteur de date du mode collègue).
- Après chaque réaffichage, le focus est replacé sur la case choisie (`cell.focus({preventScroll:true})`) ; `render()` restaure aussi le focus des boutons `data-nav` (‹ › Aujourd'hui) et `data-seg` (Semaine/Mois).

---

## 3. Navigation

### 3.1 Souris / tactile

| Action | Fonction | Effet |
| --- | --- | --- |
| Clic ‹ / › | `navCal(rest, ±1)` | Semaine : `anchor ± 7 jours`. Mois : `anchor` = 1er du mois ± 1. **La sélection ne change pas.** Transition « axe partagé X » (`next` / `prev`). |
| Clic « Semaine » / « Mois » | `setCalMode(rest, mode)` | Sans effet si déjà dans ce mode. Sinon change `mode` (l'`anchor` est conservée), réaffiche le calendrier, animation `seg-pop` sur le segment. Transition « axe partagé Z » : `zoom-in` vers la semaine, `zoom-out` vers le mois. |
| Clic « Aujourd'hui » | `jumpToday(rest)` | `anchor = selected = aujourd'hui`. Si le libellé affiché change, transition `next` (aujourd'hui après l'ancre) ou `prev` ; sinon mise à jour immédiate. Réaffiche formulaire collègue, calendrier et fiche. |
| Clic sur une case (ou Entrée / Espace, comportement natif du bouton) | `pickDate(rest, iso, true)` | Sélectionne le jour (voir 3.3) ; transition `day-next` / `day-prev` de la fiche si le jour change. Un clic sur une case hors du mois (`.cal-dim`) la sélectionne **sans changer le mois affiché**. |

### 3.2 Clavier (`calKey`, écouteur `keydown` sur `.cal-grid`)

Actif seulement si la cible est une `.cal-cell`. Touche reconnue → `preventDefault()`.

| Touche | Jour visé depuis la case qui a le focus |
| --- | --- |
| `ArrowLeft` | −1 jour |
| `ArrowRight` | +1 jour |
| `ArrowUp` | −7 jours |
| `ArrowDown` | +7 jours |
| `Home` (Début) | lundi de la même semaine |
| `End` (Fin) | dimanche de la même semaine |
| `PageUp` | même jour du mois précédent (`Date.setMonth(m−1)`) |
| `PageDown` | même jour du mois suivant (`Date.setMonth(m+1)`) |
| `Enter`, `Space` | non traités par `calKey` : clic natif du bouton → `pickDate(rest, iso, true)` |

Ensuite :
1. si le libellé (semaine ou mois) du jour visé diffère du libellé affiché, `anchor = jour visé` (la vue suit, **sans glissement du libellé**) ;
2. `lastCard[rest]` est positionné pour que la fiche change **sans animation d'entrée** ;
3. `pickDate(rest, cible)` sans animation.

La fonction `keyTargetIso(key, iso)` est partagée avec le sélecteur de date du mode collègue.

### 3.3 Sélection d'un jour (`selectDate`)

```text
calState[rest].selected = iso
dateChoice[rest] = null            // le champ Date de « Ouvrir un jour » reprend le jour sélectionné
openBookingTarget = null           // ferme le formulaire de réservation public ouvert (dans N'IMPORTE QUEL restaurant)
bookingConfirmation = null         // ferme le récapitulatif affiché (dans n'importe quel restaurant)
render(restParts(rest))            // admin-rX, cal-rX, detail-rX (+ la fiche de l'autre restaurant si un formulaire/récapitulatif s'y fermait)
```

### 3.4 Transitions (`calTransition`)

- Utilisent `document.startViewTransition` si disponible **et** si `prefers-reduced-motion` n'est pas actif ; sinon mise à jour instantanée (le libellé reçoit alors `.axis-next` / `.axis-prev`, glissement 300 ms, sauf au clavier).
- Pendant la transition : `<html data-cal-anim="next|prev|zoom-in|zoom-out|day-next|day-prev" data-cal-rest="r1|r2">` ; seuls le libellé, la grille, la fiche et la colonne du restaurant concerné portent un `view-transition-name`.
- Durées : `--dur-slow` (0,35 s) pour ‹ › et Semaine/Mois ; `--dur` (0,2 s) pour un changement de jour. Courbe `--ease-standard`. Décalages : 32 px (`--space-8`) pour ‹ ›, 16 px pour un changement de jour ; zoom 0,8 ↔ 1,1 pour Semaine/Mois. L'ancien contenu s'efface dans les 35 % premiers de l'animation.
- `::view-transition{pointer-events:none}` : les clics enchaînés ne sont pas bloqués ; une transition abandonnée n'est pas une erreur.
- Dans React : ces transitions sont un « plus » ; le comportement fonctionnel (ce qui est sélectionné, affiché, focalisé) doit être identique sans elles.

---

## 4. Fiche du jour — éléments communs

### 4.1 Animation d'entrée

La fiche (`.day-card`) reçoit `.enter` (animation `rise`, 0,35 s, `--ease-enter`) **uniquement** quand la clé `iso + ('·a' en mode collègue | '·c' en mode client)` change (`cardEnter`). Un simple réaffichage (actualisation, saisie) ne rejoue pas l'animation. Au clavier, pas d'animation.

### 4.2 Jour passé

`iso < aujourd'hui` → `.day-card.is-past` : opacité .55 sur `.day-top`, `.menu-block`, `.day-meta`, `.item-name`, la jauge des plats, le texte des lignes de réservation et `.empty`. **Les boutons et formulaires du mode collègue restent nets.**

### 4.3 Jour sans service (`emptyDayCardHtml`)

Affiché si aucun jour n'existe à cette date (R1 : absent de `r1Days` ; R2 : absent de `r2Days`).

```html
<div class="day-card [is-past] [enter]">
  <div class="day-date">{formatDate(iso)}</div>
  <p class="empty">{message}</p>
</div>
```

| Mode | Message exact |
| --- | --- |
| Public | « Aucune réservation possible ce jour-là. » |
| Collègue | « Aucun jour ouvert. Utilisez le formulaire « Ouvrir un jour » pour en créer un à cette date. » |

La date `.day-date` est en Outfit 600, `--fs-xl`, couleur `--accent-ink`, première lettre en majuscule (CSS `::first-letter`).

### 4.4 Bloc de texte (`menuBlockHtml(label, text)`)

```html
<div class="menu-block"><span class="kicker">{label}</span><div class="menu-text">{texte échappé}</div></div>
```

Libellés utilisés : « Thème du jour », « Menu du jour » (R1), « Note » (R2). Le surtitre `.kicker` est en petites capitales (`--fs-2xs`, 600, `letter-spacing .1em`, majuscules CSS), filet supérieur `--border`.

### 4.5 Jauge de capacité (`.capacity-pill`)

- Classe d'état `cap-ok|cap-low|cap-full` (mêmes seuils que 2.4) ;
- style inline `--pct:{pourcentage restant, borné 0–100, 1 décimale}%` (`gaugeStyle(rem, cap)`) : la partie remplie représente la **part restante** ;
- texte : R1 « `{rem} / {Capacite} couverts` », R2 « `{rem} / {Stock}` » (sans unité). `rem` peut être négatif si la capacité a été baissée sous le nombre de réservés (voir Points d'attention).

### 4.6 Ligne de réservation (mode collègue, `bookingLine`)

Parties jointes par « — » (espaces **normales** de part et d'autre : `join(' — ')` dans `calendrier.js`, contrairement à `dash()` qui met une insécable avant le tiret), les parties vides étant omises :

```
<b>{Nom}</b> — {Classe} — {quantité} — {prix} — {mode} — {Contact} — <i>{Observation}</i>
```

- R1 : quantité `plural(Qte, 'couvert')` (« 1 couvert », « 3 couverts ») ; prix `formatEuro(PrixTotal)` si `PrixTotal` est « vrai » (un `PrixTotal` vide **ou égal à 0** n'est pas affiché) ; pas de mode.
- R2 : quantité `plural(Qte, 'portion')` ; prix `itemAmountText(plat, Qte)` (« 7,00 € », « 2 tickets restaurant » ou rien) ; mode « à emporter » si `Mode === 'emporter'`, sinon « sur place ».
- Suivie des boutons « Modifier » et « Supprimer » (voir 06).
- Ordre : ordre du tableau `state.r1Bookings` / `state.r2Bookings` (ordre d'insertion dans la feuille). **Aucun tri.**
- Liste vide : `<p class="empty compact">Aucune réservation.</p>`.

---

## 5. Fiche du jour — Restaurant 1 (`renderDetailR1`)

Données : `day = idx().r1Days.get(selected)`, `rem = remainingR1(day)`, `bookingsForDay = state.r1Bookings.filter(b => b.Date === day.Date)`, `isOpenForm` = formulaire public ouvert pour ce jour (`openBookingTarget = {rest:'r1', date}`).

### 5.1 Ordre exact du contenu de `#detail-r1`

1. **Récapitulatif** de la dernière réservation (`confirmationHtml('r1')`, voir 08 §6.1) — seulement s'il concerne ce restaurant et ce jour ;
2. `.day-card` :
   1. `.day-top` : date en toutes lettres + jauge « `{rem} / {Capacite} couverts` » ;
   2. bloc « Thème du jour » si `day.Theme` non vide ;
   3. bloc « Menu du jour » si `day.Menu` non vide ;
   4. *(collègue)* `<p class="day-meta">Ouvert par {OuvertPar}</p>` si renseigné ;
   5. *(public)* bouton **« Réserver »** (`.btn.primary` dans `.day-actions`) si : formulaire fermé **et** `rem > 0` **et** jour non passé ;
   6. *(public)* formulaire de réservation R1 si ouvert (dépliement `.form-reveal`) ;
   7. *(collègue)* bloc d'administration (5.3).

### 5.2 États côté public

| État | Condition | Rendu |
| --- | --- | --- |
| Pas de service | pas de jour | fiche vide, « Aucune réservation possible ce jour-là. » |
| Places disponibles | `rem ≥ Capacite/2` | jauge verte, bouton « Réserver » |
| Bientôt complet | `0 < rem < Capacite/2` | jauge orange, bouton « Réserver » |
| Complet | `rem ≤ 0` | jauge rouge « 0 / 20 couverts », **aucun bouton, aucun message** |
| Passé | `iso < aujourd'hui` | fiche pâlie, aucun bouton, aucun message |
| Formulaire ouvert | après clic sur « Réserver » | le bouton est remplacé par le formulaire |

Le restaurant 1 n'a **pas** d'heure limite le jour même : on peut réserver jusqu'à minuit tant qu'il reste des places.

### 5.3 Bloc collègue (R1)

```text
.bookings-list
   ligne de réservation + [Modifier] [Supprimer]   (pour chaque réservation)
   + formulaire de modification sous la ligne concernée (si ouvert)
.day-actions
   [+ Ajouter une personne]      (btn small ; seulement si rem > 0 ; aria-expanded="true" si le formulaire est ouvert)
   [Modifier ce jour]            (btn small)
   [🖨 Imprimer la liste]        (btn small, icône ICONS.print)
   [Supprimer ce jour]           (btn danger small, suppression en deux clics)
formulaire « Ajouter une personne » (si ouvert)
formulaire « Modifier ce jour » (si ouvert)
```

Ces boutons s'affichent **aussi pour les jours passés**. En mode collègue, le bouton public « Réserver » n'apparaît jamais.

---

## 6. Fiche du jour — Restaurant 2 (`renderDetailR2`)

Données : `items = itemsR2(selected)` (ordre de la feuille), `isClosed = r2OrdersClosed(selected)`, `isMultiOpen` = formulaire public ouvert pour ce jour et commandes non closes, `anyAvailable` = au moins un plat avec stock restant > 0.

### 6.1 Heure limite (constantes de `donnees.js`)

- `R2_CUTOFF_HOUR = 10`, `R2_ONSITE_HOUR = 12`.
- `r2OrdersClosed(iso)` = `iso < aujourd'hui` **ou** (`iso === aujourd'hui` **et** heure locale ≥ 10).
- Message exact (`r2ClosedMsg()`) : « Commandes en ligne clôturées à 10h. Venez au restaurant {name2} à partir de 12h pour commander sur place. »
- `main.js` programme un minuteur pour 10 h 00 pile (le jour même si avant 10 h, sinon le lendemain) : à l'échéance, si un formulaire R2 est ouvert sur un jour désormais clos il est fermé, puis toute la page est réaffichée ; le minuteur se réarme pour le lendemain.

### 6.2 Ordre exact du contenu de `#detail-r2`

1. Récapitulatif (`confirmationHtml('r2')`) éventuel ;
2. `.day-card` :
   1. `.day-top` : date seule (**pas de jauge globale**) ;
   2. bloc « Thème du jour » si `day.Theme` ;
   3. bloc « Note » si `day.Note` ;
   4. *(collègue)* « Ouvert par {OuvertPar} » ;
   5. **liste des plats** (`.menu-list` > `.menu-list-inner` > une `.item-row.stacked` par plat) ;
   6. *(collègue)* formulaire « Ajouter un plat » ou bouton « + Ajouter un plat à ce jour » ;
   7. *(public)* note de clôture `.note-warning.closed-note` (texte de `r2ClosedMsg()`) si : public **et** jour non passé **et** commandes closes (donc aujourd'hui à partir de 10 h) ;
   8. *(public)* bouton **« Réserver »** si : formulaire fermé **et** `anyAvailable` **et** commandes non closes ;
   9. *(public)* formulaire de commande multi-plats si ouvert ;
   10. *(collègue)* `.day-actions` : [🖨 Imprimer la liste] [Supprimer ce jour] (danger, deux clics).

### 6.3 Ligne d'un plat

```html
<div class="item-row stacked">
  <div class="item-row-head">
    <span class="item-name">{Nom}{ — prix}</span>
    <span class="capacity-pill cap-…" style="--pct:…">{rem} / {Stock}</span>
  </div>
  (collègue) .item-actions : [+ Ajouter une personne] (si rem > 0) [Modifier ce plat] [Supprimer ce plat] (danger)
  (collègue) formulaire « Ajouter une personne » de ce plat (si ouvert)
  (collègue) formulaire « Modifier ce plat » (si ouvert)
  (collègue) .bookings-list des réservations de ce plat
</div>
```

Prix (`itemPriceText`) : « 3,50 € » (`formatEuro`, virgule, espace insécable avant €), « prix d'un ticket restaurant » pour un plat au ticket, ou rien si pas de prix ; précédé de « — » (via `dash`).

### 6.4 Repli de la liste pendant une commande (public)

- Au clic sur « Réserver » : `menuAnim = 'up'` → la liste est rendue une dernière fois avec `.collapsing` (`inert`, `aria-hidden="true"`, animation de hauteur vers 0 en 0,35 s) ; aux rendus suivants elle est **absente** (le formulaire reprend chaque plat).
- À l'annulation : `menuAnim = 'down'` → la liste réapparaît avec `.expanding`.
- Si la carte est au-dessus de l'écran, elle est ramenée en vue (`scrollIntoView({block:'start'})`).

### 6.5 États côté public

| État | Condition | Rendu |
| --- | --- | --- |
| Pas de service | pas de jour R2 | fiche vide, « Aucune réservation possible ce jour-là. » |
| Jour sans plat | jour présent, 0 plat | date (+ thème/note), aucune liste, aucun bouton, aucun message ; le calendrier montre « aucun service » |
| Ouvert | non clos, ≥ 1 plat disponible | liste + « Réserver » |
| Tous les plats épuisés | non clos, aucun stock | liste (jauges rouges « 0 / n »), **aucun bouton, aucun message** |
| Fermé à 10 h | aujourd'hui, heure ≥ 10 | liste + note de clôture, pas de bouton |
| Passé | `iso < aujourd'hui` | liste pâlie, pas de bouton, **pas de note** |
| Formulaire ouvert | après « Réserver » | liste repliée, formulaire de commande |

---

## 7. Comportement responsive

| Largeur / dispositif | Effet |
| --- | --- |
| > 760 px | les deux colonnes côte à côte (`grid-template-columns:1fr 1fr`, écart 24 px) |
| ≤ 760 px | colonnes empilées (R1 au-dessus de R2) ; champs à 16 px |
| ≤ 640 px | colonne : padding 24/16/16 px ; en-tête de page en colonne |
| ≤ 520 px | grilles de formulaire `.row2` / `.row3` sur une seule colonne |
| `pointer:coarse` | cases du calendrier hautes d'au moins 48 px (le carré n'est plus imposé) ; boutons ≥ 44 px (`.small` ≥ 36 px + zone invisible) |
| `hover:hover` | survols actifs seulement avec une souris |

La grille du calendrier est toujours en 7 colonnes `minmax(0,1fr)`, écart 4 px. La fiche a `scroll-margin-top: 16px`.

---

## 8. Recommandations pour la migration React

- **État dans l'URL** : par restaurant, date sélectionnée et mode (ex. `?r1=2026-10-05&r1vue=mois&r2=2026-10-06`). L'ancre peut se déduire de la date sélectionnée sauf après ‹ › (prévoir `r1semaine=` / `r1mois=` ou accepter que l'ancre soit un état local).
- Composants suggérés : `<Calendrier restaurant mode ancre selection statut(iso) onSelect>` (pur, testable), `<CaseJour>`, `<FicheJourR1>`, `<FicheJourR2>`, `<LignePlat>`, `<JaugeCapacite rem cap unite>`.
- Conserver exactement : semaine commençant le lundi, 42 cases en mode mois, roving tabindex, `aria-label` des cases, seuils de `capacityClass`, ordre des éléments de la fiche, conditions d'affichage du bouton « Réserver ».
- Calculer les statuts à partir d'un index mémoïsé (`useMemo` sur l'état des données), comme `idx()`.

---

## 9. Points d'attention

1. **Libellé de semaine à cheval sur deux mois** : seul le mois du dimanche est indiqué (« 28 – 4 oct. 2026 » pour la semaine du 28 septembre). Ambigu ; à cheval sur deux années, l'année du lundi n'apparaît pas non plus.
2. **Page ↑ / Page ↓ en fin de mois** : `Date.setMonth()` déborde (31 janvier + 1 mois → 3 mars, ou 2 mars une année bissextile ; 31 mars − 1 mois → 3 mars). Le comportement attendu d'un sélecteur de date ARIA est de borner au dernier jour du mois.
3. **Complet sans mot** : sur la fiche, un jour complet (R1) ou un plat épuisé n'affiche que « 0 / n » en rouge ; le mot « complet » n'existe que dans l'`aria-label` du calendrier. La charte exige que la couleur d'état soit toujours accompagnée d'un mot (le PDF montre d'ailleurs un badge « Complet »). Même remarque pour « bientôt complet ».
4. **Aucun message** côté public pour un jour passé, un jour R1 complet, ou un jour R2 dont tous les plats sont épuisés : la fiche n'explique pas pourquoi il n'y a pas de bouton « Réserver ».
5. **R2 : jour ouvert sans plat** → calendrier « aucun service » alors que la fiche montre un jour existant (date, thème, note).
6. **R2 : statut agrégé** : la pastille additionne les stocks de tous les plats ; un jour peut être vert alors que le plat principal est épuisé.
7. **Fermeture à 10 h non visible dans le calendrier** : un jour du jour après 10 h reste « places disponibles ».
8. **Sélection d'un jour = fermeture globale** : cliquer un jour dans un restaurant ferme le formulaire public ouvert et le récapitulatif **de l'autre restaurant** aussi (`openBookingTarget` et `bookingConfirmation` sont uniques pour la page).
9. **Capacité négative** : si un collègue rouvre un jour R1 existant avec une capacité inférieure aux réservations (voir 06), la jauge affiche un nombre négatif (« -2 / 10 couverts »).
10. **Jours hors mois cliquables** : en mode mois, cliquer un jour grisé du mois voisin le sélectionne sans changer de mois ; la case sélectionnée reste affichée hors mois.
11. Les collègues voient « + Ajouter une personne » sur les **jours passés** (R1 et R2) : ajout de réservations a posteriori possible.
