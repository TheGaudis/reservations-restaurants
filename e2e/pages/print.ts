import type { Locator, Page } from "@playwright/test";

import { notWritten } from "./target";

// Printed documents (09 § 5: I-00 to I-04; 07). Legacy: popup window, print() neutralized; React: same document,
// window.print intercepted (E-15). Bodies: P1 (d).

/** Neutralizes `print()` in every page of the context, popups included; call before `goto`. */
export async function stubPrint(_page: Page): Promise<void> {
  await Promise.reject(notWritten("P1 (d)", "stubPrint"));
}

/** Runs `trigger` (a click on « Imprimer… ») and returns the printed document. */
export async function printedDocument(_page: Page, trigger: () => Promise<void>): Promise<Locator> {
  await trigger();
  throw notWritten("P1 (d)", "printedDocument");
}
