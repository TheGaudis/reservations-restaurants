import type { Locator, Page } from "@playwright/test";

import { notWritten } from "./target";
import type { Restaurant } from "./target";

// Staff mode (09 § 4: C-01 to C-30). Bodies: P1 (c).

/** Staff panel by its title: « Paramètres », « Ouvrir un jour », « Demain (…) ». */
export function staffPanel(_page: Page, _title: string | RegExp): Locator {
  throw notWritten("P1 (c)", "staffPanel");
}

/** Opens « Paramètres » (C-02). */
export async function openSettings(_page: Page): Promise<void> {
  await Promise.reject(notWritten("P1 (c)", "openSettings"));
}

/** Opens « Ouvrir un jour » of a column (C-04, C-06). */
export async function openDayForm(_page: Page, _restaurant: Restaurant): Promise<void> {
  await Promise.reject(notWritten("P1 (c)", "openDayForm"));
}

/** Booking row of a staff card, by the booked person's name (C-10, C-20). */
export function bookingRow(_page: Page, _restaurant: Restaurant, _name: string): Locator {
  throw notWritten("P1 (c)", "bookingRow");
}

/** « + Ajouter une personne » of the R1 card or of an R2 dish (C-12, C-23). */
export async function openAddPerson(
  _page: Page,
  _restaurant: Restaurant,
  _dish?: string,
): Promise<void> {
  await Promise.reject(notWritten("P1 (c)", "openAddPerson"));
}

/** Two clicks on a delete button: armed (« Confirmer ? »), then confirmed (C-14). */
export async function confirmDelete(_button: Locator): Promise<void> {
  await Promise.reject(notWritten("P1 (c)", "confirmDelete"));
}
