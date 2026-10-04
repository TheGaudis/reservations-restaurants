import { useRef } from "react";
import { useIntl } from "react-intl";

import { bookingsOfDay } from "@/domain/days";
import type { IsoDate, Restaurant } from "@/domain/types";
import { columnOf, focusCardDate } from "@/features/staff/card-date-focus";
import { useStaffState } from "@/features/staff/use-staff-state";
import { staffCommonMessages } from "@/intl/staff-messages";
import { useDeleteDay } from "@/mutations/staff/days";
import { staffErrorText } from "@/mutations/staff/write";
import { ConfirmButton } from "@/ui/button/ConfirmButton";
import { showToast } from "@/ui/feedback/toast";

import styles from "@/features/staff/DeleteDayButton.module.css";

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
  const column = useRef<HTMLElement | null>(null);
  async function confirm() {
    // Taken now: the button and its wrapper leave the page with the day.
    const target = column.current;
    try {
      await remove.mutateAsync(iso);
      focusCardDate(target, iso);
    } catch (error) {
      const text = staffErrorText(error);
      if (text !== null) showToast(text, "error");
    }
  }
  return (
    <span
      className={styles["contents"]}
      ref={(element) => {
        column.current = element === null ? null : columnOf(element);
      }}
    >
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
    </span>
  );
}
