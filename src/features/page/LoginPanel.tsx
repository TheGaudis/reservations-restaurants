import type { KeyboardEvent } from "react";
import { defineMessages, useIntl } from "react-intl";

import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

import styles from "@/features/page/ModeSwitch.module.css";

// Login panel of the mode switch, in a chunk of its own (`load-login-panel.ts`): TanStack Form and the fields of
// `ui/form/` stay out of the initial path of a public visitor (S3, R-15).

const messages = defineMessages({
  passwordLabel: {
    id: "staff.login.password.label",
    defaultMessage: "Mot de passe collègue",
    description: "06 § 1.1 — aria-label du champ mot de passe du panneau de connexion",
  },
  passwordPlaceholder: {
    id: "staff.login.password.placeholder",
    defaultMessage: "Mot de passe",
    description: "06 § 1.1 — placeholder du champ mot de passe",
  },
  submit: {
    id: "staff.login.submit",
    defaultMessage: "Valider",
    description: "06 § 1.1 — bouton du panneau de connexion",
  },
});

export interface LoginPanelProps {
  /** Sends the password as typed; resolves once the login succeeded or failed (`ModeSwitch`). */
  submit: (password: string) => Promise<void>;
  /** Échap in the field (06 § 1.2), with the field. */
  onEscape: (input: HTMLInputElement) => void;
  /** Stable ref callback of the field: the field of a panel opened by « Collègue » takes the focus (06 § 1.2). */
  takeFocus: (input: HTMLInputElement | null) => void;
}

/**
 * `#adminLogin`: password field named « Mot de passe collègue », its eye, « Valider » (06 § 1.1). Entrée submits
 * (E-03); « Valider » stays busy until the answer (E-04). A panel mounted again starts empty and hidden (06 § 1.1).
 */
export function LoginPanel({ submit, onEscape, takeFocus }: LoginPanelProps) {
  const intl = useIntl();
  const form = useAppForm({
    defaultValues: { password: "" },
    onSubmit: async ({ value }) => submit(value.password),
  });
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") onEscape(event.currentTarget);
  };
  return (
    <Form form={form} className={styles["login"]}>
      <form.AppField name="password">
        {(field) => (
          <field.PasswordField
            ref={takeFocus}
            label={intl.formatMessage(messages.passwordLabel)}
            hideLabel
            placeholder={intl.formatMessage(messages.passwordPlaceholder)}
            onKeyDown={onKeyDown}
          />
        )}
      </form.AppField>
      <form.SubmitButton>{intl.formatMessage(messages.submit)}</form.SubmitButton>
    </Form>
  );
}
