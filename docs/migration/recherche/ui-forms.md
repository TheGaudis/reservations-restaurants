# Bibliothèque de composants : Base UI + TanStack Form (recherche technique)

*Restaurants pédagogiques, migration vers React 19. Rapport du 3 octobre 2026.*

Périmètre : composants d'interface et formulaires uniquement (pas de routeur, pas de couche API). Aucun fichier du dépôt n'a été modifié.

---

## 0. Versions vérifiées et sources

| Paquet | Version (3 oct. 2026) | Commande / source |
| --- | --- | --- |
| `@base-ui/react` | **1.8.0** (`latest`, publiée le 4 sept. 2026) | `npm view @base-ui/react version dist-tags` ; `docs/react/overview/releases/v1-8-0.md` dans le paquet |
| `@base-ui-components/react` | 1.0.0-rc.0, **dépréciée** : « Package was renamed to @base-ui/react » | `npm view @base-ui-components/react deprecated` |
| `@tanstack/react-form` | **1.33.5** (`latest`) ; `2.0.0-alpha.2` sous le tag `alpha` (21 août 2026) | `npm view @tanstack/react-form version dist-tags time` |
| `react` / `react-dom` | 19.3.0 (exporte `ViewTransition`, `Activity`, `useEffectEvent`) | `npm view react version` ; `node -e "Object.keys(require('react'))"` |
| `@tanstack/react-query` | 5.104.1 | `npm view` |
| `@tanstack/router-core` | 1.171.34 (`validateSearch` accepte un Standard Schema) | `npm pack` + `dist/esm/validators.d.ts` |
| `react-aria-components` | 1.21.1 | `npm view` |
| `@internationalized/date` | 3.12.4 | `npm view` |
| `temporal-polyfill` | 1.0.5 | `npm view` |
| `date-fns` | 4.4.0 | `npm view` |
| `lucide-react` | 1.51.0 (1.0.0 publiée le 23 mars 2026) | `npm view lucide-react time` |
| `react-to-print` | 3.3.0 | `npm view` |
| `zod` / `valibot` | 4.6.5 / 1.5.0 | `npm view` |
| `oxfmt` / `oxlint` | 0.71.0 / 1.86.0 | `npm view` ; test local : oxfmt formate bien les `.css` / `.module.css` |
| `vite` | 8.3.2 | `npm view` |
| `vite-css-modules` | 1.16.0 (peer `vite ^5…^8`, option `generateSourceTypes`) | `npm view vite-css-modules readme peerDependencies` |

**Documentation consultée** (base-ui.com, tanstack.com et mui.com sont bloqués ici, j'ai donc lu les sources) :

- **La doc Markdown complète de Base UI est livrée dans le paquet npm** : `ui/pkg-baseui/package/docs/react/**.md` (non versionné) (paquet obtenu par `npm pack @base-ui/react@1.8.0`). Fichiers lus :
  - `handbook/forms.md`, avec la section « TanStack Form » ;
  - `handbook/styling.md`, `handbook/animation.md`, `handbook/composition.md`, `handbook/typescript.md` ;
  - `overview/quick-start.md`, `overview/accessibility.md` ;
  - `components/{field,form,fieldset,number-field,radio,toggle-group,checkbox,toast,dialog,alert-dialog,collapsible,button,input}.md`.
- Clone partiel de `mui/base-ui` (commit `19511bb`, 2 oct. 2026) dans `ui/base-ui/` (non versionné) :
  - `packages/react/src/index.ts` (liste des exports) ;
  - `packages/react/src/internals/temporal*` ;
  - `docs/src/app/(docs)/react/...` (MDX) ;
  - `CHANGELOG.md` via raw.githubusercontent.
- Sources compilées lues pour vérifier le comportement réel :
  - `field/error/FieldError.mjs`, `field/root/FieldRoot.mjs`, `field/root/useFieldValidation.mjs`, `form/Form.mjs` ;
  - `number-field/input/NumberFieldInput.mjs`, `number-field/root/useNumberFieldStepperButton.mjs` ;
  - `toast/viewport/ToastViewport.mjs`.
- Clone partiel de `TanStack/form` (commit `2216fde`, 1er oct. 2026) dans `ui/tanstack-form/` (non versionné) :
  - `docs/framework/react/guides/{form-composition,form-groups,reactivity,arrays,listeners,submission-handling,validation,dynamic-validation,focus-management,custom-errors,linked-fields}.md` ;
  - `packages/form-core/src/{FormApi,FieldApi,ValidationLogic,types}.ts` ;
  - changelogs `main` et `alpha`.
- Compatibilité navigateurs : MDN browser-compat-data (`main`) pour `javascript/builtins/Temporal.json`, `css/at-rules/page.json`, `css/properties/page.json` et `api/Window.json`.
- Tailles mesurées par moi : esbuild `--bundle --minify`, puis `gzip -9` (dossier `ui/sizes/` (non versionné)).

---

## 1. Base UI : état, liste des composants, philosophie, accessibilité

### 1.1 Version et stabilité

- **1.0.0 stable est sortie le 11 décembre 2025.** Depuis, une version mineure sort à peu près chaque mois : 1.1.0 (15 janv. 2026), 1.2.0 (12 févr.), 1.3.0 (12 mars), 1.4.0 (13 avr.), 1.5.0 (19 mai), 1.6.0 (18 juin), 1.7.0 (4 août), **1.8.0 (4 sept. 2026)**.
- Le paquet s'appelle **`@base-ui/react`**. L'ancien `@base-ui-components/react` est déprécié sur npm. La doc l'écrit en tête de chaque page : « The package was previously published as `@base-ui-components/react` and has since been renamed to `@base-ui/react`. »
- Imports par composant : `import { Dialog } from '@base-ui/react/dialog'`. Le paquet déclare `"sideEffects": false` et se tree-shake bien.
- Peer dependencies : React 17, 18 ou 19. `date-fns` et `@date-fns/tz` sont **optionnels** (`peerDependenciesMeta`) : ils servent au futur composant de dates (voir 1.3).
- Les versions canary s'installent par `pkg.pr.new`. Sans intérêt pour nous.

### 1.2 Liste des composants exportés par la 1.8.0

Source : `packages/react/src/index.ts` et `exports` de `package.json`.

| Famille | Composants |
| --- | --- |
| Actions | `Button`, `Toggle`, `ToggleGroup`, `Toolbar` |
| Formulaires | `Form`, `Field` (Root, Label, Control, Description, Error, Item, Validity), `Fieldset`, `Input`, `Checkbox`, `CheckboxGroup`, `Radio`, `RadioGroup`, `Switch`, `NumberField`, `Slider`, `Select`, `Combobox`, `Autocomplete`, `OTPField` (en « preview ») |
| Surfaces flottantes | `Dialog` (avec `Dialog.Viewport`), `AlertDialog`, `Drawer` (bottom sheet, swipe, snap points), `Popover`, `Tooltip`, `PreviewCard`, `Menu`, `ContextMenu`, `Menubar`, `NavigationMenu` |
| Disclosure | `Accordion`, `Collapsible`, `Tabs` |
| Retour | `Toast` (avec `createToastManager`), `Progress`, `Meter` |
| Divers | `Avatar`, `ScrollArea`, `Separator` |
| Utilitaires | `useRender`, `mergeProps`, `DirectionProvider`, `CSPProvider`, `unstable-use-media-query` |
| Internes (exportés sous `@base-ui/react/internals/*`) | `composite`, `temporal`, `temporal-adapter-date-fns`, `temporal-adapter-luxon`, `useTransitionStatus`, etc. **Pas d'API publique documentée : à éviter.** |

Dans `src/` mais **pas exporté** : `filter-dropdown` (travail en cours).

### 1.3 Calendar et DatePicker : n'existent pas encore

- **Il n'y a aucun composant `Calendar`, `DatePicker` ni `DateField` dans la 1.8.0.** Aucune entrée dans le CHANGELOG et aucune page de doc.
- L'issue mui/base-ui **#1709** « [pickers] Calendar and Date Fields primitives » est **ouverte** depuis le 12 avril 2025 et assignée à LukasTy (équipe MUI X pickers). Aucune PR liée n'est visible.
- Le dépôt contient déjà des fondations internes : `internals/temporal/temporal-adapter.ts`, des adaptateurs date-fns et Luxon, et les peers optionnels `date-fns` / `@date-fns/tz`. Un calendrier est donc **en préparation**, sans date annoncée.
- Le fichier `docs/src/app/(private)/experiments/popover/calendar.tsx` n'est qu'une démo de Popover posée sur un agenda.
- Conséquence : il faut écrire notre propre calendrier (section 3).

### 1.4 Philosophie

Extraits des guides `styling.md`, `composition.md` et `animation.md`.

- **Composants composés** : `Dialog.Root > Dialog.Trigger + Dialog.Portal > Dialog.Backdrop + Dialog.Viewport > Dialog.Popup > Dialog.Title / Description / Close`.
- **`render` prop** pour changer l'élément rendu ou composer avec un autre composant :
  - forme élément : `render={<a href="…" />}` ;
  - forme fonction : `render={(props, state) => <span {...props}/>}`.
  - Le composant passé doit relayer `ref` et tous les props reçus. En React 19, `ref` est un prop ordinaire : plus besoin de `forwardRef`.
- **Aucun style fourni.** Trois points d'accroche :
  1. `className`, en chaîne ou en fonction : `className={(state) => …}` ;
  2. **attributs `data-*`** : `data-open`, `data-closed`, `data-checked`, `data-unchecked`, `data-pressed`, `data-disabled`, `data-invalid`, `data-valid`, `data-dirty`, `data-touched`, `data-filled`, `data-focused`, `data-highlighted`, `data-side`, `data-starting-style`, `data-ending-style`… ;
  3. **variables CSS** : `--transform-origin`, `--available-height`, `--anchor-width`, `--collapsible-panel-height`, `--toast-index`, `--toast-offset-y`, `--nested-dialogs`…
- **Animations** : la doc recommande les transitions CSS avec `[data-starting-style]` / `[data-ending-style]`, parce qu'une transition s'interrompt proprement. Les `@keyframes` peuvent aussi s'accrocher à `[data-open]` / `[data-closed]`. Base UI attend la fin des animations (`getAnimations()`) avant de démonter. Si une animation est neutralisée par `prefers-reduced-motion`, le démontage est immédiat.
- **Types** : par namespaces, par exemple `Dialog.Root.Props`, `Dialog.Popup.State`, `NumberField.Root.ChangeEventDetails`, `Button.Props`.
- **Événements** : `onValueChange(value, eventDetails)`, où `eventDetails` contient `reason`, `event`, `cancel()`, `allowPropagation()`.
- **Mise en place** (`quick-start.md`) :
  - ajouter `isolation: isolate` sur la racine de l'application, pour que les portails passent au-dessus ;
  - ajouter `body { position: relative }`, nécessaire aux fonds de dialogue sur iOS 26 Safari.

### 1.5 Accessibilité : ce que Base UI fait, ce qui reste à faire

**Ce que Base UI prend en charge** (vérifié dans la doc et le code) :

- Rôles et attributs ARIA, navigation clavier selon WAI-ARIA APG (flèches, Début / Fin, Entrée, Échap).
- **Dialog** :
  - `modal` vaut `true` par défaut : piège à focus, défilement de la page bloqué, clics extérieurs neutralisés ;
  - Échap et clic extérieur ferment, sauf avec `disablePointerDismissal` ;
  - focus initial et final réglables (`initialFocus`, `finalFocus`) ;
  - rendu dans un portail (`Dialog.Portal`, prop `container`) ;
  - dialogues imbriqués (`data-nested`, `--nested-dialogs`) ;
  - en 1.8.0, un appui commencé avant l'ouverture n'est plus pris pour un clic extérieur.
- **AlertDialog** : le clic extérieur ne ferme pas.
- **Field** :
  - relie automatiquement `<label>`, `aria-describedby` (description et erreur) et `aria-invalid` ;
  - vérifié dans `useFieldValidation.mjs` : `aria-invalid: true` est posé dès que `state.valid === false`, ce qui inclut le prop `invalid` piloté de l'extérieur ;
  - `Field.Error` ajoute son `id` à `aria-describedby` quand il s'affiche.
- **Form** de Base UI : place le focus sur le premier champ invalide à la soumission et fait `select()` sur un `<input>`.
- **Toast** :
  - région `role="region"` annoncée « Notifications » ;
  - **F6** saute dans la zone des notifications ;
  - annonce polie (`priority: 'low'`) ou urgente (`'high'`) ;
  - glissement pour fermer.
- **NumberField** :
  - Input `type="text"` avec `inputMode="numeric"` (passe à `decimal` si nécessaire) ;
  - flèches pour ±1, Maj pour ±10, Alt pour ±0,1 ;
  - boutons `−` / `+` en `tabIndex=-1` : au clavier on passe par les flèches, mais les lecteurs d'écran tactiles les atteignent quand même.

**Ce qui reste à notre charge :**

- **Rendre le focus visible.** La doc le dit : « it's the developer's responsibility to visually indicate focus ». Notre `:focus-visible` global suffit.
- Contrastes. Le README fixe déjà 4,5:1 pour le texte et 3:1 pour les repères.
- **Zones tactiles de 48 px.** Aucun style n'est fourni, il faut reprendre les `::after` de `design-system.css`.
- **Libellés en anglais codés en dur** dans la 1.8.0, à surcharger (recensés par grep sur tout le paquet) :
  - `NumberField.Increment` / `Decrement` : `aria-label` vaut `'Increase'` / `'Decrease'`. Nos props passent après ceux de Base UI (`props: [props, elementProps, …]`), donc un `aria-label` explicite les remplace.
  - `NumberField.Input` : `aria-roledescription="Number field"`, à remplacer par `aria-roledescription="champ numérique"`.
  - `Toast.Viewport` : `aria-label="Notifications"`. Le mot est le même en français, mais on peut le passer explicitement.
- **`Field.Error` n'est pas une région live** : pas d'`aria-live` dans `FieldError.mjs`. L'erreur est lue quand le focus arrive sur le champ, grâce à `aria-describedby`. Pour une annonce globale, il faut un résumé en `role="status"` (section 6).
- Calendrier, tableaux, impression et bandeaux restent entièrement à notre charge.

SSR / hydratation : sans objet pour une SPA Vite. Base UI pose seulement des `suppressHydrationWarning`, sans effet ici.

---

## 2. Field, Form et Fieldset de Base UI avec TanStack Form, et autres composants

### 2.1 Validation native de Base UI (pour mémoire)

- `Field.Root` accepte :
  - `validate(value, formValues)`, synchrone ou asynchrone, qui renvoie une chaîne, un tableau de chaînes ou `null` ;
  - `validationMode`, qui vaut `'onSubmit'` par défaut (puis revalidation à chaque modification), `'onBlur'` ou `'onChange'` ;
  - `validationDebounceTime`.
- La validation par contraintes HTML (`required`, `minLength`, `pattern`, `step`) passe avant.
- `Field.Error match="valueMissing" | "typeMismatch" | … | true` :
  - sans `match`, il s'affiche dès que le champ est invalide ;
  - `match={true}` l'affiche toujours. C'est « pour les bibliothèques externes » : on doit donc le rendre conditionnellement.
  - Il porte `data-starting-style` / `data-ending-style`, ce qui permet d'animer l'apparition de l'erreur.
- `Form` :
  - prop `errors={{ champ: 'message' }}` pour les erreurs serveur, effacées dès que le champ change ;
  - `onFormSubmit(values)` ;
  - `actionsRef.validate()` ;
  - `noValidate` est forcé.

### 2.2 Combiner avec TanStack Form sans valider deux fois

Le guide officiel `handbook/forms.md` (§ TanStack Form) recommande :

> « The Base UI `<Form>` component is not needed when using TanStack Form. »

**TanStack porte l'état et la validation. Base UI ne sert qu'à l'affichage et à l'accessibilité :**

1. `useForm` (ou `useAppForm`) ;
2. un `<form noValidate onSubmit={…form.handleSubmit()}>` natif ;
3. pour chaque champ : `<form.Field>` qui rend un `Field.Root`. Les props `invalid`, `dirty`, `touched` viennent de `field.state.meta`, et le contrôle est piloté par `value`, `onValueChange` et `onBlur` ;
4. **ne jamais passer `validate`, `validationMode` ni de contraintes natives à Base UI**. Pas de `required`, `pattern` ni `minLength` : l'état de validité serait calculé deux fois. Pour annoncer qu'un champ est obligatoire, écrire `aria-required` ou le dire dans le libellé ;
5. `Field.Error` se rend **conditionnellement** avec `match` (équivaut à `true`) et en enfant le message TanStack ;
6. la logique « valider à la soumission, puis revalider à chaque modification » (la même que Base UI et que la page actuelle) s'obtient avec `validationLogic: revalidateLogic({ mode: 'submit', modeAfterSubmission: 'change' })` et des validateurs `onDynamic`.

**Piège :** avec un validateur Standard Schema (zod, valibot…), `field.state.meta.errors` contient des **objets** `StandardSchemaV1Issue` (`{ message, path }`) et non des chaînes. Voir `validation.md` (« typed as `Record<string, StandardSchemaV1Issue[]>` »). La démo Base UI fait `.join(',')` parce qu'elle utilise des fonctions qui renvoient des chaînes. Il faut donc un petit utilitaire :

```ts
// ui/form/errors.ts
export function errorText(errors: ReadonlyArray<unknown>): string {
  for (const e of errors) {
    if (typeof e === 'string' && e) return e;
    if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') return e.message;
  }
  return '';
}
```

Champ texte réutilisable, pré-lié au formulaire par `createFormHook` (voir 5.3) :

```tsx
// ui/form/TextField.tsx
import type { ComponentProps } from 'react';
import { Field } from '@base-ui/react/field';
import { useFieldContext } from './context';
import { errorText } from './errors';
import styles from './Field.module.css';

type Props = {
  label: string;
  description?: string;
  multiline?: boolean;
} & Omit<ComponentProps<'input'>, 'name' | 'value' | 'defaultValue' | 'onChange' | 'className'>;

export function TextField({ label, description, multiline, ...inputProps }: Props) {
  const field = useFieldContext<string>();
  const { isValid, isTouched, isDirty, errors } = field.state.meta;
  return (
    <Field.Root
      name={field.name}
      invalid={!isValid}
      touched={isTouched}
      dirty={isDirty}
      className={styles.root}
    >
      <Field.Label className={styles.label}>{label}</Field.Label>
      <Field.Control
        {...inputProps}
        render={multiline ? <textarea rows={3} /> : undefined}
        value={field.state.value}
        onValueChange={(v) => field.handleChange(v)}
        onBlur={field.handleBlur}
        className={styles.control}
      />
      {description && <Field.Description className={styles.help}>{description}</Field.Description>}
      {!isValid && (
        <Field.Error match className={styles.error}>
          {errorText(errors)}
        </Field.Error>
      )}
    </Field.Root>
  );
}
```

Notes sur ce composant :

- `render={<textarea />}` sur `Field.Control` est validé par les tests de types du dépôt (`FieldControl.spec.tsx`).
- `onValueChange={(v) => field.handleChange(v)}` passe par une fonction fléchée. Sinon l'objet `eventDetails` de Base UI arriverait en 2ᵉ argument de `handleChange`, qui attend des options.

Usage pour l'e-mail :

```tsx
<form.AppField name="contact">
  {(f) => (
    <f.TextField
      label="Adresse email"
      description="Pour vous envoyer la confirmation."
      type="email"
      inputMode="email"
      autoComplete="email"
      spellCheck={false}
      placeholder="Ex. Ariele.gsell@exemple.fr"
    />
  )}
</form.AppField>
```

### 2.3 Erreurs serveur

Base UI propose `<Form errors={…}>`, mais **avec TanStack on garde un seul système** et on écrit les erreurs dans TanStack.

- **Option recommandée.** Dans `onSubmit`, après un refus métier du script (stock insuffisant, jour fermé…), appeler `formApi.setErrorMap({ onServer: { form: '…', fields: { 'lignes[2].qte': 'Plus que 2 portions.' } } })`.
  - La clé `onServer` existe dans `ValidationErrorMap` (`form-core/src/types.ts`).
  - `FormApi.ts` l'efface tout seul dès qu'une validation réussit : « when we have an error for onServer in the state, we want to clear the error as soon as the user enters a valid value in the field ».
  - Au niveau d'un seul champ : `field.setErrorMap({ onServer: 'message' })`.
- **Variante documentée** : un validateur `validators.onSubmitAsync` qui renvoie `{ form, fields }` (`validation.md` § « Setting field-level errors from the form's validators »). Elle convient pour une **vérification** côté serveur, mais **pas pour l'écriture** de la réservation, qui ne doit pas vivre dans un validateur.

### 2.4 NumberField : stepper de portions

Props utiles de `NumberField.Root` : `value: number | null`, `onValueChange(value, details)` avec `details.reason` (`'input-change' | 'input-clear' | 'input-blur' | …`), `onValueCommitted`, `min`, `max`, `step`, `smallStep`, `largeStep`, `snapOnStep`, `allowOutOfRange`, `format: Intl.NumberFormatOptions`, **`locale`** (par défaut celle du navigateur), `allowWheelScrub`. Data attributes : `data-invalid`, `data-disabled`, `data-scrubbing`…

```tsx
// ui/form/PortionStepper.tsx (champ pré-lié, valeur : number)
import { Field } from '@base-ui/react/field';
import { NumberField } from '@base-ui/react/number-field';
import { MinusIcon, PlusIcon } from '../icons';
import { useFieldContext } from './context';
import { errorText } from './errors';
import styles from './PortionStepper.module.css';

export function PortionStepper({ dishName, remaining }: { dishName: string; remaining: number }) {
  const field = useFieldContext<number>();
  const { isValid, errors } = field.state.meta;
  return (
    <Field.Root name={field.name} invalid={!isValid} className={styles.root}>
      <NumberField.Root
        value={field.state.value}
        onValueChange={(v) => field.handleChange(v ?? 0)} // null quand le champ est vidé
        min={0}
        max={remaining}
        step={1}
        locale="fr-FR"
        className={styles.number}
      >
        <Field.Label className={styles.label}>
          {dishName} <span className={styles.avail}>{remaining} disponibles</span>
        </Field.Label>
        <NumberField.Group className={styles.group}>
          <NumberField.Decrement className={styles.step} aria-label={`Retirer une portion : ${dishName}`}>
            <MinusIcon />
          </NumberField.Decrement>
          <NumberField.Input
            className={styles.input}
            aria-roledescription="champ numérique"
            onBlur={field.handleBlur}
          />
          <NumberField.Increment className={styles.step} aria-label={`Ajouter une portion : ${dishName}`}>
            <PlusIcon />
          </NumberField.Increment>
        </NumberField.Group>
      </NumberField.Root>
      {!isValid && <Field.Error match className={styles.error}>{errorText(errors)}</Field.Error>}
    </Field.Root>
  );
}
```

Remarques :

- La valeur est **bornée** par `min` et `max` lors de la saisie validée au blur, ainsi qu'avec les boutons et les flèches. Le stock restant (`remaining`) vient donc directement des données. Le serveur revérifie de toute façon.
- Prix des collègues : `format={{ style: 'currency', currency: 'EUR' }}`, `locale="fr-FR"`, `step={0.01}` donnent « 12,50 € ». Le `<datalist>` des prix déjà utilisés n'est **pas** compatible avec NumberField, car l'Input est géré par Base UI. Garder un `Field.Control type="text" inputMode="decimal" list="price-suggestions"`, ou passer à un `Combobox`.

### 2.5 RadioGroup en boutons segmentés « Sur place / À emporter »

**RadioGroup ou ToggleGroup ?**

- Dans un formulaire avec un choix unique obligatoire, il faut **RadioGroup** : sémantique `radiogroup`/`radio`, valeur de formulaire, intégration à `Field`, flèches pour changer d'option.
- **ToggleGroup** (des `aria-pressed`, `multiple={false}`) convient aux **vues** : « Semaine / Mois », « Client / Collègue ».
  - Attention : avec ToggleGroup, un second clic peut **désélectionner** l'élément. Il faut ignorer un tableau vide dans `onValueChange`.

```tsx
// ui/form/SegmentedRadio.tsx
import { Field } from '@base-ui/react/field';
import { Fieldset } from '@base-ui/react/fieldset';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { CheckIcon } from '../icons';
import { useFieldContext } from './context';
import styles from './Segmented.module.css';

type Option<T extends string> = { value: T; label: string };

export function SegmentedRadio<T extends string>({ legend, options }: { legend: string; options: Option<T>[] }) {
  const field = useFieldContext<T>();
  return (
    <Field.Root name={field.name} invalid={!field.state.meta.isValid}>
      <Fieldset.Root
        render={
          <RadioGroup
            value={field.state.value}
            onValueChange={(v) => field.handleChange(v as T)}
            className={styles.group}
          />
        }
      >
        <Fieldset.Legend className={styles.legend}>{legend}</Fieldset.Legend>
        {options.map((o) => (
          <Radio.Root key={o.value} value={o.value} className={styles.segment}>
            <Radio.Indicator keepMounted className={styles.check}>
              <CheckIcon />
            </Radio.Indicator>
            {o.label}
          </Radio.Root>
        ))}
      </Fieldset.Root>
    </Field.Root>
  );
}
```

Le jour au ticket restaurant, on ne passe qu'une option. Le CSS `:only-child` existant s'applique toujours.

Quelques règles du CSS Module correspondant, reprises de `.seg-btn` :

```css
/* Segmented.module.css */
.group { display: flex; border: 1px solid var(--outline); border-radius: var(--radius-full); background: var(--surface); }
.segment {
  position: relative; isolation: isolate; flex: 1 1 0;
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 40px; padding: 0 var(--space-4); cursor: pointer;
  font-size: var(--fs-sm); color: var(--text);
}
.segment::after { content: ""; position: absolute; inset: -4px 0; } /* cible tactile de 48 px */
.segment + .segment { border-left: 1px solid var(--outline); }
.segment:first-of-type { border-radius: var(--radius-full) 0 0 var(--radius-full); }
.segment:last-of-type { border-radius: 0 var(--radius-full) var(--radius-full) 0; }
.segment:only-of-type { border-radius: var(--radius-full); }
.segment[data-checked] { background: var(--accent-container); color: var(--accent-ink); font-weight: var(--fw-semibold); }
.check { display: inline-flex; overflow: hidden; width: 0; opacity: 0; transform: scale(.4);
  transition: width var(--dur) var(--ease-exit), opacity var(--dur-fast) linear, transform var(--dur) var(--ease-exit); }
.segment[data-checked] .check { width: 18px; margin-right: var(--space-2); opacity: 1; transform: none;
  transition-duration: var(--dur-slow); transition-timing-function: var(--ease-enter); }
```

### 2.6 Case à cocher « Ticket restaurant »

```tsx
<form.AppField
  name="ticket"
  listeners={{ onChange: ({ value }) => { if (value) form.setFieldValue('prix', null); } }}
>
  {(f) => <f.CheckboxField label="Ticket restaurant" />}
</form.AppField>

// ui/form/CheckboxField.tsx
export function CheckboxField({ label }: { label: string }) {
  const field = useFieldContext<boolean>();
  return (
    <Field.Root name={field.name}>
      <Field.Label className={styles.check}>
        <Checkbox.Root
          checked={field.state.value}
          onCheckedChange={(c) => field.handleChange(c)}
          onBlur={field.handleBlur}
          className={styles.box}
        >
          <Checkbox.Indicator className={styles.tick}><CheckIcon /></Checkbox.Indicator>
        </Checkbox.Root>
        {label}
      </Field.Label>
    </Field.Root>
  );
}
```

Le champ Prix se désactive par `form.Subscribe selector={(s) => s.values.ticket}` (voir 5.6). On remplace ainsi `syncTicketPrice` et la manipulation du DOM.

### 2.7 Toast et gestionnaire global

```tsx
// ui/toast/toast.ts : utilisable hors composants (mutations, minuteur d'inactivité…)
import { Toast } from '@base-ui/react/toast';
export const toastManager = Toast.createToastManager();
export const notify = {
  success: (title: string) => toastManager.add({ title, type: 'success', timeout: 3500 }),
  error: (title: string) => toastManager.add({ title, type: 'error', priority: 'high', timeout: 6000 }),
};

// ui/toast/Toaster.tsx (monté une fois, à la racine)
import { Toast } from '@base-ui/react/toast';
import { toastManager } from './toast';
import styles from './Toast.module.css';

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((t) => (
    <Toast.Root key={t.id} toast={t} className={styles.toast}>
      <Toast.Content className={styles.content}>
        <Toast.Title className={styles.title} />
        <Toast.Description />
      </Toast.Content>
      <Toast.Close className={styles.close} aria-label="Fermer la notification">×</Toast.Close>
    </Toast.Root>
  ));
}

export function Toaster({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager} limit={3} timeout={3500}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className={styles.viewport} aria-label="Notifications">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
```

Points à retenir :

- `createToastManager()` expose `add`, `close`, `update` et `promise`, mais **pas** la liste réactive.
- Le CSS se branche sur `[data-type="error"]` pour reprendre `.toast.error`.
- Les animations utilisent `[data-starting-style]` / `[data-ending-style]`.
- Toutes les notifications sont empilées dans le viewport, avec les variables `--toast-index` et `--toast-offset-y`.

### 2.8 Dialog et AlertDialog

- **AlertDialog** pour « Supprimer ce jour et toutes ses réservations », une action irréversible et lourde. Le clic extérieur ne ferme pas, le focus initial va sur « Annuler » via `initialFocus`, et `finalFocus` revient sur le déclencheur.
- **Dialog** pour les formulaires des collègues si l'on veut les sortir du flux, par exemple « Modifier la réservation ». Le formulaire de réservation du public est **déplié dans la fiche** ; on peut garder ce comportement avec `Collapsible`, plus proche de la charte et sans perte de contexte. `Drawer` est une option pour mobile.

```tsx
<AlertDialog.Root>
  <AlertDialog.Trigger render={<Button variant="danger" size="small" />}>Supprimer ce jour</AlertDialog.Trigger>
  <AlertDialog.Portal className="accent-green">{/* les portails n'héritent pas de l'accent : voir 4.4 */}
    <AlertDialog.Backdrop className={styles.backdrop} />
    <AlertDialog.Popup className={styles.popup} initialFocus={cancelRef}>
      <AlertDialog.Title>Supprimer le jour du {formatDateLong(date)} ?</AlertDialog.Title>
      <AlertDialog.Description>Ses {count} réservations seront aussi supprimées.</AlertDialog.Description>
      <div className={styles.actions}>
        <AlertDialog.Close ref={cancelRef} render={<Button />}>Annuler</AlertDialog.Close>
        <Button variant="danger" onClick={() => deleteDay.mutate(date)}>Supprimer</Button>
      </div>
    </AlertDialog.Popup>
  </AlertDialog.Portal>
</AlertDialog.Root>
```

### 2.9 Collapsible pour les fiches et les panneaux dépliables

- `Collapsible.Panel` expose `--collapsible-panel-height`, `data-open`, `data-starting-style` et `data-ending-style`.
- Props `keepMounted`, et **`hiddenUntilFound`** qui pose `hidden="until-found"` : la recherche Ctrl+F du navigateur trouve le contenu et déplie le panneau.
- Il remplace les volets « Ouvrir un jour », « Paramètres », le formulaire de réservation et la liste des plats repliée (`menuListHtml`), soit les classes `.form-reveal`, `.collapsing` et `.expanding`.
- Le `<details>` natif avec `::details-content` (déjà dans la page) reste une alternative valable, sans JavaScript.

```css
.panel { height: var(--collapsible-panel-height); overflow: hidden;
  transition: height var(--dur-slow) var(--ease-enter); }
.panel[data-starting-style], .panel[data-ending-style] { height: 0; }
.panel[data-ending-style] { transition-timing-function: var(--ease-exit); transition-duration: var(--dur); }
```

---

## 3. Calendrier accessible

### 3.1 Options étudiées

| Option | Bilan |
| --- | --- |
| **(a) Composant maison** : `role="grid"`, roving tabindex, logique `keyTargetIso` reprise de `calendrier.js` | **Retenue.** Environ 120 lignes TSX et 60 de CSS. Navigation clavier **identique** à l'existant, aucune dépendance. |
| (a′) `@base-ui/react/internals/composite` (`CompositeRoot` + `gridNavigation`) | Exporté mais **interne, non documenté**, sans garantie semver. Il ne gère pas « Page ↑/↓ change de mois » ni « Début/Fin limités à la semaine ». **À éviter.** |
| (b) `react-aria-components` `Calendar` 1.21.1 | Bon composant (grille, i18n, `@internationalized/date`), mais **+35,5 kB gz** mesurés par-dessus Base UI. Il ajoute une seconde philosophie (`data-*` différents, `className` en fonction de `renderProps`). Surtout, **Début/Fin vont au début et à la fin du mois en vue mois** (`focusSectionStart` dans `react-stately/.../useCalendarState.mjs`), alors que notre page et l'APG vont au lundi et au dimanche. Page ↑/↓ change bien de mois, Maj+Page ↑/↓ d'année. |
| (c) Temporal / `@internationalized/date` | Temporal est en Stage 4 (ES2026), livré dans Chrome 144+, Firefox 139+ et Node 26, mais **Safari ne l'a qu'en Technology Preview** (MDN BCD `main` : `safari: "preview"`, `safari_ios: false`). Il faudrait `temporal-polyfill` 1.0.5 : **19,7 kB gz** mesurés, pour un usage limité à quelques additions de jours. `@internationalized/date` n'a d'intérêt qu'avec React Aria. |
| (d) `date-fns` v4 / `dayjs` / `Intl` natif | Les « dates en toutes lettres » sont déjà faites par `Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })` (`outils.js`). Pour l'arithmétique (ajouter des jours, trouver le lundi, changer de mois), les fonctions de `outils.js` suffisent. `date-fns` (fonctions tree-shakables) est un filet de sécurité possible, pas un besoin. |

### 3.2 Recommandation

1. **Format canonique : chaînes ISO `YYYY-MM-DD`** (`type IsoDate = string & { __iso: true }` ou un simple alias). On les échange avec Apps Script, on les compare par ordre alphabétique et on les met dans l'URL.
2. **Module `lib/dates.ts`**, port typé de `toISO`, `addDaysISO`, `mondayOf`, `buildMonthCells`, `buildWeekCells` et `keyTargetIso`, avec des formateurs `Intl` mis en cache comme aujourd'hui. Tests unitaires sur les changements d'heure et le passage d'année. Prévoir un passage à `Temporal.PlainDate` quand Safari stable le livrera (l'API correspond exactement au besoin).
3. **Composant `ui/calendar/MonthGrid.tsx` maison** suivant le motif APG « Date Picker Dialog » / grid :
   - un `role="grid"` étiqueté par le libellé du mois, des `role="row"`, des `columnheader` avec `<abbr title="lundi">L</abbr>` ;
   - des `gridcell` en `aria-selected`, contenant un `<button>` avec **un seul `tabIndex=0`** (roving) ;
   - `aria-current="date"` pour aujourd'hui, `aria-label` complet (« lundi 5 octobre 2026, places disponibles ») ;
   - le rôle `grid` met les lecteurs d'écran en mode formulaire et laisse passer les flèches. Avec l'actuel `role="group"`, NVDA et JAWS interceptent les flèches en mode navigation.
4. **État dans l'URL** (TanStack Router, `validateSearch` avec un Standard Schema) : `?jour=2026-10-05&vue=mois`.
   - Le **mois affiché** (l'« ancre ») est un état d'interface local, mis à jour dans les gestionnaires d'événements, sans `useEffect`.
   - Les flèches font `navigate({ search: …, replace: true })` pour ne pas remplir l'historique. Un clic peut utiliser `push`.
5. Animations : React 19.3 exporte `ViewTransition` et `addTransitionType`, qui peuvent remplacer `calTransition` (axes X et Z de Material 3), avec `prefers-reduced-motion` respecté côté CSS.

```tsx
// ui/calendar/MonthGrid.tsx (squelette)
import { useId, useLayoutEffect, useRef } from 'react';
import { buildMonthCells, keyTargetIso, formatDateLong, WEEKDAYS, type IsoDate } from '../../lib/dates';
import styles from './MonthGrid.module.css';

type Status = 'cap-ok' | 'cap-low' | 'cap-full' | null;
type Props = {
  anchor: IsoDate;                // un jour du mois affiché
  selected: IsoDate;
  today: IsoDate;
  label: string;                  // « Octobre 2026 »
  statusOf: (iso: IsoDate) => Status;
  onSelect: (iso: IsoDate, via: 'keyboard' | 'pointer') => void;
};
const STATUS_WORD = { 'cap-ok': 'places disponibles', 'cap-low': 'bientôt complet', 'cap-full': 'complet' } as const;

export function MonthGrid({ anchor, selected, today, label, statusOf, onSelect }: Props) {
  const labelId = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);
  const cells = buildMonthCells(anchor);                     // 42 cases, du lundi au dimanche
  const tabbable = cells.some((c) => c.iso === selected) ? selected : cells[0].iso;

  // Après une navigation au clavier, le focus suit le jour choisi, même s'il change de mois.
  useLayoutEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-iso="${selected}"]`)?.focus({ preventScroll: true });
  }, [selected]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const iso = (e.target as HTMLElement).closest<HTMLElement>('[data-iso]')?.dataset.iso as IsoDate | undefined;
    const target = iso && keyTargetIso(e.key, iso); // ← → ±1, ↑ ↓ ±7, Début/Fin : lundi/dimanche, Page ↑/↓ : ±1 mois
    if (!target) return;
    e.preventDefault();
    refocus.current = true;
    onSelect(target, 'keyboard');
  }

  return (
    <div>
      <h3 id={labelId} className={styles.label} aria-live="polite">{label}</h3>
      <div role="grid" aria-labelledby={labelId} ref={gridRef} onKeyDown={onKeyDown} className={styles.grid}>
        <div role="row" className={styles.row}>
          {WEEKDAYS.map((d) => (
            <div role="columnheader" key={d.long} className={styles.wd}><abbr title={d.long}>{d.initial}</abbr></div>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, w) => (
          <div role="row" key={w} className={styles.row}>
            {cells.slice(w * 7, w * 7 + 7).map((c) => {
              const status = statusOf(c.iso);
              const past = c.iso < today;
              return (
                <div role="gridcell" key={c.iso} aria-selected={c.iso === selected}>
                  <button
                    type="button"
                    data-iso={c.iso}
                    tabIndex={c.iso === tabbable ? 0 : -1}
                    aria-current={c.iso === today ? 'date' : undefined}
                    aria-label={`${formatDateLong(c.iso)}, ${status ? STATUS_WORD[status] : 'aucun service'}${past ? ', passé' : ''}`}
                    data-outside={c.inMonth ? undefined : ''}
                    data-past={past ? '' : undefined}
                    data-selected={c.iso === selected ? '' : undefined}
                    className={styles.cell}
                    onClick={() => onSelect(c.iso, 'pointer')}
                  >
                    <span aria-hidden="true">{c.dayNum}</span>
                    {status && <span className={styles.dot} data-status={status} aria-hidden="true" />}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- Chaque `role="row"` est une grille CSS de 7 colonnes. **Ne pas** mettre `display: contents` sur les lignes : le rôle disparaissait dans d'anciens navigateurs.
- Le sélecteur de date du formulaire « Ouvrir un jour » réutilise `MonthGrid` dans un **`Popover`** Base UI : focus, Échap, clic extérieur et retour du focus au déclencheur sont alors gérés. `initialFocus` vise la case sélectionnée.
- La vue « Semaine » est le même composant, avec une seule ligne (`buildWeekCells`).

---

## 4. Stratégie de style

### 4.1 Recommandation : CSS Modules et `design-system.css` global

| Option | Verdict |
| --- | --- |
| **CSS Modules** (natifs dans Vite : `*.module.css`) **plus `design-system.css` gardé en global** pour les jetons, thèmes d'accent, base, animations et `prefers-reduced-motion` | **Retenue.** Aucun runtime. Les classes sont locales par composant, les jetons `var(--…)` restent la seule source de couleurs. oxfmt formate le CSS (testé avec oxfmt 0.71.0 sur un `.module.css`). La doc Base UI fournit **des démos CSS Modules pour chaque composant**, donc le copier-adapter est direct. |
| CSS global avec les classes BEM existantes | Pratique pour la transition (on réutilise `.btn`, `.seg-btn`…), mais ces classes visent des états ARIA posés à la main (`[aria-pressed]`, `.armed`, `.has-error`). Il faudrait les réécrire pour les `data-*` de Base UI. Acceptable **à titre temporaire** : on peut passer `className="btn primary"` à un `Button` Base UI pendant la migration. |
| Tailwind v4 (4.3.3) | Non demandé. Il faudrait traduire tous les jetons dans `@theme`, et les règles d'usage de la charte (« toujours `var(--…)` ») se diluent dans les utilitaires. Les variantes `data-*` sont bien gérées (`data-open:`), mais c'est un changement de culture pour un petit projet. **Non recommandé.** |
| vanilla-extract 1.21.2 / Panda 2.1.1 (CSS-in-JS à la compilation) | Typage fort, mais un plugin de build en plus, une syntaxe TS pour le CSS, et des jetons à dupliquer (ou un `createGlobalTheme` à maintenir). Coût trop élevé pour le gain. **Non recommandé.** |

**Typage des classes :**

- Par défaut, Vite type `import styles from './X.module.css'` en `Readonly<Record<string, string>>` via `vite/client`. Cela suffit pour démarrer.
- Pour un typage exact (faute de frappe = erreur TS) : `vite-css-modules` 1.16.0 avec `patchCssModules({ generateSourceTypes: true })`. Il génère `X.module.css.d.ts` à côté de chaque fichier. Les ajouter au `.gitignore` ou les committer, au choix de l'équipe.
- Les alternatives (`typed-css-modules` 0.9.1 en CLI, `typescript-plugin-css-modules` 5.2.0 limité à l'éditeur) sont moins intégrées.
- oxlint (1.86.0) ne lint pas le CSS. Si besoin, ajouter Stylelint avec une règle « couleur littérale interdite » (`color-no-hex` / `declaration-property-value-disallowed-list`) pour faire respecter « jamais de couleur en dur ».

### 4.2 Organisation des fichiers CSS

- `styles/tokens.css` : section 1 de `design-system.css`, plus les thèmes d'accent de la section 2.
- `styles/base.css` : sections 3, 5 et 6 (reset, `:focus-visible`, keyframes partagées, `prefers-reduced-motion`, cibles tactiles).
- `ui/**/X.module.css` : un fichier par composant. Seuls les jetons y sont autorisés.
- `styles/print.css` : voir la section 8.

### 4.3 Variantes par `data-*`

```tsx
// ui/button/Button.tsx
import { Button as BaseButton } from '@base-ui/react/button';
import styles from './Button.module.css';

type Props = Omit<BaseButton.Props, 'className'> & {
  variant?: 'neutral' | 'primary' | 'ghost' | 'danger';
  size?: 'default' | 'small';
  className?: string;
};
export function Button({ variant = 'neutral', size = 'default', className, ...props }: Props) {
  return (
    <BaseButton
      type="button"
      data-variant={variant}
      data-size={size}
      className={className ? `${styles.button} ${className}` : styles.button}
      {...props}
    />
  );
}
```

```css
/* Button.module.css (extrait) */
.button {
  position: relative; display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
  min-height: 40px; padding: 0 var(--space-4);
  font: var(--fw-medium) var(--fs-sm) / var(--lh-title) var(--font-body);
  background: var(--surface); color: var(--text);
  border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer;
  transition: background-color var(--dur) var(--ease), border-color var(--dur) var(--ease), transform var(--dur-fast) var(--ease);
}
.button:active { transform: translateY(1px) scale(.985); }
.button[data-disabled] { opacity: .38; cursor: not-allowed; transform: none; }
.button[data-variant="primary"] { background: var(--accent); border-color: var(--accent); color: var(--text-on-accent); font-weight: var(--fw-semibold); }
.button[data-variant="ghost"] { background: transparent; border-color: transparent; color: var(--text-muted); }
.button[data-variant="danger"] { background: transparent; border-color: var(--danger-border); color: var(--danger); }
.button[data-variant="danger"][data-armed] { background: var(--danger); border-color: var(--danger); color: var(--text-on-accent); }
.button[data-size="small"] { min-height: 32px; padding: 0 var(--space-3); font-size: var(--fs-xs); }
@media (hover: hover) {
  .button:hover:not([data-disabled]) { background: var(--surface-alt); border-color: var(--border-hover); }
  .button[data-variant="primary"]:hover:not([data-disabled]) { background: var(--accent-ink); border-color: var(--accent-ink); }
}
@media (pointer: coarse) {
  .button { min-height: 44px; }
  .button[data-size="small"]::after { content: ""; position: absolute; inset: -6px 0; }
}
```

### 4.4 Accents vert et magenta par restaurant

- On garde la **cascade de variables** : `.accent-green` et `.accent-magenta` redéfinissent `--accent`, `--accent-ink`, `--accent-soft`, `--accent-container`, `--tint`… sur le conteneur de la colonne. Les composants n'utilisent que `var(--accent)`.
- On peut ajouter un alias par attribut (`[data-accent="r1"], .accent-green { … }`) pour écrire `data-accent={restaurant}` en TSX.
- **Piège des portails** : Dialog, Popover, Toast et Menu sont rendus dans `<body>` et **n'héritent pas** de l'accent de la colonne. Il faut poser la classe sur le portail : `<Dialog.Portal className="accent-magenta">` (le Portal accepte `className`), ou sur le `Popup` / `Positioner`.

### 4.5 Animations et `prefers-reduced-motion`

```css
.popup {
  transition: opacity var(--dur) var(--ease-enter), transform var(--dur-slow) var(--ease-enter);
  transform-origin: var(--transform-origin);
}
.popup[data-starting-style] { opacity: 0; transform: translateY(6px); }  /* équivalent de la keyframe « rise » */
.popup[data-ending-style] {
  opacity: 0; transform: translateY(-4px);                              /* équivalent de « sink » */
  transition-duration: var(--dur-fast); transition-timing-function: var(--ease-exit);
}
```

- La règle globale actuelle `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }` reste valable. Base UI ne trouve alors aucune animation en cours et démonte aussitôt.
- Préférer les **transitions** aux `@keyframes` pour ouvrir et fermer, comme le recommande la doc, car elles s'interrompent proprement.
- Cela remplace `enterOnce` / `leaveThen` / `tokenMs` : Base UI garde l'élément monté pendant `data-ending-style`.

---

## 5. TanStack Form 1.33.5

### 5.1 État des versions

- **1.33.5 stable** (11 août 2026).
- Une **v2 est en alpha** (`2.0.0-alpha.2`, branche `alpha`). Nouveautés : options par défaut dans `createFormHook`, et `formOptions.looseSchema(schema, …)` / `strictSchema` qui prennent maintenant le schéma en 1er argument (changement cassant). **Rester sur 1.x.**
- Ajouts récents de la 1.x :
  - **`useSelector`** remplace `useStore`, déprécié en 1.33.1 : mêmes arguments, `{ compare }` en 3ᵉ argument ;
  - **FormGroup API** (`<form.FormGroup name="step1" onGroupSubmit …>`, 1.33.0) ;
  - `extend` sur `AppForm` (1.29.0) ;
  - `useTypedAppFormContext` (1.28.0) ;
  - aplatissement des erreurs rendu cohérent (1.28.0, option `disableErrorFlat`) ;
  - « Prioritized Default System » : les valeurs par défaut au niveau du champ passent avant celles du formulaire pour `reset` et `isDefaultValue`.

### 5.2 API de base (vérifiée dans les docs et `FormApi.ts`)

```tsx
const form = useForm({
  defaultValues,                       // détermine les types, inutile d'écrire les génériques
  validationLogic: revalidateLogic({ mode: 'submit', modeAfterSubmission: 'change' }),
  validators: {
    onDynamic: schemaOuFonction,       // Standard Schema (zod 4, valibot 1, arktype…) ou fonction
    // aussi possibles : onChange, onBlur, onSubmit, onChangeAsync, onSubmitAsync, onChangeAsyncDebounceMs…
  },
  onSubmitMeta: { intent: 'reserver' as 'reserver' | 'reserverEtNouvelle' },
  onSubmit: async ({ value, formApi, meta }) => { /* … */ },
  onSubmitInvalid: ({ formApi }) => { /* focus sur la première erreur, voir 6 */ },
  listeners: { onChange: ({ fieldApi }) => {}, onChangeDebounceMs: 300 },
});
```

**Exemples par besoin :**

- **Champ** : `<form.Field name="nom">{(field) => …}</form.Field>`. Utiliser `field.state.value`, `field.handleChange(v)`, `field.handleBlur` et `field.state.meta` (`isValid`, `isTouched`, `isDirty`, `errors`, `errorMap`).
- **Lecture réactive** :
  - `<form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>…</form.Subscribe>` ne re-rend que ce bloc ;
  - `useSelector(form.store, (s) => s.values.mode)` re-rend tout le composant ;
  - ne jamais omettre le sélecteur.
- **Erreurs** :
  - par champ : validateurs de champ, ou validateur de formulaire qui renvoie `{ form?: …, fields: { 'chemin.imbriqué': '…' } }` ;
  - erreurs de formulaire : `s.errorMap.onSubmit`, `s.errors` ;
  - une erreur de champ prend le pas sur l'erreur de formulaire pour le même champ (`validation.md`).
- **Asynchrone** : `onChangeAsync` avec `asyncDebounceMs={500}` ou `onChangeAsyncDebounceMs`. Inutile ici : le script ne propose pas de validation en direct.
- **Champs liés** : `validators={{ onChangeListenTo: ['nbProf', 'nbExt'], onChange: ({ value, fieldApi }) => … }}`. Utile pour « au moins une personne » et pour « total ≤ places restantes » au restaurant 1.
- **Effets** : `listeners={{ onChange: ({ value }) => form.setFieldValue('prix', null) }}`. Utile pour le ticket restaurant, ou pour forcer « sur place » un jour au ticket.
- **Réinitialisation** : `form.reset()`, `form.reset(values, { keepDefaultValues })`, `form.resetField(name)`.
- **Tableaux** : `<form.Field name="plats" mode="array">` avec `field.pushValue({...})`, `field.removeValue(i)`, `insertValue`, `swapValues`, et des sous-champs `name={`plats[${i}].stock`}`.
- **Méta de soumission** : `onSubmitMeta` donne le type par défaut, `form.handleSubmit({ intent: '…' })` le surcharge.

### 5.3 Composants réutilisables pré-liés

```ts
// ui/form/context.ts
import { createFormHookContexts } from '@tanstack/react-form';
export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

// ui/form/index.ts
import { createFormHook } from '@tanstack/react-form';
import { fieldContext, formContext } from './context';
import { TextField } from './TextField';
import { PortionStepper } from './PortionStepper';
import { SegmentedRadio } from './SegmentedRadio';
import { CheckboxField } from './CheckboxField';
import { SubmitButton } from './SubmitButton';
export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, PortionStepper, SegmentedRadio, CheckboxField },
  formComponents: { SubmitButton },
});
```

```tsx
// ui/form/SubmitButton.tsx (désactivation accessible : aria-disabled, sans disabled natif)
export function SubmitButton({ children }: { children: React.ReactNode }) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(s) => s.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" variant="primary" aria-disabled={isSubmitting || undefined}
          onClick={(e) => { if (isSubmitting) e.preventDefault(); }}>
          {isSubmitting ? 'Envoi en cours…' : children}
        </Button>
      )}
    </form.Subscribe>
  );
}
```

- `withForm({ defaultValues, props, render: function Render({ form, … }) {…} })` découpe un gros formulaire, par exemple R2 en « plats » puis « identité ». Écrire `render` comme fonction nommée, sinon le linter signale les hooks.
- `withFieldGroup` réutilise le bloc « Nom / Classe / Contact / Observation », commun aux formulaires public et collègue.
- Les valeurs passées par contexte sont des instances stables : pas de re-rendus en cascade (`form-composition.md`).

### 5.4 Formulaire du restaurant 2 : plats × portions et total dérivé

```tsx
type LigneR2 = { itemId: string; qte: number };
type ValeursR2 = { mode: 'emporter' | 'surplace'; lignes: LigneR2[]; nom: string; contact: string; classe: string; observation: string };

function BookingFormR2({ date, items, ticketDay, onDone }: Props) {
  const [requestId] = useState(() => crypto.randomUUID());  // un par ouverture, gardé si l'on réessaie
  const reserver = useMutation({ mutationFn: api.addBookingR2Multi });
  const form = useAppForm({
    defaultValues: {
      mode: ticketDay ? 'surplace' : 'emporter',
      lignes: items.map((it) => ({ itemId: it.ID, qte: 0 })),  // liste fixe : pas de pushValue
      nom: '', contact: '', classe: '', observation: '',
    } satisfies ValeursR2,
    validationLogic: revalidateLogic({ mode: 'submit', modeAfterSubmission: 'change' }),
    validators: { onDynamic: ({ value }) => validerR2(value, items) }, // renvoie { fields: {...} } ou undefined
    onSubmitInvalid: ({ formApi }) => focusFirstInvalid(formRef.current),
    onSubmit: async ({ value, formApi }) => {
      try {
        const res = await reserver.mutateAsync({ date, ...value, items: value.lignes.filter((l) => l.qte > 0), requestId });
        onDone(res);                                              // récapitulatif et toast ; le formulaire se démonte
      } catch (err) {
        if (err instanceof ApiFieldError) formApi.setErrorMap({ onServer: { form: err.message, fields: err.fields } });
        else notify.error(err instanceof Error ? err.message : 'Erreur');
        // ne pas relancer l'erreur : handleSubmit la relance et elle deviendrait une promesse rejetée non gérée
      }
    },
  });
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} noValidate onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }}>
      <form.AppField name="mode">
        {(f) => <f.SegmentedRadio legend="Mode de service"
          options={ticketDay ? [{ value: 'surplace', label: 'Sur place' }]
                             : [{ value: 'emporter', label: 'À emporter' }, { value: 'surplace', label: 'Sur place' }]} />}
      </form.AppField>

      <fieldset className={styles.group}>
        <legend>Choisissez vos plats et quantités</legend>
        {items.map((it, i) => (
          <form.AppField key={it.ID} name={`lignes[${i}].qte`}>
            {(f) => <f.PortionStepper dishName={it.Nom} remaining={remainingItem(it)} />}
          </form.AppField>
        ))}
      </fieldset>

      {/* Valeur dérivée : ni useState ni useEffect */}
      <form.Subscribe selector={(s) => s.values.lignes}>
        {(lignes) => <p className={styles.total} aria-live="polite">{totalText(orderAmounts(lignes, items))}</p>}
      </form.Subscribe>

      {/* identité : withFieldGroup partagé */}
      <form.AppForm><form.SubmitButton>Confirmer la réservation</form.SubmitButton></form.AppForm>
    </form>
  );
}
```

Points de ce formulaire :

- **Total dérivé** : `form.Subscribe` avec un sélecteur, calculé pendant le rendu par une fonction pure (`orderAmounts`). On abandonne `updateR2PriceLive`.
- **Changement de jour** : monter le formulaire avec une **clé** `<BookingFormR2 key={`r2:${date}`} … />`. Changer `defaultValues` après le montage **ne réinitialise pas** le formulaire.
- **`requestId`** :
  - `useState(() => crypto.randomUUID())` dans le composant qui porte la clé. L'identifiant est créé une fois à l'ouverture, **gardé** si l'on réessaie après une erreur (le composant reste monté) et **renouvelé** à la prochaine ouverture (nouveau montage). Le comportement anti-doublon actuel est conservé ;
  - `useId` ne convient pas : il est déterministe et non unique entre sessions ;
  - `defaultValues` est possible mais mélange une donnée technique aux valeurs saisies, et `form.reset()` la remettrait à la même valeur ;
  - `useRef` fonctionne aussi, mais `useState` paresseux est plus idiomatique pour une valeur créée une seule fois.
- **Mutation** : `onSubmit` appelle `mutateAsync`. `form.state.isSubmitting` couvre l'état « envoi en cours ». Pas besoin de `mutation.isPending` dans l'interface.

### 5.5 `defaultValues` depuis l'URL : jusqu'où ?

- **Raisonnable** : le jour (`jour`), la vue (`vue`) et l'ouverture du formulaire (`?reserver=1`) dans les search params du routeur. On garde les liens profonds et le bouton Retour.
- **À éviter** : nom, e-mail, téléphone et observation **dans l'URL**. Ils fuiraient dans l'historique, les journaux et l'en-tête `Referer`, ce qui contredit la règle du README « aucune donnée personnelle côté public ».
- Les quantités et le mode pourraient y aller, mais le gain est faible pour un formulaire de 30 secondes.
- **Conclusion** : l'URL décide de **quel** formulaire est ouvert, l'état saisi vit dans TanStack Form. Pour garder un brouillon après un rechargement, utiliser `sessionStorage` sans données personnelles, ou s'en passer.

### 5.6 Formulaire collègue « Ouvrir un jour » au restaurant 2 (tableau dynamique)

```tsx
<form.Field name="plats" mode="array">
  {(arr) => (
    <fieldset>
      <legend>Plats disponibles ce jour-là</legend>
      {arr.state.value.map((_, i) => (
        <div key={i} className={styles.draftRow}>
          <form.AppField name={`plats[${i}].nom`}>{(f) => <f.TextField label="Plat" />}</form.AppField>
          <form.AppField name={`plats[${i}].stock`}>{(f) => <f.StockField label="Stock" />}</form.AppField>
          <form.Subscribe selector={(s) => s.values.plats[i]?.ticket}>
            {(ticket) => (
              <form.AppField name={`plats[${i}].prix`}>
                {(f) => <f.PriceField label="Prix (optionnel)" disabled={!!ticket} placeholder={ticket ? 'Ticket' : 'Ex. 3,50'} />}
              </form.AppField>
            )}
          </form.Subscribe>
          <form.AppField name={`plats[${i}].ticket`}
            listeners={{ onChange: ({ value }) => { if (value) form.setFieldValue(`plats[${i}].prix`, null); } }}>
            {(f) => <f.CheckboxField label="Ticket restaurant" />}
          </form.AppField>
          <Button variant="ghost" size="small" onClick={() => arr.removeValue(i)} aria-label={`Retirer le plat ${i + 1}`}>Retirer</Button>
        </div>
      ))}
      <Button variant="ghost" size="small" onClick={() => arr.pushValue({ nom: '', stock: null, prix: null, ticket: false })}>
        + Ajouter un plat
      </Button>
    </fieldset>
  )}
</form.Field>
```

`key={i}` (l'index) est la pratique des exemples officiels. Pour supprimer au milieu sans mélanger les états d'affichage, ajouter un `uid` à chaque ligne et s'en servir comme clé.

### 5.7 Schémas : fonctions, valibot ou zod ?

- La plupart des règles sont **métier** et dépendent des données : stock restant, « au moins un plat », un seul ticket. Des **fonctions** qui renvoient `{ fields }` sont les plus claires.
- Pour la forme des données (e-mail, chaînes non vides), Standard Schema est pratique. Mesures (esbuild minify puis gzip, petit schéma objet de 3 champs) :
  - **valibot 1.5.0 : 1,5 kB** ;
  - **zod/mini 4.6.5 : 5,9 kB** ;
  - **zod 4.6.5 « classic » : 92 kB**. L'API par méthodes n'est pas tree-shakable : `core/compile.js`, `from-json-schema.js`… sont inclus.
- **Conseil** : des fonctions, ou valibot si l'on veut un schéma. Éviter `zod` classic côté client.

### 5.8 Pièges connus de TanStack Form

1. **`handleSubmit` relance l'erreur de `onSubmit`** (`throw err` dans `FormApi.ts`). Faire un `try/catch` dans `onSubmit`, ou `form.handleSubmit().catch(…)`. Sinon : rejet de promesse non géré.
2. **Erreurs Standard Schema = objets** : utiliser `errorText()` (2.2).
3. **`useSelector` sans sélecteur, ou sélection d'un objet neuf à chaque fois** : re-rendus. Sélectionner des primitives, ou passer `{ compare }`.
4. **`defaultValues` n'est lu qu'au montage** : clé de composant ou `form.reset(newValues)`.
5. **Génériques lourds** : ne jamais écrire `useForm<…12 génériques…>`. Laisser l'inférence travailler depuis `defaultValues` typés (`satisfies`), ou `formOptions({...})`. `withForm` avec `...formOpts` garde le typage. Limiter les `extend` d'AppForm à 3-5 niveaux (avertissement de la doc sur la performance de TS).
6. **`children` passé en prop** (`children={(field) => …}`) déclenche la règle `react/no-children-prop` d'oxlint et d'ESLint. Écrire la fonction enfant en JSX.
7. **`onChangeListenTo`** ne relance que la validation `onChange` du champ qui écoute. Avec `revalidateLogic` (`onDynamic`), préférer un validateur de **formulaire** qui renvoie `{ fields }` pour les règles croisées.
8. **`canSubmit` est vrai tant que rien n'est touché**. Ne pas désactiver le bouton avec `disabled` (peu accessible) : la doc conseille `aria-disabled`.
9. Une erreur de **champ** masque l'erreur de **formulaire** portant sur le même champ.
10. **v2 alpha** : ne pas suivre `@next`, les signatures de `formOptions` changent.

---

## 6. Accessibilité des formulaires

| Besoin | Mise en œuvre |
| --- | --- |
| Libellés visibles | `Field.Label` (un vrai `<label>` relié). Pour un groupe, `Fieldset.Legend`. Pas de libellé uniquement en placeholder. |
| `aria-invalid` et `aria-describedby` | Automatiques avec `Field.Root invalid` plus `Field.Error` et `Field.Description`, vérifié dans le code (1.5). On supprime `markInvalid`, `linkLabels` et `fieldError`. |
| Aide masquée en cas d'erreur (règle M3 actuelle) | `.root[data-invalid] .help { display: none; }`. Un élément masqué reste utilisable par `aria-describedby` quand il est référencé directement. |
| Annonce des erreurs | `Field.Error` n'est **pas** une région live. À la soumission : (1) focus sur le premier champ invalide, et le lecteur lit le libellé et l'erreur ; (2) facultatif, un résumé `role="status"` (« 2 champs à corriger ») placé au-dessus des boutons. |
| Focus sur la première erreur | Dans `onSubmitInvalid` (motif de `focus-management.md`) : `formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()`. `aria-invalid` est posé par Base UI dès que `invalid` est vrai. Pour les groupes radio et les steppers, le premier `[role=radio]` ou `input` du groupe invalide reçoit le focus. Ne pas compter sur `Form` de Base UI : son `focusFirstInvalid` ne regarde que la validité calculée par Base UI, pas le prop `invalid`. |
| Confirmation | Garder la carte récapitulative en `role="status"` (actuellement `confirmationHtml`), plus un toast. Déplacer le focus sur le titre de la carte (`tabIndex={-1}`) après le succès, puisque le formulaire disparaît. Sinon le focus tombe sur `<body>`. |
| Total en direct | `<p aria-live="polite">` mis à jour par `form.Subscribe`, comme aujourd'hui. |
| Cibles de 48 px | Hauteur visuelle de 40 px, `::after { inset: -4px }` (ou `-6px`/`-8px` en taille small), et `@media (pointer: coarse)` à 44 px minimum : on reprend les règles existantes dans chaque module. Même chose pour les boutons ± du NumberField. |
| `inputmode` / `autocomplete` | Nom : `autoComplete="name"`. E-mail : `type="email" inputMode="email" autoComplete="email" spellCheck={false}`. Téléphone (contact collègue) : `type="tel" inputMode="tel" autoComplete="tel"`. Classe : `autoComplete="off"` ou `organization-title`, selon l'usage. Mot de passe collègue : `type="password" autoComplete="current-password"`. Les quantités sont gérées par NumberField (`inputMode="numeric"`). |
| Langue | `<html lang="fr">`. Surcharger les `aria-label` anglais de Base UI (1.5). Formateurs `Intl` en `fr-FR`. `locale="fr-FR"` sur NumberField. |
| Mot de passe | `Input type={visible ? 'text' : 'password'}` avec un `Toggle` (`aria-pressed`, libellé fixe « Afficher le mot de passe ») ou un bouton dont le libellé change, comme aujourd'hui. Échap revient au mode client et Entrée valide : avec un `<form>`, Entrée soumet nativement. |
| Suppression en deux clics | Composant `ConfirmButton` : 1ᵉʳ clic, `data-armed` et libellé « Confirmer ? », largeur figée, `aria-label` détaillé ; 2ᵉ clic dans les 4 s, action ; sinon désarmement. Ajouter une annonce `role="status"` visuellement masquée (« Cliquez de nouveau pour confirmer la suppression ») : le changement de libellé d'un bouton déjà focalisé n'est pas toujours relu. Pour « Supprimer ce jour », AlertDialog est préférable. |

---

## 7. Icônes

- Aujourd'hui, les SVG sont inline. Deux familles coexistent :
  - icônes au trait 24×24 (`ICONS.print`, `settings`, `check`, `eye`) ;
  - glyphes Material Symbols (`viewBox="0 -960 960 960"` : chevrons, œil, calendrier, coche des segments).
- **Recommandation : un fichier `ui/icons.tsx` de composants SVG maison**, une douzaine d'icônes reprises telles quelles, en `aria-hidden` par défaut, avec `currentColor`. Aucune dépendance et un rendu identique à la charte (style Material 3).

```tsx
type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };
const material = (d: string) => ({ size = 24, ...p }: IconProps) => (
  <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" focusable="false" {...p}><path d={d} /></svg>
);
export const ChevronPrevIcon = material('M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z');
export const ChevronNextIcon = material('M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z');
// … CheckIcon, CalendarIcon, EyeIcon, EyeOffIcon, PrintIcon, SettingsIcon, PlusIcon, MinusIcon
```

- `lucide-react` 1.51.0 : bien tree-shakable (10 icônes ≈ **2,5 kB gz** de plus, mesuré). Mais son style au trait ne correspond pas aux glyphes Material Symbols déjà utilisés. Acceptable si l'on veut une large bibliothèque, inutile pour une douzaine d'icônes.
- `@material-symbols/svg-400` (0.47.6) avec `vite-plugin-svgr` (5.2.0) : cohérent avec Material 3, mais ajoute un plugin de build pour peu d'icônes.
- `@iconify/react` (6.0.2) : chargement à la demande par réseau, déconseillé (une dépendance réseau de plus et un affichage décalé).

---

## 8. Impression (A4 paysage)

### 8.1 Existant

`window.open` puis `document.write` d'un document complet. Les jetons sont recopiés depuis `PRINT_TOKENS`, et les marges de page `@bottom-left` / `@bottom-right` affichent « Page x / y ».

### 8.2 Options

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **A. Même document** : portail `#print-root` rendu à la demande, `@media print` qui masque le reste, `window.print()`, nettoyage sur `afterprint` | **Les jetons sont déjà là** (fini la liste `PRINT_TOKENS` et la double maintenance). Polices déjà chargées. Données et session collègue (mot de passe en mémoire) disponibles. Aucune dépendance, aucun bloqueur de fenêtres. | Il faut bien masquer l'application à l'impression. `@page` est global, d'où les pages nommées (`page: liste`). |
| B. Route `/impression/$restaurant/$date` dans un nouvel onglet | URL partageable, aperçu plein écran. | **Nouvel onglet = nouvelle application** : cache de requêtes vide, **session collègue perdue** (mot de passe en mémoire), donc il faudrait la recopier (le `sessionStorage` est copié vers l'onglet ouvert par `window.open`, mais y stocker le mot de passe est discutable). Bloqueur de fenêtres. |
| C. `react-to-print` 3.3.0 (iframe cachée, `useReactToPrint({ contentRef, documentTitle, pageStyle })`, styles copiés) | Isolation, `documentTitle` réglable (pratique pour le nom du PDF). | Dépendance pour 50 lignes de code. Le contenu doit être rendu dans la page, polices passées par l'option `fonts`. Bugs possibles liés à l'iframe. |

### 8.3 Recommandation : option A (même document)

Avec `flushSync` et `afterprint`, on obtient une route d'aperçu facultative et le même composant `PrintDayR1` réutilisé.

```tsx
// ui/print/usePrint.tsx
import { useState, type ReactNode } from 'react';
import { createPortal, flushSync } from 'react-dom';

export function usePrint() {
  const [doc, setDoc] = useState<{ node: ReactNode; title: string } | null>(null);
  function print(node: ReactNode, title: string) {
    const previousTitle = document.title;
    flushSync(() => setDoc({ node, title }));      // le document est dans le DOM avant print()
    document.title = title;                        // nom proposé pour le PDF
    window.addEventListener('afterprint', () => { document.title = previousTitle; setDoc(null); }, { once: true });
    void document.fonts.ready.then(() => window.print());
  }
  const portal = doc ? createPortal(<div className="print-root">{doc.node}</div>, document.body) : null;
  return { print, portal };
}
```

```css
/* styles/print.css (importé globalement) */
@media screen { .print-root { display: none; } }
@media print {
  body:has(> .print-root) > :not(.print-root) { display: none !important; }
  body { background: none; }
  .print-root { page: liste; color: var(--text); font-family: var(--font-body); }
}
@page liste {
  size: A4 landscape;
  margin: 12mm 14mm 14mm;
  @bottom-right { content: "Page " counter(page) " / " counter(pages); font-size: 8pt; }
}
.print-table { width: 100%; border-collapse: collapse; }
.print-table th, .print-table td { border: 1px solid var(--border-strong); padding: 1.5mm 2mm; }
.print-table thead { display: table-header-group; } /* en-tête répété sur chaque page */
.print-table tr { break-inside: avoid; }
```

Compatibilité (MDN BCD `main`) :

- `@page` `size` : Chrome 15+, Firefox 95+, Safari 18.2+.
- Pages nommées (`page`) : Chrome 85+, Firefox 110+.
- **Marges de page (`@bottom-left`…) : Chrome 131+ seulement**, ni Firefox ni Safari. Garder le pied de page dans le flux (`.pb-foot` existant) comme repli. Le numéro « Page x / y » n'existe que sous Chromium.
- `afterprint` : Chrome 63+, Firefox 6+, Safari 13+.

Le rendu reste à valider sur les postes du lycée.

---

## 9. Tableau : composant existant → solution React / Base UI

| Existant (fichier / classe) | Solution |
| --- | --- |
| `.btn`, `.btn.primary`, `.ghost`, `.small` (`design-system.css`) | `ui/button/Button.tsx` sur `Button` de Base UI, avec `data-variant` et `data-size` (4.3) |
| `.btn.danger.armed` + `confirmClick` / `disarm` (`outils.js`) | `ui/button/ConfirmButton.tsx` (état local + minuteur de 4 s, `data-armed`, annonce `role="status"`). Pour un jour entier : `AlertDialog` |
| `.icon-btn`, `.icon-btn.tonal` (chevrons ‹ ›) | `ui/button/IconButton.tsx` (`Button` + `aria-label` obligatoire en TS, `data-tone="tonal"`) |
| `segGroup` + `.seg-btn[aria-pressed]` (`interface.js`) | Formulaire (Sur place / À emporter) : `SegmentedRadio` = `RadioGroup` + `Radio`. Vues (Semaine / Mois, Client / Collègue) : `ToggleGroup` + `Toggle` (`data-pressed`), en ignorant la désélection |
| `popSeg` (animation de sélection) | Transition CSS sur `[data-checked]` / `[data-pressed]` (4.5) |
| `.field`, `<label>`, `.field-help`, `.field-error`, `checkFields`, `fieldError`, `markInvalid`, `linkLabels`, `focusFirstError` | `Field.Root/Label/Control/Description/Error` piloté par TanStack Form (`TextField`), `errorText`, et focus via `onSubmitInvalid` |
| `<input type="number">` des quantités R2, compteurs R1 (élèves, personnels, extérieurs), stock | `PortionStepper` / `CountField` = `NumberField` (`min`, `max`, `step`, `locale="fr-FR"`, libellés en français) |
| Champ Prix avec `<datalist>` et `step=0.01` | `Field.Control type="text" inputMode="decimal" list="…"` avec conversion maison, ou `NumberField format={{style:'currency',currency:'EUR'}}` sans datalist, ou `Combobox` |
| `<select>` Mode (modification d'une réservation R2) | `SegmentedRadio` (deux options) |
| `ticketCheckHtml` + `syncTicketPrice` | `CheckboxField` + `listeners.onChange` + `form.Subscribe` pour désactiver le Prix |
| `fieldset.field-group > legend` | `Fieldset.Root` / `Fieldset.Legend` |
| `.form-reveal`, `enterOnce`, `leaveThen`, `.menu-list.collapsing/expanding` | `Collapsible.Panel` + `--collapsible-panel-height` + `data-starting-style` / `data-ending-style` |
| `<details class="disclosure">` (Paramètres, Ouvrir un jour) | `Collapsible` (ou `<details>` natif conservé) |
| `.date-trigger` + `datePickerHtml` + `dpKey` (`collegue.js`) | `Popover` + `MonthGrid` maison (`initialFocus` sur la case sélectionnée) |
| `renderCalendar` + `calKey` + `keyTargetIso` (`calendrier.js`) | `MonthGrid` / `WeekGrid` maison (`role="grid"`, roving tabindex), jour et vue dans les search params |
| `calTransition` (`startViewTransition`) | `<ViewTransition>` de React 19.3 + `addTransitionType`, ou `document.startViewTransition` encapsulé |
| `.day-card` (fiche du jour), `cardEnter` | Composant `DayCard` monté avec `key={iso}`, apparition par transition CSS (`@starting-style` natif ou classe d'entrée) |
| `confirmationHtml` (`.confirm-card`, `role="status"`) | `BookingConfirmation` (`role="status"`, focus sur le titre) |
| `.alert`, `.alert.warning`, `.note-warning`, `.setup-banner` | `ui/feedback/Alert.tsx` (`data-tone="danger|warning"`, `role="alert"` ou `status` selon l'urgence). Pas de composant Base UI |
| `showToast(msg, isError)` (`.toast`, `.toast.error`) | `Toast.Provider` + `createToastManager` + `notify.success` / `notify.error` (2.7) |
| `.loader` (voile bloquant) | `Progress` indéterminé ou spinner existant + `isSubmitting` / `isPending`. Supprimer le voile bloquant global autant que possible |
| `.capacity-pill` (jauge) | Petit composant `CapacityPill` (CSS existant, `--pct`), éventuellement `Meter` de Base UI pour la sémantique (`role="meter"`) |
| `.bookings-list` / `.booking-row` (collègue) | `<table>` natif (`ui/table/Table.module.css`) ou liste. Pas de Table dans Base UI |
| Mot de passe + œil (`togglePwdVisibility`) | `Input` + `Toggle` « Afficher le mot de passe » dans un `<form>` |
| Menus (aucun aujourd'hui) | `Menu` (actions d'une réservation si la ligne devient trop chargée) |
| `printDoc`, `printTable`, `openPrint`, `PRINT_TOKENS` (`impression.js`) | `usePrint` + composants `PrintDayR1` / `PrintDayR2` / `PrintTomorrow` + `print.css` (8.3) |
| `ICONS`, `EYE_ON`, `CHEVRON_*`, `SEG_CHECK`, `CAL_ICON` | `ui/icons.tsx` (7) |

---

## 10. Architecture recommandée des composants (dossier `ui/`)

```
src/
  styles/
    tokens.css            # section 1 et 2 de design-system.css (jetons + .accent-green/.accent-magenta + [data-accent])
    base.css              # reset, typo, :focus-visible, keyframes, prefers-reduced-motion, confort tactile
    print.css             # @media print, @page liste
  lib/
    dates.ts              # IsoDate, toISO, addDaysISO, mondayOf, build*Cells, keyTargetIso, formateurs Intl fr-FR
    money.ts              # formatEuro (« 12,50 € », espace insécable)
  ui/
    icons.tsx
    button/      Button.tsx  IconButton.tsx  ConfirmButton.tsx  Button.module.css
    toggle/      ViewToggle.tsx (ToggleGroup)  Toggle.module.css
    form/
      context.ts          # createFormHookContexts
      index.ts            # createFormHook → useAppForm, withForm, withFieldGroup
      errors.ts           # errorText, focusFirstInvalid
      TextField.tsx  PortionStepper.tsx  CountField.tsx  PriceField.tsx
      SegmentedRadio.tsx  CheckboxField.tsx  PasswordField.tsx  SubmitButton.tsx
      IdentityFields.tsx  # withFieldGroup : nom, classe, contact, observation
      Field.module.css  Segmented.module.css  PortionStepper.module.css …
    calendar/    MonthGrid.tsx  WeekGrid.tsx  CalendarHeader.tsx  DatePickerPopover.tsx  MonthGrid.module.css
    overlay/     Dialog.tsx  AlertDialog.tsx (enveloppes stylées : Backdrop + Viewport + Popup + Title)  Overlay.module.css
    disclosure/  Collapsible.tsx  Collapsible.module.css
    feedback/    Alert.tsx  Toaster.tsx  toast.ts  CapacityPill.tsx  Spinner.tsx
    table/       Table.module.css
    print/       usePrint.tsx  PrintLayout.tsx  PrintTable.tsx
  features/
    reservation/ BookingFormR1.tsx  BookingFormR2.tsx  BookingConfirmation.tsx  DayCardR1.tsx  DayCardR2.tsx
    collegue/    LoginBox.tsx  Settings.tsx  OpenDayR1.tsx  OpenDayR2.tsx  EditBooking*.tsx  DeleteDayDialog.tsx
    impression/  PrintDayR1.tsx  PrintDayR2.tsx  PrintTomorrow.tsx
```

Règles :

1. **`ui/` ne connaît pas le métier** : pas d'API, pas de données de restaurant. `features/` assemble.
2. Chaque composant Base UI est **enveloppé une seule fois** dans `ui/`, avec les styles, les libellés français et les tailles tactiles. Le code métier n'importe jamais `@base-ui/react` directement, sauf pour les cas rares de composition.
3. Les styles ne viennent que des **CSS Modules et des jetons**. Les variantes passent par `data-*`, les états par les `data-*` de Base UI, l'accent par la cascade (`.accent-*` sur le conteneur **et sur les portails**).
4. Les formulaires passent tous par `useAppForm` et les champs pré-liés. Aucun `useState` pour les valeurs saisies.
5. L'état partageable (jour, vue, formulaire ouvert) va dans l'URL. Les données personnelles jamais.

---

## 11. Pièges connus (récapitulatif)

**Base UI**

1. Calendar et DatePicker **n'existent pas** dans la 1.8.0 (issue #1709 ouverte). Ne pas s'appuyer sur `internals/composite` ni `internals/temporal`, qui ne sont pas des API publiques.
2. Libellés **anglais codés en dur** : `Increase` / `Decrease`, `aria-roledescription="Number field"`, `aria-label="Notifications"`. À surcharger dans les enveloppes `ui/`.
3. Les **portails** (Dialog, Popover, Toast, Menu) **perdent l'accent** du restaurant : `className="accent-…"` sur `*.Portal`.
4. Ajouter `isolation: isolate` sur la racine et `body { position: relative }` (iOS 26), selon le quick-start.
5. Rendre `Field.Error match` **conditionnellement** quand TanStack porte l'état : `match` à `true` l'affiche toujours.
6. **Ne pas mélanger** `validate` / `validationMode` / contraintes natives de Base UI avec la validation TanStack. Ne pas utiliser `Form` de Base UI : son focus sur la première erreur ignore le prop `invalid`.
7. `Field.Error` **n'est pas une région live**.
8. NumberField :
   - `onValueChange` donne `null` quand le champ est vidé, à convertir ;
   - les boutons ± sont en `tabIndex=-1` (voulu) ;
   - pas de `<datalist>` possible.
9. ToggleGroup : un 2ᵉ clic **désélectionne**, il faut ignorer `[]`.
10. Les animations d'entrée et de sortie se font par **transitions** sur `[data-starting-style]` / `[data-ending-style]`. Une `@keyframes` sur `data-starting-style` ne fonctionne pas comme prévu.
11. Bundle mesuré (esbuild minify puis gzip -9, React et ReactDOM soustraits, ≈ 68,8 kB) :
    - Base UI avec 8 composants (Dialog, Field, NumberField, RadioGroup, Radio, Checkbox, Toast, Button) : **+59,8 kB** ;
    - avec 13 composants (ajout d'AlertDialog, Fieldset, Collapsible, Input, Popover) : **+71,7 kB** ;
    - TanStack Form : **+16,9 kB** ;
    - react-aria-components Calendar : **+35,5 kB** en plus de Base UI ;
    - temporal-polyfill : 19,7 kB.

**TanStack Form**

12. `handleSubmit` **relance** les erreurs de `onSubmit` : faire un `try/catch`.
13. Erreurs Standard Schema = **objets** (`.message`).
14. `useStore` est **déprécié**, utiliser `useSelector`. Toujours passer un sélecteur.
15. `defaultValues` n'est lu qu'au montage : utiliser une **clé** par jour ou par ouverture, ou `form.reset()`.
16. Génériques : laisser l'inférence faire, ne pas annoter `useForm<…>`. Limiter les `extend`.
17. `children=` en prop déclenche `react/no-children-prop` : écrire l'enfant en JSX.
18. `onChangeListenTo` ne s'applique qu'au mode `onChange`. Avec `revalidateLogic`, valider au niveau du formulaire.
19. Rester sur 1.x : la 2.0 est en alpha avec des changements cassants (`formOptions.*Schema`).
20. `zod` 4 classic pèse environ 92 kB gz dans un bundle client (mesuré). Préférer des fonctions, valibot ou `zod/mini`.

**Calendrier, URL, dates**

21. `role="group"` avec des boutons : les lecteurs d'écran en mode navigation interceptent les flèches. Utiliser `role="grid"`.
22. Navigation clavier avec `navigate({ replace: true })` : sinon l'historique se remplit d'une entrée par flèche.
23. Temporal n'est pas dans Safari stable (MDN BCD : `preview`). Garder des chaînes ISO et des helpers maison, ou payer environ 20 kB de polyfill.
24. Les jours sont des dates **locales** sans heure. Ne jamais faire `new Date('2026-10-05')`, interprété en UTC. Écrire `new Date(iso + 'T00:00:00')` comme aujourd'hui, ou `Temporal.PlainDate`.

**Impression**

25. Un nouvel onglet perd la session collègue et le cache : imprimer **dans le même document**.
26. Les marges de page `@bottom-*` ne fonctionnent que dans Chrome 131+ : garder un pied de page dans le flux.
27. `@page` est global : utiliser une page nommée (`page: liste`) pour ne pas changer l'impression ordinaire de la page.

---

## Annexe : commandes utilisées

```bash
npm view @base-ui/react version dist-tags time.modified --json
npm view @base-ui-components/react version dist-tags deprecated --json
npm view @tanstack/react-form version dist-tags time --json
npm pack @base-ui/react@1.8.0 && tar xzf base-ui-react-1.8.0.tgz   # docs/react/**/*.md inclus dans le paquet
git clone --depth 1 --filter=blob:none --sparse https://github.com/mui/base-ui && git sparse-checkout set docs/src/app packages/react/src
git clone --depth 1 --filter=blob:none --sparse https://github.com/TanStack/form && git sparse-checkout set docs examples/react packages/form-core/src packages/react-form/src
curl https://raw.githubusercontent.com/TanStack/form/alpha/packages/react-form/CHANGELOG.md
curl https://raw.githubusercontent.com/mdn/browser-compat-data/main/javascript/builtins/Temporal.json
curl https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/at-rules/page.json
npx esbuild e/<cas>.js --bundle --minify --format=esm --define:process.env.NODE_ENV=\"production\" | gzip -9 | wc -c
npx oxfmt@0.71.0 t.module.css    # vérifie que oxfmt formate le CSS
```

Sources web : [issue mui/base-ui #1709](https://github.com/mui/base-ui/issues/1709), [Bryntum, « JavaScript Temporal in 2026 »](https://bryntum.com/blog/javascript-temporal-is-it-finally-here/), [WebKit, Safari 27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/) (consulté via les résultats de recherche : seule une correction sur `Temporal.Instant` y est mentionnée, sans livraison par défaut ; la référence retenue est MDN BCD).
