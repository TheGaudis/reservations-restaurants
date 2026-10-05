import { createContext, use } from "react";

import type { SummaryR1, SummaryR2 } from "@/domain/bookings";
import type { Restaurant } from "@/domain/types";
import { useCloseForm } from "@/features/calendar/page-search";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { showToast } from "@/ui/feedback/toast";

/** Content of a booking summary (04 § 7): R1 or R2, built by `summaryR1` / `summaryR2` of domain/bookings.ts. */
export type BookingSummaryContent = SummaryR1 | SummaryR2;

/**
 * Focus keys of a column (ui/pending-focus.ts, 04 § 5.1, E-12): « Réserver » hands the focus to the first field of its
 * form, « Annuler » back to « Réserver », a booking to the title of its summary.
 */
export const columnFocus = {
  form: (restaurant: Restaurant) => `form:${restaurant}`,
  reserve: (restaurant: Restaurant) => `reserve:${restaurant}`,
  summary: (restaurant: Restaurant) => `summary:${restaurant}`,
};

/**
 * State of the public columns that outlives the booking form (D-11): one summary per column, kept in memory only
 * (09 PA 5).
 */
export interface BookingColumns {
  /** Summary of each column; shown while its day stays selected (04 § 7). */
  summaries: Readonly<Record<Restaurant, BookingSummaryContent | null>>;
  /** Shows the summary of a booking just made; its title takes the focus (04 § 7, E-12). */
  show: (summary: BookingSummaryContent) => void;
  /** Removes the summary of a column: « Fermer », a day chosen in its calendar, « Réserver » (04 § 7). */
  clear: (restaurant: Restaurant) => void;
}

const noop = () => {
  // Outside the public page (staff mode, isolated stories): no summary to keep.
};

/** Without a provider (staff page, stories of a calendar), the columns keep nothing. */
export const BookingColumnsContext = createContext<BookingColumns>({
  summaries: { r1: null, r2: null },
  show: noop,
  clear: noop,
});

/** Summaries of the public columns (`BookingColumnsProvider`). */
export function useBookingColumns(): BookingColumns {
  return use(BookingColumnsContext);
}

/** `reserver={restaurant}` leaves the URL (`replace`), unless the visitor already moved to another form. */
export function useCloseBookingForm(restaurant: Restaurant): () => void {
  const closeForm = useCloseForm();
  return () => {
    closeForm((previous) =>
      previous.reserver === restaurant ? { ...previous, reserver: undefined } : previous,
    );
  };
}

/** After a booking, if the form is still there: summary, toast, form closed (04 § 6.3, § 7, D-16, E-12). */
export function useBookingDone(restaurant: Restaurant) {
  const columns = useBookingColumns();
  const close = useCloseBookingForm(restaurant);
  return (summary: BookingSummaryContent, duplicate: boolean) => {
    columns.show(summary);
    if (duplicate) {
      showToast(intl.formatMessage(commonMessages.bookingDuplicate), "neutral");
    } else {
      showToast(intl.formatMessage(commonMessages.bookingConfirmed));
    }
    close();
  };
}
