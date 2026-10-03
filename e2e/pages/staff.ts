import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { calendarDays } from "./calendar";
import { column } from "./home";
import { currentTarget } from "./target";
import type { Restaurant } from "./target";

// Staff mode (09 § 4: C-01 to C-30; 06 § 2-8; 05 § 4.6, § 5.3, § 6.3). Panels open from their title: a <summary> on the
// legacy site (not a button for Playwright), a disclosure button on the React one (`Collapsible`, PLAN § 3.5).

// Closest ancestor of a title that holds more than the title: the <details> of a legacy <summary>, the root of a React
// `Collapsible` around its trigger, the panel around a heading.
function panelOf(title: Locator): Locator {
  return title.locator(
    "xpath=ancestor::*[count(*) > 1 and not(self::summary) and not(self::button)][1]",
  );
}

function titleText(scope: Page | Locator, title: string | RegExp): Locator {
  return typeof title === "string"
    ? scope.getByText(title, { exact: true })
    : scope.getByText(title);
}

/** Staff panel by its title: « Paramètres », « Demain (…) » (one panel per title in the page). */
export function staffPanel(page: Page, title: string | RegExp): Locator {
  return panelOf(titleText(page, title));
}

// « + Ouvrir un jour »: the « + » is a separate, hidden glyph (06 § 4).
const OPEN_DAY_TITLE = /Ouvrir un jour$/u;

/** « Ouvrir un jour » panel of a column (C-04, C-06). */
export function openDayPanel(page: Page, restaurant: Restaurant): Locator {
  return panelOf(titleText(column(page, restaurant), OPEN_DAY_TITLE));
}

async function openDisclosure(scope: Page | Locator, title: string | RegExp): Promise<void> {
  if (currentTarget() === "react") {
    const trigger = scope.getByRole("button", { name: title, expanded: false });
    await trigger.click();
    return;
  }
  await titleText(scope, title).click();
}

/** Opens « Paramètres » (C-02). */
export async function openSettings(page: Page): Promise<void> {
  await openDisclosure(page, "Paramètres");
}

/** Opens « Ouvrir un jour » of a column (C-04, C-06). */
export async function openDayForm(page: Page, restaurant: Restaurant): Promise<void> {
  await openDisclosure(column(page, restaurant), OPEN_DAY_TITLE);
}

const LONG_DATE_TEXT =
  /(?:lun|mar|mercre|jeu|vendre|same)di \d{1,2}(?:er)? \S+ \d{4}|dimanche \d{1,2}(?:er)? \S+ \d{4}/u;

/**
 * Card of the selected day in staff mode (C-10, C-10b, C-20): the outermost element after the calendar that shows a
 * long date. « Ouvrir un jour », above the calendar (06 § 2), also shows one in its Date field.
 */
export function staffCard(page: Page, restaurant: Restaurant): Locator {
  const calendar = calendarDays(page, restaurant);
  return column(page, restaurant)
    .locator("*")
    .filter({ hasText: LONG_DATE_TEXT })
    .and(calendar.locator("xpath=following::*"))
    .first();
}

/** Date picker of « Ouvrir un jour » (C-05, `role="dialog"`). */
export function datePicker(page: Page): Locator {
  return page.getByRole("dialog", { name: "Choisir la date" });
}

/**
 * Booking row of a staff card, by the booked person's name (C-10, C-20): the innermost element of the column with
 * the name and a « Modifier » button (05 § 4.6).
 */
export function bookingRow(page: Page, restaurant: Restaurant, name: string): Locator {
  return column(page, restaurant)
    .locator("*")
    .filter({ has: page.getByText(name, { exact: true }) })
    .filter({ has: page.getByRole("button", { name: "Modifier", exact: true }) })
    .last();
}

/**
 * Booking lines in `scope` (a card, a dish), in the order of the sheet (05 § 4.6): « Nom — Classe — 3 couverts — 16,00 € —
 * contact — observation », empty parts left out.
 */
export function bookingLines(scope: Locator): Locator {
  return scope.getByText(/ — \d+ (?:couverts?|portions?)(?: — |$)/u);
}

/**
 * Block of an R2 dish on a staff card (05 § 6.3): the innermost element with the dish line (« Lasagnes — 4,50 € ») and
 * its « Modifier ce plat » button, so its actions, forms and bookings.
 */
export function staffDish(page: Page, name: string): Locator {
  const line = page.getByText(new RegExp(`^${name}(?:\\s—\\s.*)?$`, "u"));
  return staffCard(page, "r2")
    .locator("*")
    .filter({ has: line })
    .filter({ has: page.getByRole("button", { name: "Modifier ce plat", exact: true }) })
    .last();
}

/** « + Ajouter une personne » of the R1 card or of an R2 dish (C-12, C-23). */
export async function openAddPerson(
  page: Page,
  restaurant: Restaurant,
  dish?: string,
): Promise<void> {
  const scope =
    restaurant === "r1" || dish === undefined ? staffCard(page, restaurant) : staffDish(page, dish);
  await scope.getByRole("button", { name: "+ Ajouter une personne", exact: true }).click();
}

/**
 * Two clicks on a delete button: armed (« Confirmer ? »), then confirmed (C-14). `button` must match the button in
 * both states: armed, its name becomes the detail of its `aria-label` (06 § 5.2).
 */
export async function confirmDelete(button: Locator): Promise<void> {
  await button.click();
  await expect(button).toHaveText("Confirmer ?");
  await button.click();
}
