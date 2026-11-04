# TanStack Start (mode SPA) + TanStack Router + Vite 8 sur GitHub Pages : recherche technique

*Recherche faite le 3 octobre 2026 pour la migration de « Réservations — restaurants pédagogiques ».*

**Comment tout a été vérifié.** Registre npm (`npm view <pkg> version dist-tags`) ; clone partiel de `TanStack/router` (commit `1f0f20a`, 1er octobre 2026), avec la doc en Markdown dans `docs/` et les exemples dans `examples/react/` ; clone partiel de `reactjs/react.dev` (blog) ; `raw.githubusercontent.com` pour Vite (`docs/blog/announcing-vite8.md`) et les GitHub Actions ; WebFetch sur les issues GitHub ; API REST GitHub pour la config Pages du dépôt. J'ai aussi monté **deux projets d'essai qui compilent, passent la vérification de types et passent les tests** :
`tanstack-start/trial/` (projet d’essai ou clone, non versionné) (Start SPA) et `tanstack-start/trial-router/` (projet d’essai ou clone, non versionné) (Router seul, pour comparer).
Le clone `element-admin/` (projet d’essai ou clone, non versionné) (SPA de production, Router seul) sert de référence.

> Chemins de doc : la doc du routeur n'est plus sous `docs/router/framework/react/…`. Elle est maintenant **à plat** dans `docs/router/{guide,routing,api,how-to,installation}/…`. La doc de Start est dans `docs/start/framework/react/…`.

---

## 1. Versions actuelles et ce qu'elles changent

| Paquet | Version `latest` | Remarque |
|---|---|---|
| `@tanstack/react-start` | **1.168.60** | fournit le plugin `@tanstack/react-start/plugin/vite` |
| `@tanstack/react-router` | **1.170.41** | |
| `@tanstack/router-plugin` | **1.168.42** | à installer seulement **sans** Start (Start embarque le générateur) |
| `@tanstack/react-router-devtools` | 1.167.2 | |
| `@tanstack/react-devtools` / `@tanstack/devtools-vite` | 0.10.13 / 0.8.5 | panneau unifié TanStack (facultatif) |
| `@tanstack/router-cli` | 1.167.40 | `tsr generate` / `tsr watch` |
| `@tanstack/eslint-plugin-router` | 1.162.0 | règle `create-route-property-order` |
| `@tanstack/react-query` | 5.104.1 | |
| `vite` | **8.3.2** (`previous` = 7.3.6) | Rolldown 1.2 + Oxc, Node `^20.19 \|\| >=22.12` |
| `@vitejs/plugin-react` | **6.1.1** | plugin recommandé |
| `@vitejs/plugin-react-oxc` | 0.4.3 | peer `vite ^6.3 \|\| ^7` : **incompatible avec Vite 8**, intégré à plugin-react 6 |
| `@vitejs/plugin-react-swc` | 4.3.3 | inutile avec Vite 8 |
| `rolldown-vite` | 7.3.1, **déprécié** | « Use this package to migrate from Vite 7 to Vite 8 » |
| `react` / `react-dom` | **19.3.0** (9 septembre 2026) | |
| `typescript` | **7.0.2** (natif en Go) | les exemples TanStack l'utilisent ; `tsc --noEmit` passe sur les deux essais |
| `vitest` | 5.0.3 | `@testing-library/react` 16.3.3, `jsdom` 30.1 |
| `valibot` / `zod` / `arktype` | 1.5.0 / 4.6.5 / 2.2.7 | |
| `babel-plugin-react-compiler` | 1.0.0 | `oxc-transform-react` 0.152 existe, mais plugin-react 6.1.1 exige **`~0.145.0`** |

**Vite 8** (sorti le 12 mars 2026, d'après `vitejs/vite: docs/blog/announcing-vite8.md`) :
- **Rolldown** (Rust) remplace à la fois esbuild (dev) et Rollup (build), avec des builds 10 à 30 fois plus rapides. **Oxc** compile TS/JSX et minifie. Une couche de compatibilité convertit `esbuild` et `rollupOptions` en `oxc` et `rolldownOptions`.
- Nouveautés utiles pour nous : **`resolve.tsconfigPaths: true`** (alias `~/*` du tsconfig sans plugin), `server.forwardConsole` (renvoie les erreurs du navigateur dans le terminal), l'option `devtools`, lightningcss inclus par défaut.
- **`@vitejs/plugin-react` v6** fait le Fast Refresh avec Oxc et **ne dépend plus de Babel**. C'est le plugin à utiliser (la v5 marche encore). L'ancien `plugin-react-oxc` n'a plus de raison d'être.
- **React Compiler** : `viteReact({ compiler: true })` passe par `oxc-transform-react`, un portage Rust du compilateur, encore **expérimental**. L'autre voie est `babel({ presets: [reactCompilerPreset()] })` avec `@rolldown/plugin-babel`, `@babel/core` et `babel-plugin-react-compiler`. **Essai : ça marche** avec `npm i -D oxc-transform-react@~0.145.0` : les composants sortent mémoïsés (`react.memo_cache_sentinel` dans le JS produit), et le bundle ne grossit que de 0,25 kB gzip. La version 0.152 échoue sur `ERESOLVE`. element-admin utilise exactement `viteReact({ compiler: true })` avec `oxc-transform-react ^0.145.0`.

**React 19.x : ce qui nous concerne** (react.dev, `src/content/blog/2025/10/01/react-19-2.md` et `2026/09/09/react-19-3.md`) :
- **19.0** : Actions, `useActionState`, `useFormStatus`, `useOptimistic`, `<form action={fn}>`, `use(promise)`. Ça convient à nos formulaires de réservation et aux formulaires du mode collègue : état « en cours », erreurs et réinitialisation, sans `useState` à la main. Le `requestId` anti-doublon garde son rôle.
- **19.2** : `<Activity mode="hidden|visible">` garde l'état d'un panneau masqué (par exemple le formulaire à moitié rempli quand on change de jour), `useEffectEvent` (pour le minuteur d'inactivité du mode collègue et l'actualisation toutes les 3 minutes), `eslint-plugin-react-hooks` v6.
- **19.3** : `<ViewTransition>` stable (transitions du calendrier, à combiner avec `defaultViewTransition` du routeur), Fragment Refs, et **`use(browser())`** de `react-dom`, qui retire un composant du rendu serveur. C'est utile dans la coquille prérendue de Start, pour un composant qui lit `localStorage` (le calendrier en cache).
- **React Compiler 1.0** (octobre 2025) : recommandé pour les nouvelles applis, on n'écrit plus `useMemo` ni `useCallback`.

---

## 2. TanStack Start en mode SPA

Doc : `docs/start/framework/react/guide/spa-mode.md`, `…/static-prerendering.md`, `…/selective-ssr.md`. Exemple officiel le plus proche de notre cas : **`examples/react/start-basic-static`** (`spa.enabled` + `base: '/test/'` + `basepath`).

### Configuration exacte (schéma lu dans `node_modules/@tanstack/start-plugin-core/dist/esm/schema.js`)
```ts
spa: {
  enabled?: boolean        // défaut true si l'objet `spa` est présent
  maskPath?: string        // défaut '/' : URL utilisée pour rendre la coquille (laisser '/')
  prerender?: {            // mêmes options qu'une page prérendue
    outputPath?: string    // défaut '/_shell' -> _shell.html
    crawlLinks?: boolean   // défaut false
    retryCount?: number    // défaut 0
    autoSubfolderIndex?, retryDelay?, headers?, onSuccess?
  }
}
// et aussi : router: { basepath?, routesDirectory?, generatedRouteTree?, … },
// srcDirectory ('src'), serverFns.base ('/_serverFn'), prerender, pages, sitemap, importProtection
```

### Ce que fait le build (vérifié dans `trial/`)
1. `vite build` construit l'environnement **client** (`dist/client/assets/*-[hash].js|css`), puis l'environnement **ssr** (`dist/server/server.js`).
2. Une étape `[prerender]` rend **la racine seule**. À la place des routes, on obtient le `pendingComponent` (ou `defaultPendingComponent`) de la route. Le résultat est écrit dans `dist/client/_shell.html`, ou dans **`dist/client/index.html` avec `prerender: { outputPath: '/index.html' }`** (testé et validé).
3. **On ne déploie que `dist/client/`.** `dist/server/` ne sert qu'au prérendu.
4. La coquille contient : `<html lang>`, le `<head>` produit par `head()` de la racine (meta, title, CSS hashé), les `modulepreload`, un script de restauration du défilement et le JSON d'hydratation. Au démarrage, le client **hydrate** la coquille (`hydrateRoot`) puis navigue vers l'URL réelle.

### Ce qui reste côté « serveur »
- **Le `loader` et le `beforeLoad` de la racine, le code au niveau module de `__root.tsx`, de `router.tsx` et de tout ce qu'ils importent s'exécutent dans Node au moment du build.** Essai : un `localStorage.getItem` au niveau module fait échouer le build (`ReferenceError: localStorage is not defined`, puis `Prerendered 0 pages` et une erreur). Il ne faut donc **pas** appeler Apps Script dans le loader racine : les données seraient figées dans la coquille au moment du build.
- **Server functions (`createServerFn`) et server routes : interdites en pratique.** GitHub Pages n'a pas de serveur, donc `/_serverFn/*` répondrait 404. La doc les présente comme compatibles avec le mode SPA, mais seulement si un serveur est déployé.
- `vite dev` : avec Vite, le serveur de dev ne renvoie **que la coquille**. Vérifié par `curl` : le loader marqué `typeof window` ne s'exécute pas côté serveur. Le bug TanStack/router#8543 (SSR et loaders exécutés côté serveur en dev) **ne touche que Rsbuild** (`TSS_SHELL` non défini).
- **`vite preview` N'EST PAS représentatif.** Il lance `dist/server/server.js` et fait **un vrai SSR**. Vérifié : la route jour est rendue avec le texte « SERVEUR » venu du loader. Pour prévisualiser comme sur Pages, il faut servir `dist/client` avec un serveur statique (voir l'émulateur `tanstack-start/ghpages-emu.mjs` (projet d’essai ou clone, non versionné)).
- Pour couper tout SSR, il n'y a rien d'autre à faire en mode SPA. `createStart({ defaultSsr: false })` et `ssr: false` par route servent au mode SSR (`selective-ssr.md`).
- **Base path** : Start **déduit le basepath du routeur depuis `base` de Vite** (`deriveRouterBasepath` dans `start-plugin-core/dist/esm/planning.js`), puis l'impose à l'hydratation (`router.update({ basepath: process.env.TSS_ROUTER_BASEPATH })` dans `start-client-core/.../hydrateStart.js`). Il est donc **inutile de mettre `basepath` dans `createRouter`**. Vérifié : sans lui, les liens de la coquille sont bien `/reservations-restaurants/r1`. Pour une valeur différente : `tanstackStart({ router: { basepath } })`.

### Start en SPA ou Router seul (avec un prérendu maison comme element-admin) : mesures

| | Start SPA (`trial/`) | Router seul + `@tanstack/router-plugin` (`trial-router/`) |
|---|---|---|
| Chunk principal (valibot, mêmes routes) | **101,8 kB gzip** | **≈ 94 kB gzip** |
| Fichiers de config | `vite.config.ts`, `src/router.tsx` (`getRouter()`), `__root.tsx` qui rend tout le document (`shellComponent`, `HeadContent`, `Scripts`) | `index.html`, `src/main.tsx` (`createRoot` + `RouterProvider`), `vite.config.ts` |
| Coquille HTML | prérendue automatiquement (racine + `pendingComponent`), puis **hydratée** | `index.html` écrit à la main, ou plugin maison (element-admin : `vitePluginPrerender` + `src/prerender.tsx` qui rend un `<Suspense>` en attente) |
| Routage par fichiers, types, découpage du code | oui, avec `autoCodeSplitting` par défaut | oui (`tanstackRouter({ target: 'react', autoCodeSplitting: true })`) |
| `head()` (title/meta par route) | oui, rendu dans la coquille | `head()` exige `<HeadContent />` dans l'arbre ; sinon `<title>` React 19 natif (ce que fait element-admin) |
| Risques | hydratation de la coquille (#8473, #6455), build qui exécute la racine dans Node, `vite preview` trompeur | aucune hydratation, rien côté Node |
| Passage futur au SSR | changer la config (retirer `spa`, ajouter nitro ou un hébergeur) | migration vers Start |
| Hash history possible ? | non documenté ni prévu (Start fait la navigation et l'hydratation lui-même) | oui (`createHashHistory()`) |

Le coût réel de Start est donc **≈ 8 kB gzip**, une couche d'hydratation et un rendu Node au build. Ses apports réels en SPA : `head()` et la coquille générée (title, meta, CSS, modulepreload) sans écrire d'`index.html`, `pendingComponent` affiché tout de suite, conventions officielles (`router.tsx`, `getRouter`), devtools et intégrations Start, et **un chemin direct vers le SSR, le prérendu par page ou des server functions** le jour où l'appli quitte Pages. Les devtools, le routage par fichiers et les types existent aussi sans Start.

**Recommandation.** Techniquement, Router seul est plus simple et plus léger pour cette appli (aucun serveur, données chez Apps Script). element-admin le prouve en production avec la même pile (Router 1.170, Vite 8.3, valibot, React Compiler via oxc). **Mais Start en SPA est un choix tout à fait viable, et c'est celui de l'utilisateur.** Il marche sur Pages (essai concluant) si l'on respecte : racine sans dépendance au navigateur ni à l'URL, `outputPath: '/index.html'` + copie en `404.html`, aucune server function, et des tests réels sur un serveur statique (pas `vite preview`). Le coût est d'environ 8 kB gzip et de quelques pièges d'hydratation listés plus bas.

---

## 3. Déploiement sur GitHub Pages

### État actuel du dépôt (vérifié)
- Il n'y a ni `CNAME`, ni `.github/workflows`, ni `.nojekyll` dans le dépôt local.
- L'API GitHub donne `has_pages: true`. Dernier déploiement `github-pages` le 2 octobre 2026, `environment_url` = **`https://thegaudis.github.io/reservations-restaurants/`**. Les exécutions s'appellent `pages build and deployment` (`dynamic/pages/pages-build-deployment`) : c'est le mode **« Deploy from a branch »** (`main`, racine, avec Jekyll).
- Le base path vaut donc **`/reservations-restaurants/`**. L'ancienne URL est la racine ; le code n'utilise ni chemin, ni `?`, ni `#` (aucun `location.*` ni `URLSearchParams` dans `js/`).

### Configuration
- `vite.config.ts` : `base: '/reservations-restaurants/'`, ou une variable `BASE_PATH` pour passer à `'/'` si un domaine personnalisé arrive (fichier `public/CNAME`, qui sera copié dans `dist/client`).
- Routeur : rien à faire avec Start (basepath déduit). Avec Router seul : `basepath: import.meta.env.BASE_URL`.
- Dans les tests : `location.pathname` du routeur est **sans** le basepath (vérifié : `/collegue/connexion`).

### Fallback 404.html et choix d'historique
- GitHub Pages renvoie `404.html` (avec un **statut 404**) pour tout chemin inconnu. Copier la coquille : `cp dist/client/index.html dist/client/404.html` (script `scripts/post-build.mjs` dans l'essai). Les assets sont en chemins absolus avec le base, donc la page fonctionne à n'importe quelle profondeur. Émulateur testé : `/`=200, `/r1/2026-10-12?reserver=true`=404 mais coquille servie.
- **Recommandation : browser history (par défaut) + 404.html.** Les URL sont propres (`/reservations-restaurants/r1/2026-10-12?reserver=true`), la restauration du défilement et `#ancre` marchent, et Start ne prend en charge que ce mode. Le statut 404 n'a pas d'effet visible dans le navigateur (pas de SEO nécessaire). La hash history (`/#/r1/…`) n'aurait d'intérêt qu'avec Router seul et un hébergeur sans fallback.
- Ancienne URL `…/reservations-restaurants/index.html` (favoris) : ajouter la route `src/routes/index[.]html.tsx` qui fait `redirect({ to: '/', replace: true })`. Testé.

### Workflow GitHub Actions (versions de tags vérifiées sur raw.githubusercontent.com)
Dans **Settings > Pages > Source**, choisir **« GitHub Actions »** à la place de « Deploy from a branch ».
```yaml
# .github/workflows/pages.yml
name: Déployer sur GitHub Pages
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6          # v7 existe aussi
      - uses: actions/setup-node@v6        # v7 existe aussi (ESM)
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run check && npm test     # tsc --noEmit + vitest run
      - run: npm run build                 # vite build && node scripts/post-build.mjs
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with: { path: dist/client }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: '${{ steps.d.outputs.page_url }}' }
    steps:
      - id: d
        uses: actions/deploy-pages@v5
```
- **`.nojekyll` est inutile avec un déploiement par Actions** : Jekyll ne tourne pas. Avec l'ancien mode « branche », il serait **indispensable** : Jekyll ignore les fichiers qui commencent par `_`, et Start produit des chunks `_app-xxxx.js` et `_resto-xxxx.js`. Attention aussi : `upload-pages-artifact` v4+ exclut les fichiers cachés (`.xxx`). Utiliser `include-hidden-files: true` (v5) si on en a besoin (par exemple `.well-known`).
- **Fin des `?v=`** : Vite met une empreinte dans chaque nom d'asset (`index-BGtIk1cW.js`). `index.html` et `404.html` restent des noms fixes, mis en cache environ 10 min par Pages (`max-age=600`). Après un déploiement, un onglet resté ouvert peut demander un chunk qui n'existe plus. Il reçoit alors le HTML de la 404, l'import échoue, et `lazyRouteComponent` **recharge la page une fois** (`isModuleNotFoundError` dans `router-core/dist/esm/utils.js`, clé `tanstack_router_reload:` en sessionStorage). On peut aussi écouter `window.addEventListener('vite:preloadError', …)`.
- La doc officielle du routeur (`docs/router/how-to/deploy-to-production.md` § GitHub Pages) est **périmée** : `peaceiris/actions-gh-pages@v3`, Node 18, `cp dist/index.html dist/404.html`. Avec Start, la sortie est `dist/client`.

---

## 4. « Le maximum d'état dans le routeur »

Docs : `docs/router/guide/search-params.md`, `…/how-to/validate-search-params.md`, `…/guide/data-loading.md`, `…/guide/router-context.md`, `…/guide/authenticated-routes.md`, `…/guide/route-masking.md`, `…/guide/not-found-errors.md`, `…/guide/scroll-restoration.md`, `…/guide/preloading.md`, `…/api/router/retainSearchParamsFunction.md`, `…/stripSearchParamsFunction.md`.

### Quel validateur ? Mesures dans le chunk principal (`validateSearch` n'est **pas** découpé et finit dans le chunk d'entrée)
| | gzip, chunk principal (Router seul) | écart |
|---|---|---|
| `zod` v4 classique | 115,3 kB | **+21 kB** |
| `zod/mini` | 97,6 kB | +3,5 kB |
| **`valibot` 1.5** | **94,0 kB** | ≈ 0 |

- Valibot, ArkType et Effect Schema implémentent **Standard Schema**, et Zod v4 aussi : on passe le schéma **directement** à `validateSearch`, **sans adaptateur**. `@tanstack/zod-adapter` (`zodValidator`, `fallback`) ne sert plus qu'à Zod v3.
- **Recommandation : valibot.** C'est le plus léger, il est cité dans la doc et utilisé par element-admin. Pour le repli, `v.optional(v.fallback(schema, défaut))` (l'équivalent de `.catch()` dans Zod). Une URL abîmée ne casse pas la page.
- Format par défaut des search params : « JSON-first ». `?reserver=true` donne le booléen `true`, mais **`?reserver=1` donne le nombre `1`**, qui tombe donc dans le `fallback` (vérifié par un test). Écrire les liens avec `search={{ reserver: true }}`.

### Arborescence d'exemple (celle de l'essai, à étendre)
```
src/routes/
  __root.tsx               document (shellComponent), head(), contexte typé, notFoundComponent
  _app.tsx                 layout sans chemin : en-tête + nav + <Outlet/> (HORS de la coquille)
  _app/index.tsx           /                         accueil (2 restaurants)
  _app/r1/route.tsx        /r1                       layout R1 + calendrier ; search { mois }
  _app/r1/index.tsx        /r1                       « choisissez un jour »
  _app/r1/$jour.tsx        /r1/2026-10-12?reserver=true   fiche du jour + dialogue
  _app/r2/…                idem, avec ?plat=… et ?mode=emporter|sur-place
  _app/connexion.tsx       /connexion?retour=…
  _app/collegue/route.tsx  /collegue/*               garde beforeLoad
  _app/collegue/index.tsx  /collegue                 tableau de bord
  _app/collegue/r1.$jour.tsx  /collegue/r1/2026-10-12?edition=<id>&ajout=1
  index[.]html.tsx         /index.html -> /          compatibilité ancienne URL
  $.tsx                    attrape-tout 404 (contourne #8473)
```

### Code (vérifié : `tsc --noEmit` OK, 7 tests Vitest au vert dans `trial/`)
```tsx
// src/router.tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { session } from './features/session/session'

export function getRouter() {
  const router = createRouter({
    routeTree,
    context: { session /*, queryClient */ },
    defaultPreload: 'intent',          // précharge code + loader au survol ou au focus
    scrollRestoration: true,
    defaultPendingComponent: () => <p role="status">Chargement…</p>, // aussi rendu dans la coquille
    defaultNotFoundComponent: () => <p>Page introuvable</p>,
    // defaultViewTransition: true,
  })
  session.subscribe(() => { void router.invalidate() }) // connexion ou déconnexion : relance beforeLoad
  return router
}
declare module '@tanstack/react-router' {
  interface Register { router: ReturnType<typeof getRouter> }
}
```
```ts
// src/features/session/session.ts : mot de passe EN MÉMOIRE seulement (comme aujourd'hui), jamais dans l'URL
let motDePasse: string | null = null
const listeners = new Set<() => void>()
export const session = {
  get collegue() { return motDePasse !== null },
  get motDePasse() { return motDePasse },
  connecter(m: string) { motDePasse = m; listeners.forEach((l) => l()) },
  deconnecter() { motDePasse = null; listeners.forEach((l) => l()) },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } },
}
export type Session = typeof session
```
```tsx
// src/routes/__root.tsx
export interface RouterContext { session: Session /* queryClient: QueryClient */ }
export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({ meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' },
                        { title: 'Réservations — restaurants pédagogiques' }],
                 links: [{ rel: 'stylesheet', href: appCss }] }),   // import appCss from '~/app.css?url'
  shellComponent: RootDocument,   // <html lang="fr"><head><HeadContent/></head><body>{children}<TanStackRouterDevtools/><Scripts/></body></html>
  component: Outlet,              // rien qui dépende de l'URL ici (voir les pièges)
  notFoundComponent: () => <p>Page introuvable</p>,
})
```
```tsx
// src/routes/_app/r1/route.tsx : état du calendrier dans l'URL
const search = v.object({ mois: v.optional(v.fallback(IsoMois, '')) })   // IsoMois = pipe(string, regex(/^\d{4}-\d{2}$/))
export const Route = createFileRoute('/_app/r1')({
  validateSearch: search,
  search: { middlewares: [stripSearchParams({ mois: '' })] },   // pas de ?mois= vide dans les liens
  // ou retainSearchParams(['mois']) pour garder le mois en passant d'un jour à l'autre
  component: R1Layout,
})
```
```tsx
// src/routes/_app/r1/$jour.tsx : paramètre validé + dialogue piloté par l'URL
const search = v.object({ reserver: v.optional(v.fallback(v.boolean(), false)) })
export const Route = createFileRoute('/_app/r1/$jour')({
  params: {
    parse: ({ jour }) => { if (!estIsoDate(jour)) throw notFound(); return { jour } },
    stringify: ({ jour }) => ({ jour }),
  },
  validateSearch: search,                    // hérite aussi de { mois } du parent
  // loaderDeps: ({ search }) => ({ … }),    // seulement si le loader dépend d'un search param
  loader: ({ params, context }) => context.queryClient.ensureQueryData(etatQuery()), // ou données locales
  component: Jour,
})
function Jour() {
  const { reserver } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (<>
    <Link from={Route.fullPath} search={(prev) => ({ ...prev, reserver: true })}>Réserver</Link>
    {reserver && <Dialog onClose={() => navigate({ search: (p) => ({ ...p, reserver: undefined }), replace: true })} />}
  </>)
}
```
```tsx
// src/routes/_app/collegue/route.tsx : garde
export const Route = createFileRoute('/_app/collegue')({
  beforeLoad: ({ context, location }) => {
    if (!context.session.collegue) throw redirect({ to: '/connexion', search: { retour: location.href } })
  },
  component: Outlet,
})
// connexion.tsx, après une connexion réussie : session.connecter(mdp); router.history.push(retour ?? '/collegue')
```
- **Sous-composants** : `getRouteApi('/_app/r1/$jour').useSearch()` évite d'importer `Route` (et les dépendances circulaires).
- **Routes « modales »** : le plus simple et le plus robuste est un search param (`?reserver=true`, `?edition=<id>`). Le retour arrière ferme le dialogue, et le lien se partage ou se recharge. Le *route masking* (`mask` sur `Link`/`navigate`, `createRouteMask`, `unmaskOnReload`) sert quand on veut une URL affichée différente de l'URL réelle. Inutile ici.
- **`loaderDeps`** : n'y mettre **que** les search params utilisés par le loader (comparaison profonde ; un changement relance le loader). Exemple dans element-admin, `src/routes/_console.users.tsx`.
- **Données serveur** : le routeur ne garde que l'état d'UI. L'état Apps Script (etag, actualisation toutes les 3 minutes, cache localStorage, lecture doublée après 6 s) va mieux dans **TanStack Query** : `queryClient` dans le contexte, `ensureQueryData` dans les loaders, `refetchInterval`, `initialData` lue dans localStorage dans un effet ou un composant client, jamais au niveau module. En SPA, `@tanstack/react-router-ssr-query` est inutile. C'est le schéma d'element-admin (`src/router.ts` : `context: { queryClient }`, `defaultPreloadStaleTime: 0`, `defaultStructuralSharing: true`).
- `errorComponent`, `pendingComponent` et `notFoundComponent` se règlent par route ou par défaut sur le routeur. Le dépassement de `validateSearch` arrive dans `errorComponent` avec `routerCode === 'VALIDATE_SEARCH'`, sauf si on utilise `fallback`.
- `useBlocker` (`docs/router/guide/navigation-blocking.md`) bloque la fermeture d'un formulaire collègue modifié et non enregistré.

---

## 5. Routage par fichiers

Docs : `docs/router/routing/file-naming-conventions.md`, `…/file-based-routing.md`, `…/api/file-based-routing.md`, `…/installation/with-vite.md`.
- `__root.tsx` ; `.` imbrique (`r1.$jour.tsx`) ; dossiers avec `route.tsx` (`r1/route.tsx`) ; `index.tsx` ; `$param` ; `$.tsx` attrape-tout ; préfixe `_` = **layout sans chemin** (`_app.tsx` + `_app/…`) ; suffixe `_` = sortir de l'imbrication du parent (`posts_.$id.deep.tsx`) ; `(groupe)/` = dossier ignoré dans l'URL ; préfixe `-` = fichier ou dossier ignoré, pour mettre du code à côté des routes (`-components/`) ; `[.]` échappe un caractère (`index[.]html.tsx`).
- **`createFileRoute('/chemin')` prend toujours un argument**, que le générateur **insère et corrige automatiquement** (`createFileRouteFunction.md` : « Required, but automatically inserted »). On peut écrire `createFileRoute()` ; le plugin remplit le chemin en dev et au build.
- `routeTree.gen.ts` est généré par le plugin Start (ou `@tanstack/router-plugin`, ou `tsr generate`). Le versionner ou non est un choix (les exemples le versionnent) ; l'**ignorer** dans Prettier/ESLint/Biome/oxfmt (`.prettierignore` des exemples : `routeTree.gen.ts`) ; dans VS Code, `files.readonlyInclude`, `files.watcherExclude` et `search.exclude` sur `**/routeTree.gen.ts`.
- Configuration : avec Start, dans `tanstackStart({ router: { routesDirectory, generatedRouteTree, routeFileIgnorePrefix, quoteStyle, … } })`, chemins relatifs à `srcDirectory`. Sans Start : `tanstackRouter({ target: 'react', autoCodeSplitting: true, … })` **avant** `react()`, ou `tsr.config.json` pour le CLI. Valeurs par défaut : `./src/routes`, `./src/routeTree.gen.ts`, préfixe d'exclusion `-`.
- Lint : `@tanstack/eslint-plugin-router` avec la règle `create-route-property-order` (l'ordre des clés compte pour l'inférence de types : `params`/`validateSearch` → `loaderDeps` → `beforeLoad` → `loader` → composants).

---

## 6. Devtools, tests, erreurs fréquentes

**Devtools** : `<TanStackRouterDevtools />` de `@tanstack/react-router-devtools` **renvoie `null` en production** (`process.env.NODE_ENV !== 'development'`). Il n'y a pas besoin de garde `import.meta.env.DEV` (vérifié : aucun code des devtools dans le bundle). `TanStackRouterDevtoolsInProd` les force. Il existe aussi un panneau unifié : `@tanstack/react-devtools` avec le plugin Vite `@tanstack/devtools-vite` (utilisé par element-admin), et `devtools` dans Vite 8.

**Tests** (docs `docs/router/how-to/setup-testing.md`, `…/test-file-based-routing.md`). Configuration validée dans `trial/` : Vitest 5 + jsdom + Testing Library, **sans** le plugin `tanstackStart()` dans `vitest.config.ts`, avec le `routeTree.gen.ts` déjà généré.
```ts
// vitest.config.ts
export default defineConfig({ resolve: { tsconfigPaths: true }, plugins: [viteReact()], test: { environment: 'jsdom' } })
```
```tsx
function rendre(url: string) {
  const router = getRouter()   // même configuration qu'en production
  router.update({ ...router.options, history: createMemoryHistory({ initialEntries: [url] }) })
  render(<RouterProvider router={router} />)
  return router
}
it('garde collègue -> connexion -> retour', async () => {
  const router = rendre('/collegue')
  expect(await screen.findByText('Mot de passe')).toBeTruthy()
  expect(router.state.location.search).toEqual({ retour: '/collegue' })
  await userEvent.click(screen.getByText('Entrer'))
  expect(await screen.findByText('Tableau collègue')).toBeTruthy()
})
```
Les 7 tests passent : dialogue `?reserver=true` ouvert puis fermé par l'URL, `?reserver=1` qui retombe sur `false`, date invalide → `notFound`, attrape-tout, `/index.html` → `/`, garde puis connexion, `stripSearchParams`. Un `Not implemented: window.scrollTo` apparaît dans jsdom ; c'est sans conséquence. Pour tester la logique pure (calcul de prix, places restantes, dates), ce sont des modules TS sans React, testés directement. E2E : Playwright sur un serveur statique `dist/client`. Il n'a pas pu être lancé ici (le téléchargement de Chromium est bloqué).

**Issues ouvertes à connaître** (état au 3 octobre 2026) :
- **#8473** : le mode SPA lève une erreur React **#418** à l'hydratation de la coquille dès que le contenu de la route est disponible au premier rendu (chunk dans les modulepreload, notFound synchrone). React jette le HTML et rerend tout, avec un flash possible. Contournement documenté : une route attrape-tout `src/routes/$.tsx`. Il faut aussi garder la racine minimale.
- **#6455** : erreur d'hydratation sur un accès direct à une route autre que la racine (Cloudflare). Même famille que #8473.
- **#7740** : la `_shell.html` contient la route `/` avec `@cloudflare/vite-plugin`. Ça ne nous concerne pas.
- **#8543** : avec Rsbuild seulement, le dev SSR et exécute les loaders. Corrigé par la PR #8556. Pas de problème avec Vite.
- **#8546** : les preloads générés n'ont pas `fetchPriority="low"` (performance).
- **#7091** : le serveur de dev met 5 à 12 s à démarrer à froid.

---

## 7. Structure de dossiers

Ce qui se fait pour une appli de cette taille (exemples TanStack et element-admin : `src/api/` pour les fabriques `queryOptions`, `src/components/` pour les composants génériques, `src/ui/` pour les composants métier, `src/stores/`, `src/utils/`, `src/routes/` en fichiers à plat) :
```
src/
  routes/                  routes FINES : validateSearch, beforeLoad, loader, composant qui assemble
  features/
    donnees/               client Apps Script (fetch + etag + lecture doublée + requestId), queryOptions, cache localStorage
    calendrier/            Calendrier.tsx, navigation clavier, dates.ts (schémas valibot, utilitaires purs)
    reservation-r1/        FormulaireR1.tsx (useActionState), prix.ts (pur, testé)
    reservation-r2/        FormulaireR2.tsx, regles-cloture.ts (10 h / 12 h, ticket restaurant : pur, testé)
    collegue/              session.ts, écrans d'édition, impression.ts (PRINT_TOKENS)
  components/              Dialog, Champ, Toast… (design-system.css repris tel quel)
  router.tsx  routeTree.gen.ts  app.css
```
Règles : une route **déclare** (validation de l'URL, garde, chargement) et **délègue** à des composants de `features/`. Les règles métier (prix, places, clôture à 10 h, ticket unique) vont dans des fonctions **pures sans React**, testées avec Vitest. Utiliser `getRouteApi()` dans les composants plutôt qu'importer `Route`. Le préfixe `-` (`routes/_app/r1/-components/`) permet de garder près de la route ce qui ne sert qu'à elle.

---

## Projet d'essai : ce qui a marché et ce qui a échoué

`tanstack-start/trial/` (projet d’essai ou clone, non versionné) (Start 1.168.60, Router 1.170.41, Vite 8.3.2, React 19.3.0, valibot 1.5.0, TS 7.0.2, Vitest 5.0.3) :
- ✅ `npm run build` produit `dist/client/{index.html,404.html,assets/}`, avec les URL préfixées `/reservations-restaurants/`. `BASE_PATH=/` donne des URL en `/assets/…`.
- ✅ Basepath déduit de `base` sans option dans `createRouter`.
- ✅ `vite dev` (`http://localhost:5174/reservations-restaurants/`) renvoie la coquille seule, sans SSR des loaders.
- ✅ `tsc --noEmit` et `vitest run` : 7/7.
- ✅ React Compiler (`viteReact({ compiler: true })` + `oxc-transform-react@~0.145.0`).
- ⚠️ `vite preview` fait du **SSR** : il ne reflète pas Pages.
- ❌ `localStorage` au niveau module fait échouer le prérendu.
- ❌ `oxc-transform-react@0.152` : conflit de peer avec plugin-react 6.1.1.
- ❓ L'hydratation dans un vrai navigateur n'a pas pu être testée (Chromium non téléchargeable) ; le statut des URL a été vérifié avec un émulateur Pages (`ghpages-emu.mjs`).

**`vite.config.ts` final :**
```ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

// Site de projet GitHub Pages : https://thegaudis.github.io/reservations-restaurants/
// Domaine personnalisé (CNAME) : BASE_PATH=/ npm run build
const base = process.env.BASE_PATH ?? '/reservations-restaurants/'

export default defineConfig({
  base, // Start en déduit aussi le basepath du routeur
  resolve: { tsconfigPaths: true }, // natif depuis Vite 8
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
        prerender: { outputPath: '/index.html' }, // coquille = dist/client/index.html
      },
    }),
    viteReact({ compiler: true }), // après tanstackStart() ; nécessite oxc-transform-react@~0.145.0 (expérimental)
  ],
})
```
`package.json` (scripts) : `"dev": "vite dev"`, `"build": "vite build && node scripts/post-build.mjs"` (qui copie `index.html` en `404.html`), `"check": "tsc --noEmit"`, `"test": "vitest run"`. Dépendances : `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/react-router-devtools`, `react`, `react-dom`, `valibot` ; en dev : `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react(-dom)`, `@types/node@22`, `vitest`, `jsdom`, `@testing-library/react|dom|user-event`, `oxc-transform-react@~0.145.0`.

---

## Recommandations pour ce projet

1. **Pile** : Vite 8.3 + `@vitejs/plugin-react` 6 (pas `plugin-react-oxc`, pas `rolldown-vite`), React 19.3, TanStack Start 1.168 en `spa`, Router 1.170, **valibot** pour les search params, TanStack Query pour les données Apps Script, TS 7 et Vitest 5. React Compiler possible via oxc, en le gardant facultatif (expérimental).
2. **Start SPA, comme l'utilisateur l'a choisi**, avec `prerender.outputPath: '/index.html'`, la copie en `404.html` et `base: '/reservations-restaurants/'`. Aucune server function. Rien de lié au navigateur au niveau module dans `__root.tsx`, `router.tsx` et leurs imports.
3. **Racine minimale** (document + `<Outlet/>`). En-tête, navigation et liens « actifs » dans un layout sans chemin `_app.tsx`. Une route `$.tsx` attrape-tout pour limiter les erreurs #418 d'hydratation.
4. **URL = état d'UI** : `/r1/2026-10-12?reserver=true`, `/r2/2026-10-12?plat=<id>&mode=emporter`, `?mois=2026-10` sur le calendrier, `/collegue/...?edition=<id>`. Le mot de passe reste **en mémoire** (objet `session` dans le contexte du routeur, `router.invalidate()` à la connexion ou la déconnexion), jamais dans l'URL.
5. **Déploiement** : passer Pages en « GitHub Actions » ; workflow `checkout@v6`, `setup-node@v6` (Node 22), `configure-pages@v6`, `upload-pages-artifact@v5` (`path: dist/client`), `deploy-pages@v5`. Pas de `.nojekyll`. Supprimer les `?v=`. L'URL publique ne change pas. Ajouter `index[.]html.tsx` pour les anciens favoris.
6. **Qualité** : tests de routes via `getRouter()` + `createMemoryHistory`, logique métier pure testée à part, `tsc --noEmit` et les tests dans la CI avant le build. Prévisualiser avec un serveur statique, pas `vite preview`.

## Pièges connus

- `vite preview` d'un projet Start fait du **vrai SSR** (les loaders s'exécutent dans Node) : il ne reflète pas Pages.
- Le loader racine et le code au niveau module s'exécutent **au build**. `window` ou `localStorage` y fait échouer le prérendu, et des données chargées là seraient figées dans la coquille.
- Hydratation de la coquille : erreur React #418 (#8473, #6455) si la racine dépend de l'URL (liens actifs, titre selon la route) ou si le contenu de la route est synchrone. Mitigations : racine neutre, `$.tsx`, et `use(browser())` (React 19.3) pour les composants qui lisent le navigateur.
- `?reserver=1` n'est **pas** un booléen (format JSON-first) : écrire les liens avec `search={{ reserver: true }}` et prévoir un `fallback`.
- `validateSearch` n'est pas découpé : un validateur lourd (zod classique, +21 kB gzip) alourdit le chunk d'entrée.
- `location.pathname` est **sans** basepath dans `beforeLoad` et les tests. Ne jamais coder `/reservations-restaurants` en dur : passer par `Link`, `to` ou `import.meta.env.BASE_URL`.
- GitHub Pages sert la 404 avec un **statut 404** pour les liens profonds : ça ne gêne pas le navigateur, mais les outils de supervision peuvent s'en plaindre. Un chunk introuvable après un déploiement renvoie du HTML ; le routeur recharge alors la page une fois.
- En déploiement par branche (Jekyll), les chunks `_xxx.js` disparaissent. D'où le passage obligatoire au déploiement par Actions (ou un `.nojekyll`). `upload-pages-artifact` v4+ ignore les fichiers cachés.
- `createFileRoute('/…')` : le chemin est réécrit par le générateur, il ne faut pas lutter contre. Penser à exclure `routeTree.gen.ts` du formatage et du lint.
- `@tanstack/router-plugin` ne doit **pas** être ajouté à côté de `tanstackStart()` (Start l'intègre). Sans Start, il doit être placé avant `react()`.
- `oxc-transform-react` doit rester en `~0.145.0` tant que plugin-react 6.1.x est utilisé.
- La doc officielle « deploy-to-production § GitHub Pages » est périmée (actions v3, Node 18, `dist/` au lieu de `dist/client`).
