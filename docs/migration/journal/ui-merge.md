# Journal de la session « fusion de l'UI »

*4 novembre 2026. Bookmark `claude/ui-merge`, parti de `claude/frontend-react-migration-lw5zfz` (`06b15bd`). Demande de l'orchestrateur : réduire les doublons des primitives de `src/ui/` et des fonctionnalités publiques (`features/page`, `booking`, `calendar`, `r1`, `r2`) sans changer ce que l'utilisateur voit (04, 05, 08, 09).*

## Fait

Lignes comptées avec `wc -l` sur les `.ts`, `.tsx` et `.css` ; « code » exclut `*.test.*` et `*.stories.*` ; `src/ui` sans `src/ui/print`.

| Zone | Fichiers | Code | Tests | Stories |
| --- | --- | --- | --- | --- |
| `src/ui` | 84 → 83 | 3 298 → 3 285 | 2 245 → 2 243 | 1 046 → 1 047 |
| `src/features/page` | 38 → 33 | 1 311 → 1 281 | 648 → 641 | 223 → 187 |
| `src/features/booking` | 19 → 20 | 883 → 888 | 437 → 452 | 95 → 95 |
| `src/features/calendar` | 15 → 14 | 765 → 753 | 296 → 296 | 99 → 99 |
| `src/features/r1` | 10 → 10 | 492 → 474 | 390 → 390 | 130 → 130 |
| `src/features/r2` | 15 → 14 | 757 → 732 | 506 → 506 | 153 → 153 |

`src/api/request-id.ts` (8 lignes) et son test (15 lignes) passent dans `features/booking` : d'où la hausse de cette zone.

- Champs : `ui/form/FieldShell.tsx` remplace `FieldMessages.tsx` et `use-field-messages.ts`. Il exporte `useFieldMessages` (inchangé), `FieldShell` (le `Field.Root` avec `name`, `invalid`, `touched`, `dirty`, `disabled`, puis l'erreur et l'aide) et `ErrorMark` (le rond rouge « ! »). `TextField`, `PasswordField`, `NumberField`, `PriceField`, `SegmentedRadio` et `CheckboxField` passent par `FieldShell` ; leurs props et exports ne changent pas. `NumberField` passe `errorHere={false}` quand `errorShownBy` est donné.
- Marque d'erreur : `SeatCountersR1` et `DishQuantitiesR2` rendent `ErrorMark` ; la règle `.mark` disparaît de `SeatCountersR1.module.css` et de `DishQuantitiesR2.module.css`.
- `DishFieldsetR2.tsx` rejoint `DishQuantitiesR2.tsx` (`SoldOutRow`, `DishLabel`, `DishFieldset` deviennent locaux).
- `ui/feedback/Alert.tsx` : trois composants. `Alert` (encadré, 08 § 4.12), `Note` (avertissement dans une fiche, 08 § 4.13), `Banner` (bandeau rouge, 08 § 4.20). `ConfigBanner` et `DevDataBanner` rendent `Banner` ; `BookingSummary` et `DayCardR2` rendent `Note`. HTML rendu identique. Stories et tests suivent.
- Page : `features/page/PageSkeleton.tsx` porte `PageMain`, le seul `<main>` de la page : ce qui va au-dessus des colonnes (`top`), puis les deux colonnes, chacune avec son contenu ou son squelette (`still` arrête le scintillement). `PageSkeleton`, `LoadErrorPage` et `Page` (nouveau, dans `Page.tsx`, pour `PublicPage` et `StaffPage`) le composent. Disparaissent : `Column.tsx`, `ColumnSkeleton.tsx`, `Column.stories.tsx`, `SkeletonColumns`, `PageColumn`, `PageLoadError`, `Main` et `Columns` de `PageLayout.tsx`. `Column.module.css`, `ColumnSkeleton.module.css` et les règles `.main` et `.columns` de `PageLayout.module.css` forment `PageSkeleton.module.css`.
- `index.html` : classes du squelette statique renommées (`PageLayout-main` → `PageSkeleton-main`, `PageLayout-columns` → `PageSkeleton-columns`, `Column-*` → `PageSkeleton-*`, `ColumnSkeleton-skeleton` → `PageSkeleton-skeleton`, `ColumnSkeleton-header|label|grid` → `PageSkeleton-skeletonHeader|skeletonLabel|skeletonGrid`). Balisage inchangé par ailleurs.
- `NotFoundPage` écrit son `<main>` avec la classe `main` de `PageSkeleton.module.css`.
- Fichiers à une fonction : `calendar/use-shown-state.ts` disparaît, ses cinq appelants lisent `useAppState((shown) => shown)` ; `page/use-online.ts` rejoint `LoadErrorBox.tsx`, son seul appelant ; `newRequestId` passe de `api/request-id.ts` à `booking/use-request-id.ts` avec son test (`use-request-id.test.ts`, projet `browser`).

## Décisions

1. **`Alert` garde `variant="note"`.** `features/staff/OpenDatePicker.tsx` rend `<Alert variant="note" tone="warning" live="status">` et la session n'en est pas propriétaire. `Alert` délègue alors à `Note` (une ligne). Le fichier passe de 55 à 62 lignes ; sans cette ligne et la prop `variant`, il en ferait 59.
2. **`LoadErrorPage.tsx` reste un fichier.** `src/router.tsx` l'importe, et la session n'y touche pas. Même raison pour l'emplacement de `PageMain` dans `PageSkeleton.tsx` : `routes/index.tsx` et `router.tsx` importent `PageSkeleton` de ce chemin.
3. **`ErrorMark` vit dans `FieldShell.tsx`**, avec la règle `.mark` de `Field.module.css` : la marque sert aux champs et aux deux messages de groupe (R1, R2). La ligne d'erreur (`.error`) reste dans chaque module : ses marges diffèrent entre R2 (`var(--space-2) 0`) et les champs ou R1 (`var(--space-1) 0 var(--space-2)`).
4. **Laissés en place**, appelants hors périmètre : `calendar/card-date-focus.ts` (quatre appelants dans `features/staff`), `domain/gauge.ts` (`StaffDayCardR1` en plus de `DayCardR1` et `DishRow`), `domain/settings.ts` (seul `SettingsForm` l'importe).
5. **Calendrier** : `CalendarGrid`, `CalendarHeader` et `DatePickerPopover` intacts ; aucun utilitaire à un seul appelant trouvé dans `features/calendar` hormis `use-shown-state.ts`.

## Vérification

- `pnpm check` : vert (174 fichiers, 1 681 tests ; knip vert).
- `pnpm build:e2e` puis `git diff --exit-code src/routeTree.gen.ts translations/fr.json` : aucun écart. `translations/fr.json` identique octet pour octet (337 messages, mêmes ids et textes).
- `pnpm test:e2e --project=react-only --project=react` : 84 sur 84.
- `pnpm build && pnpm budget` : vert. JS 204,4 → 203,4 kB, CSS 11,4 → 11,2 kB (build de `06b15bd` refait pour comparer). `dist/index.html` porte le squelette statique ; chaque classe de ce squelette est définie dans une feuille liée dans le `<head>` (`PageSkeleton-*.css`, `ViewToggle-*.css`, `index-*.css`) ou dans le `<style>` en ligne.

## Overrides

- Aucun.

## Reste

- `features/staff/OpenDatePicker.tsx` : remplacer `<Alert variant="note" tone="warning" live="status">` par `<Note tone="warning" live="status">` (import de `@/ui/feedback/Alert`), puis retirer `variant` de `AlertProps` et la ligne de délégation de `Alert`.
- `features/staff/OpenDatePicker.tsx` et `OpenDatePicker.module.css` recopient encore la marque « ! » (`.mark`) : `ErrorMark` de `@/ui/form/FieldShell` la remplace.
- `src/router.tsx` : si son propriétaire le veut, `LoadErrorPage` peut rejoindre `PageSkeleton.tsx` (une ligne d'import à changer).
- `card-date-focus.ts`, `domain/gauge.ts`, `domain/settings.ts` : à replier par la session propriétaire de `features/staff` (décision 4).

## Pour PLAN.md et CLAUDE.md (orchestrateur)

- § 3.5, ligne des champs : ajouter « enveloppe commune `ui/form/FieldShell.tsx` (`FieldShell`, `useFieldMessages`, `ErrorMark`) ». Ligne `.alert` : « `ui/feedback/Alert.tsx` : `Alert` (encadré), `Note` (`.note-warning`), `Banner` (`.setup-banner`) ».
- § 3.9 : `PageLoadError` et `PageColumn` n'existent plus. Écrire : « `Page` (`features/page/Page.tsx`) affiche l'encadré au-dessus des colonnes et passe `still` à `PageMain`, qui rend le squelette arrêté tant qu'il n'y a pas d'état ». `PageSkeleton` et `LoadErrorPage` composent le même `PageMain`.
- § 3.2 (l. 377) : « `PublicPage` et `StaffPage` rendent `<Page top r1 r2>` » au lieu de `<Main>`, `<PageLoadError />`, `<Columns>` et `<PageColumn>`.
- § 3.1, `features/page/` : retirer `Main`, `Columns`, `Column`, `PageLoadError`, `PageColumn`, `SkeletonColumns` ; ajouter `PageMain` (dans `PageSkeleton.tsx`) et `Page`. `features/r2/` : retirer `DishFieldsetR2`. `api/` : retirer `request-id.ts` (`newRequestId` est dans `features/booking/use-request-id.ts`) ; même correction en annexe (l. 1389, `api/request-id.ts`).
- § 5.0 (l. 1066) : « `features/page/Page.tsx` (`Page`) » au lieu de « (briques `PageLoadError`, `PageColumn`) ».
- `CLAUDE.md` : rien à changer ; la règle d'hydratation cite `PageSkeleton`, toujours exporté de `features/page/PageSkeleton.tsx`.
