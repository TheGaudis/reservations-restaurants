import { defineMessages, useIntl } from "react-intl";

import { useToday } from "@/background/clock";
import { dishesForDay, findDay, remainingStock } from "@/domain/capacity";
import { isPast } from "@/domain/cutoff";
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
import { DishRow } from "@/features/r2/DishRow";
import { AddBookingButtonR2, AddBookingFormR2 } from "@/features/staff/AddBookingFormR2";
import { BookingListR2 } from "@/features/staff/BookingList";
import { DeleteDayButton } from "@/features/staff/DeleteDayButton";
import { AddDish, DishActions, EditDishForm } from "@/features/staff/DishForm";
import { OpenedBy, StaffNoServiceCard } from "@/features/staff/StaffDayCard";
import { useStaffState } from "@/features/staff/use-staff-state";

import styles from "@/features/staff/StaffDayCard.module.css";

const messages = defineMessages({
  note: {
    id: "staff.r2.dayCard.note",
    defaultMessage: "Note",
    description: "05 § 4.4 — surtitre du bloc note de la fiche R2 collègue",
  },
});

const whole = (state: FullState): FullState => state;

/**
 * Staff card of the selected R2 day (05 § 6.2, § 6.3, C-20, C-10b): date, theme, note, « Ouvert par », each dish with
 * its actions, forms and bookings, « + Ajouter un plat à ce jour », then the day actions (past days included). No
 * closing note at 10:00 and never « Réserver »: the staff are not bound by the cut-off. Each staff block is a slot in
 * the file of the session that fills it (journal p5a, « Interfaces du socle »).
 */
export function StaffDayCardR2() {
  const intl = useIntl();
  const iso = useSelectedDay("r2");
  const past = isPast(iso, useToday());
  const state = useStaffState(whole);
  const day = findDay(state.r2Days, iso);
  if (day === undefined) return <StaffNoServiceCard iso={iso} past={past} />;
  const dishes = dishesForDay(state, iso);
  return (
    <DayCard past={past}>
      <DayCardTop iso={iso} />
      <ThemeBlock text={day.theme} />
      <TextBlock label={intl.formatMessage(messages.note)} text={day.note} />
      <OpenedBy name={day.openedBy} />
      {dishes.length > 0 ? (
        <div className={styles["dishes"]}>
          {dishes.map((dish) => (
            <DishRow key={dish.id} dish={dish} remaining={remainingStock(state, dish)} past={past}>
              <div className={styles["dishActions"]}>
                <AddBookingButtonR2 dish={dish} />
                <DishActions dish={dish} />
              </div>
              <AddBookingFormR2 dish={dish} />
              <EditDishForm dish={dish} />
              <BookingListR2 dish={dish} />
            </DishRow>
          ))}
        </div>
      ) : null}
      <AddDish iso={iso} />
      <DayActions>
        <PrintListButton restaurant="r2" iso={iso} />
        <DeleteDayButton restaurant="r2" iso={iso} />
      </DayActions>
    </DayCard>
  );
}
