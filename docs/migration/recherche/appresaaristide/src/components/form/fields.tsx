/**
 * The app's TanStack Form hook (`@tanstack/react-form`'s `createFormHook`):
 * forms are created with `useAppForm`, groups of fields shared by several
 * forms with `withFieldGroup`. Inputs are drawn with Base UI's `Field` parts
 * so the label, control and error are wired together for screen readers.
 *
 * A form renders its fields as
 * `<form.AppField name="x">{(field) => <field.TextField … />}</form.AppField>`
 * inside `<Form form={form}>`, which also makes `form.SubmitButton` and
 * `form.FormError` usable anywhere in it. A group of fields shared by several
 * forms is a `withFieldGroup` component rendered as
 * `<IdentityFields form={form} fields="person" />`, where `fields` names the
 * nested object it edits; its own props are the third type argument,
 * `withFieldGroup<Values, unknown, Props>` (the second is the unused submit
 * meta).
 *
 * A field validates on every change through one `onChange` validator (rules in
 * `src/lib/validators.ts`), and a submit runs every field's validator. A
 * field shows its error once the user changed it and left it, or tried to
 * submit the form; the error disappears as soon as the value is fixed.
 * Forms set `canSubmitWhenInvalid: true`: otherwise a submit while one field
 * already shows an error stops before the untouched fields are checked.
 *
 * Leaving a field only marks it as blurred, not as touched: until a value is
 * changed or a submit is attempted, `useAppForm` keeps replacing the values
 * when `defaultValues` change, so forms showing server data stay live.
 */
import { Field } from "@base-ui/react/field";
import {
  createFormHook,
  createFormHookContexts,
  useStore,
} from "@tanstack/react-form";
import type { AnyFieldApi, AnyFormApi } from "@tanstack/react-form";
import type {
  ComponentProps,
  ComponentType,
  PropsWithChildren,
  ReactNode,
} from "react";
import { parseCount, stepCount } from "@/lib/money";
import { Button } from "../ui/button";

// 16px text: iOS Safari zooms into inputs with a smaller font.
const inputBase =
  "rounded-box border border-line bg-panel-light px-2.5 py-2 text-base text-ink placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none";

const inputClass = `${inputBase} w-full min-w-0`;

const controlClass = `${inputClass} data-invalid:border-brick`;
const labelClass = "text-xs text-muted";
const errorClass = "text-xs text-brick";

const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

/** The message to show under a field, if any. */
function useFieldError(field: AnyFieldApi): string | undefined {
  const submitted = useStore(
    field.form.store,
    (state) => state.submissionAttempts > 0,
  );
  const { isBlurred, isDirty } = field.state.meta;
  if (!(isBlurred && isDirty) && !submitted) return undefined;
  for (const error of field.state.meta.errors) {
    if (typeof error === "string" && error !== "") return error;
  }
  return undefined;
}

/** Marks the field as left without touching it (see the header comment). */
function leave(field: AnyFieldApi) {
  field.setMeta((meta) => ({ ...meta, isBlurred: true }));
}

/**
 * A ref that focuses its element once mounted: for the first control of a
 * form that a click just opened, since the link that opened it is gone.
 */
export function focusOnMount(element: HTMLElement | null) {
  element?.focus();
}

const layouts = {
  stacked: {
    root: "flex flex-col gap-1",
    label: labelClass,
    control: controlClass,
    error: errorClass,
  },
  /**
   * Label on the left, a narrow input on the right, the error below both;
   * on phones the label goes above the input.
   */
  inline: {
    root: "grid gap-x-2 gap-y-1 sm:grid-cols-[1fr_auto] sm:items-center",
    label: "text-sm",
    control: `${inputBase} w-[70px] shrink-0 data-invalid:border-brick`,
    error: `sm:col-span-2 ${errorClass}`,
  },
};

type TextFieldProps = {
  label: ReactNode;
  /** Classes of the wrapper around label, control and error. */
  className?: string;
  /** Focuses the input once mounted (see `focusOnMount`). */
  focusOnMount?: boolean;
} & Omit<
  ComponentProps<typeof Field.Control>,
  | "className"
  | "name"
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "onBlur"
  | "ref"
>;

/**
 * A labelled `<input>` bound to a form field. Other props (`type`,
 * `placeholder`, `autoComplete`, `step`, …) go to the input.
 */
function TextField({
  label,
  className = "",
  focusOnMount: focus = false,
  ...inputProps
}: TextFieldProps) {
  const field = useFieldContext<string>();
  const error = useFieldError(field);
  const classes = layouts.stacked;
  return (
    <Field.Root
      name={field.name}
      invalid={error !== undefined}
      touched={field.state.meta.isTouched}
      className={`${classes.root} ${className}`}
    >
      <Field.Label className={classes.label}>{label}</Field.Label>
      <Field.Control
        {...inputProps}
        ref={focus ? focusOnMount : undefined}
        className={classes.control}
        value={field.state.value}
        onValueChange={(value) => {
          field.handleChange(value);
        }}
        onBlur={() => {
          leave(field);
        }}
      />
      <Field.Error match={error !== undefined} className={classes.error}>
        {error}
      </Field.Error>
    </Field.Root>
  );
}

type CountFieldProps = {
  label: ReactNode;
  layout?: keyof typeof layouts;
  min?: number;
  /** The highest count "+" reaches; typing more is left to the validators. */
  max?: number;
} & Pick<ComponentProps<typeof Field.Control>, "placeholder">;

/**
 * A labelled count input between "−" and "+" buttons, for phones. The
 * buttons step the typed value (empty counts as 0) within `min` and `max`.
 */
function CountField({
  label,
  layout = "stacked",
  min = 0,
  max,
  placeholder = "0",
}: CountFieldProps) {
  const field = useFieldContext<string>();
  const error = useFieldError(field);
  const classes = layouts[layout];
  const current = parseCount(field.state.value);
  const step = (delta: number) => {
    field.handleChange(stepCount(field.state.value, delta, min, max));
    leave(field);
  };
  return (
    <Field.Root
      name={field.name}
      invalid={error !== undefined}
      touched={field.state.meta.isTouched}
      className={classes.root}
    >
      <Field.Label className={classes.label}>{label}</Field.Label>
      <div className="flex items-stretch gap-1">
        <Button
          aria-label="Moins"
          className="min-h-11 min-w-11 shrink-0"
          disabled={current <= min}
          onClick={() => {
            step(-1);
          }}
        >
          −
        </Button>
        <Field.Control
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          className={`${inputBase} min-w-0 text-center data-invalid:border-brick ${layout === "inline" ? "w-14" : "w-full"}`}
          value={field.state.value}
          onValueChange={(value) => {
            field.handleChange(value);
          }}
          onBlur={() => {
            leave(field);
          }}
        />
        <Button
          aria-label="Plus"
          className="min-h-11 min-w-11 shrink-0"
          disabled={max !== undefined && current >= max}
          onClick={() => {
            step(1);
          }}
        >
          +
        </Button>
      </div>
      <Field.Error match={error !== undefined} className={classes.error}>
        {error}
      </Field.Error>
    </Field.Root>
  );
}

interface SelectFieldProps {
  label: ReactNode;
  options: readonly { value: string; label: string }[];
}

/** A labelled native `<select>` bound to a form field. */
function SelectField({ label, options }: SelectFieldProps) {
  const field = useFieldContext<string>();
  const error = useFieldError(field);
  return (
    <Field.Root
      name={field.name}
      invalid={error !== undefined}
      touched={field.state.meta.isTouched}
      className="flex flex-col gap-1"
    >
      <Field.Label className={labelClass}>{label}</Field.Label>
      <Field.Control
        render={(props) => <select {...props} />}
        className={controlClass}
        value={field.state.value}
        onValueChange={(value) => {
          field.handleChange(value);
        }}
        onBlur={() => {
          leave(field);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Field.Control>
      <Field.Error match={error !== undefined} className={errorClass}>
        {error}
      </Field.Error>
    </Field.Root>
  );
}

/**
 * A `<form>` that submits through TanStack Form and provides the form to
 * `form.SubmitButton` and `form.FormError` (`form.AppForm`). Browser
 * validation is off: the fields show their own errors.
 */
export function Form({
  form,
  className,
  children,
}: {
  form: Pick<AnyFormApi, "validate" | "handleSubmit"> & {
    AppForm: ComponentType<PropsWithChildren>;
  };
  className?: string;
  children: ReactNode;
}) {
  return (
    <form.AppForm>
      <form
        noValidate
        className={className}
        onSubmit={(event) => {
          event.preventDefault();
          // `handleSubmit` runs the form-level validators only once every
          // field is valid; validating first shows the cross-field error
          // (e.g. "at least one person") on the first submit, next to the
          // field errors.
          void form.validate("change");
          // `handleSubmit` rethrows what `onSubmit` throws: a failed
          // mutation, already reported by the MutationCache toast or by the
          // form itself.
          form.handleSubmit().catch(() => null);
        }}
      >
        {children}
      </form>
    </form.AppForm>
  );
}

/**
 * A form-level message (`role="alert"`): the first error of the form's own
 * validators once a submit was attempted, else `children` (e.g. the error of
 * the mutation when it is not shown as a toast).
 */
function FormError({ children }: { children?: ReactNode }) {
  const form = useFormContext();
  const formError = useStore(form.store, (state): string | undefined => {
    if (state.submissionAttempts === 0) return undefined;
    for (const error of state.errors) {
      if (typeof error === "string" && error !== "") return error;
    }
    return undefined;
  });
  const message = formError ?? children;
  if (message === undefined || message === null || message === "") return null;
  return (
    <p role="alert" className={errorClass}>
      {message}
    </p>
  );
}

/**
 * The gold submit button, disabled while the form's `onSubmit` runs (which
 * awaits the mutation) and labelled `pendingLabel` meanwhile.
 */
function SubmitButton({
  pendingLabel,
  disabled = false,
  children,
  ...buttonProps
}: Omit<ComponentProps<typeof Button>, "type" | "form"> & {
  pendingLabel?: ReactNode;
}) {
  const form = useFormContext();
  const submitting = useStore(form.store, (state) => state.isSubmitting);
  return (
    <Button
      variant="gold"
      {...buttonProps}
      type="submit"
      disabled={disabled || submitting}
      busy={submitting}
    >
      {submitting && pendingLabel !== undefined ? pendingLabel : children}
    </Button>
  );
}

export const { useAppForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, SelectField, CountField },
  formComponents: { SubmitButton, FormError },
});
