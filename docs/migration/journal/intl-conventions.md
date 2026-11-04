# Journal de la session « conventions des messages »

*4 novembre 2026. Bookmark `claude/intl-conventions`, parti de `claude/frontend-react-migration-lw5zfz` (`af959b9`). Demande de l'orchestrateur : appliquer les deux règles du responsable sur les messages react-intl. Un message qui sert à un seul fichier y reste ; un message partagé s'exporte seul par `export const x = defineMessage(…)` ; `defineMessages` disparaît. Le site ne change pas.*

## Fait

- Les 55 appels `defineMessages(…)` de `src/` (hors tests et stories) sont retirés ; `grep -rn defineMessages src` ne trouve plus rien. Ils regroupaient 275 messages.
- 11 messages rendus dans le JSX et utilisés une seule fois deviennent un `<FormattedMessage id defaultMessage description />` écrit sur place (`BookingRow`, `DeleteDayButton`, `ReserveButton`, `SlowWriteNotice`, `BookingFormActions`, `BookingSummary`, `DayCard`, `SeatCountersR1`, `AddBookingParts`, `OpenDatePicker`).
- 201 messages deviennent des constantes locales `const x = defineMessage(…)` dans le fichier qui les lit par `intl.formatMessage` (attribut, toast, texte de document, règle de formulaire). 194 n'y servent qu'une fois, 7 plusieurs fois dans le même fichier.
- 13 messages lus par une clé restent groupés dans un objet de `defineMessage(…)` typé `Record<…, MessageDescriptor>` : `labels` et `errorMessages` de `SettingsForm.tsx`, `statusMessages` de `intl/calendar.ts`.
- 50 messages s'exportent un par un :
  - `src/intl/common-messages.ts` : 17 sur 38 (111 lignes, 250 avant). Les 21 autres ont rejoint leur seul utilisateur.
  - `src/intl/staff-messages.ts` : 15 sur 37 (98 lignes, 243 avant). Les 22 autres ont rejoint leur seul utilisateur.
  - `src/features/print/document-texts.ts` : 8 (ex-`documentMessages`) ; `src/features/print/list-r2.ts` : 3 sur 4 (ex-`r2Messages`, `bookedStockText` reste local) ; `src/features/staff/day-messages.ts` : 3 sur 4 (`capacityBelowBookedMessage` va dans `EditDayFormR1.tsx`).
  - 4 messages à un seul utilisateur dans l'appli restent exportés parce qu'un test les importe : `counterWithPriceLabel` et `counterDecrementLabel` (`SeatCountersR1.tsx`), `maxSeatsMessage` (`seat-rules.ts`), `deleteDayWithBookingsLabel` (`DeleteDayButton.tsx`).
- Noms : les constantes exportées portent le rôle du texte (`cancelAction`, `savingLabel`, `r2ClosedMessage`, `nameColumnLabel`…). `staffNameRequiredMessage` et `staffClassRequiredMessage` distinguent les messages collègue des messages publics de même rôle, définis dans `identity-rules.ts`.
- Un message avec valeurs garde ses types en argument : `defineMessage<{ count: number }>(…)`. Les alias `NoValues` disparaissent.
- Tests : imports suivis dans `common-messages.test.ts`, `staff-messages.test.ts`, `intl.test.ts`, `rendering.test.tsx`. Les deux premiers parcouraient l'objet par clé (`commonMessages[key]`) : leurs tables reçoivent les descripteurs. Les lignes « keeps the text of » des messages qui ont quitté les fichiers partagés sont retirées (décision 2).
- `CLAUDE.md`, « Textes et formats » : premier point réécrit (deux règles, table indexée, valeurs typées) ; `defineMessages` remplacé par `defineMessage` dans le point sur l'espace insécable.
- 83 fichiers touchés, journal compris.

## Décisions

1. **Fichiers partagés conservés.** Les messages exportés restent dans le fichier qui les portait (`common-messages.ts`, `staff-messages.ts`, `document-texts.ts`, `list-r2.ts`, `day-messages.ts`). Les ids `common.*` et `staff.*` disent déjà la zone ; déplacer un message partagé par deux formulaires collègue dans `features/staff/` n'apporterait rien.
2. **Tests de texte brut retirés.** `common-messages.test.ts` vérifiait le texte de `book`, `confirmBooking`, `close`, `bookingConfirmed`, `noService`, `dineInOnly`, `emailInvalid` ; `staff-messages.test.ts` celui de `serviceUnavailable`, `personDuplicate`, `addPerson`. Ces messages vivent maintenant dans leur seul utilisateur, sans export. Les garder aurait demandé sept exports réservés aux tests. Ces lignes répétaient le `defaultMessage` ; la comparaison de `translations/fr.json` (ci-dessous) et la spec couvrent ces textes. Les tests ICU avec valeurs (pluriels D-18, D-21, clôture R2, compteur avec tarif) restent et suivent leur descripteur.
3. **Tables indexées.** `labels[key]`, `errorMessages[error]` et `statusMessages[day.status]` gardent un objet. Chaque valeur passe par `defineMessage`, que le plugin précompile.
4. **Inlining limité au JSX.** Un message lu par `intl.formatMessage` dans un attribut, une fonction ou un fichier `.ts` reste une constante locale, comme le prévoit la règle 1. Les deux messages de `TomorrowBlocks.tsx` choisis par un ternaire dans `<FormattedMessage {...(…)} />` restent aussi des constantes.

## Vérification

- `translations/fr.json` : copie prise avant le travail, puis `pnpm i18n:extract` à la fin. 337 ids avant et après, mêmes `defaultMessage` et `description` ; le fichier ne change pas, ordre compris.
- `pnpm check` : vert (175 fichiers, 1 686 tests ; knip vert).
- `pnpm build:e2e` puis `git diff --exit-code src/routeTree.gen.ts` : aucun écart.
- `pnpm test:e2e --project=react-only --project=react` : 84 sur 84. La fixture échoue sur toute erreur console : aucun descripteur non précompilé dans le build (R-34).
- `pnpm build && pnpm budget` : JS 205,3 kB gzip avant, 204,4 kB après (limite 240 kB) ; `dist/assets/*.js` bruts : 848 741 octets avant, 844 057 après.

## Overrides

- Aucun.

## Reste

- Mise à jour de `PLAN.md` par l'orchestrateur (ci-dessous).
- `common-messages.test.ts` et `staff-messages.test.ts` testent maintenant des messages de trois fichiers différents ; la session « tests » peut les ranger près de leur code.

## Pour PLAN.md (orchestrateur)

- § 3.10, « Deux formes seulement » : `<FormattedMessage id defaultMessage description />` écrit dans le JSX pour un message rendu par un seul fichier ; sinon `const x = defineMessage({ … })` dans le fichier qui l'utilise, passé à `intl.formatMessage(x)`. Un message partagé : `export const x = defineMessage({ … })`, un par constante. `defineMessages` n'est plus utilisé (type d'objet illisible, tous les messages du fichier gardés dans le bundle). Table lue par une clé : objet de `defineMessage(…)`.
- § 3.10, « Où vivent les messages » et « Espaces insécables » : remplacer `defineMessages` par `defineMessage`.
- § 3.1 (arborescence) : `common-messages.ts` devient « textes partagés par plusieurs fichiers, un `export const … = defineMessage(…)` par texte (Annuler, Enregistrer, message de clôture R2, modes de service, compteurs R1…) » ; ajouter `staff-messages.ts` sur le même modèle pour le mode collègue.
- § 2 (table des dépendances, ligne `react-intl`) : `defineMessage` à la place de `defineMessages`.
- R-34 : « Deux formes seulement (`<FormattedMessage>` littéral, `defineMessage`) ». Le reste de la parade ne change pas. Le risque P4 « messages hors `defineMessages` » devient « messages hors `defineMessage` ».
