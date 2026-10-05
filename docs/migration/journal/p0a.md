# Journal de la session P0 (a) — dépôt, ancien site déplacé, outillage, intl minimal

*3 octobre 2026. Branche `claude/p0a-outillage`, partie de la pointe de `claude/frontend-react-migration-lw5zfz` (`d6365cb`).*

## Fait

- `git mv index.html app.css design-system.css js legacy/`, seul dans le premier commit. `logo.png`, `charte-graphique.pdf` et `Code.gs` restent à la racine.
- Configurations copiées de `recherche/spike-integration/` puis adaptées selon PLAN P0 : `.editorconfig`, `.gitignore` (§ 3.1, plus `.vitest`), `.npmrc` (`save-exact=true`), `.node-version` (22.22.2), `pnpm-workspace.yaml` (§ 2), `tsconfig.json` (`include` du § 3.1), `.oxlintrc.json`, `.oxfmtrc.json`, `knip.json`, `lefthook.yml`, `vite.config.ts` (§ 3.11), `vitest.config.ts`. `.vscode/` repris de `toolchain-files/` (PLAN P0, « Point de départ »).
- `package.json` : versions exactes du § 2 pour P0 à P2, `engines.node: ">=22.18"`, `packageManager: pnpm@12.8.1`, scripts du § 3.1 sauf `storybook` et `build-storybook` (P3 (0)). `pnpm-lock.yaml` parti de celui du projet d'essai, ajusté par `pnpm install`.
- `vitest.config.ts` : projets `node` (`TZ=Europe/Paris`), `node-ny` (`TZ=America/New_York`, `src/domain` et `src/intl`), `browser` (Chromium, `fr-FR`, `Europe/Paris`, `executablePath` lu dans `PLAYWRIGHT_CHROMIUM_EXECUTABLE`), une fabrique `browser()` par projet, `@formatjs/unplugin`, `optimizeDeps.include`. Fuseau vérifié par une sonde : 7 h 30 UTC donne 9 h sous `node` et 3 h sous `node-ny`.
- `src/test/setup-browser.ts` : worker msw sans handler, `onUnhandledFrame: "error"`. Sonde : un `fetch` vers `https://script.google.com/macros/s/FAKE/exec` reçoit 500 et msw signale la requête non gérée.
- `src/intl/{intl,formats,common-messages,types.d}.ts`, `translations/fr.json` (un message : `common.action.cancel`, « Annuler », `00` § 2.3), `src/config.ts`, `src/vite-env.d.ts`, `.env.development`, `.env.test`, `.env.example`.
- Tests : `src/intl/intl.test.ts` (`euro` : `12.5` → `12,50 €`, id inconnu refusé par `tsc`), `src/intl/rendering.test.tsx` (Chromium), `src/config.test.ts` (`isConfigMissing`, URL factice de `.env.test`, `USE_MOCK_API` faux).
- `CLAUDE.md` : annexe C du plan.

## Décisions

1. **`--disable-nested-config` sur oxlint et oxfmt** (scripts `lint`, `lint:fix`, `format`, `format:check`, hooks lefthook). Sans ce drapeau, les deux outils chargent la configuration du projet d'essai rangé dans `docs/migration/recherche/spike-integration/` malgré `docs/**` dans `ignorePatterns` : oxlint s'arrête (« `options.typeAware` is only supported in the root config »), oxfmt vérifie `spike-integration/README.md`. Le job CI de P0 (c) doit passer par `pnpm lint` ou ajouter le drapeau à `oxlint -f github`.
2. **`--no-error-on-unmatched-pattern` sur le hook oxlint** : un commit qui n'indexe que des fichiers exclus (`src/routeTree.gen.ts` régénéré après un rebase) faisait sortir oxlint en erreur (« No files found to lint »).
3. **`.vitest`** ajouté à `.gitignore` et aux trois listes d'exclusion (R-13) : Vitest Browser Mode y écrit les captures des tests en échec (`.vitest/attachments/`).
4. **`allowBuilds.lefthook: false`** : pnpm refusait le `postinstall` de lefthook, qui ne fait que `lefthook install`, déjà lancé par `prepare`.
5. **`pnpm exec msw init public/ --save` fait ici** (livrable 4 de P0 (b)) : le projet `browser` démarre le worker et a besoin de `public/mockServiceWorker.js`. P0 (b) n'a plus qu'à vérifier son retrait de `dist/client`.
6. **knip** : `ignoreFiles` temporaire pour `src/config.ts`, `src/intl/intl.ts` et `src/intl/common-messages.ts`, sans importeur de production tant qu'aucune route n'existe (`knip --production` les signalait). `ignoreDependencies` temporaire, chaque entrée commentée avec sa phase.
7. **`lefthook.yml`** : pre-push sur `pnpm check:fast` (§ 3.1), au lieu de `pnpm check` dans le projet d'essai.
8. **`vite.config.ts`** : version du § 3.11 (alias `no-parser` quand `command === "build"`), qui couvre aussi `build:e2e` ; le projet d'essai testait `mode === "production"` et `SPIKE_KEEP_PARSER`.
9. **`i18n:extract`** : commande du § 3.10, sans le `&& oxfmt translations/fr.json` du projet d'essai (`translations/**` est exclu d'oxfmt).
10. **Projets Vitest par dossier** (§ 3.1) : `node` prend `src/**/*.test.ts` hors `background`, `ui`, `features`, `routes`, `mutations` ; `browser` prend ces dossiers et tout `*.test.tsx`. Un test `.tsx` de `src/intl/` tourne donc dans Chromium.
11. **`@tanstack/eslint-plugin-query` et `@tanstack/eslint-plugin-router`** installés (§ 2) : absents de la liste du message de lancement, mais chargés par les `jsPlugins` de `.oxlintrc.json`.
12. **`src/intl/intl.ts`** en `.ts` comme le demande le plan : `<b>` et `<i>` de `defaultRichTextElements` passent par `createElement` (le projet d'essai avait `intl.tsx`).
13. **`README.md` reformaté par oxfmt** (tableaux alignés, `*moi*` → `_moi_`) : le rendu ne change pas, et `format:check` l'exigeait. Le tableau « Contenu du dépôt » cite encore `index.html` et `js/` à la racine : P0 (c) le corrige.
14. **`CLAUDE.md`** : `a-*`, `b-*`, `c-*` entre backticks, sinon oxfmt les lit comme de l'italique et écrit `a-_, b-_`. Lignes vides ajoutées sous les titres par oxfmt.
15. **Hooks git** : `lefthook install` écrit dans `.git/hooks` commun à tous les worktrees, avec le chemin du binaire de ce worktree. Vérifié : sans `lefthook.yml` (checkout principal), le hook sort en 0 ; sans binaire, il affiche un message et sort en 0.

## Contradictions

- **knip et `routeTree.gen.ts`** : PLAN § 3.1 dit « aucun `ignore` pour `routeTree.gen.ts` (inutile) », PLAN P0 et le message de lancement demandent les mêmes exclusions dans `knip.json`. J'ai suivi le message de lancement. knip affiche alors 20 « Configuration hints » (« Remove from ignore », motifs sans fichier) à chaque passe, sans changer le code de sortie. Retirer `ignore` de `knip.json` se fait en une ligne si l'orchestrateur tranche dans l'autre sens.
- **Critère `git diff main --stat -M -- legacy/`** : écrite ainsi, la commande montre des ajouts, car le filtre de chemin écarte les fichiers d'origine et git ne peut plus apparier les renommages. Avec les anciens chemins (`-- legacy/ index.html app.css design-system.css js/`), elle montre 11 renommages `R100`.
- **`.gitignore` du § 3.1** : la liste n'a pas `.vitest`, que le README du projet d'essai cite parmi les dossiers produits (décision 3).

## Versions

Aucune version changée par rapport au PLAN § 2. Ajouts du § 2 absents du `package.json` du projet d'essai : `lefthook` 2.1.16, `@vitest/coverage-v8` 5.0.3, `@tanstack/react-query-devtools` 5.104.1, `@tanstack/react-router-devtools` 1.167.2, `@fontsource-variable/outfit` et `@fontsource-variable/work-sans` 5.3.0. Retirés : `@tanstack/router-plugin`, Base UI, TanStack Form, Storybook, `msw-storybook-addon`. `pnpm why oxc-transform-react` : 0.145.0, une seule version.

## Overrides oxlint

Ceux que PLAN P0 pose d'avance : `e2e/**` (`react/rules-of-hooks`, `import/no-nodejs-modules`), `src/mocks/node.ts` (`import/no-nodejs-modules`). Les autres viennent du projet d'essai. Aucun override nouveau.

## Reste à faire

- P0 (b) : `src/router.tsx`, routes, `scripts/*.ts`, `playwright.config.ts`, styles, polices. Les scripts `build`, `build:e2e`, `serve`, `serve:legacy`, `budget`, `test:e2e` et `test:e2e:legacy` attendent ces fichiers ; `pnpm build:e2e` échoue aujourd'hui sur « Could not resolve entry for router entry: router ». Retirer de `knip.json` les entrées marquées « retirer en P0 (b) ».
- P0 (c) : CI avec `--disable-nested-config` (décision 1), commandes réelles de `CLAUDE.md`, section « Développement » et tableau « Contenu du dépôt » du README.
- P1 (a1) : `src/test/setup-browser.ts` démarre un worker sans handler ; le faux script y branchera ses handlers. Retirer `@msw/playwright` de `ignoreDependencies`.

## Pour la PR

Titre : « P0 (a) : ancien site dans `legacy/`, outillage, intl minimal ».

- Premier commit : `git mv` seul (11 renommages `R100`).
- `pnpm install --frozen-lockfile` puis `pnpm check` verts ; `pnpm format` ne change rien.
- `pnpm install` lance `lefthook install` (`prepare`) : hooks pre-commit (oxlint `--fix`, oxfmt) et pre-push (`pnpm check:fast`).
- Aucune action humaine propre à P0 (a). Les deux actions humaines de P0 (variable de dépôt `VITE_APPS_SCRIPT_URL`, réponse du script déployé à `getAdminState`) vont dans la PR de P0 (c).
