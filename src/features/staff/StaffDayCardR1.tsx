import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { useToday } from "@/background/clock";
import { capacityClass, findDay, remainingSeats } from "@/domain/capacity";
import { isPast } from "@/domain/cutoff";
import { gaugePercent } from "@/domain/gauge";
import type { FullState } from "@/domain/types";
import {
  DayActions,
  DayCard,
  DayCardTop,
  TextBlock,
  ThemeBlock,
} from "@/features/calendar/DayCard";
import { useSelectedDay } from "@/features/calendar/page-search";
import { PrintListButton } from "@/features/print/PrintListButton";
import { AddBookingButtonR1, AddBookingFormR1 } from "@/features/staff/AddBookingFormR1";
import { BookingListR1 } from "@/features/staff/BookingList";
import { DeleteDayButton } from "@/features/staff/DeleteDayButton";
import { EditDayButtonR1, EditDayFormR1 } from "@/features/staff/EditDayFormR1";
import { OpenedBy, StaffNoServiceCard } from "@/features/staff/StaffDayCard";
import { useStaffState } from "@/features/staff/use-staff-state";
import { CapacityPill } from "@/ui/feedback/CapacityPill";

const messages = defineMessages<{
  menu: Record<string, never>;
}>({
  menu: {
    id: "staff.r1.dayCard.menu",
    defaultMessage: "Menu du jour",
    description: "05 § 4.4 — surtitre du bloc menu de la fiche R1 collègue",
  },
});

const whole = (state: FullState): FullState => state;

/**
 * Staff card of the selected R1 day (05 § 5.1, § 5.3, C-10, C-10b): date and gauge, theme, menu, « Ouvert par », the
 * bookings, the actions (past days included), then the forms. Never « Réserver ». Each staff block is a slot in the
 * file of the session that fills it (journal p5a, « Interfaces du socle »).
 */
export function StaffDayCardR1() {
  const intl = useIntl();
  const iso = useSelectedDay("r1");
  const past = isPast(iso, useToday());
  const state = useStaffState(whole);
  const day = findDay(state.r1Days, iso);
  if (day === undefined) return <StaffNoServiceCard iso={iso} past={past} />;
  const remaining = remainingSeats(state, day);
  return (
    <DayCard past={past}>
      <DayCardTop iso={iso}>
        <CapacityPill
          percent={gaugePercent(remaining, day.capacity)}
          state={capacityClass(remaining, day.capacity)}
        >
          <FormattedMessage
            id="staff.r1.dayCard.seats"
            defaultMessage="{remaining} / {capacity} couverts"
            description="05 § 4.5 — jauge de la fiche R1 collègue (restant négatif possible)"
            values={{ remaining: String(remaining), capacity: String(day.capacity) }}
          />
        </CapacityPill>
      </DayCardTop>
      <ThemeBlock text={day.theme} />
      <TextBlock label={intl.formatMessage(messages.menu)} text={day.menu} />
      <OpenedBy name={day.openedBy} />
      <BookingListR1 day={day} />
      <DayActions>
        <AddBookingButtonR1 day={day} />
        <EditDayButtonR1 day={day} />
        <PrintListButton restaurant="r1" iso={iso} />
        <DeleteDayButton restaurant="r1" iso={iso} />
      </DayActions>
      <AddBookingFormR1 day={day} />
      <EditDayFormR1 day={day} />
    </DayCard>
  );
}
