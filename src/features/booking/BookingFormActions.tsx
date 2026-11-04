import { useSelector } from "@tanstack/react-form";
import { FormattedMessage } from "react-intl";

import type { Restaurant } from "@/domain/types";
import { columnFocus, useCloseBookingForm } from "@/features/booking/booking-columns";
import { DayActions } from "@/features/calendar/DayCard";
import { cancelAction } from "@/intl/common-messages";
import { Button } from "@/ui/button/Button";
import { useFormContext } from "@/ui/form/form-context";
import { SubmitButton } from "@/ui/form/SubmitButton";
import { requestFocus } from "@/ui/pending-focus";

/**
 * « Confirmer la réservation » and « Annuler » of a public form (04 § 5.2, § 5.3). « Annuler » is disabled while
 * sending (E-13) and gives the focus back to « Réserver » (04 § 5.1).
 */
export function BookingFormActions({ restaurant }: { restaurant: Restaurant }) {
  const form = useFormContext();
  const sending = useSelector(form.store, (state) => state.isSubmitting);
  const close = useCloseBookingForm(restaurant);
  return (
    <DayActions>
      <SubmitButton>
        <FormattedMessage
          id="public.form.submit"
          defaultMessage="Confirmer la réservation"
          description="00 § 2.3, 04 § 5.2-5.3 — bouton d'envoi des formulaires publics R1 et R2"
        />
      </SubmitButton>
      <Button
        variant="ghost"
        disabled={sending}
        onClick={() => {
          requestFocus(columnFocus.reserve(restaurant));
          close();
        }}
      >
        <FormattedMessage {...cancelAction} />
      </Button>
    </DayActions>
  );
}
