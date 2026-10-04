import { Skeleton } from "@/ui/feedback/Skeleton";

import styles from "@/features/page/ColumnSkeleton.module.css";

const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

interface ColumnSkeletonProps {
  /** Load failure: the shimmer stops (03 § 3, 08 § 4.16). */
  still?: boolean | undefined;
}

/** Calendar and card of a column before any data (legacy/index.html, 08 § 4.16): no text, hidden from assistive tech. */
export function ColumnSkeleton({ still = false }: ColumnSkeletonProps) {
  return (
    <div className={styles["skeleton"]} aria-hidden="true">
      <div className={styles["header"]}>
        <Skeleton shape="circle" still={still} />
        <Skeleton width="40%" still={still} />
        <Skeleton shape="circle" still={still} />
      </div>
      <div className={styles["label"]}>
        <Skeleton shape="title" width="55%" still={still} />
      </div>
      <div className={styles["grid"]}>
        {WEEK.map((day) => (
          <Skeleton key={day} shape="cell" still={still} />
        ))}
      </div>
      <Skeleton shape="card" still={still} />
    </div>
  );
}
