import { Button } from "@base-ui/react/button";
import { useSelector } from "@tanstack/react-form";
import { useId } from "react";
import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import { useFormContext } from "@/ui/form/form-context";

import styles from "@/ui/form/SubmitButton.module.css";

export interface SubmitButtonProps {
  /** « Confirmer la réservation », « Ouvrir ce jour »… */
  children: ReactNode;
  /** Label while the form sends (08 § 4.2: « Ouverture en cours… », « Enregistrement… »); defaults to « Envoi en
   * cours… » (04 § 6.1). */
  pendingLabel?: ReactNode;
}

/**
 * Primary submit button of a form (`<form.SubmitButton>` inside `Form`). While `onSubmit` runs (it awaits the
 * mutation), the button is busy: `aria-busy`, waiting label, clicks ignored, focus kept on it (04 § 6.1, E-04).
 */
export function SubmitButton({ children, pendingLabel }: SubmitButtonProps) {
  const form = useFormContext();
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const labelId = useId();
  return (
    <Button
      type="submit"
      className={styles["button"]}
      disabled={isSubmitting}
      focusableWhenDisabled
      aria-busy={isSubmitting || undefined}
      aria-labelledby={labelId}
    >
      <span id={labelId}>
        {isSubmitting
          ? (pendingLabel ?? (
              <FormattedMessage
                id="ui.submitButton.pending"
                defaultMessage="Envoi en cours…"
                description="04 § 6.1 — libellé du bouton d'envoi pendant l'envoi"
              />
            ))
          : children}
      </span>
    </Button>
  );
}
