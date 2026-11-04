import { Field } from "@base-ui/react/field";
import { useState } from "react";
import type { ReactNode } from "react";
import { defineMessage, useIntl } from "react-intl";

import { IconButton } from "@/ui/button/IconButton";
import { FieldShell, useFieldMessages } from "@/ui/form/FieldShell";
import { useFieldContext } from "@/ui/form/form-context";
import type { InputProps } from "@/ui/form/TextField";
import { VisibilityIcon, VisibilityOffIcon } from "@/ui/icons";

import styles from "@/ui/form/Field.module.css";
import passwordStyles from "@/ui/form/PasswordField.module.css";

const showMessage = defineMessage({
  id: "ui.passwordField.show",
  defaultMessage: "Afficher le mot de passe",
  description: "06 § 1.2 — bouton œil quand le mot de passe est masqué",
});

const hideMessage = defineMessage({
  id: "ui.passwordField.hide",
  defaultMessage: "Masquer le mot de passe",
  description: "06 § 1.2 — bouton œil quand le mot de passe est affiché",
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
    <FieldShell field={field} messages={fieldMessages} description={description}>
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
        <IconButton
          aria-label={intl.formatMessage(shown ? hideMessage : showMessage)}
          onClick={() => {
            setShown(!shown);
          }}
        >
          {shown ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </IconButton>
      </div>
    </FieldShell>
  );
}
