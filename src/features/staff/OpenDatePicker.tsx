import { useId } from "react";
import { useIntl } from "react-intl";

import { useToday } from "@/background/clock";
import { dayStatusR1, dayStatusR2 } from "@/domain/capacity";
import type { FullState, IsoDate, Restaurant } from "@/domain/types";
import { usePageNavigate, usePageSearch } from "@/features/calendar/page-search";
import { useStaffState } from "@/features/staff/use-staff-state";
import { staffCommonMessages } from "@/intl/staff-messages";
import { DatePickerPopover } from "@/ui/calendar/DatePickerPopover";
import { Alert } from "@/ui/feedback/Alert";

import styles from "@/features/staff/OpenDatePicker.module.css";

// Round « ! » before an error message, as the fields of ui/form (08 § 4.6).
const MARK = "!";

const whole = (state: FullState): FullState => state;

interface OpenDatePickerProps {
  restaurant: Restaurant;
  /** `useOpenDate(restaurant)`. */
  date: IsoDate;
  /** Refusal of the date, shown once the form was sent (D-19). */
  error: string | null;
  /** Note under the field: an R2 day already open (D-19). */
  warning?: string | null | undefined;
}

/**
 * Field « Date » of « Ouvrir un jour » (06 § 3, C-05): the picker of `ui/` on the days of the restaurant, a dot on
 * the days already open; the date chosen goes in the URL (`ouvrirDate`, `replace`). Once the form was sent, the error
 * follows the date: a valid choice clears it (06 § 3.3), another refused date shows its own message (E-46).
 */
export function OpenDatePicker({ restaurant, date, error, warning }: OpenDatePickerProps) {
  const intl = useIntl();
  const id = useId();
  const labelId = useId();
  const errorId = useId();
  const today = useToday();
  const state = useStaffState(whole);
  const search = usePageSearch();
  const navigate = usePageNavigate();
  const status = restaurant === "r1" ? dayStatusR1 : dayStatusR2;
  return (
    <div className={styles["field"]}>
      <label id={labelId} htmlFor={id} className={styles["label"]}>
        {intl.formatMessage(staffCommonMessages.dateLabel)}
      </label>
      <DatePickerPopover
        id={id}
        labelId={labelId}
        value={date}
        today={today}
        accent={restaurant}
        isMarked={(iso) => status(state, iso) !== null}
        invalid={error !== null}
        describedBy={error === null ? undefined : errorId}
        onChange={(iso) => {
          navigate({ ...search, ouvrir: restaurant, ouvrirDate: iso }, { replace: true });
        }}
      />
      {error === null ? null : (
        <p className={styles["error"]}>
          <span className={styles["mark"]} aria-hidden="true">
            {MARK}
          </span>
          <span id={errorId}>{error}</span>
        </p>
      )}
      {warning === null || warning === undefined ? null : (
        <Alert variant="note" tone="warning" live="status">
          {warning}
        </Alert>
      )}
    </div>
  );
}
