# Journal de la session « fusion du mode collègue »

*4 novembre 2026. Bookmark `claude/staff-merge`, parti de `claude/frontend-react-migration-lw5zfz` (`06b15bd`). Demande de l'orchestrateur : simplifier `src/features/staff/` et `src/mutations/` maintenant que `max-lines-per-function`, `max-params` et `react/only-export-components` sont à `"off"`. Le site ne change pas : textes, URL des formulaires ouverts, veille de 10 h et toast d'échec partiel des paramètres restent.*

## Fait

Lignes (fichiers `.ts` et `.tsx`, `TomorrowPanel*` et `TomorrowBlocks.tsx` exclus, hors périmètre) :

| Zone | Avant | Après |
| --- | ---: | ---: |
| `src/features/staff`, code | 3 409 | 3 125 |
| `src/features/staff`, tests | 2 337 | 2 287 |
| `src/features/staff`, stories | 658 | 637 |
| `src/mutations`, code | 570 | 350 |
| `src/mutations`, tests | 665 | 528 |

- Un formulaire d'ajout : `AddBookingForm.tsx` remplace `AddBookingFormR1.tsx`, `AddBookingFormR2.tsx`, `add-booking.ts` et `AddBookingParts.tsx`. Props discriminées (`restaurant="r1" day={…}` ou `restaurant="r2" dish={…}`), un seul jeu de valeurs (compteurs R1, portions et mode R2), un `useAppForm`, une porte (`AddBookingForm`) qui monte `AddBookingFormOpen` avec sa `key`. `AddBookingButton` absorbe `AddPersonButton`. Le `requestId` naît au montage et reste pour un nouvel essai (invariant 3).
- Un formulaire de modification : `EditBookingForm.tsx` remplace `EditBookingFormR1.tsx`, `EditBookingFormR2.tsx`, `edit-booking.ts` et `EditBookingFields.tsx`. Les champs nom, classe, contact et observation s'écrivent en ligne ; les tables `NAME`, `CONTACT`, `OBSERVATION` disparaissent. Une seule écriture `useStaffWrite`, qui appelle `editBookingR1` ou `editBookingR2`.
- `BookingList.tsx` : un `BookingItem` et un `BookingList` génériques ; `BookingListR1` et `BookingListR2` ne font que choisir les réservations, la ligne et le formulaire.
- Couches crochet, corps et porte repliées dans `EditDayFormR1`, `OpenDayFormR1`, `OpenDayFormR2`, `DishFields`, `SettingsForm` : un composant par formulaire, plus la porte quand le formulaire s'ouvre par l'URL.
- `useFullState(): FullState` (`use-staff-state.ts`) remplace `useStaffState(whole)` et ses huit `const whole = (s) => s`.
- Petits modules fusionnés : `open-date.ts` dans `OpenDatePicker.tsx`, `price-suggestions.ts` dans `DishFields.tsx`, `dish-lines.ts` dans `DishDraftsR2.tsx`, `dish-focus.ts` dans `DishForm.tsx`, `day-messages.ts` dans `intl/staff-messages.ts`, `booking-r2.ts` dans `staff-helpers.ts` (portions et mode, lus par les deux formulaires de réservation). `addPersonSubmitAction` quitte `intl/staff-messages.ts` pour `AddBookingForm.tsx`, son seul lecteur.
- Mutations : `mutations/staff/days.ts`, `dishes.ts` et `bookings.ts` retirés avec leurs douze crochets d'une ligne. Les composants appellent `useStaffWrite(addDayR1, { success: dayAddedMessage })` ; le toast de succès vit dans le composant. Clé unique `['write','staff']` (`STAFF_WRITE_KEY`). `staffWriteOptions`, `adoptStaffState`, `SettingsPartialFailureError` et `useSaveSettings` restent. `isCapacityRefusal` passe dans `write.ts`.
- Trois gestionnaires « relire l'état après un refus » réunis en `readStateAgainOn(isRefusal)` (`queries/state.ts`), lu par `useBookR1` (`isSeatsRefusal`), la modification d'une réservation (`isCapacityRefusal`) et « Modifier ce jour » (`isBusinessRefusal`).
- Tests et stories : `AddBookingForm.test.tsx` réunit les tests R1, R2 et ceux de `add-booking.test.ts` ; `EditBookingForm.test.tsx` les tests R1 et R2 ; une story par état dans `AddBookingForm.stories.tsx` et `EditBookingForm.stories.tsx` (les états R2 s'appellent `R2VoucherDay`, `R2OtherDay`). `mutations/staff/bookings.test.tsx` retiré : les tests de `isCapacityRefusal` passent dans `write.test.tsx` ; les envois `editBookingR1`, `editBookingR2`, `deleteBookingR1` sont vérifiés par les tests des formulaires et de la liste, la garde de session par `write.test.tsx`, la suppression R2 par `e2e/regression/staff-r2.spec.ts`. Deux assertions sur la clé de mutation suivent la nouvelle clé (`settings.test.tsx`, `write.test.tsx`).
- `CLAUDE.md` : puce « Mutations » de « React » réécrite pour `useStaffWrite` et `readStateAgainOn`.

## Décisions

1. **Une écriture, des options.** `useStaffWrite(write, { success, onError })` : `success` prend un descripteur de `defineMessage`, ou une fonction des variables (paramètres : un ou plusieurs champs). `onError` passe tel quel à `useMutation`, pour `readStateAgainOn` et l'échec partiel des paramètres (D-20).
2. **Relecture de tout l'état.** `readStateAgainOn` invalide `['state']` ; la modification d'une réservation invalidait `['state','staff']`. Pendant une session, l'état public n'a pas d'observateur actif : il passe périmé sans lecture, comme après toute écriture collègue (`adoptStaffState`).
3. **`useIsMutating`.** Les fiches publiques et la veille de 10 h lisent `bookingKeys.r1()` et `bookingKeys.r2()` ; l'ajout d'une personne garde `useBookR1` et `useOrderR2`, donc ces clés. Aucun lecteur des anciennes clés collègue.
4. **Fiches R1 et R2 gardées en deux fichiers.** `features/page/StaffPage.tsx` importe `StaffDayCardR1.tsx` et `StaffDayCardR2.tsx` ; la jauge et les plats diffèrent. `StaffDayCard.tsx` garde ce qu'elles partagent (`StaffNoServiceCard`, `OpenedBy`).
5. **`useStaffState(select)` reste** pour `TomorrowPanel.tsx`, `TomorrowBlocks.tsx` et `features/print/PrintListButton.tsx`, hors périmètre. Plus aucun fichier de `features/staff` à moi ne l'appelle.
6. **`use-app-state.ts` inchangé.** `useAppStateQuery` ne peut pas rendre `publicStateOptions` ou `staffStateOptions(id, password)` sans conversion de type : `queryOptions` type `staleTime` et `queryFn` sur la donnée de chaque requête, et l'union des deux ne passe ni dans `useSuspenseQuery` ni dans un type commun. Les deux branches gardent leurs trois morceaux (`queryKey`, `queryFn`, réglages de cache), déjà partagés avec `state.ts`.
7. **`stateKeys` inchangé.** Réduire les quatre fabriques (`all`, `public`, `staffAll`, `staff`) touche `background/`, `queries/purge.ts` et les tests de `features/page`, `features/r1`, `routes/`, hors périmètre. Proposition ci-dessous.
8. **`SETTINGS_API_KEYS` inchangé.** Quatre entrées sur huit sont des identités, mais la table complète se lit comme le contrat de `setConfigField` (02 § 4.7), et `api/actions-dishes.test.ts` vérifie chaque clé.

## Vérification

- `pnpm check` : vert (169 fichiers, 1 679 tests ; knip vert).
- `pnpm build:e2e` puis `git diff --exit-code src/routeTree.gen.ts` : aucun écart (`translations/fr.json` non plus).
- `translations/fr.json` : 337 identifiants avant et après, mêmes textes et descriptions, fichier identique octet pour octet.
- `pnpm test:e2e --project=react-only --project=react` : 84 sur 84.
- `pnpm build && pnpm budget` : JS 204,5 kB (limite 240 kB), CSS 11,4 kB (limite 25 kB).

## Overrides

- Aucun.

## Reste

- `stateKeys` et `useStaffState` : voir décisions 5 et 7.

## Pour PLAN.md (orchestrateur)

- § 3.1, `features/staff/` : `AddBookingForm.tsx` (+ test, stories), `EditBookingForm.tsx` (+ test, stories), `BookingList.tsx`, `BookingRow.tsx`, `booking-line.ts`, `StaffDayCard.tsx`, `StaffDayCardR1.tsx`, `StaffDayCardR2.tsx`, `DeleteDayButton.tsx`, `EditDayFormR1.tsx`, `OpenDayPanel.tsx`, `OpenDatePicker.tsx` (avec `useOpenDate`), `OpenDayFormR1.tsx`, `OpenDayFormR2.tsx`, `DishDraftsR2.tsx` (avec `newDishLine`), `DishForm.tsx`, `DishFields.tsx` (avec `usePriceSuggestions`), `dish-rules.ts`, `FormActions.tsx`, `SettingsPanel.tsx`, `SettingsForm.tsx`, `staff-helpers.ts`, `use-staff-state.ts`, `TomorrowPanel.tsx`, `TomorrowBlocks.tsx`. Retirés : `AddBookingFormR1/R2`, `AddBookingParts`, `add-booking`, `EditBookingFormR1/R2`, `EditBookingFields`, `edit-booking`, `booking-r2`, `open-date`, `price-suggestions`, `dish-lines`, `dish-focus`, `day-messages`.
- § 3.1, `mutations/` : `booking-keys.ts`, `bookings.ts`, `login.ts`, `staff/write.ts`, `staff/settings.ts`. Retirés : `staff/days.ts`, `staff/dishes.ts`, `staff/bookings.ts`.
- § 3.3.5 : une écriture collègue s'écrit `useStaffWrite(action, { success, onError })` dans le composant, clé `['write','staff']`, portée `WRITE_SCOPE` ; plus de clé par action ni de crochet par action. Relecture après refus : `readStateAgainOn` de `queries/state.ts`.
- § 3.4 : composants collègue lisent `useFullState()`.
- Proposition `stateKeys` : `{ all, public, staff(id?) }`, `staff()` sans numéro remplaçant `staffAll()` ; à faire avec les propriétaires de `background/` et `queries/purge.ts`.
