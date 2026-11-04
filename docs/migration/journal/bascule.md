# Journal de la session « bascule »

*4 novembre 2026. Bookmark `claude/bascule`, parti de `claude/frontend-react-migration-lw5zfz` (`7952c4e`). Phase P8 du PLAN : commit de bascule, sans aucune action sur GitHub. La branche `claude/p8-bascule` du 4 octobre, trop éloignée pour un rebase, a servi de source en lecture seule (README, `bascule.md`, `smoke-production.spec.ts`, tables des tests dorés).*

## Fait

- `legacy/` supprimé. Retirés avec lui : le projet Playwright `legacy` et son `webServer`, les scripts `serve:legacy` et `test:e2e:legacy`, l'entrée `legacy/**` des `ignorePatterns` de `.oxlintrc.json` et `.oxfmtrc.json`.
- E2E : branches `target(test.info()) === "legacy"` et `currentTarget()` retirées de `e2e/regression/` et `e2e/pages/` (côté `react` gardé, assertions inchangées), `e2e/pages/target.ts` supprimé (`Restaurant` passe dans `e2e/pages/home.ts`), `BLOCKED_FONT_PRELOAD` et ses `consoleLog.allow` retirés, `veilGone` et `bookingR1Total` retirés (lus par les seules branches `legacy`). Étiquettes `@parity`, `@changed:E-xx`, `@pN` et identifiants d'écran inchangés.
- REG-07 (`configMissingBanner`) et la variante I-00 de REG-40 (`printR1List (REG-40) — popup blocked`) perdent `@legacy-only` et ne gardent que leur branche `react`.
- Tests dorés supprimés (`src/test/legacy-golden.test.ts`, `src/test/legacy-scripts.ts`, `src/queries/local-cache.golden.test.ts`). Cas repris dans les tables `node` : `domain/capacity.test.ts` (restes fractionnaires et hors bornes), `domain/dates.test.ts` (dimanche, fin d'année, changements d'heure, 29 février, fins de mois), `intl/amounts.test.ts` (montants de `formatEuro`, séparateur des milliers E-20 sur 1 000 et 1 188 €), `queries/local-cache.test.ts` (copie de 15 jours, copie sans `config`). L'override `import/no-nodejs-modules` ne liste plus que `setup-node.ts`.
- `.oxlintrc.json` : `vitest/no-conditional-expect: off` retiré, son seul motif était `e2e/pages/target.ts` ; plus aucun `expect` conditionnel dans `e2e/`.
- Commentaires de provenance de `src/` : `legacy/app.css` devient `v1-final:app.css` (de même pour `design-system.css`, `index.html`, `js/*.js`), chemins lisibles par `git show` une fois le tag posé.
- CI : l'étape E2E lance `--project=react-only --project=react`. Le job `deploy` tourne aussi sur « Run workflow » de `main` (`workflow_dispatch`) : le README et `bascule.md` s'en servent pour republier après une erreur de variable ou un retour arrière.
- `e2e/smoke-production.spec.ts` : six vérifications en lecture seule du site publié (page, titre, deux colonnes, calendriers, copie locale, formulaire R1 ouvert puis annulé, `/collegue`, `/index.html`). `test` de Playwright sans les fixtures de `e2e/fixtures.ts` ; la fixture `readOnly` avorte toute requête au script autre qu'un GET. Projet `production` de `playwright.config.ts`, déclaré seulement quand `E2E_PRODUCTION` est définie (`pnpm test:e2e:production`), sans `webServer`.
- `scripts/serve-pages.ts` : l'option `--host` existait déjà (orchestrateur, P7 (b)) ; README et `CLAUDE.md` la documentent.
- `README.md` réécrit pour l'après-bascule, `CLAUDE.md` sans `legacy/`, `docs/migration/bascule.md` (checklist du § 7 à cocher, répétition du retour arrière, message aux collègues), colonne `legacy` de `parite.md` gelée (§ 7 du fichier), Statut de P8 dans `PLAN.md` (§ 0 point 4, ligne P8 du § 5.0).

## Décisions

1. **Projet `production` conditionnel.** Avec un projet toujours déclaré, `pnpm test:e2e` sans `--project` atteindrait le vrai site et le vrai script, contre `CLAUDE.md` (« Environnement »). La variable `E2E_PRODUCTION` remplace la configuration séparée de `claude/p8-bascule` (`playwright.production.config.ts`) : le projet reste dans `playwright.config.ts`, comme le demandait la session.
2. **REG-07 et I-00 gardés côté `react`.** Leur branche `react` vérifie deux écarts (aucun bandeau avec une URL valide, E-29 ; impression sans fenêtre ni toast « Autorisez », E-15). Les supprimer avec l'étiquette `@legacy-only` aurait retiré ces vérifications.
3. **`deploy` sur `workflow_dispatch`.** Sans lui, « Run workflow » sur `main` construit le site sans le publier, et le retour au nouveau site après un retour arrière demanderait un commit vide.
4. **`E2E_PRODUCTION_URL` abandonnée.** La variable de `claude/p8-bascule` servait à viser une fourche ; la répétition à blanc se vérifie à la main (`bascule.md` § 2).

## Vérification

- `pnpm check` : vert (159 fichiers, 1 499 tests ; knip vert).
- `pnpm build:e2e` puis `git diff --exit-code src/routeTree.gen.ts translations/fr.json` : aucun écart.
- `pnpm test:e2e --project=react-only --project=react` (`E2E_REACT_PORT=4351`) : 84 sur 84.
- `pnpm build` puis `pnpm budget` : 203,0 kB de JS (limite 240), 11,2 kB de CSS (limite 25).
- `test ! -e dist/mockServiceWorker.js && ! grep -rl setupWorker dist` : vrai ; `dist` contient `index.html`, `404.html`, `assets/`.
- `playwright test --list` sans `E2E_PRODUCTION` : aucun test de `smoke-production.spec.ts` ; avec, 6 tests sur le projet `production`. Le projet n'a pas été lancé contre le vrai site.
- `grep -rn legacy` (ts, tsx, json, yml, hors `docs/`) : plus aucun chemin vers `legacy/` ni le projet `legacy` ; restent des commentaires qui comparent au comportement de l'ancien site.

## Reste

Actions du propriétaire du dépôt, dans l'ordre de `bascule.md` § 3 et § 4 :

- poser le tag `v1-final` sur `main` ;
- environnement `github-pages` : autoriser `main` ;
- source Pages « GitHub Actions » juste avant la fusion ;
- fusionner la PR [#1](https://github.com/TheGaudis/reservations-restaurants/pull/1) dans `main` par un commit de fusion ;
- vérifier le déploiement, lancer `pnpm test:e2e:production`, faire une vraie réservation R1 et une commande R2, puis les supprimer en mode collègue.

Répéter le retour arrière sur une fourche avant le jour J (`bascule.md` § 2). Un mois après : retirer la lecture de secours de `reservations-textes`.

## Pour PLAN.md (orchestrateur)

Repris des journaux du 4 novembre (`arch-router.md`, `cleanup-css.md`, `intl-conventions.md`, `deps-upgrade.md`, `policy-checks.md`), non réécrits ici :

- Arbitrage 16 renversé (Router seul, plus de Start ni de `BrowserOnly`) : § 0 risque 1, § 1.4 invariant 2, § 2.1, R-01, R-02, R-03.
- § 2, tableau des paquets : versions « Après » de `deps-upgrade.md`, paquets retirés et ajoutés d'`arch-router.md`, `defineMessage` dans la ligne `react-intl`.
- § 3.1 : arborescence (`index.html`, `src/main.tsx`, sortie `dist/`, `legacy/` et tests dorés retirés, `smoke-production.spec.ts` et projet `production` rétablis par cette session), fichiers de `src/test/` retirés.
- § 3.10 : `defineMessage` à la place de `defineMessages`.
- Contrôles retirés : S2, S6, R-33, R-34, knip en une passe, `node-ny`, règles oxlint passées à `"off"` (`policy-checks.md`).
- P8 et § 7 : artefact `dist` (plus `dist/client`), `deploy` sur `push` et `workflow_dispatch` de `main` ; § 3.3 (R-21) : les tests dorés n'existent plus, leurs cas sont dans les tests `node`.
