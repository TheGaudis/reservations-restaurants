import { useState } from "react";
import type { ReactNode } from "react";

import { BookingColumnsContext, columnFocus } from "@/features/booking/booking-columns";
import type { BookingColumns, BookingSummaryContent } from "@/features/booking/booking-columns";
import { requestFocus } from "@/ui/pending-focus";

/**
 * Holds the summary of each public column (D-11: one per restaurant) above the forms, which unmount once they have
 * sent. The summary is ephemeral state: never in the URL nor in a storage (09 PA 5).
 */
export function BookingColumnsProvider({ children }: { children: ReactNode }) {
  const [summaries, setSummaries] = useState<BookingColumns["summaries"]>({
    r1: null,
    r2: null,
  });
  const value: BookingColumns = {
    summaries,
    show: (summary: BookingSummaryContent) => {
      // « Réserver » removed the previous summary: this one mounts, and its title takes the focus (E-12).
      requestFocus(columnFocus.summary(summary.restaurant));
      setSummaries((current) => ({ ...current, [summary.restaurant]: summary }));
    },
    clear: (restaurant) => {
      setSummaries((current) =>
        current[restaurant] === null ? current : { ...current, [restaurant]: null },
      );
    },
  };
  return <BookingColumnsContext value={value}>{children}</BookingColumnsContext>;
}
