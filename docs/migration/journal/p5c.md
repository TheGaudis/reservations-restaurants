# Journal de la session P5 (c) : plats

*4 octobre 2026. Branche locale `claude/p5c-plats`, partie de `00c8c17` (pointe de l'intégration après P5 (a)). Pas de PR ni de push : l'orchestrateur fusionne la branche locale. Chromium de `/opt/pw-browsers/chromium`, ports 4790 / 4791 / 63390. P5 (b) et P5 (d1) tournent en même temps dans d'autres worktrees.*

## Commits

1. `89255a7` `UI : case à cocher nommée par son seul bouton (08 § 4.6, REG-37)` : `CheckboxField` (fichier de P3 (b)), voir « Décisions » 1.
2. `5e0cc39` `Mode collègue : plats R2, ajout, modification et suppression (06 § 6, D-19, D-21, D-22)`.
3. Journal et colonne `react` de `parite.md` (ce commit).

## Fait

- `mutations/staff/dishes.ts` : `useAddDish`, `useEditDish`, `useDeleteDish` sur `staffWriteOptions` (clés `['write','dishes','add'|'edit'|'delete']`), toasts « Plat ajouté. », « Plat modifié. », « Plat supprimé. » ; constante `DISHES_DOMAIN` retirée.
- `features/staff/DishForm.tsx`, les trois emplacements de P5 (a) :
  - `DishActions({ dish })` : « Modifier ce plat » (`aria-expanded`, `aria-controls`, ouvre `editPlat` en `push`) et « Supprimer ce plat » (`ConfirmButton`, deux clics ; armé : note visible et `aria-label` détaillés si le plat a des réservations, D-21 ; sinon texte de `06` § 5.2) ;
  - `EditDishForm({ dish })` : formulaire sous les actions du plat tant que `editPlat` vaut son id ;
  - `AddDish({ iso })` : « + Ajouter un plat à ce jour » dans une rangée `DayActions`, ou le formulaire à sa place tant que `ajoutPlat` (`06` § 6.2).
- `features/staff/DishFields.tsx` : formulaire commun (`itemFormHtml`) : nom et stock côte à côte, prix avec les suggestions, case « Ticket restaurant » qui vide et désactive le prix (placeholder « Ticket »), bouton occupé (« Ajout en cours… », « Enregistrement… »), « Annuler » désactivé pendant l'envoi, signal de lenteur (D-15). Placeholders du nom et du stock à l'ajout seulement, comme l'ancien formulaire.
- `features/staff/dish-rules.ts` : `dishErrors` (nom, stock > 0, stock ≥ portions réservées avec le message ICU de l'annexe F, prix > 0 ou vide, ignoré au ticket), `dishInput` (nom `trim()`, stock entier, prix `null` au ticket ou vide), `dishValues`, `EMPTY_DISH`, `bookingsOfDish` (lignes du plat seulement : les orphelines ne comptent jamais).
- `features/staff/price-suggestions.ts` : `usePriceSuggestions()` (prix distincts de tous les plats R2 de l'état complet, croissants, au format saisi « 4,50 ») et `priceInputText`.
- `features/staff/dish-focus.ts` : focus de E-48 (premier champ à l'ouverture par le bouton, retour sur « Modifier ce plat » ou « + Ajouter un plat à ce jour » à la fermeture, date de la fiche après une suppression).
- Le ticket n'est codé dans le nom qu'à l'envoi (`api/actions.ts`, `apiDish`) ; prix vide envoyé `""` ; mot de passe lu dans `mutationFn` par la fabrique (`write.ts`).
- Tests : `DishForm.test.tsx` (8 : actions, jour passé, ajout et suggestions, refus, envoi, ticket, panne, « Annuler »), `DishForm.edit.test.tsx` (10 : modification, D-19, refus du script, « Annuler », ouverture par l'URL sans focus, suppression avec et sans réservation, refus de suppression), `dish-rules.test.ts` (26 cas) ; aides `src/test/staff-dishes.tsx`. Stories `DishForm` : `DishActions` (C-20), `AddDish` et `AddDishRefused` (C-21), `EditVoucherDish` et `EditStockBelowBooked` (C-22), `DeleteArmed` (C-14, plat).
- `parite.md` : colonne `react` de C-14 (variante plat), C-20, C-21, C-22.

## Preuves

| Commande | Résultat |
| --- | --- |
| `pnpm check` (trois fois, charge 8 à 30 : trois sessions en parallèle) | extraction, format, lint, `tsc` sans remarque ; Vitest 166 fichiers, 2 185 tests : à chaque passage un seul test rouge, chaque fois un autre, hors de P5 (c) et vert relancé seul (story `ModeSwitch` `LoginPanel` deux fois, `OrderFormR2.send.test.tsx` « sends the exact body once » une fois, `AutoRefresh.test.tsx` une fois) ; aucun rejet non géré ; `knip` et `knip --production` sans remarque |
| `vitest run --project browser --project storybook src/features/staff src/ui/form/CheckboxField src/ui/form/Form` | 9 fichiers, 62 tests verts (dont 6 stories `DishForm` et les stories `CheckboxField` sous axe) |
| `pnpm build:e2e && git diff --exit-code src/routeTree.gen.ts translations/fr.json` | aucune différence |
| `pnpm test:e2e --project=react --grep "REG-37"` | « stock below the booked portions, dish deletion » (`@changed:E-36` `@changed:E-38` `@C-22` `@C-14`) vert ; « dish added and edited » rouge à la ligne 39 (« + Ajouter une personne », P5 (d2)) |
| copie temporaire de « dish added and edited » sans la ligne 39 ni `bookingLines` (P5 (d1)), supprimée ensuite | verte sur `react` : C-20 (ordre « Modifier ce plat », « Supprimer ce plat », orpheline absente), C-21 (corps `addItemR2`, « Tiramisu — 3,50 € », « 6 / 6 »), C-22 (valeurs, corps `editItemR2`, « 8 / 8 ») |
| `pnpm test:e2e --project=react --grep "@C-20\|@C-21\|@C-22\|@C-14"` | 1 vert (REG-37 suppression) ; rouges hors de P5 (c) : REG-37 ajout (ligne 39, P5 (d2)), REG-35 « delete a booking » (P5 (d1)) et « delete a day » (P5 (b)) |
| `pnpm test:e2e --project=react --grep "@p4\|@framework\|@L-01"` | 43 verts sur 44 ; REG-02 (seuil de 600 ms de E-47) rouge sous charge. Même mesure sur `00c8c17` (sans P5 (c)) avec `e2e/regression/loading.spec.ts --workers=1`, quatre passages chacun : REG-02 rouge 2 fois sur 4 sur la base (738 et 909 ms), 3 fois sur 8 sur la branche (715 à 794 ms) ; REG-02 seul (`--repeat-each`) vert 13 fois sur 13 sur la branche. Suite complète verte une fois sur la base (44 sur 44), rouge une autre fois (REG-03, déjà vu rouge sur la branche au premier passage) |
| `pnpm test:e2e:legacy` | 76 verts sur 76 |
| `pnpm test:e2e --project=react-only` | 9 verts sur 9 |
| `pnpm build && pnpm budget` (S3) | JS 174,9 kB gzip (limite 200 ; 174,7 kB après P5 (a), 174,8 kB mesurés sur `00c8c17` en `build:e2e`), CSS 10,3 kB ; « Modifier ce plat » seulement dans `collegue-*.js` |

## Décisions

1. **`CheckboxField` en bouton natif** (`nativeButton`, `render` en fonction) : la `<label>` de Base UI pointait aussi sur l'`<input>` caché de la valeur ; `getByLabel("Ticket restaurant")` de REG-37 trouvait deux éléments (mode strict de Playwright). Avec un bouton natif, l'id et le `for` vont au bouton, l'`<input>` caché n'a plus de nom. `padding: 0` et `font: inherit` ajoutés à `.box`. Le `render` passe par une fonction : la règle `jsx-a11y/control-has-associated-label` ne voit pas le nom que Base UI donne par `aria-labelledby` (même rendu, nom vérifié par les tests de `CheckboxField`). Fichier de P3 (b), hors de la liste « Ne touche pas » et du tableau des propriétaires du PLAN § 5.0 : commit séparé, facile à retirer si l'orchestrateur préfère une autre voie.
2. **Suppression par `mutateAsync` dans le gestionnaire** : le plat et son bouton quittent la page avec la réponse (garde de session puis `setQueryData`) ; les rappels passés à `mutate` ne s'exécutent plus après le démontage, la promesse de `mutateAsync` si. La date de la fiche est lue au clic (élément encore attaché), focalisée après la réponse si elle est toujours dans la page.
3. **Date de la fiche trouvée par les classes de `DayCard.module.css`** (`dish-focus.ts`), `tabindex="-1"` posé au moment du focus : `DayCard.tsx` (P4) n'est pas modifié. Voir « Changements souhaités ».
4. **Focus à l'ouverture** : un formulaire ouvert par son bouton focalise « Nom du plat », comme « Réserver » (`04` § 5.1) ; ouvert par un lien ou un rechargement, il laisse le focus (P5 (a), décision 10). Sans cela, le focus tombait sur `body` à l'ouverture de l'ajout, dont le bouton disparaît.
5. **Stock lu par `Math.trunc(Number(…))`** (règle `unicorn/prefer-number-coercion`) : « 6.7 » donne 6 comme `parseInt` ; « 6abc » et « 6,5 » sont refusés (« Indiquez un stock supérieur à 0. ») au lieu de donner 6. Champ texte `inputMode="numeric"` : un `NumberField` aurait demandé des libellés −/+ absents de l'annexe F.
6. **Prix** : champ `PriceField` (texte, virgule acceptée) ; prix illisible, négatif ou à trois décimales refusé avec le texte de D-22 ; valeur initiale de la modification et suggestions au format saisi « 4,50 » (l'ancien champ `number` montrait « 4.5 »).
7. **Suggestions de prix dans un module** (`price-suggestions.ts`, hook `usePriceSuggestions`) et non un composant `PriceSuggestions.tsx` : `PriceField` (P3 (b)) rend déjà le `<datalist>` à partir d'une liste de chaînes. `priceSuggestions` non exporté (knip `--production`) : le tri et l'absence de doublon sont vérifiés sur le jeu de base (`DishForm.test.tsx` : « 4,50 », « 6,00 », « 6,50 » pour quatre plats à 4,50 €).
8. **Ids de messages** : `staff.dish.*` (actions, toasts, textes de l'annexe F aux ids prévus), `staff.dishForm.*` (champs et règles), pour ne pas croiser les ids de « Ouvrir un jour » R2 de P5 (b).
9. **Pas de signal de lenteur sur la suppression** : `ConfirmButton` reste occupé (« Confirmer ? »), sans zone pour le texte de D-15, comme « Supprimer ce jour » de P5 (b).
10. **Corps vérifiés par les valeurs** dans les tests navigateur de modification et de suppression (`Object.values`) : `api-boundary.test.ts` interdit `itemId` hors de la frontière ; les corps complets sont vérifiés par REG-37 et `api/actions.test.ts`.

## Contradictions

- **Lancement P5 (c)** : « partie plats de la fiche R2 collègue (« Ouvert par », ordre des boutons) » et C-10b déjà faits par P5 (a) (journal p5a, décision 2) ; « `PriceSuggestions.tsx` » devenu `price-suggestions.ts` (décision 7).
- **Critère « REG-37 vert sur `react` »** : le test « dish added and edited » lit « + Ajouter une personne » (P5 (d2)) et les lignes de réservation du plat (P5 (d1)) ; il passe jusqu'à ces lignes (copie temporaire, « Preuves »). Le test « stock below… » est vert.
- **`09` C-21** écrit `ajoutPlat=1` ; le schéma du PLAN § 3.2 est booléen (`ajoutPlat=true`) : `=1` tombe dans le repli (comme `connexion=1`, PLAN § 3.2).
- **REG-02 sur une machine chargée** : le seuil de 600 ms de E-47 échoue sous charge (trois sessions en parallèle), sur la base comme sur la branche (« Preuves »). Rien de P5 (c) n'entre dans le chemin initial ; Rollup a seulement déplacé `react-dom` du morceau `index` au morceau `useId` (tous deux préchargés, total inchangé à 0,1 kB près).

## Changements souhaités dans des fichiers partagés

- `features/calendar/DayCard.tsx` (P4) : `tabIndex={-1}` sur la date et un moyen de la focaliser (ref exportée ou attribut `data-day-date`), pour `dish-focus.ts` et pour « Supprimer ce jour » de P5 (b) (`03` § 5.4).
- `.github/workflows/ci.yml` : ajouter à `E2E_REACT_GREP` `|stock below the booked portions` (REG-37, suppression) ; `REG-37` en entier une fois P5 (d1) et P5 (d2) fusionnées.
- `knip.json` : rien de nouveau (entrée `src/mutations/staff/*.ts!` toujours utile tant que `bookings.ts` et `settings.ts` n'ont pas d'importeur).

## Versions

Aucune version changée, aucun paquet ajouté.

## Overrides oxlint

Aucun.

## Reste à faire

- P5 (d1), (d2) : REG-37 « dish added and edited » passe dès que `AddBookingButtonR2` et `BookingListR2` sont rendus.
- Orchestrateur : `E2E_REACT_GREP` (ci-dessus) ; trancher la décision 1 (`CheckboxField`) et la demande sur `DayCard`.

## Pour l'orchestrateur (PLAN.md)

- Journal du plan : « P5 (c) fusionnée : plats (ajout, modification, suppression, suggestions de prix) ; REG-37 suppression vert sur `react`, REG-37 ajout vert jusqu'aux emplacements de P5 (d1) et (d2) ».
- § 3.1 (`features/staff/`) : « DishForm (DishActions, EditDishForm, AddDish), DishFields, dish-rules.ts, dish-focus.ts, price-suggestions.ts (`usePriceSuggestions`) » au lieu de « DishForm, PriceSuggestions » ; annexe E, ligne « suggestions de prix » : `usePriceSuggestions`.
- § 3.5 ou P3 : `CheckboxField` rend un bouton natif (décision 1).
