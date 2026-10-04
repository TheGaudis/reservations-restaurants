import { useIsMutating } from "@tanstack/react-query";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { useIsR2OrderingClosed, useToday } from "@/background/clock";
import { dishesForDay, findDay, remainingStock } from "@/domain/capacity";
import { isPast } from "@/domain/cutoff";
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
import { DishRow } from "@/features/r2/DishRow";
import { OrderFormR2 } from "@/features/r2/OrderFormR2";
import { commonMessages } from "@/intl/common-messages";
import { bookingKeys } from "@/mutations/booking-keys";
import { Alert } from "@/ui/feedback/Alert";

import styles from "@/features/r2/DayCardR2.module.css";

const messages = defineMessages({
  note: {
    id: "public.r2.dayCard.note",
    defaultMessage: "Note",
    description: "05 § 4.4, 04 § 4.3 — surtitre du bloc note de la fiche R2",
  },
});

/**
 * Public card of the selected R2 day (05 § 6, P-10 to P-12, P-15 to P-17): date, theme, note, dishes with their
 * gauge, then « Réserver » when orders are open (before 10:00 in Paris, 01 § 3.7) and a dish has portions left. From
 * 10:00 on the day itself the closing note replaces it; every dish sold out says so (D-02); a past day pales (E-56) and says
 * nothing. A day open without any dish shows its texts only. While the order form is open the dish list folds away:
 * the form shows each dish again (05 § 6.4). The form is keyed by day: another day, or a new opening, starts an empty
 * form with a new `requestId` (invariant 3) and reads its `defaultValues` again.
 */
export function DayCardR2() {
  const intl = useIntl();
  const iso = useSelectedDay("r2");
  const past = isPast(iso, useToday());
  const closed = useIsR2OrderingClosed(iso);
  const formOpen = usePageSearch().reserver === "r2";
  // An order that takes the last portions keeps its form until its answer has been handled (summary, toast).
  const sending = useIsMutating({ mutationKey: bookingKeys.r2() }) > 0;
  const state = useShownState();
  const day = findDay(state.r2Days, iso);
  if (day === undefined) return <NoServiceCard iso={iso} past={past} />;
  const dishes = dishesForDay(state, iso).map((dish) => ({
    dish,
    remaining: remainingStock(state, dish),
  }));
  const soldOut = dishes.length > 0 && dishes.every(({ remaining }) => remaining <= 0);
  const orderable = !closed && dishes.length > 0 && !soldOut;
  const ordering = formOpen && (orderable || sending);
  return (
    <DayCard iso={iso} past={past}>
      <ThemeBlock text={day.theme} />
      <TextBlock label={intl.formatMessage(messages.note)} text={day.note} />
      {dishes.length > 0 && !ordering ? (
        <div className={styles["dishes"]}>
          {dishes.map(({ dish, remaining }) => (
            <DishRow key={dish.id} dish={dish} remaining={remaining} past={past} />
          ))}
        </div>
      ) : null}
      {closed && !past && !ordering ? (
        <div className={styles["closed"]}>
          <Alert variant="note" tone="warning">
            <FormattedMessage
              {...commonMessages.r2Closed}
              values={{ name2: state.settings.name2 }}
            />
          </Alert>
        </div>
      ) : null}
      {orderable && !formOpen ? <ReserveButton restaurant="r2" iso={iso} /> : null}
      {ordering ? <OrderFormR2 key={`r2:${iso}`} date={iso} /> : null}
      {soldOut && !closed && !ordering ? (
        <DayNote>
          <FormattedMessage
            id="public.r2.dayCard.allSoldOutNote"
            defaultMessage="Tous les plats sont épuisés."
            description="annexe F, D-02 — phrase sous la fiche R2 dont tous les plats sont épuisés, à la place de « Réserver »"
          />
        </DayNote>
      ) : null}
    </DayCard>
  );
}
