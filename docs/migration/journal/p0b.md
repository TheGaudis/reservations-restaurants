# Journal de la session P0 (b) — coquille Start, scripts, Playwright, vérification d'hydratation

*3 octobre 2026. Branche `claude/p0b-coquille`, partie de la pointe de l'intégration qui contient P0 (a) (`c336b2e`).*

## Fait

- Styles : `src/styles/tokens.css` (§ 1-2 de `legacy/design-system.css`, mêmes valeurs, alias `[data-accent="r1"|"r2"]`), `base.css` (base, `:focus-visible`, `.kicker`, `.text-muted`, `.num`, keyframes `rise`, `sink`, `pulse-armed`, confort tactile, `prefers-reduced-motion`), `print.css` (`.print-root` caché à l'écran, seul visible à l'impression). Polices Outfit et Work Sans auto-hébergées (D-23) : `@font-face` sur les fichiers latins de `@fontsource-variable`, sous les noms de famille des jetons (`"Outfit"`, `"Work Sans"`).
- Coquille : `src/router.tsx` (`getRouter()`, garde `typeof window`, `Wrap` Query + `RawIntlProvider`, `defaultPendingComponent: PageSkeleton`, `defaultPendingMinMs` par défaut), `src/client.tsx` (point d'entrée de Start, worker msw sous `pnpm dev` seulement, aucun `onRecoverableError`), `routes/__root.tsx` (`shellComponent`, `head()` de `03` § 2.1 avec titre et description par react-intl, favicon de l'ancien `index.html`, `preconnect` en `crossOrigin: "anonymous"`, trois feuilles de styles, `<ScriptOnce>{earlyFetchScript}</ScriptOnce>`, devtools), `routes/index.tsx`, `routes/$.tsx` (« Page introuvable », « Revenir à l'accueil », annexe F), `routes/index[.]html.tsx`, `src/routeTree.gen.ts`.
- Scripts : `scripts/post-build.ts`, `scripts/serve-pages.ts`, `scripts/check-budget.ts` ; `package.json` : `serve` et `serve:legacy` passent `--port-env`.
- `playwright.config.ts`, `e2e/smoke.spec.ts`, `e2e/hydration.spec.ts`.
- Tests Vitest : `src/router.test.ts` (node : `getRouter()` sans `window` ne lit pas la copie, avec `window` il la lit ; `defaultPendingMinMs` vaut 500), `src/queries/local-cache.test.ts` (node), `src/routes/routes.test.tsx` (browser, `createMemoryHistory` : copie locale sur `/`, squelette sans copie, attrape-tout, `/index.html`).
- `knip.json` sans indication de configuration (décision de l'orchestrateur ci-dessous).
- PLAN § 2.1, ligne « TanStack Start en mode SPA » : mesures et résultat de l'essai.

## Mesures

Hydratation, build `build:e2e` servi par `pnpm serve`, Chromium 1194 par `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, copie locale posée par `addInitScript`, lecture du script retenue 5 s, 5 chargements par ligne, temps depuis le début de la navigation :

| Réglage de la route `/` | CPU ×1 : contenu à (ms) | CPU ×6 : contenu à (ms) | Images de squelette après le premier rendu de React | Erreurs console |
| --- | --- | --- | --- | --- |
| `pendingMinMs` par défaut (500 ms) | 640, 610, 605, 621, 607 (médiane 610) | 1 073 (médiane) | squelette visible 580 à 590 ms au total | aucune |
| `pendingMinMs: 0` sans barrière | 135, 113, 125, 112, 138 | 656 à 712 | 0 | #418 à chaque chargement |
| `pendingMinMs: 0` + `useHydrated()` (retenu) | 127, 129, 110, 127, 109 (médiane 127) | 620, 628, 630, 609, 736 (médiane 628) | 0 | aucune |

- Images de squelette comptées par `requestAnimationFrame` : avec la barrière, 3 à 7 (×1) et 11 à 16 (×6), toutes avant la première mutation du DOM par React, qui est le passage au contenu. Ces images viennent du HTML prérendu affiché avant l'exécution du bundle ; aucun réglage de la coquille ne les retire.
- `e2e/hydration.spec.ts` (réglage retenu, 3 répétitions, 2 workers) : contenu 92 à 166 ms après le squelette.
- Réglages par défaut sous charge : squelette de 678 ms mesuré une fois par `e2e/hydration.spec.ts` avec 2 workers en parallèle. Le seuil de 600 ms n'aurait pas tenu de façon stable en CI.

Budget de la coquille (`pnpm build && pnpm budget`, gzip niveau 9) : JS 121,9 kB (entrée 121,3 kB, chunk de `/` 0,5 kB) ; CSS 2,4 kB. Polices hors budget : 32,3 kB (Outfit) et 50,3 kB (Work Sans), non préchargées.

## Décisions

1. **Barrière client-only retenue** (essai réussi). `src/features/page/use-hydrated.ts` exporte `useHydrated()` (`useSyncExternalStore`, instantané serveur `false`, client `true`, abonnement qui ne notifie jamais). `PublicPage` rend exactement `PageSkeleton` tant qu'il vaut `false`, et la route `/` pose `pendingMinMs: 0`. Le routeur garde `defaultPendingMinMs` par défaut : `$`, `/index.html` et la future `/collegue` gardent les 500 ms. Retour arrière : retirer `useHydrated()` de `PublicPage` et l'option de la route (commit `Coquille : barrière client-only…`). P4 (a) garde la règle : pendant l'hydratation, la page rend exactement `PageSkeleton`.
2. **Ports Playwright (décision de l'orchestrateur)** : 4310 (`legacy`) et 4311 (`react`) par défaut, remplacés par `E2E_LEGACY_PORT` et `E2E_REACT_PORT` ; `reuseExistingServer: false`. `scripts/serve-pages.ts` lit le port dans la variable nommée par `--port-env` (`pnpm serve` : `--port 4311 --port-env E2E_REACT_PORT`), ce qui marche aussi sous Windows, contrairement à `${VAR:-4311}` dans un script pnpm. Vérifié : `E2E_REACT_PORT=4411 E2E_LEGACY_PORT=4410 pnpm test:e2e --project=react-only e2e/smoke.spec.ts` vert ; un `pnpm serve` déjà lancé sur 4311 fait échouer Playwright (« is already used »).
3. **knip (décision de l'orchestrateur, PLAN § 3.1)** : retirés `ignore` sauf `docs/**`, `ignoreFiles`, le motif `.storybook/*.{ts,tsx}` (P3 (0) le remet avec ses fichiers) et les paquets désormais importés. `docs/**` reste : sans lui, le plugin Vitest de knip lit `docs/migration/recherche/appresaaristide/convex/model.test.ts` et signale deux imports non résolus. Les deux polices restent dans `ignoreDependencies` : knip ne lit pas les `url()` du CSS. `src/intl/common-messages.ts` sort du projet en mode production (`"!src/intl/common-messages.ts!"`) jusqu'à P4 (a) : `ignoreFiles` donnait une indication « Remove from ignoreFiles » en mode normal et le fichier était inutilisé en mode production.
4. **`.vitest/` et `--disable-nested-config`** de P0 (a) : validés par l'orchestrateur, inchangés.
5. **Fichiers provisoires hors de mon périmètre**, nécessaires pour que la vérification d'hydratation porte sur le vrai mécanisme (restauration synchrone avant le routeur, loader résolu aussitôt) : `src/queries/{client,state,local-cache}.ts` (P2 (b2) les remplace ; `local-cache.ts` ne lit que `savedAt`, `etag`, `config.name1`, `config.name2` et pose un `ShellState` sous `['state','public']`), `src/api/early-fetch.ts` (P2 (b1) ajoute `takeEarlyFetch`), `src/features/page/{PageSkeleton,PublicPage}.tsx` (P4 (a)), `src/mocks/browser.ts` (P1 (a1) y branche le faux script). Le loader de `/` est synchrone (`getQueryData`) : aucune requête du site en P0.
6. **`earlyFetchScript` vide** quand `USE_MOCK_API` ou `isConfigMissing()` : sans URL valide, le script inline faisait `fetch("")`, c'est-à-dire relisait la page (constaté sur `pnpm build` sans `VITE_APPS_SCRIPT_URL`).
7. **`client.tsx` teste `import.meta.env.DEV && USE_MOCK_API`** : avec `USE_MOCK_API` seul, Rolldown ne replie pas la constante importée et `dist/client` contenait msw (chunk de 379 kB, hors du chemin initial).
8. **Worker de `pnpm dev`** : `http.all(\`${location.origin}/*\`, () => passthrough())` avant `onUnhandledFrame: "error"`. Sans ce handler, msw interceptait la navigation vers `/collegue` et répondait 500. Vérifié dans Chromium sur `pnpm dev` : worker actif, aucune requête vers `script.google.com`, un `fetch` de sonde vers l'URL du script reçoit 500 du worker, `/collegue` affiche « Page introuvable », console vide.
9. **CSS Modules** : `styles["page"]`, la notation entre crochets qu'impose `noPropertyAccessFromIndexSignature` (comme element-admin).
10. **Squelette sans texte** : deux colonnes `aria-hidden` dans un `<main aria-busy="true">`. Les titres par défaut ou mémorisés (`03` § 2.2, G-01) viennent avec P4 (a) ; les tests repèrent le squelette par `main[aria-busy="true"]` visible.
11. **Textes de la coquille** : `common.document.title` et `common.document.description` (`03` § 2.1) passent par `defineMessages` et `intl.formatMessage` dans `head()`. Extraits dans `translations/fr.json` avec `common.notFound.title` et `common.notFound.home`.
12. **`base.css`** ne reprend pas les règles de composants du § 6 de `design-system.css` (`.btn`, `.capacity-pill`, `.tag`, `.spinner`) : elles iront dans les CSS Modules de P3. Il garde `button, summary` (tap, `touch-action`) et `summary { user-select: none }`. oxfmt écrit les couleurs hexadécimales en minuscules et `.10` en `0.1` ; un script de comparaison a vérifié les 106 déclarations de jetons contre l'original.
13. **Devtools** de Router et de Query dans le `<body>` de la coquille : ils ne rendent rien en production (aucune trace dans `dist/client`, budget +0,5 kB).
14. **Tests E2E sans `e2e/fixtures.ts`** (P1 (a1)) : chaque fichier pose sa propre `route` (tout ce qui ne va pas vers 127.0.0.1 est avorté, sauf l'URL factice du script, servie localement). Le smoke ignore la ligne console « status of 404 » du document `/collegue`, que Chromium écrit pour tout lien profond servi par `404.html`.

## Contradictions et remarques

- **Commande de lancement** `pnpm test:e2e --project react-only e2e/hydration.spec.ts` (P0 (b), P4 (a)) : Playwright lit `e2e/hydration.spec.ts` comme un second nom de projet et s'arrête (« Project(s) "e2e/hydration.spec.ts" not found »). Écrire `--project=react-only`.
- **Barrière retenue** : le PLAN (§ 3.2 commentaire de l'exemple, § 3.3.1 étape 5, § 3.9 G-01, § 3.11 commentaire de `getRouter`, S4, E-47, R-01) et `CLAUDE.md` (« `pendingMinMs` garde sa valeur par défaut ») décrivent encore le squelette de 500 à 600 ms partout. Je n'ai modifié que la ligne Start du § 2.1. E-47 devient presque nul sur `/` (contenu vers 130 ms).
- **`pnpm test:e2e:legacy`** sort en « No tests found » tant que `e2e/regression/` est vide (P1 (a1)).
- La charge utile d'hydratation de Start dans `index.html` contient un caractère NUL (`"__root__\x00"`) : `grep` traite le fichier comme binaire (`grep -a` pour le lire).

## Versions

Aucune version changée, aucun paquet ajouté. `pnpm install --frozen-lockfile` passe.

## Overrides oxlint

Aucun. Corrections du code : `valibot` pour lire le manifeste (`no-unsafe-type-assertion`), fonction de désabonnement commentée (`no-empty-function`), `hydrationTimeline` au lieu de `__TIMELINE__` (`no-underscore-dangle`).

## Reste à faire

- P0 (c) : CI (`pnpm build:e2e`, `git diff --exit-code src/routeTree.gen.ts translations/fr.json`, `pnpm test:e2e --project=react-only`, build de production, `pnpm budget`, artefacts) ; `CLAUDE.md` et PLAN à aligner sur la barrière si l'orchestrateur la garde.
- P1 (a1) : `e2e/fixtures.ts` remplace les `route` locales de `e2e/smoke.spec.ts` et `e2e/hydration.spec.ts` ; handlers du faux script dans `startDevWorker()` en gardant le `passthrough` de l'origine ; retirer `@msw/playwright` de `ignoreDependencies`.
- P2 (b1), P2 (b2) : remplacer les modules provisoires (décision 5) ; le loader de `/` passe à `queryClient.query({ ...publicStateOptions, staleTime: "static" })` (async).
- P3 (0) : remettre `.storybook/*.{ts,tsx}` dans `project` de `knip.json`.
- P4 (a) : titres par défaut et mémorisés dans `PageSkeleton` sans casser l'hydratation (le rendu d'hydratation doit rester identique à la coquille), assertion des titres mémorisés dans le second test de `e2e/hydration.spec.ts` (REG-01), retrait de `!src/intl/common-messages.ts!` de `knip.json`, préchargement éventuel d'une police.
- P6 (a) : `print.css` complet (page nommée `list`, boîtes de marge).

## Pour la PR

Titre : « P0 (b) : coquille Start, scripts, Playwright, vérification d'hydratation ».

- Coquille prérendue servie par `pnpm serve` (émulateur Pages) ; `dist/client` : `index.html`, `404.html` identique, assets sous `/reservations-restaurants/`, sans `mockServiceWorker.js`.
- Hydratation vérifiée (S4) ; essai de barrière client-only réussi et retenu sur `/` (contenu de la copie locale à 127 ms au lieu de 610 ms, aucune #418). À trancher par l'orchestrateur : garder la barrière et aligner `CLAUDE.md` et le PLAN, ou revenir aux 500 ms par le revert d'un commit.
- Budget : JS 121,9 kB, CSS 2,4 kB (gzip).
- Aucune action humaine propre à P0 (b) ; celles de P0 vont dans la PR de P0 (c).
- Hooks git : `lefthook install` (script `prepare`) a écrit dans `.git/hooks`, commun aux worktrees, le chemin du binaire de ce worktree.
