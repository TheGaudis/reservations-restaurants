import { useSelectedDay } from "@/features/calendar/page-search";
import { useOrderFormR2Module } from "@/features/r2/load-order-form";
import { Spinner } from "@/ui/feedback/Spinner";

import styles from "@/features/r2/OrderFormR2.module.css";

/**
 * The R2 order form in the slot `form` of `DayCardR2` (`reserver=r2`). Keyed by day: another day, or a new opening,
 * starts an empty form with a new `requestId` (invariant 3) and reads its `defaultValues` again. A spinner stands in
 * while its chunk loads (R-31).
 */
export function OrderFormR2Slot() {
  const date = useSelectedDay("r2");
  const module = useOrderFormR2Module();
  if (module === null) {
    return (
      <div className={styles["pending"]}>
        <Spinner />
      </div>
    );
  }
  const { OrderFormR2 } = module;
  return <OrderFormR2 key={`r2:${date}`} date={date} />;
}
