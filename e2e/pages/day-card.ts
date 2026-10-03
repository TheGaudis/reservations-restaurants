import type { Locator, Page } from "@playwright/test";

import { column } from "./home";
import { currentTarget } from "./target";
import type { Restaurant } from "./target";

// Day card under a calendar, and the summary above it (09 § 3: P-03, P-04, P-06 to P-08, P-10 to P-12,
// P-14 to P-17; 05 § 4-6).

const LONG_DATE_TEXT =
  /(?:lun|mar|mercre|jeu|vendre|same)di \d{1,2}(?:er)? \S+ \d{4}|dimanche \d{1,2}(?:er)? \S+ \d{4}/u;
const PILL_TEXT = /-?\d+ \/ \d+/u;

/**
 * Card of the selected day, with the summary above it: the outermost element of the column that shows a long
 * date and does not hold the calendar (05 § 5.1, § 6.2).
 */
export function dayCard(page: Page, restaurant: Restaurant): Locator {
  // Searched inside each candidate: a locator that starts from the column would never match there.
  const calendar =
    currentTarget() === "legacy"
      ? page.getByRole("group", { name: /^Jours (?:de la semaine|du mois) — /u })
      : page.getByRole("grid");
  return column(page, restaurant)
    .locator("*")
    .filter({ hasText: LONG_DATE_TEXT })
    .filter({ hasNot: calendar })
    .first();
}

/** R1 capacity pill (« 5 / 20 couverts », 05 § 4.5). */
export function seatsPill(page: Page): Locator {
  return dayCard(page, "r1").getByText(/-?\d+ \/ \d+ couverts/u);
}

/**
 * Row of an R2 dish on the card: the innermost element that holds the dish line (« Lasagnes — 4,50 € ») and
 * its stock pill (« 4 / 10 »), 05 § 6.3.
 */
export function dishRow(page: Page, name: string): Locator {
  const card = dayCard(page, "r2");
  const line = page.getByText(new RegExp(`^${name}(?:\\s—\\s.*)?$`, "u"));
  return card.locator("*").filter({ has: line }).filter({ hasText: PILL_TEXT }).last();
}

/** « Réserver » of the card. */
export function reserveButton(page: Page, restaurant: Restaurant): Locator {
  return column(page, restaurant).getByRole("button", { name: "Réserver", exact: true });
}

/** Booking summary (P-06, P-14; 04 § 7), `role="status"`, with its « Fermer ». */
export function bookingSummary(page: Page, restaurant: Restaurant): Locator {
  return column(page, restaurant)
    .getByRole("status")
    .filter({ hasText: /Réservation (?:déjà )?enregistrée/u });
}
