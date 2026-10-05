import { Checkbox } from "@base-ui/react/checkbox";
import { Field } from "@base-ui/react/field";
import { useId } from "react";
import type { ReactNode } from "react";

import { FieldMessages } from "@/ui/form/FieldMessages";
import { useFieldContext } from "@/ui/form/form-context";
import { useFieldMessages } from "@/ui/form/use-field-messages";
import { CheckIcon } from "@/ui/icons";

import styles from "@/ui/form/CheckboxField.module.css";
import fieldStyles from "@/ui/form/Field.module.css";

export interface CheckboxFieldProps {
  /** Visible text beside the box (« Ticket restaurant », 06 § 4.3). */
  label: ReactNode;
  /** Name that replaces the visible text for assistive technologies (06 § 4.2: « Plat 1 : au prix d'un ticket
   * restaurant »). */
  "aria-label"?: string | undefined;
  disabled?: boolean | undefined;
}

/**
 * Check box bound to a boolean field; the whole label is clickable, 48 px high (08 § 4.6). A form that reacts to it
 * (the price disabled by « Ticket restaurant ») reads the value with `form.Subscribe`.
 */
export function CheckboxField({
  label,
  "aria-label": ariaLabel,
  disabled = false,
}: CheckboxFieldProps) {
  const field = useFieldContext<boolean>();
  const fieldMessages = useFieldMessages(field);
  // Base UI names the box by the label element; a name of its own needs `aria-labelledby`, which wins. A native button
  // takes the label's `for`: the hidden input of the form value gets no label (one control per name, REG-37).
  const nameId = useId();
  return (
    <Field.Root
      name={field.name}
      invalid={fieldMessages.invalid}
      touched={field.state.meta.isTouched}
      dirty={field.state.meta.isDirty}
      disabled={disabled}
      className={fieldStyles["field"]}
    >
      <Field.Label className={styles["check"]}>
        <Checkbox.Root
          nativeButton
          render={(props) => <button {...props} type="button" />}
          checked={field.state.value}
          onCheckedChange={(checked) => {
            field.handleChange(checked);
          }}
          onBlur={field.handleBlur}
          aria-labelledby={ariaLabel === undefined ? undefined : nameId}
          aria-describedby={fieldMessages.describedBy}
          className={styles["box"]}
        >
          <Checkbox.Indicator className={styles["indicator"]}>
            <CheckIcon />
          </Checkbox.Indicator>
        </Checkbox.Root>
        {label}
      </Field.Label>
      {ariaLabel === undefined ? null : (
        <span id={nameId} hidden>
          {ariaLabel}
        </span>
      )}
      <FieldMessages messages={fieldMessages} />
    </Field.Root>
  );
}
