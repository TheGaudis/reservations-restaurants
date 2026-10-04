import { useIntl } from "react-intl";

import { bookingsOfDay } from "@/domain/days";
import type { IsoDate, Restaurant } from "@/domain/types";
import { focusCardDate } from "@/features/calendar/card-date-focus";
import { useStaffState } from "@/features/staff/use-staff-state";
import { staffCommonMessages } from "@/intl/staff-messages";
import { useDeleteDay } from "@/mutations/staff/days";
import { staffErrorText } from "@/mutations/staff/write";
import { ConfirmButton } from "@/ui/button/ConfirmButton";
import { showToast } from "@/ui/feedback/toast";

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
      ? formatMessage(staffCommonMessages.deleteDayDetail)
      : formatMessage(staffCommonMessages.deleteDayWithBookings, { n: bookings });
  async function confirm() {
    // The day and this button leave the page with the answer: `mutateAsync` resolves all the same, the callbacks
    // given to `mutate` would not run.
    try {
      await remove.mutateAsync(iso);
      focusCardDate(restaurant);
    } catch (error) {
      const text = staffErrorText(error);
      if (text !== null) showToast(text, "error");
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
      {formatMessage(staffCommonMessages.deleteDay)}
    </ConfirmButton>
  );
}
