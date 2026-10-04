import type { IsoDate, Restaurant } from "@/domain/types";

// Slot of both staff cards for « Imprimer la liste » (05 § 5.3, § 6.2, 07, I-01, I-02). Empty until P6 (a).

interface PrintListButtonProps {
  restaurant: Restaurant;
  /** Selected day of the card. */
  iso: IsoDate;
}

/** « Imprimer la liste » (btn small, print icon), before « Supprimer ce jour ». */
export function PrintListButton(_props: PrintListButtonProps) {
  return null;
}
