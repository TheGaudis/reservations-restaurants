# Journal de la session « nettoyage » — doublons et contournements de règles

*4 octobre 2026. Branche `claude/cleanup-simplification`, partie de `5a4fd42` (intégration après P7). Demande du responsable : relire le code de la migration, retirer ce qui est dupliqué ou tordu pour respecter une règle, sans ajouter d'abstraction lourde.*

## Fait

- **Données.** Paramètre `options` (`signal`) retiré des quatorze écritures de `api/actions.ts` : aucun appelant ne le passait, et il obligeait à envelopper chaque `mutationFn`. `WRITE_SCOPE` défini une seule fois (`mutations/booking-keys.ts`) : les deux copies devaient rester identiques pour que les écritures publiques et collègue ne se chevauchent pas. `LOCAL_CACHE_KEY` dans `domain/constants.ts`. `sumBy` (`domain/capacity.ts`) remplace quatre boucles de cumul. `useIsFromCache` lit `usePublicReadStatus`. Paramètres envoyés par une boucle au lieu de la récursion `sendFrom`.
- **Messages morts.** `common.error.generic` (« Erreur », remplacé par les textes de D-14) et `staff.openDay.date.required` (la date d'« Ouvrir un jour » vient du calendrier et a toujours une valeur).
- **Chargement à la demande.** `features/page/lazy-chunks.ts` remplace les trois fichiers `load-*.ts`, identiques à l'import près.
- **Collègue.** `showStaffError` (huit copies), `FormActions` (quatre couples Valider / Annuler), `features/staff/booking-r2.ts` (`portionsError` et `modeOptions` copiés entre ajout et modification R2).
- **Impression.** `printWith` remplace quatre fonctions identiques et `startPrinting`. Les fonctions `bold` locales disparaissent : `<b>` vient de `defaultRichTextElements` d'`intl/intl.ts`.
- **Minuteurs.** Plus de nettoyage par ref callback dans `ConfirmButton` et `useSlowWrite`, ni de prop `timerRef` sur `SlowWriteNotice` : `stop()` dans le `finally` de chaque envoi annule le minuteur, le second clic annule celui du bouton armé, et React 19 ignore un `setState` sur un composant démonté. Règle mise à jour dans `CLAUDE.md` et PLAN § 3.5.
- **Logo.** `onClick` sur l'image au lieu d'un `addEventListener` posé par ref callback.
- **Focus.** `ui/pending-focus.ts` (`requestFocus`, `focusOnMount`, `focusById`, `focusFirstInput`) remplace six mécanismes : drapeaux de module (`dish-focus.ts`, `ModeSwitch.tsx` ×2, `DishDraftsR2.tsx`), élément suivi (`EditDayFormR1.tsx`), ensemble de demandes et carte des titres de `BookingColumnsProvider` (avec `flushSync`), ref transmise sur trois niveaux (`BookingList` → `BookingRow` → formulaires de modification). Le titre du récapitulatif prend le focus à son montage. `useCloseForm` (`features/calendar/page-search.ts`) remplace quatre fermetures écrites à la main ; `useCloseBookingForm`, `useBookingDone` et `BookingFormActions` servent aux deux formulaires publics.

## Décisions

1. **Aucun `useEffect` ajouté.** Les endroits où l'agent avait évité un effet n'en avaient pas besoin : le nettoyage des minuteurs était inutile, et le focus au montage par ref callback est l'outil juste (un effet aurait demandé le même drapeau « ouvert par un clic »).
2. **Une seule demande de focus à la fois**, au niveau du module. L'ancien ensemble de `BookingColumnsProvider` disparaissait avec le fournisseur ; le module garde une demande non prise jusqu'à la suivante. `src/test/setup-browser.ts` l'efface avant chaque test : sans cela, une demande laissée par `DayCardR2.test.tsx` (« Réserver » cliqué, test fini avant le montage du formulaire) était prise par le formulaire ouvert par l'URL du test suivant, et la page se figeait sous l'horloge `Date` simulée. Sans horloge simulée, le même test ne se fige pas.
3. **Laissés tels quels.** Injection de `BackgroundDeps` (retirer `session`, `purgeStaffSession` et `showToast` demande de réécrire trois fichiers de tests pour une quinzaine de lignes) ; `Object.keys(fields).length === 0 ? undefined : { fields }` (une ligne idiomatique, un nom en plus n'aide pas) ; séparateurs ICU « {before}, {after} » de l'impression (textes de la spec) ; index `WeakMap` de `domain/capacity.ts` ; passe sur les commentaires (17 % des lignes, presque tous des renvois à la spec).

## Overrides oxlint

- `no-await-in-loop` sur `src/mutations/staff/settings.ts` : les paramètres partent un par un, chacun après la réponse du précédent (06 § 2.2 (4)). Exemple minimal : `for (const change of changes) await setConfigField(password, change)` ; un `Promise.all` enverrait tout en même temps.
- `jsx-a11y/click-events-have-key-events` et `jsx-a11y/no-noninteractive-element-interactions` sur `src/features/page/Header.tsx` : l'easter egg (D-01) est un clic de souris sur une image hors de l'ordre de tabulation, comme dans l'ancien `main.js`.
- `formatjs/enforce-placeholders` : `ignoreList: ["b", "i"]`, les deux balises de `defaultRichTextElements`.

## Reste

- `notifyManager.setScheduler(queueMicrotask)` (`queries/client.ts`) change le moment des notifications en production pour les E2E à horloge figée ; `focusCardDate` en dépend par `flushSync(() => null)` sans le dire. À documenter ou à revoir.
- `ModeSwitch` retrouve sa boîte par `` closest(`.${styles["box"]}`) `` : un attribut `data-*` serait plus sûr.
- `bookingPriceText` (impression) et le total de `bookingLineR1` (collègue) répètent la même ligne.
