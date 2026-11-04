import type { ReactNode } from "react";
import { defineMessage, FormattedMessage } from "react-intl";

import { deleteBookingR1, deleteBookingR2 } from "@/api/actions";
import { useToday } from "@/background/clock";
import { isPast } from "@/domain/cutoff";
import type { Dish, IsoDate, Restaurant, StaffServiceDayR1 } from "@/domain/types";
import { focusCardDate } from "@/features/calendar/card-date-focus";
import { usePageNavigate, usePageSearch } from "@/features/calendar/page-search";
import { bookingLineR1, bookingLineR2, editResaValue } from "@/features/staff/booking-line";
import type { BookingLine } from "@/features/staff/booking-line";
import { BookingRow } from "@/features/staff/BookingRow";
import { EditBookingForm, editBookingButtonId } from "@/features/staff/EditBookingForm";
import { useFullState } from "@/features/staff/use-staff-state";
import { showStaffError, useStaffWrite } from "@/mutations/staff/write";

import styles from "@/features/staff/BookingList.module.css";

const deletedMessage = defineMessage({
  id: "staff.booking.deleted",
  defaultMessage: "Réservation supprimée.",
  description: "06 § 5.2 — toast de succès d'une suppression de réservation",
});

interface ListFrameProps {
  iso: IsoDate;
  count: number;
  children: ReactNode;
}

/** `.bookings-list` (05 § 4.6): the rows in the order of the sheet, never sorted (D-08 not retained), or « Aucune réservation. ». */
function ListFrame({ iso, count, children }: ListFrameProps) {
  const past = isPast(iso, useToday());
  return (
    <div className={styles["list"]} data-past={past || undefined}>
      {count === 0 ? (
        <p className={styles["empty"]}>
          <FormattedMessage
            id="staff.bookingList.empty"
            defaultMessage="Aucune réservation."
            description="05 § 4.6 — liste des réservations vide (fiche R1, plat R2)"
          />
        </p>
      ) : (
        children
      )}
    </div>
  );
}

interface BookingItemProps {
  editResa: string;
  line: BookingLine;
  /** Edit form of the booking, under its row while `editResa` names it. */
  form: ReactNode;
  deleting: boolean;
  onDelete: () => void;
}

/** A row and, while `editResa` names it, its edit form; « Modifier » opens it in `push`, one at a time (06 § 7.1). */
function BookingItem({ editResa, line, form, deleting, onDelete }: BookingItemProps) {
  const search = usePageSearch();
  const navigate = usePageNavigate();
  const expanded = search.editResa === editResa;
  return (
    <>
      <BookingRow
        line={line}
        editButtonId={editBookingButtonId(editResa)}
        expanded={expanded}
        onEdit={() => {
          if (!expanded) navigate({ ...search, editResa }, { replace: false });
        }}
        deleting={deleting}
        onDelete={onDelete}
      />
      {expanded ? form : null}
    </>
  );
}

/** A row of the list: its text and its edit form. */
interface ListedBooking {
  id: string;
  line: BookingLine;
  form: ReactNode;
}

interface BookingListProps {
  restaurant: Restaurant;
  iso: IsoDate;
  bookings: readonly ListedBooking[];
}

/**
 * Bookings of an R1 day or an R2 dish; « Supprimer » deletes in two clicks, the list stays in the page when its last
 * row leaves and the date of the card takes the focus (06 § 5.2). A booking named by `editResa` has its edit form under
 * its row, a missing one opens nothing.
 */
function BookingList({ restaurant, iso, bookings }: BookingListProps) {
  const remove = useStaffWrite(restaurant === "r1" ? deleteBookingR1 : deleteBookingR2, {
    success: deletedMessage,
  });
  return (
    <ListFrame iso={iso} count={bookings.length}>
      {bookings.map((booking) => (
        <BookingItem
          key={booking.id}
          editResa={editResaValue(restaurant, booking.id)}
          line={booking.line}
          form={booking.form}
          deleting={remove.isPending && remove.variables === booking.id}
          onDelete={() => {
            remove.mutate(booking.id, {
              onSuccess: () => {
                focusCardDate(restaurant);
              },
              onError: (error) => {
                showStaffError(error);
              },
            });
          }}
        />
      ))}
    </ListFrame>
  );
}

/** Bookings of the R1 day, after « Ouvert par » and before the actions (05 § 5.3, C-10, C-11, C-14). */
export function BookingListR1({ day }: { day: StaffServiceDayR1 }) {
  const bookings = useFullState()
    .r1Bookings.filter((booking) => booking.date === day.date)
    .map((booking) => ({
      id: booking.id,
      line: bookingLineR1(booking),
      form: <EditBookingForm restaurant="r1" booking={booking} />,
    }));
  return <BookingList restaurant="r1" iso={day.date} bookings={bookings} />;
}

/**
 * Bookings of an R2 dish, last block of its row (05 § 6.3, C-20, C-24, C-14); the orphans of a deleted dish show
 * nowhere (D-21).
 */
export function BookingListR2({ dish }: { dish: Dish }) {
  const bookings = useFullState()
    .r2Bookings.filter((booking) => booking.dishId === dish.id)
    .map((booking) => ({
      id: booking.id,
      line: bookingLineR2(booking, dish),
      form: <EditBookingForm restaurant="r2" booking={booking} dish={dish} />,
    }));
  return <BookingList restaurant="r2" iso={dish.date} bookings={bookings} />;
}
