# Journal de la session P4 (a) — page, chargement, actualisation, lecture anticipée, textes communs

*3 et 4 octobre 2026. Branche locale `claude/p4a-page`, partie de `ff8e301` (P0, P1 (a1, a2, b), P2 et P3 complètes), rebasée le 4 octobre sur `bce8c29` (P1 (c), P1 (d), écarts E-50 à E-55). Session reprise après un redémarrage : le travail tenait dans un commit provisoire, découpé ensuite en six commits qui passent chacun `pnpm check:fast`.*

## Après le rebase

- Aucun conflit : P1 (c) et P1 (d) ne touchent ni `src/`, ni `knip.json`, ni `translations/fr.json`, ni les page objects de la page publique. Lockfile inchangé.
- `translations/fr.json` régénéré à chaque commit ; `git diff --exit-code src/routeTree.gen.ts translations/fr.json` vide après `pnpm build:e2e`.

## Fait

- `routes/index.tsx` : `validateSearch` complet du PLAN § 3.2 (`CalendarSearch` + `reserver`, `connexion`, `retour`), middlewares `stripSearchParams` et `retainSearchParams(CALENDAR_KEYS)`, loader qui lance la première lecture sans l'attendre (décision 1), `pendingMs: 0`, `pendingMinMs: 0`, `pendingComponent: PageSkeleton`.
- `features/calendar/search.ts` : schéma `CalendarSearch` et `CALENDAR_DEFAULTS`.
- `features/page/` : `Page` (emplacements `modeSwitch`, `panels`, `r1` / `r2` = `{ admin, calendar, card }`, barrière d'hydratation, encadré d'échec, `<AutoRefresh/>`), `PublicPage`, `PageLayout` (ordre de `08` § 7.1), `Header` (logo, surtitre, `<h1>` de D-24, sous-titre, emplacement « Client / Collègue », easter egg D-01), `Column`, `ColumnSkeleton`, `PageSkeleton`, `Footer`, `ConfigBanner` (D-05), `DevDataBanner`, `LoadErrorBox`, `LoadErrorPage`, `page-texts.ts` (titres : paramètres, sinon `reservations-textes`, sinon défauts), `use-online.ts`, `logo.png` (copie de `logo.png`, identique à l'image en base64 de `legacy/index.html`).
- `queries/AutoRefresh.tsx` ; `queries/use-app-state.ts` : `useAppStateQuery`, `useLoadedAppState`, `usePublicReadStatus`, `refetchOnMount: false` pour `useAppState` et `useIsFromCache`.
- `intl/common-messages.ts` (textes partagés de `04` § 9, `00` § 2.3, `06` et de l'annexe F : 39 messages, dont `public.r2.cutoff` déplacé de `background/clock.ts`) et `intl/staff-messages.ts` (32 textes partagés du mode collègue). Liste des ids dans les deux fichiers.
- `routes/__root.tsx` : `<Toaster/>` monté une fois, dans un élément à lui après `.app-root` (décision 7) ; `<ScriptOnce>{earlyFetchScript}</ScriptOnce>` inchangé (déjà réel depuis P2 (b1) : S4 le vérifie).
- `router.tsx` : `defaultErrorComponent: LoadErrorPage`, écouteur `vite:preloadError` (`background/preload-error.ts`, garde de 60 s en `sessionStorage`), avertissement console quand l'URL du script manque (D-05).
- Jetons de mise en page dans `styles/tokens.css` (largeur de page, logo, filigrane, marque oblique, signature, mesures en `ch`, `--mode-switch-segment-width: 108px` pour P5 (a)).
- Tests : `Page`, `Header`, `LoadErrorBox`, `ConfigBanner`, `AutoRefresh`, `use-app-state`, `preload-error`, `-routes.test.tsx` (schéma, fallbacks, liens), textes partagés (`node`). Stories : `Page` (chargée, échec), `PageSkeleton` (première visite, titres mémorisés), `Header`, `Column`, `Footer`, `ConfigBanner` (URL absente, invalide, `COLLE_ICI`), `LoadErrorBox` (en ligne, copie locale, « Réessayer » occupé).
- `e2e/hydration.spec.ts` sur la vraie page (S4) et `e2e/smoke.spec.ts` (la page s'affiche après la réponse du faux script).
- `parite.md` : colonne `react` de G-01, G-02, G-03, G-05, G-07 et `09` § 7.

## Mesures

Le 4 octobre, sur `claude/p4a-page` rebasée (Chromium de `/opt/pw-browsers/chromium`).

| Commande | Résultat |
| --- | --- |
| `pnpm check` | format, lint et `tsc` sans remarque ; Vitest 135 fichiers, 1 951 tests verts (node, node-ny, browser, storybook) ; `knip` et `knip --production` sans remarque |
| `pnpm build && pnpm budget` (S3) | JS 146,4 kB gzip (limite 200 kB), dont `index` 145,6 kB et `routes` 0,8 kB ; CSS 5,1 kB (limite 25 kB) |
| `pnpm build:e2e && git diff --exit-code src/routeTree.gen.ts translations/fr.json` | aucune différence |
| `pnpm test:e2e --project=react-only e2e/hydration.spec.ts e2e/smoke.spec.ts` (S4) | 5 verts sur 5 |
| `pnpm test:e2e --project=react --grep "@G-01\|@G-03\|@G-07"` | 2 verts (REG-03 hors ligne, REG-06), 6 arrêtés sur un élément de P4 (b), voir ci-dessous |
| `pnpm test:e2e --project=react --grep "REG-02\|REG-07\|REG-43\|@framework"` | 5 verts (REG-07 variante `react`, REG-43, trois `@framework`) ; REG-02 arrêté sur `seatsPill` (ligne 99) |
| `pnpm test:e2e:legacy` | 76 verts sur 76 (dont la variante `legacy` de REG-03 (d), inchangée) |
| `grep -rnE "use(Layout)?Effect\(" src --include=*.tsx --exclude=*.test.tsx --exclude=*.stories.tsx` | 0 ligne |

Scénarios arrêtés sur P4 (b), chacun vert jusqu'à la ligne citée :

| Scénario | Ligne d'arrêt | Élément attendu |
| --- | --- | --- |
| REG-01 (`loading.spec.ts`) | 72 | `dayButton` (calendrier R1) |
| REG-03 « second read at 6 s » (`loading-reads.spec.ts`) | 63 | `seatsPill` |
| REG-03 « new attempt 1.5 s after an error page » | 84 | `seatsPill` |
| REG-03 « a read that never answers » | 138 | `seatsPill`, après le clic sur « Réessayer » (ligne 136) |
| REG-04 (`loading.spec.ts`) | 152 | `seatsPill`, après « Nouvelle tentative… » et l'encadré masqué |
| REG-05 (`loading.spec.ts`) | 165 | `seatsPill` de la copie, avant le passage hors ligne et l'encadré |

Aucun scénario ne porte `@G-07`.

## Décisions

L'orchestrateur a validé les décisions 1 à 15 le 4 octobre (loader qui n'attend pas le script, barrière dans `Page`, ordre des middlewares, prop `container` de `Toaster`, deux fichiers de textes partagés, easter egg par écouteur natif).

1. **Le loader de `/` n'attend pas le script** (PLAN § 3.3.1 étape 4 et lancement : « loader async »). Avec un loader qui attend, la route passe en attente : React cache la coquille hydratée (`display: none`) sous une seconde copie du squelette, puis remplace le tout par la page. En-tête et logo sont montés deux fois ; dans REG-03 « hors ligne », le logo est redemandé après le passage hors ligne (Playwright coupe le cache HTTP quand il intercepte) et la console stricte échoue. Le loader lance donc la première lecture une seule fois (si la requête n'existe pas encore) et rend aussitôt ; `Page` montre le squelette, puis les données ou l'encadré d'échec. Résultat visible identique (G-01, G-03) ; plus d'`errorComponent` sur le chemin d'un échec de lecture. Retour arrière : loader `async` qui attend `queryClient.query({ ...publicStateOptions, staleTime: "static" })`.
2. **Barrière d'hydratation dans `Page`** : tant que `useHydrated()` vaut `false`, `Page` rend exactement le balisage de `PageSkeleton` (titres par défaut, colonnes en squelette, même avec la copie locale), puis les mêmes éléments reçoivent les données. Prouvé par `Page.test.tsx` (`hydrateRoot` sur le HTML de `PageSkeleton`, aucune erreur récupérable) et par S4. `pendingMinMs: 0` gardé (note de l'orchestrateur).
3. **Encadré d'échec** : affiché quand la dernière lecture a échoué et qu'aucune n'a réussi depuis le chargement (`errorUpdatedAt > dataUpdatedAt` et `dataUpdatedAt < APP_START`). Pas `isError` : sans donnée, TanStack Query repasse la requête en `pending` pendant un nouvel essai, l'encadré disparaissait et se réannonçait (REG-04, REG-06).
4. **`AutoRefresh` seul lit le script** : `useAppState` et `useIsFromCache` en `refetchOnMount: false`, `useLoadedAppState` et `usePublicReadStatus` en `enabled: false`. Un composant monté plus tard (formulaire) ne relance pas de lecture. `retryOnMount: false` : monté sur un premier échec, `AutoRefresh` ne relit pas aussitôt.
5. **Texte en ligne / hors ligne** : `useOnline()` (`useSyncExternalStore` sur `online` / `offline`) ; le texte suit la connexion sans attendre un nouvel échec. « Réessayer » occupé par un `useState` local, du clic à la fin de cette lecture seulement.
6. **Ordre des middlewares** : `stripSearchParams` puis `retainSearchParams`. Dans l'ordre de l'extrait du PLAN § 3.2, un lien qui ne nomme que son paramètre gardait `r1vue=semaine` dans l'URL (test « leaves the defaults out of the links »).
7. **`Toaster` avec un conteneur** (`src/ui/feedback/Toaster.tsx`, prop facultative `container`) : un portail Base UI posé directement dans `<body>` bloque le fil principal dans les tests de routes (`renderRoute` rend le `<body>` de la coquille dans un conteneur de test), dès qu'un élément animé est à l'écran. Vérifié par bissection : sans portail, ou portail dans un élément de l'arbre React, aucun blocage. Le site construit n'était pas touché (E2E verts avant le changement). Changement d'`ui/` jugé indispensable : `pnpm check` restait bloqué.
8. **Easter egg** : écouteur `click` natif posé par une ref callback sur le logo (comme `main.js`). `onClick` sur `<img>` tombe sous `jsx-a11y/click-events-have-key-events` et `no-noninteractive-element-interactions` ; la plaisanterie reste à la souris, le logo reste une image hors tabulation. Aucun override.
9. **Textes partagés en deux fichiers** : `common-messages.ts` dépassait 300 lignes (`max-lines`) ; les textes du mode collègue vont dans `intl/staff-messages.ts` (`staffCommonMessages`), qui ne pèse pas sur le chunk public. Les deux sont testés (`node`).
10. **`LoadErrorPage`** reste le composant d'erreur par défaut du routeur (erreur de rendu, futur loader de `/collegue`) ; `/` ne l'atteint plus pour un échec de lecture (décision 1).
11. **`ConfigBanner({ url })`** : l'URL du build par défaut, une autre dans les tests et les stories (F-07).
12. **Logo en fichier** (18 kB, haché par Vite, hors budget JS) plutôt qu'en base64 dans le JS.
13. **Fondu `.text-updated`** (`04` § 2, `08` § 5) non repris : voir « Reste à faire ».
14. **knip** : `common-messages.ts` reste hors du mode production jusqu'à P4 (b) (la page de P4 (a) n'utilise aucun texte partagé) ; `staff-messages.ts` jusqu'à P5 ; `queries/{state,use-app-state}.ts` entrent en production (`@public` sur `useAppState`, `useIsFromCache`, `staffStateOptions` ; `@internal` sur `APP_START`) ; `@public` retiré de `readFallbackTexts`.
15. **Tests modifiés hors de mes fichiers** : `src/router.test.ts` (écouteur `vite:preloadError` vérifié, `addEventListener` simulé dans Node), `src/background/start.test.ts` (état public en cache avant `router.load()`, sinon le loader lance une lecture dont les minuteurs sont comptés ; lot de notifications de Query vidé).
16. **`-routes.test.tsx`, test de la copie locale** : il attend que la lecture d'`AutoRefresh` atteigne son faux script avant de rendre la main. Sous charge (`pnpm check` complet), la requête partait après la fin du test, arrivait au faux script du test suivant et y consommait sa retenue : « keeps the skeleton… » comptait deux lectures au lieu d'une (échec à la première passe de `pnpm check` du 4 octobre ; trois passes isolées vertes avant comme après la correction, passe complète suivante verte).

## Contradictions et remarques

- **Critère « @G-01, @G-03 et @G-07 verts sur `react` »** : REG-01, REG-03 (6 s, 1,5 s, 30 s), REG-04 et REG-05 finissent sur `dayButton`, `seatsPill` ou `reserveButton`, donc sur le calendrier et la fiche de P4 (b). Chacun passe jusqu'à cette ligne (vérifié sur `react`). Aucun scénario ne porte `@G-07`. Verts sur `react` : REG-03 « hors ligne », REG-06, REG-07 (variante `react`), REG-43, et les trois `@framework`.
- **REG-03 (d) « a read that never answers » sur `react`, arbitrage de l'orchestrateur (4 octobre)** : les essais abandonnés à 30 s (E-45) ne servent plus personne, et horloge en pause, aucune lecture ne part avant l'actualisation de 3 min. Le scénario porte déjà `@changed:E-45` : sa variante `react` clique sur « Réessayer » (`retryLoad` de `e2e/pages/home.ts`) après l'encadré et la libération des lectures retenues, puis attend la fiche. Variante `legacy` inchangée. Vérifié : le clic part et le scénario s'arrête sur `seatsPill` (ligne 138), qui attend la fiche de P4 (b).
- **PLAN § 3.3.1 étape 4, § 3.9 (« errorComponent si aucune donnée ») et lancement (« loader async »)** : décision 1.
- **PLAN § 3.2, ordre des middlewares** : décision 6.
- **Journal P0 (b), reste à faire** « retrait de `!src/intl/common-messages.ts!` » : impossible en P4 (a) (décision 14).
- **`ui/` modifié** : décision 7.

## Versions

Aucune version changée, aucun paquet ajouté.

## Overrides oxlint

Aucun.

## Reste à faire

- P4 (b) : remplir `r1` / `r2` de `PublicPage` (`calendar`, `card`) ; utiliser `commonMessages` (« Réserver », `noService`, `soldOut`, `r2Closed`) puis retirer `"!src/intl/common-messages.ts!"` de `knip.json` ; `@public` de `useAppState` à retirer ; fondu `.text-updated` des titres et descriptions qui changent (`04` § 2), si souhaité ; `E2E_REACT_GREP` élargi aux scénarios G-01 à G-04.
- P5 (a) : `ModeSwitch` dans l'emplacement `modeSwitch` de `Page` (`--segment-min-width: var(--mode-switch-segment-width)`, refus de connexion par `useIsFromCache()`) ; `StaffPage` sur `Page` (emplacements `panels`, `admin`) ; `staffStateOptions` et `staffCommonMessages` (retirer les exclusions et balises knip).
- P4 (b) : REG-01, REG-03 (trois variantes), REG-04, REG-05 et REG-02 doivent passer en entier sur `react` (lignes d'arrêt dans « Mesures »).
- Orchestrateur : reporter dans PLAN.md les décisions 1 (§ 3.2 extrait, § 3.3.1 étape 4, § 3.9 ligne G-03) et 6 (§ 3.2, ordre des middlewares), la prop `container` de `Toaster` (décision 7) et l'arbitrage REG-03 (d).

## Pour la PR

Titre : « P4 (a) : page publique, chargement, actualisation, textes communs ».

- Page à deux colonnes vide de fiches : en-tête, squelette, copie locale, encadré d'échec, bandeau de configuration, actualisation toutes les 3 min, easter egg ; emplacements prêts pour P4 (b) et P5.
- S4 vert sur la vraie page ; barrière d'hydratation dans `Page`.
- Fichiers partagés modifiés : `src/ui/feedback/Toaster.tsx` (prop `container`), `knip.json`, `src/router.tsx`, `src/routes/__root.tsx`, `src/router.test.ts`, `src/background/start.test.ts`, `src/background/clock.ts` (message déplacé), `e2e/smoke.spec.ts`, `e2e/regression/loading-reads.spec.ts` (variante `react` de REG-03 (d), arbitrage de l'orchestrateur), `docs/migration/parite.md`.
- Aucune action humaine.
