import type { Locator, Page } from "@playwright/test";

import { column } from "./home";
import type { Restaurant } from "./home";

// Calendar of a column (09 § 3: P-01, P-01b, P-02, P-02b; 05 § 2-3): `role="grid"` + `gridcell` `aria-selected`
// (E-05, PLAN § 3.5).

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

/** Long date of a day as the site writes it: « jeudi 1er octobre 2026 » (04 § 8, E-21). */
export function longDate(iso: string): string {
  const text = LONG_DATE.format(new Date(`${iso}T00:00:00Z`));
  return text.replace(/^(\S+) 1 /u, "$1 1er ");
}

/** Days of the calendar: the grid. */
export function calendarDays(page: Page, restaurant: Restaurant): Locator {
  return column(page, restaurant).getByRole("grid");
}

/** Button of one day (ISO date), named « {date longue}, {état}[, passé] » (05 § 2.5). */
export function dayButton(page: Page, restaurant: Restaurant, iso: string): Locator {
  const name = new RegExp(`^${escapeRegExp(longDate(iso))},`, "u");
  return calendarDays(page, restaurant).getByRole("button", { name });
}

/** Button of the selected day, inside the `aria-selected` gridcell. */
export function selectedDay(page: Page, restaurant: Restaurant): Locator {
  return calendarDays(page, restaurant)
    .getByRole("gridcell", { selected: true })
    .getByRole("button");
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
