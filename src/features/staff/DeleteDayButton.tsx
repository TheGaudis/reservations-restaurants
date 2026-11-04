import { defineMessage, FormattedMessage, useIntl } from "react-intl";

import { bookingsOfDay } from "@/domain/days";
import type { IsoDate, Restaurant } from "@/domain/types";
import { focusCardDate } from "@/features/calendar/card-date-focus";
import { useStaffState } from "@/features/staff/use-staff-state";
import { useDeleteDay } from "@/mutations/staff/days";
import { showStaffError } from "@/mutations/staff/write";
import { ConfirmButton } from "@/ui/button/ConfirmButton";

const deleteDayConfirmLabel = defineMessage({
  id: "staff.day.delete.confirm",
  defaultMessage: "Confirmer la suppression du jour et de toutes ses réservations",
  description: "06 § 5.2 — aria-label et title du bouton armé d'un jour sans réservation",
});

export const deleteDayWithBookingsLabel = defineMessage<{ n: number }>({
  id: "staff.day.delete.confirmWithBookings",
  defaultMessage:
    "Confirmer la suppression du jour et de ses {n, plural, one {# réservation} other {# réservations}} (les personnes ne seront pas prévenues)",
  description:
    "PLAN annexe F, D-21 — note et aria-label du bouton armé d'un jour qui a des réservations",
});

interface DeleteDayButtonProps {
  restaurant: Restaurant;
  /** Selected day of the card. */
  iso: IsoDate;
}

/**
 * « Supprimer ce jour » (06 § 5.2, C-14), last of the actions of both staff cards, past days included: two clicks
 * within 4 s, then the button stays busy until the answer (E-04). A day with bookings shows how many go with it, in a
 * visible note and in the name of the armed button (D-21, E-38). Success: « Jour supprimé. », the card of the day
 * without service, focus on its date. Failure: the button back to rest, the error in a toast.
 */
export function DeleteDayButton({ restaurant, iso }: DeleteDayButtonProps) {
  const { formatMessage } = useIntl();
  const remove = useDeleteDay(restaurant);
  const bookings = useStaffState((state) => bookingsOfDay(state, restaurant, iso));
  const detail =
    bookings === 0
      ? formatMessage(deleteDayConfirmLabel)
      : formatMessage(deleteDayWithBookingsLabel, { n: bookings });
  async function confirm() {
    // The day and this button leave the page with the answer: `mutateAsync` resolves all the same, the callbacks
    // given to `mutate` would not run.
    try {
      await remove.mutateAsync(iso);
      focusCardDate(restaurant);
    } catch (error) {
      showStaffError(error);
    }
  }
  return (
    <ConfirmButton
      size="small"
      detail={detail}
      showDetail={bookings > 0}
      busy={remove.isPending}
      onConfirm={() => {
        void confirm();
      }}
    >
      <FormattedMessage
        id="staff.day.delete"
        defaultMessage="Supprimer ce jour"
        description="06 § 5.2 — bouton de suppression d'un jour (R1 et R2)"
      />
    </ConfirmButton>
  );
}
