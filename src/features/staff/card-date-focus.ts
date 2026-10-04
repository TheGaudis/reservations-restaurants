import { flushSync } from "react-dom";

import type { IsoDate } from "@/domain/types";
import { formatLongDate } from "@/intl/dates";

/**
 * Column (`<section>` of `Column`) of an element of a day card, taken before a deletion removes that element: the
 * focus goes to the date of the card afterwards.
 */
export function columnOf(element: Element): HTMLElement | null {
  return element.closest("section");
}

/**
 * Focus on the long date at the top of the card of `iso` in `column`, once a deletion took the button away
 * (03 § 5.4, 08 § 7.6, E-48). The date is no control: it becomes focusable by script only (`tabindex="-1"`).
 */
export function focusCardDate(column: HTMLElement | null, iso: IsoDate) {
  // The answer of the deletion is in the cache: React renders the new card before the focus moves.
  flushSync(() => null);
  const text = formatLongDate(iso);
  const date = [...(column?.querySelectorAll("p") ?? [])].find((p) => p.textContent === text);
  if (date === undefined) return;
  date.tabIndex = -1;
  date.focus({ preventScroll: true });
}
