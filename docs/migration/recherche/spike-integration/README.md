# Projet d'essai combiné (`spike-integration/`)

*Bâti le 3 octobre 2026 pendant la relecture de faisabilité du plan, à partir de `../toolchain-files/` et de l'essai TanStack Start. Copié ici sans `node_modules`, ni les dossiers produits (`dist/`, `dist-router*/`, `out/`, `storybook-static/`, `test-results/`, `playwright-report/`, `.tanstack/`, `.vitest/`), ni la copie de l'ancien site (`legacy/`). Point de départ de la phase P0 ([`PLAN.md`](../../PLAN.md) P0, « Point de départ »).*

## Ce qu'il prouve

Toute la pile du plan s'installe et fonctionne **ensemble**, aux versions exactes du PLAN § 2 : `pnpm check` (extraction i18n → oxfmt → oxlint type-aware → `tsc` → Vitest à trois projets → knip ×2 → build → budget → Playwright → build Storybook) passe en entier, en 30 s (`tools/results/pnpm-check.log`).

| Point | Résultat | Fichiers |
| --- | --- | --- |
| Build Start SPA + React Compiler + FormatJS (AST) + react-intl + valibot + Query + Zustand + Base UI + TanStack Form | OK ; alias `no-parser` : −7,4 kB gzip ; un descripteur de message rangé dans une variable ordinaire n'est **pas** précompilé (ICU brut en production) | `vite.config.ts`, `src/intl/`, `src/features/page/PublicPage.tsx` |
| Coquille prérendue (`ScriptOnce`, `head()`, `preconnect`, garde `typeof window`) | OK ; le script inline arrive après la CSS et les `modulepreload` (R-12) ; la garde n'est pas prouvée par le build si la lecture est dans un `try/catch` | `src/routes/__root.tsx`, `src/router.tsx` |
| Hydratation avec copie locale (R-01) | `pendingMinMs` par défaut : contenu à 594 ms, aucune erreur ; `pendingMinMs: 0` : erreur #418 à chaque chargement ; Router seul : 103 ms, 0 erreur, −13,5 kB gzip. Décision : arbitrage 16 du plan (Start conservé, squelette ≤ 600 ms accepté) | `tools/hydration-spike.mjs`, `tools/frames.mjs`, `tools/client.tsx.example`, `router-only/`, `vite.router.config.ts` |
| Vitest 5 Browser Mode + msw 3 en service worker | OK avec `onUnhandledFrame` (pas `onUnhandledRequest`), `executablePath` explicite, `msw init --save`, peer `msw: "3"` | `vitest.config.ts`, `src/test/`, `src/api/transport.test.tsx` |
| Storybook 10.6 + addon-vitest + a11y + msw-storybook-addon 3 | OK en 3e projet Vitest `storybook`, avec `.storybook/vite.config.ts` sans le plugin Start, stories en CSF Next ; une violation axe volontaire fait échouer le test | `.storybook/`, `src/ui/*.stories.tsx`, `tools/results/vitest-storybook-violation.log` |
| Playwright 1.63 + `@msw/playwright` 0.7 contre l'ancien site | OK (GET et POST `text/plain` interceptés, popup d'impression capturé) | `playwright.config.ts`, `e2e/` |
| oxlint type-aware + jsPlugins + oxfmt + tsc 7 + knip | OK après réglages : 8 règles en conflit avec les extraits du plan, overrides stories / tests / scripts, scripts en `.ts`, configuration knip | `.oxlintrc.json`, `tools/results/oxlintrc.diff`, `knip.json`, `scripts/` |
| Budget | 166,9 kB gzip sur le chemin initial (page d'essai qui charge `Dialog`, `NumberField` et un formulaire dès le départ) | `scripts/check-budget.ts` |

Non vérifié : vrais appareils et WebKit, `retainSearchParams` entre deux routes, GitHub Actions et Pages, `storybook dev`, lefthook, règles `@tanstack/*` sur du code qui les déclenche, poids de l'application complète.

## Rejouer

Node ≥ 22.18 (scripts `.ts` exécutés par `node`), pnpm 12.8.1 (`npm i -g pnpm@12.8.1` si corepack échoue).

```sh
# copier ce dossier hors de docs/ (oxfmt et oxlint du dépôt l'excluent), puis :
mkdir legacy && cp -r <racine de l'ancien site>/{index.html,js,app.css,design-system.css,logo.png} legacy/   # pour l'E2E legacy
export PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium   # sessions cloud seulement
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 STORYBOOK_DISABLE_TELEMETRY=1
pnpm install --frozen-lockfile
pnpm check
```

Variante Router seul : `pnpm exec vite build -c vite.router.config.ts` (sortie dans `dist-router/`). Mesures d'hydratation : servir le build par `node scripts/serve-pages.ts --root dist/client --port 5180`, puis `node tools/hydration-spike.mjs` (URL modifiable par `SPIKE_URL`) ; `tools/frames.mjs` échantillonne le passage squelette → contenu image par image. Ces outils lancent Chromium avec le chemin `/opt/pw-browsers/chromium` écrit en dur.

## Versions

Celles de `package.json` (exactes) et de `pnpm-lock.yaml` ; elles sont reprises au PLAN § 2. `@tanstack/router-plugin` 1.168.42 ne sert qu'à la variante Router seul. `pnpm-workspace.yaml` contient les ajouts nécessaires : `trustPolicyExclude: [semver@6.3.1]`, `allowBuilds.esbuild: false`, `peerDependencyRules.allowedVersions.msw: "3"`, `minimumReleaseAgeExclude` (msw 3.0.2 publié le jour de l'essai).

## Ce que P0 reprend, et ce qu'il laisse

Reprendre : configurations (`package.json` sans `@tanstack/router-plugin`, `pnpm-workspace.yaml`, `.npmrc`, `.editorconfig`, `.gitignore`, `tsconfig.json`, `.oxlintrc.json`, `.oxfmtrc.json`, `knip.json`, `lefthook.yml`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.storybook/`), `scripts/`, la fixture `e2e/fixtures.ts`, et comme modèles `src/router.tsx`, `src/routes/`, `src/intl/`, `src/test/`. Adapter selon la liste du PLAN P0 (exclusions, scripts, projets Vitest et Playwright, `.env.*`).

Laisser : `router-only/`, `vite.router.config.ts`, `tools/`, les stories et tests d'essai (`A11yViolation`, `Dialog`, `Whitespace`, `BookingForm`), `src/mocks/apps-script.ts` (remplacé par `createFakeAppsScript` en P1).
