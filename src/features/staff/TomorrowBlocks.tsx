import type { IsoDate } from "@/domain/types";

// Slot of `TomorrowPanel` for P6 (b): the blocks per restaurant of 07 § 5 under the totals row (« Ouvert par »,
// « Réservés : … », clients, dishes, « Total {name2} : … », « Aucun jour ouvert pour demain. ») and their « Imprimer »
// buttons (documents C and D, 07 § 6-7). Empty until then.

interface TomorrowBlocksProps {
  /** Tomorrow in Paris, as the panel's title shows it. */
  tomorrow: IsoDate;
}

/** Blocks of restaurant 1 and restaurant 2 for `tomorrow` (07 § 5, D-07). */
export function TomorrowBlocks(_props: TomorrowBlocksProps) {
  return null;
}
