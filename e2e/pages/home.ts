import type { Locator, Page } from "@playwright/test";

import { notWritten } from "./target";
import type { Restaurant } from "./target";

// Page as a whole (09 § 2: G-01 to G-05, G-07). Bodies: P1 (b).

/** Opens the public page; `search` (09 § 1) only means something to the React site, the legacy one ignores it. */
export async function gotoHome(page: Page, search: Record<string, string> = {}): Promise<void> {
  const query = new URLSearchParams(search).toString();
  await page.goto(query === "" ? "./" : `./?${query}`);
}

/** Title of a column: `name1` or `name2`. */
export function columnTitle(_page: Page, _restaurant: Restaurant): Locator {
  throw notWritten("P1 (b)", "columnTitle");
}

/** Load error box (G-03) with its alert text. */
export function loadError(_page: Page): Locator {
  throw notWritten("P1 (b)", "loadError");
}

/** Clicks « Réessayer » in the load error box (03 § 3.2). */
export async function retryLoad(_page: Page): Promise<void> {
  await Promise.reject(notWritten("P1 (b)", "retryLoad"));
}

/** Toast (G-07): its text and its kind, success or error. */
export function toast(_page: Page): Locator {
  throw notWritten("P1 (b)", "toast");
}
