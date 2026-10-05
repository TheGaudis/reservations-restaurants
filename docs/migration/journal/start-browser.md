# Journal de la session « mise en page persistante et `browser()` » : architecture A

*4 et 5 octobre 2026. Branche `claude/start-browser`, partie de `2c88212` (pointe de la PR #3 `claude/page-composition`). Demande du responsable : garder TanStack Start en mode SPA, monter le cadre de la page une seule fois dans la racine, rendre ce qui lit le navigateur derrière `use(browser())` (React 19.3), et confier le chargement au routeur et à Suspense. Verdict : **oui**. Le 5 octobre, le responsable a fait essayer l'échec de la première lecture par le composant d'erreur de la route, puis l'a écarté (décision 3) ; il a retenu `defaultPendingMinMs: 0` pour toutes les routes et fait mettre à jour CLAUDE.md et le PLAN par cette session.*

## Fait

### Mise en page persistante et `BrowserOnly` (`b9e3736`)

- **`features/page/BrowserOnly.tsx`** : `<Suspense fallback>` autour d'un composant qui appelle `use(browser())`. Au prérendu, dans Node, React abandonne la frontière : la coquille contient le `fallback`, marqué `<!--$!--><template data-dgst="">`. Dans le navigateur, `use(browser())` ne suspend jamais (`react-dom-client.development.js` l. 8269) ; à l'hydratation, React rend les enfants sans les hydrater et sans erreur, puisque l'empreinte vaut `""` (l. 11496, `REACT_RECOVERABLE_DIGEST`). Le build ne journalise rien : `onBrowserBailout` vaut `noop` par défaut (`react-dom-server.node.development.js` l. 4738).
- **`routes/__root.tsx`** : le composant racine monte `PageLayout` (bandeaux, bande tricolore, pied), `Header`, le sélecteur « Client / Collègue », `AutoRefresh` et le conteneur des toasts, autour de `<Outlet />`. Trois frontières `BrowserOnly` : les titres de l'en-tête (dans `Header`), le sélecteur (`fallback={null}`), et `<Outlet />` (`fallback={<ShellSkeleton />}`). La coquille garde le balisage d'avant, sans le script de restauration du défilement (risque 3).
- **`Header`** rend lui-même ses titres (`usePageTexts`) dans `BrowserOnly`, avec les noms par défaut dans la coquille ; la prop `texts` disparaît. `HeaderMode` enveloppe le sélecteur à droite.
- **Loader de `/`** (`firstRead`) : attend la première lecture sans copie locale, et prend la lecture déjà lancée par `AutoRefresh` s'il y en a une (une seule requête, celle du `<head>`). Avec la copie, ou une fois la première lecture terminée, il rend aussitôt. Il attrape l'échec, qui reste dans la requête.
- **`PageSkeleton`** devient le `<main>` occupé (composant d'attente des routes) ; `ShellSkeleton`, le même avec les noms par défaut, sert de `fallback` à la coquille. `LoadErrorPage` et `NotFoundPage` ne rendent plus que leur `<main>` ; « Page introuvable » passe en `<h2>`, sous le `<h1>` de l'en-tête.
- **`PublicPage` et `StaffPage`** rendent leur `<main>` ; `Page.tsx` ne garde que `PageLoadError` (encadré tant que la dernière lecture a échoué et qu'aucune n'a réussi) et `PageColumn` (contenu avec l'état, squelette arrêté sans état).
- **`ModeSwitch`** lit les search params validés de `/` par `useMatch({ from: "/", shouldThrow: false })` : le match racine ne porte que les params bruts (`router-core/src/router.ts` l. 1610-1622), donc un `retour` non validé. Ses navigations visent `to: "/"`, ce qui ouvre le panneau depuis la page introuvable. Le sélecteur reste monté de `/` à `/collegue` : la connexion et « Client » donnent le focus au segment directement (`focusSegment`), sans les clés de `ui/pending-focus.ts`.

### Variante `errorComponent`, essayée puis écartée (`d6a64bf`, défaite par `fd1e129`)

L'échec de la première lecture passait par le composant d'erreur de la route : le loader l'attrapait toujours, `PublicPage` lançait une `FirstReadError` sans état, `LoadErrorPage` l'affichait, un `useEffect` appelait le `reset()` du routeur dès qu'une lecture réussissait, et `onCaughtError` (`client.tsx`) taisait `FirstReadError` (sans ce filtre, REG-03 deux fois, REG-04 et REG-06 échouaient sur la console stricte). Les 96 E2E passaient.

Elle a été écartée pour une raison : **le composant d'erreur remonte à chaque navigation pendant l'échec.** Le routeur réinitialise la frontière quand le match change, donc à chaque changement de search params (`react-router/src/Match.tsx` l. 142, `getResetKey={() => match}` ; `CatchBoundary.tsx` l. 21-25). `PublicPage` relance l'erreur, et React monte le composant d'erreur à neuf quand une frontière attrape (`react-dom-client.development.js` l. 11133-11145, `finishClassComponent`). L'élément `role="alert"` est remplacé à l'ouverture du panneau de connexion : un lecteur d'écran réannonce l'alerte sans que son texte change, contre E-42. Aucune option du routeur n'évite la réinitialisation ; `QueryErrorResetBoundary` ne sert qu'à autoriser une nouvelle lecture au remontage (`react-query/src/errorBoundaryUtils.ts` l. 35-39), ce que `03` § 3.2 interdit.

### `defaultPendingMinMs: 0` (`d6a64bf`, gardé par `fd1e129`)

`router.tsx` règle `defaultPendingMinMs: 0` ; la route `/` n'a plus de réglage propre. `router.test.ts` vérifie 0.

### Tests

- `BrowserOnly.test.tsx` : rendu serveur par `renderToReadableStream`, puis hydratation : aucune erreur avec `BrowserOnly`, au moins une sans ; le `<h1>` hydraté reste le même élément.
- `-routes.test.tsx` : même en-tête, même champ et mot de passe tapé conservés du squelette à la page ; encadré d'échec sous le même en-tête, « Réessayer », deux GET en tout ; **panneau de connexion ouvert puis autre navigation pendant l'échec : une seule lecture, pas de squelette occupé, même élément d'alerte** ; page rendue quand une lecture de fond réussit après l'échec ; un seul observateur à minuteur.
- `Page.test.tsx`, `Header.test.tsx`, stories de `Page`, `Header` et `PageSkeleton` réécrits ; `ModeSwitch.test.tsx` ne remonte plus le sélecteur à chaque chemin ; `story-router.tsx` déclare `/` et `/collegue`. La story `Header` › `RenamedRestaurants` pose l'état dans la requête : par `localStorage`, partagé avec les stories de `PageSkeleton` lancées en parallèle, `Header` › `Default` a lu « Bistrot » une fois.

## Mécanismes

Retirés : `useHydrated()` et `use-hydrated.ts` ; `usePageStatus`, `Page`, `PageHeader`, `PageMain`, `WhenLoaded` ; l'état « chargement » des colonnes et la barrière d'hydratation de `useSkeletonTexts` et `usePageTexts` ; l'en-tête de `PageSkeleton` et `LoadErrorPage` ; les clés de focus `mode-switch:client` et `mode-switch:staff` ; le `pendingMinMs: 0` propre à `/` ; le remontage de l'en-tête à l'hydratation (logo demandé deux fois avant, une fois après).

Ajoutés : `BrowserOnly`, `HeaderMode`, `ShellSkeleton`, l'attente du loader de `/` (`firstRead`), `focusSegment`, `defaultPendingMinMs: 0`. Aucun `useEffect` dans `src/` (0 avant, 0 après), aucun `onCaughtError`, aucun écouteur de reprise, `AutoRefresh` monté une fois.

Taille depuis `2c88212` : code +251 / −286 lignes ; tests et stories +269 / −168.

## Décisions

1. **Aucune route n'est hydratée.** `<Outlet />` est dans `BrowserOnly` : le prérendu ne rend plus le match `/`, et React monte le contenu de la route dans le navigateur après l'hydratation. Le `ClientOnly` de `MatchView` (`Match.tsx` l. 113) se monte alors hors hydratation et rend aussitôt ses enfants ; `MatchInner` lance `router._tx[5]` (l. 232) vers la frontière `Suspense` du match, neuve : React affiche son `fallback` sans cacher de contenu déjà affiché. La « seconde copie du squelette » de `router-loading.md` disparaît.
2. **`defaultPendingMinMs: 0`.** Le routeur présente le match `/` en attente à l'hydratation (`load-client.ts` l. 2477) et retient ensuite son premier rendu `pendingMinMs` (l. 1498, `Date.now() + min`) : avec 500 ms, la copie locale attendrait 500 ms. Le risque #418 venait de l'hydratation du contenu de la route, qui n'existe plus.
3. **L'échec de la première lecture reste dans la page** (décision du responsable, 5 octobre). Le loader attrape l'échec : le match reste en `success`, et une navigation ne relance son loader qu'à l'entrée sur la route (`load-client.ts` l. 800), où `firstRead` rend aussitôt ; un match en erreur relancerait le sien à chaque navigation (l. 785). La page observe la requête : même encadré d'une navigation à l'autre (E-42), données dès qu'une lecture réussit, sans effet ni filtre de console. `LoadErrorPage` reste le composant d'erreur par défaut pour les vraies erreurs (rendu, état complet de `/collegue`), avec `reset()` puis `router.invalidate()`.
4. **Le loader n'ouvre qu'une première lecture.** Il rend aussitôt si la requête a des données ou est en erreur. Il ne teste plus `getQueryState(...) === undefined` : l'en-tête de la racine crée la requête (inactive) avant le loader.
5. **Page introuvable sous le cadre** : l'en-tête et le sélecteur s'y affichent ; `AutoRefresh` y lit l'état public comme ailleurs ; « Collègue » mène au panneau de connexion de `/`.

## Mesures

Build `build:e2e`, `pnpm serve`, Chromium (`/opt/pw-browsers/chromium`), 4 cœurs, charge 2,7 à 4,4. Script Playwright temporaire (non commité, celui de `router-loading.md` avec le nombre de colonnes en plus) : de l'insertion de `main[aria-busy="true"]` au premier bouton de jour ; 7 chargements par cas, médiane en ms. « Avant » = `2c88212`, « Après » = `b9e3736`.

| Cas | Avant, CPU ×1 | Après, CPU ×1 | Avant, CPU ×6 | Après, CPU ×6 |
| --- | --- | --- | --- | --- |
| Copie locale, script retenu | 204 | 171 | 1 141 | 1 123 |
| Sans copie, réponse immédiate | 181 | 178 | 1 203 | 1 086 |
| Sans copie, réponse retenue 1 s | 1 209 | 1 206 | 1 961 | 1 977 |

Dans tous les cas : un `<header>`, un `<main>`, deux colonnes au plus, aucun `<main>` caché par React ; avec la réponse retenue, sélecteur visible à 700 ms et même `<header>` avant et après les données. Requêtes du logo : 2 avant (l'en-tête de la coquille remplacé par celui de `Page` à l'hydratation), 1 après. Avec `defaultPendingMinMs: 0` (`d6a64bf`), mêmes valeurs à CPU ×1 (179, 175 et 1 202 ms). Les écarts de temps restent dans le bruit.

Budget (`pnpm build && pnpm budget`) : JS 219,4 kB (220,5 kB avant, limite 240 kB) ; CSS 12,2 kB (11,6 kB avant, limite 25 kB : un fichier CSS de plus, découpage de Vite).

## Vérifications (sur `fd1e129`)

- `pnpm check` : vert (211 fichiers, 2854 tests, projets `node`, `node-ny`, `browser`, `storybook`, puis knip dans les deux modes). Un premier lancement a eu deux rouges : la story `Header` › `Default` (corrigée, voir « Tests ») et `background/start.test.ts` › « starts the clock… » (horloge à `TEST_NOW` + 5 min), vert seul trois fois puis dans le `pnpm check` suivant ; non reproduit.
- `pnpm build:e2e`, puis `git diff --exit-code src/routeTree.gen.ts translations/fr.json` : aucun écart.
- `E2E_REACT_PORT=4421 E2E_LEGACY_PORT=4422 pnpm test:e2e --project=react --project=react-only` : **96 sur 96**.
- Même commande, `--repeat-each=5 e2e/hydration.spec.ts e2e/regression/loading-reads.spec.ts` : **40 sur 40**.
- `useEffect` dans `src/` hors tests et stories : 0.
- `pnpm dev` (vérifié le 4 octobre) : la coquille porte les mêmes frontières ; la page s'affiche sans message en console.
- Aucune assertion ni fixture E2E modifiée.

## Risques

1. `use(browser())` est neuf (React 19.3.0) et documenté seulement dans les types (`@types/react-dom`, `browser(reason?)`). `BrowserOnly.test.tsx` détecte un changement de comportement.
2. Une erreur de rendu dans la racine elle-même affiche `LoadErrorPage` sans en-tête (composant d'erreur du match racine).
3. Le prérendu ne rend plus le match `/` : le script de restauration du défilement que `MatchView` écrivait dans la coquille disparaît. Le routeur restaure le défilement au premier `onRendered` (`router-core/src/scroll-restoration.ts` l. 250), une fois le contenu affiché.
4. `ModeSwitch` dépend de l'id de route `/`.

## Documentation mise à jour (5 octobre)

- `CLAUDE.md`, « Règles absolues », puce « Hydratation » : `BrowserOnly`, `defaultPendingMinMs: 0`, jamais de `onRecoverableError`.
- `PLAN.md` : ligne de journal du 5 octobre (variante `errorComponent` écartée, E-42) ; § 0 point 10 ; § 2.1 (ligne Start, mesures) ; § 3.1 (arborescence) ; § 3.2 (racine, pages, `ModeSwitch`, extrait de `routes/index.tsx`) ; § 3.3.1 étapes 4 et 5 ; § 3.3.2 ; § 3.9 lignes G-01 et G-03 ; § 3.11 (`defaultPendingMinMs`, point d'entrée client) ; E-47 ; § 5.0 propriétaires ; P0 et P4 ; R-01 ; annexe C ; annexe E (`BrowserOnly`, `HeaderMode`, `ShellSkeleton`, première lecture).

## Reste

- `background/start.test.ts` › « starts the clock… » : un rouge isolé (horloge avancée de 5 min, la durée de `gcTime` par défaut de TanStack Query) dans un `pnpm check` ; à surveiller.
- Les tests de formulaires montés par `src/test/column-page.tsx` pour contourner R-36 peuvent revenir à `renderRoute` (déjà noté dans `page-composition.md`) ; le test de `-routes.test.tsx` qui tape le mot de passe passe par `renderRoute` sans blocage.
