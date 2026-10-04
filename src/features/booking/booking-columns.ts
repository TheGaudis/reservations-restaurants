import { createContext, use } from "react";

import type { SummaryR1, SummaryR2 } from "@/domain/bookings";
import type { Restaurant } from "@/domain/types";

/** Content of a booking summary (04 § 7): R1 or R2, built by `summaryR1` / `summaryR2` of domain/bookings.ts. */
export type BookingSummaryContent = SummaryR1 | SummaryR2;

/**
 * Element that takes the focus when it mounts: the first field of a form opened by « Réserver », « Réserver » again
 * after « Annuler » (04 § 5.1). A form opened by a link or a reload leaves the focus alone.
 */
type FocusTarget = "form" | "reserve";

/**
 * State of the public columns that outlives the booking form (D-11): one summary per column, kept in memory only
 * (09 PA 5), and the focus handed over between « Réserver » and its form.
 */
export interface BookingColumns {
  /** Summary of each column; shown while its day stays selected (04 § 7). */
  summaries: Readonly<Record<Restaurant, BookingSummaryContent | null>>;
  /** Shows the summary of a booking just made and moves the focus to its title (04 § 7, E-12). */
  show: (summary: BookingSummaryContent) => void;
  /** Removes the summary of a column: « Fermer », a day chosen in its calendar, « Réserver » (04 § 7). */
  clear: (restaurant: Restaurant) => void;
  /** Ref of the title of a column's summary, the element that `show` focuses. */
  titleRef: (restaurant: Restaurant) => (element: HTMLElement | null) => void;
  /** The next `target` of this column to mount takes the focus (« Réserver » → form, « Annuler » → « Réserver »). */
  requestFocus: (target: FocusTarget, restaurant: Restaurant) => void;
  /** True once after `requestFocus`: read by the element when it mounts. */
  takeFocusRequest: (target: FocusTarget, restaurant: Restaurant) => boolean;
}

const noop = () => {
  // Outside the public page (staff mode, isolated stories): no summary to keep.
};

/** Without a provider (staff page, stories of a calendar), the columns keep nothing. */
export const BookingColumnsContext = createContext<BookingColumns>({
  summaries: { r1: null, r2: null },
  show: noop,
  clear: noop,
  titleRef: () => noop,
  requestFocus: noop,
  takeFocusRequest: () => false,
});

/** Summaries and focus hand-over of the public columns (`BookingColumnsProvider`). */
export function useBookingColumns(): BookingColumns {
  return use(BookingColumnsContext);
}
