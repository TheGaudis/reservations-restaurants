# Journal de l'essai « chargement par le routeur » : loader qui attend, `pendingComponent` et `errorComponent`

*4 octobre 2026. Branche locale `claude/router-loading`, partie de `a99d84e` (pointe de la PR #3 `claude/page-composition`). Essai demandé par le responsable : le routeur peut-il remplacer `usePageStatus` (squelette, contenu, échec) avec un loader qui attend la première lecture, `PageSkeleton` en `pendingComponent` et `LoadErrorPage` en `errorComponent` ? Verdict : **non**. Aucun code poussé ; ce journal est le seul commit, local.*

## Verdict

**Non retenu.** Le routeur sait attendre et afficher l'échec, mais il rend le squelette, la page d'échec et la page dans trois arbres React distincts. L'en-tête, le logo et le sélecteur « Client / Collègue » sont démontés et remontés à chaque passage. Conséquences mesurées :

1. REG-03 « no new attempt offline » échoue 5 fois sur 5 : `LoadErrorPage` monte un nouvel en-tête après la coupure du réseau, le navigateur redemande `logo-*.png` et la console stricte relève `Failed to load resource: net::ERR_INTERNET_DISCONNECTED`. C'est l'échec que p4a avait noté (journal `p4a.md`, décision 1). La version actuelle le passe 5 fois sur 5.
2. Avec une première lecture plus longue que l'hydratation (cas normal d'Apps Script), React cache la coquille hydratée (`display: none`) et monte une seconde copie de `PageSkeleton` : deux `<header>`, deux `<main>`, logo demandé deux fois.
3. Le sélecteur « Client / Collègue » disparaît pendant la première lecture et sur l'encadré d'échec (G-01, G-03), alors que l'ancien site l'affiche avant `loadAll()` (`03` § 2.3, étape 2.3) et que `Page` l'affiche dès l'hydratation. Le remettre dans `PageSkeleton` ne suffit pas : le panneau de connexion ouvert pendant le chargement serait remonté à l'arrivée des données, et le mot de passe tapé serait perdu avec le focus (`03` § 5.4).
4. Le code ne devient pas plus simple : l'essai ajoute 44 lignes et en retire 33, sans compter les tests à réécrire ni le sélecteur à remettre ; `Page.tsx` ne perdrait que `useLoadedAppState(hasState)` et la prop `still` de `PageColumn`.

## Fait

Essai appliqué puis retiré (patch gardé hors du dépôt) :

- `routes/index.tsx` : `loader: async ({ context: { queryClient } }) => { await queryClient.query({ ...publicStateOptions, staleTime: "static" }); }`. `staleTime: "static"` remplace `ensureQueryData`, déprécié en TanStack Query 5.104 : avec la copie locale, le loader rend aussitôt ; sans copie, il attend la lecture, qui reprend la lecture anticipée du `<head>` (vérifié : une seule requête, `hydration.spec.ts` vert).
- `LoadErrorPage` : `AutoRefresh` monté sur la page d'échec ; « Réessayer » relit le script par `refetch` sans `reset()` : l'encadré reste affiché pendant la tentative (REG-04, `03` § 3.2). Avec `reset()` puis `router.invalidate()`, le routeur repassait en attente et l'encadré disparaissait (REG-04 rouge au premier essai).
- `background/load-recovery.ts` : écouteur du cache de Query ; une lecture réussie alors qu'un match est en erreur appelle `router.invalidate()`, le loader trouve l'état et la page s'affiche.
- `client.tsx` : `onCaughtError` qui tait `ServiceError`. React journalise par défaut toute erreur attrapée par une frontière ; sans ce filtre, REG-03 (deux variantes), REG-04 et REG-06 échouent sur `ServiceError: HTTP 500 from the script.` ou `No answer from the script.` en console.
- `/collegue` laissé tel quel : son loader lance déjà la lecture sans attendre, et `StaffPage` suspend sur `useAppState` ; l'erreur va déjà au `CatchBoundary` du routeur et à `LoadErrorPage`. Attendre dans le loader ne changerait rien de visible : la connexion met l'état complet dans le cache avant d'ouvrir `/collegue`.

## Mécanique du routeur (sources lues)

Versions : `@tanstack/react-router` 1.170.41, `@tanstack/router-core` 1.171.34, React 19.3.0.

1. En mode coquille, seul le match racine est rendu par le serveur : `resolveSsr` renvoie `route.id === rootRouteId` (`router-core/src/load-server.ts`, l. 177). À l'hydratation, `hydrate` présente le premier match enfant en attente, `{ status: 'pending', ssr: false }` (`router-core/src/load-client.ts`, l. 2477-2480).
2. `MatchView` enveloppe un match `ssr: false` dans `<ClientOnly fallback={pendingElement}>` (`react-router/src/Match.tsx`, l. 113) puis dans `<React.Suspense fallback={pendingElement}>` (l. 162). Pendant l'hydratation, `ClientOnly` rend `PageSkeleton`, identique à la coquille : pas de #418.
3. `ClientOnly` bascule par `useSyncExternalStore` (`ClientOnly.tsx`, l. 68), donc dans un rendu synchrone. `MatchInner` trouve le match en attente et une transaction en cours, et lance une promesse : `if (router._tx) throw router._tx[5]` (`Match.tsx`, l. 231-232). Une frontière déjà affichée qui suspend dans un rendu synchrone cache son contenu et monte le `fallback` : c'est la seconde copie du squelette. Aucune option de route ne l'évite : `wrapInSuspense: false` renvoie la promesse à la frontière de l'`Outlet` racine, déjà affichée elle aussi.
4. Le squelette, l'erreur et la page sont trois positions de l'arbre : `fallback` de `Suspense`, enfant du `CatchBoundary`, composant de la route. React ne peut pas garder un élément commun entre elles.

### Risque R-36 (minuteur de dévoilement)

L'attente du routeur passe bien par une promesse lancée (point 3). React retarde le dévoilement seulement pour un rendu de relance (`(lanes & 62914560) === lanes`, `FALLBACK_THROTTLE_MS = 300`, `react-dom-client.development.js` l. 18200 environ). Le routeur publie la page par `router.startTransition(commit)`, une voie de transition, avant que la promesse `_tx[5]` ne se résolve : pas de minuteur. Constaté : REG-03 (6 s et 1,5 s), REG-08, REG-20 et les autres scénarios à horloge en pause sont verts avec l'essai. R-36 ne bloque donc pas ; le démontage des en-têtes, si.

## Vérifications (essai appliqué)

- `pnpm build:e2e` puis `E2E_REACT_PORT=4411 E2E_LEGACY_PORT=4412 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium pnpm test:e2e --project=react --project=react-only` : **95 sur 96**. Rouge : `loading-reads.spec.ts` › « hedgedReadAndRetry (REG-03) — no new attempt offline », `Failed to load resource: net::ERR_INTERNET_DISCONNECTED` (URL : `assets/logo-*.png`, relevée dans la trace).
- Même scénario `--repeat-each=5` : 5 rouges sur l'essai, 5 verts sur `a99d84e`.
- Sans `onCaughtError` ni « Réessayer » réécrit (premier essai, fichiers de chargement seulement) : 9 sur 13, rouges REG-03 « offline », REG-03 « never answers », REG-04, REG-06.
- `pnpm check:fast` : rouge sur `oxlint` (`no-unsafe-member-access` dans `load-recovery.ts`, accès à `queryKey[0]`), correctif trivial non fait.
- Vitest, projet `browser` (`pnpm vitest run --project browser`) : 80 fichiers, 639 tests verts. Ces tests rendent `Page` hors du routeur ou attendent la page finale : aucun ne voit le remontage de l'en-tête. Un premier lancement est resté muet 25 minutes, puis a été coupé par `timeout` ; non reproduit au second, cause inconnue.

## Mesures

Build `build:e2e`, `pnpm serve`, Chromium (`/opt/pw-browsers/chromium`), 4 cœurs, charge 4,7 à 5,4 (sous deux fois le nombre de cœurs, condition de S4). Script Playwright temporaire (non commité) : `MutationObserver` posé par `addInitScript`, de l'insertion de `main[aria-busy="true"]` au premier bouton de jour ; 7 chargements par cas, médiane en ms.

| Cas | `a99d84e` | Essai |
| --- | --- | --- |
| Copie locale, script retenu | 254 | 244 |
| Sans copie, réponse immédiate | 245 | 239 |
| Sans copie, réponse retenue 1 s | 1 268 | 1 265 |
| Sans copie, retenue 1 s : `<header>` simultanés (max) | 1 | 2 |
| Idem : `<main>` caché par React | non | oui |
| Idem : requêtes du logo | 2 | 4 |
| Idem : sélecteur « Mode d'accès » visible à 700 ms | oui | non |
| Idem : même `<header>` avant et après les données | oui | non |

Les temps ne bougent pas (écarts sous le bruit, 216 à 316 ms selon les essais). La différence tient au DOM.

## Décisions

1. **`usePageStatus` reste** (décision 5 de `page-composition.md` confirmée par la mesure). C'est le seul endroit qui garde le même en-tête du squelette aux données ou à l'échec.
2. **Pas de changement d'assertion ni de fixture** : la console stricte et le logo redemandé hors ligne relèvent un vrai remontage de l'en-tête. Tolérer les échecs de ressources locales hors ligne affaiblirait REG-03 et REG-05.

## Ce qu'il faudrait pour un « oui »

- Sortir `PageLayout`, `Header` et `ModeSwitch` des frontières de route : composant racine (`AppRoot`) ou route de mise en page sans chemin, pour que seul `<main>` change entre attente, erreur et page. La racine est prérendue dans Node et ne doit rien lire de l'URL (R-01, R-02) : le sélecteur y resterait derrière `useHydrated()`. Cela défait la composition de la PR #3 et touche `NotFoundPage`.
- Même ainsi, la seconde copie de `<main>` cachée par React demeure (mécanique du point 3), avec `onCaughtError`, l'écouteur de reprise et `AutoRefresh` monté à deux endroits.

## Changements voulus au PLAN (pour l'orchestrateur)

- § 3.3.1, étape 4 : compléter la justification du loader qui n'attend pas par la mécanique ci-dessus (`ClientOnly` puis `throw router._tx[5]` en rendu synchrone, seconde copie du squelette) et par le résultat de cet essai (REG-03 « offline » rouge 5 sur 5, sélecteur absent pendant G-01 et G-03), avec renvoi à ce journal.
- R-36 : préciser que le minuteur de React ne vise que les rendus de relance ; une frontière publiée par une transition du routeur n'y est pas soumise.
- § 3.9 : la ligne G-03 peut citer `usePageStatus` comme choix confirmé ; `LoadErrorPage` reste le composant d'erreur des erreurs de rendu et de `/collegue`.

## Reste

- Aucun code à reprendre. Le patch de l'essai reste dans le bloc de travail de la session, hors du dépôt.
- Le lancement muet de la suite `browser` (25 minutes sans sortie) est à surveiller.
