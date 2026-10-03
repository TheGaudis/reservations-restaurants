# Journal de la session P3 (b) — Formulaires pré-liés

*3 octobre 2026. Branche locale `claude/p3b-champs-formulaires`, partie de la pointe de l'intégration (`554fad8` : P0, P1 (a1), P1 (a2), P3 (0) intégrées). P2 (a) et P1 (b) tournaient dans d'autres worktrees ; P3 (a) n'avait pas démarré.*

## Fait

- `src/ui/form/form-context.ts` : contextes de `createFormHookContexts`, séparés pour éviter le cycle champs ↔ `app-form.ts`.
- `src/ui/form/app-form.ts` : `createFormHook` avec les six champs et `SubmitButton` ; `useAppForm` pose `revalidateLogic({ mode: "submit", modeAfterSubmission: "change" })` et `canSubmitWhenInvalid: true` (le type reste celui de TanStack Form, sans générique écrit) ; `withFieldGroup` exporté pour `IdentityFields`. L'en-tête décrit la façon d'écrire un formulaire.
- `Form.tsx` : `<form noValidate>` (Entrée soumet, E-03) ; après `await form.handleSubmit()`, focus sur le premier `[aria-invalid="true"]` focalisable dans l'ordre du DOM ; second envoi ignoré pendant un envoi.
- `errors.ts` : `errorText` (chaînes et objets Standard Schema), `focusFirstInvalid`, `setServerErrors(formApi, { champ: message })` pour un refus du script sous son champ (a-5).
- `use-field-messages.ts` + `FieldMessages.tsx` + `Field.module.css` : erreur et aide communes aux champs ; `aria-describedby` erreur puis aide ; aide masquée en erreur ; pastille « ! » `aria-hidden` à côté du message.
- Champs : `TextField`, `PasswordField` (œil), `NumberField` (fr-FR, « champ numérique », −/+ nommés par la fiche, glyphes et `placeholder` en constantes, entiers, `null` affiché vide), `PriceField` (texte `inputMode="decimal"`, `<datalist>`), `CheckboxField`, `SegmentedRadio` (une seule option possible) ; `SubmitButton` (`aria-busy`, « Envoi en cours… » ou libellé fourni, focus gardé).
- Messages `ui.*` : `ui.submitButton.pending`, `ui.numberField.roleDescription`, `ui.passwordField.show`, `ui.passwordField.hide` (textes de 04 § 6.1, 06 § 1.2 et annexe F).
- Jetons ajoutés à `tokens.css` (valeurs en px de `legacy/`) : `--border-width`, `--control-height`, `--control-height-coarse`, `--icon-size`, `--check-size`, `--field-error-halo`, `--field-error-mark`, `--fs-error-mark`, `--fs-field-touch`, `--qty-input-width`. Les CSS Modules de `ui/form/` ne contiennent aucune valeur en px (point d'arrêt 760 px écrit `47.5em`).
- Stories CSF Next par état : `TextField` (vide, rempli, libellé masqué, erreur), `PasswordField` (masqué, affiché), `NumberField` (vide, rempli, plat au maximum, erreur), `PriceField` (vide, suggestions, ticket, erreur), `CheckboxField` (cochée, décochée), `SegmentedRadio` (deux options, jour au ticket), `SubmitButton` (repos, occupé, occupé collègue), `Form` (formulaire R1 réduit : vide, toutes les erreurs).
- Tests navigateur (`userEvent` réel) : 9 fichiers, 44 tests.
- knip : `@tanstack/react-form` et `@base-ui/react` retirés de `ignoreDependencies`.

## Preuves

- `pnpm check` : 36 fichiers, 278 tests (stories comprises), knip propre dans les deux modes.
- `pnpm test:browser src/ui/form` : 9 fichiers, 44 tests ; `pnpm test --project=storybook src/ui/form` : 23 stories, axe vert sur chacune.
- `grep -rn "@base-ui" src --include=*.tsx | grep -v src/ui` : vide. `grep -rnE "#[0-9a-fA-F]{3,6}|[0-9]+px" src/ui/form --include=*.module.css` : vide. Aucun `useEffect`, `useLayoutEffect`, `useMemo` ni `useCallback` dans `src/ui/form`.
- `pnpm build:e2e`, `git diff --exit-code src/routeTree.gen.ts translations/fr.json` : vide ; `pnpm test:e2e --project=react-only` : 5 réussis (aucun scénario de régression ne vise encore les formulaires `react`).
- `pnpm build-storybook` : vert.
- Garde du second envoi : sans la ligne `if (form.state.isSubmitting) return;` de `Form.tsx`, le test « sends once » échoue (2 envois au lieu de 1) ; remise, il passe.
- Storybook lancé sur le port 6060, captures Chromium de huit stories (erreurs, segments, prix au ticket, bouton occupé…) : rendu conforme à 08 § 4.5-4.6 ; serveur arrêté.

## E-19 : attributs rendus par `NumberField` (pour l'orchestrateur)

Relevés par le test « renders the attributes listed for E-19 » de `NumberField.test.tsx`, comparés à `04` § 5.2-5.3 (`type="number" min="0" [max="{rem}"] placeholder="0" inputmode="numeric"`) :

| Attribut ou comportement | Ancien site | `NumberField` |
| --- | --- | --- |
| `type` | `number` (rôle `spinbutton`) | `text` (rôle `textbox`) avec `aria-roledescription="champ numérique"` |
| `min`, `max` | sur le champ visible | absents du champ visible ; portés par un `<input type="number">` caché (`aria-hidden`, `tabindex="-1"`) qui reçoit aussi le `name` |
| `placeholder` | `0` | `0` (identique) |
| `inputmode` | `numeric` | `numeric` (identique) |
| attributs en plus | — | `autocomplete="off"`, `autocorrect="off"`, `spellcheck="false"` |
| nom de la quantité R2 | `aria-label="Quantité : {Nom}"` | `<label>` masqué « Quantité : {Nom} » relié par `aria-labelledby` (même nom accessible) |
| boutons | aucun | − et + (`tabindex="-1"`, `aria-controls`), nommés par la fiche (D-17, E-34) |
| saisie « 2,7 » | 2 (`parseInt`) | 2 (`roundingMode: "trunc"`) |
| saisie de lettres | refusée par le champ, lue 0 | refusée, champ vide (`null`), compté 0 |
| valeur au-delà de `max` | acceptée, réduite par le script | ramenée à `max` en quittant le champ (D-18, E-35) |
| clavier | ↑ ↓ ±1 | ↑ ↓ ±1, Maj ±10 |
| molette sur le champ | comportement du navigateur | sans effet (`allowWheelScrub` à `false`) |

## Décisions

1. **Une seule règle de validation par formulaire.** Les formulaires écrivent un validateur `onDynamic` de formulaire qui renvoie `{ fields }`. Un envoi affiche alors toutes les erreurs ensemble, règle croisée comprise (« Indiquez au moins une personne. »), sans le `form.validate("change")` d'AppResaAristide que cite R-17 : avec `revalidateLogic`, cet appel ne lancerait rien avant le premier envoi. Testé dans `app-form.test.tsx`.
2. **`useAppForm` enveloppe celui de `createFormHook`** pour poser `revalidateLogic` et `canSubmitWhenInvalid` une fois. Les options passées par un formulaire viennent après et peuvent les remplacer.
3. **Valeur d'un `NumberField` : `number | null`.** Le PLAN § 3.5 (« compté 0 dans les calculs mais affiché vide ») l'emporte sur la parade de R-16 (« `null` → 0 ») : le champ garde `null`, les règles et totaux écrivent `?? 0`. + depuis un champ vide donne 1 (Base UI poserait 0, que le `placeholder` affiche déjà).
4. **Fraction tronquée** (`roundingMode: "trunc"`) comme `parseInt` : « 2,7 » → 2.
5. **`SubmitButton` occupé par `focusableWhenDisabled`** de Base UI : `aria-disabled="true"` au lieu de `disabled`, clics ignorés, focus gardé sur le bouton (motif « loading state » de Base UI ; 04 § 6.1 écrit `disabled`). Nom accessible par `aria-labelledby` sur le libellé, comme le recommande Base UI pour un libellé qui change. `toBeDisabled()` de Playwright accepte `aria-disabled`.
6. **Ordre de `aria-describedby`** : Base UI ajoute les ids de l'aide puis de l'erreur dans l'ordre de montage ; le champ lui passe l'id de l'erreur, que Base UI place en tête sans doublon. Résultat : « erreur aide » (04 § 5.4).
7. **Pastille « ! »** : un `<span aria-hidden>` à côté de l'élément d'erreur, hors de lui : le texte de l'erreur reste le message de la spec seul (le `.field-error` de l'ancien site tirait la pastille d'un `::before`).
8. **`setServerErrors`** : `formApi.setErrorMap({ onServer })` marche mais le typage de TanStack Form 1.33.5 le refuse (le générique `TOnServer` ne se déduit d'aucune option). La fonction passe par `AnyFormApi`, sans assertion.
9. **`PriceField` garde le texte saisi** (chaîne) ; `parseAmount` de `domain/validation.ts` (P2 (a)) le lira dans la règle du formulaire. Chaque champ rend son `<datalist>` à partir de `suggestions` ; la page de l'ancien site n'en avait qu'un (`#price-suggestions`).
10. **`CheckboxField` avec un nom propre** (ligne de plat) : `aria-labelledby` vers un `<span hidden>`, parce que Base UI nomme la case par le `<label>` et que `aria-labelledby` l'emporte sur `aria-label`.
11. **Bouton œil et `SubmitButton` stylés dans `ui/form/`** (copies de `.icon-btn` et `.btn.primary`) : `Button` et `IconButton` de P3 (a) n'existaient pas. À remplacer par eux quand P3 (a) sera intégrée (voir « Reste à faire »).
12. **Champs libellés masquables** (`hideLabel`, `hideLegend`) : la connexion collègue, les quantités R2, les lignes de « Ouvrir un jour » R2 et le « Mode de service » public n'ont pas de libellé visible dans l'ancien site ; un `<label>` en `.visually-hidden` donne le même nom accessible.
13. **Composants de démonstration dans les stories et les tests** plutôt qu'un harnais commun dans `src/test/` : chaque fichier montre l'usage réel de `useAppForm` pour P4 et P5.

## Contradictions et remarques

- **R-17, « `defaultValues` lues au montage seulement »** : inexact. Tant qu'aucun champ n'a été modifié, TanStack Form suit les nouvelles `defaultValues` (test « follows new defaultValues while untouched »). Après une saisie, il garde ce qui a été tapé ; une nouvelle `key` le remet à zéro. Conséquence pour P5 : un formulaire de modification ouvert suit l'actualisation jusqu'à la première frappe.
- **« Mode de service » : changement de sémantique sans écart E-xx.** L'ancien site rend `role="group"` + boutons `aria-pressed` (04 § 5.3, § 10) ; `SegmentedRadio` (PLAN § 3.5) rend `role="radiogroup"` + `role="radio"`, un seul arrêt de Tab et les flèches pour changer. Proposition : un écart « E-50 Mode de service en groupe radio » (même raison que E-05), avec la variante `react` du page object `order-r2.ts` (`serviceMode`).
- **Rôle des compteurs** : `spinbutton` → `textbox` (tableau E-19). Les page objects `react` (P4) chercheront les compteurs par leur nom, pas par le rôle `spinbutton`.
- **Base UI 1.8.0, `RadioGroup` dans un `Field`** : les `<input type="radio">` cachés de chaque option reçoivent le même `id` (celui du contrôle du champ). Ils sont `aria-hidden` et axe ne signale rien ; défaut de Base UI noté pour une prochaine mise à jour.
- `ui-forms.md` § 2.4 range `onBlur` et le libellé dans `PortionStepper` ; le lancement demande des −/+ « en français » sans id `ui.*` : les libellés des boutons viennent de la fiche (D-17 les donne par restaurant : `public.r1.form.counter.*`, `public.r2.form.quantity.*`), sans valeur par défaut anglaise possible (props obligatoires).

## Versions

Aucune version changée, aucun paquet ajouté.

## Overrides oxlint

Aucun. Corrections du code : tableau par défaut sorti du composant (`no-object-type-as-default-prop`), texte dans les `<option>` du `<datalist>` (`control-has-associated-label`), accolades des `if` sur plusieurs lignes (`curly`), `querySelector` au lieu de `getElementById` dans les tests (`prefer-query-selector`), `vi.fn()` au lieu de fonctions vides.

## Reste à faire

- P3 (a) : `SubmitButton` peut déléguer à `Button` (`data-variant="primary"`, état occupé) et l'œil de `PasswordField` à `IconButton` ; les jetons `--control-height`, `--border-width`, `--icon-size`, `--check-size` sont disponibles pour `ui/button` et `ui/toggle`.
- P4 (c) : `IdentityFields` par `withFieldGroup` ; rangée des compteurs R1 dans un `fieldset` avec la légende « Nombre de personnes ({rem} au maximum) » et le message « Indiquez au moins une personne. » sous la rangée (ici porté par le premier compteur) ; E-41 (« Choisissez au moins un plat. » relié au `fieldset`) ; règles avec `parseAmount` de P2 (a).
- P4 : erreurs du script par `setServerErrors` (a-5) ; libellés des boutons −/+ par `public.r1.form.counter.*` et `public.r2.form.quantity.*` (annexe F).
- Orchestrateur : compléter E-19 avec le tableau ci-dessus ; trancher l'écart « Mode de service » (contradictions).
- P7 (a) : retirer `"!src/ui/**!"` de `knip.json` (P3 (0)).

## Pour la PR

Titre : « P3 (b) : formulaires pré-liés (`useAppForm`, champs Base UI, `Form`, `SubmitButton`) ».

- Couche que P4 et P5 utiliseront seule : `ui/form/app-form.ts` (en-tête : comment écrire un formulaire), `Form.tsx`, six champs, `SubmitButton`, `setServerErrors`.
- Jetons de contrôle ajoutés à `tokens.css`.
- Tableau des attributs de `NumberField` pour E-19 et écart proposé pour « Mode de service » : voir le journal.
- Aucune action humaine.
