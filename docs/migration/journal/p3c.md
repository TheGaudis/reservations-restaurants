# Journal de la session P3 (c) — Calendrier et sélecteur de date

*3 octobre 2026. Branche locale `claude/p3c-calendrier`, partie de la pointe de l'intégration (P0, P1 (a1), (a2), (b), P2 (a), (b1), (c), P3 (0), (b)), puis rebasée sur `366502a` (P3 (a), `VITEST_BROWSER_PORT`) et sur `d03b52e` (P2 (b2) ; conflit d'`.oxlintrc.json` résolu en gardant les deux overrides). P2 (b2) tournait en parallèle jusqu'à son intégration.*

## Fait

- `src/intl/calendar.ts` : `calendarDayLabel(iso, { status, past, ordersClosed })` → « {date longue}, {état}[, passé] » (05 § 2.5), « 1er » (E-21), suffixe « , commandes closes » d'un jour non passé dont les commandes sont closes (E-43). Ids `public.calendar.day.*` ; `r2Closed` vient de l'annexe F.
- `src/ui/calendar/CalendarGrid.tsx` : `<table role="grid">` nommée par le libellé de période, `<td aria-selected>` avec un `<button>` par jour, un seul `tabIndex=0` (05 § 2.6), `aria-current="date"` sur le bouton d'aujourd'hui, en-têtes « L M M J V S D » masqués (`Intl`, jour `narrow`), pastille d'état. Variante `calendar` : les flèches sélectionnent (`onSelect(iso, { viaKeyboard: true })`) ; variante `picker` : les flèches déplacent le focus, `onShowDay` demande un autre mois, jours passés `aria-disabled`, jours des autres mois vides.
- `src/ui/calendar/CalendarHeader.tsx` : ‹ libellé › (`IconButton` de P3 (a), `tonal` pour une colonne, standard pour le sélecteur), libellé `aria-live="polite"`, `children` pour la seconde ligne (« Semaine | Mois », « Aujourd'hui »). Messages `ui.calendar.{previous,next}{Week,Month}`.
- `src/ui/calendar/DatePickerPopover.tsx` : champ bouton (date longue, icône), `Popover` de Base UI (`role="dialog"`, « Choisir la date »), ‹ mois ›, grille `picker`, légende « déjà ouvert ». Messages `ui.datePicker.*`.
- `src/test/calendar-demo.tsx` : calendrier de colonne câblé comme P4 (b) le fera, l'URL remplacée par un état local (`clickDay`, `selectDay`, `shiftPeriod`, `goToToday`, `calendarDayLabel`, `ViewToggle`, `Button`). Les tests et les stories passent par lui.
- Stories : `Week`, `Month`, `SelectedDayOutsidePeriod`, `SelectedDayOfNextMonth`, `PastDays`, `OrdersClosed` (R2, magenta), `Keyboard` ; sélecteur : `Closed`, `Open`, `OpenR2`.
- Tests : `intl/calendar.test.ts` (tables, `node` et `node-ny`), `CalendarGrid.test.tsx` (structure, souris), `CalendarGrid.keyboard.test.tsx` (table des touches), `DatePickerPopover.test.tsx`.

## Preuves

- `pnpm check` après le second rebase : 118 fichiers, 1 853 tests, knip propre dans les deux modes.
- `pnpm vitest run --project browser --project storybook src/ui/calendar` : 5 fichiers, 71 tests (61 navigateur, 10 stories avec axe).
- Table des touches de 05 § 3.2 au clavier réel (`userEvent.keyboard`), 21 lignes en vue semaine et mois, dont 31 janvier + Page ↓ → 28 février 2027, 29 février 2028, 31 mars − 1 mois → 28 février (E-07) ; sélection, libellé de période, focus et unique `tabIndex=0` vérifiés après chaque touche ; enchaînement de REG-11 rejoué.
- Violation volontaire (`aria-label` retiré des jours) : le projet `storybook` échoue, « Buttons must have discernible text (button-name) » ; remis, 10 stories vertes.
- `grep -rn "useLayoutEffect\|useEffect" src/ui/calendar` : vide. `grep -rnE "#[0-9a-fA-F]{3,6}|[0-9]+px" src/ui/calendar --include=*.module.css` : vide.
- `pnpm build:e2e`, puis `git diff --exit-code src/routeTree.gen.ts translations/fr.json` : vide. `pnpm build-storybook` : vert.
- `pnpm test:e2e --project=react-only` (ports 4610/4611) : 5 réussis. `pnpm test:e2e --project=legacy e2e/regression/calendar.spec.ts` : 4 réussis (REG-09 à REG-12, page objects inchangés).
- REG-09 sur `react` échoue faute de calendrier dans la page (« element(s) not found » sur le libellé de période) : P4 (b) câble la grille.

## Décisions

1. **Vraie table.** `<div role="grid">` avec `role="row"` et `role="gridcell"` tombe sous `jsx-a11y/prefer-tag-over-role` ; `<table role="grid">` sous `no-noninteractive-element-to-interactive-role`. La table garde ses rôles sans attribut ; override décrit plus bas.
2. **Testing Library lit un `<td>` de table `grid` comme `cell`**, sans `aria-selected`. Chromium, Playwright et axe le lisent `gridcell` : les tests navigateur cherchent `gridcell` et `{ selected: true }`, axe ne signale rien (une cellule `cell` porteuse d'`aria-selected` lèverait `aria-allowed-attr`). Un `role="gridcell"` explicite tombe sous `no-redundant-roles`. Les `play` des stories cherchent donc la case choisie par `[aria-selected="true"]`.
3. **Focus sans effet.** Le gestionnaire focalise la case visée si elle est dans le DOM ; sinon il la retient dans une ref, et la ref callback du bouton qui se monte la focalise si le focus est sur `<body>` **ou encore dans la grille**. Le second cas vient d'un défaut trouvé par la table des touches : du 31 janvier 2028, Page ↓ montre février, qui garde la ligne du 31 janvier ; la case d'origine reste dans le DOM avec le focus, qui ne tombe jamais sur `<body>`. Une grille qui vient de se monter ne prend jamais le focus.
4. **Lignes clés par leur lundi** : une semaine présente dans les deux mois garde sa ligne et sa case focalisée (React ne déplace pas un nœud conservé dans une liste triée).
5. **Libellés des cases dans `intl/calendar.ts`**, pas dans `ui/` : les mots d'état sont du métier, et `intl/amounts.ts` porte déjà des ids `public.*`. Les libellés du sélecteur (« déjà ouvert », « passé ») restent dans `DatePickerPopover` (`ui.datePicker.*`), qui les compose lui-même : « passé » existe sous deux ids, même texte.
6. **‹ › rendus par `CalendarHeader`** avec `onPrevious` / `onNext` : `IconButton` n'accepte pas de `render` vers un `<Link>`. P4 (b) appelle `navigate({ search, replace: true })` dans le gestionnaire de clic (voir « Contradictions »).
7. **Arrêt de tabulation du sélecteur** (06 § 3.2) : la date choisie si elle est dans le mois, sinon aujourd'hui s'il est dans le mois, sinon le 1er ; même résultat que « premier jour du mois ≥ aujourd'hui, sinon le premier jour ».
8. **Appui à l'extérieur** : `onOpenChange` lit `details.reason === "outside-press"` et passe `finalFocus={false}` ; Échap, choix d'un jour et second clic sur le champ rendent le focus au champ.
9. **Nom du champ** : `aria-labelledby` = libellé « Date » puis la date affichée (« Date lundi 5 octobre 2026 »).
10. **Transitions de vue** : `transitionName` (prop) pose `view-transition-name` sur le libellé et la grille ; la chorégraphie (types `next` / `prev` / `zoom-*` / `day-*`, fiche et colonne de 05 § 3.4) revient à P4 (b), qui lance les navigations. La règle `*` de `base.css` n'atteint pas les pseudo-éléments `::view-transition-*` : les animations de P4 (b) devront se ranger sous `@media (prefers-reduced-motion: no-preference)`.
11. **Opacité de 38 %** écrite `0.38`, comme `Button` de P3 (a) ; aucun jeton ajouté à `tokens.css`.
12. **Stories** : un argument à type littéral (`restaurant: "r1"`) doit s'écrire `as const` dans `preview.meta({ args })`, sinon `meta.story` attend `never` (relevé pour P4).

## Contradictions

- **06 § 3.2 (`aria-pressed`) contre la grille partagée du PLAN § 3.5** : le sélecteur reprend `role="grid"` et `aria-selected` (motif « Date Picker Dialog » de l'APG). E-05 ne nomme que le calendrier. Proposition : étendre E-05 au sélecteur (C-05, REG-33), ou ajouter un écart. Retour arrière : une variante de rendu dans `CalendarGrid`.
- **06 § 3.2 « version dépliée sous le champ »** : le popover Base UI flotte sous le champ (`Positioner`, côté bas, aligné au début) et recouvre la suite du formulaire au lieu de la pousser. Même ouverture, mêmes touches.
- **CLAUDE.md (« Navigation par `<Link search>` ») contre PLAN § 3.2 (‹ › en `replace`)** : `IconButton` ne rend pas de lien ; P4 (b) navigue dans le gestionnaire de clic. Autre option : `render` sur `IconButton` (P3 (a)).
- **05 § 2.2-2.3** : la grille ne porte plus « Jours de la semaine — flèches pour changer de jour » ; le PLAN § 3.5 la nomme par le libellé de période (E-05).
- **Lancement « Ne touche pas : domain/, intl/dates.ts »** : `intl/calendar.ts` est un fichier nouveau ; `knip.json` reçoit `calendar` dans la ligne de `dates` et `amounts` (commit séparé `cb369a2`).

## Versions

Aucune version changée, aucun paquet ajouté.

## Overrides oxlint

- `src/ui/calendar/*.tsx` : `jsx-a11y/no-noninteractive-element-to-interactive-role` avec `{ "table": ["grid"], "td": ["gridcell"] }`, options de la configuration recommandée d'eslint-plugin-jsx-a11y (commit `862f979`). Exemple minimal : `<table role="grid" aria-label={label}><tbody><tr><td aria-selected="false"><button …/></td></tr></tbody></table>` est refusé sans l'override ; avec lui, il passe et `<ul role="grid" />` reste refusé (vérifié).
- Corrections du code sans override : `max-lines-per-function` (composants `DaySquare`, `WeekdayHeader`, `MonthPanel`), `no-nested-ternary`, `strict-boolean-expressions`, `curly`, `prefer-query-selector` (`CSS.escape` de l'id), `no-object-type-as-default-prop`, `max-params` (lignes de table en objets), `prefer-dom-node-dataset`, `max-lines` (tests du clavier dans leur fichier).

## Reste à faire

- P4 (b), `features/calendar/RestaurantCalendar.tsx` : cases par `weekCells` / `monthCells(calendarAnchor(…))`, `dot` = `dayStatusR1/R2`, `label` = `calendarDayLabel(iso, { status, past: isPast(iso, today), ordersClosed })` (R2 : `isR2OrderingClosed(iso, now)`), `outside: !inMonth` ; `onSelect` : `viaKeyboard` → `selectDay` + `replace`, sinon `clickDay` + `push` ; ‹ › → `shiftPeriod` (`replace`) ; libellé `formatPeriodLabel` ; seconde ligne : `ViewToggle` « Affichage du calendrier » (Semaine | Mois) et `Button` « Aujourd'hui » (`goToToday`) dans `children` ; `transitionName` unique par restaurant ; chorégraphie des transitions (décision 10) ; retirer `"!src/intl/{dates,amounts,calendar}.ts!"` de `knip.json`.
- P5 (b) : champ « Date » de « Ouvrir un jour » : `<label id htmlFor>` « Date », `DatePickerPopover` (`isMarked` = jour déjà ouvert, `accent`), lien à TanStack Form (`invalid`, `describedBy` vers l'erreur). Page object `react` de REG-33 : dialogue « Choisir la date », `gridcell`, champ nommé « Date {date} ».
- Orchestrateur : trancher le sélecteur en grille (« Contradictions ») et la navigation des ‹ ›.
- P7 (a) : retirer `"!src/ui/**!"` de `knip.json` (P3 (0)).

## Pour la PR

Titre : « P3 (c) : calendrier maison et sélecteur de date (`CalendarGrid`, `CalendarHeader`, `DatePickerPopover`) ».

- Composants sans métier : cases, sélection, état et libellés fournis par l'appelant ; `calendarDayLabel` (`intl/calendar.ts`) construit les libellés de 05 § 2.5.
- Fichiers partagés modifiés : `.oxlintrc.json` (override de la grille, `862f979`), `knip.json` (une ligne, `cb369a2`).
- Nouveau fichier de test commun : `src/test/calendar-demo.tsx`.
- Décisions à valider : sélecteur en grille (E-05 à étendre), ‹ › en gestionnaire de clic.
- Aucune action humaine.
