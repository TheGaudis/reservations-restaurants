import { Field } from "@base-ui/react/field";
import { useState } from "react";
import type { ReactNode } from "react";
import { defineMessages, useIntl } from "react-intl";

import { FieldMessages } from "@/ui/form/FieldMessages";
import { useFieldContext } from "@/ui/form/form-context";
import type { InputProps } from "@/ui/form/TextField";
import { useFieldMessages } from "@/ui/form/use-field-messages";
import { VisibilityIcon, VisibilityOffIcon } from "@/ui/icons";

import styles from "@/ui/form/Field.module.css";
import passwordStyles from "@/ui/form/PasswordField.module.css";

const messages = defineMessages({
  show: {
    id: "ui.passwordField.show",
    defaultMessage: "Afficher le mot de passe",
    description: "06 § 1.2 — bouton œil quand le mot de passe est masqué",
  },
  hide: {
    id: "ui.passwordField.hide",
    defaultMessage: "Masquer le mot de passe",
    description: "06 § 1.2 — bouton œil quand le mot de passe est affiché",
  },
});

export interface PasswordFieldProps extends Omit<InputProps, "type"> {
  label: ReactNode;
  /** The staff login shows a placeholder and names the field for assistive technologies only (06 § 1.1). */
  hideLabel?: boolean | undefined;
  description?: ReactNode;
}

/**
 * Password input with the eye button of 06 § 1.2: the button switches between hidden and shown text, its icon and its
 * name follow. Shown text lasts as long as the field: a field mounted again starts hidden (06 § 1.1).
 */
export function PasswordField({
  label,
  hideLabel = false,
  description,
  autoComplete = "current-password",
  ...inputProps
}: PasswordFieldProps) {
  const intl = useIntl();
  const field = useFieldContext<string>();
  const fieldMessages = useFieldMessages(field);
  const [shown, setShown] = useState(false);
  return (
    <Field.Root
      name={field.name}
      invalid={fieldMessages.invalid}
      touched={field.state.meta.isTouched}
      dirty={field.state.meta.isDirty}
      className={styles["field"]}
    >
      <Field.Label className={hideLabel ? "visually-hidden" : styles["label"]}>{label}</Field.Label>
      <div className={passwordStyles["row"]}>
        <Field.Control
          {...inputProps}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          spellCheck={false}
          className={styles["control"]}
          value={field.state.value}
          onValueChange={(value) => {
            field.handleChange(value);
          }}
          onBlur={field.handleBlur}
          aria-describedby={fieldMessages.describedBy}
        />
        <button
          type="button"
          className={passwordStyles["toggle"]}
          aria-label={intl.formatMessage(shown ? messages.hide : messages.show)}
          onClick={() => {
            setShown(!shown);
          }}
        >
          {shown ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </button>
      </div>
      <FieldMessages messages={fieldMessages} description={description} />
    </Field.Root>
  );
}
