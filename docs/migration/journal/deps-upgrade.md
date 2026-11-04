# Journal de la session « montée des dépendances »

*4 novembre 2026. Bookmark `claude/deps-upgrade-2026-11`, partie de `4365dc3` (intégration après [#8](https://github.com/TheGaudis/reservations-restaurants/pull/8)). Demande de l'orchestrateur : monter toutes les dépendances de `package.json` à leur dernière version (mineures et correctifs) et garder la vérification verte.*

## Fait

- 33 paquets montés, dont `lefthook` et `oxc-transform-react` sous leur dernière version ; `@axe-core/playwright` reste en 4.13.0 (tableau ci-dessous). `package.json` garde des versions exactes.
- `pnpm exec msw init public/ --save` : `public/mockServiceWorker.js` passe à `PACKAGE_VERSION = '3.0.3'`, somme de contrôle inchangée ; `msw.workerDirectory` inchangé.
- `pnpm-workspace.yaml` : entrée `minimumReleaseAgeExclude: [msw@3.0.2]` retirée (msw 3.0.3 a plus d'un jour) ; `overrides: { axe-core: 4.13.0 }` ajouté (décision 2).
- `vitest.config.ts` : Vitest 5.1 déprécie `test.browser.api` (« `test.browser.api` was deprecated in Vitest 5. Use `test.api` instead. »). La fonction `browser(portOffset)` devient `browserMode(portOffset)`, qui renvoie `{ api, browser }` à étaler dans `test` ; le port fixe et `strictPort` restent (vérifié : Vitest tente bien le port 63315 quand un autre processus l'occupe).
- `e2e/regression/staff-open-day.spec.ts` (REG-33, « picker ») : une attente `await expect(pickerDay(page, TODAY)).toBeFocused()` ajoutée entre la seconde ouverture du sélecteur et `ArrowDown` (décision 3). Aucune assertion existante modifiée.
- `pnpm dedupe` lancé une fois pendant l'enquête sur axe-core : le lockfile en sort plus remanié que la seule montée (≈ 2 600 lignes de diff).

## Versions

| Paquet | Avant | Après |
| --- | --- | --- |
| `@base-ui/react` | 1.8.0 | 1.9.0 |
| `@tanstack/react-query` | 5.104.1 | 5.105.3 |
| `@tanstack/react-router` | 1.170.41 | 1.170.46 |
| `@tanstack/react-start` | 1.168.60 | 1.169.4 |
| `react`, `react-dom` | 19.3.0 | 19.3.1 |
| `react-intl` | 12.1.3 | 12.1.6 |
| `zustand` | 5.0.15 | 5.0.16 |
| `@axe-core/playwright` | 4.13.0 | **4.13.0** (4.14.0 disponible, décision 2) |
| `@formatjs/cli` | 6.16.32 | 6.18.0 |
| `@formatjs/unplugin` | 1.2.12 | 1.2.17 |
| `@playwright/test`, `playwright` | 1.63.0 | 1.64.1 |
| `@storybook/addon-a11y`, `@storybook/addon-vitest`, `@storybook/react-vite`, `storybook` | 10.6.1 | 10.6.5 |
| `@tanstack/eslint-plugin-query` | 5.104.1 | 5.105.3 |
| `@tanstack/react-query-devtools` | 5.104.1 | 5.105.3 |
| `@types/node` | 26.6.4 | 26.6.6 |
| `@vitejs/plugin-react` | 6.1.1 | 6.2.1 |
| `@vitest/browser-playwright`, `@vitest/coverage-v8`, `vitest` | 5.0.3 | 5.1.0 |
| `eslint-plugin-formatjs` | 8.1.0 | 8.1.3 |
| `knip` | 6.39.0 | 6.44.1 |
| `lefthook` | 2.1.16 | **2.2.1** (2.2.2 disponible, décision 1) |
| `msw` | 3.0.2 | 3.0.3 |
| `oxc-transform-react` | 0.145.0 | **0.156.0** (0.157.0 disponible, décision 4) |
| `oxfmt` | 0.71.0 | 0.76.0 |
| `oxlint` + `oxlint-tsgolint` | 1.86.0 + 7.0.2003 | 1.91.0 + 7.0.2005 |
| `vite` | 8.3.2 | 8.3.5 |
| `axe-core` (transitif, `overrides`) | 4.13.0 | 4.13.0 |

Inchangés (déjà à jour) : `@fontsource-variable/*` 5.3.0, `@tanstack/react-form` 1.33.5, `valibot` 1.5.0, `@msw/playwright` 0.7.0, `@tanstack/eslint-plugin-router` 1.162.0, `@tanstack/react-router-devtools` 1.167.2, `@types/react`, `@types/react-dom` 19.3.0, `msw-storybook-addon` 3.0.3, `typescript` 7.0.2, `vitest-browser-react` 2.3.0, `pnpm` 12.8.1.

## Décisions

1. **`lefthook` 2.2.1.** `pnpm update --latest` refuse 2.2.2 : « High-risk trust downgrade for "lefthook@2.2.2" (possible package takeover) ». Cette version a été publiée à la main (`_npmUser` : `mrexox`) sans attestation de provenance, alors que 2.2.1 et les précédentes viennent de GitHub Actions avec provenance SLSA. Pas d'entrée `trustPolicyExclude` : 2.2.1 reste la dernière version signée.
2. **axe-core retenu en 4.13.0.** axe-core 4.14 retire l'étiquette `experimental` de la règle `label-content-name-mismatch` (WCAG 2.5.3, nom accessible contenant le texte visible) : 15 stories échouent (« Elements must have their visible text as part of their accessible name »). Deux cas : le déclencheur du sélecteur de date, nommé « Date » par son `<label>` (06 § 3.1) et qui affiche la date longue (`aria-describedby`) ; les boutons du 1er du mois, qui affichent « 1 » et s'appellent « jeudi 1er octobre 2026… ». Les autres jours passent. Les deux noms viennent de la spec et des scénarios REG-33 : les changer revient au responsable. `@axe-core/playwright` reste en 4.13.0 (il exige `~4.14.0` en 4.14) ; `@storybook/addon-a11y` demande `^4.2.0` et tirait 4.14 de son côté, d'où `overrides: { axe-core: 4.13.0 }` dans `pnpm-workspace.yaml`, commenté.
3. **REG-33 avec Playwright 1.64.** Le scénario « picker » échoue à chaque essai (3 sur 3) sur la ligne `await expect(pickerDay(page, "2026-10-12")).toBeFocused()` (« unexpected value "inactive" »). Bissection : Playwright 1.64 seul sur le lockfile d'origine suffit à le faire échouer ; Base UI 1.8 et le couple plugin-react 6.1 / oxc 0.145 n'y changent rien. Un test de diagnostic montre la cause : avec 1.64, `dateButton.click()` rend la main pendant que le focus est encore sur le déclencheur ; Base UI déplace le focus vers le jour choisi juste après, et `ArrowDown` part sur le déclencheur. L'attente ajoutée reprend l'assertion de la première ouverture du même scénario (ligne 40). Le site ne change pas.
4. **`oxc-transform-react` 0.156.0.** `@vitejs/plugin-react` 6.2.1 déclare le peer `>=0.152.0 <0.157.0` ; 0.157.0 échoue à l'installation (`strictPeerDependencies`). 0.156.0 est la plus récente dans l'intervalle.
5. **Chromium.** Playwright 1.64 attend la révision 1248, déjà présente dans `~/Library/Caches/ms-playwright` : aucun `playwright install` lancé. La révision 1243 de Playwright 1.63 n'y est plus.

## Vérification

- `pnpm install --frozen-lockfile` : vert, aucun avertissement de peer ni de build.
- `pnpm check` : vert (211 fichiers, 2 855 tests ; knip vert ; plus d'avertissement de dépréciation de Vitest). oxfmt 0.76 et oxlint 1.91 ne demandent aucun changement de code.
- `pnpm build:e2e` puis `git diff --exit-code src/routeTree.gen.ts translations/fr.json` : aucun écart.
- `pnpm test:e2e --project=react-only --project=legacy --project=react` : 172 sur 172 (`e2e/a11y.spec.ts` compris, avec axe-core 4.13).
- `pnpm build && pnpm budget` : 219,6 kB de JS (219,4 avant, limite 240), 12,3 kB de CSS (12,2 avant, limite 25). `dist/client/mockServiceWorker.js` absent, aucun `setupWorker` dans `dist/client`.

## Overrides

- Aucun override oxlint. `.oxlintrc.json`, `.oxfmtrc.json` et `tsconfig.json` inchangés.
- `pnpm-workspace.yaml` : `overrides: { axe-core: 4.13.0 }` (décision 2).

## Reste

- Trancher les deux noms accessibles de la décision 2 (déclencheur « Date » et jours « 1er »), puis monter `@axe-core/playwright` en 4.14 et retirer l'`overrides`. Avec axe-core 4.14, `e2e/a11y.spec.ts` devrait signaler le même déclencheur (non vérifié).
- `lefthook` 2.2.2 : attendre une version publiée avec provenance.
- `oxc-transform-react` 0.157 : attendre une version de `@vitejs/plugin-react` qui l'accepte.

## Pour PLAN § 2 (orchestrateur)

- Remplacer toutes les versions du tableau par la colonne « Après ».
- Ligne `pnpm` : `minimumReleaseAgeExclude` est vide (clé retirée) ; ajouter `overrides: { axe-core: 4.13.0 }` et sa raison.
- Ligne `oxc-transform-react` : 0.156.0 ; `@vitejs/plugin-react` 6.2.1 déclare `>=0.152.0 <0.157.0`.
- Ligne `lefthook` : 2.2.1, 2.2.2 refusée par `trustPolicy: no-downgrade` (pas de provenance).
- Ligne `@axe-core/playwright` : 4.13.0 tant que la règle `label-content-name-mismatch` échoue.
- Ligne `vitest` : le port du serveur du mode navigateur se règle par `test.api` (`test.browser.api` déprécié en 5.1).
