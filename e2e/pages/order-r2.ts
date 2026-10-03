import type { Locator, Page } from "@playwright/test";

import { notWritten } from "./target";

// R2 order form (09 § 3: P-13; 04 § 5.3). Bodies: P1 (b).

export interface OrderR2Input {
  /** Quantity typed per dish name. */
  quantities?: Record<string, string>;
  serviceMode?: "dineIn" | "takeaway";
  name?: string;
  contact?: string;
  className?: string;
  observation?: string;
}

/** The open form. */
export function orderR2Form(_page: Page): Locator {
  throw notWritten("P1 (b)", "orderR2Form");
}

/** Clicks « Réserver » on the R2 card. */
export async function openOrderR2(_page: Page): Promise<void> {
  await Promise.reject(notWritten("P1 (b)", "openOrderR2"));
}

/** Fills the given fields only. */
export async function fillOrderR2(_page: Page, _input: OrderR2Input): Promise<void> {
  await Promise.reject(notWritten("P1 (b)", "fillOrderR2"));
}

/** « Confirmer la réservation ». */
export async function submitOrderR2(_page: Page): Promise<void> {
  await Promise.reject(notWritten("P1 (b)", "submitOrderR2"));
}

/** « Annuler ». */
export async function cancelOrderR2(_page: Page): Promise<void> {
  await Promise.reject(notWritten("P1 (b)", "cancelOrderR2"));
}
