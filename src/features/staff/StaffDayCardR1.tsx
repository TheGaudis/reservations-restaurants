import { defineMessage, FormattedMessage, useIntl } from "react-intl";

import { useToday } from "@/background/clock";
import { capacityClass, findDay, remainingSeats } from "@/domain/capacity";
import { isPast } from "@/domain/cutoff";
import { gaugePercent } from "@/domain/gauge";
import {
  DayActions,
  DayCard,
  DayCardTop,
  TextBlock,
  ThemeBlock,
} from "@/features/calendar/DayCard";
import { useSelectedDay } from "@/features/calendar/page-search";
import { PrintListButton } from "@/features/print/PrintListButton";
import { AddBookingButton, AddBookingForm } from "@/features/staff/AddBookingForm";
import { BookingListR1 } from "@/features/staff/BookingList";
import { DeleteDayButton } from "@/features/staff/DeleteDayButton";
import { EditDayButtonR1, EditDayFormR1 } from "@/features/staff/EditDayFormR1";
import { OpenedBy, StaffNoServiceCard } from "@/features/staff/StaffDayCard";
import { useFullState } from "@/features/staff/use-staff-state";
import { CapacityPill } from "@/ui/feedback/CapacityPill";

const menuMessage = defineMessage({
  id: "staff.r1.dayCard.menu",
  defaultMessage: "Menu du jour",
  description: "05 § 4.4 — surtitre du bloc menu de la fiche R1 collègue",
});

/**
 * Staff card of the selected R1 day (05 § 5.1, § 5.3, C-10, C-10b): date and gauge, theme, menu, « Ouvert par », the
 * bookings, the actions (past days included), then the forms. Never « Réserver ». Each staff block is a slot in the
 * file of the session that fills it (journal p5a, « Interfaces du socle »).
 */
export function StaffDayCardR1() {
  const intl = useIntl();
  const iso = useSelectedDay("r1");
  const past = isPast(iso, useToday());
  const state = useFullState();
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
      <TextBlock label={intl.formatMessage(menuMessage)} text={day.menu} />
      <OpenedBy name={day.openedBy} />
      <BookingListR1 day={day} />
      <DayActions>
        <AddBookingButton restaurant="r1" day={day} />
        <EditDayButtonR1 day={day} />
        <PrintListButton restaurant="r1" iso={iso} />
        <DeleteDayButton restaurant="r1" iso={iso} />
      </DayActions>
      <AddBookingForm restaurant="r1" day={day} />
      <EditDayFormR1 day={day} />
    </DayCard>
  );
}
