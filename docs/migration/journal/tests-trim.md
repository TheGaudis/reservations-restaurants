# Journal de la session « allègement des tests »

*4 novembre 2026. Bookmark `claude/tests-trim`, parti de `claude/frontend-react-migration-lw5zfz` (`adb2288`, retrait des contrôles de politique). Demande de l'orchestrateur : retirer les tests qui répètent un autre test (faux script testé pour lui-même, E2E en double, fonctions `play` des stories, cas qui redisent la même branche) et fusionner les utilitaires à un ou deux utilisateurs. Le site ne change pas.*

## Fait

| Zone | Avant | Après |
|---|---:|---:|
| Tests de `src/` (hors `src/test/`, `src/mocks/`) | 15 559 (121 fichiers) | 14 709 (119 fichiers) |
| Tests de `src/mocks/` | 1 303 (6 fichiers) | 0 |
| Stories | 3 272 (55 fichiers) | 2 808 (55 fichiers) |
| E2E (`e2e/`, page objects compris) | 5 452 (39 fichiers) | 5 296 (37 fichiers) |
| Utilitaires de `src/test/` | 1 074 | 866 |
| Faux script (`src/mocks/`, hors tests) | 1 414 | 1 414 |

Lignes comptées par `wc -l`. Les tests de `src/test/` (`legacy-golden.test.ts`, 102 lignes) ne bougent pas.

- Faux script : `src/mocks/apps-script.test.ts`, `public-actions.test.ts`, `staff.test.ts`, `staff-r1.test.ts`, `staff-r2.test.ts` et `fixtures/seed.test.ts` retirés. knip signalait ensuite `getState`, `postAction`, `postStaff`, `rowsOf` de `src/test/fake-script-server.ts` (retirés) et l'export `APPS_SCRIPT_URL_PATTERN` de `apps-script.ts` (devenu local). Le commentaire de `src/api/actions-staff.test.ts` ne renvoie plus à `staff.test.ts`.
- E2E : `e2e/staff-session.spec.ts` et `e2e/smoke.spec.ts` retirés. Le titre de la page et `lang="fr"` passent dans `publicPageFromFakeScript` de `e2e/regression/smoke.spec.ts` (mêmes valeurs sur l'ancien site). Projet `production` retiré de `playwright.config.ts`, avec `smoke-production.spec.ts` dans le `testIgnore` de `react-only`. `react-only` garde `a11y.spec.ts`, `hydration.spec.ts` et `print-pdf.spec.ts` ; la commande de la CI reste valide.
- Stories : 26 fichiers retouchés dans `src/features/` (hors `page/`), 18 dans `src/ui/` (détail en décision 2). Deux stories retirées : `DishForm.DishActions` (même état que `BookingList.R2Bookings`) et `CalendarGrid.Keyboard` (même état que `Week` sans sa fonction `play`).
- Tests réduits (avant → après, en lignes) : `api/state.test.ts` 235 → 118, `background/clock.test.ts` 254 → 202, `staff/TomorrowPanel.test.tsx` 223 → 172, `print/ListDocumentR1.test.tsx` 203 → 102, `staff/SettingsPanel.test.tsx` 194 → 109, `queries/client.test.ts` 198 → 156, `mutations/bookings.test.tsx` 193 → 99, `api/hedged-read.test.ts` 188 → 134, `api/early-fetch.test.ts` 69 → 40, `api/early-fetch-script.test.tsx` 96 → 82, `ui/calendar/CalendarGrid.keyboard.test.tsx` 203 → 83, `ui/calendar/DatePickerPopover.test.tsx` 244 → 237.
- Utilitaires : `OrderFormR2.send.test.tsx` fusionné dans `OrderFormR2.test.tsx`, `src/test/order-form-r2.tsx` recopié en tête du fichier ; `DishForm.edit.test.tsx` fusionné dans `DishForm.test.tsx`, `src/test/staff-dishes.tsx` recopié de même. Les deux utilitaires sont retirés.

## Décisions

1. **Cas retirés.** Un cas part quand un autre test affirme la même chose : le tableau `retryRead` de `state.test.ts` (relance, réponse `{ error }`, hors ligne), `hedged-read.test.ts` (relance à 6 s, 30 s, annulation), `transport.test.ts` (échecs `html` et `network`), le tableau `keyTargetIso` de `domain/dates.test.ts`, `cutoff.test.ts` (10 h et heure d'été), ou un scénario de `e2e/regression/` : REG-22 à REG-25 (commande R2), REG-32 (paramètres), REG-37 (plats), REG-39 et REG-42 (panneau « Demain »), REG-40 (liste R1). Un cas survivant garde son texte et ses assertions. Deux tableaux `it.each` perdent des lignes : deux totaux de `ListDocumentR1.test.tsx` (vérifiés par REG-40) et sept touches de `DatePickerPopover.test.tsx` (reste une touche dans le mois et une qui change de mois).
2. **Fonctions `play` gardées.** Il en reste une quand l'état montré ne s'atteint que par une interaction ou une attente ; elle garde alors les gestes et une seule attente finale, sans assertion :
   - bouton armé : `ConfirmButton.Armed`, `ArmedWithDetail`, `BookingList.DeleteArmed`, `DeleteDayButton.Armed`, `DishForm.DeleteArmed` ;
   - popover ouvert : `DatePickerPopover.Open`, `OpenR2` (attente de la fin du fondu), `OpenDayFormR1.DatePicker` ;
   - formulaire après un envoi refusé : `Form.Errors`, `NumberField.Error`, `PriceField.Error`, `TextField.Error`, `BookingFormR1.Errors`, `TooManySeats`, `OrderFormR2.Errors`, `AddBookingFormR1.Errors`, `OpenDayFormR1.Errors`, `OpenDayFormR2.Errors`, `SettingsPanel.InvalidValues`, `DishForm.AddDishRefused`, `EditStockBelowBooked`, `EditDayFormR1.BelowBooked` ;
   - envoi en cours : `SubmitButton.Busy`, `BusyStaff`, `BookingFormR1.Sending`, `OrderFormR2.Sending` ;
   - saisie : `PasswordField.Shown`, `OrderFormR2.WithTotal`, `OpenDayFormR2.VoucherLine`, `ViewToggle.Chosen` ;
   - toast affiché : `Toaster.Success`, `Neutral`, `Error` ;
   - données lues au faux script par msw : les stories de `DayCardR1`, `DayCardR2`, `RestaurantCalendar`, des cartes et formulaires collègue, `TomorrowPanel` et la méta de `BookingSummary` attendent le premier texte chargé ; sans cette attente, axe contrôlerait l'état de chargement.
3. **Assertions de story gardées faute d'autre test.** `NumberField.DishAtMax` (« + » en `aria-disabled` au maximum, D-18), `icons.Blue` (`aria-hidden` sur les 14 icônes), `icons.Restaurant1` et `Restaurant2` (couleur d'accent par `currentColor`), `StaffDayCardR2.OpenDay` (thème « Semaine italienne », pas de « Réserver » ; `StaffDayCardR2` n'a pas de `.test.tsx`). À déplacer dans un `.test.tsx` pour suivre la convention.
4. **Clavier du calendrier.** `CalendarGrid.keyboard.test.tsx` garde le focus et l'arrêt de tabulation qui suivent la sélection (trois lignes : dans la semaine, semaine suivante, mois suivant), la suite de touches de REG-11 et la sortie par une seule tabulation. La cible de chaque touche reste dans le tableau `keyTargetIso` ; le test doré de `legacy-golden.test.ts` ne bouge pas.
5. **Fusion de `OrderFormR2` et `DishForm`.** `max-lines` (300) refuse les fichiers fusionnés tels quels (426 et 310 lignes). Sept cas de `OrderFormR2` (totaux, « À emporter », « Épuisé », plat manquant, mode envoyé, portions ajustées, rien d'accordé, fermeture d'un formulaire valide à 10 h) et deux de `DishForm` (ouverture de l'édition, stock sous les portions réservées) partent : REG-22 à REG-25 et REG-37 les vérifient, E-46 reste dans `app-form.test.tsx` et `TextField.test.tsx`, le mode `emporter` dans `api/actions.test.ts`.
6. **E2E retirés.** `e2e/staff-session.spec.ts` n'affirmait rien de plus que REG-28 à REG-31 (`staff-access.spec.ts`, `regression/staff-session.spec.ts`), `logout.test.ts` (paramètres d'URL gardés à la déconnexion) et `-collegue.test.tsx` (mot de passe absent du stockage et de l'URL). De `e2e/smoke.spec.ts`, le lien profond `/collegue` servi par `404.html` reste couvert par `staffGuardReload` (REG-28, rechargement de `/collegue`) et la redirection de `/index.html` par `src/routes/-routes.test.tsx`. Ces deux contrôles ne passent pas dans la suite de régression : l'ancien site n'a ni `/collegue` ni redirection.
7. **Hors périmètre.** `app-form.test.tsx` garde ses quatre cas, tous distincts ; sa longueur vient du formulaire de démonstration. Fusion de `src/test/StoryRouter.tsx` et `story-router.tsx`, et suppression de `src/test/TestToaster.tsx` : non faites, parce que `src/features/page/ModeSwitch.test.tsx` importe `StoryRouter` et `TestToaster`, et `ModeSwitch.stories.tsx` importe `story-router` ; `src/features/page/**` appartient à la session parallèle. Les stories de `src/features/page/` (`ConfigBanner`, `Header`, `LoadErrorBox`, `ModeSwitch`, `Page`, `PageSkeleton`) gardent leurs fonctions `play` pour la même raison.

## Vérification

- `pnpm check` : vert au troisième passage (180 fichiers, 1 840 tests ; knip vert). Les deux premiers passages ont échoué sur `src/background/start.test.ts` (« starts the clock, the inactivity timer and the logout steps » : `expected 1791185700000 to be 1791185400000`, l'horloge cinq minutes en avance). Ce fichier n'a pas changé ; il passe seul, avec le projet `browser` entier, et deux fois de suite avec `vitest run` sur tous les projets. Test instable à suivre.
- `pnpm build:e2e` puis `git diff --exit-code src/routeTree.gen.ts translations/fr.json` : aucun écart.
- `pnpm test:e2e --project=react-only --project=legacy --project=react` : 159 sur 159 (166 avant, moins les 3 tests de `smoke.spec.ts` et les 4 de `staff-session.spec.ts`).

## Overrides

- Aucun.

## Reste

- `start.test.ts` instable sous `pnpm check` (ci-dessus).
- Les assertions de la décision 3 à déplacer dans un `.test.tsx`.
- La décision 7 pour la session qui possède `src/features/page/`.

## Pour CLAUDE.md et PLAN.md (orchestrateur)

- Stories : « une story = un état rendu, contrôlé par axe ; l'interaction s'affirme dans le `.test.tsx` ». Une fonction `play` ne sert qu'à atteindre l'état montré (bouton armé, popover ouvert, formulaire après un envoi refusé, données chargées). À écrire dans `CLAUDE.md` § Tests, à la place de « Une story CSF Next par composant et par état, testée avec axe ».
- Projet `production` : retiré de `playwright.config.ts`. `CLAUDE.md` § Tests (« projet `production` en lecture seule (P8) ») et le PLAN (§ 2, ligne `@playwright/test` ; § 3.1, `playwright.config.ts` et `e2e/smoke-production.spec.ts` ; P8, livrables) le citent encore : à retirer, ou à recréer avec le fichier en P8.
- § 3.1 : retirer `e2e/smoke.spec.ts`, `e2e/staff-session.spec.ts`, les tests de `src/mocks/` (`apps-script.test.ts`, `public-actions.test.ts`, `staff.test.ts`, `staff-r1.test.ts`, `staff-r2.test.ts`, `fixtures/seed.test.ts`), `src/test/order-form-r2.tsx`, `src/test/staff-dishes.tsx`, `OrderFormR2.send.test.tsx` et `DishForm.edit.test.tsx`. P0 (« Tests attendus ») cite `e2e/smoke.spec.ts` : la racine et les deux titres sont dans `e2e/regression/smoke.spec.ts`, la redirection de `/index.html` dans `src/routes/-routes.test.tsx`.
- `CLAUDE.md` § Tests : « projet `react-only` pour le nouveau code (smoke, hydratation, impression PDF, accessibilité) » devient « (hydratation, impression PDF, accessibilité) ».
