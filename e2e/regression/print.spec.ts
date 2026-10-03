import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures";
import { selectDay, showPeriod } from "../pages/calendar";
import { BLOCKED_FONT_PRELOAD, column, toast } from "../pages/home";
import {
  closePrintedDocument,
  printedDocument,
  printedInfo,
  printedRow,
  stubPrint,
} from "../pages/print";
import { target } from "../pages/target";
import type { Restaurant } from "../pages/target";
import { rawTexts } from "./helpers";
import { NAME1, NAME2, enterStaffMode } from "./print-helpers";

// Printed lists of a day (09 § 5: I-00 to I-02; 07 § 2-4, § 8). Tomorrow panel and documents: print-tomorrow.spec.ts.

const PRINTED_ON = "Imprimé le 5 octobre 2026";

test.use({ reducedMotion: "reduce" });

test.beforeEach(async ({ page, consoleLog }) => {
  consoleLog.allow(BLOCKED_FONT_PRELOAD);
  await stubPrint(page);
});

async function printDay(page: Page, restaurant: Restaurant, iso: string) {
  await selectDay(page, restaurant, iso);
  const button = column(page, restaurant).getByRole("button", { name: "Imprimer la liste" });
  return printedDocument(page, async () => button.click());
}

test(
  "printR1List (REG-40)",
  { tag: ["@changed:E-15", "@changed:E-20", "@I-01", "@p6"] },
  async ({ page }) => {
    await enterStaffMode(page);
    const list = await printDay(page, "r1", "2026-10-06");

    await expect(list.page()).toHaveTitle(`${NAME1} — mardi 6 octobre 2026`);
    await expect(
      list.getByText(/^Lycée professionnel Aristide Briand\s*Restaurants pédagogiques$/u),
    ).toBeVisible();
    await expect(list.getByText(PRINTED_ON, { exact: true })).toBeVisible();
    await expect(list.getByRole("heading", { level: 1 })).toHaveText(NAME1);
    await expect(list.getByText(/^mardi 6 octobre 2026$/iu)).toBeVisible();
    // Empty theme left out (07 § 3).
    await expect(list.getByRole("term")).toHaveText(["Menu", "Ouvert par", "Places"]);
    await expect(printedInfo(list, "Menu")).toHaveText(
      "Velouté de potiron, blanquette, tarte Tatin",
    );
    await expect(printedInfo(list, "Ouvert par")).toHaveText("M. Dupont");
    await expect(printedInfo(list, "Places")).toHaveText("15 / 20 couverts réservés");

    await expect(list.getByRole("columnheader")).toHaveText([
      "Client",
      "Réservation",
      "Informations",
      "À remplir en salle",
      "Nom",
      "Classe ou service",
      "Élèves",
      "Pers.",
      "Ext.",
      "Couverts",
      "Prix",
      "Contact",
      "Observation",
      "N° table",
      "Chef de rang",
    ]);
    // Order of the sheet, no sorting (07 § 3, D-08); « – » for an empty count, no price for an old booking.
    await expect(list.getByRole("row")).toHaveText([
      /^Client/u,
      /^Nom/u,
      /^Cyrille Ungerer/u,
      /^Léa Martin/u,
      /^Jean Petit/u,
    ]);
    expect(await printedRow(list, "Cyrille Ungerer")).toStrictEqual([
      "Cyrille Ungerer",
      "TS2",
      "2",
      "1",
      "–",
      "3",
      "16,00\u00A0€",
      "c.ungerer@exemple.fr",
      "Table près de la fenêtre",
      "",
      "",
    ]);
    expect(await printedRow(list, "Jean Petit")).toStrictEqual([
      "Jean Petit",
      "Personnel",
      "–",
      "–",
      "–",
      "4",
      "",
      "j.petit@exemple.fr",
      "",
      "",
      "",
    ]);
    // Counts 2 + 1 + 8 ≠ 15 covers: the detail is left out (07 § 3).
    await expect(list.getByText("Total", { exact: true })).toBeVisible();
    await expect(list.getByText("15 couverts · 95,20 €", { exact: true })).toBeVisible();
    await expect(list.getByText("Nom du responsable", { exact: true })).toBeVisible();
    await expect(list.getByText("Signature", { exact: true })).toBeVisible();
    // E-15: the legacy footer is screen-only; the React document has none at all.
    await expect(list.getByText(/Aristide Briand · Restaurants pédagogiques/u)).toBeHidden();
    await closePrintedDocument(list);

    // E-20: amounts above 999 € (legacy `formatEuro`, or the `euro` format with its thousands separator).
    await showPeriod(page, "r1", "next");
    const gala = await printDay(page, "r1", "2026-10-12");
    const amount = target(test.info()) === "legacy" ? "1188,00\u00A0€" : "1\u202F188,00\u00A0€";
    expect(await rawTexts(gala, /^120 couverts/u)).toStrictEqual([
      `120 couverts · 120 extérieurs · ${amount}`,
    ]);
    const anciens = await printedRow(gala, "Association des anciens");
    expect(anciens[6]).toBe(amount);
  },
);

test(
  "printR1List (REG-40) — popup blocked",
  { tag: ["@changed:E-15", "@I-00", "@p6", "@legacy-only"] },
  async ({ page }) => {
    await page.addInitScript(() => {
      window.open = () => null;
    });
    await enterStaffMode(page);
    await selectDay(page, "r1", "2026-10-06");
    const button = column(page, "r1").getByRole("button", { name: "Imprimer la liste" });
    if (target(test.info()) === "legacy") {
      await button.click();
      await expect(toast(page)).toHaveText("Autorisez les fenêtres de ce site pour imprimer.");
      return;
    }
    // E-15: no window to open, I-00 is gone.
    const list = await printedDocument(page, async () => button.click());
    await expect(list.getByRole("heading", { level: 1 })).toHaveText(NAME1);
    await expect(toast(page)).not.toContainText("Autorisez");
  },
);

test("printR2List (REG-41)", { tag: ["@changed:E-16", "@I-02", "@p6"] }, async ({ page }) => {
  await enterStaffMode(page);
  const list = await printDay(page, "r2", "2026-10-06");

  await expect(list.page()).toHaveTitle(`${NAME2} — mardi 6 octobre 2026`);
  await expect(list.getByText(PRINTED_ON, { exact: true })).toBeVisible();
  await expect(list.getByRole("heading", { level: 1 })).toHaveText(NAME2);
  await expect(list.getByRole("term")).toHaveText(["Ouvert par"]);
  await expect(printedInfo(list, "Ouvert par")).toHaveText("M. Dupont");

  // One row per customer, sorted by class then name; the orphan booking of a deleted dish is not listed.
  await expect(list.getByRole("heading", { level: 2 })).toHaveText([
    "Par client (2)",
    "Récapitulatif par plat",
  ]);
  const customers = list.getByRole("table").first();
  await expect(customers.getByRole("columnheader")).toHaveText([
    "Nom",
    "Classe",
    "Plats",
    "Portions",
    "Prix",
    "Mode",
    "Contact",
  ]);
  await expect(customers.getByRole("row")).toHaveText([
    /^Nom/u,
    /^Noah Bernard/u,
    /^Ariele Gsell/u,
  ]);
  await expect(list.getByText("Paul Durand")).toHaveCount(0);
  const bernard = await printedRow(customers, "Noah Bernard");
  expect(bernard.slice(0, 2)).toStrictEqual(["Noah Bernard", "TS1"]);
  // Dish line, then the customer's observation (07 § 4.2).
  expect(bernard[2]).toMatch(/^1× Lasagnes\s—\s4,50\s€\s*Sans fromage$/u);
  expect(bernard.slice(3)).toStrictEqual(["1", "4,50\u00A0€", "Sur place", "n.bernard@exemple.fr"]);
  const voucher = target(test.info()) === "legacy" ? "3 tickets restaurant" : "1 ticket restaurant";
  const gsell = await printedRow(customers, "Ariele Gsell");
  expect(gsell.slice(0, 2)).toStrictEqual(["Ariele Gsell", "Vie scolaire"]);
  expect(gsell[2]).toMatch(/^3× Bowl/u);
  expect(gsell.slice(3)).toStrictEqual(["3", voucher, "Sur place", "a.gsell@exemple.fr"]);

  const dishes = list.getByRole("table").nth(1);
  await expect(dishes.getByRole("columnheader")).toHaveText([
    "Plat",
    "Prix unitaire",
    "Portions",
    "Montant",
  ]);
  expect(await printedRow(dishes, "Lasagnes")).toStrictEqual([
    "Lasagnes",
    "4,50\u00A0€",
    "1 / 15",
    "4,50\u00A0€",
  ]);
  const bowl = await printedRow(dishes, "Bowl");
  expect(bowl.slice(0, 3)).toStrictEqual(["Bowl", "prix d'un ticket restaurant", "3 / 10"]);
  await expect(list.getByText("Total du jour", { exact: true })).toBeVisible();
  await expect(
    list.getByText(`2 clients · 4 portions · 4,50 € + ${voucher}`, { exact: true }),
  ).toBeVisible();
  await expect(list.getByText("Nom du responsable", { exact: true })).toBeVisible();
  await closePrintedDocument(list);

  // Today: Léa Martin (BTS1) before Cyrille Ungerer (TS2), who booked first.
  const today = await printDay(page, "r2", "2026-10-05");
  await expect(today.getByRole("table").first().getByRole("row")).toHaveText([
    /^Nom/u,
    /^Léa Martin/u,
    /^Cyrille Ungerer/u,
  ]);
});
