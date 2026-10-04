import { useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { defineMessages, useIntl } from "react-intl";

import { useToday } from "@/background/clock";
import { isPast } from "@/domain/cutoff";
import type {
  BookingR1,
  BookingR2,
  Dish,
  FullState,
  IsoDate,
  Restaurant,
  StaffServiceDayR1,
} from "@/domain/types";
import { usePageNavigate, usePageSearch } from "@/features/calendar/page-search";
import { bookingLineR1, bookingLineR2, editResaValue } from "@/features/staff/booking-line";
import { BookingRow } from "@/features/staff/BookingRow";
import { EditBookingFormR1 } from "@/features/staff/EditBookingFormR1";
import { EditBookingFormR2 } from "@/features/staff/EditBookingFormR2";
import { useStaffState } from "@/features/staff/use-staff-state";
import { formatLongDate } from "@/intl/dates";
import { useDeleteBooking } from "@/mutations/staff/bookings";
import { staffErrorText } from "@/mutations/staff/write";
import { showToast } from "@/ui/feedback/toast";

import styles from "@/features/staff/BookingList.module.css";

const messages = defineMessages({
  empty: {
    id: "staff.bookingList.empty",
    defaultMessage: "Aucune réservation.",
    description: "05 § 4.6 — liste des réservations vide (fiche R1, plat R2)",
  },
});

/**
 * Gives the focus to the date of the day card after a deletion (03 § 5.4, 08 § 7.6): the deleted row and its buttons
 * are gone. The date is the `<p>` of the column that reads the long date of the card.
 */
function focusCardDate(list: HTMLElement | null, iso: IsoDate) {
  const column = list?.closest("section");
  if (column === null || column === undefined) return;
  const text = formatLongDate(iso);
  const date = [...column.querySelectorAll("p")].find((element) => element.textContent === text);
  if (date === undefined) return;
  date.tabIndex = -1;
  date.focus();
}

/** Deletion of a booking from its list, which stays in the page when its last row leaves (06 § 5.2). */
function useDeleteFromList(restaurant: Restaurant, iso: IsoDate) {
  const list = useRef<HTMLDivElement>(null);
  const remove = useDeleteBooking(restaurant);
  const deleting = (id: string) => remove.isPending && remove.variables === id;
  const deleteBooking = (id: string) => {
    remove.mutate(id, {
      onSuccess: () => {
        focusCardDate(list.current, iso);
      },
      onError: (error) => {
        const text = staffErrorText(error);
        if (text !== null) showToast(text, "error");
      },
    });
  };
  return { list, deleting, deleteBooking };
}

interface ListFrameProps {
  list: RefObject<HTMLDivElement | null>;
  iso: IsoDate;
  count: number;
  children: ReactNode;
}

/** `.bookings-list` (05 § 4.6): the rows in the order of the sheet, never sorted (D-08 not retained), or « Aucune réservation. ». */
function ListFrame({ list, iso, count, children }: ListFrameProps) {
  const intl = useIntl();
  const past = isPast(iso, useToday());
  return (
    <div ref={list} className={styles["list"]} data-past={past || undefined}>
      {count === 0 ? (
        <p className={styles["empty"]}>{intl.formatMessage(messages.empty)}</p>
      ) : (
        children
      )}
    </div>
  );
}

/** Opens the edit form of a booking under its row (`editResa`, push), one at a time (06 § 7.1). */
function useEditResa(editResa: string) {
  const search = usePageSearch();
  const navigate = usePageNavigate();
  const expanded = search.editResa === editResa;
  const open = () => {
    if (!expanded) navigate({ ...search, editResa }, { replace: false });
  };
  return { expanded, open };
}

interface ItemProps<B> {
  booking: B;
  deleting: boolean;
  onDelete: () => void;
}

function BookingItemR1({ booking, deleting, onDelete }: ItemProps<BookingR1>) {
  const opener = useRef<HTMLButtonElement>(null);
  const { expanded, open } = useEditResa(editResaValue("r1", booking.id));
  return (
    <>
      <BookingRow
        line={bookingLineR1(booking)}
        opener={opener}
        expanded={expanded}
        onEdit={open}
        deleting={deleting}
        onDelete={onDelete}
      />
      {expanded ? <EditBookingFormR1 booking={booking} opener={opener} /> : null}
    </>
  );
}

function BookingItemR2({
  booking,
  dish,
  deleting,
  onDelete,
}: ItemProps<BookingR2> & { dish: Dish }) {
  const opener = useRef<HTMLButtonElement>(null);
  const { expanded, open } = useEditResa(editResaValue("r2", booking.id));
  return (
    <>
      <BookingRow
        line={bookingLineR2(booking, dish)}
        opener={opener}
        expanded={expanded}
        onEdit={open}
        deleting={deleting}
        onDelete={onDelete}
      />
      {expanded ? <EditBookingFormR2 booking={booking} dish={dish} opener={opener} /> : null}
    </>
  );
}

/**
 * Bookings of the R1 day, after « Ouvert par » and before the actions (05 § 5.3, C-10, C-11, C-14); a booking named
 * by `editResa` has its edit form under its row, a missing one opens nothing.
 */
export function BookingListR1({ day }: { day: StaffServiceDayR1 }) {
  const bookings = useStaffState((state: FullState): BookingR1[] =>
    state.r1Bookings.filter((booking) => booking.date === day.date),
  );
  const { list, deleting, deleteBooking } = useDeleteFromList("r1", day.date);
  return (
    <ListFrame list={list} iso={day.date} count={bookings.length}>
      {bookings.map((booking) => (
        <BookingItemR1
          key={booking.id}
          booking={booking}
          deleting={deleting(booking.id)}
          onDelete={() => {
            deleteBooking(booking.id);
          }}
        />
      ))}
    </ListFrame>
  );
}

/**
 * Bookings of an R2 dish, last block of its row (05 § 6.3, C-20, C-24, C-14); the orphans of a deleted dish show
 * nowhere (D-21).
 */
export function BookingListR2({ dish }: { dish: Dish }) {
  const bookings = useStaffState((state: FullState): BookingR2[] =>
    state.r2Bookings.filter((booking) => booking.dishId === dish.id),
  );
  const { list, deleting, deleteBooking } = useDeleteFromList("r2", dish.date);
  return (
    <ListFrame list={list} iso={dish.date} count={bookings.length}>
      {bookings.map((booking) => (
        <BookingItemR2
          key={booking.id}
          booking={booking}
          dish={dish}
          deleting={deleting(booking.id)}
          onDelete={() => {
            deleteBooking(booking.id);
          }}
        />
      ))}
    </ListFrame>
  );
}
