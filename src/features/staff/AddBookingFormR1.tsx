import type { StaffServiceDayR1 } from "@/domain/types";

// Slots of the R1 staff card for « + Ajouter une personne » (06 § 8.2, C-12, E-48), open while `ajout=r1`. Empty until
// P5 (d2).

interface AddBookingR1Props {
  /** Selected R1 day, from the full state. */
  day: StaffServiceDayR1;
}

/** « + Ajouter une personne », first of the actions of the R1 card, only while seats are left (05 § 5.3). */
export function AddBookingButtonR1(_props: AddBookingR1Props) {
  return null;
}

/** Form « Ajouter une personne », right under the actions (05 § 5.3). */
export function AddBookingFormR1(_props: AddBookingR1Props) {
  return null;
}
