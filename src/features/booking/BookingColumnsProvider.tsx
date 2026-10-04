import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { flushSync } from "react-dom";

import type { Restaurant } from "@/domain/types";
import { BookingColumnsContext } from "@/features/booking/booking-columns";
import type { BookingColumns, BookingSummaryContent } from "@/features/booking/booking-columns";

/**
 * Holds the summary of each public column (D-11: one per restaurant) above the forms, which unmount once they have
 * sent. The summary is ephemeral state: never in the URL nor in a storage (09 PA 5).
 */
export function BookingColumnsProvider({ children }: { children: ReactNode }) {
  const [summaries, setSummaries] = useState<BookingColumns["summaries"]>({
    r1: null,
    r2: null,
  });
  const titles = useRef(new Map<Restaurant, HTMLElement>());
  const returnFocus = useRef(new Set<Restaurant>());
  const value: BookingColumns = {
    summaries,
    show: (summary: BookingSummaryContent) => {
      // The title must be in the DOM before it takes the focus (E-12): the form that called `show` unmounts next.
      flushSync(() => {
        setSummaries((current) => ({ ...current, [summary.restaurant]: summary }));
      });
      titles.current.get(summary.restaurant)?.focus();
    },
    clear: (restaurant) => {
      setSummaries((current) =>
        current[restaurant] === null ? current : { ...current, [restaurant]: null },
      );
    },
    titleRef: (restaurant) => (element) => {
      if (element === null) titles.current.delete(restaurant);
      else titles.current.set(restaurant, element);
    },
    returnFocusToReserve: (restaurant) => {
      returnFocus.current.add(restaurant);
    },
    takeReturnFocus: (restaurant) => returnFocus.current.delete(restaurant),
  };
  return <BookingColumnsContext value={value}>{children}</BookingColumnsContext>;
}
