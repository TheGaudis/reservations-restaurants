# Journal de la session « composition de la page » : emplacements `ReactNode` remplacés par des enfants

*4 octobre 2026. Branche `claude/page-composition`, partie de `eed0c3e` (intégration après le nettoyage). Demande du responsable : remplacer les props `ReactNode` de `Page` (`modeSwitch`, `panels`, `r1` et `r2` en objets `{ admin, calendar, card }`) par de la composition avec `children`.*

## Fait

- **`PageLayout`** ne reçoit plus que `children`. Il garde les bandeaux, la bande tricolore et le pied, et exporte deux briques sans état : `Main` (`<main aria-busy>`) et `Columns` (la grille des deux colonnes).
- **`Header`** reçoit le sélecteur de mode en `children` au lieu de la prop `modeSwitch`.
- **`Page`** devient le cadre de la page vivante (`PageLayout` et `AutoRefresh`). Ses briques lisent l'état de la page par `usePageStatus`, seul endroit qui combine `useHydrated`, `useLoadedAppState` et `usePublicReadStatus` :
  - `PageHeader` affiche les titres de l'état et ses enfants une fois React hydraté ;
  - `PageMain` porte `aria-busy` ;
  - `WhenLoaded` affiche les panneaux collègue ;
  - `PageLoadError` affiche l'encadré d'échec ;
  - `PageColumn` affiche le contenu de la colonne ou son squelette.
- **`PublicPage` et `StaffPage`** écrivent l'arbre complet. L'ordre de `08` § 7.1 (panneaux, encadré, colonnes) et celui de `05` § 1 (« Ouvrir un jour », calendrier, fiche) se lisent dans le fichier.
- **`PageSkeleton` et `LoadErrorPage`** composent les mêmes briques, avec `SkeletonColumns` (exporté par `PageSkeleton.tsx`).
- **`DayCardR1` et `DayCardR2`** rendent eux-mêmes `BookingFormR1Slot` et `OrderFormR2Slot`. La prop `form` disparaît.
- **`columnTexts`** (`page-texts.ts`) donne le titre et la description d'une colonne.
- Commentaires « Slot `x` of `StaffPage` » réécrits dans `OpenDayFormR1`, `OpenDayFormR2`, `SettingsPanel`, `TomorrowPanel`, `BookingFormR1Slot` et `OrderFormR2Slot`.
- Tests : `Page.test.tsx` compose la page dans un `TestPage`. Un nouveau test vérifie que les panneaux attendent les données et passent avant les colonnes.

## Décisions

1. **Pas de contexte React.** Chaque brique appelle `usePageStatus` ou `usePageTexts`. Les briques hors de `Page` (`PageSkeleton`, `LoadErrorPage`) n'en ont pas besoin, puisqu'elles utilisent `Header`, `Main` et `Column` avec des props explicites.
2. **L'encadré d'échec reste à la charge de chaque page.** `PageMain` ne l'insère pas lui-même : sur la page collègue, il passe entre les panneaux et les colonnes (`08` § 7.1).
3. **Barrière d'hydratation inchangée** (arbitrage 16). Pendant l'hydratation, `Page` rend le même balisage que `PageSkeleton` : en-tête sans sélecteur de mode, `main` occupé, deux `Column` avec `ColumnSkeleton`, aucun panneau ni encadré. Vérifié par `Page.test.tsx` (hydratation sans #418) et `e2e/hydration.spec.ts`.
4. **Gardés en props `ReactNode`.** Les `label` et `description` des champs de `ui/form/`, `action` d'`Alert` et `gauge` de `DayCard` placent un petit contenu à un endroit précis, relié par `htmlFor` ou `aria-describedby`. Des `children` y seraient moins lisibles.
5. **Suspense non retenu pour l'état « chargé ».** Trois contraintes l'empêchent :
   - avec la copie locale, une frontière ne suspend pas pendant l'hydratation (#418) ;
   - React retarde le dévoilement d'une frontière par un minuteur que l'horloge figée de l'E2E ne fait jamais partir (R-36) ;
   - un échec sans données part dans un error boundary, dont la remise à zéro relance une lecture hors d'`AutoRefresh` (03 § 3.2, § 5.2).

   `usePageStatus` regroupe la logique : un passage à Suspense ne toucherait que ce fichier.

## Vérifications

- `pnpm check:fast` vert.
- `pnpm check` : tout est vert sauf un test, `src/queries/AutoRefresh.test.tsx` › « reads the public state every 3 minutes ». Il a échoué une fois pendant la suite complète, puis passé trois fois sur trois en isolé. Il n'importe rien de `features/page/`. Instabilité sous charge, à root-causer.
- `knip` ne signale que des fichiers du worktree d'un agent, sous `.claude/worktrees/`.
- `pnpm build:e2e` passe, et `src/routeTree.gen.ts` et `translations/fr.json` sont inchangés.
- `pnpm test:e2e --project=react --project=react-only` : 96 sur 96.

## Contradictions avec le plan (pour l'orchestrateur)

- PLAN § 3.2, et les lignes 1027 à 1051 du tableau des propriétaires (« emplacements de `Page` », « emplacements de `StaffPage` »), décrivent des emplacements. La page se compose maintenant par enfants : ces passages sont à mettre à jour.

## Reste

- `BookingFormR1Slot` et `OrderFormR2Slot` gardent leur nom, cité au PLAN (ligne 330), alors qu'ils ne remplissent plus d'emplacement. Un renommage (`LazyBookingFormR1`) suivrait la mise à jour du plan.
- `DishFieldsetR2` (`rows: ReactNode`) et `PrintTable` (`content`, `empty`) ont encore des props `ReactNode` à examiner.
