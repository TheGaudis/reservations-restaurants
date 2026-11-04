# React moderne pour la migration de « Réservations — restaurants pédagogiques »

> Recherche technique du 3 octobre 2026. Cible : SPA TanStack Start (mode SPA) + Router + Query + Form + Base UI, avec le maximum d'état dans le routeur et le moins possible de `useState`/`useEffect`.
> Appli analysée : `README.md`, `js/main.js`, `js/donnees.js`, `js/collegue.js`, `js/outils.js`, `js/calendrier.js`, `js/reservation.js`, `js/impression.js`, `js/interface.js`, `index.html`, `Code.gs` (messages d'erreur). Le dossier `docs/spec/` était vide au moment de l'analyse.
> Référence demandée en cours de route : **element-hq/element-admin** (clone en lecture seule dans `element-admin/` (projet d’essai ou clone, non versionné)), consulté pour les questions 2, 3 et 4.

---

## 0. Versions vérifiées et sources

### Versions (registre npm, 3 octobre 2026)

Commande : `npm view <paquet> version` et `npm view <paquet> time --json`.

| Paquet | Version | Remarque |
|---|---|---|
| `react` / `react-dom` | **19.3.0** (9 sept. 2026) | `latest`. 19.2.0 : 1er oct. 2025. 19.1.0 : 28 mars 2025 |
| `babel-plugin-react-compiler` | **1.0.0** | stable depuis le 7 oct. 2025 (blog « React Compiler v1.0 ») |
| `eslint-plugin-react-hooks` | **7.1.1** | contient les règles du compilateur (`configs.flat.recommended`) |
| `@tanstack/react-router` | 1.170.41 | dépend de `@tanstack/react-store ^0.11.2` |
| `@tanstack/react-start` | 1.168.60 | peer `vite >=7` |
| `@tanstack/router-plugin` | 1.168.42 | |
| `@tanstack/react-query` | 5.104.1 | ⚠ `ensureQueryData`/`fetchQuery`/`prefetchQuery` **dépréciés** au profit de `queryClient.query()` |
| `@tanstack/react-form` | 1.33.5 | `useStore` déprécié → `useSelector` |
| `@tanstack/react-store` / `store` | 0.11.2 | API pré-1.0 : `createStore` + `useSelector` (`useStore` déprécié) |
| `zustand` | **5.0.15** | utilisé par element-admin (5.0.15 aussi) |
| `@base-ui/react` | 1.8.0 (4 sept. 2026) | 1.0.0 le 11 déc. 2025 ; doc Markdown livrée **dans le paquet** (`node_modules/@base-ui/react/docs/`) |
| `zod` | 4.6.5 | Standard Schema natif |
| `valibot` | 1.5.0 | utilisé par element-admin |
| `arktype` | 2.2.7 | |
| `vite` | **8.3.2** | bundler **Rolldown** par défaut (dépendance `rolldown ~1.2.11`), minifieur oxc |
| `@vitejs/plugin-react` | 6.1.1 | plus de Babel intégré ; compilateur via `compiler: true` (oxc, expérimental) ou `@rolldown/plugin-babel` + `reactCompilerPreset` |
| `typescript` | **7.0.2** | compilateur natif ; `baseUrl` **supprimé** (TS5102) |
| `vitest` | 5.0.3 | `@vitest/browser-playwright` 5.0.3, `vitest-browser-react` 2.3.0 |
| `@testing-library/react` / `user-event` | 16.3.3 / 14.6.7 | |
| `@playwright/test` | 1.63.0 | |
| `jsdom` / `happy-dom` / `msw` | 30.1.1 / 20.14.5 / 3.0.2 | |
| `eslint` / `typescript-eslint` | 10.12.0 / 8.71.0 | |
| `@fontsource-variable/outfit`, `work-sans` | 5.3.0 | auto-hébergement des polices |

### Documentation consultée (copies locales)

Racine : dossier `react/` du projet de recherche (copies locales de documentation, non versionnées). Chemins relatifs à ce dossier :

- `react-CHANGELOG.md` (raw `facebook/react/main/CHANGELOG.md`)
- `react.dev/src/content/blog/2026/09/09/react-19-3.md`, `blog/2025/10/01/react-19-2.md`, `blog/2025/10/07/react-compiler-1.md`
- `react.dev/src/content/reference/react/{ViewTransition,Activity,useEffectEvent,useSyncExternalStore,use,useActionState}.md`, `reference/react-dom/components/title.md`
- `react.dev/src/content/learn/you-might-not-need-an-effect.md`
- `react.dev/src/content/reference/eslint-plugin-react-hooks/lints/*.md` (les 17 règles)
- `erh/package/README.md` (`eslint-plugin-react-hooks@7.1.1`, `npm pack`)
- `DefaultModuleTypeProvider.ts` (liste des bibliothèques « incompatibles » du compilateur)
- `tsr/docs/router/guide/{search-params,authenticated-routes,router-context,router-events,data-loading,external-data-loading,automatic-code-splitting,render-optimizations,not-found-errors,document-head-management}.md`, `tsr/docs/router/how-to/{deploy-to-production,test-file-based-routing,setup-testing}.md`, `tsr/docs/start/framework/react/guide/{spa-mode,path-aliases}.md`, `build-from-scratch.md`
- `tsq/docs/framework/react/plugins/{persistQueryClient,createPersister}.md`, `guides/polling.md`, `reference/classes/QueryClient.md`
- `tsf/docs/framework/react/guides/{reactivity,validation,focus-management,form-composition}.md`
- `tss/docs/quick-start.md`, `tss/docs/framework/react/quick-start.md`
- `vpr/package/README.md` (`@vitejs/plugin-react@6.1.1`)
- `bundle/node_modules/@base-ui/react/docs/react/{components/toast,components/dialog,handbook/forms}.md`
- `bundle/node_modules/zustand/esm/middleware/*.d.mts`
- element-admin : `src/stores/auth.ts`, `src/stores/locale.ts`, `src/router.ts`, `src/routes/__root.tsx`, `src/routes/_console.tsx`, `src/routes/_auth.tsx`, `src/query.ts`, `src/app.tsx`, `src/main.tsx`, `vite.config.ts`, `tsconfig.json` (NB : `src/background/` ne contient que des images de fond, pas de tâches de fond).
- WebSearch : prise en charge de Temporal (Chrome 144+, Firefox 139+, **pas Safari**), suppression de `baseUrl` dans TS 7.

### Mesures faites

- Taille des bibliothèques : `esbuild 0.28.2 --bundle --minify`, puis gzip -9 (dossier `bundle/`). Voir §9.
- Formats `Intl` : Node 22.22 (ICU embarqué). Voir §7.
- Extraits zod v4 et du store Zustand de session exécutés sous Node (`bundle/t.mjs`, `bundle/zs.mjs`).

---

## 1. React 19.x en octobre 2026

**Version stable : 19.3.0** (9 septembre 2026). Ce qui compte pour une SPA cliente comme la nôtre :

| Fonction | Depuis | Statut | Utilité ici |
|---|---|---|---|
| `ref` passé comme prop ordinaire, fonction de nettoyage des refs callback, `<Context>` utilisé comme provider | 19.0 | stable | **Plus de `forwardRef`** (déprécié) ni de `<Ctx.Provider>`. Composants `ui/` : `function Bouton({ ref, ...props })`. |
| `<title>`, `<meta>`, `<link>` rendus n'importe où et remontés dans `<head>` | 19.0 | stable | Titre de la page ; dans Start, la voie idiomatique reste `head()` de la route racine (voir §2g). |
| Actions, `useActionState`, `useFormStatus`, `<form action>` | 19.0 | stable | **Ne pas mélanger avec TanStack Form.** Le formulaire est géré par TanStack Form et l'envoi par `useMutation` ; les Actions React feraient doublon. |
| `useOptimistic` | 19.0 | stable | Pas utile : le script recompte les places sous verrou et peut refuser. On affiche la réponse du serveur, pas une supposition. |
| `use(promise)` / `use(Context)` | 19.0 | stable | `use(Context)` remplace `useContext` (appel conditionnel permis). `use(promise)` est rarement utile avec Router + Query (`useSuspenseQuery` le fait). 19.3 ajoute un avertissement en DEV pour un `use()` appelé de façon conditionnelle. |
| Suspense amélioré (révélations groupées, rendu des fallbacks) | 19.1–19.2 | stable | Utilisé par `pendingComponent` et `useSuspenseQuery`. |
| `<Activity mode="visible|hidden">` | 19.2 | stable | Garder un sous-arbre caché sans le démonter (son état est conservé, ses effets sont coupés). Usage possible : volets du mode collègue repliés, onglet R1/R2 sur mobile. Pas indispensable. 19.3 corrige `useSyncExternalStore` dans un arbre caché. |
| `useEffectEvent` | 19.2 | stable | Seulement **dans** les rares effets légitimes : lire la dernière valeur sans la mettre en dépendance. Ne s'appelle que depuis un effet (le linter le vérifie). |
| `<ViewTransition>` + `addTransitionType` | **19.3** | **stable** | Transitions semaine/mois du calendrier (aujourd'hui `document.startViewTransition`). Ne s'anime que pour une mise à jour dans une Transition, ce qui est le cas des navigations TanStack Router (vérifié : `react-router/dist/esm/Transitioner.js` appelle `React.startTransition`). |
| Fragment refs (`<Fragment ref>` → `FragmentInstance.focus()`, `observeUsing`…) | **19.3** | stable | Mettre le focus sur un groupe sans `div` en plus. |
| Transitions rendues indépendamment | 19.3 | stable | Un rafraîchissement lent ne bloque plus une navigation. |
| `cacheSignal`, `browser()`, APIs `resume`/`prerender` | 19.2–19.3 | — | Serveur ou SSR seulement : **sans objet** ici. |

### React Compiler : stable (1.0)

- `babel-plugin-react-compiler@1.0.0`. Le blog (`react-compiler-1.md`) le recommande pour toute nouvelle appli. Pour le **nouveau code** : laisser le compilateur mémoïser, et garder `useMemo`/`useCallback` comme échappatoire (valeur utilisée comme dépendance d'un effet).
- Avec **Vite 8 + `@vitejs/plugin-react` 6** (README du paquet) :
  - `react({ compiler: true })` utilise `oxc-transform-react`, un portage Rust **expérimental**. element-admin l'utilise déjà : `viteReact({ compiler: true })`.
  - Voie stable : Babel via Rolldown.

```ts
// vite.config.ts : voie « stable » (Babel)
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  base: '/reservations-restaurants/',        // GitHub Pages « projet » (voir §10)
  resolve: { tsconfigPaths: true },          // alias @/ (Vite 8, cf. doc Start path-aliases)
  plugins: [
    tanstackStart({ spa: { enabled: true } }),
    react(),                                 // toujours APRÈS tanstackStart (doc Start)
    babel({ presets: [reactCompilerPreset()] }),
  ],
})
```

- Compatibilité des bibliothèques : la liste « incompatible » du compilateur (`DefaultModuleTypeProvider.ts`) ne contient que `react-hook-form` (`watch`), `@tanstack/react-table` et `@tanstack/react-virtual`. **TanStack Form, Router et Query n'y figurent pas.** Pour Form, lire l'état avec `useSelector(form.store, sel)` ou `<form.Subscribe>`, jamais `form.state.values` directement dans le rendu (ce n'est pas réactif).

### Ce qui change dans la façon d'écrire

1. Pas de `forwardRef`, pas de `memo`/`useMemo`/`useCallback` « par réflexe » : le compilateur s'en charge.
2. Pas de `useEffect` pour charger des données : loaders du routeur + Query.
3. Composants **purs** : pas de `Date.now()`, `new Date()`, `Math.random()` ni `crypto.randomUUID()` dans le rendu (règle `purity`). L'heure vient d'un store « horloge » (§2e), l'identifiant anti-doublon de `useState(() => crypto.randomUUID())`.
4. Les fonctions définies dans un composant sont mémoïsées par le compilateur. Les sélecteurs inline (`select` de Query, `useSearch({ select })`, `useSessionStore(s => …)`) ne coûtent plus rien.

---

## 2. « You might not need an effect » appliqué à l'appli

Le modèle actuel fait tout reconstruire par `render()` et doit alors sauvegarder puis restaurer saisies et focus (`captureUi`/`restoreUi`), et suspendre l'actualisation pendant la frappe (`autoRefresh`). **Avec React, tout cela disparaît.** La réconciliation conserve les champs et le focus, et un rafraîchissement des données ne touche pas aux valeurs de TanStack Form (lues une seule fois dans `defaultValues`). C'est le principal gain de maintenabilité de la migration.

### Critère de décision : où vit un état ?

| Question | Oui → | Exemples dans l'appli |
|---|---|---|
| Doit-il survivre à un rechargement, se partager par lien, ou se fermer avec le bouton Retour ? | **URL (search params)** | jour sélectionné R1/R2, vue semaine/mois, période affichée, formulaire de réservation ouvert (`?resa=r1`), réservation en cours de modification (`?modifier=<id>`, mode collègue) |
| Vient-il du serveur ? | **Cache Query** | état public, état complet (collègue) |
| Est-il global, hors de l'URL, et lu aussi hors React (gardes, timers, client API) ? | **Store Zustand** (module) | session collègue (mot de passe en mémoire), horloge |
| Est-il éphémère, local à un composant, ou contient-il des données personnelles ? | **`useState` local** | panneau de connexion déplié, dialogue de confirmation de suppression, récapitulatif après réservation (contient le nom : jamais dans l'URL), mois affiché dans le sélecteur de date |
| Est-ce une saisie de formulaire ? | **TanStack Form** | tous les formulaires |
| Se calcule-t-il à partir d'autres données ? | **Rien à stocker : calcul au rendu** | places restantes, prix, statut de jour, « commandes closes » |

**Jamais dans l'URL :** mot de passe, nom, e-mail, téléphone. Les URL restent dans l'historique, les journaux, les captures d'écran et le `Referer`.

### (a) État dérivé : calcul au rendu ou `select` de Query

```tsx
// domaine/places.ts : fonctions pures, testées seules
export function placesRestantesR1(etat: Etat, date: DateISO): number | null {
  const jour = etat.r1Days.find((j) => j.Date === date)
  if (!jour) return null
  const prises = etat.r1Bookings
    .filter((b) => b.Date === date)
    .reduce((s, b) => s + b.Qte, 0)
  return jour.Capacite - prises
}

// features/r1/FicheJourR1.tsx
export function FicheJourR1({ date }: { date: DateISO }) {
  const restantes = useEtat((e) => placesRestantesR1(e, date)) // le select se recalcule seulement si l'état change
  // …
}
```

`useEtat(select)` enveloppe `useSuspenseQuery({ ...etatQuery(session), select })`. Le partage structurel de Query évite un nouveau rendu quand le nombre ne change pas. L'index mémorisé de l'ancien code (`idx()`, `cachedStatus`) n'a plus lieu d'être : le compilateur et `select` jouent ce rôle. Si un calcul se révèle coûteux (statuts des 42 cases du mois), une fonction pure `indexerEtat(etat)` mémoïsée avec un `WeakMap` au niveau module reste possible. C'est autorisé : le cache est écrit dans une fonction utilitaire, pas pendant le rendu d'un composant.

### (b) URL ↔ UI : les search params sont la source de vérité

```tsx
// routes/index.tsx
import * as z from 'zod'
import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { DateISO } from '@/domaine/types'

const Vue = z.enum(['semaine', 'mois'])
const recherche = z.object({
  j1: DateISO.optional().catch(undefined),   // jour sélectionné R1 (absent = aujourd'hui)
  j2: DateISO.optional().catch(undefined),
  v1: Vue.default('semaine').catch('semaine'),
  v2: Vue.default('semaine').catch('semaine'),
  resa: z.enum(['r1', 'r2']).optional().catch(undefined),
})

export const Route = createFileRoute('/')({
  validateSearch: recherche,                 // zod v4 : pas d'adaptateur (doc search-params.md)
  search: { middlewares: [stripSearchParams({ v1: 'semaine', v2: 'semaine' })] },
  loader: ({ context: { queryClient } }) =>
    queryClient.query({ ...etatPublicQuery(), staleTime: 'static' }), // cache local → immédiat
  component: Accueil,
})
```

- **« Aujourd'hui » ne se met pas en valeur par défaut dans le schéma** : `validateSearch` doit rester pure. Le composant écrit `const jour = search.j1 ?? aujourdhui`, où `aujourdhui` vient du store horloge.
- `.catch()` plutôt que `.default()` seul : un paramètre invalide (`?j1=2026-13-45`, testé) ne doit pas afficher d'erreur.
- Navigation :

```tsx
<Link to="." search={(s) => ({ ...s, j1: iso, resa: undefined })} aria-pressed={iso === jour}>…</Link>
// ou, dans un gestionnaire clavier :
const navigate = Route.useNavigate()
navigate({ search: (s) => ({ ...s, j1: cible }), replace: true })  // flèches : replace, pour ne pas remplir l'historique
```

- Lecture fine : `Route.useSearch({ select: (s) => s.v1 })` ne provoque pas de rendu quand `j2` change. Activer `defaultStructuralSharing: true` dans le routeur, comme element-admin.
- Composants hors du fichier de route : `getRouteApi('/')` (doc code-splitting).

### (c) Formulaires : TanStack Form + Base UI Field

C'est le modèle documenté par Base UI (`handbook/forms.md`, section TanStack Form). Le composant `<Form>` de Base UI est alors inutile.

```tsx
const form = useAppForm({
  defaultValues: { nom: '', contact: '', classe: '', nbEleve: 0, nbProf: 0, nbExt: 0, observation: '' },
  validators: { onSubmit: schemaReservationR1 },        // Standard Schema (zod)
  validationLogic: revalidateLogic({ mode: 'submit', modeAfterSubmission: 'change' }),
  onSubmit: async ({ value }) => { await reserver.mutateAsync({ ...value, date, requestId }) },
  onSubmitInvalid: () => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
})
const prix = useSelector(form.store, (s) => prixR1(s.values, tarifs)) // prix « en direct » sans effet
```

- `revalidateLogic` reproduit le comportement actuel : messages au premier envoi, puis effacés dès la correction (le `document.addEventListener('input', …)` global d'`outils.js` disparaît).
- `createFormHook` (`form-composition.md`) fournit des composants de champ (`<form.AppField name="nom">{(f) => <f.ChampTexte label="Nom" />}</form.AppField>`) qui encapsulent `Field.Root/Label/Control/Error` de Base UI, une seule fois dans `ui/`.

### (d) Ouverture d'un dialogue ou d'un formulaire

| Cas | Choix | Pourquoi |
|---|---|---|
| Formulaire de réservation | URL `?resa=r1` | Bouton Retour sur mobile ; l'ouverture ne contient aucune donnée personnelle. |
| Modifier une réservation (collègue) | URL `?modifier=<id>`, ou état local | Possible, mais un rechargement perd la session (mot de passe en mémoire) : peu d'intérêt. État local accepté. |
| Confirmation « Supprimer ? » | **local** : `AlertDialog` de Base UI (`open`/`onOpenChange`), ou bouton en deux clics comme aujourd'hui | Éphémère. Base UI rend le focus au déclencheur (`finalFocus`). |
| Panneau de connexion collègue | local | Éphémère ; ne doit pas réapparaître au rechargement. |
| Sélecteur de date (« Ouvrir un jour ») | `Popover` Base UI + mois affiché en état local | Purement visuel. |

Doc Base UI (`dialog.md`) : « `onOpenChange` est recommandé plutôt que `React.useEffect` pour réagir aux changements d'état ».

### (e) Timers : déconnexion après 10 min, actualisation toutes les 3 min, 10 h pile

Règle : **aucun timer dans un composant.** Chaque timer vit dans le module qui possède la donnée.

1. **Actualisation toutes les 3 minutes → Query.** element-admin fait de même (`refetchInterval` dans `src/api/synapse.ts`).

```ts
// features/etat/useEtat.ts
const resultat = useSuspenseQuery({
  ...(motDePasse ? etatCompletQuery(motDePasse) : etatPublicQuery()),
  refetchInterval: 180_000,          // mis en pause si l'onglet est caché (refetchIntervalInBackground: false)
  refetchOnWindowFocus: true,        // rattrapage au retour, comme refreshMissed aujourd'hui
  select,
})
```

`refetchInterval` est passé au point d'appel et **non** dans `queryOptions()` : `queryClient.query()` ne l'accepte pas (doc `QueryClient.md`). L'ancienne règle « ne pas actualiser pendant une saisie ou un envoi » n'est plus nécessaire. Seule précaution : `cancelQueries` avant d'écrire la réponse d'une mutation (§6), pour qu'une lecture plus ancienne n'écrase pas une écriture (rôle de `writeSeq` aujourd'hui).

2. **Déconnexion pour inactivité → store de session** (code au §3). Les écouteurs `pointerdown`/`keydown`/`pointermove`/`scroll`/`visibilitychange` sont posés une fois, au niveau module. Ils n'écrivent qu'une variable non réactive, pour ne provoquer aucun rendu. Un seul `setTimeout` se réarme pour le temps restant (même logique qu'aujourd'hui).

3. **« Aujourd'hui » et clôture R2 à 10 h → store horloge** dont les sélecteurs renvoient des valeurs dérivées. La règle `purity` interdit `new Date()` dans le rendu.

```ts
// lib/horloge.ts
import { create } from 'zustand'
export const useHorloge = create<{ maintenant: number }>()(() => ({ maintenant: Date.now() }))
if (typeof window !== 'undefined') {
  const tic = () => useHorloge.setState({ maintenant: Date.now() })
  setTimeout(() => { tic(); setInterval(tic, 60_000) }, 60_000 - (Date.now() % 60_000)) // aligné sur la minute
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tic() })  // retour de veille
}

// usage : un booléen, donc un nouveau rendu seulement à 10:00
const closes = useHorloge((h) => commandesR2Closes(date, h.maintenant))
```

À 10 h, le formulaire R2 disparaît tout seul : `resa === 'r2' && !closes`. Le `scheduleR2Cutoff` de `main.js` n'a plus de raison d'être.

4. `router.subscribe('onResolved', …)` (doc `router-events.md`) sert aux intégrations impératives après navigation (statistiques, remise à zéro d'un store externe), pas à l'affichage.

### (f) Focus après navigation ou changement d'affichage

- **Dialogues et popovers** : Base UI piège et rend le focus (`initialFocus`/`finalFocus` sur `Dialog.Popup`).
- **Formulaire qui s'ouvre** : `autoFocus` sur le premier champ, ou une ref callback qui défile en douceur (une ref callback n'est pas un effet) :

```tsx
<input autoFocus … />
<section ref={(el) => { if (el && el.getBoundingClientRect().top > innerHeight * 0.6) el.scrollIntoView({ block: 'start' }) }}>
```

- **Formulaire fermé → focus sur « Réserver »**. On reprend la règle de `restoreUi` : si le focus est tombé sur `body` (l'élément qui l'avait a disparu), le premier élément cible remonté le reprend.

```ts
// lib/focus.ts
export const reprendreFocusSiOrphelin = (el: HTMLElement | null) => {
  if (el && document.activeElement === document.body) el.focus({ preventScroll: true })
}
// <button ref={reprendreFocusSiOrphelin}>Réserver</button>
```

- **Calendrier (focus mobile, flèches)** : dans le gestionnaire `onKeyDown` de la grille, si la cible est déjà dans le DOM, `grille.querySelector(`[data-iso="${cible}"]`)?.focus()` puis `navigate(...)`. Si la semaine change, la case montée reprend le focus par `reprendreFocusSiOrphelin`.
- **`flushSync`** seulement pour un état local qu'il faut voir rendu avant de donner le focus, par exemple le mois du sélecteur de date : `flushSync(() => setMois(m)); grille.querySelector(...)?.focus()`. Ne pas l'utiliser pour les navigations du routeur, qui sont des Transitions.

### (g) `document.title` → `head()` de Start, ou `<title>` React 19

Le titre est fixe : `head: () => ({ meta: [{ title: 'Réservations — Restaurants pédagogiques' }, { name: 'description', content: '…' }] })` dans `__root.tsx`, rendu par `<HeadContent />` dans le shell (doc `document-head-management.md`). Il est alors présent dans le HTML pré-rendu. Pour un titre dynamique, rendre `<title>{…}</title>` dans le composant, comme element-admin (`routes/__root.tsx`).

### (h) `localStorage` : jamais d'effet

La persistance se fait dans un module, à l'initialisation et sur un abonnement au cache de requêtes (voir §6, « cache local sans flash »). Pas de `useEffect(() => localStorage.setItem(…))`.

### (i) Impression : depuis le gestionnaire de clic

Une route d'impression ouverte dans un nouvel onglet ne marcherait pas : **le nouvel onglet n'a pas la session**, puisque le mot de passe reste en mémoire dans l'onglet d'origine. On garde donc la fenêtre ouverte depuis le clic. Le module d'impression est chargé à la demande et rend le document React dans cette fenêtre :

```ts
// features/impression/ouvrir.ts (chargé par import() au clic)
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
export async function imprimer(doc: React.ReactNode, titre: string) {
  const w = window.open('', '_blank')
  if (!w) return toast.add({ title: 'Autorisez les fenêtres de ce site pour imprimer.', type: 'error' })
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${titre}</title><style>${PRINT_CSS}</style></head><body><div id="r"></div></body></html>`)
  w.document.close()
  const root = createRoot(w.document.getElementById('r')!)
  flushSync(() => root.render(doc))                              // DOM prêt avant d'imprimer
  await Promise.race([w.document.fonts.ready, new Promise((r) => setTimeout(r, 2000))])
  w.addEventListener('afterprint', () => root.unmount(), { once: true })
  w.print()
}
// <button onClick={async () => (await import('@/features/impression/ouvrir')).imprimer(<ListeJourR1 … />, 'Liste')}>
```

Ainsi les composants `ListeJourR1` et `ResumeDemain` sont testables comme les autres. Les jetons `PRINT_TOKENS` deviennent un CSS importé `?inline`.

### (j) Raccourcis clavier

Il n'y a pas de raccourci global aujourd'hui, seulement le clavier du calendrier (`calKey`), du sélecteur de date (`dpKey`) et la touche Entrée/Échap du mot de passe. **Écouteur sur l'élément** (`onKeyDown` de la grille), jamais sur `window` dans un effet. L'« œuf de Pâques » des 5 clics sur le logo devient un `onClick` avec une `useRef<number[]>` (écrire une ref dans un gestionnaire est permis). Le clic en dehors du sélecteur de date (`document.addEventListener('pointerdown')`) est pris en charge par `Popover` de Base UI.

### (k) `matchMedia` et `prefers-reduced-motion` → CSS

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}
```

`canViewTransition()` et `reduceMotion` (`interface.js`) disparaissent. Si un jour il faut lire un media query en JS : `useSyncExternalStore` (exemple dans la doc), ou `@base-ui/react/unstable-use-media-query` (encore « unstable »).

### Transitions du calendrier

Le précédent/suivant est une navigation de search params. Deux options, **à ne pas cumuler** :

1. Option `viewTransition` du routeur : `<Link search=… viewTransition={{ types: ['suivant', 'r1'] }}>`. Le routeur appelle `document.startViewTransition({ update, types })` (doc `NavigateOptionsType.md`). Les animations CSS existantes (`:active-view-transition-type(...)`) se reprennent presque telles quelles. **C'est l'option recommandée pour une migration « à l'identique ».**
2. `<ViewTransition>` de React 19.3, autour de la grille, avec `addTransitionType`. Plus idiomatique, mais `addTransitionType` doit être appelé dans la Transition, alors que celle du routeur démarre plus tard (navigation asynchrone). Le sens de l'animation doit alors être porté autrement.

### Quand un `useEffect` reste légitime

Synchroniser avec un **système extérieur à React** dont la durée de vie suit un composant : un observateur (`IntersectionObserver` d'un élément), une bibliothèque impérative, `document.documentElement.lang` si la langue changeait. element-admin, 118 fichiers, ne compte que **4 `useEffect` et 1 `useLayoutEffect`** : défilement de l'onglet actif, page suivante d'un tableau virtuel, `lang` du document, retrait du titre provisoire. C'est un bon ordre de grandeur. Ici, viser **0 à 2 effets dans toute l'appli**. Le seul cas documenté par TanStack est `queryErrorResetBoundary.reset()` dans un `errorComponent` (`external-data-loading.md`), évitable : le bouton « Réessayer » appelle `reset()` puis `router.invalidate()`.

### Garde-fous : `eslint-plugin-react-hooks` 7.1.1

`reactHooks.configs.flat.recommended` active ces règles (README 7.1.1) :

| Règle | Interdit | Pourquoi c'est un bon garde-fou ici |
|---|---|---|
| `rules-of-hooks` (error), `exhaustive-deps` (warn) | hooks conditionnels, dépendances manquantes | classique |
| `set-state-in-effect` | `setState` synchrone dans un effet (état dérivé, « loading » posé dans un effet) | interdit en pratique le motif « effet de synchronisation » |
| `set-state-in-render` | `setState` inconditionnel pendant le rendu | évite les boucles |
| `refs` | lire ou écrire `ref.current` pendant le rendu | force le passage par les gestionnaires et les refs callback |
| `purity` | `Date.now()`, `new Date()`, `Math.random()`, `crypto.randomUUID()` dans le rendu | **concerne directement** `todayISO()`, `r2OrdersClosed()` et `newRequestId()` : d'où l'horloge et `useState(() => crypto.randomUUID())` |
| `immutability` | muter props, état ou résultats de hooks | `state` n'est jamais muté (déjà vrai dans l'ancien code) |
| `globals` | assigner ou muter une variable globale pendant le rendu | interdit les `let isAdmin`, `openBookingTarget` modifiés au rendu |
| `static-components` | définir un composant dans un composant | |
| `component-hook-factories` | fabriquer composants ou hooks dans une fonction d'ordre supérieur | tout est défini au niveau module |
| `use-memo` | `useMemo` sans valeur de retour | |
| `preserve-manual-memoization` | mémoïsation manuelle que le compilateur ne peut pas conserver | |
| `incompatible-library` (warn) | API à mutabilité interne (react-hook-form `watch`, TanStack Table/Virtual) | aucune ici |
| `error-boundaries` | `try/catch` autour du rendu des enfants | utiliser `errorComponent` |
| `unsupported-syntax` (warn) | syntaxe non gérée par le compilateur (`eval`, `with`…) | |
| `config`, `gating` | configuration du compilateur invalide | |

À ajouter : `@tanstack/eslint-plugin-router` 1.162 (`create-route-property-order`, important pour l'inférence de types) et `@tanstack/eslint-plugin-query` 5.104.1 (`exhaustive-deps` des clés).

```js
// eslint.config.js
import { defineConfig } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import pluginRouter from '@tanstack/eslint-plugin-router'
import pluginQuery from '@tanstack/eslint-plugin-query'
export default defineConfig([
  reactHooks.configs.flat.recommended,
  ...pluginRouter.configs['flat/recommended'],
  ...pluginQuery.configs['flat/recommended'],
  { rules: { 'no-restricted-imports': ['error', { paths: [{ name: 'zod', importNames: ['z'], message: "import * as z from 'zod' (taille, §9)" }] }] } },
])
```

---

## 3. Session du mode collègue

### Exigences

- Mot de passe **en mémoire seulement** : jamais dans l'URL, ni dans `localStorage`/`sessionStorage`, ni dans une clé de requête Query (les clés sont sérialisées, visibles dans les devtools, et persistables).
- Expiration après 10 min d'inactivité, et aussi quand le serveur répond « Mot de passe incorrect. » pendant une session (mot de passe changé côté script).
- À la fermeture : effacer l'état complet (données personnelles) du cache Query, revenir à l'état public, annoncer la raison (toast), réévaluer les gardes.
- Connexion refusée tant que les données affichées viennent de la copie locale (règle actuelle de `tryLogin`).

### Ce que fait element-admin et ce qu'on en reprend

`src/stores/auth.ts` :

- `create<AuthStore>()(persist(shared((set, get) => ({ …état, …actions })), { name: 'auth' }), { name: 'auth' })` : `create` curried pour l'inférence TS, état et actions dans le même store, `persist` (localStorage, aucune option `partialize`), `shared` de `use-broadcast-ts` pour synchroniser les onglets.
- Usage hors React : `useAuthStore.getState().accessToken(queryClient)` dans le client API ; `useAuthStore.subscribe((avant, apres) => { if (!!avant.credentials !== !!apres.credentials) router.invalidate({ filter }) })` au niveau module.
- **Le store n'est pas injecté dans le contexte du routeur.** `router.ts` ne met que `{ queryClient }` dans le contexte. Les gardes importent le singleton : `beforeLoad: () => { const state = useAuthStore.getState(); if (!state.credentials) throw redirect({ to: '/login', search: { redirect: location.href } }); return { credentials: state.credentials } }` (`routes/_console.tsx`). La garde inverse est dans `_auth.tsx`.
- `clear()` vide les identifiants puis `reset()` (`queryClient.clear()` et vidage d'IndexedDB).
- En composant : `useAuthStore((s) => s.clear)` avec sélecteur. Contre-exemple dans `ui/errors.tsx` : `useAuthStore()` sans sélecteur s'abonne à tout le store.
- Dépendance circulaire `stores/auth.ts → router.ts → routeTree → routes → stores/auth.ts`. Elle fonctionne parce que les accès sont différés, mais elle est fragile.

**Ce qu'il faut adapter pour un mot de passe :**

1. **Pas de `persist`** sur le store de session. element-admin persiste des jetons OAuth (révocables, à durée limitée). Un mot de passe partagé, lui, ne doit jamais toucher le disque. Si plus tard on veut retenir une préférence non sensible (par exemple la vue préférée du collègue), on la met dans un **autre** store, avec `persist(..., { name, storage: createJSONStorage(() => localStorage), partialize: (s) => ({ vue: s.vue }), version: 1 })`, plus un test qui vérifie que le stockage ne contient jamais le mot de passe.
2. **Pas de `shared`** (synchronisation entre onglets) : chaque onglet garde sa propre session en mémoire, comme aujourd'hui.
3. **`subscribeWithSelector`** pour réagir précisément à « connecté → déconnecté » : `store.subscribe(sel, listener)`.
4. Activité notée dans une **variable de module non réactive** : un `set` à chaque `pointermove` réveillerait tous les abonnés.
5. Pour la testabilité, **injecter le store dans le contexte du routeur**, et brancher l'abonnement routeur + Query dans `router.tsx` plutôt que dans le store. Cela supprime le cycle d'imports d'element-admin.

### Recommandation : store Zustand 5 non persisté, injecté dans le contexte

```ts
// features/collegue/session.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export const INACTIVITE_MS = 10 * 60_000
export type FinSession = 'deconnexion' | 'inactivite' | 'mot-de-passe-change'

type SessionState = {
  motDePasse: string | null          // en mémoire seulement : jamais de persist
  fin: FinSession | null             // raison de la dernière fermeture (pour le toast)
  ouvrir: (motDePasse: string) => void
  fermer: (raison: FinSession) => void
}

let derniereActivite = Date.now()    // non réactif : aucun rendu à chaque mouvement
let minuteur: ReturnType<typeof setTimeout> | undefined

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set, get) => ({
    motDePasse: null,
    fin: null,
    ouvrir: (motDePasse) => {
      derniereActivite = Date.now()
      set({ motDePasse, fin: null })
      armer()
    },
    fermer: (raison) => {
      clearTimeout(minuteur)
      if (get().motDePasse !== null) set({ motDePasse: null, fin: raison })
    },
  })),
)

function armer() {
  clearTimeout(minuteur)
  if (useSessionStore.getState().motDePasse === null) return
  const reste = INACTIVITE_MS - (Date.now() - derniereActivite)
  minuteur = setTimeout(
    () => (reste <= 0 ? useSessionStore.getState().fermer('inactivite') : armer()),
    Math.max(reste, 0),
  )
}

// Écouteurs posés une seule fois, au chargement du module (pas d'effet)
if (typeof window !== 'undefined') {
  const noter = () => { derniereActivite = Date.now() }
  for (const t of ['pointerdown', 'pointermove', 'keydown', 'scroll'] as const)
    addEventListener(t, noter, { passive: true, capture: true })
  // Onglet en arrière-plan ou appareil en veille : les timers sont ralentis, on vérifie au retour
  document.addEventListener('visibilitychange', () => { if (!document.hidden) armer() })
}

export const motDePasseCourant = () => useSessionStore.getState().motDePasse // pour le client API
export const useConnecte = () => useSessionStore((s) => s.motDePasse !== null)
```

Ce code a été exécuté sous Node avec un délai de 50 ms (`bundle/zs.mjs`) : une activité à 30 ms repousse l'échéance, et la fermeture `'inactivite'` est bien notifiée.

```ts
// router.tsx (Start : getRouter)
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { queryClient } from '@/api/queryClient'
import { useSessionStore } from '@/features/collegue/session'
import { toast } from '@/ui/toast'
import { etatKeys } from '@/features/etat/queries'

const MESSAGES = {
  inactivite: "Déconnecté du mode collègue après 10 minutes d'inactivité.",
  'mot-de-passe-change': 'Le mot de passe du mode collègue a changé. Reconnectez-vous.',
  deconnexion: 'Retour au mode client.',
} as const

export function getRouter() {
  const router = createRouter({
    routeTree,
    context: { queryClient, session: useSessionStore },   // injecté : remplaçable en test
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,                            // conseillé avec Query (doc data-loading)
    scrollRestoration: true,
  })

  // Connecté → déconnecté : purge des données personnelles, état public, gardes réévaluées
  useSessionStore.subscribe(
    (s) => s.motDePasse !== null,
    (connecte) => {
      if (connecte) return
      queryClient.removeQueries({ queryKey: etatKeys.complet })   // noms, e-mails, téléphones
      const fin = useSessionStore.getState().fin
      if (fin) toast.add({ title: MESSAGES[fin], type: fin === 'deconnexion' ? 'info' : 'error' })
      void router.invalidate()                                     // relance beforeLoad + loaders
    },
  )
  return router
}
```

```tsx
// routes/__root.tsx
interface ContexteRouteur {
  queryClient: QueryClient
  session: typeof useSessionStore
}
export const Route = createRootRouteWithContext<ContexteRouteur>()({ head: …, shellComponent: …, errorComponent: … })

// routes/_collegue.tsx : seulement si des routes réservées aux collègues existent (ex. /parametres)
export const Route = createFileRoute('/_collegue')({
  beforeLoad: ({ context }) => {
    const motDePasse = context.session.getState().motDePasse
    if (!motDePasse) throw redirect({ to: '/', replace: true })
    return { motDePasse }        // typé non-null pour les loaders enfants
  },
})
```

Mot de passe changé côté serveur : un seul endroit, la configuration du `QueryClient`.

```ts
new QueryClient({
  queryCache: new QueryCache({ onError: (e) => { if (e instanceof ErreurMotDePasse) useSessionStore.getState().fermer('mot-de-passe-change') } }),
  mutationCache: new MutationCache({ onError: (e) => { if (e instanceof ErreurMotDePasse) useSessionStore.getState().fermer('mot-de-passe-change') } }),
})
```

Connexion, sans effet :

```ts
async function seConnecter(motDePasse: string) {
  const etat = await api.etatComplet(motDePasse)                 // vérifie le mot de passe ET rapporte l'état complet
  queryClient.setQueryData(etatKeys.complet, etat)               // avant d'ouvrir la session : pas de suspense
  useSessionStore.getState().ouvrir(motDePasse)
}
```

La clé `etatKeys.complet` est `['etat', 'complet']`, **sans** le mot de passe. Le `queryFn` lit `motDePasseCourant()`. Le panneau de connexion utilise un `useMutation` (`isPending` remplace le voile, `error` affiche « Mot de passe incorrect. »).

Dans l'appli actuelle, le mode collègue **enrichit la même page** (formulaires d'ouverture de jour, listes détaillées) plutôt que de mener à d'autres pages. Les composants lisent `useConnecte()`. La garde `beforeLoad` ne sert que si l'on crée des routes dédiées (paramètres, impression). `router.invalidate()` reste utile dans tous les cas : il relance les loaders et redirige si l'on était sur une route protégée.

### Comparaison des options

| Option | Pour | Contre | Verdict |
|---|---|---|---|
| **Zustand 5** (`create` + `subscribeWithSelector`, sans `persist`) | API stable (5.x depuis 2024), aligné sur element-admin, `getState`/`subscribe`/`setState` hors React, sélecteurs, middleware disponibles le jour où il faut persister une préférence (`partialize`). < 1 Ko gzip (mesuré : 408 o pour `create`). | Une dépendance de plus, minuscule. | ✅ **Recommandé** (choix de l'utilisateur, cohérent avec la référence). |
| TanStack Store 0.11 (`createStore`, `useSelector`) | Déjà présent en dépendance transitive de Router et Form (0 Ko de plus). | Pré-1.0 et API mouvante : 0.7 → 0.11 en 18 mois, `useStore` déprécié en 2026. Pas de middleware de persistance. | Acceptable, mais moins sûr à long terme. |
| `useSyncExternalStore` maison (~25 lignes) | Zéro dépendance, transparent. | À maintenir soi-même ; pas de sélecteurs avec égalité, sauf à les écrire. | Bon plan B si l'on refuse Zustand. |
| React Context + `useReducer` | Natif. | Inaccessible hors React : le client API, les gardes `beforeLoad` et les timers en ont besoin. Il faudrait un `useEffect` pour pousser l'état dans `router.update({ context })` (motif de la doc `authenticated-routes.md`), précisément ce qu'on veut éviter. Chaque changement fait re-rendre tous les consommateurs. | ❌ |
| Tout dans les search params | « Tout au routeur ». | **Le mot de passe ne doit jamais aller dans l'URL.** Un `?collegue=1` sans mot de passe n'apporte rien et ment après un rechargement (la session est perdue). | ❌ pour la session. ✅ pour l'état d'affichage (§2b). |

---

## 4. Architecture des dossiers et conventions

### Ce qu'on retient d'element-admin

- Dossiers à plat : `src/api/` (une fabrique `xxxQuery = (...) => queryOptions({...})` par ressource, validation valibot `v.parse` à la frontière), `src/components/` (briques génériques, chacune avec son `*.module.css`), `src/ui/` (composants propres à l'appli), `src/stores/`, `src/utils/`, `src/routes/` (fichiers `_console.users.$userId.tsx` à plat), `query.ts` et `router.ts` à la racine.
- Noms de fichiers en kebab-case, CSS Modules co-localisés, alias `@/*` (`tsconfig.json` sans `baseUrl` ; Vite `resolve.tsconfigPaths: true`), exports nommés.
- Pas de TanStack Start : routeur seul et coquille pré-rendue maison (`prerender.tsx`, `main.tsx` qui fait `await router.load()` avant `hydrateRoot`). Notre choix de Start en mode SPA obtient la même chose (coquille pré-rendue) sans ce code.

Pour une appli de cette taille, découper par **fonctionnalité** sépare mieux les deux restaurants, qui ont des règles très différentes : couverts et tarifs d'un côté ; plats, stocks, tickets et clôture à 10 h de l'autre.

### Arborescence proposée

```
src/
  routes/                      # fin : validation des search params, loader, composition
    __root.tsx                 # head(), shellComponent, Toast.Provider, errorComponent par défaut
    index.tsx                  # page unique : validateSearch + loader + <Accueil/>
    _collegue.tsx              # (optionnel) garde beforeLoad si des routes réservées existent
  router.tsx                   # getRouter() : contexte { queryClient, session }, abonnement de session
  api/
    client.ts                  # fetch Apps Script, lecture doublée (hedge), ErreurApi/ErreurMotDePasse
    actions.ts                 # une fonction typée par action doPost (addBookingR1, …)
    schemas.ts                 # schémas zod des réponses (Etat, Jour, Plat, Reservation), transformations ticket
    queryClient.ts             # QueryClient + persistance de la copie locale
  domaine/                     # PUR : aucun import React, testé à 100 %
    types.ts                   # DateISO, IdPlat… (types dérivés des schémas)
    places.ts  prix.ts  tickets.ts  horaires.ts  calendrier.ts (cases semaine/mois, flèches clavier)
  features/
    etat/        queries.ts (etatKeys, etatPublicQuery, etatCompletQuery), useEtat.ts, copieLocale.ts
    calendrier/  Calendrier.tsx, Calendrier.module.css, Calendrier.test.tsx, CaseJour.tsx
    r1/          FicheJourR1.tsx, FormulaireReservationR1.tsx, schema.ts, mutations.ts, *.test.tsx
    r2/          FicheJourR2.tsx, FormulaireCommandeR2.tsx, schema.ts, mutations.ts
    reservation/ Recapitulatif.tsx, useRequestId.ts (commun R1/R2)
    collegue/    session.ts, Connexion.tsx, TableauDeBord.tsx, Parametres.tsx, OuvrirJourR1.tsx, …
    impression/  ouvrir.ts (lazy), ListeJourR1.tsx, ListeJourR2.tsx, ResumeDemain.tsx, impression.css
  ui/                          # Base UI stylé, sans logique métier
    Bouton.tsx, BoutonsSegmentes.tsx (ToggleGroup), Champ.tsx (Field), ChampNombre.tsx (NumberField),
    Jauge.tsx (Meter), Depliant.tsx (Collapsible), ConfirmerSuppression.tsx (AlertDialog), toast.ts, form.ts (createFormHook)
  lib/                         # utilitaires techniques non métier
    dates.ts (fuseau Paris), format.ts (euros, pluriels, listes), horloge.ts, focus.ts
  styles/  design-system.css (repris tel quel : jetons), global.css
```

### Conventions

- **Exports nommés** partout (sauf ce que l'outillage impose, par exemple `export const Route`). Un composant principal par fichier ; les petits sous-composants privés peuvent rester dans le même fichier.
- **Pas de barrels (`index.ts`)** : ils créent des cycles et gênent le découpage automatique par route et le tree-shaking. Ajouter `import-x/no-cycle` (eslint-plugin-import-x 4.17).
- **Co-location** : `X.tsx`, `X.module.css`, `X.test.tsx` côte à côte. Les jetons restent globaux (`design-system.css`).
- **Alias `@/`** : `tsconfig.json` → `"paths": { "@/*": ["./src/*"] }` **sans `baseUrl`** (supprimé en TS 7), et `resolve.tsconfigPaths: true` (Vite 8). C'est ce que documente TanStack Start (`path-aliases.md`) et ce que fait element-admin. Les imports de sous-chemins `#/*` (champ `"imports"` de `package.json`) sont plus standard, mais la résolution sans extension sous TS 7 + Vite reste à valider sur un prototype.
- **Routes fines** : `Route.component` fait moins de 40 lignes. Il lit `Route.useSearch()` et compose ; les données passent par `useEtat(select)` dans les feuilles, pas en props sur cinq niveaux. Un composant de plus de 150 lignes se découpe.
- **Ordre des propriétés de route** imposé par `@tanstack/eslint-plugin-router` (inférence).

### Nommage : français ou anglais ?

Avis : **termes métier en français, vocabulaire technique en anglais**, sans accents dans les identifiants.

- Domaine en français, comme le README, l'API Apps Script et les e-mails : `couverts`, `placesRestantes`, `prixTotal`, `ticketRestaurant`, `commandesR2Closes`, `collegue`, `jourService`. Traduire (`seats`, `colleague`…) obligerait à jongler entre deux vocabulaires avec l'équipe et avec `Code.gs`.
- Conventions des bibliothèques en anglais, imposées : `useXxx`, `Props`, `queryKey`, `onSubmit`, `isPending`, `Route`, `loader`. On ne les traduit pas.
- **Champs de l'API tels quels** à la frontière (`Date`, `Capacite`, `Qte`, `Nom`, `Prix`, `ItemID`) : c'est le contrat de `Code.gs`, et une couche de traduction coûterait du code sans rien apporter. Seule exception : la transformation « ticket restaurant » (`flagTicket`) se fait **dans le schéma zod** (`.transform`).
- Un `lexique.md` court (5 lignes : couvert, portion, plat, jour de service, collègue) évite les synonymes.

---

## 5. Typage et modèles

### Choix de la bibliothèque de schémas

| | Zod 4.6 | Valibot 1.5 | ArkType 2.2 |
|---|---|---|---|
| Standard Schema (Router `validateSearch` sans adaptateur, Form `validators`) | ✅ (Router : « With Zod v4, directly use the schema ») | ✅ | ✅ |
| Poids mesuré (schéma objet de 4 champs, esbuild + gzip) | **26 Ko** avec `import * as z from 'zod'` ; ⚠ **92 Ko** avec `import { z } from 'zod'` (toutes les locales embarquées) ; `zod/mini` : 6,4 Ko | **1,7 Ko** | 47 Ko |
| Documentation, exemples TanStack | les plus nombreux | bons ; utilisé par element-admin | moindre |
| Performance TS | sans enjeu avec TS 7 (compilateur natif) | idem | idem |

**Recommandation : Zod 4 « classique »**, avec la règle `import * as z from 'zod'` imposée par ESLint (§2). C'est la bibliothèque la plus lisible pour une équipe non spécialiste, et la doc TanStack l'utilise. Si le budget JS initial (§9) devient critique, **Valibot** est l'alternative (24 Ko gzip de moins sur la page publique, mesuré) ; c'est aussi le choix d'element-admin. Écart à revérifier avec `vite build` (Rolldown).

### Types de domaine dérivés des schémas, types marqués (branded)

```ts
// domaine/types.ts
import * as z from 'zod'
export const DateISO = z.iso.date().brand<'DateISO'>()           // '2026-10-12' validé
export type DateISO = z.infer<typeof DateISO>
export const IdPlat = z.string().min(1).brand<'IdPlat'>()
export type IdPlat = z.infer<typeof IdPlat>

// api/schemas.ts
const TICKET_RE = /\s*\(ticket restaurant\)\s*$/i
const Montant = z.union([z.number(), z.literal('')])              // l'API renvoie '' pour « pas de prix »
export const Plat = z.object({
  ID: IdPlat, Date: DateISO, Nom: z.string(), Stock: z.coerce.number().int().nonnegative(), Prix: Montant,
}).transform((p) => ({ ...p, Ticket: TICKET_RE.test(p.Nom), Nom: p.Nom.replace(TICKET_RE, '') }))
export type Plat = z.output<typeof Plat>
export const EtatPublic = z.object({ etag: z.string().optional(), r1Days: z.array(JourR1), r2Items: z.array(Plat), /* … */ })
export type EtatPublic = z.output<typeof EtatPublic>
```

- ⚠ `z.coerce.number()` transforme `''` en `0` (testé) : ne pas l'appliquer à `Prix`, où `''` veut dire « pas de prix ».
- `as const` + `satisfies` pour les tables constantes : `const MESSAGES = {...} as const satisfies Record<FinSession, string>` (l'oubli d'une raison devient une erreur de compilation).
- **Unions discriminées pour le métier, pas pour le chargement** :

```ts
type ReponseReservation =
  | { statut: 'ok'; etat: EtatPublic; email: 'envoye' | 'echec' | 'sans-email' }
  | { statut: 'doublon'; etat: EtatPublic }
```

  Le trio chargement/erreur/succès est pris en charge par Suspense + `errorComponent` + `useSuspenseQuery`. Les composants reçoivent des données **définies** (pas de `data?.`), ce qui supprime beaucoup de branches.

### Fonctions pures de domaine et fuseau Europe/Paris

L'ancien code mélange `new Date(iso + 'T00:00:00')` (minuit **local**) et `getHours()` (heure **locale**). Un visiteur hors du fuseau de Paris verrait donc la clôture à 10 h de *son* fuseau, alors que le script utilise le fuseau du projet Apps Script (`Session.getScriptTimeZone()`).

Règles :

1. Les jours métier sont des **`DateISO` (chaînes)**. L'arithmétique se fait en UTC (`Date.UTC`, `setUTCDate`), sans dépendre du fuseau du navigateur.
2. « Maintenant à Paris » s'obtient par `Intl.DateTimeFormat` avec `timeZone: 'Europe/Paris'`.
3. **Temporal** est natif dans Chrome 144+ et Firefox 139+, **pas dans Safari** (octobre 2026). Le polyfill (`temporal-polyfill` 1.0.5) n'est pas justifié pour trois fonctions.

```ts
// lib/dates.ts
const PARIS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
})
export function instantParis(ms: number): { jour: DateISO; heure: number } {
  const p = Object.fromEntries(PARIS.formatToParts(ms).map((x) => [x.type, x.value]))
  return { jour: `${p.year}-${p.month}-${p.day}` as DateISO, heure: Number(p.hour) }
}
export function ajouterJours(iso: DateISO, n: number): DateISO {
  const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10) as DateISO
}

// domaine/horaires.ts
export const HEURE_CLOTURE_R2 = 10, HEURE_SUR_PLACE_R2 = 12
export function commandesR2Closes(jour: DateISO, maintenant: number): boolean {
  const { jour: auj, heure } = instantParis(maintenant)
  return jour < auj || (jour === auj && heure >= HEURE_CLOTURE_R2)
}
```

Tests : `vi.setSystemTime(...)` et une suite lancée avec `TZ=America/New_York`, pour prouver l'indépendance au fuseau. **Écart volontaire à signaler dans la spec** : l'ancien code utilisait l'heure locale du visiteur.

---

## 6. Erreurs et chargements

### Carte des cas

| Situation | Mécanisme |
|---|---|
| Premier chargement sans copie locale (Apps Script lent, jusqu'à plus de 10 s) | `loader` qui attend `queryClient.query(...)`. La coquille Start pré-rendue affiche le `pendingComponent` (squelette) dès le HTML, avant le JS. Garder `defaultPendingMs` (1 s) et `defaultPendingMinMs` (500 ms) par défaut, pour éviter le clignotement. |
| Premier chargement en échec | `errorComponent` de la route : message « hors ligne » ou « le service ne répond pas » (`navigator.onLine`), bouton « Réessayer » → `router.invalidate()` (doc `data-loading.md` : recharge et réinitialise la frontière). |
| Échec d'un rafraîchissement en arrière-plan | Rien ne casse : `useSuspenseQuery` ne lève une erreur **que s'il n'y a pas de données** (`throwOnError` par défaut). Bandeau discret dérivé de `isRefetchError && !isFetchedAfterMount` : « Le calendrier affiché date de votre dernière visite… ». |
| Erreur métier de l'API (`{ error: "Il ne reste que 3 couvert(s)…" }`) | Le client lève `ErreurApi`. Le formulaire affiche `reserver.error.message` dans un bloc `role="alert"` (qui reçoit le focus par une ref callback). Le formulaire et son `requestId` sont conservés. |
| Erreur technique d'écriture (réseau) | Toast d'erreur. Formulaire et `requestId` conservés : le serveur ignore un doublon (`_duplicate`). |
| Paramètre de recherche invalide | `.catch()` dans le schéma : pas d'erreur. |
| Réservation ou jour introuvable | `throw notFound()` dans un loader, `notFoundComponent` (le mode `fuzzy` par défaut prend le plus proche). |
| Mot de passe changé | `ErreurMotDePasse` → `QueryCache`/`MutationCache.onError` → `fermer('mot-de-passe-change')` (§3). |

### Client API

```ts
// api/client.ts
export class ErreurApi extends Error { name = 'ErreurApi' }
export class ErreurMotDePasse extends ErreurApi { name = 'ErreurMotDePasse' }

async function lireJson(r: Response) { const d = await r.json(); if (d.error) throw d.error === 'Mot de passe incorrect.' ? new ErreurMotDePasse(d.error) : new ErreurApi(d.error); return d }

// Lecture doublée : seconde requête après 6 s, la première réponse gagne, l'autre est annulée
export function lectureDoublee(url: string, signal: AbortSignal, delai = 6000) {
  const perdants = new AbortController()
  const tenter = () => fetch(url, { signal: AbortSignal.any([signal, perdants.signal]) }).then(lireJson)
  const premiere = tenter()
  const seconde = new Promise((ok, ko) => { const t = setTimeout(() => tenter().then(ok, ko), delai); signal.addEventListener('abort', () => clearTimeout(t)) })
  return Promise.any([premiere, seconde]).finally(() => perdants.abort())
}

// Écriture : POST text/plain (pas de pré-requête CORS avec Apps Script), jamais rejouée
export const ecrire = (action: string, charge: object) =>
  fetch(URL_SCRIPT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...charge }) }).then(lireJson)
```

Nouvelle tentative de lecture : `retry: (n, e) => !(e instanceof ErreurApi) && n < 1, retryDelay: 1500` (même comportement qu'aujourd'hui). ETag :

```ts
queryFn: async ({ signal }) => {
  const precedent = queryClient.getQueryData<EtatPublic>(etatKeys.public)
  const brut = await lectureDoublee(urlEtat(precedent?.etag), signal)
  return brut.unchanged && precedent ? precedent : EtatPublic.parse(brut)  // même référence : aucun rendu
}
```

### Mutations

```ts
export const useReserverR1 = () => useMutation({
  mutationFn: (v: ReservationR1) => ecrire('addBookingR1', v).then(ReponseReservation.parse),
  onMutate: () => queryClient.cancelQueries({ queryKey: etatKeys.racine }),   // une lecture plus ancienne n'écrasera pas l'écriture
  onSuccess: (r) => queryClient.setQueryData(useSessionStore.getState().motDePasse ? etatKeys.complet : etatKeys.public, r.etat),
})
```

Si un collègue s'est connecté pendant l'envoi, invalider l'état complet plutôt que d'y écrire la réponse publique (logique actuelle d'`adoptBookingState`).

`requestId` : `const [requestId] = useState(() => crypto.randomUUID())` dans le composant du formulaire. Il est conservé tant que le formulaire reste monté (nouvel essai après une erreur), et renouvelé à chaque ouverture puisque le formulaire est remonté.

### Cache local affiché tout de suite, sans flash

Ne pas utiliser `PersistQueryClientProvider` ici :

- il persiste **tout** le cache (il faudrait filtrer l'état complet avec `dehydrateOptions.shouldDehydrateQuery`) ;
- sa restauration est asynchrone, alors que nos loaders tournent tout de suite ;
- la copie doit être **anonymisée** (totaux par jour ou par plat, sans noms) et garder l'`etag`.

Mieux vaut un petit module synchrone (environ 40 lignes) :

```ts
// features/etat/copieLocale.ts
const CLE = 'reservations-cache-v1'                    // même format que l'appli actuelle (§10)
export function restaurer(qc: QueryClient) {
  try {
    const snap = CopieV1.safeParse(JSON.parse(localStorage.getItem(CLE) ?? 'null'))
    if (snap.success && Date.now() - snap.data.savedAt < 14 * 864e5)
      qc.setQueryData(etatKeys.public, depuisCopie(snap.data), { updatedAt: snap.data.savedAt })
  } catch { /* stockage indisponible : on ignore */ }
}
export function brancherSauvegarde(qc: QueryClient) {
  qc.getQueryCache().subscribe((e) => {
    if (e.type === 'updated' && e.action.type === 'success' && e.query.queryHash === hashEtatPublic)
      try { localStorage.setItem(CLE, JSON.stringify(versCopie(e.query.state.data))) } catch {}
  })
}
// api/queryClient.ts, au chargement du module, AVANT getRouter() :
restaurer(queryClient); brancherSauvegarde(queryClient)
```

Déroulement :

1. La copie restaurée a `updatedAt = savedAt`.
2. Le loader `query({ staleTime: 'static' })` la renvoie sans attendre : aucun `pendingComponent`.
3. Le composant monte `useSuspenseQuery` avec un `staleTime` court : la donnée est périmée, donc Query relance la lecture en arrière-plan avec l'`etag`.
4. Si rien n'a changé, la référence est conservée (aucun rendu) ; sinon le partage structurel ne re-rend que ce qui a changé.

« Copie locale en cours d'actualisation » se dérive de `!isFetchedAfterMount` : la connexion collègue est refusée tant qu'il vaut `true`.

**Lecture anticipée** : l'actuel `<head>` lance le `fetch` avant les CSS et le JS. On peut garder un script inline dans la coquille Start (option `head().scripts`) qui place la promesse dans `window.__lectureAnticipee`. Le premier `queryFn` la consomme si l'`etag` correspond. Le gain est réel quand Apps Script est lent. C'est le seul « global » toléré, à documenter.

---

## 7. Formats et textes (français seul)

Mesuré avec Node 22.22 (ICU embarqué) :

| Appel | Résultat | Remarque |
|---|---|---|
| `new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(12.5)` | `"12,50 €"` avec **U+00A0** (espace insécable) avant `€` | L'existant `formatEuro` met une **espace ordinaire U+0020**. Visuellement identique, mais **les tests de chaînes exactes cassent**. Choisir et figer : Intl (préférable typographiquement, pas de coupure de ligne avant €). |
| `….format(1234.5)` | `"1 234,50 €"` : séparateur de milliers **U+202F** (espace fine insécable) + U+00A0 | L'existant n'a pas de séparateur de milliers (`1234,50 €`). Sans effet en pratique (montants inférieurs à 1 000 €), mais à noter dans la spec. |
| `Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeZone: 'UTC' })` sur `2026-10-12T00:00Z` | `"lundi 12 octobre 2026"` | Identique à l'existant (`weekday long`, …). Pas de « 1er » (« jeudi 1 octobre »), comme aujourd'hui. Formater une `DateISO` avec `timeZone: 'UTC'`, jamais le fuseau local. |
| `new Intl.PluralRules('fr-FR').select(0)` | `"one"` | En français, **0 est au singulier** (« 0 couvert »), ce que fait déjà `plural()` (`n > 1`). `select(1.5)` donne aussi `"one"`. |
| `new Intl.ListFormat('fr-FR', { type: 'conjunction' }).format(['a','b','c'])` | `"a, b et c"` | Pour les listes de plats ou les champs manquants. |

```ts
// lib/format.ts : formateurs créés une fois au niveau module
const EUROS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const DATE_LONGUE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeZone: 'UTC' })
const PLURIEL = new Intl.PluralRules('fr-FR')
export const euros = (n: number) => EUROS.format(n)
export const dateLongue = (iso: DateISO) => DATE_LONGUE.format(new Date(`${iso}T00:00:00Z`))
export const pluriel = (n: number, un: string, plusieurs = `${un}s`) => `${n} ${PLURIEL.select(n) === 'one' ? un : plusieurs}`
// pluriel(2, 'couvert réservé', 'couverts réservés')
```

Pour les tests : comparer avec `'12,50 €'`, ou normaliser (`s.replace(/[  ]/g, ' ')`) dans un `expect` personnalisé. L'ICU peut varier entre Node et les navigateurs.

**Textes de l'interface : inline dans les composants**, sauf les messages **réutilisés ou testés** : erreurs, toasts, messages de clôture (`r2ClosedMsg`), libellés d'impression. Ceux-là vont dans un module `textes.ts` par fonctionnalité (`features/r2/textes.ts`), sous forme de fonctions pures typées (`clotureR2(nomRestaurant)`). Un fichier global de 300 clés éloigne le texte de son contexte, sans bénéfice tant qu'il n'y a pas de traduction. Les messages renvoyés par `Code.gs` restent affichés tels quels.

---

## 8. Tests

### Ce qui apporte le plus pour une migration « à l'identique »

1. **Tests de caractérisation sur le code actuel, avant d'écrire du React.** On charge les scripts classiques `js/outils.js`, `js/donnees.js` et `js/calendrier.js` dans un contexte jsdom de Vitest : on concatène les sources dans un `vm.Script`, avec un `index.html` minimal (ils touchent le DOM au chargement). On fige ensuite les sorties des fonctions pures : `remainingR1`, `remainingItem`, `dayStatusR1/R2`, `r2Amounts`, `amountsText`, `itemPriceText`, `buildWeekCells`/`buildMonthCells`, `keyTargetIso`, `formatDate`, `plural`, `r2OrdersClosed` (avec `vi.setSystemTime`). **Les mêmes tables de cas** (`test.each`) s'exécutent ensuite contre `src/domaine/*.ts`. Ce sont des tests « golden » : la parité est prouvée fonction par fonction.
2. **Fixtures d'API** : réponses réelles anonymisées de `doGet`, de `getAdminState`, des erreurs métier, de `_duplicate` et de `{ unchanged: true }`. Elles sont validées par les schémas zod (test de contrat) et servent ensuite à tous les étages.
3. **Parcours E2E Playwright joués contre l'ancien ET le nouveau site**, avec Apps Script simulé par `page.route('https://script.google.com/**', …)` à partir des mêmes fixtures :
   - réserver R1 (prix en direct, récapitulatif) ;
   - commander R2 avant et après 10 h (`page.clock.setFixedTime`) ;
   - erreur « plus de place » ;
   - connexion collègue, puis déconnexion après 10 min (`page.clock.fastForward('10:01')`) ;
   - impression (`context.waitForEvent('page')`).

   Une même suite verte sur les deux est le meilleur critère de bascule.

### Pyramide

| Étage | Outil | Part | Contenu |
|---|---|---|---|
| Domaine pur | Vitest (environnement node), `TZ` imposé | ~60 % | places, prix, tickets, clôture, cases du calendrier, flèches clavier, formats, schémas |
| Stores et modules | Vitest + `vi.useFakeTimers()` | ~10 % | session (inactivité, `visibilitychange`, purge), horloge, copie locale (aller-retour v1, rejet d'une copie invalide), lecture doublée. Réinitialiser Zustand entre tests : `useSessionStore.setState(initial, true)`. |
| Composants | Testing Library 16.3 + user-event 14.6 (jsdom 30), **ou** Vitest Browser Mode (`@vitest/browser-playwright` 5.0.3 + `vitest-browser-react` 2.3) | ~20 % | formulaires (erreurs, focus sur le premier champ invalide), clavier du calendrier, fiches. Le navigateur réel est plus fiable pour le focus, Base UI (floating-ui), Intl et les View Transitions. |
| Routes | routeur en mémoire (`createMemoryHistory({ initialEntries: ['/?j1=2026-10-12&resa=r1'] })`, doc `test-file-based-routing.md`), contexte `{ queryClient: nouveau, session: store de test }` | inclus ci-dessus | search params → UI, garde collègue, `errorComponent` |
| E2E | Playwright 1.63 + `page.route` | 3 à 6 parcours | ci-dessus |

Simuler l'API par injection (module `api/` simulé avec `vi.mock`, ou `queryClient.setQueryData` en amont) suffit. MSW 3 est optionnel.

---

## 9. Performance et poids

### Mesures (esbuild 0.28.2, minifié, gzip -9 ; Rolldown peut différer de ±10 %)

| Bloc | gzip |
|---|---|
| `react` + `react-dom/client` | 68,8 Ko |
| `@tanstack/react-router` (sans React) | 28,0 Ko |
| `@tanstack/react-query` | 10,4 Ko |
| `@tanstack/react-form` | 18,7 Ko |
| Base UI, détail : Dialog 23,5, Toast 26,4, ToggleGroup 6,2, Field 9,5, NumberField 13,4 (code commun partagé) | — |
| Base UI, 12 composants ensemble | 72,1 Ko |
| zod (`import * as z`) / `import { z }` / `zod/mini` | 26,0 / **92,1** / 6,4 Ko |
| valibot / arktype | 1,7 / 47,2 Ko |
| zustand (`create`) / TanStack Store | 0,4 / 3,0 Ko |
| **Chemin public** : React + Router + Query + Form + zod + Base UI (ToggleGroup, Toggle, Field, Toast, Collapsible, Meter) | **≈ 186 Ko** (≈ 161 Ko avec valibot) |
| Supplément collègue (AlertDialog, NumberField, Checkbox, Popover) | +32 Ko |
| **Appli actuelle** : tout `js/*.js`, non minifié | 40,7 Ko (CSS : 16 Ko) |

**À dire franchement : la nouvelle page publique pèsera environ 4 à 5 fois plus de JS que l'actuelle.** Ce n'est pas le JS qui limite la vitesse perçue ici, c'est Apps Script (plusieurs secondes), et le cache local masque le reste. Il faut néanmoins un budget :

- **Cible : JS initial ≤ 200 Ko gzip pour le visiteur public** (le runtime client Start, non mesuré ici, est en plus). Collègue, impression et sélecteur de date en **chunks chargés à la demande**. CSS ≤ 25 Ko.
- Découpage par route : `autoCodeSplitting` (activé par Start). Mais **une page unique ne se découpe pas par route** : il faut `import()`/`lazy()` explicites pour `features/collegue/*` (au premier clic sur « Collègue », avec préchargement au survol ou au focus du bouton) et `features/impression/ouvrir.ts` (au clic).
- `build.target` de Vite 8 par défaut : `'baseline-widely-available'` = `chrome111, edge111, firefox114, safari16.4+` (vu dans `vite/dist/node/chunks/node.js`). Convient à React 19. Vérifier les tablettes de l'établissement.
- `modulepreload` : Vite l'injecte pour les chunks statiques. Rien à faire.
- **Polices : les auto-héberger** (`@fontsource-variable/outfit` et `work-sans` 5.3, sous-ensemble latin, `font-display: swap`, `<link rel="preload" as="font" crossorigin>` sur la graisse principale). On supprime deux connexions tierces (`fonts.googleapis.com`, `fonts.gstatic.com`) et un sujet RGPD (adresse IP transmise à Google). Garder `preconnect` vers `script.googleusercontent.com`.
- Mesurer avec `vite build` et `rollup-plugin-visualizer` (ou l'analyse de Rolldown), Lighthouse en profil mobile.

---

## 10. Migration : progressive ou « big bang »

### Recommandation : réécriture complète sur une branche, avec une préproduction `/v2/`

- 2 250 lignes, une seule page, aucun outil de compilation : une cohabitation module par module (îlots React dans l'ancien DOM) coûterait plus cher que la réécriture, car `render()` reconstruit tout et entrerait en conflit avec React.
- Déroulé :
  1. tests de caractérisation et E2E contre l'ancien site (§8) ;
  2. réécriture sur la branche `react` ;
  3. **préproduction** publiée sous `https://thegaudis.github.io/reservations-restaurants/v2/` : le workflow GitHub Actions assemble l'ancien site à la racine et le nouveau dans `v2/` (`base: '/reservations-restaurants/v2/'` pour ce build) ;
  4. une à deux semaines de test par les collègues, sur le vrai script ;
  5. bascule en une fois.
- `Code.gs` **ne change pas** : c'est le contrat. Toute évolution du script est un chantier séparé.

### Liste de bascule GitHub Pages

- [ ] **Même URL** (pas de `CNAME` dans le dépôt, donc site « projet ») : Vite `base: '/reservations-restaurants/'` (et `basepath` du routeur si Start ne le déduit pas de `base` : **à vérifier sur un prototype**).
- [ ] Publication par **GitHub Actions** (`actions/upload-pages-artifact` + `actions/deploy-pages`) : pas de Jekyll, donc les fichiers `_shell.html` ou `_…` sont servis. Si l'on publie depuis une branche, ajouter **`.nojekyll`**, faute de quoi les fichiers commençant par `_` renvoient 404.
- [ ] Coquille SPA : la page d'entrée doit être `index.html`. Régler `spa.prerender.outputPath` ou copier `_shell.html` en `index.html`, puis **`cp index.html 404.html`** (doc `deploy-to-production.md`). Avec une page unique et des search params, le 404 ne sert que pour d'éventuelles routes dédiées.
- [ ] `APPS_SCRIPT_URL` → variable de build `VITE_APPS_SCRIPT_URL`, même déploiement `/exec`. Garder le bandeau « Configuration manquante ».
- [ ] **Cache des navigateurs** : GitHub Pages sert tout avec `Cache-Control: max-age=600`, non configurable. L'ancien `index.html` disparaît des caches en 10 minutes au plus. Les fichiers fingerprintés de Vite remplacent les `?v=21`. L'ancien site n'avait pas de service worker : rien à désinscrire. **N'en ajoutez pas** sans prévoir un mécanisme d'arrêt.
- [ ] **`localStorage`** :
  - `reservations-cache-v1` : **le relire** si `CopieV1.safeParse` réussit (même format, pas de données personnelles). Les visiteurs qui reviennent ont alors l'affichage immédiat dès le premier jour. Sinon l'ignorer.
  - `reservations-textes` : relire en secours, puis ne plus l'écrire (les noms sont déjà dans `config` de la copie).
  - Si le format change un jour : nouvelle clé `-v2`, et retrait des anciennes clés **dans le module de persistance**, au démarrage (pas dans un effet).
- [ ] Polices auto-hébergées, `preconnect` Apps Script conservé, `<meta name="description">` et `theme-color` dans `head()`, favicon SVG repris.
- [ ] E2E vert contre l'URL de production après déploiement (même suite que pour la parité).
- [ ] **Retour arrière** : étiqueter l'ancien commit (`v1-final`) ; revenir en arrière = relancer le workflow sur cette étiquette (moins de 5 min, plus 10 min de cache).
- [ ] Mettre à jour le README (installation : `npm ci && npm run build`, workflow Pages) et prévenir les collègues (nouveau rendu, même usage).

---

## Principes d'architecture pour ce projet (10 règles)

1. **L'URL décrit ce que l'on voit ; le cache Query, ce que dit le serveur ; Zustand, la session ; le reste se calcule.** Une seule source par donnée, donc rien à synchroniser, donc pas d'effet.
2. **Aucun `useEffect` sans un système extérieur à synchroniser** (objectif : au plus 2 dans l'appli). Le preset `eslint-plugin-react-hooks` 7 en `error` le fait respecter (`set-state-in-effect`, `refs`, `purity`, `globals`).
3. **Timers et écouteurs globaux au niveau module, à côté de la donnée qu'ils servent** : actualisation par `refetchInterval` de Query, inactivité dans `session.ts`, heure dans `horloge.ts`. Ils restent testables avec de faux timers et ne dépendent pas du cycle de vie des composants.
4. **Le mot de passe ne quitte jamais la mémoire** : pas de `persist`, ni d'URL, ni de clé de requête. La fermeture de session purge l'état complet du cache. Un test le vérifie (stockage et clés de requête inspectés).
5. **Domaine pur et indépendant du fuseau** : `domaine/` n'importe ni React ni le DOM. Les jours sont des `DateISO`, « maintenant » est un paramètre et Paris est explicite. C'est là que vivent les règles métier (places, prix, tickets, 10 h), testées par tables de cas héritées de l'ancien code.
6. **Valider à la frontière, faire confiance à l'intérieur** : zod parse chaque réponse et chaque search param (`.catch`). Les types de domaine viennent des schémas ; les composants reçoivent des données définies (Suspense), sans `?.` défensifs.
7. **Composants de route fins, feuilles autonomes** : la route lit l'URL et compose ; chaque feuille lit sa tranche avec `useEtat(select)`/`useSearch({ select })`. Pas de props sur cinq niveaux ni de « god component ».
8. **Base UI, enveloppé une fois dans `ui/`** : accessibilité (focus, clavier, ARIA) déléguée à la bibliothèque, styles par CSS Modules et jetons existants. Aucun composant métier n'importe directement `@base-ui/react`.
9. **Le serveur reste juge** : pas d'optimisme. Les écritures envoient un `requestId` stable et ne sont jamais rejouées ; seules les lectures sont doublées ou réessayées. Les erreurs métier s'affichent dans le formulaire, les erreurs techniques dans un toast.
10. **La parité se prouve, elle ne se constate pas** : tests de caractérisation puis E2E joués contre l'ancien et le nouveau site avant la bascule ; budget JS initial de 200 Ko gzip contrôlé à chaque build ; collègue et impression chargés à la demande.

## Pièges connus

- **`import { z } from 'zod'` embarque toutes les locales** (92 Ko gzip contre 26 Ko avec `import * as z`, mesuré avec esbuild). L'imposer par ESLint.
- **`z.coerce.number()` transforme `''` en `0`** : dangereux pour `Prix` (où `''` veut dire « sans prix ») et pour les champs numériques vides.
- **TanStack Query 5.104 : `ensureQueryData`/`fetchQuery`/`prefetchQuery` sont dépréciés.** Utiliser `queryClient.query({ ...opts, staleTime: 'static' })` dans les loaders. La doc du routeur et element-admin montrent encore l'ancienne API. `query()` n'accepte pas `refetchInterval`, `enabled`, `placeholderData`… : à passer au point d'appel du hook.
- **Ne jamais mettre le mot de passe dans une `queryKey`** : elle est sérialisée (devtools, persistance, `queryHash`).
- **`validateSearch` doit être pure** : pas de « aujourd'hui » comme valeur par défaut. La résoudre dans le composant avec l'horloge.
- **`new Date()`/`Date.now()` dans un composant enfreint `purity`** et rend l'interface figée ou incohérente (clôture à 10 h). Passer par le store horloge.
- **Heure locale contre heure de Paris** : l'ancien code utilise `getHours()` du visiteur ; le nouveau doit utiliser `Europe/Paris` (écart à documenter). Temporal n'est pas disponible sur Safari (octobre 2026).
- **`Intl` met U+00A0/U+202F dans « 12,50 € »**, l'ancien code une espace ordinaire : les comparaisons exactes de chaînes (tests, captures) échouent.
- **Ne pas cumuler** l'option `viewTransition` du routeur (`document.startViewTransition`) et `<ViewTransition>` de React sur la même mise à jour. Ajouter `prefers-reduced-motion` en CSS.
- **Une page unique n'est pas découpée par `autoCodeSplitting`** : il faut des `lazy()`/`import()` explicites pour collègue et impression.
- **Impression dans un nouvel onglet par URL = pas de session** (mot de passe en mémoire de l'onglet d'origine). Rendre dans la fenêtre ouverte depuis le gestionnaire de clic.
- **`PersistQueryClientProvider`** persiste tout le cache et restaure de façon asynchrone. Pour une copie anonymisée et immédiate, utiliser un module synchrone (`setQueryData` avec `updatedAt` avant de créer le routeur).
- **TanStack Form n'est pas réactif par défaut** : lire `form.state.values` dans le rendu donne une valeur figée. Utiliser `useSelector(form.store, sel)` ou `<form.Subscribe>`. Avec Zustand, toujours un sélecteur (`useSessionStore(s => …)`), jamais `useSessionStore()` (abonnement à tout le store, contre-exemple dans element-admin `ui/errors.tsx`).
- **Dépendance circulaire store ↔ routeur** (element-admin : `stores/auth.ts` importe `router`) : brancher l'abonnement dans `router.tsx` et injecter le store dans le contexte.
- **Mettre à jour Zustand à chaque `pointermove`** réveille tous les abonnés : noter l'activité dans une variable non réactive.
- **`baseUrl` est supprimé en TypeScript 7** : écrire `"paths": { "@/*": ["./src/*"] }` sans `baseUrl`, et `resolve.tsconfigPaths: true` dans Vite 8.
- **`react({ compiler: true })` de plugin-react 6 = compilateur Rust expérimental.** Voie stable : `@rolldown/plugin-babel` + `reactCompilerPreset()`.
- **GitHub Pages** : `max-age=600` non modifiable ; Jekyll ignore les fichiers `_…` si l'on publie depuis une branche (`.nojekyll`) ; site « projet » sous `/reservations-restaurants/` (`base`). Pas de service worker sans mécanisme d'arrêt.
- **Apps Script** : garder `Content-Type: text/plain` pour les POST (pas de pré-requête CORS). Ne jamais réessayer automatiquement une écriture (`retry: 0` pour les mutations, comportement par défaut).
- **Base UI 1.8 déclare `date-fns` et `@date-fns/tz` en dépendances pairs optionnelles** : ne pas les installer sans besoin. Il n'y a pas de composant calendrier exporté : le calendrier reste maison (grille accessible actuelle portée en React).
