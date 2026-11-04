import type { Locator, Page } from "@playwright/test";

import type { FakeAppsScript } from "@/mocks/apps-script";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";

import { expect } from "../fixtures";
import { calendarDays, longDate } from "../pages/calendar";
import { gotoHome, toast } from "../pages/home";
import type { Restaurant } from "../pages/home";
import { login } from "../pages/login";
import { datePicker, openDayForm, openDayPanel } from "../pages/staff";

// Helpers shared by the staff scenarios (09 § 4; 06).

/** People of the base data set (parite.md § 2): none may stay in the page after a logout (invariant 1). */
const SEED_NAMES = [
  "Cyrille Ungerer",
  "Ariele Gsell",
  "Noah Bernard",
  "Léa Martin",
  "Jean Petit",
  "Paul Durand",
  "Lycée Voltaire",
  "Association des anciens",
];

/** Spinner of the full-page veil of 06 conventions (G-06), which the site never shows (E-04). */
export function veil(page: Page): Locator {
  return page.getByRole("progressbar", { name: "Chargement en cours" });
}

/** Opens the page, waits for the first data, logs in with the seed password: « Mode collègue activé. ». */
export async function loginAsStaff(page: Page): Promise<void> {
  await gotoHome(page);
  await expect(calendarDays(page, "r1")).toBeVisible();
  await login(page, SEED_PASSWORD);
  await expect(toast(page)).toHaveText("Mode collègue activé.");
}

/** Parsed bodies of the POST requests of one action, in order. */
export function actionBodies(
  requests: FakeAppsScript["requests"],
  action: string,
): Array<Record<string, unknown>> {
  return requests
    .filter((r) => r.method === "POST")
    .map((r) => r.json as Record<string, unknown>)
    .filter((body) => body["action"] === action);
}

/** Number of reads (GET) received so far. */
export function readCount(requests: FakeAppsScript["requests"]): number {
  return requests.filter((r) => r.method === "GET").length;
}

/** No name of the base data set (nor `extra`) left in the page. */
export async function expectNoPersonalData(page: Page, extra: string[] = []): Promise<void> {
  for (const name of [...SEED_NAMES, ...extra]) {
    await expect(page.locator("body")).not.toContainText(name);
  }
}

/** True while a toast of the viewport is displayed. */
export async function toastShown(page: Page): Promise<boolean> {
  return (await toast(page).locator('[role="dialog"], [role="alertdialog"]').count()) > 0;
}

/** Value stored under `key` in the page's `localStorage`, parsed, or null. */
export async function storedJson(page: Page, key: string): Promise<Record<string, unknown> | null> {
  const json = await page.evaluate((name) => localStorage.getItem(name), key);
  return json === null ? null : (JSON.parse(json) as Record<string, unknown>);
}

/** Day of the open date picker: « {date longue}[, déjà ouvert][, passé] » (06 § 3.2). */
export function pickerDay(page: Page, iso: string): Locator {
  return datePicker(page).getByRole("button", {
    name: new RegExp(`^${longDate(iso)}(?:,|$)`, "u"),
  });
}

/** Opens « Ouvrir un jour » of a column; its panel and its Date field (06 § 3.1). */
export async function openDayFormOf(
  page: Page,
  restaurant: Restaurant,
): Promise<{ form: Locator; dateButton: Locator }> {
  await openDayForm(page, restaurant);
  const form = openDayPanel(page, restaurant);
  return { form, dateButton: form.getByRole("button", { name: "Date", exact: true }) };
}
