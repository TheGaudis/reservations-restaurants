import type { Locator, Page } from "@playwright/test";

import { notWritten } from "./target";
import type { Restaurant } from "./target";

// Calendar of a column (09 § 3: P-01, P-01b, P-02, P-02b): `role="group"` + `aria-pressed` on the legacy site,
// `role="grid"` + `gridcell` on the React one (E-05). Bodies: P1 (b).

/** Days of the calendar: the group (legacy) or the grid (React). */
export function calendarDays(_page: Page, _restaurant: Restaurant): Locator {
  throw notWritten("P1 (b)", "calendarDays");
}

/** Button of one day (ISO date). */
export function dayButton(_page: Page, _restaurant: Restaurant, _iso: string): Locator {
  throw notWritten("P1 (b)", "dayButton");
}

/** Selects a day by clicking it. */
export async function selectDay(_page: Page, _restaurant: Restaurant, _iso: string): Promise<void> {
  await Promise.reject(notWritten("P1 (b)", "selectDay"));
}

/** Label of the period shown (« 28 sept. – 4 oct. 2026 », « Octobre 2026 »). */
export function periodLabel(_page: Page, _restaurant: Restaurant): Locator {
  throw notWritten("P1 (b)", "periodLabel");
}

/** ‹ or › : previous or next week or month. */
export async function showPeriod(
  _page: Page,
  _restaurant: Restaurant,
  _direction: "previous" | "next",
): Promise<void> {
  await Promise.reject(notWritten("P1 (b)", "showPeriod"));
}

/** « Semaine » or « Mois ». */
export async function setView(
  _page: Page,
  _restaurant: Restaurant,
  _view: "week" | "month",
): Promise<void> {
  await Promise.reject(notWritten("P1 (b)", "setView"));
}

/** « Aujourd'hui ». */
export async function goToToday(_page: Page, _restaurant: Restaurant): Promise<void> {
  await Promise.reject(notWritten("P1 (b)", "goToToday"));
}
