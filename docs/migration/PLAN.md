# Plan de migration du frontend vers React

*Rédigé le 3 octobre 2026. Feuille de route des sessions d'implémentation (humaines ou agents). Branche d'intégration : `claude/frontend-react-migration-lw5zfz`.*

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
4. **Comment.** Réécriture complète sur la branche d'intégration. Pendant la préproduction, le site actuel (déplacé dans `legacy/`) reste publié à la racine et le nouveau site est publié sous `/reservations-restaurants/v2/`. Bascule en une fois, avec un tag `v1-final` pour revenir en arrière.
5. **État.** L'URL porte l'état d'affichage (jours, vues, formulaire ouvert, panneaux collègue) ; TanStack Query porte les données du script ; un store Zustand en mémoire porte la session collègue ; TanStack Form porte les saisies. Objectif : 0 à 2 `useEffect` dans toute l'appli.
6. **Performance perçue conservée.** Lecture anticipée dans la coquille HTML, premier rendu synchrone depuis la copie locale `reservations-cache-v1` (même clé, même format), etag, lecture doublée à 6 s, un seul nouvel essai à 1,5 s.
7. **Textes et formats.** Tous les textes passent par react-intl (FormatJS) en français seul : pluriels ICU, montants et dates `Intl`, extraction `translations/fr.json` vérifiée en CI.
8. **Qualité.** TypeScript 7 strict, oxlint type-aware pédantique, oxfmt, knip, Vitest + msw, Playwright + axe en CI ; parité prouvée par des tables de cas tirées de la spec et des parcours E2E contre un Apps Script simulé.
9. **Effort.** Environ **29 j-p** (35 avec 20 % de marge), soit **23 sessions d'agent** réparties en 8 phases (P0 à P7), plus 1 à 2 semaines calendaires de test par les collègues.
10. **Risques principaux.** (1) Hydratation de la coquille Start alors que le premier rendu sort de la copie locale : décision « Start ou Router seul » à la fin de P0. (2) Budget JS initial (200 kB gzip) serré : formulaires publics et mode collègue chargés à la demande. (3) Outils récents ou expérimentaux (React Compiler en Rust, jsPlugins d'oxlint, oxfmt 0.x) : un plan B pour chacun. (4) Lenteur et pages d'erreur d'Apps Script. (5) Bascule Pages : source « GitHub Actions », Jekyll, cache de 10 min, `localStorage` partagé entre l'ancien et le nouveau site.
11. **À valider par vous.** 27 décisions produit (§ 4.1), chacune avec une valeur par défaut que le plan applique sauf avis contraire, et la liste des écarts de parité assumés (§ 4.2).

---

## 1. Objectifs, périmètre, non-objectifs

### 1.1 Objectifs

- Reproduire **fonctionnellement à l'identique** l'appli décrite par `docs/spec/` (écrans de `09`, textes exacts, règles de `01`, contrat de `02`, chargement de `03`), avec un code testable et maintenable.
- Corriger les 26 points a-* côté client (traçabilité au § 4.3) et contourner côté client les limites b-* du script (annexe B).
- Mettre l'état d'affichage dans l'URL (liens partageables, bouton Retour, rechargement), selon le schéma de `09` § 1.
- Doter le dépôt d'un outillage complet : formatage, lint typé, vérification de types, tests unitaires, d'intégration et E2E, analyse d'accessibilité, budget JS, CI et déploiement automatique.

### 1.2 Périmètre

- Tout le frontend : page publique, mode collègue, impressions, chargement et cache local.
- Le déploiement GitHub Pages (passage en source « GitHub Actions »).
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
| S1 | Parité fonctionnelle | Chaque écran et état de `09` (G-01 à G-08, P-01 à P-17, L-01, C-01 à C-30, I-01 à I-04) couvert par au moins un test d'intégration ou E2E ; matrice de parité remplie (P6) | 100 % des lignes de `09`, écarts listés au § 4.2 seulement | P6 |
| S2 | Textes exacts | Tests qui comparent les chaînes rendues (via l'instance `intl`) à celles de `04` § 9, `06`, `07`, `00` § 2.3 et `03` § 3.1, espaces insécables comprises ; `translations/fr.json` relu contre la spec | 0 écart non listé | P3 à P5 |
| S3 | Budget JS initial (visiteur public, `/`) | `scripts/check-budget.mjs` : somme gzip du point d'entrée, du chunk de la route `/` et de leurs imports statiques (manifeste Vite) | ≤ 200 kB gzip ; CSS ≤ 25 kB gzip | CI dès P0 |
| S4 | Premier rendu depuis la copie locale | E2E : `localStorage` prérempli, réponse du script retenue 5 s → calendriers et fiches visibles avant la réponse, sans squelette | aucun squelette visible, aucune erreur console | P3, P6 |
| S5 | Accessibilité | `@axe-core/playwright` sur chaque état listé en P6 | 0 violation (aucune liste d'exceptions) | P6 |
| S6 | Effets | `grep -rE "use(Layout)?Effect\(" src --include=*.tsx --include=*.ts` en CI | 0 à 2 occurrences, chacune commentée | CI dès P3 |
| S7 | Qualité | `pnpm check` (format, lint, `tsc`, tests, knip) et build | vert sur chaque commit de la branche | CI |
| S8 | Données personnelles | Tests : après déconnexion, aucune entrée `['etat','collegue']`, cache des mutations vide, aucun nom dans le DOM ; mot de passe absent de `localStorage`, `sessionStorage`, de l'URL et des clés de requête | 0 fuite | P4 |
| S9 | Validation humaine | Préproduction `/v2/` utilisée par les collègues sur le vrai script | accord écrit du responsable | P6 |

---

## 2. Stack arrêtée

Versions relevées le 3 octobre 2026 dans les rapports (colonne « Source ») ; les revérifier au début de P0 et les épingler exactement (`save-exact`).

| Paquet | Version | Rôle | Source |
| --- | --- | --- | --- |
| `pnpm` | 12.8.1 (`packageManager`) | Gestionnaire de paquets ; `pnpm-workspace.yaml` avec `trustPolicy: no-downgrade`, `strictDepBuilds`, `allowBuilds: { msw: false }`, `peerDependencyRules` (vite 8, typescript 7) | toolchain § 6, element-admin § 1.7 |
| Node | 22 LTS ≥ 22.22.2 (`.node-version`) | jsdom 30 exige ≥ 22.22.2 ; msw 3 exige ≥ 22.12 | toolchain § 6 |
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
| `vitest` | 5.0.3 | Tests unitaires et d'intégration | toolchain § 6 |
| `@testing-library/react`, `/user-event`, `/dom` | 16.3.3, 14.6.7, 10.4.2 | Tests de composants | tanstack-start § 6 |
| `jsdom` | 30.1.1 | Environnement de test | toolchain § 1 |
| `msw` | 3.0.2 | Simulation d'Apps Script en intégration (ESM, `onUnhandledFrame`) | tanstack-query § 9 |
| `@playwright/test` | 1.63.0 | E2E sur le build servi en statique | react-architecture § 0 |
| `@msw/playwright` | 0.7.0 (compatibilité msw 3 à vérifier en P0) | Simulation réseau E2E dans le contexte navigateur | element-admin § 8 |
| `@axe-core/playwright` | à relever en P0 | Accessibilité E2E | element-admin § 8 |
| `@tanstack/react-query-devtools`, `@tanstack/react-router-devtools` | 5.104.1, 1.167.2 | Développement seulement (retirés du build) | tanstack-start § 6 |
| `@fontsource-variable/outfit`, `@fontsource-variable/work-sans` | 5.3.0 | Polices auto-hébergées, **si D-23 est retenue** | react-architecture § 9 |
| `stylelint` + `stylelint-config-standard` + `stylelint-declaration-strict-value` | à relever | Optionnel : interdire couleurs, tailles et rayons en dur | element-admin § 1.7 |

Exclus volontairement : Tailwind, ESLint, Prettier, zod, date-fns, Temporal et son polyfill, react-aria, `PersistQueryClientProvider` et les persisteurs Query, `react-to-print`, bibliothèque d'icônes, `@tanstack/router-plugin` (Start l'embarque).

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

```
reservations-restaurants/
├── .github/
│   ├── workflows/ci.yml        format → lint → tsc → tests → knip → build → E2E → assemblage → Pages (actions épinglées par SHA)
│   └── dependabot.yml          mises à jour groupées (tanstack, vite, react, types) avec délai de 7 jours
├── .editorconfig .gitignore .node-version .npmrc     repris de recherche/toolchain-files ; .gitignore OBLIGATOIRE (node_modules, dist, .output, coverage, .tanstack, playwright-report, test-results)
├── .oxlintrc.json .oxfmtrc.json                      repris de recherche/toolchain-files, alias @/ (§ 5, P0)
├── .vscode/                    extensions et réglages recommandés (oxc, TypeScript 7)
├── lefthook.yml                pre-commit : oxlint --fix puis oxfmt sur les fichiers indexés ; pre-push : pnpm check
├── package.json                scripts (dev, build, typecheck, lint, format, test, test:e2e, knip, i18n:extract, check), knip, packageManager
├── pnpm-workspace.yaml         politique de sécurité de la chaîne d'approvisionnement
├── tsconfig.json               strict TS 7 (types: ["vite/client"], noUncheckedIndexedAccess, exactOptionalPropertyTypes…)
├── vite.config.ts              Start SPA, base via BASE_PATH, React Compiler, FormatJS (§ 3.11)
├── vitest.config.ts            jsdom, sans le plugin Start, alias @/
├── playwright.config.ts        Chromium, fr-FR, Europe/Paris, serveur statique scripts/serve-pages.mjs
├── CLAUDE.md                   règles du projet pour les agents (ébauche : annexe C)
├── README.md                   présentation, installation Apps Script (inchangée), développement, déploiement
├── Code.gs                     backend, INCHANGÉ
├── charte-graphique.pdf logo.png                     inchangés (logo.png sert au README)
├── docs/spec/                  spécification de l'appli actuelle (référence fonctionnelle)
├── docs/migration/             ce plan, les rapports de recherche, la matrice de parité (P6)
├── translations/fr.json        messages extraits par `formatjs extract` (id → defaultMessage + description) ; versionné, contrôlé en CI, non chargé à l'exécution
├── legacy/                     PRÉPRODUCTION SEULEMENT : index.html, app.css, design-system.css, js/ (git mv, inchangés) ; supprimé en P7
├── public/                     fichiers copiés tels quels (logo de l'en-tête si non inliné, CNAME éventuel)
├── scripts/
│   ├── post-build.mjs          copie dist/client/index.html en 404.html
│   ├── assembler-pages.mjs     préproduction : legacy/ à la racine de l'artefact + dist/client dans v2/ + 404.html de v2 à la racine
│   ├── serve-pages.mjs         émulateur GitHub Pages (base, dossier → index.html, sinon 404.html avec statut 404) pour l'E2E et la prévisualisation
│   └── check-budget.mjs        budget JS/CSS initial à partir du manifeste Vite (échec au-delà du seuil)
├── e2e/
│   ├── fixtures/               états JSON (public, complet, réponses d'écriture) dérivés des exemples de 02
│   ├── mocks/apps-script.ts    faux script à état mutable : GET ?since, toutes les actions POST de 02 § 4, erreurs, lenteurs, pages HTML
│   ├── mocks/test.ts           fixture réseau @msw/playwright (mode strict) + horloge
│   └── *.spec.ts               public, collegue, impression, chargement, a11y, smoke-production
└── src/
    ├── router.tsx              getRouter() : QueryClient, restauration de la copie locale, routeur, abonnement de session, tâches de fond
    ├── routeTree.gen.ts        GÉNÉRÉ par le plugin Start, commité, ignoré par oxlint et oxfmt
    ├── config.ts               APPS_SCRIPT_URL (import.meta.env.VITE_APPS_SCRIPT_URL) et configurationManquante()
    ├── routes/
    │   ├── __root.tsx          shellComponent (html, head, ScriptOnce de lecture anticipée, body), head(), contexte typé ; AUCUN loader ni beforeLoad
    │   ├── index.tsx           page publique : validateSearch, loader (état public), composant < 40 lignes
    │   ├── collegue.tsx        mode collègue : validateSearch, beforeLoad (garde), loader (état complet), composant < 40 lignes
    │   ├── index[.]html.tsx    redirection des anciens favoris …/index.html vers /
    │   └── $.tsx               attrape-tout « Page introuvable » (limite aussi l'issue #8473)
    ├── domaine/                PUR : ni React, ni DOM, ni fetch ; testé par tables de cas
    │   ├── constantes.ts       valeurs de 00 § 2.1 (14 j, 6 s, 1,5 s, 3 min, 10 h, 12 h, 4 s, 10 min, seuils)
    │   ├── types.ts            IsoDate, Restaurant ('r1' | 'r2'), types déduits des schémas
    │   ├── dates.ts            arithmétique ISO en UTC, lundi, cases semaine/mois, keyTargetIso, libellés de période
    │   ├── paris.ts            parisDate(ms), parisHour(ms) (repris d'AppResaAristide convex/model/dates.ts)
    │   ├── jauge.ts            pourcentage de jauge (gaugeStyle) ; aucun formatage de texte dans domaine/
    │   ├── tickets.ts          TICKET_MARK, TICKET_RE, plainName, withTicketMark, flagTicket, dayHasTicket, serviceMode
    │   ├── places.ts           index de l'état (WeakMap), remainingR1, remainingItem, itemsR2, capacityClass, dayStatusR1/R2
    │   ├── prix.ts             priceR1 (r1Total), r2Amounts, orderAmounts (un ticket) : des nombres, le texte est fait par intl/
    │   ├── cloture.ts          r2OrdersClosed(iso, maintenant), estPasse(iso, aujourdhui)
    │   ├── navigation.ts       transformations pures des search params : choisirJour, changerPeriode, allerAujourdhui, partiePublique
    │   ├── validation.ts       validateurs (repris d'AppResaAristide src/lib/validators.ts) et règles des formulaires
    │   ├── reservations.ts     construction des corps d'action, récapitulatifs R1/R2, lecture de _bookingResult et _emailStatus
    │   └── impression.ts       regroupement R2 par client, tris, totaux imprimés (un ticket par commande)
    ├── intl/                   textes et formats (react-intl, fr-FR seul) : § 3.10
    │   ├── intl.ts             instance unique createIntl (locale et defaultLocale fr-FR, formats, defaultRichTextElements, onError) ; sert au provider ET hors composants
    │   ├── formats.ts          formats nommés : number.euro, date.jourSemaine, date.mois, date.annee, date.jourMois, date.moisAnnee, date.imprimeLe
    │   ├── messages-communs.ts defineMessages des textes partagés (Annuler, Fermer, Réserver, Enregistrer, Confirmer ?, message de clôture R2…)
    │   ├── dates.ts            formatDateLongue (« jeudi 1er octobre 2026 »), libellés de période du calendrier
    │   ├── montants.ts         textes de montants (euros + tickets, « hors plats sans prix indiqué »), prix d'un plat
    │   └── types.d.ts          augmentation FormatjsIntl : ids typés d'après translations/fr.json, formats typés
    ├── api/                    sans React ni Query ; testable seul
    │   ├── erreurs.ts          ErreurMetier, MotDePasseRefuse, ErreurService, messageErreur()
    │   ├── schemas.ts          schémas valibot : EtatPublic, EtatComplet, ReponseLecture, réponses d'écriture, CopieLocaleV1
    │   ├── transport.ts        lireJson, getEtat(since, signal), postAction(action, charge, { signal })
    │   ├── signaux.ts          relier(...signaux) et delai(ms) : repli de AbortSignal.any / timeout (Safari < 17.4)
    │   ├── lecture-doublee.ts  lectureDoublee() : seconde lecture à 6 s, la première réponse gagne, la perdante est annulée
    │   ├── lecture-anticipee.ts texte du script inline et prendreLectureAnticipee(since)
    │   ├── etat.ts             lireEtatPublic({ since, signal }), lireEtatComplet(motDePasse, signal)
    │   ├── actions.ts          une fonction typée par action POST de 02 § 4 (jamais addBookingR2 ni checkPassword)
    │   └── identifiants.ts     nouvelIdentifiant() : requestId (crypto.randomUUID, repli de 02 § 5.3)
    ├── queries/
    │   ├── client.ts           creerQueryClient() : défauts, QueryCache/MutationCache onError (mot de passe changé)
    │   ├── etat.ts             etatKeys, etatPublicOptions (queryFn etag), etatCollegueOptions(id)
    │   ├── copie-locale.ts     restaurerCopieLocale, persisterCopieLocale, lireTextesSecours, conversions v1 ↔ EtatPublic
    │   ├── use-etat.ts         useEtat(select), useDepuisCopie(), <ActualisationAuto/> (seul observateur avec refetchInterval)
    │   └── purge.ts            purgerSessionCollegue(queryClient)
    ├── mutations/
    │   ├── reservations.ts     useReserverR1, useReserverR2 (public et ajout collègue)
    │   └── collegue.ts         useConnexion, jours, plats, réservations, paramètres (une fabrique mutationOptions par action)
    ├── session/session.ts      store Zustand non persisté (motDePasse, id, fin)
    ├── background/
    │   ├── demarrer.ts         demarrerTachesDeFond({ queryClient, router }) : idempotent, arrête l'instance précédente (HMR, tests)
    │   ├── inactivite.ts       activité notée sans rendu, minuteur unique, revérification au retour (10 min)
    │   └── horloge.ts          store horloge (tic aligné sur la minute), fermeture du formulaire R2 à 10 h
    ├── ui/                     Base UI enveloppé une seule fois, sans métier (tableau § 3.5)
    ├── features/
    │   ├── page/               Page (deux colonnes), PagePublique et PageCollegue (assemblage par mode), Colonne, EnTete,
    │   │                       SelecteurMode (Client/Collègue + connexion), PiedDePage, BandeauConfiguration, EncadreEchec, Squelette
    │   ├── calendrier/         CalendrierRestaurant (en-tête, vues, grille, navigation par l'URL), search.ts (schéma CalendrierSearch partagé)
    │   ├── r1/                 FicheR1, FormulaireR1 (chargé à la demande), CompteursR1
    │   ├── r2/                 FicheR2, LignePlat, FormulaireR2 (chargé à la demande)
    │   ├── reservation/        Recapitulatif, ChampsIdentite (withFieldGroup)
    │   ├── collegue/           PanneauDemain, Parametres, OuvrirJourR1/R2, SelecteurDate, ModifierJourR1/R2, FormulairePlat,
    │   │                       ListeReservations, LigneReservation, ModifierReservationR1/R2, AjouterPersonneR1/R2, SuggestionsPrix
    │   └── impression/         DocumentListeR1, DocumentListeR2, DocumentDemainR1, DocumentDemainR2 (chargés au clic)
    ├── styles/
    │   ├── tokens.css          § 1-2 de design-system.css : jetons :root, thèmes .accent-green / .accent-magenta (+ [data-accent])
    │   ├── base.css            § 3 et 5 : base, :focus-visible, keyframes partagées, prefers-reduced-motion, cibles tactiles
    │   └── print.css           @media print, page nommée « liste » (A4 paysage), masquage de l'appli
    ├── test/                   setup (msw/node, jsdom), render.tsx (renderWithProviders : QueryClient + RawIntlProvider ; rendreRoute), fabriques d'états, fixtures
    └── vite-env.d.ts           ImportMetaEnv : VITE_APPS_SCRIPT_URL
```

Règles de dépendance (vérifiées par `import/no-cycle` et en revue) : `domaine` n'importe rien d'autre ; `intl` n'importe que `domaine` ; `api` n'importe que `domaine` et `config` ; `queries`, `mutations`, `session`, `background` n'importent ni `features` ni `ui` ; `ui` n'importe ni `api` ni `queries` ; `features` assemble ; `routes` déclarent et délèguent. Le code du mode collègue n'est importé que depuis `routes/collegue.tsx` (découpage automatique), les formulaires publics et l'impression par `lazy()` / `import()` explicites.

### 3.2 Routes et search params

| Route | Fichier | Rôle |
| --- | --- | --- |
| racine | `routes/__root.tsx` | Document HTML (`shellComponent`), `head()`, `<ScriptOnce>`, `<Toaster/>` (le `RawIntlProvider` est posé par le `Wrap` du routeur). Neutre vis-à-vis de l'URL (pas de lien actif, pas de titre selon la route). Aucun loader : il s'exécuterait au build. |
| `/` | `routes/index.tsx` | Page publique (G-01 à G-07, P-01 à P-17, L-01). |
| `/collegue` | `routes/collegue.tsx` | Même page en mode collègue (G-08, C-01 à C-30, I-01 à I-04). `beforeLoad` : sans mot de passe en mémoire, `redirect({ to: '/', search: { ...partiePublique(search), connexion: true, retour: location.href } })`. |
| `/index.html` | `routes/index[.]html.tsx` | `redirect({ to: '/', replace: true })`. |
| `*` | `routes/$.tsx` | « Page introuvable » avec un lien vers l'accueil. |

Les deux pages partagent `features/page/Page.tsx` ; la route fournit les blocs propres à son mode (fiches publiques ou fiches collègue, panneaux collègue), ce qui garde le code collègue hors du chunk public.

**Schéma commun `CalendrierSearch`** (les deux routes) et paramètres propres. `IsoDate = v.pipe(v.string(), v.isoDate())`. Tous les paramètres sont facultatifs et protégés par `v.fallback` : une URL abîmée n'affiche jamais d'erreur.

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
| `editJour` | `/collegue` | `v.fallback(v.optional(v.picklist(['r1', 'r2'])), undefined)` (`'r2'` seulement si D-09) | absent | `undefined` | « Modifier ce jour » | jour = `r1` ou `r2` de l'URL (C-13) |
| `editResa` | `/collegue` | `v.fallback(v.optional(v.pipe(v.string(), v.regex(/^r[12]:[\w-]{1,64}$/))), undefined)` | absent | `undefined` | « Modifier » d'une ligne | `{restaurant}:{ID}` ; ignoré si la réservation n'existe plus (C-11, C-24) |
| `ajout` | `/collegue` | `v.fallback(v.optional(v.pipe(v.string(), v.regex(/^(r1\|r2:[\w-]{1,64})$/))), undefined)` | absent | `undefined` | « + Ajouter une personne » | `requestId` créé au montage du formulaire (C-12, C-23) |
| `ajoutPlat` | `/collegue` | `v.fallback(v.optional(v.boolean(), false), false)` | `false` | `false` | « + Ajouter un plat à ce jour » | jour = `r2` (C-21) |
| `editPlat` | `/collegue` | `v.fallback(v.optional(v.pipe(v.string(), v.regex(/^[\w-]{1,64}$/))), undefined)` | absent | `undefined` | « Modifier ce plat » | C-22 |

Middlewares sur les deux routes : `retainSearchParams(['r1', 'r2', 'r1vue', 'r2vue', 'r1periode', 'r2periode'])` (on garde les calendriers en passant de `/` à `/collegue` et inversement) et `stripSearchParams` sur les valeurs par défaut. Jamais de donnée saisie dans l'URL (nom, contact, quantités) ; le récapitulatif reste un état local (`09` § 8.5).

**Transformations pures** (`domaine/navigation.ts`, testées par tables) : `choisirJour(search, restaurant, iso)` pose `rX`, retire `rXperiode`, et ferme ce qui dépend du jour **dans ce restaurant seulement** (`reserver` s'il vaut ce restaurant, `ouvrirDate` si `ouvrir` vaut ce restaurant, `editJour`, `editResa` et `ajout` de ce restaurant, `ajoutPlat` et `editPlat` pour R2) : c'est la correction de a-12. `changerPeriode(search, restaurant, ±1, vue)`, `allerAujourdhui(search, restaurant)`, `partiePublique(search)` (garde seulement les clés du calendrier). Le récapitulatif, état local de la colonne, est effacé par le gestionnaire qui appelle `choisirJour`.

Exemple (route publique) :

```tsx
// src/routes/index.tsx
import { createFileRoute, retainSearchParams, stripSearchParams } from "@tanstack/react-router";
import * as v from "valibot";

import { CalendrierSearch, CLES_CALENDRIER } from "@/features/calendrier/search";
import { PagePublique } from "@/features/page/PagePublique";
import { etatPublicOptions } from "@/queries/etat";

const AccueilSearch = v.object({
  ...CalendrierSearch.entries,
  reserver: v.fallback(v.optional(v.picklist(["r1", "r2"])), undefined),
  connexion: v.fallback(v.optional(v.boolean(), false), false),
  retour: v.fallback(v.optional(v.pipe(v.string(), v.startsWith("/collegue"))), undefined),
});

export const Route = createFileRoute("/")({
  validateSearch: AccueilSearch,
  search: {
    middlewares: [
      retainSearchParams(CLES_CALENDRIER),
      stripSearchParams({ r1vue: "semaine", r2vue: "semaine", connexion: false }),
    ],
  },
  // Avec la copie locale : résolu tout de suite (staleTime 'static'), aucun squelette.
  // Sans copie : attend la première lecture (squelette de la coquille, puis errorComponent en cas d'échec).
  loader: ({ context: { queryClient } }) => queryClient.query({ ...etatPublicOptions, staleTime: "static" }),
  pendingMs: 0,
  component: PagePublique,
});
```

### 3.3 Cycle de vie des données

Clés : `['etat', 'public']` (état public, seul persisté), `['etat', 'collegue', id]` (état complet, mémoire seulement, `id` = numéro de session), mutations `['ecriture', domaine, action]` avec `scope: { id: 'ecriture' }` (écritures envoyées l'une après l'autre). Jamais de mot de passe ni d'empreinte dans une clé.

Réglages par défaut (`queries/client.ts`) :

| Option | Valeur | Raison |
| --- | --- | --- |
| `staleTime` (états public et complet) | `180_000` | aligné sur l'actualisation : `refetchOnWindowFocus` ne relit que si la dernière lecture date de plus de 3 min, ce qui reproduit le « rattrapage au retour » de `03` § 5.1 sans lectures en rafale |
| `gcTime` de l'état public | `Infinity` | l'état public reste en mémoire pendant une session collègue : il sert de repli immédiat à la déconnexion (a-1) |
| `retry` (lectures) | `(n, e) => n < 1 && !(e instanceof ErreurMetier) && navigator.onLine` | un seul nouvel essai, jamais pour une erreur du script, pas hors ligne (`02` § 1.5) ; dans les défauts du client pour que les tests puissent le neutraliser |
| `retryDelay` | `1500` | `02` § 1.5 |
| `refetchIntervalInBackground` | `false` | pause quand l'onglet est caché |
| mutations : `retry` / `networkMode` | `false` / `'always'` | jamais de rejeu ; hors ligne, erreur immédiate au lieu d'une mise en pause qui repartirait seule |
| `QueryCache` et `MutationCache` `onError` | `MotDePasseRefuse` → `session.fermer('mot-de-passe-change')` | remplace `adminSessionExpired` (`02` § 2) |

`queryFn` de l'état public (etag, `02` § 3.3 et § 5.1) :

```ts
// src/queries/etat.ts (extrait)
export const etatPublicOptions = queryOptions({
  queryKey: etatKeys.public(),
  queryFn: async ({ client, queryKey, signal }): Promise<EtatPublic> => {
    const precedent = client.getQueryData<EtatPublic>(queryKey);
    // lireEtatPublic : lecture anticipée (si même since, une seule fois) sinon lectureDoublee(getEtat),
    // chaque essai borné à 30 s, réponse validée par ReponseLecture (valibot).
    const reponse = await lireEtatPublic({ since: precedent?.etag ?? "", signal });
    if (reponse.type === "etat") return reponse.etat;
    if (precedent) return precedent; // { unchanged } : même référence, aucun rendu, dataUpdatedAt rafraîchi
    return exigerEtat(await lireEtatPublic({ since: "", signal })); // cas limite : jamais renvoyer undefined
  },
  staleTime: 180_000,
  gcTime: Number.POSITIVE_INFINITY,
});
```

#### 3.3.1 Démarrage, dans l'ordre

1. GitHub Pages sert `index.html` (ou `404.html` pour un lien profond) : la coquille prérendue au build contient les `<meta>` de `03` § 2.1 (charset, `viewport` avec `viewport-fit=cover`, `theme-color` `#FFFFFF`, description), le `<title>` `Réservations — Restaurants pédagogiques`, le favicon SVG en data-URI repris d'`index.html`, les `preconnect` vers `https://script.google.com` et `https://script.googleusercontent.com` avec `crossOrigin: 'anonymous'`, la CSS hachée, les `modulepreload`, et dans `<body>` le squelette (titres par défaut, calendriers `.sk` en `aria-hidden`).
2. Le `<ScriptOnce>` de lecture anticipée s'exécute (React le place après la CSS, voir R-12) : il lit `reservations-cache-v1` dans un `try/catch`, retient l'`etag` s'il est non vide et si `savedAt` a moins de 14 jours, lance `fetch(URL + (etag ? '?since=' + encodeURIComponent(etag) : ''))`, ajoute `.catch(() => {})`, et expose `window.__RESA_ANTICIPEE__ = { since, reponse, debut: performance.now() }`. Il garde la `Response`, pas `r.json()`, pour que le traitement d'erreur soit celui des autres lectures.
3. Le bundle s'exécute. `getRouter()` (appelé aussi dans Node au build, d'où la garde `typeof window`) crée le `QueryClient`, puis côté navigateur : `restaurerCopieLocale()` valide la copie par `CopieLocaleV1`, la convertit en `EtatPublic` et la pose par `setQueryData(['etat','public'], etat, { updatedAt: savedAt })` ; sans copie valide, `lireTextesSecours()` lit `reservations-textes` pour les titres du squelette ; `persisterCopieLocale()` s'abonne au cache ; le routeur est créé avec `context: { queryClient, session }` ; l'abonnement de session et les tâches de fond démarrent.
4. `router.load()` exécute le loader de la route : avec la copie, `queryClient.query({ ..., staleTime: 'static' })` répond aussitôt ; sans copie, il lance la `queryFn` (qui reprend la lecture anticipée) et attend, le squelette reste affiché (G-01) ; un échec sans donnée affiche l'`errorComponent` de la route, c'est-à-dire la page avec l'encadré d'échec (G-03).
5. Hydratation puis rendu : `useEtat()` renvoie la copie ; `useDepuisCopie()` vaut `dataUpdatedAt < DEMARRAGE_APP` (G-02 : « Réserver » actif, connexion collègue refusée avec le toast `Les données se chargent. Réessayez dans un instant.`).
6. `<ActualisationAuto/>` se monte : la donnée restaurée est périmée, la `queryFn` part ; `prendreLectureAnticipee(since)` rend la lecture du `<head>` si son `since` est identique (une seule fois), sinon un nouveau `fetch` part ; la lecture doublée est armée pour le **temps restant** jusqu'à 6 s depuis `debut` ; un nouvel essai après 1,5 s si l'échec est transitoire et que le navigateur est en ligne.
7. Réponse : `{ unchanged: true }` → même référence, la donnée redevient fraîche, la copie est réécrite avec un `savedAt` neuf ; nouvel état → validé, partage structurel (seuls les jours modifiés sont rendus de nouveau), copie réécrite ; échec → la donnée affichée est conservée et l'encadré d'échec apparaît, avec le suffixe « copie locale » si `useDepuisCopie()`.

#### 3.3.2 Actualisation

- Un seul observateur porte `refetchInterval: 180_000` : `<ActualisationAuto/>`, monté une fois dans `Page` (un minuteur par observateur sinon). Il observe la même source que l'écran : état public, ou état complet si une session est ouverte (`getAdminState`, sans etag, b-7).
- L'actualisation **continue** pendant une saisie ou un formulaire ouvert (a-4) : TanStack Form garde les valeurs (`defaultValues` lues au montage seulement), la réconciliation garde le focus, et les places restantes, légendes « N au maximum » et maximums de saisie se mettent à jour sous le formulaire. L'exigence de `03` § 5.4 (aucune saisie ni focus perdu) devient un test.
- Rattrapage : `refetchOnWindowFocus` (si plus de 3 min) et `refetchOnReconnect` ; plus besoin de `refreshMissed`.
- Une lecture plus ancienne qu'une écriture ne peut pas écraser sa réponse : chaque mutation fait `await queryClient.cancelQueries({ queryKey: ['etat'] })` avant `setQueryData` (remplace `writeSeq`).
- Échec d'une actualisation après un premier succès : silencieux, sauf mot de passe changé. Échec répété avant tout succès : l'encadré n'est réannoncé que si son texte change (a-21).

#### 3.3.3 Écritures

| Écriture | `mutationKey` | Corps (`02` § 4) | Réponse | `useMutation({ onSuccess })` (survit au démontage) | `mutate(…, { onSuccess })` (si le composant est encore là) |
| --- | --- | --- | --- | --- | --- |
| Réservation publique R1 / R2 | `['ecriture','reservation','r1'\|'r2']` | § 4.4 / § 4.5, textes `trim()`, `requestId` du formulaire | état public + `_duplicate`, `_emailStatus`, `_bookingResult` | `cancelQueries` ; `setQueryData(['etat','public'], état sans champs _)` ; si une session s'est ouverte pendant l'envoi : `invalidateQueries(['etat','collegue'])` | récapitulatif (état local), toast, fermeture du formulaire (`replace`), focus sur le titre du récapitulatif (a-9) |
| Ajout d'une personne (collègue) | mêmes clés | mêmes corps, **sans** `password` | état public | idem + `invalidateQueries(['etat','collegue'])` (relecture de l'état complet, `06` § 8.5) | toast de `06` § 8.5, fermeture |
| Action collègue | `['ecriture', domaine, action]` | + `password` lu dans le store au moment de l'appel | état complet | `cancelQueries` ; `setQueryData(['etat','collegue', id], état)` ; `invalidateQueries(['etat','public'], { refetchType: 'none' })` | toast de succès de `02` § 4.7, fermeture du panneau (`replace`) |
| Paramètres | `['ecriture','config','enregistrer']` | une requête `setConfigField` par champ modifié, **en séquence** dans une seule `mutationFn` | état complet après chaque requête | idem action collègue | toast singulier ou pluriel ; détail d'un échec partiel (D-20) |
| Connexion | `['connexion']` | `getAdminState` `{ password }` | état complet | `id = session.id + 1` ; `setQueryData(['etat','collegue', id], état)` **puis** `session.ouvrir(motDePasse)` (aucune suspension) | toast `Mode collègue activé.`, navigation vers `retour` ou `/collegue` en gardant les calendriers |

Règles : les réponses passent par les schémas (`_duplicate`, `_emailStatus`, `_bookingResult` sont lus puis retirés avant le cache) ; une écriture n'est **jamais** doublée, rejouée ni interrompue (pas de délai d'expiration : interrompre un POST n'annule pas l'écriture côté serveur ; signal de lenteur selon D-15) ; le formulaire appelle `mutateAsync` dans un `try/catch` de son `onSubmit` (TanStack Form relance l'erreur sinon) ; erreur métier → message exact du script, sous le champ concerné quand il y en a un (places R1 sous la rangée des compteurs, a-5), sinon en toast ; erreur réseau → texte de D-14 ; le `requestId` est conservé pour le nouvel essai.

#### 3.3.4 Déconnexion, dans l'ordre (corrige a-1, a-13, a-14)

Déclencheurs : segment « Client » (toast `Retour au mode client.`), inactivité de 10 min (toast `Déconnecté du mode collègue après 10 minutes d'inactivité.`), mot de passe changé (toast d'erreur `Le mot de passe du mode collègue a changé. Reconnectez-vous.`).

1. `session.fermer(raison)` : `motDePasse = null`, `fin = raison`, notification synchrone.
2. L'abonné de `router.tsx` (sélecteur `s => s.motDePasse !== null`) appelle `purgerSessionCollegue(queryClient)` : `cancelQueries({ queryKey: ['etat','collegue'] })` (sans attendre), `removeQueries({ queryKey: ['etat','collegue'] })`, `getMutationCache().clear()` (les variables des mutations contiennent des noms et des contacts).
3. Les composants qui lisent `useEtat()` basculent sur `['etat','public']`, toujours présent (`gcTime: Infinity`) : plus aucun nom n'est affiché ni gardé par Query, sans attendre le réseau.
4. `invalidateQueries({ queryKey: ['etat','public'] })` : relecture avec `since`.
5. Toast selon `fin`.
6. Si l'URL est sous `/collegue` : `router.navigate({ to: '/', search: partiePublique, replace: true })`, ce qui démonte tous les panneaux et formulaires collègue (leur état vivait dans l'URL ou dans des composants démontés) ; sinon `router.invalidate()`. La navigation directe évite que la garde rouvre le panneau de connexion après une déconnexion voulue ; la garde ne sert qu'aux accès directs (rechargement, favori, bouton Retour).
7. Le minuteur d'inactivité est désarmé (`background/inactivite.ts`, abonné au même sélecteur).

Test de référence (P4) : juste après `fermer()`, `queryClient.getQueryCache().findAll({ queryKey: ['etat','collegue'] })` est vide, le cache des mutations est vide, et après rendu aucun nom de la fixture n'est présent dans le DOM.

#### 3.3.5 Copie locale

- **Clé et format inchangés** : `reservations-cache-v1`, forme exacte de `03` § 1.1 (`savedAt`, `etag`, `config`, `r1Used`, `r2Used`, `r1Days`, `r2Days`, `r2Items` avec `Nom` sans la mention et `Ticket`). Le schéma `CopieLocaleV1` valide la lecture ; les clés inconnues sont retirées (aucune donnée personnelle ne peut y entrer).
- **Écriture** : seulement depuis une mise à jour réussie de `['etat','public']` portant un `etag` non vide (corrige a-22) ; jamais depuis l'état complet. Les sommes `r1Used` / `r2Used` sont recalculées comme dans `saveCache`.
- **Lecture** : copie de moins de 14 jours ; `etag` absent accepté (copies écrites par l'ancien site après une session collègue) ; JSON invalide ou schéma refusé → ignorée.
- **Même origine que l'ancien site** pendant la préproduction (`thegaudis.github.io`) : les deux sites lisent et écrivent la même clé. Le nouveau doit donc écrire **exactement** le format v1 ; un test relit la copie écrite par le nouveau code avec la logique de `loadCache` de `legacy/js/donnees.js`.
- `reservations-textes` : relue en secours pour les titres du squelette quand il n'y a pas de copie valide, jamais écrite ; sa lecture est retirée après la bascule (§ 7).
- Transformations idempotentes : une copie déjà normalisée repasse par le schéma (`Ticket` déjà vrai, nom déjà sans la mention).

### 3.4 Session et tâches de fond

```ts
// src/session/session.ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type FinSession = "deconnexion" | "inactivite" | "mot-de-passe-change";

interface SessionState {
  /** En mémoire seulement : jamais de persist, ni dans l'URL, ni dans une clé de requête. */
  readonly motDePasse: string | null;
  /** Numéro de session : clé ['etat','collegue', id]. */
  readonly id: number;
  /** Raison de la dernière fermeture, pour le toast. */
  readonly fin: FinSession | null;
  readonly ouvrir: (motDePasse: string) => void;
  readonly fermer: (raison: FinSession) => void;
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set, get) => ({
    motDePasse: null,
    id: 0,
    fin: null,
    ouvrir: (motDePasse) => set({ motDePasse, id: get().id + 1, fin: null }),
    fermer: (raison) => {
      if (get().motDePasse !== null) set({ motDePasse: null, fin: raison });
    },
  })),
);
export type SessionStore = typeof useSessionStore;
```

- Le store est injecté dans le `context` du routeur (`session: useSessionStore`) : la garde lit `context.session.getState()`, les tests passent un store neuf. Les composants lisent toujours avec un sélecteur (`useSessionStore(s => s.motDePasse !== null)`), jamais le store entier.
- **Inactivité** (`background/inactivite.ts`, `06` § 1.6) : écouteurs passifs `pointerdown`, `pointermove`, `keydown`, `touchstart` posés une fois sur `document` ; ils écrivent seulement une variable de module (aucun rendu). Un seul `setTimeout`, armé à l'ouverture pour le temps restant, se réarme si une activité a eu lieu, sinon `fermer('inactivite')`. Revérification sur `visibilitychange` (onglet visible) et `pageshow` (retour depuis le cache de navigation), car les minuteurs sont ralentis en arrière-plan. Pas de synchronisation entre onglets (D-26).
- **Horloge** (`background/horloge.ts`) : `useHorloge = create<{ maintenant: number }>()(…)`, mise à jour par un minuteur aligné sur chaque minute (donc à 10 h 00 et à minuit pile, à quelques millisecondes près) et sur `visibilitychange` / `pageshow`. Les composants lisent des **valeurs dérivées** (`useAujourdhui()` = `parisDate(maintenant)`, `useCommandesR2Closes(iso)`), donc ne se rendent de nouveau que lorsque la valeur change. Aucun `new Date()` ni `Date.now()` pendant le rendu (règle `react/purity`).
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
| `printDoc`, `printTable`, `openPrint` (`07`) | `ui/print/impression.ts`, `ZoneImpression.tsx`, `PrintLayout.tsx`, `PrintTable.tsx` | — | § 3.8 |

**Calendrier maison** (`ui/calendar/CalendarGrid.tsx`) : `role="grid"` étiqueté par le libellé de période (`aria-live="polite"`), lignes `role="row"`, en-têtes `L M M J V S D` (`aria-hidden` ou `<abbr>`), cellules `role="gridcell"` avec `aria-selected`, chacune contenant un `<button>` (pas un `<Link>` : le routeur poserait `aria-current="page"` et écraserait `aria-current="date"`). Un seul `tabIndex=0` : le jour sélectionné s'il est affiché, sinon la première case (`05` § 2.6). `aria-label` de `05` § 2.5 (date longue désormais avec « 1er », D-03), construit par `intl.formatMessage`. Clavier exactement selon `05` § 3.2 (← → ±1 j, ↑ ↓ ±7 j, Début / Fin = lundi / dimanche, Page ↑ / ↓ = même jour du mois voisin **borné au dernier jour du mois**, a-23), la vue suit la sélection sans glissement ; Entrée / Espace = clic natif. Focus sans effet : le gestionnaire `onKeyDown` focalise la case cible si elle est déjà dans le DOM puis navigue (`replace`) ; si la période change, la nouvelle case sélectionnée reprend le focus par une ref callback « si le focus est tombé sur `body` » (`reprendreFocusSiOrphelin`). Vue semaine = une ligne, vue mois = 42 cases.

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
- Arithmétique en UTC (`Date.UTC`, `setUTCDate`) : `ajouterJours`, `lundiDe`, `casesSemaine`, `casesMois` (42 cases, lundi en premier), `ajouterMoisBorne`, `keyTargetIso`. Reprendre `src/lib/dates.ts` d'AppResaAristide (dont `formatWeekLabel` et un `addMonths` sans débordement), en l'adaptant aux libellés de `05` § 2.3 et à la correction a-23 (« 28 sept. – 4 oct. 2026 », année du lundi affichée si elle diffère).
- Affichage : par l'instance `intl` (§ 3.10), formats nommés avec `timeZone: 'UTC'` appliqués à `Date.UTC(…)` ; date longue **avec l'ordinal** : `jeudi 1er octobre 2026` (D-03, arbitrage 11 : comme les e-mails du script) ; majuscule initiale par CSS `::first-letter` comme aujourd'hui.
- « Maintenant » : `parisDate(ms)` et `parisHour(ms)` (`Intl` avec `timeZone: 'Europe/Paris'`, repris d'AppResaAristide). `r2OrdersClosed(iso, maintenant) = iso < parisDate(maintenant) || (iso === parisDate(maintenant) && parisHour(maintenant) >= 10)` ; `estPasse(iso, aujourdhui) = iso < aujourdhui` ; « demain » = `ajouterJours(parisDate(maintenant), 1)`.
- Pas de Temporal (absent de Safari stable), pas de polyfill, pas de date-fns. Tests sous `TZ=Europe/Paris` et `TZ=America/New_York`, et autour des changements d'heure (29 mars et 25 octobre 2026).

### 3.8 Impression

- **Dans le même document** : plus de `window.open`, plus de `PRINT_TOKENS`, plus de toast « Autorisez les fenêtres de ce site pour imprimer. » (I-00 disparaît). Le module d'impression est chargé par `import()` au clic.
- Mécanique (`ui/print/impression.ts` + `<ZoneImpression/>` monté une fois sous `/collegue`) : `imprimer(document, titre)` fait `flushSync` pour poser le document dans un portail `.print-root`, change `document.title` (nom proposé pour le PDF : titres de `07` § 3 à 7), attend `document.fonts.ready` au plus 2 s, puis `window.print()` ; à `afterprint`, le titre est rétabli et le portail vidé. Les données sont un instantané de l'état complet au moment du clic.
- `styles/print.css` : à l'écran `.print-root { display: none }` ; à l'impression, tout le reste masqué (`body:has(> .print-root) > :not(.print-root)`), page nommée `liste` : `@page liste { size: A4 landscape; margin: 12mm 14mm 14mm; @bottom-left { … } @bottom-right { content: "Page " counter(page) " / " counter(pages) } }` (valeurs de police et de couleur écrites en dur dans les boîtes de marge, seule exception à la règle des jetons), `print-color-adjust: exact`, en-têtes de tableau répétés, lignes insécables, total jamais seul en haut de page.
- Les quatre documents (`07` § 3, 4, 6, 7) sont des composants React (`DocumentListeR1`…) qui réutilisent les jetons réels et les couleurs par restaurant de `07` § 2.3 ; regroupements et totaux viennent de `domaine/impression.ts` (un ticket par commande, a-11 ; tri selon D-08 ; textes corrigés de a-24).
- Limites connues : boîtes de marge (« Page x / y ») seulement dans Chromium 131+ ; le pied `.pb-foot` « écran seulement » n'a plus d'objet (le document n'est jamais visible à l'écran).

### 3.9 Erreurs et états de chargement

| Situation | Mécanisme | Rendu et texte (référence) |
| --- | --- | --- |
| Premier chargement sans copie (G-01) | coquille prérendue + `pendingComponent` | squelette des deux calendriers (`aria-hidden`), titres par défaut ou de `reservations-textes`, aucun texte « Chargement » (`03` § 3) |
| Copie locale affichée, données pas encore confirmées (G-02) | `useDepuisCopie()` | page complète interactive, « Réserver » actif ; connexion refusée : toast `Les données se chargent. Réessayez dans un instant.` |
| Échec de lecture (G-03) | `errorComponent` de la route si aucune donnée ; sinon `error` de la requête | `EncadreEchec` (`role="alert"`) : textes exacts de `03` § 3.1 (en ligne / hors ligne via `navigator.onLine`, suffixe « copie locale ») ; bouton `Réessayer` occupé `Nouvelle tentative…` → `reset()` puis `router.invalidate()` ou `refetch()` ; réannonce seulement si le texte change (a-21) ; le toast inatteignable de `03` § 3.2 n'est pas recréé |
| Configuration manquante (G-05) | `configurationManquante()` au build et à l'exécution | `BandeauConfiguration` si l'URL est absente, ne ressemble pas à `https://script.google.com/macros/s/…/exec` ou contient `COLLE_ICI` (a-25) ; texte selon D-05 |
| Erreur métier d'écriture | `ErreurMetier` | message exact du script (`02` § 4) sous le champ ou en toast d'erreur ; formulaire et `requestId` conservés ; relecture de l'état après une erreur de places (a-4) |
| Erreur réseau, page HTML de Google, réponse illisible | `ErreurService` (et `TypeError` de `fetch`) | jamais de message anglais brut (a-3) : textes de D-14 |
| Écriture lente | rien n'est interrompu | signal de lenteur selon D-15 ; bouton occupé ; « Annuler » désactivé pendant l'envoi (a-20) |
| Mot de passe changé | `MotDePasseRefuse` → `onError` global | déconnexion (§ 3.3.4) |
| Doublon (`_duplicate`) | lecture de la réponse | récapitulatif « déjà enregistrée » (D-16) |
| Chunk introuvable après un déploiement | le routeur recharge une fois la page (`isModuleNotFoundError`) ; écouteur `vite:preloadError` qui recharge une fois (garde en `sessionStorage`) | transparent |
| URL invalide | `v.fallback` partout ; `$.tsx` | aucun écran d'erreur ; « Page introuvable » pour un chemin inconnu |

Plus de voile bloquant plein écran (G-06) : connexion et suppressions utilisent un bouton occupé (§ 4.2).

### 3.10 Textes et formats (react-intl / FormatJS)

Arbitrage 11 : **tous** les textes de l'interface passent par react-intl, même sans localisation, pour une vraie gestion des pluriels, des montants et des dates. Dispositif repris d'element-admin (react-intl 12, `@formatjs/cli`, `@formatjs/unplugin`, `eslint-plugin-formatjs` via `jsPlugins`), simplifié pour une langue unique.

**Principes**
- Langue unique `fr-FR` (`locale` et `defaultLocale`). Les `defaultMessage` sont écrits **en français dans le code**, recopiés mot pour mot de la spec (guillemets de code ou « »), ponctuation et espaces comprises ; aucun fichier de traduction n'est chargé à l'exécution (react-intl ne signale pas de traduction manquante quand la langue est la langue par défaut). La spec fait foi : ne jamais reprendre un texte d'AppResaAristide (version ancienne, tutoiement) sans le vérifier.
- **Ids explicites et stables, par domaine** : `{zone}.{écran ou composant}.{élément}`, en camelCase, par exemple `public.r1.formulaire.nom.libelle`, `public.r2.cloture`, `public.toast.reservationConfirmee`, `collegue.parametres.enregistrer`, `chargement.echec.horsLigne`, `impression.r1.titreDocument`, `commun.action.annuler`. Un id ne change pas quand le texte change.
- **`description` obligatoire** et littérale, qui cite la source dans la spec (`"04 § 9 — toast de succès d'une réservation"`) : traçabilité et relecture.
- Où vivent les messages : dans le fichier qui les utilise (`<FormattedMessage id defaultMessage description />` ou `defineMessages` en tête de module) ; les textes partagés par plusieurs fichiers dans `intl/messages-communs.ts`. **Le catalogue `textes.ts` centralisé n'existe plus.**
- Pluriels et ordinaux en ICU : `{n, plural, one {# couvert} other {# couverts}}` (en français, 0 et 1 sont au singulier, comme `plural()` de `00` § 3 : `0 couvert`, `1 couvert`, `2 couverts`) ; `{n, plural, one {# ticket restaurant} other {# tickets restaurant}}` ; date longue `{jourSemaine} {jour, selectordinal, one {#er} other {#}} {mois} {annee}` (`intl/dates.ts`, parties fournies par `intl.formatDate` avec `timeZone: 'UTC'`) → `jeudi 1er octobre 2026`, `samedi 3 octobre 2026`.
- Valeurs insérées en placeholders nommés (`{name2}`, `{contact}`, `{rem}`) ; textes du script (`{ error }`) affichés tels quels, jamais passés dans `defaultMessage`.
- Mise en forme riche par balises déclarées une fois dans `defaultRichTextElements` (`<b>`, `<i>`) ; pas de `<br>` dans un message : deux messages ou deux paragraphes (encadré d'échec de `03` § 3.1).
- Espaces insécables écrites `\u00A0` dans le littéral (jamais le caractère invisible) : séparateur `␣— ` devant un prix (`dash` de `00` § 3), etc. ; les séparateurs ` — ` des lignes de réservation et du récapitulatif gardent des espaces normales (`spec/README.md` § 4.1). `preserveWhitespace: true` dans le plugin et `--preserve-whitespace` à l'extraction, sinon FormatJS normalise les espaces.

**Formats partagés** (`intl/formats.ts`, passés à `createIntl({ formats })` et typés par `FormatjsIntl.Formats`) :

| Nom | Définition | Usage |
| --- | --- | --- |
| `number.euro` | `{ style: 'currency', currency: 'EUR' }` | tous les montants : `<FormattedNumber value={x} format="euro" />` ou `intl.formatNumber(x, { format: 'euro' })` → `12,50␣€`, `4,95␣€`, `0,00␣€` (mesuré sous Node 22 / ICU 77 : U+00A0 avant €, U+202F comme séparateur de milliers au-delà de 999 €) |
| `date.jourSemaine`, `date.mois`, `date.annee` | `{ weekday: 'long' }`, `{ month: 'long' }`, `{ year: 'numeric' }`, `timeZone: 'UTC'` | parties de la date longue (avec ordinal) |
| `date.jourMois` | `{ day: 'numeric', month: 'short', timeZone: 'UTC' }` | libellé de semaine (« 28 sept. – 4 oct. 2026 ») |
| `date.moisAnnee` | `{ month: 'long', year: 'numeric', timeZone: 'UTC' }` | libellé de mois, sélecteur de date (« Octobre 2026 », majuscule par CSS) |
| `date.imprimeLe` | `{ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }` | « Imprimé le 3 octobre 2026 » (`07` § 2.2) |

**Instance unique et usage hors composants** : `intl/intl.ts` exporte `intl = createIntl({ locale: 'fr-FR', defaultLocale: 'fr-FR', formats, defaultRichTextElements, onError }, createIntlCache())`. Le routeur pose `<RawIntlProvider value={intl}>` dans son `Wrap` (avec le `QueryClientProvider`) ; les composants utilisent `<FormattedMessage>`, `<FormattedNumber>` ou `useIntl()`. Hors React, le même objet sert aux toasts des mutations et des tâches de fond (déconnexion, 10 h), à `document.title` de l'impression et aux `aria-label` construits dans des fonctions. Un texte qui va dans un **attribut** (`aria-label`, `title`, `placeholder`, `alt`) passe par `intl.formatMessage(...)`, jamais par `<FormattedMessage>`.

**Extraction et contrôle** :
- `pnpm i18n:extract` = `formatjs extract 'src/**/*.{ts,tsx}' --throws --preserve-whitespace --out-file translations/fr.json && oxfmt translations/fr.json` (format par défaut : `id → { defaultMessage, description }`). `--throws` échoue sur un message invalide ou un même id avec deux textes différents.
- CI : `pnpm i18n:extract` puis `git diff --exit-code translations/fr.json` (le fichier versionné doit être à jour) ; `pnpm check` commence par l'extraction (comme element-admin).
- Ids typés : `intl/types.d.ts` déclare `FormatjsIntl.Message['ids']` = `keyof typeof import('../../translations/fr.json')` (motif d'element-admin) : un id inconnu est une erreur `tsc`.
- `translations/fr.json` sert aussi de **relecture des textes** contre la spec (P6) ; une localisation future ajouterait `formatjs compile --ast` et un chargement par langue comme element-admin.

**Build** : `@formatjs/unplugin/vite` avec `{ ast: true, preserveWhitespace: true }` précompile chaque `defaultMessage` en AST ; en production, l'alias `@formatjs/icu-messageformat-parser` → `@formatjs/icu-messageformat-parser/no-parser.js` retire l'analyseur ICU (§ 3.11). Poids mesuré (esbuild + gzip, React exclu, `IntlProvider`, `FormattedMessage`, `FormattedNumber`, `FormattedDate`, `useIntl`, `createIntl`) : **14,8 kB gzip avec l'analyseur, 7,6 kB sans** ; s'y ajoutent les messages en AST, répartis dans les chunks qui les utilisent (quelques kB). Aucun polyfill `Intl` nécessaire sur les navigateurs ciblés.

**Lint** (`eslint-plugin-formatjs` par `jsPlugins`) : `enforce-default-message: literal`, `enforce-description: literal`, `enforce-placeholders`, `enforce-plural-rules: { one: true, other: true }`, `no-multiple-whitespaces`, `no-multiple-plurals`, `no-offset`, `prefer-pound-in-plural`, `no-missing-icu-plural-one-placeholders`, `no-complex-selectors`, `no-useless-message`, `no-literal-string-in-jsx` (y compris les props `label`, `placeholder`, `title`, `aria-label`, `alt`), `no-emoji` (le « ⚠ » du bandeau, seul symbole admis par la charte, est une icône SVG ou une exception commentée). **Non repris d'element-admin** : `blocklist-elements: ['selectordinal']` (il nous faut l'ordinal « 1er ») et `enforce-id` par empreinte (nos ids sont explicites).

**Tests** : `renderWithProviders` enveloppe `QueryClientProvider` + `RawIntlProvider value={intl}` ; les fonctions de `intl/` se testent avec la même instance ; les attentes comparent les chaînes exactes de la spec (avec `\u00A0` explicite). `vitest.config.ts` charge aussi `@formatjs/unplugin` (même transformation qu'en production).

**Pièges** : ids en double (même id, deux textes) → `--throws` ; apostrophe ICU (`'` suivie de `{` ou `}` ouvre une citation : écrire `''` dans ce cas) ; `{` et `}` littéraux à échapper ; HTML dans un message → balises déclarées seulement ; `<FormattedMessage>` dans un attribut (rend un objet, pas une chaîne) ; espaces normalisées si `preserveWhitespace` est oublié ; U+202F produite par `Intl` au-delà de 999 € (et, selon les moteurs, éventuellement devant €) : comparer en tests sous Node, vérifier une fois dans Chromium et WebKit (P6), ne jamais coder l'espace en dur autour d'un montant formaté ; `#` d'un pluriel formaté selon la locale.

### 3.11 Configuration de build et routeur

```ts
// vite.config.ts
import formatjs from "@formatjs/unplugin/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Site de projet GitHub Pages. Préproduction : BASE_PATH=/reservations-restaurants/v2/ ; domaine propre : BASE_PATH=/
const base = process.env["BASE_PATH"] ?? "/reservations-restaurants/";

export default defineConfig(({ mode }) => ({
  base, // Start en déduit le basepath du routeur : ne jamais écrire /reservations-restaurants en dur
  resolve: {
    tsconfigPaths: true, // alias @/* du tsconfig
    // Messages précompilés en AST par @formatjs/unplugin : l'analyseur ICU est inutile en production (-7 kB gzip)
    alias: mode === "production"
      ? { "@formatjs/icu-messageformat-parser": "@formatjs/icu-messageformat-parser/no-parser.js" }
      : {},
  },
  build: { manifest: true, sourcemap: true }, // manifeste lu par scripts/check-budget.mjs
  plugins: [
    tanstackStart({ spa: { enabled: true, prerender: { outputPath: "/index.html" } } }),
    react({ compiler: true }), // après tanstackStart() ; exige oxc-transform-react@~0.145.0 (expérimental)
    formatjs({ ast: true, preserveWhitespace: true }), // defaultMessage gardés (langue unique), compilés en AST
  ],
}));
```

```tsx
// src/router.tsx (extrait)
export function getRouter() {
  const queryClient = creerQueryClient();
  const navigateur = typeof window !== "undefined"; // getRouter() s'exécute aussi dans Node au prérendu de la coquille
  if (navigateur) {
    restaurerCopieLocale(queryClient); // SYNCHRONE, avant le routeur : premier rendu depuis la copie
    persisterCopieLocale(queryClient);
  }
  const router = createRouter({
    routeTree,
    context: { queryClient, session: useSessionStore },
    defaultPreloadStaleTime: 0, // Query décide de la fraîcheur
    defaultStructuralSharing: true,
    scrollRestoration: true,
    defaultPendingComponent: Squelette,
    defaultErrorComponent: ErreurChargement,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <RawIntlProvider value={intl}>{children}</RawIntlProvider>
      </QueryClientProvider>
    ),
  });
  if (navigateur) {
    useSessionStore.subscribe(
      (s) => s.motDePasse !== null,
      (connecte) => {
        if (!connecte) apresDeconnexion({ router, queryClient }); // § 3.3.4, étapes 2 à 6
      },
    );
    demarrerTachesDeFond({ queryClient, router });
  }
  return router;
}
```

Le shell : `<html lang="fr"><head><ScriptOnce children={scriptLectureAnticipee} /><HeadContent /></head><body>{children}<Scripts /></body></html>` ; `head()` porte les `meta`, le titre, le favicon et les `preconnect` (`crossOrigin: 'anonymous'`). Aucun code de niveau module qui touche `window`, `document` ou `localStorage` dans `__root.tsx`, `router.tsx` et leurs imports (le prérendu échouerait).

---

## 4. Décisions produit à valider

### 4.1 Décisions (valeur par défaut appliquée sauf avis contraire)

Les textes marqués « *texte proposé* » n'existent pas dans l'appli actuelle : ils sont à relire. Une décision modifiée après coup se reporte ici, avec la phase concernée.

| # | Source | Question | Recommandation par défaut (appliquée) | Phase |
| --- | --- | --- | --- | --- |
| D-01 | c-1 | Easter egg (5 clics sur le logo → vidéo YouTube) | **Retiré** (site d'établissement scolaire). | P3 |
| D-02 | c-2, `08` PA 1, AppResaAristide | Mot d'état avec la couleur, explication quand « Réserver » est absent | Mot visible à côté de la jauge pour les états orange et rouge : `Bientôt complet`, `Complet` ; plat épuisé dans la liste de la fiche : `Épuisé` (mot déjà utilisé dans le formulaire). Phrase sous la fiche quand « Réserver » manque : R1 complet `Complet.` (AppResaAristide) ; R2 tous les plats épuisés *texte proposé* `Tous les plats sont épuisés.` Jour passé : pas de phrase (fiche pâlie, « passé » dans l'`aria-label`). | P3 |
| D-03 | c-3 | Textes incohérents | `(hors plats sans prix indiqué)` partout (total en direct, récapitulatif, résumé du lendemain) ; plus de texte initial `Total : 0,00 €` (le total exact est rendu d'emblée) ; pastille R1 inchangée (`{rem} / {Capacite} couverts`) ; dates **avec « 1er »** à l'écran comme dans les e-mails (`jeudi 1er octobre 2026`, ordinal ICU, arbitrage 11) ; pluriels par ICU ; messages du script inchangés. | P1, P3, P5 |
| D-04 | c-4 | Contact à la modification d'une réservation | Libellé `Adresse email (optionnel)` comme à l'ajout ; facultatif ; format vérifié seulement si la valeur a été modifiée et n'est pas vide (un ancien contact téléphonique reste enregistrable tel quel). | P4 |
| D-05 | c-5, a-25 | Bandeau « Configuration manquante » | Vouvoiement, affiché à tous quand l'URL du script manque ou est invalide : *texte proposé* `⚠ Configuration manquante : l'adresse du service de réservation n'est pas renseignée. Prévenez l'établissement.` Détail technique (variable `VITE_APPS_SCRIPT_URL`) dans la console et le README. | P3 |
| D-06 | c-6 | Libellé de charte « Revenir en mode client » | Aucun bouton ajouté ; signaler à l'auteur de la charte que le retour se fait par le segment « Client ». | — |
| D-07 | c-7, AppResaAristide | Panneaux « Demain » et « Résumé pour demain » en doublon | **Fusionnés** en un seul panneau `Demain ({date})` : la ligne de totaux de `06` § 2.1, puis les blocs par restaurant de `07` § 5 avec leurs boutons d'impression ; réservations de plats supprimés exclues partout (chiffres cohérents, b-3). | P4, P5 |
| D-08 | c-8 | Tri des listes | Impressions et panneau « Demain » : par classe puis par nom (`localeCompare('fr', { sensitivity: 'base' })`). Listes à l'écran dans les fiches : ordre d'enregistrement (inchangé). | P5 |
| D-09 | c-9, b-12 | « Modifier ce jour » pour R2 | **Oui**, sans changer le script : `addDayR2` avec `items: []`, en renvoyant la note, le thème et l'« ouvert par » actuels (sinon le script les écraserait). Mêmes libellés que R1 (`Enregistrer` / `Annuler`, toast `Jour modifié.` — *texte repris de R1*). | P4 |
| D-10 | c-10 | Report des saisies d'un restaurant à l'autre | **Non** : chaque formulaire part vide (effet involontaire de l'ancien code). | P3 |
| D-11 | c-11, a-12 | Formulaire public et récapitulatif ; URL ; reprise du mode collègue | Un **récapitulatif par restaurant** (état local de chaque colonne). Un seul formulaire public ouvert à la fois (`reserver=r1\|r2`), mais choisir un jour dans une colonne ne ferme jamais le formulaire ni le récapitulatif de l'autre. URL à deux dates (`r1`, `r2`), schéma de `09` § 1. `/collegue` rechargé → connexion, puis retour à l'URL demandée. *Variante possible* : deux formulaires ouverts en même temps (`r1reserver`, `r2reserver`). | P3, P4 |
| D-12 | c-12, b-2 | Session collègue ; fuseau de référence | Mémoire seulement (perdue au rechargement, invariant 1). « Aujourd'hui », jour passé et cut-off calculés à l'**heure de Paris**, quel que soit le fuseau de l'appareil. | P1, P4 |
| D-13 | c-13 | Ajouts collègue sur les jours passés ; pastille R2 agrégée | Conservés tels quels (ajout a posteriori utile ; pastille = somme des stocks). | — |
| D-14 | a-3 | Message d'une écriture qui échoue pour une raison technique | Public hors ligne : `Vous semblez hors ligne. Vérifiez votre connexion internet, puis réessayez.` (repris de `03` § 3.1). Public, service muet ou réponse illisible : *texte proposé* `Le service de réservation ne répond pas. Réessayez dans un instant : une même réservation n'est jamais enregistrée deux fois.` Collègue : *texte proposé* `Le service ne répond pas. Réessayez dans un instant.` Connexion : `Erreur de connexion. Réessayez.` (inchangé). | P3, P4 |
| D-15 | a-2 | Écriture qui ne répond pas | Aucune interruption (le script écrirait quand même). Au bout de 20 s, sous le bouton occupé, en `role="status"` : *texte proposé* `Le service met du temps à répondre. Gardez cette page ouverte : la confirmation s'affichera ici.` | P3 |
| D-16 | a-10 | Doublon (`_duplicate`) | Toast neutre inchangé **et** récapitulatif reconstruit depuis la saisie, titre *texte proposé* `Réservation déjà enregistrée`, avertissement `Cette réservation était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.` (R2 : quantités demandées, puisque les quantités accordées ne sont pas renvoyées). | P3 |
| D-17 | AppResaAristide | Boutons −/+ sur les compteurs R1 et les quantités R2 | **Oui** (cibles de 44 px, mobile) via `NumberField` ; saisie au clavier conservée ; libellés *proposés* `Retirer une portion : {Nom}` / `Ajouter une portion : {Nom}`, `Diminuer : Élèves` / `Augmenter : Élèves` (idem Personnels, Extérieurs). | P2, P3 |
| D-18 | a-5, AppResaAristide | Contrôle des maximums avant envoi (public) | **Oui.** R1 : total ≤ places restantes, message sous la rangée `{n couvert(s)} au maximum (places restantes ce jour-là).` (texte de l'ajout collègue, `06` § 8.2). R2 : quantité ≤ restant, bornée par le champ, message `{n portion(s)} au maximum (stock restant).` (`06` § 8.3). Le script reste l'arbitre ; son refus s'affiche sous la rangée et l'état est relu. | P3 |
| D-19 | a-15, a-16, a-17, b-4 | Contrôles côté collègue | Date passée refusée dans « Ouvrir un jour » (*texte proposé* `Choisissez une date à venir.`) ; jour R1 déjà ouvert : envoi bloqué, *texte proposé* `Ce jour est déjà ouvert : utilisez « Modifier ce jour ».` ; jour R2 déjà ouvert : avertissement *proposé* `Ce jour est déjà ouvert : seuls les plats de nom nouveau seront ajoutés.` ; capacité ≥ couverts réservés (message du script `Impossible : {n} couvert(s) déjà réservé(s) pour ce jour, la capacité ne peut pas être inférieure.`) ; stock ≥ portions réservées (*proposé* `Impossible : {n} portion(s) déjà réservée(s) pour ce plat, le stock ne peut pas être inférieur.`) ; ligne de plat incomplète signalée (*proposé* `Indiquez le nom et le stock de ce plat, ou retirez la ligne.`) ; ajout R2 un jour au ticket : « Sur place » seule option ; modification R2 bornée au stock restant + quantité actuelle ; maximum de modification R1 = places restantes + quantité actuelle (comme le script). | P4 |
| D-20 | a-18 | Paramètres | Un champ vidé est envoyé (`""` : le script remet sa valeur par défaut) ; tarifs vérifiés (nombre ≥ 0) ; échec partiel détaillé : *texte proposé* `Enregistré : {libellés}. Non enregistré : {libellé} ({message}).` | P4 |
| D-21 | b-3 | Suppression d'un jour ou d'un plat qui a des réservations | Le bouton armé affiche une note visible et un `aria-label` détaillés : *proposés* `Confirmer la suppression du jour et de ses {n} réservations (les personnes ne seront pas prévenues)` / `Confirmer la suppression de ce plat ({n} réservations ne seront plus affichées, les personnes ne seront pas prévenues)`. Réservations orphelines exclues des totaux et des listes. | P4 |
| D-22 | b-8 | Prix 0 | Refusé côté client : *texte proposé* `Indiquez un prix supérieur à 0, ou laissez le champ vide.` | P4 |
| D-23 | react-architecture § 9 | Polices | **Auto-hébergées** (`@fontsource-variable/outfit` et `work-sans`, sous-ensemble latin, `font-display: swap`) : deux connexions tierces et l'envoi de l'adresse IP à Google en moins. Rendu identique. | P0, P3 |
| D-24 | a-25 | Titre de la page | `<h1>` dérivé des paramètres : `Réservations des restaurants pédagogiques et {name2}` (identique tant que `name2` vaut « Aristide ») ; `<title>` du document inchangé (prérendu). | P3 |
| D-25 | b-6 | Essais de mot de passe | Délai progressif côté client, dissuasif : après 3 échecs consécutifs, `Valider` indisponible 5 s, puis 10, 20, 40, 60 s ; *texte proposé* `Trop d'essais : réessayez dans {n} secondes.` | P4 |
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
| a-1 | purge synchrone à la déconnexion (§ 3.3.4), test S8 | P4 |
| a-2, a-3 | D-15, D-14 ; lectures bornées à 30 s | P1, P3 |
| a-4 | actualisation continue ; relecture après une erreur de places | P3 |
| a-5 | D-18 ; erreur du script sous la rangée (`setErrorMap`) | P3 |
| a-6 | formulaire conservé, état relu | P3 |
| a-7 | toast de clôture à 10 h (§ 3.4) | P3 |
| a-8 | un toast à la fois, `priority: 'high'` pour les erreurs | P2 |
| a-9 | focus sur le récapitulatif ; erreur « Choisissez au moins un plat. » reliée au `fieldset` des plats (`aria-describedby`) et focus sur la première quantité | P3 |
| a-10 | D-16 | P3 |
| a-11 | `orderAmounts` dans les impressions et le panneau « Demain » | P5 |
| a-12 | `choisirJour` ne touche qu'un restaurant ; récapitulatif par colonne (D-11) | P3 |
| a-13, a-14 | état collègue dans l'URL de `/collegue`, quitté à la déconnexion | P4 |
| a-15, a-16, a-17 | D-19 | P4 |
| a-18 | D-20 | P4 |
| a-19 | `ConfirmButton` annule son minuteur à chaque armement | P2 |
| a-20 | « Annuler » désactivé pendant l'envoi ; avertissements cumulés | P3 |
| a-21 | code mort non repris ; réannonce seulement si le texte change | P3 |
| a-22 | copie écrite seulement avec etag ; lecture anticipée reprise au temps restant | P1, P3 |
| a-23 | libellés et Page ↑ / ↓ corrigés ; clôture de 10 h dans l'`aria-label` de la case du jour (*proposé* `…, commandes closes`) | P1, P2 |
| a-24 | textes et accords du résumé corrigés, impression dans le même document | P5 |
| a-25 | D-24, D-05 | P3 |
| a-26 | nettoyage CSS et jetons (§ 3.6) | P2, P3 |

---

## 5. Phases de réalisation

### 5.0 Vue d'ensemble

```
P0 squelette ─┬─> P1 domaine, API, données ─┬─> P3 parcours public ─> P4 mode collègue ─> P5 impression ─> P6 parité, préprod ─> P7 bascule
              └─> P2 composants ui/ ────────┘                          (P5 peut démarrer pendant P4, avec des fixtures)
```

| Phase | Contenu | j-p | Sessions | Parallélisable | Statut |
| --- | --- | --- | --- | --- | --- |
| P0 | squelette, outillage (dont react-intl et l'extraction en CI), Pages en Actions, `legacy/` publié, coquille sous `/v2/`, spike d'hydratation | 2,5 | 2 | non | à faire |
| P1 | domaine pur, client API, schémas, copie locale, session, horloge, tests de caractérisation | 4 | 3 | avec P2 | à faire |
| P2 | `src/ui/` (Base UI stylé, calendrier, formulaires pré-liés) | 4 | 3 | avec P1 | à faire |
| P3 | parcours public complet | 5 | 4 | sous-parties (a)-(d) en partie | à faire |
| P4 | mode collègue | 6 | 5 | sous-parties (b)-(e) après (a) | à faire |
| P5 | impression et panneau « Demain » | 2,5 | 2 | avec la fin de P4 | à faire |
| P6 | parité, accessibilité, budget, préproduction et test par les collègues | 4 (+ 1 à 2 semaines calendaires) | 3 | non | à faire |
| P7 | bascule et nettoyage | 1 | 1 | non | à faire |
| **Total** | | **29** (35 avec 20 % de marge) | **23** | | |

La colonne « Statut » est tenue à jour par chaque session (à faire / en cours / terminé + date et commit).

**Règles communes à toutes les sessions** (à recopier dans le message de lancement d'un agent) :
1. Lire `CLAUDE.md`, ce plan (§ 3 et la phase concernée) et **les sections de la spec citées dans les critères** avant d'écrire du code. La spec fait foi pour tout texte et tout comportement ; ce plan fait foi pour l'architecture.
2. Travailler sur la branche d'intégration `claude/frontend-react-migration-lw5zfz` (ou une branche courte qui y revient par PR). Ne jamais modifier `Code.gs`, ni `legacy/` (sauf correctif urgent reporté aussi sur `main`), ni `docs/spec/`.
3. `pnpm check` et `pnpm build` verts avant chaque commit ; tests écrits **avec** le code (tables de cas de la spec) ; pas de `useEffect` sans justification écrite (budget S6) ; aucun `useState` pour des valeurs de formulaire ; composants de route de moins de 40 lignes.
4. En fin de session : mettre à jour la colonne « Statut » ci-dessus et noter dans la description du commit ce qui reste à faire ; signaler toute contradiction trouvée entre ce plan et la spec au lieu de la trancher en silence.
5. Ne pas lancer `vite preview` pour vérifier le site (il fait du SSR) : utiliser `node scripts/serve-pages.mjs`.

### P0 — Squelette et outillage

- **Objectif** : un dépôt prêt à recevoir le code : outillage complet, CI verte, Pages déployé par Actions avec l'ancien site à la racine (inchangé pour les visiteurs) et une coquille React sous `/v2/` ; décision « Start SPA ou Router seul » prise sur mesure.
- **Livrables** :
  - `git mv index.html app.css design-system.css js legacy/` (historique conservé ; `logo.png`, `charte-graphique.pdf`, `Code.gs` restent à la racine) ;
  - configurations reprises de `docs/migration/recherche/toolchain-files/`, adaptées : alias `@/*` partout (`tsconfig.json`, règle `import/no-relative-parent-imports`), `BASE_PATH` par défaut `/reservations-restaurants/`, `.node-version` ≥ 22.22.2, `jsdom` 30, `.gitignore` complété (`playwright-report`, `test-results`, `.tanstack`), `.npmrc` (`save-exact=true`), `pnpm-workspace.yaml` (repris d'element-admin § 1.7 et d'AppResaAristide), `knip` en deux passes (`knip && knip --production`, entrée `e2e/**/*.spec.ts`, ignorer `src/routeTree.gen.ts`), script `typecheck` = `tsc` ;
  - **react-intl** (§ 3.10) : `src/intl/{intl,formats,messages-communs,types.d}.ts`, `RawIntlProvider` dans le `Wrap`, `@formatjs/unplugin` dans `vite.config.ts` et `vitest.config.ts`, script `i18n:extract`, `translations/fr.json` initial, règles `formatjs/*` et `jsPlugins: ["eslint-plugin-formatjs"]` dans `.oxlintrc.json` (liste du § 3.10), `pnpm check` qui commence par l'extraction ;
  - `vite.config.ts` (§ 3.11), `vitest.config.ts` (sans le plugin Start), `playwright.config.ts` (Chromium, `locale: 'fr-FR'`, `timezoneId: 'Europe/Paris'`, serveur `scripts/serve-pages.mjs`) ;
  - `scripts/post-build.mjs`, `scripts/serve-pages.mjs` (émulateur, base paramétrable), `scripts/assembler-pages.mjs`, `scripts/check-budget.mjs` ;
  - `.github/workflows/ci.yml` : `i18n:extract` + `git diff --exit-code translations/fr.json` → `format:check` → `oxlint -f github` → `tsc` → `vitest run` → `knip` → build (`BASE_PATH=/reservations-restaurants/v2/`, `VITE_APPS_SCRIPT_URL` depuis une variable du dépôt) → budget → E2E (Playwright Chromium) → assemblage (legacy à la racine, `dist/client` dans `v2/`, `404.html` de v2 à la racine) → `upload-pages-artifact` → `deploy-pages` (branche d'intégration seulement) ; actions épinglées par SHA (relever les SHA avec `git ls-remote` ; connu : `actions/checkout` v7.0.1 = `3d3c42e5aac5ba805825da76410c181273ba90b1`), `permissions` minimales, `persist-credentials: false`, `concurrency` ; `dependabot.yml` ;
  - `src/router.tsx`, `src/routes/__root.tsx` (shell, `head()`, `<ScriptOnce>` réel ou provisoire), `src/routes/index.tsx` (squelette), `src/routes/$.tsx`, `src/routes/index[.]html.tsx`, `src/styles/{tokens,base,print}.css` (découpage de `legacy/design-system.css`), polices auto-hébergées (D-23) ;
  - `CLAUDE.md` (annexe C), section « Développement » du `README.md`.
- **Actions humaines (propriétaire du dépôt)** : Settings → Pages → Source « GitHub Actions » ; Settings → Environments → `github-pages` → autoriser la branche d'intégration ; variable de dépôt `VITE_APPS_SCRIPT_URL` (valeur actuelle de `APPS_SCRIPT_URL`, `00` § 2.1).
- **Dépendances** : aucune.
- **Critères d'acceptation** :
  - `pnpm check`, `pnpm build` et la CI sont verts (dont un message de la coquille extrait dans `translations/fr.json` et un id inconnu refusé par `tsc`) ; `dist/client/` contient `index.html`, `404.html` et des assets préfixés par la base ;
  - servi par l'émulateur : `/reservations-restaurants/` affiche l'ancien site **à l'octet près** (fichiers identiques à `legacy/`) ; `/reservations-restaurants/v2/` affiche la coquille ; `/reservations-restaurants/v2/collegue` (lien profond) sert le `404.html` et l'appli démarre ; `/reservations-restaurants/v2/index.html` redirige vers `/v2/` ;
  - après le premier déploiement réel : mêmes vérifications sur `https://thegaudis.github.io/reservations-restaurants/` (l'ancien site fonctionne, réservations comprises) ;
  - **spike d'hydratation** (R-01) : une route d'essai pose une copie locale factice par `setQueryData` dans `getRouter()` et rend un contenu synchrone ; un test Playwright relève les erreurs console (#418) et filme le premier rendu. Décision écrite dans ce plan (§ 2.1) : Start conservé (éventuellement avec un `src/client.tsx` personnalisé qui passe `onRecoverableError` à `hydrateRoot`) ou repli « Router seul » ;
  - budget mesuré sur la coquille vide et noté.
- **Tests attendus** : un test Vitest de rendu de route (routeur en mémoire) ; un test Playwright « smoke » (racine legacy, `/v2/`, lien profond, absence d'erreur console).
- **Délégable à un agent** : oui (2 sessions : outillage + CI ; Pages + spike). Consignes : partir des fichiers de `recherche/toolchain-files/` sans les réécrire ; ne pas écrire de code applicatif au-delà de la coquille ; ne rien changer au contenu de `legacy/` ; préparer les actions humaines sous forme de liste dans la PR.
- **Estimation** : 2,5 j-p, 2 sessions.
- **Risques propres** : règles d'environnement Pages (déploiement refusé depuis la branche), bascule de la source Pages (le mode « branche » s'arrête : vérifier immédiatement que l'ancien site est servi), `oxc-transform-react` à garder en `~0.145.0`, `@msw/playwright` et msw 3, Chromium indisponible en local (E2E en CI seulement).

### P1 — Domaine pur, client API, schémas, copie locale, session

- **Objectif** : toute la logique sans interface, prouvée par des tables de cas tirées de la spec.
- **Livrables** : `src/domaine/*` ; `src/intl/{dates,montants}.ts` et leurs tests ; `src/api/*` ; `src/queries/{client,etat,copie-locale,purge}.ts` ; `src/session/session.ts` ; `src/background/{demarrer,inactivite,horloge}.ts` ; `src/test/fixtures/` (JSON des exemples de `02` § 3.2, § 4.3, § 4.4, § 4.5, et de `03` § 1.1) ; tests co-localisés. Reprendre d'AppResaAristide `src/lib/validators.ts`, `money.ts` (`formatEuro` avec `\u00A0`), `dates.ts`, `today.ts` (principe), `convex/model/dates.ts` (`parisDate`, `parisHour`), `convex/model/pricing.ts` (`r1Total`), avec leurs tests.
- **Dépendances** : P0.
- **Critères d'acceptation** (chaque ligne = au moins une table `it.each`) :
  - `00` § 3 et `04` § 8, rendus par l'instance `intl` : `formatDateLongue` (`2026-10-01` → `jeudi 1er octobre 2026`, `2026-10-03` → `samedi 3 octobre 2026`), montant au format `euro` (`12.5` → `12,50\u00A0€`, `'4.95'` → `4,95\u00A0€`, `0` → `0,00\u00A0€`), pluriels ICU (0, 1, 2 couverts ; 1 et 2 tickets restaurant), séparateur `\u00A0— ` devant un prix, textes de montants R2, `emailError` (trois cas, messages exacts) ;
  - `01` § 3.1 à § 3.8 : places restantes (y compris négatives), seuils `capacityClass` (capacité 20 : 20 à 10 `cap-ok`, 9 à 1 `cap-low`, ≤ 0 `cap-full`), statut R2 agrégé et `null` sans plat, `priceR1`, `r2Amounts`, `orderAmounts` (un ticket), textes de montants et prix d'un plat de `intl/montants.ts` (prix 0 non affiché), codage du ticket (idempotent), `serviceMode`, `r2OrdersClosed` à 9 h 59 / 10 h 00 heure de Paris, en hiver et en été, sous `TZ=America/New_York`, jour passé ;
  - `04` § 5.2 et § 5.3 : totaux en direct (`3 couverts · Total : 16,00␣€`, les quatre exemples R2) ; § 7 : lignes et totaux du récapitulatif ; § 8 : formats ;
  - `05` § 2.1, § 2.3, § 3.2 : cases semaine et mois (lundi, 42 cases), libellés (avec la correction a-23), `keyTargetIso` pour chaque touche (Page ↑ / ↓ borné) ;
  - `02` § 1.5 (faux minuteurs) : seconde lecture à 6 000 ms et pas avant, la première réponse gagne, la perdante est annulée, échec seulement si toutes échouent, nouvel essai unique à 1 500 ms, pas de nouvel essai pour `{ error }` ni hors ligne, délai de 30 s par essai ; lecture anticipée consommée une fois et seulement si `since` est identique, doublage au temps restant ;
  - `02` § 1.3, § 1.6, § 4 : `postAction` envoie `Content-Type: text/plain;charset=utf-8` et aucun autre en-tête ; `{ error: 'Mot de passe incorrect.' }` → `MotDePasseRefuse` ; autre `{ error }` → `ErreurMetier` ; HTML ou `TypeError` → `ErreurService` ;
  - `02` § 3.3 et § 5.1 : `unchanged` → même référence, `dataUpdatedAt` rafraîchi, `since` envoyé ; `02` § 5.4 : champs `_…` retirés avant le cache ; schémas acceptant nombres en chaînes et `''` (sans transformer `''` en 0 pour `Prix`) ;
  - `03` § 1.1 : l'exemple JSON exact relu, converti, réécrit à l'identique (aux valeurs près) ; copie de plus de 14 jours ignorée ; copie sans etag acceptée ; JSON invalide ignoré ; aucune écriture depuis l'état complet ni sans etag ; la copie écrite est relue correctement par la logique de `loadCache` de `legacy/js/donnees.js` (test « doré » dans `vm`) ;
  - session : ouverture, fermeture, `fin` ; inactivité de 10 min (activité qui repousse, `visibilitychange`), purge vérifiée sur un `QueryClient` réel (§ 3.3.4) ; horloge : tic à 10 h 00 et à minuit heure de Paris ;
  - couverture de `src/domaine/` ≥ 95 % des lignes.
- **Tests attendus** : unitaires Vitest (environnement `node` pour `domaine` et `api`), faux minuteurs, `fetch` simulé par `vi.stubGlobal` ; facultatif : tests « dorés » qui exécutent les fonctions de `legacy/js/outils.js` et `donnees.js` dans un `vm` jsdom sur les mêmes tables, avec la liste des écarts attendus (heure de Paris, a-23).
- **Délégable à un agent** : oui, 3 sessions dont 2 parallélisables : (a) `domaine/` ; (b) `api/` + `queries/` + copie locale ; (c) session + tâches de fond. Consignes : aucune dépendance à React dans `domaine` et `api` ; chaque règle cite sa section de spec en commentaire ; `domaine/` ne produit aucun texte (nombres et structures) ; les textes et formats passent par `src/intl/` (§ 3.10).
- **Estimation** : 4 j-p, 3 sessions.
- **Risques propres** : `Intl` différent entre Node et navigateurs (comparer avec `\u00A0` explicite, ICU complet de Node 22 ; U+202F des grands montants), ordinal `selectordinal` mal écrit (tester le 1er de chaque mois), transformations non idempotentes du schéma, `AbortSignal.any` absent de vieux Safari (repli `relier()`).

### P2 — Composants `ui/`

- **Objectif** : une bibliothèque de composants stylés aux jetons de la charte, accessibles, sans métier.
- **Livrables** : `src/ui/**` selon le tableau du § 3.5 (boutons, `ConfirmButton`, `ViewToggle`, champs pré-liés et `createFormHook`, `SegmentedRadio`, `NumberField` à boutons −/+, `PriceField`, `CheckboxField`, `PasswordField`, `SubmitButton`, `Collapsible`, `DatePickerPopover`, `CalendarGrid` et `CalendarHeader`, `Toaster` et gestionnaire de toasts, `Alert`, `CapacityPill`, `Skeleton`, `Spinner`, `icons.tsx`) avec leurs CSS Modules ; reprise adaptée de `src/components/form/fields.tsx` d'AppResaAristide (CSS Modules au lieu de Tailwind, `aria-busy`, `Field.Description`).
- **Dépendances** : P0 (P1 seulement pour `keyTargetIso` et les libellés du calendrier : commencer par les autres composants).
- **Critères d'acceptation** :
  - `08` § 1-5 : jetons seulement (aucune couleur, taille ou rayon en dur hors impression), cibles de 48 px (`::after`), anneau de focus, opacité 38 % pour l'inactif, `prefers-reduced-motion` coupe tout, `user-select: none` sur boutons et jauges ;
  - calendrier : `05` § 2.2 à § 2.6 et § 3.1 à § 3.2 (structure, `aria-label` exacts, un seul `tabIndex=0`, toutes les touches, vue qui suit la sélection, focus conservé sans effet) ;
  - `ConfirmButton` : `06` § 5.2 (armement, 4 s, largeur figée, `aria-label` et `title`, désarmement à chaque rendu neuf), a-19 ;
  - champs : `04` § 5.4 et § 10 (libellé relié, `aria-invalid`, `aria-describedby` erreur puis aide, aide masquée en erreur, message retiré dès la correction, focus sur le premier champ en erreur dans l'ordre du DOM) ;
  - `NumberField` : libellés français (`aria-roledescription`, boutons −/+), `null` → 0 ;
  - `Toaster` : un seul toast (a-8), 3,5 s, types succès / neutre / erreur, erreurs prioritaires ;
  - date picker : `06` § 3.2 et § 3.3 (flèches = focus seulement, jours passés `aria-disabled`, « déjà ouvert », Échap, clic extérieur, retour du focus).
- **Tests attendus** : Testing Library + user-event pour chaque composant (rôles, noms accessibles, clavier, états `data-*`) ; table de toutes les touches du calendrier ; faux minuteurs pour `ConfirmButton`.
- **Délégable à un agent** : oui, 3 sessions : (a) boutons, retours (toasts, alertes, jauge, squelette), bascules, icônes ; (b) formulaires pré-liés ; (c) calendrier et sélecteur de date. Consignes : aucun import de `api/`, `queries/` ni de données métier ; libellés métier fournis par props (déjà formatés par `intl`) ; textes génériques propres à `ui/` (« Confirmer ? », « Notifications », « champ numérique », boutons −/+) en messages react-intl `ui.*` ; Base UI enveloppé une seule fois ; consulter `recherche/ui-forms.md` § 2-4 et § 11.
- **Estimation** : 4 j-p, 3 sessions.
- **Risques propres** : libellés anglais de Base UI oubliés, `Field.Error` non annoncé (focus + `aria-describedby`), désélection du `ToggleGroup`, accent perdu dans les portails, `useStore` de TanStack Form déprécié (utiliser `useSelector` ou `form.Subscribe`).

### P3 — Parcours public

- **Objectif** : la page publique complète, identique à l'actuelle plus les décisions du § 4.
- **Livrables** : `routes/index.tsx` complet ; `features/page/*` ; `features/calendrier/*` (navigation par l'URL, `domaine/navigation.ts`) ; `features/r1/*`, `features/r2/*`, `features/reservation/*` ; `mutations/reservations.ts` ; `queries/use-etat.ts` et `<ActualisationAuto/>` ; lecture anticipée réelle ; formulaires publics chargés à la demande (`lazy()`, préchargés au survol ou au focus de « Réserver » et pendant l'inactivité du navigateur) ; budget contrôlé en CI.
- **Dépendances** : P1, P2.
- **Critères d'acceptation** :
  - en-tête, colonnes, pied : `04` § 2, `08` § 7 (ordre de la page, points de rupture 760 / 640 / 600 / 520 px, `pointer: coarse`), D-24 ;
  - calendriers : `05` § 2 et § 3 câblés sur l'URL (§ 3.2 de ce plan), sélection sans effet sur l'autre restaurant (a-12) ;
  - fiches : ordre exact `05` § 5.1 et § 6.2, états `05` § 5.2 et § 6.5, jauges `05` § 4.5, jour sans service `05` § 4.3, cut-off `01` § 3.7 et `04` § 4.3, D-02 ;
  - formulaires : `04` § 5.1 à § 5.4 (libellés, attributs, placeholders, ordre, validations et messages exacts, focus d'ouverture et défilement, retour du focus sur « Réserver » à l'annulation, repli de la liste R2, ticket → sur place et aide), D-17, D-18 ;
  - envoi : `04` § 6.1 à § 6.3 (bouton occupé, corps exacts avec `trim()`, `requestId` conservé après erreur et renouvelé à la réouverture, cut-off repris à l'envoi avec toast neutre, réponses `_duplicate` / `_bookingResult` / `_emailStatus`, erreurs du script), a-6, a-20, D-14, D-15, D-16 ;
  - récapitulatif : `04` § 7 et `08` § 6.1 (lignes, total, avertissements cumulés, contact d'annulation, `Fermer`, `role="status"`, focus), affiché au-dessus de la fiche tant que le jour reste sélectionné ;
  - chargement : `03` § 2 et § 3 (squelette, copie locale, encadré d'échec et textes de § 3.1, `Réessayer`), § 5.1 et § 5.2 (actualisation, a-4 : saisie et focus intacts après une actualisation), § 5.3 (10 h, a-7), a-21, a-22, D-05 ;
  - catalogue `04` § 9 entièrement couvert par des tests ; accessibilité `04` § 10 ;
  - écrans `09` G-01 à G-05, G-07, P-01 à P-17 ;
  - budget S3 respecté ; 0 à 2 effets (S6).
- **Tests attendus** : intégration Testing Library + msw 3 (`setupServer`, `onUnhandledFrame: 'error'`) par état d'écran ; routes en mémoire (`createMemoryHistory`) pour les search params (fallbacks, `?connexion=1`, `reserver` sur un jour non réservable) ; un E2E « réserver R1 » et « commander R2 avant et après 10 h » (`page.clock`).
- **Délégable à un agent** : oui, 4 sessions : (a) page, en-tête, états de chargement, actualisation, lecture anticipée ; (b) calendriers câblés et fiches ; (c) formulaire R1, envoi et récapitulatif ; (d) formulaire R2. (b) après (a) ; (c) et (d) en parallèle après (b). Consignes : chaque texte est un message react-intl à id explicite (`public.…`) dont le `defaultMessage` est recopié de `04` § 9 et la `description` cite la section ; données lues par `useEtat(select)` dans les feuilles, pas de props sur cinq niveaux ; état du formulaire uniquement dans TanStack Form ; `requestId` par `useState(() => nouvelIdentifiant())` dans le composant monté avec `key={`${restaurant}:${date}`}`.
- **Estimation** : 5 j-p, 4 sessions.
- **Risques propres** : budget JS (R-15), hydratation selon la décision P0, `?reserver=1`, `handleSubmit` qui relance l'erreur, `defaultValues` lues au montage seulement (clé par jour).

### P4 — Mode collègue

- **Objectif** : tout le mode collègue, avec une session sûre.
- **Livrables** : `routes/collegue.tsx` (garde, schéma, loader de l'état complet) ; `features/page/SelecteurMode.tsx` (Client / Collègue, panneau de connexion `?connexion=true`, œil, Entrée, Échap, D-25) ; `mutations/collegue.ts` ; `features/collegue/*` ; branchement de la déconnexion (§ 3.3.4) et de l'inactivité ; panneau `Demain` (totaux ; détails et impression en P5).
- **Dépendances** : P3 (page et fiches), P1 (session).
- **Critères d'acceptation** :
  - accès : `06` § 1.1 à § 1.8 (attributs du sélecteur, comportements, connexion refusée sur copie locale, textes d'erreur, toasts, conservation du mot de passe, déconnexions, mot de passe changé, actualisation par `getAdminState`) ; garde : rechargement de `/collegue?r1=…&editResa=…` → connexion → retour exact ;
  - **sécurité** (S8) : après chaque déconnexion, cache et DOM purgés (§ 3.3.4) ; mot de passe absent de `localStorage`, `sessionStorage`, de l'URL, des clés de requête et des messages de log ; a-1, a-13, a-14 ;
  - panneaux : `06` § 2.1 (D-07, première partie), § 2.2 (Paramètres, D-20), § 3 (sélecteur de date), § 4.1 à § 4.3 (ouvrir un jour R1 et R2, lignes de plats, case ticket, D-19), § 5.1 et § 5.2 (modifier ce jour, D-09 ; suppressions en deux clics, D-21), § 6 (plats, D-22), § 7 (liste et modification des réservations, D-04), § 8 (ajout d'une personne, `requestId`, relecture de l'état complet, toasts) ;
  - corps des requêtes conformes à `06` § 10 et `02` § 4.7 (champ `password` présent seulement pour les actions protégées, jamais pour `addBookingR1` / `addBookingR2Multi`) ;
  - écrans `09` G-08, L-01, C-01 à C-30 (hors impression).
- **Tests attendus** : intégration par panneau avec msw (état mutable) ; tests de la garde et du retour ; faux minuteurs pour l'inactivité dans un vrai rendu ; test S8 ; E2E « connexion → ouvrir un jour → ajouter une personne → déconnexion par inactivité (`page.clock.fastForward('10:01')`) → plus aucun nom ».
- **Délégable à un agent** : oui, 5 sessions : (a) session, garde, connexion, déconnexion, inactivité, mot de passe changé (à faire en premier) ; (b) ouvrir et modifier un jour, sélecteur de date ; (c) plats ; (d) réservations : liste, modification, ajout ; (e) paramètres et panneau « Demain ». Consignes : le mot de passe n'est lu que dans `mutationFn` / `queryFn` via le store ; jamais en prop, jamais en clé ; chaque panneau ouvert = un paramètre d'URL du § 3.2.
- **Estimation** : 6 j-p, 5 sessions.
- **Risques propres** : course entre une lecture et une écriture (`cancelQueries`), suspension au passage d'une clé à l'autre (`id` calculé avant `ouvrir`), store Zustand singleton dans les tests (réinitialiser avec `useSessionStore.setState(initial, true)`), minuteurs ralentis en arrière-plan.

### P5 — Impression et panneau « Demain »

- **Objectif** : les quatre documents imprimés et le panneau « Demain » fusionné.
- **Livrables** : `ui/print/*`, `styles/print.css`, `features/impression/*`, `domaine/impression.ts` complété, panneau `Demain` complet (D-07).
- **Dépendances** : P4 (a) pour l'accès ; les documents peuvent être écrits sur fixtures pendant P4.
- **Critères d'acceptation** :
  - `07` § 2 (format A4 paysage et marges, structure de haut en bas, couleurs par restaurant, tableaux, total, signature, pied imprimé dans les boîtes de marge, date d'impression), § 3 (liste R1 : colonnes, N° table, Chef de rang, totaux), § 4 (liste R2 : regroupement par client, récapitulatif par plat), § 5 (panneau à l'écran, textes corrigés de a-24, D-03), § 6 et § 7 (résumés du lendemain), titres de document (nom du PDF) ;
  - un ticket par commande dans tous les totaux (a-11, invariant 5) ; tri D-08 ; réservations orphelines exclues ;
  - impression sans nouvelle fenêtre ; rien d'autre que le document à l'impression ; l'appli revient intacte après `afterprint` (focus rendu au bouton) ;
  - écrans `09` C-01, C-03, I-01 à I-04.
- **Tests attendus** : rendu des documents sur fixtures (textes, lignes, ordre, totaux exacts) ; E2E Chromium : `window.print` intercepté, `page.emulateMedia({ media: 'print' })`, `page.pdf()` pour vérifier le format paysage et le nombre de pages d'une longue liste.
- **Délégable à un agent** : oui, 2 sessions : (a) mécanique et documents R1 ; (b) documents R2, panneau « Demain ». Consignes : suivre `07` ligne par ligne, y compris les colonnes vides et les cas « Aucune réservation. ».
- **Estimation** : 2,5 j-p, 2 sessions.
- **Risques propres** : boîtes de marge seulement dans Chromium, Safari iOS, polices pas encore chargées (attente ≤ 2 s), `@page` global (page nommée obligatoire).

### P6 — Parité et préproduction

- **Objectif** : prouver la parité, l'accessibilité et le budget, puis faire valider la préproduction par les collègues sur le vrai script.
- **Livrables** : `e2e/mocks/apps-script.ts` complet (toutes les actions de `02` § 4 avec leurs erreurs exactes, `unchanged`, `_duplicate`, ajustements R2, verrou occupé, mot de passe changé, première lecture lente de 12 s, page HTML d'erreur sans CORS) ; suites E2E ; `docs/migration/parite.md` (matrice : chaque ligne de `09` → test qui la couvre → statut ; écarts du § 4.2) ; analyse axe de chaque état ; rapport de budget ; correctifs.
- **Dépendances** : P3, P4, P5.
- **Critères d'acceptation** :
  - S1 à S8 du § 1.5 atteints ; parcours E2E : affichage immédiat depuis une copie locale préremplie (`page.addInitScript`), `{ unchanged }` sans nouveau rendu, lecture doublée (`page.clock`), réservation R1, commande R2 avec ajustement, doublon, cut-off à 10 h formulaire ouvert, échec de chargement hors ligne et en ligne, connexion, chaque action collègue, déconnexion par inactivité et par mot de passe changé, impressions ;
  - axe sans violation sur : G-01, G-02, G-03, G-04 (semaine et mois), G-05, P-05, P-06, P-13, P-14, P-15, L-01, G-08, C-02, C-04, C-05, C-06, C-11, C-12, C-21, C-23 ;
  - vérification manuelle : NVDA ou VoiceOver sur le calendrier et un formulaire ; Safari iOS et les tablettes de l'établissement ; impression sur un poste du lycée ;
  - préproduction `/v2/` utilisée 1 à 2 semaines par les collègues avec le vrai script (vraies réservations) ; retours traités ou reportés ; accord écrit (S9).
- **Tests attendus** : Playwright + `@msw/playwright` (mode strict), `timezoneId: 'Europe/Paris'`, `locale: 'fr-FR'` ; facultatif : la même suite (étiquette `@parite`) jouée contre `legacy/` pour les comportements inchangés.
- **Délégable à un agent** : partiellement : faux script, suites E2E, axe, matrice et correctifs oui (3 sessions) ; test par les collègues et validation non.
- **Estimation** : 4 j-p, 3 sessions, plus 1 à 2 semaines calendaires.
- **Risques propres** : comportement réel du script (302, lenteurs, pages d'erreur) différent du faux ; données réelles en préproduction (rappeler que `/v2/` écrit dans la vraie feuille) ; `localStorage` partagé avec l'ancien site (R-21).

### P7 — Bascule et nettoyage

- **Objectif** : le nouveau site à la racine, l'ancien retiré, retour arrière possible en moins de 15 minutes.
- **Livrables** : tag `v1-final` ; workflow sans assemblage (`BASE_PATH=/reservations-restaurants/`, artefact = `dist/client`) ; `legacy/` supprimé ; `scripts/assembler-pages.mjs` supprimé ; README réécrit (présentation, installation du script inchangée, développement, déploiement, retour arrière) ; `CLAUDE.md` à jour ; E2E de production en lecture seule (`e2e/smoke-production.spec.ts`, aucune écriture) ; message aux collègues.
- **Dépendances** : P6 validée.
- **Critères d'acceptation** : checklist du § 7 entièrement cochée ; E2E de production vert ; retour arrière répété une fois à blanc (sur une branche de test ou en préproduction).
- **Tests attendus** : E2E de production (chargement, copie locale, calendriers, ouverture d'un formulaire sans envoi).
- **Délégable à un agent** : partiellement : code, workflow et README oui (1 session) ; réglages Pages, fusion dans `main` et communication non.
- **Estimation** : 1 j-p, 1 session.
- **Risques propres** : cache de 10 min de Pages (anciens onglets), chunk introuvable dans un onglet resté ouvert, oubli d'un réglage (environnement, variable de dépôt).

---

## 6. Risques et pièges

### 6.1 Points où les rapports de recherche s'écartent des arbitrages

Les arbitrages de ce plan s'appliquent ; ces écarts sont signalés pour qu'aucune session ne reprenne par erreur la proposition d'un rapport.

| Rapport | Proposition du rapport | Arbitrage retenu |
| --- | --- | --- |
| `tanstack-start.md` § 4 | routes par restaurant (`/r1/$jour`, `/collegue/r1/$jour`), `?mois=` | page unique à deux colonnes, paramètres `r1`, `r2`, `r1vue`… (§ 3.2) |
| `tanstack-start.md` § 4, `react-architecture.md` § 2, `element-admin-reference.md` § 11.5 | copie locale lue dans un effet, un composant client ou un persisteur expérimental ; lecture anticipée jugée inutile | restauration **synchrone** avant le routeur et `<ScriptOnce>` conservé ; risque d'hydratation traité par le spike de P0 (R-01) |
| `tanstack-query.md` § 3.2 | nouveau format `{ v, savedAt, data }` et nouvelle clé `-v2` | même clé et même format `reservations-cache-v1` (invariant 2, compatibilité avec l'ancien site pendant la préproduction) |
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
| `toolchain.md` § 5 | `exactOptionalPropertyTypes: true` (AppResaAristide et element-admin le désactivent) | `true` au départ ; passer à `false` seulement si les types de Base UI ou TanStack Form l'imposent, décision notée dans `CLAUDE.md` |

### 6.2 Risques consolidés et parades

| # | Risque ou piège | Parade | Phase |
| --- | --- | --- | --- |
| R-01 | **Hydratation de la coquille Start** : la coquille prérendue montre le squelette, alors que le premier rendu client sort de la copie locale ; React lève l'erreur #418 (issues #8473, #6455), jette le HTML et refait le rendu (flash possible). | Spike de P0 dans un vrai navigateur (CI). Racine neutre (aucun lien actif, rien qui dépende de l'URL), route `$.tsx`. Si l'erreur est seulement journalisée sans flash visible : `src/client.tsx` avec `onRecoverableError` filtré. Sinon : **repli Router seul** (§ 2.1), sans hydratation (`createRoot`). | P0 |
| R-02 | Le `loader`, le `beforeLoad` et le code de niveau module de la racine, de `router.tsx` et de leurs imports s'exécutent **au build** dans Node : `localStorage` fait échouer le prérendu ; une donnée chargée là serait figée dans la coquille. | Garde `typeof window` dans `getRouter()` ; aucun loader à la racine ; garde de session sur `/collegue` seulement ; aucun appel au script pendant le build. | P0 |
| R-03 | `vite preview` d'un projet Start fait du **vrai SSR** : il ne reflète pas Pages. | `scripts/serve-pages.mjs` pour la prévisualisation et l'E2E ; consigne dans `CLAUDE.md`. | P0 |
| R-04 | En mode « branche », **Jekyll** ignore les fichiers commençant par `_` (chunks `_app-xxxx.js`) ; `upload-pages-artifact` v4+ exclut les fichiers cachés. | Source Pages « GitHub Actions » (pas de Jekyll) ; `.nojekyll` inoffensif en plus ; aucun fichier caché nécessaire dans l'artefact. | P0 |
| R-05 | Pages sert tout avec `Cache-Control: max-age=600`, non réglable : un `index.html` ancien peut rester 10 min. | Assets hachés ; prévoir 15 min dans la checklist ; pas de service worker. | P7 |
| R-06 | Après un déploiement, un onglet ouvert demande un chunk disparu (il reçoit le HTML de la 404). | Rechargement automatique unique du routeur (`lazyRouteComponent`) et écouteur `vite:preloadError` (garde en `sessionStorage`) pour les `import()` manuels. | P3 |
| R-07 | **CORS d'Apps Script** : tout en-tête non simple déclenche un pré-vol `OPTIONS` que le script ne gère pas. | `GET` sans en-tête ; `POST` en `Content-Type: text/plain;charset=utf-8` ; jamais `application/json`, `redirect: 'manual'` ni `mode: 'no-cors'` ; test unitaire sur les en-têtes envoyés. | P1 |
| R-08 | Le script répond `302` (le navigateur suit en `GET`) ; un déploiement réglé sur « compte Google » redirige vers une page de connexion (erreur CORS permanente). | `redirect: 'follow'` (défaut) ; `preconnect` vers `script.googleusercontent.com` ; README : déploiement « Tout le monde ». | P1, P7 |
| R-09 | Pages d'erreur HTML de Google : sans CORS → `TypeError` (indiscernable d'une coupure) ; avec CORS → `SyntaxError` au `json()`. | Les deux deviennent `ErreurService` ; message selon `navigator.onLine` ; nouvel essai pour les lectures seulement. | P1 |
| R-10 | Lenteur du script (démarrage à froid parfois > 10 s), pas d'heure serveur. | Lecture anticipée, copie locale, lecture doublée, délai de 30 s par lecture ; heure de Paris côté client ; D-15 pour les écritures. | P1, P3 |
| R-11 | Interrompre un `POST` n'annule pas l'écriture ; un rejeu automatique créerait des doublons. | Mutations `retry: false`, `networkMode: 'always'`, aucun délai d'expiration ; `requestId` conservé pour le nouvel essai manuel. | P1, P3 |
| R-12 | React 19 et le routeur remontent la CSS (`precedence`) **avant** le script inline : la lecture anticipée attend la CSS (inverse de l'ordre actuel). Un `preconnect` sans `crossorigin` ouvre une connexion inutile pour un `fetch` CORS. | Accepté (CSS hachée en cache aux visites suivantes, lecture toujours partie avant le bundle) ; `crossOrigin: 'anonymous'` ; option mesurée seulement si besoin : `<link rel="preload" as="fetch">` (sans `since`). Avec le repli Router seul, le script repasse avant la CSS dans `index.html`. | P3 |
| R-13 | **Sans `.gitignore`, oxlint et tsgolint analysent `node_modules`** (processus tué après 60 s dans l'essai). | `.gitignore` livré dès le premier commit de P0 ; `ignorePatterns` en plus. | P0 |
| R-14 | Règles `jsPlugins` qui exigent les types **silencieusement inactives** (`@tanstack/query/no-void-query-fn`) ; `plugins` remplace la liste par défaut ; `react/rules-of-hooks` est en `pedantic` ; `no-unnecessary-condition` et `prefer-optional-chain` en `nursery`. | Config de `toolchain-files/` telle quelle (déjà réglée) ; monter `oxlint` et `oxlint-tsgolint` ensemble ; `typescript/no-deprecated` en erreur (attrape `ensureQueryData`, `FormEvent`) ; règles `formatjs/*` non typées, donc actives (prouvé en production chez element-admin). | P0 |
| R-15 | **Budget JS** : estimation du chemin public autour de 200 kB gzip (React, Router, Start, Query, Form, Base UI, react-intl 7,6 kB sans analyseur ICU) ; une page unique n'est pas découpée par route ; `validateSearch` reste dans le chunk d'entrée. | Mesure en CI dès P0 (S3) ; formulaires publics, mode collègue et impression chargés à la demande ; valibot (pas zod) ; imports Base UI par composant ; alias `no-parser` de FormatJS en production ; si dépassement : `rollup-plugin-visualizer`, report du `NumberField` ou du `Collapsible` hors du chemin initial. | P0, P3 |
| R-16 | **Base UI** : libellés anglais codés en dur (`Increase`, `Decrease`, `Number field`), portails qui perdent l'accent, `Field.Error` non annoncé, `ToggleGroup` qui se désélectionne, `NumberField` qui renvoie `null` et refuse les `datalist`, `Form` de Base UI qui ignore le prop `invalid`, portails sous iOS. | Enveloppes uniques de `ui/` (libellés français, `className` d'accent sur les portails, focus sur le premier champ invalide, valeur vide ignorée, `null` → 0, `PriceField` texte) ; pas de `Form` Base UI ; `isolation: isolate`, `body { position: relative }`, champs ≥ 16 px. | P2 |
| R-17 | **TanStack Form** : `handleSubmit` relance l'erreur d'`onSubmit` ; erreurs Standard Schema = objets ; `defaultValues` lues au montage seulement ; envoi arrêté avant la validation des champs non touchés ; erreur croisée affichée au 2e envoi seulement ; `useStore` déprécié ; `children=` en prop. | `try/catch` dans `onSubmit` ; `errorText()` ; formulaire monté avec une `key` (jour, ouverture) ; `canSubmitWhenInvalid: true` et `form.validate('change')` avant `handleSubmit()` (AppResaAristide) ; `useSelector` ou `form.Subscribe` avec sélecteur ; enfant en JSX. | P2, P3 |
| R-18 | **TanStack Query** : un minuteur par observateur (`refetchInterval` partagé = lectures en double) ; `retry` dans `queryOptions` passe avant les défauts de test ; `queryClient.query()` force `retry: false` si `retry` n'est pas défini ; `ensureQueryData`, `prefetchQuery`, `fetchQuery` dépréciés ; `queryFn` qui renvoie `undefined` ; `select` qui renvoie des `Map` ; secret dans une clé ; variables de mutations (noms) gardées 5 min ; mutations mises en pause hors ligne. | `<ActualisationAuto/>` unique ; `retry` dans les défauts du client ; `query()` dans les loaders ; `no-deprecated` ; relecture sans `since` dans le cas limite ; résultats en objets et tableaux, index en `WeakMap` ; `id` de session dans la clé ; `getMutationCache().clear()` à la déconnexion ; `networkMode: 'always'`. | P1 |
| R-19 | **Search params** : `?reserver=1` ou `?connexion=1` sont des nombres (format « JSON d'abord ») ; « aujourd'hui » comme valeur par défaut rendrait `validateSearch` impur ; `location.pathname` est sans basepath ; un `<Link>` actif reçoit `aria-current="page"`. | Liens écrits avec `search={{ … }}` et `v.fallback` ; « aujourd'hui » résolu dans le composant ; jamais de base en dur (`Link`, `to`, `import.meta.env.BASE_URL`) ; cases du calendrier en `<button>`. | P3 |
| R-20 | **Dates et formats** : `Intl.NumberFormat` met U+202F et U+00A0 ; Temporal absent de Safari stable ; `new Date('YYYY-MM-DD')` est en UTC ; changements d'heure ; ICU variable selon les moteurs. | format `euro` partagé, jamais d'espace codée en dur autour d'un montant ; chaînes ISO + arithmétique UTC ; `parisDate` / `parisHour` ; tests autour des changements d'heure et sous deux fuseaux ; comparaisons avec `\u00A0` explicite. | P1 |
| R-21 | **`localStorage` partagé** entre l'ancien site (racine) et `/v2/` pendant la préproduction (même origine `thegaudis.github.io`) ; l'ancien site écrit des copies sans etag après une session collègue. | Format v1 écrit à l'identique (test doré avec `loadCache`) ; lecture tolérante (etag facultatif) ; aucune nouvelle clé ; `reservations-textes` jamais écrite par le nouveau site. | P1, P6 |
| R-22 | Navigateurs anciens (tablettes, vieux iPad) : `AbortSignal.any` / `timeout` (Safari 17.4), `crypto.randomUUID` (Safari 15.4), `:has()` (Safari 15.4) ; cible de build Vite par défaut `safari16.4`. | `relier()` et `delai()` maison ; `nouvelIdentifiant()` avec repli de `02` § 5.3 ; inventaire des appareils de l'établissement en P6 ; `build.target` abaissé si nécessaire. | P1, P6 |
| R-23 | React Compiler Rust expérimental ; `oxc-transform-react` 0.152 incompatible avec plugin-react 6.1. | Épingler `~0.145.0` ; plan B du § 2.1 ; les règles du compilateur (oxlint) restent actives dans tous les cas. | P0 |
| R-24 | TypeScript 7 : `baseUrl` supprimé, `types` vaut `[]` par défaut, pas d'API JS ; `@types/react` 19.3 déprécie `FormEvent`. | `paths` sans `baseUrl`, `types: ["vite/client"]` ; `SubmitEvent` / `ChangeEvent` ; `@typescript/typescript6` seulement pour un outil qui l'exigerait. | P0 |
| R-25 | Zustand : store singleton abonné plusieurs fois (tests, HMR) ; composant abonné au store entier ; `set` à chaque `pointermove`. | `demarrerTachesDeFond` idempotent (arrête l'instance précédente) et désabonnement gardé ; sélecteur obligatoire (revue) ; activité notée dans une variable de module. | P1 |
| R-26 | Minuteurs ralentis ou gelés (onglet caché, veille, retour par le cache de navigation) : déconnexion tardive, cut-off ou minuit manqués. | Comparaison d'horodatages + revérification sur `visibilitychange` et `pageshow` ; horloge recalculée au retour. | P1 |
| R-27 | Impression : boîtes de marge `@page` seulement dans Chromium 131+, `@page` global, polices pas encore chargées, Safari iOS. | Page nommée `liste` ; attente de `document.fonts.ready` ≤ 2 s ; essai sur les postes du lycée (P6) ; « Page x / y » absent hors Chromium, accepté. | P5 |
| R-28 | Outils de test : Chromium non téléchargeable en local (E2E en CI seulement) ; MSW 3 ne modifie plus `setTimeout` (avancer les faux minuteurs) ; `@msw/playwright` 0.x avec msw 3 ; Vitest ne doit pas charger le plugin Start ; `routeTree.gen.ts` absent fait échouer `tsc`. | Job E2E en CI ; faux minuteurs avancés explicitement ; repli `page.route` ; `vitest.config.ts` séparé ; `routeTree.gen.ts` commité et contrôlé (`git diff --exit-code` après build). | P0, P6 |
| R-29 | Pages : l'environnement `github-pages` peut refuser un déploiement depuis la branche d'intégration ; passer la source en « GitHub Actions » arrête le déploiement par branche de `main`. | Actions humaines de P0 faites ensemble et vérifiées aussitôt ; `main` gelé pour l'ancien site pendant la migration (correctif urgent : appliqué dans `legacy/` et sur `main`). | P0 |
| R-30 | La préproduction écrit dans la **vraie** feuille et envoie de vrais e-mails. | Le dire aux collègues ; utiliser des jours de test supprimés ensuite, ou des réservations réelles assumées. | P6 |
| R-31 | Code collègue ou formulaires chargés à la demande : bref écran d'attente à la première ouverture. | Préchargement au survol, au focus et pendant l'inactivité du navigateur ; `pendingComponent` discret. | P3, P4 |
| R-32 | **react-intl / FormatJS** : ids en double, apostrophes et accolades ICU, `<FormattedMessage>` dans un attribut, HTML dans un message, espaces normalisées (dont U+00A0) si `preserveWhitespace` manque, `translations/fr.json` pas à jour, « ⚠ » refusé par `no-emoji`. | `formatjs extract --throws` + `git diff --exit-code` en CI ; ids typés (`FormatjsIntl`) ; `intl.formatMessage` pour les attributs ; balises de `defaultRichTextElements` seulement ; `preserveWhitespace: true` partout ; tests de chaînes exactes ; icône SVG pour « ⚠ » (§ 3.10). | P0, P1 |

---

## 7. Checklist de bascule GitHub Pages

Reprise et complétée de `recherche/react-architecture.md` § 10. À cocher dans la PR de bascule.

**Avant (fin de P6)**
- [ ] Accord écrit des collègues sur la préproduction (S9) ; matrice de parité complète ; S1 à S8 verts.
- [ ] Source Pages déjà sur « GitHub Actions » depuis P0 ; l'environnement `github-pages` autorise `main`.
- [ ] Variable de dépôt `VITE_APPS_SCRIPT_URL` = URL `/exec` du déploiement actuel (même déploiement, déploiement « Tout le monde ») ; bandeau D-05 absent en préproduction.
- [ ] Pas de `CNAME` (site de projet) : `BASE_PATH=/reservations-restaurants/` ; si un domaine arrive, `public/CNAME` et `BASE_PATH=/`.
- [ ] Tag `v1-final` posé sur le dernier commit de la branche d'intégration qui publie encore `legacy/` à la racine ; procédure de retour arrière écrite dans le README et répétée à blanc.
- [ ] Prévenir les collègues (date, « même usage, nouveau rendu », session collègue toujours perdue au rechargement).

**Bascule**
- [ ] Fusion dans `main` du commit de bascule : workflow sans assemblage, artefact = `dist/client` (`index.html` + `404.html` + `assets/`), `legacy/` et `scripts/assembler-pages.mjs` supprimés.
- [ ] Déploiement vert ; `https://thegaudis.github.io/reservations-restaurants/` sert le nouveau site après au plus 10 min de cache (`max-age=600`) ; `…/index.html` redirige vers `/` ; un lien profond (`…/collegue`) sert `404.html` puis l'appli.
- [ ] `localStorage` : une copie `reservations-cache-v1` écrite par l'ancien site est relue au premier affichage (affichage immédiat pour les visiteurs habituels) ; `reservations-textes` lue en secours seulement.
- [ ] Aucun service worker n'existait : rien à désinscrire ; n'en ajouter aucun.
- [ ] E2E de production en lecture seule vert (`e2e/smoke-production.spec.ts`).
- [ ] Vérification manuelle : une vraie réservation R1 et une commande R2 (puis suppression par un collègue), connexion collègue, impression.

**Après**
- [ ] README à jour (installation : `pnpm install`, `pnpm build`, workflow Pages ; section Apps Script inchangée ; retour arrière).
- [ ] `CLAUDE.md` à jour ; ce plan marqué « terminé » ; `docs/spec/` conservée comme référence.
- [ ] Un mois après : retirer la lecture de secours de `reservations-textes` et supprimer cette clé au démarrage (dans `queries/copie-locale.ts`, pas dans un effet).
- [ ] Transmettre l'annexe B au responsable du script.

**Retour arrière (moins de 15 min, cache compris)** : `git revert` du commit de bascule sur `main` (ou relancer le workflow sur `v1-final` en autorisant ce tag dans l'environnement `github-pages`) ; l'ancien site est republié à la racine ; la copie locale reste compatible (même format) ; aucune action côté script.

---

## 8. Annexes

### Annexe A — Correspondance fichiers actuels → modules cibles

| Actuel | Fonctions principales (`00` § 4) | Modules cibles |
| --- | --- | --- |
| `index.html` (script du `<head>`) | `APPS_SCRIPT_URL`, `CACHE_KEY`, `CACHE_MAX_AGE`, `earlySince`, `stateUrl`, `earlyGet` | `config.ts` (`VITE_APPS_SCRIPT_URL`), `domaine/constantes.ts`, `api/lecture-anticipee.ts`, `routes/__root.tsx` (`<ScriptOnce>`, `head()`, `preconnect`) |
| `index.html` (corps) | en-tête, colonnes, pied, `#toast`, `#loader`, squelettes | `features/page/*`, `ui/feedback/*` ; le voile disparaît (§ 4.2) |
| `js/donnees.js` | `state`, `saveCache` / `loadCache`, `renderTexts` / `saveTexts` | cache Query `['etat', …]`, `queries/copie-locale.ts`, `features/page/EnTete.tsx` |
| | `hedgedRead`, `apiGet`, `postJson`, `apiPost`, `fetchAdminState`, `adminSessionExpired`, `writeSeq`, `adoptBookingState` | `api/transport.ts`, `api/lecture-doublee.ts`, `api/etat.ts`, `api/actions.ts`, `queries/etat.ts`, `queries/client.ts` (`onError`), `mutations/*` (`cancelQueries` + `setQueryData`) |
| | `withTicketFlags`, `plainName`, `withTicketMark`, `isTicket`, `flagTicket` | `api/schemas.ts` (transformation idempotente), `domaine/tickets.ts` |
| | `remainingR1`, `remainingItem`, `itemsR2`, `idx`, `capacityClass`, `dayStatusR1/R2`, `sumBy` | `domaine/places.ts` |
| | `r2Amounts`, `amountsText`, `itemAmountText`, `itemPriceText`, `ticketsText` | `domaine/prix.ts` (nombres) + `intl/montants.ts` (textes) |
| | `dayHasTicket`, `serviceMode`, `r2OrdersClosed`, `r2ClosedMsg`, `R2_CUTOFF_HOUR` | `domaine/tickets.ts`, `domaine/cloture.ts`, `intl/messages-communs.ts` (message de clôture) |
| | `loadAll`, `showLoadError`, `retryLoad`, `setBusy` / `clearBusy`, `showLoader` / `hideLoader` | `routes/*` (`loader`, `errorComponent`), `features/page/EncadreEchec.tsx`, `ui/form/SubmitButton.tsx`, `ui/button/*` (`aria-busy`) |
| `js/outils.js` | `toISO`, `todayISO`, `addDaysISO`, `mondayOf`, `calState` | `domaine/dates.ts`, `domaine/paris.ts`, `background/horloge.ts`, URL (`r1`, `r2`, `r1vue`…) |
| | `formatDate`, `formatEuro`, `plural`, `dash`, `gaugeStyle` | `intl/dates.ts`, format `euro`, pluriels ICU, messages (`intl/`), `domaine/jauge.ts` |
| | `showToast` | `ui/feedback/toast.ts` |
| | `confirmClick`, `disarm` | `ui/button/ConfirmButton.tsx` |
| | `checkFields`, `fieldError`, `blockError`, `markInvalid`, `linkLabels`, `focusFirstError`, `emailError`, `contactFieldHtml` | `ui/form/*` (Base UI `Field` + TanStack Form), `domaine/validation.ts` |
| `js/calendrier.js` | `buildWeekCells`, `buildMonthCells`, `weekLabel`, `monthLabel`, `keyTargetIso`, `calKey` | `domaine/dates.ts`, `intl/dates.ts`, `ui/calendar/CalendarGrid.tsx` |
| | `navCal`, `setCalMode`, `jumpToday`, `selectDate`, `pickDate`, `calTransition` | `domaine/navigation.ts`, `features/calendrier/CalendrierRestaurant.tsx`, option `viewTransition` du routeur |
| | `renderDetailR1`, `renderDetailR2`, `emptyDayCardHtml`, `menuBlockHtml`, `menuListHtml`, `bookingLine` | `features/r1/FicheR1.tsx`, `features/r2/FicheR2.tsx`, `features/r2/LignePlat.tsx`, `features/collegue/LigneReservation.tsx` |
| `js/reservation.js` | `openBookingR1`, `openBookingR2Day`, `closeBooking`, `bookingFormHtml`, `bookingFormMultiHtml`, `countsFieldsetR1Html`, `updateR1PriceLive`, `updateR2PriceLive`, `setServiceMode`, `setMultiQty` | `features/r1/FormulaireR1.tsx`, `features/r1/CompteursR1.tsx`, `features/r2/FormulaireR2.tsx` (totaux par `form.Subscribe`) |
| | `submitBookingR1`, `submitBookingR2Multi`, `handleDuplicate`, `emailWarning`, `newRequestId`, `orderAmounts`, `priceR1` | `mutations/reservations.ts`, `domaine/reservations.ts`, `domaine/prix.ts`, `api/identifiants.ts` |
| | `editBookingFormR1Html`, `editBookingFormR2Html`, `readEditIdentity`, `editIdentityRules` | `features/collegue/ModifierReservationR1/R2.tsx`, `features/reservation/ChampsIdentite.tsx` |
| `js/collegue.js` | `renderModeBox`, `chooseMode`, `tryLogin`, `togglePwdVisibility`, `logoutAdmin`, `armInactivityTimer` | `features/page/SelecteurMode.tsx`, `mutations/collegue.ts` (`useConnexion`), `session/session.ts`, `background/inactivite.ts`, `queries/purge.ts` |
| | `renderDashboard`, `renderSettings`, `saveSettings` | `features/collegue/PanneauDemain.tsx`, `features/collegue/Parametres.tsx` |
| | `dateFieldHtml`, `datePickerHtml`, `dpKey`, `renderAdminFormR1/R2`, `addDayR1/R2`, `draftItems`, `syncTicketPrice` | `features/collegue/SelecteurDate.tsx` (`ui/calendar/DatePickerPopover.tsx`), `features/collegue/OuvrirJourR1/R2.tsx` (tableau de TanStack Form) |
| | `openEditDayR1`, `submitEditDayR1`, `adminDelete`, `deleteDay…`, `deleteBooking…`, `deleteItemR2`, `itemFormHtml`, `submitAddItemR2`, `submitEditItemR2`, `openAddBooking`, `submitAddBookingR1/R2`, `afterAddBooking`, `editMaxR1` | `features/collegue/*`, `mutations/collegue.ts`, `mutations/reservations.ts` |
| `js/impression.js` | `printDoc`, `printTable`, `printTotal`, `openPrint`, `PRINT_TOKENS`, `PRINT_CSS`, `printDayR1/R2`, `printTomorrowSummaryR1/R2`, `showTomorrowSummary`, `getTomorrowISO` | `ui/print/*`, `styles/print.css`, `features/impression/*`, `domaine/impression.ts`, `features/collegue/PanneauDemain.tsx` ; `PRINT_TOKENS` supprimé |
| `js/interface.js` | `confirmationHtml`, `closeConfirmation`, `ICONS`, `segGroup`, `renderPriceSuggestions`, `enterOnce`, `leaveThen`, `cardEnter`, `popSeg` | `features/reservation/Recapitulatif.tsx`, `ui/icons.tsx`, `ui/toggle/ViewToggle.tsx`, `features/collegue/SuggestionsPrix.tsx` ; animations par CSS (`data-starting-style`, `key`) |
| `js/main.js` | `render`, `renderAll`, `captureUi`, `restoreUi`, `PARTS`, `resetFields`, `autoRefresh`, `scheduleR2Cutoff`, easter egg | supprimés (React) ; `<ActualisationAuto/>` ; `background/horloge.ts` ; easter egg retiré (D-01) ; démarrage dans `router.tsx` |
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
| b-6 | Aucune limitation des essais de mot de passe. | Délai progressif dissuasif (D-25). | Compteur d'échecs dans `CacheService` et attente croissante côté script. |
| b-7 | État complet renvoyé à chaque lecture collègue (sans etag) ; ajout manuel = deux allers-retours. | Accepté (actualisation toutes les 3 min seulement). | Etag pour `getAdminState` ; état complet renvoyé par `addBookingR1` / `addBookingR2Multi` quand un mot de passe valide est fourni. |
| b-8 | Prix `0` enregistré comme « sans prix » (`price \|\| ''`). | Prix 0 refusé (D-22). | Distinguer `0` et vide. |
| b-9 | Regex e-mail plus permissive que celle du client ; `Timestamp` tronqué à la date ; noms par défaut `Restaurant 1/2` différents de ceux du client. | Défauts client alignés sur la configuration réelle. | Même regex ; heure de réservation transmise ; défauts serveur `Restaurant Pédagogique` / `Aristide`. |
| b-10 | `editBookingR1` ignore `qte` / `prixTotal` ; `setConfigField` sans liste blanche ; `editDayR1` sur une date absente réussit sans effet ; repli `checkPassword` (ancien script). | Champs ignorés non envoyés ; repli `checkPassword` non repris. | Liste blanche des clés ; erreur « Ce jour n'existe plus. » dans `editDayR1` ; retirer `checkPassword` et `addBookingR2` (obsolète). |
| b-11 | Rappels envoyés par ligne (une commande de 3 plats = 3 e-mails) ; modification manuelle dans Sheets visible vers 6 h si faite le soir. | — | Regrouper les rappels par contact et par jour ; documenter `viderCache()` pour les gestionnaires. |
| b-12 | Pas de « Modifier ce jour » pour R2, mais `addDayR2` avec `items: []` met à jour note, thème et « ouvert par ». | Formulaire « Modifier ce jour » R2 sur `addDayR2` (D-09). | Action `editDayR2` explicite. |
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
- `pnpm test` / `pnpm test:e2e` (Playwright, en CI seulement si Chromium n'est pas installable).
- `pnpm lint:fix` = `oxlint --fix && oxfmt`.

## Règles absolues
- Ne jamais modifier `Code.gs`. Le contrat d'API est `docs/spec/02-contrat-api.md`.
- Aucune donnée personnelle dans le navigateur hors session collègue : mot de passe et état complet en mémoire
  seulement ; jamais dans l'URL, `localStorage`, `sessionStorage`, une clé de requête ou un log.
- Copie locale : clé `reservations-cache-v1`, format de `03` § 1.1, écrite seulement depuis l'état public avec etag.
- Écritures jamais doublées, rejouées ni interrompues ; `requestId` créé au montage du formulaire.
- POST en `Content-Type: text/plain;charset=utf-8`, aucun autre en-tête (pas de pré-vol CORS).
- Heure de référence : Europe/Paris (`domaine/paris.ts`) ; jours métier = chaînes ISO ; jamais `new Date()` au rendu.

## Où vit l'état
- URL (search params validés par valibot + `v.fallback`) : ce que l'on voit (jours, vues, formulaire ouvert, panneaux).
- TanStack Query : ce que dit le script (`['etat','public']`, `['etat','collegue', id]`).
- Zustand (`session/`, `background/horloge.ts`) : session collègue et heure ; lire avec un sélecteur.
- TanStack Form : les saisies (aucun `useState` pour une valeur de formulaire).
- `useState` local : l'éphémère seulement (récapitulatif, bouton armé).
- Le reste se calcule au rendu (fonctions pures de `domaine/`).

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
  par domaine (`public.r1.formulaire.nom.libelle`), un `defaultMessage` recopié **mot pour mot** de `docs/spec/`
  et une `description` qui cite la section (« 04 § 9 — … »).
- Pluriels et ordinaux en ICU (`{n, plural, one {# couvert} other {# couverts}}`, « 1er » par `selectordinal`).
- Montants : format `euro` ; dates : `intl/dates.ts`. Jamais d'espace codée en dur autour d'un montant formaté.
- Espace insécable écrite `\u00A0` dans les littéraux ; `preserveWhitespace` activé.
- Attributs (`aria-label`, `title`, `placeholder`) : `intl.formatMessage`. Hors composants : l'instance `intl` de `intl/intl.ts`.
- Après avoir ajouté ou modifié un message : `pnpm i18n:extract` et commiter `translations/fr.json`.
- Messages du script (`{ error }`) affichés tels quels.

## Conventions de code
- Termes métier en français (`couverts`, `placesRestantes`, `collegue`), vocabulaire technique en anglais
  (`useXxx`, `Props`, `queryKey`) ; champs de l'API tels quels (`Date`, `Capacite`, `Qte`, `ItemID`).
- Exports nommés ; pas de barrels ; alias `@/` ; co-location `X.tsx` / `X.module.css` / `X.test.tsx`.
- `domaine/` et `api/` sans React ; `ui/` sans métier ; Base UI importé seulement dans `ui/`.
- Styles : CSS Modules + jetons (`var(--…)`) ; variantes en `data-*` ; aucune couleur, taille ou rayon en dur.
- Tests avec le code : tables de cas tirées de la spec ; msw pour l'API ; un `QueryClient` neuf par test.
- Commentaires : les contraintes et leur source (« 04 § 5.3 »), jamais l'historique.
````

### Annexe D — Rapports de recherche

Voir [`recherche/README.md`](recherche/README.md) (une ligne par rapport, ce qui a été testé ou non). Ordre de lecture conseillé selon la phase :

| Phase | À lire |
| --- | --- |
| P0 | `toolchain.md` (§ 2-6, pièges), `toolchain-files/`, `tanstack-start.md` (§ 2-3, pièges), `element-admin-reference.md` (§ 1, § 11.7) |
| P1 | `tanstack-query.md` (§ 3-8, § 10-13), `react-architecture.md` (§ 3, § 5, § 7), `appresaaristide-reference.md` (§ 2.1, § 6) |
| P2 | `ui-forms.md` (§ 1-7, § 9-11), `appresaaristide-reference.md` (§ 2.2-2.4) |
| P3 | `tanstack-start.md` (§ 4), `react-architecture.md` (§ 2), `ui-forms.md` (§ 5) |
| P4 | `react-architecture.md` (§ 3), `element-admin-reference.md` (§ 2, § 11.4-11.5), `tanstack-query.md` (§ 8) |
| P5 | `ui-forms.md` (§ 8), `react-architecture.md` (§ 2 (i)) — en gardant l'arbitrage « même document » |
| P6 | `element-admin-reference.md` (§ 8), `react-architecture.md` (§ 8) |
| P7 | `react-architecture.md` (§ 10), § 7 de ce plan |

Les rapports reflètent l'état du 3 octobre 2026 ; leurs propositions contraires aux arbitrages sont listées au § 6.1.
