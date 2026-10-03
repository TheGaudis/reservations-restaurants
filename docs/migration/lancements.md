# Messages de lancement des sessions

*Rédigé le 3 octobre 2026 à partir de la relecture d'exécutabilité du plan, mis à jour avec l'arbitrage 16 et les corrections de la révision du même jour. Ce fichier précise [`PLAN.md`](PLAN.md) § 5 sans le contredire ; en cas d'écart, le plan fait foi et l'orchestrateur corrige ce fichier.*

Chaque message = le **bloc commun** (§ 1) + la partie propre à la session. `{id}` vaut par exemple `p3b`. Chaque partie propre suit le même ordre : objectif, prérequis et contexte, lectures, livrables, critères d'acceptation, pièges, commandes, interdits. « Session » = une demi-journée de travail utile d'agent, CI comprise.

## 0. Découpage, vagues et ordre

31 sessions (P0 : 3, P1 : 5, P2 : 4, P3 : 4, P4 : 4, P5 : 6, P6 : 2, P7 : 2, P8 : 1), 35,5 j-p (43 avec 20 % de marge). Les sessions marquées ∥ peuvent tourner en même temps que les autres sessions ∥ de leur vague, **trois au plus à la fois**.

| Vague | Session | Contenu | Dépend de |
| --- | --- | --- | --- |
| 0 | P0 (a) | dépôt, `legacy/`, outillage à partir de `recherche/spike-integration/`, intl minimal, Vitest | — |
| 0 | P0 (b) | coquille Start, routes, styles, polices, scripts, Playwright, vérification d'hydratation, essai de la barrière client-only | P0 (a) |
| 0 | P0 (c) | CI, dependabot, `CLAUDE.md`, README | P0 (b) |
| 1 | P1 (a1) | isolation réseau, faux script (lecture + réservations publiques), fixtures, `TEST_NOW`, page objects (signatures), `parite.md`, test des étiquettes `@changed` | P0 |
| 1 | P1 (a2) | faux script : actions collègue, mot de passe, verrou | P1 (a1) |
| 2 | P1 (b) ∥ | scénarios publics et chargement (REG-01 à REG-26, REG-43) | P1 (a1), liste `@changed` validée |
| 2 | P1 (c) ∥ | scénarios du mode collègue (REG-27 à REG-38) | P1 (a2) |
| 2 | P1 (d) ∥ | impression et invariants (REG-39 à REG-42, variantes d'invariants) | P1 (a2) |
| 2 | P2 (a) ∥ | `domain/` complet (types d'abord) | P1 (a1) |
| 2 | P3 (0) ∥ | Storybook, intégration Vitest, icônes, Base UI, TanStack Form | P1 (a1) |
| 3 | P2 (b1) ∥ | `api/` : transport, erreurs, signaux, lecture doublée, lecture anticipée, schémas | premier commit de P2 (a) |
| 3 | P2 (c) ∥ | session, `background/`, `intl/dates.ts`, `intl/amounts.ts` | premier commit de P2 (a) |
| 3 | P3 (a) ∥ | boutons, retours, bascules | P3 (0) |
| 3 | P3 (b) ∥ | formulaires pré-liés | P3 (0) |
| 4 | P2 (b2) ∥ | `api/actions.ts`, `queries/`, copie locale, tests dorés | P2 (b1) |
| 4 | P3 (c) ∥ | calendrier, sélecteur de date | P3 (0), P2 (a), P2 (c) |
| 5 | P4 (a) | page, en-tête, chargement, actualisation, lecture anticipée, textes communs | P2, P3 |
| 6 | P4 (b) | calendriers câblés, fiches | P4 (a) |
| 7 | P4 (c) | formulaire R1, envoi, récapitulatif, briques communes | P4 (b) |
| 8 | P4 (d) | formulaire R2 | P4 (c) fusionnée |
| 9 | P5 (a) | session, garde, connexion, déconnexion, fabrique de mutations avec garde de session, schéma `/collegue` | P4 |
| 10 | P5 (b) ∥ | ouvrir et modifier un jour, sélecteur de date | P5 (a) |
| 10 | P5 (c) ∥ | plats | P5 (a) |
| 10 | P5 (d1) ∥ | liste et modification des réservations, fiches collègue | P5 (a) |
| 10 | P5 (e) ∥ | paramètres, totaux du panneau « Demain » | P5 (a) |
| 10 | P6 (a) ∥ | mécanique d'impression, documents R1 | P5 (a) |
| 11 | P5 (d2) ∥ | ajout d'une personne R1 et R2 | P5 (d1) |
| 11 | P6 (b) ∥ | documents R2, panneau « Demain » complet | P5 (e), P6 (a) |
| 12 | P7 (a) | parité complète sur `react`, correctifs | P4, P5, P6 |
| 12 | P7 (b) | axe E2E, budget, matrice, procédure de validation | P7 (a) |
| 13 | P8 | commit de bascule, workflow, README | P7 validée |

Interfaces à figer **avant** chaque vague parallèle (elles figurent dans les messages ci-dessous) : `TEST_NOW`, interface de `createFakeAppsScript`, isolation réseau et signatures des page objects (P1 (a1)) ; liste exacte des étiquettes `@changed:E-xx`, identique au PLAN § 4.2 (P1 (a1), validée par l'orchestrateur) ; `domain/types.ts`, `constants.ts`, `paris.ts`, `vouchers.ts` (premier commit de P2 (a)) ; icônes, décorateurs Storybook et `src/test/render.tsx` (P3 (0)) ; emplacements de `Page` et `intl/common-messages.ts` (P4 (a)) ; `IdentityFields`, `BookingSummary`, signatures de `useBookR1` et `useOrderR2` (P4 (c)) ; schéma de `/collegue`, emplacements de `StaffPage`, fabrique `mutations/staff/write.ts` avec garde de session (P5 (a)).

## 1. Bloc commun (à coller en tête de chaque message)

```text
Projet : réécriture React du site de réservation (dépôt TheGaudis/reservations-restaurants).
Branche d'intégration : claude/frontend-react-migration-lw5zfz. Ta branche : claude/{id}-<sujet>, créée depuis l'intégration à jour.
1. Lis dans l'ordre : CLAUDE.md ; docs/migration/PLAN.md § 0, § 1.4, § 3 en entier, § 4.2, § 6.2, puis ta phase au § 5 ;
   les sections de spec et de rapports listées plus bas. Lis .claude/skills/stop-slop/SKILL.md avant d'écrire commentaires, commits et docs.
2. La spec (docs/spec/) fait foi pour les textes et les comportements, sauf décision D-xx (PLAN § 4.1) ou écart E-xx (PLAN § 4.2) ;
   textes nouveaux : PLAN annexe F ; le plan fait foi pour l'architecture. Désaccord : choisis l'option la plus facile à défaire
   et note-la au journal (point 7).
3. Ne modifie jamais : Code.gs, legacy/, docs/spec/, docs/migration/recherche/, .claude/, PLAN.md (sauf autorisation ci-dessous).
4. Une PR par session vers l'intégration ; jamais de push sur main ni sur l'intégration ; aucun réglage GitHub ; pas de fusion toi-même.
5. Fichiers partagés dont tu n'es pas propriétaire (PLAN § 5.0, et liste « Ne touche pas ») : décris le changement voulu dans le
   compte rendu au lieu de le faire.
6. N'ajoute aucun paquet sauf mention contraire ; versions exactes du PLAN § 2, jamais « latest ».
7. Journal : docs/migration/journal/{id}.md — fait, reste à faire, décisions, contradictions plan/spec, versions changées, overrides oxlint.
8. Avant chaque commit : pnpm check:fast. Avant la PR : pnpm check, pnpm build:e2e, git diff --exit-code src/routeTree.gen.ts
   translations/fr.json, E2E de ton périmètre. Conflit sur un fichier généré : reprends la version de l'intégration et régénère.
9. Lint : corrige le code. Faux positif prouvé par un exemple minimal : override par motif de fichiers dans .oxlintrc.json, commenté,
   noté au journal. Jamais de oxlint-disable en ligne, de catégorie abaissée, d'option tsconfig assouplie. Pas de TODO dans le code.
10. Navigateurs : Chromium préinstallé désigné par PLAYWRIGHT_CHROMIUM_EXECUTABLE (/opt/pw-browsers/chromium), jamais
    playwright install. Aucun appel au vrai Apps Script : faux script de src/mocks/apps-script.ts, isolation réseau de
    e2e/fixtures.ts, .env.test, pnpm dev sur le faux script. Ne crée jamais de .env.real.local et ne lance pas pnpm dev:real.
11. Hydratation (arbitrage 16) : pendingMinMs garde sa valeur par défaut ; jamais pendingMinMs: 0 seul, jamais onRecoverableError.
12. Commits en français, « Zone : action (section de spec) », identifiants en anglais entre backticks.
13. Compte rendu final, 40 lignes au plus : lien de la PR ; chaque critère d'acceptation avec sa preuve (commande et résultat) ;
    écarts et décisions ; contradictions trouvées ; reste à faire ; fichiers partagés que tu aurais voulu modifier.
```

## 2. P0 — Squelette et outillage

### P0 (a) — Dépôt, ancien site déplacé, outillage, intl minimal

```text
{BLOC COMMUN, id = p0a}
Tu es la première session : CLAUDE.md, check:fast, .env.test et e2e/fixtures.ts n'existent pas encore. Tu crées les trois premiers ;
pour CLAUDE.md, recopie l'annexe C du plan (P0 (c) le complétera). PLAN.md : non modifiable.

Objectif : un dépôt où `pnpm install` puis `pnpm check` passent, l'ancien site intact dans legacy/, sans code applicatif.
À lire en plus : PLAN § 2, § 2.1, § 3.1 (arborescence, langue du code, scripts, knip, projets Vitest), § 3.10 (extraction,
lint FormatJS), § 3.11, P0, R-13, R-14, R-23, R-24, R-28, R-33 ; docs/migration/recherche/spike-integration/README.md et ses
configurations ; toolchain.md § 1 à 6 et « Pièges » ; element-admin-reference.md § 1.1, § 1.6, § 1.7.
Livrables :
1. Premier commit seul : `git mv index.html app.css design-system.css js legacy/` (logo.png, charte-graphique.pdf, Code.gs restent).
2. Copie des configurations de recherche/spike-integration/ (sans router-only/, vite.router.config.ts, tools/, stories et tests
   d'essai), puis EXACTEMENT les adaptations de PLAN P0 « Point de départ », aucune autre règle changée :
   - alias `@/*` et `@translations/*` ; tsconfig `include` du PLAN § 3.1 (".storybook/**/*", pas ".storybook") ;
   - `.node-version` = 22.22.2 ; `engines.node` = ">=22.18" ; pas d'engine-strict ni de devEngines (sessions sous 22.22.0) ;
   - `.gitignore` du PLAN § 3.1 ; `.npmrc` save-exact=true ;
   - `pnpm-workspace.yaml` du PLAN § 2 (trustPolicyExclude semver@6.3.1, allowBuilds esbuild et msw à false, peer msw "3") ;
     chaque nouveau refus de pnpm : false si le paquet marche sans, sinon true justifié ;
   - exclusions identiques dans .oxfmtrc.json, .oxlintrc.json et knip.json : legacy/**, docs/**, .claude/**, translations/**
     (oxfmt et oxlint), Code.gs, public/mockServiceWorker.js, src/routeTree.gen.ts, dist/**, coverage/**, storybook-static/**,
     playwright-report/**, test-results/** ;
   - overrides oxlint et réglages des 8 règles en conflit avec les extraits du plan (PLAN P0 et R-14), repris du spike ;
   - environnement DOM simulé et bibliothèque de tests de composants de toolchain-files/ absents ; script `preview` absent.
3. package.json : versions exactes du PLAN § 2 pour la pile P0-P2 (React, Start, Router, Query, valibot, zustand, react-intl,
   @formatjs/unplugin, @formatjs/cli, eslint-plugin-formatjs, Vite, plugin-react, oxc-transform-react 0.145.0, TypeScript, types,
   oxlint + oxlint-tsgolint, oxfmt, knip, lefthook, vitest, @vitest/browser-playwright, vitest-browser-react, @vitest/coverage-v8,
   @playwright/test, playwright, msw, @msw/playwright, @axe-core/playwright, devtools, polices @fontsource-variable). PAS Base UI,
   TanStack Form ni Storybook (P3 (0)). Liste knip `ignoreDependencies` temporaire, chaque entrée commentée « retirer en Px ».
4. Scripts du PLAN § 3.1 (dev, dev:real, build, build:e2e, serve, serve:legacy, typecheck, lint, lint:fix, format, format:check,
   i18n:extract, test, test:node, test:browser, test:e2e, test:e2e:legacy, budget, knip, check:fast, check, prepare ; storybook et
   build-storybook en P3 (0)) ; scripts Node en .ts (`node scripts/x.ts`).
5. vitest.config.ts sans plugin Start, avec @formatjs/unplugin et optimizeDeps.include : projets `node` (TZ Europe/Paris),
   `node-ny` (TZ America/New_York, src/domain et src/intl), `browser` (Chromium, locale fr-FR, timezoneId Europe/Paris ;
   launchOptions.executablePath = $PLAYWRIGHT_CHROMIUM_EXECUTABLE s'il est défini) ; une fabrique browser() par projet ;
   src/test/setup-browser.ts (worker msw, onUnhandledFrame: "error").
6. src/intl/{intl,formats,common-messages,types.d}.ts (PLAN § 3.10 : formats `as const`, ids typés par @translations/fr.json,
   onError → console.error), translations/fr.json, src/config.ts, src/vite-env.d.ts, .env.development (VITE_MOCK_API=1,
   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/FAKE/exec), .env.test (même URL factice), .env.example commenté.
Critères d'acceptation :
- `pnpm install --frozen-lockfile` puis `pnpm check` verts ; `pnpm format` ne change aucun fichier (git status vide) ;
- `git diff main --stat -M -- legacy/` ne montre que des renommages à 100 % ;
- un test node (format `euro` : 12.5 → "12,50␣€") et un test browser trivial passent DANS la session ;
- un id react-intl inconnu est refusé par tsc (test avec @ts-expect-error) ; un message est extrait dans translations/fr.json ;
- `! grep -F '\\u00A0' translations/fr.json`.
Commandes :
- pnpm install ; pnpm check ; pnpm format && git status --short (doit être vide) ;
- git diff main --stat -M -- legacy/ ; pnpm test:node ; pnpm test:browser ;
- pnpm why oxc-transform-react (doit rester en 0.145.x).
Ne fais pas : routes, router.tsx, styles, CI (sessions suivantes) ; pas de montée de version hors § 2 sans échec prouvé.
```

### P0 (b) — Coquille Start, scripts, Playwright, vérification d'hydratation

```text
{BLOC COMMUN, id = p0b}
PLAN.md : tu peux modifier la ligne « TanStack Start en mode SPA » du § 2.1 (mesures sur le vrai projet et résultat de l'essai)
et rien d'autre.
Objectif : la coquille servie par l'émulateur Pages, les scripts de build, Playwright prêt pour P1, et l'hydratation vérifiée
selon l'arbitrage 16 (Start conservé, squelette ≤ 600 ms accepté).
À lire en plus : PLAN § 2.1 (ligne Start et plan B), § 3.1, § 3.2 (tableau des routes), § 3.3.1, § 3.6, § 3.9 (G-01), § 3.11,
P0 (vérification d'hydratation, essai), S4, R-01, R-02, R-03, R-12, R-15 ; spike-integration/README.md (section R-01),
tools/hydration-spike.mjs et tools/frames.mjs ; tanstack-start.md § 2, § 3 et « Pièges » ; docs/spec/03 § 2, 08 § 1-3, 09 § 2.
Livrables :
1. src/router.tsx (getRouter, garde typeof window, Wrap Query + RawIntlProvider, defaultPendingMinMs par défaut),
   src/client.tsx (client de Start + démarrage du worker msw quand USE_MOCK_API, PLAN § 3.11 ; aucun onRecoverableError),
   routes/__root.tsx (shellComponent, head() : meta de 03 § 2.1, titre, favicon, preconnect crossOrigin anonymous ;
   <ScriptOnce>{earlyFetchScript}</ScriptOnce> provisoire), routes/index.tsx (squelette), routes/$.tsx (« Page introuvable »,
   annexe F), routes/index[.]html.tsx ; src/routeTree.gen.ts commité.
2. src/styles/{tokens,base,print}.css découpés de legacy/design-system.css (valeurs inchangées) ; polices auto-hébergées (D-23).
3. scripts/post-build.ts (404.html, mockServiceWorker.js retiré de dist/client), scripts/serve-pages.ts (types MIME, --root,
   --base, --port ; redirection sans barre finale, dossier → index.html, sinon 404.html en statut 404), scripts/check-budget.ts (S3).
4. `pnpm exec msw init public/ --save` (fichier versionné ; sans --save la commande attend une réponse et bloque).
   playwright.config.ts : Chromium (même règle executablePath que vitest), fr-FR, Europe/Paris, webServer = serve:legacy (4310)
   et serve (4311), projets `legacy` et `react` (e2e/regression), `react-only` (e2e/*.spec.ts), `production` (smoke-production).
   e2e/smoke.spec.ts (react-only) : racine, lien profond /collegue, /index.html redirigé, aucune erreur console.
5. Vérification d'hydratation (e2e/hydration.spec.ts, react-only, build de production) : addInitScript pose une copie factice et
   un MutationObserver qui horodate squelette et contenu ; réponse du script retenue 5 s ; console relevée. Même test avec
   reservations-textes seul. Critères : aucune erreur d'hydratation (#418, « Hydration ») ; contenu de la copie visible avant toute
   réponse ; squelette ≤ 600 ms ; aucun retour au squelette après le premier rendu du contenu.
6. Essai NON bloquant : barrière client-only autour du contenu de la page (useSyncExternalStore(subscribe, () => true, () => false),
   la route rend exactement PageSkeleton tant que la valeur vaut false) combinée à pendingMinMs: 0 sur la route publique.
   Réussite : squelette réduit à une frame, aucune #418, y compris avec CPU ×6 (5 essais). Sinon : retirer l'essai, garder 500 ms.
   Résultat et mesures au journal et dans la ligne Start du § 2.1. pendingMinMs: 0 sans barrière reste interdit.
   Bogue bloquant d'hydratation avec les réglages par défaut : arrête-toi, écris la table de substitution « Router seul » fichier
   par fichier au journal (PLAN § 2.1) et signale-le ; l'orchestrateur tranche.
Critères d'acceptation :
- pnpm check, pnpm build verts ; dist/client contient index.html, 404.html, assets préfixés par /reservations-restaurants/,
  sans mockServiceWorker.js ;
- pnpm build:e2e && pnpm test:e2e --project=react-only vert dans la session ; test Vitest de rendu de route (createMemoryHistory)
  et test node de getRouter() sans window verts ;
- pnpm dev sert la coquille sans aucune requête vers script.google.com ;
- budget de la coquille mesuré (kB gzip JS et CSS) et noté au journal ; mesures d'hydratation et résultat de l'essai au § 2.1.
Commandes :
- pnpm build && ls dist/client ; pnpm serve & curl -sI http://127.0.0.1:4311/reservations-restaurants/collegue (404 + coquille) ;
- pnpm build:e2e && pnpm test:e2e --project=react-only ; pnpm budget ; git diff --exit-code src/routeTree.gen.ts.
Ne touche pas : package.json (sauf scripts manquants), .oxlintrc.json (sauf override justifié), src/intl/.
```

### P0 (c) — CI, dependabot, CLAUDE.md, README

```text
{BLOC COMMUN, id = p0c}
Objectif : la CI vérifie tout sur la branche d'intégration et les PR, sans déployer ; le dépôt documente son usage.
À lire en plus : PLAN P0 (livrables (c)), § 3.1 (ci.yml), § 3.11 (environnements), § 7 (job deploy), R-04, R-28, R-29 ;
toolchain.md § 6 (GitHub Actions) ; element-admin-reference.md § 1.8 et § 11.7 ; recherche/toolchain-files/.github/workflows/ci.yml.
Livrables :
1. .github/workflows/ci.yml : `on: push` (branches main et claude/frontend-react-migration-lw5zfz), pull_request, workflow_dispatch ;
   permissions {} puis minimales par job ; persist-credentials: false ; concurrency.
   Jobs parallèles : `check` (i18n:extract + git diff --exit-code translations/fr.json, ! grep -F '\\u00A0' translations/fr.json,
   format:check, oxlint -f github, typecheck, test:node, knip, grep des effets S6 hors tests et stories) ; `browser`
   (playwright install --with-deps chromium, test:browser, et test --project=storybook à partir de P3) ; `e2e` (build:e2e,
   git diff --exit-code src/routeTree.gen.ts, playwright install --with-deps chromium, test:e2e --project=react-only puis
   --project=legacy, et --project=react filtré par étiquettes quand P4 commence ; puis build de production avec BASE_PATH et
   VITE_APPS_SCRIPT_URL depuis vars, budget, upload-artifact de dist/client et du rapport HTML). retries: 1 en CI seulement.
   Job `deploy` (upload-pages-artifact → deploy-pages) avec if: github.ref == 'refs/heads/main' && github.event_name == 'push'.
   Actions épinglées par SHA relevés avec `git ls-remote` (connu : actions/checkout v7.0.1 = 3d3c42e5aac5ba805825da76410c181273ba90b1),
   version en commentaire. Le build de production ne doit pas échouer si la variable de dépôt manque (bandeau affiché).
2. .github/dependabot.yml (npm + actions, cooldown 7 jours, groupes tanstack, vite, react, types, storybook, formatjs).
3. CLAUDE.md : version de l'annexe C du plan, commandes réelles vérifiées.
4. README.md : section « Développement » (installation, commandes, pnpm dev sur le faux script, .env.example, pnpm serve au lieu
   de vite preview) ; ne réécris pas les sections existantes sur Apps Script.
Critères d'acceptation :
- PR ouverte ; `gh pr checks --watch` : check, browser, e2e verts ; deploy « skipped » ; artefact dist/client téléchargeable ;
  si tu ne peux pas pousser ou lire la CI, dis-le : le critère passe à l'orchestrateur ;
- la description de la PR contient les deux actions humaines de P0 : variable de dépôt VITE_APPS_SCRIPT_URL (valeur = URL de
  00 § 2.1) et vérification que le script déployé répond à getAdminState (commande du PLAN P0) ;
- https://thegaudis.github.io/reservations-restaurants/ sert toujours l'ancien site (aucun déploiement depuis la branche).
Commandes :
- git ls-remote --tags https://github.com/<owner>/<action> pour chaque SHA ; gh pr create --base claude/frontend-react-migration-lw5zfz ;
- gh pr checks --watch ; gh run view --log-failed en cas d'échec ; gh run download (artefact dist/client).
Ne fais pas : réglages Pages ou environnements GitHub ; ne touche pas aux configurations d'outils de P0 (a).
```

## 3. P1 — Régression sur l'ancien site

### P1 (a1) — Isolation réseau, faux script (lecture et réservations publiques), fixtures, cadre de la suite

```text
{BLOC COMMUN, id = p1a1}
Objectif : poser le cadre que toutes les sessions suivantes utilisent : faux Apps Script, fixtures, horloge, isolation réseau,
page objects, matrice de parité, contrôle des étiquettes @changed. Tu fixes des interfaces partagées : respecte celles-ci à la lettre.
À lire en plus : PLAN § 1.5 (S1), § 4.1, § 4.2 (écarts E-xx), P1 (interfaces imposées), R-28, R-33 ; docs/migration/parite.md
en entier (conventions, jeu de base, REG-01 à REG-43) ; docs/spec/02 en entier, 03 § 1.1, 09 en entier ; Code.gs (doGet,
addBookingR1, addBookingR2Multi : la sémantique du faux script vient de là) ; spike-integration/e2e/ et src/mocks/ ;
element-admin-reference.md § 8 ; tanstack-query.md § 9.
Interfaces imposées :
- src/test/clock.ts : `TEST_NOW = Date.parse('2026-10-05T07:30:00.000Z')` (lundi 5 octobre 2026, 9 h 30 à Paris), `TODAY = '2026-10-05'`.
- src/mocks/apps-script.ts, module isomorphe (ni DOM ni node:*), une instance par test ou par story :
  `createFakeAppsScript(options?: { seed?: FakeDb; password?: string })` →
  `{ handlers, db, requests, setPassword(p), failNext(kind: 'html' | 'network' | 'error', message?), hold(): () => void }` ;
  les handlers acceptent `https://script.google.com/macros/s/:deploymentId/exec` pour tout identifiant.
  `requests` garde méthode, URL, en-têtes et corps. Champs du script tels quels (exception de nommage de src/mocks/**).
- src/mocks/fixtures/ : JSON des exemples de 02 et 03 § 1.1, plus `seed.ts` : le jeu de base de parite.md § 2, daté par rapport à TODAY.
- e2e/fixtures.ts : isolation réseau enregistrée EN PREMIER (abort de tout ce qui n'est pas 127.0.0.1 ou localhost, polices Google
  comprises), puis les handlers du faux script via @msw/playwright (passthrough de localhost ; repli : page.route, à noter) ;
  console stricte ; page.clock.setFixedTime(TEST_NOW) par défaut (install avant goto pour 10 h, minuit, inactivité, lecture doublée) ;
  exposition `fakeScript` aux tests.
- e2e/pages/ : signatures seulement (corps à compléter en (b), (c), (d)) : home.ts `gotoHome(page, search?)`, calendar.ts,
  day-card.ts, booking-r1.ts, order-r2.ts, login.ts, staff.ts, print.ts ; utilitaire `target(testInfo): 'legacy' | 'react'`.
- Étiquettes : `{ tag: ['@parity' | '@changed:E-xx', '@<identifiant d'écran>', '@p4' | '@p5' | '@p6', '@legacy-only'?] }`,
  titres en anglais (noms de code de parite.md), textes attendus en français.
Livrables :
1. Faux script : GET (état public, etag, ?since= → { unchanged }), addBookingR1, addBookingR2Multi (requestId, _duplicate,
   ajustement au stock, _bookingResult, _emailStatus), erreurs exactes de 02 § 4.4-4.5 et de Code.gs, page HTML d'erreur,
   réponse retenue (hold). Actions collègue : renvoyer { error } « non implémenté » (P1 (a2) les écrit).
2. Tests unitaires du faux script (projet node, src/mocks/apps-script.test.ts) contre les exemples de 02 ; src/mocks/browser.ts
   et node.ts.
3. Un test prouve l'isolation : une requête vers https://example.com échoue ; aucune requête ne sort vers script.google.com.
4. e2e/regression/smoke.spec.ts sur le projet legacy : G-04 affiché depuis le faux script.
5. parite.md : reprends sa structure ; ajoute les noms de fichiers des scénarios au fur et à mesure ; ne change ni les identifiants
   REG-xx ni les écarts sans accord de l'orchestrateur.
6. Test des étiquettes : l'ensemble des `@changed:E-xx` de e2e/regression/ (scénarios écrits ou déclarés en test.fixme de
   cadrage) est égal à la liste des identifiants observables du PLAN § 4.2 (E-xx dont la colonne Scénario n'est pas « n/a »).
   Signale la liste dans le compte rendu : l'orchestrateur la valide avant P1 (b).
Critères d'acceptation : pnpm check vert ; pnpm test:e2e:legacy vert dans la session ; signatures ci-dessus exportées telles quelles.
Commandes :
- pnpm test:node src/mocks ; pnpm test:e2e:legacy ; pnpm test:e2e:legacy --repeat-each 3 ;
- grep -rn "script.google.com" e2e src/mocks (seulement le motif des handlers et l'isolation).
Ne fais pas : scénarios autres que le smoke ; modification de legacy/ ; requête réelle même « pour voir ».
```

### P1 (a2) — Faux script : mode collègue

```text
{BLOC COMMUN, id = p1a2}
Objectif : compléter src/mocks/apps-script.ts avec toutes les actions protégées, sans changer son interface publique.
Déjà en place : faux script (lecture et réservations publiques), isolation réseau, TEST_NOW, seed, page objects (signatures),
parite.md. Après toi : P1 (c) et P1 (d) écrivent les scénarios collègue et impression sur ton faux script ; P5 s'en sert aussi.
Une action manquante ou un message inexact se paiera trois fois (tests, stories, E2E).
À lire en plus : docs/spec/02 § 1.7 (verrou), § 2 (mot de passe), § 4.1, § 4.3, § 4.7, § 5.2 ; 06 § 10 ; Code.gs (chaque action
listée en 02 § 4.1 ; ordre des contrôles et messages exacts) ; le journal docs/migration/journal/p1a1.md.
Livrables :
1. getAdminState, et chaque action de 02 § 4.7 (jours R1 et R2, plats, réservations, setConfigField), avec contrôle du mot de passe
   (« Mot de passe incorrect. »), verrou simulé, messages d'erreur exacts, état complet renvoyé ; jamais checkPassword ni addBookingR2.
2. `setPassword` change le mot de passe en cours de test (scénario « mot de passe changé », REG-31).
3. Tests unitaires par action (corps de 02 § 4.7 → effet sur db → réponse), y compris les erreurs.
4. Seed complété si besoin (réservations nominatives du lendemain pour I-03, I-04 ; ancienne réservation aux compteurs vides).
Critères d'acceptation : pnpm check vert ; chaque action de 02 § 4.1 utilisée par le site a au moins un test vert ;
smoke legacy toujours vert.
Pièges : getAdminState ne passe pas par le verrou (02 § 1.7) ; addDayR2 sur un jour existant n'ajoute que les plats de nom nouveau ;
editBookingR1 reçoit qte et prixTotal et les ignore (b-10) ; le prix 0 est enregistré comme vide (b-8) ; setConfigField avec ""
remet la valeur par défaut du script (`Restaurant 1` / `Restaurant 2` pour les noms, b-9).
Commandes :
- pnpm test:node src/mocks ; pnpm test:e2e:legacy (smoke) ;
- comparer chaque message d'erreur à Code.gs : grep -n "error:" Code.gs.
Ne touche pas : e2e/pages/*, e2e/fixtures.ts, interface de createFakeAppsScript (ajout de champs facultatifs seulement).
```

### P1 (b) — Scénarios publics et chargement

```text
{BLOC COMMUN, id = p1b}
Prérequis : la liste des étiquettes @changed:E-xx est validée par l'orchestrateur.
Objectif : les scénarios de régression du parcours public, verts sur le projet legacy.
Déjà en place : faux script complet pour le public, isolation réseau, page objects (signatures), parite.md, liste @changed validée.
À lire en plus : PLAN § 4.2, P1, annexe F ; parite.md (REG-01 à REG-26, REG-43) ; docs/spec/09 § 2-3, 03 § 2-3 et § 5, 04 en
entier, 05 § 2-6 ; journaux p1a1 et p1a2.
Périmètre : REG-01 à REG-26 et REG-43 (G-01 à G-05, G-07, P-01 à P-17 avec P-01b et P-02b, easter egg).
Livrables :
1. e2e/regression/{loading,calendar,public-r1,public-r2,misc}.spec.ts : un scénario = un état ou un parcours, déroulé et horloge
   de parite.md ; corps exacts lus dans fakeScript.requests.
2. Corps des page objects home, calendar, day-card, booking-r1, order-r2 : rôles, libellés et textes de la spec, jamais de classe
   ni d'id ; variante react écrite d'après le plan (calendrier en grid / gridcell, textes de l'annexe F).
3. Variantes @changed:E-xx : assertion legacy et assertion react, choisies par target(). REG-07 : @legacy-only.
4. parite.md, section « Public » : scénario et statut legacy = vert, react = à faire.
Critères d'acceptation : chaque identifiant du périmètre a au moins un scénario ; pnpm test:e2e:legacy vert 3 fois de suite ;
aucun sélecteur CSS de classe ou d'id dans e2e/.
Pièges : l'easter egg ouvre YouTube : vérifier l'URL du popup sans la charger (isolation réseau) ; page.clock installé avant goto.
Commandes :
- pnpm test:e2e:legacy --grep "@p4" --repeat-each 3 ;
- grep -rnE "locator\('[.#]" e2e (doit être vide).
Ne touche pas : src/mocks/** (demande à l'orchestrateur), e2e/fixtures.ts, sections « Collègue » et « Impression » de parite.md.
```

### P1 (c) — Scénarios du mode collègue

```text
{BLOC COMMUN, id = p1c}
Prérequis : liste @changed validée ; P1 (a2) fusionnée.
Objectif : les scénarios de régression du mode collègue, verts sur le projet legacy.
Déjà en place : faux script complet (P1 (a2)), isolation réseau, page objects publics (P1 (b) en parallèle : n'y touche pas).
Le site React n'existe pas encore : les variantes react des assertions suivent les textes du plan, de l'annexe F et de la spec.
À lire en plus : PLAN § 3.3.3 (garde de session, fermeture des panneaux), § 3.3.4, § 4.2, P1, P5 ; parite.md (REG-27 à REG-38) ;
docs/spec/06 en entier, 05 § 4.3, § 4.6, § 5.3, § 6.3, 09 § 4, 02 § 2 et § 4.7 ; journaux p1a1, p1a2.
Périmètre : REG-27 à REG-38 (L-01, G-06, G-08, C-02, C-04 à C-06, C-10, C-10b, C-11 à C-14, C-20 à C-24, C-30).
Livrables :
1. e2e/regression/staff.spec.ts (ou staff-*.spec.ts) ; parcours de référence REG-30 : connexion → ouvrir un jour → ajouter une
   personne → déconnexion par inactivité (page.clock.fastForward('10:01')) → plus aucun nom de la fixture dans la page.
2. Corps des page objects login.ts et staff.ts ; vérification des corps envoyés (password présent seulement pour les actions
   protégées, jamais pour addBookingR1 et addBookingR2Multi ; qte et prixTotal envoyés à editBookingR1).
3. Assertions communes (@parity) : après « Ouvrir un jour » et après Paramètres, le panneau reste ouvert ; après « Ouvrir un jour »,
   le calendrier du restaurant sélectionne la date ouverte (collegue.js l. 276-277).
4. parite.md, section « Collègue ».
Critères d'acceptation : chaque identifiant du périmètre a au moins un scénario ; pnpm test:e2e:legacy vert 3 fois de suite.
Pièges : même origine pour tous les tests, donc storageState neuf par test (défaut Playwright, à ne pas désactiver) ;
l'ancien site garde l'état complet après déconnexion (a-1) : côté legacy, l'assertion « plus aucun nom » relève de E-24 / E-17 ;
la variante react de REG-29 (déconnexion pendant une écriture retenue par hold()) n'a pas de pendant legacy.
Commandes :
- pnpm test:e2e:legacy --grep "@p5" --repeat-each 3 ;
- grep -rnE "locator\('[.#]" e2e (doit être vide).
Ne touche pas : src/mocks/**, e2e/fixtures.ts, page objects publics (demande un ajout dans le compte rendu), autres sections de parite.md.
```

### P1 (d) — Impression et invariants

```text
{BLOC COMMUN, id = p1d}
Prérequis : P1 (a2) fusionnée.
Objectif : scénarios d'impression et des invariants transverses, verts sur legacy.
Déjà en place : faux script complet, isolation réseau, page objects (signatures). P1 (b) et P1 (c) tournent en parallèle.
À lire en plus : PLAN § 1.4, § 3.3.1, § 3.3.5, § 3.8, R-21 ; parite.md (REG-39 à REG-42, section « Impression et invariants ») ;
docs/spec/07 en entier, 03 § 1-2 et § 5, 02 § 1.5, § 3.3, § 5 ; 09 § 5.
Périmètre : REG-39 à REG-42 (C-01, C-03, I-00 à I-04) ; variantes d'invariants de REG-02, REG-03, REG-25 et REG-29 si (b) ou (c)
ne les ont pas écrites (à coordonner par l'orchestrateur) : copie locale v1 (lecture < 14 jours, ignorée au-delà, sans etag
acceptée), since= envoyé, { unchanged }, lecture doublée à 6 s (hold + page.clock), nouvel essai à 1,5 s, cut-off à 10 h
(formulaire R2 ouvert), minuit, un ticket par commande.
Livrables :
1. e2e/regression/print.spec.ts (et invariants si besoin). Ancien site : capturer le popup, neutraliser print() dans le popup
   (addInitScript du contexte), lire le document produit. Côté react, I-00 et l'impression en fenêtre relèvent de E-15.
2. page object print.ts ; parite.md, section « Impression et invariants ».
Critères d'acceptation : chaque identifiant du périmètre a au moins un scénario ; suite legacy complète verte 3 fois de suite ;
durée de la suite notée au journal.
Pièges : page.clock doit être installé avant goto ; hold() retient la réponse côté Node, le minuteur de 6 s tourne côté page ;
Chromium préinstallé : les boîtes de marge @page existent (Chromium 131+), mais l'ancien site imprime dans un popup.
Commandes :
- pnpm test:e2e:legacy --grep "@p6" --repeat-each 3 ;
- pnpm test:e2e:legacy (suite complète, durée au journal).
Ne touche pas : src/mocks/**, e2e/fixtures.ts, autres sections de parite.md.
```

## 4. P2 — Domaine, API, données, session

### P2 (a) — `src/domain/`

```text
{BLOC COMMUN, id = p2a}
Objectif : toute la logique métier pure, sans texte ni React, prouvée par des tables de cas tirées de la spec.
À lire en plus : PLAN § 3.1 (domain/, règles de dépendance), § 3.2 (transformations pures), § 3.3.6 (modèle anglais), § 3.7,
annexe E, P2 ; docs/spec/00 § 2-3, 01 § 3, 04 § 5.2-5.3 et § 7, 05 § 2.1, § 2.3, § 3.2, 07 § 3-4 (regroupements) ;
appresaaristide-reference.md § 2.1 et § 6.1 ; docs/migration/recherche/appresaaristide/ (PROVENANCE.md, src/lib/dates.ts,
validators.ts, money.ts, convex/model/dates.ts, pricing.ts et leurs tests).
Ordre imposé :
1. Premier commit, poussé et signalé à l'orchestrateur dès qu'il est vert (P2 (b1) et (c) en dépendent) :
   domain/types.ts ÉCRIT À LA MAIN (source de vérité, PLAN § 3.3.6 : Settings, ServiceDayR1, StaffServiceDayR1, ServiceDayR2,
   StaffServiceDayR2, Dish, BookingR1, BookingR2, SeatTotal, PortionTotal, PublicState, FullState, WriteResponse, IsoDate,
   Restaurant, ServiceMode, entrées des actions BookingR1Input, OrderR2Input…), constants.ts, paris.ts, vouchers.ts.
   Ces types ne viennent pas de valibot : api/ s'y conformera (schémas nommés DishSchema…, test de types).
2. Puis dates.ts, gauge.ts, capacity.ts, pricing.ts, cutoff.ts, navigation.ts (CALENDAR_KEYS, selectDay, shiftPeriod, goToToday,
   publicSearch ; P4 le câble), validation.ts (validateurs, parseAmount, parseCount, stepCount ; formatEuro NON repris),
   bookings.ts, print.ts.
Règles : domain/ n'importe rien hors domain/ ; aucun texte produit ; chaque règle cite sa section de spec en commentaire ;
tests co-localisés X.test.ts en it.each, projets node ET node-ny pour dates, paris, cutoff ; dates de test autour de TEST_NOW
(src/test/clock.ts) et des changements d'heure (29 mars et 25 octobre 2026).
Critères d'acceptation (une table par ligne) : 01 § 3.1 à 3.8 (places restantes négatives comprises ; capacityClass capacité 20 :
20 à 10 available, 9 à 1 almostFull, ≤ 0 full ; statut R2 agrégé et null sans plat ; priceR1 ; r2Amounts ; orderAmounts un ticket ;
codage du ticket idempotent ; serviceMode ; isR2OrderingClosed 9 h 59 / 10 h 00 Paris, hiver et été, sous New York ; isPast) ;
05 § 2.1 (cases semaine, 42 cases mois, lundi d'abord) ; keyTargetIso pour chaque touche de 05 § 3.2, Page ↑ / ↓ borné (a-23) ;
selectDay et goToToday ne touchent qu'un restaurant (a-12 ; goToToday retire aussi reserver de ce restaurant) ;
couverture de src/domain ≥ 95 % des lignes (pnpm test:node --coverage).
Commandes :
- pnpm test:node src/domain --coverage ; pnpm vitest run --project=node-ny src/domain ;
- grep -rnE "from \"@/(api|queries|features|ui|intl)" src/domain (doit être vide).
Ne fais pas : textes (intl/ est en P2 (c)), api/, queries/, session/.
```

### P2 (b1) — `src/api/` : transport, erreurs, lectures, schémas

```text
{BLOC COMMUN, id = p2b1}
Prérequis : premier commit de P2 (a) fusionné (domain/types.ts).
Objectif : le client du script sans React ni Query : transport, erreurs typées, lecture doublée, lecture anticipée, schémas
qui valident et traduisent les réponses vers les types de domain/types.ts.
À lire en plus : PLAN § 3.3 (queryFn), § 3.3.1 (étapes 2 et 6), § 3.3.6, § 3.11 (early-fetch vide quand USE_MOCK_API), R-07 à R-11,
R-18, R-22 ; docs/spec/02 § 1, § 3, § 4.3-4.5, § 5 ; 03 § 2 ; tanstack-query.md § 3-7, § 10-13 ; react-architecture.md § 5.
Livrables : api/errors.ts, transport.ts, signals.ts, hedged-read.ts, early-fetch.ts (texte du script inline + takeEarlyFetch),
state.ts, request-id.ts, schemas.ts (DishSchema, PublicStateSchema, FullStateSchema, ReadResponseSchema, WriteResponseSchema…,
transformations annotées `(x): Dish => …`).
Règles : champs du script seulement à la frontière (api/schemas.ts, api/early-fetch.ts ; api/actions.ts en P2 (b2)) ; test de types
`expectTypeOf<v.InferOutput<typeof DishSchema>>().toEqualTypeOf<Dish>()` pour chaque entité ; fetch intercepté par le faux script
unique (src/mocks/node.ts + createFakeAppsScript) ; vi.stubGlobal seulement pour le TypeError de fetch ; faux minuteurs avancés
explicitement.
Critères d'acceptation : 02 § 1.5 (seconde lecture à 6 000 ms et pas avant, première réponse gagne, perdante annulée, échec si toutes
échouent, nouvel essai unique à 1 500 ms, aucun pour { error } ni hors ligne) ; 30 s par essai (E-45) ; lecture anticipée consommée
une fois, seulement si since identique, doublage au temps restant ; GET sans en-tête, POST en text/plain;charset=utf-8 sans autre
en-tête (lus dans fakeScript.requests) ; « Mot de passe incorrect. » → PasswordRejectedError, autre { error } → BusinessError,
HTML ou TypeError → ServiceError ; chaque exemple JSON de 02 § 3.2, § 4.3, réponses § 4.4 et § 4.5 traduit (nombres en chaînes,
'' → null pour le prix, jamais 0, mention du ticket retirée et voucher déduit, champs _… sortis vers duplicate, emailStatus, bookingResult).
Commandes :
- pnpm test:node src/api ; pnpm typecheck ;
- grep -rn "react" src/api (doit être vide).
Ne touche pas : domain/ (demande un ajout à l'orchestrateur), queries/, api/actions.ts.
```

### P2 (b2) — `api/actions.ts`, `queries/`, copie locale, tests dorés

```text
{BLOC COMMUN, id = p2b2}
Prérequis : P2 (b1) fusionnée.
Objectif : les écritures typées, les options de requête, la copie locale v1 (lecture et écriture), la purge, et la preuve de
compatibilité avec l'ancien site.
À lire en plus : PLAN § 3.3 (réglages, gcTime 0 de l'état complet, queryFn), § 3.3.3 à § 3.3.6, R-18, R-21 ; docs/spec/02 § 4.4,
§ 4.5, § 4.7, 03 § 1 ; 06 § 10 ; legacy/js/donnees.js (loadCache, saveCache) et legacy/js/outils.js (formatEuro) en lecture seule ;
recherche/appresaaristide/src/lib/money.ts (formatEuro, référence seulement).
Livrables : api/actions.ts (une fonction par action de 02 § 4 utilisée par le site ; table SETTINGS_API_KEYS ; corps exacts,
qte et prixTotal d'editBookingR1 compris) ; queries/client.ts, state.ts (stateKeys, publicStateOptions, staffStateOptions avec
gcTime: 0), local-cache.ts (LocalCacheV1, restore, persist, readFallbackTexts, fromLocalCacheV1, toLocalCacheV1), purge.ts,
use-app-state.ts (useAppState, useIsFromCache, APP_START).
Tests dorés : exécuter loadCache et formatEuro de legacy/js/ dans un contexte vm Node avec un document minimal factice
(si les scripts exigent plus, iframe dans le projet browser ; décision au journal), sur les mêmes tables que le nouveau code.
Critères d'acceptation : corps produits = ceux de 02 § 4.4, § 4.5, § 4.7 (mode surplace/emporter, mention du ticket,
price "" compris) ; 03 § 1.1 : l'exemple relu, converti puis réécrit à l'identique (tarifs par String(Number(…))) ; copie > 14 jours
ignorée, sans etag acceptée, JSON invalide ignoré ; aucune écriture depuis l'état complet ni sans etag ; copie écrite relue par
loadCache de legacy/ ; unchanged → même référence et dataUpdatedAt rafraîchi ; purge sur un QueryClient réel (PLAN § 3.3.4) ;
mutations jamais rejouées (retry: false, networkMode: 'always' : une erreur réseau = un seul POST) ;
test grep : aucun champ du script hors api/schemas.ts, api/actions.ts, api/early-fetch.ts, queries/local-cache.ts, src/mocks/**
et leurs tests.
Commandes :
- pnpm test:node src/api src/queries ; pnpm test:node -t golden ;
- le test grep des champs du script tourne dans pnpm test:node.
Ne touche pas : domain/, api/ hors actions.ts, session/, background/.
```

### P2 (c) — Session, tâches de fond, textes de dates et de montants

```text
{BLOC COMMUN, id = p2c}
Prérequis : premier commit de P2 (a) fusionné.
Objectif : store de session, inactivité, horloge, déconnexion, démarrage des tâches de fond, et les fonctions de texte de intl/.
Déjà en place : domain/types.ts, constants.ts, paris.ts (P2 (a), premier commit) ; instance intl (P0). P2 (b1) tourne en parallèle.
Après toi : P4 et P5 branchent la session et l'horloge ; P3 (c) utilise les libellés de intl/dates.ts.
À lire en plus : PLAN § 3.3.4, § 3.4, § 3.10, R-20, R-25, R-26, R-32, R-34 ; docs/spec/06 § 1.6-1.8, 03 § 5.3, 00 § 3, 04 § 8 et § 9,
05 § 2.3 ; tanstack-query.md § 8 ; react-architecture.md § 3, § 7 ; element-admin-reference.md § 11.4-11.5 (en gardant D-26).
Livrables : session/session.ts (code du PLAN § 3.4), background/start.ts (idempotent), logout.ts (afterLogout, étapes 2 à 6 du
§ 3.3.4 ; peut appeler ui/feedback/toast.ts et router.navigate), inactivity.ts (événements click, keydown, mousemove, touchstart
de 06 § 1.6), clock.ts (useClock, useToday, useIsR2OrderingClosed), intl/dates.ts (formatLongDate avec ordinal, libellés de semaine
et de mois a-23), intl/amounts.ts (textes de montants, prix d'un plat, prix 0 non affiché), messages par defineMessages seulement.
Interfaces : purgeStaffSession vient de queries/purge.ts (P2 (b2)) ; si elle n'est pas encore fusionnée, injecte-la en paramètre
de startBackgroundTasks et teste avec un double ; toast.ts arrive en P3 (a) : même principe.
Critères d'acceptation : session ouverture, fermeture, endReason ; inactivité 10 min (activité qui repousse, visibilitychange, pageshow ;
tests du projet browser) ; horloge qui tique à 10 h 00 et à minuit heure de Paris ; formatLongDate 2026-10-01 → « jeudi 1er octobre
2026 », 2026-10-03 → « samedi 3 octobre 2026 », le 1er de chaque mois ; montants 12.5 → « 12,50␣€ », '4.95' → « 4,95␣€ »,
0 → « 0,00␣€ » ; pluriels 0, 1, 2 couverts, 1 et 2 tickets restaurant ; séparateur « ␣— » devant un prix ; libellé
« 28 sept. – 4 oct. 2026 ».
Commandes :
- pnpm test:node src/session src/intl ; pnpm test:browser src/background ; pnpm vitest run --project=node-ny src/intl ;
- pnpm i18n:extract && git diff translations/fr.json (nouveaux messages attendus).
Ne touche pas : domain/, api/, queries/.
```

## 5. P3 — Composants `ui/` et Storybook

### P3 (0) — Storybook, intégration Vitest, briques communes

```text
{BLOC COMMUN, id = p3-0}
Tu peux ajouter les paquets : @base-ui/react, @tanstack/react-form, storybook, @storybook/react-vite, @storybook/addon-vitest,
@storybook/addon-a11y, msw-storybook-addon (versions du PLAN § 2), et retirer leurs entrées de ignoreDependencies.
Objectif : Storybook dont chaque story est un test Vitest navigateur contrôlé par axe ; briques que (a), (b), (c) partagent.
À lire en plus : PLAN § 2 (ligne Storybook), § 2.1 (plan B Storybook), § 3.1 (.storybook/, vitest.config.ts), § 3.5, § 3.6, P3,
R-16, R-28 ; spike-integration/.storybook/, vitest.config.ts, src/ui/*.stories.tsx et tools/results/vitest-storybook-violation.log ;
ui-forms.md § 1, § 9-11 ; docs/spec/08 § 1-6.
Livrables :
1. .storybook/main.ts (framework @storybook/react-vite avec options.builder.viteConfigPath = ".storybook/vite.config.ts" ; addons
   a11y, vitest, msw), .storybook/vite.config.ts (react + formatjs + tsconfigPaths, SANS le plugin Start), preview.tsx en CSF Next
   (definePreview({ addons: [addonA11y(), addonMsw()], beforeEach: ({ msw }) => msw.use(...createFakeAppsScript().handlers) }),
   RawIntlProvider(intl), QueryClient neuf par story, classe d'accent paramétrable, a11y.test: "error").
2. Projet Vitest `storybook` (plugin storybookTest, sans setupFiles, sa propre fabrique browser()) inclus dans `pnpm test` ;
   scripts storybook, build-storybook ; storybook-static ignoré.
3. ui/icons.tsx (tous les SVG de 08 § 6.2, aria-hidden, currentColor) ; base Base UI (isolation, body relative, champs ≥ 16 px tactiles).
4. src/test/render.tsx : renderWithProviders asynchrone (vitest-browser-react 2), renderRoute (createMemoryHistory).
5. Une story et un test d'exemple (Spinner) qui prouvent la chaîne story → test → axe.
Plan B si addon-vitest refuse Vitest 5 : stories rendues par composeStories dans des tests Vitest navigateur + axe-core ; note au journal.
Critères d'acceptation : pnpm test lance les stories ; une violation axe volontaire fait échouer le test (puis retirée) ;
pnpm build-storybook passe ; pnpm check vert.
Pièges : storybookTest remplace test.include (projet séparé obligatoire) ; un même objet browser partagé entre deux projets fait
échouer Vitest au démarrage ; parameters.msw est déprécié (CSF Next) ; ajouter les dépendances à optimizeDeps.include si Vitest
recharge au premier lancement.
Commandes :
- pnpm install ; pnpm test --project=storybook ; pnpm build-storybook ; pnpm check ;
- pnpm storybook en tâche de fond seulement si nécessaire, arrêté avant la fin de session.
Ne fais pas : autres composants de ui/.
```

### P3 (a) — Boutons, retours, bascules

```text
{BLOC COMMUN, id = p3a}
Objectif : composants de ui/button, ui/toggle, ui/feedback, stylés aux jetons, accessibles, sans métier.
Déjà en place : Storybook branché sur Vitest avec axe, icônes, renderWithProviders (P3 (0)). P3 (b) tourne en parallèle.
Les fiches, formulaires et panneaux de P4 à P6 n'utiliseront que ces composants : leurs props doivent rester sans métier.
À lire en plus : PLAN § 3.5 (lignes correspondantes), § 3.6, R-16, annexe F (textes ui.*) ; docs/spec/08 § 1-5, § 4.2, § 4.4,
§ 4.12-4.16, § 6.3 ; 06 § 5.2 (ConfirmButton) ; 00 § 3 (showToast) ; ui-forms.md § 2-4, § 9.
Livrables : Button, IconButton (aria-label obligatoire dans le type), ConfirmButton (a-19 : minuteur local armé dans le gestionnaire,
gardé dans une ref, annulé à chaque armement et désarmement, nettoyé au démontage par la fonction de retour d'une ref callback,
sans useEffect ; annonce role="status" masquée de l'annexe F), ViewToggle (valeur vide ignorée), Alert, CapacityPill (reçoit
percent et state calculés, mot d'état visible D-02), Skeleton, Spinner, toast.ts (Toast.createToastManager() sans option,
showToast appelable hors React) + Toaster (<Toast.Provider toastManager={…} limit={1}>, 3,5 s, erreurs priority high,
viewport aria-label « Notifications ») ; CSS Modules ; une story par état utile ; textes génériques en messages ui.*.
Critères d'acceptation : 08 § 1-5 (jetons seulement, cibles 48 px, focus visible, opacité 38 % inactif, prefers-reduced-motion) ;
ConfirmButton 06 § 5.2 avec faux minuteurs (armé, 4 s, largeur figée, aria-label et title, réarmement rapide) ; Toaster a-8 ;
tests Vitest navigateur par composant (rôles, noms accessibles, clavier réel) ; toutes les stories passent axe.
Pièges : ToggleGroup de Base UI renvoie une valeur vide au 2e clic (l'ignorer) ; portails (Toast) sans la classe d'accent ;
libellés anglais de Base UI à surcharger ; un toast d'erreur doit être annoncé en priorité (R-16) ; dans un play, chercher les
portails avec screen de storybook/test, pas canvas.
Commandes :
- pnpm test:browser src/ui/button src/ui/toggle src/ui/feedback ; pnpm test --project=storybook ;
- grep -rnE "#[0-9a-fA-F]{3,6}|[0-9]+px" src/ui --include=*.module.css (seulement des var(--…)).
Ne touche pas : ui/icons.tsx, .storybook/, src/test/ (demande à l'orchestrateur), ui/form/, ui/calendar/.
```

### P3 (b) — Formulaires pré-liés

```text
{BLOC COMMUN, id = p3b}
Objectif : la couche TanStack Form + Base UI Field, reprise d'AppResaAristide et adaptée.
Déjà en place : Storybook branché sur Vitest avec axe, icônes, renderWithProviders, Base UI et TanStack Form installés (P3 (0)).
P3 (a) tourne en parallèle. Après toi : les formulaires de P4 et P5 n'utilisent que tes champs pré-liés.
À lire en plus : PLAN § 3.5 (lignes Formulaire, champs, NumberField), § 4.2 (E-19, E-46), R-16, R-17 ; docs/spec/04 § 5.2-5.4
et § 10, 06 § 7.3, 00 § 3 (checkFields…), 08 § 4.5-4.9 ; ui-forms.md § 1-7 ; appresaaristide-reference.md § 2.2, § 2.4 ;
docs/migration/recherche/appresaaristide/src/components/form/fields.tsx (Tailwind → CSS Modules, textes selon la spec).
Livrables : ui/form/app-form.ts (createFormHook, revalidateLogic submit puis change, canSubmitWhenInvalid), errors.ts (errorText),
TextField, PasswordField (œil), NumberField (fr-FR, aria-roledescription « champ numérique », −/+ D-17, glyphes en constantes,
entiers ; champ vide affiché vide et compté 0), PriceField (texte inputMode decimal, virgule acceptée, datalist), CheckboxField,
SegmentedRadio (une seule option possible), SubmitButton (aria-busy, « Envoi en cours… ») ; focus sur le premier
[aria-invalid="true"] dans l'ordre du DOM ; stories par état (vide, erreur, occupé).
Critères d'acceptation : 04 § 5.4 (libellé relié, aria-invalid, aria-describedby erreur puis aide, aide masquée en erreur, message
affiché jusqu'à ce que la valeur soit valide : E-46) ; 04 § 10 ; NumberField libellés français ; attributs rendus par NumberField
(type, min, max, placeholder="0", inputmode) relevés et comparés à 04 § 5.2-5.3, liste des différences au journal pour l'orchestrateur
(E-19) ; compteur null affiché vide (06 § 7.3) ; pas de required ni pattern natifs ; tests navigateur avec userEvent réel ; axe vert.
Pièges (R-17) : handleSubmit relance l'erreur d'onSubmit ; erreurs Standard Schema = objets (errorText) ; defaultValues lues au
montage seulement ; useStore déprécié (useSelector ou form.Subscribe) ; NumberField renvoie null et refuse datalist.
Commandes :
- pnpm test:browser src/ui/form ; pnpm test --project=storybook ;
- grep -rn "@base-ui" src --include=*.tsx | grep -v src/ui (doit être vide).
Ne touche pas : ui/button, ui/feedback, ui/calendar, ui/icons.tsx, .storybook/.
```

### P3 (c) — Calendrier et sélecteur de date

```text
{BLOC COMMUN, id = p3c}
Prérequis : P2 (a) et P2 (c) fusionnées (dates, keyTargetIso, libellés).
Objectif : la grille de calendrier maison et le sélecteur de date de « Ouvrir un jour ».
Déjà en place : domain/dates.ts (weekCells, monthCells, keyTargetIso), intl/dates.ts (libellés), Storybook (P3 (0)).
Après toi : P4 (b) câble ta grille sur l'URL (features/calendar/RestaurantCalendar.tsx) ; P5 (b) utilise le sélecteur de date.
À lire en plus : PLAN § 3.5 (paragraphe « Calendrier maison »), § 3.6 (transitions), § 4.2 (E-05, E-07, E-43) ;
docs/spec/05 § 2.2 à § 2.6, § 3.1 à § 3.4 ; 06 § 3 ; ui-forms.md § 3 (en gardant : focus sans useLayoutEffect).
Livrables : ui/calendar/CalendarGrid.tsx, CalendarHeader.tsx, DatePickerPopover.tsx et leurs CSS Modules ; props sans métier
(cellules, sélection, statut par jour déjà calculé, libellés déjà formatés, onSelect(iso, { viaKeyboard })) ; stories semaine,
mois, jour sélectionné hors période, jours passés.
Critères d'acceptation : role grid étiqueté par le libellé de période (aria-live polite), gridcell aria-selected, un <button>
par case, un seul tabIndex=0 (05 § 2.6), aria-label de 05 § 2.5 avec « 1er » et clôture de 10 h (« commandes closes », annexe F) ;
table de toutes les touches de 05 § 3.2 en test navigateur (clavier réel), focus conservé quand la période change, sans effet ;
date picker 06 § 3.2-3.3 (flèches = focus, jours passés aria-disabled, « déjà ouvert », Échap, clic extérieur, retour du focus) ; axe vert.
Pièges : une case en <Link> recevrait aria-current="page" et écraserait aria-current="date" ; Page ↑ / ↓ borné au dernier
jour du mois (a-23) ; jour hors mois cliquable sans changer de mois (05 § 3) ; transitions coupées par prefers-reduced-motion.
Commandes :
- pnpm test:browser src/ui/calendar ; pnpm test --project=storybook ;
- grep -rn "useLayoutEffect\|useEffect" src/ui/calendar (doit être vide).
Ne touche pas : domain/, intl/dates.ts (demande à l'orchestrateur), autres dossiers de ui/.
```

## 6. P4 — Parcours public

### P4 (a) — Page, chargement, actualisation, lecture anticipée, textes communs

```text
{BLOC COMMUN, id = p4a}
Objectif : la page publique à deux colonnes vide de fiches, mais complète pour le chargement : squelette, copie locale,
encadré d'échec, bandeau, actualisation, lecture anticipée réelle, en-tête et pied.
À lire en plus : PLAN § 3.2 (route /), § 3.3.1, § 3.3.2, § 3.9, § 3.10 (deux formes de messages), § 3.11, D-01, D-05, D-23, D-24,
E-42, E-47, annexe F, R-06, R-12, R-15, R-31, R-34 ; docs/spec/03 § 2-5, 04 § 2 et § 9, 00 § 2.3, 08 § 7, 09 § 2 ;
tanstack-start.md § 4 (en gardant le schéma d'URL du plan) ; PLAN § 2.1 (ligne Start) et docs/migration/journal/p0b.md.
Livrables : routes/index.tsx (validateSearch complet du PLAN § 3.2, loader async, composant < 40 lignes) ; features/calendar/search.ts
(CalendarSearch ; CALENDAR_KEYS vient de domain/navigation.ts) ; features/page/{Page,PublicPage,Column,Header,Footer,ConfigBanner,
DevDataBanner,LoadErrorBox,LoadErrorPage,PageSkeleton}.tsx ; queries/AutoRefresh.tsx ; <ScriptOnce>{earlyFetchScript}</ScriptOnce>
réel (api/early-fetch.ts) ; easter egg (D-01) ; écouteur vite:preloadError (garde sessionStorage) ; intl/common-messages.ts rempli
EN UNE FOIS avec tous les textes partagés de 04 § 9 et 06 (Réserver, Annuler, Fermer, Enregistrer, message de clôture R2…) ;
e2e/hydration.spec.ts complet (S4, avec la copie puis avec reservations-textes seul).
Emplacements : Page expose des emplacements pour les fiches et les formulaires de chaque colonne ; P4 (b) les remplit.
Critères d'acceptation : 03 § 3.1 textes exacts (en ligne, hors ligne, suffixe copie locale), Réessayer occupé, réannonce seulement
si le texte change (a-21) ; textes de 03 § 2.1-2.2 et 00 § 2.3 ; actualisation toutes les 3 min par un seul observateur, rattrapage
au retour ; D-24 ; ConfigBanner : story et test Vitest (URL absente, invalide, COLLE_ICI ; texte de D-05) ; S4 vert ; budget S3 vert
(pnpm build && pnpm budget) ; 0 à 2 useEffect dans src (hors tests et stories), chacun commenté ; régression : @G-01, @G-03 et @G-07
verts sur react (G-02 et G-04 en P4 (b) ; G-05 couvert par la story) ; parite.md, colonne react mise à jour pour ces lignes.
Commandes :
- pnpm build && pnpm budget ; pnpm build:e2e && pnpm test:e2e --project=react --grep "@G-01|@G-03|@G-07" ;
- pnpm test:e2e --project=react-only e2e/hydration.spec.ts ;
- grep -rnE "use(Layout)?Effect\(" src --include=*.tsx --exclude=*.test.tsx --exclude=*.stories.tsx.
Ne touche pas : domain/, api/, queries/ hors AutoRefresh.tsx et use-app-state.ts, ui/ (demande à l'orchestrateur),
assertions de e2e/regression/*.spec.ts (page objects côté react : oui).
```

### P4 (b) — Calendriers câblés et fiches du jour

```text
{BLOC COMMUN, id = p4b}
Objectif : les deux calendriers pilotés par l'URL et les fiches R1 et R2 dans tous leurs états.
Déjà en place : page, chargement, actualisation, textes communs, search.ts (P4 (a)) ; tout domain/, api/, queries/, ui/.
Après toi : P4 (c) et P4 (d) déplient les formulaires sous tes fiches ; P5 réutilise tes fiches en mode collègue.
À lire en plus : PLAN § 3.2 (paramètres, middlewares, transformations pures), § 3.5 (calendrier), § 3.6, D-02, D-11, D-13,
E-05 à E-07, E-21, E-23, E-27, E-32, E-43, annexe F ; docs/spec/05 en entier, 01 § 3.7, 04 § 3-4, 09 § 3 ; journal p4a.
Livrables : features/calendar/RestaurantCalendar.tsx (selectDay, shiftPeriod, goToToday de domain/navigation.ts ; liens
<Link search={…}> pour ‹ › et Semaine / Mois ; navigation au clavier en replace ; option viewTransition) ;
features/r1/DayCardR1.tsx ; features/r2/{DayCardR2,DishRow}.tsx ; bouton « Réserver » qui écrit reserver et la date
explicitement (push) ; stories de chaque état de fiche (09 P-03 à P-17) avec le faux script.
Critères d'acceptation : sélection dans une colonne sans effet sur l'autre (a-12) ; « Aujourd'hui » ferme ce qui dépend du jour dans
ce restaurant ; « aujourd'hui » résolu dans le composant ; ?r1vue=semaine retiré de l'URL, connexion=1 ignoré (fallback) ; ordre exact
05 § 5.1 et § 6.2, états 05 § 5.2 et § 6.5, jauges 05 § 4.5, surtitres 05 § 4.4, cut-off 01 § 3.7 et 04 § 4.3, D-02 ; textes de
05 § 2.3, § 2.5, § 4.3 couverts par des tests ; tests de routes en mémoire (fallbacks, URL abîmée sans erreur) ;
régression : @G-02, @G-04, @P-01, @P-01b, @P-02, @P-02b, @P-03, @P-04, @P-07, @P-08, @P-10 à @P-12, @P-15 à @P-17 verts sur react.
Pièges (R-19) : ?connexion=1 et ?reserver=1 sont des nombres (fallback) ; location.pathname est sans basepath ;
« aujourd'hui » jamais dans validateSearch ; r1periode effacé par toute sélection de jour.
Commandes :
- pnpm test:browser src/features/calendar src/features/r1 src/features/r2 ;
- pnpm build:e2e && pnpm test:e2e --project=react --grep "@G-02|@G-04|@P-0[1-48]|@P-1[0-25-7]".
Ne touche pas : features/page/* (sauf remplir les emplacements prévus), ui/, domain/, intl/common-messages.ts.
```

### P4 (c) — Formulaire R1, envoi, récapitulatif, briques communes des formulaires

```text
{BLOC COMMUN, id = p4c}
Objectif : réserver en R1 de bout en bout, et livrer les briques que P4 (d) réutilise.
Déjà en place : page, calendriers câblés, fiches (P4 (a), (b)) ; champs pré-liés (P3 (b)) ; api/actions.ts, newRequestId (P2).
Après toi : P4 (d) réutilise IdentityFields, BookingSummary et mutations/bookings.ts ; P5 (d2) aussi, sans mot de passe.
À lire en plus : PLAN § 3.3.3, § 3.9, D-10, D-14 à D-18, E-03, E-10, E-12, E-13, E-19, E-28, E-31 à E-35, E-46, annexe F, R-11,
R-17, R-31 ; docs/spec/04 § 5.1, § 5.2, § 5.4, § 6, § 7, § 9, § 10 ; 02 § 4.4, § 5.3-5.4 ; ui-forms.md § 5 ; journal p4b.
Ordre : premier commit poussé tôt et signalé : features/booking/IdentityFields.tsx (withFieldGroup), BookingSummary.tsx,
mutations/bookings.ts avec useBookR1 complet et la SIGNATURE de useOrderR2 (corps vide qui lève une erreur explicite) ;
puis features/r1/BookingFormR1.tsx (lazy, préchargé au survol et au focus de « Réserver ») et SeatCountersR1.tsx.
Règles : état du formulaire seulement dans TanStack Form ; requestId par useState(() => newRequestId()) dans le composant
monté avec key={`r1:${date}`} ; mutateAsync dans un try/catch de onSubmit ; cache mis à jour dans useMutation({ onSuccess }),
toast, fermeture (replace) et focus du récapitulatif dans mutate(…, { onSuccess }) ; aucun texte hors react-intl (deux formes).
Critères d'acceptation : 04 § 5.2 (libellés, ordre, validations, messages exacts, total en direct « 3 couverts · Total : 16,00␣€ »,
pas de texte initial « Total : 0,00 € ») ; D-10 (formulaire vide) ; D-18 (maximum sous la rangée) ; 04 § 6 (bouton occupé, corps exact
avec trim(), requestId conservé après erreur, renouvelé à la réouverture et inchangé après une actualisation, _duplicate → D-16) ;
D-15 à 20 s ; « Annuler » désactivé pendant l'envoi ; récapitulatif 04 § 7 avec focus ; tests navigateur + stories par état ;
régression : @P-05, @P-06 verts sur react.
Commandes :
- pnpm test:browser src/features/r1 src/features/booking src/mutations ;
- pnpm build && pnpm budget ; pnpm build:e2e && pnpm test:e2e --project=react --grep "@P-05|@P-06".
Ne touche pas : features/r2/, features/page/*, ui/.
```

### P4 (d) — Formulaire de commande R2

```text
{BLOC COMMUN, id = p4d}
Prérequis : P4 (c) fusionnée.
Objectif : commander en R2 de bout en bout, cut-off compris.
Déjà en place : formulaire R1, IdentityFields, BookingSummary, useBookR1, signature de useOrderR2 (P4 (c)) ;
horloge et useIsR2OrderingClosed (P2 (c)). Tu termines P4 : son critère de sortie est le tien.
À lire en plus : PLAN § 3.3.3, § 3.4 (10 h), invariant 5 (§ 1.4), D-10, D-14 à D-18, E-09, E-11, E-14, E-34, E-41, a-6, a-7, a-9,
a-20 ; docs/spec/04 § 5.3, § 6, § 7, § 9 ; 01 § 3.6-3.7 ; 03 § 5.3 ; 02 § 4.5 ; journal p4c.
Livrables : features/r2/OrderFormR2.tsx (lazy ; liste repliée ; mode À emporter / Sur place ; jour au ticket → sur place seule
option + aide ; quantités bornées au restant, D-17 et D-18 ; erreur « Choisissez au moins un plat. » reliée au fieldset et focus sur
la 1re quantité) ; corps de useOrderR2 dans mutations/bookings.ts ; fermeture à 10 h avec toast neutre (tâche de fond de
background/clock.ts).
Critères d'acceptation : les quatre exemples de totaux de 04 § 5.3 ; un ticket par commande ; corps exact (mode, items, requestId) ;
_bookingResult ajusté et _emailStatus cumulés dans le récapitulatif (a-20) ; confirmed vide → formulaire conservé, toast,
état relu (a-6) ; contrôle du cut-off repris à l'envoi ; régression : tous les scénarios @p4 verts sur react (REG-01 à REG-26,
REG-43 ; critère de sortie de P4 ; L-01 est en P5) ; budget S3 vert ; 0 à 2 effets.
Pièges : formulaire monté avec key={`r2:${date}`} (defaultValues lues au montage) ; un ticket par commande quel que soit
le nombre de plats au ticket ; la fermeture de 10 h vient de la tâche de fond, pas d'un effet dans le formulaire.
Commandes :
- pnpm test:browser src/features/r2 src/mutations ;
- pnpm build && pnpm budget ; pnpm build:e2e && pnpm test:e2e --project=react --grep "@p4".
Ne touche pas : features/r1/, features/booking/* (sauf correctif signalé), features/page/*.
```

## 7. P5 — Mode collègue

### P5 (a) — Session, garde, connexion, déconnexion, socle des panneaux

```text
{BLOC COMMUN, id = p5a}
Prérequis : action humaine de P0 faite (le script déployé répond à getAdminState).
Objectif : entrer et sortir du mode collègue en sécurité, et poser le socle que (b) à (e) remplissent en parallèle.
À lire en plus : PLAN § 3.2 (route /collegue et tous ses paramètres), § 3.3 (gcTime 0 de l'état complet), § 3.3.3 (connexion,
garde de session), § 3.3.4, § 3.4, S8, D-12, D-26, E-02, E-04, E-23, E-24, R-25, R-26 ; docs/spec/06 § 1 et § 2 (structure),
02 § 2, § 4.3, 09 § 4 ; journaux p2c, p4a.
Livrables :
1. routes/collegue.tsx : schéma de recherche COMPLET (ouvrir, ouvrirDate, parametres, editJour, editResa, ajout, ajoutPlat, editPlat),
   beforeLoad (garde vers /?connexion=true&retour=…), loader de l'état complet, composant < 40 lignes.
2. features/page/ModeSwitch.tsx (Client / Collègue, panneau L-01, œil, Entrée, Échap, refus sur copie locale) ; mutations/login.ts
   (useLogin, seule mutation collègue du chunk public).
3. Branchement de afterLogout (background/logout.ts, PLAN § 3.3.4, étapes 2 à 6) et de l'inactivité.
4. Socle partagé : features/page/StaffPage.tsx avec un emplacement nommé par panneau (tomorrow, settings, openDayR1, openDayR2,
   dayCardR1, dayCardR2) ; mutations/staff/write.ts (fabrique mutationOptions : mutationKey ['write', domain, action], scope write,
   password ET sessionIdAtCall lus dans le store au moment de l'appel ; onSuccess : GARDE DE SESSION — n'écrire que si
   session.getState().password !== null && session.getState().id === sessionIdAtCall, sinon jeter la réponse — puis cancelQueries,
   setQueryData, invalidation publique sans relecture ; toast de succès) ; fichiers prévus : mutations/staff/{days,dishes,bookings,
   settings}.ts.
Critères d'acceptation : 06 § 1.1 à 1.8 ; rechargement de /collegue?r1=…&editResa=… → connexion → retour exact ; S8 : après chaque
déconnexion, aucune entrée ['state','staff'], cache des mutations vide, aucun nom de la fixture dans le DOM ; déconnexion pendant une
écriture collègue retenue par fakeScript.hold() puis relâchée : aucune entrée ['state','staff'] ne réapparaît ; mot de passe absent
de localStorage, sessionStorage, URL, clés de requête et sorties console.* (espion) ; store réinitialisé entre tests
(setState(initial, true)) ; régression : @L-01, @G-06 (connexion), @G-08, @C-30 verts sur react.
Commandes :
- pnpm test:browser src/routes src/features/page src/mutations ;
- pnpm build:e2e && pnpm test:e2e --project=react --grep "@L-01|@G-08|@C-30" ; pnpm build && pnpm budget (le code collègue hors
  du chunk public, sauf mutations/login.ts).
Ne touche pas : features/staff/* au-delà des emplacements, features/r1, features/r2, mutations/bookings.ts.
```

### P5 (b) — Ouvrir et modifier un jour

```text
{BLOC COMMUN, id = p5b}
Prérequis : P5 (a) fusionnée.
Objectif : panneaux « Ouvrir un jour » R1 et R2 (avec lignes de plats) et « Modifier ce jour » R1, suppression d'un jour.
Déjà en place : route /collegue complète, garde, connexion, déconnexion, StaffPage et ses emplacements, fabrique
mutations/staff/write.ts avec garde de session (P5 (a)) ; DatePickerPopover (P3 (c)). P5 (c), (d1), (e) et P6 (a) tournent en parallèle.
À lire en plus : PLAN § 3.2 (ouvrir, ouvrirDate, editJour), § 3.3.3 (exception « Ouvrir un jour »), D-09, D-19, D-21, E-36, E-38,
annexe F ; docs/spec/06 § 3, § 4, § 5 ; 02 § 4.7 ; 05 § 3.3, § 5.1 (4).
Livrables : features/staff/{OpenDayFormR1,OpenDayFormR2,OpenDatePicker,EditDayFormR1}.tsx ; mutations/staff/days.ts ;
« Supprimer ce jour » par ConfirmButton avec note D-21 ; stories des états de 09 C-04, C-05, C-06, C-13, C-14 (jour).
Critères d'acceptation : D-19 (date passée refusée, R1 déjà ouvert bloqué, R2 déjà ouvert averti, ligne incomplète signalée,
capacité ≥ couverts réservés) ; case ticket et prix (06 § 4.3) ; corps 02 § 4.7 ; ouvrirDate retiré au choix d'un jour ;
après « Ouvrir un jour » réussi : panneau gardé ouvert, champs vidés sauf la date, calendrier du restaurant sur la date ouverte
(selectDay en gardant ouvrir ; 06 § 4.1-4.2, collegue.js l. 276-277) ; après une suppression, focus sur la date de la fiche ;
après « Modifier ce jour » enregistré ou annulé, focus sur le bouton « Modifier ce jour » (E-48) ;
régression : @C-04, @C-05, @C-06, @C-13 et la variante jour de @C-14 verts sur react.
Pièges : D-09 non retenue (pas de « Modifier ce jour » R2, editJour n'accepte que r1) ; le mot de passe n'est lu que
dans mutationFn via le store, jamais en prop ni en clé ; chaque panneau ouvert = un paramètre d'URL.
Commandes :
- pnpm test:browser src/features/staff ;
- pnpm build:e2e && pnpm test:e2e --project=react --grep "@C-04|@C-05|@C-06|@C-13|@C-14".
Ne touche pas : routes/collegue.tsx, StaffPage.tsx (sauf ton emplacement), mutations/staff/write.ts, autres mutations/staff/*.
```

### P5 (c) — Plats

```text
{BLOC COMMUN, id = p5c}
Prérequis : P5 (a) fusionnée.
Objectif : ajouter, modifier et supprimer un plat d'un jour R2, et les blocs « plats » de la fiche R2 collègue.
Déjà en place : route /collegue, StaffPage, fabrique mutations/staff/write.ts (P5 (a)) ; PriceField (P3 (b)).
P5 (b), (d1), (e) et P6 (a) tournent en parallèle : chacun son emplacement de StaffPage et son fichier de mutations.
À lire en plus : PLAN § 3.2 (ajoutPlat, editPlat), D-19, D-21, D-22, E-36, E-38, E-39, E-48, annexe F ; docs/spec/06 § 6,
05 § 6.2 (4), § 6.3, 08 § 6.4 (suggestions de prix) ; 02 § 4.7.
Livrables : features/staff/{DishForm,PriceSuggestions}.tsx, partie plats de la fiche R2 collègue (« Ouvert par », ordre des boutons) ;
mutations/staff/dishes.ts ; stories C-20 (plats), C-21, C-22, C-14 (plat).
Critères d'acceptation : stock ≥ portions réservées (D-19, message ICU de l'annexe F), prix 0 refusé (D-22), ticket codé dans le nom
à l'envoi, suggestions de prix triées et sans doublon, suppression avec note D-21 et orphelines exclues ; formulaire fermé après
succès (06 § 6) et focus rendu au bouton qui l'a ouvert (E-48) ; régression : @C-20, @C-21, @C-22 et la variante plat de @C-14
verts sur react.
Pièges : le ticket est codé dans le nom (« (ticket restaurant) ») à l'envoi seulement, jamais affiché ; prix vide envoyé "" ;
le mot de passe n'est lu que dans mutationFn via le store.
Commandes :
- pnpm test:browser src/features/staff ;
- pnpm build:e2e && pnpm test:e2e --project=react --grep "@C-20|@C-21|@C-22|@C-14".
Ne touche pas : routes/collegue.tsx, write.ts, mutations/staff/* autres que dishes.ts, BookingList.
```

### P5 (d1) — Liste et modification des réservations, fiches collègue

```text
{BLOC COMMUN, id = p5d1}
Prérequis : P5 (a) fusionnée.
Objectif : listes nominatives des fiches R1 et R2 collègue, modification et suppression d'une réservation.
Déjà en place : route /collegue, StaffPage, fabrique mutations/staff/write.ts (P5 (a)) ; fiches publiques (P4 (b)).
Après toi : P5 (d2) ajoute « + Ajouter une personne » sous tes listes.
À lire en plus : PLAN § 3.2 (editResa), D-04, D-08, D-19, E-36, E-38, E-48 ; docs/spec/06 § 7, 05 § 4.3, § 4.6, § 5.1 (4), § 5.3,
§ 6.2 (4), § 6.3 ; 02 § 4.7.
Livrables : features/staff/{BookingList,BookingRow,EditBookingFormR1,EditBookingFormR2}.tsx ; mutations/staff/bookings.ts
(modification, suppression) ; blocs collègue des fiches C-10, C-10b, C-20 (réservations, « Ouvert par », message collègue d'un jour
sans service, ordre des boutons, aria-expanded, aucun « Réserver ») ; stories C-10, C-10b, C-11, C-24, C-14 (réservation).
Critères d'acceptation : aucun tri à l'écran (D-08 non retenue : ordre de la feuille) ; format des lignes 05 § 4.6 (PrixTotal 0
masqué, mode en minuscules, séparateur « — » à espaces normales) ; contact obligatoire (D-04 non retenue) ; maximum R1 = restant
+ quantité actuelle, R2 borné au stock restant + quantité actuelle ; compteurs null des anciennes réservations affichés vides avec
l'aide « Réservation enregistrée avant les tarifs… » ; jour au ticket : modification R2 en « Sur place » seulement (D-19) ;
corps editBookingR1 avec qte et prixTotal (02 § 4.7) ; editResa ignoré si la réservation n'existe plus ; après suppression, focus
sur la date de la fiche ; après enregistrement ou « Annuler », focus sur « Modifier » de la ligne (E-48) ; formulaire ouvert intact
après une actualisation getAdminState ; régression : @C-10, @C-10b, @C-11, @C-24 et la variante réservation de @C-14 verts sur react.
Pièges : R2 = une ligne par plat (BookingR2) ; anciennes réservations avec compteurs vides (null, jamais 0).
Commandes :
- pnpm test:browser src/features/staff ;
- pnpm build:e2e && pnpm test:e2e --project=react --grep "@C-10|@C-11|@C-24|@C-14".
Ne touche pas : routes/collegue.tsx, write.ts, mutations/staff/* autres que bookings.ts.
```

### P5 (d2) — Ajout d'une personne

```text
{BLOC COMMUN, id = p5d2}
Prérequis : P5 (d1) fusionnée.
Objectif : « + Ajouter une personne » en R1 et sous chaque plat R2.
Déjà en place : listes et modification des réservations (P5 (d1)) ; IdentityFields, useBookR1, useOrderR2 (P4 (c), (d)).
Invariant 3 : requestId généré à l'ouverture, gardé pour un nouvel essai, renouvelé à chaque ouverture.
À lire en plus : PLAN § 3.3.3 (ligne « Ajout d'une personne », garde de session), invariant 3, D-14, D-19, E-36, E-48 ;
docs/spec/06 § 8 ; 02 § 4.4-4.5.
Livrables : features/staff/{AddBookingFormR1,AddBookingFormR2}.tsx réutilisant IdentityFields et useBookR1 / useOrderR2
(sans password), requestId au montage, relecture de l'état complet seulement si la session de l'appel est encore ouverte ;
stories C-12, C-23.
Critères d'acceptation : corps sans password ; jour au ticket → sur place seule option ; ajout R2 possible après 10 h (les collègues
ne sont pas soumis au cut-off) ; « + Ajouter une personne » visible aussi pour un jour passé, absent si rem = 0 ; toasts de 06 § 8.5 ;
erreur technique → texte collègue de D-14 ; état complet relu ; focus rendu à « + Ajouter une personne » après fermeture ;
régression : @C-12, @C-23 verts sur react.
Pièges : addBookingR1 / addBookingR2Multi sans password ; la réponse est l'état public : relire l'état complet
(invalidateQueries ['state','staff', id]) ; jour au ticket → « Sur place » seule option (a-17).
Commandes :
- pnpm test:browser src/features/staff ;
- pnpm build:e2e && pnpm test:e2e --project=react --grep "@C-12|@C-23".
Ne touche pas : mutations/bookings.ts (demande à l'orchestrateur si un ajout est nécessaire), routes/collegue.tsx.
```

### P5 (e) — Paramètres et totaux du panneau « Demain »

```text
{BLOC COMMUN, id = p5e}
Prérequis : P5 (a) fusionnée.
Objectif : panneau Paramètres et première partie du panneau « Demain » (ligne de totaux).
Déjà en place : route /collegue, StaffPage, fabrique mutations/staff/write.ts (P5 (a)).
Après toi : P6 (b) complète TomorrowPanel avec les blocs par restaurant et leurs boutons d'impression.
À lire en plus : PLAN § 3.3.3 (ligne Paramètres), D-07, D-20, E-30, E-37, E-40, annexe F ; docs/spec/06 § 2.1-2.2 ; 07 § 5 (pour la suite en P6).
Livrables : features/staff/SettingsPanel.tsx ; mutations/staff/settings.ts (une requête setConfigField par champ modifié, en séquence,
dans une seule mutationFn ; échec partiel détaillé D-20) ; features/staff/TomorrowPanel.tsx (titre Demain ({date}), en tête du mode
collègue) avec la ligne de totaux de 06 § 2.1 et un emplacement pour les blocs de P6 (b).
Critères d'acceptation : noms des restaurants obligatoires (« Indiquez le nom du restaurant. ») ; descriptions et contact vidés envoyés
("") ; tarifs nombre ≥ 0 (message de l'annexe F) ; toast singulier ou pluriel ; « Aucune modification à enregistrer. » ; bouton
« Enregistrement… » ; panneau gardé ouvert après succès (06 § 2.2) ; réservations de plats supprimés exclues des totaux ;
régression : @C-02 vert, @C-01 vert pour la ligne de totaux.
Pièges : une requête setConfigField par champ modifié, en séquence (jamais en parallèle) ; clés du script par
SETTINGS_API_KEYS d'api/actions.ts ; échec partiel : les champs déjà enregistrés le restent.
Commandes :
- pnpm test:browser src/features/staff src/mutations/staff ;
- pnpm build:e2e && pnpm test:e2e --project=react --grep "@C-01|@C-02".
Ne touche pas : routes/collegue.tsx, write.ts, autres mutations/staff/*.
```

## 8. P6 — Impression et panneau « Demain »

### P6 (a) — Mécanique d'impression et documents R1

```text
{BLOC COMMUN, id = p6a}
Objectif : imprimer dans le même document, et les documents R1 (liste du jour, résumé du lendemain).
Déjà en place : mode collègue (P5 (a)) ; P5 (b) à (e) tournent en parallèle. Les documents se testent sur fixtures,
sans attendre la fin de P5. Après toi : P6 (b) réutilise ta mécanique pour les documents R2.
À lire en plus : PLAN § 3.8, R-27, D-08, E-15, E-20, annexe F ; docs/spec/07 § 1-3, § 6, § 8-9 ; ui-forms.md § 8 (en gardant
« même document ») ; react-architecture.md § 2 (i) (idem).
Livrables : ui/print/{print.ts,PrintRoot.tsx,PrintLayout.tsx,PrintTable.tsx} ; styles/print.css (page nommée list, A4 paysage,
boîtes de marge) ; domain/print.ts complété pour R1 (tu en es propriétaire pendant P6) ; features/print/{ListDocumentR1,
TomorrowDocumentR1}.tsx chargés au clic ; boutons « Imprimer la liste » R1 ; e2e/print-pdf.spec.ts (projet react-only : print
intercepté, emulateMedia print, page.pdf paysage, nombre de pages d'une longue liste) ; stories des documents sur fixtures.
Critères d'acceptation : 07 § 2 et § 3 ligne par ligne (colonnes vides, « Aucune réservation. », N° table, Chef de rang, totaux,
signature, date d'impression) ; titre du document = nom du PDF ; rien d'autre que le document imprimé ; après afterprint, titre
rétabli, .print-root vide, focus rendu au bouton ; régression : @I-01, @I-03 verts sur react.
Pièges (R-27) : @page global interdit (page nommée list) ; attendre document.fonts.ready 2 s au plus ;
flushSync avant window.print() ; titre du document rétabli à afterprint.
Commandes :
- pnpm test:browser src/features/print src/ui/print ;
- pnpm build:e2e && pnpm test:e2e --project=react-only e2e/print-pdf.spec.ts ; pnpm test:e2e --project=react --grep "@I-01|@I-03".
Ne touche pas : features/staff/TomorrowPanel.tsx, documents R2.
```

### P6 (b) — Documents R2 et panneau « Demain » complet

```text
{BLOC COMMUN, id = p6b}
Prérequis : P5 (e) et P6 (a) fusionnées.
Objectif : documents R2 et panneau « Demain » fusionné (D-07).
Déjà en place : mécanique d'impression et documents R1 (P6 (a)) ; TomorrowPanel avec la ligne de totaux (P5 (e)).
À lire en plus : PLAN § 3.8, invariant 5, a-11, a-24, D-03, D-07, D-08, E-16, E-30, E-44, annexe F ; docs/spec/07 § 4, § 5, § 7 ;
journal p6a.
Livrables : features/print/{ListDocumentR2,TomorrowDocumentR2}.tsx ; Order et regroupement par client dans domain/print.ts ;
blocs par restaurant dans TomorrowPanel.tsx avec leurs boutons d'impression ; stories.
Critères d'acceptation : un ticket par commande dans tous les totaux ; regroupement par client trié par classe puis nom (07 § 4.1),
récapitulatif par plat ; textes corrigés de a-24 (annexe F) ; orphelines exclues ; régression : @I-02, @I-04, @C-01, @C-03 et la
variante @changed:E-15 de @I-00 verts sur react (critère de sortie de P6 : tous les scénarios @p6).
Pièges : regroupement R2 par client fragile (nom + classe + contact, clé actuelle conservée, a-24) ; ordre actuel conservé (D-08) ;
réservations de plats supprimés exclues partout (b-3).
Commandes :
- pnpm test:browser src/features/print src/features/staff ;
- pnpm build:e2e && pnpm test:e2e --project=react --grep "@p6".
Ne touche pas : ui/print/*, styles/print.css (sauf correctif signalé), documents R1.
```

## 9. P7 — Parité finale

### P7 (a) — Suite de régression complète sur `react`

```text
{BLOC COMMUN, id = p7a}
PLAN.md : tu peux mettre à jour la colonne « Statut ».
Objectif : la suite de régression entière verte sur react, avec exactement les écarts @changed:E-xx du PLAN § 4.2.
Déjà en place : toutes les phases P0 à P6 fusionnées ; suite de régression écrite en P1, verte sur legacy ;
chaque phase a rendu verts sur react les scénarios de son périmètre. Tu traques les écarts restants.
À lire en plus : PLAN § 1.5, § 4.2, P7 ; docs/migration/parite.md ; tous les journaux docs/migration/journal/*.md (reste à faire).
Livrables : correctifs du nouveau code ; suppression du filtre par étiquettes du projet react en CI ; parite.md : chaque identifiant
avec scénario, story ou test navigateur, statut legacy et react, écart ; liste des « reste à faire » des journaux traitée ou reportée.
Critères d'acceptation : pnpm test:e2e vert sur les projets legacy, react et react-only, trois fois de suite ; test des étiquettes
@changed vert ; aucune assertion modifiée depuis P1 sans ligne au journal ; mêmes scénarios @parity sur legacy et react ;
S1, S2, S4, S6, S7, S8 vérifiés et notés.
Pièges : un test instable se corrige (attente sur un état, pas sur un délai) ; pas de retries locaux ;
un écart non listé au § 4.2 est un défaut du nouveau code.
Commandes :
- pnpm build:e2e && pnpm test:e2e --repeat-each 3 ; pnpm check ;
- git log --oneline -- e2e/regression (toute modification d'assertion depuis P1 doit figurer dans un journal).
Ne fais pas : réécrire les assertions d'un scénario pour le faire passer ; toucher au faux script sans le signaler.
```

### P7 (b) — Accessibilité, budget, procédure de validation

```text
{BLOC COMMUN, id = p7b}
Objectif : preuves d'accessibilité et de budget, et une procédure que les collègues peuvent suivre sans aide technique.
Déjà en place : site complet ; P7 (a) a rendu la suite de régression verte sur react.
La validation par les collègues sur le vrai script suit ta procédure : elle doit tenir sans toi.
À lire en plus : PLAN § 1.5 (S3 à S5, S9), § 3.11 (environnements), § 7 (Avant), R-22, R-30 ; element-admin-reference.md § 8.
Livrables : e2e/a11y.spec.ts (projet react-only ; AxeBuilder de @axe-core/playwright sur G-02, G-04 semaine et mois, P-05, P-13,
L-01, G-08, C-02) ; rapport de budget (kB gzip par chunk, au journal) ; docs/migration/validation.md : servir le build (local par
pnpm build && pnpm serve, ou artefact CI), URL réelle seulement dans .env.real.local du responsable (ou build avec la variable),
avertissement R-30 (vraies réservations, vrais e-mails), connexion collègue réelle à vérifier, liste des vérifications manuelles
(NVDA ou VoiceOver, Safari iOS, tablettes, impression sur un poste du lycée, montants au-delà de 999 € dans Chromium et WebKit),
formulaire de retour.
Critères d'acceptation : 0 violation axe sur les stories et les écrans listés ; budget JS ≤ 200 kB gzip, CSS ≤ 25 kB ;
validation.md relu par l'orchestrateur.
Pièges : U+202F produit par Intl au-delà de 999 € (R-20) ; aucune exception axe acceptée ;
les collègues utiliseront le vrai script : la procédure ne doit jamais proposer de faux jour sans le supprimer ensuite.
Commandes :
- pnpm build:e2e && pnpm test:e2e --project=react-only e2e/a11y.spec.ts ; pnpm build && pnpm budget ;
- pnpm test --project=storybook (axe sur toutes les stories).
Ne fais pas : lancer le site contre le vrai script ; les vérifications manuelles et la validation par les collègues sont humaines.
```

## 10. P8 — Bascule

```text
{BLOC COMMUN, id = p8}
PLAN.md : tu peux mettre à jour le Statut et marquer le plan « terminé » après la bascule.
Objectif : préparer le commit de bascule et la documentation ; les actions sur GitHub et la fusion restent humaines.
Déjà en place : P7 validée par écrit par le responsable (S9). Pages sert encore l'ancien site depuis main en mode « branche ».
À lire en plus : PLAN P8, § 7 en entier, R-04, R-05, R-06, R-21, R-29 ; react-architecture.md § 10 (sans sa préproduction ni son
retour arrière par relance du workflow, PLAN § 6.1).
Livrables (sur ta branche, PR vers l'intégration) :
1. legacy/ supprimé ; projet Playwright legacy et script serve:legacy retirés ; tests dorés supprimés (leurs tables restent
   dans les tests node) ; colonne legacy de parite.md gelée avec la date.
2. Job deploy actif sur main (BASE_PATH=/reservations-restaurants/, artefact dist/client), vérifié en revue : aucun déclenchement
   depuis une autre branche.
3. e2e/smoke-production.spec.ts (projet production, lecture seule, aucun clic sur un bouton d'envoi), lancé à la main après bascule.
4. README réécrit (présentation, installation Apps Script inchangée, développement, déploiement, retour arrière du § 7) ; CLAUDE.md à jour.
5. Description de la PR = checklist du § 7 avec les actions humaines dans l'ordre (tag v1-final, environnement github-pages,
   source Pages « GitHub Actions » juste avant la fusion, fusion, vérifications) ; message aux collègues prêt à envoyer.
Critères d'acceptation : pnpm check, build, E2E react et react-only verts ; dist/client sans mockServiceWorker.js ni code msw ;
retour arrière décrit pas à pas.
Pièges (R-04, R-05) : en mode « branche », Jekyll ignore les chunks _*.js ; cache de 10 min de Pages ;
Pages sert le dernier déploiement du mode branche jusqu'au premier déploiement par Actions.
Commandes :
- pnpm check && pnpm build:e2e && pnpm test:e2e --project=react --project=react-only ;
- pnpm build && test ! -e dist/client/mockServiceWorker.js && ! grep -rl "setupWorker" dist/client ;
- grep -n "if:" .github/workflows/ci.yml (relire la condition du job deploy).
Ne fais pas : tag, réglages Pages, environnements, fusion dans main, message envoyé : tout cela est humain.
```
