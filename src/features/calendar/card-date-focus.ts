import { flushSync } from "react-dom";

import type { Restaurant } from "@/domain/types";

/**
 * Focus on the date of the card of `restaurant` (`DayCard` inside `DayDetail`), where a deletion in the staff mode
 * sends it (03 § 5.4, 08 § 7.6, E-48): the deleted day, dish or booking took its button away. Called once the answer
 * is in the cache; the card may have been replaced by the card of a day without service.
 */
export function focusCardDate(restaurant: Restaurant) {
  // React renders the card from the answer first: the date it shows is the one to focus.
  flushSync(() => null);
  document
    .querySelector<HTMLElement>(`[data-day-detail="${restaurant}"] [data-day-date]`)
    ?.focus({ preventScroll: true });
}
