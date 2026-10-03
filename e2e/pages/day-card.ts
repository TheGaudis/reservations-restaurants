import type { Locator, Page } from "@playwright/test";

import { notWritten } from "./target";
import type { Restaurant } from "./target";

// Day card under a calendar, and the summary above it (09 § 3: P-03, P-04, P-06 to P-08, P-10 to P-12,
// P-14 to P-17). Bodies: P1 (b).

/** Card of the selected day. */
export function dayCard(_page: Page, _restaurant: Restaurant): Locator {
  throw notWritten("P1 (b)", "dayCard");
}

/** R1 capacity pill (« 5 / 20 couverts »). */
export function seatsPill(_page: Page): Locator {
  throw notWritten("P1 (b)", "seatsPill");
}

/** Row of an R2 dish: name, price and stock pill. */
export function dishRow(_page: Page, _name: string): Locator {
  throw notWritten("P1 (b)", "dishRow");
}

/** « Réserver » of the card. */
export function reserveButton(_page: Page, _restaurant: Restaurant): Locator {
  throw notWritten("P1 (b)", "reserveButton");
}

/** Booking summary (P-06, P-14) and its « Fermer ». */
export function bookingSummary(_page: Page, _restaurant: Restaurant): Locator {
  throw notWritten("P1 (b)", "bookingSummary");
}
