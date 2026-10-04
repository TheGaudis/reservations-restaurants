import { useIsMutating } from "@tanstack/react-query";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { useToday } from "@/background/clock";
import { capacityClass, findDay, remainingSeats } from "@/domain/capacity";
import { isPast } from "@/domain/cutoff";
import { gaugePercent } from "@/domain/gauge";
import {
  DayCard,
  DayNote,
  NoServiceCard,
  TextBlock,
  ThemeBlock,
} from "@/features/calendar/DayCard";
import { usePageSearch, useSelectedDay } from "@/features/calendar/page-search";
import { ReserveButton } from "@/features/calendar/ReserveButton";
import { useShownState } from "@/features/calendar/use-shown-state";
import { bookingFormR1Chunk } from "@/features/page/lazy-chunks";
import { BookingFormR1Slot } from "@/features/r1/BookingFormR1Slot";
import { bookingKeys } from "@/mutations/booking-keys";
import { CapacityPill } from "@/ui/feedback/CapacityPill";

const messages = defineMessages<{
  menu: Record<string, never>;
}>({
  menu: {
    id: "public.r1.dayCard.menu",
    defaultMessage: "Menu du jour",
    description: "05 § 4.4, 04 § 4.2 — surtitre du bloc menu de la fiche R1",
  },
});

/**
 * Public card of the selected R1 day (05 § 5, P-03, P-04, P-07, P-08): date and seat gauge, theme, menu, then
 * « Réserver » when seats are left and the day is not past (R1 has no time limit, 01 § 3.7), or the booking form
 * while `reserver=r1`. A full day says « Complet. » (D-02); a past day pales (E-56) and says nothing.
 */
export function DayCardR1() {
  const intl = useIntl();
  const iso = useSelectedDay("r1");
  const past = isPast(iso, useToday());
  const formOpen = usePageSearch().reserver === "r1";
  // A booking that takes the last seats keeps its form until its answer has been handled (summary, toast).
  const sending = useIsMutating({ mutationKey: bookingKeys.r1() }) > 0;
  const state = useShownState();
  const day = findDay(state.r1Days, iso);
  if (day === undefined) return <NoServiceCard iso={iso} past={past} />;
  const remaining = remainingSeats(state, day);
  const full = remaining <= 0;
  const gauge = (
    <CapacityPill
      percent={gaugePercent(remaining, day.capacity)}
      state={capacityClass(remaining, day.capacity)}
    >
      <FormattedMessage
        id="public.r1.dayCard.seats"
        defaultMessage="{remaining} / {capacity} couverts"
        description="05 § 4.5, 04 § 4.2 — jauge de la fiche R1 (« 12 / 20 couverts », toujours au pluriel ; restant négatif possible)"
        values={{ remaining: String(remaining), capacity: String(day.capacity) }}
      />
    </CapacityPill>
  );
  return (
    <DayCard iso={iso} past={past} gauge={gauge}>
      <ThemeBlock text={day.theme} />
      <TextBlock label={intl.formatMessage(messages.menu)} text={day.menu} />
      {!full && !past && !formOpen ? (
        <ReserveButton restaurant="r1" iso={iso} preload={bookingFormR1Chunk.load} />
      ) : null}
      {(!full || sending) && !past && formOpen ? <BookingFormR1Slot /> : null}
      {full && !past && !(sending && formOpen) ? (
        <DayNote>
          <FormattedMessage
            id="public.r1.dayCard.fullNote"
            defaultMessage="Complet."
            description="annexe F, D-02 — phrase sous la fiche R1 complète, à la place de « Réserver »"
          />
        </DayNote>
      ) : null}
    </DayCard>
  );
}
