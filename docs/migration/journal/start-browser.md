# Journal de la session « mise en page persistante et `browser()` » : architecture A

*4 octobre 2026. Branche `claude/start-browser`, partie de `2c88212` (pointe de la PR #3 `claude/page-composition`). Demande du responsable : garder TanStack Start en mode SPA, monter le cadre de la page une seule fois dans la racine, rendre ce qui lit le navigateur derrière `use(browser())` (React 19.3), et confier l'attente de la première lecture au routeur et à Suspense. Verdict : **oui**, avec un écart sur l'échec de la première lecture (décision 3).*

## Fait

- **`features/page/BrowserOnly.tsx`** (nouveau) : `<Suspense fallback>` autour d'un composant qui appelle `use(browser())`. Au prérendu, dans Node, React abandonne la frontière : la coquille contient le `fallback`, marqué `<!--$!--><template data-dgst="">`. Dans le navigateur, `use(browser())` ne suspend jamais (`react-dom-client.development.js` l. 8269) ; à l'hydratation, React rend les enfants sans les hydrater et sans erreur, puisque l'empreinte vaut `""` (l. 11496, `REACT_RECOVERABLE_DIGEST`). Le build ne journalise rien : `onBrowserBailout` vaut `noop` par défaut (`react-dom-server.node.development.js` l. 4738).
- **`routes/__root.tsx`** : le composant racine monte `PageLayout` (bandeaux, bande tricolore, pied), `Header`, le sélecteur « Client / Collègue », `AutoRefresh` et le conteneur des toasts, autour de `<Outlet />`. Trois frontières `BrowserOnly` : les titres de l'en-tête (dans `Header`), le sélecteur (`fallback={null}`), et `<Outlet />` (`fallback={<ShellSkeleton />}`). La coquille garde exactement le balisage d'avant, sans le script de restauration du défilement (point 6 des risques).
- **`Header`** : rend lui-même ses titres (`usePageTexts`) dans `BrowserOnly`, avec les noms par défaut dans la coquille ; la prop `texts` disparaît. `HeaderMode` enveloppe le sélecteur à droite.
- **`routes/index.tsx`** : le loader attend la première lecture quand rien n'est en cache (`firstRead`) ; avec la copie locale, ou une fois la première lecture terminée (succès ou échec), il rend aussitôt. Il prend la lecture déjà lancée par `AutoRefresh` si celle-ci part la première : une seule requête, celle du `<head>` (`hydration.spec.ts`).
- **`PageSkeleton`** devient le seul `<main>` occupé (composant d'attente des routes) ; `ShellSkeleton`, le même avec les noms par défaut, sert de `fallback` à la coquille. `LoadErrorPage` et `NotFoundPage` ne rendent plus que leur `<main>` sous l'en-tête de la racine ; « Page introuvable » passe en `<h2>` (le `<h1>` reste celui de l'en-tête).
- **`Page.tsx`** ne garde que `PageLoadError` et `PageColumn`. `PublicPage` et `StaffPage` rendent leur `<main>` (`Main busy={false}`) ; les panneaux collègue ne passent plus par `WhenLoaded` : `StaffPage` suspend tant que l'état complet manque.
- **`ModeSwitch`** : lit les search params de `/` par `useMatch({ from: "/", shouldThrow: false })` (le match racine ne porte que les params bruts, `router-core/src/router.ts` l. 1610-1622, donc un `retour` non validé) ; les navigations visent `to: "/"`, ce qui ouvre le panneau depuis la page introuvable. Le sélecteur reste monté de `/` à `/collegue` : la connexion et « Client » donnent le focus au segment directement (`focusSegment`), sans les clés de `ui/pending-focus.ts`.
- Tests : `BrowserOnly.test.tsx` (rendu serveur par `renderToReadableStream`, puis hydratation : aucune erreur avec `BrowserOnly`, au moins une sans ; le `<h1>` hydraté reste le même élément). `-routes.test.tsx` : même en-tête, même champ et mot de passe tapé conservés du squelette à la page ; encadré d'échec sous le même en-tête, « Réessayer », deux GET en tout ; un seul observateur à minuteur. `Page.test.tsx`, `Header.test.tsx`, stories de `Page`, `Header` et `PageSkeleton` réécrits ; `ModeSwitch.test.tsx` ne remonte plus le sélecteur à chaque chemin ; `story-router.tsx` déclare `/` et `/collegue`.

## Mécanismes

Retirés : `useHydrated()` et `use-hydrated.ts` ; `usePageStatus` et l'état « chargement » des colonnes ; `Page` (cadre par route), `PageHeader`, `PageMain`, `WhenLoaded` ; la barrière d'hydratation de `useSkeletonTexts` et `usePageTexts` ; l'en-tête de `PageSkeleton` et `LoadErrorPage` ; les clés de focus `mode-switch:client` et `mode-switch:staff` ; le remontage de l'en-tête à l'hydratation (logo demandé deux fois avant, une fois après).

Ajoutés : `BrowserOnly` (29 lignes), `HeaderMode`, `ShellSkeleton`, l'attente du loader de `/` (`firstRead`), `focusSegment`.

Taille : code +249 / −285 lignes ; tests et stories +233 / −163. Aucun `useEffect`, aucun `onCaughtError`, aucun écouteur de reprise, `AutoRefresh` monté une fois.

## Décisions

1. **Une route n'est jamais hydratée.** `<Outlet />` est dans `BrowserOnly` : le prérendu ne rend plus le match `/`, et React monte le contenu de la route dans le navigateur après l'hydratation. Le `ClientOnly` de `MatchView` (`react-router/src/Match.tsx` l. 113) se monte alors hors hydratation et rend aussitôt ses enfants ; `MatchInner` lance `router._tx[5]` (l. 232) vers la frontière `Suspense` du match, neuve : React affiche son `fallback` sans cacher de contenu déjà affiché. La « seconde copie du squelette » de l'essai précédent disparaît (mesures).
2. **`pendingMinMs: 0` reste sur `/`, sans barrière.** Le routeur présente le match `/` en attente à l'hydratation (`router-core/src/load-client.ts` l. 2477) et retient ensuite son premier rendu `pendingMinMs` (l. 1498, `Date.now() + min`) : avec 500 ms, la copie locale attendrait 500 ms. Le risque #418 venait de l'hydratation du contenu de la route ; il n'existe plus. `defaultPendingMinMs` garde 500 ms pour les autres routes (`router.test.ts`).
3. **L'échec de la première lecture n'est pas une erreur de route.** Le loader de `/` attrape l'échec ; la page s'affiche avec l'encadré et les colonnes au squelette arrêté (`PageColumn`, `PageLoadError`), et passe aux données dès qu'une lecture réussit, puisqu'elle observe la requête. Un `errorComponent` imposait trois mécanismes de plus :
   - un match en erreur relance son loader à chaque navigation (`load-client.ts` l. 785, `if (match.status !== 'success') reload = true`) et repasse en attente (l. 861) : ouvrir le panneau de connexion (`?connexion=true`) relirait le script et cacherait l'encadré, contre `03` § 3.2 et § 5.2 ;
   - `MatchInner` relance l'erreur (`Match.tsx` l. 260) vers le `CatchBoundary`, et React la journalise : il faudrait un `onCaughtError` dans `client.tsx` ;
   - la reprise après une lecture réussie d'`AutoRefresh` demanderait un écouteur qui appelle `router.invalidate()`.
   `LoadErrorPage` reste le composant d'erreur par défaut (erreur de rendu, lecture de l'état complet sur `/collegue`).
4. **Le loader n'ouvre qu'une première lecture.** Il rend aussitôt si la requête a des données ou est en erreur. Il ne teste plus `getQueryState(...) === undefined` : l'en-tête de la racine crée la requête (inactive) avant le loader.
5. **Page introuvable sous le cadre.** L'en-tête et le sélecteur s'y affichent ; `AutoRefresh` y lit l'état public comme ailleurs. « Collègue » mène au panneau de connexion de `/`.

## Mesures

Build `build:e2e`, `pnpm serve`, Chromium (`/opt/pw-browsers/chromium`), 4 cœurs, charge 2,7 à 4,4. Script Playwright temporaire (non commité, celui de `router-loading.md` avec le nombre de colonnes en plus) : de l'insertion de `main[aria-busy="true"]` au premier bouton de jour ; 7 chargements par cas, médiane en ms. « Avant » = `2c88212`.

| Cas | Avant, CPU ×1 | Après, CPU ×1 | Avant, CPU ×6 | Après, CPU ×6 |
| --- | --- | --- | --- | --- |
| Copie locale, script retenu | 204 | 171 | 1 141 | 1 123 |
| Sans copie, réponse immédiate | 181 | 178 | 1 203 | 1 086 |
| Sans copie, réponse retenue 1 s | 1 209 | 1 206 | 1 961 | 1 977 |

Dans les trois cas, avant comme après : un `<header>`, un `<main>`, deux colonnes au plus, aucun `<main>` caché par React ; avec la réponse retenue, sélecteur visible à 700 ms et même `<header>` avant et après les données. Requêtes du logo : 2 avant (l'en-tête de la coquille remplacé par celui de `Page` à l'hydratation), 1 après. Les écarts de temps restent dans le bruit.

Budget (`pnpm build && pnpm budget`) : JS 219,4 kB (220,5 kB avant, limite 240 kB) ; CSS 12,2 kB (11,6 kB avant, limite 25 kB : un fichier CSS de plus, découpage de Vite).

## Vérifications

- `pnpm check:fast` : vert (75 fichiers, 2026 tests `node` et `node-ny`).
- `pnpm check` : vert (211 fichiers, 2852 tests, projets `node`, `node-ny`, `browser`, `storybook`, puis knip dans les deux modes).
- `pnpm build:e2e`, puis `git diff --exit-code src/routeTree.gen.ts translations/fr.json` : aucun écart.
- `E2E_REACT_PORT=4421 E2E_LEGACY_PORT=4422 pnpm test:e2e --project=react --project=react-only` : **96 sur 96**.
- Même commande, `--repeat-each=5 e2e/hydration.spec.ts e2e/regression/loading-reads.spec.ts` : **40 sur 40**, REG-03 « no new attempt offline » compris.
- `pnpm dev` : la coquille de développement porte les mêmes frontières ; la page s'affiche sans message en console.
- Aucune assertion ni fixture E2E modifiée.

## Risques

1. `use(browser())` est neuf (React 19.3.0) et sans documentation hors des types (`@types/react-dom`, `browser(reason?)`). Une version de React qui le retirerait casserait le build de la coquille ; `BrowserOnly.test.tsx` le détecte.
2. Une erreur de rendu dans la racine elle-même affiche `LoadErrorPage` sans en-tête (composant d'erreur du match racine).
3. Le prérendu ne rend plus le match `/` : le script de restauration du défilement que `MatchView` écrivait dans la coquille disparaît. Le routeur restaure le défilement au premier `onRendered` (`router-core/src/scroll-restoration.ts` l. 250), une fois le contenu affiché.
4. `ModeSwitch` dépend de l'id de route `/` : renommer la route demande de changer `useMatch({ from: "/" })`.

## Changements voulus (pour l'orchestrateur)

### CLAUDE.md

- « Règles absolues », puce « Hydratation (arbitrage 16) », à remplacer par : « Hydratation (arbitrage 16) : la racine rend les routes dans `BrowserOnly` (`features/page/BrowserOnly.tsx`, `use(browser())`) : aucune route n'est hydratée. Dans la racine, ce qui lit l'URL, la session, `localStorage` ou l'horloge se rend dans `BrowserOnly`, avec en `fallback` le balisage de la coquille. `pendingMinMs: 0` sur `/` ; jamais de `onRecoverableError` pour masquer l'erreur #418. »

### PLAN.md

- Ligne de journal du 4 octobre : la session `start-browser` remplace `useHydrated()` et `usePageStatus` par la mise en page persistante de la racine, `BrowserOnly` et le loader de `/` qui attend la première lecture (renvoi à ce journal).
- § 0, point 10, risque (1), et § 2.1, ligne « TanStack Start en mode SPA » : la barrière `useHydrated()` laisse la place à `BrowserOnly` autour de `<Outlet />`, des titres de l'en-tête et du sélecteur ; mesures ci-dessus.
- § 3.1, arborescence `features/page/` : `BrowserOnly` ; `Page.tsx` réduit à `PageLoadError` et `PageColumn` ; plus de `use-hydrated.ts`.
- § 3.2 : la racine monte `PageLayout`, `Header`, `ModeSwitch`, `AutoRefresh` et les toasts ; `PublicPage` et `StaffPage` ne rendent que leur `<main>` ; extrait de `routes/index.tsx` (loader qui attend, commentaire de `pendingMinMs`).
- § 3.3.1, étape 4 : le loader de `/` attend la première lecture sans copie et rend aussitôt avec la copie ; il attrape l'échec, que la page affiche (décision 3). Étape 5 : plus de barrière ; le contenu de la route se monte dans le navigateur après l'hydratation de la racine.
- § 3.3.2 : `<AutoRefresh/>` monté une fois dans la racine.
- § 3.9, lignes G-01 et G-03 : `pendingComponent` (`PageSkeleton`) sous l'en-tête de la racine ; encadré dans la page de la route après un loader terminé.
- E-47 : le squelette de la coquille reste jusqu'au rendu de la route par le navigateur (171 ms de médiane mesurés, ≤ 600 ms exigés).
- P4, « Risques propres », et R-01 : remplacer la barrière `useHydrated()` par `BrowserOnly`.
- § 5.0, propriétaires : `features/page/BrowserOnly.tsx`.
- Annexe C : la puce « Hydratation » de CLAUDE.md ci-dessus.
- Annexe E : `BrowserOnly` (partie de la racine rendue par le navigateur seulement, `fallback` dans la coquille), `HeaderMode`, `ShellSkeleton`.

## Reste

- Les tests de formulaires montés par `src/test/column-page.tsx` pour contourner R-36 peuvent revenir à `renderRoute` (déjà noté dans `page-composition.md`) ; le test de `-routes.test.tsx` qui tape le mot de passe passe par `renderRoute` sans blocage.
- `defaultPendingMinMs: 0` pour toutes les routes deviendrait possible (aucune route n'est hydratée) ; `router.test.ts` vérifie aujourd'hui les 500 ms par défaut. À trancher par le responsable.
