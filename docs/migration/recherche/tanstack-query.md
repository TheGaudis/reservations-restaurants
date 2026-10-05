# Couche de données : TanStack Query dans une SPA TanStack Start/Router

> Recherche du 3 octobre 2026, pour migrer `reservations-restaurants` (backend Google Apps Script).
> Rien n'a été modifié dans le dépôt. Tout ce qui a servi est dans `tanstack-query/` (projet d’essai ou clone, non versionné) :
> clone partiel de `TanStack/query` (commit `f4c174b`, 3 oct. 2026), de `TanStack/router` (commit `1f0f20a`, 1er oct. 2026)
> et de `TkDodo/blog`, paquets npm extraits, mesures de poids (`sizes/`).
> Pour la comparaison, j'ai aussi lu le clone `element-admin/` (non versionné) (lecture seule).

---

## 0. Ce que l'appli fait aujourd'hui et qu'il faut garder

Fichiers lus : `README.md`, `js/donnees.js`, `js/main.js`, `js/collegue.js` (connexion et inactivité), le `<script>` inline de `index.html` et les réponses de `Code.gs`.

| Comportement actuel | Où il se trouve | Équivalent avec Query (détails plus bas) |
|---|---|---|
| Lecture lancée dans le `<head>`, avant les CSS (`earlyGet`, `earlySince`) | `index.html` | `<ScriptOnce>` dans le `shellComponent` de Start, puis repris une seule fois par la `queryFn` (§6) |
| Copie locale (14 jours, sans donnée personnelle) affichée tout de suite, puis rafraîchie (`dataStale`) | `saveCache`/`loadCache` | `setQueryData(..., { updatedAt: savedAt })` **synchrone** avant le rendu, plus un abonnement au cache pour l'écriture (§3) |
| `?since=<etag>` → `{unchanged:true, etag}` | `apiGet`, `Code.gs` l.232 | la `queryFn` relit la donnée précédente avec `client.getQueryData()` et la renvoie telle quelle (§4) |
| Lecture doublée après 6 s, la première arrivée gagne, jamais pour une écriture | `hedgedRead` | `lectureDoublee()` dans la `queryFn`, avec `AbortSignal.any` (§5) |
| Un seul nouvel essai après 1,5 s, pas d'essai si le script a renvoyé `data.error` | `apiGet` | `retry` sous forme de fonction et `retryDelay: 1500` (§5) |
| Actualisation toutes les 3 min, en pause quand l'onglet est caché, rattrapage au retour | `autoRefresh`, `refreshMissed` | `refetchInterval: 180_000` sur **un seul** observateur, et `refetchOnWindowFocus` (§2) |
| `writeSeq` : une lecture qui chevauche une écriture est jetée | `loadAll` | `await cancelQueries()` puis `setQueryData()` dans `onSuccess` (§7) |
| `requestId` conservé après une erreur ; `_duplicate:true` → « déjà enregistrée » | `reservation.js`, `Code.gs` | `requestId` créé à l'ouverture du formulaire et passé dans les **variables** (§7) |
| État public ou état complet (`getAdminState`, POST avec mot de passe) | `fetchAdminState` | deux clés : `['etat','public']` et `['etat','collegue', sessionId]` (§8) |
| Écritures du collègue → état complet ; réservations du public → état public | `Code.gs` | `setQueryData` sur la bonne clé (§7) |
| Déconnexion après 10 min d'inactivité, ou si le mot de passe change | `armInactivityTimer`, `adminSessionExpired` | store de session hors React, plus `QueryCache.onError` (§8) |

---

## 1. Versions vérifiées et nouveautés récentes

**Commande** : `npm view <paquet> version` / `dist-tags` / `time`, le 3 oct. 2026.

| Paquet | Version | Publiée le | Remarque |
|---|---|---|---|
| `@tanstack/react-query` | **5.104.1** | 2026-10-02 | `peerDependencies: react ^18 \|\| ^19` |
| `@tanstack/query-core` | 5.104.1 | 2026-10-02 | |
| `@tanstack/react-query-devtools` | 5.104.1 | 2026-10-02 | retiré automatiquement du build de production |
| `@tanstack/query-persist-client-core` | 5.104.1 | 2026-10-02 | contient aussi `experimental_createQueryPersister` |
| `@tanstack/react-query-persist-client` | 5.104.1 | 2026-10-02 | `PersistQueryClientProvider` |
| `@tanstack/query-sync-storage-persister` | 5.104.1 | 2026-10-02 | **DÉPRÉCIÉ** (`@deprecated use createAsyncStoragePersister` dans les types ; doc : « will be removed in the next major version ») |
| `@tanstack/query-async-storage-persister` | 5.104.1 | 2026-10-02 | à utiliser à la place, fonctionne aussi avec `localStorage` |
| `@tanstack/eslint-plugin-query` | 5.104.1 | | règles : `exhaustive-deps`, `no-rest-destructuring`, `stable-query-client`, `no-unstable-deps`, `no-void-query-fn`, `mutation-property-order`, `infinite-query-property-order`, **`prefer-query-options`** (nouvelle) |
| `@tanstack/react-router` | 1.170.41 | 2026-09-30 | |
| `@tanstack/react-start` | 1.168.60 | 2026-09-30 | |
| `@tanstack/router-plugin` | 1.168.42 | 2026-09-30 | |
| `@tanstack/react-router-ssr-query` | 1.167.3 | 2026-09-16 | demande `@tanstack/react-query >=5.102.0` |
| `msw` | **3.0.2** | 2026-10-03 (3.0.0 le 2026-09-28) | ESM uniquement, Node >= 22.12, `typescript >=5.9` en peer |
| `vitest` 5.0.3 · `@testing-library/react` 16.3.3 · `jsdom` 30.1.1 · `react` 19.3.0 · `typescript` 7.0.2 | | | |
| `valibot` 1.5.0 · `zod` 4.6.5 · `arktype` 2.2.7 | | | voir §10 |

**Y a-t-il une v6 ?** Pas pour React. `npm view @tanstack/react-query dist-tags` donne `latest: 5.104.1` et des tags `alpha/beta/rc` qui datent encore de la 5.0. Les « v6 » qui existent sont des versions d'**adaptateurs** : `@tanstack/svelte-query` 6.3.1 (Svelte 5) et `@tanstack/solid-query` 6.0.0-rc.5, tous deux sur le cœur v5. Seule annonce d'une prochaine version majeure pour React : la doc indique que les méthodes dépréciées « will be removed in the next major version ».

**Nouveautés qui nous concernent** (source : `packages/query-core/CHANGELOG.md`) :
- **5.102.0 (22 août 2026)** :
  - nouvelle méthode **`queryClient.query(options)`** (et `infiniteQuery`) ;
  - **dépréciation de `ensureQueryData`, `fetchQuery`, `prefetchQuery`** (et de leurs versions infinite). Le JSDoc de `queryClient.ts` l.196/607/641 dit :
    - `ensureQueryData` → `queryClient.query({ ...options, staleTime: 'static' })` ;
    - `prefetchQuery` → `queryClient.query(options).catch(noop)` (`noop` est exporté par `@tanstack/react-query`).
  - Le guide `docs/framework/react/guides/prefetching.md` (« Using `query` to prefetch ») et la doc Start (`router/docs/start/framework/react/guide/tanstack-query.md` : « uses Query 5.102 or newer, including `queryClient.query` ») utilisent déjà `query()`. **La plupart des articles et exemples en ligne utilisent encore `ensureQueryData`.**
  - Suppression de `experimental_prefetchInRender` et de la propriété `promise` des résultats (`useQuery().promise` + `React.use` n'existent plus).
  - La Suspense se libère dès qu'une donnée est posée avec `setQueryData` (#11036). Utile pour la connexion collègue.
  - Le `retryer` est libéré à la fin de chaque fetch (moins de mémoire retenue).
- 5.103.x : correctifs du partage structurel et des filtres de clé.
- 5.104.0 : build sous Vite 8.
- `QueryFunctionContext` contient maintenant **`client`** (`types.ts` l.174) : la `queryFn` peut lire le cache sans import circulaire. C'est ce qui sert pour l'etag.
- Les callbacks de mutation reçoivent `(data, variables, onMutateResult, context)`, et `context` contient `client`, `meta` et `mutationKey` (`types.ts` l.1259).
- `staleTime: 'static'` existe : plus strict que `Infinity`, il bloque même `invalidateQueries` (`important-defaults.md`).

---

## 2. Patterns recommandés (Router + Query)

Docs lues : `query/docs/framework/react/guides/{query-options,prefetching,important-defaults,polling,render-optimizations,network-mode,window-focus-refetching,suspense}.md`, `router/docs/router/integrations/query.md`, `router/docs/router/guide/external-data-loading.md`, `router/docs/start/framework/react/guide/tanstack-query.md`, et les articles de TkDodo `tan-stack-router-and-query` (26 mai 2026) et `reliable-query-prefetching-with-tanstack-router` (18 août 2026).

### 2.1 `queryOptions()` partagé entre le loader et le composant

Une seule source pour la clé, la `queryFn` et les options. Le loader **déclenche** la lecture sans l'attendre : TkDodo parle de « treat the loader as an event handler ». Le composant lit ensuite avec `useSuspenseQuery`.

```ts
// src/queries/etat.ts
import { queryOptions } from '@tanstack/react-query'
export const etatKeys = {
  tout: ['etat'] as const,
  public: () => ['etat', 'public'] as const,
  collegue: (sessionId: number) => ['etat', 'collegue', sessionId] as const,
}
export const etatPublicOptions = queryOptions({
  queryKey: etatKeys.public(),
  queryFn: lireEtatPublicQueryFn,   // §4 et §5
  staleTime: 30_000,
  // Pas de refetchInterval ici : voir 2.4
})
```

```tsx
// src/routes/index.tsx
import { noop, useSuspenseQuery } from '@tanstack/react-query'
export const Route = createFileRoute('/')({
  // Ne pas attendre : la copie locale est souvent déjà dans le cache, et sinon
  // useSuspenseQuery reprend la même requête en cours (une seule requête réseau).
  loader: ({ context }) => { void context.queryClient.query(etatPublicOptions).catch(noop) },
  component: Accueil,
})
function Accueil() {
  const { data, error } = useSuspenseQuery(etatPublicOptions)
  // data est toujours défini. Si une actualisation échoue alors qu'on a déjà une donnée,
  // `error` est rempli sans rien lever : on affiche alors le bandeau « le service ne répond pas ».
}
```

Réglages du routeur (doc Start et TkDodo) : `context: { queryClient }`, `createRootRouteWithContext<{ queryClient: QueryClient; session: SessionStore }>()`, **`defaultPreloadStaleTime: 0`** (Query décide seule de la fraîcheur), plus `defaultPendingComponent` (squelette) et `defaultErrorComponent`.

**Attention au mode SPA de Start** (`spa-mode.md`, « Dynamic Data in your Shell ») : le `loader` et le `beforeLoad` de la **route racine** s'exécutent **au moment du build**, pendant le prérendu de la coquille. On ne lit donc **jamais** Apps Script dans la racine, seulement dans `/` ou dans une route enfant. Les routes enfants ne sont pas prérendues : leur `pendingComponent` est rendu à leur place.

### 2.2 `useSuspenseQuery` ou `useQuery`

- **`useSuspenseQuery`** pour l'état affiché. La donnée est typée comme toujours définie, les limites Suspense/erreur viennent du routeur, et une erreur n'est levée vers l'`errorComponent` **que s'il n'y a pas encore de donnée**. Avec la copie locale, une erreur d'actualisation reste donc dans `error` et ne casse pas l'écran, comme aujourd'hui avec `background && firstLoadDone`.
- **`useQuery`** pour ce qui est facultatif ou conditionnel (par exemple un observateur `enabled` selon la session). Avec `useSuspenseQuery`, on ne peut utiliser ni `enabled` ni `skipToken`.

### 2.3 `select` pour dériver sans `useMemo`

```ts
// src/queries/selecteurs.ts : fonctions STABLES, définies une fois au niveau du module
export const selectDisponibilites = (e: Etat) => {
  const prisR1: Record<string, number> = {}
  for (const b of e.r1Bookings) prisR1[b.Date] = (prisR1[b.Date] ?? 0) + b.Qte
  const prisR2: Record<string, number> = {}
  for (const b of e.r2Bookings) prisR2[b.ItemID] = (prisR2[b.ItemID] ?? 0) + b.Qte
  return {
    r1: Object.fromEntries(e.r1Days.map(d => [d.Date, d.Capacite - (prisR1[d.Date] ?? 0)])),
    r2: Object.fromEntries(e.r2Items.map(it => [it.ID, it.Stock - (prisR2[it.ID] ?? 0)])),
  }
}
// dans un composant
const { data: dispo } = useSuspenseQuery({ ...etatPublicOptions, select: selectDisponibilites })
```

- `select` ne se relance que si **la fonction** ou **la donnée** change (`render-optimizations.md`). Il faut donc une fonction de module, ou `useCallback`. Avec le React Compiler, une fonction inline est mémorisée automatiquement.
- Le résultat de `select` profite aussi du partage structurel, **mais seulement pour du JSON**. Il faut renvoyer des `Record` ou des tableaux, **pas des `Map`** : une `Map` est vue comme « changée » à chaque fois.
- Chaque observateur relance son propre `select`. Pour un index lourd utilisé par beaucoup de composants (l'équivalent de `idx()`), on peut mémoriser par référence : la référence reste stable grâce au partage structurel. Exemple : `const memo = new WeakMap<Etat, Index>(); const index = (e) => memo.get(e) ?? (memo.set(e, construire(e)), memo.get(e)!)`.

### 2.4 Fraîcheur et actualisation : réglages pour notre cas

| Option | Valeur | Pourquoi |
|---|---|---|
| `staleTime` (public) | `30_000` | pas de relecture à chaque montage ou focus rapproché. La copie locale arrive avec `updatedAt = savedAt` : elle est donc périmée et relue tout de suite |
| `gcTime` | défaut (5 min) | l'état public est toujours observé. Aucun besoin d'aligner sur un `maxAge` : on n'utilise pas `persistQueryClient` |
| `refetchInterval` | `180_000`, **sur un seul observateur** | `polling.md` : « Each QueryObserver … runs its own timer ». Deux composants montés à des moments différents donneraient **deux lectures** toutes les 3 min. On le met dans un seul composant du layout (`<ActualisationAuto/>` qui fait `useQuery({ ...etatPublicOptions, refetchInterval: 180_000 })`), pas dans les `queryOptions` partagées |
| `refetchIntervalInBackground` | `false` (défaut) | en pause quand l'onglet est caché, comme `document.hidden` aujourd'hui |
| `refetchOnWindowFocus` | `true` (défaut) | au retour sur l'onglet, relecture **si c'est périmé** : remplace `refreshMissed` |
| `refetchOnReconnect` | `true` (défaut en mode `online`) | |
| `networkMode` (lectures) | `'online'` (défaut) | en v5, `onlineManager` démarre à `#online = true` (`onlineManager.ts` l.16) et suit seulement les événements. Hors ligne, les nouveaux essais sont mis **en pause** (`fetchStatus: 'paused'`), pas transformés en erreur. On affiche « Vous semblez hors ligne » quand `isPaused` ou `!onlineManager.isOnline()` |
| `networkMode` (écritures) | **`'always'`** | sinon, hors ligne, une réservation se met en pause et repart toute seule plus tard, peut-être après la fermeture de l'onglet. Avec `'always'` l'erreur est immédiate, comme aujourd'hui (voir §7) |
| `structuralSharing` | `true` (défaut) | réponses JSON. C'est ce qui évite un nouveau rendu quand la réponse est `unchanged` (§4) |

Avec React, l'actualisation n'efface plus les saisies : les formulaires ont leur propre état. Il est donc inutile de suspendre l'actualisation pendant la frappe, ce que `autoRefresh` faisait seulement parce que `render()` reconstruisait le DOM. Il reste une course possible entre une lecture et une écriture, traitée au §7.

---

## 3. Copie locale persistante (localStorage)

Docs lues : `query/docs/framework/react/plugins/{persistQueryClient,createSyncStoragePersister,createAsyncStoragePersister,createPersister}.md`. Sources lues : `packages/query-persist-client-core/src/{persist.ts,createPersister.ts}`, `packages/react-query-persist-client/src/PersistQueryClientProvider.tsx`, `packages/react-query/src/{useBaseQuery.ts,suspense.ts}`.

### 3.1 Ce que fait vraiment l'option « officielle »

- `createSyncStoragePersister` est **déprécié** ; on prendrait `createAsyncStoragePersister({ storage: window.localStorage })`.
- `PersistQueryClientProvider` **restaure dans un `useEffect`** (code lu). Conséquences :
  - le premier rendu se fait **sans** la copie locale ; pendant ce temps les requêtes sont `idle` (`_optimisticResults = 'isRestoring'`) ;
  - avec **`useSuspenseQuery`**, `shouldSuspend` vaut `suspense && result.isPending` et **ne tient pas compte de `isRestoring`** (`suspense.ts` l.49). Le composant suspend et lance `fetchOptimistic`, donc **une vraie requête réseau** part pendant la restauration. Depuis 5.102 (#11036), la Suspense se libère quand la restauration pose la donnée, mais on obtient quand même un flash de squelette et une requête lancée trop tôt, sans `since`.
- `persistQueryClient` sans le provider : la restauration (`persistQueryClientRestore`) est **asynchrone** même avec `localStorage` (`await persister.restoreClient()`). Il faudrait l'`await` avant de monter le routeur.
- Ce qu'il faudrait régler de toute façon :
  - `dehydrateOptions.shouldDehydrateQuery: q => q.queryHash === hashPublic` ;
  - **`shouldDehydrateMutation: () => false`**. Par défaut les mutations **en pause** sont persistées ; une réservation en pause hors ligne écrirait **nom, contact, téléphone** dans `localStorage` ;
  - `maxAge` (24 h par défaut ; aujourd'hui 14 jours) avec `gcTime >= maxAge` (limite de `setTimeout` : environ 24 jours) ;
  - `buster` ;
  - throttle d'écriture de 1 s.
- `experimental_createQueryPersister` (persistance par requête, à passer dans `persister:` des seules `etatPublicOptions`) :
  - la restauration se fait **dans** la `queryFn`, donc la requête est `pending` puis suspend brièvement ;
  - `setQueryData` **n'est pas persisté** (issue #6310), alors que nos écritures font justement `setQueryData` avec l'état renvoyé ;
  - et c'est `experimental_`.

### 3.2 Recommandation : hydratation manuelle synchrone, environ 40 lignes

C'est la variante « `initialData` depuis localStorage », appliquée au **cache** plutôt qu'au hook. Elle fonctionne avec le loader, `useSuspenseQuery`, `select` et `queryClient.query`, sans état « restoring », et elle n'écrit que l'état public.

```ts
// src/queries/copie-locale.ts
import type { QueryClient } from '@tanstack/react-query'
import { hashKey } from '@tanstack/react-query'
import { COPIE_CLE, COPIE_VERSION, COPIE_AGE_MAX } from '../api/constantes' // partagées avec le script du <head>
import { etatKeys } from './etat'
import { EtatPublicSchema } from '../api/schemas'
import * as v from 'valibot'

type Copie = { v: number; savedAt: number; data: EtatPublic }

export function lireCopieLocale(): Copie | null {
  try {
    const c = JSON.parse(localStorage.getItem(COPIE_CLE) ?? 'null') as Copie | null
    if (!c || c.v !== COPIE_VERSION || !(Date.now() - c.savedAt < COPIE_AGE_MAX)) return null
    const ok = v.safeParse(EtatPublicSchema, c.data)  // copie corrompue ou ancien format : ignorée
    return ok.success ? { ...c, data: ok.output } : null
  } catch { return null }
}

/** À appeler AVANT le premier rendu (dans getRouter, côté navigateur). */
export function restaurerCopieLocale(qc: QueryClient) {
  const c = lireCopieLocale()
  if (c) qc.setQueryData(etatKeys.public(), c.data, { updatedAt: c.savedAt }) // donc périmée : relue tout de suite
}

/** N'écrit QUE la requête publique, qui ne contient aucune donnée personnelle (contrat de Code.gs). */
export function persisterCopieLocale(qc: QueryClient) {
  const hash = hashKey(etatKeys.public())
  return qc.getQueryCache().subscribe((e) => {
    if (e.type !== 'updated' || e.action.type !== 'success' || e.query.queryHash !== hash) return
    const { data, dataUpdatedAt } = e.query.state
    try { localStorage.setItem(COPIE_CLE, JSON.stringify({ v: COPIE_VERSION, savedAt: dataUpdatedAt, data })) } catch {}
  })
}
```

- `setData` déclenche une action `type: 'success'`, que la donnée vienne d'une lecture ou de `setQueryData` (vérifié dans `query.ts` l.312). Les réponses d'écriture sont donc persistées aussi.
- **Savoir si l'écran montre encore la copie** (l'ancien `dataStale`, qui grisait par exemple la connexion collègue) : `const depuisCopie = result.dataUpdatedAt < DEMARRAGE_APP`, où `DEMARRAGE_APP = Date.now()` est pris au chargement du module. C'est simple et déterministe. `isFetchedAfterMount` ne convient pas : il est faux si la lecture finit avant le montage.
- On se passe de `buster` : c'est `COPIE_VERSION` (aujourd'hui `reservations-cache-v1` ; passer à `-v2` au moment de la migration). Le `maxAge` est `COPIE_AGE_MAX = 14 j`, la valeur actuelle.
- Le schéma (§10) **retire les clés inconnues** (`v.object` de valibot, comme `z.object`). Si un jour le serveur ajoute par erreur un champ personnel à la réponse publique, il ne sera pas recopié dans `localStorage`. C'est le rôle que jouait le `pick` de `saveCache`.
- Si l'équipe veut un composant « officiel » malgré tout : `persistQueryClient` + `createAsyncStoragePersister`, **en attendant `restorePromise` avant `hydrateRoot`/le rendu**, avec `shouldDehydrateQuery` et `shouldDehydrateMutation: () => false`. Ça fait plus de code de réglage que la version manuelle.

---

## 4. Etag / `{ unchanged: true }`

`Code.gs` l.232 : `answer = (json, etag) => (since && etag === since) ? {unchanged:true, etag} : json`.

```ts
// src/queries/etat.ts (suite)
async function lireEtatPublicQueryFn({ client, queryKey, signal }: QueryFunctionContext<ReturnType<typeof etatKeys.public>>): Promise<EtatPublic> {
  const precedent = client.getQueryData<EtatPublic>(queryKey)  // `client` est dans le contexte depuis la v5 (types.ts l.179)
  const rep = await lireEtatPublic({ since: precedent?.etag ?? '', signal }) // api/ : anticipation + lecture doublée + schéma
  if (rep.unchanged) {
    if (precedent) return precedent  // MÊME référence : aucun nouveau rendu des composants qui lisent `data`
    return lireEtatPublic({ since: '', signal }).then(assertComplet) // cas limite : cache vidé entre-temps
  }
  return rep.etat
}
```

- **Une `queryFn` ne doit jamais renvoyer `undefined`.** `query.ts` l.758 lève `"<hash> data is undefined"`, avec en développement le message « Query data cannot be undefined ». D'où la relecture sans `since` dans le cas limite.
- Renvoyer `precedent` : `replaceData(prev, prev)` garde la référence, `dataUpdatedAt` passe à maintenant (la donnée redevient fraîche) et la copie locale est réécrite avec un `savedAt` à jour. Grâce aux propriétés suivies (*tracked properties*), un composant qui ne lit que `data` n'est pas re-rendu.
- **Ne jamais mettre le `since` dans la clé** : la clé décrit la ressource, pas la version.
- Les réponses d'écriture contiennent aussi un `etag` (l'état public de `getPublicState()`, `Code.gs` l.475). Après `setQueryData`, la lecture suivante enverra le bon `since`.

---

## 5. Lecture doublée, nouveaux essais, Apps Script et fetch

### 5.1 La lecture doublée

```ts
// src/api/lecture-doublee.ts
/** Lance `lancer` ; si rien n'a répondu après `delaiMs`, lance une seconde lecture en parallèle.
 *  La première réponse gagne et la perdante est annulée. Réservé aux LECTURES. */
export function lectureDoublee<T>(
  lancer: (signal: AbortSignal) => Promise<T>,
  { signal, delaiMs, premiere }: { signal: AbortSignal; delaiMs: number; premiere?: Promise<T> },
): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason)
  const controleurs = new Set<AbortController>()
  const nouvelle = () => {
    const c = new AbortController(); controleurs.add(c)
    return lancer(AbortSignal.any([signal, c.signal, AbortSignal.timeout(30_000)])) // délai global par essai
  }
  return new Promise<T>((resolve, reject) => {
    let enCours = 0, fini = false
    const finir = () => {
      fini = true; clearTimeout(minuteur)
      signal.removeEventListener('abort', surAnnulation)
      for (const c of controleurs) c.abort()  // annule la perdante (ou l'unique essai)
    }
    const surAnnulation = () => { if (!fini) { finir(); reject(signal.reason) } }
    const suivre = (p: Promise<T>) => {
      enCours++
      p.then(
        (v) => { if (!fini) { finir(); resolve(v) } },
        (e) => { if (--enCours === 0 && !fini) { finir(); reject(e) } }, // tous ont échoué
      )
    }
    const minuteur = setTimeout(() => { if (!fini) suivre(nouvelle()) }, Math.max(0, delaiMs))
    signal.addEventListener('abort', surAnnulation, { once: true })
    suivre(premiere ?? nouvelle())
  })
}
```

- Il faut **utiliser** `signal` dans la `queryFn` : Query détecte qu'on l'a lu (*consumed*) et annule alors la requête quand plus personne n'observe ou sur `cancelQueries` (`query-cancellation.md`). Interrompre un GET ne coûte rien. Pour un POST, l'interruption **n'empêche pas** l'écriture côté serveur.
- **Lecture anticipée** : si la première lecture vient du `<head>` (§6), le délai restant est `6000 - (performance.now() - anticipee.debut)`. Aujourd'hui `hedgedRead` repart de 6 s au moment de `apiGet`, ce qui fait attendre inutilement.
- `AbortSignal.any` / `AbortSignal.timeout` : Chrome 116, Firefox 124, Safari 17.4. Pour de vieux iPad d'établissement, prévoir un petit équivalent (`relier(...signals)` avec des `addEventListener('abort')`).
- Aujourd'hui **aucun fetch n'a de délai maximum** : il peut rester bloqué environ 5 min sous Chrome. Ajouter `AbortSignal.timeout(30_000)` produit une `TimeoutError` (et non une `AbortError` venant du signal de Query) : Query la traite comme une erreur et la soumet à `retry`.

### 5.2 `retry` et `retryDelay`

```ts
// src/api/erreurs.ts
export class ErreurMetier extends Error { override name = 'ErreurMetier' }        // { error: "..." } renvoyé par le script
export class MotDePasseRefuse extends ErreurMetier { override name = 'MotDePasseRefuse' }
export class ErreurService extends Error { override name = 'ErreurService' }      // HTTP non 2xx, HTML au lieu du JSON, CORS
// src/queries/client.ts
const retryTransitoire = (nbEchecs: number, e: unknown) => !(e instanceof ErreurMetier) && nbEchecs < 1 // 1 seul nouvel essai
new QueryClient({ defaultOptions: { queries: { retry: retryTransitoire, retryDelay: 1500, staleTime: 30_000 } } })
```

- Dans `retryer.ts` (l.206-217), `failureCount` vaut 0 au premier échec, d'où `nbEchecs < 1` pour un seul nouvel essai. Par défaut, c'est 3 essais avec un délai exponentiel `min(1000*2^n, 30000)`.
- Mettre `retry` dans les **défauts du QueryClient** plutôt que dans `queryOptions`, sinon le `retry: false` des tests n'a aucun effet (`testing.md` : « defaults are only taken as a fallback »).
- `queryClient.query()` force `retry = false` **si `retry` n'est pas défini** (`queryClient.ts` l.583). Avec un défaut global, c'est réglé. Comme le premier fetch peut venir du loader, ses options déterminent les essais de cette requête en cours.

### 5.3 Ce qu'il faut savoir sur fetch et Apps Script

Sources : `Code.gs` (`ContentService…setMimeType(JSON)`), recherche web (iith.dev/blog/app-script-cors, groupe google-apps-script-community), spécification Fetch.

- **GET `/exec`** → **302** vers `script.googleusercontent.com/macros/echo?user_content_key=…`, qui répond avec `Access-Control-Allow-Origin: *`. On garde `redirect: 'follow'` (le défaut).
  - **Ne pas** utiliser `redirect: 'manual'` (on obtient un `opaqueredirect` illisible) ni `mode: 'no-cors'` (réponse opaque).
  - L'URL de redirection change à chaque requête, donc pas de cache HTTP gênant.
- **Pas d'en-tête personnalisé sur le GET**, ni sur le POST : tout en-tête non « simple » déclenche un **préflight OPTIONS**, auquel Apps Script ne répond pas. Il n'y a **pas** de `doOptions`, contrairement à ce qu'affirment certains résumés, et la requête échoue en CORS.
- **POST** avec `Content-Type: text/plain;charset=utf-8` et un corps JSON : c'est une requête « simple », sans préflight (le code actuel est correct). Le serveur exécute `doPost`, puis répond 302. Le navigateur suit en **GET** (règle 301/302 + POST → GET de la spécification) et lit le résultat à l'URL `echo`.
- **Pages d'erreur Google** (quota, script en panne, déploiement mal réglé, 403/404 passagers) : c'est du HTML **sans en-tête CORS**, donc `fetch` rejette avec une `TypeError` impossible à distinguer d'une coupure réseau. Si une page HTML arrive avec CORS, `res.json()` lève une `SyntaxError`. Dans les deux cas : `ErreurService`, essai à nouveau. Le message affiché distingue hors ligne et service muet avec `navigator.onLine` / `onlineManager`, comme aujourd'hui.
- Si le déploiement est réglé sur « Toute personne disposant d'un compte Google » au lieu de « Tout le monde », la redirection mène vers la page de connexion : erreur CORS permanente.
- `credentials` : laisser le défaut (`same-origin`, donc aucun cookie envoyé vers Google).

```ts
// src/api/transport.ts
async function lireJson(res: Response): Promise<unknown> {
  if (!res.ok) throw new ErreurService(`HTTP ${res.status}`)
  try { return await res.json() } catch (e) { throw new ErreurService('Réponse non JSON', { cause: e }) }
}
export async function postAction(action: string, charge: object, { signal }: { signal?: AbortSignal } = {}) {
  let res: Response
  try {
    res = await fetch(APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...charge }), signal })
  } catch (e) { if ((e as Error).name === 'AbortError') throw e; throw new ErreurService('Réseau', { cause: e }) }
  const data = await lireJson(res) as { error?: string }
  if (data.error === 'Mot de passe incorrect.') throw new MotDePasseRefuse(data.error)
  if (data.error) throw new ErreurMetier(data.error)
  return data
}
```

---

## 6. Lancer la lecture le plus tôt possible (SPA Start)

Docs lues : `router/docs/start/framework/react/guide/spa-mode.md` et `router/docs/router/guide/document-head-management.md` (« Inline Scripts with ScriptOnce »). Sources lues : `@tanstack/react-router@1.170.41` `src/{ScriptOnce.tsx,headContentUtils.tsx,Asset.tsx}`. J'ai fait un test React 19.3 `renderToString` (`sizes/fizz.mjs`) et regardé la coquille générée par l'agent Start (`tanstack-start/o.html` (non versionné)).

**Les faits vérifiés :**
1. En mode SPA, Start prérend la **racine** dans `/_shell.html`. Le bundle part en `<script type="module" async>` et en `modulepreload` (vu dans `o.html`). Il n'y a plus d'`index.html` modifiable à la main.
2. `head().scripts` de la route racine passe **en dernier** dans le `<head>`, après meta, preload, links, CSS du manifeste et styles (`headContentUtils.tsx` l.181-188).
3. Le routeur force `precedence="default"` sur toute `<link rel="stylesheet">` (`Asset.tsx` l.64). React 19 **remonte** alors ces CSS (avec les `preconnect` et le `<title>`) **avant** tout script inline. Test : `<head><meta/><script>early</script><link preconnect/><link stylesheet precedence/>` donne en sortie `meta, stylesheet, preconnect, title, script`.
4. Conséquence : un script inline dans le `<head>` passe **après** la CSS. Or un script classique bloquant attend que les feuilles de style précédentes soient chargées (*script-blocking stylesheet*). C'est le contraire de l'ordre actuel, où le script est avant les CSS.
5. `<ScriptOnce>` n'émet le `<script>` que côté serveur ou prérendu, puis le script se retire lui-même (`;document.currentScript.remove()`). Côté client il rend `null` : pas de problème d'hydratation.

**Recommandation :**
- Lecture anticipée dans un `<ScriptOnce>` placé en **premier enfant du `<head>`** du `shellComponent`. Sa position finale reste après la CSS hoistée, mais c'est sans importance :
  - c'est surtout aux **visites suivantes** que l'etag sert ;
  - à ce moment-là, la CSS (fichier haché) est dans le cache HTTP, ou revalidée en un aller-retour (GitHub Pages : `max-age=600`) ;
  - le script part de toute façon **bien avant** que le bundle soit téléchargé, analysé et que le routeur démarre.
- `head().links` : `preconnect` vers **`https://script.google.com`** et **`https://script.googleusercontent.com`** avec `crossOrigin: 'anonymous'`. Un `fetch` CORS sans cookies utilise une connexion « anonymous » : un preconnect sans `crossorigin` ouvrirait une connexion qui ne servirait pas. React remonte les `preconnect` en tête, donc la poignée TLS se fait pendant que la CSS charge.
- Si on veut éviter même cette attente CSS : `<link rel="preload" as="fetch" crossorigin="anonymous" href={APPS_SCRIPT_URL}>`. React le remonte lui aussi, et la requête démarre au moment où le HTML est analysé, sans JS. En contrepartie, l'URL est figée, donc **pas de `?since=`** pour cette première lecture (la réponse est complète). Le premier `fetch` de l'appli doit utiliser **exactement** cette URL, sinon le navigateur avertit « preload not used ». À réserver au cas où des mesures montreraient un gain.

```tsx
// src/routes/__root.tsx (extrait)
import { ScriptOnce, HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { scriptLectureAnticipee } from '../api/lecture-anticipee'
export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    links: [
      { rel: 'preconnect', href: 'https://script.google.com', crossOrigin: 'anonymous' },
      { rel: 'preconnect', href: 'https://script.googleusercontent.com', crossOrigin: 'anonymous' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="fr"><head><ScriptOnce children={scriptLectureAnticipee} /><HeadContent /></head>
      <body>{children}<Scripts /></body></html>
  ),
  // AUCUN loader/beforeLoad qui lit Apps Script ici : il s'exécuterait au build (prérendu de la coquille)
})
```

```ts
// src/api/lecture-anticipee.ts : même clé, même version et même âge max que copie-locale.ts
export const scriptLectureAnticipee = `(function(){try{var s='';try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(COPIE_CLE)})||'null');
if(c&&c.v===${COPIE_VERSION}&&Date.now()-c.savedAt<${COPIE_AGE_MAX}&&c.data&&c.data.etag)s=c.data.etag}catch(e){}
var p=fetch(${JSON.stringify(APPS_SCRIPT_URL)}+(s?'?since='+encodeURIComponent(s):''));p.catch(function(){});
window.__RESA_ANTICIPEE__={since:s,reponse:p,debut:performance.now()}}catch(e){}})()`

/** Rend la lecture anticipée une seule fois, et seulement si son `since` correspond. On garde la Response,
 *  pas `r.json()`, pour appliquer ensuite exactement le même traitement d'erreur que les autres lectures. */
export function prendreLectureAnticipee(since: string) {
  const a = (globalThis as { __RESA_ANTICIPEE__?: { since: string; reponse: Promise<Response>; debut: number } }).__RESA_ANTICIPEE__
  if (!a) return null
  delete (globalThis as Record<string, unknown>).__RESA_ANTICIPEE__
  return a.since === since ? a : null
}
```

- Sans le script, le meilleur point de départ suivant est le **`loader` de `/`**, qui s'exécute à `router.load()` avant le premier rendu. element-admin fait d'ailleurs `await router.load()` avant `hydrateRoot`. En pratique, avec le script, le loader **reprend** la requête déjà partie.
- Il n'y a pas d'intérêt à lancer `queryClient.query` au chargement du module d'entrée : le loader s'exécute pratiquement au même moment.
- Les `modulepreload` sont ajoutés automatiquement par Start : rien à faire.

---

## 7. Mutations (écritures)

Docs lues : `guides/mutations.md` (« Mutation Scopes »), `updates-from-mutation-responses.md`, `optimistic-updates.md` (`useMutationState`), `invalidations-from-mutations.md`. Types lus : `types.ts` l.1259-1360.

**Choix recommandé :** pas de mise à jour optimiste. Le serveur renvoie **l'état complet**, à poser tel quel avec `setQueryData`. La doc Start le dit aussi : « If a mutation returns the complete updated resource, `setQueryData` can update that cache entry directly ». Une mise à jour optimiste donnerait des places « réservées » puis retirées en cas de refus pour manque de places.

```ts
// src/mutations/reservations.ts
import { mutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
type ReservationR1 = { date: string; nom: string; contact: string; classe: string; nbEleve: number; nbProf: number; nbExt: number; observation: string; requestId: string }

export function useReserverR1() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['ecriture', 'reservation', 'r1'],
    scope: { id: 'ecriture' },      // écritures envoyées l'une après l'autre (les suivantes attendent en `isPaused`)
    networkMode: 'always',          // hors ligne : erreur immédiate, pas de pause qui reprendrait toute seule
    retry: false,                   // une écriture n'est jamais rejouée automatiquement
    mutationFn: (v: ReservationR1) => postAction('addBookingR1', v).then(parseEtatPublic),
    onSuccess: async ({ _duplicate, ...etat }) => {
      // Tue toute lecture partie avant ou pendant l'écriture : sa réponse serait plus ancienne (remplace writeSeq)
      await qc.cancelQueries({ queryKey: etatKeys.public() })
      qc.setQueryData(etatKeys.public(), etat)  // sans _duplicate, sinon il serait mis en cache et persisté
      // Un collègue s'est connecté pendant l'envoi : son état complet doit être relu (adoptBookingState)
      void qc.invalidateQueries({ queryKey: ['etat', 'collegue'] })
    },
  })
}
```

```tsx
// Dans le formulaire : requestId créé UNE fois à l'ouverture, conservé si l'on réessaie après une erreur.
// Le formulaire est monté avec key={date} : un nouveau formulaire reçoit un nouvel identifiant.
function FormulaireR1({ date }: { date: string }) {
  const [requestId] = useState(() => crypto.randomUUID())
  const reserver = useReserverR1()
  const envoyer = (champs: ChampsR1) =>
    reserver.mutate({ ...champs, date, requestId }, {
      onSuccess: (rep) => toast(rep._duplicate ? 'Cette réservation était déjà enregistrée.' : 'Réservation enregistrée.'),
    })
  // reserver.isPending → bouton « Envoi… » (aria-busy) ; reserver.error → message sous le formulaire
}
```

- **Où mettre les callbacks** : la mise à jour du cache dans `useMutation` (elle s'exécute même si le composant est démonté) ; le toast et la fermeture du formulaire dans `mutate(…, { onSuccess })` (ils ne s'exécutent pas si le composant a disparu). Utiliser `mutate` plutôt que `mutateAsync`, sauf besoin de `await` : `mutateAsync` rejette, il faut alors un `try/catch`.
- **Erreur métier ou erreur réseau** : `error instanceof ErreurMetier` (par ex. « Plus que 2 places ») donne un message exact et le `requestId` reste valable. Une `ErreurService` après l'envoi est **ambiguë** : l'écriture a peut-être eu lieu. On propose « Réessayer » avec le **même** `requestId` ; le serveur dédoublonne et répond `_duplicate`.
- `throwOnError` : laisser `false` pour les mutations. Une erreur de formulaire ne doit pas remonter à l'error boundary de la route.
- **Écritures du collègue** : la réponse est l'état complet.
  - `qc.setQueryData(etatKeys.collegue(session.id), etat)` ;
  - puis `qc.invalidateQueries({ queryKey: etatKeys.public(), refetchType: 'none' })`, qui marque l'état public périmé sans le relire (il n'est pas observé en mode collègue).
  - On peut aussi recalculer l'état public à partir de l'état complet (les mêmes totaux que `saveCache`) et le poser avec `setQueryData`, pour que la copie locale soit à jour.
- **Indicateur global** : `useIsMutating({ mutationKey: ['ecriture'] })`, ou `useMutationState({ filters: { mutationKey: ['ecriture'], status: 'pending' }, select: m => m.state.variables })`. Les variables contiennent des **données personnelles** : elles ne sont qu'en mémoire, mais il ne faut jamais les afficher ailleurs que dans le formulaire.
- `mutationOptions()` existe aussi (comme `queryOptions`) pour partager clé, scope et `mutationFn`.

---

## 8. Mode collègue

- **Deux clés distinctes**. `['etat','public']` est persisté. `['etat','collegue', sessionId]` contient des données personnelles et n'existe qu'en mémoire.
  - **Jamais le mot de passe ni son empreinte dans la clé** : les clés apparaissent dans les devtools, sont hachées dans `queryHash` et seraient écrites par un persisteur. La doc Start dit « Keep secrets out of keys and serialized query data ».
  - Un `sessionId` (compteur) suffit : une nouvelle connexion donne une nouvelle clé, sans risque de réutiliser des données d'une session précédente.
- **Mot de passe en mémoire seulement** : dans une variable de module du store de session. Ni `localStorage`, ni état React, ni clé.
- **Le store de session** (sans `useEffect`) : un module ordinaire avec `subscribe`/`getSnapshot` pour `useSyncExternalStore`. Il est créé dans `getRouter` et mis dans le `context` du routeur, ce qui le rend lisible par `beforeLoad` et les composants.

```ts
// src/session/session.ts
export type Session = { id: number; motDePasse: string }
export function creerSession(qc: QueryClient) {
  let session: Session | null = null, compteur = 0, derniere = Date.now()
  let minuteur: ReturnType<typeof setTimeout> | undefined
  const abonnes = new Set<() => void>()
  const notifier = () => abonnes.forEach(f => f())
  const INACTIVITE = 600_000
  const armer = () => {
    clearTimeout(minuteur)
    if (!session) return
    minuteur = setTimeout(verifier, INACTIVITE - (Date.now() - derniere))
  }
  const verifier = () => {
    if (!session) return
    if (Date.now() - derniere >= INACTIVITE) store.deconnecter('inactivite'); else armer()
  }
  const store = {
    get: () => session,
    subscribe: (f: () => void) => { abonnes.add(f); return () => abonnes.delete(f) },
    connecter(motDePasse: string, etatComplet: EtatComplet) {
      session = { id: ++compteur, motDePasse }; derniere = Date.now()
      qc.setQueryData(etatKeys.collegue(session.id), etatComplet) // libère la Suspense tout de suite (5.102)
      armer(); notifier()
    },
    async deconnecter(raison: 'manuel' | 'inactivite' | 'mot-de-passe-change') {
      if (!session) return
      session = null; clearTimeout(minuteur); notifier()
      await qc.cancelQueries({ queryKey: ['etat', 'collegue'] })
      qc.removeQueries({ queryKey: ['etat', 'collegue'] })   // purge des données personnelles (Query.destroy annule le retryer)
      qc.getMutationCache().clear()                          // variables (noms, contacts) des écritures passées
      void qc.invalidateQueries({ queryKey: etatKeys.public() }) // l'état public revient à l'écran, à jour
      // + toast selon `raison` ; router.invalidate() si une route /collegue est protégée par beforeLoad
    },
  }
  if (typeof document !== 'undefined') {
    for (const evt of ['pointerdown', 'keydown', 'pointermove', 'touchstart'] as const)
      document.addEventListener(evt, () => { derniere = Date.now() }, { passive: true, capture: true })
    // Les minuteurs sont ralentis dans un onglet en arrière-plan : on vérifie au retour
    document.addEventListener('visibilitychange', () => { if (!document.hidden) verifier() })
  }
  return store
}
export type SessionStore = ReturnType<typeof creerSession>
```

- **Mot de passe changé côté script** : un seul endroit, `new QueryCache({ onError: e => e instanceof MotDePasseRefuse && session.deconnecter('mot-de-passe-change') })`, et la même chose dans `new MutationCache({ onError })`. Cela remplace `adminSessionExpired()`.
- **Lecture de l'état complet** :

```ts
export const etatCollegueOptions = (s: Session) => queryOptions({
  queryKey: etatKeys.collegue(s.id),
  queryFn: ({ signal }) => postAction('getAdminState', { password: s.motDePasse }, { signal }).then(parseEtatComplet),
  staleTime: 30_000,
})
// Hook commun : choisit la source selon la session (une seule clé observée à la fois)
export function useEtat<T>(select: (e: EtatPublic | EtatComplet) => T) {
  const session = useSyncExternalStore(sessionStore.subscribe, sessionStore.get)
  return useSuspenseQuery({ ...(session ? etatCollegueOptions(session) : etatPublicOptions), select })
}
```

  - `getAdminState` est une **lecture** : la lecture doublée serait sans risque. Le code actuel ne la fait pas ; on peut l'ajouter.
  - L'actualisation toutes les 3 min (le composant `<ActualisationAuto/>`) suit la même source.
- **Connexion** : `useMutation({ mutationFn: (mdp) => postAction('getAdminState', { password: mdp }).then(parseEtatComplet), onSuccess: (etat, mdp) => session.connecter(mdp, etat) })`. Pas d'`enabled` à régler : la requête collègue n'existe qu'une fois connecté.
- **Routes** : si un écran `/collegue` dédié est créé, `beforeLoad: ({ context }) => { if (!context.session.get()) throw redirect({ to: '/' }) }`. Après une déconnexion, `router.invalidate()` relance les `beforeLoad`.
  - Rappel : en mode SPA, le `beforeLoad` **de la racine** s'exécute au build. Le garde doit être sur la route `/collegue`.
- `enabled` conditionnel n'est utile qu'avec `useQuery` (par exemple `enabled: !!session`, ou `queryFn: session ? fn : skipToken`). Avec Suspense, on choisit les options comme ci-dessus.

---

## 9. Tests

Docs lues : `guides/testing.md`. Paquets lus : `msw@3.0.2` (README et exports : `http`/`HttpResponse` exportés par `msw` **et** par `msw/http` ; `setupServer` dans `msw/node`) et `vitest@5.0.3` (`advanceTimersByTimeAsync`, `stubGlobal`, `useFakeTimers({ toFake, shouldAdvanceTime })` sont toujours là). Nouveautés de MSW 3, d'après une recherche web (le blog mswjs.io est bloqué) : ESM uniquement, Node 22 minimum, `onUnhandledRequest` renommé `onUnhandledFrame`, `worker.stop()` asynchrone, et surtout **MSW ne modifie plus `setTimeout` pour contourner les faux minuteurs** : il faut avancer les minuteurs pour qu'un `delay()` se résolve.

**Stratégie** :
1. **Fonctions pures et `api/`** (`lectureDoublee`, `lireJson`, schémas, sélecteurs) : Vitest avec un `fetch` simulé par `vi.stubGlobal('fetch', vi.fn())` et des **faux minuteurs**. C'est plus simple que MSW pour maîtriser le temps.
2. **`queryFn` et cache** (etag) : un vrai `QueryClient` sans React.
3. **Composants** : `renderWithClient` + MSW `setupServer` (Node). On simule directement la réponse finale de l'URL `/exec`, sans la 302.
4. **E2E** : Playwright, avec `@msw/playwright` comme element-admin.

```ts
// src/api/lecture-doublee.test.ts
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

it('double la lecture après 6 s et garde la première réponse arrivée', async () => {
  const resoudre: Array<(v: string) => void> = []
  const lancer = vi.fn((_s: AbortSignal) => new Promise<string>((r) => resoudre.push(r)))
  const p = lectureDoublee(lancer, { signal: new AbortController().signal, delaiMs: 6000 })
  expect(lancer).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(5999); expect(lancer).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1);    expect(lancer).toHaveBeenCalledTimes(2)
  resoudre[1]!('seconde')
  await expect(p).resolves.toBe('seconde')
  expect(lancer.mock.calls[0]![0].aborted).toBe(true) // la perdante est annulée
})

it("ne double pas une lecture qui répond avant 6 s", async () => { /* resoudre[0] avant advance → 1 appel */ })
it('rejette quand les deux essais ont échoué', async () => { /* … */ })
```

```ts
// src/queries/etat.test.ts : etag, sans React
it('renvoie la même référence quand le script répond unchanged', async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const etatA = fabriqueEtat({ etag: 'abc' })
  qc.setQueryData(etatKeys.public(), etatA, { updatedAt: 0 })
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ unchanged: true, etag: 'abc' }))
  vi.stubGlobal('fetch', fetchMock)
  const res = await qc.query({ ...etatPublicOptions, staleTime: 0 })
  expect(res).toBe(etatA)                                            // aucun nouveau rendu
  expect(fetchMock.mock.calls[0]![0]).toContain('since=abc')
  expect(qc.getQueryState(etatKeys.public())!.dataUpdatedAt).toBeGreaterThan(0) // redevenue fraîche
})
```

```tsx
// src/test/render.tsx
export const creerClientDeTest = () => new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
})
export function renderWithClient(ui: React.ReactElement, client = creerClientDeTest()) {
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) }
}
// MSW 3 (Node) : src/test/setup.ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
export const server = setupServer(http.get(APPS_SCRIPT_URL, () => HttpResponse.json(etatDeTest)))
beforeAll(() => server.listen({ onUnhandledFrame: 'error' })); afterEach(() => server.resetHandlers()); afterAll(() => server.close())
```

- Un **`QueryClient` neuf par test**, sinon le cache passe d'un test à l'autre (`testing.md`).
- Pour un composant sous Suspense : l'envelopper dans `<Suspense fallback="…">` et attendre avec `findBy…`.
- Pour une route complète : `createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/'] }), context: { queryClient, session } })`.
- Le module de session se teste avec des faux minuteurs : avancer de 600 000 ms et vérifier que `removeQueries` a été appelé (`qc.getQueryCache().findAll({ queryKey: ['etat','collegue'] })` vide).
- Le lint Query (`@tanstack/eslint-plugin-query`) se charge dans **oxlint** avec `jsPlugins` (voir §12).

---

## 10. Types et validation des réponses

**Mesure** (`sizes/`, esbuild 0.28.2, `--bundle --minify`, gzip -9) sur le **même schéma** que notre état (jours, plats, réservations, union `unchanged`) :

| Bibliothèque | Minifié | **gzip** |
|---|---|---|
| **valibot 1.5.0** | 4,8 kB | **1,8 kB** |
| **zod 4.6.5 `zod/mini`** | 16,7 kB | **5,7 kB** |
| zod 4.6.5 classique `import * as z from 'zod'` | 91 kB | 26,4 kB |
| zod 4.6.5 classique `import { z } from 'zod'` | 454 kB | 92 kB (toutes les locales incluses, pour esbuild) |
| arktype 2.2.7 | 155 kB | 47 kB |
| *(comparaison)* `@tanstack/react-query` (hooks principaux) | 35 kB | 10,4 kB |
| *(comparaison)* persist-client + async-storage-persister | 5,4 kB | 2,1 kB |

**Performance** : quelques centaines de lignes toutes les 3 minutes, c'est négligeable pour les trois bibliothèques. On saute la validation quand la réponse est `unchanged`. Le critère est donc le **poids**.

**Recommandation : valider à la frontière (`api/`) avec Valibot.** C'est le plus léger, il est déjà utilisé par element-admin (même chaîne d'outils) et il implémente Standard Schema, donc il est compatible avec TanStack Form/Router si besoin. Les types se déduisent des schémas (`v.InferOutput`). Pourquoi ne pas se contenter des types TypeScript :
- Apps Script renvoie des cellules Sheets : nombres parfois en chaîne, `''` pour un vide, `Ticket` codé dans le nom. Un schéma avec `v.transform` **normalise** au même endroit (il remplace `withTicketFlags` et les `Number(x||0)` répandus partout).
- Une page HTML ou une réponse inattendue devient une `ErreurService` claire, plutôt qu'un `undefined.map` dans un composant.
- `v.object` **retire les clés inconnues** : une protection de plus pour la copie locale (§3).
- Si l'équipe préfère Zod : `zod/mini` (5,7 kB) avec `import * as z from 'zod/mini'`. Éviter le Zod classique côté client.

```ts
// src/api/schemas.ts
import * as v from 'valibot'
const Nombre = v.pipe(v.union([v.number(), v.string()]), v.transform((x) => Number(x) || 0))
const TICKET_RE = /\s*\(ticket restaurant\)\s*$/i
const Plat = v.pipe(
  v.object({ ID: v.string(), Date: v.string(), Nom: v.string(), Stock: Nombre, Prix: v.optional(v.union([v.number(), v.string()]), '') }),
  v.transform((it) => ({ ...it, Ticket: TICKET_RE.test(it.Nom), Nom: it.Nom.replace(TICKET_RE, '') })),
)
export const EtatPublicSchema = v.object({
  etag: v.string(),
  r1Days: v.array(v.object({ Date: v.string(), Capacite: Nombre, Theme: v.optional(v.string(), ''), Menu: v.optional(v.string(), '') })),
  r2Days: v.array(v.object({ Date: v.string(), Theme: v.optional(v.string(), ''), Note: v.optional(v.string(), '') })),
  r2Items: v.array(Plat),
  r1Bookings: v.array(v.object({ Date: v.string(), Qte: Nombre })),
  r2Bookings: v.array(v.object({ ItemID: v.string(), Qte: Nombre })),
  name1: v.string(), name2: v.string(), /* … paramètres … */
})
export const ReponseLecture = v.union([v.object({ unchanged: v.literal(true), etag: v.string() }), EtatPublicSchema])
export type EtatPublic = v.InferOutput<typeof EtatPublicSchema>
```

Attention : une copie déjà normalisée, relue depuis `localStorage`, repasse par le schéma. Les transformations doivent donc être **idempotentes** : `Ticket` déjà présent, nom déjà sans la mention. Le plus simple est de persister la sortie et de la revalider avec un schéma « sortie » sans transformation, ou de garder `v.transform` idempotent comme ci-dessus.

---

## 11. Architecture recommandée pour ce projet

### Clés de requête

```
['etat']                              ← racine : invalidateQueries({queryKey:['etat']}) touche tout
['etat','public']                     ← état public : persisté dans localStorage, lecture anticipée, etag
['etat','collegue', <sessionId>]      ← état complet : mémoire seulement, purgé à la déconnexion
['ecriture', <domaine>, <action>]     ← mutationKey (ex. ['ecriture','reservation','r1'], ['ecriture','jour','supprimer'])
scope: { id: 'ecriture' }             ← toutes les écritures à la suite
```

### Découpage des modules

```
src/
  api/                       ← aucun import React ni Query (testable seul)
    constantes.ts            APPS_SCRIPT_URL (import.meta.env.VITE_APPS_SCRIPT_URL), COPIE_CLE, COPIE_VERSION, COPIE_AGE_MAX, DOUBLAGE_MS=6000
    erreurs.ts               ErreurMetier, MotDePasseRefuse, ErreurService
    transport.ts             lireJson, getEtat(since, signal), postAction(action, charge, {signal})
    lecture-doublee.ts       lectureDoublee()
    lecture-anticipee.ts     scriptLectureAnticipee (texte du <head>), prendreLectureAnticipee()
    schemas.ts               schémas valibot + types déduits (EtatPublic, EtatComplet, réponses d'écriture)
    etat.ts                  lireEtatPublic({since, signal}) = anticipée ?? lectureDoublee(getEtat) → v.parse
  queries/
    client.ts                creerQueryClient() : défauts (staleTime, retry, retryDelay), QueryCache/MutationCache onError
    etat.ts                  etatKeys, etatPublicOptions (queryFn etag), etatCollegueOptions(session)
    selecteurs.ts            selectDisponibilites, selectJoursR1, … (fonctions stables, résultats en Record)
    copie-locale.ts          restaurerCopieLocale(), persisterCopieLocale()
    use-etat.ts              useEtat(select) : choisit public/collègue ; <ActualisationAuto/> (refetchInterval unique)
  mutations/
    reservations.ts          useReserverR1, useReserverR2 (public)
    collegue.ts              useConnexion, useOuvrirJour, useModifierReservation… (setQueryData de l'état complet)
  session/
    session.ts               creerSession(queryClient) : mot de passe en mémoire, inactivité, purge
  router.tsx                 getRouter() : queryClient + session dans le context ; côté navigateur :
                             restaurerCopieLocale + persisterCopieLocale ; defaultPreloadStaleTime: 0
  routes/__root.tsx          shellComponent (ScriptOnce + preconnect), aucun fetch
  routes/index.tsx           loader → void queryClient.query(etatPublicOptions).catch(noop)
```

### Le démarrage, dans l'ordre

1. Le HTML de la coquille est analysé. Les `preconnect` partent ; le `ScriptOnce` lit l'etag de la copie et lance `fetch(/exec?since=…)`.
2. Le bundle s'exécute. `getRouter()` crée le `QueryClient` et y pose la copie locale (`setQueryData`, `updatedAt = savedAt`), de façon synchrone.
3. `router.load()` lance le loader de `/`, puis `queryClient.query(etatPublicOptions)`. La donnée est périmée, donc la `queryFn` s'exécute, **reprend** la requête anticipée (même `since`) et arme le doublage pour le **temps restant** jusqu'à 6 s.
4. Rendu : `useSuspenseQuery` a déjà la copie et l'affiche tout de suite, avec `depuisCopie = dataUpdatedAt < DEMARRAGE_APP`. Sans copie, c'est le `pendingComponent` (squelette).
5. Réponse :
   - `unchanged` → même référence, la donnée devient fraîche, aucun nouveau rendu des listes ;
   - état complet → partage structurel (seuls les jours modifiés sont re-rendus) et `localStorage` réécrit.
6. Ensuite : `refetchInterval` de 3 min sur un seul observateur, relecture au retour sur l'onglet si c'est périmé, à la reconnexion, et après chaque écriture.

### Réglage par défaut du `QueryClient`

```ts
export function creerQueryClient(onMotDePasseRefuse: () => void) {
  const surErreur = (e: unknown) => { if (e instanceof MotDePasseRefuse) onMotDePasseRefuse() }
  return new QueryClient({
    queryCache: new QueryCache({ onError: surErreur }),
    mutationCache: new MutationCache({ onError: surErreur }),
    defaultOptions: {
      queries: { staleTime: 30_000, retry: retryTransitoire, retryDelay: 1500 },
      mutations: { retry: false, networkMode: 'always' },
    },
  })
}
```

Pour le fournisseur : `setupRouterSsrQueryIntegration({ router, queryClient })` est la voie documentée par Start. Il ajoute le `QueryClientProvider` et la gestion de `redirect()`. Ce qu'il fait au prérendu reste vide, car aucune requête ne s'exécute dans la racine. Autre solution équivalente : l'option `Wrap` du routeur avec un `QueryClientProvider`, ou `wrapQueryClient: false` et notre propre fournisseur. Dans tous les cas il ne faut **qu'un seul** `QueryClient`.

---

## 12. Comparaison avec element-admin

Lecture seule du dépôt `element-admin` (non versionné) (vite 8.3.0, TS 7.0.2, oxlint 1.82.0 + oxlint-tsgolint 7.0.2001, React 19.3, Router 1.170.36, **Query 5.102.8**, valibot 1.5.0, pnpm 11). Je me limite ici à la couche de données et à son lint ; l'outillage général est analysé par un autre agent.

| Sujet | element-admin | Ce que je recommande ici | Commentaire |
|---|---|---|---|
| Persistance | `experimental_createQueryPersister` + `idb-keyval`, en `defaultOptions.queries.persister` (**toutes** les requêtes), `refetchOnRestore: 'always'`, `persisterGc()` au démarrage, `reset()` = `queryClient.clear()` + `idb.clear()` à la déconnexion (`src/query.ts`) | hydratation manuelle de **la seule** requête publique dans `localStorage` | Eux persistent des données d'admin et purgent à la déconnexion. Chez nous, la règle est **jamais de données personnelles** dans le navigateur : on persiste uniquement l'état public. Ils confirment que l'API « experimental » sert en production |
| Fraîcheur | `staleTime: 60_000`, `gcTime: 5 min` | `staleTime: 30_000`, `gcTime` par défaut | même logique |
| Méthodes de loader | `ensureQueryData` ×55, `prefetchQuery` ×19 | `queryClient.query(...)` | Ils sont sur 5.102.8, où ces méthodes sont **déjà dépréciées**, mais `typescript/no-deprecated` n'est pas activé dans leur `.oxlintrc.json`. Chez nous : **activer `typescript/no-deprecated`** (disponible avec `typeAware`) pour l'interdire dès le départ |
| Démarrage | `main.tsx` : `await router.load()` **avant** `hydrateRoot` (coquille prérendue maison, pas Start) | loader de `/` + `ScriptOnce` | Même idée : lancer les loaders avant le rendu. Start SPA le fait de lui-même |
| Routeur | `context: { queryClient }`, `defaultPreload: 'intent'`, `defaultPreloadStaleTime: 0`, `defaultStructuralSharing: true` | idem (sauf `defaultPreload`, inutile sur une page unique) | aligné avec TkDodo |
| Usage | `useSuspenseQuery` ×74, `useQuery` ×30 ; `queryOptions` dans `src/api/*.ts` avec `v.parse(Schema, await res.json())` dans la `queryFn` ; `signal` transmis à `fetch` | idem (api/ + schémas valibot) | même découpage api/ → queryOptions |
| Mutations | `useMutation` + `invalidateQueries` (30) / `setQueryData` (9), toasts dans `onError`/`onSuccess` | `setQueryData` à partir de l'état renvoyé ; `scope` | Notre serveur renvoie l'état complet, donc pas besoin de relire |
| Erreurs | classes `LocalizedError` (i18n) | `ErreurMetier`/`ErreurService`/`MotDePasseRefuse` | même principe de classes à tester avec `instanceof` |
| Auth | store **zustand** avec `persist` + `use-broadcast-ts` | store de module minimal (mot de passe **non** persisté) | Leur jeton OAuth peut être persisté ; notre mot de passe ne doit pas l'être. Zustand n'est pas nécessaire pour 1 valeur |
| Tests | Playwright + **`@msw/playwright`** 0.6.7, `msw` **2.15.0** (pas encore en 3), `allowBuilds: msw: false` dans `pnpm-workspace.yaml` (le postinstall de msw ne sert pas) | Vitest 5 (unitaires) + MSW 3 + Playwright | On peut reprendre leur réglage `allowBuilds` |
| Lint Query | oxlint `"jsPlugins": ["@tanstack/eslint-plugin-router", "@tanstack/eslint-plugin-query", "eslint-plugin-formatjs"]` et règles `@tanstack/query/exhaustive-deps`, `no-rest-destructuring` (warn), `stable-query-client`, `no-unstable-deps`, `infinite-query-property-order`, `no-void-query-fn`, `mutation-property-order` ; `@tanstack/router/create-route-property-order` (warn), `route-param-names`. Mode type-aware : `"options": { "typeAware": true, "typeCheck": true }` | reprendre tel quel, **plus** `@tanstack/query/prefer-query-options` (nouvelle règle de 5.104.1, absente chez eux) et `typescript/no-deprecated` | `typescript/no-floating-promises` est **désactivé** chez eux. Avec notre style `void queryClient.query(...).catch(noop)`, on pourrait l'activer |

---

## 13. Pièges connus

1. **`queryFn` qui renvoie `undefined`** : erreur `"<hash> data is undefined"`. Toujours renvoyer `precedent` ou relire sans `since`.
2. **`_duplicate`** dans la réponse d'écriture : le retirer avant `setQueryData`, sinon il est mis en cache, persisté et fausse le partage structurel.
3. **`refetchInterval` dans les `queryOptions` partagées** : un minuteur par observateur, donc plusieurs lectures toutes les 3 min. Le mettre sur un seul observateur.
4. **`retry` défini dans `queryOptions`** : il passe avant les défauts du client de test (`retry:false` sans effet). Le mettre dans les défauts du `QueryClient`.
5. **`queryClient.query()` force `retry=false`** si aucun `retry` n'est défini. Le premier fetch vient du loader : c'est **ses** options qui comptent.
6. **Méthodes dépréciées** (`ensureQueryData`, `prefetchQuery`, `fetchQuery`) depuis 5.102. **`useQuery().promise` et `experimental_prefetchInRender` supprimés.** Les articles et exemples d'avant août 2026 sont à lire avec prudence.
7. **`createSyncStoragePersister` déprécié.** `PersistQueryClientProvider` restaure dans un `useEffect` (premier rendu sans copie) et **`useSuspenseQuery` lance une requête pendant la restauration** (`shouldSuspend` ignore `isRestoring`).
8. Si l'on utilise `persistQueryClient` : **`shouldDehydrateMutation: () => false`**, sinon des mutations en pause, avec nom et contact, finissent dans `localStorage`. De plus, `gcTime` doit être au moins égal à `maxAge`, et `maxAge` vaut 24 h par défaut.
9. **Secret dans la clé** : jamais de mot de passe ni d'empreinte dans `queryKey`. Utiliser un `sessionId`.
10. **Déconnexion** : `cancelQueries` puis `removeQueries` (`['etat','collegue']`), plus `getMutationCache().clear()`, car les variables gardent des données personnelles 5 min (`gcTime` des mutations).
11. **Course entre lecture et écriture** : `await cancelQueries` **avant** `setQueryData` dans `onSuccess`, sinon une actualisation partie pendant l'écriture remet l'ancien état.
12. **Mode SPA de Start** : `loader` et `beforeLoad` **de la racine** s'exécutent au build. Aucun fetch ni garde de session à cet endroit.
13. **Script inline dans le `<head>`** : React 19 + `Asset` du routeur (`precedence="default"`) remontent les CSS **avant** lui, donc il attend la CSS. C'est acceptable (CSS en cache aux visites suivantes). Sinon : `preload as=fetch`, mais sans `since`.
14. **`preconnect` sans `crossorigin`** pour un `fetch` CORS : connexion inutile. Mettre `crossOrigin: 'anonymous'` et préconnecter aussi `script.google.com`.
15. **Apps Script** : aucun en-tête personnalisé (sinon préflight, que Google ne gère pas) ; POST en `text/plain` ; ni `redirect: 'manual'` ni `no-cors`. Les pages d'erreur Google n'ont pas de CORS (`TypeError`, comme une coupure réseau) ; un 302 après un POST est suivi en GET (c'est normal).
16. **Pas de délai maximum sur fetch** aujourd'hui : ajouter `AbortSignal.timeout`. `AbortSignal.any` demande Safari 17.4 ou plus (prévoir un équivalent pour de vieux iPad).
17. **Interrompre un POST n'annule pas l'écriture** : ne jamais doubler ni rejouer automatiquement une écriture. Le `requestId` couvre la nouvelle tentative **manuelle**.
18. **`networkMode` des mutations à `'online'`** (défaut) : hors ligne, la réservation se met en pause et repart seule plus tard. Utiliser `'always'`, ou afficher `isPaused`.
19. **`select` qui renvoie des `Map`** : pas de partage structurel. Une fonction `select` inline est relancée à chaque rendu (sauf avec le React Compiler).
20. **Minuteurs dans un onglet en arrière-plan** (ralentis, voire figés) : la déconnexion pour inactivité compare les horodatages et revérifie sur `visibilitychange`.
21. **Copie locale relue** : repasser par le schéma, avec des transformations **idempotentes** (Ticket). Tout `localStorage` dans un `try/catch` (navigation privée Safari, quota).
22. **MSW 3** : ESM seulement, Node 22.12 minimum, `onUnhandledFrame`. Il **ne modifie plus `setTimeout`** : avec des faux minuteurs, il faut les avancer pour qu'un `delay()` se résolve.
23. **Zod classique avec `import { z } from 'zod'`** : 92 kB gzip avec esbuild (toutes les locales). Utiliser `zod/mini` ou Valibot.

---

## Sources consultées

- Dépôt : `README.md`, `js/donnees.js`, `js/main.js`, `js/collegue.js`, `index.html` (`<head>`), `Code.gs` (l.44-59, 228-280, 452-475, 558, 717).
- TanStack Query (clone partiel, commit `f4c174b`) :
  - `docs/framework/react/guides/{query-options,prefetching,initial-query-data,important-defaults,polling,network-mode,render-optimizations,mutations,optimistic-updates,testing}.md` ;
  - `docs/framework/react/plugins/{persistQueryClient,createSyncStoragePersister,createAsyncStoragePersister,createPersister}.md` ;
  - `docs/framework/react/devtools.md` ;
  - `packages/query-core/src/{queryClient.ts,query.ts,retryer.ts,types.ts,onlineManager.ts}` ;
  - `packages/query-core/CHANGELOG.md` ;
  - `packages/react-query/src/{useBaseQuery.ts,suspense.ts}` ;
  - `packages/query-persist-client-core/src/{persist.ts,createPersister.ts}` ;
  - `packages/react-query-persist-client/src/PersistQueryClientProvider.tsx`.
- TanStack Router (clone partiel, commit `1f0f20a`) :
  - `docs/router/integrations/query.md` ;
  - `docs/router/guide/{external-data-loading,document-head-management,router-context}.md` ;
  - `docs/start/framework/react/guide/{tanstack-query,spa-mode}.md` ;
  - npm `@tanstack/react-router@1.170.41` `src/{ScriptOnce.tsx,headContentUtils.tsx,Asset.tsx}`.
- TkDodo (dépôt `TkDodo/blog`, car tkdodo.eu est bloqué) : `content/posts/tan-stack-router-and-query/index.mdx` (2026-05-26) et `content/posts/reliable-query-prefetching-with-tanstack-router/index.mdx` (2026-08-18).
- npm : `npm view` (versions, dist-tags, dates, peers) ; `npm pack` de `msw@3.0.2`, `vitest@5.0.3`, `@tanstack/eslint-plugin-query@5.104.1`, `@tanstack/react-router@1.170.41`.
- Mesures : `tanstack-query/sizes/` (projet d’essai ou clone, non versionné) (esbuild 0.28.2, Node 22.22.0) et `sizes/fizz.mjs` (ordre du `<head>` avec React 19.3.0).
- Recherche web : [Release v3.0.0 · mswjs/msw](https://github.com/mswjs/msw/releases/tag/v3.0.0), [Introducing MSW 3.0](https://mswjs.io/blog/introducing-msw-3.0) (extraits du moteur de recherche), [Fixing CORS Errors in Google Apps Script](https://iith.dev/blog/app-script-cors/), [Cors issue with app script (Google Groups)](https://groups.google.com/g/google-apps-script-community/c/zJpevovcFLA), [TanStack Query releases](https://github.com/tanstack/query/releases), [TkDodo blog index](https://tkdodo.eu/blog/all).
- element-admin (lecture seule) : `package.json`, `.oxlintrc.json`, `.npmrc`, `pnpm-workspace.yaml`, `src/{query.ts,router.ts,main.tsx,errors.ts}`, `src/api/well-known-support.ts`, `src/routes/_console.federation.known-domains.$destination.tsx`, `src/stores/auth.ts`.
