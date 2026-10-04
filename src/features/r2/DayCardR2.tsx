import type { ReactNode } from "react";
import { defineMessages, useIntl } from "react-intl";

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
import { commonMessages } from "@/intl/common-messages";
import { Alert } from "@/ui/feedback/Alert";

import styles from "@/features/r2/DayCardR2.module.css";

const messages = defineMessages({
  note: {
    id: "public.r2.dayCard.note",
    defaultMessage: "Note",
    description: "05 § 4.4, 04 § 4.3 — surtitre du bloc note de la fiche R2",
  },
  allSoldOut: {
    id: "public.r2.dayCard.allSoldOutNote",
    defaultMessage: "Tous les plats sont épuisés.",
    description:
      "annexe F, D-02 — phrase sous la fiche R2 dont tous les plats sont épuisés, à la place de « Réserver »",
  },
});

interface DayCardR2Props {
  /** Order form of P4 (d), shown in place of « Réserver » while `reserver=r2` and the day can be ordered. */
  form?: ReactNode;
}

/**
 * Public card of the selected R2 day (05 § 6, P-10 to P-12, P-15 to P-17): date, theme, note, dishes with their
 * gauge, then « Réserver » when orders are open (before 10:00 in Paris, 01 § 3.7) and a dish has portions left. From
 * 10:00 on the day itself the closing note replaces it; every dish sold out says so (D-02); a past day pales (E-56) and says
 * nothing. A day open without any dish shows its texts only.
 */
export function DayCardR2({ form }: DayCardR2Props) {
  const intl = useIntl();
  const iso = useSelectedDay("r2");
  const past = isPast(iso, useToday());
  const closed = useIsR2OrderingClosed(iso);
  const formOpen = usePageSearch().reserver === "r2";
  const state = useShownState();
  const day = findDay(state.r2Days, iso);
  if (day === undefined) return <NoServiceCard iso={iso} past={past} />;
  const dishes = dishesForDay(state, iso).map((dish) => ({
    dish,
    remaining: remainingStock(state, dish),
  }));
  const soldOut = dishes.length > 0 && dishes.every(({ remaining }) => remaining <= 0);
  const orderable = !closed && dishes.length > 0 && !soldOut;
  return (
    <DayCard iso={iso} past={past}>
      <ThemeBlock text={day.theme} />
      <TextBlock label={intl.formatMessage(messages.note)} text={day.note} />
      {dishes.length > 0 ? (
        <div className={styles["dishes"]}>
          {dishes.map(({ dish, remaining }) => (
            <DishRow key={dish.id} dish={dish} remaining={remaining} past={past} />
          ))}
        </div>
      ) : null}
      {closed && !past ? (
        <div className={styles["closed"]}>
          <Alert variant="note" tone="warning">
            {intl.formatMessage(commonMessages.r2Closed, { name2: state.settings.name2 })}
          </Alert>
        </div>
      ) : null}
      {orderable && !formOpen ? <ReserveButton restaurant="r2" iso={iso} /> : null}
      {orderable && formOpen ? form : null}
      {soldOut && !closed ? <DayNote>{intl.formatMessage(messages.allSoldOut)}</DayNote> : null}
    </DayCard>
  );
}
