import type { IsoDate, Restaurant } from "@/domain/types";

// Slot of both staff cards for « Supprimer ce jour », last of their actions (05 § 5.3, § 6.2, 06 § 5.2, D-21, C-14).
// Empty until P5 (b).

interface DeleteDayButtonProps {
  restaurant: Restaurant;
  /** Selected day of the card. */
  iso: IsoDate;
}

/** « Supprimer ce jour » (danger, two clicks). */
export function DeleteDayButton(_props: DeleteDayButtonProps) {
  return null;
}
