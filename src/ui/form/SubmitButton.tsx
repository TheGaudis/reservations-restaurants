import { useSelector } from "@tanstack/react-form";
import type { ReactNode } from "react";

import { Button } from "@/ui/button/Button";
import { useFormContext } from "@/ui/form/form-context";

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
  return (
    <Button type="submit" variant="primary" busy={isSubmitting} busyLabel={pendingLabel}>
      {children}
    </Button>
  );
}
