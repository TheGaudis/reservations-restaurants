# Fichiers repris d'AppResaAristide

- **Source** : dépôt privé `TheGaudis/AppResaAristide` (même propriétaire que ce dépôt), commit `b999021` (24 septembre 2026, « Harden seedDev, tighten a test assertion and a duplicated type »).
- **Copiés le** 3 octobre 2026, sans modification, pour que les sessions de P2 et P3 n'aient pas à accéder à l'autre dépôt.
- **Statut** : matériau de référence, à **adapter**, jamais à copier tel quel dans `src/` :
  - Tailwind → CSS Modules et jetons de la charte (§ 3.6 du plan) ;
  - textes selon `docs/spec/` (AppResaAristide tutoie et diffère sur plusieurs libellés) ; tous les textes passent par react-intl ;
  - code en anglais selon le glossaire du plan (annexe E) ; pas de Convex : les fonctions de `convex/model/` deviennent des fonctions pures de `src/domain/`.

| Fichier copié | Usage dans le plan | Remarques |
| --- | --- | --- |
| `src/lib/validators.ts` (+ `validators.test.ts`) | `domain/validation.ts` (P2 (a)) | règles et messages à aligner sur `04` § 5.4 et `00` § 3 |
| `src/lib/money.ts` (+ `money.test.ts`) | `parseAmount`, `parseCount`, `stepCount` dans `domain/validation.ts` | `formatEuro` non repris : le format vient de react-intl ; sert seulement de référence au test doré du format `euro` |
| `src/lib/dates.ts` (+ `dates.test.ts`) | `domain/dates.ts` et `intl/dates.ts` | dont `formatWeekLabel` et un `addMonths` sans débordement ; libellés à adapter à `05` § 2.3 et à a-23 |
| `src/lib/today.ts` (+ `today.test.ts`) | principe seulement de `background/clock.ts` | l'horloge du plan est un store Zustand aligné sur la minute, en heure de Paris |
| `convex/model/dates.ts` | `domain/paris.ts` (`parisDate`, `parisHour`) | |
| `convex/model/pricing.ts` | `domain/pricing.ts` (`r1Total`) | `formatEuro` non repris |
| `convex/model.test.ts` | tests de `paris.ts` et `pricing.ts` | seuls les blocs « Paris date helpers » et « pricing » concernent le plan ; il importe aussi `./model/emails` et `./model/settings`, non copiés |
| `src/components/form/fields.tsx` | `ui/form/*` (P3 (b)) | importe `@/lib/money` et `../ui/button` (non copié) ; Tailwind à remplacer |
