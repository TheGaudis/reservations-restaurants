import type { Dish } from "@/domain/types";

// Slots of an R2 dish row for « + Ajouter une personne » (06 § 8.3, C-23, E-48), open while `ajout=r2:{dish id}`.
// Empty until P5 (d2).

interface AddBookingR2Props {
  dish: Dish;
}

/** « + Ajouter une personne », first of the dish actions, only while portions are left (05 § 6.3). */
export function AddBookingButtonR2(_props: AddBookingR2Props) {
  return null;
}

/** Form « Ajouter une personne » of the dish, under its actions (05 § 6.3). */
export function AddBookingFormR2(_props: AddBookingR2Props) {
  return null;
}
