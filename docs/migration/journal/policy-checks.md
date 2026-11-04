# Journal de la session « contrôles de politique »

*4 novembre 2026. Bookmark `claude/policy-checks`, parti de `claude/frontend-react-migration-lw5zfz` (`0cbec05`, montée des dépendances). Demande de l'orchestrateur : retirer les contrôles qui font respecter une règle d'écriture du code par un script ou un méta-test, sans tester le produit. Le site ne change pas.*

## Fait

- CI (`.github/workflows/ci.yml`, job `check`) : étapes « Effects budget (PLAN § 1.5, S6) » et « No escaped no-break space in messages (PLAN § 3.10, R-34) » retirées. Les autres étapes restent, dont « No mock service worker in the build » (R-28).
- Méta-tests retirés de `src/test/` : `message-sources.test.ts` (S2), `api-boundary.test.ts`, `render.test.tsx`, `browser-fake-script.test.tsx`, `fake-script.stories.tsx`, `network-isolation.test.ts` (R-33). knip ne signale aucun utilitaire devenu orphelin : `render.tsx`, `browser-fake-script.ts` et les autres servent encore aux tests du produit.
- E2E : `e2e/regression/suite.spec.ts` retiré (`networkIsolation`, `changedTagsMatchPlanGaps`, `pageObjectSignatures`). Dans `e2e/fixtures.ts`, le champ `allowed` du journal réseau disparaît (plus aucun lecteur) ; `blocked` reste, lu par la fixture `network` (requêtes au script sans réponse du faux script) et par `easterEgg` (REG-43, `misc.spec.ts` : vidéo jamais chargée). Toute requête hors localhost est toujours avortée. `notWritten` retiré de `e2e/pages/target.ts` (aucun appelant).
- `.oxlintrc.json` : `max-lines-per-function`, `max-params`, `no-warning-comments` et `react/only-export-components` passent à `"off"` au niveau racine (décision 1). Les lignes `react/only-export-components: off` des overrides `src/routes/**`, configs et Storybook, et `max-lines-per-function: off` de l'override des tests, retirées avec leur commentaire. L'override `import/no-nodejs-modules` ne liste plus que `setup-node.ts` et `legacy-scripts.ts`. Aucune catégorie changée.
- knip : le script `knip` lance une seule passe (`knip`, plus de `knip --production`). Les 36 lignes JSDoc `@internal exported for the tests` / `exported for its tests only (knip --production)` retirées de `src/` ; trois gardaient une indication utile, reprise en phrase (`formatWeekLabel` : « Pages use `formatPeriodLabel`. », `BookingSummary`, `afterLogout`). Un bloc d'une seule ligne (`isEmail`) disparaît en entier. `pnpm knip` est vert sans aucun retrait de code.
- `lefthook.yml` : section `pre-push` retirée ; `pre-commit` (oxlint `--fix`, oxfmt) reste.
- `vitest.config.ts` : `node-ny` ne relance plus que `src/domain/{paris,dates,cutoff}.test.ts` et `src/intl/{dates,calendar}.test.ts` (décision 2).
- `CLAUDE.md` : `check:fast` n'est plus un hook pre-push ; `check` fait une passe de knip ; ligne `useEffect` réécrite sans compte ni CI ; lignes « Composants de route < 40 lignes ; aucune fonction > 80 lignes » et `no-warning-comments` retirées ; description de `node-ny` mise à jour.
- `README.md` : la phrase sur le hook pre-push retirée (§ installation).
- `src/test/print-lists.ts` : renvoi à `api-boundary.test.ts` retiré d'un commentaire.

## Décisions

1. **Règles à `"off"` au lieu d'être supprimées.** Les catégories `pedantic` et `style` sont à `error` : sans entrée explicite, oxlint applique `max-lines-per-function` (50 lignes) et `max-params` (3) avec leurs valeurs par défaut, et 14 erreurs apparaissent dans les tests. Une entrée `"off"` désactive les règles sans toucher aux catégories.
2. **Portée de `node-ny`.** Les cinq fichiers testent du code qui passe par `Date` ou `Intl` : heure de Paris (`paris.ts`, `cutoff.ts`), jours en UTC (`dates.ts`), formats de dates (`intl/dates.ts`, `intl/calendar.ts`). Recherche dans les autres tests de `src/domain` et `src/intl` (`new Date(`, `getHours`, `toLocale`, `Intl.DateTimeFormat`, Paris, DST, heure d'été, `TEST_NOW`) et dans les modules testés : `TODAY` (chaîne ISO) seulement, aucune conversion d'instant. `days.ts` appelle `isPast`, une comparaison de chaînes ISO. `intl.test.ts` ne formate que des montants et des messages.
3. **Commentaires « découpé à cause de max-lines-per-function ».** Aucun trouvé dans `src/`, `e2e/`, `scripts/` ni `.storybook/`.

## Vérification

- `pnpm check` : vert (188 fichiers, 2 089 tests ; 2 855 avant, l'écart vient des méta-tests retirés et de `node-ny` réduit ; knip vert).
- `pnpm lint` seul : aucun avertissement ni erreur.
- `pnpm build:e2e` puis `git diff --exit-code src/routeTree.gen.ts translations/fr.json` : aucun écart.
- `pnpm test:e2e --project=react-only --project=legacy --project=react` : 166 sur 166 (172 avant, moins les 3 tests de `suite.spec.ts` dans `legacy` et `react`).

## Overrides

- Aucun override ajouté. Overrides allégés : voir « Fait » (`.oxlintrc.json`).

## Reste

- Mise à jour de `PLAN.md` par l'orchestrateur (ci-dessous).
- Les étiquettes `@parity`, `@changed:E-xx`, `@pN` et les identifiants d'écran restent jusqu'au retrait du projet `legacy` (P8) ; plus aucun test ne les confronte au PLAN § 4.2.

## Pour PLAN.md (orchestrateur)

- S2 (sources des messages) : plus de test `message-sources.test.ts` ; la règle « `defaultMessage` recopié de `docs/spec/` ou de l'annexe F » reste une consigne de relecture.
- S6 (budget d'effets) : plus d'étape CI ; la consigne devient « un `useEffect` synchronise un système extérieur, nommé dans un commentaire au-dessus », sans plafond.
- R-33 (isolation réseau) : `network-isolation.test.ts` et le test `networkIsolation` de `suite.spec.ts` retirés ; restent la garde de sockets de `src/test/setup-node.ts` et la fixture `isolation` de `e2e/fixtures.ts`.
- R-34 (espace insécable échappée) : plus de `grep` en CI ; la consigne « ` ` seulement entre accolades ou dans `defineMessages` » reste dans `CLAUDE.md`.
- § 3.1 : retirer les mentions de `message-sources.test.ts`, `api-boundary.test.ts`, `render.test.tsx`, `browser-fake-script.test.tsx`, `fake-script.stories.tsx`, `network-isolation.test.ts`, `e2e/regression/suite.spec.ts` et `notWritten`.
- knip : une seule passe (`knip`), plus de `knip --production` ni d'étiquettes `@internal`.
- `node-ny` : limité aux cinq fichiers de la décision 2.
- `max-lines-per-function`, `max-params`, `no-warning-comments`, `react/only-export-components` : à `"off"` ; retirer les limites de 40 et 80 lignes et l'interdiction des `TODO` partout où le PLAN les cite.
