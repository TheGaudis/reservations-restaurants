import type { StaffServiceDayR1 } from "@/domain/types";

// Slots of the R1 staff card (`StaffDayCardR1`) for « Modifier ce jour » (06 § 5.1, C-13, E-48). Empty until P5 (b).

interface EditDayR1Props {
  /** Selected R1 day, from the full state. */
  day: StaffServiceDayR1;
}

/** « Modifier ce jour » in the actions of the R1 card, after « + Ajouter une personne » (05 § 5.3). */
export function EditDayButtonR1(_props: EditDayR1Props) {
  return null;
}

/** Form « Modifier ce jour », under the actions and the form « Ajouter une personne » (05 § 5.3); open while `editJour=r1`. */
export function EditDayFormR1(_props: EditDayR1Props) {
  return null;
}
