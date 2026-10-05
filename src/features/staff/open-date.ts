import type { IsoDate, Restaurant } from "@/domain/types";
import { usePageSearch, useSelectedDay } from "@/features/calendar/page-search";

/**
 * Date of « Ouvrir un jour » of `restaurant` (06 § 3.1): the one chosen in its picker (`ouvrirDate`), else the day
 * selected in the restaurant's calendar. Choosing a day in that calendar removes `ouvrirDate` (`selectDay`, 05 § 3.3).
 */
export function useOpenDate(restaurant: Restaurant): IsoDate {
  const search = usePageSearch();
  const selected = useSelectedDay(restaurant);
  return search.ouvrir === restaurant ? (search.ouvrirDate ?? selected) : selected;
}
