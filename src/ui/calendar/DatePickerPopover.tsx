import { Popover } from "@base-ui/react/popover";
import { useId, useState } from "react";
import { defineMessages, useIntl } from "react-intl";
import type { IntlShape } from "react-intl";

import { addMonthsClamped, firstOfMonth, isSameMonth, monthCells } from "@/domain/dates";
import type { IsoDate } from "@/domain/types";
import { formatLongDate, formatMonthLabel } from "@/intl/dates";
import { CalendarGrid } from "@/ui/calendar/CalendarGrid";
import type { CalendarDay } from "@/ui/calendar/CalendarGrid";
import { CalendarHeader } from "@/ui/calendar/CalendarHeader";
import { CalendarIcon } from "@/ui/icons";

import styles from "@/ui/calendar/DatePickerPopover.module.css";

const messages = defineMessages<{
  dialog: Record<string, never>;
  marked: Record<string, never>;
  past: Record<string, never>;
  part: { text: string; part: string };
}>({
  dialog: {
    id: "ui.datePicker.dialog",
    defaultMessage: "Choisir la date",
    description: "06 § 3.2 — aria-label du calendrier déplié du sélecteur de date",
  },
  marked: {
    id: "ui.datePicker.marked",
    defaultMessage: "déjà ouvert",
    description:
      "06 § 3.2 — légende de la pastille et suffixe de l'aria-label d'un jour déjà ouvert",
  },
  past: {
    id: "ui.datePicker.past",
    defaultMessage: "passé",
    description: "06 § 3.2 — suffixe de l'aria-label d'un jour passé du sélecteur de date",
  },
  part: {
    id: "ui.datePicker.part",
    defaultMessage: "{text}, {part}",
    description: "06 § 3.2 — une partie de l'aria-label d'un jour ajoutée après une virgule",
  },
});

export interface DatePickerPopoverProps {
  /** Id of the trigger, for the `<label htmlFor>` of the field (« Date », 06 § 3.1). */
  id: string;
  /** Id of that label: the trigger is named « Date » followed by the date shown. */
  labelId: string;
  value: IsoDate;
  /** Today in Paris: earlier days cannot be chosen (06 § 3.2). */
  today: IsoDate;
  onChange: (iso: IsoDate) => void;
  /** Day the restaurant already opened: dot and « déjà ouvert » (06 § 3.2). */
  isMarked?: ((iso: IsoDate) => boolean) | undefined;
  /** Accent of the popup, rendered in a portal outside the column (PLAN § 3.6). */
  accent?: "r1" | "r2" | undefined;
  invalid?: boolean | undefined;
  /** Error message of the field. */
  describedBy?: string | undefined;
}

/** « {date longue}[, déjà ouvert][, passé] » (06 § 3.2). */
function dayLabel(iso: IsoDate, marked: boolean, past: boolean, intl: IntlShape): string {
  let label = formatLongDate(iso);
  for (const [applies, part] of [
    [marked, messages.marked],
    [past, messages.past],
  ] as const) {
    if (applies) {
      label = intl.formatMessage(messages.part, { text: label, part: intl.formatMessage(part) });
    }
  }
  return label;
}

/** Tab stop of a month (06 § 3.2): the chosen date, else today when shown, else the 1st. */
function tabStopOf(month: IsoDate, value: IsoDate, today: IsoDate): IsoDate {
  if (isSameMonth(value, month)) return value;
  if (isSameMonth(today, month)) return today;
  return firstOfMonth(month);
}

interface MonthPanelProps {
  gridId: string;
  month: IsoDate;
  value: IsoDate;
  today: IsoDate;
  isMarked: ((iso: IsoDate) => boolean) | undefined;
  onMonthChange: (month: IsoDate) => void;
  onChoose: (iso: IsoDate) => void;
}

/** Content of the popup (`.date-picker`, 06 § 3.2): ‹ month ›, the 42 squares and the legend of the dot. */
function MonthPanel({
  gridId,
  month,
  value,
  today,
  isMarked,
  onMonthChange,
  onChoose,
}: MonthPanelProps) {
  const intl = useIntl();
  const monthLabelId = useId();
  const days: CalendarDay[] = monthCells(month).map((cell) => {
    const marked = isMarked?.(cell.iso) === true;
    return {
      iso: cell.iso,
      day: cell.day,
      outside: !cell.inMonth,
      dot: marked ? "marked" : null,
      label: dayLabel(cell.iso, marked, cell.iso < today, intl),
    };
  });
  return (
    <>
      <CalendarHeader
        view="month"
        variant="picker"
        label={formatMonthLabel(month)}
        labelId={monthLabelId}
        onPrevious={() => {
          onMonthChange(addMonthsClamped(firstOfMonth(month), -1));
        }}
        onNext={() => {
          onMonthChange(addMonthsClamped(firstOfMonth(month), 1));
        }}
      />
      <CalendarGrid
        id={gridId}
        variant="picker"
        days={days}
        selected={value}
        today={today}
        labelledBy={monthLabelId}
        tabStop={tabStopOf(month, value, today)}
        onSelect={onChoose}
        onShowDay={onMonthChange}
      />
      <p className={styles["legend"]}>
        <span aria-hidden="true" className={styles["dot"]} />
        {intl.formatMessage(messages.marked)}
      </p>
    </>
  );
}

/**
 * Date field of « Ouvrir un jour » (06 § 3): a trigger with the long date and a month grid in a Base UI popover.
 * The arrow keys only move the focus and change the month when needed; Enter, Space or a click on a day that is not
 * past chooses it and gives the focus back to the trigger; Escape does the same without choosing; a press outside
 * closes without moving the focus.
 */
export function DatePickerPopover({
  id,
  labelId,
  value,
  today,
  onChange,
  isMarked,
  accent,
  invalid,
  describedBy,
}: DatePickerPopoverProps) {
  const intl = useIntl();
  const valueId = useId();
  const gridId = useId();
  const [open, setOpen] = useState(false);
  // False after a press outside the popup: the focus stays where the user pressed (06 § 3.3).
  const [returnFocus, setReturnFocus] = useState(true);
  const [month, setMonth] = useState(value);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next, details) => {
        if (next) setMonth(value);
        setReturnFocus(details.reason !== "outside-press");
        setOpen(next);
      }}
    >
      <Popover.Trigger
        id={id}
        className={styles["trigger"]}
        aria-labelledby={`${labelId} ${valueId}`}
        aria-invalid={invalid === true || undefined}
        aria-describedby={describedBy}
      >
        <span id={valueId}>{formatLongDate(value)}</span>
        <CalendarIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8} data-accent={accent}>
          <Popover.Popup
            aria-label={intl.formatMessage(messages.dialog)}
            className={styles["popup"]}
            // The day with tabindex="0" of the month shown: the chosen date when it is there (06 § 3.3).
            initialFocus={() =>
              document.querySelector<HTMLElement>(`#${CSS.escape(gridId)} [tabindex="0"]`)
            }
            finalFocus={returnFocus}
          >
            <MonthPanel
              gridId={gridId}
              month={month}
              value={value}
              today={today}
              isMarked={isMarked}
              onMonthChange={setMonth}
              onChoose={(iso) => {
                onChange(iso);
                setReturnFocus(true);
                setOpen(false);
              }}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
