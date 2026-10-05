# Journal de la session « mise en page persistante et `browser()` » : architecture A

*4 et 5 octobre 2026. Branche `claude/start-browser`, partie de `2c88212` (pointe de la PR #3 `claude/page-composition`). Demande du responsable : garder TanStack Start en mode SPA, monter le cadre de la page une seule fois dans la racine, rendre ce qui lit le navigateur derrière `use(browser())` (React 19.3), et confier le chargement au routeur et à Suspense. Le 5 octobre, trois décisions du responsable : échec de la première lecture par le composant d'erreur de la route, `defaultPendingMinMs: 0` pour toutes les routes, mise à jour de CLAUDE.md et du PLAN par cette session. Verdict : **oui**, avec un écart à trancher (« Écart restant »).*

## Fait

### Mise en page persistante et `BrowserOnly` (`b9e3736`)

- **`features/page/BrowserOnly.tsx`** : `<Suspense fallback>` autour d'un composant qui appelle `use(browser())`. Au prérendu, dans Node, React abandonne la frontière : la coquille contient le `fallback`, marqué `<!--$!--><template data-dgst="">`. Dans le navigateur, `use(browser())` ne suspend jamais (`react-dom-client.development.js` l. 8269) ; à l'hydratation, React rend les enfants sans les hydrater et sans erreur, puisque l'empreinte vaut `""` (l. 11496, `REACT_RECOVERABLE_DIGEST`). Le build ne journalise rien : `onBrowserBailout` vaut `noop` par défaut (`react-dom-server.node.development.js` l. 4738).
- **`routes/__root.tsx`** : le composant racine monte `PageLayout` (bandeaux, bande tricolore, pied), `Header`, le sélecteur « Client / Collègue », `AutoRefresh` et le conteneur des toasts, autour de `<Outlet />`. Trois frontières `BrowserOnly` : les titres de l'en-tête (dans `Header`), le sélecteur (`fallback={null}`), et `<Outlet />` (`fallback={<ShellSkeleton />}`). La coquille garde le balisage d'avant, sans le script de restauration du défilement (risque 3).
- **`Header`** rend lui-même ses titres (`usePageTexts`) dans `BrowserOnly`, avec les noms par défaut dans la coquille ; la prop `texts` disparaît. `HeaderMode` enveloppe le sélecteur à droite.
- **`PageSkeleton`** devient le `<main>` occupé (composant d'attente des routes) ; `ShellSkeleton`, le même avec les noms par défaut, sert de `fallback` à la coquille. `LoadErrorPage` et `NotFoundPage` ne rendent plus que leur `<main>` ; « Page introuvable » passe en `<h2>`, sous le `<h1>` de l'en-tête.
- **`PublicPage` et `StaffPage`** rendent leur `<main>` ; `Page.tsx` ne garde que `PageLoadError` et `PageColumn`.
- **`ModeSwitch`** lit les search params validés de `/` par `useMatch({ from: "/", shouldThrow: false })` : le match racine ne porte que les params bruts (`router-core/src/router.ts` l. 1610-1622), donc un `retour` non validé. Ses navigations visent `to: "/"`, ce qui ouvre le panneau depuis la page introuvable. Le sélecteur reste monté de `/` à `/collegue` : la connexion et « Client » donnent le focus au segment directement (`focusSegment`), sans les clés de `ui/pending-focus.ts`.

### Échec de la première lecture par le composant d'erreur, `defaultPendingMinMs: 0` (`d6a64bf`)

- **`queries/first-read.ts`** (nouveau) : `FirstReadError` ; `waitForFirstRead` (loader de `/`) ; `useFirstReadOrThrow` (appelé en tête de `PublicPage`) ; `logCaughtError` (`onCaughtError` de `client.tsx`).
- **Loader de `/`** : attend la première lecture sans copie locale (il prend la lecture déjà lancée par `AutoRefresh` s'il y en a une) et ne rejette jamais. Avec la copie, ou une fois la première lecture terminée, il rend aussitôt.
- **`PublicPage`** lance une `FirstReadError` tant qu'il n'y a pas d'état et que la dernière lecture a échoué (`usePublicReadStatus`, qui expose maintenant `loaded` et `error`). Le `CatchBoundary` de la route l'attrape et rend **`LoadErrorPage`** : encadré et colonnes au squelette arrêté, dans le `<main>`, sous l'en-tête et le sélecteur de la racine.
- **`LoadErrorPage`** : après une `FirstReadError`, « Réessayer » relit le script une fois (`refetch`) et l'encadré reste pendant la tentative (REG-04) ; un `useEffect` appelle le `reset()` du routeur dès qu'une lecture réussit, que la lecture vienne de « Réessayer » ou d'`AutoRefresh`. Après toute autre erreur (rendu, état complet de `/collegue`), « Réessayer » fait `reset()` puis `router.invalidate()`, comme avant.
- **`PageColumn`** rend ses enfants sans condition : la route ne la rend qu'avec l'état en cache.
- **`router.tsx`** : `defaultPendingMinMs: 0` ; la route `/` perd son `pendingMinMs` propre. `router.test.ts` vérifie 0.
- Tests ajoutés (`-routes.test.tsx`) : panneau de connexion ouvert puis autre navigation pendant l'échec, sans lecture et sans squelette ; page rendue quand une lecture de fond réussit après l'échec.

## Les trois problèmes de l'`errorComponent`

1. **Loader relancé à chaque navigation** (`router-core/src/load-client.ts` l. 785 : `if (match.status !== 'success') reload = true`, puis l. 861 : le match repasse en attente). Le loader attrape l'échec : le match reste en `success`, et une navigation ne relance son loader qu'à l'entrée sur la route (l. 790-800), où `waitForFirstRead` rend aussitôt. L'erreur naît au rendu, dans `PublicPage`. À une navigation, le `CatchBoundary` de la route se réinitialise, puisque le match change (`react-router/src/Match.tsx` l. 142, `getResetKey={() => match}` ; `CatchBoundary.tsx` l. 21-25) ; `PublicPage` relance la même `FirstReadError` sans lire le script, car l'observateur est désactivé (`enabled: false`). Vérifié par le test « keeps the load error box, without reading, when the login panel opens » : un seul GET, pas de `main[aria-busy="true"]`.
   - `QueryErrorResetBoundary` n'apporte rien ici : son seul rôle est d'autoriser une nouvelle lecture au remontage après sa remise à zéro (`react-query/src/errorBoundaryUtils.ts` l. 35-39 et 70-77). C'est ce que `03` § 3.2 et § 5.2 interdisent : seuls `AutoRefresh` et « Réessayer » lisent après la première lecture. Le motif de la documentation du routeur (`queryErrorResetBoundary.reset()` dans un effet du composant d'erreur) relirait le script à la première navigation.
2. **Erreur attrapée journalisée par React** (`react-dom-client.production.js` l. 6185, `defaultOnCaughtError` → `console.error`). `client.tsx` passe `onCaughtError: logCaughtError` à `hydrateRoot` : seule `FirstReadError` est tue, toute autre erreur attrapée par une frontière reste journalisée avec sa pile de composants. `onRecoverableError` n'est pas touché (arbitrage 16). Sans ce filtre, sur le build `build:e2e` : REG-03 « no new attempt offline », REG-03 « a read that never answers », REG-04 et REG-06 échouent (4 sur 11) sur `FirstReadError: The first read of the public state failed.` en console.
3. **Reprise après une lecture réussie**. Le composant d'erreur observe la requête publique et appelle le `reset()` que le routeur lui passe. React garde l'état d'erreur de la frontière dans le composant de classe `CatchBoundary`, hors du flux de données : il faut un effet pour le remettre à zéro. C'est le **seul `useEffect` de l'appli** (0 avant cette session), commenté. Pas d'écouteur global, pas de `router.invalidate()`.

### Écart restant : le composant d'erreur remonte à chaque navigation

Quand une frontière d'erreur attrape une erreur, React démonte ses enfants et monte le composant d'erreur à neuf (`react-dom-client.development.js` l. 11133-11145, `finishClassComponent` : `reconcileChildFibers(workInProgress, current.child, null)` puis montage). Le routeur réinitialise la frontière à chaque navigation (point 1) et `PublicPage` relance l'erreur : `LoadErrorPage` remonte, et l'élément `role="alert"` de l'encadré est remplacé par un nouveau, de même texte. Constaté par le test de navigation (`querySelector('[role="alert"]')` change d'élément après le clic sur « Collègue »).

Conséquences : l'encadré reste affiché et aucune lecture ne part. Mais un lecteur d'écran peut annoncer de nouveau l'alerte réinsérée à l'ouverture ou à la fermeture du panneau de connexion, alors que E-42 ne réannonce que si le texte change ; un « Réessayer » en cours perd son état occupé si l'utilisateur navigue pendant la tentative. REG-06 ne le voit pas (retrait et insertion dans la même mutation). Pendant l'échec, les seules navigations possibles sont celles du sélecteur et de l'historique : les calendriers ne sont pas affichés.

Deux options pour le responsable :
- accepter ce remontage et l'inscrire au § 4.2 comme écart (identifiant à créer, scénario `@changed:E-xx`) ;
- revenir à la version où le loader attrape l'échec et où la page l'affiche elle-même (`b9e3736`) : même élément d'alerte d'une navigation à l'autre, aucun `useEffect`, aucun `onCaughtError`.

Aucune option du routeur n'évite la réinitialisation : la clé est l'objet du match, recréé à chaque changement de search params ; `remountDeps` ne concerne que le composant de la route.

## Mécanismes

Retirés : `useHydrated()` et `use-hydrated.ts` ; `usePageStatus`, `Page`, `PageHeader`, `PageMain`, `WhenLoaded` ; l'état « chargement » des colonnes et la barrière d'hydratation de `useSkeletonTexts` et `usePageTexts` ; l'en-tête de `PageSkeleton` et `LoadErrorPage` ; les clés de focus `mode-switch:client` et `mode-switch:staff` ; le `pendingMinMs: 0` propre à `/` ; le remontage de l'en-tête à l'hydratation (logo demandé deux fois avant, une fois après).

Ajoutés : `BrowserOnly`, `HeaderMode`, `ShellSkeleton`, `queries/first-read.ts` (`FirstReadError`, `waitForFirstRead`, `useFirstReadOrThrow`, `logCaughtError`), `focusSegment`, un `useEffect` (`LoadErrorPage`), `onCaughtError` (`client.tsx`), `defaultPendingMinMs: 0`.

Taille depuis `2c88212` : code +340 / −308 lignes ; tests et stories +269 / −178. Le passage à l'`errorComponent` seul : +114 / −46 lignes de code.

## Décisions

1. **Aucune route n'est hydratée.** `<Outlet />` est dans `BrowserOnly` : le prérendu ne rend plus le match `/`, et React monte le contenu de la route dans le navigateur après l'hydratation. Le `ClientOnly` de `MatchView` (`Match.tsx` l. 113) se monte alors hors hydratation et rend aussitôt ses enfants ; `MatchInner` lance `router._tx[5]` (l. 232) vers la frontière `Suspense` du match, neuve : React affiche son `fallback` sans cacher de contenu déjà affiché. La « seconde copie du squelette » de `router-loading.md` disparaît.
2. **`defaultPendingMinMs: 0`.** Le routeur présente le match `/` en attente à l'hydratation (`load-client.ts` l. 2477) et retient ensuite son premier rendu `pendingMinMs` (l. 1498, `Date.now() + min`) : avec 500 ms, la copie locale attendrait 500 ms. Le risque #418 venait de l'hydratation du contenu de la route, qui n'existe plus.
3. **Échec de la première lecture par le composant d'erreur de la route** (décision du responsable, 5 octobre ; elle remplace la décision du 4 octobre où le loader attrapait l'échec et la page l'affichait). Mécanisme ci-dessus ; écart restant à trancher.
4. **Avec la copie locale, l'échec reste dans la page** : `useFirstReadOrThrow` ne lance rien s'il y a un état ; `PageLoadError` affiche l'encadré et son suffixe au-dessus des colonnes (`03` § 3.1).
5. **Page introuvable sous le cadre** : l'en-tête et le sélecteur s'y affichent ; `AutoRefresh` y lit l'état public comme ailleurs ; « Collègue » mène au panneau de connexion de `/`.

## Mesures

Build `build:e2e`, `pnpm serve`, Chromium (`/opt/pw-browsers/chromium`), 4 cœurs, charge 2,7 à 4,4. Script Playwright temporaire (non commité, celui de `router-loading.md` avec le nombre de colonnes en plus) : de l'insertion de `main[aria-busy="true"]` au premier bouton de jour ; 7 chargements par cas, médiane en ms. « Avant » = `2c88212` ; « Après » = `b9e3736` ; « Final » = `d6a64bf`.

| Cas | Avant, CPU ×1 | Après, CPU ×1 | Final, CPU ×1 | Avant, CPU ×6 | Après, CPU ×6 |
| --- | --- | --- | --- | --- | --- |
| Copie locale, script retenu | 204 | 171 | 179 | 1 141 | 1 123 |
| Sans copie, réponse immédiate | 181 | 178 | 175 | 1 203 | 1 086 |
| Sans copie, réponse retenue 1 s | 1 209 | 1 206 | 1 202 | 1 961 | 1 977 |

Dans tous les cas : un `<header>`, un `<main>`, deux colonnes au plus, aucun `<main>` caché par React ; avec la réponse retenue, sélecteur visible à 700 ms et même `<header>` avant et après les données. Requêtes du logo : 2 avant (l'en-tête de la coquille remplacé par celui de `Page` à l'hydratation), 1 après. Les écarts de temps restent dans le bruit.

Budget (`pnpm build && pnpm budget`) : JS 219,6 kB (220,5 kB avant, limite 240 kB) ; CSS 12,2 kB (11,6 kB avant, limite 25 kB : un fichier CSS de plus, découpage de Vite).

## Vérifications (sur `d6a64bf`)

- `pnpm check` : vert (211 fichiers, 2853 tests, projets `node`, `node-ny`, `browser`, `storybook`, puis knip dans les deux modes).
- `pnpm build:e2e`, puis `git diff --exit-code src/routeTree.gen.ts translations/fr.json` : aucun écart.
- `E2E_REACT_PORT=4421 E2E_LEGACY_PORT=4422 pnpm test:e2e --project=react --project=react-only` : **96 sur 96**.
- Même commande, `--repeat-each=5 e2e/hydration.spec.ts e2e/regression/loading-reads.spec.ts` : **40 sur 40**.
- `onCaughtError` retiré pour contrôle : 4 rouges sur 11 dans `loading.spec.ts` et `loading-reads.spec.ts` (point 2).
- `pnpm dev` (vérifié le 4 octobre) : la coquille porte les mêmes frontières ; la page s'affiche sans message en console.
- Aucune assertion ni fixture E2E modifiée.

## Risques

1. `use(browser())` est neuf (React 19.3.0) et documenté seulement dans les types (`@types/react-dom`, `browser(reason?)`). `BrowserOnly.test.tsx` rend la coquille par `renderToReadableStream` puis l'hydrate : il détecte un changement de comportement.
2. Une erreur de rendu dans la racine elle-même affiche `LoadErrorPage` sans en-tête (composant d'erreur du match racine).
3. Le prérendu ne rend plus le match `/` : le script de restauration du défilement que `MatchView` écrivait dans la coquille disparaît. Le routeur restaure le défilement au premier `onRendered` (`router-core/src/scroll-restoration.ts` l. 250), une fois le contenu affiché.
4. `ModeSwitch` dépend de l'id de route `/`.
5. Écart restant ci-dessus (remontage de `LoadErrorPage` à chaque navigation pendant l'échec).

## Documentation mise à jour (5 octobre)

- `CLAUDE.md`, « Règles absolues », puce « Hydratation » : `BrowserOnly`, `defaultPendingMinMs: 0`, `onCaughtError` limité à `FirstReadError`.
- `PLAN.md` : ligne de journal du 5 octobre ; § 0 point 10 ; § 2.1 (ligne Start, mesures) ; § 3.1 (arborescence : `__root.tsx`, `client.tsx`, `queries/first-read.ts`, `features/page/`) ; § 3.2 (racine, pages, `ModeSwitch`, extrait de `routes/index.tsx`) ; § 3.3.1 étapes 4 et 5 ; § 3.3.2 ; § 3.9 lignes G-01 et G-03 ; § 3.11 (`defaultPendingMinMs`, `onCaughtError`) ; E-47 ; § 5.0 propriétaires ; P0 et P4 ; R-01 ; annexe C ; annexe E (`BrowserOnly`, `HeaderMode`, `ShellSkeleton`, première lecture, `FirstReadError`).

## Reste

- Trancher l'écart restant (option du § 4.2 ou retour à `b9e3736`).
- Les tests de formulaires montés par `src/test/column-page.tsx` pour contourner R-36 peuvent revenir à `renderRoute` (déjà noté dans `page-composition.md`) ; le test de `-routes.test.tsx` qui tape le mot de passe passe par `renderRoute` sans blocage.
