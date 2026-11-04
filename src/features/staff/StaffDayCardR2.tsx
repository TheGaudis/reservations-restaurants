import { defineMessage, useIntl } from "react-intl";

import { useToday } from "@/background/clock";
import { dishesForDay, findDay, remainingStock } from "@/domain/capacity";
import { isPast } from "@/domain/cutoff";
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
import { AddBookingButton, AddBookingForm } from "@/features/staff/AddBookingForm";
import { BookingListR2 } from "@/features/staff/BookingList";
import { DeleteDayButton } from "@/features/staff/DeleteDayButton";
import { AddDish, DishActions, EditDishForm } from "@/features/staff/DishForm";
import { OpenedBy, StaffNoServiceCard } from "@/features/staff/StaffDayCard";
import { useFullState } from "@/features/staff/use-staff-state";

import styles from "@/features/staff/StaffDayCard.module.css";

const noteMessage = defineMessage({
  id: "staff.r2.dayCard.note",
  defaultMessage: "Note",
  description: "05 § 4.4 — surtitre du bloc note de la fiche R2 collègue",
});

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
  const state = useFullState();
  const day = findDay(state.r2Days, iso);
  if (day === undefined) return <StaffNoServiceCard iso={iso} past={past} />;
  const dishes = dishesForDay(state, iso);
  return (
    <DayCard past={past}>
      <DayCardTop iso={iso} />
      <ThemeBlock text={day.theme} />
      <TextBlock label={intl.formatMessage(noteMessage)} text={day.note} />
      <OpenedBy name={day.openedBy} />
      {dishes.length > 0 ? (
        <div className={styles["dishes"]}>
          {dishes.map((dish) => (
            <DishRow key={dish.id} dish={dish} remaining={remainingStock(state, dish)} past={past}>
              <div className={styles["dishActions"]}>
                <AddBookingButton restaurant="r2" dish={dish} />
                <DishActions dish={dish} />
              </div>
              <AddBookingForm restaurant="r2" dish={dish} />
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
