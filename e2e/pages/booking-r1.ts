import type { Locator, Page } from "@playwright/test";

import { notWritten } from "./target";

// R1 booking form (09 § 3: P-05; 04 § 5). Bodies: P1 (b).

/** Typed values, as the user types them (« 2,7 », « abc » are valid inputs of a scenario). */
export interface BookingR1Input {
  name?: string;
  contact?: string;
  className?: string;
  students?: string;
  staffMembers?: string;
  externals?: string;
  observation?: string;
}

/** The open form. */
export function bookingR1Form(_page: Page): Locator {
  throw notWritten("P1 (b)", "bookingR1Form");
}

/** Clicks « Réserver » on the R1 card. */
export async function openBookingR1(_page: Page): Promise<void> {
  await Promise.reject(notWritten("P1 (b)", "openBookingR1"));
}

/** Fills the given fields only. */
export async function fillBookingR1(_page: Page, _input: BookingR1Input): Promise<void> {
  await Promise.reject(notWritten("P1 (b)", "fillBookingR1"));
}

/** « Confirmer la réservation ». */
export async function submitBookingR1(_page: Page): Promise<void> {
  await Promise.reject(notWritten("P1 (b)", "submitBookingR1"));
}

/** « Annuler ». */
export async function cancelBookingR1(_page: Page): Promise<void> {
  await Promise.reject(notWritten("P1 (b)", "cancelBookingR1"));
}
