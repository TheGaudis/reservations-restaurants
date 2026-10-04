import { useId } from "react";
import type { ReactNode } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { useToday } from "@/background/clock";
import { portionsBookedForDay, seatsBooked } from "@/domain/capacity";
import { addDays } from "@/domain/dates";
import type { FullState, IsoDate } from "@/domain/types";
import { TomorrowBlocks } from "@/features/staff/TomorrowBlocks";
import { useStaffState } from "@/features/staff/use-staff-state";
import { formatLongDate } from "@/intl/dates";

import styles from "@/features/staff/TomorrowPanel.module.css";

// Slot `tomorrow` of `StaffPage` (journal p5a): panel « Demain ({date}) », first of the staff mode, which merges the
// old « Demain » and « Résumé pour demain » panels (06 § 2.1, 07 § 5, D-07, E-30, C-01, C-03). The totals row is here;
// the blocks per restaurant and their print buttons are in `TomorrowBlocks`.

const messages = defineMessages<{ title: { date: string } }>({
  title: {
    id: "staff.tomorrow.title",
    defaultMessage: "Demain ({date})",
    description: "06 § 2.1, D-07 — titre du panneau du lendemain ; date longue",
  },
});

/** Number of a total, in bold (06 § 2.1). */
function bold(chunks: ReactNode[]) {
  return <b>{chunks}</b>;
}

/** Seats and portions booked for `tomorrow`; bookings of a deleted dish are left out (D-07, b-3, E-30). */
function totalsOf(state: FullState, tomorrow: IsoDate) {
  return {
    name1: state.settings.name1,
    name2: state.settings.name2,
    seats: seatsBooked(state, tomorrow),
    portions: portionsBookedForDay(state, tomorrow),
  };
}

/**
 * Panel « Demain ({date}) », above « Paramètres » (06 § 2): tomorrow in Paris (D-12), then the seats booked in
 * restaurant 1 and the portions booked in restaurant 2, numbers in bold (06 § 2.1). A region named by its title.
 */
export function TomorrowPanel() {
  const intl = useIntl();
  const titleId = useId();
  const tomorrow = addDays(useToday(), 1);
  const { name1, name2, seats, portions } = useStaffState((state) => totalsOf(state, tomorrow));
  return (
    <section className={styles["panel"]} aria-labelledby={titleId}>
      {/* h3 as in the old page (06 § 2.1): the h2 headings are the column titles. */}
      <h3 id={titleId} className={styles["title"]}>
        {intl.formatMessage(messages.title, { date: formatLongDate(tomorrow) })}
      </h3>
      <div className={styles["totals"]}>
        <p className={styles["total"]}>
          <FormattedMessage
            id="staff.tomorrow.seats"
            defaultMessage="{name} : {count, plural, one {<b>#</b> couvert réservé} other {<b>#</b> couverts réservés}}"
            description="06 § 2.1 — couverts réservés pour demain au restaurant 1 ; name : nom du restaurant 1"
            values={{ name: name1, count: seats, b: bold }}
          />
        </p>
        <p className={styles["total"]}>
          <FormattedMessage
            id="staff.tomorrow.portions"
            defaultMessage="{name} : {count, plural, one {<b>#</b> portion réservée} other {<b>#</b> portions réservées}}"
            description="06 § 2.1 — portions réservées pour demain au restaurant 2 ; name : nom du restaurant 2"
            values={{ name: name2, count: portions, b: bold }}
          />
        </p>
      </div>
      <TomorrowBlocks tomorrow={tomorrow} />
    </section>
  );
}
