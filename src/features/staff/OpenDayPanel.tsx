import { useId } from "react";
import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import type { Restaurant } from "@/domain/types";
import { usePageNavigate, usePageSearch } from "@/features/calendar/page-search";

import styles from "@/features/staff/OpenDayPanel.module.css";

// The « + » turns by 45° when the panel opens (06 § 4); the button is named by the title alone.
const PLUS = "+";

interface OpenDayPanelProps {
  restaurant: Restaurant;
  /** The form, rendered while the panel is open. */
  children: ReactNode;
}

/**
 * Panel « + Ouvrir un jour » above the calendar of `restaurant` (06 § 4, C-04, C-06): closed by default, open while
 * `ouvrir` names the restaurant (PLAN § 3.2). The title is a disclosure button that writes `ouvrir` (`replace`);
 * opening or closing it forgets the date chosen in the picker (`ouvrirDate`).
 */
export function OpenDayPanel({ restaurant, children }: OpenDayPanelProps) {
  const bodyId = useId();
  const search = usePageSearch();
  const navigate = usePageNavigate();
  const open = search.ouvrir === restaurant;
  return (
    <div className={styles["panel"]} data-open={open || undefined}>
      <button
        type="button"
        className={styles["trigger"]}
        aria-expanded={open}
        aria-controls={open ? bodyId : undefined}
        onClick={() => {
          navigate(
            { ...search, ouvrir: open ? undefined : restaurant, ouvrirDate: undefined },
            { replace: true },
          );
        }}
      >
        <span className={styles["plus"]} aria-hidden="true">
          {PLUS}
        </span>
        <span>
          <FormattedMessage
            id="staff.openDay.title"
            defaultMessage="Ouvrir un jour"
            description="06 § 4 — titre du panneau dépliant « + Ouvrir un jour » (R1 et R2)"
          />
        </span>
      </button>
      {open ? (
        <div id={bodyId} className={styles["body"]}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
