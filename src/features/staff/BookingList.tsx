import type { Dish, StaffServiceDayR1 } from "@/domain/types";

// Slots of the staff cards for the booking lists, each edit form under its row (05 § 4.6, 06 § 7, C-10, C-11, C-20,
// C-24). Empty until P5 (d1).

/** Bookings of the R1 day, after « Ouvert par » and before the actions (05 § 5.3). */
export function BookingListR1(_props: { day: StaffServiceDayR1 }) {
  return null;
}

/** Bookings of an R2 dish, last block of its row (05 § 6.3). */
export function BookingListR2(_props: { dish: Dish }) {
  return null;
}
