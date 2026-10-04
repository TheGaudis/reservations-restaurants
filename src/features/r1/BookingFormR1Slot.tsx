import { useSelectedDay } from "@/features/calendar/page-search";
import { useBookingFormR1Module } from "@/features/r1/load-booking-form";
import { Spinner } from "@/ui/feedback/Spinner";

import styles from "@/features/r1/BookingFormR1.module.css";

/**
 * The R1 booking form in the slot `form` of `DayCardR1` (`reserver=r1`). Keyed by day: another day, or a new
 * opening, starts an empty form with a new `requestId` (invariant 3, R-17). A spinner stands in while its chunk
 * loads (R-31).
 */
export function BookingFormR1Slot() {
  const date = useSelectedDay("r1");
  const module = useBookingFormR1Module();
  if (module === null) {
    return (
      <div className={styles["pending"]}>
        <Spinner />
      </div>
    );
  }
  const { BookingFormR1 } = module;
  return <BookingFormR1 key={`r1:${date}`} date={date} />;
}
