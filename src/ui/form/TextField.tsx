import { Field } from "@base-ui/react/field";
import type { ReactNode } from "react";

import { FieldMessages } from "@/ui/form/FieldMessages";
import { useFieldContext } from "@/ui/form/form-context";
import { useFieldMessages } from "@/ui/form/use-field-messages";

import styles from "@/ui/form/Field.module.css";

/** Attributes of the `<input>` a form may set; value, events, validity and native constraints belong to the field. */
type InputProps = Omit<
  Field.Control.Props,
  | "name"
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "onChange"
  | "onBlur"
  | "className"
  | "style"
  | "render"
  | "children"
  | "required"
  | "pattern"
  | "minLength"
  | "maxLength"
  | "aria-invalid"
  | "aria-describedby"
>;

export interface TextFieldProps extends InputProps {
  /** Visible label, tied to the input (04 § 10). */
  label: ReactNode;
  /** Keeps the label for assistive technologies only (the field of a dish line, 06 § 4.2). */
  hideLabel?: boolean | undefined;
  /** Help under the field (04 § 5.2: « Pour vous envoyer la confirmation. »). */
  description?: ReactNode;
}

/**
 * Text input bound to a string field of the form (`<form.AppField name="name">{(f) => <f.TextField … />}`).
 * Other props (`type`, `placeholder`, `autoComplete`, `inputMode`, `spellCheck`) go to the input.
 */
export function TextField({
  label,
  hideLabel = false,
  description,
  ...inputProps
}: TextFieldProps) {
  const field = useFieldContext<string>();
  const messages = useFieldMessages(field);
  return (
    <Field.Root
      name={field.name}
      invalid={messages.invalid}
      touched={field.state.meta.isTouched}
      dirty={field.state.meta.isDirty}
      className={styles["field"]}
    >
      <Field.Label className={hideLabel ? "visually-hidden" : styles["label"]}>{label}</Field.Label>
      <Field.Control
        {...inputProps}
        className={styles["control"]}
        value={field.state.value}
        onValueChange={(value) => {
          field.handleChange(value);
        }}
        onBlur={field.handleBlur}
        aria-describedby={messages.describedBy}
      />
      <FieldMessages messages={messages} description={description} />
    </Field.Root>
  );
}
