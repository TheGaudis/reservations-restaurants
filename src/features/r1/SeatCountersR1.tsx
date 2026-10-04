import { FormattedMessage } from "react-intl";

import type { SeatCountValues } from "@/domain/bookings";
import { priceR1, seatTotal } from "@/domain/pricing";
import type { R1Prices } from "@/domain/pricing";
import { countValue } from "@/domain/validation";
import { formatEuros, r1TotalText } from "@/intl/amounts";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { withFieldGroup } from "@/ui/form/app-form";
import { errorText } from "@/ui/form/errors";

import styles from "@/features/r1/SeatCountersR1.module.css";

// Red round before the message (08 § 4.6), outside the element that `aria-describedby` reads.
const MARK = "!";

/** « 3 couverts · Total : 16,00 € »: a string, so that the subscription renders only when the text changes. */
function liveTotal(values: SeatCountValues, prices: R1Prices): string {
  const counts = {
    students: countValue(values.students),
    staffMembers: countValue(values.staffMembers),
    externals: countValue(values.externals),
  };
  return r1TotalText(seatTotal(counts), priceR1(prices, counts));
}

const seatDefaults: SeatCountValues = { students: null, staffMembers: null, externals: null };

const COUNTERS = [
  { name: "students", label: commonMessages.students, price: "priceStudent" },
  { name: "staffMembers", label: commonMessages.staffMembers, price: "priceStaff" },
  { name: "externals", label: commonMessages.externals, price: "priceExternal" },
] as const;

interface SeatCountersProps {
  /** Seats left that day: legend « Nombre de personnes ({max} au maximum) » (04 § 5.2). */
  max: number;
  /** Prices of the state shown, in the labels (« Élèves · 4,95 € ») and the live total. */
  prices: R1Prices;
  /** Id of the message under the row, unique in the page (`useId` of the form). */
  errorId: string;
  /**
   * Help under the legend; empty: none. Edit of a booking made before the prices: « Réservation enregistrée avant les
   * tarifs : indiquez la répartition de ses 4 couverts. » (06 § 7.3).
   */
  help?: string | undefined;
}

const seatProps: SeatCountersProps = {
  max: 0,
  prices: { priceStudent: 0, priceStaff: 0, priceExternal: 0 },
  errorId: "",
  help: "",
};

/**
 * « Nombre de personnes ({max} au maximum) »: Élèves, Personnels, Extérieurs with their prices and −/+ buttons
 * (04 § 5.2, D-17), one message under the row for the three counters (`seatErrors`, D-18), then the live total
 * « 3 couverts · Total : 16,00 € », exact from the start (D-03, E-28). Bound to the fields `students`,
 * `staffMembers`, `externals` of the form.
 */
export const SeatCountersR1 = withFieldGroup({
  defaultValues: seatDefaults,
  props: seatProps,
  render: ({ group, max, prices, errorId, help = "" }) => (
    <>
      <fieldset className={styles["group"]}>
        <legend className={styles["legend"]}>
          <FormattedMessage {...commonMessages.seatsLegend} values={{ max }} />
        </legend>
        {help === "" ? null : <p className={styles["help"]}>{help}</p>}
        <div className={styles["row"]}>
          {COUNTERS.map((counter) => {
            const label = intl.formatMessage(counter.label);
            return (
              <group.AppField key={counter.name} name={counter.name}>
                {(field) => (
                  <field.NumberField
                    label={intl.formatMessage(commonMessages.counterWithPrice, {
                      label,
                      price: formatEuros(prices[counter.price]),
                    })}
                    decrementLabel={intl.formatMessage(commonMessages.counterDecrement, { label })}
                    incrementLabel={intl.formatMessage(commonMessages.counterIncrement, { label })}
                    errorShownBy={errorId}
                  />
                )}
              </group.AppField>
            );
          })}
        </div>
        <group.Field name="students">
          {(field) => {
            const message = errorText(field.state.meta.errors);
            return message === "" ? null : (
              <p className={styles["error"]}>
                <span className={styles["mark"]} aria-hidden="true">
                  {MARK}
                </span>
                <span id={errorId}>{message}</span>
              </p>
            );
          }}
        </group.Field>
      </fieldset>
      <group.Subscribe selector={(state) => liveTotal(state.values, prices)}>
        {(total) => (
          <p className={styles["total"]} aria-live="polite">
            {total}
          </p>
        )}
      </group.Subscribe>
    </>
  ),
});
