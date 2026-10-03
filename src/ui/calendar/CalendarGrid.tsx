import { useRef } from "react";
import type { KeyboardEvent } from "react";

import type { CapacityClass } from "@/domain/capacity";
import { addDays, keyTargetIso, utcTime } from "@/domain/dates";
import type { IsoDate } from "@/domain/types";
import { intl } from "@/intl/intl";

import styles from "@/ui/calendar/CalendarGrid.module.css";

/** Dot under the number: gauge state of the day (05 § 2.4) or « déjà ouvert » in the date picker (06 § 3.2). */
type CalendarDot = CapacityClass | "marked";

/** One square of the grid, computed by the caller (`weekCells`, `monthCells` and the state of the day). */
export interface CalendarDay {
  iso: IsoDate;
  /** Day of the month, the only text shown in the square. */
  day: number;
  /** Accessible name, already formatted: `calendarDayLabel` (05 § 2.5) or the date picker's (06 § 3.2). */
  label: string;
  /**
   * Day of a neighbouring month in the month view: dimmed in the calendar (`.cal-dim`, 05 § 2.5), an empty square
   * in the date picker (06 § 3.2).
   */
  outside?: boolean | undefined;
  dot?: CalendarDot | null | undefined;
}

export interface CalendarGridProps {
  /** 7 or 42 squares, Monday first. */
  days: readonly CalendarDay[];
  selected: IsoDate | undefined;
  /** Today in Paris: `aria-current="date"`, and the days before it are past. */
  today: IsoDate;
  /** Id of the period label (`CalendarHeader`), which names the grid. */
  labelledBy: string;
  /**
   * `calendar` (05 § 2-3): the arrow keys select a day. `picker` (06 § 3.2-3.3): they only move the focus, past days
   * are `aria-disabled` and cannot be chosen.
   */
  variant?: "calendar" | "picker" | undefined;
  /** The only square reached with Tab; default: the selected day if shown, else the first square (05 § 2.6). */
  tabStop?: IsoDate | undefined;
  /** Click, Enter, Space; in the calendar, also a key that moves the selection (`viaKeyboard`, `replace` in the URL). */
  onSelect: (iso: IsoDate, details: { viaKeyboard: boolean }) => void;
  /** Date picker: a key reached a day that is not shown; the parent shows its month and the day takes the focus. */
  onShowDay?: ((iso: IsoDate) => void) | undefined;
  id?: string | undefined;
  /** `view-transition-name` of the grid, unique in the page (05 § 3.4). */
  transitionName?: string | undefined;
}

// « L M M J V S D » (05 § 2.3): narrow names of the days of a week that starts on a Monday.
const WEEKDAYS = Array.from({ length: 7 }, (_, index) => {
  const iso = addDays("2026-10-05", index);
  return { iso, initial: intl.formatDate(utcTime(iso), { weekday: "narrow", timeZone: "UTC" }) };
});

function weeksOf(days: readonly CalendarDay[]): CalendarDay[][] {
  return Array.from({ length: Math.ceil(days.length / 7) }, (_, week) =>
    days.slice(week * 7, week * 7 + 7),
  );
}

/**
 * The focus is still where the key left it: on `<body>` when its square left the DOM, or on a square of this grid
 * that stayed (a week shared by the two months). Anywhere else, the user moved it: leave it there.
 */
function focusIsInGrid(button: HTMLButtonElement): boolean {
  const active = document.activeElement;
  if (active === null || active === document.body) return true;
  return button.closest("table")?.contains(active) === true;
}

/** « L M M J V S D », hidden from assistive technologies like the legacy `.wd-label` (05 § 2.2). */
function WeekdayHeader() {
  return (
    <thead aria-hidden="true">
      <tr>
        {WEEKDAYS.map((weekday) => (
          <th key={weekday.iso} className={styles["weekday"]}>
            {weekday.initial}
          </th>
        ))}
      </tr>
    </thead>
  );
}

interface DaySquareProps {
  day: CalendarDay;
  selected: boolean;
  today: boolean;
  past: boolean;
  /** Past day of the date picker: announced and focusable, but cannot be chosen (06 § 3.2). */
  disabled: boolean;
  tabbable: boolean;
  onMount: (button: HTMLButtonElement) => void;
  onChoose: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

function DaySquare({
  day,
  selected,
  today,
  past,
  disabled,
  tabbable,
  ...handlers
}: DaySquareProps) {
  return (
    <td aria-selected={selected} className={styles["square"]}>
      <button
        type="button"
        ref={(button) => {
          if (button !== null) handlers.onMount(button);
        }}
        data-iso={day.iso}
        tabIndex={tabbable ? 0 : -1}
        aria-label={day.label}
        aria-current={today ? "date" : undefined}
        aria-disabled={disabled || undefined}
        data-selected={selected || undefined}
        data-today={today || undefined}
        data-past={past || undefined}
        data-outside={day.outside === true || undefined}
        className={styles["day"]}
        onClick={() => {
          if (!disabled) handlers.onChoose();
        }}
        onKeyDown={handlers.onKeyDown}
      >
        <span aria-hidden="true" className={styles["number"]}>
          {day.day}
        </span>
        {day.dot === null || day.dot === undefined ? null : (
          <span aria-hidden="true" data-dot={day.dot} className={styles["dot"]} />
        )}
      </button>
    </td>
  );
}

/**
 * Days of a calendar or of the date picker (PLAN § 3.5, E-05): a `grid` named by the period label, one `<button>`
 * per day in an `aria-selected` cell, a single Tab stop (05 § 2.6), the keys of 05 § 3.2 (`keyTargetIso`).
 * The focus follows the keys without an effect: the handler focuses the target square when it is in the DOM; when
 * the period changes, the new square takes the focus from its ref callback (PLAN § 3.5, `refocusIfOrphaned`).
 */
export function CalendarGrid({
  days,
  selected,
  today,
  labelledBy,
  variant = "calendar",
  tabStop,
  onSelect,
  onShowDay,
  id,
  transitionName,
}: CalendarGridProps) {
  // Day reached by a key that was not in the DOM yet: its square takes the focus when it mounts.
  const pendingFocus = useRef<IsoDate | null>(null);
  const picker = variant === "picker";
  const shown = picker ? days.filter((day) => day.outside !== true) : days;
  const stop = tabStop ?? (shown.some((day) => day.iso === selected) ? selected : shown[0]?.iso);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, iso: IsoDate) {
    const target = keyTargetIso(event.key, iso);
    if (target === null) return;
    event.preventDefault();
    const square = event.currentTarget
      .closest("table")
      ?.querySelector<HTMLButtonElement>(`button[data-iso="${target}"]`);
    if (square === null || square === undefined) pendingFocus.current = target;
    else square.focus({ preventScroll: true });
    if (!picker) onSelect(target, { viaKeyboard: true });
    else if (pendingFocus.current === target) onShowDay?.(target);
  }

  function takePendingFocus(button: HTMLButtonElement, iso: IsoDate) {
    if (pendingFocus.current !== iso) return;
    pendingFocus.current = null;
    if (focusIsInGrid(button)) button.focus({ preventScroll: true });
  }

  return (
    <table
      role="grid"
      id={id}
      aria-labelledby={labelledBy}
      data-variant={variant}
      className={styles["grid"]}
      style={transitionName === undefined ? undefined : { viewTransitionName: transitionName }}
    >
      <WeekdayHeader />
      <tbody>
        {weeksOf(days).map((week) => (
          // Keyed by its Monday: a week shown in two periods keeps its row, and the focus, in the DOM.
          <tr key={week[0]?.iso}>
            {week.map((day) =>
              picker && day.outside === true ? (
                <td key={day.iso} aria-hidden="true" className={styles["square"]} />
              ) : (
                <DaySquare
                  key={day.iso}
                  day={day}
                  selected={day.iso === selected}
                  today={day.iso === today}
                  past={day.iso < today}
                  disabled={picker && day.iso < today}
                  tabbable={day.iso === stop}
                  onMount={(button) => {
                    takePendingFocus(button, day.iso);
                  }}
                  onChoose={() => {
                    pendingFocus.current = null;
                    onSelect(day.iso, { viaKeyboard: false });
                  }}
                  onKeyDown={(event) => {
                    handleKeyDown(event, day.iso);
                  }}
                />
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
