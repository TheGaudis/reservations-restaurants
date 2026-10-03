import type { Locator, Page } from "@playwright/test";

import { reserveButton } from "./day-card";
import { column } from "./home";
import { currentTarget } from "./target";

// R2 order form (09 § 3: P-13; 04 § 5.3). Service mode: segmented buttons with `aria-pressed` on the legacy
// site, radios on the React one (`SegmentedRadio`, PLAN § 3.5).

export interface OrderR2Input {
  /** Quantity typed per dish name. */
  quantities?: Record<string, string>;
  serviceMode?: "dineIn" | "takeaway";
  name?: string;
  contact?: string;
  className?: string;
  observation?: string;
}

const MODE_LABELS = { dineIn: "Sur place", takeaway: "À emporter" } as const;

const IDENTITY_LABELS = {
  name: "Nom et prénom",
  contact: "Adresse email",
  className: "Classe ou service",
  observation: "Observation (optionnel)",
} as const;

// The submit button, idle or busy (04 § 6.1).
const SUBMIT_NAMES = /^(?:Confirmer la réservation|Envoi en cours…)$/u;

/** The open form: the innermost element of the R2 column with « Nom et prénom » and the submit button. */
export function orderR2Form(page: Page): Locator {
  return column(page, "r2")
    .locator("*")
    .filter({ has: page.getByRole("button", { name: SUBMIT_NAMES }) })
    .filter({ has: page.getByLabel("Nom et prénom") })
    .last();
}

/** Quantity field of a dish (`aria-label="Quantité : {Nom}"`, 04 § 5.3). */
export function quantityField(page: Page, dish: string): Locator {
  return orderR2Form(page).getByLabel(`Quantité : ${dish}`, { exact: true });
}

/** Option of the service mode (« Sur place », « À emporter »). */
export function serviceModeOption(page: Page, mode: "dineIn" | "takeaway"): Locator {
  const role = currentTarget() === "legacy" ? "button" : "radio";
  return orderR2Form(page).getByRole(role, { name: MODE_LABELS[mode], exact: true });
}

/** The selected service mode option. */
export function selectedServiceMode(page: Page): Locator {
  const form = orderR2Form(page);
  return currentTarget() === "legacy"
    ? form.getByRole("button", { name: /^(?:Sur place|À emporter)$/u, pressed: true })
    : form.getByRole("radio", { checked: true });
}

/** Live total (« Total : 9,00 € + 1 ticket restaurant », 04 § 5.3). */
export function orderR2Total(page: Page): Locator {
  return orderR2Form(page).getByText(/^Total/u);
}

/** Clicks « Réserver » on the R2 card. */
export async function openOrderR2(page: Page): Promise<void> {
  await reserveButton(page, "r2").click();
}

async function typeInto(field: Locator, value: string): Promise<void> {
  await field.clear();
  await field.pressSequentially(value);
}

/** Fills the given fields only: quantities as typed, then the mode, then the identity. */
export async function fillOrderR2(page: Page, input: OrderR2Input): Promise<void> {
  for (const [dish, quantity] of Object.entries(input.quantities ?? {})) {
    await typeInto(quantityField(page, dish), quantity);
  }
  if (input.serviceMode !== undefined) {
    await serviceModeOption(page, input.serviceMode).click();
  }
  for (const key of ["name", "contact", "className", "observation"] as const) {
    const value = input[key];
    if (value !== undefined) {
      await typeInto(orderR2Form(page).getByLabel(IDENTITY_LABELS[key]), value);
    }
  }
}

/** « Confirmer la réservation ». */
export async function submitOrderR2(page: Page): Promise<void> {
  await orderR2Form(page).getByRole("button", { name: "Confirmer la réservation" }).click();
}

/** « Annuler ». */
export async function cancelOrderR2(page: Page): Promise<void> {
  await orderR2Form(page).getByRole("button", { name: "Annuler", exact: true }).click();
}
