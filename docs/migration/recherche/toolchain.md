# Chaîne qualité React 19 + TS 7 + Vite 8 + TanStack Start (SPA) — oxlint type-aware, oxfmt, tsgo

> Recherche + prototype vérifiés le **3 octobre 2026**. Tout ce qui est marqué « TESTÉ » a été exécuté dans un projet d'essai
> (`toolchain/proj/` (projet d’essai ou clone, non versionné), Node 22.22.0, npm 10.9.4 ; installation aussi rejouée avec pnpm 12.8.1).
> Sources : registre npm, dépôt de doc `oxc-project/oxc-project.github.io` (cloné), dépôt `oxc-project/oxc` (sparse),
> `oxc-project/tsgolint` (README), `microsoft/typescript-go` (README, CHANGES.md), `TanStack/router` (docs + exemples),
> `oxc-project/oxc-vscode` (README), et le projet de production `element-hq/element-admin` (lecture seule).
> Fichiers prêts à copier : **`toolchain-files/` (versionné à côté de ce rapport)** (tous les fichiers de config de ce rapport).

## TL;DR

- **TypeScript 7.0.2 est STABLE** (publié le 8 juillet 2026) et s'installe via `typescript` ; la commande est `tsc` (binaire Go).
  `@typescript/native-preview` / `tsgo` est **obsolète** (dernier build 2026-07-07). Pas d'API JS stable avant 7.1.
- **oxlint 1.86.0 + oxlint-tsgolint 7.0.2003** : type-aware **stable** (59/61 règles typescript-eslint), activable dans
  `.oxlintrc.json` (`options.typeAware`, `options.typeCheck`). `typeCheck` remonte aussi les erreurs du compilateur TS 7.
- **Les règles React Compiler (≡ eslint-plugin-react-hooks v7) sont natives** dans oxlint (`react/set-state-in-effect`,
  `react/purity`, `react/refs`, `react/immutability`, `react/static-components`…), en catégorie `correctness`.
- **jsPlugins (alpha) fonctionnent** : `@tanstack/eslint-plugin-query` et `@tanstack/eslint-plugin-router` testés OK
  (sauf règles qui exigent les types : no-op silencieux).
- **oxfmt 0.71.0** : compatible Prettier 3.8, formate nativement TS/JS/JSON/CSS/YAML/TOML, MD/HTML via Prettier embarqué,
  tri des imports et de package.json intégrés.
- **React Compiler** : `@vitejs/plugin-react` 6.1 `react({ compiler: true })` + `oxc-transform-react` (Rust) — TESTÉ (sortie mémoïsée).
- Temps sur le projet d'essai (14 fichiers) : `oxlint` (type-aware + type-check, 560 règles) ≈ 1,0–1,4 s ; `tsc` ≈ 0,7 s ;
  `oxfmt --check` ≈ 0,1–0,4 s ; `vite build` + prerender du shell < 1 s.

---

## 1. Versions vérifiées et statut des outils

Commande : `npm view <pkg> version` (et `dist-tags`, `time`) le 2026-10-03.

| Paquet | Version | Remarque |
|---|---|---|
| `oxlint` | **1.86.0** (2026-09-28) | sortie hebdomadaire ; peer `oxlint-tsgolint >=7.0.2003` |
| `oxlint-tsgolint` | **7.0.2003** (2026-09-24) | schéma `7.0.2` = version TS, `003` = patch tsgolint |
| `oxfmt` | **0.71.0** (2026-09-28) | toujours 0.x (beta depuis 2026-02) |
| `typescript` | **7.0.2** (`latest`) | `next` = 7.1.0-dev ; `rc` = 7.0.1-rc ; TS 6 : 6.0.3 |
| `@typescript/typescript6` | 6.0.2 | API JS de TS 6 + commande `tsc6` (pour outils qui en ont besoin) |
| `@typescript/native-preview` | 7.0.0-dev.20260707.2 | **gelé**, remplacé par `typescript@7` |
| `vite` | **8.3.2** | Rolldown intégré ; Node `^20.19 \|\| >=22.12` |
| `@vitejs/plugin-react` | **6.1.1** | option `compiler` (React Compiler Rust) |
| `@vitejs/plugin-react-oxc` | 0.4.3 | **déprécié** (« use @vitejs/plugin-react ») |
| `rolldown-vite` | 7.3.1 | **déprécié** (Vite 8 l'intègre) |
| `oxc-transform-react` | 0.145.0 | peer optionnelle de plugin-react pour `compiler: true` |
| `babel-plugin-react-compiler` | 1.0.0 | alternative Babel (via `@rolldown/plugin-babel`) |
| `eslint-plugin-react-hooks` | 7.1.1 | inutile avec oxlint (règles natives) |
| `vite-plugin-oxlint` | 2.2.0 | existe ; non recommandé (éditeur + CI suffisent) |
| `@tanstack/react-start` | 1.168.60 | `@tanstack/react-router` 1.170.41 |
| `@tanstack/eslint-plugin-query` | 5.104.1 | peer eslint 8–10, typescript 5.6–7 |
| `@tanstack/eslint-plugin-router` | 1.162.0 | 2 règles |
| `react` / `react-dom` / `@types/react` | 19.3.0 | |
| `vitest` | **5.0.3** | (V4 = 4.1.11) |
| `@testing-library/react` | 16.3.3 | |
| `jsdom` | 30.1.1 (Node ≥ 22.22.2) | npm a résolu **29.1.1** sur Node 22.22.0 |
| `happy-dom` | 20.14.5 | |
| `knip` | 6.39.0 | fonctionne avec TS 7 (TESTÉ) |
| `lefthook` | 2.1.16 | `simple-git-hooks` 2.14.0, `lint-staged` 17.6.0 |
| `pnpm` | **12.8.1** (`latest`) | 11.28.2 / 10.34.6 maintenus ; local : 10.28.0 ; corepack 0.34.0 |

### Plugins JS « ESLint-compatibles » dans oxlint
- `jsPlugins` (alpha, hors semver) : API ESLint v9+ quasi complète (sélecteurs, scope, code path, fixes, suggestions, LSP).
  Non supporté : parseurs custom et **règles qui utilisent les types TS** (`parserServices`).
- Conformance testée par oxc : react-hooks, testing-library, playwright, regexp, sonarjs, @stylistic, storybook…
- **TESTÉ** : `@tanstack/eslint-plugin-query` (8 règles : `exhaustive-deps`, `stable-query-client`, `no-rest-destructuring`,
  `no-unstable-deps`, `infinite-query-property-order`, `no-void-query-fn`, `mutation-property-order`, **`prefer-query-options`**)
  et `@tanstack/eslint-plugin-router` (`create-route-property-order`, `route-param-names`) se chargent et rapportent.
  `no-void-query-fn` (type-aware) **ne signale rien** sous oxlint → retirée de la config. Une règle inexistante est une
  erreur de config (`Rule 'does-not-exist' not found in plugin '@tanstack/query'`) — bon garde-fou.
- `eslint` est installé automatiquement en peer (npm et pnpm `autoInstallPeers`), aucune config ESLint n'est nécessaire.

### TypeScript 7 : CI et éditeur
- **CI** : `tsc` (de `typescript@7`) avec `noEmit` → OK, 0,7 s sur le projet d'essai. `tsgo --noEmit` n'a plus lieu d'être.
- **Ce qui manque** : l'API JS (`import ts from "typescript"` ne renvoie plus que la version ; exports `./unstable/*`).
  Les outils qui consomment le compilateur comme bibliothèque (typescript-eslint, vue-tsc, Astro/Svelte check, certains
  générateurs `.d.ts`) attendent TS 7.1 ou utilisent `@typescript/typescript6`. TanStack, dans son exemple `start-basic`,
  fait cohabiter `"@typescript/native": "npm:typescript@^7.0.2"` et `"typescript": "npm:@typescript/typescript6@^6.0.2"`.
  **Pour notre pile (oxlint/tsgolint, Vite 8/Rolldown, Vitest, knip) aucune dépendance à l'API JS n'a posé problème.**
- **Éditeur** : extension VS Code « TypeScript 7 » (`TypeScriptTeam.native-preview`) +
  `"js/ts.experimental.useTsgo": true` et `"js/ts.tsdk.path": "node_modules/typescript"` (sans ce dernier, l'extension
  ne détecte que `@typescript/native-preview` et utilise sa copie embarquée). LSP « nearly all features implemented ».
- **Options retirées (TESTÉ avec tsc 7.0.2)** — erreurs TS5102/TS5108/TS5023 :
  `baseUrl`, `target: es5`, `moduleResolution: node|node10|classic`, `module: amd|umd|system`, `outFile`/`out`,
  `downlevelIteration`, `esModuleInterop: false`, `allowSyntheticDefaultImports: false`, `alwaysStrict: false`,
  `importsNotUsedAsValues`, `preserveValueImports`, `keyofStringsOnly`, `suppressImplicitAnyIndexErrors`,
  `noStrictGenericChecks`, `charset`. Acceptés : `experimentalDecorators`, `rewriteRelativeImportExtensions`,
  `erasableSyntaxOnly`, `libReplacement`, `module: commonjs`, `target: es2015+`.
- **Nouveaux défauts (TESTÉ)** : `strict` vaut `true` par défaut (TS7006 sans rien configurer) et `types` vaut `[]`
  (les `@types/*` ne sont plus inclus automatiquement → `"types": ["vite/client"]` indispensable).
  `tsc --init` génère : `module nodenext`, `target esnext`, `types []`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `strict`, `verbatimModuleSyntax`, `isolatedModules`, `noUncheckedSideEffectImports`,
  `moduleDetection force`, `skipLibCheck`, `jsx react-jsx`.
- Project references / build mode / incrémental / watch : « done » selon le README typescript-go ; décorateurs : flags acceptés.

---

## 2. oxlint type-aware

### Activation
```bash
pnpm add -D oxlint oxlint-tsgolint        # tsgolint = backend Go (typescript-go) des règles typescript/* typées
oxlint --type-aware                       # règles type-aware
oxlint --type-aware --type-check          # + diagnostics du compilateur TS (même programme TS, pas de double analyse)
```
ou, de préférence, dans la **config racine** (non autorisé dans les configs imbriquées) :
```jsonc
{ "options": { "typeAware": true, "typeCheck": true } }
```
Les flags CLI priment sur la config. tsgolint découvre automatiquement le `tsconfig.json` de chaque fichier
(`--tsconfig` pour forcer). Exige TS 7 : un tsconfig avec `baseUrl` etc. est rejeté (diagnostic avec `--type-check`).

### Règles portées (tsgolint README : 60/62 ciblées)
Manquent seulement `naming-convention` et `prefer-destructuring` (variante typée). Présentes notamment :
`no-floating-promises`, `no-misused-promises`, `await-thenable`, `no-unnecessary-condition`, `strict-boolean-expressions`,
`switch-exhaustiveness-check`, `prefer-nullish-coalescing`, `prefer-optional-chain`, `no-unsafe-argument|assignment|call|member-access|return`,
`no-unsafe-type-assertion`, `restrict-template-expressions`, `restrict-plus-operands`, `no-deprecated`, `only-throw-error`,
`return-await`, `require-await`, `strict-void-return`, `no-confusing-void-expression`, `unbound-method`, `consistent-type-exports`,
`dot-notation` (respecte `noPropertyAccessFromIndexSignature` — TESTÉ avec `process.env["BASE_PATH"]`), `prefer-readonly`…
Catégories oxlint : la plupart des « recommandées » typées sont en `correctness` (actives par défaut **dès que typeAware est on**),
les strictes en `pedantic`, et **`no-unnecessary-condition` / `prefer-optional-chain` sont en `nursery`** (à activer à la main).

### Preuve (TESTÉ) — extraits de plusieurs exécutions d'`oxlint` (format compact) sur les fichiers à violations volontaires
```
src/lib/api.ts:13:10: error typescript(no-unsafe-return): Unsafe return of a value of type `Promise<any>`.
src/lib/api.ts:17:11: error typescript(switch-exhaustiveness-check): Switch is not exhaustive. Cases not matched: "cancelled"
src/lib/api.ts:27:23: error typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) ...
src/lib/api.ts:27:16: error typescript(strict-boolean-expressions): Unexpected nullable string value in conditional.
src/lib/api.ts:31:10: error typescript(no-unnecessary-type-assertion): This assertion is unnecessary ...
src/components/Bad.tsx:15:5: error typescript(no-floating-promises): Promises must be awaited, add void operator to ignore.
src/components/Bad.tsx:43:31: error typescript(no-misused-promises): Promise-returning function provided to attribute where a void return was expected.
src/components/Bad.tsx:43:22: error typescript(strict-void-return): Async function used in a context where a void function is expected.
src/components/ReservationForm.tsx:19:34: error typescript(no-unsafe-type-assertion): Unsafe assertion from `any` detected.
src/components/ReservationForm.tsx:38:32: error typescript(no-deprecated): `FormEvent` is deprecated. ...
src/lib/deprec.ts:6:16: error typescript(no-deprecated): `ensureQueryData` is deprecated. Use queryClient.query({ ...options, staleTime: 'static' }) instead.
src/components/Hooks.tsx:18:9: error typescript(TS2322): Type 'string' is not assignable to type 'number'.   <- typeCheck
```
À noter : `@types/react` 19.3 **déprécie `FormEvent`** (utiliser `SubmitEvent`, `ChangeEvent`, `InputEvent`) ;
TanStack Query 5.102+ déprécie `ensureQueryData`/`prefetchQuery`/`fetchQuery` → `no-deprecated` les attrape (TESTÉ).

### Performances
`--debug timings` liste le coût par règle (source `native` / `type-aware`). Projet d'essai : ~1 s pour 14 fichiers
(dominé par le démarrage de tsgolint). Benchmarks oxc (juillet 2026) : 12–18× plus rapide qu'ESLint + typescript-eslint.
Piège : un tsconfig dont `include` ratisse trop large (ou **l'absence de `.gitignore`**, cf. Pièges) fait exploser temps/mémoire.

### Fichiers générés (`routeTree.gen.ts`)
- TESTÉ : avec `ignorePatterns: ["**/*.gen.ts"]`, oxlint ne rapporte **ni** lint **ni** erreurs `typeCheck` sur ces fichiers,
  mais ils restent dans le programme TS (types disponibles pour le reste).
- TESTÉ : un fichier **hors `include`** du tsconfig est quand même type-checké par `oxlint --type-check` (programme inféré),
  alors que `tsc -p` l'ignore. Inversement `tsc` vérifie les `.gen.ts` qu'oxlint ignore.
  → garder **les deux** en CI (`oxlint` + `tsc`) coûte < 1 s et couvre les deux angles morts.
- `routeTree.gen.ts` est créé par `vite dev`/`vite build` (plugin Start). Sans lui, `tsc` et `oxlint --type-check` échouent
  (`Cannot find module './routeTree.gen'`) → **le committer** (il porte `/* eslint-disable */` et `// @ts-nocheck`).

### VS Code
L'extension `oxc.oxc-vscode` lance `oxlint --lsp` du projet et lit `options.typeAware` du `.oxlintrc.json`
(`oxc.typeAware` ne sert qu'à forcer). `oxlint-tsgolint` doit être installé localement.

---

## 3. `.oxlintrc.json` pédantique

### Sémantique des catégories (sortie de `oxlint --help`)
| Catégorie | Sens | Choix |
|---|---|---|
| `correctness` | code faux ou inutile (défaut) | `error` |
| `suspicious` | très probablement faux | `error` |
| `pedantic` | strict, faux positifs possibles — **contient `react/rules-of-hooks`** et la plupart des règles typées strictes | `error` |
| `perf` | performances | `error` |
| `style` | idiomes ; nombreuses règles contradictoires entre elles | `error` puis exclusions |
| `restriction` | interdictions de fonctionnalités | `off` puis activation à la carte |
| `nursery` | instable | `off` (+ 2 règles choisies) |

Faits vérifiés : 871 règles (`oxlint --rules -f json`) ; `plugins` **remplace** la liste par défaut
(`eslint`, `typescript`, `unicorn`, `oxc`) ; les `overrides` acceptent `files`, `excludeFiles`, `rules`, `env`, `globals`,
`plugins`, `jsPlugins` — **pas `categories`** ; `.oxlintrc.json` accepte les commentaires (JSONC) ; `oxlint.config.ts`
existe aussi (`defineConfig`, Node ≥ 22.18). Dans les diagnostics, les règles hooks s'affichent `react-hooks(...)` mais se
configurent sous la clé `react/rules-of-hooks` / `react/exhaustive-deps`.

### Règles React utiles (toutes natives)
- Hooks : `react/rules-of-hooks` (pedantic !), `react/exhaustive-deps` (correctness).
- React Compiler (correctness, ≡ react-hooks v7 `recommended`) : `error-boundaries`, `globals`, `immutability`,
  `incompatible-library`, `preserve-manual-memoization`, `purity`, `refs`, `set-state-in-effect`, `set-state-in-render`,
  `static-components`, `use-memo`, `void-use-memo` ; `no-deriving-state-in-effects` (perf) ; `unsupported-syntax`
  (restriction). Doublons « compiler » de hooks/deps (`react/hooks`, `react/exhaustive-effect-dependencies`,
  `react/memo-dependencies`, suspicious) : **désactivés** (TESTÉ : double signalement sinon).
- Composants imbriqués : pas de `react-x/no-nested-component-definitions`, mais `react/no-unstable-nested-components`
  (suspicious) + `react/static-components` (compiler).
- `react/jsx-no-useless-fragment` (pedantic), `react/no-array-index-key` (perf), `react/only-export-components`
  (react-refresh), `react/button-has-type`, `react/jsx-filename-extension`…
- **`prefer-read-only-props` n'existe pas** dans oxlint → `readonly` dans les interfaces de props par convention.
- **react-perf : non recommandé** avec le React Compiler (`jsx-no-new-function-as-prop` signale chaque `onClick={() => …}`).

### TypeScript (non typées)
`consistent-type-imports` (`separate-type-imports`), `no-explicit-any`, `array-type` (`array-simple`),
`consistent-type-definitions` (`interface`), `no-non-null-assertion`, `no-import-type-side-effects`…
`explicit-module-boundary-types` / `explicit-function-return-type` : **off** (inférence, composants qui renvoient du JSX).

### Unicorn : contre-productif en React/TS
`no-null` (React `return null`, DOM, JSON), `prefer-global-this` (illisible pour `window`), `filename-case` en kebab seul
(composants `PascalCase.tsx`, routes `__root.tsx`, `$id.tsx`), `no-useless-undefined` avec `checkArguments`
(`useState<T | undefined>(undefined)`), `number-literal-case` / `empty-brace-spaces` / `no-nested-ternary`
(conflits formateur, cf. eslint-config-prettier), `text-encoding-identifier-case` sans `withDash` (TESTÉ : signale
`charSet: "utf-8"` de TanStack). `prefer-ternary` gardé en `only-single-line`.

### Import et TanStack Router
`import/no-default-export` est compatible : les routes exportent `export const Route = createFileRoute(...)` (nommé) ;
seuls `vite.config.ts`/`vitest.config.ts` sont en override. `import/no-cycle` OK. `import/exports-last` **off**
(`Route` est en tête). `import/no-named-export` / `prefer-default-export` **off** (contradictoires).
`react/only-export-components` signale les fichiers de routes même avec `allowExportNames: ["Route"]` (TESTÉ :
« Fast refresh only works when a file only exports components ») → off pour `src/routes/**` (l'auto code-splitting de
TanStack isole le composant ; element-admin fait pareil).

### Conflits trouvés pendant les tests (corrigés dans la config)
| Symptôme (TESTÉ) | Correction |
|---|---|
| `eslint/no-duplicate-imports` contre `import type {…}` séparé | `allowSeparateTypeImports: true` |
| `jsx-a11y/anchor-is-valid` sur `<Link to>` si `settings["jsx-a11y"].components.Link = "a"` | ne pas mapper `Link` |
| `typescript/consistent-return` sur un `switch` exhaustif sans `return` final | off (couvert par `noImplicitReturns`) |
| `typescript/non-nullable-type-assertion-style` contredit `no-non-null-assertion` | off |
| `react/no-unescaped-entities` sur `L'accueil` | gardé : écrire l'apostrophe typographique `’` (correct en français) |
| `oxlint --fix` réécrit des imports en quotes simples | `lint:fix` = `oxlint --fix && oxfmt` |

### Config complète (TESTÉE)
Fichier : `files/.oxlintrc.json`

```jsonc
{
  // Oxlint 1.86 + oxlint-tsgolint 7.0.x (TypeScript 7). Commentaires autorisés (JSONC).
  "$schema": "./node_modules/oxlint/configuration_schema.json",

  // ---------------------------------------------------------------------------
  // Options globales (uniquement dans la config racine)
  // ---------------------------------------------------------------------------
  "options": {
    // Règles typescript/* "type-aware" via tsgolint (équivalent de --type-aware).
    "typeAware": true,
    // Diagnostics du compilateur TS 7 dans la même passe (équivalent de --type-check).
    // Expérimental : on garde AUSSI `tsc --noEmit` en CI (voir scripts).
    "typeCheck": true,
    // Toute directive `oxlint-disable` inutile est une erreur.
    "reportUnusedDisableDirectives": "error",
    // Un warning = échec (pas de "warnings qui s'accumulent").
    "denyWarnings": true
  },

  // ATTENTION : `plugins` REMPLACE la liste par défaut (eslint, typescript, unicorn, oxc).
  // react      = eslint-plugin-react + react-hooks (+ règles React Compiler natives) + react-refresh
  // react-perf : volontairement ABSENT (jsx-no-new-function-as-prop & co. sont du bruit avec le React Compiler)
  // vitest     : activé seulement dans l'override des tests
  "plugins": ["eslint", "typescript", "unicorn", "oxc", "react", "jsx-a11y", "import", "promise"],

  // Plugins ESLint chargés par l'API JS d'oxlint (alpha) : règles TanStack Query / Router
  "jsPlugins": ["@tanstack/eslint-plugin-query", "@tanstack/eslint-plugin-router"],

  "env": { "browser": true, "es2024": true },

  // ---------------------------------------------------------------------------
  // Catégories : on part de "tout en erreur" puis on retire ce qui est contre-productif
  // ---------------------------------------------------------------------------
  "categories": {
    "correctness": "error", // code faux ou inutile
    "suspicious": "error", // code très probablement faux
    "pedantic": "error", // strict, quelques faux positifs (rules-of-hooks est ICI !)
    "perf": "error",
    "style": "error", // idiomes : beaucoup de règles contradictoires -> désactivées plus bas
    "restriction": "off", // interdictions "à la carte" : activées une par une plus bas
    "nursery": "off" // instable : on n'active que des règles choisies
  },

  "settings": {
    "react": {
      "version": "19.3",
      "linkComponents": [{ "name": "Link", "linkAttribute": "to" }]
    },
    // NE PAS mapper TanStack <Link> sur "a" dans settings["jsx-a11y"].components :
    // anchor-is-valid exige alors `href` (faux positif, Link utilise `to`).
    "jsx-a11y": {}
  },

  "rules": {
    // ======================= React / hooks / React Compiler =======================
    "react/rules-of-hooks": "error", // déjà via pedantic, explicité car vital
    "react/exhaustive-deps": "error",
    // Règles "React Compiler" natives (≡ eslint-plugin-react-hooks v7) : correctness = déjà ON.
    // set-state-in-effect, set-state-in-render, purity, refs, immutability, static-components,
    // globals, use-memo, void-use-memo, preserve-manual-memoization, incompatible-library, error-boundaries
    "react/no-deriving-state-in-effects": "error", // perf (≡ "You might not need an effect")
    // Doublons "compiler" (suspicious) de rules-of-hooks / exhaustive-deps : on garde les classiques
    "react/hooks": "off",
    "react/exhaustive-effect-dependencies": "off",
    "react/memo-dependencies": "off",
    "react/unsupported-syntax": "error", // restriction : syntaxe qui empêche le compilateur
    "react/react-in-jsx-scope": "off", // obsolète avec le runtime JSX automatique
    "react/jsx-filename-extension": ["error", { "extensions": [".tsx"] }],
    "react/only-export-components": ["error", { "allowExportNames": ["Route"] }], // react-refresh + TanStack
    "react/function-component-definition": [
      "error",
      { "namedComponents": "function-declaration", "unnamedComponents": "arrow-function" }
    ],
    "react/button-has-type": "error",
    "react/no-danger": "error",
    "react/no-unknown-property": "error",
    "react/prefer-function-component": "error",
    "react/no-clone-element": "error",
    "react/no-react-children": "error",
    "react/jsx-max-depth": "off", // défaut (2) absurde
    "react/jsx-props-no-spreading": "off", // les wrappers de composants en ont besoin
    "react/jsx-handler-names": "off", // incompatible avec les handlers inline idiomatiques
    "react/no-multi-comp": "off",

    // ======================= TypeScript (non type-aware) ==========================
    "typescript/no-explicit-any": "error",
    "typescript/no-non-null-assertion": "error",
    "typescript/no-empty-object-type": "error",
    "typescript/no-import-type-side-effects": "error",
    "typescript/no-namespace": "error",
    "typescript/no-require-imports": "error",
    "typescript/no-dynamic-delete": "error",
    "typescript/no-invalid-void-type": "error",
    "typescript/no-non-null-asserted-nullish-coalescing": "error",
    "typescript/consistent-type-imports": ["error", { "fixStyle": "separate-type-imports" }],
    "typescript/consistent-type-definitions": ["error", "interface"],
    "typescript/array-type": ["error", { "default": "array-simple" }],
    "typescript/explicit-function-return-type": "off", // l'inférence suffit (composants, hooks)
    "typescript/explicit-module-boundary-types": "off",

    // ======================= TypeScript type-aware (tsgolint) =====================
    // correctness (déjà ON) : no-floating-promises, await-thenable, no-misused-spread,
    // restrict-template-expressions, unbound-method, no-base-to-string, require-array-sort-compare...
    // pedantic (déjà ON) : no-misused-promises, no-unsafe-*, strict-boolean-expressions,
    // switch-exhaustiveness-check, prefer-nullish-coalescing, no-deprecated, only-throw-error,
    // return-await, require-await, strict-void-return, no-confusing-void-expression...
    "typescript/switch-exhaustiveness-check": [
      "error",
      { "allowDefaultCaseForExhaustiveSwitch": false, "requireDefaultForNonUnion": true }
    ],
    // Explicite (déjà dans pedantic) : TanStack Query 5.102 a déprécié ensureQueryData/prefetchQuery/
    // fetchQuery au profit de queryClient.query() -> erreur garantie (testé)
    "typescript/no-deprecated": "error",
    "typescript/no-confusing-void-expression": ["error", { "ignoreArrowShorthand": true }], // onClick={() => setX(1)}
    "typescript/prefer-readonly-parameter-types": "off", // inutilisable avec ReactNode / events DOM
    "typescript/no-unnecessary-condition": "error", // nursery, activée explicitement
    "typescript/prefer-optional-chain": "error", // nursery, activée explicitement
    "typescript/use-unknown-in-catch-callback-variable": "error",
    "typescript/promise-function-async": "error",
    "typescript/non-nullable-type-assertion-style": "off", // contredit no-non-null-assertion
    // faux positif sur un switch exhaustif sans `return` final ; noImplicitReturns (tsc) couvre déjà
    "typescript/consistent-return": "off",

    // ======================= ESLint core ==========================================
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "no-alert": "error",
    "no-param-reassign": ["error", { "props": true }],
    "no-var": "error",
    "no-void": ["error", { "allowAsStatement": true }], // `void promise;` reste permis (ignoreVoid)
    "no-empty": "error",
    "no-empty-function": "error",
    "no-sequences": "error",
    "no-bitwise": "error",
    "no-restricted-globals": ["error", "event", "name", "length"],
    "eqeqeq": ["error", "always"],
    // compatible avec `import type { X }` séparé (consistent-type-specifier-style: prefer-top-level)
    "no-duplicate-imports": ["error", { "allowSeparateTypeImports": true }],
    "max-lines-per-function": [
      "error",
      { "max": 80, "skipBlankLines": true, "skipComments": true }
    ],
    "max-params": ["error", { "max": 4 }],
    "no-warning-comments": "warn",
    "no-inline-comments": "off",
    "func-style": "off",
    "func-names": "off",
    "capitalized-comments": "off",
    "id-length": "off",
    "init-declarations": "off",
    "max-statements": "off",
    "no-magic-numbers": "off",
    "no-ternary": "off", // les ternaires sont idiomatiques en JSX
    "no-continue": "off",
    "one-var": "off",
    "prefer-destructuring": "off",
    "prefer-named-capture-group": "off",
    "sort-imports": "off", // délégué à oxfmt (sortImports)
    "sort-keys": "off",
    "new-cap": "off", // faux positifs : createFileRoute("/")({...})
    // doublons eslint/unicorn ou eslint/typescript : on garde une seule version
    "no-negated-condition": "off", // -> unicorn/no-negated-condition
    "no-lonely-if": "off", // -> unicorn/no-lonely-if
    "require-await": "off", // -> typescript/require-await (type-aware)
    "prefer-promise-reject-errors": "off", // -> typescript/prefer-promise-reject-errors
    "no-nested-ternary": "error", // la variante unicorn est désactivée (conflit formateur)

    // ======================= Unicorn ==============================================
    "unicorn/no-null": "off", // React (return null), DOM et API JSON utilisent null
    "unicorn/filename-case": [
      "error",
      { "cases": { "kebabCase": true, "pascalCase": true, "camelCase": true } }
    ],
    "unicorn/prefer-ternary": ["error", "only-single-line"],
    "unicorn/no-useless-undefined": ["error", { "checkArguments": false }], // useState<T | undefined>(undefined)
    "unicorn/prefer-global-this": "off", // window.* est plus lisible en code navigateur
    "unicorn/number-literal-case": "off", // conflit formateur (cf. eslint-config-prettier)
    "unicorn/empty-brace-spaces": "off", // idem
    "unicorn/no-nested-ternary": "off", // idem
    "unicorn/no-array-for-each": "error",
    "unicorn/no-array-reduce": ["error", { "allowSimpleOperations": true }],
    "unicorn/no-document-cookie": "error",
    "unicorn/prefer-node-protocol": "error",
    "unicorn/prefer-number-properties": "error",
    "unicorn/prefer-modern-math-apis": "error",
    "unicorn/no-abusive-eslint-disable": "error",
    "unicorn/no-anonymous-default-export": "error",
    "unicorn/no-length-as-slice-end": "error",
    "unicorn/no-magic-array-flat-depth": "error",
    "unicorn/prefer-module": "error",
    "unicorn/text-encoding-identifier-case": ["error", { "withDash": true }], // "utf-8" (HTML, fetch)

    // ======================= Import ===============================================
    "import/no-cycle": "error",
    "import/no-default-export": "error", // TanStack Router : `export const Route` (nommé) -> OK
    "import/no-relative-parent-imports": "error", // force l'alias `#/` au lieu de ../../
    "import/no-commonjs": "error",
    "import/no-amd": "error",
    "import/no-dynamic-require": "error",
    "import/no-webpack-loader-syntax": "error",
    "import/no-nodejs-modules": "error", // code navigateur (désactivé pour les configs)
    "import/no-unassigned-import": ["error", { "allow": ["**/*.css"] }],
    "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
    "import/no-named-export": "off", // contradictoire avec no-default-export
    "import/prefer-default-export": "off", // idem
    "import/exports-last": "off", // `export const Route` est en tête de fichier
    "import/group-exports": "off",
    "import/no-namespace": "off",
    "import/max-dependencies": "off",

    // ======================= TanStack (jsPlugins) =================================
    "@tanstack/query/exhaustive-deps": "error",
    "@tanstack/query/no-rest-destructuring": "error",
    "@tanstack/query/stable-query-client": "error",
    "@tanstack/query/no-unstable-deps": "error",
    // pas de "no-void-query-fn" : règle type-aware, les jsPlugins n'ont pas accès aux types (no-op silencieux)
    "@tanstack/query/infinite-query-property-order": "error",
    "@tanstack/query/mutation-property-order": "error",
    "@tanstack/query/prefer-query-options": "error",
    "@tanstack/router/create-route-property-order": "error",
    "@tanstack/router/route-param-names": "error",

    // ======================= Promise / a11y / oxc =================================
    "promise/avoid-new": "off",
    "promise/prefer-await-to-callbacks": "off",
    "promise/spec-only": "error",
    "jsx-a11y/anchor-ambiguous-text": "error",
    "oxc/no-barrel-file": "error",
    "oxc/no-const-enum": "error",
    "oxc/bad-bitwise-operator": "error"
  },

  "overrides": [
    {
      // Routes TanStack (file-based routing) : noms imposés (__root.tsx, $id.tsx, posts.index.tsx)
      "files": ["src/routes/**"],
      "rules": {
        "unicorn/filename-case": "off",
        // Le fichier n'exporte que `Route` ; le code-splitting automatique de TanStack Router
        // isole `component` dans un module virtuel -> le HMR fonctionne quand même.
        "react/only-export-components": "off"
      }
    },
    {
      // Fichiers de config outillage (Node, export default exigé)
      "files": ["*.config.{ts,mts,js,mjs}", "scripts/**"],
      "env": { "node": true },
      "rules": {
        "import/no-default-export": "off",
        "import/no-nodejs-modules": "off",
        "react/only-export-components": "off"
      }
    },
    {
      "files": ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "src/test/**"],
      "plugins": [
        "eslint",
        "typescript",
        "unicorn",
        "oxc",
        "react",
        "jsx-a11y",
        "import",
        "promise",
        "vitest"
      ],
      "rules": {
        "max-lines-per-function": "off",
        "unicorn/consistent-function-scoping": "off",
        "typescript/no-unsafe-type-assertion": "off",
        "vitest/no-focused-tests": "error",
        "vitest/no-disabled-tests": "error",
        "vitest/expect-expect": "error",
        "vitest/no-identical-title": "error",
        "vitest/valid-title": "error",
        "vitest/prefer-to-be": "error",
        "vitest/prefer-strict-equal": "error",
        "vitest/consistent-test-it": ["error", { "fn": "it" }],
        // règles style vitest mutuellement contradictoires ou trop bavardes
        "vitest/no-hooks": "off",
        "vitest/prefer-expect-assertions": "off",
        "vitest/require-hook": "off",
        "vitest/max-expects": "off",
        "vitest/prefer-importing-vitest-globals": "off",
        "vitest/no-importing-vitest-globals": "off",
        "vitest/require-top-level-describe": "off",
        "vitest/prefer-describe-function-title": "off",
        "vitest/prefer-lowercase-title": "off",
        "vitest/prefer-to-be-truthy": "off",
        "vitest/prefer-to-be-falsy": "off",
        "vitest/prefer-called-once": "off",
        "vitest/padding-around-test-blocks": "off",
        "vitest/padding-around-after-all-blocks": "off",
        "vitest/no-large-snapshots": "off"
      }
    }
  ],

  "ignorePatterns": ["dist/**", ".output/**", "coverage/**", "**/*.gen.ts", "public/**"]
}
```

### Preuve : sortie sur le projet d'essai
Projet sain (`Counter`, `ReservationForm` avec `useMutation`, route `/reservations/$id`, test RTL) : **0 diagnostic**.
Avec les fichiers à violations volontaires (`Bad.tsx`, `Hooks.tsx`) — `oxlint -f unix` :
```
src/components/Hooks.tsx:13:29: React Hook "useState" is called conditionally. React Hooks must be called in the exact same order in every component render. [Error/react-hooks(rules-of-hooks)]
src/components/Hooks.tsx:15:22: React Hook useEffect has missing dependencies: 'id', and 'value' [Error/react-hooks(exhaustive-deps)]
src/components/Hooks.tsx:14:3: React Hook "useEffect" is called conditionally. React Hooks must be called in the exact same order in every component render. [Error/react-hooks(rules-of-hooks)]
src/components/Hooks.tsx:17:17: React Hook "useMemo" is called conditionally. React Hooks must be called in the exact same order in every component render. [Error/react-hooks(rules-of-hooks)]
src/components/Hooks.tsx:20:6: Non-interactive elements should not be assigned mouse or keyboard event listeners. [Error/jsx-a11y(no-noninteractive-element-interactions)]
src/components/Hooks.tsx:21:8: `'` can be escaped with &apos; or &lsquo; or &#39; or &rsquo; [Error/react(no-unescaped-entities)]
src/components/Bad.tsx:46:15: Cannot call impure function during render [Error/react(purity)]
src/components/Bad.tsx:11:5: Calling setState synchronously within an effect can trigger cascading renders [Error/react(set-state-in-effect)]
src/components/Bad.tsx:5:17: Function `Row` does not capture any variables from its parent scope [Error/unicorn(consistent-function-scoping)]
src/components/Bad.tsx:3:36: Prefer using a top-level type-only import instead of inline type specifiers. [Error/import(consistent-type-specifier-style)]
src/components/Bad.tsx:3:60: Relative imports from parent directories are not allowed [Error/import(no-relative-parent-imports)]
src/components/Bad.tsx:20:3: Do not define components during render. [Error/react(no-unstable-nested-components)]
src/components/Bad.tsx:29:5: Enforce a clickable non-interactive element has at least one keyboard event listener. [Error/jsx-a11y(click-events-have-key-events)]
src/components/Bad.tsx:29:6: Static HTML elements with event handlers require a role. [Error/jsx-a11y(no-static-element-interactions)]
src/components/Bad.tsx:30:7: Missing `alt` attribute. [Error/jsx-a11y(alt-text)]
src/components/Bad.tsx:34:16: Usage of Array index in keys is not allowed [Error/react(no-array-index-key)]
src/components/Bad.tsx:37:7: Fragments should contain more than one child. [Error/react(jsx-no-useless-fragment)]
src/components/Bad.tsx:37:7: Passing a fragment to a HTML element is useless. [Error/react(jsx-no-useless-fragment)]
src/components/Bad.tsx:48:6: `button` elements must have an explicit `type` attribute. [Error/react(button-has-type)]
src/components/Hooks.tsx:18:9: Type 'string' is not assignable to type 'number'. [Error/typescript(TS2322)]
src/components/Bad.tsx:16:5: Promises must be awaited, add void operator to ignore. [Error/typescript(no-floating-promises)]
src/components/Bad.tsx:49:25: Promise-returning function provided to attribute where a void return was expected. [Error/typescript(no-misused-promises)]
src/components/Bad.tsx:49:16: Async function used in a context where a void function is expected. [Error/typescript(strict-void-return)]

23 problems
```
Format humain (`-f default`, extrait) :
```

  x react-hooks(rules-of-hooks): React Hook "useState" is called conditionally. React Hooks must be called in the exact same order in every component render.
    ,-[src/components/Hooks.tsx:13:29]
 12 |   // rules-of-hooks : hook après un return conditionnel
 13 |   const [value, setValue] = useState("");
    :                             ^^^^^^|^^^^^
    :                                   `-- This Hook call is not reachable on every render path.
 14 |   useEffect(() => {
    `----
  help: Move the Hook call before the condition, or call it unconditionally and branch inside the Hook/effect instead.

  x react-hooks(exhaustive-deps): React Hook useEffect has missing dependencies: 'id', and 'value'
    ,-[src/components/Hooks.tsx:16:6]
 14 |   useEffect(() => {
 15 |     document.title = id + value; // exhaustive-deps : id/value manquants
    :                      ^^   ^^^^^
 16 |   }, []);
    :      ^^
 17 |   const upper = useMemo(() => value.toUpperCase(), [value]);
    `----
  …

Found 0 warnings and 23 errors.
Finished in 1.1s on 14 files with 560 rules using 4 threads.
```
Autres sorties TESTÉES : `@tanstack/query(exhaustive-deps): The following dependencies are missing in your queryKey: day`,
`@tanstack/query(no-rest-destructuring)`, `@tanstack/query(prefer-query-options)`, `vitest(no-focused-tests)` (override tests),
`import(no-default-export)`, `eslint(no-console)`, `typescript(no-explicit-any)`, `unicorn(switch-case-braces)`.
`-f github` produit des annotations `::error file=…` pour GitHub Actions (TESTÉ).

---

## 4. oxfmt

- Installation : `pnpm add -D oxfmt` (le paquet npm est requis pour MD/HTML/Tailwind/LSP ; le binaire autonome les ignore).
- Config : `.oxfmtrc.json` / `.oxfmtrc.jsonc` / `oxfmt.config.ts` (la plus proche du fichier gagne ; `overrides` par glob).
  Pas d'options CLI de style (`--no-semi` n'existe pas). `oxfmt --migrate prettier|biome` convertit une config existante ;
  **le champ `prettier` du package.json n'est pas lu**, `.prettierrc` non plus sans migration ; `.prettierignore` est respecté.
- Options (schéma 0.71) : `printWidth` (**100** par défaut, Prettier 80), `tabWidth`, `useTabs`, `semi`, `singleQuote`,
  `jsxSingleQuote`, `trailingComma` (`all`), `arrowParens`, `bracketSpacing`, `bracketSameLine`, `objectWrap`, `quoteProps`,
  `endOfLine`, `insertFinalNewline`, `proseWrap`, `singleAttributePerLine`, `embeddedLanguageFormatting`,
  `experimentalOperatorPosition`, `sortImports` (off par défaut ; algo perfectionist ; `internalPattern` défaut
  `["~/", "@/", "#"]`), `sortTailwindcss`, `sortPackageJson` (**on** par défaut), `jsdoc`, `ignorePatterns`, `overrides`.
  Non supporté : `experimentalTernaries`, plugins Prettier.
- `.editorconfig` lu (`indent_*`, `max_line_length`, `end_of_line`, `insert_final_newline`) en repli des valeurs non fixées.
- Ignore : `.gitignore` (+ `.git/info/exclude`), `.prettierignore`, `ignorePatterns` ; `node_modules` et lockfiles toujours ignorés.
- Langages : **natifs** JS/JSX/TS/TSX, JSON/JSONC/JSON5, CSS/SCSS/Less, GraphQL, TOML, YAML ; **via Prettier embarqué**
  HTML, Vue, Svelte, Markdown, MDX, Handlebars.
- Éditeur : même extension `oxc.oxc-vscode` (`oxfmt --lsp`). CI : `oxfmt --check` (code de sortie 1 si écart).

### Config (TESTÉE) — `files/.oxfmtrc.json`
```jsonc
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  // Valeurs par défaut d'oxfmt explicitées (≈ Prettier 3.8 sauf printWidth 100)
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": false,
  "jsxSingleQuote": false,
  "trailingComma": "all",
  "arrowParens": "always",
  "endOfLine": "lf",
  "insertFinalNewline": true,
  // Tri des imports (algorithme eslint-plugin-perfectionist) ; "#/..." = subpath/internal
  "sortImports": {
    "groups": [
      "builtin",
      "external",
      ["internal", "subpath"],
      ["parent", "sibling", "index"],
      "style",
      "unknown"
    ],
    "newlinesBetween": true
  },
  // package.json trié (défaut), scripts laissés dans l'ordre logique
  "sortPackageJson": { "sortScripts": false },
  "ignorePatterns": ["src/routeTree.gen.ts", "dist/**", ".output/**", "coverage/**"]
}
```

### Preuve (TESTÉ)
```
$ oxfmt --check
Checking formatting...
.oxlintrc.json (11ms)
NOTES.md (162ms)
package.json (1ms)
src/components/Bad.tsx (0ms)
src/data.json (0ms)
src/lib/api.ts (0ms)
src/lib/messy.ts (0ms)
src/styles/app.css (1ms)
Format issues found in above 8 files. Run without `--check` to fix.
Finished in 179ms on 21 files using 4 threads.      # exit 1
```
Après `oxfmt` : CSS reformaté (`.btn {\n  color: red;…}`), Markdown (`*` → `-`, tableau aligné), JSON, `package.json`
**trié** (name, version, private, type, dependencies…) et imports triés :
```diff
-import {z} from "./zzz"
-import type {Reservation} from '#/lib/api'
-import {useState} from 'react'
-import "./app.css"
+import fs from "node:fs";
+
+import { useState } from "react";
+
+import type { Reservation } from "#/lib/api";
+
+import "./app.css";
 import { label } from "#/lib/api";
-import fs from 'node:fs'
+
+import { z } from "./zzz";
```
Constat : un import à effet de bord (`import "./app.css"`) sert de **barrière** (non trié, `sortSideEffects: false` par
sécurité) → placer les imports CSS en dernier. Aucun conflit oxlint ↔ oxfmt constaté après formatage (lint relancé à l'identique).

---

## 5. tsconfig.json strict (TS 7, Vite 8, React 19, TanStack)

Fichier : `files/tsconfig.json` (TESTÉ : `tsc` OK, build OK, Vitest OK, oxlint OK)
```jsonc
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "es2023",
    "lib": ["es2023", "dom", "dom.iterable"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "types": ["vite/client"],
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "noUncheckedSideEffectImports": true,
    "skipLibCheck": true,

    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    "forceConsistentCasingInFileNames": true,

    "paths": { "#/*": ["./src/*"] }
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```
Notes :
- **Pas de `baseUrl`** (supprimé en TS 7) : `paths` est résolu relativement au tsconfig. La doc TanStack « Path aliases »
  montre encore `baseUrl` — à ignorer avec TS 7.
- Alias **`#/*` via `paths` + `resolve: { tsconfigPaths: true }`** (natif Vite 8, plus besoin de `vite-tsconfig-paths`) :
  TESTÉ OK pour tsc, Vite, Vitest, oxlint. Alternative `package.json#imports` `"#/*": "./src/*"` : TESTÉ **KO pour tsc**
  (pas de résolution d'extension → TS2307) alors que Vite l'accepte ; la forme tableau `["./src/*.ts","./src/*.tsx"]`
  satisfait tsc mais **casse Rolldown**. → rester sur `paths`.
- `types: ["vite/client"]` obligatoire (défaut `[]` en TS 7).
- `verbatimModuleSyntax: true` + `consistent-type-imports` + `no-import-type-side-effects`. La doc TanStack Start avertit
  que `verbatimModuleSyntax` peut faire fuiter du code serveur dans le client **quand on utilise des server functions** ;
  en SPA pure sur GitHub Pages (aucun serveur), pas d'impact.
- `exactOptionalPropertyTypes` : gardé (element-admin le désactive par friction avec des libs ; à réévaluer si gênant).
- `isolatedDeclarations` : inutile (pas de `.d.ts` émis ; exige `declaration`). `rewriteRelativeImportExtensions` : inutile (pas d'émission).
- `noPropertyAccessFromIndexSignature` : gardé (oblige `process.env["X"]`, `import.meta.env["VITE_X"]` reste typé si déclaré).

---

## 6. Gestionnaire de paquets, scripts, hooks, CI, tests

**Recommandation : pnpm 12** (`packageManager: "pnpm@12.8.1"`) — install TESTÉE (3,6 s, zéro warning, jsPlugins OK) ;
element-admin est en pnpm 11. Corepack n'est plus le chemin recommandé : l'action `pnpm/setup@v3` installe pnpm (≥ 11) **et**
Node, met en cache le store et lance l'install. npm fonctionne aussi (TESTÉ intégralement).

### package.json (scripts) — `files/package.json`
```json
{
  "name": "reservations-restaurants",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc",
    "lint": "oxlint",
    "lint:fix": "oxlint --fix && oxfmt",
    "format": "oxfmt",
    "format:check": "oxfmt --check",
    "test": "vitest run",
    "test:watch": "vitest",
    "knip": "knip",
    "check": "pnpm run format:check && pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run knip",
    "prepare": "lefthook install"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.104.1",
    "@tanstack/react-router": "^1.170.41",
    "@tanstack/react-start": "^1.168.60",
    "react": "^19.3.0",
    "react-dom": "^19.3.0"
  },
  "devDependencies": {
    "@tanstack/eslint-plugin-query": "^5.104.1",
    "@tanstack/eslint-plugin-router": "^1.162.0",
    "@testing-library/react": "^16.3.3",
    "@types/node": "^26.6.4",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.1",
    "jsdom": "^29.1.1",
    "knip": "^6.39.0",
    "lefthook": "^2.1.16",
    "oxc-transform-react": "^0.145.0",
    "oxfmt": "^0.71.0",
    "oxlint": "^1.86.0",
    "oxlint-tsgolint": "^7.0.2003",
    "typescript": "^7.0.2",
    "vite": "^8.3.2",
    "vitest": "^5.0.3"
  },
  "engines": {
    "node": ">=22.18"
  },
  "packageManager": "pnpm@12.8.1"
}
```
(`@tanstack/router-plugin` retiré : knip l'a signalé inutile, Start l'embarque.)

### Preuve `npm run check` (projet sain, TESTÉ)
```
> oxfmt --check        All matched files use the correct format. Finished in 22ms on 17 files
> oxlint               (aucun diagnostic)
> tsc                  (aucune erreur)
> vitest run           Test Files 2 passed (2) — Tests 3 passed (3) — Duration 1.18s
> knip                 Unused exports (1)  useReservations  src/lib/queries.ts:15:17
```
(knip échoue volontairement ici : il détecte un export mort laissé dans le prototype ; les routes TanStack sont bien vues comme entrées.)

### Hooks git : lefthook (TESTÉ : `lefthook validate` → « All good », pre-commit formate et stage un fichier)
`files/lefthook.yml` :
```yaml
# https://lefthook.dev — hooks installés par le script "prepare" (lefthook install)
pre-commit:
  parallel: false
  jobs:
    - name: oxlint (fix)
      glob: "*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}"
      run: pnpm exec oxlint --fix {staged_files}
      stage_fixed: true
    - name: oxfmt
      run: pnpm exec oxfmt --no-error-on-unmatched-pattern {staged_files}
      stage_fixed: true

pre-push:
  jobs:
    - name: check
      run: pnpm run check
```
Pas besoin de lint-staged (lefthook fournit `{staged_files}` + `stage_fixed`). Avec pnpm ≥ 10, les scripts postinstall
sont bloqués par défaut → l'installation des hooks passe par `"prepare": "lefthook install"`.

### GitHub Actions (CI + GitHub Pages) — `files/.github/workflows/ci.yml`
Versions d'actions vérifiées (`git ls-remote --tags`) : checkout v7.0.1, pnpm/setup v3.0.0, setup-node v7.0.0,
upload-pages-artifact v5.0.0, deploy-pages v5.0.1. (YAML validé syntaxiquement ; workflow non exécuté sur GitHub.)
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions: {}

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  check:
    name: Format, lint, types, tests, build
    runs-on: ubuntu-24.04
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false

      # Installe pnpm (version lue dans package.json#packageManager) + Node (.node-version),
      # met en cache le store et lance `pnpm install --frozen-lockfile`.
      - uses: pnpm/setup@v3
        with:
          runtime: node
          cache: true
          require-lockfile: true

      - run: pnpm run format:check
      - run: pnpm exec oxlint --format github
      - run: pnpm run typecheck
      - run: pnpm run test
      - run: pnpm run knip

      - name: Build (SPA, base = /<repo>/)
        run: pnpm run build
        env:
          BASE_PATH: /${{ github.event.repository.name }}/

      # GitHub Pages : deep-linking SPA -> 404.html = copie du shell
      - run: cp dist/client/index.html dist/client/404.html && touch dist/client/.nojekyll

      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist/client

  deploy:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
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
        uses: actions/deploy-pages@v5
```
Build SPA TESTÉ : `spa.prerender.outputPath: "/index.html"` produit `dist/client/index.html` ; avec `BASE_PATH=/reservations-restaurants/`
tous les assets sont préfixés, et Start dérive automatiquement le `basepath` du routeur de `base` (`deriveRouterBasepath`).
`404.html` = copie du shell pour le deep-linking sur Pages.

### Tests
Sobre : **Vitest 5 + @testing-library/react + jsdom** (TESTÉ, `vitest.config.ts` séparé pour ne pas charger le plugin Start).
`happy-dom` plus rapide mais moins fidèle ; `@vitest/browser` + Playwright seulement si des tests navigateur réels sont
nécessaires (element-admin fait de l'E2E Playwright + msw). jsdom 30 exige Node ≥ 22.22.2 (npm a pris 29.1.1 sur 22.22.0)
→ fixer Node à une LTS récente (`.node-version`).
```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
```
**knip** : utile et compatible (TESTÉ) ; il a repéré fichiers morts, exports morts et devDependency inutile.

---

## 7. React Compiler

- `babel-plugin-react-compiler` **1.0.0** stable (oct. 2025). Depuis août 2026 : port Rust intégré à oxc
  (`oxc-transform-react`, ~10× plus rapide que Babel, sortie identique sur 100 000 fichiers testés par oxc) et
  **`@vitejs/plugin-react` 6.1 : `react({ compiler: true })`** — marqué « experimental » dans le README.
  Alternative Babel : `react()` + `@rolldown/plugin-babel` + `reactCompilerPreset()`.
- TESTÉ : `vite build` avec `compiler: true` → la sortie contient `react.memo_cache_sentinel` et le cache `c(3)` ;
  compatible Vite 8/Rolldown (rolldown-vite n'existe plus en tant que tel) et avec le plugin TanStack Start
  (ordre : `tanstackStart()` puis `react()`).
- Vaut-il le coup sur un petit projet ? **Oui, le coût est quasi nul** (une option + une devDependency Rust) et il rend
  superflus `useMemo`/`useCallback`/`memo` manuels. Le vrai bénéfice est côté lint : les règles du compilateur
  (`purity`, `set-state-in-effect`, `refs`, `immutability`…) imposent du React « moderne » — elles sont dans oxlint
  **sans** installer `eslint-plugin-react-hooks`. Si un bug apparaît : `compiler: { compilationMode: "annotation" }`
  (opt-in par `"use memo"`) ou `logDiagnostics: true`.
- `vite.config.ts` — `files/vite.config.ts` :
```ts
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages "project site" : https://<user>.github.io/<repo>/
const base = process.env["BASE_PATH"] ?? "/";

export default defineConfig({
  base,
  resolve: { tsconfigPaths: true },
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
        // GitHub Pages sert index.html ; 404.html (copie) gère le deep-linking
        prerender: { outputPath: "/index.html" },
      },
    }),
    // après tanstackStart() ; React Compiler via oxc-transform-react (peer optionnelle)
    react({ compiler: true }),
  ],
});
```

---

## 8. Éditeur

`files/.vscode/extensions.json`
```json
{
  "recommendations": [
    "oxc.oxc-vscode",
    "TypeScriptTeam.native-preview",
    "EditorConfig.EditorConfig"
  ],
  "unwantedRecommendations": ["esbenp.prettier-vscode", "dbaeumer.vscode-eslint", "biomejs.biome"]
}
```
`files/.vscode/settings.json` (ordre au save : formatage oxfmt puis corrections oxlint, recommandé par le README oxc-vscode)
```jsonc
{
  // --- Formatage : oxfmt (via l'extension Oxc) ---
  "editor.defaultFormatter": "oxc.oxc-vscode",
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.format.oxc": "always", // 1. formate
    "source.fixAll.oxc": "always" // 2. puis corrections oxlint sûres
  },
  "[json]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[jsonc]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[css]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[markdown]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[yaml]": { "editor.defaultFormatter": "oxc.oxc-vscode" },

  // --- Lint : oxlint (lit options.typeAware dans .oxlintrc.json) ---
  "oxc.enable": true,
  "oxc.requireConfig": true,
  "oxc.lint.run": "onType",

  // --- TypeScript 7 natif (extension "TypeScript 7" / TypeScriptTeam.native-preview) ---
  "js/ts.experimental.useTsgo": true,
  "js/ts.tsdk.path": "node_modules/typescript",

  // --- Neutraliser les autres outils ---
  "prettier.enable": false,
  "eslint.enable": false,
  "biome.enabled": false,

  // --- Fichiers générés ---
  "files.readonlyInclude": { "**/routeTree.gen.ts": true },
  "files.watcherExclude": { "**/routeTree.gen.ts": true },
  "search.exclude": { "**/routeTree.gen.ts": true, "dist": true, ".output": true }
}
```
`files/.editorconfig` (aussi lu par oxfmt)
```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
max_line_length = 100

[*.md]
trim_trailing_whitespace = false
```

---

## Comparaison avec element-admin (production, element-hq)

| Sujet | element-admin | Ce rapport | Commentaire |
|---|---|---|---|
| Versions | vite 8.3.0, TS 7.0.2, oxlint 1.82 + tsgolint 7.0.2001, oxfmt 0.67, pnpm 11.25 | vite 8.3.2, TS 7.0.2, oxlint 1.86 + 7.0.2003, oxfmt 0.71, pnpm 12.8 | même pile, 4 semaines plus récent |
| Type-aware | `typeAware` + `typeCheck` dans `.oxlintrc.json` | idem | confirme le choix |
| `tsc` en CI | **non** (repose sur `oxlint --type-check`) | **oui** en plus | angles morts croisés mesurés (`.gen.ts` ignorés / fichiers hors include) |
| Catégories | `correctness` + `suspicious` en error, ~150 règles listées à la main | 5 catégories en error + exclusions | approche « tout sauf » plus pédantique et plus courte |
| Règles typées désactivées | `no-floating-promises`, `no-misused-spread`, `no-unsafe-type-assertion` **off** | toutes **on** | eux privilégient la souplesse ; ici `no-floating-promises` est central |
| jsPlugins | `@tanstack/eslint-plugin-router`, `-query`, `eslint-plugin-formatjs` | les deux TanStack | **confirme que jsPlugins tient en prod** |
| `@tanstack/query/no-void-query-fn` | `error` | retirée | TESTÉ : no-op sous oxlint (règle typée) |
| `prefer-query-options` | absente | `error` | existe en 5.104.1 (TESTÉ) |
| `unicorn/no-null` | error global, **off** pour `*.ts(x)` | off | même conclusion |
| `filename-case` | kebab-case seulement | kebab + Pascal + camel, off pour routes | eux nomment les composants en kebab-case |
| `only-export-components` | off pour `*.ts(x)` | off seulement pour `src/routes/**` | |
| `.gen.ts` | override qui éteint ~25 règles | `ignorePatterns` | plus simple ; types toujours disponibles |
| oxfmt | `printWidth: 80`, `sortPackageJson: false` | 100, tri des imports, package.json trié | goût |
| tsconfig | `@tsconfig/vite-react` + `@tsconfig/strictest`, **`exactOptionalPropertyTypes: false`**, alias `@/*` | équivalent explicite, `exactOptionalPropertyTypes: true`, alias `#/*` | strictest = mêmes flags que ma liste |
| Vite | `tanstackRouter({ autoCodeSplitting: true })` (pas Start), `viteReact({ compiler: true })`, prerender maison | Start `spa.enabled` + `react({ compiler: true })` | React Compiler Rust en prod chez eux aussi |
| Scripts | `lint = oxlint && stylelint && oxfmt --check`, `fix`, `knip = knip && knip --production` | séparés + `check` | ajouter `knip --production` est une bonne idée |
| CI | actions épinglées par **SHA**, `persist-credentials: false`, `pnpm/setup` (runtime node), zizmor | tags majeurs | épingler par SHA en vrai projet |
| `.npmrc` / pnpm | `save-exact=true`, `strictPeerDependencies`, `strictDepBuilds`, `trustPolicy: no-downgrade`, `peerDependencyRules` (eslint 10, typescript 7) | défauts | à reprendre si on veut des peers stricts |
| Tests | Playwright + `@msw/playwright` + axe | Vitest + RTL | complémentaires |

---

## Recommandations

1. **Pile** : pnpm 12, Vite 8 + `@vitejs/plugin-react` 6.1 (`compiler: true` + `oxc-transform-react`), TanStack Start
   `spa.enabled`, **TypeScript 7.0.2** (`tsc`), oxlint 1.86 + oxlint-tsgolint 7.0.x (type-aware + type-check), oxfmt,
   Vitest 5 + RTL + jsdom, knip, lefthook. Pas d'ESLint ni de Prettier, pas de `vite-plugin-oxlint`.
2. Copier `files/` tel quel : `.oxlintrc.json`, `.oxfmtrc.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`,
   `package.json` (scripts), `lefthook.yml`, `.editorconfig`, `.vscode/`, `.github/workflows/ci.yml`, `.gitignore`.
3. CI : `format:check` → `oxlint -f github` → `tsc` → `vitest run` → `knip` → `build` → Pages.
4. **Committer `src/routeTree.gen.ts`** et l'ignorer côté lint/format (déjà fait dans les configs).
5. Mettre à jour **oxlint et oxlint-tsgolint ensemble** (peer `>=7.0.2003`) ; épingler les versions exactes
   (`save-exact`) vu la cadence hebdomadaire et le statut alpha des jsPlugins / 0.x d'oxfmt.
6. Écrire les handlers async sans `async` dans le JSX : `onClick={() => { save().catch(report); }}` ou une mutation
   TanStack Query (`mutation.mutate()` renvoie `void`) — c'est ce qu'imposent `no-misused-promises` + `strict-void-return`.
7. Valider les réponses `fetch` (fonction `parse…` ou valibot comme element-admin) : `no-unsafe-*` et
   `no-unsafe-type-assertion` interdisent `as Reservation` sur un `any`.

## Pièges

- **Pas de `.gitignore` ⇒ oxlint lint `node_modules`** : tsgolint a été tué (SIGKILL) après 60 s sur le projet d'essai ;
  oxlint n'ignore pas `node_modules` par défaut, il s'appuie sur `.gitignore`. Toujours avoir un `.gitignore` (ou `ignorePatterns`).
- Hors TTY / sous un agent, oxlint choisit un format compact ; forcer `-f default` (humain) ou `-f github` (CI).
- `plugins` remplace la liste par défaut : oublier `"eslint"`/`"typescript"` désactive des centaines de règles.
- `react/rules-of-hooks` est en **pedantic** : avec seulement `correctness`, il n'est pas actif.
- `no-unnecessary-condition` / `prefer-optional-chain` sont en **nursery** : les activer explicitement.
- Les `overrides` ne prennent pas `categories` ; un override qui définit `plugins` doit relister tous les plugins voulus.
- Règles jsPlugins typées (ex. `@tanstack/query/no-void-query-fn`) : **silencieusement inactives**.
- TS 7 : `baseUrl`, `moduleResolution: node`, `target: es5`, `esModuleInterop: false`, `downlevelIteration`… sont des **erreurs** ;
  `types` vaut `[]` par défaut ; pas d'API JS (outils dépendants → `@typescript/typescript6` ou attendre 7.1).
- VS Code + TS 7 : sans `"js/ts.tsdk.path": "node_modules/typescript"`, l'extension TypeScript 7 ignore la version du projet.
- `package.json#imports` `#/*` : OK pour Vite, KO pour tsc (pas de résolution d'extension) → utiliser `paths`.
- `oxlint --fix` peut produire du code non formaté (quotes simples) → toujours `oxfmt` après.
- `react/only-export-components` signale les fichiers de routes TanStack ; `jsx-a11y` avec `Link` mappé sur `a` exige `href`.
- `@types/react` 19.3 déprécie `FormEvent` ; TanStack Query 5.102+ déprécie `ensureQueryData`/`prefetchQuery`/`fetchQuery`.
- `import "./x.css"` coupe le tri d'imports d'oxfmt en deux blocs.
- `typescript/consistent-return` contre les `switch` exhaustifs ; `eslint/no-duplicate-imports` contre `import type` séparé.
- jsdom 30 demande Node ≥ 22.22.2 ; TanStack Start (doc) déconseille `verbatimModuleSyntax` si server functions.
- `vite.config.ts` : `process.env.X` refusé par `noPropertyAccessFromIndexSignature` → `process.env["X"]`.

## Annexe : commandes exécutées (extrait)
```
npm view oxlint version                     -> 1.86.0
npm view oxfmt version                      -> 0.71.0
npm view oxlint-tsgolint version            -> 7.0.2003
npm view @typescript/native-preview dist-tags -> { beta: 7.0.0-dev.20260421.2, latest: 7.0.0-dev.20260707.2 }
npm view typescript dist-tags               -> latest 7.0.2, next 7.1.0-dev.20261003.1, rc 7.0.1-rc
npx tsc --version                           -> Version 7.0.2
npx oxlint --rules -f json | (871 règles)   eslint 187, unicorn 138, typescript 111, react 85, vitest 73, jest 60,
                                            vue 46, jsx_a11y 36, import 33, oxc 27, jsdoc 23, nextjs 21, promise 16, node 11, react_perf 4
npx vite build                              -> client + ssr + "[prerender] Prerendered 1 pages: /" -> dist/client/_shell.html (ou index.html)
npx -y pnpm@12.8.1 install                  -> Done in 3.6s using pnpm v12.8.1
npx lefthook validate                       -> All good
```
Projet d'essai conservé : `toolchain/proj/` (projet d’essai ou clone, non versionné) (fichiers à violations dans `toolchain/keep/` (projet d’essai ou clone, non versionné)).
