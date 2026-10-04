import { useSelector } from "@tanstack/react-form";

import type { Restaurant } from "@/domain/types";
import { columnFocus, useCloseBookingForm } from "@/features/booking/booking-columns";
import { DayActions } from "@/features/calendar/DayCard";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
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
      <SubmitButton>{intl.formatMessage(commonMessages.confirmBooking)}</SubmitButton>
      <Button
        variant="ghost"
        disabled={sending}
        onClick={() => {
          requestFocus(columnFocus.reserve(restaurant));
          close();
        }}
      >
        {intl.formatMessage(commonMessages.cancel)}
      </Button>
    </DayActions>
  );
}
