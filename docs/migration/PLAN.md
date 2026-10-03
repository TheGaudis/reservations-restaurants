# Plan de migration du frontend vers React

*Rédigé le 3 octobre 2026. Feuille de route des sessions d'implémentation (humaines ou agents). Branche d'intégration : `claude/frontend-react-migration-lw5zfz`.*

**Journal du plan** (le plus récent en tête) :
- Révision du 3 octobre 2026 : code en anglais uniquement (arbitrage 12).
  - Arbitrage 12 : identifiants, fichiers, dossiers, ids react-intl et commentaires en anglais ; textes affichés et documentation en français ; chemin `/collegue` et search params inchangés ; champs de `Code.gs` et de la copie locale traduits à la frontière de l'API (§ 3.1, § 3.3.6, glossaire en annexe E).
  - Arbitrage 13 : tests de composants et de routes en Vitest Browser Mode (jsdom et Testing Library retirés), Storybook dont chaque story est un test avec axe, un seul faux Apps Script msw pour les tests, Storybook et l'E2E ; E2E réduit aux parcours complets (§ 1.5, § 2, § 3.1, P0, P3 à P7, R-28, annexe C).
  - Arbitrage 14 : nouvelle phase P1 « Régression sur l'ancien site » (suite Playwright verte contre `legacy/`, critère de sortie des phases suivantes) ; phases renumérotées P0 à P8.
  - Arbitrage 15 : bascule directe, sans préproduction `/v2/` ; validation par les collègues sur un build local ou l'artefact CI ; réglages Pages en P8 (§ 0, P0, P7, P8, § 6.2, § 7).
  - Décisions produit arrêtées : D-01 (easter egg) conservé ; D-04, D-08, D-09 et D-25 non retenues (comportement actuel conservé) ; react-day-picker exclu (calendrier maison confirmé).
- 3 octobre 2026 : première version.

Documents de référence, à garder ouverts :
- **La spécification de l'appli actuelle** : [`docs/spec/`](../spec/README.md). Elle fait foi pour tout comportement et tout texte affiché. Les renvois « `04` § 5.2 » désignent ses fichiers ; « a-12 », « b-3 », « c-7 » désignent les points d'attention consolidés de son [README § 3](../spec/README.md#3-points-dattention-consolidés).
- **Les rapports de recherche** : [`docs/migration/recherche/`](recherche/README.md) (justifications, mesures, extraits de code) et les **configurations de départ** de la phase P0 dans [`recherche/toolchain-files/`](recherche/toolchain-files/).
- `Code.gs` : le contrat du backend. **Il ne change pas.**

Conventions de ce document : « j-p » = jour-personne ; « session » = une session d'agent d'environ une demi-journée de travail utile ; `␣` = espace insécable U+00A0, comme dans la spec.

---

## 0. Résumé

1. **Quoi.** Réécrire le frontend (`index.html`, `js/*.js`, `app.css`, `design-system.css`, environ 2 250 lignes) en React 19.3 avec TanStack Start 1.168 en mode SPA, publié sur GitHub Pages. Le backend Google Apps Script (`Code.gs` + Google Sheets) est conservé tel quel.
2. **Pourquoi.** Le rendu actuel reconstruit le DOM à chaque changement et doit sauver puis restaurer saisies et focus ; aucun état n'est partageable ni testable ; la spec recense 26 défauts du frontend (a-1 à a-26), dont un bloquant : les données personnelles restent en mémoire après la déconnexion (a-1).
3. **Ce qui ne change pas pour les utilisateurs.** La page publique à deux colonnes (R1 vert, R2 magenta), les calendriers semaine / mois, les fiches du jour, les formulaires dépliés sous la fiche, le mode collègue dans la même page, les textes et la charte. Les seules améliorations visibles sont celles du § 4.
4. **Comment.** Réécriture complète sur la branche d'intégration, **sans préproduction publiée** (arbitrage 15) : pendant tout le développement, Pages continue de servir `main` tel quel en mode « branche » (le site actuel ne bouge pas) ; la CI de la branche vérifie tout (check, build, budget, E2E) sans rien déployer ; les collègues valident sur un build local ou sur l'artefact de la CI. Bascule directe en une fois (P8) : tag `v1-final` sur `main`, source Pages passée en « GitHub Actions » juste avant la fusion ; retour arrière par la source Pages ou `git revert`.
5. **État.** L'URL porte l'état d'affichage (jours, vues, formulaire ouvert, panneaux collègue) ; TanStack Query porte les données du script ; un store Zustand en mémoire porte la session collègue ; TanStack Form porte les saisies. Objectif : 0 à 2 `useEffect` dans toute l'appli.
6. **Performance perçue conservée.** Lecture anticipée dans la coquille HTML, premier rendu synchrone depuis la copie locale `reservations-cache-v1` (même clé, même format), etag, lecture doublée à 6 s, un seul nouvel essai à 1,5 s.
7. **Textes et formats.** Tous les textes passent par react-intl (FormatJS) en français seul : pluriels ICU, montants et dates `Intl`, extraction `translations/fr.json` vérifiée en CI.
8. **Qualité.** TypeScript 7 strict, oxlint type-aware pédantique, oxfmt, knip ; Vitest (projet `node` pour la logique pure, **Vitest Browser Mode** dans Chromium pour les composants et les routes), **Storybook** dont chaque story est aussi un test avec axe, un seul faux Apps Script msw partagé par les tests, Storybook et l'E2E (arbitrage 13). **La parité se prouve** : une suite Playwright de régression de 30 à 40 scénarios est écrite d'abord contre l'ancien site (phase P1, arbitrage 14), puis rejouée contre le nouveau à chaque phase ; un comportement ne change que s'il est listé au § 4.2 avec son scénario `@changed`.
9. **Effort.** Environ **30,5 j-p** (37 avec 20 % de marge), soit **26 sessions d'agent** réparties en 9 phases (P0 à P8), plus 1 à 2 semaines calendaires de test par les collègues.
10. **Risques principaux.** (1) Hydratation de la coquille Start alors que le premier rendu sort de la copie locale : décision « Start ou Router seul » à la fin de P0. (2) Budget JS initial (200 kB gzip) serré : formulaires publics et mode collègue chargés à la demande. (3) Outils récents ou expérimentaux (React Compiler en Rust, jsPlugins d'oxlint, oxfmt 0.x) : un plan B pour chacun. (4) Lenteur et pages d'erreur d'Apps Script. (5) Bascule Pages directe, sans préproduction publiée : source « GitHub Actions » à changer juste avant la fusion, Jekyll, cache de 10 min, copies locales v1 des visiteurs habituels à relire.
11. **À valider par vous.** 27 décisions produit (§ 4.1) : D-01 (conservé), D-04, D-08, D-09 et D-25 (non retenues, comportement actuel) sont tranchées depuis le 3 octobre 2026 ; les autres ont une valeur par défaut que le plan applique sauf avis contraire ; s'y ajoute la liste des écarts de parité assumés (§ 4.2).

---

## 1. Objectifs, périmètre, non-objectifs

### 1.1 Objectifs

- Reproduire **fonctionnellement à l'identique** l'appli décrite par `docs/spec/` (écrans de `09`, textes exacts, règles de `01`, contrat de `02`, chargement de `03`), avec un code testable et maintenable.
- Corriger les 26 points a-* côté client (traçabilité au § 4.3) et contourner côté client les limites b-* du script (annexe B).
- Mettre l'état d'affichage dans l'URL (liens partageables, bouton Retour, rechargement), selon le schéma de `09` § 1.
- Doter le dépôt d'un outillage complet : formatage, lint typé, vérification de types, tests unitaires, d'intégration et E2E, analyse d'accessibilité, budget JS, CI et déploiement automatique.

### 1.2 Périmètre

- Tout le frontend : page publique, mode collègue, impressions, chargement et cache local.
- Le déploiement GitHub Pages (passage en source « GitHub Actions » au moment de la bascule, P8).
- La documentation du dépôt (`README.md`, `CLAUDE.md`).

### 1.3 Non-objectifs

- **Aucune modification de `Code.gs`** ni de la feuille Google Sheets, ni des e-mails envoyés par le script. Les évolutions souhaitables sont listées à l'annexe B pour le responsable du script.
- Aucune refonte ergonomique : pas de calendrier unique pour les deux restaurants, pas d'espace collègue à onglets, pas de modale de confirmation à la place de la suppression en deux clics, pas de nouvelle fonction hors § 4.
- Pas de SSR, pas de server function, pas de service worker, pas de traduction (français seulement), pas de session collègue persistante.

### 1.4 Les 5 invariants (repris de `docs/spec/README.md` § 2)

1. **Aucune donnée personnelle dans le navigateur hors session collègue** : la copie locale (`localStorage`) ne contient que jours, plats, paramètres et sommes anonymes ; le mot de passe et l'état complet ne vivent qu'en mémoire, jamais dans l'URL, le stockage, un service worker ou le cache HTTP — et l'état complet doit être **purgé à la déconnexion** (ce que le code actuel ne fait pas, a-1).
2. **Affichage immédiat depuis le cache, lecture en vol avant le bundle** : premier rendu synchrone depuis `reservations-cache-v1` (même clé, même format), lecture lancée par un script inline du `<head>` avec l'etag, `?since=` à chaque lecture, lecture doublée à 6 s et 2e tentative à 1,5 s, jamais de rejeu d'écriture ; réservation possible sur données encore périmées (le serveur fait foi).
3. **Idempotence par `requestId`** : un identifiant généré à l'ouverture de chaque formulaire de réservation (public et ajout collègue), conservé pour tout nouvel essai tant que le formulaire est ouvert, renouvelé à chaque ouverture ; `_duplicate` traité sans seconde réservation.
4. **Cut-off d'Aristide à 10 h** : à partir de 10 h le jour J et pour tout jour passé, pas de commande publique en ligne ; message exact de clôture ; bascule automatique à 10 h pile sans rechargement (formulaire ouvert fermé) ; contrôle repris à l'envoi ; les collègues n'y sont pas soumis. *Écart assumé : l'heure de référence devient celle de Paris (D-12).*
5. **Un ticket restaurant par commande** : un jour avec au moins un plat au ticket est « sur place » uniquement, et le montant d'une commande compte au plus **un** ticket, quels que soient le nombre de plats et de portions au ticket (le script, lui, n'en sait rien).

### 1.5 Critères de réussite mesurables

| # | Critère | Mesure | Seuil | Vérifié en |
| --- | --- | --- | --- | --- |
| S1 | Parité fonctionnelle | Chaque écran et état de `09` (G-01 à G-08, P-01 à P-17, L-01, C-01 à C-30, I-01 à I-04) couvert par au moins un scénario de la suite de régression (`e2e/regression/`), vert contre l'ancien site (projet `legacy`) puis contre le nouveau (projet `react`) ; matrice de parité `docs/migration/parite.md` remplie dès P1 | 100 % des lignes de `09`, écarts `@changed` = ceux du § 4.2, ni plus ni moins | P1, P4 à P7 |
| S2 | Textes exacts | Tests qui comparent les chaînes rendues (via l'instance `intl`) à celles de `04` § 9, `06`, `07`, `00` § 2.3 et `03` § 3.1, espaces insécables comprises ; `translations/fr.json` relu contre la spec | 0 écart non listé | P4 à P6 |
| S3 | Budget JS initial (visiteur public, `/`) | `scripts/check-budget.mjs` : somme gzip du point d'entrée, du chunk de la route `/` et de leurs imports statiques (manifeste Vite) | ≤ 200 kB gzip ; CSS ≤ 25 kB gzip | CI dès P0 |
| S4 | Premier rendu depuis la copie locale | E2E : `localStorage` prérempli, réponse du script retenue 5 s → calendriers et fiches visibles avant la réponse, sans squelette | aucun squelette visible, aucune erreur console | P4, P7 |
| S5 | Accessibilité | `@storybook/addon-a11y` en mode `error` sur chaque story (exécutée comme test Vitest navigateur) ; `@axe-core/playwright` sur quelques écrans complets (P7) | 0 violation (aucune liste d'exceptions) | P3 à P7 |
| S6 | Effets | `grep -rE "use(Layout)?Effect\(" src --include=*.tsx --include=*.ts` en CI | 0 à 2 occurrences, chacune commentée | CI dès P4 |
| S7 | Qualité | `pnpm check` (format, lint, `tsc`, tests, knip) et build | vert sur chaque commit de la branche | CI |
| S8 | Données personnelles | Tests : après déconnexion, aucune entrée `['state','staff']`, cache des mutations vide, aucun nom dans le DOM ; mot de passe absent de `localStorage`, `sessionStorage`, de l'URL et des clés de requête | 0 fuite | P5 |
| S9 | Validation humaine | Build de la branche (local ou artefact CI, `node scripts/serve-pages.mjs`) utilisé par les collègues sur le vrai script avant la fusion | accord écrit du responsable | P7 |

---

## 2. Stack arrêtée

Versions relevées le 3 octobre 2026 dans les rapports (colonne « Source ») ; les revérifier au début de P0 et les épingler exactement (`save-exact`).

| Paquet | Version | Rôle | Source |
| --- | --- | --- | --- |
| `pnpm` | 12.8.1 (`packageManager`) | Gestionnaire de paquets ; `pnpm-workspace.yaml` avec `trustPolicy: no-downgrade`, `strictDepBuilds`, `allowBuilds: { msw: false }`, `peerDependencyRules` (vite 8, typescript 7) | toolchain § 6, element-admin § 1.7 |
| Node | 22 LTS ≥ 22.22.2 (`.node-version`) | ≥ 22.22.2 (relevé de toolchain § 6) ; msw 3 exige ≥ 22.12 | toolchain § 6 |
| `react`, `react-dom` | 19.3.0 | UI ; `ref` en prop, `<ViewTransition>` stable | react-architecture § 1 |
| `@tanstack/react-start` | 1.168.60 | Coquille SPA prérendue, plugin Vite, génération des routes | tanstack-start § 2 |
| `@tanstack/react-router` | 1.170.41 | Routage par fichiers, search params validés | tanstack-start § 4 |
| `@tanstack/react-query` | 5.104.1 | Données du script, cache, actualisation, mutations | tanstack-query § 1 |
| `@tanstack/react-form` | 1.33.5 (rester en 1.x) | Formulaires (`createFormHook`, `revalidateLogic`) | ui-forms § 5 |
| `@base-ui/react` | 1.8.0 | Primitives accessibles non stylées | ui-forms § 1 |
| `zustand` | 5.0.15 | Store de session et horloge | react-architecture § 3 |
| `valibot` | 1.5.0 | Schémas des réponses, search params, formulaires (Standard Schema) | tanstack-query § 10 |
| `vite` | 8.3.2 | Build (Rolldown, Oxc), `resolve.tsconfigPaths` | tanstack-start § 1 |
| `@vitejs/plugin-react` | 6.1.1 | Fast Refresh, `compiler: true` | toolchain § 7 |
| `oxc-transform-react` | ~0.145.0 | React Compiler en Rust (**expérimental**) ; 0.152 incompatible avec plugin-react 6.1 | tanstack-start § 1 |
| `typescript` | 7.0.2 (`tsc`) | Vérification de types (compilateur natif) ; pas de `baseUrl` | toolchain § 1 |
| `oxlint` + `oxlint-tsgolint` | 1.86.0 + 7.0.2003 (à monter ensemble) | Lint pédantique, règles typées, `typeCheck`, règles React Compiler natives | toolchain § 2-3 |
| `@tanstack/eslint-plugin-query`, `@tanstack/eslint-plugin-router` | 5.104.1, 1.162.0 | Règles TanStack chargées par `jsPlugins` (**alpha**) | toolchain § 1 |
| `oxfmt` | 0.71.0 | Formatage (tri des imports, `package.json`) | toolchain § 4 |
| `react-intl` | 12.1.3 | Tous les textes de l'interface (`FormattedMessage`, `useIntl`, `createIntl`), pluriels et ordinaux ICU, montants et dates ; langue unique `fr-FR` (arbitrage 11) | element-admin (`src/intl.tsx`, react-intl 12.0.1) ; § 3.10 |
| `@formatjs/unplugin` | 1.2.12 | Plugin Vite : messages précompilés en AST (`ast: true`), donc pas d'analyseur ICU dans le bundle de production | element-admin (`vite.config.ts`) ; README du paquet |
| `@formatjs/cli` | 6.16.32 | `formatjs extract` → `translations/fr.json` (versionné, contrôlé en CI) | element-admin (`i18n:extract`) |
| `eslint-plugin-formatjs` | 8.1.0 | Règles FormatJS chargées par `jsPlugins` d'oxlint (déjà en production chez element-admin, 8.0.1) | element-admin (`.oxlintrc.json`) |
| `knip` | 6.39.0 | Code et dépendances morts (deux passes) | toolchain § 6 |
| `lefthook` | 2.1.16 | Hooks git (pre-commit, pre-push) | toolchain § 6 |
| `vitest` | 5.0.3 | Tests : projet `node` (`domain/`, `api/`, tests dorés en `vm`) et projet `browser` (`ui/`, `features/`, `routes/`, stories) | toolchain § 6 ; arbitrage 13 |
| `@vitest/browser-playwright` | 5.0.3 | Vitest Browser Mode, fournisseur Playwright, Chromium headless (remplace jsdom) | arbitrage 13 |
| `vitest-browser-react` | 2.3.0 | `render` et `page.getByRole`… dans le navigateur ; `userEvent` de `vitest/browser` (remplace Testing Library) | arbitrage 13 |
| `storybook`, `@storybook/react-vite`, `@storybook/addon-vitest`, `@storybook/addon-a11y` | 10.6.1 | Stories de `ui/` et des fiches, formulaires et panneaux dans leurs états de `09` ; chaque story exécutée comme test Vitest navigateur (plugin `storybookTest`) et contrôlée par axe (mode `error`) | arbitrage 13 |
| `msw-storybook-addon` | 3.0.3 | Handlers msw du faux script dans les stories | arbitrage 13 |
| `msw` | 3.0.2 | Faux Apps Script unique (`src/mocks/apps-script.ts`) : service worker (`setupWorker`, `public/mockServiceWorker.js` généré par `msw init`, versionné, exclu du build de production) dans les tests navigateur et Storybook ; Node (`setupServer`) pour d'éventuels tests d'`api/` | tanstack-query § 9 ; arbitrage 13 |
| `@playwright/test` | 1.63.0 | E2E sur le build servi en statique : suite de régression (projets `legacy` et `react`) et parcours complets | react-architecture § 0 ; arbitrages 13 et 14 |
| `@msw/playwright` | 0.7.0 (compatibilité msw 3 à vérifier en P0) | Mêmes handlers du faux script en E2E, contre l'ancien et le nouveau site | element-admin § 8 |
| `@axe-core/playwright` | à relever en P0 | Accessibilité E2E | element-admin § 8 |
| `@tanstack/react-query-devtools`, `@tanstack/react-router-devtools` | 5.104.1, 1.167.2 | Développement seulement (retirés du build) | tanstack-start § 6 |
| `@fontsource-variable/outfit`, `@fontsource-variable/work-sans` | 5.3.0 | Polices auto-hébergées, **si D-23 est retenue** | react-architecture § 9 |
| `stylelint` + `stylelint-config-standard` + `stylelint-declaration-strict-value` | à relever | Optionnel : interdire couleurs, tailles et rayons en dur | element-admin § 1.7 |

Exclus volontairement : Tailwind, ESLint, Prettier, zod, date-fns, Temporal et son polyfill, react-aria, react-day-picker (dépend de date-fns 4, pas de vue semaine : calendrier maison, § 3.5), jsdom et Testing Library (remplacés par Vitest Browser Mode, arbitrage 13), `PersistQueryClientProvider` et les persisteurs Query, `react-to-print`, bibliothèque d'icônes, `@tanstack/router-plugin` (Start l'embarque).

### 2.1 Éléments expérimentaux ou jeunes, et plan B

| Élément | Statut | Signal d'abandon | Plan B |
| --- | --- | --- | --- |
| TanStack Start en mode SPA (hydratation de la coquille) | stable mais issues ouvertes #8473, #6455 (erreur React #418) | erreur #418 ou flash visible du squelette quand la copie locale existe (spike P0) | **Router seul** comme element-admin : `index.html` écrit à la main (script anticipé avant la CSS), `src/main.tsx` avec `createRoot` (pas d'hydratation), `@tanstack/router-plugin` (`autoCodeSplitting`), `<title>` React 19 ; le reste du code (routes, Query, UI) ne change pas |
| React Compiler Rust (`react({ compiler: true })`) | marqué « experimental » | erreur de build, comportement différent en prod | `compiler: { compilationMode: "annotation" }`, ou voie Babel `@rolldown/plugin-babel` + `reactCompilerPreset()`, ou désactivation (le code reste correct, seulement moins mémoïsé ; les règles de lint du compilateur restent actives dans oxlint) |
| `jsPlugins` d'oxlint (règles TanStack et FormatJS) | alpha, hors semver | plantage ou faux positifs après une mise à jour | retirer le plugin en cause (perte de ses règles seulement) ; `formatjs extract --throws` en CI garde le contrôle des messages ; les règles typées des plugins sont déjà inactives |
| `@formatjs/unplugin` (`ast: true`) | 1.x, récent (oxc-parser) | message mal transformé, espaces modifiées | garder l'analyseur ICU (sans l'alias `no-parser`, environ +7 kB gzip) ou précompiler avec `formatjs compile --ast` et charger `translations/compiled/fr.json` comme element-admin |
| `oxfmt` 0.x | bêta | régression de formatage | Prettier 3.8 avec la même config (oxfmt est compatible) |
| `options.typeCheck` d'oxlint | récent | divergence avec `tsc` | `tsc --noEmit` reste en CI de toute façon |
| `@msw/playwright` 0.x avec msw 3 | compatibilité non vérifiée | échec d'installation ou d'interception | `page.route('https://script.google.com/**')` natif de Playwright avec le même faux script |
| TypeScript 7 (pas d'API JS) | stable | un outil exige l'API JS | `@typescript/typescript6` en parallèle pour cet outil seulement |

---

## 3. Architecture cible

### 3.1 Arborescence

Alias `@/*` → `src/*` (`paths` du `tsconfig.json`, sans `baseUrl`, et `resolve.tsconfigPaths: true`). Noms de fichiers : composants en `PascalCase.tsx`, modules en `kebab-case.ts`, routes selon la convention TanStack. Pas de fichier `index.ts` de réexport.

**Langue du code (arbitrage 12, comme AppResaAristide)** :
- **Anglais seulement** pour tout ce qui est du code : identifiants (variables, fonctions, types, composants, hooks, clés de requête et de mutation, valeurs d'énumération comme `SessionEnd`), noms de fichiers et de dossiers sous `src/`, `e2e/` et `scripts/`, ids des messages react-intl et noms de leurs placeholders, noms de formats, classes CSS et noms de page `@page` nouveaux, commentaires. Le vocabulaire métier suit le glossaire de l'annexe E (couvert → `seat`, plat → `dish`, réservation → `booking`, commande R2 → `order`, ticket restaurant → `voucher`, collègue → `staff`…) ; un terme absent du glossaire y est ajouté avant d'être utilisé.
- **Français** pour tout ce que voit l'utilisateur : `defaultMessage` react-intl recopiés de la spec, textes des toasts, libellés, `aria-label`.
- **Français** pour la documentation : ce plan, `docs/spec/`, `docs/migration/`, `README.md`, et la prose de `CLAUDE.md` (dont les noms de fichiers de documentation, comme `docs/migration/parite.md`).
- **Exceptions, parce qu'elles sont visibles de l'utilisateur ou imposées par un contrat extérieur** : le chemin d'URL `/collegue` (cité dans `09` ; le fichier de route reste donc `routes/collegue.tsx`, puisque TanStack Router déduit le chemin du nom de fichier) ; les noms et valeurs des search params (`r1`, `r2`, `r1vue`, `r2vue`, `r1periode`, `r2periode`, `semaine`, `mois`, `reserver`, `connexion`, `retour`, `ouvrir`, `ouvrirDate`, `parametres`, `editJour`, `editResa`, `ajout`, `ajoutPlat`, `editPlat`) ; les champs de l'API de `Code.gs` (`Date`, `Capacite`, `Qte`, `Nom`, `ItemID`, `nbEleve`, `mode: 'surplace'`…) et ceux de la copie locale `reservations-cache-v1`, qui n'apparaissent **que** dans `src/api/schemas.ts`, `src/api/actions.ts`, `src/queries/local-cache.ts`, leurs tests et les fixtures (traduction à la frontière, § 3.3.6) ; les clés `localStorage` existantes ; les noms des anciens fichiers et fonctions cités comme sources (`legacy/js/donnees.js`, `loadCache`).

```
reservations-restaurants/
├── .github/
│   ├── workflows/ci.yml        format → lint → tsc → tests → knip → build → budget → E2E sur la branche d'intégration et les PR, SANS déploiement ;
│   │                           déploiement Pages (upload-pages-artifact → deploy-pages) depuis main seulement, actif à partir de la bascule (P8) ; actions épinglées par SHA
│   └── dependabot.yml          mises à jour groupées (tanstack, vite, react, types) avec délai de 7 jours
├── .editorconfig .gitignore .node-version .npmrc     repris de recherche/toolchain-files ; .gitignore OBLIGATOIRE (node_modules, dist, .output, coverage, .tanstack, playwright-report, test-results)
├── .oxlintrc.json .oxfmtrc.json                      repris de recherche/toolchain-files, alias @/ (§ 5, P0)
├── .vscode/                    extensions et réglages recommandés (oxc, TypeScript 7)
├── .storybook/                 main.ts (react-vite, addon-vitest, addon-a11y, msw-storybook-addon), preview.tsx (RawIntlProvider, QueryClient neuf, accent, handlers msw, a11y en mode error)
├── lefthook.yml                pre-commit : oxlint --fix puis oxfmt sur les fichiers indexés ; pre-push : pnpm check
├── package.json                scripts (dev, build, typecheck, lint, format, test, test:e2e, storybook, build-storybook, knip, i18n:extract, check), knip (stories comprises), packageManager
├── pnpm-workspace.yaml         politique de sécurité de la chaîne d'approvisionnement
├── tsconfig.json               strict TS 7 (types: ["vite/client"], noUncheckedIndexedAccess, exactOptionalPropertyTypes…)
├── vite.config.ts              Start SPA, base via BASE_PATH, React Compiler, FormatJS (§ 3.11)
├── vitest.config.ts            sans le plugin Start, alias @/ ; projets `node` (domain/, api/, tests dorés) et `browser` (Vitest Browser Mode, Chromium headless via
│                               @vitest/browser-playwright : ui/, features/, routes/, et les stories par le plugin storybookTest)
├── playwright.config.ts        Chromium, fr-FR, Europe/Paris, serveur statique scripts/serve-pages.mjs ; projets `legacy` (racine servie : legacy/) et `react` (dist/client),
│                               même suite, baseURL et racine différentes (arbitrage 14)
├── CLAUDE.md                   règles du projet pour les agents (ébauche : annexe C)
├── README.md                   présentation, installation Apps Script (inchangée), développement, déploiement
├── Code.gs                     backend, INCHANGÉ
├── charte-graphique.pdf logo.png                     inchangés (logo.png sert au README)
├── docs/spec/                  spécification de l'appli actuelle (référence fonctionnelle)
├── docs/migration/             ce plan, les rapports de recherche, la matrice de parité (P7)
├── translations/fr.json        messages extraits par `formatjs extract` (id → defaultMessage + description) ; versionné, contrôlé en CI, non chargé à l'exécution
├── legacy/                     BRANCHE D'INTÉGRATION SEULEMENT : index.html, app.css, design-system.css, js/ (git mv, inchangés) ; jamais publié ;
│                               sert aux tests dorés (loadCache, formatEuro) et libère la racine pour Vite ; supprimé en P8
├── public/                     fichiers copiés tels quels (logo de l'en-tête si non inliné, CNAME éventuel) ; mockServiceWorker.js (msw init, versionné, exclu du build de production)
├── scripts/
│   ├── post-build.mjs          copie dist/client/index.html en 404.html
│   ├── serve-pages.mjs         émulateur GitHub Pages (`--root`, `--base` ; dossier → index.html, sinon 404.html avec statut 404) pour l'E2E (legacy/ et dist/client), la prévisualisation et la validation par les collègues
│   └── check-budget.mjs        budget JS/CSS initial à partir du manifeste Vite (échec au-delà du seuil)
├── e2e/
│   ├── fixtures.ts             fixture réseau @msw/playwright (mode strict, handlers de src/mocks/) + horloge + storageState neuf par test
│   ├── pages/                  page objects sémantiques (rôles, libellés, textes de la spec ; jamais de classe ni d'id) : openDay, bookR1, orderR2, login…
│   ├── regression/*.spec.ts    suite de régression (arbitrage 14) : 30 à 40 scénarios, étiquettes @parity / @changed, jouée sur les projets legacy et react
│   └── *.spec.ts               parcours propres au nouveau code : hydration (premier rendu depuis la copie), print-pdf, a11y (quelques écrans), smoke-production
└── src/
    ├── router.tsx              getRouter() : QueryClient, restauration de la copie locale, routeur, abonnement de session, tâches de fond
    ├── routeTree.gen.ts        GÉNÉRÉ par le plugin Start, commité, ignoré par oxlint et oxfmt
    ├── config.ts               APPS_SCRIPT_URL (import.meta.env.VITE_APPS_SCRIPT_URL) et isConfigMissing()
    ├── routes/
    │   ├── __root.tsx          shellComponent (html, head, ScriptOnce de lecture anticipée, body), head(), contexte typé ; AUCUN loader ni beforeLoad
    │   ├── index.tsx           page publique : validateSearch, loader (état public), composant < 40 lignes
    │   ├── collegue.tsx        mode collègue (nom imposé par l'URL /collegue) : validateSearch, beforeLoad (garde), loader (état complet), composant < 40 lignes
    │   ├── index[.]html.tsx    redirection des anciens favoris …/index.html vers /
    │   └── $.tsx               attrape-tout « Page introuvable » (limite aussi l'issue #8473)
    ├── domain/                 PUR : ni React, ni DOM, ni fetch ; testé par tables de cas ; ne connaît que le modèle anglais (§ 3.3.6)
    │   ├── constants.ts        valeurs de 00 § 2.1 (14 j, 6 s, 1,5 s, 3 min, 10 h, 12 h, 4 s, 10 min, seuils)
    │   ├── types.ts            IsoDate, Restaurant ('r1' | 'r2'), ServiceMode ('dineIn' | 'takeaway'), modèle de domaine (ServiceDayR1, Dish, BookingR1…) déduit des schémas
    │   ├── dates.ts            arithmétique ISO en UTC : addDays, mondayOf, weekCells, monthCells, addMonthsClamped, keyTargetIso
    │   ├── paris.ts            parisDate(ms), parisHour(ms) (repris d'AppResaAristide convex/model/dates.ts)
    │   ├── gauge.ts            pourcentage de jauge (gaugeStyle) ; aucun formatage de texte dans domain/
    │   ├── vouchers.ts         VOUCHER_MARK, VOUCHER_MARK_RE, plainName, withVoucherMark, hasVoucherMark, dayHasVoucher, serviceMode
    │   ├── capacity.ts         index de l'état (WeakMap), remainingSeats, remainingStock, dishesForDay, capacityClass, dayStatusR1/R2
    │   ├── pricing.ts          priceR1 (r1Total), r2Amounts, orderAmounts (un ticket) : des nombres, le texte est fait par intl/
    │   ├── cutoff.ts           isR2OrderingClosed(iso, now), isPast(iso, today)
    │   ├── navigation.ts       transformations pures des search params : selectDay, shiftPeriod, goToToday, publicSearch
    │   ├── validation.ts       validateurs (repris d'AppResaAristide src/lib/validators.ts) et règles des formulaires
    │   ├── bookings.ts         entrées des actions de réservation (modèle anglais), résumés R1/R2 (booking summary), lecture du résultat d'une écriture
    │   └── print.ts            regroupement R2 par client (Order), tris, totaux imprimés (un ticket par commande)
    ├── intl/                   textes et formats (react-intl, fr-FR seul) : § 3.10
    │   ├── intl.ts             instance unique createIntl (locale et defaultLocale fr-FR, formats, defaultRichTextElements, onError) ; sert au provider ET hors composants
    │   ├── formats.ts          formats nommés : number.euro, date.weekday, date.month, date.year, date.dayMonth, date.monthYear, date.printedOn
    │   ├── common-messages.ts  defineMessages des textes partagés (Annuler, Fermer, Réserver, Enregistrer, Confirmer ?, message de clôture R2…)
    │   ├── dates.ts            formatLongDate (« jeudi 1er octobre 2026 »), libellés de période du calendrier
    │   ├── amounts.ts          textes de montants (euros + tickets, « hors plats sans prix indiqué »), prix d'un plat
    │   └── types.d.ts          augmentation FormatjsIntl : ids typés d'après translations/fr.json, formats typés
    ├── api/                    sans React ni Query ; testable seul ; SEUL endroit (avec queries/local-cache.ts) où vivent les champs du script
    │   ├── errors.ts           BusinessError, PasswordRejectedError, ServiceError, errorMessage()
    │   ├── schemas.ts          schémas valibot qui valident les réponses du script ET les traduisent en modèle anglais (v.pipe + v.transform) :
    │   │                       PublicState, FullState, ReadResponse, WriteResponse ; § 3.3.6
    │   ├── transport.ts        readJson, getState(since, signal), postAction(action, payload, { signal })
    │   ├── signals.ts          anySignal(...signals) et timeoutSignal(ms) : repli de AbortSignal.any / timeout (Safari < 17.4)
    │   ├── hedged-read.ts      hedgedRead() : seconde lecture à 6 s, la première réponse gagne, la perdante est annulée
    │   ├── early-fetch.ts      earlyFetchScript (texte du script inline) et takeEarlyFetch(since)
    │   ├── state.ts            fetchPublicState({ since, signal }), fetchFullState(password, signal)
    │   ├── actions.ts          une fonction typée par action POST de 02 § 4 (jamais addBookingR2 ni checkPassword) : entrée en modèle anglais,
    │   │                       corps recomposé avec les noms attendus par le script (nom, classe, nbEleve, itemId, qte, mode…)
    │   └── request-id.ts       newRequestId() : requestId (crypto.randomUUID, repli de 02 § 5.3)
    ├── queries/
    │   ├── client.ts           createQueryClient() : défauts, QueryCache/MutationCache onError (mot de passe changé)
    │   ├── state.ts            stateKeys, publicStateOptions (queryFn etag), staffStateOptions(id)
    │   ├── local-cache.ts      LocalCacheV1 (schéma du format v1, champs tels quels), restoreLocalCache, persistLocalCache, readFallbackTexts,
    │   │                       conversions v1 ↔ PublicState dans les deux sens
    │   ├── use-app-state.ts    useAppState(select), useIsFromCache(), <AutoRefresh/> (seul observateur avec refetchInterval)
    │   └── purge.ts            purgeStaffSession(queryClient)
    ├── mutations/
    │   ├── bookings.ts         useBookR1, useOrderR2 (public et ajout collègue)
    │   └── staff.ts            useLogin, jours, plats, réservations, paramètres (une fabrique mutationOptions par action)
    ├── session/session.ts      store Zustand non persisté (password, id, endReason, open, close)
    ├── background/
    │   ├── start.ts            startBackgroundTasks({ queryClient, router }) : idempotent, arrête l'instance précédente (HMR, tests)
    │   ├── inactivity.ts       activité notée sans rendu, minuteur unique, revérification au retour (10 min)
    │   └── clock.ts            store useClock (tic aligné sur la minute), useToday(), useIsR2OrderingClosed(iso), fermeture du formulaire R2 à 10 h
    ├── ui/                     Base UI enveloppé une seule fois, sans métier (tableau § 3.5)
    ├── features/
    │   ├── page/               Page (deux colonnes), PublicPage et StaffPage (assemblage par mode), Column, Header,
    │   │                       ModeSwitch (Client/Collègue + connexion), Footer, ConfigBanner, LoadErrorBox, LoadErrorPage, PageSkeleton
    │   ├── calendar/           RestaurantCalendar (en-tête, vues, grille, navigation par l'URL), search.ts (schéma CalendarSearch partagé, CALENDAR_KEYS)
    │   ├── r1/                 DayCardR1, BookingFormR1 (chargé à la demande), SeatCountersR1
    │   ├── r2/                 DayCardR2, DishRow, OrderFormR2 (chargé à la demande)
    │   ├── booking/            BookingSummary, IdentityFields (withFieldGroup)
    │   ├── staff/              TomorrowPanel, SettingsPanel, OpenDayFormR1/R2, OpenDatePicker, EditDayFormR1/R2, DishForm,
    │   │                       BookingList, BookingRow, EditBookingFormR1/R2, AddBookingFormR1/R2, PriceSuggestions
    │   └── print/              ListDocumentR1, ListDocumentR2, TomorrowDocumentR1, TomorrowDocumentR2 (chargés au clic)
    ├── styles/
    │   ├── tokens.css          § 1-2 de design-system.css : jetons :root, thèmes .accent-green / .accent-magenta (+ [data-accent])
    │   ├── base.css            § 3 et 5 : base, :focus-visible, keyframes partagées, prefers-reduced-motion, cibles tactiles
    │   └── print.css           @media print, page nommée « list » (A4 paysage), masquage de l'appli
    ├── mocks/                  apps-script.ts : faux Apps Script UNIQUE à état mutable (GET ?since, toutes les actions POST de 02 § 4, erreurs exactes, unchanged, _duplicate,
    │                           ajustements R2, verrou, mot de passe changé, lenteur paramétrable, page HTML d'erreur), partagé par Vitest navigateur, Storybook et l'E2E ;
    │                           fixtures/ : JSON des exemples de 02 et 03 § 1.1, champs du script tels quels ; browser.ts (setupWorker), node.ts (setupServer)
    ├── test/                   setup du projet browser (worker msw, RawIntlProvider), render.tsx (renderWithProviders : QueryClient + RawIntlProvider ; renderRoute), fabriques d'états
    └── vite-env.d.ts           ImportMetaEnv : VITE_APPS_SCRIPT_URL
```

Règles de dépendance (vérifiées par `import/no-cycle` et en revue) : `domain` n'importe rien d'autre ; `intl` n'importe que `domain` ; `api` n'importe que `domain` et `config` ; `queries`, `mutations`, `session`, `background` n'importent ni `features` ni `ui` ; `ui` n'importe ni `api` ni `queries` ; `features` assemble ; `routes` déclarent et délèguent. Le code du mode collègue n'est importé que depuis `routes/collegue.tsx` (découpage automatique), les formulaires publics et l'impression par `lazy()` / `import()` explicites.

### 3.2 Routes et search params

| Route | Fichier | Rôle |
| --- | --- | --- |
| racine | `routes/__root.tsx` | Document HTML (`shellComponent`), `head()`, `<ScriptOnce>`, `<Toaster/>` (le `RawIntlProvider` est posé par le `Wrap` du routeur). Neutre vis-à-vis de l'URL (pas de lien actif, pas de titre selon la route). Aucun loader : il s'exécuterait au build. |
| `/` | `routes/index.tsx` | Page publique (G-01 à G-07, P-01 à P-17, L-01). |
| `/collegue` | `routes/collegue.tsx` | Même page en mode collègue (G-08, C-01 à C-30, I-01 à I-04). `beforeLoad` : sans mot de passe en mémoire, `redirect({ to: '/', search: { ...publicSearch(search), connexion: true, retour: location.href } })`. |
| `/index.html` | `routes/index[.]html.tsx` | `redirect({ to: '/', replace: true })`. |
| `*` | `routes/$.tsx` | « Page introuvable » avec un lien vers l'accueil. |

Les deux pages partagent `features/page/Page.tsx` ; la route fournit les blocs propres à son mode (fiches publiques ou fiches collègue, panneaux collègue), ce qui garde le code collègue hors du chunk public.

**Schéma commun `CalendarSearch`** (les deux routes) et paramètres propres. `IsoDate = v.pipe(v.string(), v.isoDate())`. Tous les paramètres sont facultatifs et protégés par `v.fallback` : une URL abîmée n'affiche jamais d'erreur.

| Paramètre | Route | Type valibot | Défaut | Fallback | Écrit par | Remarques |
| --- | --- | --- | --- | --- | --- | --- |
| `r1`, `r2` | les deux | `v.fallback(v.optional(IsoDate), undefined)` | absent = aujourd'hui à Paris, **résolu dans le composant** (horloge), jamais dans `validateSearch` (qui doit rester pur) | `undefined` | clic sur un jour (push) ; flèches du clavier (`replace`) ; « Aujourd'hui » (retire le paramètre, `replace`) ; « Réserver » (écrit la date explicitement, pour ne pas changer de jour à minuit) | `05` § 1, `09` § 1 |
| `r1vue`, `r2vue` | les deux | `v.fallback(v.optional(v.picklist(['semaine', 'mois']), 'semaine'), 'semaine')` | `semaine` | `semaine` | segments Semaine / Mois (`replace`) | retiré de l'URL s'il vaut `semaine` (`stripSearchParams`) ; l'ancre est conservée (`05` § 3.1) |
| `r1periode`, `r2periode` | les deux | `v.fallback(v.optional(IsoDate), undefined)` | absent = période du jour sélectionné | `undefined` | ‹ › (`replace`) | ancre de `05` § 1 ; effacée par toute sélection de jour, par « Aujourd'hui » et par la navigation au clavier (la vue suit la sélection) ; retirée si elle tombe dans la période du jour sélectionné |
| `reserver` | `/` | `v.fallback(v.optional(v.picklist(['r1', 'r2'])), undefined)` | absent | `undefined` | « Réserver » (push) ; « Annuler » et succès (retire, `replace`) | formulaire rendu seulement si le jour est réservable (non passé, places, R2 non clos) ; un seul formulaire public à la fois (D-11) |
| `connexion` | `/` | `v.fallback(v.optional(v.boolean(), false), false)` | `false` | `false` | segment « Collègue » ; retiré par « Client », Échap, succès | panneau L-01 ; **`?connexion=1` est un nombre et tombe dans le fallback** : écrire `search={{ connexion: true }}` |
| `retour` | `/` | `v.fallback(v.optional(v.pipe(v.string(), v.startsWith('/collegue'))), undefined)` | absent | `undefined` | garde de `/collegue` | URL rouverte après connexion ; limitée à `/collegue` (pas de redirection ouverte) |
| `ouvrir` | `/collegue` | `v.fallback(v.optional(v.picklist(['r1', 'r2'])), undefined)` | absent | `undefined` | résumé « + Ouvrir un jour » | C-04, C-06 |
| `ouvrirDate` | `/collegue` | `v.fallback(v.optional(IsoDate), undefined)` | jour sélectionné du restaurant | `undefined` | sélecteur de date C-05 | retiré quand on choisit un jour dans ce restaurant (`05` § 3.3) |
| `parametres` | `/collegue` | `v.fallback(v.optional(v.boolean(), false), false)` | `false` | `false` | résumé « Paramètres » | C-02 |
| `editJour` | `/collegue` | `v.fallback(v.optional(v.picklist(['r1'])), undefined)` (R1 seulement : D-09 non retenue) | absent | `undefined` | « Modifier ce jour » | jour = `r1` de l'URL (C-13) |
| `editResa` | `/collegue` | `v.fallback(v.optional(v.pipe(v.string(), v.regex(/^r[12]:[\w-]{1,64}$/))), undefined)` | absent | `undefined` | « Modifier » d'une ligne | `{restaurant}:{ID}` ; ignoré si la réservation n'existe plus (C-11, C-24) |
| `ajout` | `/collegue` | `v.fallback(v.optional(v.pipe(v.string(), v.regex(/^(r1\|r2:[\w-]{1,64})$/))), undefined)` | absent | `undefined` | « + Ajouter une personne » | `requestId` créé au montage du formulaire (C-12, C-23) |
| `ajoutPlat` | `/collegue` | `v.fallback(v.optional(v.boolean(), false), false)` | `false` | `false` | « + Ajouter un plat à ce jour » | jour = `r2` (C-21) |
| `editPlat` | `/collegue` | `v.fallback(v.optional(v.pipe(v.string(), v.regex(/^[\w-]{1,64}$/))), undefined)` | absent | `undefined` | « Modifier ce plat » | C-22 |

Middlewares sur les deux routes : `retainSearchParams(['r1', 'r2', 'r1vue', 'r2vue', 'r1periode', 'r2periode'])` (on garde les calendriers en passant de `/` à `/collegue` et inversement) et `stripSearchParams` sur les valeurs par défaut. Jamais de donnée saisie dans l'URL (nom, contact, quantités) ; le récapitulatif reste un état local (`09` § 8.5).

**Transformations pures** (`domain/navigation.ts`, testées par tables) : `selectDay(search, restaurant, iso)` pose `rX`, retire `rXperiode`, et ferme ce qui dépend du jour **dans ce restaurant seulement** (`reserver` s'il vaut ce restaurant, `ouvrirDate` si `ouvrir` vaut ce restaurant, `editJour`, `editResa` et `ajout` de ce restaurant, `ajoutPlat` et `editPlat` pour R2) : c'est la correction de a-12. `shiftPeriod(search, restaurant, ±1, view)`, `goToToday(search, restaurant)`, `publicSearch(search)` (garde seulement les clés du calendrier). Le récapitulatif, état local de la colonne, est effacé par le gestionnaire qui appelle `selectDay`.

Exemple (route publique) :

```tsx
// src/routes/index.tsx
import { createFileRoute, retainSearchParams, stripSearchParams } from "@tanstack/react-router";
import * as v from "valibot";

import { CalendarSearch, CALENDAR_KEYS } from "@/features/calendar/search";
import { PublicPage } from "@/features/page/PublicPage";
import { publicStateOptions } from "@/queries/state";

const HomeSearch = v.object({
  ...CalendarSearch.entries,
  reserver: v.fallback(v.optional(v.picklist(["r1", "r2"])), undefined),
  connexion: v.fallback(v.optional(v.boolean(), false), false),
  retour: v.fallback(v.optional(v.pipe(v.string(), v.startsWith("/collegue"))), undefined),
});

export const Route = createFileRoute("/")({
  validateSearch: HomeSearch,
  search: {
    middlewares: [
      retainSearchParams(CALENDAR_KEYS),
      stripSearchParams({ r1vue: "semaine", r2vue: "semaine", connexion: false }),
    ],
  },
  // With the local cache: resolves at once (staleTime 'static'), no skeleton.
  // Without it: waits for the first read (shell skeleton, then errorComponent on failure).
  loader: ({ context: { queryClient } }) => queryClient.query({ ...publicStateOptions, staleTime: "static" }),
  pendingMs: 0,
  component: PublicPage,
});
```

### 3.3 Cycle de vie des données

Clés : `['state', 'public']` (état public, seul persisté), `['state', 'staff', id]` (état complet, mémoire seulement, `id` = numéro de session), mutations `['write', domain, action]` avec `scope: { id: 'write' }` (écritures envoyées l'une après l'autre). Jamais de mot de passe ni d'empreinte dans une clé.

Réglages par défaut (`queries/client.ts`) :

| Option | Valeur | Raison |
| --- | --- | --- |
| `staleTime` (états public et complet) | `180_000` | aligné sur l'actualisation : `refetchOnWindowFocus` ne relit que si la dernière lecture date de plus de 3 min, ce qui reproduit le « rattrapage au retour » de `03` § 5.1 sans lectures en rafale |
| `gcTime` de l'état public | `Infinity` | l'état public reste en mémoire pendant une session collègue : il sert de repli immédiat à la déconnexion (a-1) |
| `retry` (lectures) | `(n, e) => n < 1 && !(e instanceof BusinessError) && navigator.onLine` | un seul nouvel essai, jamais pour une erreur du script, pas hors ligne (`02` § 1.5) ; dans les défauts du client pour que les tests puissent le neutraliser |
| `retryDelay` | `1500` | `02` § 1.5 |
| `refetchIntervalInBackground` | `false` | pause quand l'onglet est caché |
| mutations : `retry` / `networkMode` | `false` / `'always'` | jamais de rejeu ; hors ligne, erreur immédiate au lieu d'une mise en pause qui repartirait seule |
| `QueryCache` et `MutationCache` `onError` | `PasswordRejectedError` → `session.close('password-changed')` | remplace `adminSessionExpired` (`02` § 2) |

`queryFn` de l'état public (etag, `02` § 3.3 et § 5.1) :

```ts
// src/queries/state.ts (extrait)
export const publicStateOptions = queryOptions({
  queryKey: stateKeys.public(),
  queryFn: async ({ client, queryKey, signal }): Promise<PublicState> => {
    const previous = client.getQueryData<PublicState>(queryKey);
    // fetchPublicState: early fetch (same since, used once) or hedgedRead(getState),
    // each attempt capped at 30 s, response validated and translated by ReadResponse (valibot).
    const response = await fetchPublicState({ since: previous?.etag ?? "", signal });
    if (response.type === "state") return response.state;
    if (previous) return previous; // { unchanged }: same reference, no render, dataUpdatedAt refreshed
    return requireState(await fetchPublicState({ since: "", signal })); // edge case: never return undefined
  },
  staleTime: 180_000,
  gcTime: Number.POSITIVE_INFINITY,
});
```

#### 3.3.1 Démarrage, dans l'ordre

1. GitHub Pages sert `index.html` (ou `404.html` pour un lien profond) : la coquille prérendue au build contient les `<meta>` de `03` § 2.1 (charset, `viewport` avec `viewport-fit=cover`, `theme-color` `#FFFFFF`, description), le `<title>` `Réservations — Restaurants pédagogiques`, le favicon SVG en data-URI repris d'`index.html`, les `preconnect` vers `https://script.google.com` et `https://script.googleusercontent.com` avec `crossOrigin: 'anonymous'`, la CSS hachée, les `modulepreload`, et dans `<body>` le squelette (titres par défaut, calendriers `.sk` en `aria-hidden`).
2. Le `<ScriptOnce>` de lecture anticipée s'exécute (React le place après la CSS, voir R-12) : il lit `reservations-cache-v1` dans un `try/catch`, retient l'`etag` s'il est non vide et si `savedAt` a moins de 14 jours, lance `fetch(URL + (etag ? '?since=' + encodeURIComponent(etag) : ''))`, ajoute `.catch(() => {})`, et expose `window.__EARLY_FETCH__ = { since, response, startedAt: performance.now() }`. Il garde la `Response`, pas `r.json()`, pour que le traitement d'erreur soit celui des autres lectures.
3. Le bundle s'exécute. `getRouter()` (appelé aussi dans Node au build, d'où la garde `typeof window`) crée le `QueryClient`, puis côté navigateur : `restoreLocalCache()` valide la copie par `LocalCacheV1`, la convertit en `PublicState` et la pose par `setQueryData(['state','public'], state, { updatedAt: savedAt })` ; sans copie valide, `readFallbackTexts()` lit `reservations-textes` pour les titres du squelette ; `persistLocalCache()` s'abonne au cache ; le routeur est créé avec `context: { queryClient, session }` ; l'abonnement de session et les tâches de fond démarrent.
4. `router.load()` exécute le loader de la route : avec la copie, `queryClient.query({ ..., staleTime: 'static' })` répond aussitôt ; sans copie, il lance la `queryFn` (qui reprend la lecture anticipée) et attend, le squelette reste affiché (G-01) ; un échec sans donnée affiche l'`errorComponent` de la route, c'est-à-dire la page avec l'encadré d'échec (G-03).
5. Hydratation puis rendu : `useAppState()` renvoie la copie ; `useIsFromCache()` vaut `dataUpdatedAt < APP_START` (G-02 : « Réserver » actif, connexion collègue refusée avec le toast `Les données se chargent. Réessayez dans un instant.`).
6. `<AutoRefresh/>` se monte : la donnée restaurée est périmée, la `queryFn` part ; `takeEarlyFetch(since)` rend la lecture du `<head>` si son `since` est identique (une seule fois), sinon un nouveau `fetch` part ; la lecture doublée est armée pour le **temps restant** jusqu'à 6 s depuis `startedAt` ; un nouvel essai après 1,5 s si l'échec est transitoire et que le navigateur est en ligne.
7. Réponse : `{ unchanged: true }` → même référence, la donnée redevient fraîche, la copie est réécrite avec un `savedAt` neuf ; nouvel état → validé, partage structurel (seuls les jours modifiés sont rendus de nouveau), copie réécrite ; échec → la donnée affichée est conservée et l'encadré d'échec apparaît, avec le suffixe « copie locale » si `useIsFromCache()`.

#### 3.3.2 Actualisation

- Un seul observateur porte `refetchInterval: 180_000` : `<AutoRefresh/>`, monté une fois dans `Page` (un minuteur par observateur sinon). Il observe la même source que l'écran : état public, ou état complet si une session est ouverte (`getAdminState`, sans etag, b-7).
- L'actualisation **continue** pendant une saisie ou un formulaire ouvert (a-4) : TanStack Form garde les valeurs (`defaultValues` lues au montage seulement), la réconciliation garde le focus, et les places restantes, légendes « N au maximum » et maximums de saisie se mettent à jour sous le formulaire. L'exigence de `03` § 5.4 (aucune saisie ni focus perdu) devient un test.
- Rattrapage : `refetchOnWindowFocus` (si plus de 3 min) et `refetchOnReconnect` ; plus besoin de `refreshMissed`.
- Une lecture plus ancienne qu'une écriture ne peut pas écraser sa réponse : chaque mutation fait `await queryClient.cancelQueries({ queryKey: ['state'] })` avant `setQueryData` (remplace `writeSeq`).
- Échec d'une actualisation après un premier succès : silencieux, sauf mot de passe changé. Échec répété avant tout succès : l'encadré n'est réannoncé que si son texte change (a-21).

#### 3.3.3 Écritures

| Écriture | `mutationKey` | Corps (`02` § 4) | Réponse | `useMutation({ onSuccess })` (survit au démontage) | `mutate(…, { onSuccess })` (si le composant est encore là) |
| --- | --- | --- | --- | --- | --- |
| Réservation publique R1 / R2 | `['write','booking','r1'\|'r2']` | § 4.4 / § 4.5, textes `trim()`, `requestId` du formulaire | état public + `_duplicate`, `_emailStatus`, `_bookingResult` | `cancelQueries` ; `setQueryData(['state','public'], state)` (sans les champs `_…`) ; si une session s'est ouverte pendant l'envoi : `invalidateQueries(['state','staff'])` | récapitulatif (état local), toast, fermeture du formulaire (`replace`), focus sur le titre du récapitulatif (a-9) |
| Ajout d'une personne (collègue) | mêmes clés | mêmes corps, **sans** `password` | état public | idem + `invalidateQueries(['state','staff'])` (relecture de l'état complet, `06` § 8.5) | toast de `06` § 8.5, fermeture |
| Action collègue | `['write', domain, action]` | + `password` lu dans le store au moment de l'appel | état complet | `cancelQueries` ; `setQueryData(['state','staff', id], state)` ; `invalidateQueries(['state','public'], { refetchType: 'none' })` | toast de succès de `02` § 4.7, fermeture du panneau (`replace`) |
| Paramètres | `['write','settings','save']` | une requête `setConfigField` par champ modifié, **en séquence** dans une seule `mutationFn` | état complet après chaque requête | idem action collègue | toast singulier ou pluriel ; détail d'un échec partiel (D-20) |
| Connexion | `['login']` | `getAdminState` `{ password }` | état complet | `id = session.id + 1` ; `setQueryData(['state','staff', id], state)` **puis** `session.open(password)` (aucune suspension) | toast `Mode collègue activé.`, navigation vers `retour` ou `/collegue` en gardant les calendriers |

Règles : les réponses passent par les schémas (`_duplicate`, `_emailStatus`, `_bookingResult` deviennent `duplicate`, `emailStatus`, `bookingResult` à côté de `state`, qui seul va dans le cache, § 3.3.6) ; une écriture n'est **jamais** doublée, rejouée ni interrompue (pas de délai d'expiration : interrompre un POST n'annule pas l'écriture côté serveur ; signal de lenteur selon D-15) ; le formulaire appelle `mutateAsync` dans un `try/catch` de son `onSubmit` (TanStack Form relance l'erreur sinon) ; erreur métier → message exact du script, sous le champ concerné quand il y en a un (places R1 sous la rangée des compteurs, a-5), sinon en toast ; erreur réseau → texte de D-14 ; le `requestId` est conservé pour le nouvel essai.

#### 3.3.4 Déconnexion, dans l'ordre (corrige a-1, a-13, a-14)

Déclencheurs : segment « Client » (toast `Retour au mode client.`), inactivité de 10 min (toast `Déconnecté du mode collègue après 10 minutes d'inactivité.`), mot de passe changé (toast d'erreur `Le mot de passe du mode collègue a changé. Reconnectez-vous.`).

1. `session.close(reason)` : `password = null`, `endReason = reason`, notification synchrone.
2. L'abonné de `router.tsx` (sélecteur `s => s.password !== null`) appelle `purgeStaffSession(queryClient)` : `cancelQueries({ queryKey: ['state','staff'] })` (sans attendre), `removeQueries({ queryKey: ['state','staff'] })`, `getMutationCache().clear()` (les variables des mutations contiennent des noms et des contacts).
3. Les composants qui lisent `useAppState()` basculent sur `['state','public']`, toujours présent (`gcTime: Infinity`) : plus aucun nom n'est affiché ni gardé par Query, sans attendre le réseau.
4. `invalidateQueries({ queryKey: ['state','public'] })` : relecture avec `since`.
5. Toast selon `endReason`.
6. Si l'URL est sous `/collegue` : `router.navigate({ to: '/', search: publicSearch, replace: true })`, ce qui démonte tous les panneaux et formulaires collègue (leur état vivait dans l'URL ou dans des composants démontés) ; sinon `router.invalidate()`. La navigation directe évite que la garde rouvre le panneau de connexion après une déconnexion voulue ; la garde ne sert qu'aux accès directs (rechargement, favori, bouton Retour).
7. Le minuteur d'inactivité est désarmé (`background/inactivity.ts`, abonné au même sélecteur).

Test de référence (P5) : juste après `close()`, `queryClient.getQueryCache().findAll({ queryKey: ['state','staff'] })` est vide, le cache des mutations est vide, et après rendu aucun nom de la fixture n'est présent dans le DOM.

#### 3.3.5 Copie locale

- **Clé et format inchangés** : `reservations-cache-v1`, forme exacte de `03` § 1.1 (`savedAt`, `etag`, `config`, `r1Used`, `r2Used`, `r1Days`, `r2Days`, `r2Items` avec `Nom` sans la mention et `Ticket`), champs du script compris : ce format est un contrat extérieur, jamais renommé. Le schéma `LocalCacheV1` valide la lecture ; les clés inconnues sont retirées (aucune donnée personnelle ne peut y entrer). La conversion vers le modèle anglais se fait dans les deux sens dans `queries/local-cache.ts` (`fromLocalCacheV1`, `toLocalCacheV1`, § 3.3.6).
- **Écriture** : seulement depuis une mise à jour réussie de `['state','public']` portant un `etag` non vide (corrige a-22) ; jamais depuis l'état complet. Les sommes `r1Used` / `r2Used` sont recalculées comme dans `saveCache`.
- **Lecture** : copie de moins de 14 jours ; `etag` absent accepté (copies écrites par l'ancien site après une session collègue) ; JSON invalide ou schéma refusé → ignorée.
- **Compatibilité dans les deux sens** (même origine `thegaudis.github.io`) : après la bascule, les visiteurs habituels arrivent avec une copie écrite par l'ancien site ; après un retour arrière (§ 7), l'ancien site relirait les copies écrites par le nouveau. Le nouveau doit donc lire et écrire **exactement** le format v1 ; un test relit la copie écrite par le nouveau code avec la logique de `loadCache` de `legacy/js/donnees.js` (conservé sur la branche jusqu'en P8 pour ces tests dorés).
- `reservations-textes` : relue en secours pour les titres du squelette quand il n'y a pas de copie valide, jamais écrite ; sa lecture est retirée après la bascule (§ 7).
- Transformations idempotentes : une copie déjà normalisée repasse par le schéma (`Ticket` déjà vrai, nom déjà sans la mention).

#### 3.3.6 Frontière de l'API : champs du script ↔ modèle de domaine anglais

**Règle (arbitrage 12).** Les noms de champs de `Code.gs` (`01`, `02` : `Date`, `Capacite`, `Qte`, `Nom`, `Prix`, `Stock`, `ItemID`, `Theme`, `Menu`, `Note`, `Classe`, `Contact`, `Observation`, `PrixTotal`, `nbEleve`, `mode: 'surplace'`…) et ceux de la copie locale (`03` § 1.1 : `savedAt`, `etag`, `config`, `r1Used`, `r2Used`, `r1Days`, `r2Days`, `r2Items`, `Ticket`…) sont des **contrats extérieurs qui ne changent pas**. Ils n'apparaissent que dans trois fichiers et leurs tests : `api/schemas.ts` (réponses → modèle), `api/actions.ts` (modèle → corps des requêtes) et `queries/local-cache.ts` (copie v1 ↔ modèle, dans les deux sens). Tout le reste (`domain/`, `queries/`, `mutations/`, `features/`, tests de composants) ne voit que le **modèle de domaine anglais en camelCase**.

**Réception.** Chaque schéma valibot valide la forme exacte du script puis la traduit (`v.pipe(schémaDuScript, v.transform(…))`) : nombres en chaîne acceptés, `''` → `null` (prix absent, compteurs des anciennes réservations ; jamais 0), mention « (ticket restaurant) » retirée du nom et `voucher` déduit (transformation idempotente, la même pour l'API et la copie), `'surplace'` / `'emporter'` → `'dineIn'` / `'takeaway'`, champs `_…` rangés à côté de l'état (`duplicate`, `emailStatus`, `bookingResult`) et jamais dans le cache. Les types du domaine sont déduits des schémas (`v.InferOutput`).

```ts
// src/api/schemas.ts (excerpt)
const NumberLike = v.pipe(v.union([v.number(), v.pipe(v.string(), v.nonEmpty())]), v.transform(Number), v.finite());

const ApiDish = v.object({
  ID: v.string(),
  Date: IsoDate,
  Nom: v.string(),
  Stock: NumberLike,
  Prix: v.union([NumberLike, v.literal("")]),
  Ticket: v.optional(v.boolean()), // only in the local cache (03 § 1.1)
});

export const Dish = v.pipe(
  ApiDish,
  v.transform((dish) => ({
    id: dish.ID,
    date: dish.Date,
    name: plainName(dish.Nom),
    stock: dish.Stock,
    price: dish.Prix === "" ? null : dish.Prix, // 01 § 2.5: "" means no price in euros, never 0
    voucher: dish.Ticket === true || hasVoucherMark(dish.Nom),
  })),
);
export type Dish = v.InferOutput<typeof Dish>;
```

| Modèle de domaine (`domain/types.ts`) | Champs du script ou de la copie | Remarques |
| --- | --- | --- |
| `Settings` = `{ name1, name2, desc1, desc2, cancellationContact, priceStudent, priceStaff, priceExternal }` | `name1`, `name2`, `desc1`, `desc2`, `contactAnnulation`, `priceEleve`, `priceProf`, `priceExterieur` (`config` dans la copie) | tarifs en `number` (`'4.95'` accepté) ; `setConfigField` reçoit la clé du script (table `SETTINGS_API_KEYS` dans `api/actions.ts`) |
| `ServiceDayR1` = `{ date, capacity, menu, theme }` ; `StaffServiceDayR1` = `ServiceDayR1 & { openedBy }` | `Date`, `Capacite`, `Menu`, `Theme`, `OuvertPar` | `openedBy` seulement dans l'état complet |
| `ServiceDayR2` = `{ date, note, theme }` ; `StaffServiceDayR2` = `ServiceDayR2 & { openedBy }` | `Date`, `Note`, `Theme`, `OuvertPar` | |
| `Dish` = `{ id, date, name, stock, price, voucher }` | `ID`, `Date`, `Nom`, `Stock`, `Prix`, `Ticket` | `price: number \| null` ; `name` sans la mention ; `voucher` déduit du nom ou de `Ticket` |
| `BookingR1` = `{ id, date, name, className, contact, seats, students, staffMembers, externals, total, observation, timestamp }` | `ID`, `Date`, `Nom`, `Classe`, `Contact`, `Qte`, `NbEleve`, `NbProf`, `NbExt`, `PrixTotal`, `Observation`, `Timestamp` | `students`, `staffMembers`, `externals`, `total` : `number \| null` (anciennes réservations) |
| `BookingR2` = `{ id, dishId, date, name, className, contact, portions, serviceMode, observation, timestamp }` | `ID`, `ItemID`, `Date`, `Nom`, `Classe`, `Contact`, `Qte`, `Mode`, `Observation`, `Timestamp` | `serviceMode: 'dineIn' \| 'takeaway'` ; une ligne par plat |
| `Order` (`domain/print.ts`) | — | regroupement par client des lignes `BookingR2` (impressions, panneau « Demain ») |
| `SeatTotal` = `{ date, seats }` ; `PortionTotal` = `{ dishId, portions }` | `r1Bookings` / `r2Bookings` publics (`{ Date, Qte }`, `{ ItemID, Qte }`) ; `r1Used` / `r2Used` de la copie | |
| `PublicState` = `{ etag, settings, r1Days, r1Booked, r2Days, dishes, r2Booked }` | état public (`02` § 3.2) ou copie v1 | `etag: string \| null` (copie écrite sans etag par l'ancien site) |
| `FullState` = `{ settings, r1Days, r1Bookings, r2Days, dishes, r2Bookings, r1Booked, r2Booked }` | état complet (`02` § 4.3) | `r1Booked` / `r2Booked` calculés à la frontière : `domain/capacity.ts` ne connaît qu'une forme |
| `WriteResponse` = `{ state, duplicate, emailStatus, bookingResult }` | état + `_duplicate`, `_emailStatus`, `_bookingResult` (`02` § 5.4) | seul `state` va dans le cache |

**Envoi.** `api/actions.ts` expose une fonction par action, qui prend une entrée en modèle anglais et recompose le corps avec les noms attendus par le script (`02` § 4.4, § 4.5, § 4.7) :

```ts
// src/api/actions.ts (excerpt)
export async function addBookingR1(input: BookingR1Input, signal?: AbortSignal): Promise<WriteResponse> {
  const json = await postAction(
    "addBookingR1",
    {
      date: input.date,
      nom: input.name,
      contact: input.contact,
      classe: input.className,
      nbEleve: input.students,
      nbProf: input.staffMembers,
      nbExt: input.externals,
      observation: input.observation,
      requestId: input.requestId,
    },
    { signal },
  );
  return v.parse(WriteResponse, json);
}
// addBookingR2Multi: mode = input.serviceMode === "dineIn" ? "surplace" : "emporter", items = [{ itemId, qte }]
// addDayR2 / addItemR2 / editItemR2: name = withVoucherMark(name, voucher), price = price ?? ""
```

**Copie locale.** `queries/local-cache.ts` lit avec `LocalCacheV1` (champs v1 tels quels) puis `fromLocalCacheV1()` → `PublicState`, et écrit avec `toLocalCacheV1(state, savedAt)`, qui produit exactement les clés et noms de champs de `03` § 1.1 (`Prix: ""` pour un prix absent, `Nom` sans la mention, `Ticket`, tarifs en chaînes).

**Coût et bénéfice.** Coût : deux fonctions de conversion par entité (réception et envoi ou écriture de la copie), à tester une fois sur les exemples JSON de `02` et `03` § 1.1 (aller-retour, corps exacts, test doré avec `loadCache` de `legacy/js/donnees.js`). Bénéfice : aucun identifiant français ni champ du script hors de ces trois fichiers ; types lisibles (`dish.price` vaut `number | null` au lieu de `Prix: number | string | ''`) ; `exactOptionalPropertyTypes` plus simple (champs toujours présents, `null` explicite plutôt que champs facultatifs ou `""`) ; un changement futur du script ne touche que la frontière.

### 3.4 Session et tâches de fond

```ts
// src/session/session.ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type SessionEnd = "logout" | "inactivity" | "password-changed";

interface SessionState {
  /** Memory only: never persisted, never in the URL or a query key. */
  readonly password: string | null;
  /** Session number: key ['state','staff', id]. */
  readonly id: number;
  /** Why the last session ended, for the toast. */
  readonly endReason: SessionEnd | null;
  readonly open: (password: string) => void;
  readonly close: (reason: SessionEnd) => void;
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set, get) => ({
    password: null,
    id: 0,
    endReason: null,
    open: (password) => set({ password, id: get().id + 1, endReason: null }),
    close: (reason) => {
      if (get().password !== null) set({ password: null, endReason: reason });
    },
  })),
);
export type SessionStore = typeof useSessionStore;
```

- Le store est injecté dans le `context` du routeur (`session: useSessionStore`) : la garde lit `context.session.getState()`, les tests passent un store neuf. Les composants lisent toujours avec un sélecteur (`useSessionStore(s => s.password !== null)`), jamais le store entier.
- **Inactivité** (`background/inactivity.ts`, `06` § 1.6) : écouteurs passifs `pointerdown`, `pointermove`, `keydown`, `touchstart` posés une fois sur `document` ; ils écrivent seulement une variable de module (aucun rendu). Un seul `setTimeout`, armé à l'ouverture pour le temps restant, se réarme si une activité a eu lieu, sinon `close('inactivity')`. Revérification sur `visibilitychange` (onglet visible) et `pageshow` (retour depuis le cache de navigation), car les minuteurs sont ralentis en arrière-plan. Pas de synchronisation entre onglets (D-26).
- **Horloge** (`background/clock.ts`) : `useClock = create<{ now: number }>()(…)`, mise à jour par un minuteur aligné sur chaque minute (donc à 10 h 00 et à minuit pile, à quelques millisecondes près) et sur `visibilitychange` / `pageshow`. Les composants lisent des **valeurs dérivées** (`useToday()` = `parisDate(now)`, `useIsR2OrderingClosed(iso)`), donc ne se rendent de nouveau que lorsque la valeur change. Aucun `new Date()` ni `Date.now()` pendant le rendu (règle `react/purity`).
- **10 h** : la fiche R2 passe à l'état « clos » d'elle-même (valeur dérivée) ; si un formulaire R2 est ouvert sur un jour désormais clos, la tâche de fond retire `reserver` (`replace`) et affiche le toast neutre de clôture (`Commandes en ligne clôturées à 10h. Venez au restaurant {name2} à partir de 12h pour commander sur place.`), au lieu d'une fermeture silencieuse (a-7). Le contrôle est repris à l'envoi (`04` § 5.3).
- **Minuit** : « aujourd'hui » change, les calendriers sans `r1` / `r2` dans l'URL suivent ; un formulaire ouvert garde sa date (écrite dans l'URL à l'ouverture).

### 3.5 Composants UI (`src/ui/`)

Repris du tableau de `recherche/ui-forms.md` § 9, adapté aux décisions. Chaque composant Base UI est enveloppé **une seule fois** ; le code métier n'importe jamais `@base-ui/react`. Libellés anglais surchargés, `aria-label` français obligatoires sur les boutons icônes, classe `.accent-*` posée aussi sur les portails.

| Existant (spec) | Composant cible | Base UI | Notes |
| --- | --- | --- | --- |
| `.btn`, `.primary`, `.ghost`, `.small`, `.danger` (`08` § 4.2) | `ui/button/Button.tsx` | `Button` | `data-variant`, `data-size`, `aria-busy` + libellé d'attente (« Envoi en cours… ») |
| `.icon-btn`, `.tonal` (`08` § 4.4) | `ui/button/IconButton.tsx` | `Button` | `aria-label` obligatoire dans le type des props |
| `confirmClick` / `disarm` (`00` § 3, `06` § 5.2) | `ui/button/ConfirmButton.tsx` | `Button` | 1er clic : `data-armed`, « Confirmer ? », largeur figée, `aria-label` et `title` = détail ; 2e clic dans les 4 s : action ; minuteur annulé à chaque armement et désarmement (a-19) ; annonce `role="status"` masquée ; état occupé pendant l'envoi |
| `segGroup` Semaine/Mois, Client/Collègue (`08` § 6.3) | `ui/toggle/ViewToggle.tsx` | `ToggleGroup` + `Toggle` | ignorer la valeur vide (2e clic) ; coche animée sur `[data-pressed]` |
| Mode de service (`04` § 5.3), mode d'une réservation R2 (`06` § 7.4, 8.3) | `ui/form/SegmentedRadio.tsx` | `RadioGroup` + `Radio` + `Fieldset` | une seule option un jour au ticket (`:only-of-type`) ; remplace le `<select>` collègue |
| `.field`, `label`, `.field-help`, `.field-error`, `checkFields`, `markInvalid`, `linkLabels` (`00` § 3) | `ui/form/TextField.tsx`, `PasswordField.tsx` | `Field` | `invalid`, `touched`, `dirty` venus de TanStack Form ; `Field.Error` rendu conditionnellement ; aide masquée en erreur ; jamais `required` / `pattern` natifs |
| Compteurs R1, quantités R2, stock, portions (`04` § 5.2-5.3) | `ui/form/NumberField.tsx` | `NumberField` | `locale="fr-FR"`, `aria-roledescription="champ numérique"`, boutons −/+ en français (D-17), `null` converti en 0, entiers seulement |
| Prix avec `<datalist>` (`06` § 6.1) | `ui/form/PriceField.tsx` | `Field` (contrôle texte `inputMode="decimal"`) | `NumberField` n'accepte pas de `datalist` ; virgule acceptée (`parseAmount`) |
| Case « Ticket restaurant » (`06` § 4.3) | `ui/form/CheckboxField.tsx` | `Checkbox` | le prix se désactive par `form.Subscribe` (fin de `syncTicketPrice`) |
| Formulaire (contexte, envoi) | `ui/form/app-form.ts` (`createFormHook`), `SubmitButton.tsx`, `errors.ts` | — | champs pré-liés ; `revalidateLogic({ mode: 'submit', modeAfterSubmission: 'change' })` ; `errorText()` (erreurs Standard Schema = objets) ; focus sur le premier `[aria-invalid="true"]` dans l'ordre du DOM (`04` § 5.4) ; `canSubmitWhenInvalid: true` |
| `details.disclosure`, `.form-reveal`, liste de plats repliée (`08` § 4.11, `05` § 6.4) | `ui/disclosure/Collapsible.tsx` | `Collapsible` | `--collapsible-panel-height`, `data-starting-style` / `data-ending-style` |
| Sélecteur de date C-05 (`06` § 3) | `ui/calendar/DatePickerPopover.tsx` | `Popover` | flèches = focus seulement ; Échap, clic extérieur et retour du focus gérés |
| Calendriers (`05` § 2-3) | `ui/calendar/CalendarGrid.tsx`, `CalendarHeader.tsx` | — (maison) | voir ci-dessous |
| `showToast` (`00` § 3, `08` § 4.14) | `ui/feedback/toast.ts` (gestionnaire global) + `Toaster.tsx` | `Toast` | `limit={1}` (un seul toast, a-8), 3,5 s ; types succès, neutre, erreur (`priority: 'high'`) ; viewport `aria-label="Notifications"` |
| `.alert`, `.alert.warning`, `.note-warning`, `.setup-banner` (`08` § 4.12-4.13, 4.20) | `ui/feedback/Alert.tsx` | — | `data-tone`, `role="alert"` ou `status` |
| `.capacity-pill` + `gaugeStyle` (`05` § 4.5) | `ui/feedback/CapacityPill.tsx` | — | `--pct`, classe d'état, mot d'état visible (D-02) |
| Squelette `.sk`, spinner (`08` § 4.15-4.16) | `ui/feedback/Skeleton.tsx`, `Spinner.tsx` | — | plus de voile bloquant (§ 4.2) |
| `ICONS`, chevrons, œil, calendrier, coche (`08` § 6.2) | `ui/icons.tsx` | — | SVG repris tels quels, `aria-hidden`, `currentColor` |
| Dialogues (aucun aujourd'hui, `09` § 6) | `ui/overlay/Dialog.tsx`, `AlertDialog.tsx` | `Dialog`, `AlertDialog` | **à créer seulement si une décision les utilise** (knip signale un composant inutilisé) |
| `printDoc`, `printTable`, `openPrint` (`07`) | `ui/print/print.ts`, `PrintRoot.tsx`, `PrintLayout.tsx`, `PrintTable.tsx` | — | § 3.8 |

**Calendrier maison** (`ui/calendar/CalendarGrid.tsx`) : `role="grid"` étiqueté par le libellé de période (`aria-live="polite"`), lignes `role="row"`, en-têtes `L M M J V S D` (`aria-hidden` ou `<abbr>`), cellules `role="gridcell"` avec `aria-selected`, chacune contenant un `<button>` (pas un `<Link>` : le routeur poserait `aria-current="page"` et écraserait `aria-current="date"`). Un seul `tabIndex=0` : le jour sélectionné s'il est affiché, sinon la première case (`05` § 2.6). `aria-label` de `05` § 2.5 (date longue désormais avec « 1er », D-03), construit par `intl.formatMessage`. Clavier exactement selon `05` § 3.2 (← → ±1 j, ↑ ↓ ±7 j, Début / Fin = lundi / dimanche, Page ↑ / ↓ = même jour du mois voisin **borné au dernier jour du mois**, a-23), la vue suit la sélection sans glissement ; Entrée / Espace = clic natif. Focus sans effet : le gestionnaire `onKeyDown` focalise la case cible si elle est déjà dans le DOM puis navigue (`replace`) ; si la période change, la nouvelle case sélectionnée reprend le focus par une ref callback « si le focus est tombé sur `body` » (`refocusIfOrphaned`). Vue semaine = une ligne, vue mois = 42 cases.

### 3.6 Styles

- `design-system.css` est conservé comme source des jetons et découpé : `styles/tokens.css` (§ 1-2 : `:root`, `.accent-green`, `.accent-magenta`, alias `[data-accent="r1"|"r2"]`), `styles/base.css` (§ 3 et 5 : base, `:focus-visible`, keyframes `rise` / `sink` / `pulse-armed`, `prefers-reduced-motion`, confort tactile), `styles/print.css`. Les valeurs des jetons ne changent pas (`08` § 1).
- `app.css` et les composants de `design-system.css` deviennent des **CSS Modules** co-localisés (`X.module.css`), qui n'utilisent que `var(--…)`. Variantes et états par attributs `data-*` (les nôtres et ceux de Base UI : `data-checked`, `data-pressed`, `data-invalid`, `data-starting-style`…). Pas de Tailwind.
- Mise en place Base UI : `isolation: isolate` sur le conteneur de l'appli, `body { position: relative }` (fonds de dialogue sur iOS), champs ≥ 16 px sur écran tactile (zoom iOS).
- Accent par restaurant par la cascade de variables ; les portails (Popover, Toast) reçoivent `className="accent-…"`.
- Dette de `08` PA 6-8 (a-26) : retirer `.tag`, `.admin-on`, `ICONS.eye` ; transformer en jetons `font-size: 15px` et les largeurs en dur (108, 170, 76, 260 px, durées 300 ms).
- Mouvement : transitions plutôt que keyframes pour ouvrir et fermer (`data-starting-style` / `data-ending-style`), fiche montée avec `key={iso}` ; transitions de vue du calendrier par l'option `viewTransition` de la navigation du routeur (types `next` / `prev` / `zoom-in` / `zoom-out` / `day-next` / `day-prev`), sans les cumuler avec `<ViewTransition>` ; tout est coupé par `prefers-reduced-motion`. Le comportement fonctionnel doit être identique sans transitions (`05` § 3.4).
- Optionnel : stylelint (`stylelint-config-standard` + `declaration-strict-value` sur couleurs, rayons, tailles de police).

### 3.7 Dates et fuseau

- Les jours métier sont des chaînes `IsoDate` (`YYYY-MM-DD`), comparées par ordre lexicographique, échangées avec le script et mises dans l'URL. Jamais `new Date('2026-10-05')` (UTC implicite) ni `toISOString()` sur une heure locale.
- Arithmétique en UTC (`Date.UTC`, `setUTCDate`) : `addDays`, `mondayOf`, `weekCells`, `monthCells` (42 cases, lundi en premier), `addMonthsClamped`, `keyTargetIso`. Reprendre `src/lib/dates.ts` d'AppResaAristide (dont `formatWeekLabel` et un `addMonths` sans débordement), en l'adaptant aux libellés de `05` § 2.3 et à la correction a-23 (« 28 sept. – 4 oct. 2026 », année du lundi affichée si elle diffère).
- Affichage : par l'instance `intl` (§ 3.10), formats nommés avec `timeZone: 'UTC'` appliqués à `Date.UTC(…)` ; date longue **avec l'ordinal** : `jeudi 1er octobre 2026` (D-03, arbitrage 11 : comme les e-mails du script) ; majuscule initiale par CSS `::first-letter` comme aujourd'hui.
- « Maintenant » : `parisDate(ms)` et `parisHour(ms)` (`Intl` avec `timeZone: 'Europe/Paris'`, repris d'AppResaAristide). `isR2OrderingClosed(iso, now) = iso < parisDate(now) || (iso === parisDate(now) && parisHour(now) >= 10)` ; `isPast(iso, today) = iso < today` ; « demain » = `addDays(parisDate(now), 1)`.
- Pas de Temporal (absent de Safari stable), pas de polyfill, pas de date-fns. Tests sous `TZ=Europe/Paris` et `TZ=America/New_York`, et autour des changements d'heure (29 mars et 25 octobre 2026).

### 3.8 Impression

- **Dans le même document** : plus de `window.open`, plus de `PRINT_TOKENS`, plus de toast « Autorisez les fenêtres de ce site pour imprimer. » (I-00 disparaît). Le module d'impression est chargé par `import()` au clic.
- Mécanique (`ui/print/print.ts` + `<PrintRoot/>` monté une fois sous `/collegue`) : `printDocument(content, title)` fait `flushSync` pour poser le document dans un portail `.print-root`, change `document.title` (nom proposé pour le PDF : titres de `07` § 3 à 7), attend `document.fonts.ready` au plus 2 s, puis `window.print()` ; à `afterprint`, le titre est rétabli et le portail vidé. Les données sont un instantané de l'état complet au moment du clic.
- `styles/print.css` : à l'écran `.print-root { display: none }` ; à l'impression, tout le reste masqué (`body:has(> .print-root) > :not(.print-root)`), page nommée `list` : `@page list { size: A4 landscape; margin: 12mm 14mm 14mm; @bottom-left { … } @bottom-right { content: "Page " counter(page) " / " counter(pages) } }` (valeurs de police et de couleur écrites en dur dans les boîtes de marge, seule exception à la règle des jetons), `print-color-adjust: exact`, en-têtes de tableau répétés, lignes insécables, total jamais seul en haut de page.
- Les quatre documents (`07` § 3, 4, 6, 7) sont des composants React (`ListDocumentR1`…) qui réutilisent les jetons réels et les couleurs par restaurant de `07` § 2.3 ; regroupements et totaux viennent de `domain/print.ts` (un ticket par commande, a-11 ; ordre actuel des listes conservé, D-08 non retenue ; textes corrigés de a-24).
- Limites connues : boîtes de marge (« Page x / y ») seulement dans Chromium 131+ ; le pied `.pb-foot` « écran seulement » n'a plus d'objet (le document n'est jamais visible à l'écran).

### 3.9 Erreurs et états de chargement

| Situation | Mécanisme | Rendu et texte (référence) |
| --- | --- | --- |
| Premier chargement sans copie (G-01) | coquille prérendue + `pendingComponent` | squelette des deux calendriers (`aria-hidden`), titres par défaut ou de `reservations-textes`, aucun texte « Chargement » (`03` § 3) |
| Copie locale affichée, données pas encore confirmées (G-02) | `useIsFromCache()` | page complète interactive, « Réserver » actif ; connexion refusée : toast `Les données se chargent. Réessayez dans un instant.` |
| Échec de lecture (G-03) | `errorComponent` de la route si aucune donnée ; sinon `error` de la requête | `LoadErrorBox` (`role="alert"`) : textes exacts de `03` § 3.1 (en ligne / hors ligne via `navigator.onLine`, suffixe « copie locale ») ; bouton `Réessayer` occupé `Nouvelle tentative…` → `reset()` puis `router.invalidate()` ou `refetch()` ; réannonce seulement si le texte change (a-21) ; le toast inatteignable de `03` § 3.2 n'est pas recréé |
| Configuration manquante (G-05) | `isConfigMissing()` au build et à l'exécution | `ConfigBanner` si l'URL est absente, ne ressemble pas à `https://script.google.com/macros/s/…/exec` ou contient `COLLE_ICI` (a-25) ; texte selon D-05 |
| Erreur métier d'écriture | `BusinessError` | message exact du script (`02` § 4) sous le champ ou en toast d'erreur ; formulaire et `requestId` conservés ; relecture de l'état après une erreur de places (a-4) |
| Erreur réseau, page HTML de Google, réponse illisible | `ServiceError` (et `TypeError` de `fetch`) | jamais de message anglais brut (a-3) : textes de D-14 |
| Écriture lente | rien n'est interrompu | signal de lenteur selon D-15 ; bouton occupé ; « Annuler » désactivé pendant l'envoi (a-20) |
| Mot de passe changé | `PasswordRejectedError` → `onError` global | déconnexion (§ 3.3.4) |
| Doublon (`_duplicate`) | lecture de la réponse | récapitulatif « déjà enregistrée » (D-16) |
| Chunk introuvable après un déploiement | le routeur recharge une fois la page (`isModuleNotFoundError`) ; écouteur `vite:preloadError` qui recharge une fois (garde en `sessionStorage`) | transparent |
| URL invalide | `v.fallback` partout ; `$.tsx` | aucun écran d'erreur ; « Page introuvable » pour un chemin inconnu |

Plus de voile bloquant plein écran (G-06) : connexion et suppressions utilisent un bouton occupé (§ 4.2).

### 3.10 Textes et formats (react-intl / FormatJS)

Arbitrage 11 : **tous** les textes de l'interface passent par react-intl, même sans localisation, pour une vraie gestion des pluriels, des montants et des dates. Dispositif repris d'element-admin (react-intl 12, `@formatjs/cli`, `@formatjs/unplugin`, `eslint-plugin-formatjs` via `jsPlugins`), simplifié pour une langue unique.

**Principes**
- Langue unique `fr-FR` (`locale` et `defaultLocale`). Les `defaultMessage` sont écrits **en français dans le code**, recopiés mot pour mot de la spec (guillemets de code ou « »), ponctuation et espaces comprises ; aucun fichier de traduction n'est chargé à l'exécution (react-intl ne signale pas de traduction manquante quand la langue est la langue par défaut). La spec fait foi : ne jamais reprendre un texte d'AppResaAristide (version ancienne, tutoiement) sans le vérifier.
- **Ids explicites et stables, en anglais, par domaine** (arbitrage 12) : `{area}.{screen or component}.{element}`, segments en anglais et en camelCase ; zones `public`, `staff`, `loading`, `print`, `common` (textes partagés) et `ui` (textes génériques des composants de `ui/`, par exemple `ui.confirm`) ; par exemple `public.r1.form.name.label`, `public.r2.cutoff`, `public.toast.bookingConfirmed`, `staff.settings.save`, `loading.failure.offline`, `print.r1.documentTitle`, `common.action.cancel`. Un id ne change pas quand le texte change.
- **`description` obligatoire** et littérale, qui cite la source dans la spec (`"04 § 9 — toast de succès d'une réservation"`) : traçabilité et relecture.
- Où vivent les messages : dans le fichier qui les utilise (`<FormattedMessage id defaultMessage description />` ou `defineMessages` en tête de module) ; les textes partagés par plusieurs fichiers dans `intl/common-messages.ts`. **Le catalogue `textes.ts` centralisé n'existe plus.**
- Pluriels et ordinaux en ICU : `{n, plural, one {# couvert} other {# couverts}}` (en français, 0 et 1 sont au singulier, comme `plural()` de `00` § 3 : `0 couvert`, `1 couvert`, `2 couverts`) ; `{n, plural, one {# ticket restaurant} other {# tickets restaurant}}` ; date longue `{weekday} {day, selectordinal, one {#er} other {#}} {month} {year}` (`intl/dates.ts`, parties fournies par `intl.formatDate` avec `timeZone: 'UTC'`) → `jeudi 1er octobre 2026`, `samedi 3 octobre 2026`.
- Valeurs insérées en placeholders nommés, en anglais (`{name2}`, `{contact}`, `{rem}`, `{capacity}`, `{name}`) ; textes du script (`{ error }`) affichés tels quels, jamais passés dans `defaultMessage`.
- Mise en forme riche par balises déclarées une fois dans `defaultRichTextElements` (`<b>`, `<i>`) ; pas de `<br>` dans un message : deux messages ou deux paragraphes (encadré d'échec de `03` § 3.1).
- Espaces insécables écrites `\u00A0` dans le littéral (jamais le caractère invisible) : séparateur `␣— ` devant un prix (`dash` de `00` § 3), etc. ; les séparateurs ` — ` des lignes de réservation et du récapitulatif gardent des espaces normales (`spec/README.md` § 4.1). `preserveWhitespace: true` dans le plugin et `--preserve-whitespace` à l'extraction, sinon FormatJS normalise les espaces.

**Formats partagés** (`intl/formats.ts`, passés à `createIntl({ formats })` et typés par `FormatjsIntl.Formats`) :

| Nom | Définition | Usage |
| --- | --- | --- |
| `number.euro` | `{ style: 'currency', currency: 'EUR' }` | tous les montants : `<FormattedNumber value={x} format="euro" />` ou `intl.formatNumber(x, { format: 'euro' })` → `12,50␣€`, `4,95␣€`, `0,00␣€` (mesuré sous Node 22 / ICU 77 : U+00A0 avant €, U+202F comme séparateur de milliers au-delà de 999 €) |
| `date.weekday`, `date.month`, `date.year` | `{ weekday: 'long' }`, `{ month: 'long' }`, `{ year: 'numeric' }`, `timeZone: 'UTC'` | parties de la date longue (avec ordinal) |
| `date.dayMonth` | `{ day: 'numeric', month: 'short', timeZone: 'UTC' }` | libellé de semaine (« 28 sept. – 4 oct. 2026 ») |
| `date.monthYear` | `{ month: 'long', year: 'numeric', timeZone: 'UTC' }` | libellé de mois, sélecteur de date (« Octobre 2026 », majuscule par CSS) |
| `date.printedOn` | `{ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }` | « Imprimé le 3 octobre 2026 » (`07` § 2.2) |

**Instance unique et usage hors composants** : `intl/intl.ts` exporte `intl = createIntl({ locale: 'fr-FR', defaultLocale: 'fr-FR', formats, defaultRichTextElements, onError }, createIntlCache())`. Le routeur pose `<RawIntlProvider value={intl}>` dans son `Wrap` (avec le `QueryClientProvider`) ; les composants utilisent `<FormattedMessage>`, `<FormattedNumber>` ou `useIntl()`. Hors React, le même objet sert aux toasts des mutations et des tâches de fond (déconnexion, 10 h), à `document.title` de l'impression et aux `aria-label` construits dans des fonctions. Un texte qui va dans un **attribut** (`aria-label`, `title`, `placeholder`, `alt`) passe par `intl.formatMessage(...)`, jamais par `<FormattedMessage>`.

**Extraction et contrôle** :
- `pnpm i18n:extract` = `formatjs extract 'src/**/*.{ts,tsx}' --throws --preserve-whitespace --out-file translations/fr.json && oxfmt translations/fr.json` (format par défaut : `id → { defaultMessage, description }`). `--throws` échoue sur un message invalide ou un même id avec deux textes différents.
- CI : `pnpm i18n:extract` puis `git diff --exit-code translations/fr.json` (le fichier versionné doit être à jour) ; `pnpm check` commence par l'extraction (comme element-admin).
- Ids typés : `intl/types.d.ts` déclare `FormatjsIntl.Message['ids']` = `keyof typeof import('../../translations/fr.json')` (motif d'element-admin) : un id inconnu est une erreur `tsc`.
- `translations/fr.json` sert aussi de **relecture des textes** contre la spec (P7) ; une localisation future ajouterait `formatjs compile --ast` et un chargement par langue comme element-admin.

**Build** : `@formatjs/unplugin/vite` avec `{ ast: true, preserveWhitespace: true }` précompile chaque `defaultMessage` en AST ; en production, l'alias `@formatjs/icu-messageformat-parser` → `@formatjs/icu-messageformat-parser/no-parser.js` retire l'analyseur ICU (§ 3.11). Poids mesuré (esbuild + gzip, React exclu, `IntlProvider`, `FormattedMessage`, `FormattedNumber`, `FormattedDate`, `useIntl`, `createIntl`) : **14,8 kB gzip avec l'analyseur, 7,6 kB sans** ; s'y ajoutent les messages en AST, répartis dans les chunks qui les utilisent (quelques kB). Aucun polyfill `Intl` nécessaire sur les navigateurs ciblés.

**Lint** (`eslint-plugin-formatjs` par `jsPlugins`) : `enforce-default-message: literal`, `enforce-description: literal`, `enforce-placeholders`, `enforce-plural-rules: { one: true, other: true }`, `no-multiple-whitespaces`, `no-multiple-plurals`, `no-offset`, `prefer-pound-in-plural`, `no-missing-icu-plural-one-placeholders`, `no-complex-selectors`, `no-useless-message`, `no-literal-string-in-jsx` (y compris les props `label`, `placeholder`, `title`, `aria-label`, `alt`), `no-emoji` (le « ⚠ » du bandeau, seul symbole admis par la charte, est une icône SVG ou une exception commentée). **Non repris d'element-admin** : `blocklist-elements: ['selectordinal']` (il nous faut l'ordinal « 1er ») et `enforce-id` par empreinte (nos ids sont explicites).

**Tests** : `renderWithProviders` (projet Vitest `browser`, `vitest-browser-react`) et le décorateur global de `.storybook/preview.tsx` enveloppent `QueryClientProvider` + `RawIntlProvider value={intl}` ; les fonctions de `intl/` se testent avec la même instance (projet `node`) ; les attentes comparent les chaînes exactes de la spec (avec `\u00A0` explicite). `vitest.config.ts` et Storybook chargent aussi `@formatjs/unplugin` (même transformation qu'en production).

**Pièges** : ids en double (même id, deux textes) → `--throws` ; apostrophe ICU (`'` suivie de `{` ou `}` ouvre une citation : écrire `''` dans ce cas) ; `{` et `}` littéraux à échapper ; HTML dans un message → balises déclarées seulement ; `<FormattedMessage>` dans un attribut (rend un objet, pas une chaîne) ; espaces normalisées si `preserveWhitespace` est oublié ; U+202F produite par `Intl` au-delà de 999 € (et, selon les moteurs, éventuellement devant €) : comparer en tests sous Node, vérifier une fois dans Chromium et WebKit (P7), ne jamais coder l'espace en dur autour d'un montant formaté ; `#` d'un pluriel formaté selon la locale.

### 3.11 Configuration de build et routeur

```ts
// vite.config.ts
import formatjs from "@formatjs/unplugin/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages project site. Custom domain: BASE_PATH=/
const base = process.env["BASE_PATH"] ?? "/reservations-restaurants/";

export default defineConfig(({ mode }) => ({
  base, // Start derives the router basepath from it: never hard-code /reservations-restaurants
  resolve: {
    tsconfigPaths: true, // @/* alias from tsconfig
    // Messages are precompiled to AST by @formatjs/unplugin: the ICU parser is useless in production (-7 kB gzip)
    alias: mode === "production"
      ? { "@formatjs/icu-messageformat-parser": "@formatjs/icu-messageformat-parser/no-parser.js" }
      : {},
  },
  build: { manifest: true, sourcemap: true }, // manifest read by scripts/check-budget.mjs
  plugins: [
    tanstackStart({ spa: { enabled: true, prerender: { outputPath: "/index.html" } } }),
    react({ compiler: true }), // after tanstackStart(); requires oxc-transform-react@~0.145.0 (experimental)
    formatjs({ ast: true, preserveWhitespace: true }), // defaultMessage kept (single locale), compiled to AST
  ],
}));
```

```tsx
// src/router.tsx (extrait)
export function getRouter() {
  const queryClient = createQueryClient();
  const inBrowser = typeof window !== "undefined"; // getRouter() also runs in Node when the shell is prerendered
  if (inBrowser) {
    restoreLocalCache(queryClient); // SYNCHRONOUS, before the router: first render comes from the local cache
    persistLocalCache(queryClient);
  }
  const router = createRouter({
    routeTree,
    context: { queryClient, session: useSessionStore },
    defaultPreloadStaleTime: 0, // Query owns freshness
    defaultStructuralSharing: true,
    scrollRestoration: true,
    defaultPendingComponent: PageSkeleton,
    defaultErrorComponent: LoadErrorPage,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <RawIntlProvider value={intl}>{children}</RawIntlProvider>
      </QueryClientProvider>
    ),
  });
  if (inBrowser) {
    useSessionStore.subscribe(
      (s) => s.password !== null,
      (loggedIn) => {
        if (!loggedIn) afterLogout({ router, queryClient }); // PLAN § 3.3.4, steps 2 to 6
      },
    );
    startBackgroundTasks({ queryClient, router });
  }
  return router;
}
```

Le shell : `<html lang="fr"><head><ScriptOnce children={earlyFetchScript} /><HeadContent /></head><body>{children}<Scripts /></body></html>` ; `head()` porte les `meta`, le titre, le favicon et les `preconnect` (`crossOrigin: 'anonymous'`). Aucun code de niveau module qui touche `window`, `document` ou `localStorage` dans `__root.tsx`, `router.tsx` et leurs imports (le prérendu échouerait).

---

## 4. Décisions produit à valider

### 4.1 Décisions (valeur par défaut appliquée sauf avis contraire)

Les textes marqués « *texte proposé* » n'existent pas dans l'appli actuelle : ils sont à relire. Une décision modifiée après coup se reporte ici, avec la phase concernée.

| # | Source | Question | Recommandation par défaut (appliquée) | Phase |
| --- | --- | --- | --- | --- |
| D-01 | c-1 | Easter egg (5 clics sur le logo → vidéo YouTube) | **Conservé**, reproduit à l'identique : 5 clics en 2 s sur le logo ouvrent la vidéo dans un nouvel onglet (`noopener`). Gestionnaire de clic sur le logo, horodatages des clics dans une ref (ni effet, ni état rendu). | P4 |
| D-02 | c-2, `08` PA 1, AppResaAristide | Mot d'état avec la couleur, explication quand « Réserver » est absent | Mot visible à côté de la jauge pour les états orange et rouge : `Bientôt complet`, `Complet` ; plat épuisé dans la liste de la fiche : `Épuisé` (mot déjà utilisé dans le formulaire). Phrase sous la fiche quand « Réserver » manque : R1 complet `Complet.` (AppResaAristide) ; R2 tous les plats épuisés *texte proposé* `Tous les plats sont épuisés.` Jour passé : pas de phrase (fiche pâlie, « passé » dans l'`aria-label`). | P4 |
| D-03 | c-3 | Textes incohérents | `(hors plats sans prix indiqué)` partout (total en direct, récapitulatif, résumé du lendemain) ; plus de texte initial `Total : 0,00 €` (le total exact est rendu d'emblée) ; pastille R1 inchangée (`{rem} / {capacity} couverts`) ; dates **avec « 1er »** à l'écran comme dans les e-mails (`jeudi 1er octobre 2026`, ordinal ICU, arbitrage 11) ; pluriels par ICU ; messages du script inchangés. | P2, P4, P6 |
| D-04 | c-4 | Contact à la modification d'une réservation | **Non retenue** : comportement actuel conservé (champ « Téléphone ou email » obligatoire, sans contrôle de format, `01` § 2.3). | P5 |
| D-05 | c-5, a-25 | Bandeau « Configuration manquante » | Vouvoiement, affiché à tous quand l'URL du script manque ou est invalide : *texte proposé* `⚠ Configuration manquante : l'adresse du service de réservation n'est pas renseignée. Prévenez l'établissement.` Détail technique (variable `VITE_APPS_SCRIPT_URL`) dans la console et le README. | P4 |
| D-06 | c-6 | Libellé de charte « Revenir en mode client » | Aucun bouton ajouté ; signaler à l'auteur de la charte que le retour se fait par le segment « Client ». | — |
| D-07 | c-7, AppResaAristide | Panneaux « Demain » et « Résumé pour demain » en doublon | **Fusionnés** en un seul panneau `Demain ({date})` : la ligne de totaux de `06` § 2.1, puis les blocs par restaurant de `07` § 5 avec leurs boutons d'impression ; réservations de plats supprimés exclues partout (chiffres cohérents, b-3). | P5, P6 |
| D-08 | c-8 | Tri des listes | **Non retenue** : ordre actuel conservé partout (R1 : ordre d'enregistrement ; R2 : classe puis nom à l'écran, comme aujourd'hui ; listes du lendemain non triées). | P6 |
| D-09 | c-9, b-12 | « Modifier ce jour » pour R2 | **Non retenue** : comportement actuel conservé (pas de « Modifier ce jour » pour R2 ; `editJour` n'accepte que `r1`). | — |
| D-10 | c-10 | Report des saisies d'un restaurant à l'autre | **Non** : chaque formulaire part vide (effet involontaire de l'ancien code). | P4 |
| D-11 | c-11, a-12 | Formulaire public et récapitulatif ; URL ; reprise du mode collègue | Un **récapitulatif par restaurant** (état local de chaque colonne). Un seul formulaire public ouvert à la fois (`reserver=r1\|r2`), mais choisir un jour dans une colonne ne ferme jamais le formulaire ni le récapitulatif de l'autre. URL à deux dates (`r1`, `r2`), schéma de `09` § 1. `/collegue` rechargé → connexion, puis retour à l'URL demandée. *Variante possible* : deux formulaires ouverts en même temps (`r1reserver`, `r2reserver`). | P4, P5 |
| D-12 | c-12, b-2 | Session collègue ; fuseau de référence | Mémoire seulement (perdue au rechargement, invariant 1). « Aujourd'hui », jour passé et cut-off calculés à l'**heure de Paris**, quel que soit le fuseau de l'appareil. | P2, P5 |
| D-13 | c-13 | Ajouts collègue sur les jours passés ; pastille R2 agrégée | Conservés tels quels (ajout a posteriori utile ; pastille = somme des stocks). | — |
| D-14 | a-3 | Message d'une écriture qui échoue pour une raison technique | Public hors ligne : `Vous semblez hors ligne. Vérifiez votre connexion internet, puis réessayez.` (repris de `03` § 3.1). Public, service muet ou réponse illisible : *texte proposé* `Le service de réservation ne répond pas. Réessayez dans un instant : une même réservation n'est jamais enregistrée deux fois.` Collègue : *texte proposé* `Le service ne répond pas. Réessayez dans un instant.` Connexion : `Erreur de connexion. Réessayez.` (inchangé). | P4, P5 |
| D-15 | a-2 | Écriture qui ne répond pas | Aucune interruption (le script écrirait quand même). Au bout de 20 s, sous le bouton occupé, en `role="status"` : *texte proposé* `Le service met du temps à répondre. Gardez cette page ouverte : la confirmation s'affichera ici.` | P4 |
| D-16 | a-10 | Doublon (`_duplicate`) | Toast neutre inchangé **et** récapitulatif reconstruit depuis la saisie, titre *texte proposé* `Réservation déjà enregistrée`, avertissement `Cette réservation était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.` (R2 : quantités demandées, puisque les quantités accordées ne sont pas renvoyées). | P4 |
| D-17 | AppResaAristide | Boutons −/+ sur les compteurs R1 et les quantités R2 | **Oui** (cibles de 44 px, mobile) via `NumberField` ; saisie au clavier conservée ; libellés *proposés* `Retirer une portion : {name}` / `Ajouter une portion : {name}`, `Diminuer : Élèves` / `Augmenter : Élèves` (idem Personnels, Extérieurs). | P3, P4 |
| D-18 | a-5, AppResaAristide | Contrôle des maximums avant envoi (public) | **Oui.** R1 : total ≤ places restantes, message sous la rangée `{n couvert(s)} au maximum (places restantes ce jour-là).` (texte de l'ajout collègue, `06` § 8.2). R2 : quantité ≤ restant, bornée par le champ, message `{n portion(s)} au maximum (stock restant).` (`06` § 8.3). Le script reste l'arbitre ; son refus s'affiche sous la rangée et l'état est relu. | P4 |
| D-19 | a-15, a-16, a-17, b-4 | Contrôles côté collègue | Date passée refusée dans « Ouvrir un jour » (*texte proposé* `Choisissez une date à venir.`) ; jour R1 déjà ouvert : envoi bloqué, *texte proposé* `Ce jour est déjà ouvert : utilisez « Modifier ce jour ».` ; jour R2 déjà ouvert : avertissement *proposé* `Ce jour est déjà ouvert : seuls les plats de nom nouveau seront ajoutés.` ; capacité ≥ couverts réservés (message du script `Impossible : {n} couvert(s) déjà réservé(s) pour ce jour, la capacité ne peut pas être inférieure.`) ; stock ≥ portions réservées (*proposé* `Impossible : {n} portion(s) déjà réservée(s) pour ce plat, le stock ne peut pas être inférieur.`) ; ligne de plat incomplète signalée (*proposé* `Indiquez le nom et le stock de ce plat, ou retirez la ligne.`) ; ajout R2 un jour au ticket : « Sur place » seule option ; modification R2 bornée au stock restant + quantité actuelle ; maximum de modification R1 = places restantes + quantité actuelle (comme le script). | P5 |
| D-20 | a-18 | Paramètres | Un champ vidé est envoyé (`""` : le script remet sa valeur par défaut) ; tarifs vérifiés (nombre ≥ 0) ; échec partiel détaillé : *texte proposé* `Enregistré : {saved}. Non enregistré : {failed} ({message}).` | P5 |
| D-21 | b-3 | Suppression d'un jour ou d'un plat qui a des réservations | Le bouton armé affiche une note visible et un `aria-label` détaillés : *proposés* `Confirmer la suppression du jour et de ses {n} réservations (les personnes ne seront pas prévenues)` / `Confirmer la suppression de ce plat ({n} réservations ne seront plus affichées, les personnes ne seront pas prévenues)`. Réservations orphelines exclues des totaux et des listes. | P5 |
| D-22 | b-8 | Prix 0 | Refusé côté client : *texte proposé* `Indiquez un prix supérieur à 0, ou laissez le champ vide.` | P5 |
| D-23 | react-architecture § 9 | Polices | **Auto-hébergées** (`@fontsource-variable/outfit` et `work-sans`, sous-ensemble latin, `font-display: swap`) : deux connexions tierces et l'envoi de l'adresse IP à Google en moins. Rendu identique. | P0, P4 |
| D-24 | a-25 | Titre de la page | `<h1>` dérivé des paramètres : `Réservations des restaurants pédagogiques et {name2}` (identique tant que `name2` vaut « Aristide ») ; `<title>` du document inchangé (prérendu). | P4 |
| D-25 | b-6 | Essais de mot de passe | **Non retenue** : comportement actuel conservé (aucun délai après des mots de passe faux). | — |
| D-26 | element-admin § 11.5 | Déconnexion propagée aux autres onglets (`BroadcastChannel`) | **Non** (parité : chaque onglet a sa propre session en mémoire). | — |
| D-27 | AppResaAristide | Lien « Prochaine ouverture » sur un jour sans service | **Non** (nouvelle fonction, hors périmètre ; facile à ajouter après la bascule). | — |

### 4.2 Écarts de parité assumés

| Sujet | Avant (spec) | Après | Raison |
| --- | --- | --- | --- |
| Heure de référence | heure locale de l'appareil (`01` § 3.7) | heure de Paris | D-12, b-2 |
| Toasts | plusieurs toasts qui se chevauchent, erreurs annoncées en `polite` | un seul toast (le nouveau remplace l'ancien), erreurs en annonce prioritaire | a-8 |
| Touche Entrée dans les formulaires | sans effet (pas de `<form>`, `04` § 10) | soumet le formulaire (`<form noValidate>`) | accessibilité, comportement natif |
| Voile de chargement plein écran (G-06) | connexion et suppressions | bouton occupé (`aria-busy`, « … en cours »), page non bloquée | simplicité, pas de perte de focus |
| Calendrier | `role="group"` + boutons `aria-pressed` | `role="grid"`, `gridcell` `aria-selected`, boutons | lecteurs d'écran en mode navigation |
| Libellé de semaine à cheval | « 28 – 4 oct. 2026 » | « 28 sept. – 4 oct. 2026 » | a-23 |
| Page ↑ / ↓ en fin de mois | débordement (`setMonth`) | borné au dernier jour du mois | a-23 |
| Actualisation | suspendue pendant une saisie ou un formulaire ouvert | continue (saisies et focus conservés) | a-4 |
| Formulaire R2 à 10 h | fermé sans message | fermé avec le toast neutre de clôture | a-7 |
| Écriture lente ou en échec technique | message anglais brut, attente sans fin | messages français (D-14, D-15) | a-2, a-3 |
| `confirmed` vide (R2) | formulaire fermé, saisies perdues | formulaire conservé, toast d'erreur, état relu | a-6 |
| Après succès | focus sur `body` | focus sur le titre du récapitulatif | a-9 |
| Pendant l'envoi | « Annuler » actif | « Annuler » désactivé | a-20 |
| Avertissements du récapitulatif R2 | ajustement masque l'échec d'e-mail | les deux cumulés | a-20 |
| Impression | nouvelle fenêtre restée ouverte, toast si bloquée | même document, rien à fermer ; pied d'écran supprimé | a-24, `07` § 9 |
| Tickets dans les impressions | un ticket par portion | un ticket par commande | a-11, invariant 5 |
| Copie locale | écrite aussi depuis l'état complet (sans etag) | écrite seulement depuis l'état public avec etag | a-22 |
| `reservations-textes` | lue et écrite | lue en secours, jamais écrite | `03` § 1.2 |
| Saisie des compteurs | `parseInt` (2,7 → 2, texte → 0) | entiers seulement (champ numérique, valeur bornée) | NumberField |
| Montants | `formatEuro` maison : U+00A0 avant €, sans séparateur de milliers | `FormattedNumber` au format `euro` : identique jusqu'à 999,99 € (U+00A0 mesuré sous Node 22) ; U+202F comme séparateur de milliers au-delà | arbitrage 11 |
| Dates longues à l'écran | `jeudi 1 octobre 2026` (sans « 1er ») | `jeudi 1er octobre 2026` (comme les e-mails du script) | arbitrage 11, c-3 |
| Textes | chaînes dans le JavaScript | messages ICU react-intl (mêmes textes), extraits dans `translations/fr.json` | arbitrage 11 |
| État de l'interface | perdu au rechargement | dans l'URL (jours, vues, formulaire ouvert, panneaux collègue) | `09` § 1 |
| Panneaux collègue après déconnexion | réapparaissent à la connexion suivante | fermés | a-13, a-14 |
| Ressources | `?v=21` | noms hachés par Vite | — |
| Code.gs publié | servi par Pages (mode branche) | plus publié (seul l'artefact est servi) | — |

### 4.3 Traitement des points a-*

| Point | Traitement | Phase |
| --- | --- | --- |
| a-1 | purge synchrone à la déconnexion (§ 3.3.4), test S8 | P5 |
| a-2, a-3 | D-15, D-14 ; lectures bornées à 30 s | P2, P4 |
| a-4 | actualisation continue ; relecture après une erreur de places | P4 |
| a-5 | D-18 ; erreur du script sous la rangée (`setErrorMap`) | P4 |
| a-6 | formulaire conservé, état relu | P4 |
| a-7 | toast de clôture à 10 h (§ 3.4) | P4 |
| a-8 | un toast à la fois, `priority: 'high'` pour les erreurs | P3 |
| a-9 | focus sur le récapitulatif ; erreur « Choisissez au moins un plat. » reliée au `fieldset` des plats (`aria-describedby`) et focus sur la première quantité | P4 |
| a-10 | D-16 | P4 |
| a-11 | `orderAmounts` dans les impressions et le panneau « Demain » | P6 |
| a-12 | `selectDay` ne touche qu'un restaurant ; récapitulatif par colonne (D-11) | P4 |
| a-13, a-14 | état collègue dans l'URL de `/collegue`, quitté à la déconnexion | P5 |
| a-15, a-16, a-17 | D-19 | P5 |
| a-18 | D-20 | P5 |
| a-19 | `ConfirmButton` annule son minuteur à chaque armement | P3 |
| a-20 | « Annuler » désactivé pendant l'envoi ; avertissements cumulés | P4 |
| a-21 | code mort non repris ; réannonce seulement si le texte change | P4 |
| a-22 | copie écrite seulement avec etag ; lecture anticipée reprise au temps restant | P2, P4 |
| a-23 | libellés et Page ↑ / ↓ corrigés ; clôture de 10 h dans l'`aria-label` de la case du jour (*proposé* `…, commandes closes`) | P2, P3 |
| a-24 | textes et accords du résumé corrigés, impression dans le même document | P6 |
| a-25 | D-24, D-05 | P4 |
| a-26 | nettoyage CSS et jetons (§ 3.6) | P3, P4 |

---

## 5. Phases de réalisation

### 5.0 Vue d'ensemble

```
P0 squelette ─> P1 régression sur l'ancien site ─┬─> P2 domaine, API, données ─┬─> P4 parcours public ─> P5 mode collègue ─> P6 impression ─> P7 parité finale, validation ─> P8 bascule
                                                 └─> P3 ui/ + Storybook ────────┘                          (P6 peut démarrer pendant P5, avec des fixtures)
                 (P2 et P3 démarrent dès que P1 (a) a livré le faux script et les fixtures ; la suite de régression sert ensuite de critère de sortie de P4 à P7)
```

| Phase | Contenu | j-p | Sessions | Parallélisable | Statut |
| --- | --- | --- | --- | --- | --- |
| P0 | squelette, outillage (dont react-intl et l'extraction en CI), CI sans déploiement, fichiers actuels déplacés dans `legacy/`, coquille, spike d'hydratation | 2 | 2 | non | à faire |
| P1 | suite Playwright de régression contre l'ancien site (faux script, fixtures, page objects, 30 à 40 scénarios) | 3 | 3 | (b) et (c) en parallèle après (a) | à faire |
| P2 | domaine pur, client API, schémas et frontière de l'API, copie locale, session, horloge, tests dorés | 4 | 3 | avec P3 | à faire |
| P3 | `src/ui/` (Base UI stylé, calendrier, formulaires pré-liés) et Storybook | 5 | 4 | avec P2 | à faire |
| P4 | parcours public complet | 5 | 4 | sous-parties (a)-(d) en partie | à faire |
| P5 | mode collègue | 5,5 | 5 | sous-parties (b)-(e) après (a) | à faire |
| P6 | impression et panneau « Demain » | 2,5 | 2 | avec la fin de P5 | à faire |
| P7 | parité finale (suite de régression complète sur `react`), accessibilité, budget, test par les collègues sur un build local ou l'artefact CI | 2,5 (+ 1 à 2 semaines calendaires) | 2 | non | à faire |
| P8 | bascule et nettoyage | 1 | 1 | non | à faire |
| **Total** | | **30,5** (37 avec 20 % de marge) | **26** | | |

La colonne « Statut » est tenue à jour par chaque session (à faire / en cours / terminé + date et commit).

**Règles communes à toutes les sessions** (à recopier dans le message de lancement d'un agent) :
1. Lire `CLAUDE.md`, ce plan (§ 3 et la phase concernée) et **les sections de la spec citées dans les critères** avant d'écrire du code. La spec fait foi pour tout texte et tout comportement ; ce plan fait foi pour l'architecture.
2. Travailler sur la branche d'intégration `claude/frontend-react-migration-lw5zfz` (ou une branche courte qui y revient par PR). Ne jamais modifier `Code.gs`, ni `legacy/`, ni `docs/spec/`. Un correctif urgent de l'ancien site se fait sur `main` (seul servi par Pages jusqu'à la bascule) et se reporte à l'identique dans `legacy/` sur la branche.
3. `pnpm check` et `pnpm build` verts avant chaque commit ; tests écrits **avec** le code (tables de cas de la spec) ; pas de `useEffect` sans justification écrite (budget S6) ; aucun `useState` pour des valeurs de formulaire ; composants de route de moins de 40 lignes.
4. En fin de session : mettre à jour la colonne « Statut » ci-dessus et noter dans la description du commit ce qui reste à faire ; signaler toute contradiction trouvée entre ce plan et la spec au lieu de la trancher en silence.
5. Ne pas lancer `vite preview` pour vérifier le site (il fait du SSR) : utiliser `node scripts/serve-pages.mjs`.
6. Code en anglais (identifiants, fichiers, dossiers, ids react-intl, commentaires), textes affichés et documentation en français, vocabulaire de l'annexe E ; champs du script seulement dans `api/schemas.ts`, `api/actions.ts` et `queries/local-cache.ts` (§ 3.1, § 3.3.6). Les search params et le chemin `/collegue` restent en français (visibles dans l'URL).
7. Critère de sortie mécanique : les scénarios de régression du périmètre de la phase (P1) sont verts sur le projet `react`. Un scénario ne se modifie que pour en ajouter un ou pour un écart déjà listé au § 4.2 (variante `@changed`) ; un comportement de l'ancien site qui diverge sans être listé est un défaut du nouveau code.

### P0 — Squelette et outillage

- **Objectif** : un dépôt prêt à recevoir le code : outillage complet, CI verte sur la branche d'intégration (sans déploiement), coquille React servie par l'émulateur ; décision « Start SPA ou Router seul » prise sur mesure. Pages n'est pas touché : il continue de servir `main` en mode « branche » jusqu'à la bascule (P8).
- **Livrables** :
  - `git mv index.html app.css design-system.css js legacy/` sur la branche (historique conservé ; `logo.png`, `charte-graphique.pdf`, `Code.gs` restent à la racine) : `legacy/` n'est jamais publié, il sert aux tests dorés (`loadCache`, `formatEuro`) et libère la racine pour le projet Vite ;
  - configurations reprises de `docs/migration/recherche/toolchain-files/`, adaptées : alias `@/*` partout (`tsconfig.json`, règle `import/no-relative-parent-imports`), `BASE_PATH` par défaut `/reservations-restaurants/`, `.node-version` ≥ 22.22.2, `.gitignore` complété (`playwright-report`, `test-results`, `.tanstack`, `storybook-static`), `.npmrc` (`save-exact=true`), `pnpm-workspace.yaml` (repris d'element-admin § 1.7 et d'AppResaAristide), `knip` en deux passes (`knip && knip --production`, entrées `e2e/**/*.spec.ts`, `src/**/*.stories.tsx` et `.storybook/*`, ignorer `src/routeTree.gen.ts` et `public/mockServiceWorker.js`), script `typecheck` = `tsc` ;
  - **react-intl** (§ 3.10) : `src/intl/{intl,formats,common-messages,types.d}.ts`, `RawIntlProvider` dans le `Wrap`, `@formatjs/unplugin` dans `vite.config.ts` et `vitest.config.ts`, script `i18n:extract`, `translations/fr.json` initial, règles `formatjs/*` et `jsPlugins: ["eslint-plugin-formatjs"]` dans `.oxlintrc.json` (liste du § 3.10), `pnpm check` qui commence par l'extraction ;
  - `vite.config.ts` (§ 3.11), `vitest.config.ts` (sans le plugin Start ; projets `node` et `browser` avec `@vitest/browser-playwright`, Chromium headless ; arbitrage 13), `playwright.config.ts` (Chromium, `locale: 'fr-FR'`, `timezoneId: 'Europe/Paris'`, serveur `scripts/serve-pages.mjs`, projets `legacy` et `react`, arbitrage 14) ; `msw init public/` (`mockServiceWorker.js` versionné, retiré de `dist/client` par `scripts/post-build.mjs`) ; navigateurs : en CI GitHub `pnpm exec playwright install --with-deps chromium` (ou l'image officielle Playwright) ; dans les sessions cloud Claude, le Chromium préinstallé désigné par `PLAYWRIGHT_BROWSERS_PATH` (avec `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`), jamais `playwright install` ;
  - `scripts/post-build.mjs`, `scripts/serve-pages.mjs` (émulateur, base paramétrable), `scripts/check-budget.mjs` ;
  - `.github/workflows/ci.yml` : `i18n:extract` + `git diff --exit-code translations/fr.json` → `format:check` → `oxlint -f github` → `tsc` → `vitest run` (projets `node` et `browser`, stories comprises à partir de P3) → `knip` → build (`BASE_PATH=/reservations-restaurants/`, `VITE_APPS_SCRIPT_URL` depuis une variable du dépôt) → budget → E2E (Playwright Chromium ; suite de régression : projet `legacy` à partir de P1, projet `react` à partir de P4 limité par `grep` au périmètre livré) → `actions/upload-artifact` de `dist/client` (build téléchargeable pour la validation par les collègues) ; job `deploy` (`upload-pages-artifact` → `deploy-pages`) écrit dès P0 mais limité à `main` (`if: github.ref == 'refs/heads/main'`), donc inactif jusqu'à la fusion de P8 ; actions épinglées par SHA (relever les SHA avec `git ls-remote` ; connu : `actions/checkout` v7.0.1 = `3d3c42e5aac5ba805825da76410c181273ba90b1`), `permissions` minimales, `persist-credentials: false`, `concurrency` ; `dependabot.yml` ;
  - `src/router.tsx`, `src/routes/__root.tsx` (shell, `head()`, `<ScriptOnce>` réel ou provisoire), `src/routes/index.tsx` (squelette), `src/routes/$.tsx`, `src/routes/index[.]html.tsx`, `src/styles/{tokens,base,print}.css` (découpage de `legacy/design-system.css`), polices auto-hébergées (D-23) ;
  - `CLAUDE.md` (annexe C), section « Développement » du `README.md`.
- **Actions humaines (propriétaire du dépôt)** : variable de dépôt `VITE_APPS_SCRIPT_URL` (valeur actuelle de `APPS_SCRIPT_URL`, `00` § 2.1), seulement. Les réglages Pages (source « GitHub Actions ») et l'environnement `github-pages` sont faits en P8.
- **Dépendances** : aucune.
- **Critères d'acceptation** :
  - `pnpm check`, `pnpm build` et la CI sont verts (dont un message de la coquille extrait dans `translations/fr.json` et un id inconnu refusé par `tsc`) ; `dist/client/` contient `index.html`, `404.html` et des assets préfixés par la base ;
  - servi par l'émulateur : `/reservations-restaurants/` affiche la coquille ; `/reservations-restaurants/collegue` (lien profond) sert le `404.html` et l'appli démarre ; `/reservations-restaurants/index.html` redirige vers `/reservations-restaurants/` ; l'artefact `dist/client` de la CI est téléchargeable ;
  - `https://thegaudis.github.io/reservations-restaurants/` sert toujours l'ancien site depuis `main` (aucun déploiement depuis la branche) ;
  - **spike d'hydratation** (R-01) : une route d'essai pose une copie locale factice par `setQueryData` dans `getRouter()` et rend un contenu synchrone ; un test Playwright relève les erreurs console (#418) et filme le premier rendu. Décision écrite dans ce plan (§ 2.1) : Start conservé (éventuellement avec un `src/client.tsx` personnalisé qui passe `onRecoverableError` à `hydrateRoot`) ou repli « Router seul » ;
  - budget mesuré sur la coquille vide et noté.
- **Tests attendus** : un test Vitest de rendu de route (routeur en mémoire) ; un test Playwright « smoke » (racine, lien profond, `index.html`, absence d'erreur console).
- **Délégable à un agent** : oui (2 sessions : outillage + CI ; coquille + spike). Consignes : partir des fichiers de `recherche/toolchain-files/` sans les réécrire ; ne pas écrire de code applicatif au-delà de la coquille ; ne rien changer au contenu de `legacy/` ; ne toucher ni à `main` ni aux réglages Pages ; préparer l'action humaine (variable de dépôt) dans la PR.
- **Estimation** : 2 j-p, 2 sessions.
- **Risques propres** : job `deploy` déclenché par erreur depuis la branche (condition `if` sur `main` vérifiée en revue), `oxc-transform-react` à garder en `~0.145.0`, `@msw/playwright` et msw 3, Chromium : celui de `PLAYWRIGHT_BROWSERS_PATH` dans les sessions cloud (tests navigateur et E2E en local, sans téléchargement), `playwright install` en CI seulement.

### P1 — Régression sur l'ancien site

- **Objectif** (arbitrage 14) : avant toute réécriture, une suite Playwright de régression **verte contre l'ancien site**, qui sert ensuite de critère de sortie mécanique à chaque phase et de preuve de parité à la fin.
- **Livrables** :
  - `legacy/` servi en statique par `scripts/serve-pages.mjs --root legacy --base /reservations-restaurants/` ;
  - `src/mocks/apps-script.ts` complet : faux script à état mutable, toutes les actions de `02` § 4, erreurs exactes, `unchanged`, `_duplicate`, ajustements R2, verrou, mot de passe changé, lenteur paramétrable, page HTML d'erreur ; `src/mocks/fixtures/` (JSON des exemples de `02` et de `03` § 1.1, champs du script tels quels) ; mêmes handlers que les tests navigateur et Storybook des phases suivantes (arbitrage 13) ;
  - interception par `@msw/playwright` de l'URL exacte `APPS_SCRIPT_URL` codée dans `legacy/index.html` (le nouveau site lira la même valeur par `VITE_APPS_SCRIPT_URL` en test) ;
  - `e2e/regression/*.spec.ts` : 30 à 40 scénarios qui couvrent les écrans et états de `09` (G-*, P-*, L-01, C-*, I-*) et les invariants (copie locale, etag, lecture doublée avec `page.clock`, `requestId` et doublon, cut-off à 10 h, un ticket par commande) ;
  - **page objects** `e2e/pages/*.ts` (`openDay`, `bookR1`, `orderR2`, `login`…) fondés sur les rôles, les libellés et les textes de la spec, jamais sur des classes ou des ids ;
  - étiquettes `@parity` (comportement identique attendu) et `@changed` (écart assumé du § 4.2 : l'assertion a une variante `legacy` et une variante `react`, choisie par le projet Playwright ou une variable `TARGET`) ;
  - `playwright.config.ts` avec deux projets `legacy` et `react` (même suite, `baseURL` et racine servie différentes) ; en CI, le projet `legacy` tourne tant que `legacy/` existe, le projet `react` à partir de P4 avec un `grep` limité aux scénarios du périmètre livré ;
  - `docs/migration/parite.md` créée dès cette phase : pour chaque scénario, la ligne de `09` couverte.
- **Dépendances** : P0.
- **Critères d'acceptation** :
  - chaque ligne de `09` a au moins un scénario ; 100 % vert sur `legacy` ;
  - la liste des scénarios `@changed` est exactement celle du § 4.2 : toute divergence non listée fait échouer la suite ;
  - le faux script passe lui-même des tests unitaires (projet Vitest `node`) contre les exemples de `02` ;
  - les tests dorés des fonctions pures de l'ancien code (`loadCache`, `formatEuro`, `keyTargetIso`, `capacityClass`…) ne sont pas dans cette phase : ils restent en P2.
- **Critères de sortie des phases suivantes** : P4 → scénarios G-*, P-* et L-01 verts sur `react` ; P5 → C-* ; P6 → I-*, C-01 et C-03 ; P7 → suite complète verte sur `react` ; le projet `legacy` est retiré en P8 avec `legacy/`. P4 à P6 n'écrivent plus que les E2E propres au nouveau code (hydratation, impression PDF).
- **Tests attendus** : la suite elle-même (Playwright, Chromium, `locale: 'fr-FR'`, `timezoneId: 'Europe/Paris'`, `storageState` neuf par test) ; tests unitaires du faux script.
- **Délégable à un agent** : oui, 3 sessions : (a) serveur statique de `legacy/`, faux script, fixtures et tests du faux script (à faire en premier) ; (b) scénarios publics et chargement ; (c) scénarios collègue et impression. Consignes : lire `09`, `04`, `06`, `07` ; sélecteurs sémantiques seulement ; un scénario = un état ou un parcours ; les textes attendus sont ceux de la spec ; noter dans `docs/migration/parite.md` la ligne de `09` couverte par chaque scénario ; code en anglais (noms des scénarios et des page objects), textes attendus en français.
- **Estimation** : 3 j-p, 3 sessions.
- **Risques propres** : DOM peu sémantique de l'ancien site (calendrier `role="group"` + `aria-pressed`, pas de `<form>`) → les page objects l'abstraient, et seuls eux changent entre `legacy` et `react` quand le § 4.2 le prévoit ; `window.open` de l'impression côté ancien site (capturer le `popup` Playwright) ; horloge : `page.clock` pour 10 h et minuit ; même origine et donc même `localStorage` entre scénarios → `storageState` neuf par test.

### P2 — Domaine pur, client API, schémas et frontière de l'API, copie locale, session

- **Objectif** : toute la logique sans interface, prouvée par des tables de cas tirées de la spec.
- **Livrables** : `src/domain/*` ; `src/intl/{dates,amounts}.ts` et leurs tests ; `src/api/*` ; `src/queries/{client,state,local-cache,purge}.ts` ; `src/session/session.ts` ; `src/background/{start,inactivity,clock}.ts` ; conversions de la frontière de l'API (§ 3.3.6) et leurs tests sur les fixtures de `src/mocks/fixtures/` (écrites en P1 : exemples de `02` § 3.2, § 4.3, § 4.4, § 4.5, et de `03` § 1.1) ; tests co-localisés. Reprendre d'AppResaAristide `src/lib/validators.ts`, `money.ts` (`formatEuro` avec `\u00A0`), `dates.ts`, `today.ts` (principe), `convex/model/dates.ts` (`parisDate`, `parisHour`), `convex/model/pricing.ts` (`r1Total`), avec leurs tests.
- **Dépendances** : P0 ; P1 (a) pour le faux script et les fixtures de `src/mocks/`.
- **Critères d'acceptation** (chaque ligne = au moins une table `it.each`) :
  - `00` § 3 et `04` § 8, rendus par l'instance `intl` : `formatLongDate` (`2026-10-01` → `jeudi 1er octobre 2026`, `2026-10-03` → `samedi 3 octobre 2026`), montant au format `euro` (`12.5` → `12,50\u00A0€`, `'4.95'` → `4,95\u00A0€`, `0` → `0,00\u00A0€`), pluriels ICU (0, 1, 2 couverts ; 1 et 2 tickets restaurant), séparateur `\u00A0— ` devant un prix, textes de montants R2, `emailError` (trois cas, messages exacts) ;
  - `01` § 3.1 à § 3.8 : places restantes (y compris négatives), seuils `capacityClass` (capacité 20 : 20 à 10 `cap-ok`, 9 à 1 `cap-low`, ≤ 0 `cap-full`), statut R2 agrégé et `null` sans plat, `priceR1`, `r2Amounts`, `orderAmounts` (un ticket), textes de montants et prix d'un plat de `intl/amounts.ts` (prix 0 non affiché), codage du ticket (idempotent), `serviceMode`, `isR2OrderingClosed` à 9 h 59 / 10 h 00 heure de Paris, en hiver et en été, sous `TZ=America/New_York`, jour passé ;
  - `04` § 5.2 et § 5.3 : totaux en direct (`3 couverts · Total : 16,00␣€`, les quatre exemples R2) ; § 7 : lignes et totaux du récapitulatif ; § 8 : formats ;
  - `05` § 2.1, § 2.3, § 3.2 : cases semaine et mois (lundi, 42 cases), libellés (avec la correction a-23), `keyTargetIso` pour chaque touche (Page ↑ / ↓ borné) ;
  - `02` § 1.5 (faux minuteurs) : seconde lecture à 6 000 ms et pas avant, la première réponse gagne, la perdante est annulée, échec seulement si toutes échouent, nouvel essai unique à 1 500 ms, pas de nouvel essai pour `{ error }` ni hors ligne, délai de 30 s par essai ; lecture anticipée consommée une fois et seulement si `since` est identique, doublage au temps restant ;
  - `02` § 1.3, § 1.6, § 4 : `postAction` envoie `Content-Type: text/plain;charset=utf-8` et aucun autre en-tête ; `{ error: 'Mot de passe incorrect.' }` → `PasswordRejectedError` ; autre `{ error }` → `BusinessError` ; HTML ou `TypeError` → `ServiceError` ;
  - `02` § 3.3 et § 5.1 : `unchanged` → même référence, `dataUpdatedAt` rafraîchi, `since` envoyé ; `02` § 5.4 : champs `_…` sortis de l'état (`duplicate`, `emailStatus`, `bookingResult`) avant le cache ; schémas acceptant nombres en chaînes et `''` (`''` → `null` pour le prix, jamais 0) ;
  - **frontière de l'API** (§ 3.3.6) : chaque exemple JSON de `02` (§ 3.2, § 4.3, réponses de § 4.4 et § 4.5) est traduit vers le modèle anglais et la conversion aller-retour est testée (modèle → corps de requête : les corps produits par `api/actions.ts` sont exactement ceux de `02` § 4.4, § 4.5 et § 4.7, `mode`, mention du ticket et `price: ""` compris) ; aucun champ du script hors de `api/schemas.ts`, `api/actions.ts` et `queries/local-cache.ts` (vérifié par une règle de lint ou un test `grep`) ;
  - `03` § 1.1 : l'exemple JSON exact relu, converti vers `PublicState` puis réécrit à l'identique par `toLocalCacheV1` (aux valeurs près : tarifs normalisés par `String(Number(…))`) ; copie de plus de 14 jours ignorée ; copie sans etag acceptée ; JSON invalide ignoré ; aucune écriture depuis l'état complet ni sans etag ; la copie écrite est relue correctement par la logique de `loadCache` de `legacy/js/donnees.js` (test « doré » dans `vm`) ;
  - session : ouverture, fermeture, `endReason` ; inactivité de 10 min (activité qui repousse, `visibilitychange`), purge vérifiée sur un `QueryClient` réel (§ 3.3.4) ; horloge : tic à 10 h 00 et à minuit heure de Paris ;
  - couverture de `src/domain/` ≥ 95 % des lignes.
- **Tests attendus** : unitaires Vitest (projet `node` pour `domain` et `api`), faux minuteurs, `fetch` simulé par `vi.stubGlobal` ou msw en Node (`src/mocks/node.ts`) ; tests « dorés » qui exécutent les fonctions pures de `legacy/js/outils.js`, `donnees.js` et `calendrier.js` (`loadCache`, `formatEuro`, `keyTargetIso`, `capacityClass`…) dans un contexte isolé (`vm` Node avec un `document` minimal factice si cela suffit, sinon une `iframe` dans le projet `browser` : les anciens scripts touchent le DOM au chargement et jsdom n'est plus utilisé) sur les mêmes tables, avec la liste des écarts attendus (heure de Paris, a-23).
- **Délégable à un agent** : oui, 3 sessions dont 2 parallélisables : (a) `domain/` ; (b) `api/` + `queries/` + copie locale ; (c) session + tâches de fond. Consignes : aucune dépendance à React dans `domain` et `api` ; chaque règle cite sa section de spec en commentaire ; `domain/` ne produit aucun texte (nombres et structures) ; les textes et formats passent par `src/intl/` (§ 3.10).
- **Estimation** : 4 j-p, 3 sessions.
- **Risques propres** : `Intl` différent entre Node et navigateurs (comparer avec `\u00A0` explicite, ICU complet de Node 22 ; U+202F des grands montants), ordinal `selectordinal` mal écrit (tester le 1er de chaque mois), transformations non idempotentes du schéma, `AbortSignal.any` absent de vieux Safari (repli `anySignal()`).

### P3 — Composants `ui/` et Storybook

- **Objectif** : une bibliothèque de composants stylés aux jetons de la charte, accessibles, sans métier.
- **Livrables** : `src/ui/**` selon le tableau du § 3.5 (boutons, `ConfirmButton`, `ViewToggle`, champs pré-liés et `createFormHook`, `SegmentedRadio`, `NumberField` à boutons −/+, `PriceField`, `CheckboxField`, `PasswordField`, `SubmitButton`, `Collapsible`, `DatePickerPopover`, `CalendarGrid` et `CalendarHeader`, `Toaster` et gestionnaire de toasts, `Alert`, `CapacityPill`, `Skeleton`, `Spinner`, `icons.tsx`) avec leurs CSS Modules ; reprise adaptée de `src/components/form/fields.tsx` d'AppResaAristide (CSS Modules au lieu de Tailwind, `aria-busy`, `Field.Description`) ; **Storybook** (arbitrage 13) : `.storybook/` (react-vite, `addon-vitest`, `addon-a11y` en mode `error`, `msw-storybook-addon` avec les handlers de `src/mocks/`, décorateur intl + Query + accent), plugin `storybookTest` dans le projet Vitest `browser`, scripts `storybook` et `build-storybook`, override oxlint pour `*.stories.tsx` (`only-export-components` désactivé, export par défaut autorisé) ; une story par composant de `ui/` et par état utile (inactif, occupé, erreur, armé, vue semaine / mois…).
- **Dépendances** : P0, P1 (a) pour les handlers msw des stories (P2 seulement pour `keyTargetIso` et les libellés du calendrier : commencer par les autres composants).
- **Critères d'acceptation** :
  - `08` § 1-5 : jetons seulement (aucune couleur, taille ou rayon en dur hors impression), cibles de 48 px (`::after`), anneau de focus, opacité 38 % pour l'inactif, `prefers-reduced-motion` coupe tout, `user-select: none` sur boutons et jauges ;
  - calendrier : `05` § 2.2 à § 2.6 et § 3.1 à § 3.2 (structure, `aria-label` exacts, un seul `tabIndex=0`, toutes les touches, vue qui suit la sélection, focus conservé sans effet) ;
  - `ConfirmButton` : `06` § 5.2 (armement, 4 s, largeur figée, `aria-label` et `title`, désarmement à chaque rendu neuf), a-19 ;
  - champs : `04` § 5.4 et § 10 (libellé relié, `aria-invalid`, `aria-describedby` erreur puis aide, aide masquée en erreur, message retiré dès la correction, focus sur le premier champ en erreur dans l'ordre du DOM) ;
  - `NumberField` : libellés français (`aria-roledescription`, boutons −/+), `null` → 0 ;
  - `Toaster` : un seul toast (a-8), 3,5 s, types succès / neutre / erreur, erreurs prioritaires ;
  - date picker : `06` § 3.2 et § 3.3 (flèches = focus seulement, jours passés `aria-disabled`, « déjà ouvert », Échap, clic extérieur, retour du focus).
- **Tests attendus** : Vitest Browser Mode (`vitest-browser-react`, `page.getByRole`, `userEvent` de `vitest/browser`) pour chaque composant (rôles, noms accessibles, clavier réel, focus, états `data-*`) ; chaque story exécutée comme test et passée à axe ; table de toutes les touches du calendrier ; faux minuteurs pour `ConfirmButton`.
- **Délégable à un agent** : oui, 4 sessions : (0) configuration Storybook et intégration Vitest (à faire en premier) ; (a) boutons, retours (toasts, alertes, jauge, squelette), bascules, icônes ; (b) formulaires pré-liés ; (c) calendrier et sélecteur de date ; chaque session écrit les stories de ses composants. Consignes : aucun import de `api/`, `queries/` ni de données métier ; libellés métier fournis par props (déjà formatés par `intl`) ; textes génériques propres à `ui/` (« Confirmer ? », « Notifications », « champ numérique », boutons −/+) en messages react-intl `ui.*` ; Base UI enveloppé une seule fois ; consulter `recherche/ui-forms.md` § 2-4 et § 11.
- **Estimation** : 5 j-p, 4 sessions.
- **Risques propres** : compatibilité Storybook 10.6 / Vitest 5 / plugin Start (Storybook utilise sa propre config Vite, sans le plugin Start), stories qui dépendent du routeur (décorateur avec routeur en mémoire), libellés anglais de Base UI oubliés, `Field.Error` non annoncé (focus + `aria-describedby`), désélection du `ToggleGroup`, accent perdu dans les portails, `useStore` de TanStack Form déprécié (utiliser `useSelector` ou `form.Subscribe`).

### P4 — Parcours public

- **Objectif** : la page publique complète, identique à l'actuelle plus les décisions du § 4.
- **Livrables** : `routes/index.tsx` complet ; `features/page/*` ; `features/calendar/*` (navigation par l'URL, `domain/navigation.ts`) ; `features/r1/*`, `features/r2/*`, `features/booking/*` ; `mutations/bookings.ts` ; `queries/use-app-state.ts` et `<AutoRefresh/>` ; lecture anticipée réelle ; formulaires publics chargés à la demande (`lazy()`, préchargés au survol ou au focus de « Réserver » et pendant l'inactivité du navigateur) ; stories des fiches, formulaires, récapitulatifs, encadré d'échec et bandeau dans chacun de leurs états de `09` (handlers msw) ; budget contrôlé en CI.
- **Dépendances** : P2, P3.
- **Critères d'acceptation** :
  - en-tête, colonnes, pied : `04` § 2, `08` § 7 (ordre de la page, points de rupture 760 / 640 / 600 / 520 px, `pointer: coarse`), D-24, easter egg conservé (D-01) ;
  - calendriers : `05` § 2 et § 3 câblés sur l'URL (§ 3.2 de ce plan), sélection sans effet sur l'autre restaurant (a-12) ;
  - fiches : ordre exact `05` § 5.1 et § 6.2, états `05` § 5.2 et § 6.5, jauges `05` § 4.5, jour sans service `05` § 4.3, cut-off `01` § 3.7 et `04` § 4.3, D-02 ;
  - formulaires : `04` § 5.1 à § 5.4 (libellés, attributs, placeholders, ordre, validations et messages exacts, focus d'ouverture et défilement, retour du focus sur « Réserver » à l'annulation, repli de la liste R2, ticket → sur place et aide), D-17, D-18 ;
  - envoi : `04` § 6.1 à § 6.3 (bouton occupé, corps exacts avec `trim()`, `requestId` conservé après erreur et renouvelé à la réouverture, cut-off repris à l'envoi avec toast neutre, réponses `_duplicate` / `_bookingResult` / `_emailStatus`, erreurs du script), a-6, a-20, D-14, D-15, D-16 ;
  - récapitulatif : `04` § 7 et `08` § 6.1 (lignes, total, avertissements cumulés, contact d'annulation, `Fermer`, `role="status"`, focus), affiché au-dessus de la fiche tant que le jour reste sélectionné ;
  - chargement : `03` § 2 et § 3 (squelette, copie locale, encadré d'échec et textes de § 3.1, `Réessayer`), § 5.1 et § 5.2 (actualisation, a-4 : saisie et focus intacts après une actualisation), § 5.3 (10 h, a-7), a-21, a-22, D-05 ;
  - catalogue `04` § 9 entièrement couvert par des tests ; accessibilité `04` § 10 ;
  - **critère de sortie** : scénarios de régression G-*, P-* et L-01 verts sur le projet `react` (P1) ;
  - écrans `09` G-01 à G-05, G-07, P-01 à P-17 ;
  - budget S3 respecté ; 0 à 2 effets (S6).
- **Tests attendus** : Vitest Browser Mode + msw en service worker (`onUnhandledRequest: 'error'`, handlers de `src/mocks/apps-script.ts`) par état d'écran, et stories ; routes en mémoire (`createMemoryHistory`) pour les search params (fallbacks, `?connexion=1`, `reserver` sur un jour non réservable) ; E2E propre au nouveau code seulement : `e2e/hydration.spec.ts` (premier rendu depuis la copie, aucune erreur #418) ; les parcours « réserver R1 » et « commander R2 avant et après 10 h » sont des scénarios de régression déjà écrits en P1.
- **Délégable à un agent** : oui, 4 sessions : (a) page, en-tête, états de chargement, actualisation, lecture anticipée ; (b) calendriers câblés et fiches ; (c) formulaire R1, envoi et récapitulatif ; (d) formulaire R2. (b) après (a) ; (c) et (d) en parallèle après (b). Consignes : chaque texte est un message react-intl à id explicite (`public.…`) dont le `defaultMessage` est recopié de `04` § 9 et la `description` cite la section ; données lues par `useAppState(select)` dans les feuilles, pas de props sur cinq niveaux ; état du formulaire uniquement dans TanStack Form ; `requestId` par `useState(() => newRequestId())` dans le composant monté avec `key={`${restaurant}:${date}`}`.
- **Estimation** : 5 j-p, 4 sessions.
- **Risques propres** : budget JS (R-15), hydratation selon la décision P0, `?reserver=1`, `handleSubmit` qui relance l'erreur, `defaultValues` lues au montage seulement (clé par jour).

### P5 — Mode collègue

- **Objectif** : tout le mode collègue, avec une session sûre.
- **Livrables** : `routes/collegue.tsx` (garde, schéma, loader de l'état complet) ; `features/page/ModeSwitch.tsx` (Client / Collègue, panneau de connexion `?connexion=true`, œil, Entrée, Échap) ; `mutations/staff.ts` ; `features/staff/*` ; branchement de la déconnexion (§ 3.3.4) et de l'inactivité ; panneau `Demain` (totaux ; détails et impression en P6).
- **Dépendances** : P4 (page et fiches), P2 (session).
- **Critères d'acceptation** :
  - accès : `06` § 1.1 à § 1.8 (attributs du sélecteur, comportements, connexion refusée sur copie locale, textes d'erreur, toasts, conservation du mot de passe, déconnexions, mot de passe changé, actualisation par `getAdminState`) ; garde : rechargement de `/collegue?r1=…&editResa=…` → connexion → retour exact ;
  - **sécurité** (S8) : après chaque déconnexion, cache et DOM purgés (§ 3.3.4) ; mot de passe absent de `localStorage`, `sessionStorage`, de l'URL, des clés de requête et des messages de log ; a-1, a-13, a-14 ;
  - panneaux : `06` § 2.1 (D-07, première partie), § 2.2 (Paramètres, D-20), § 3 (sélecteur de date), § 4.1 à § 4.3 (ouvrir un jour R1 et R2, lignes de plats, case ticket, D-19), § 5.1 et § 5.2 (modifier ce jour, R1 seulement : D-09 non retenue ; suppressions en deux clics, D-21), § 6 (plats, D-22), § 7 (liste et modification des réservations, contact obligatoire comme aujourd'hui : D-04 non retenue), § 8 (ajout d'une personne, `requestId`, relecture de l'état complet, toasts) ;
  - corps des requêtes conformes à `06` § 10 et `02` § 4.7 (champ `password` présent seulement pour les actions protégées, jamais pour `addBookingR1` / `addBookingR2Multi`) ;
  - écrans `09` G-08, L-01, C-01 à C-30 (hors impression).
- **Tests attendus** : Vitest Browser Mode par panneau avec le faux script (état mutable) et stories de chaque panneau dans ses états de `09` ; tests de la garde et du retour ; faux minuteurs pour l'inactivité dans un vrai rendu ; test S8 ; le parcours « connexion → ouvrir un jour → ajouter une personne → déconnexion par inactivité (`page.clock.fastForward('10:01')`) → plus aucun nom » est un scénario de régression (P1).
- **Critère de sortie** : scénarios de régression C-* (hors impression) verts sur le projet `react`.
- **Délégable à un agent** : oui, 5 sessions : (a) session, garde, connexion, déconnexion, inactivité, mot de passe changé (à faire en premier) ; (b) ouvrir et modifier un jour, sélecteur de date ; (c) plats ; (d) réservations : liste, modification, ajout ; (e) paramètres et panneau « Demain ». Consignes : le mot de passe n'est lu que dans `mutationFn` / `queryFn` via le store ; jamais en prop, jamais en clé ; chaque panneau ouvert = un paramètre d'URL du § 3.2.
- **Estimation** : 5,5 j-p, 5 sessions.
- **Risques propres** : course entre une lecture et une écriture (`cancelQueries`), suspension au passage d'une clé à l'autre (`id` calculé avant `open`), store Zustand singleton dans les tests (réinitialiser avec `useSessionStore.setState(initial, true)`), minuteurs ralentis en arrière-plan.

### P6 — Impression et panneau « Demain »

- **Objectif** : les quatre documents imprimés et le panneau « Demain » fusionné.
- **Livrables** : `ui/print/*`, `styles/print.css`, `features/print/*`, `domain/print.ts` complété, panneau `Demain` complet (D-07), stories des documents et du panneau.
- **Dépendances** : P5 (a) pour l'accès ; les documents peuvent être écrits sur fixtures pendant P5.
- **Critères d'acceptation** :
  - `07` § 2 (format A4 paysage et marges, structure de haut en bas, couleurs par restaurant, tableaux, total, signature, pied imprimé dans les boîtes de marge, date d'impression), § 3 (liste R1 : colonnes, N° table, Chef de rang, totaux), § 4 (liste R2 : regroupement par client, récapitulatif par plat), § 5 (panneau à l'écran, textes corrigés de a-24, D-03), § 6 et § 7 (résumés du lendemain), titres de document (nom du PDF) ;
  - un ticket par commande dans tous les totaux (a-11, invariant 5) ; ordre actuel des listes (D-08 non retenue) ; réservations orphelines exclues ;
  - impression sans nouvelle fenêtre ; rien d'autre que le document à l'impression ; l'appli revient intacte après `afterprint` (focus rendu au bouton) ;
  - écrans `09` C-01, C-03, I-01 à I-04.
- **Tests attendus** : rendu des documents sur fixtures en Vitest Browser Mode (textes, lignes, ordre, totaux exacts) ; E2E propre au nouveau code : `e2e/print-pdf.spec.ts` (`window.print` intercepté, `page.emulateMedia({ media: 'print' })`, `page.pdf()` pour vérifier le format paysage et le nombre de pages d'une longue liste).
- **Critère de sortie** : scénarios de régression I-*, C-01 et C-03 verts sur le projet `react`.
- **Délégable à un agent** : oui, 2 sessions : (a) mécanique et documents R1 ; (b) documents R2, panneau « Demain ». Consignes : suivre `07` ligne par ligne, y compris les colonnes vides et les cas « Aucune réservation. ».
- **Estimation** : 2,5 j-p, 2 sessions.
- **Risques propres** : boîtes de marge seulement dans Chromium, Safari iOS, polices pas encore chargées (attente ≤ 2 s), `@page` global (page nommée obligatoire).

### P7 — Parité finale et validation par les collègues

- **Objectif** : prouver la parité (suite de régression complète verte sur le nouveau site), l'accessibilité et le budget, puis faire valider le nouveau site par les collègues sur le vrai script **avant la fusion**, sans préproduction publiée (arbitrage 15).
- **Livrables** : suite de régression (P1) verte en entier sur le projet `react`, scénarios `@changed` vérifiés contre le § 4.2 ; parcours E2E propres au nouveau code complétés (`hydration`, `print-pdf`, `a11y`) ; `docs/migration/parite.md` complétée (chaque ligne de `09` → scénario de régression, story ou test navigateur → statut sur `legacy` et sur `react` ; écarts du § 4.2) ; rapport de budget ; procédure de validation pour les collègues (build local ou artefact CI) ; correctifs. Le faux script et les scénarios existent depuis P1 : cette phase ne les écrit plus.
- **Dépendances** : P4, P5, P6.
- **Critères d'acceptation** :
  - S1 à S8 du § 1.5 atteints ; **critère de sortie** : suite de régression complète verte sur `react`, avec les mêmes scénarios `@parity` que sur `legacy` et exactement les écarts `@changed` du § 4.2 ; parcours E2E propres au nouveau code verts (premier rendu depuis la copie sans erreur #418, impression PDF paysage, smoke) ;
  - axe sans violation sur toutes les stories (`@storybook/addon-a11y` en mode `error`) ; en E2E, axe sur quelques écrans complets : G-02, G-04 (semaine et mois), P-05, P-13, L-01, G-08, C-02 ;
  - vérification manuelle : NVDA ou VoiceOver sur le calendrier et un formulaire ; Safari iOS et les tablettes de l'établissement ; impression sur un poste du lycée ;
  - **validation par les collègues** (S9) : pendant 1 à 2 semaines, avant la fusion, sur le build de la branche servi par `pnpm build && node scripts/serve-pages.mjs` (poste du responsable ou des collègues) ou sur l'artefact `dist/client` téléchargé depuis la CI et servi de la même façon ; le build pointe sur le vrai script (vraies réservations, vrais e-mails) ; retours traités ou reportés ; accord écrit.
- **Tests attendus** : Playwright + `@msw/playwright` (mode strict, handlers de `src/mocks/apps-script.ts`), `timezoneId: 'Europe/Paris'`, `locale: 'fr-FR'`, projets `legacy` et `react`.
- **Délégable à un agent** : partiellement : correctifs de parité, parcours propres, axe, matrice et budget oui (2 sessions) ; test par les collègues et validation non.
- **Estimation** : 2,5 j-p, 2 sessions, plus 1 à 2 semaines calendaires.
- **Risques propres** : comportement réel du script (302, lenteurs, pages d'erreur) différent du faux ; la validation écrit dans la vraie feuille et envoie de vrais e-mails (R-30) ; collègues peu à l'aise avec un serveur local (prévoir une démonstration, ou un poste préparé par le responsable).

### P8 — Bascule et nettoyage

- **Objectif** : le nouveau site à la racine en une fois, l'ancien retiré, retour arrière possible en moins de 15 minutes.
- **Livrables** : tag `v1-final` sur `main` ; commit de bascule sur la branche : `legacy/` supprimé avec le projet Playwright `legacy` (la suite de régression ne tourne plus que sur `react`), job `deploy` du workflow actif sur `main` (`BASE_PATH=/reservations-restaurants/`, artefact = `dist/client`) ; README réécrit (présentation, installation du script inchangée, développement, déploiement, retour arrière) ; `CLAUDE.md` à jour ; E2E de production en lecture seule (`e2e/smoke-production.spec.ts`, aucune écriture) ; message aux collègues.
- **Actions humaines (propriétaire du dépôt), dans l'ordre** : (1) poser le tag `v1-final` sur `main` ; (2) Settings → Environments → `github-pages` → autoriser `main` ; (3) Settings → Pages → Source « GitHub Actions » **immédiatement avant** la fusion (obligatoire : en mode « branche », Jekyll ignore les chunks `_*.js`, R-04) ; (4) fusionner la branche d'intégration dans `main` ; (5) vérifier le déploiement (§ 7).
- **Dépendances** : P7 validée.
- **Critères d'acceptation** : checklist du § 7 entièrement cochée ; E2E de production vert ; retour arrière répété une fois à blanc (dépôt de test ou fourche, même procédure).
- **Tests attendus** : E2E de production (chargement, copie locale, calendriers, ouverture d'un formulaire sans envoi).
- **Délégable à un agent** : partiellement : commit de bascule, workflow et README oui (1 session) ; tag, réglages Pages, fusion dans `main` et communication non.
- **Estimation** : 1 j-p, 1 session.
- **Risques propres** : cache de 10 min de Pages (anciens onglets), chunk introuvable dans un onglet resté ouvert, oubli d'un réglage (environnement, variable de dépôt), délai entre le changement de source et le premier déploiement (Pages continue de servir le dernier déploiement du mode « branche » jusqu'au déploiement par Actions).

---

## 6. Risques et pièges

### 6.1 Points où les rapports de recherche s'écartent des arbitrages

Les arbitrages de ce plan s'appliquent ; ces écarts sont signalés pour qu'aucune session ne reprenne par erreur la proposition d'un rapport.

| Rapport | Proposition du rapport | Arbitrage retenu |
| --- | --- | --- |
| `tanstack-start.md` § 4 | routes par restaurant (`/r1/$jour`, `/collegue/r1/$jour`), `?mois=` | page unique à deux colonnes, paramètres `r1`, `r2`, `r1vue`… (§ 3.2) |
| `tanstack-start.md` § 4, `react-architecture.md` § 2, `element-admin-reference.md` § 11.5 | copie locale lue dans un effet, un composant client ou un persisteur expérimental ; lecture anticipée jugée inutile | restauration **synchrone** avant le routeur et `<ScriptOnce>` conservé ; risque d'hydratation traité par le spike de P0 (R-01) |
| `tanstack-query.md` § 3.2 | nouveau format `{ v, savedAt, data }` et nouvelle clé `-v2` | même clé et même format `reservations-cache-v1` (invariant 2, compatibilité avec les copies des visiteurs habituels et avec un retour arrière) |
| `tanstack-query.md` § 8 | store de session en module simple (`useSyncExternalStore`) | Zustand 5 avec `subscribeWithSelector`, sans `persist` |
| `tanstack-query.md` § 2.4 | `staleTime: 30_000` | `180_000` (rattrapage au retour sans lectures en rafale, § 3.3) |
| `react-architecture.md` § 5 | Zod 4 classique | Valibot (poids, déjà choisi par element-admin) |
| `react-architecture.md` § 2 (i) et § 8 | impression dans une fenêtre ouverte au clic | impression dans le même document (§ 3.8) |
| `react-architecture.md` § 2 (d) | modification d'une réservation en état local | paramètre d'URL `editResa` (schéma de `09` § 1) |
| `react-architecture.md` § 7 | l'ancien `formatEuro` mettrait une espace normale ; textes inline et `textes.ts` par fonctionnalité | l'ancien code met bien U+00A0 (vérifié à l'octet, `spec/README.md` § 4.1) ; arbitrage 11 : `FormattedNumber` (`Intl`, U+00A0 avant €, U+202F au-delà de 999 €) et tous les textes en messages react-intl |
| `element-admin-reference.md` § 10 | react-intl, formatjs et Localazy « à écarter » (pas de localisation) | arbitrage 11 : react-intl / FormatJS **repris** pour les pluriels, montants et dates, langue unique, sans Localazy |
| element-admin (clone) | ids générés par empreinte (`enforce-id`), `selectordinal` interdit, traductions compilées chargées à l'exécution, extraction au format Crowdin | ids explicites par domaine, `selectordinal` autorisé (« 1er »), `defaultMessage` compilés en AST par le plugin (aucun fichier chargé), format d'extraction par défaut |
| `element-admin-reference.md` § 1.1 et § 10 | pas de `tsc` séparé (`typeCheck` d'oxlint suffit) | `tsc` **aussi** en CI (angles morts croisés mesurés dans `toolchain.md` § 2) |
| `element-admin-reference.md` § 11.5 | déconnexion propagée aux autres onglets, horloge en heure locale (`setHours`) | pas de propagation (D-26) ; horloge en heure de Paris |
| `element-admin-reference.md` § 8 | E2E servi par `vite preview` | serveur statique `scripts/serve-pages.mjs` (`vite preview` fait du SSR avec Start) |
| `toolchain.md` § 5, `toolchain-files/` | alias `#/*` | alias `@/*` (element-admin, AppResaAristide ; motif interne par défaut d'oxfmt) |
| `ui-forms.md` § 3.2 | `useLayoutEffect` pour le focus du calendrier | focus dans le gestionnaire clavier + ref callback (0 effet) |
| `ui-forms.md` § 2.8 et § 6 | `AlertDialog` pour « Supprimer ce jour » | suppression en deux clics (`ConfirmButton`), note détaillée (D-21) |
| `appresaaristide-reference.md` § 5 | espace collègue à onglets, calendrier unique, « Ouvrir ce jour » dans la carte (sans sélecteur de date) | page et sélecteur de date conservés (pas de refonte) |
| `react-architecture.md`, `tanstack-query.md`, `tanstack-start.md`, `appresaaristide-reference.md` (extraits de code) | identifiants et chemins en français (`src/domaine/`, `useEtat`, `motDePasse`, `couverts`…) ; champs du script utilisés tels quels dans les composants | arbitrage 12 : code en anglais (glossaire de l'annexe E), champs du script traduits à la frontière de l'API (§ 3.3.6) |
| `react-architecture.md` § 8, `appresaaristide-reference.md` § 6 | composants testés avec Testing Library + jsdom (Vitest Browser Mode cité en option) ; pas de Storybook | arbitrage 13 : Vitest Browser Mode (Chromium), Storybook dont chaque story est un test avec axe, faux script msw unique |
| `react-architecture.md` § 8 | tests de caractérisation limités aux fonctions pures de l'ancien code (dans jsdom) | arbitrage 14 : en plus des tests dorés des fonctions pures (P2), une suite Playwright de régression écrite contre l'ancien site avant la réécriture (P1) |
| `toolchain.md` § 5 | `exactOptionalPropertyTypes: true` (AppResaAristide et element-admin le désactivent) | `true` au départ ; passer à `false` seulement si les types de Base UI ou TanStack Form l'imposent, décision notée dans `CLAUDE.md` |

### 6.2 Risques consolidés et parades

| # | Risque ou piège | Parade | Phase |
| --- | --- | --- | --- |
| R-01 | **Hydratation de la coquille Start** : la coquille prérendue montre le squelette, alors que le premier rendu client sort de la copie locale ; React lève l'erreur #418 (issues #8473, #6455), jette le HTML et refait le rendu (flash possible). | Spike de P0 dans un vrai navigateur (CI). Racine neutre (aucun lien actif, rien qui dépende de l'URL), route `$.tsx`. Si l'erreur est seulement journalisée sans flash visible : `src/client.tsx` avec `onRecoverableError` filtré. Sinon : **repli Router seul** (§ 2.1), sans hydratation (`createRoot`). | P0 |
| R-02 | Le `loader`, le `beforeLoad` et le code de niveau module de la racine, de `router.tsx` et de leurs imports s'exécutent **au build** dans Node : `localStorage` fait échouer le prérendu ; une donnée chargée là serait figée dans la coquille. | Garde `typeof window` dans `getRouter()` ; aucun loader à la racine ; garde de session sur `/collegue` seulement ; aucun appel au script pendant le build. | P0 |
| R-03 | `vite preview` d'un projet Start fait du **vrai SSR** : il ne reflète pas Pages. | `scripts/serve-pages.mjs` pour la prévisualisation et l'E2E ; consigne dans `CLAUDE.md`. | P0 |
| R-04 | En mode « branche », **Jekyll** ignore les fichiers commençant par `_` (chunks `_app-xxxx.js`) ; `upload-pages-artifact` v4+ exclut les fichiers cachés. | Source Pages « GitHub Actions » (pas de Jekyll), passée juste avant la fusion de P8 et obligatoire ; `.nojekyll` inoffensif en plus ; aucun fichier caché nécessaire dans l'artefact. | P8 |
| R-05 | Pages sert tout avec `Cache-Control: max-age=600`, non réglable : un `index.html` ancien peut rester 10 min. | Assets hachés ; prévoir 15 min dans la checklist ; pas de service worker. | P8 |
| R-06 | Après un déploiement, un onglet ouvert demande un chunk disparu (il reçoit le HTML de la 404). | Rechargement automatique unique du routeur (`lazyRouteComponent`) et écouteur `vite:preloadError` (garde en `sessionStorage`) pour les `import()` manuels. | P4 |
| R-07 | **CORS d'Apps Script** : tout en-tête non simple déclenche un pré-vol `OPTIONS` que le script ne gère pas. | `GET` sans en-tête ; `POST` en `Content-Type: text/plain;charset=utf-8` ; jamais `application/json`, `redirect: 'manual'` ni `mode: 'no-cors'` ; test unitaire sur les en-têtes envoyés. | P2 |
| R-08 | Le script répond `302` (le navigateur suit en `GET`) ; un déploiement réglé sur « compte Google » redirige vers une page de connexion (erreur CORS permanente). | `redirect: 'follow'` (défaut) ; `preconnect` vers `script.googleusercontent.com` ; README : déploiement « Tout le monde ». | P2, P8 |
| R-09 | Pages d'erreur HTML de Google : sans CORS → `TypeError` (indiscernable d'une coupure) ; avec CORS → `SyntaxError` au `json()`. | Les deux deviennent `ServiceError` ; message selon `navigator.onLine` ; nouvel essai pour les lectures seulement. | P2 |
| R-10 | Lenteur du script (démarrage à froid parfois > 10 s), pas d'heure serveur. | Lecture anticipée, copie locale, lecture doublée, délai de 30 s par lecture ; heure de Paris côté client ; D-15 pour les écritures. | P2, P4 |
| R-11 | Interrompre un `POST` n'annule pas l'écriture ; un rejeu automatique créerait des doublons. | Mutations `retry: false`, `networkMode: 'always'`, aucun délai d'expiration ; `requestId` conservé pour le nouvel essai manuel. | P2, P4 |
| R-12 | React 19 et le routeur remontent la CSS (`precedence`) **avant** le script inline : la lecture anticipée attend la CSS (inverse de l'ordre actuel). Un `preconnect` sans `crossorigin` ouvre une connexion inutile pour un `fetch` CORS. | Accepté (CSS hachée en cache aux visites suivantes, lecture toujours partie avant le bundle) ; `crossOrigin: 'anonymous'` ; option mesurée seulement si besoin : `<link rel="preload" as="fetch">` (sans `since`). Avec le repli Router seul, le script repasse avant la CSS dans `index.html`. | P4 |
| R-13 | **Sans `.gitignore`, oxlint et tsgolint analysent `node_modules`** (processus tué après 60 s dans l'essai). | `.gitignore` livré dès le premier commit de P0 ; `ignorePatterns` en plus. | P0 |
| R-14 | Règles `jsPlugins` qui exigent les types **silencieusement inactives** (`@tanstack/query/no-void-query-fn`) ; `plugins` remplace la liste par défaut ; `react/rules-of-hooks` est en `pedantic` ; `no-unnecessary-condition` et `prefer-optional-chain` en `nursery`. | Config de `toolchain-files/` telle quelle (déjà réglée) ; monter `oxlint` et `oxlint-tsgolint` ensemble ; `typescript/no-deprecated` en erreur (attrape `ensureQueryData`, `FormEvent`) ; règles `formatjs/*` non typées, donc actives (prouvé en production chez element-admin). | P0 |
| R-15 | **Budget JS** : estimation du chemin public autour de 200 kB gzip (React, Router, Start, Query, Form, Base UI, react-intl 7,6 kB sans analyseur ICU) ; une page unique n'est pas découpée par route ; `validateSearch` reste dans le chunk d'entrée. | Mesure en CI dès P0 (S3) ; formulaires publics, mode collègue et impression chargés à la demande ; valibot (pas zod) ; imports Base UI par composant ; alias `no-parser` de FormatJS en production ; si dépassement : `rollup-plugin-visualizer`, report du `NumberField` ou du `Collapsible` hors du chemin initial. | P0, P4 |
| R-16 | **Base UI** : libellés anglais codés en dur (`Increase`, `Decrease`, `Number field`), portails qui perdent l'accent, `Field.Error` non annoncé, `ToggleGroup` qui se désélectionne, `NumberField` qui renvoie `null` et refuse les `datalist`, `Form` de Base UI qui ignore le prop `invalid`, portails sous iOS. | Enveloppes uniques de `ui/` (libellés français, `className` d'accent sur les portails, focus sur le premier champ invalide, valeur vide ignorée, `null` → 0, `PriceField` texte) ; pas de `Form` Base UI ; `isolation: isolate`, `body { position: relative }`, champs ≥ 16 px. | P3 |
| R-17 | **TanStack Form** : `handleSubmit` relance l'erreur d'`onSubmit` ; erreurs Standard Schema = objets ; `defaultValues` lues au montage seulement ; envoi arrêté avant la validation des champs non touchés ; erreur croisée affichée au 2e envoi seulement ; `useStore` déprécié ; `children=` en prop. | `try/catch` dans `onSubmit` ; `errorText()` ; formulaire monté avec une `key` (jour, ouverture) ; `canSubmitWhenInvalid: true` et `form.validate('change')` avant `handleSubmit()` (AppResaAristide) ; `useSelector` ou `form.Subscribe` avec sélecteur ; enfant en JSX. | P3, P4 |
| R-18 | **TanStack Query** : un minuteur par observateur (`refetchInterval` partagé = lectures en double) ; `retry` dans `queryOptions` passe avant les défauts de test ; `queryClient.query()` force `retry: false` si `retry` n'est pas défini ; `ensureQueryData`, `prefetchQuery`, `fetchQuery` dépréciés ; `queryFn` qui renvoie `undefined` ; `select` qui renvoie des `Map` ; secret dans une clé ; variables de mutations (noms) gardées 5 min ; mutations mises en pause hors ligne. | `<AutoRefresh/>` unique ; `retry` dans les défauts du client ; `query()` dans les loaders ; `no-deprecated` ; relecture sans `since` dans le cas limite ; résultats en objets et tableaux, index en `WeakMap` ; `id` de session dans la clé ; `getMutationCache().clear()` à la déconnexion ; `networkMode: 'always'`. | P2 |
| R-19 | **Search params** : `?reserver=1` ou `?connexion=1` sont des nombres (format « JSON d'abord ») ; « aujourd'hui » comme valeur par défaut rendrait `validateSearch` impur ; `location.pathname` est sans basepath ; un `<Link>` actif reçoit `aria-current="page"`. | Liens écrits avec `search={{ … }}` et `v.fallback` ; « aujourd'hui » résolu dans le composant ; jamais de base en dur (`Link`, `to`, `import.meta.env.BASE_URL`) ; cases du calendrier en `<button>`. | P4 |
| R-20 | **Dates et formats** : `Intl.NumberFormat` met U+202F et U+00A0 ; Temporal absent de Safari stable ; `new Date('YYYY-MM-DD')` est en UTC ; changements d'heure ; ICU variable selon les moteurs. | format `euro` partagé, jamais d'espace codée en dur autour d'un montant ; chaînes ISO + arithmétique UTC ; `parisDate` / `parisHour` ; tests autour des changements d'heure et sous deux fuseaux ; comparaisons avec `\u00A0` explicite. | P2 |
| R-21 | **Compatibilité du format v1** : les visiteurs qui reviennent après la bascule ont une copie `reservations-cache-v1` écrite par l'ancien site (parfois sans etag, après une session collègue) ; un retour arrière ferait relire à l'ancien site les copies écrites par le nouveau. | Format v1 lu et écrit à l'identique, conversion vers le modèle anglais seulement en mémoire (§ 3.3.6) ; test doré avec `loadCache` ; lecture tolérante (etag facultatif) ; aucune nouvelle clé ; `reservations-textes` jamais écrite par le nouveau site. | P2, P8 |
| R-22 | Navigateurs anciens (tablettes, vieux iPad) : `AbortSignal.any` / `timeout` (Safari 17.4), `crypto.randomUUID` (Safari 15.4), `:has()` (Safari 15.4) ; cible de build Vite par défaut `safari16.4`. | `anySignal()` et `timeoutSignal()` maison ; `newRequestId()` avec repli de `02` § 5.3 ; inventaire des appareils de l'établissement en P7 ; `build.target` abaissé si nécessaire. | P2, P7 |
| R-23 | React Compiler Rust expérimental ; `oxc-transform-react` 0.152 incompatible avec plugin-react 6.1. | Épingler `~0.145.0` ; plan B du § 2.1 ; les règles du compilateur (oxlint) restent actives dans tous les cas. | P0 |
| R-24 | TypeScript 7 : `baseUrl` supprimé, `types` vaut `[]` par défaut, pas d'API JS ; `@types/react` 19.3 déprécie `FormEvent`. | `paths` sans `baseUrl`, `types: ["vite/client"]` ; `SubmitEvent` / `ChangeEvent` ; `@typescript/typescript6` seulement pour un outil qui l'exigerait. | P0 |
| R-25 | Zustand : store singleton abonné plusieurs fois (tests, HMR) ; composant abonné au store entier ; `set` à chaque `pointermove`. | `startBackgroundTasks` idempotent (arrête l'instance précédente) et désabonnement gardé ; sélecteur obligatoire (revue) ; activité notée dans une variable de module. | P2 |
| R-26 | Minuteurs ralentis ou gelés (onglet caché, veille, retour par le cache de navigation) : déconnexion tardive, cut-off ou minuit manqués. | Comparaison d'horodatages + revérification sur `visibilitychange` et `pageshow` ; horloge recalculée au retour. | P2 |
| R-27 | Impression : boîtes de marge `@page` seulement dans Chromium 131+, `@page` global, polices pas encore chargées, Safari iOS. | Page nommée `list` ; attente de `document.fonts.ready` ≤ 2 s ; essai sur les postes du lycée (P7) ; « Page x / y » absent hors Chromium, accepté. | P6 |
| R-28 | Outils de test : navigateur nécessaire aux tests de composants (Vitest Browser Mode), à Storybook et à l'E2E ; `playwright install` impossible ou inutile dans les sessions cloud ; `mockServiceWorker.js` qui partirait en production ; MSW 3 ne modifie plus `setTimeout` (avancer les faux minuteurs) ; `@msw/playwright` 0.x avec msw 3 ; Vitest ne doit pas charger le plugin Start ; `routeTree.gen.ts` absent fait échouer `tsc`. | Sessions cloud Claude : Chromium préinstallé désigné par `PLAYWRIGHT_BROWSERS_PATH` (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`), tests navigateur et E2E en local, jamais `playwright install` ; CI : `pnpm exec playwright install --with-deps chromium` ; `mockServiceWorker.js` retiré de `dist/client` et vérifié (§ 7) ; faux minuteurs avancés explicitement ; repli `page.route` ; `vitest.config.ts` séparé ; `routeTree.gen.ts` commité et contrôlé (`git diff --exit-code` après build). | P0, P7 |
| R-29 | Pages : passer la source en « GitHub Actions » arrête le déploiement par branche de `main` ; l'environnement `github-pages` peut refuser le déploiement de `main` s'il n'est pas autorisé ; un déploiement depuis la branche d'intégration publierait le nouveau site trop tôt. | Aucun réglage Pages avant P8 ; job `deploy` limité à `main` ; en P8, environnement autorisé puis source changée **juste avant** la fusion, vérifications du § 7 aussitôt ; `main` gelé pour l'ancien site pendant la migration (correctif urgent : sur `main`, reporté dans `legacy/`). | P0, P8 |
| R-30 | La validation par les collègues (build local ou artefact CI pointé sur le vrai script) écrit dans la **vraie** feuille et envoie de vrais e-mails. | Le dire aux collègues ; utiliser des jours de test supprimés ensuite, ou des réservations réelles assumées. | P7 |
| R-31 | Code collègue ou formulaires chargés à la demande : bref écran d'attente à la première ouverture. | Préchargement au survol, au focus et pendant l'inactivité du navigateur ; `pendingComponent` discret. | P4, P5 |
| R-32 | **react-intl / FormatJS** : ids en double, apostrophes et accolades ICU, `<FormattedMessage>` dans un attribut, HTML dans un message, espaces normalisées (dont U+00A0) si `preserveWhitespace` manque, `translations/fr.json` pas à jour, « ⚠ » refusé par `no-emoji`. | `formatjs extract --throws` + `git diff --exit-code` en CI ; ids typés (`FormatjsIntl`) ; `intl.formatMessage` pour les attributs ; balises de `defaultRichTextElements` seulement ; `preserveWhitespace: true` partout ; tests de chaînes exactes ; icône SVG pour « ⚠ » (§ 3.10). | P0, P2 |

---

## 7. Checklist de bascule GitHub Pages

Reprise et complétée de `recherche/react-architecture.md` § 10. À cocher dans la PR de bascule.

**Avant (fin de P7)**
- [ ] Accord écrit des collègues après validation sur un build local ou l'artefact CI (S9) ; matrice de parité complète ; S1 à S8 verts.
- [ ] Job `deploy` du workflow prêt sur la branche (déclenché par `main` seulement) ; l'environnement `github-pages` autorise `main`.
- [ ] Variable de dépôt `VITE_APPS_SCRIPT_URL` = URL `/exec` du déploiement actuel (même déploiement, déploiement « Tout le monde ») ; bandeau D-05 absent du build validé par les collègues.
- [ ] Pas de `CNAME` (site de projet) : `BASE_PATH=/reservations-restaurants/` ; si un domaine arrive, `public/CNAME` et `BASE_PATH=/`.
- [ ] Tag `v1-final` posé sur `main` (dernier commit de l'ancien site) ; procédure de retour arrière écrite dans le README et répétée à blanc.
- [ ] Prévenir les collègues (date, « même usage, nouveau rendu », session collègue toujours perdue au rechargement).

**Bascule**
- [ ] Source Pages passée en « GitHub Actions » **immédiatement avant** la fusion (obligatoire : Jekyll et chunks `_*.js`, R-04).
- [ ] Fusion de la branche d'intégration dans `main` (commit de bascule compris : `legacy/` supprimé, job `deploy` actif) ; artefact = `dist/client` (`index.html` + `404.html` + `assets/`).
- [ ] Déploiement vert ; `https://thegaudis.github.io/reservations-restaurants/` sert le nouveau site après au plus 10 min de cache (`max-age=600`) ; `…/index.html` redirige vers `/` ; un lien profond (`…/collegue`) sert `404.html` puis l'appli.
- [ ] `localStorage` : une copie `reservations-cache-v1` écrite par l'ancien site est relue au premier affichage (affichage immédiat pour les visiteurs habituels) ; `reservations-textes` lue en secours seulement.
- [ ] Aucun service worker n'existait : rien à désinscrire ; n'en ajouter aucun (`mockServiceWorker.js` de msw absent de `dist/client`, vérifié).
- [ ] E2E de production en lecture seule vert (`e2e/smoke-production.spec.ts`).
- [ ] Vérification manuelle : une vraie réservation R1 et une commande R2 (puis suppression par un collègue), connexion collègue, impression.

**Après**
- [ ] README à jour (installation : `pnpm install`, `pnpm build`, workflow Pages ; section Apps Script inchangée ; retour arrière).
- [ ] `CLAUDE.md` à jour ; ce plan marqué « terminé » ; `docs/spec/` conservée comme référence.
- [ ] Un mois après : retirer la lecture de secours de `reservations-textes` et supprimer cette clé au démarrage (dans `queries/local-cache.ts`, pas dans un effet).
- [ ] Transmettre l'annexe B au responsable du script.

**Retour arrière (moins de 15 min, cache compris)** : repasser la source Pages en mode « branche » (« Deploy from a branch », racine) sur une branche `rollback` créée depuis le tag `v1-final` (Pages ne sert pas un tag directement), ou faire `git revert -m 1` de la fusion sur `main` puis repasser la source en mode « branche » sur `main` (le revert retire aussi le workflow, qui ne déploierait plus rien) ; l'ancien site est republié à la racine ; la copie locale reste compatible (même format) ; aucune action côté script.

---

## 8. Annexes

### Annexe A — Correspondance fichiers actuels → modules cibles

| Actuel | Fonctions principales (`00` § 4) | Modules cibles |
| --- | --- | --- |
| `index.html` (script du `<head>`) | `APPS_SCRIPT_URL`, `CACHE_KEY`, `CACHE_MAX_AGE`, `earlySince`, `stateUrl`, `earlyGet` | `config.ts` (`VITE_APPS_SCRIPT_URL`), `domain/constants.ts`, `api/early-fetch.ts`, `routes/__root.tsx` (`<ScriptOnce>`, `head()`, `preconnect`) |
| `index.html` (corps) | en-tête, colonnes, pied, `#toast`, `#loader`, squelettes | `features/page/*`, `ui/feedback/*` ; le voile disparaît (§ 4.2) |
| `js/donnees.js` | `state`, `saveCache` / `loadCache`, `renderTexts` / `saveTexts` | cache Query `['state', …]`, `queries/local-cache.ts`, `features/page/Header.tsx` |
| | `hedgedRead`, `apiGet`, `postJson`, `apiPost`, `fetchAdminState`, `adminSessionExpired`, `writeSeq`, `adoptBookingState` | `api/transport.ts`, `api/hedged-read.ts`, `api/state.ts`, `api/actions.ts`, `queries/state.ts`, `queries/client.ts` (`onError`), `mutations/*` (`cancelQueries` + `setQueryData`) |
| | `withTicketFlags`, `plainName`, `withTicketMark`, `isTicket`, `flagTicket` | `api/schemas.ts` (traduction vers le modèle anglais, `voucher` déduit, transformation idempotente), `api/actions.ts` (`withVoucherMark` à l'envoi), `queries/local-cache.ts` (`Ticket` dans la copie v1), `domain/vouchers.ts` |
| | `remainingR1`, `remainingItem`, `itemsR2`, `idx`, `capacityClass`, `dayStatusR1/R2`, `sumBy` | `domain/capacity.ts` |
| | `r2Amounts`, `amountsText`, `itemAmountText`, `itemPriceText`, `ticketsText` | `domain/pricing.ts` (nombres) + `intl/amounts.ts` (textes) |
| | `dayHasTicket`, `serviceMode`, `r2OrdersClosed`, `r2ClosedMsg`, `R2_CUTOFF_HOUR` | `domain/vouchers.ts`, `domain/cutoff.ts`, `intl/common-messages.ts` (message de clôture) |
| | `loadAll`, `showLoadError`, `retryLoad`, `setBusy` / `clearBusy`, `showLoader` / `hideLoader` | `routes/*` (`loader`, `errorComponent`), `features/page/LoadErrorBox.tsx`, `ui/form/SubmitButton.tsx`, `ui/button/*` (`aria-busy`) |
| `js/outils.js` | `toISO`, `todayISO`, `addDaysISO`, `mondayOf`, `calState` | `domain/dates.ts`, `domain/paris.ts`, `background/clock.ts`, URL (`r1`, `r2`, `r1vue`…) |
| | `formatDate`, `formatEuro`, `plural`, `dash`, `gaugeStyle` | `intl/dates.ts`, format `euro`, pluriels ICU, messages (`intl/`), `domain/gauge.ts` |
| | `showToast` | `ui/feedback/toast.ts` |
| | `confirmClick`, `disarm` | `ui/button/ConfirmButton.tsx` |
| | `checkFields`, `fieldError`, `blockError`, `markInvalid`, `linkLabels`, `focusFirstError`, `emailError`, `contactFieldHtml` | `ui/form/*` (Base UI `Field` + TanStack Form), `domain/validation.ts` |
| `js/calendrier.js` | `buildWeekCells`, `buildMonthCells`, `weekLabel`, `monthLabel`, `keyTargetIso`, `calKey` | `domain/dates.ts`, `intl/dates.ts`, `ui/calendar/CalendarGrid.tsx` |
| | `navCal`, `setCalMode`, `jumpToday`, `selectDate`, `pickDate`, `calTransition` | `domain/navigation.ts`, `features/calendar/RestaurantCalendar.tsx`, option `viewTransition` du routeur |
| | `renderDetailR1`, `renderDetailR2`, `emptyDayCardHtml`, `menuBlockHtml`, `menuListHtml`, `bookingLine` | `features/r1/DayCardR1.tsx`, `features/r2/DayCardR2.tsx`, `features/r2/DishRow.tsx`, `features/staff/BookingRow.tsx` |
| `js/reservation.js` | `openBookingR1`, `openBookingR2Day`, `closeBooking`, `bookingFormHtml`, `bookingFormMultiHtml`, `countsFieldsetR1Html`, `updateR1PriceLive`, `updateR2PriceLive`, `setServiceMode`, `setMultiQty` | `features/r1/BookingFormR1.tsx`, `features/r1/SeatCountersR1.tsx`, `features/r2/OrderFormR2.tsx` (totaux par `form.Subscribe`) |
| | `submitBookingR1`, `submitBookingR2Multi`, `handleDuplicate`, `emailWarning`, `newRequestId`, `orderAmounts`, `priceR1` | `mutations/bookings.ts`, `domain/bookings.ts`, `domain/pricing.ts`, `api/request-id.ts` |
| | `editBookingFormR1Html`, `editBookingFormR2Html`, `readEditIdentity`, `editIdentityRules` | `features/staff/EditBookingFormR1/R2.tsx`, `features/booking/IdentityFields.tsx` |
| `js/collegue.js` | `renderModeBox`, `chooseMode`, `tryLogin`, `togglePwdVisibility`, `logoutAdmin`, `armInactivityTimer` | `features/page/ModeSwitch.tsx`, `mutations/staff.ts` (`useLogin`), `session/session.ts`, `background/inactivity.ts`, `queries/purge.ts` |
| | `renderDashboard`, `renderSettings`, `saveSettings` | `features/staff/TomorrowPanel.tsx`, `features/staff/SettingsPanel.tsx` |
| | `dateFieldHtml`, `datePickerHtml`, `dpKey`, `renderAdminFormR1/R2`, `addDayR1/R2`, `draftItems`, `syncTicketPrice` | `features/staff/OpenDatePicker.tsx` (`ui/calendar/DatePickerPopover.tsx`), `features/staff/OpenDayFormR1/R2.tsx` (tableau de TanStack Form) |
| | `openEditDayR1`, `submitEditDayR1`, `adminDelete`, `deleteDay…`, `deleteBooking…`, `deleteItemR2`, `itemFormHtml`, `submitAddItemR2`, `submitEditItemR2`, `openAddBooking`, `submitAddBookingR1/R2`, `afterAddBooking`, `editMaxR1` | `features/staff/*`, `mutations/staff.ts`, `mutations/bookings.ts` |
| `js/impression.js` | `printDoc`, `printTable`, `printTotal`, `openPrint`, `PRINT_TOKENS`, `PRINT_CSS`, `printDayR1/R2`, `printTomorrowSummaryR1/R2`, `showTomorrowSummary`, `getTomorrowISO` | `ui/print/*`, `styles/print.css`, `features/print/*`, `domain/print.ts`, `features/staff/TomorrowPanel.tsx` ; `PRINT_TOKENS` supprimé |
| `js/interface.js` | `confirmationHtml`, `closeConfirmation`, `ICONS`, `segGroup`, `renderPriceSuggestions`, `enterOnce`, `leaveThen`, `cardEnter`, `popSeg` | `features/booking/BookingSummary.tsx`, `ui/icons.tsx`, `ui/toggle/ViewToggle.tsx`, `features/staff/PriceSuggestions.tsx` ; animations par CSS (`data-starting-style`, `key`) |
| `js/main.js` | `render`, `renderAll`, `captureUi`, `restoreUi`, `PARTS`, `resetFields`, `autoRefresh`, `scheduleR2Cutoff`, easter egg | supprimés (React) ; `<AutoRefresh/>` ; `background/clock.ts` ; easter egg conservé dans `features/page/Header.tsx` (D-01) ; démarrage dans `router.tsx` |
| `design-system.css` | jetons, thèmes, composants | `styles/tokens.css`, `styles/base.css`, CSS Modules de `ui/` |
| `app.css` | mise en page, calendrier, fiches, formulaires | CSS Modules de `features/` et `ui/calendar/` |
| `Code.gs` | backend | **inchangé** |

### Annexe B — À signaler au responsable de `Code.gs`

Aucune de ces évolutions n'est nécessaire à la migration : le nouveau frontend contourne chaque limite côté client. Elles renforceraient la sécurité ou la cohérence.

| # | Constat | Contournement côté client | Évolution suggérée du script |
| --- | --- | --- | --- |
| b-1 | Réservations publiques sans authentification ; seuls quantités et places sont contrôlées (ni cut-off, ni jour passé, ni mode « sur place », ni appartenance des plats à la date, ni nom, classe ou e-mail). | Tous les contrôles dans les formulaires. | Revérifier sous verrou le cut-off de 10 h et le jour passé (fuseau du script), le mode « sur place » les jours de ticket, l'appartenance des plats à la date, la présence du nom, de la classe et d'un e-mail valide. |
| b-2 | Aucune heure serveur exposée. | Heure de Paris côté client (D-12). | Renvoyer `serverTime` (ou la date du jour) dans l'état public. |
| b-3 | Supprimer un plat laisse ses réservations orphelines, sans e-mail ; supprimer un jour n'avertit personne. | Note détaillée avant suppression, orphelines filtrées (D-21). | Supprimer ou archiver les réservations du plat ; envoyer les e-mails d'annulation lors des suppressions de jour et de plat. |
| b-4 | Restants négatifs possibles (`addDayR1` écrase la capacité ; `addItemR2` / `editItemR2` ne contrôlent pas le stock). | Contrôles avant envoi (D-19). | Refuser une capacité ou un stock inférieur au déjà réservé, comme `editDayR1`. |
| b-5 | Ticket codé dans le nom du plat ; les e-mails comptent un plat au ticket comme « sans prix » et ignorent « un ticket par commande ». | Codage conservé à l'identique. | Colonne `Ticket` dans `R2_Items` ; totaux des e-mails alignés sur la règle « un ticket par commande ». |
| b-6 | Aucune limitation des essais de mot de passe. | Aucun (D-25 non retenue : signalement seulement). | Compteur d'échecs dans `CacheService` et attente croissante côté script. |
| b-7 | État complet renvoyé à chaque lecture collègue (sans etag) ; ajout manuel = deux allers-retours. | Accepté (actualisation toutes les 3 min seulement). | Etag pour `getAdminState` ; état complet renvoyé par `addBookingR1` / `addBookingR2Multi` quand un mot de passe valide est fourni. |
| b-8 | Prix `0` enregistré comme « sans prix » (`price \|\| ''`). | Prix 0 refusé (D-22). | Distinguer `0` et vide. |
| b-9 | Regex e-mail plus permissive que celle du client ; `Timestamp` tronqué à la date ; noms par défaut `Restaurant 1/2` différents de ceux du client. | Défauts client alignés sur la configuration réelle. | Même regex ; heure de réservation transmise ; défauts serveur `Restaurant Pédagogique` / `Aristide`. |
| b-10 | `editBookingR1` ignore `qte` / `prixTotal` ; `setConfigField` sans liste blanche ; `editDayR1` sur une date absente réussit sans effet ; repli `checkPassword` (ancien script). | Champs ignorés non envoyés ; repli `checkPassword` non repris. | Liste blanche des clés ; erreur « Ce jour n'existe plus. » dans `editDayR1` ; retirer `checkPassword` et `addBookingR2` (obsolète). |
| b-11 | Rappels envoyés par ligne (une commande de 3 plats = 3 e-mails) ; modification manuelle dans Sheets visible vers 6 h si faite le soir. | — | Regrouper les rappels par contact et par jour ; documenter `viderCache()` pour les gestionnaires. |
| b-12 | Pas de « Modifier ce jour » pour R2, mais `addDayR2` avec `items: []` met à jour note, thème et « ouvert par ». | Aucun (D-09 non retenue : signalement seulement). | Action `editDayR2` explicite. |
| — | Les dates des e-mails ont « 1er », désormais aussi à l'écran (arbitrage 11). | — | Aucune (cohérent). |

### Annexe C — Ébauche du `CLAUDE.md` du futur projet

````markdown
# Réservations — restaurants pédagogiques (frontend React)

Site de réservation des deux restaurants pédagogiques du lycée Aristide Briand. Frontend React 19 + TanStack
Start (mode SPA) publié sur GitHub Pages ; backend Google Apps Script (`Code.gs`) et Google Sheets.

## Références
- Comportements et textes : `docs/spec/` (fait foi). Renvois « 04 § 5.2 ». Points a-*/b-*/c-* : `docs/spec/README.md` § 3.
- Architecture et décisions : `docs/migration/PLAN.md` (§ 3 architecture, § 4 décisions produit, § 6 pièges).
- Justifications techniques : `docs/migration/recherche/`.

## Commandes
- `pnpm dev` : serveur de développement. **Ne pas utiliser `pnpm preview`** (SSR, ne reflète pas Pages) :
  `pnpm build && node scripts/serve-pages.mjs`.
- `pnpm check` : i18n:extract, format:check, lint (oxlint type-aware), typecheck (`tsc`), tests, knip. Obligatoire avant commit.
- `pnpm test` (Vitest : projets `node` et `browser`, stories comprises) / `pnpm test:e2e` (Playwright, projets `legacy` et `react`) / `pnpm storybook`.
  Sessions cloud : Chromium préinstallé (`PLAYWRIGHT_BROWSERS_PATH`), ne jamais lancer `playwright install`.
- `pnpm lint:fix` = `oxlint --fix && oxfmt`.

## Règles absolues
- Ne jamais modifier `Code.gs`. Le contrat d'API est `docs/spec/02-contrat-api.md`.
- Un comportement de l'ancien site ne change que s'il est listé dans `docs/migration/PLAN.md` § 4.2 et que le scénario
  `@changed` correspondant existe dans `e2e/regression/` ; toute autre divergence fait échouer la suite de régression.
- Aucune donnée personnelle dans le navigateur hors session collègue : mot de passe et état complet en mémoire
  seulement ; jamais dans l'URL, `localStorage`, `sessionStorage`, une clé de requête ou un log.
- Copie locale : clé `reservations-cache-v1`, format de `03` § 1.1 (champs tels quels, convertis dans `queries/local-cache.ts`),
  écrite seulement depuis l'état public avec etag.
- Écritures jamais doublées, rejouées ni interrompues ; `requestId` créé au montage du formulaire.
- POST en `Content-Type: text/plain;charset=utf-8`, aucun autre en-tête (pas de pré-vol CORS).
- Heure de référence : Europe/Paris (`domain/paris.ts`) ; jours métier = chaînes ISO ; jamais `new Date()` au rendu.

## Où vit l'état
- URL (search params validés par valibot + `v.fallback`) : ce que l'on voit (jours, vues, formulaire ouvert, panneaux).
- TanStack Query : ce que dit le script (`['state','public']`, `['state','staff', id]`).
- Zustand (`session/`, `background/clock.ts`) : session collègue et heure ; lire avec un sélecteur.
- TanStack Form : les saisies (aucun `useState` pour une valeur de formulaire).
- `useState` local : l'éphémère seulement (récapitulatif, bouton armé).
- Le reste se calcule au rendu (fonctions pures de `domain/`).

## React
- Pas de `useEffect` sans système extérieur à synchroniser (0 à 2 dans toute l'appli, chacun commenté).
- Pas de `useMemo` / `useCallback` / `memo` par réflexe (React Compiler). Pas de `forwardRef`.
- Timers et écouteurs globaux dans `background/`, au niveau module, jamais dans un composant.
- Navigation par `<Link>` ; `navigate` seulement dans un gestionnaire (clavier, `onSuccess` passé à `mutate`).
- Composants de route < 40 lignes ; un composant > 150 lignes se découpe.
- Mutations : mise à jour du cache dans `useMutation({ onSuccess })` (`cancelQueries` puis `setQueryData`),
  toast et fermeture dans `mutate(…, { onSuccess })`.

## Textes et formats (react-intl, fr-FR seul)
- Aucun texte en dur dans le JSX ni dans un attribut : `<FormattedMessage>` / `intl.formatMessage` avec un id explicite
  en anglais, par domaine (`public.r1.form.name.label`, `staff.settings.save`, `common.action.cancel`, `ui.confirm`), un `defaultMessage` recopié **mot pour mot** de `docs/spec/`
  et une `description` qui cite la section (« 04 § 9 — … »).
- Pluriels et ordinaux en ICU (`{n, plural, one {# couvert} other {# couverts}}`, « 1er » par `selectordinal`).
- Montants : format `euro` ; dates : `intl/dates.ts`. Jamais d'espace codée en dur autour d'un montant formaté.
- Espace insécable écrite `\u00A0` dans les littéraux ; `preserveWhitespace` activé.
- Attributs (`aria-label`, `title`, `placeholder`) : `intl.formatMessage`. Hors composants : l'instance `intl` de `intl/intl.ts`.
- Après avoir ajouté ou modifié un message : `pnpm i18n:extract` et commiter `translations/fr.json`.
- Messages du script (`{ error }`) affichés tels quels.

## Conventions de code
- Code en anglais uniquement : identifiants, noms de fichiers et de dossiers, ids react-intl et placeholders, clés de
  requête, commentaires. Vocabulaire métier : glossaire de `docs/migration/PLAN.md` annexe E (couvert → `seat`,
  plat → `dish`, réservation → `booking`, commande R2 → `order`, ticket restaurant → `voucher`, collègue → `staff`…).
- Textes affichés en français (`defaultMessage` recopiés de la spec) ; documentation (`docs/`, `README.md`, ce fichier)
  en français.
- Exceptions visibles dans l'URL : chemin `/collegue` (donc `routes/collegue.tsx`) et search params (`r1`, `r1vue`,
  `reserver`, `connexion`, `editResa`…), noms et valeurs, restent en français.
- Champs du script (`Date`, `Capacite`, `Qte`, `Nom`, `ItemID`, `nbEleve`…) et de la copie locale : seulement dans
  `api/schemas.ts` (réception, traduite par `v.transform`), `api/actions.ts` (corps des requêtes) et
  `queries/local-cache.ts` ; partout ailleurs, le modèle anglais de `domain/types.ts` (PLAN § 3.3.6).
- Exports nommés ; pas de barrels ; alias `@/` ; co-location `X.tsx` / `X.module.css` / `X.test.tsx`.
- `domain/` et `api/` sans React ; `ui/` sans métier ; Base UI importé seulement dans `ui/`.
- Styles : CSS Modules + jetons (`var(--…)`) ; variantes en `data-*` ; aucune couleur, taille ou rayon en dur.
- Tests avec le code : tables de cas tirées de la spec (projet Vitest `node`) ; composants et routes en Vitest Browser
  Mode (`vitest-browser-react`, `page.getByRole`) ; une story Storybook par composant et par état, qui est aussi un test
  avec axe ; un seul faux script msw (`src/mocks/apps-script.ts`) pour les tests, Storybook et l'E2E ; un `QueryClient`
  neuf par test.
- E2E : suite de régression `e2e/regression/` (projets `legacy` et `react`, page objects sémantiques de `e2e/pages/`,
  étiquettes `@parity` / `@changed`) ; autres E2E réservés au nouveau code (hydratation, impression PDF, smoke).
- Commentaires : les contraintes et leur source (« 04 § 5.3 »), jamais l'historique.
````

### Annexe D — Rapports de recherche

Voir [`recherche/README.md`](recherche/README.md) (une ligne par rapport, ce qui a été testé ou non). Ordre de lecture conseillé selon la phase :

| Phase | À lire |
| --- | --- |
| P0 | `toolchain.md` (§ 2-6, pièges), `toolchain-files/`, `tanstack-start.md` (§ 2-3, pièges), `element-admin-reference.md` (§ 1, § 11.7) |
| P1 | `element-admin-reference.md` (§ 8), `react-architecture.md` (§ 8), `tanstack-query.md` (§ 9) ; surtout `docs/spec/09`, `04`, `06`, `07` |
| P2 | `tanstack-query.md` (§ 3-8, § 10-13), `react-architecture.md` (§ 3, § 5, § 7), `appresaaristide-reference.md` (§ 2.1, § 6) |
| P3 | `ui-forms.md` (§ 1-7, § 9-11), `appresaaristide-reference.md` (§ 2.2-2.4), `react-architecture.md` (§ 8, Vitest Browser Mode) |
| P4 | `tanstack-start.md` (§ 4), `react-architecture.md` (§ 2), `ui-forms.md` (§ 5) |
| P5 | `react-architecture.md` (§ 3), `element-admin-reference.md` (§ 2, § 11.4-11.5), `tanstack-query.md` (§ 8) |
| P6 | `ui-forms.md` (§ 8), `react-architecture.md` (§ 2 (i)) — en gardant l'arbitrage « même document » |
| P7 | `element-admin-reference.md` (§ 8), `react-architecture.md` (§ 8) |
| P8 | `react-architecture.md` (§ 10), § 7 de ce plan |

Les rapports reflètent l'état du 3 octobre 2026 ; leurs propositions contraires aux arbitrages sont listées au § 6.1.

### Annexe E — Glossaire du code

Vocabulaire imposé pour le code (arbitrage 12) : un terme métier de la spec se traduit toujours par le même identifiant anglais. Un nouveau terme est ajouté ici avant d'être utilisé. Les textes affichés gardent le terme français de la spec.

**Domaine**

| Terme de la spec | Identifiant anglais | Définition |
| --- | --- | --- |
| R1, restaurant pédagogique (service à table) | `r1`, suffixe `R1` (`DayCardR1`) | restaurant réservé par nombre de couverts |
| R2, Aristide (plats) | `r2`, suffixe `R2` (`OrderFormR2`) | restaurant où l'on commande des plats, chacun avec son stock |
| restaurant | `Restaurant` (`'r1' \| 'r2'`) | |
| jour de service, jour ouvert | service day (`ServiceDayR1`, `ServiceDayR2`) | date ouverte par un collègue dans un restaurant |
| couvert | seat (`seats`) | une personne à table en R1 |
| capacité | `capacity` | nombre de couverts d'un jour R1 |
| élèves, personnels, extérieurs | `students`, `staffMembers`, `externals` | compteurs d'une réservation R1 (`nbEleve`, `nbProf`, `nbExt` pour le script) |
| tarif élève / professeur / extérieur | `priceStudent`, `priceStaff`, `priceExternal` | paramètres `priceEleve`, `priceProf`, `priceExterieur` |
| plat | dish (`Dish`) | ligne de `R2_Items` |
| portion | portion (`portions`) | quantité d'un plat dans une commande |
| stock | `stock` | portions offertes pour un plat |
| réservation | booking (`BookingR1`, `BookingR2`) | ligne de réservation (R2 : une ligne par plat) |
| commande R2 multi-plats | order (`Order`, `useOrderR2`) | ensemble des lignes R2 d'une même personne pour un jour |
| ticket restaurant | meal voucher (`voucher`) | plat payé par un ticket ; un ticket au plus par commande |
| mention « (ticket restaurant) » | voucher mark (`VOUCHER_MARK`, `withVoucherMark`, `hasVoucherMark`) | suffixe du nom dans la feuille et sur le fil |
| sur place / à emporter | `serviceMode` : `'dineIn'` / `'takeaway'` | `'surplace'` / `'emporter'` pour le script |
| clôture de 10 h, cut-off | cutoff (`isR2OrderingClosed`, `domain/cutoff.ts`) | fin des commandes R2 en ligne le jour même |
| jour passé | `isPast` | date antérieure à aujourd'hui (heure de Paris) |
| places restantes, portions restantes | remaining (`remainingSeats`, `remainingStock`) | capacité ou stock moins le déjà réservé |
| déjà réservé (agrégats publics) | `r1Booked` (`SeatTotal`), `r2Booked` (`PortionTotal`) | sommes anonymes par date ou par plat |
| places disponibles / bientôt complet / complet | `available` / `almostFull` / `full` | états de la jauge (`capacityClass`) |
| épuisé | `soldOut` | plat dont le stock restant est nul |
| jauge, pastille | gauge (`domain/gauge.ts`), `CapacityPill` | |
| prix, montant, total | `price`, `amount`, `total` | `Prix`, `PrixTotal` pour le script |
| classe ou service | `className` | `Classe` |
| nom et prénom | `name` | `Nom` |
| contact | `contact` | e-mail (ou téléphone pour les anciennes réservations) |
| observation | `observation` | |
| ouvert par | `openedBy` | `OuvertPar`, état complet seulement |
| note, thème, menu | `note`, `theme`, `menu` | |
| paramètres | settings (`Settings`, `SettingsPanel`) | onglet `Config` |
| contact d'annulation | `cancellationContact` | `contactAnnulation` |

**Interface et comportement**

| Terme de la spec | Identifiant anglais | Définition |
| --- | --- | --- |
| fiche du jour | day card (`DayCardR1`, `DayCardR2`) | bloc sous le calendrier pour le jour sélectionné |
| formulaire de réservation | booking form (`BookingFormR1`, `OrderFormR2`) | |
| récapitulatif | booking summary (`BookingSummary`) | confirmation affichée après une réservation |
| compteurs | seat counters (`SeatCountersR1`) | |
| ligne de plat | dish row (`DishRow`) | |
| champs d'identité | identity fields (`IdentityFields`) | nom, classe, contact, observation |
| mode collègue, collègue | staff (`StaffPage`, `features/staff/`, `useLogin`) | espace protégé par mot de passe (chemin d'URL `/collegue` conservé) |
| sélecteur Client / Collègue | mode switch (`ModeSwitch`) | |
| session collègue | staff session (`useSessionStore`, `purgeStaffSession`) | |
| déconnexion | logout (`SessionEnd` : `'logout'`, `afterLogout`) | |
| inactivité | inactivity (`background/inactivity.ts`, `'inactivity'`) | |
| mot de passe changé | `'password-changed'`, `PasswordRejectedError` | |
| ouvrir un jour | open day (`OpenDayFormR1`, `OpenDatePicker`) | |
| modifier ce jour | edit day (`EditDayFormR1`) | |
| ajouter une personne | add booking (`AddBookingFormR1`) | |
| suggestions de prix | price suggestions (`PriceSuggestions`) | |
| panneau | panel (`TomorrowPanel`, `SettingsPanel`) | |
| résumé du lendemain, panneau « Demain » | tomorrow summary (`TomorrowPanel`, `TomorrowDocumentR1`) | |
| impression, liste imprimée | print (`features/print/`, `printDocument`, `ListDocumentR1`) | |
| en-tête, pied de page, colonne | `Header`, `Footer`, `Column` | |
| bandeau de configuration | config banner (`ConfigBanner`) | |
| encadré d'échec | load error box (`LoadErrorBox`) | |
| squelette | skeleton (`Skeleton` dans `ui/`, `PageSkeleton` pour la page) | |
| calendrier, vue semaine / mois | calendar (`RestaurantCalendar`) ; vue = valeur d'URL `semaine` / `mois`, lue telle quelle | exception d'URL (§ 3.1) |
| choisir un jour, période, aujourd'hui | `selectDay`, `shiftPeriod`, `goToToday` | |
| horloge, aujourd'hui | clock (`useClock`, `useToday`) | |

**Données et chargement**

| Terme de la spec | Identifiant anglais | Définition |
| --- | --- | --- |
| état public / état complet | public state / full state (`PublicState`, `FullState`) | |
| copie locale | local cache (`queries/local-cache.ts`, `LocalCacheV1`) | `reservations-cache-v1` |
| textes de secours | fallback texts (`readFallbackTexts`) | `reservations-textes` |
| lecture anticipée | early fetch (`api/early-fetch.ts`, `takeEarlyFetch`) | lecture lancée par le script inline du `<head>` |
| lecture doublée | hedged read (`hedgedRead`) | seconde lecture à 6 s |
| actualisation automatique | auto refresh (`AutoRefresh`) | |
| erreur métier / service muet | `BusinessError` / `ServiceError` | |
| identifiant de requête | `requestId` (`newRequestId`) | |
| doublon | `duplicate` | `_duplicate` pour le script |
| écriture | write (clé `['write', domain, action]`) | |
| tâches de fond | background tasks (`startBackgroundTasks`) | |
