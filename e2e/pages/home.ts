import type { Locator, Page } from "@playwright/test";

import { currentTarget } from "./target";
import type { Restaurant } from "./target";

// Page as a whole (09 § 2: G-01 to G-05, G-07). Same roles and texts on both sites unless stated.

/**
 * Warning of the legacy page when the Google Fonts stylesheet it preloads never arrives (blocked by the network
 * isolation): Chromium writes it once the page has been loaded a few seconds.
 */
export const BLOCKED_FONT_PRELOAD =
  /^The resource https:\/\/fonts\.googleapis\.com\/.* was preloaded using link preload but not used/u;

/** Opens the public page; `search` (09 § 1) only means something to the React site, the legacy one ignores it. */
export async function gotoHome(page: Page, search: Record<string, string> = {}): Promise<void> {
  const query = new URLSearchParams(search).toString();
  await page.goto(query === "" ? "./" : `./?${query}`);
}

/** Title of a column: `name1` or `name2`, the only level-2 headings of the public page (04 § 2). */
export function columnTitle(page: Page, restaurant: Restaurant): Locator {
  return page.getByRole("heading", { level: 2 }).nth(restaurant === "r1" ? 0 : 1);
}

/**
 * Column of a restaurant: the closest ancestor of its title that holds buttons (calendar, card). Before the
 * first data, a column has no button yet: use `columnTitle` then.
 */
export function column(page: Page, restaurant: Restaurant): Locator {
  return columnTitle(page, restaurant).locator("xpath=ancestor::*[descendant::button][1]");
}

/** Load error box (G-03): the alert that holds the texts of 03 § 3.1. */
export function loadError(page: Page): Locator {
  return page.getByRole("alert");
}

/** « Réessayer » of the load error box, also while busy (« Nouvelle tentative… », 03 § 3.2). */
export function retryButton(page: Page): Locator {
  return page.getByRole("button", { name: /^(?:Réessayer|Nouvelle tentative…)$/u });
}

/** Clicks « Réessayer » in the load error box (03 § 3.2). */
export async function retryLoad(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
}

/**
 * Toast (G-07). Legacy: the `role="status"` outside the columns, whose text stays after it fades (check its
 * text, not its visibility). React: the « Notifications » viewport of Base UI (a-8).
 */
export function toast(page: Page): Locator {
  if (currentTarget() === "react") return page.getByRole("region", { name: "Notifications" });
  // The booking summary is another status of the page, with a « Fermer » button; the loading veil (G-06) has one
  // too, exposed during a login or a deletion. Only the toast is a live region of its own (`aria-live`).
  return page
    .getByRole("status")
    .filter({ hasNot: page.getByRole("button") })
    .and(page.locator("[aria-live]"));
}

/** Kind of the last toast: green (success or neutral, 04 § 9) or red (error). */
export async function toastKind(page: Page): Promise<"success" | "error"> {
  const isError =
    currentTarget() === "legacy"
      ? await toast(page).evaluate((element) => element.classList.contains("error"))
      : // Newest toast first; an error toast is an `alertdialog` hidden from the accessibility tree (Base UI).
        (await toast(page)
          .locator('[role="dialog"], [role="alertdialog"]')
          .first()
          .getAttribute("data-type")) === "error";
  return isError ? "error" : "success";
}

/** Logo of the header (easter egg, 09 § 7). */
export function logo(page: Page): Locator {
  return page.getByRole("img", { name: "Lycée Aristide Briand" });
}
