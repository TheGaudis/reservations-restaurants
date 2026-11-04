import type { ReactNode } from "react";

import type { Restaurant } from "@/domain/types";
import { columnTexts, useSkeletonTexts } from "@/features/page/page-texts";
import type { PageTexts } from "@/features/page/page-texts";
import { Skeleton } from "@/ui/feedback/Skeleton";

import styles from "@/features/page/PageSkeleton.module.css";

const RESTAURANTS: readonly Restaurant[] = ["r1", "r2"];
const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Calendar and card of a column before any data (legacy/index.html, 08 § 4.16): no text, hidden from assistive tech. */
function ColumnSkeleton({ still }: { still: boolean }) {
  return (
    <div className={styles["skeleton"]} aria-hidden="true">
      <div className={styles["skeletonHeader"]}>
        <Skeleton shape="circle" still={still} />
        <Skeleton width="40%" still={still} />
        <Skeleton shape="circle" still={still} />
      </div>
      <div className={styles["skeletonLabel"]}>
        <Skeleton shape="title" width="55%" still={still} />
      </div>
      <div className={styles["skeletonGrid"]}>
        {WEEK.map((day) => (
          <Skeleton key={day} shape="cell" still={still} />
        ))}
      </div>
      <Skeleton shape="card" still={still} />
    </div>
  );
}

interface PageMainProps {
  /** Names and descriptions of the columns (05 § 1). */
  texts: PageTexts;
  /** Staff panels, then the load error box (06 § 2, 08 § 7.1). */
  top?: ReactNode;
  /** Calendar and day card of each column; absent: the skeleton. */
  columns?: Record<Restaurant, ReactNode> | undefined;
  /** No data yet (`aria-busy`, 03 § 3). */
  busy?: boolean;
  /** Load failure: the shimmer of the skeleton stops (03 § 3, 08 § 4.16). */
  still?: boolean;
}

/**
 * `<main>` of every page state (08 § 7.1, § 7.3): what goes above the columns, then the two columns side by side, each
 * with its accent, name, description, then its content or its skeleton.
 */
export function PageMain({ texts, top, columns, busy = false, still = false }: PageMainProps) {
  return (
    <main className={styles["main"]} aria-busy={busy}>
      {top}
      <div className={styles["columns"]}>
        {RESTAURANTS.map((restaurant) => {
          const { title, description } = columnTexts(texts, restaurant);
          return (
            <section key={restaurant} className={styles["column"]} data-accent={restaurant}>
              <h2 className={styles["title"]}>{title}</h2>
              <p className={styles["description"]}>{description}</p>
              {columns === undefined ? <ColumnSkeleton still={still} /> : columns[restaurant]}
            </section>
          );
        })}
      </div>
    </main>
  );
}

/**
 * `<main>` before any data (G-01, 03 § 3): titles and descriptions of the last visit (03 § 1.2) or the defaults, a
 * skeleton in each column, no « Chargement » text. Pending component of the routes, under the header of the root.
 */
export function PageSkeleton() {
  return <PageMain texts={useSkeletonTexts()} busy />;
}
