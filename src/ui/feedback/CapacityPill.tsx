import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import type { CapacityClass } from "@/domain/capacity";

import styles from "@/ui/feedback/CapacityPill.module.css";

export interface CapacityPillProps {
  /** Share still free, 0 to 100 (`gaugePercent` of `domain/gauge.ts`). */
  percent: number;
  /** State from `capacityClass` (01 § 3.3): green, orange, red. */
  state: CapacityClass;
  /** Counts, already formatted: « 12 / 20 couverts » (R1), « 3 / 10 » (R2 dish) (05 § 4.5). */
  children: ReactNode;
  /** Word of the red state when « Complet » does not fit: « Épuisé » for a dish (D-02). */
  fullLabel?: ReactNode;
}

/**
 * Capacity gauge (08 § 4.8, 05 § 4.5) and, for the orange and red states, the state word next to it (D-02): a colour
 * never speaks alone (08 § 8).
 */
export function CapacityPill({ percent, state, children, fullLabel }: CapacityPillProps) {
  return (
    <span className={styles["gauge"]}>
      <span className={styles["pill"]} data-state={state}>
        <span className={styles["fill"]} style={{ width: `${percent}%` }} />
        {children}
      </span>
      {state === "almostFull" ? (
        <span className={styles["word"]} data-state={state}>
          <FormattedMessage
            id="public.dayCard.status.almostFull"
            defaultMessage="Bientôt complet"
            description="D-02 — mot d'état à côté de la jauge, état orange"
          />
        </span>
      ) : null}
      {state === "full" ? (
        <span className={styles["word"]} data-state={state}>
          {fullLabel ?? (
            <FormattedMessage
              id="public.dayCard.status.full"
              defaultMessage="Complet"
              description="D-02 — mot d'état à côté de la jauge, état rouge"
            />
          )}
        </span>
      ) : null}
    </span>
  );
}
