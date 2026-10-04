# Journal de la session P7 (a) — suite de régression complète sur `react`

*4 octobre 2026. Branche locale `claude/p7a-parite`, partie de `bacfe9d` (P0 à P6, correctifs des scénarios instables), rebasée sur `822c295` (P7 (b) fusionnée). Pas de PR ni de push : l'orchestrateur fusionne la branche locale. Chromium de `/opt/pw-browsers/chromium`, ports 4870 / 4871 / 63470. P7 (b) tournait en parallèle dans un autre worktree ; charge relevée par `uptime` toutes les 15 s pendant chaque passe.*

## Commits

1. Outillage : exclusions knip retirées, code mort supprimé (PLAN § 3.1, S7).
2. CI : suite de régression entière sur `react`, sans filtre par étiquettes (PLAN P7, S1).
3. Tests : textes de `translations/fr.json` comparés à la spec et à l'annexe F (PLAN § 1.5 S2).
4. Journal, `parite.md` et Statut de P7 (ce commit).

## Fait

- **Suite entière sur `react`** : la suite de régression ne trouvait plus d'écart non listé. Aucun correctif du nouveau code n'a été nécessaire ; une seule instabilité relevée (REG-40, voir « Instabilités »).
- **CI** (`.github/workflows/ci.yml`) : `E2E_REACT_GREP` et l'étape filtrée disparaissent ; une étape lance `--project=react-only --project=legacy --project=react`.
- **knip** : `knip.json` n'a plus d'exclusion de `src/ui/`, `src/domain/`, des fichiers d'`api/`, ni l'entrée `src/mutations/staff/*.ts`. Balises `@public` retirées (`intl/amounts.ts`, `intl/dates.ts`, `intl/staff-messages.ts`, `api/early-fetch.ts`) : chacun de ces exports a un importeur de production.
  - Supprimés (aucun importeur de production, seulement leurs tests) : `canBookR1`, `canOrderR2` (`domain/bookings.ts`), `isSoldOut` (`domain/capacity.ts`), `seatsLineR1` (`domain/print.ts`), `stepCount`, `nonNegativeInteger`, `atLeast`, `atMost` (`domain/validation.ts`), `R2_ONSITE_HOUR`, `PRINT_FONTS_TIMEOUT_MS` (`domain/constants.ts`), avec leurs cas de test. Les fiches `DayCardR1` / `DayCardR2` calculent « Réserver » et « Épuisé » avec les valeurs qu'elles affichent ; `ui/print/print.ts` garde son propre `FONTS_TIMEOUT_MS` (`ui/` sans métier).
  - `BOOKINGS_DOMAIN` et `SETTINGS_DOMAIN` écrits en clair (`"bookings"`, `"settings"`), comme `days` et `dishes` (reste de p5a).
  - `@internal` (ignoré par `knip --production`) sur les exports lus par leurs seuls tests, utilisés dans leur propre fichier : `SETTINGS_API_KEYS`, `SeatTotalSchema`, `PortionTotalSchema`, `PublicStateSchema`, `EmailStatusSchema`, `BookingResultSchema`, `StaffServiceDayR1Schema`, `StaffServiceDayR2Schema`, `BookingR1Schema`, `BookingR2Schema`, `stateUrl`, `wasAdjusted`, `SummaryDish`, `r1Totals`, `ordersForDay`, `dishTotals`, `r2DayTotals`, `OrderLine`, `OrderItem`, `priceText`, `isEmail` (aussi lu par le faux script), `VOUCHER_MARK` (aussi lu par `e2e/pages/storage.ts`), `VOUCHER_MARK_RE`, `vouchersText`, `staffWriteKey`.
- **S2** : `src/test/message-sources.test.ts` (projet `node`) découpe chaque `defaultMessage` en fragments littéraux (hors `{arguments}`, `#` et `<b>`, options de pluriel et de choix comprises) et cherche chacun dans `docs/spec/*.md` ou l'annexe F du plan ; « ␣ », U+00A0, U+202F, apostrophe typographique, `**`, `` ` ``, balises HTML et « (s) » (lu « » ou « s ») sont normalisés. 342 messages, tous trouvés. Contre-épreuve : « Réserver » changé en « Réservez vite » dans une copie de `fr.json` → le test échoue sur `common.action.book`.
- **Étiquette `@G-07`** posée sur REG-27 « wrong passwords and network error » et REG-17 : seul identifiant de `09` sans étiquette dans `e2e/regression/`. Aucune assertion touchée.
- **`parite.md`** : colonne `react` complétée (plus aucun « partiel » ni « attend ») ; liste attendue des étiquettes `@changed` (48) et tableau du § 4 mis à jour (E-51 à E-53, E-56 à E-58 « n/a ») ; bilan au § 6.

## Preuves

| Commande | Résultat |
| --- | --- |
| `pnpm test:e2e --project=react` (avant tout changement, `bacfe9d`) | 75 verts sur 76 ; REG-40 rouge une fois (délai de 30 s, charge 9 à 11), voir « Instabilités » |
| `pnpm test:e2e --project=react --repeat-each 3` (`bacfe9d` + commit 1) | 228 verts sur 228, charge jusqu'à 18,8 (P7 (b) en parallèle) |
| `pnpm test:e2e --project=legacy --project=react --project=react-only --repeat-each 3`, passe 1 (après rebase sur `822c295`, `pnpm build:e2e`) | 516 verts sur 516 en 7,2 min ; charge maximale 8,2 |
| idem, passe 2 (après `pnpm check`, avec ce journal) | 516 verts sur 516 en 7,1 min ; charge maximale 8,5 |
| `playwright test --list --project=legacy` / `--project=react` (avec et sans `--grep @parity`) | 76 titres identiques ; 28 tests `@parity` identiques |
| `changedTagsMatchPlanGaps` (`suite.spec.ts`, dans chaque passe) | vert : 48 étiquettes `@changed` = lignes du § 4.2 avec scénario |
| `pnpm check` | extraction, format, lint, `tsc` sans remarque ; Vitest 211 fichiers, 2 853 tests verts (node, node-ny, browser, storybook) ; `knip` et `knip --production` sans remarque |
| `pnpm build:e2e && git diff --exit-code src/routeTree.gen.ts translations/fr.json` | aucune différence |
| S6 : `grep -rnE "use(Layout)?Effect\(" src … --exclude-dir=test` | 0 occurrence |

### Critères S1, S2, S4, S6, S7, S8

- **S1** : passes ci-dessus ; chaque identifiant de `09` a une étiquette dans `e2e/regression/` (vérifié par une boucle `grep` sur les 51 identifiants ; seul `@G-07` manquait, posé par le commit 3) ; matrice complète dans `parite.md` § 5 et bilan au § 6.
- **S2** : `src/test/message-sources.test.ts`, 342 messages trouvés dans la spec ou l'annexe F ; les tests de textes exacts des composants (P4 à P6) restent dans `pnpm check`.
- **S4** : `e2e/hydration.spec.ts --repeat-each 5 --workers 1`, rapport JSON (annotation `timeline`) : squelette inséré à 154-173 ms, contenu de la copie à 371-401 ms, soit **208 à 247 ms** de squelette (seuil 600 ms) ; charge 2,8 à 7,1 (sous 2 × 4 cœurs) ; variante « titres mémorisés seuls » : squelette jusqu'à la réponse du script retenue 5 s (4 920 à 4 932 ms), comme attendu. REG-02 vert dans chaque passe.
- **S6** : 0 `useEffect` ni `useLayoutEffect` dans `src/` hors tests.
- **S7** : `pnpm check` vert ; build de `pnpm build:e2e` sans différence des fichiers générés.
- **S8** : tests de `routes/-collegue.test.tsx`, `mutations/staff/write.test.tsx` (déconnexion pendant une écriture retenue), `background/logout.test.ts` dans `pnpm check` ; `e2e/staff-session.spec.ts` (`react-only`) et REG-29, REG-30, REG-31 (`react`) dans chaque passe.

## Assertions des scénarios modifiées depuis P1

`git log --format='%h %s' 48d61c7..HEAD -- e2e/regression` (48d61c7 = dernier commit de P1 (d)) liste cinq commits avant cette session ; chacun figure dans un journal :

| Commit | Scénario | Changement | Journal |
| --- | --- | --- | --- |
| `360b30a` | REG-03 (d) « a read that never answers » (`@changed:E-45`) | variante `react` : clic sur « Réessayer » avant d'attendre la fiche ; variante `legacy` inchangée | `p4a.md` (arbitrage de l'orchestrateur) |
| `6ea6e4a` | REG-29 « write answered after the logout » | `@parity` → `@changed:E-55` ; toast « Jour modifié. » sur `legacy`, aucun sur `react` | `p5a.md`, `p5b.md` (E-55 au § 4.2) |
| `663a547` | aide `enterStaffMode` (`print-helpers.ts`) | connexion par `login()` ; aucune assertion | `p6a.md` |
| `22d646f` | REG-03 « no new attempt offline », REG-05 | dernière ligne `context.setOffline(false)` retirée (lecture de rattrapage après la fin du test) ; aucune assertion | `fix-flaky-reg02-reg05.md` |
| `309536f` | REG-02 (`@changed:E-47`) | mesure de 600 ms prise de l'insertion du squelette, plus du début de la navigation ; ordre squelette puis contenu asserté ; seuil inchangé | `fix-flaky-reg02-reg05.md`, PLAN § 1.5 S4 |

Cette session : étiquette `@G-07` ajoutée à deux tests (aucune assertion).

## Reste à faire des journaux

| Journal | Point | Suite |
| --- | --- | --- |
| p0a, p0b | entrées knip « retirer en P0 (b) / P3 (0) / P4 (a) » | faites (aucune entrée restante dans `knip.json`) |
| p0c | retirer `E2E_REACT_GREP` | fait (commit 2) |
| p0c | confirmer la CI sur GitHub | orchestrateur (aucun push depuis cette session) |
| p0c, p2b2 | job `deploy`, README, tests dorés avec `legacy/` | reportés à P8 (périmètre de la bascule) |
| p1a1 | construire `dist/client` avant `test:e2e:legacy` | déjà fait : `pnpm build:e2e` précède l'étape E2E |
| p1b | ignorer l'avertissement de préchargement d'une feuille externe dans `e2e/fixtures.ts` | reporté : fichier de l'orchestrateur (§ 5.0) ; les `consoleLog.allow(BLOCKED_FONT_PRELOAD)` fonctionnent ; demande dans le compte rendu |
| p1b | `grepInvert` de `@legacy-only` sur `react` | inutile : REG-07 et REG-40 « popup blocked » ont une branche `react`, verte |
| p1d | supprimer `print-helpers.ts` | gardé : `enterStaffMode` passe par `login()`, le fichier garde `NAME1`, `NAME2` et cette aide, lus par `print.spec.ts` et `print-tomorrow.spec.ts` |
| p2a, p2b1, p2b2, p2c, p3-0, p3a, p3b, p3c, p4a, p4d, p5a, p6b | exclusions knip et balises `@public` | faites (commit 1) |
| p2b1 | test grep des champs du script avec `api/staff-schemas.ts` | déjà fait : `src/test/api-boundary.test.ts` |
| p4c, p4d, p5a, p5b, p5d1, p5d2 | animations de sortie (`sink` des formulaires, repli de la liste R2, panneau de connexion) | non reprises : fermeture immédiate, comme sous mouvement réduit ; aucun scénario ne l'observe ; écart proposé E-59 (compte rendu) |
| p5b | `card-date-focus.ts` remplacé par une API de `DayCard` | clos par l'orchestrateur : une seule fonction dans `features/calendar/card-date-focus.ts` (journal du plan, P5 (b)) |
| p5b | unifier suggestions et règle de prix | fait en P5 (c) / (b) (`price-suggestions.ts`, `domain/dishes.ts`) |
| fix-view-transition-ci | passe figée du projet `browser` | non reproduite pendant cette session (voir « Instabilités ») |
| fix-flaky-reg02-reg05 | décision sur S4 | prise par l'orchestrateur (§ 1.5, E-47) |
| p7b | knip `!src/domain/**!`, REG-02, REG-03, REG-05 | knip fait ; REG-02, REG-03, REG-05 verts sur les trois passes |

## Décisions

1. **`@internal` plutôt qu'une exclusion de dossier** : un export lu par son seul test et par son propre fichier (schéma intermédiaire, total d'impression, sous-règle) reste exporté pour les tables de cas de la spec ; la balise le dit export par export, là où `!src/domain/**!` cachait aussi le code mort.
2. **Code mort supprimé avec ses tests** plutôt que câblé : brancher `canBookR1` ou `isSoldOut` dans les fiches dupliquerait les calculs qu'elles font déjà pour l'affichage (restant, jauge).
3. **Test S2 par fragments** : un message ICU ne figure jamais tel quel dans la spec (placeholders, pluriels, « (s) ») ; chaque fragment littéral doit y figurer mot pour mot. Un message qui change un mot échoue ; un message qui recombine des fragments de la spec dans un autre ordre passe (limite acceptée, « aux placeholders près » de l'annexe F).

## Contradictions

- `parite.md` § 1 annonçait 45 étiquettes `@changed` ; le § 4.2 en compte 48 avec scénario (E-50, E-54 et E-55 ajoutés en cours de route) et le test `changedTagsMatchPlanGaps` lit le plan : liste corrigée.

## Instabilités (charge de la machine)

- **REG-40 « printR1List »** (`print.spec.ts:35`) : rouge une fois, lors de la toute première passe `react` (test n° 21, charge 9 à 11) : délai de 30 s du test dépassé sur `expect(...).toBeVisible()` de l'en-tête du document, la ligne précédente (titre de la page) verte, test long de 35,6 s au lieu de 1,8 s. Le temps s'est perdu avant cette ligne, dans une action sans délai propre (`actionTimeout` vaut 0 : `goto`, `click`, `fill`, `getAttribute` de `login()`, `waitForFunction` de `printedDocument`) ; la trace a été écrasée par la passe suivante. Non reproduit ensuite : 15 répétitions ciblées de `print.spec.ts` et `print-tomorrow.spec.ts`, 3 répétitions de la suite `react`, puis les passes complètes. Aucun correctif sans cause établie ; à surveiller en CI (traces gardées, `retain-on-failure`).
- Passe figée du projet `browser` (fix-view-transition-ci) : non revue, `pnpm check` a fini en 139 s.
- Une commande de cette session, mal écrite (variable vide), a lancé la suite depuis le dépôt principal `/home/user/reservations-restaurants` à 16 h 57 (sortie dans `/full1.log` et `/tr-full1`) ; arrêtée au bout de 3 min. Deux serveurs statiques qu'elle avait démarrés (`serve-pages.ts`, ports 4310 et 4311) n'ont pas pu être arrêtés depuis la session : signalé à l'orchestrateur.

## Overrides oxlint

- `.oxlintrc.json`, override `import/no-nodejs-modules` des tests Node de `src/test/` : `src/test/message-sources.test.ts` ajouté (lit `translations/fr.json`, `docs/spec/` et le plan par `node:fs`, comme `api-boundary.test.ts`).

## Versions

Aucune.

## Fichiers partagés modifiés

- `knip.json`, `.oxlintrc.json` (P0 (a), overrides justifiés) ; `.github/workflows/ci.yml` (P7 (a) propriétaire du filtre, § 5.0) ; `docs/migration/parite.md` (colonne `react`, P7) ; `PLAN.md` : colonne « Statut » de P7 seulement.

## Pour l'orchestrateur (PLAN.md)

- Journal du plan : « P7 (a) : suite de régression entière, sans filtre, verte trois fois sur `legacy`, `react` et `react-only` (516 sur 516, deux fois) ; aucun écart non listé ; `E2E_REACT_GREP` retiré de la CI ; exclusions knip retirées, code mort supprimé, `@internal` pour les exports lus par leurs seuls tests ; test S2 `src/test/message-sources.test.ts` ; S4 : squelette 208 à 247 ms. »
- § 4.2 : écart proposé **E-59** (animations de sortie), texte dans le compte rendu.
- § 3.1 : `src/test/message-sources.test.ts` (S2) ; `domain/validation.ts` sans `stepCount`, `atLeast`, `atMost`, `nonNegativeInteger`.
- Annexe D : les lignes P5, P6 et P7 du tableau « Ordre de lecture » contiennent le Statut des phases au lieu des rapports à lire (remplacement automatique du Statut, probablement) ; à rétablir.
