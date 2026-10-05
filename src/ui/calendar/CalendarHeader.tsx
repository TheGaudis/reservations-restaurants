import type { ReactNode } from "react";
import { defineMessages, useIntl } from "react-intl";

import { IconButton } from "@/ui/button/IconButton";
import { ChevronNextIcon, ChevronPrevIcon } from "@/ui/icons";

import styles from "@/ui/calendar/CalendarHeader.module.css";

const messages = defineMessages({
  previousWeek: {
    id: "ui.calendar.previousWeek",
    defaultMessage: "Semaine précédente",
    description: "05 § 2.3 — aria-label du bouton ‹ en vue semaine",
  },
  nextWeek: {
    id: "ui.calendar.nextWeek",
    defaultMessage: "Semaine suivante",
    description: "05 § 2.3 — aria-label du bouton › en vue semaine",
  },
  previousMonth: {
    id: "ui.calendar.previousMonth",
    defaultMessage: "Mois précédent",
    description: "05 § 2.3, 06 § 3.2 — aria-label du bouton ‹ en vue mois et du sélecteur de date",
  },
  nextMonth: {
    id: "ui.calendar.nextMonth",
    defaultMessage: "Mois suivant",
    description: "05 § 2.3, 06 § 3.2 — aria-label du bouton › en vue mois et du sélecteur de date",
  },
});

export interface CalendarHeaderProps {
  /** Unit of ‹ ›, which names them (05 § 2.3). */
  view: "week" | "month";
  /** « 5 – 11 oct. 2026 », « Octobre 2026 »: `formatPeriodLabel` or `formatMonthLabel` of `intl/dates.ts`. */
  label: string;
  /** Id of the label: `CalendarGrid` is named by it. */
  labelId: string;
  /** ‹ › (05 § 3.1, 06 § 3.3): the period changes, the focus stays on the button. */
  onPrevious: () => void;
  onNext: () => void;
  /** `calendar`: tonal ‹ › of a column; `picker`: plain ‹ › and a smaller label (06 § 3.2). */
  variant?: "calendar" | "picker" | undefined;
  /** Second row of a column calendar (`.cal-toggle`, 05 § 2.2): « Semaine | Mois » and « Aujourd'hui ». */
  children?: ReactNode;
  /**
   * Name of the label in a view transition, unique in the page: the page's stylesheet turns it into a
   * `view-transition-name` only while its restaurant moves (05 § 3.4).
   */
  transitionName?: string | undefined;
}

/**
 * ‹ {period} › above a grid (`.cal-header`, 05 § 2.2; `.dp-head`, 06 § 3.2). The label is a polite live region:
 * a screen reader hears the new week or month after ‹ ›.
 */
export function CalendarHeader({
  view,
  label,
  labelId,
  onPrevious,
  onNext,
  variant = "calendar",
  children,
  transitionName,
}: CalendarHeaderProps) {
  const intl = useIntl();
  const tone = variant === "calendar" ? "tonal" : "standard";
  return (
    <div className={styles["header"]} data-variant={variant}>
      <div className={styles["navigation"]}>
        <IconButton
          tone={tone}
          aria-label={intl.formatMessage(
            view === "week" ? messages.previousWeek : messages.previousMonth,
          )}
          onClick={onPrevious}
        >
          <ChevronPrevIcon />
        </IconButton>
        <div
          id={labelId}
          aria-live="polite"
          className={styles["label"]}
          data-transition-name={transitionName}
        >
          {label}
        </div>
        <IconButton
          tone={tone}
          aria-label={intl.formatMessage(view === "week" ? messages.nextWeek : messages.nextMonth)}
          onClick={onNext}
        >
          <ChevronNextIcon />
        </IconButton>
      </div>
      {children === undefined ? null : <div className={styles["toolbar"]}>{children}</div>}
    </div>
  );
}
