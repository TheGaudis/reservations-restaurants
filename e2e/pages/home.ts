import type { Locator, Page } from "@playwright/test";

// Page as a whole (09 § 2: G-01 to G-05, G-07).

export type Restaurant = "r1" | "r2";

/** Opens the public page with the given search params (09 § 1). */
export async function gotoHome(page: Page, search: Record<string, string> = {}): Promise<void> {
  const query = new URLSearchParams(search).toString();
  await page.goto(query === "" ? "./" : `./?${query}`);
}

/**
 * Title of a column: `name1` or `name2`, the only level-2 headings of the public page (04 § 2). In staff mode, the
 * site titles the panel « Demain (…) » with a level-2 heading as well (heading order under the h1, S5): it is
 * left out.
 */
export function columnTitle(page: Page, restaurant: Restaurant): Locator {
  return page
    .getByRole("heading", { level: 2 })
    .filter({ hasNotText: /^Demain \(/u })
    .nth(restaurant === "r1" ? 0 : 1);
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
 * Toast (G-07): the « Notifications » viewport of Base UI (a-8), always in the page; hidden included, because
 * print media hides everything but the printed document (styles/print.css, REG-40 I-00).
 */
export function toast(page: Page): Locator {
  return page.getByRole("region", { name: "Notifications", includeHidden: true });
}

/** Kind of the last toast: green (success or neutral, 04 § 9) or red (error). */
export async function toastKind(page: Page): Promise<"success" | "error"> {
  // Newest toast first; an error toast is an `alertdialog` hidden from the accessibility tree (Base UI).
  const isError =
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
