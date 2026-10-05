import type { Locator, Page } from "@playwright/test";

import { reserveButton } from "./day-card";
import { column } from "./home";

// R1 booking form (09 § 3: P-05; 04 § 5.1-5.2, § 6.1). Fields are found by their labels; the counters' labels
// carry their price (« Élèves · 4,95 € »).

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

const FIELD_LABELS: Record<keyof BookingR1Input, string | RegExp> = {
  name: "Nom et prénom",
  contact: "Adresse email",
  className: "Classe ou service",
  students: /^Élèves/u,
  staffMembers: /^Personnels/u,
  externals: /^Extérieurs/u,
  observation: "Observation (optionnel)",
};

// The submit button, idle or busy (04 § 6.1).
const SUBMIT_NAMES = /^(?:Confirmer la réservation|Envoi en cours…)$/u;

/** The open form: the innermost element of the R1 column with « Nom et prénom » and the submit button. */
export function bookingR1Form(page: Page): Locator {
  return column(page, "r1")
    .locator("*")
    .filter({ has: page.getByRole("button", { name: SUBMIT_NAMES }) })
    .filter({ has: page.getByLabel("Nom et prénom") })
    .last();
}

/** Field of the open form, by its key in `BookingR1Input`. */
export function bookingR1Field(page: Page, field: keyof BookingR1Input): Locator {
  return bookingR1Form(page).getByLabel(FIELD_LABELS[field]);
}

/** Live total (« 3 couverts · Total : 16,00 € », 04 § 5.2). */
export function bookingR1Total(page: Page): Locator {
  return bookingR1Form(page).getByText(/Total :/u);
}

/** Clicks « Réserver » on the R1 card. */
export async function openBookingR1(page: Page): Promise<void> {
  await reserveButton(page, "r1").click();
}

/** Fills the given fields only, key by key, as typed (a number field gets the raw keystrokes). */
export async function fillBookingR1(page: Page, input: BookingR1Input): Promise<void> {
  for (const key of Object.keys(input) as Array<keyof BookingR1Input>) {
    const value = input[key];
    if (value === undefined) continue;
    const field = bookingR1Field(page, key);
    await field.clear();
    await field.pressSequentially(value);
  }
}

/** « Confirmer la réservation ». */
export async function submitBookingR1(page: Page): Promise<void> {
  await bookingR1Form(page).getByRole("button", { name: "Confirmer la réservation" }).click();
}

/** « Annuler ». */
export async function cancelBookingR1(page: Page): Promise<void> {
  await bookingR1Form(page).getByRole("button", { name: "Annuler", exact: true }).click();
}
