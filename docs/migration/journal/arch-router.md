# Journal de la session « architecture : Router seul »

*4 novembre 2026. Workspace jj `arch`, bookmark `claude/arch-router`, parti de `claude/frontend-react-migration-lw5zfz` (`adb2288`). Demande de l'orchestrateur, avec l'accord du responsable : remplacer TanStack Start par le repli « Router seul » du PLAN § 2.1, réduire la configuration d'oxlint, retirer le projet Vitest `node-ny`. Le site affiché ne change pas.*

## Fait

### Router seul (PLAN § 2.1, arbitrage 16)

- `index.html` à la racine, écrit à la main : `lang="fr"`, balises meta, `<title>` et description de 03 § 2.1 (textes inchangés), favicon, `preconnect` avec `crossorigin`, emplacement `<!-- early-fetch -->`, styles globaux, `src/main.tsx`, puis un squelette statique dans `#root` : le cadre de `__root.tsx` sans « Client / Collègue », `PageSkeleton` avec les noms par défaut, le pied de page.
- `vite.config.ts` : `tanstackRouter({ target: "react", autoCodeSplitting: true })` avant `react()`, plus de plugin Start ; plugin `early-fetch` (voir décision 1) ; `css.modules.generateScopedName` lisible (décision 2) ; `optimizeDeps.entries: ["index.html"]` (décision 5). Sortie dans `dist/`.
- `src/main.tsx` remplace `src/client.tsx` : worker msw en `pnpm dev`, puis `createRoot(#root).render(<RouterProvider router={getRouter()} />)` sous `StrictMode`.
- `src/router.tsx` : `basepath: import.meta.env.BASE_URL` ; gardes `typeof window` retirées ; commentaire de `defaultPendingMinMs: 0` réécrit.
- `src/routes/__root.tsx` : plus de `head()`, `shellComponent`, `HeadContent`, `Scripts`, `ScriptOnce` ni de messages `common.document.*` ; la racine rend le cadre, `Outlet`, les toasts, `AutoRefresh` et les devtools.
- Supprimés : `features/page/BrowserOnly.tsx` et son test, `ShellSkeleton`, `e2e/hydration.spec.ts`, `.storybook/vite.config.ts`. `Header.tsx` rend les titres sans `BrowserOnly` ; `useDefaultTexts` n'est plus exporté ; `useOnline` perd son instantané serveur.
- Route `/index.html` gardée : Pages sert `index.html` à l'adresse `…/index.html`, le routeur y voit le chemin `/index.html` et sans elle afficherait « Page introuvable ».
- Nouveau test `features/page/static-skeleton.test.tsx` (navigateur) : compare l'arbre de `#root` dans `index.html` au rendu de `PageLayout`, `Header` et `PageSkeleton`.
- `src/router.test.ts` : le cas « sans `window` » disparaît ; Node reçoit un `window` factice pour `listenPreloadError`. `src/test/render.tsx` : `stopSelectionChange` (R-36) retiré, la boucle venait du `<body>` de la coquille rendu dans le conteneur de test.
- Scripts et CI : `pnpm serve` sur `--root dist`, `post-build.ts` et `check-budget.ts` sur `dist/` ; le budget compte l'entrée `index.html`, le morceau `src/routes/index.tsx?tsr-split=component` trouvé dans ses `dynamicImports`, et le `<style>` en ligne d'`index.html`. `ci.yml` : vérification du worker msw, artefact `dist` (ex-`dist-client`) et déploiement sur `dist`.
- Storybook lit `vite.config.ts` ; `viteFinal` force le mode `test` (URL factice de `.env.test`), comme l'ancienne configuration séparée.
- Paquets : `@tanstack/react-start` 1.169.4 retiré, `@tanstack/router-plugin` 1.168.48 ajouté. `pnpm-workspace.yaml` n'a besoin d'aucune entrée nouvelle.
- Commentaires mis à jour : `background/start.ts`, `queries/client.ts`, `page-texts.ts`, `serve-pages.ts`.

### Lint (PLAN § 2)

- `.oxlintrc.json` : 444 → 106 lignes. Catégories `correctness` et `suspicious` en erreur, `perf` en avertissement, les autres coupées. Plugins `typescript`, `react`, `jsx-a11y`, `import`, `promise`, `unicorn`, `vitest`. Ni `jsPlugins`, ni `typeAware`, ni `typeCheck`.
- Règles explicites gardées : `react/rules-of-hooks`, `react/exhaustive-deps`, `no-console` (warn et error permis), `no-restricted-globals`, `import/no-nodejs-modules`, `import/no-default-export`, `oxc/no-barrel-file`, `import/no-relative-parent-imports`, `vitest/no-focused-tests`, `vitest/no-disabled-tests`.
- Règles des catégories retenues coupées, chacune commentée : `react/react-in-jsx-scope` (1 287 erreurs, runtime JSX automatique), `no-await-in-loop` (51 avertissements, envois un par un voulus), `no-underscore-dangle`, `import/no-unassigned-import`, `unicorn/consistent-function-scoping`, `vitest/no-conditional-expect`, `vitest/require-mock-type-parameters`, `vitest/require-to-throw-message`.
- Overrides gardés : configurations et scripts (Node, `export default`, `console`), E2E, `setup-node.ts` et `legacy-scripts.ts`, chemins relatifs des tests et stories, grille du calendrier (E-05), easter egg du logo (D-01).
- Paquets retirés : `@tanstack/eslint-plugin-query`, `@tanstack/eslint-plugin-router`, `eslint-plugin-formatjs`, `oxlint-tsgolint`, `@vitest/coverage-v8`. Entrée `eslint` retirée de `peerDependencyRules.allowedVersions`. Groupes de `.github/dependabot.yml` nettoyés des deux paquets disparus.

### `node-ny`

- Projet retiré de `vitest.config.ts` ; `test:node` lance `--project node`. Les tests sensibles au fuseau tournent sous `TZ=Europe/Paris`.

## Décisions

1. **Script anticipé injecté par `runnerImport`.** `vite.config.ts` ne peut pas importer `api/early-fetch.ts` : Vite charge sa configuration dans Node, sans alias `@/` ni `import.meta.env` (essai : `TypeError` sur `import.meta.env.VITE_APPS_SCRIPT_URL`). Le plugin `early-fetch` évalue le module avec `runnerImport` de Vite, en passant `config.env` du mode par `define`, puis remplace `<!-- early-fetch -->`. `earlyFetchScript` reste la seule source du texte ; vide en `pnpm dev` (faux script) et sans URL valide, comme avant.
2. **Noms de classes lisibles.** Le squelette statique écrit les classes des CSS Modules à la main : `generateScopedName` produit `Fichier-classe` (`Header-title`). Les 48 fichiers `*.module.css` ont des noms distincts. `vitest.config.ts` importe le même réglage, ce qui permet au test du squelette de comparer les classes.
3. **Styles globaux en `<style>` dans `index.html`.** Un `<link>` vers `tokens.css`, `base.css` et `print.css` finit fusionné dans la CSS de l'entrée, que Vite place après celle des morceaux partagés (`PageLayout-*.css`, `ViewToggle-*.css`) : `.kicker` ou `:focus-visible` passeraient après les classes des modules, à spécificité égale. Un `<style>` avec trois `@import` garde l'ordre de Start (styles globaux d'abord) : Vite l'inline et réécrit les `url()` des polices. `index.html` passe de 9,0 à 15,9 kB, 2,8 kB gzip pour les styles.
4. **Storybook sur la configuration principale.** Le plugin du routeur régénère `routeTree.gen.ts` sans écart et le plugin `early-fetch` ne trouve pas d'emplacement dans `iframe.html`. `pnpm build-storybook` passe (lancé une fois, sortie hors du dépôt).
5. **`optimizeDeps.entries`.** Sans lui, `pnpm dev` parcourt aussi `docs/migration/recherche/spike-integration/router-only/index.html` et échoue sur ses imports `@/`.
6. **`vite preview`.** Il ne fait plus de SSR, mais il renvoie `index.html` en 200 pour un lien profond, là où Pages renvoie `404.html` en 404 : `pnpm serve` reste l'émulateur de Pages.
7. **Règles formatjs.** Sans `eslint-plugin-formatjs`, plus aucun lint ne refuse un texte en dur dans le JSX ni une `description` absente ; `formatjs extract --throws` contrôle encore la syntaxe ICU.

## Vérification

| Commande | Résultat |
| --- | --- |
| `pnpm check` | vert : 183 fichiers, 1 945 tests ; knip vert |
| `pnpm lint` | aucun avertissement ni erreur |
| `pnpm build:e2e` puis `git diff src/routeTree.gen.ts translations/fr.json` | écarts attendus, commités : bloc `declare module '@tanstack/react-start'` retiré, messages `common.document.title` et `.description` retirés |
| `pnpm test:e2e --project=react-only --project=legacy --project=react` | 164 sur 164 (166 avant, moins les 2 tests de `hydration.spec.ts`) |
| `pnpm build && pnpm budget` | JS 205,3 kB gzip (limite 240), CSS 11,8 kB (limite 25) |
| `test ! -e dist/mockServiceWorker.js && ! grep -rl setupWorker dist` | vert |
| `dist/index.html` | `<script>` anticipé avant le `<style>` et les `<link rel="stylesheet">` (build avec `VITE_APPS_SCRIPT_URL`) |
| `pnpm dev` (faux script), Chromium | colonnes affichées, console vide |

Temps jusqu'au premier bouton de jour : non mesuré.

## Overrides

- Aucun override pour un faux positif. Overrides gardés : voir « Lint ».

## Reste

- Commentaires périmés dans des fichiers de la session des tests : `e2e/smoke.spec.ts` (titre « prerendered shell »), `e2e/regression/loading.spec.ts` lignes 83 et 117 (« prerendered shell until hydration »), `playwright.config.ts` ligne 29 (« hydration »), `src/features/page/ModeSwitch.test.tsx` ligne 26 (« HTML shell »), `src/mocks/node.ts` et les tests de `domain/` et `intl/` (« node-ny »).
- Mise à jour de `PLAN.md` par l'orchestrateur (ci-dessous).

## Pour PLAN.md (orchestrateur)

- Arbitrage 16 renversé : Router seul retenu, Start retiré ; plus de `BrowserOnly`, de coquille prérendue ni d'erreur #418 possible. § 0 (risque principal 1), § 1.4 invariant 2.
- § 2, tableau des paquets : retirer `@tanstack/react-start`, `@tanstack/eslint-plugin-query`, `@tanstack/eslint-plugin-router`, `eslint-plugin-formatjs`, `oxlint-tsgolint`, `@vitest/coverage-v8` ; ajouter `@tanstack/router-plugin` 1.168.48 ; ligne oxlint sans `jsPlugins` ni lint typé ; « Exclus volontairement » : ESLint n'est plus en peer de rien, retirer la mention de `router-plugin`.
- § 2.1 : ligne « TanStack Start en mode SPA » tranchée pour le plan B.
- § 3.1 (arborescence) et § 3.11 (build) : `index.html`, `src/main.tsx`, plugin `early-fetch` et `cssModules` de `vite.config.ts`, sortie `dist/`, `.storybook/vite.config.ts` supprimé.
- R-01 : sans objet (plus d'hydratation). R-02 : sans objet (plus de code exécuté au build ; test `node` « sans `window` » retiré). R-03 : `vite preview` ne fait plus de SSR, `pnpm serve` reste pour le `404.html`. R-12 : le script passe avant la CSS ; E-49 disparaît (ordre de l'ancien site retrouvé). R-36 : `stopSelectionChange` retiré de `render.tsx`.
- S4 et § 3.3.1 étape 2 : `e2e/hydration.spec.ts` retiré ; le squelette statique est vérifié par `static-skeleton.test.tsx`, le délai par REG-02 (`loading.spec.ts`, E-47).
- `node-ny` : projet retiré, tests de fuseau sous `TZ=Europe/Paris` seulement.
