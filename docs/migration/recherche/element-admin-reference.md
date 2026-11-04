# element-hq/element-admin — analyse de référence pour la migration React 19 + TanStack

> Clone analysé : `element-admin/` (projet d’essai ou clone, non versionné) (commit `14c072b`, « Bump nginx-unprivileged Alpine version (#666) »).
> Chemins ci-dessous **relatifs au clone**. Le clone n'a pas été modifié (seul `node_modules/`, ignoré par git, a été installé ; le `dist/` produit par le build de vérification a été supprimé).
> Date : 2026-10-03. Versions npm « latest » relevées le même jour pour comparaison : `@tanstack/react-start 1.168.60`, `@tanstack/react-router 1.170.41`, `@tanstack/react-form 1.33.5`, `@base-ui/react 1.8.0`, `zustand 5.0.15`, `oxlint 1.86.0`, `oxfmt 0.71.0`, `oxlint-tsgolint 7.0.2003`, `typescript 7.0.2`, `vite 8.3.2`, `valibot 1.5.0`, `@tanstack/react-pacer 0.24.0`, `msw 3.0.2`, `@msw/playwright 0.7.0`, `knip 6.39.0`.

## Sommaire

0. [Résumé express](#0-résumé-express)
1. [Outillage](#1-outillage) (oxlint type-aware, oxfmt, tsconfig, Vite, knip, stylelint, pnpm, CI) + **sorties des commandes lancées**
2. [src/stores/ — Zustand](#2-srcstores--zustand)
3. [src/routes/ — TanStack Router](#3-srcroutes--tanstack-router)
4. [src/api/ et src/query.ts — TanStack Query](#4-srcapi-et-srcqueryts--tanstack-query)
5. [src/background/ — ce n'est PAS ce qu'on croit](#5-srcbackground--ce-nest-pas-ce-quon-croit)
6. [src/components/ vs src/ui/](#6-srccomponents-vs-srcui)
7. [src/utils/](#7-srcutils)
8. [tests/ — Playwright + msw + axe](#8-tests--playwright--msw--axe)
9. [Divergences avec notre cible et arbitrages](#9-divergences-avec-notre-cible-et-arbitrages)
10. [Ce qu'on reprend / ce qu'on adapte / ce qu'on écarte](#10-ce-quon-reprend--ce-quon-adapte--ce-quon-écarte)
11. [Configs prêtes à copier adaptées à notre projet](#11-configs-prêtes-à-copier-adaptées-à-notre-projet)

---

## 0. Résumé express

- **Outillage** : très bon modèle. Un seul `oxlint` fait lint + règles typées (tsgolint) + **vérification de types** (`options.typeCheck: true`) : il n'y a **pas de script `tsc`** dans le projet. Les règles TanStack Query/Router et formatjs sont des **plugins ESLint chargés par oxlint** via `jsPlugins`. `oxfmt` remplace Prettier. `knip` traque le code mort. Tout passe sur le clone (sorties en §1.12).
- **Zustand** : 2 stores seulement (`auth`, `locale`), pattern `create<T>()(persist(shared(creator, {name}), {name}))` — `persist` sur **localStorage par défaut** (hydratation synchrone → aucun `useEffect`, aucun `hasHydrated`), `shared` de `use-broadcast-ts` pour synchroniser les onglets. Pas de `devtools`, `immer`, `subscribeWithSelector`, `partialize`, `version`/`migrate`. Le store est lu **hors React** (`useAuthStore.getState()` dans `beforeLoad`/`loader`/`queryFn`) et un `useAuthStore.subscribe` au niveau module déclenche `router.invalidate()` à chaque connexion/déconnexion.
- **Routes** : fichiers « plats » à points (`_console.users.$userId.tsx`), layouts sans chemin `_auth`/`_console`, `createRootRouteWithContext<{ queryClient }>()`, `validateSearch` avec un **schéma valibot passé tel quel** (Standard Schema), `loaderDeps` + `ensureQueryData`/`ensureInfiniteQueryData` dans les loaders, `pendingComponent` (squelette), `notFoundComponent` sur les détails, `useSuspenseQuery` dans les composants, `autoCodeSplitting`. Filtres, tri, recherche et sélection de l'élément ouvert vivent **dans l'URL**.
- **Query** : fabriques `xxxQuery(...) => queryOptions({...})`, clés hiérarchiques `["mas", "users", serverName, filtres, direction]`, `queryFn({ client, signal })` qui va chercher le jeton **dans le store** (`accessToken(client, signal)`) — le jeton n'est jamais dans la clé. Mutations dans les composants (`useMutation` + `invalidateQueries` par préfixe). Persistance par requête dans **IndexedDB** (`experimental_createQueryPersister` + `idb-keyval`), purge totale au logout.
- **`src/background/` ne contient que 4 images de fond** (dégradés PNG/SVG pour la page de connexion). Il n'y a **aucun module de tâches de fond** dans Element Admin. On s'inspire donc de leurs briques (abonnement au store hors React, `refetchInterval`, `navigator.locks`, `AbortSignal.timeout`) pour écrire **notre propre** `src/background/` (code prêt en §11.5).
- **Tests** : excellent modèle transposable tel quel pour mocker Apps Script : `@msw/playwright` intercepte au niveau du contexte navigateur, les handlers tournent dans le process Node, mode strict (toute requête non mockée fait échouer le test), « deployments » = jeux de handlers, `network.use()` pour surcharger, axe-core avec liste explicite des violations connues.
- **À écarter** : Tailwind, compound-web/Radix/vaul, react-intl/formatjs/Localazy, openapi-ts, le prerender maison (Start SPA le remplace), Docker/nginx.

---

## 1. Outillage

### 1.1 `package.json` — scripts, gestionnaire de paquets

```json
"scripts": {
  "dev": "vite --port 3000",
  "build": "vite build",
  "serve": "vite preview",
  "knip": "knip && knip --production",
  "lint": "oxlint && stylelint 'src/**/*.css' && oxfmt --check",
  "fix": "oxlint --fix && stylelint --fix 'src/**/*.css' && oxfmt",
  "check": "pnpm i18n:extract && pnpm lint && pnpm knip",
  "openapi-ts": "openapi-ts",
  "browserslist": "browserslist",
  "test": "playwright test"
},
"packageManager": "pnpm@11.25.0+sha512.5cde925b…"
```

- **Pas de script `typecheck`** : la vérification de types est faite par `oxlint` (`options.typeCheck`, voir 1.2). J'ai vérifié que `tsc --noEmit` passe aussi (TS 7.0.2, 2,8 s), mais il n'est utilisé nulle part.
- `knip && knip --production` : deux passes (avec et sans les fichiers de test/dev).
- Toutes les versions sont **exactes** (`.npmrc` : `save-exact=true`), sauf `verkit` et `oxc-transform-react` (`^`).
- `packageManager` épinglé avec hash → `corepack`/`pnpm/setup` utilisent exactement cette version.

> **Transposable ?** Oui, tel quel (moins i18n/openapi). Chez nous : `"lint": "oxlint && stylelint 'src/**/*.css' && oxfmt --check"`, `"check": "pnpm lint && pnpm knip"`. On peut garder `tsc --noEmit` en filet de sécurité optionnel, mais `typeCheck` d'oxlint suffit (prouvé en 1.12 : il remonte `TS2322`).

### 1.2 `.oxlintrc.json` (extrait structurel — fichier complet de 300 lignes dans le clone)

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "react", "jsx-a11y", "import", "unicorn"],
  "options": {
    "typeAware": true,   // ← active tsgolint (règles qui ont besoin des types)
    "typeCheck": true    // ← remonte aussi les erreurs du compilateur (TSxxxx)
  },
  "categories": {
    "correctness": "error",
    "suspicious": "error"
  },
  "env": { "builtin": true, "browser": true, "es2026": true },
  "rules": {
    "import/no-named-as-default": "warn",
    "import/no-named-as-default-member": "warn",
    "react/exhaustive-deps": "warn",
    "no-shadow": "off",
    "react/react-in-jsx-scope": "off",
    "typescript/no-unsafe-type-assertion": "off",
    "typescript/no-floating-promises": "off",
    "typescript/no-misused-spread": "off",
    "import/no-duplicates": "warn",
    "react/only-export-components": ["error", { "allowConstantExport": true }],
    "react/rules-of-hooks": "error",
    "typescript/ban-ts-comment": ["error", { "minimumDescriptionLength": 10 }],
    "typescript/consistent-type-definitions": "error",
    "typescript/no-explicit-any": "error",
    "typescript/no-non-null-assertion": "error",
    // … ~110 règles unicorn listées une à une : no-null, no-array-for-each,
    // no-array-reduce, prefer-at, prefer-top-level-await, switch-case-braces,
    // filename-case, prefer-string-replace-all, throw-new-error, etc.

    "@tanstack/router/create-route-property-order": "warn",
    "@tanstack/router/route-param-names": "error",
    "@tanstack/query/exhaustive-deps": "error",
    "@tanstack/query/no-rest-destructuring": "warn",
    "@tanstack/query/stable-query-client": "error",
    "@tanstack/query/no-unstable-deps": "error",
    "@tanstack/query/infinite-query-property-order": "error",
    "@tanstack/query/no-void-query-fn": "error",
    "@tanstack/query/mutation-property-order": "error",
    "formatjs/enforce-default-message": ["error", "literal"],
    "formatjs/no-literal-string-in-jsx": ["error", { "props": { "include": [["*", "{label,placeholder,title}"]] } }]
    // … 15 règles formatjs
  },
  "jsPlugins": [
    "@tanstack/eslint-plugin-router",
    "@tanstack/eslint-plugin-query",
    "eslint-plugin-formatjs"
  ],
  "ignorePatterns": ["dist/**", "node_modules/**", ".tanstack/**"],
  "overrides": [
    {
      "files": ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
      "rules": {
        // Désactive ce que TypeScript vérifie déjà (équivalent eslint-recommended de typescript-eslint)
        "constructor-super": "off", "no-const-assign": "off", "no-dupe-keys": "off",
        "no-redeclare": "off", "no-unsafe-negation": "off", /* … */
        "no-var": "error", "prefer-const": "error", "prefer-rest-params": "error", "prefer-spread": "error"
      }
    },
    {
      "files": ["**/*.{ts,tsx}"],
      "rules": {
        "unicorn/filename-case": ["error", { "cases": { "kebabCase": true } }],
        "unicorn/no-null": "off",
        "formatjs/enforce-id": "off",
        "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
        "@typescript-eslint/no-import-type-side-effects": "error",
        "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
        "react/only-export-components": "off"
      }
    },
    {
      "files": ["**/*.gen.ts"],
      "rules": { /* ~25 règles coupées pour les fichiers générés (routeTree.gen.ts, client openapi) */ }
    }
  ]
}
```

**Points clés observés :**

- **Catégories** : seulement `correctness` + `suspicious` en erreur ; tout le reste est une liste explicite (pas de `pedantic`/`style`/`restriction`/`nursery` en bloc). Config résolue (`oxlint --print-config`) : **354 règles natives actives**.
- **Règles typées actives** (via la catégorie) : `typescript/await-thenable`, `no-base-to-string`, `restrict-template-expressions`, `unbound-method`, `require-array-sort-compare`, `no-unnecessary-type-assertion`, `no-redundant-type-constituents`, `no-for-in-array`, `no-implied-eval`, `consistent-return`, `no-unnecessary-template-expression`, `no-unnecessary-type-arguments/parameters`, `no-useless-default-assignment`… **Coupées explicitement** : `no-floating-promises` (ils lancent beaucoup de `queryClient.prefetchQuery(...)` / `navigate(...)` sans `await`), `no-unsafe-type-assertion`, `no-misused-spread`.
- **Préfixes** : oxlint accepte indifféremment `typescript/…` et `@typescript-eslint/…` (les deux formes cohabitent dans leur fichier).
- **Désactivations ponctuelles** dans le code : `// oxlint-disable-next-line typescript/unbound-method -- zustand store methods don't use \`this\`` (dans `src/routes/callback.tsx`), `// eslint-disable-next-line …` est aussi reconnu.

#### Comment oxlint charge des plugins ESLint (`jsPlugins`)

- Le champ `jsPlugins` liste des **spécificateurs npm** résolus depuis le dossier de la config ; les règles s'appellent ensuite par le **nom du plugin** (`@tanstack/query/exhaustive-deps`, `formatjs/no-offset`). Il suffit que les paquets ESLint soient en devDependencies (`@tanstack/eslint-plugin-query 5.102.8`, `@tanstack/eslint-plugin-router 1.162.0`, `eslint-plugin-formatjs 8.0.1`). **ESLint lui-même n'est pas installé** (seulement autorisé en peer : `pnpm-workspace.yaml` → `peerDependencyRules.allowedVersions.eslint: "10"`).
- oxlint exécute ces règles JS dans Node (`node_modules/oxlint/dist/plugins.js`), à côté des règles natives Rust. Fonctionnalité encore marquée expérimentale dans la doc oxlint, mais **elle fonctionne** : ma sonde a bien déclenché `@tanstack/query(exhaustive-deps)` (voir 1.12).
- Les règles des jsPlugins **n'apparaissent pas** dans `--print-config` (seules les natives y figurent) — normal.

#### Comment le mode type-aware est branché

- `options.typeAware: true` dans le fichier (équivalent CLI : `--type-aware`) ; `options.typeCheck: true` (équivalent CLI : `--type-check`, « experimental type checking (includes TypeScript compiler errors) »).
- `oxlint` déclare `oxlint-tsgolint` en **peerDependency optionnelle** (`"oxlint-tsgolint": ">=7.0.2001"`). Le binaire Rust d'oxlint cherche l'exécutable `tsgolint` dans `node_modules` (ou dans la variable `OXLINT_TSGOLINT_PATH`) et lui parle par stdin/stdout (chaînes trouvées dans le binaire : « Failed to spawn tsgolint from path… », « OXLINT_TSGOLINT_PATH points to… »). pnpm crée d'ailleurs l'entrée `oxlint@1.82.0_oxlint-tsgolint@7.0.2001`.
- `tsgolint 7.0.x` embarque **typescript-go** (TS 7) : le numéro majeur suit TypeScript. Le `tsconfig.json` est découvert automatiquement par fichier (`--tsconfig` seulement pour un cas non standard).

> **Transposable ?** Oui, quasiment tel quel : mêmes `plugins`, `options`, `categories`, mêmes overrides TS et `*.gen.ts`, mêmes jsPlugins TanStack. On retire tout `formatjs/*` (pas d'i18n). On garde `unicorn/filename-case` kebab-case (compatible avec les noms de routes `__root.tsx`, `_collegue.tsx`, `$date.tsx` : le lint passe chez eux avec `_console.users.$userId.tsx`). Je recommande de **réactiver `typescript/no-floating-promises` avec `ignoreVoid`** (on a des écritures Apps Script à ne jamais « perdre ») et d'écrire `void queryClient.prefetchQuery(...)` quand c'est voulu. Config adaptée en §11.1.

### 1.3 `.oxfmtrc.json`

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 80,
  "sortPackageJson": false,
  "ignorePatterns": ["pnpm-lock.yaml", "src/routeTree.gen.ts"]
}
```

- Tout le reste = défauts Prettier-compatibles (guillemets doubles, point-virgule, virgules finales `all`).
- Options disponibles dans le schéma 0.67 : `sortImports` (algo perfectionist), `sortTailwindcss`, `sortPackageJson`, `jsdoc`, `overrides`, `embeddedLanguageFormatting`… Element n'active **pas** `sortImports` (l'ordre des imports suit une convention manuelle : paquets externes, ligne vide, `@/…`, ligne vide, relatifs).
- `oxfmt` sert aussi de post-processeur pour le code généré (`openapi-ts.config.ts` : `postProcess: ["oxfmt", "oxlint"]`) et pour les JSON de traduction.

> **Transposable ?** Oui. On peut activer `"sortImports": true` pour éviter la discipline manuelle (choix d'équipe). Le `routeTree.gen.ts` doit rester exclu.

### 1.4 `tsconfig.json`

```json
{
  "include": ["**/*.ts", "**/*.tsx"],
  "extends": [
    "@tsconfig/vite-react/tsconfig.json",
    "@tsconfig/strictest/tsconfig.json"
  ],
  "compilerOptions": {
    "lib": ["ESNext.Intl", "ES2023.Array", "ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "paths": { "@/*": ["./src/*"] },
    "exactOptionalPropertyTypes": false
  }
}
```

Ce qu'apportent les deux bases (lues dans `node_modules`) :

- `@tsconfig/vite-react` 8.1.1 : `target es2023`, `module esnext`, `moduleResolution bundler`, `allowImportingTsExtensions`, `verbatimModuleSyntax`, `moduleDetection force`, `noEmit`, `jsx react-jsx`, `erasableSyntaxOnly`, `noUnusedLocals/Parameters`, `noFallthroughCasesInSwitch`, `skipLibCheck`.
- `@tsconfig/strictest` 2.0.8 : `strict`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature`, `noUncheckedIndexedAccess`, `allowUnusedLabels/UnreachableCode: false`, `isolatedModules`.
- Seule entorse : `exactOptionalPropertyTypes: false` (trop pénible avec les types générés et les props optionnelles des libs). `noPropertyAccessFromIndexSignature` explique les `styles["root"]` partout pour les CSS modules et `process.env["CI"]`.
- `paths` sans `baseUrl` (OK en TS 7) + côté Vite `resolve.tsconfigPaths: true` (natif Vite 8, plus besoin de `vite-tsconfig-paths`).

> **Transposable ?** Oui, à l'identique. TypeScript 7.0.2 accepte `extends` en tableau et ces options (vérifié : `tsc --noEmit` sans erreur). Config en §11.3.

### 1.5 `vite.config.ts`

```ts
export default defineConfig(({ mode }) => ({
  build: { sourcemap: true },
  resolve: {
    tsconfigPaths: true,
    alias: mode === "production"
      ? { "@formatjs/icu-messageformat-parser": "@formatjs/icu-messageformat-parser/no-parser.js" }
      : [],
  },
  plugins: [
    tanstackDevtools(),                                     // @tanstack/devtools-vite
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    viteReact({ compiler: true }),                          // React Compiler via oxc-transform-react
    formatjs({ removeDefaultMessage: mode === "production" }),
    tailwindcss(),
    vitePluginPrerender(),                                  // plugin maison, voir §3.9
  ],
}));
```

- `viteReact({ compiler: true })` : `@vitejs/plugin-react` 6 charge le **React Compiler natif d'oxc** (`oxc-transform-react`, « Oxc React Compiler Node API ») — pas de Babel. (Ils gardent pourtant des `useCallback`/`useMemo` manuels un peu partout.)
- `tanstackDevtools()` : panneau unifié Query + Router + Pacer en dev ; le plugin retire le code devtools au build (`removeDevtoolsOnBuild`, défaut `true`).
- `tanstackRouter({ autoCodeSplitting: true })` : génère `src/routeTree.gen.ts` et découpe chaque route (composant, pending, error, notFound) en chunk paresseux ; `loader`/`beforeLoad`/`validateSearch` restent dans le chunk critique.

> **Transposable ?** En partie. Avec **TanStack Start** on remplace `tanstackRouter(...)` + `vitePluginPrerender()` par `tanstackStart({ spa: { enabled: true } })` (le plugin Start inclut le générateur de routes et le code splitting automatique). On garde `viteReact({ compiler: true })` + `oxc-transform-react`, `resolve.tsconfigPaths`, `build.sourcemap`, `tanstackDevtools()`. On retire formatjs et tailwind. Ne pas oublier `base: "/reservations-restaurants/"` pour GitHub Pages (cf. §9.1).

### 1.6 knip (dans `package.json`)

```json
"knip": {
  "entry": ["src/base.css!", "src/prerender.tsx!", "tests/**/*.spec.ts"],
  "project": ["src/**/*!", "tests/**/*"],
  "ignore": ["src/api/mas/api/**/*", "src/api/synapse.ts"]
}
```

Le `!` marque les fichiers « production » (utilisés par la passe `knip --production`). knip détecte seul Vite, Playwright, TanStack Router (plugins intégrés).

> **Transposable ?** Oui. Chez nous : `"entry": ["tests/**/*.spec.ts"]`, `"project": ["src/**/*!", "tests/**/*"]`, `"ignore": ["src/routeTree.gen.ts"]` (et rien d'autre au départ).

### 1.7 stylelint, `.browserslistrc`, `.npmrc`, `pnpm-workspace.yaml`

```json
// .stylelintrc.json
{ "extends": ["stylelint-config-standard", "stylelint-config-tailwindcss"] }
```

```
# .browserslistrc
> 0.5%, last 2 versions, not op_mini all, Firefox ESR, not dead
```

```yaml
# pnpm-workspace.yaml (pnpm 11)
trustPolicy: no-downgrade          # refuse une version publiée avec un niveau de confiance inférieur (supply chain)
trustPolicyExclude: [semver@6.3.1, chokidar@4.0.3, undici-types@6.21.0]
strictDepBuilds: true               # tout script postinstall doit être explicitement autorisé…
allowBuilds:
  esbuild: false
  msw: false                        # …ici refusé : @msw/playwright n'a pas besoin du service worker
  unrs-resolver: false
strictPeerDependencies: true
peerDependencyRules:
  allowedVersions: { eslint: "10", vite: "8", typescript: "7", "@vector-im/compound-design-tokens": "8" }
```

L'install pnpm affiche : `✓ Lockfile passes supply-chain policies`.

> **Transposable ?** Oui : `.npmrc save-exact=true`, `pnpm-workspace.yaml` (trustPolicy, strictDepBuilds, allowBuilds msw:false), `stylelint-config-standard` seul (sans tailwind). Pour faire respecter notre charte (« aucune couleur, taille ou rayon en dur »), ajouter `stylelint-declaration-strict-value` (règle `scale-unlimited/declaration-strict-value` sur `/color$/`, `border-radius`, `font-size`…) — c'est un vrai gain par rapport à aujourd'hui. Le `.browserslistrc` peut être repris tel quel.

### 1.8 `.github/workflows`

- **`check.yaml`** (push `main` + PR), `concurrency` avec annulation des PR obsolètes, `permissions: contents: read` par job, `persist-credentials: false`, **toutes les actions épinglées par SHA** avec commentaire de version :
  - `license` : `fsfe/reuse-action@676e2d5… # v6.0.0` (conformité REUSE/SPDX — chaque fichier porte un en-tête `SPDX-License-Identifier`).
  - `lint` : `actions/checkout@3d3c42e… # v7.0.1` → `pnpm/setup@703c526… # v2.1.0` avec `runtime: node` (installe pnpm **et** Node **et** les dépendances, cache inclus) → `pnpm lint` → `pnpm knip` → vérification que les traductions extraites sont à jour (`git diff --cached --exit-code`).
  - `playwright` : checkout → `pnpm/setup` → `pnpm exec playwright install --with-deps chromium webkit` → `pnpm build` → `pnpm test` → `actions/upload-artifact@043fb46… # v7.0.1` (rapport HTML, 30 jours, `if: ${{ !cancelled() }}`).
- **`zizmor.yaml`** : analyse de sécurité des workflows (`zizmorcore/zizmor-action # v0.6.4`), `permissions: {}` au niveau racine.
- **`build.yaml`** : image Docker poussée sur leur registre privé (Tailscale + Vault) — non pertinent.
- `translations-*.yaml` : Localazy — non pertinent.
- `dependabot.yml` : mises à jour quotidiennes npm + actions, `cooldown: default-days: 7` (attend 7 jours avant de proposer une version : protection supply-chain), **groupes** (`tanstack-router`, `tanstack-query`, `vite`, `react`, `types`…).

> **Transposable ?** Oui pour `check.yaml` (lint + knip + build + Playwright), `zizmor`, `dependabot` (groupes + cooldown). On remplace `build.yaml` par un déploiement **GitHub Pages** (`actions/upload-pages-artifact` + `actions/deploy-pages`). Exemple en §11.7.

### 1.9 `Dockerfile` / `docker/`

Build Node 24 Alpine + `corepack enable` + `pnpm install --frozen-lockfile` + nginx-unprivileged, avec remplacement de `APP_CONFIG_PLACEHOLDER` au démarrage. **Non pertinent** pour GitHub Pages. (Idée réutilisable seulement : `public/_headers` avec CSP et `Cache-Control: immutable` sur `/assets/*` — GitHub Pages n'honore pas `_headers`, donc sans objet chez nous.)

### 1.10 `docs/`, `scripts/`, `tests/README.md`

- `docs/` : une capture d'écran seulement.
- `scripts/i18n-normalize-plurals.mjs` : correctif des pluriels ICU de Localazy — non pertinent.
- `tests/README.md` : **très bonne documentation de la stratégie de test**, voir §8.

### 1.11 Divers notable

- `index.html` minimal (`<div id="app"></div>`, `<title data-temp-title>`), configuration runtime injectée via `window.APP_CONFIG_BASE64` lue et **validée par valibot** dans `src/config.ts` (pattern utile pour notre `APPS_SCRIPT_URL`, même si chez nous une variable `import.meta.env.VITE_APPS_SCRIPT_URL` suffit).
- En-têtes SPDX dans chaque fichier (licence AGPL/commerciale) : pas nécessaire chez nous.

### 1.12 Sorties des commandes lancées dans le clone

Environnement : Node 22.22.0, pnpm 11.25.0 (déjà présent ; `corepack enable` sans effet nécessaire).

```text
$ pnpm install --frozen-lockfile
✓ Lockfile passes supply-chain policies
+ oxlint 1.82.0 / + oxlint-tsgolint 7.0.2001 / + oxfmt 0.67.0 / + typescript 7.0.2 / + vite 8.3.0 …
Done in 13.1s using pnpm v11.25.0

$ time pnpm exec oxlint            # = typeAware + typeCheck + jsPlugins, sur tout le dépôt
(aucune sortie)  EXIT=0
real 0m4.081s   user 0m8.832s      # ~200 fichiers TS/TSX

$ pnpm exec oxlint --version
Version: 1.82.0

$ time pnpm exec oxfmt --check
Checking formatting...
All matched files use the correct format.
Finished in 478ms on 202 files using 4 threads.

$ time pnpm exec tsc --noEmit -p .   # TS 7 (typescript-go), non utilisé par le projet
(aucune sortie)  real 0m2.807s
$ pnpm exec tsc --version
Version 7.0.2

$ pnpm exec stylelint 'src/**/*.css'  → OK (aucune sortie)
$ time pnpm knip                      → "knip && knip --production", aucune trouvaille, real 4.2s

$ time pnpm build
dist/assets/datetime-BYrdkOWl.js   159.64 kB │ gzip:  45.84 kB   ← polyfill Temporal
dist/assets/index-DJhqz9Do.js      796.68 kB │ gzip: 246.84 kB
✓ built in 5.43s
(!) Some chunks are larger than 500 kB after minification.
```

**Sonde type-aware** (fichier ajouté dans une **copie** du clone, pas dans le clone) pour prouver que les trois mécanismes fonctionnent :

```ts
// src/utils/zz-lint-probe.ts
export async function probe(): Promise<number> { return 1; }
export function caller(): void {
  probe();                       // no-floating-promises → coupée dans leur config : rien
  const x: number = "hello";     // typeCheck
  const y: any = 2;              // no-explicit-any
  if (Promise.resolve(1)) {}     // condition toujours vraie
  console.log(x, y);
}
export function useProbe(id: string) {
  return useQuery({ queryKey: ["probe"], queryFn: () => fetch(`/x/${id}`) }); // jsPlugin TanStack
}
```

```text
$ pnpm exec oxlint src/utils/zz-lint-probe.ts
src/utils/zz-lint-probe.ts:10:12: error typescript(no-explicit-any): Unexpected `any`. Specify a different type. …
src/utils/zz-lint-probe.ts:18:19: error @tanstack/query(exhaustive-deps): The following dependencies are missing in your queryKey: id
src/utils/zz-lint-probe.ts:9:9: error typescript(TS2322): Type 'string' is not assignable to type 'number'.
src/utils/zz-lint-probe.ts:11:7: error typescript(TS2801): This condition will always return true since this 'Promise<number>' is always defined.
EXIT=1
```

→ règles natives, **plugin ESLint JS** et **erreurs du compilateur TS** sortent toutes du même `oxlint`.

**Playwright non exécuté** : le téléchargement de Chromium (Chrome for Testing 153) est bloqué par le proxy de l'environnement (`Download failure, code=1`, même avec `NODE_EXTRA_CA_CERTS`). Le reste (build) étant vert, la suite tournerait en CI.

**Constat annexe (argument pour Start SPA, §3.9)** : le `dist/index.html` produit contenait **9 attributs `data-tsd-source="/src/…:23:3"`** (injection de source des devtools TanStack, normalement réservée au dev) dans le HTML pré-rendu. Cause probable : le plugin `vitePluginPrerender` appelle `resolveConfig(config, "serve")` (donc mode `development`) sans `configFile: false`, ce qui recharge `vite.config.ts` et ses plugins de dev. Bénin (le JS de prod n'en contient pas), mais illustre la fragilité d'un prerender maison.

---

## 2. src/stores/ — Zustand

### 2.1 Inventaire

Deux fichiers seulement : `src/stores/auth.ts` (235 lignes) et `src/stores/locale.ts` (40 lignes). Pas de slices, pas de `combine`, pas d'`immer`, pas de `devtools`, pas de `subscribeWithSelector`.

### 2.2 Le pattern exact

```ts
// src/stores/locale.ts — le cas minimal
import { shared } from "use-broadcast-ts";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LocaleStoreState {
  /** The user-selected locale, null if using browser default */
  selectedLocale: string | null;
}
interface LocaleStoreActions {
  setLocale: (locale: string) => void;
  clearLocale: () => void;
}
type LocaleStore = LocaleStoreState & LocaleStoreActions;

export const useLocaleStore = create<LocaleStore>()(   // ← forme « curried » create<T>()(…) pour l'inférence des middlewares
  persist(
    shared(
      (set) => ({
        selectedLocale: null,
        setLocale(locale) { set({ selectedLocale: locale }); },
        clearLocale() { set({ selectedLocale: null }); },
      }),
      { name: "locale" },          // nom du BroadcastChannel
    ),
    { name: "locale" },            // clé localStorage
  ),
);
```

- **Typage** : `State` et `Actions` en deux interfaces, union `type Store = State & Actions`, `create<Store>()(…)`. Aucun `StateCreator` explicite (inutile sans slices).
- **Ordre des middlewares** : `persist(shared(creator))` — `shared` (le plus interne) diffuse chaque `set` aux autres onglets via `BroadcastChannel` ; `persist` (externe) écrit dans le stockage.
- **`persist` sans aucune option à part `name`** → défauts zustand 5 (lus dans `node_modules/zustand/esm/middleware.mjs`) : `storage: createJSONStorage(() => window.localStorage)`, `partialize: (state) => state` (les fonctions sont éliminées par `JSON.stringify`), `version: 0`, `merge` superficiel. Pas de `migrate`, `onRehydrateStorage`, `skipHydration`.
- **Pourquoi aucun `useEffect` d'hydratation** : `localStorage` est **synchrone**, donc `persist` réhydrate **pendant `create()`**, au chargement du module. Dès que le module est importé, `useAuthStore.getState().credentials` est juste — y compris dans le `beforeLoad` du routeur, appelé avant tout rendu (`main.tsx` fait `await router.load()` avant `hydrateRoot`). Aucun `hasHydrated()`, aucun écran « chargement de la session ». (Avec un stockage asynchrone comme idb-keyval, ce serait faux : il faudrait attendre `persist.onFinishHydration`.)
- **`use-broadcast-ts` `shared`** (`node_modules/use-broadcast-ts/dist/shared.d.ts`) : options `name`, `mainTimeout` (100 ms : élection d'un onglet « principal » qui fournit l'état initial aux nouveaux onglets), `unsync`, `skipSerialization`, `partialize`, `merge`, `onBecomeMain`, `onTabsChange`. Élément n'utilise que `name`. Résultat : se connecter/déconnecter dans un onglet se propage aux autres instantanément.

### 2.3 Le store `auth` (extraits)

```ts
// src/stores/auth.ts
interface AuthStoreState {
  authorizationSession: AuthorizationSession | null;  // PKCE en cours
  credentials: DynamicCredential | StaticCredential | null;
}
interface AuthStoreActions {
  startAuthorizationSession: (serverName: string, clientId: string, redirect: string | undefined)
    => Promise<{ state: string; codeChallenge: string }>;
  useStaticCredential(serverName: string, accessToken: string): Promise<void>;
  saveCredentials(serverName: string, clientId: string, accessToken: string,
                  refreshToken: string, expiresIn: number): Promise<void>;
  /** Returns the access token for the current session, refreshing it if needed */
  accessToken(queryClient: QueryClient, abortSignal?: AbortSignal): Promise<string>;
  clear: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    shared(
      (set, get) => ({
        authorizationSession: null,
        credentials: null,
        // …
        async accessToken(queryClient, signal) {
          signal = addTimeout(signal, 10 * 1000);            // AbortSignal.any([signal, AbortSignal.timeout(10s)])
          const current = get();
          if (!current.credentials) throw new NotLoggedInError();
          if (current.credentials.static) return current.credentials.accessToken;
          if (!isExpired(current.credentials)) return current.credentials.accessToken;
          // métadonnées serveur prises dans le cache Query, pas re-téléchargées
          const wellKnown = await queryClient.ensureQueryData(wellKnownQuery(current.credentials.serverName));
          const { token_endpoint } = await queryClient.ensureQueryData(authMetadataQuery(wellKnown["m.homeserver"].base_url));
          // un seul rafraîchissement à la fois, même entre onglets
          return await navigator.locks.request(REFRESH_LOCK, { signal }, async () => {
            const current = get();
            if (!current.credentials) throw new NotLoggedInError();
            if (current.credentials.static || !isExpired(current.credentials)) return current.credentials.accessToken;
            const response = await tokenRequest(token_endpoint, { grant_type: "refresh_token", /* … */ }, signal);
            await current.saveCredentials(/* … */);
            return response.access_token;
          });
        },
        async clear() {
          await set({ authorizationSession: null, credentials: null });
          await reset();                                       // ← purge Query + IndexedDB (src/query.ts)
        },
      }),
      { name: "auth" },
    ),
    { name: "auth" },
  ),
);

// Accès hors React, utilisé par toutes les queryFn
export const accessToken = (queryClient: QueryClient, signal?: AbortSignal) =>
  useAuthStore.getState().accessToken(queryClient, signal);

// Réaction globale, au niveau module (pas dans un composant)
useAuthStore.subscribe((oldState, newState) => {
  if (!!oldState.credentials !== !!newState.credentials) {
    // Tout ce qui dépend de l'auth est périmé, sauf la route /callback (qui EST la transition)
    router.invalidate({ filter: (match) => match.routeId !== "/callback" });
  }
});

// Crochets de debug utilisés par les tests Playwright
(globalThis as Record<string, unknown>)["__useStaticCredentials"] = (serverName: string, accessToken: string) => {
  useAuthStore.getState().useStaticCredential(serverName, accessToken);
};
(globalThis as Record<string, unknown>)["__clearCredentials"] = () => { useAuthStore.getState().clear(); };
```

Remarques :

- `await set(...)` : sous `persist`, le type de `setState` devient `void | unknown` (mutateur `StorePersist`), donc `await` est accepté par `await-thenable`.
- Les **actions vivent dans le store** (pas de fichier d'actions séparé) et sont sérialisées… nulle part (JSON les ignore).
- Le store importe `router` et `query` → **dépendance circulaire** `stores/auth → router → routeTree.gen → routes/* → stores/auth`. Ça marche grâce aux liaisons vivantes ESM (les valeurs ne sont utilisées qu'à l'exécution), mais c'est fragile. Chez nous, mieux vaut câbler ces effets dans `src/background/` (voir §11.5).

### 2.4 Consommation

| Où | Comment | Fichier |
| --- | --- | --- |
| Garde de route (connecté requis) | `beforeLoad: ({ location }) => { const state = useAuthStore.getState(); if (!state.credentials) throw redirect({ to: "/login", search: location.href === "/" ? undefined : { redirect: location.href } }); return { credentials: state.credentials }; }` — les identifiants sont **injectés dans le contexte de route** pour les enfants | `src/routes/_console.tsx` |
| Garde inverse (déjà connecté) | `beforeLoad: () => { if (useAuthStore.getState().credentials) throw redirect({ to: "/" }); }` | `src/routes/_auth.tsx` |
| Loader de callback | `useAuthStore.getState().authorizationSession` / `saveCredentials(...)` puis `throw redirect(...)` | `src/routes/callback.tsx` |
| queryFn | `Authorization: Bearer ${await accessToken(client, signal)}` | `src/api/*.ts` |
| Composants | sélecteur fin : `useAuthStore((store) => store.startAuthorizationSession)`, `useAuthStore((state) => state.clear)` ; une fois sans sélecteur : `const { credentials, clear } = useAuthStore();` (`src/ui/errors.tsx`) | |
| Composants (identifiants) | **via le contexte de route** : `const { credentials } = Route.useRouteContext();` plutôt que le store | `src/routes/_console*.tsx` |
| Hors React | `useLocaleStore.getState().selectedLocale` dans `computeHumanReadableDateTimeStringFromUtc` et `preloadLocale` | `src/utils/datetime.ts`, `src/intl.tsx` |

**Déconnexion** (`src/routes/_console.tsx`, `SignOutMenuItem`) : `useMutation({ mutationFn: revokeToken, throwOnError: true, onSuccess: async () => { await clear(); await navigate({ to: "/", reloadDocument: true }); } })` → `clear()` vide le store, `reset()` fait `queryClient.clear()` puis `idb-keyval clear()`, et le **rechargement complet** garantit qu'il ne reste rien en mémoire.

### 2.5 Adaptation à notre mode collègue — avis

Nos contraintes : mot de passe partagé (pas un jeton révocable), déconnexion après 10 min d'inactivité, purge des données personnelles à la déconnexion, détection « mot de passe changé côté serveur » (Apps Script répond `{ error: "Mot de passe incorrect." }`).

**Avis sur la persistance du mot de passe : ne PAS le persister, ni en localStorage ni en sessionStorage.**

- C'est le **mot de passe partagé de l'établissement**, pas un jeton de session : impossible de le révoquer pour un seul poste, et il donne accès aux noms/e-mails/téléphones. Le laisser dans un stockage navigateur l'expose à toute XSS. Sur GitHub Pages, tous les sites « projet » d'un même compte (`compte.github.io/depot-a`, `compte.github.io/depot-b`…) partagent **la même origine** `compte.github.io` : un autre dépôt Pages du compte (ou une faille dans celui-ci) lit le `localStorage` du nôtre. `sessionStorage` est en plus limité à l'onglet, donc moins exposé, mais reste lisible par tout script de l'origine dans cet onglet — argument fort contre tout stockage du mot de passe.
- L'appli actuelle ne le persiste pas (`adminPassword` est une variable JS) : un rechargement déconnecte. Garder ce comportement = aucune régression de sécurité.
- Le seul « coût » (se reconnecter après F5) est faible au regard des 10 min d'inactivité déjà imposées.
- Si l'équipe insiste : `persist` + `createJSONStorage(() => sessionStorage)` + `partialize: (s) => ({ password: s.password, expiresAt: s.expiresAt })` + vérification d'expiration dans `merge`/`onRehydrateStorage`. Je le déconseille.

**Pas de `shared` (use-broadcast-ts) pour le mot de passe** : diffuser le mot de passe à tous les onglets n'apporte rien. En revanche, **diffuser la déconnexion** (un simple message `"logout"` sur un `BroadcastChannel`) est utile — fait dans le module background (§11.5).

**Pattern recommandé** (code complet en §11.4) :

1. `src/stores/session.ts` : `create<SessionStore>()(subscribeWithSelector((set, get) => ({ password: null, lastLogoutReason: null, login, logout(reason) })))` — **sans `persist`**. `subscribeWithSelector` permet `useSessionStore.subscribe((s) => s.password !== null, (connecté) => …)` pour ne réagir qu'aux transitions.
2. Le mot de passe **n'entre jamais dans une clé de requête** (les clés sont visibles dans les devtools et sérialisées par le persister). Il est lu dans la `queryFn`/`mutationFn` via `getPassword()` — exactement comme Element lit le jeton via `accessToken(client)`.
3. Garde `beforeLoad` sur la branche `/collegue` : `if (!useSessionStore.getState().password) throw redirect({ to: "/collegue/connexion", search: { redirect: location.href } })`, et `return { colleague: true }` dans le contexte.
4. **Purge** : à la transition connecté → déconnecté, `queryClient.removeQueries({ queryKey: ["collegue"] })` (toutes les données personnelles vivent sous le préfixe `["collegue", …]`), puis `router.invalidate()` qui relance les gardes et renvoie vers la page publique. Pas besoin de `reloadDocument` puisque rien de sensible n'est persisté.
5. **Mot de passe changé** : l'API lève une `PasswordRejectedError` ; un `onError` global posé sur `QueryCache` **et** `MutationCache` appelle `useSessionStore.getState().logout("password-changed")`. Un seul endroit, aucune duplication dans les composants.
6. **Inactivité** : timer dans `src/background/session-guard.ts` (pas dans le store, pas dans un composant). L'heure de dernière activité reste une variable de module (pas dans le store : on ne veut pas de re-rendu à chaque `mousemove`).

---

## 3. src/routes/ — TanStack Router

### 3.1 Conventions de fichiers

Routage **plat à points** (aucun sous-dossier dans `src/routes/`) :

```
__root.tsx                                   racine (createRootRouteWithContext)
_auth.tsx                                    layout sans chemin : pages déconnectées
_auth.login.index.tsx                        /login
callback.tsx                                 /callback (OAuth)
_console.tsx                                 layout sans chemin : garde + coquille de l'appli
_console.index.tsx                           /           (tableau de bord)
_console.users.tsx                           /users      (liste + <Outlet/> pour le tiroir)
_console.users.$userId.tsx                   /users/$userId (tiroir de détail, enfant de la liste)
_console.devices.tsx / .devices.index.tsx    /devices → redirect vers /devices/user
_console.devices.user.tsx / .user.$sessionId.tsx
_console.federation.tsx / .federation.index.tsx / .federation.known-domains.$destination.tsx
…
```

- `_xxx` = **layout sans segment d'URL** ; `$param` = paramètre ; `.index` = route d'index ; le point = imbrication.
- Les **détails sont des enfants de la liste** : la liste rend `<Outlet />` et le détail s'affiche en panneau latéral par-dessus (« drawer »), la liste restant montée → l'élément ouvert est **dans l'URL** (`/users/01HX…?status=active`).
- Les noms passent `unicorn/filename-case` kebab-case.

> **Transposable ?** Oui. Proposition : `__root.tsx`, `index.tsx` (accueil public, recherche `?resto=r1&mois=2026-10&jour=2026-10-14`), `_collegue.tsx` (garde + coquille), `_collegue.collegue.index.tsx` ou dossier `collegue/`, `collegue.connexion.tsx`, `_collegue.collegue.jours.$date.tsx`, `_collegue.collegue.impression.$date.tsx`… Le tiroir de détail = notre « fiche du jour ».

### 3.2 Racine et contexte

```tsx
// src/routes/__root.tsx
interface RouterContext {
  queryClient: QueryClient;
}
export const Route = createRootRouteWithContext<RouterContext>()({
  staticData: { breadcrumb: { message: defineMessage({ id: "product.title", defaultMessage: "Element Admin" }) } },
  component: RouteComponent,
  errorComponent: GenericError,         // une seule errorComponent, à la racine
});

function RouteComponent() {
  const intl = useIntl();
  const breadcrumbs = useBreadcrumbsFromMatches();
  useLayoutEffect(() => { document.querySelector("title[data-temp-title]")?.remove(); }, []);
  return (<><title>{formatBreadcrumbs(intl, breadcrumbs)}</title><Outlet /></>);   // <title> React 19
}
```

```ts
// src/router.ts
export const router = createRouter({
  routeTree,
  history: createBrowserHistory(),
  context: { queryClient },            // ← seul élément du contexte ; les stores sont lus via getState()
  defaultPreload: "intent",            // précharge loader + chunk au survol/focus d'un lien
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,          // laisse Query décider de la fraîcheur (recommandé avec Query)
});
declare module "@tanstack/react-router" { interface Register { router: typeof router } }
```

- Le contexte est **enrichi par `beforeLoad`** : `_console.tsx` retourne `{ credentials }`, que tous les enfants lisent via `context.credentials` (loader) ou `Route.useRouteContext()` (composant).
- Fil d'Ariane / `<title>` : `staticData.breadcrumb` (statique) ou `loader` qui retourne `{ breadcrumb: { literal } }` (dynamique), agrégés par `useMatches()` (`src/utils/breadcrumbs.ts`, avec augmentation de module `StaticDataRouteOption`).

> **Transposable ?** Oui : `context: { queryClient }`, `defaultPreload: "intent"`, `defaultPreloadStaleTime: 0`, `scrollRestoration`, le `<title>` construit depuis `staticData`. Avec Start, la fabrique s'appelle `getRouter()` dans `src/router.tsx` ; le reste est identique.

### 3.3 `validateSearch` avec valibot = « l'état dans l'URL »

```ts
// src/routes/_console.users.tsx
const UserSearchParameters = v.object({
  admin: v.optional(v.boolean()),
  guest: v.optional(v.boolean()),
  status: v.optional(v.picklist(["active", "locked", "deactivated"])),
  search: v.optional(v.string()),
  client: v.optional(v.array(v.string())),
  legacy: v.optional(v.boolean()),
  dir: v.optional(v.picklist(["forward", "backward"])),
});
type UserSearch = v.InferOutput<typeof UserSearchParameters>;

export const Route = createFileRoute("/_console/users")({
  staticData: { breadcrumb: { message: titleMessage } },
  validateSearch: UserSearchParameters,            // ← schéma valibot passé tel quel (Standard Schema), pas d'adaptateur
  loaderDeps: ({ search }) => {
    const parameters: UserListFilters = {
      ...(search.admin !== undefined && { admin: search.admin }),
      ...(search.status && { status: search.status }),
      ...(search.search && { search: search.search }),
      // …
    };
    return { parameters, direction: search.dir };  // ← seules ces valeurs relancent le loader
  },
  loader: async ({ context: { queryClient, credentials }, deps: { parameters, direction } }) => {
    queryClient.prefetchQuery(usersCountQuery(credentials.serverName, parameters));   // sans await : en parallèle
    await queryClient.ensureQueryData(wellKnownQuery(credentials.serverName));
    await queryClient.ensureInfiniteQueryData(usersInfiniteQuery(credentials.serverName, parameters, direction));
  },
  pendingComponent: () => (/* titre + <Placeholder.LoadingTable /> */),
  component: RouteComponent,
});
```

Autres exemples :

```ts
// src/routes/_auth.login.index.tsx — redirection après connexion
const LoginSearchParameters = v.object({ redirect: v.optional(v.string()) });

// src/routes/callback.tsx — union discriminée dans l'URL
const SearchParameters = v.intersect([
  v.object({ state: v.string() }),
  v.union([
    v.object({ code: v.string() }),
    v.object({ error: v.string(), error_description: v.optional(v.string()) }),
  ]),
]);
```

- Les schémas sont **stricts** (pas de `v.fallback`) : un paramètre invalide fait échouer la validation → `errorComponent`. Pour un site public, je recommande `v.fallback(...)` pour ignorer silencieusement un `?mois=nimporte` (voir §11.6).
- **Pas de `search.middlewares`** (`retainSearchParams`/`stripSearchParams`) dans le projet : la conservation des filtres se fait à la main (`search={search}` sur les liens de ligne, `search: (previous) => previous` à la navigation).
- Valeurs par défaut de recherche centralisées dans des constantes : `export const defaultUserDevicesSearch = { dir: "backward" } as const;` (`src/ui/device-tabs.tsx`), réutilisées par la redirection `beforeLoad: () => { throw redirect({ to: "/devices/user", search: defaultUserDevicesSearch }); }` (`src/routes/_console.devices.index.tsx`).

### 3.4 Navigation avec mise à jour de la recherche

```tsx
// Recherche texte débouncée → URL (replace: pas d'entrée d'historique par frappe)
const from = useCurrentChildRoutePath(Route.id);       // garde l'enfant ouvert (tiroir) en changeant les filtres
const navigate = useNavigate({ from });
const debouncedSearch = useDebouncedCallback(
  (term: string) => {
    navigate({
      replace: true,
      search: (previous) => (!term.trim() ? { ...previous, search: undefined } : { ...previous, search: term.trim() }),
    });
  },
  { key: "user-search", wait: 200 },
);

// Filtres : état calculé (src/utils/filters.ts) → navigate({ replace: true, search: filter.toggledState })
<CheckboxMenuItem onSelect={(e) => { e.preventDefault(); navigate({ replace: true, search: filter.toggledState }); }}
                  label={intl.formatMessage(filter.message)} checked={filter.enabled} />

// Lien « retirer le filtre » typé
<DataTable.RemoveFilterLink from={from} replace={true} search={filter.toggledState} />

// Ouvrir un détail en conservant les filtres
<DataTable.RowLink to="/users/$userId" params={{ userId }} search={search} resetScroll={false} />

// Après création : aller sur le nouveau détail en gardant la recherche
await navigate({ to: "./$userId", params: { userId: response.data.id }, search: (previous) => previous });
```

`src/utils/filters.ts` (`useFilters(state, definitions)`) calcule pour chaque filtre `enabledState`/`disabledState`/`toggledState` et un `clearedState` — directement utilisables comme `search` de `<Link>`. Composants liens typés via `createLink` (`src/components/link.tsx` : `ButtonLink = createLink(forwardRef(...))`, `TextLink = createLink(Link)`).

> **Transposable ?** Très directement : restaurant affiché, mois du calendrier, jour ouvert, onglet collègue (« jours / plats / réservations »), filtre de recherche d'une réservation → tout dans l'URL, liens partageables, bouton Retour qui marche. `useCurrentChildRoutePath` n'est utile que si on a des listes avec tiroir.

### 3.5 Loaders, `ensureQueryData`, Suspense

- **Règle maison** : le loader **garantit** les données (`await ensureQueryData(...)`), le composant les **lit** avec `useSuspenseQuery(sameQueryOptions)` → jamais d'état `undefined` à gérer dans le composant. Les données secondaires sont lancées sans `await` (`prefetchQuery`) et lues avec `useQuery` (+ `placeholderData: keepPreviousData` pour le compteur) ou `useSuspenseQuery` dans un sous-composant entouré d'un `<Suspense>`/`ErrorBoundary` local (`Data.DynamicValue`).
- Parallélisation explicite dans les loaders de détail (`src/routes/_console.users.$userId.tsx`) : toutes les promesses sont créées d'abord, puis attendues.
- `ensureParametersAreUlids(params)` (`src/utils/parameters.ts`) : valide les `$params` avec valibot dans le **loader** et lève `notFound()` — avec ce commentaire important : *« Intended to use in routes loader, not beforeLoad else parent routes never resolve! »*.

### 3.6 `pendingComponent`, `errorComponent`, `notFoundComponent`

- `pendingComponent` sur chaque **liste** : même en-tête que la page + squelette (`<Placeholder.LoadingTable />`) — le titre ne « saute » pas.
- `errorComponent: GenericError` **uniquement à la racine** (`src/ui/errors.tsx`) : affiche les `LocalizedError` (avec `cause` récursive), boutons « Réessayer » (`queryReset.reset(); reset(); router.invalidate();`), « Revenir » (`useCanGoBack`), « Se déconnecter et recharger ».
- `notFoundComponent` sur chaque **détail** (le tiroir affiche une alerte « Utilisateur introuvable ») ; déclenché par `throw notFound()` dans les helpers d'API sur un 404 (`ensureNoError(result, true)`).

### 3.7 Gardes `beforeLoad`

Trois usages : authentification (`_console`, `_auth`), redirection d'index (`_console.devices.index.tsx`), **garde de fonctionnalité** asynchrone :

```ts
// src/routes/_console.devices.tsx
beforeLoad: async ({ context: { queryClient, credentials } }) => {
  const { devices } = await getFeaturesStatus(queryClient, credentials.serverName);
  if (!devices) throw notFound();
},
```

> **Transposable ?** Oui : garde `_collegue` (session), et éventuellement redirection `/` → `/?resto=r1&mois=<courant>` via `beforeLoad`/`validateSearch` par défaut.

### 3.8 Code splitting et `routeTree.gen.ts`

- `autoCodeSplitting: true` ; le build produit un chunk par route (`dist/assets/_console.users._userId-BRFC0VaZ.js 36.59 kB`).
- `src/routeTree.gen.ts` est **committé**, commence par `/* eslint-disable */ // @ts-nocheck`, est exclu d'`oxfmt` (`ignorePatterns`) ; côté oxlint il n'est pas ignoré mais l'override `**/*.gen.ts` coupe les règles gênantes. knip n'a pas besoin de l'ignorer (il est importé).

> **Transposable ?** Oui ; je préfère l'ajouter directement à `ignorePatterns` d'oxlint aussi (plus simple).

### 3.9 `src/prerender.tsx` + `vitePluginPrerender` vs `spa` de TanStack Start

**Leur mécanisme** : au build, un plugin Vite (`apply: "build"`, `enforce: "post"`, uniquement l'environnement `client`) crée un `RunnableDevEnvironment` Vite, importe `/src/prerender`, et remplace `<div id="app"></div>` dans `index.html` par le HTML rendu :

```tsx
// src/prerender.tsx — rend uniquement le fallback Suspense (l'écran de chargement)
const infinite = new Promise(() => { /* Never resolve */ });
const Waiting: React.FC = () => { throw infinite; };
export const render = async () =>
  renderToString(<Suspense fallback={<LoadingFallback />}><Waiting /></Suspense>);
```

```tsx
// src/main.tsx — hydrate si la coquille est présente (build), sinon createRoot (dev)
if (rootElement.innerHTML) {
  (async () => {
    await Promise.all([preloadLocale(), router.load()]);   // tout charger AVANT d'hydrater : pas de flash blanc
    hydrateRoot(rootElement, <App />, {
      onRecoverableError: (error) => {
        if (error instanceof Error && error.message.includes("#419")) return;  // fallback Suspense rendu côté « serveur » : voulu
        console.error(error);
      },
    });
  })();
} else {
  createRoot(rootElement).render(<App />);
}
```

`LoadingFallback` (`src/ui/loading-fallback.tsx`) a des contraintes documentées : pas de texte localisé, pas de lib de composants, ne doit ni suspendre ni lever.

**TanStack Start, mode SPA** (vérifié dans `@tanstack/start-plugin-core@1.168.60`, `schema.js` / `post-build.js`) :

```ts
var spaSchema = z.object({
  enabled: z.boolean().optional().default(true),
  maskPath: z.string().optional().default("/"),
  prerender: pagePrerenderOptionsSchema.optional().prefault({}).transform((opts) => ({
    outputPath: opts.outputPath ?? "/_shell", crawlLinks: false, retryCount: 0, ...opts, enabled: true,
  })),
});
```

Au post-build, Start pré-rend la page `maskPath` avec l'en-tête `TSS_SHELL: true` : le rendu s'arrête à la **racine** (`__root.tsx` : `<html>`, `<head>`, `shellComponent`, `pendingComponent` de la racine) et écrit `/_shell.html`. C'est exactement ce qu'Element fait à la main, mais : intégré, sans re-résolution de config Vite (cf. le bug `data-tsd-source` en §1.12), avec `<head>` géré par `HeadContent`/`head()` des routes.

> **Arbitrage** : on garde **Start SPA** (cible annoncée). On reprend leurs **idées** : coquille = écran de chargement sans dépendances lourdes ; pas de texte qui dépend des données ; `await router.load()` avant l'hydratation est géré par Start. Pour GitHub Pages : copier la coquille en `index.html` **et** `404.html` (Pages sert `404.html` pour les URL profondes) dans une étape post-build, et régler `base`/`basepath` sur `/reservations-restaurants/` — options exactes (`outputPath`, `maskPath`) à valider sur la doc Start au moment de l'implémentation.

---

## 4. src/api/ et src/query.ts — TanStack Query

### 4.1 Organisation

```
src/api/auth.ts                  authMetadataQuery, clientRegistration, tokenRequest, revokeToken
src/api/matrix.ts                wellKnownQuery, whoamiQuery, profileQuery, mediaThumbnailQuery
src/api/synapse.ts               requêtes Synapse admin (fetch + valibot à la main)
src/api/mas/index.ts             enveloppe du client généré : xxxQuery / xxxInfiniteQuery / mutations
src/api/mas/api/*.gen.ts         client généré par @hey-api/openapi-ts (+ schémas valibot générés) — non transposable
src/api/ess.ts, github.ts, federation-allowlist.ts, well-known-support.ts
src/utils/fetch.ts               fetch enveloppé (erreurs typées)
src/errors.ts                    LocalizedError + sous-classes
src/query.ts                     QueryClient + persister IndexedDB + reset()
```

### 4.2 Déclaration des requêtes : fabriques `queryOptions`

```ts
// src/api/matrix.ts
const baseOptions = async (client: QueryClient, signal?: AbortSignal) => ({
  headers: { Authorization: `Bearer ${await accessToken(client, signal)}` },   // ← jeton pris dans le store
  signal,
});

const WhoamiResponse = v.object({ user_id: v.string() });

export const whoamiQuery = (synapseRoot: string) =>
  queryOptions({
    queryKey: ["matrix", "whoami", synapseRoot],
    queryFn: async ({ client, signal }) => {            // ← `client` = le QueryClient (contexte de queryFn, Query ≥ 5.6x)
      const response = await fetch(new URL("/_matrix/client/v3/account/whoami", synapseRoot), await baseOptions(client, signal));
      ensureResponseOk(response);
      return v.parse(WhoamiResponse, await response.json());   // ← validation runtime, type inféré
    },
  });

export const mediaThumbnailQuery = (synapseRoot: string, mxc: string | undefined) =>
  queryOptions({
    enabled: !!mxc,
    queryKey: ["matrix", "media-thumbnail", synapseRoot, mxc],
    staleTime: Infinity,                  // immuable
    refetchOnWindowFocus: false,
    queryFn: async ({ client, signal }): Promise<Blob> => { /* … */ },
  });
```

**Conventions** :

- Nom : `<ressource>Query`, `<ressource>InfiniteQuery`, `<ressource>CountQuery` ; mutations = simples fonctions async exportées (`createUser`, `lockUser`, `revokeToken`…) prenant `queryClient` en premier argument (pour récupérer jeton/métadonnées).
- Clés : tableau hiérarchique `[domaine, ressource, portée, ...paramètres]` → `["mas", "users", serverName, parameters, direction]`, `["mas", "users", serverName, parameters, "count"]`, `["mas", "user", serverName, userId]`. Les filtres sont **un objet dans la clé** (hash stable). **Le jeton n'est jamais dans la clé.** `@tanstack/query/exhaustive-deps` (lint) vérifie que tout ce qu'utilise la `queryFn` est dans la clé.
- `staleTime` global 1 min (`src/query.ts`), `Infinity` pour ce qui ne change pas (métadonnées d'auth, langue, release GitHub), 30 min pour `well-known-support`.
- `select` : **jamais utilisé**. Les transformations sont faites dans la `queryFn` (valibot `transform`) ou dans le composant (`useMemo`).
- `refetchInterval` **fonction** (polling conditionnel) :

```ts
// src/api/synapse.ts
refetchInterval: (result) => {
  const tasks = result.state.data?.scheduled_tasks ?? [];
  return tasks.some((t) => t.status === "scheduled" || t.status === "active") ? 1000 : false;
},
```

- Requêtes infinies (pagination par curseur) : `initialPageParam: null as string | null`, `getNextPageParam` selon la direction ; la table virtualisée appelle `fetchNextPage()` quand on approche du bas.
- Requêtes « tolérantes » : `essVersionQuery`/`siteConfigQuery` attrapent l'erreur et renvoient une valeur par défaut (serveur ancien) au lieu de faire échouer la page.

### 4.3 Mutations et invalidations

```tsx
// src/routes/_console.users.tsx (UserAddButton)
const { mutate, isPending, isError, error } = useMutation({
  mutationFn: (username: string) => createUser(queryClient, serverName, username),
  onError: () => { toast.error(intl.formatMessage({ id: "pages.users.new_user.error_message", defaultMessage: "Error creating user" })); },
  onSuccess: async (response) => {
    queryClient.setQueryData(["mas", "user", serverName, response.data.id], response);   // évite un aller-retour
    toast.success(/* … */);
    queryClient.invalidateQueries({ queryKey: ["mas", "users", serverName] });         // invalide listes ET compteurs (préfixe)
    await navigate({ to: "./$userId", params: { userId: response.data.id }, search: (previous) => previous });
    setOpen(false);
  },
});
```

- Pas de fabriques `mutationOptions` ; pas de mises à jour optimistes ; le lint impose l'ordre des propriétés (`@tanstack/query/mutation-property-order`).
- Les erreurs de mutation sont affichées **dans le dialogue** (`Dialog.ErrorAlert` avec `role="alert"`) ou en toast ; la déconnexion utilise `throwOnError: true` pour remonter à l'`errorComponent`.

### 4.4 Erreurs typées

```ts
// src/errors.ts
export abstract class LocalizedError extends Error {
  abstract readonly localizedMessage: ErrorMessageDescriptor;     // message traduisible
  protected values: Record<string, PrimitiveType> = {};
  get localizedValues() { return this.values; }
}
export class HttpStatusError extends LocalizedError { constructor(response: Response, options?: ErrorOptions) { … this.values = { status, statusText, url }; } }
export class FetchError extends LocalizedError { /* réseau */ }
export class FetchJsonDecodingError extends LocalizedError { /* JSON invalide */ }
export class MatrixStandardError / MasApiError / NotLoggedInError / AuthorizationDeniedError / AuthorizationError …

// src/utils/fetch.ts — fetch enveloppé
export const fetch: typeof globalThis.fetch = async (request, init) => {
  const url = request instanceof Request ? request.url : request;
  let response;
  try { response = await globalThis.fetch(request, init); }
  catch (error) { throw new FetchError(url, { cause: error }); }
  const originalJson = response.json.bind(response);
  response.json = async function (...parameters) {
    try { return await originalJson(...parameters); }
    catch (error) { throw new FetchJsonDecodingError(url, { cause: error }); }
  };
  return response;
};
```

`ensureNoError` / `ensureNotError` convertissent les réponses d'erreur en erreurs typées et les 404 en `notFound()` (route `notFoundComponent`).

> **Transposable ?** Oui, en simplifiant : pas besoin de `LocalizedError` (pas d'i18n) ; des classes `AppsScriptError` (le script renvoie `{ error }`), `PasswordRejectedError` (sous-cas), `NetworkError`, `UnexpectedResponseError` (valibot) suffisent. Le `fetch` enveloppé + `cause` est à reprendre tel quel.

### 4.5 Persistance Query (`src/query.ts`)

```ts
const storage: AsyncStorage<PersistedQuery> = {
  async getItem(key) { return await get(key); },          // idb-keyval
  async setItem(key, value) { await set(key, value); },
  async removeItem(key) { await del(key); },
  async entries() { /* filtre les entrées qui ressemblent à des PersistedQuery */ },
};

const persister = experimental_createQueryPersister({
  storage,
  serialize: (value: PersistedQuery) => value,        // IndexedDB stocke des objets : pas de JSON
  deserialize: (value: PersistedQuery) => value,
  refetchOnRestore: "always",                          // affiche le cache puis recharge toujours
});
persister.persisterGc();                               // nettoie les entrées expirées au démarrage

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      persister: persister.persisterFn,                // ← persistance PAR REQUÊTE, pour toutes les requêtes
    },
  },
});

export const reset = async () => {
  queryClient.clear();
  const demoMode = await get("demoMode");
  if (!demoMode) await clear();                        // vide tout IndexedDB (idb-keyval) au logout
};
```

- Persister **par requête** (`experimental_createQueryPersister`, pas `PersistQueryClientProvider`) : chaque requête est restaurée paresseusement quand elle est utilisée.
- Défauts (lus dans `query-persist-client-core/build/modern/createPersister.js`) : `buster = ""`, `maxAge = 864e5` (24 h), `prefix = "tanstack-query"`, `refetchOnRestore = true` ; option **`filters`** (QueryFilters) disponible pour ne persister qu'une partie des requêtes. Element n'utilise ni `buster`, ni `maxAge`, ni `filters`, ni `shouldDehydrateQuery` (spécifique au persister global).
- Ils persistent donc **des données personnelles d'administration** dans IndexedDB et comptent sur `reset()` au logout.

> **Transposable ?** Le mécanisme oui, la politique non. Chez nous : **ne persister que l'état public** (c'est déjà la règle du README : « la copie gardée dans le navigateur ne contient aucune donnée personnelle »). On pose le `persister` **uniquement** dans les options de `publicStateQuery` (pas en défaut global), stockage `localStorage` (taille modeste, lecture synchrone), `buster: import.meta.env.VITE_APP_VERSION` (remplace la gestion `?v=`), `maxAge` 7 jours, `refetchOnRestore: "always"`. Les requêtes `["collegue", …]` ne sont jamais persistées → la purge au logout se limite à `removeQueries`.

### 4.6 `@tanstack/react-pacer`

Utilisé **uniquement pour du debounce de saisie** :

- `useDebouncedState(initial, { key: "server-discovery", wait: 250 }, (state) => ({ isPending: state.isPending }))` sur le champ « Server name » de la connexion (évite une requête `.well-known` par frappe ; `debouncer.state.isPending` alimente le spinner).
- `useDebouncedCallback(..., { key: "user-search", wait: 200 })` pour pousser la recherche texte dans l'URL (users, rooms, federation, applications).
- `useDebouncedValue` dans `src/ui/user-picker.tsx`.
- `pacerDevtoolsPlugin()` dans le panneau devtools (la `key` sert à identifier l'instance).

> **Utile pour la lecture doublée ou l'actualisation ?** Non. La **lecture doublée** (seconde requête après 6 s, la première réponse gagne) n'est ni du debounce, ni du throttle, ni du rate-limit : c'est du « hedging », 20 lignes de code avec `AbortSignal.any` + `Promise.any` dans la `queryFn` (§11.6). La **seconde tentative 1,5 s après une erreur** = `retry: 1, retryDelay: 1500` de Query (avec un prédicat qui exclut les erreurs du script). L'**actualisation toutes les 3 min** = `refetchInterval: 180_000` de Query. Pacer reste pertinent pour un champ de recherche dans les réservations (mode collègue) et pour éviter les doubles clics (`useThrottledCallback`), mais n'est pas indispensable au démarrage.

---

## 5. src/background/ — ce n'est PAS ce qu'on croit

```
src/background/gradient-desktop.png   14 645 o
src/background/gradient-desktop.svg    1 764 o
src/background/gradient-mobile.png     2 564 o
src/background/gradient-mobile.svg     1 789 o
```

Seule utilisation : `src/components/layout.module.css` → `background-image: url("../background/gradient-desktop.png?inline");`. **Ce dossier contient les images de fond de la page de connexion**, pas des tâches de fond.

Il n'existe **aucun** module de tâches périodiques dans Element Admin. Ce qui s'en approche :

| Besoin | Mécanisme Element | Fichier |
| --- | --- | --- |
| Réaction à la connexion/déconnexion | `useAuthStore.subscribe(...)` **au niveau module** → `router.invalidate()` | `src/stores/auth.ts` |
| Polling conditionnel | `refetchInterval: (query) => ... ? 1000 : false` | `src/api/synapse.ts` |
| Un seul rafraîchissement de jeton à la fois (multi-onglets) | `navigator.locks.request(REFRESH_LOCK, { signal }, …)` | `src/stores/auth.ts` |
| Délai maximal d'une opération | `addTimeout(signal, 10_000)` = `AbortSignal.any([signal, AbortSignal.timeout(ms)])` | `src/utils/signal.ts` |
| Nettoyage de timers/écouteurs | `AbortController` + `addEventListener(..., { signal })` + `controller.signal.addEventListener("abort", () => clearInterval(id), { once: true })` | `src/routes/_console.supervision.tsx` |
| Abonnements navigateur dans React | `useSyncExternalStore` (`languagechange`, `matchMedia`) plutôt que `useEffect` + `useState` | `src/intl.tsx`, `src/components/data-table.tsx` |

Le projet entier n'a que **8 `useEffect`** (4 fichiers), aucun pour l'auth ou les données.

> **Conséquence pour nous** : on **crée** `src/background/` avec ce sens-là (tâches hors composants), démarré une fois dans le point d'entrée client, en combinant ces briques. Conception (code complet en §11.5) :
>
> - `startBackgroundTasks({ queryClient, router })` appelé une fois au démarrage client (dans le `client.tsx` de Start ou un module importé par `getRouter()` côté client), renvoie une fonction d'arrêt ; protégé contre le double démarrage HMR par `import.meta.hot?.dispose(stop)`.
> - **Déconnexion après 10 min** (`session-guard.ts`) : écouteurs passifs `pointerdown/keydown/pointermove/touchstart/wheel` qui ne font que noter `lastActivity` (variable de module) ; **un seul `setTimeout`** armé quand la session s'ouvre (abonnement `subscribeWithSelector`) et réarmé pour le temps restant (même algorithme que notre `armInactivityTimer` actuel) ; vérification immédiate au retour de l'onglet (`visibilitychange`, car les timers sont bridés en arrière-plan) ; à l'échéance → `logout("inactivity")`.
> - **Effets de la déconnexion** (même module, abonnement à la transition) : `queryClient.removeQueries({ queryKey: ["collegue"] })`, `router.invalidate()`, message `BroadcastChannel` « logout » aux autres onglets.
> - **Actualisation toutes les 3 min** : **pas de timer maison** → `refetchInterval: 180_000` sur `publicStateQuery` et `collegueStateQuery`. Query ne rafraîchit pas un onglet caché (`refetchIntervalInBackground: false` par défaut) et rattrape au retour (`refetchOnWindowFocus` si la donnée est périmée) : cela remplace exactement `refreshMissed` + `visibilitychange`. La précaution « ne pas actualiser pendant la saisie » de `js/main.js` n'est plus nécessaire : en React, une nouvelle donnée ne détruit pas les champs (l'état de TanStack Form est indépendant du cache Query, et le partage structurel évite même le re-rendu si l'`etag` n'a pas changé).
> - **Bascule de 10 h (Aristide)** (`clock.ts`) : un `setTimeout` jusqu'à la prochaine échéance qui met à jour un petit store `useClockStore` (`{ now }`) ou appelle `router.invalidate()`, puis se réarme — remplace `scheduleR2Cutoff`.

---

## 6. src/components/ vs src/ui/

### 6.1 Découpage

- **`src/components/`** = briques **génériques**, sans connaissance du métier ni de l'API : `card`, `data` (grille clé/valeur + `DynamicValue`), `data-table` (table virtualisée ARIA grid), `dialog` (Radix + vaul), `footer`, `header`, `layout`, `link`, `navigation`, `page`, `placeholder` (squelettes), `sub-tabs`, `toast`, `copy`, `disclosure`… Chacune avec son `xxx.module.css`.
- **`src/ui/`** = composants **métier/applicatifs** qui connaissent l'API, les stores ou les routes : `errors` (page d'erreur, utilise le store auth), `navigation` (menu de l'appli), `device-tabs` (onglets + recherches par défaut), `user-picker`, `user-cell`, `token-status-badge`, `language-switcher`, `loading-fallback`, `marketing`…
- Les composants **propres à une page** restent **dans le fichier de route** (ex. `UserAddButton`, `ClientFilterLabel`, `UserCell` dans `_console.users.tsx`, d'où des routes de 800 à 1 800 lignes).

### 6.2 Conventions

- **Exports nommés** partout ; `export default` seulement pour quelques composants d'appli (`ui/footer.tsx`, `ui/navigation.tsx`, `ui/loading-fallback.tsx`).
- **Composants composés par espace de noms** : un fichier exporte `Root`, `Title`, `Item`… et s'importe en `import * as DataTable from "@/components/data-table"` → `<DataTable.Root><DataTable.Header><DataTable.Title>…`. Idem `Page`, `Navigation`, `Dialog`, `Header`, `Footer`, `Placeholder`, `Data`.
- Typage : `React.FC<Props>` ou fonction + `interface XxxProps`, props DOM étendues avec `React.ComponentProps<"div">`, `forwardRef` encore présent (héritage React 18).
- **CSS** : CSS Modules (`styles["root"]`, notation crochets imposée par `noPropertyAccessFromIndexSignature`) + **classes Tailwind** dans le JSX pour la mise en page (`className="flex flex-col gap-6 items-center"`) + jetons compound via `@theme` dans `src/base.css`. `classnames` importé en `cx`/`clsx`.
- États de composants exposés en attributs `data-*` (`data-state="visible"`, `data-platform="ios"`) stylés en CSS.

### 6.3 Formulaires

**Aucune librairie de formulaire**, ni `useActionState` : `Form.Root/Field/Label/TextControl/ErrorMessage/Submit` de **compound-web** (Radix Form en dessous), validation **native HTML** (`required`, `pattern`) avec messages par `match="patternMismatch" | "valueMissing" | (value) => …`, erreurs serveur via `serverInvalid`, lecture des valeurs au submit par `new FormData(event.currentTarget)`, état local `useState` pour l'aperçu, envoi par `useMutation`.

> Chez nous : **TanStack Form** (cible) avec les mêmes schémas valibot (Standard Schema : `validators: { onChange: schema }`) et `Field` de **Base UI** pour l'accessibilité (label, description, erreur reliés). L'idée « erreur serveur affichée dans le champ concerné » (`serverInvalid`) est à garder : Apps Script renvoie des erreurs métier (« Plus assez de places ») qu'on mappe sur le champ quantité.

### 6.4 Dialogues

`src/components/dialog.tsx` : **Radix Dialog** sur bureau, **vaul Drawer** (tiroir glissant) sur Android/iOS (détection par user-agent), option `dismissible`, `Dialog.ErrorAlert` avec `role="alert"` parce qu'un toast rendu hors du dialogue (marqué `aria-hidden` par Radix) **ne serait pas annoncé** par les lecteurs d'écran — remarque d'accessibilité précieuse.

> Chez nous : **Base UI `Dialog`** / `AlertDialog` (suppression en deux clics → `AlertDialog`), même règle `role="alert"` pour les erreurs à l'intérieur d'un dialogue.

### 6.5 Toasts

`react-hot-toast` habillé (`src/components/toast.tsx`) : `<BaseToaster position="bottom-center" toastOptions={{ success: { icon: <CheckIcon/> }, error: …, loading: … }}>{(t) => <Toast t={t} />}</BaseToaster>` ; appel impératif `toast.success(...)`, `toast.error(...)`, `toast.promise(...)` depuis les `onSuccess`/`onError` de mutation.

> Chez nous : **Base UI `Toast`** (`Toast.Provider` + `useToastManager().add(...)`, ou un `createToastManager()` au niveau module pour appeler depuis le module background — ex. « Déconnecté après 10 minutes d'inactivité »).

### 6.6 Tables

`@tanstack/react-table` 9 (`tableFeatures({})`, `createColumnHelper<typeof features, Row>()`, `columnHelper.display({...})`) + `@tanstack/react-virtual` (`useWindowVirtualizer`) en **grille ARIA** de `div` (pour une grille CSS + virtualisation), chargement de la page suivante quand la dernière ligne virtuelle approche (`useEffect` : `if (lastVirtualItem.index > rows.length - 50) fetchNextPage()`).

> Chez nous : **inutile** (quelques dizaines de réservations par jour). Un `<table>` natif suffit, et il s'imprime bien.

### 6.7 Error boundaries

`react-error-boundary` en **local** (`Data.DynamicValue`, `ui/user-cell.tsx`) couplé à `useQueryErrorResetBoundary()` pour qu'un « Réessayer » relance la requête ; l'`errorComponent` du routeur gère le niveau page.

> Chez nous : on peut se contenter de l'`errorComponent`/`notFoundComponent` du routeur + Suspense local ; `react-error-boundary` seulement si on a des tuiles indépendantes.

### 6.8 i18n et dates

`react-intl` 12 + formatjs (extraction, compilation, ids hachés, lint) + Localazy ; langue choisie dans `useLocaleStore`, meilleure langue navigateur via `@formatjs/intl-localematcher` et `useSyncExternalStore(languagechange)` ; fichiers compilés chargés par `import.meta.glob` et mis en cache dans Query (`staleTime: Infinity`) ; `preloadLocale()` avant l'hydratation. Dates : `Temporal.Instant.from(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })`.

> Chez nous : **pas d'i18n**. Pour les dates « en toutes lettres » en français, `Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" })` natif suffit ; voir §7 pour Temporal.

---

## 7. src/utils/

| Fichier | Contenu | Intérêt chez nous |
| --- | --- | --- |
| `datetime.ts` | Conversions avec `@js-temporal/polyfill` : `computeUtcIsoStringFromLocal` (`PlainDateTime.from` → `toZonedDateTime(Temporal.Now.timeZoneId())` → `toInstant().toString({ fractionalSecondDigits: 0 })`), `computeLocalDateTimeStringFromUtc`, `computeHumanReadableDateTimeStringFromUtc` (lit la langue via `useLocaleStore.getState()`) | **Concept oui, polyfill à discuter** : nos dates de service sont des dates **civiles** (`2026-10-14`, sans fuseau) — exactement `Temporal.PlainDate` (comparaisons `PlainDate.compare`, `add({ days: 1 })` pour « le lendemain », `PlainTime` pour 10 h / 12 h, `Temporal.Now.plainDateISO("Europe/Paris")`). Mais le polyfill pèse **160 kB min / 46 kB gzip** (chunk `datetime-*.js` du build). Temporal est natif dans Firefox et Chrome récents ; Safari pas encore partout. Recommandation : petites fonctions maison sur chaînes `YYYY-MM-DD` (ce que fait déjà `js/outils.js`), ou Temporal **natif avec polyfill chargé à la demande** si `!("Temporal" in globalThis)`. |
| `signal.ts` | `addTimeout(signal, ms)` = `AbortSignal.any([signal, AbortSignal.timeout(ms)])` | **Oui, tel quel** (délai des lectures Apps Script, hedging). |
| `fetch.ts` | `fetch` enveloppé, erreurs avec `cause`, `ensureResponseOk` | **Oui** (§4.4). |
| `never.ts` | `assertNever(value: never): never` pour les `switch` exhaustifs | **Oui** (actions Apps Script, restaurants `r1`/`r2`). |
| `random.ts` | `randomString(length)` via `crypto.getRandomValues` | Notre `requestId` : préférer `crypto.randomUUID()`. |
| `parameters.ts` | `ensureParametersAreUlids(params)` → `notFound()` | **Oui en adaptant** : `ensureIsoDate(params.date)` dans le loader de `$date`. |
| `filters.ts` | `useFilters(state, definitions)` → états de recherche activé/désactivé/basculé | Si filtres de réservations côté collègue. |
| `routes.ts` | `useCurrentChildRoutePath(routeId)` (chemin de l'enfant affiché, via `FileRoutesById`) | Seulement avec listes + tiroir. |
| `breadcrumbs.ts` | Fil d'Ariane/`<title>` depuis `staticData` et `loaderData` (augmentation `StaticDataRouteOption`) | **Oui** pour le `<title>` (avec Start : plutôt `head: () => ({ meta: [{ title }] })`). |
| `blob.ts` | Cache LRU `Blob → URL.createObjectURL` + `useImageBlob` | Non. |
| `refs.ts` | `mergeRefs` avec nettoyage React 19 | Rarement. |
| `features.ts` | Fonctionnalités selon la version serveur (`verkit` semver) + hook et version non-hook (`getFeaturesStatus(queryClient, …)` pour les loaders) | Le **double accès** hook / fonction-pour-loader est un bon pattern. |
| `user-agent.ts`, `device-activity.ts`, `scope.ts` | Métier Matrix | Non. |

Pas d'`assert` générique (ils utilisent des fonctions `asserts result is …` dédiées, ex. `ensureNoError` dans `src/api/mas/index.ts`).

---

## 8. tests/ — Playwright + msw + axe

### 8.1 Stratégie (d'après `tests/README.md` et le code)

- Tests **de bout en bout sur le build** (`pnpm build && pnpm test`), servi par `vite preview` sur `:4173` ; **aucun backend** : toutes les requêtes sont interceptées par **MSW via `@msw/playwright`** au niveau du **contexte navigateur** (`context.route()`), les résolveurs tournant **dans le process Node** → rien de mock dans le bundle, pas de service worker (d'où `allowBuilds: msw: false`).
- **Mode strict** : toute requête sans handler fait échouer le test en nommant l'URL.
- **Deployments** : jeux de handlers nommés (`essPro`, `essCommunity`, `plainMas`) choisis par `test.use({ deployment: "plainMas" })`.
- **Surcharge ponctuelle** : `network.use(handler)` (préfixe, synchrone) pour un état vide ou un endpoint en erreur.
- **Connexion court-circuitée** : `loginAs(page)` appelle le crochet `globalThis.__useStaticCredentials` exposé par le store ; un seul test parcourt le vrai flux OIDC mocké.
- Assertions : titre `h1` **et** au moins une donnée mockée (prouve que ce n'est pas un écran de repli) ; les filtres vérifient les **paramètres de requête émis** (enregistrés par les résolveurs) en plus du DOM.
- **Accessibilité** : axe-core sur chaque page, avec la **liste exacte** des violations connues (commentées) → toute nouvelle violation casse le test, toute correction oblige à retirer la règle de la liste.
- **Captures** (`@screenshot`) : 6 projets (bureau/tablette/mobile × clair/sombre), générées dans le conteneur Playwright officiel, `timezoneId: "UTC"`, `locale: "en-US"` épinglés.
- Mutations **non mockées** (choix assumé : il faudrait un état mutable par test).

### 8.2 Configuration

```ts
// playwright.config.ts
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : undefined,
  reporter: process.env["CI"] ? [["github"], ["html"]] : "html",
  use: { baseURL: "http://localhost:4173", trace: "on-first-retry", timezoneId: "UTC", locale: "en-US" },
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}",
  projects: [
    { name: "desktop-light", use: { ...devices["Desktop Chrome"], colorScheme: "light" } },
    { name: "desktop-dark", use: { ...devices["Desktop Chrome"], colorScheme: "dark" }, grep: /@screenshot/ },
    // tablet-light/dark (iPad gen 11 landscape), mobile-light/dark (iPhone 15) : grep @screenshot
  ],
  webServer: { command: "pnpm serve --strictPort --port 4173", url: "http://localhost:4173", reuseExistingServer: !process.env["CI"] },
});
```

### 8.3 La fixture réseau

```ts
// tests/mocks/test.ts
export const test = base.extend<Fixtures>({
  deployment: ["essPro", { option: true }],
  network: [
    async ({ context, deployment, baseURL }, use) => {
      // le document SPA (/ , /users…) doit passer jusqu'au serveur statique
      const appDocuments = baseURL && new URL("*", baseURL).toString();
      const network = defineNetworkFixture({
        context,
        handlers: [
          ...(appDocuments ? [http.get(appDocuments, () => passthrough())] : []),
          ...deployments[deployment](),
        ],
        onUnhandledRequest(request, print) {
          const { protocol } = new URL(request.url);
          if (protocol === "blob:" || protocol === "data:") return;   // URL créées par la page elle-même
          print.error();                                               // strict : fait échouer le test
        },
      });
      await network.enable();
      await use(network);
      await network.disable();
    },
    { auto: true },
  ],
});
export { expect } from "@playwright/test";
```

### 8.4 Handlers et pannes

```ts
// tests/mocks/mas.ts — un handler de collection qui sert la liste et le compteur
const listHandler = <R extends MasListResponse>(path: string, count: (self: string) => R, page: () => R): RequestHandler =>
  http.get(`*${path}`, ({ request }) =>
    HttpResponse.json(new URL(request.url).searchParams.get("count") === "only" ? count(`${path}?count=only`) : page()),
  );

// tests/mocks/failing.ts — fabrique de pannes
const failingWith = <B extends JsonBodyType>(defaultBody: B) =>
  (path: string, status = 500, body: B | string = defaultBody): RequestHandler =>
    http.get(`*${path}`, () =>
      typeof body === "string"
        ? new HttpResponse(body, { status, headers: { "Content-Type": "text/plain" } })
        : HttpResponse.json(body, { status }),
    );
export const masFailing = failingWith<ErrorResponse>(masError("Something went wrong"));
```

Les corps de fixtures sont typés avec `satisfies` contre les types de l'API, et le client les **revalide à l'exécution** (valibot) : une fixture qui dérive échoue bruyamment.

### 8.5 Exemples de specs

```ts
// tests/pages/a11y.spec.ts
const scanViolations = async (page: Page): Promise<string[]> => {
  const results = await new AxeBuilder({ page }).exclude("[data-floating-ui-portal]").analyze();
  if (results.violations.length > 0) {
    await test.info().attach("axe-violations", { body: JSON.stringify(results.violations, null, 2), contentType: "application/json" });
  }
  return results.violations.map((v) => `${v.id} [${v.impact}] ×${v.nodes.length}`).toSorted();
};
test("finds no violations on the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
  expect(await scanViolations(page)).toEqual([]);
});

// tests/mocks/auth.ts — attendre que persist ait écrit avant de naviguer
await page.waitForFunction(() => {
  const persisted = globalThis.localStorage.getItem("auth");
  if (!persisted) return false;
  const { state } = JSON.parse(persisted) as { state?: { credentials?: unknown } };
  return !!state?.credentials;
});
```

### 8.6 Transposition pour mocker Apps Script

Très directe. Différences : un seul endpoint (`…/macros/s/<id>/exec`), `GET` (état public, `?since=`), `POST` avec `Content-Type: text/plain` et `{ action, ... }` dans le corps. Mocker les **écritures** est indispensable chez nous (réservation, anti-doublon, mot de passe changé) : on fait un **état mutable par test** (le README d'Element explique pourquoi c'est nécessaire : l'appli relit après une écriture).

```ts
// tests/mocks/apps-script.ts (proposition)
import { http, HttpResponse, type RequestHandler } from "msw";
import type { PublicState, AdminState } from "@/api/types";

const EXEC = "https://script.google.com/macros/s/*/exec";

export interface FakeScript { state: AdminState; password: string; seenRequestIds: Set<string>; calls: string[] }

export const appsScript = (fake: FakeScript): RequestHandler[] => [
  http.get(EXEC, ({ request }) => {
    const since = new URL(request.url).searchParams.get("since");
    fake.calls.push(`GET since=${since ?? ""}`);
    if (since && since === fake.state.etag) return HttpResponse.json({ unchanged: true });
    return HttpResponse.json(toPublic(fake.state) satisfies PublicState);
  }),
  http.post(EXEC, async ({ request }) => {
    const body = JSON.parse(await request.text()) as { action: string; password?: string; requestId?: string };
    fake.calls.push(`POST ${body.action}`);
    // Actions collègue : le script vérifie le mot de passe (réponse 200 avec { error }, comme Apps Script)
    if (body.password !== undefined && body.password !== fake.password) {
      return HttpResponse.json({ error: "Mot de passe incorrect." });
    }
    if (body.requestId && fake.seenRequestIds.has(body.requestId)) {
      return HttpResponse.json({ ...toPublic(fake.state), _duplicate: true });
    }
    // … appliquer l'action à fake.state, recalculer l'etag
    return HttpResponse.json(body.password ? fake.state : toPublic(fake.state));
  }),
];

// Retard de démarrage de Google pour tester la lecture doublée (6 s) :
export const slowFirstRead = (ms = 12_000): RequestHandler => {
  let first = true;
  return http.get(EXEC, async () => { if (first) { first = false; await new Promise((r) => setTimeout(r, ms)); } return undefined; });
  // `undefined` → laisse le handler suivant répondre
};
```

Scénarios à couvrir (nos fonctionnalités du README) : affichage immédiat depuis la copie locale (pré-remplir `localStorage` avec `page.addInitScript`), `{ unchanged: true }`, lecture doublée (`page.clock` de Playwright pour avancer de 6 s), anti-doublon (`_duplicate`), fermeture des commandes à 10 h (`page.clock.setFixedTime`), déconnexion après 10 min (`page.clock.fastForward("10:01")`), mot de passe changé (`fake.password = "autre"` puis actualisation), axe sur chaque écran, impression (au moins le contenu de la fenêtre). `timezoneId: "Europe/Paris"`, `locale: "fr-FR"` épinglés.

---

## 9. Divergences avec notre cible et arbitrages

### 9.1 Router seul + prerender maison vs TanStack Start SPA

| | Element (Router + plugin maison) | Start SPA |
| --- | --- | --- |
| Coquille HTML | `renderToString` du fallback Suspense injecté dans `index.html` | `/_shell.html` pré-rendu au post-build (racine + `pendingComponent`) |
| `<head>` | `<title>` React 19 rendu dans `__root` | `head()` par route + `HeadContent` |
| Entrée | `main.tsx` (hydrate ou createRoot) | `client.tsx` / défaut Start |
| Robustesse | re-résout la config Vite → fuite d'attributs dev observée | intégré, maintenu par TanStack |
| Coût | ~90 lignes de plugin à maintenir | dépendance `@tanstack/react-start` (plus lourde, server functions inutilisées) |

**Avis** : rester sur **Start SPA** comme prévu (évolutif, `head()`, pas de plugin maison). Tout le reste d'Element (routes fichiers, `validateSearch`, loaders, gardes, contexte `queryClient`) est **identique** sous Start. Points GitHub Pages : `base` Vite + `basepath` routeur sur `/reservations-restaurants/`, coquille copiée en `index.html` et `404.html`, et pas de server functions (`createServerFn` interdit de fait : site statique).

### 9.2 Tailwind vs notre `design-system.css`

Element combine CSS Modules + Tailwind + jetons compound. Notre charte impose « aucune couleur, taille ou rayon en dur, toujours `var(--…)` » et nous avons déjà `design-system.css` (35 kB de jetons + composants). **Avis** : pas de Tailwind. On garde `design-system.css` comme feuille globale (jetons `:root` + classes de composants communes), et **CSS Modules** pour les styles propres à un composant (natif dans Vite, zéro dépendance), avec stylelint `stylelint-config-standard` + `declaration-strict-value` pour faire respecter la charte. Les attributs `data-*` d'état (Base UI expose `data-open`, `data-disabled`, `data-starting-style`…) se stylent naturellement en CSS.

### 9.3 Radix / compound-web / vaul vs Base UI

Element : compound-web (leur design system, sur Radix) + `@radix-ui/react-dialog` + `vaul` + `@floating-ui/react` + `react-hot-toast`. **Avis** : **Base UI** couvre tout cela avec une seule dépendance non stylée : `Dialog`, `AlertDialog`, `Popover`, `Menu`, `Select`, `Tabs`, `Toast`, `Field`/`Fieldset`/`Form`, `NumberField` (nos quantités !), `Toggle`/`ToggleGroup` (nos boutons segmentés), `Tooltip`. Pas de tiroir mobile type vaul : un `Dialog` plein écran en CSS sur mobile suffit.

### 9.4 valibot

Element l'a choisi pour : validation runtime de **toutes** les réponses (`v.parse` dans chaque `queryFn`), configuration runtime (`src/config.ts`), paramètres d'URL, schémas générés par openapi-ts. Atouts : modulaire et très léger (tree-shaking par fonction), **Standard Schema** v1 → accepté tel quel par `validateSearch` de TanStack Router (prouvé dans leur code) **et** par `validators` de TanStack Form. **Avis** : on le reprend — un schéma par réponse Apps Script (état public, état collègue, réponse d'écriture), par recherche d'URL et par formulaire. Valider les réponses Apps Script est un vrai gain (le script a déjà changé de forme : `getAdminState` « pas encore mis à jour », cf. `js/donnees.js`).

### 9.5 Pas de TanStack Form chez eux

Ils font des formulaires natifs + compound `Form` (validation HTML). Notre cible TanStack Form est plus adaptée à nos formulaires riches (restaurant 1 : élèves/personnels/extérieurs avec recalcul du prix, restaurant 2 : quantités multiples par plat, erreurs sous chaque champ, conservation du `requestId` entre deux essais). Aucun conflit avec le reste du modèle : la soumission appelle une mutation Query exactement comme chez eux.

### 9.6 Autres écarts

- **Persistance Query** : eux tout en IndexedDB ; nous uniquement l'état public, en localStorage (§4.5).
- **Auth** : eux OAuth/PKCE avec jetons persistés et partagés entre onglets ; nous mot de passe en mémoire seulement (§2.5).
- **i18n / openapi-ts / tables virtualisées / Docker** : sans objet.
- **Polyfill Temporal** : 46 kB gzip, à éviter ou charger à la demande (§7).

---

## 10. Ce qu'on reprend / ce qu'on adapte / ce qu'on écarte

### Ce qu'on reprend tel quel

- **Outillage** : `oxlint` avec `typeAware` + `typeCheck` (pas de `tsc` séparé), plugins `typescript/react/jsx-a11y/import/unicorn`, catégories `correctness`+`suspicious`, liste unicorn, overrides TS/`*.gen.ts`, **jsPlugins `@tanstack/eslint-plugin-query` et `@tanstack/eslint-plugin-router`** ; `oxfmt` (printWidth 80, exclusion `routeTree.gen.ts`) ; `tsconfig` `@tsconfig/vite-react` + `@tsconfig/strictest` (moins `exactOptionalPropertyTypes`) ; `paths` `@/*` + `resolve.tsconfigPaths` ; `viteReact({ compiler: true })` + `oxc-transform-react` ; `knip` (double passe) ; `.npmrc save-exact` ; `pnpm-workspace.yaml` (trustPolicy, strictDepBuilds, allowBuilds) ; `packageManager` épinglé ; scripts `lint`/`fix`/`check`.
- **CI** : actions épinglées par SHA, `persist-credentials: false`, permissions minimales, `concurrency`, `pnpm/setup` avec `runtime: node`, zizmor, dependabot groupé + `cooldown`.
- **Routes** : `createRootRouteWithContext<{ queryClient }>`, layouts sans chemin pour les gardes, `beforeLoad` qui lit `store.getState()` et enrichit le contexte, `validateSearch` valibot, `loaderDeps` + `ensureQueryData` + `useSuspenseQuery`, `pendingComponent` = squelette avec le vrai titre, `notFoundComponent` sur les `$params`, `errorComponent` unique à la racine, `defaultPreload: "intent"`, `defaultPreloadStaleTime: 0`, état dans l'URL avec `navigate({ replace: true, search: (prev) => … })`.
- **API** : fabriques `xxxQuery = (...) => queryOptions({...})`, clés hiérarchiques préfixées, secret lu dans la `queryFn` et jamais dans la clé, `v.parse` de chaque réponse, `fetch` enveloppé avec erreurs typées + `cause`, `invalidateQueries` par préfixe après mutation, `refetchInterval` (fonction si besoin).
- **Utils** : `addTimeout`, `assertNever`, fonctions `asserts`, accès double hook / fonction-pour-loader.
- **Tests** : Playwright sur le build + `@msw/playwright` strict + fixture `network` auto + jeux de handlers + `network.use()` + axe avec liste explicite + horloge/fuseau/locale épinglés + crochet de connexion de test.

### Ce qu'on adapte

- **Store de session** : même forme `create<T>()(…)`, mais **sans `persist`** (mot de passe en mémoire) et **avec `subscribeWithSelector`** ; effets (purge, invalidation, diffusion) câblés dans `src/background/` plutôt que dans le store (évite la dépendance circulaire store ↔ routeur).
- **Persistance Query** : persister par requête **seulement sur l'état public**, `localStorage`, `buster` = version, `maxAge` 7 j, `refetchOnRestore: "always"`.
- **Gestion d'erreur globale** : `QueryCache`/`MutationCache` `onError` → `PasswordRejectedError` ⇒ `logout("password-changed")` (Element gère les erreurs au cas par cas).
- **`src/background/`** : à créer (tâches hors composants) — Element n'en a pas.
- **Prerender** : Start SPA au lieu du plugin maison ; reprendre l'idée d'une coquille sans dépendances.
- **validateSearch** : ajouter `v.fallback` (site public tolérant).
- **Formulaires** : TanStack Form + Base UI `Field` à la place de compound `Form` ; garder l'erreur serveur dans le champ et `role="alert"` dans les dialogues.
- **Toasts / dialogues** : Base UI `Toast` / `Dialog` / `AlertDialog`.
- **CSS** : CSS Modules + `design-system.css` + stylelint strict-value au lieu de Tailwind.
- **Dates** : `PlainDate`-like maison ou Temporal natif avec polyfill à la demande.
- **Tests** : mocker aussi les écritures (état mutable par test), `Europe/Paris`/`fr-FR`.

### Ce qu'on écarte

Tailwind, compound-web/compound-design-tokens, Radix, vaul, floating-ui, react-hot-toast, react-intl/formatjs/Localazy/`eslint-plugin-formatjs`, `@hey-api/openapi-ts`, react-table/react-virtual, `use-broadcast-ts` (un `BroadcastChannel` natif de 5 lignes suffit pour « logout »), `idb-keyval` (localStorage suffit), `verkit`, `woothee`, polyfill Temporal en dépendance statique, le plugin prerender maison, Docker/nginx, REUSE/SPDX, screenshots multi-appareils (option : un seul projet de captures si utile).

---

## 11. Configs prêtes à copier adaptées à notre projet

> Hypothèses : dépôt `reservations-restaurants`, code dans `src/`, routes TanStack Start dans `src/routes/`, pas d'i18n. Versions : reprendre celles d'Element (testées ensemble) ou les « latest » listées en tête.

### 11.1 `.oxlintrc.json`

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "react", "jsx-a11y", "import", "unicorn"],
  "options": {
    "typeAware": true,
    "typeCheck": true
  },
  "categories": {
    "correctness": "error",
    "suspicious": "error"
  },
  "env": {
    "builtin": true,
    "browser": true,
    "es2026": true
  },
  "rules": {
    "import/no-named-as-default": "warn",
    "import/no-named-as-default-member": "warn",
    "import/no-duplicates": "warn",
    "react/exhaustive-deps": "warn",
    "react/react-in-jsx-scope": "off",
    "react/rules-of-hooks": "error",
    "react/display-name": "error",
    "react/jsx-no-target-blank": "error",
    "react/no-unescaped-entities": "off",
    "react/no-unknown-property": "error",
    "no-shadow": "off",
    "no-array-constructor": "error",
    "no-case-declarations": "error",
    "no-empty": "error",
    "no-empty-function": "error",
    "no-fallthrough": "error",
    "no-negated-condition": "error",
    "no-prototype-builtins": "error",
    "no-regex-spaces": "error",

    "typescript/no-floating-promises": ["error", { "ignoreVoid": true }],
    "typescript/no-unsafe-type-assertion": "off",
    "typescript/no-misused-spread": "off",
    "typescript/adjacent-overload-signatures": "error",
    "typescript/array-type": "error",
    "typescript/ban-ts-comment": ["error", { "minimumDescriptionLength": 10 }],
    "typescript/consistent-generic-constructors": "error",
    "typescript/consistent-indexed-object-style": "error",
    "typescript/consistent-type-assertions": "error",
    "typescript/consistent-type-definitions": "error",
    "typescript/no-dynamic-delete": "error",
    "typescript/no-empty-object-type": "error",
    "typescript/no-explicit-any": "error",
    "typescript/no-inferrable-types": "error",
    "typescript/no-invalid-void-type": "error",
    "typescript/no-namespace": "error",
    "typescript/no-non-null-asserted-nullish-coalescing": "error",
    "typescript/no-non-null-assertion": "error",
    "typescript/no-require-imports": "error",
    "typescript/no-unsafe-function-type": "error",
    "typescript/prefer-for-of": "error",
    "typescript/prefer-function-type": "error",
    "typescript/unified-signatures": "error",

    "unicorn/catch-error-name": "error",
    "unicorn/consistent-existence-index-check": "error",
    "unicorn/error-message": "error",
    "unicorn/explicit-length-check": "error",
    "unicorn/filename-case": "error",
    "unicorn/new-for-builtins": "error",
    "unicorn/no-abusive-eslint-disable": "error",
    "unicorn/no-anonymous-default-export": "error",
    "unicorn/no-array-callback-reference": "error",
    "unicorn/no-array-for-each": "error",
    "unicorn/no-array-method-this-argument": "error",
    "unicorn/no-array-reduce": "error",
    "unicorn/no-await-expression-member": "error",
    "unicorn/no-document-cookie": "error",
    "unicorn/no-lonely-if": "error",
    "unicorn/no-negation-in-equality-check": "error",
    "unicorn/no-object-as-default-parameter": "error",
    "unicorn/no-static-only-class": "error",
    "unicorn/no-this-assignment": "error",
    "unicorn/no-typeof-undefined": "error",
    "unicorn/no-unreadable-array-destructuring": "error",
    "unicorn/no-unreadable-iife": "error",
    "unicorn/no-useless-promise-resolve-reject": "error",
    "unicorn/no-useless-switch-case": "error",
    "unicorn/no-useless-undefined": "error",
    "unicorn/no-zero-fractions": "error",
    "unicorn/numeric-separators-style": "error",
    "unicorn/prefer-array-find": "error",
    "unicorn/prefer-array-flat-map": "error",
    "unicorn/prefer-array-some": "error",
    "unicorn/prefer-at": "error",
    "unicorn/prefer-date-now": "error",
    "unicorn/prefer-default-parameters": "error",
    "unicorn/prefer-dom-node-append": "error",
    "unicorn/prefer-dom-node-remove": "error",
    "unicorn/prefer-dom-node-text-content": "error",
    "unicorn/prefer-global-this": "error",
    "unicorn/prefer-includes": "error",
    "unicorn/prefer-keyboard-event-key": "error",
    "unicorn/prefer-logical-operator-over-ternary": "error",
    "unicorn/prefer-math-min-max": "error",
    "unicorn/prefer-modern-dom-apis": "error",
    "unicorn/prefer-module": "error",
    "unicorn/prefer-native-coercion-functions": "error",
    "unicorn/prefer-negative-index": "error",
    "unicorn/prefer-node-protocol": "error",
    "unicorn/prefer-number-properties": "error",
    "unicorn/prefer-object-from-entries": "error",
    "unicorn/prefer-optional-catch-binding": "error",
    "unicorn/prefer-query-selector": "error",
    "unicorn/prefer-regexp-test": "error",
    "unicorn/prefer-response-static-json": "error",
    "unicorn/prefer-set-has": "error",
    "unicorn/prefer-spread": "error",
    "unicorn/prefer-string-replace-all": "error",
    "unicorn/prefer-string-slice": "error",
    "unicorn/prefer-string-trim-start-end": "error",
    "unicorn/prefer-structured-clone": "error",
    "unicorn/prefer-ternary": "error",
    "unicorn/prefer-top-level-await": "error",
    "unicorn/prefer-type-error": "error",
    "unicorn/require-array-join-separator": "error",
    "unicorn/require-number-to-fixed-digits-argument": "error",
    "unicorn/switch-case-braces": "error",
    "unicorn/text-encoding-identifier-case": "error",
    "unicorn/throw-new-error": "error",

    "@tanstack/router/create-route-property-order": "warn",
    "@tanstack/router/route-param-names": "error",
    "@tanstack/query/exhaustive-deps": "error",
    "@tanstack/query/no-rest-destructuring": "warn",
    "@tanstack/query/stable-query-client": "error",
    "@tanstack/query/no-unstable-deps": "error",
    "@tanstack/query/no-void-query-fn": "error",
    "@tanstack/query/mutation-property-order": "error"
  },
  "jsPlugins": ["@tanstack/eslint-plugin-router", "@tanstack/eslint-plugin-query"],
  "ignorePatterns": ["dist/**", "node_modules/**", ".tanstack/**", ".output/**", "src/routeTree.gen.ts"],
  "overrides": [
    {
      "files": ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
      "rules": {
        "constructor-super": "off",
        "no-class-assign": "off",
        "no-const-assign": "off",
        "no-dupe-class-members": "off",
        "no-dupe-keys": "off",
        "no-func-assign": "off",
        "no-import-assign": "off",
        "no-new-native-nonconstructor": "off",
        "no-obj-calls": "off",
        "no-redeclare": "off",
        "no-setter-return": "off",
        "no-this-before-super": "off",
        "no-unsafe-negation": "off",
        "no-var": "error",
        "no-with": "off",
        "prefer-const": "error",
        "prefer-rest-params": "error",
        "prefer-spread": "error"
      }
    },
    {
      "files": ["**/*.{ts,tsx}"],
      "rules": {
        "unicorn/filename-case": ["error", { "cases": { "kebabCase": true } }],
        "unicorn/no-null": "off",
        "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
        "@typescript-eslint/no-import-type-side-effects": "error",
        "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
        "react/only-export-components": "off"
      }
    },
    {
      "files": ["tests/**/*.ts", "playwright.config.ts", "vite.config.ts"],
      "rules": {
        "unicorn/prefer-top-level-await": "off"
      }
    }
  ]
}
```

Différences volontaires avec Element : pas de formatjs ; `no-floating-promises` **activée** (avec `ignoreVoid` : écrire `void queryClient.prefetchQuery(...)`) ; `routeTree.gen.ts` directement ignoré ; `react/no-unescaped-entities` coupée (apostrophes françaises dans le JSX). DevDependencies : `oxlint`, `oxlint-tsgolint`, `@tanstack/eslint-plugin-query`, `@tanstack/eslint-plugin-router` (+ autoriser `eslint: "10"` en peer dans `pnpm-workspace.yaml` comme Element).

### 11.2 `.oxfmtrc.json`

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 80,
  "sortPackageJson": false,
  "sortImports": true,
  "ignorePatterns": ["pnpm-lock.yaml", "src/routeTree.gen.ts", "public/**", "Code.gs", "charte-graphique.pdf"]
}
```

(`sortImports` facultatif — Element ne l'active pas. `Code.gs` reste hors formatage pour ne pas créer de diff sur le backend « inchangé ».)

### 11.3 `tsconfig.json`

```json
{
  "include": ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts", "*.config.ts"],
  "extends": [
    "@tsconfig/vite-react/tsconfig.json",
    "@tsconfig/strictest/tsconfig.json"
  ],
  "compilerOptions": {
    "lib": ["ES2024", "ESNext.Intl", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "paths": {
      "@/*": ["./src/*"]
    },
    "exactOptionalPropertyTypes": false
  }
}
```

DevDependencies : `typescript@7.0.2`, `@tsconfig/strictest`, `@tsconfig/vite-react`, `@types/react`, `@types/react-dom`. Côté `vite.config.ts` : `resolve: { tsconfigPaths: true }`.

`.npmrc` : `save-exact=true`. `pnpm-workspace.yaml` :

```yaml
trustPolicy: no-downgrade
strictDepBuilds: true
allowBuilds:
  esbuild: false
  msw: false
strictPeerDependencies: true
peerDependencyRules:
  allowedVersions:
    eslint: "10"
    vite: "8"
    typescript: "7"
```

Scripts :

```json
"scripts": {
  "dev": "vite --port 3000",
  "build": "vite build",
  "serve": "vite preview",
  "lint": "oxlint && stylelint 'src/**/*.css' && oxfmt --check",
  "fix": "oxlint --fix && stylelint --fix 'src/**/*.css' && oxfmt",
  "knip": "knip && knip --production",
  "check": "pnpm lint && pnpm knip",
  "test": "playwright test"
},
"knip": {
  "entry": ["tests/**/*.spec.ts"],
  "project": ["src/**/*!", "tests/**/*"],
  "ignore": ["src/routeTree.gen.ts"]
}
```

### 11.4 Store Zustand de session — `src/stores/session.ts`

```ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type LogoutReason =
  | "manual"
  | "inactivity"
  | "password-changed"
  | "other-tab";

interface SessionState {
  /**
   * Mot de passe du mode collègue. En mémoire uniquement : jamais persisté
   * (ni localStorage, ni sessionStorage), jamais placé dans une clé de requête.
   */
  password: string | null;
  /** Raison de la dernière déconnexion, pour afficher le bon message. */
  lastLogoutReason: LogoutReason | null;
}

interface SessionActions {
  login: (password: string) => void;
  logout: (reason: LogoutReason) => void;
  acknowledgeLogout: () => void;
}

type SessionStore = SessionState & SessionActions;

export const useSessionStore = create<SessionStore>()(
  subscribeWithSelector((set, get) => ({
    password: null,
    lastLogoutReason: null,

    login(password) {
      set({ password, lastLogoutReason: null });
    },

    logout(reason) {
      if (get().password === null) return; // déjà déconnecté : rien à faire
      set({ password: null, lastLogoutReason: reason });
    },

    acknowledgeLogout() {
      set({ lastLogoutReason: null });
    },
  })),
);

/** Accès hors React (queryFn, mutationFn, beforeLoad) — comme `accessToken()` chez Element. */
export const getPassword = (): string | null =>
  useSessionStore.getState().password;

export const isColleague = (): boolean => getPassword() !== null;
```

Branchements associés :

```ts
// src/api/errors.ts
export class AppsScriptError extends Error {
  override name = "AppsScriptError";
}
/** Le script refuse le mot de passe : changé côté serveur pendant la session. */
export class PasswordRejectedError extends AppsScriptError {
  override name = "PasswordRejectedError";
}

// src/api/client.ts (extrait) — le mot de passe est lu ici, jamais passé par les composants
export async function postAction<T>(
  action: string,
  payload: Record<string, unknown>,
  schema: v.GenericSchema<unknown, T>,
  { withPassword = false, signal }: { withPassword?: boolean; signal?: AbortSignal } = {},
): Promise<T> {
  const password = withPassword ? getPassword() : undefined;
  if (withPassword && password === null) throw new PasswordRejectedError("Session collègue fermée.");
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload, ...(password ? { password } : {}) }),
    signal,
  });
  const data: unknown = await response.json();
  if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string") {
    if (data.error === "Mot de passe incorrect.") throw new PasswordRejectedError(data.error);
    throw new AppsScriptError(data.error);
  }
  return v.parse(schema, data);
}

// src/query.ts — détection globale « mot de passe changé »
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { AppsScriptError, PasswordRejectedError } from "@/api/errors";
import { useSessionStore } from "@/stores/session";

const onGlobalError = (error: unknown): void => {
  if (error instanceof PasswordRejectedError) {
    useSessionStore.getState().logout("password-changed");
  }
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onGlobalError }),
  mutationCache: new MutationCache({ onError: onGlobalError }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // une seconde tentative 1,5 s après une erreur passagère de Google, jamais pour une erreur du script
      retry: (failureCount, error) => !(error instanceof AppsScriptError) && failureCount < 1,
      retryDelay: 1500,
    },
    mutations: { retry: false }, // une écriture n'est jamais rejouée automatiquement
  },
});

// src/routes/_collegue.tsx — garde
export const Route = createFileRoute("/_collegue")({
  beforeLoad: ({ location }) => {
    if (!useSessionStore.getState().password) {
      throw redirect({ to: "/collegue/connexion", search: { redirect: location.href } });
    }
    return { colleague: true as const };
  },
  component: CollegueLayout,
});
```

### 11.5 Module background — `src/background/`

```ts
// src/background/index.ts
import type { QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";

import { startCutoffClock } from "./clock";
import { startSessionGuard } from "./session-guard";

export interface BackgroundDeps {
  queryClient: QueryClient;
  router: AnyRouter;
}

let stopCurrent: (() => void) | undefined;

/** Démarre les tâches hors composants. Idempotent (HMR, double appel). */
export function startBackgroundTasks(deps: BackgroundDeps): () => void {
  stopCurrent?.();
  const stops = [startSessionGuard(deps), startCutoffClock(deps)];
  stopCurrent = () => {
    for (const stop of stops) stop();
    stopCurrent = undefined;
  };
  import.meta.hot?.dispose(() => stopCurrent?.());
  return stopCurrent;
}
```

```ts
// src/background/session-guard.ts
import { useSessionStore } from "@/stores/session";

import type { BackgroundDeps } from "./index";

const INACTIVITY_MS = 10 * 60 * 1000;
const ACTIVITY_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "touchstart",
  "wheel",
] as const;
const CHANNEL_NAME = "reservations-collegue";

/**
 * - Déconnexion après 10 min d'inactivité : les événements ne font que noter
 *   l'heure ; un seul minuteur vérifie à l'échéance et se réarme pour le
 *   temps restant (même algorithme que js/collegue.js).
 * - À la déconnexion (quelle qu'en soit la cause) : purge des données
 *   personnelles du cache, réévaluation des gardes de route, et diffusion
 *   aux autres onglets.
 */
export function startSessionGuard({ queryClient, router }: BackgroundDeps): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  let lastActivity = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const store = useSessionStore;

  const check = (): void => {
    clearTimeout(timer);
    if (store.getState().password === null) return;
    const remaining = INACTIVITY_MS - (Date.now() - lastActivity);
    if (remaining <= 0) {
      store.getState().logout("inactivity");
      return;
    }
    timer = setTimeout(check, remaining);
  };

  const onActivity = (): void => {
    lastActivity = Date.now();
  };
  for (const type of ACTIVITY_EVENTS) {
    document.addEventListener(type, onActivity, { passive: true, signal });
  }

  // Les minuteurs sont bridés dans un onglet caché : on revérifie au retour.
  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) check();
    },
    { signal },
  );

  channel.addEventListener(
    "message",
    (event: MessageEvent<unknown>) => {
      if (event.data === "logout") store.getState().logout("other-tab");
    },
    { signal },
  );

  const unsubscribe = store.subscribe(
    (state) => state.password !== null,
    (connected) => {
      if (connected) {
        lastActivity = Date.now();
        check();
        return;
      }
      clearTimeout(timer);
      // Données personnelles : toutes sous le préfixe ["collegue", …]
      queryClient.removeQueries({ queryKey: ["collegue"] });
      void router.invalidate(); // les gardes beforeLoad renvoient vers la page publique
      if (store.getState().lastLogoutReason !== "other-tab") {
        channel.postMessage("logout");
      }
    },
  );

  return () => {
    controller.abort();
    unsubscribe();
    clearTimeout(timer);
    channel.close();
  };
}
```

```ts
// src/background/clock.ts — bascule « commandes closes » d'Aristide à 10 h (remplace scheduleR2Cutoff)
import { create } from "zustand";

import { R2_CUTOFF_HOUR } from "@/constants";

import type { BackgroundDeps } from "./index";

/** Heure de référence lue par les composants qui dépendent de l'heure de fermeture. */
export const useClockStore = create<{ now: number }>()(() => ({ now: Date.now() }));

export function startCutoffClock({ router }: BackgroundDeps): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = (): void => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(R2_CUTOFF_HOUR, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    timer = setTimeout(() => {
      useClockStore.setState({ now: Date.now() });
      void router.invalidate(); // relance les loaders qui calculent l'ouverture des commandes
      schedule();
    }, next.getTime() - now.getTime());
  };

  schedule();
  return () => clearTimeout(timer);
}
```

Actualisation toutes les 3 min et lecture doublée : **dans la couche API**, pas dans le background :

```ts
// src/api/state.ts
import { queryOptions } from "@tanstack/react-query";
import { experimental_createQueryPersister } from "@tanstack/query-persist-client-core";
import * as v from "valibot";

import { addTimeout } from "@/utils/signal";

const HEDGE_MS = 6000;

/**
 * Lecture doublée (même sémantique que hedgedRead de js/donnees.js) : si rien
 * après 6 s, une seconde lecture part ; la première réponse gagne, l'autre est
 * annulée ; l'erreur n'est rendue que lorsque toutes les lectures lancées ont
 * échoué (donc tout de suite si la première échoue avant 6 s).
 */
async function hedgedGet(url: string, signal: AbortSignal): Promise<unknown> {
  const done = new AbortController();
  const both = AbortSignal.any([signal, done.signal]);
  const read = async (): Promise<unknown> => {
    const response = await fetch(url, { signal: both });
    const json: unknown = await response.json();
    return json;
  };
  try {
    return await new Promise<unknown>((resolve, reject) => {
      let pending = 1;
      const settle = (attempt: Promise<unknown>): void => {
        attempt.then(resolve, (error: unknown) => {
          pending -= 1;
          if (pending === 0) reject(error);
        });
      };
      settle(read());
      const id = setTimeout(() => {
        pending += 1;
        settle(read());
      }, HEDGE_MS);
      both.addEventListener("abort", () => clearTimeout(id), { once: true });
    });
  } finally {
    done.abort(); // annule la lecture perdante et le minuteur
  }
}

const publicPersister = experimental_createQueryPersister({
  // undefined pendant le pré-rendu de la coquille Start (Node) : le persister ne fait alors rien
  storage: typeof window === "undefined" ? undefined : window.localStorage,
  buster: import.meta.env.VITE_APP_VERSION ?? "",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  refetchOnRestore: "always", // copie locale affichée tout de suite, puis relecture
});

export const publicStateQuery = () =>
  queryOptions({
    queryKey: ["etat", "public"],
    queryFn: async ({ client, signal, queryKey }) => {
      const previous = client.getQueryData<PublicState>(queryKey);
      const url = stateUrl(previous?.etag);
      const data = v.parse(PublicStateOrUnchanged, await hedgedGet(url, addTimeout(signal, 30_000)));
      return "unchanged" in data && previous ? previous : (data as PublicState); // même référence → aucun re-rendu
    },
    persister: publicPersister.persisterFn,
    refetchInterval: 3 * 60 * 1000, // pas en arrière-plan (défaut), rattrapé au retour sur l'onglet
  });

export const collegueStateQuery = () =>
  queryOptions({
    queryKey: ["collegue", "etat"], // ← pas de mot de passe dans la clé ; jamais persisté
    queryFn: ({ signal }) => postAction("getAdminState", {}, AdminState, { withPassword: true, signal }),
    refetchInterval: 3 * 60 * 1000,
  });
```

(`PublicState`, `PublicStateOrUnchanged`, `AdminState`, `stateUrl`, `postAction` : schémas valibot et helpers de `src/api/`. La lecture « anticipée dans le `<head>` » de l'appli actuelle devient inutile : la coquille Start charge le JS au plus tôt et la copie locale s'affiche immédiatement.)

Démarrage : dans l'entrée client (avec Start, `src/client.tsx` personnalisé, ou en fin de `getRouter()` protégé par `typeof window !== "undefined"`) :

```ts
if (typeof window !== "undefined") startBackgroundTasks({ queryClient, router });
```

Attention : le pré-rendu de la coquille Start SPA exécute la racine **dans Node** au build. Tout ce qui touche `window`, `document`, `localStorage`, `BroadcastChannel` doit donc rester côté client (garde `typeof window`, ou entrée client). Les stores Zustand sans `persist` ne posent pas de problème.

### 11.6 Recherche dans l'URL (accueil public) — `src/routes/index.tsx`

```ts
import { createFileRoute } from "@tanstack/react-router";
import * as v from "valibot";

const AccueilSearch = v.object({
  resto: v.fallback(v.optional(v.picklist(["r1", "r2"]), "r1"), "r1"),
  mois: v.fallback(v.optional(v.pipe(v.string(), v.regex(/^\d{4}-(0[1-9]|1[0-2])$/))), undefined),
  jour: v.fallback(v.optional(v.pipe(v.string(), v.isoDate())), undefined),
});

export const Route = createFileRoute("/")({
  validateSearch: AccueilSearch,
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(publicStateQuery()),
  pendingComponent: CalendrierSquelette,
  component: Accueil,
});

// Changer de mois sans polluer l'historique :
// navigate({ to: ".", replace: true, search: (prev) => ({ ...prev, mois: "2026-11", jour: undefined }) });
```

### 11.7 Workflow CI + GitHub Pages — `.github/workflows/check-deploy.yaml`

```yaml
name: Check & deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

permissions: {}

jobs:
  check:
    runs-on: ubuntu-24.04
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: pnpm/setup@703c52620218391530e48b9e8870d5c0082e1b9b # v2.1.0
        with:
          runtime: node
      - run: pnpm lint
      - run: pnpm knip
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm build
      - run: pnpm test
      - uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
      - uses: actions/upload-pages-artifact@<SHA> # épingler la version courante
        if: ${{ github.ref == 'refs/heads/main' }}
        with:
          path: dist/client # dossier de sortie client de Start, à vérifier

  deploy:
    if: ${{ github.ref == 'refs/heads/main' }}
    needs: check
    runs-on: ubuntu-24.04
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@<SHA> # épingler la version courante
```

(SHA de `checkout`, `pnpm/setup` et `upload-artifact` repris d'Element ; ceux des actions Pages à épingler au moment de l'écriture. Ajouter `zizmor.yaml` et `dependabot.yml` avec `cooldown: default-days: 7` et groupes `tanstack-*`, `vite`, `react`, `types` comme Element.)
