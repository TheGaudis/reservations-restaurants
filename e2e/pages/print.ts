import type { Locator, Page } from "@playwright/test";

import { currentTarget } from "./target";

// Printed documents (09 § 5: I-00 to I-04; 07) and the tomorrow panel (09 § 4: C-01, C-03; 06 § 2.1, 07 § 5).
// Legacy: a popup window per document, left open (07 § 8). React: the same document, `window.print` intercepted
// (E-15, PLAN § 3.8), the printed document being the page's only article. Either way, `print()` only counts its
// calls and the document is read in print media: what the printer receives, without the screen-only footer of the
// legacy popup (07 § 2.2).

interface PrintWindow {
  e2ePrintCalls?: number;
}

async function printCalls(page: Page): Promise<number> {
  return page.evaluate(() => (window as PrintWindow).e2ePrintCalls ?? 0);
}

/** Neutralizes `print()` in every page of the context, popups included; call before `goto`. */
export async function stubPrint(page: Page): Promise<void> {
  await page.context().addInitScript(() => {
    const target = window as PrintWindow & Window;
    target.print = () => {
      target.e2ePrintCalls = (target.e2ePrintCalls ?? 0) + 1;
    };
  });
}

/**
 * Runs `trigger` (a click on « Imprimer… ») and returns the printed document once `print()` has been called, in
 * print media. Its page title is the document title, offered as the PDF name (07 § 3, 4, 6, 7).
 */
export async function printedDocument(page: Page, trigger: () => Promise<void>): Promise<Locator> {
  if (currentTarget() === "legacy") {
    const popup = page.waitForEvent("popup");
    await trigger();
    const window = await popup;
    await window.waitForFunction(() => ((globalThis as PrintWindow).e2ePrintCalls ?? 0) > 0);
    await window.emulateMedia({ media: "print" });
    return window.locator("body");
  }
  const before = await printCalls(page);
  await trigger();
  await page.waitForFunction(
    (count) => ((globalThis as PrintWindow).e2ePrintCalls ?? 0) > count,
    before,
  );
  await page.emulateMedia({ media: "print" });
  return page.getByRole("article");
}

/** Ends the printing of `printed`: closes the popup (legacy), or leaves print media and fires `afterprint`. */
export async function closePrintedDocument(printed: Locator): Promise<void> {
  const page = printed.page();
  if (currentTarget() === "legacy") {
    await page.close();
    return;
  }
  await page.emulateMedia({ media: null });
  await page.evaluate(() => globalThis.dispatchEvent(new Event("afterprint")));
}

/** Value of an information of the document header (`dl`, 07 § 2.2), by its label (« Ouvert par »). */
export function printedInfo(printed: Locator, label: string): Locator {
  return printed
    .getByRole("term")
    .filter({ hasText: new RegExp(`^${label}$`, "u") })
    .locator("xpath=following-sibling::*[1]");
}

/** Texts of the cells of the printed table row that holds `text` (a name). */
export async function printedRow(printed: Locator, text: string): Promise<string[]> {
  return printed.getByRole("row").filter({ hasText: text }).getByRole("cell").allTextContents();
}

/**
 * Panel « Demain ({date}) » (C-01): the totals panel of the legacy site, the single merged panel of the React
 * one (D-07, E-30), a region named by its title.
 */
export function tomorrowPanel(page: Page): Locator {
  const title = /^Demain \(/u;
  return currentTarget() === "legacy"
    ? page.getByRole("heading", { name: title }).locator("xpath=..")
    : page.getByRole("region", { name: title });
}

/** Tomorrow summary with its print buttons (C-03): « Résumé pour demain » (legacy), the merged panel (React). */
export function tomorrowSummary(page: Page): Locator {
  return currentTarget() === "legacy"
    ? page.getByText(/^Résumé pour demain \(/u).locator("xpath=..")
    : tomorrowPanel(page);
}

/** Block of a restaurant in the tomorrow summary (07 § 5), found by the restaurant's name. */
export function tomorrowBlock(page: Page, restaurantName: string): Locator {
  return tomorrowSummary(page)
    .getByText(restaurantName, { exact: true })
    .locator("xpath=ancestor::*[contains(normalize-space(.), 'Ouvert par')][1]");
}

/** « Imprimer » of a restaurant's block in the tomorrow summary: documents C and D (07 § 6, § 7). */
export function tomorrowPrintButton(page: Page, restaurantName: string): Locator {
  return tomorrowBlock(page, restaurantName).getByRole("button", { name: "Imprimer", exact: true });
}
