# Journal de la session P2 (a) — `src/domain/`

*3 octobre 2026. Branche locale `claude/p2a-domaine`, partie de la pointe de l'intégration (`d56570a`, P0 et P1 (a1) intégrées). P1 (a2) et P3 (0) tournaient en parallèle.*

## Fait

- Premier commit (`4f33e0d`), socle de P2 (b1) et P2 (c) : `types.ts` écrit à la main (modèle du PLAN § 3.3.6, `EmailStatus`, `BookingResult` et ses lignes, entrées de toutes les actions POST de 02 § 4.4, § 4.5 et § 4.7), `constants.ts` (00 § 2.1, E-45, D-15, D-01), `paris.ts` (`parisDate`, `parisHour`), `vouchers.ts` (`VOUCHER_MARK`, `VOUCHER_MARK_RE`, `plainName`, `withVoucherMark`, `hasVoucherMark`, `dayHasVoucher`, `serviceMode`).
- `dates.ts` : `utcTime`, `addDays`, `dayOfMonth`, `mondayOf`, `firstOfMonth`, `addMonthsClamped`, `isSameWeek`, `isSameMonth`, `weekCells`, `monthCells`, `keyTargetIso`.
- `gauge.ts` (`gaugePercent`), `capacity.ts` (index `WeakMap`, `findDay`, `seatsBooked`, `portionsBooked`, `remainingSeats`, `remainingStock`, `isSoldOut`, `dishesForDay`, `portionsBookedForDay`, `capacityClass`, `dayStatusR1`, `dayStatusR2`), `pricing.ts` (`seatTotal`, `priceR1`, `r2Amounts`, `orderAmounts`, `addAmounts`, `hasAmounts`), `cutoff.ts` (`isPast`, `isR2OrderingClosed`).
- `navigation.ts` : `CALENDAR_KEYS`, `selectDay`, `clickDay`, `shiftPeriod`, `goToToday`, `publicSearch`, `selectedDay`, `calendarAnchor`, `calendarView`, `isSamePeriod`.
- `validation.ts` : validateurs d'AppResaAristide, `positiveAmount` (D-22), `parseAmount`, `parseCount`, `stepCount`, `countValue`, `isEmail`.
- `bookings.ts` : `canBookR1`, `canOrderR2`, `bookingR1Input`, `orderR2Input`, `editBookingR1Input`, `editBookingR2Input`, `maxSeatsForEdit`, `maxPortionsForEdit`, `emailFailed`, `wasAdjusted`, `orderOutcome`, `summaryR1`, `summaryR2`.
- `print.ts` : `bookingsForDayR1`, `r1Totals`, `seatsLineR1`, `bookingsForDish`, `ordersForDay`, `dishTotals`, `r2DayTotals`.
- `src/test/domain-states.ts` : fabriques d'états du modèle anglais pour les tests (valeurs de parite.md § 2).
- Tests co-localisés, tables `it.each`, projets `node` et `node-ny` pour tout `domain/`.

## Mesures

- `pnpm test:node src/domain --coverage` : 26 fichiers, 742 tests (les deux projets) ; `src/domain` 99,63 % des lignes, 99,06 % des branches, 100 % des fonctions. Seule ligne non couverte : la garde de `utcTime` sur une partie manquante après une regex qui l'interdit.
- `pnpm vitest run --project=node-ny src/domain` : 13 fichiers, 371 tests.
- `pnpm check` : 37 fichiers, 838 tests ; knip propre dans les deux modes.

## Décisions

1. **`IsoDate` = `string`**, sans type marqué : les schémas valibot et les search params produisent des chaînes, un type marqué demanderait une assertion à chaque frontière.
2. **`EmailStatus = { sent, reason }`**, `reason` vaut `null` quand l'e-mail est parti. **`BookingResult`** ne garde pas `totalPrix` ni `hasPriceGap` (ignorés par le client, 02 § 4.5) ; `ConfirmedDish` porte `name` sans la mention, `price` et `voucher`, de quoi recalculer `orderAmounts`.
3. **Entrées des actions collègue dans `types.ts`** (`OpenDayR1Input`… `SettingInput`), pour que P2 (b2) écrive `api/actions.ts` d'un coup. `SettingInput.value` reste une chaîne (valeur saisie). Huit types sans importeur portent `@public` (balise de knip) ; P2 (b2) retire chaque balise en important le type.
4. **Search params** : types `CalendarSearchParams` et `PageSearchParams` (le nom `CalendarSearch` est celui du schéma valibot de `features/calendar/search.ts`). `CALENDAR_KEYS` est un `Array` modifiable : `retainSearchParams` refuse un tableau en lecture seule. Les fonctions écrivent `undefined` pour retirer un paramètre ; le routeur omet ces clés de l'URL (vérifié dans `encode` de `@tanstack/router-core`).
5. **`shiftPeriod(search, restaurant, direction, today)`** au lieu de `(…, ±1, view)` du PLAN § 3.2 : la vue est lue dans `search`, et `today` donne la période affichée quand `rX` manque. Mois : 1er du mois ± 1 ; semaine : ancre ± 7 jours (`navCal`). L'ancre quitte l'URL quand elle retombe dans la période du jour sélectionné.
6. **`clickDay` en plus de `selectDay`** : voir « Contradictions ». Clavier : `selectDay(search, r, keyTargetIso(key, iso))`, la vue suit.
7. **`findDay` linéaire et générique** : il rend `StaffServiceDayR1` sur l'état complet sans assertion. L'index `WeakMap` sert aux sommes et aux plats par jour.
8. **Montants arrondis au centime** (`priceR1` comme `r1Total`, `r2Amounts`) : l'ancien client n'arrondissait qu'à l'affichage, sans différence visible.
9. **Validateurs génériques sur le type du message** : `domain/` ne produit aucun texte, le formulaire passe le message de react-intl. `parseCount("2.7")` vaut `NaN` (choix d'AppResaAristide, E-19).
10. **`orderR2Input` envoie les plats dans l'ordre de la feuille** ; l'ancien code suivait l'ordre de saisie (`multiBookingQty`). Le formulaire TanStack tient toutes les quantités dès l'ouverture. Même fonction pour l'ajout collègue : « Sur place » seul un jour au ticket (D-19).
11. **Récapitulatifs en structures** (`SummaryR1`, `SummaryR2`), sans texte : nom de plat vide quand le plat n'est plus dans l'état (P4 affiche « Plat », 04 § 7) ; `summaryR2` rend `null` quand rien n'est confirmé ; un `_bookingResult` absent compte comme vide (repli de l'ancien code).
12. **Impression, un ticket par commande (E-16)** : colonne Prix d'un client = `orderAmounts` ; « Total du jour » = somme des commandes ; récapitulatif par plat : pour un plat au ticket, un ticket par commande qui le contient. Tri par classe puis nom avec `localeCompare(…, "fr")` (l'ancien code prenait la langue du navigateur).
13. **knip** : `"!src/domain/**!"` dans `project` de `knip.json` (commit séparé `068127e`), comme `src/intl/common-messages.ts` en P0 (b). `knip.json` appartient à P0 (a) ; le PLAN § 5.0 admet un réglage justifié par toute session. Retrait : P6 (b) au plus tard.
14. **Couverture mesurée en ligne de commande** : `vitest.config.ts` n'a pas de `coverage.include`, donc un module de `domain/` qu'aucun test n'importe n'apparaîtrait pas dans le rapport. Tous les modules sont importés aujourd'hui.
15. **`check:fast` avant chaque commit sur l'instantané du commit** : `git stash push --keep-index --include-untracked`, contrôle, commit, `git stash pop`.

## Contradictions

- **PLAN § 3.2 contre 05 § 3.1 et PLAN § 4.3 (a-23)** : le PLAN dit que `rXperiode` est « effacée par toute sélection de jour » ; 05 § 3.1 et a-23 gardent le mois affiché quand on clique un jour d'un mois voisin en vue mois. La spec fait foi pour le comportement : `clickDay` (clic) garde l'ancre dans ce cas, `selectDay` (clavier, « Ouvrir un jour ») la retire.
- **PLAN § 3.2, signature de `shiftPeriod`** : décision 5.
- **07 § 4.2 et § 5 contre E-16** : 07 compte un ticket par portion dans la colonne Prix, le récapitulatif par plat et le total du jour ; E-16 impose un ticket par commande sans dire comment le répartir par plat. Décision 12, la plus facile à changer (une ligne de `dishTotals`).

## Versions

Aucune version changée, aucun paquet ajouté.

## Overrides oxlint

Aucun. Corrections du code : `readonly VoucherFlag[]` au lieu de `readonly Pick<…>[]` (`array-type`), boucles `for` au lieu de `reduce` hors des sommes simples, variables renommées (`no-shadow`), tests découpés sous 300 lignes (`bookings-summary.test.ts`), lignes des tables en objets au-delà de quatre paramètres (`max-params`).

## Reste à faire

- P2 (b1) : schémas qui produisent ces types (test `expectTypeOf` par entité), `plainName` et `hasVoucherMark` à la réception, `'emporter'` → `takeaway`, toute autre valeur → `dineIn` (07 § 4.1).
- P2 (b2) : `api/actions.ts` avec `withVoucherMark` et `price ?? ""` ; retirer les `@public` de `types.ts` au fur et à mesure ; tests dorés de `keyTargetIso` et `capacityClass` contre `legacy/js/calendrier.js` et `donnees.js` (écarts attendus : heure de Paris, Page ↑ / ↓ bornée).
- P2 (c) : `intl/dates.ts` sur `utcTime`, `mondayOf`, `addDays`, `isSameMonth` ; `intl/amounts.ts` sur `Amounts` et `hasAmounts` ; horloge sur `parisDate` et `isR2OrderingClosed`.
- P4 : clic = `clickDay`, clavier = `selectDay` + `keyTargetIso`, ‹ › = `shiftPeriod`, « Aujourd'hui » = `goToToday` ; « Réserver » selon `canBookR1` / `canOrderR2` ; `bookingR1Input`, `orderR2Input`, `summaryR1`, `summaryR2`.
- P5 : préparation des lignes de plats (06 § 4.2, D-19), paramètres modifiés (06 § 2.2, D-20) et entrées « Ouvrir un jour » ne sont pas écrites dans `domain/`.
- P6 : `print.ts` (documents, panneau « Demain ») ; retirer `"!src/domain/**!"` de `knip.json` quand chaque module a un importeur de production.

## Pour la PR

Titre : « P2 (a) : domaine pur (`src/domain/`) ».

- Interfaces figées par le premier commit `4f33e0d` : `types.ts`, `constants.ts`, `paris.ts`, `vouchers.ts`.
- Un fichier partagé modifié : `knip.json` (commit `068127e`, une ligne, décision 13).
- Aucune action humaine.
