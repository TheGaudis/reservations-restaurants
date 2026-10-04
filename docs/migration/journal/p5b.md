# Journal de la session P5 (b) — ouvrir et modifier un jour

*4 octobre 2026. Branche locale `claude/p5b-jours`, partie de `00c8c17` (pointe de l'intégration après P5 (a)). Pas de PR ni de push : l'orchestrateur fusionne la branche locale. Chromium de `/opt/pw-browsers/chromium`, ports 4780 / 4781 / 63380. P5 (c) et P5 (d1) tournaient en même temps dans d'autres worktrees (charge machine jusqu'à 30 sur 4 cœurs).*

## Commits

1. `0a56b33` Sélecteur de date : champ nommé « Date » par son libellé (06 § 3.1).
2. `c48ac93` Mode collègue : ouvrir, modifier et supprimer un jour (06 § 3-5, D-19, D-21).
3. Journal et colonne `react` de `parite.md` (ce commit).

## Fait

- `features/staff/OpenDayPanel.tsx` : panneau « + Ouvrir un jour » des deux colonnes, bouton de dévoilement (`aria-expanded`, `aria-controls`) qui écrit `ouvrir` (`replace`) et oublie `ouvrirDate` ; pointillés teintés fermé, plein ouvert (`legacy/app.css`).
- `features/staff/OpenDatePicker.tsx` et `open-date.ts` : champ « Date » (06 § 3.1) sur `DatePickerPopover`, pastille des jours déjà ouverts (`dayStatusR1/R2`), date choisie dans `ouvrirDate` (`replace`) ; `useOpenDate` = `ouvrirDate`, sinon le jour sélectionné du restaurant.
- `OpenDayFormR1` : champs et exemples de 06 § 4.1 ; capacité obligatoire ; date passée refusée, jour déjà ouvert bloqué (D-19, E-36) ; après « Jour ajouté. » : panneau ouvert, date gardée, champs vidés, `selectDay` sur la date ouverte en gardant `ouvrir`.
- `OpenDayFormR2` et `DishDraftsR2` : champs de 06 § 4.2, lignes de plats (`withFieldGroup`, une ligne vide au départ et après succès, « + Ajouter un plat », croix « Retirer le plat {n} », case « Ticket restaurant » qui vide et désactive le prix, suggestions de prix triées) ; ligne incomplète et prix 0 refusés (D-19, D-22, E-36, E-39) ; jour déjà ouvert signalé sans bloquer ; date passée refusée.
- `EditDayFormR1` : `EditDayButtonR1` (`editJour=r1`, `aria-expanded`) et le formulaire de 06 § 5.1 ; capacité au moins égale aux couverts réservés, avec le message du script avant l'envoi ; refus du script sous la capacité et relecture de l'état ; focus rendu à « Modifier ce jour » après « Enregistrer » ou « Annuler » (E-48).
- `DeleteDayButton` : `ConfirmButton` (deux clics, occupé jusqu'à la réponse, E-04), note et `aria-label` D-21 avec le nombre de réservations (R2 : sans les orphelines, b-3) ; après « Jour supprimé. », focus sur la date de la fiche (`card-date-focus.ts`).
- `mutations/staff/days.ts` : `useOpenDayR1`, `useOpenDayR2`, `useEditDayR1` (relecture de l'état sur un refus du script), `useDeleteDay(restaurant)`, tous par `staffWriteOptions` (garde de session de P5 (a)).
- `domain/days.ts` : `dishDraftStatus`, `dishDraftInput`, `openDayDishes`, `openDateProblem`, `isR2DayOpen`, `priceSuggestions`, `bookingsOfDay`, avec leurs tables (`days.test.ts`, projets `node` et `node-ny`).
- `features/staff/day-messages.ts` : textes partagés par « Ouvrir un jour » R1 et « Modifier ce jour » ; les autres textes nouveaux vivent dans leur fichier ; `intl/staff-messages.ts` non modifié.
- Tests navigateur : `OpenDayFormR1.test.tsx` (7), `OpenDayFormR2.test.tsx` (9), `EditDayFormR1.test.tsx` (8), `DeleteDayButton.test.tsx` (4) sur `src/test/staff-column.tsx` (colonne de `column-page.tsx`, session ouverte par `open(SEED_PASSWORD)`, R-36).
- Stories (axe) : `OpenDayFormR1` (`Closed`, `Open`, `DatePicker`, `Errors`), `OpenDayFormR2` (`Open`, `VoucherLine`, `Errors`, `AlreadyOpen`), `EditDayFormR1` (`Open`, `BelowBooked`), `DeleteDayButton` (`AtRest`, `Armed`) ; `src/test/staff-story.ts` (horloge et session).

## Preuves

| Commande | Résultat |
| --- | --- |
| `pnpm check` | extraction, format, lint, `tsc` sans remarque ; Vitest 172 fichiers, 2 243 tests verts (node, node-ny, browser, storybook), aucun rejet non géré ; `knip` et `knip --production` sans remarque |
| `vitest run --project browser src/features/staff src/routes src/mutations src/ui/calendar` | 134 tests verts |
| `vitest run --project storybook src/features/staff src/ui/calendar` | 26 stories vertes sous axe |
| `pnpm build:e2e && git diff --exit-code src/routeTree.gen.ts translations/fr.json` | aucune différence |
| `pnpm test:e2e --project=react --grep "REG-33\) — (picker\|past\|day already)\|REG-34\|REG-35\) — (edit the day\|delete a day)\|write answered"` | 8 verts ; `--repeat-each=5` : 40 sur 40 |
| `pnpm test:e2e --project=react --grep "@C-04\|@C-05\|@C-06\|@C-13\|@C-14\|@C-30"` | 8 verts, 6 rouges hors de P5 (b) (voir « Contradictions ») |
| `pnpm test:e2e --project=react --grep "@p4\|@framework\|@L-01"` | 44 verts sur 44 (REG-02 rouge une fois sous une charge de 30, vert 3 sur 3 ensuite) |
| filtre proposé pour `ci.yml` (voir plus bas) | 52 verts sur 52 |
| `pnpm test:e2e --project=react-only` | 9 verts sur 9 |
| `pnpm test:e2e:legacy` | 76 verts sur 76 |
| `pnpm build && pnpm budget` (S3) | JS 178,7 kB gzip (limite 200 ; 174,7 kB à `00c8c17`), CSS 10,3 kB |
| `grep -rnE "use(Layout)?Effect\(" src … --exclude-dir=test` (S6) | 0 ligne |

Budget : `DatePickerPopover` (Base UI `Popover`) entre pour la première fois dans un morceau de production, celui de `/collegue`. Le module d'utilitaires DOM de `@floating-ui` qu'il partage avec le chemin initial (toasts, boutons) part alors en entier dans un morceau commun chargé au départ (`createBaseUIEventDetails-*.js`, 7,5 kB, et `useOpenChangeComplete-*.js`, 3,5 kB, à la place de `useId-*.js`, 5,1 kB) : +4,0 kB. Aucun code de P5 (b) n'est dans le chemin initial.

## Décisions

1. **Bouton du champ Date nommé « Date »** (`aria-labelledby` = libellé seul, date en `aria-describedby`) : l'ancien site le nomme par son `<label for>` (06 § 3.1) et REG-29, REG-33 le cherchent par ce nom exact. Revient sur la décision 9 de P3 (c) ; test et story de `DatePickerPopover` mis à jour.
2. **Erreur de date dérivée** : affichée dès le premier envoi tant que la date est refusée (`submissionAttempts > 0` et `openDateProblem`), sans état de champ ; un autre choix valide l'efface (06 § 3.3), un autre jour refusé affiche son propre message (comme E-46). `onSubmit` n'envoie rien tant que la date est refusée ; le focus va au bouton Date (`aria-invalid`).
3. **Capacité et stock en `TextField type="number" min=1`** (attributs de l'ancien site) plutôt que `NumberField` : exemples « Ex. 20 » et « 10 » à garder, aucun bouton −/+ hors des compteurs publics (E-34). Lecture par `parseCount` : « 2.5 » est refusé (l'ancien `parseInt` lisait 2).
4. **Lignes de plats** : une ligne sans nom, stock ni prix est ignorée (la case ticket seule aussi) ; nom sans stock, stock sans nom, stock < 1 ou prix seul = ligne incomplète, message sous le nom manquant, sinon sous le stock ; sans aucune ligne complète, « Ajoutez au moins un plat avec un nom et un stock. » sous le nom de la dernière ligne ; prix refusé (0, négatif, plus de deux décimales) sous le prix.
5. **Clé des lignes** : `DishLine` = `DishDraft` + `key` (`dish-lines.ts`), pour que React suive une ligne quand une autre part (règle `no-array-index-key`) ; la numérotation affichée reste la place.
6. **Focus dans les lignes** : « + Ajouter un plat » met le focus dans le nom de la nouvelle ligne ; la croix le rend à « + Ajouter un plat » (l'ancien code le perdait).
7. **Suggestions de prix** au format saisi « 4,50 » (`intl.formatNumber`, deux décimales), calculées par `priceSuggestions` de `domain/days.ts`.
8. **Jour R2 déjà ouvert** = présent dans `r2Days`, même sans plat (le script ajoute alors tous les plats) ; avertissement `Alert` « note » en `role="status"` sous la date, sans bloquer.
9. **« Modifier ce jour »** : le bouton bascule (`push` à l'ouverture, `replace` à la fermeture), porte `aria-expanded` comme les autres boutons de dévoilement ; formulaire monté avec `key={day.date}` ; le focus E-48 passe par une référence de module vers le bouton (il reste monté pendant que le formulaire s'ouvre et se ferme).
10. **Capacité sous les couverts réservés** contrôlée avant l'envoi avec le texte du script (`{used}` en chaîne, sans séparateur de milliers) ; un refus du script (réservations arrivées entre-temps) s'affiche sous la capacité et `useEditDayR1` relit l'état (a-4).
11. **D-21** : R1 compte les réservations de la date ; R2 celles des plats de la date, sans les orphelines (b-3), comme la fiche les montre.
12. **Focus après une suppression de jour** : `DeleteDayButton` retient la colonne (`<section>`) au clic ; après la réponse, `flushSync` puis focus sur le `<p>` de la date longue, rendu focalisable par script (`tabindex="-1"`). Voir « Changements souhaités ».
13. **Navigations** : panneau, date choisie, fermeture et calendrier après succès en `replace` ; seul l'ouverture de « Modifier ce jour » ajoute une entrée d'historique.
14. **Pas d'animation de fermeture** (`sink` de l'ancien site) : fermeture immédiate, comme le panneau de connexion de P5 (a).
15. **Id `staff.dish.error.zeroPrice`** (annexe F) défini dans `OpenDayFormR2.tsx` : P5 (c) en a besoin aussi (voir « Changements souhaités »).

## Contradictions

- **Un seul panneau « Ouvrir un jour » ouvert** : `ouvrir` vaut `r1` ou `r2` (PLAN § 3.2, `09` § 1) ; l'ancien site gardait les deux `<details>` ouverts (`addDayOpen.r1`, `addDayOpen.r2`). Ouvrir l'un ferme l'autre. Aucune ligne E-xx ni scénario ne couvre ce cas ; architecture → plan, à noter au § 4.2 si l'orchestrateur le juge observable.
- **Annexe F, dernier paragraphe** : le message du script « Impossible : {n} couvert(s) déjà réservé(s)… » serait « affiché avant l'envoi par « Ouvrir un jour » R1 (D-19) ». Un jour R1 déjà ouvert y est bloqué (E-36) : le contrôle s'applique à « Modifier ce jour » (06 § 5.1, D-19 « capacité ≥ couverts réservés »).
- **P3 (c), décision 9** (nom « Date lundi 5 octobre 2026 ») contre les scénarios REG-29 et REG-33 (`name: "Date", exact: true`) : décision 1.
- **Critère « @C-04, @C-05, @C-06, @C-13, @C-14 verts sur `react` »** : verts, les tests qui ne dépendent que de P5 (b) (8, liste plus haut). Rouges hors de P5 (b) : REG-33 « success » (sa dernière assertion « Aucune réservation. » attend `BookingListR1`, P5 (d1) ; tout le reste passe), REG-35 « delete a booking » (P5 (d1)), REG-37 (plats, P5 (c)), REG-29 principal (noms de la fiche, P5 (d1) ; « Paramètres », P5 (e)), REG-30 (« + Ajouter une personne », P5 (d2)), REG-31 (noms, P5 (d1)).
- **Glossaire (annexe E)** : « ligne de plat » y vaut `DishRow` (ligne d'un plat de la fiche) ; les lignes saisies de « Ouvrir un jour » R2 s'appellent ici `DishDraft` / `DishLine` (`draftItems` de l'ancien code). Terme à ajouter.

## Versions

Aucune version changée, aucun paquet ajouté.

## Overrides oxlint

Aucun.

## Fichiers partagés modifiés

- `src/ui/calendar/DatePickerPopover.tsx` (nom du bouton), son test et sa story (décision 1) ; aucun autre utilisateur en production.
- `translations/fr.json` (régénéré) ; `docs/migration/parite.md` (lignes C-04, C-05, C-06, C-13, C-14).
- Nouveaux fichiers de test : `src/test/staff-column.tsx`, `src/test/staff-story.ts`.

## Changements souhaités de fichiers partagés (orchestrateur)

- **`features/calendar/DayCard.tsx`** : date de la fiche focalisable (`tabIndex={-1}`) et demande de focus prise au montage ou au rendu (par exemple `requestCardDateFocus(iso)`), pour remplacer la recherche dans le DOM de `features/staff/card-date-focus.ts`. P5 (d1) (suppression d'une réservation) et P5 (c) (suppression d'un plat) ont le même besoin (E-48).
- **`intl/staff-messages.ts`** : y déplacer `staff.dish.error.zeroPrice` (aujourd'hui dans `OpenDayFormR2.tsx`) si P5 (c) le définit aussi : `formatjs extract --throws` refuse un même id avec deux descriptions. Même remarque pour la règle de prix et `priceSuggestions` (`domain/days.ts`) si P5 (c) écrit les siennes.
- **`.github/workflows/ci.yml`** : `E2E_REACT_GREP: "@p4|@framework|@L-01|@C-06|@C-13|REG-33. — (picker|past day|day already)|delete a day with bookings|write answered after the logout"` (52 tests verts ; « . » à la place de `\)`, invalide entre guillemets doubles en YAML).

## Reste à faire

- P5 (d1) : `BookingListR1` rend REG-33 « success » vert sans autre changement.
- Après la vague 10 : élargir `E2E_REACT_GREP` à `@p5`, unifier les suggestions de prix et la règle de prix avec P5 (c), remplacer `card-date-focus.ts` par l'API de `DayCard`.
- P7 : animation de fermeture des formulaires collègue (`sink`).

## Pour l'orchestrateur (PLAN.md)

- Journal du plan : « P5 (b) fusionnée : ouvrir un jour R1 et R2, modifier et supprimer un jour ; REG-34, REG-35 (jour), REG-33 (sauf « success », attend P5 (d1)) et la variante E-55 de REG-29 verts sur `react` ; budget 178,7 kB ».
- § 3.1 (`features/staff/`) : ajouter `OpenDayPanel`, `DishDraftsR2`, `open-date.ts`, `dish-lines.ts`, `day-messages.ts`, `card-date-focus.ts` ; (`domain/`) : `days.ts` (règles de « Ouvrir un jour », suggestions de prix, réservations d'un jour).
- § 3.5, ligne du sélecteur C-05 : « bouton nommé par le libellé « Date » (06 § 3.1), date affichée en description ».
- Annexe E : « ligne de plat de « Ouvrir un jour » | dish draft (`DishDraft`, `DishLine`, `DishDraftsR2`) ».
- § 4.2 : décider si « un seul panneau « Ouvrir un jour » ouvert » mérite une ligne E-xx (contradiction 1).
