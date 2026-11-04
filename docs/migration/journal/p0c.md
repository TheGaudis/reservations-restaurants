# Journal de la session P0 (c) — CI, dependabot, CLAUDE.md, README

*3 octobre 2026. Branche `claude/p0c-ci`, partie de la pointe de l'intégration qui contient P0 (a) et P0 (b) (`f598e9b`). Pas d'accès en écriture à GitHub : l'orchestrateur pousse la branche et lit la CI.*

## Fait

- `.github/workflows/ci.yml` : `push` sur `main` et `claude/frontend-react-migration-lw5zfz`, `pull_request`, `workflow_dispatch` ; `permissions: {}` puis `contents: read` par job (`pages: write` et `id-token: write` pour `deploy`) ; `persist-credentials: false` ; `concurrency` (annulation pour les PR seulement) ; `bash -eo pipefail` pour chaque `run`.
  - `check` : `pnpm i18n:extract` + `git diff --exit-code translations/fr.json`, `\\u00A0` interdit dans `translations/fr.json`, `pnpm format:check`, `pnpm lint -f github`, `pnpm typecheck`, `pnpm test:node`, `pnpm knip`, budget d'effets S6.
  - `browser` : cache `~/.cache/ms-playwright` (clé : version de Playwright), `pnpm exec playwright install --with-deps chromium`, `pnpm test:browser`, puis `pnpm test --project=storybook` dès que `.storybook/main.ts` existe.
  - `e2e` : `pnpm build:e2e`, `git diff --exit-code src/routeTree.gen.ts`, installation de Chromium, `pnpm test:e2e --project=react-only --project=legacy`, `pnpm test:e2e --project=react --grep "$E2E_REACT_GREP"` si la variable du job n'est pas vide, avertissement si la variable de dépôt manque, `pnpm build` avec `BASE_PATH=/reservations-restaurants/` et `VITE_APPS_SCRIPT_URL: ${{ vars.VITE_APPS_SCRIPT_URL }}`, absence de `mockServiceWorker.js` et de `setupWorker`, `pnpm budget`, artefacts `dist-client` et `playwright-report` (30 jours, le rapport même en cas d'échec).
  - `deploy` : `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`, `needs: [check, browser, e2e]` ; `download-artifact` de `dist-client` → `upload-pages-artifact` → `deploy-pages`.
- SHA relevés par `git ls-remote --tags` : `actions/checkout` v7.0.1 `3d3c42e5aac5ba805825da76410c181273ba90b1`, `pnpm/setup` v3.0.0 `fbda4c85fc2e1e08721cd8763afea8f48d60f024` (commit de l'étiquette annotée `e0ed22a`), `actions/cache` v6.1.0 `55cc8345863c7cc4c66a329aec7e433d2d1c52a9`, `actions/upload-artifact` v7.0.1 `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`, `actions/download-artifact` v8.0.1 `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c`, `actions/upload-pages-artifact` v5.0.0 `fc324d3547104276b827a68afc52ff2a11cc49c9`, `actions/deploy-pages` v5.0.1 `368f82528645a54fb793d4d04e342629a3f51346`. Entrées vérifiées dans l'`action.yml` de chaque commit.
- `.github/dependabot.yml` : npm et `github-actions`, hebdomadaire, `cooldown.default-days: 7`, groupes `tanstack`, `vite`, `react`, `types`, `storybook`, `formatjs`, `oxc`, `playwright` ; un seul groupe pour les actions.
- `CLAUDE.md` : annexe C à jour (barrière `useHydrated()`), commandes vérifiées.
- `README.md` : section « Développement », tableau « Contenu du dépôt » (`legacy/` et dossiers du nouveau site), chemins de l'ancien site sous `legacy/`, encart « Migration en cours ». Sections Apps Script inchangées.
- `src/routes/routes.test.tsx` renommé `src/routes/-routes.test.tsx` : l'avertissement « does not export a Route » disparaît de `pnpm build`, les 4 tests tournent toujours (projet `browser`), `src/routeTree.gen.ts` ne change pas.

## Vérifications locales du workflow

- YAML : `actionlint` 1.7.12 avec `shellcheck` 0.11.0 sans erreur ; validation par les schémas SchemaStore (`github-workflow.json`, `dependabot-2.0.json`) sans erreur ; `pnpm format:check` couvre les deux fichiers.
- Chaque `run` des jobs `check`, `browser` et `e2e` exécuté tel quel dans le worktree par un petit lanceur (`bash --noprofile --norc -eo pipefail`, `CI=true`, variable de dépôt vide), sauf `playwright install` (interdit ici) : tout vert. E2E : 5 tests `react-only`, `legacy` sans test ne fait pas échouer la commande. Build de production sans `VITE_APPS_SCRIPT_URL` : vert, budget JS 121,9 kB et CSS 2,4 kB.
- Contrôles négatifs : un `\\u00A0` ajouté à `translations/fr.json` fait échouer l'étape ; S6 échoue sur un effet sans commentaire au-dessus et sur trois effets commentés, passe sur deux, ignore les `*.test.*`.
- Runner `ubuntu-latest` : `playwright.config.ts` et `vitest.config.ts` ne passent `executablePath` que si `PLAYWRIGHT_CHROMIUM_EXECUTABLE` est défini ; sans elle, ils prennent le Chromium de `playwright install`.

## Décisions

1. **`pnpm/setup` v3.0.0** (toolchain § 6, element-admin) plutôt que `setup-node` : pnpm lu dans `packageManager`, Node dans `.node-version` (`node-version-file` explicite), cache du store, `require-lockfile: true` (installation `--frozen-lockfile`).
2. **`react-only` et `legacy` dans une seule commande Playwright** : un seul rapport HTML, et `legacy` sans test ne fait pas échouer (« No tests found » seulement si aucun test au total). P1 (a1) n'a rien à changer dans la CI.
3. **Projet `react` filtré par `E2E_REACT_GREP`** (variable du job `e2e`, vide aujourd'hui, étape sautée). P4 à P6 ne touchent pas `.github/` : l'orchestrateur renseigne l'expression (par exemple `@G-01|@G-03|@G-07`) ; P7 (a) supprime le filtre. Chaque étape Playwright écrit son rapport dans son dossier (`PLAYWRIGHT_HTML_OUTPUT_DIR`).
4. **Stories** : étape conditionnée par `hashFiles('.storybook/main.ts')`, active dès que P3 (0) livre Storybook, sans modifier `.github/`.
5. **Cache des navigateurs** (PLAN P0 (c)) : clé = version de Playwright ; `playwright install --with-deps chromium` tourne toujours (bibliothèques système).
6. **Job `deploy`** : il récupère l'artefact `dist-client` du même run. `upload-artifact` et `upload-pages-artifact` excluent les fichiers cachés : `dist/client/.vite/manifest.json` (lu par `pnpm budget`) n'est pas publié, ce qui ne gêne pas.
7. **S6 en CI** : au plus 2 `useEffect`/`useLayoutEffect` hors tests, stories et `src/test/`, chacun avec un commentaire sur la ligne au-dessus. `CLAUDE.md` le dit.
8. **Contrôles ajoutés hors liste** : absence de msw dans `dist/client` (PLAN § 7, R-28) ; avertissement `::warning::` si `VITE_APPS_SCRIPT_URL` manque ; `timeout-minutes` par job.
9. **`if grep …; then exit 1; fi`** au lieu de `! grep …` : sous `bash -e`, une commande niée ne fait pas échouer l'étape si elle n'est pas la dernière ligne.
10. **dependabot** : groupes `oxc` (oxlint et oxlint-tsgolint montent ensemble, R-14) et `playwright` (`playwright` et `@playwright/test` à la même version) ajoutés aux six demandés ; Vitest et `oxc-transform-react` dans `vite`. GitHub ne lit ce fichier que sur la branche par défaut : il agit à partir de P8.
11. **`CLAUDE.md`** (148 lignes) : écarts à l'annexe C limités à « Commandes » (`pnpm install`, `check:fast` en pre-push, `--project=` avec `=`, ports `E2E_*_PORT`, oxlint et oxfmt par les scripts, jobs de la CI), au commentaire d'effet sur la ligne au-dessus et au préfixe `-` des tests de `src/routes/`.
12. **README** : chemins de l'ancien site passés sous `legacy/` dans « Brancher la page », « Héberger » et la charte (pas de réécriture). « Configuration manquante » pour un build sans URL : le bandeau arrive avec P4 (a) (`ConfigBanner`) ; d'ici là la page garde le squelette.

## Contradictions et remarques

- Lancement : « oxlint -f github » ; P0 (a) impose `--disable-nested-config` : la CI appelle `pnpm lint -f github` (pnpm transmet l'option, sortie `::error file=…` vérifiée).
- `.github/` appartient à P0 (c), puis P7 (a) et P8 (PLAN § 5.0), alors que le lancement prévoit les stories « à partir de P3 » et le projet `react` « quand P4 commence » : résolu par les décisions 3 et 4 ; seule la valeur de `E2E_REACT_GREP` demande une modification de l'orchestrateur.
- Critère « Pages sert toujours l'ancien site » : `thegaudis.github.io` refusé par le proxy de la session (CONNECT 403). Preuve indirecte : `git ls-remote` donne `main` = `7f5e179`, qui a `index.html` à la racine et aucun `.github/` ; cette session n'a rien poussé.
- `package.json` (P0 (a)) : `test:e2e:legacy` vaut `playwright test --project legacy` ; `--project` prend une liste, donc `pnpm test:e2e:legacy e2e/regression/x.spec.ts` lirait le fichier comme un projet. Changement voulu : `playwright test --project=legacy`.

## Versions

Aucun paquet ajouté ni changé. Outils de vérification (`actionlint`, `shellcheck`) téléchargés dans le dossier temporaire de la session, hors du dépôt.

## Overrides oxlint

Aucun.

## Reste à faire

- Orchestrateur : pousser, puis vérifier sur la PR `check`, `browser` et `e2e` verts, `deploy` « skipped », artefact `dist-client` téléchargeable ; dans le log de `pnpm/setup`, Node 22.22.2 ; seuils d'hydratation (600 ms) tenus sur le runner (`retries: 1` en CI).
- Orchestrateur, dès P4 : renseigner `E2E_REACT_GREP` dans `ci.yml` ; P7 (a) : retirer le filtre.
- P8 : job `deploy` à activer en pratique (environnement `github-pages`, source Pages « GitHub Actions ») ; README réécrit.

## Pour la PR

Titre : « P0 (c) : CI, dependabot, `CLAUDE.md`, README ».

- CI sans déploiement sur la branche d'intégration et les PR : jobs `check`, `browser`, `e2e` ; `deploy` limité à un push sur `main` (inactif jusqu'à P8). Actions épinglées par SHA. Artefacts `dist-client` (site construit avec la variable de dépôt) et `playwright-report`.
- dependabot (actif une fois sur `main`), `CLAUDE.md` à jour, section « Développement » du README, test de route renommé `-routes.test.tsx`.

**Actions humaines (propriétaire du dépôt), avant P5 :**

1. Créer la variable de dépôt `VITE_APPS_SCRIPT_URL` : Settings > Secrets and variables > Actions > onglet Variables > New repository variable. Valeur : l'URL actuelle de `APPS_SCRIPT_URL` (`docs/spec/00` § 2.1), `https://script.google.com/macros/s/AKfycbzLVvpP6oSS-qCm01LZp_3BlP9PKQy6bBWDj2AHaJ4y6a4nvDIjTQRF0todJhZ0W_xu/exec`. Sans elle, le build de la CI passe avec un avertissement et l'artefact `dist-client` affiche « Configuration manquante ».
2. Vérifier que le script **déployé** répond à `getAdminState` (le nouveau site ne reprend pas le repli `checkPassword`, b-10). Depuis le poste du responsable : `curl -sL -X POST -H 'Content-Type: text/plain;charset=utf-8' -d '{"action":"getAdminState","password":"…"}' "$URL"`. La réponse doit être un état complet, pas `{ "error": … }` d'action inconnue ; sinon, mettre le script à jour (Déployer > Gérer les déploiements > Nouvelle version) avant P5. Ne collez le mot de passe dans aucun ticket ni aucune PR.

Aucun réglage Pages ni environnement GitHub avant P8.
