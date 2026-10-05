import type { Locator, Page } from "@playwright/test";

import { column } from "./home";
import { currentTarget } from "./target";
import type { Restaurant } from "./target";

// Calendar of a column (09 § 3: P-01, P-01b, P-02, P-02b; 05 § 2-3): `role="group"` + `aria-pressed` on the
// legacy site, `role="grid"` + `gridcell` `aria-selected` on the React one (E-05, PLAN § 3.5).

const LONG_DATE = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function escapeRegExp(text: string): string {
  return text.replaceAll(/[$()*+.?[\\\]^{|}]/gu, String.raw`\$&`);
}

/**
 * Long date of a day as the site writes it: « jeudi 1 octobre 2026 » on the legacy site (04 § 8), « jeudi 1er
 * octobre 2026 » on the React one (E-21).
 */
export function longDate(iso: string): string {
  const text = LONG_DATE.format(new Date(`${iso}T00:00:00Z`));
  return currentTarget() === "react" ? text.replace(/^(\S+) 1 /u, "$1 1er ") : text;
}

/** Days of the calendar: the group (legacy) or the grid (React). */
export function calendarDays(page: Page, restaurant: Restaurant): Locator {
  const days = column(page, restaurant);
  return currentTarget() === "legacy"
    ? days.getByRole("group", { name: /^Jours (?:de la semaine|du mois) — /u })
    : days.getByRole("grid");
}

/** Button of one day (ISO date), named « {date longue}, {état}[, passé] » (05 § 2.5). */
export function dayButton(page: Page, restaurant: Restaurant, iso: string): Locator {
  const name = new RegExp(`^${escapeRegExp(longDate(iso))},`, "u");
  return calendarDays(page, restaurant).getByRole("button", { name });
}

/** Button of the selected day: `aria-pressed` (legacy) or inside the `aria-selected` gridcell (React). */
export function selectedDay(page: Page, restaurant: Restaurant): Locator {
  const days = calendarDays(page, restaurant);
  return currentTarget() === "legacy"
    ? days.getByRole("button", { pressed: true })
    : days.getByRole("gridcell", { selected: true }).getByRole("button");
}

/** Selects a day by clicking it. */
export async function selectDay(page: Page, restaurant: Restaurant, iso: string): Promise<void> {
  await dayButton(page, restaurant, iso).click();
}

/** Label of the period shown (« 28 – 4 oct. 2026 », « 28 sept. – 4 oct. 2026 », « Octobre 2026 »). */
export function periodLabel(page: Page, restaurant: Restaurant): Locator {
  return column(page, restaurant).getByText(
    /^(?:\d{1,2}(?: \S+)?(?: \d{4})? – \d{1,2} \S+ \d{4}|\S+ \d{4})$/u,
  );
}

/** ‹ or › : previous or next week or month (« Semaine précédente », « Mois suivant »…). */
export async function showPeriod(
  page: Page,
  restaurant: Restaurant,
  direction: "previous" | "next",
): Promise<void> {
  const name =
    direction === "previous"
      ? /^(?:Semaine précédente|Mois précédent)$/u
      : /^(?:Semaine|Mois) suivante?$/u;
  await column(page, restaurant).getByRole("button", { name }).click();
}

/** « Semaine » or « Mois ». */
export async function setView(
  page: Page,
  restaurant: Restaurant,
  view: "week" | "month",
): Promise<void> {
  const name = view === "week" ? "Semaine" : "Mois";
  await column(page, restaurant).getByRole("button", { name, exact: true }).click();
}

/** « Aujourd'hui ». */
export async function goToToday(page: Page, restaurant: Restaurant): Promise<void> {
  await column(page, restaurant).getByRole("button", { name: "Aujourd'hui", exact: true }).click();
}
