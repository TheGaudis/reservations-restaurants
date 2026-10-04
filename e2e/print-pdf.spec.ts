import type { Page } from "@playwright/test";

import { SEED_PASSWORD } from "@/mocks/fixtures/seed";

import { expect, test } from "./fixtures";
import { selectDay } from "./pages/calendar";
import { BLOCKED_FONT_PRELOAD, column, gotoHome, toast } from "./pages/home";
import { login, logout } from "./pages/login";
import { closePrintedDocument, printedDocument, stubPrint } from "./pages/print";

// Printing in the same document on the built site (PLAN § 3.8, P6; E-15, R-27): `window.print` intercepted, the page
// read in print media, then turned into a PDF by Chromium to check the A4 landscape page and the page count.

const DAY = "2026-10-06";
const PAGE_TITLE = "Réservations — Restaurants pédagogiques";
const DOCUMENT_TITLE = "Restaurant Pédagogique — mardi 6 octobre 2026";
// A4 landscape in PDF points (1/72 in): 297 × 210 mm.
const A4_LANDSCAPE = { width: 842, height: 595 };

test.use({ reducedMotion: "reduce" });

test.beforeEach(async ({ page, consoleLog }) => {
  consoleLog.allow(BLOCKED_FONT_PRELOAD);
  await stubPrint(page);
});

async function openStaffDay(page: Page): Promise<void> {
  await gotoHome(page);
  await login(page, SEED_PASSWORD);
  await expect(toast(page)).toHaveText("Mode collègue activé.");
  await selectDay(page, "r1", DAY);
}

function printButton(page: Page, restaurant: "r1" | "r2" = "r1") {
  return column(page, restaurant).getByRole("button", { name: "Imprimer la liste" });
}

interface PageSize {
  width: number;
  height: number;
}

/** Size of each page of the PDF, read from its `/MediaBox` entries. */
async function pdfPages(page: Page): Promise<PageSize[]> {
  const buffer = await page.pdf({ preferCSSPageSize: true });
  const pdf = buffer.toString("latin1");
  return [...pdf.matchAll(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/gu)].map((match) => ({
    width: Math.round(Number(match[1])),
    height: Math.round(Number(match[2])),
  }));
}

test("prints the R1 list alone, then gives the page back (PLAN P6, E-15)", async ({ page }) => {
  await openStaffDay(page);
  const printed = await printedDocument(page, async () => printButton(page).click());

  // The title names the PDF (07 § 3); nothing of the site prints, the document is the only child of <body> shown.
  await expect(page).toHaveTitle(DOCUMENT_TITLE);
  await expect(printed.getByRole("heading", { level: 1 })).toHaveText("Restaurant Pédagogique");
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(page.getByRole("main")).toBeHidden();
  const shown = await page.evaluate(() =>
    [...document.body.children]
      .filter((child) => getComputedStyle(child).display !== "none")
      .map((child) => child.className),
  );
  expect(shown).toStrictEqual(["print-root"]);

  expect(await pdfPages(page)).toStrictEqual([A4_LANDSCAPE]);

  await closePrintedDocument(printed);
  await expect(page).toHaveTitle(PAGE_TITLE);
  await expect(printed).toHaveCount(0);
  await expect(printButton(page)).toBeFocused();
  await expect(page.getByRole("main")).toBeVisible();
});

test("spreads a long list over several landscape pages (07 § 2.4)", async ({
  page,
  fakeScript,
}) => {
  for (let index = 1; index <= 40; index += 1) {
    fakeScript.db.r1Bookings.push({
      ID: `r1b-long-${index}`,
      Date: DAY,
      Nom: `Invité ${index}`,
      Contact: `invite${index}@exemple.fr`,
      Classe: "Extérieurs",
      Qte: 2,
      Timestamp: "2026-10-01",
      Observation: index % 5 === 0 ? "Allergie aux fruits à coque" : "",
      NbEleve: 0,
      NbProf: 0,
      NbExt: 2,
      PrixTotal: 19.8,
    });
  }
  await openStaffDay(page);
  const printed = await printedDocument(page, async () => printButton(page).click());
  await expect(printed.getByRole("row", { name: /Invité 40/u })).toHaveCount(1);

  const pages = await pdfPages(page);
  // 43 rows of 11 mm: 4 pages with the bundled fonts; a range keeps the test stable across Chromium versions.
  expect(pages.length).toBeGreaterThanOrEqual(3);
  expect(pages.length).toBeLessThanOrEqual(5);
  for (const size of pages) expect(size).toStrictEqual(A4_LANDSCAPE);
});

test("logging out removes a document printed without afterprint (invariant 1, S8)", async ({
  page,
}) => {
  await openStaffDay(page);
  await selectDay(page, "r2", DAY);
  const printed = await printedDocument(page, async () => printButton(page, "r2").click());
  await expect(printed.getByRole("heading", { level: 2 }).first()).toHaveText("Par client (2)");
  // Document B prints on the same A4 landscape page (07 § 2.1, § 4).
  expect(await pdfPages(page)).toStrictEqual([A4_LANDSCAPE]);

  // The print dialog closed without afterprint, then the colleague leaves the staff mode.
  await page.emulateMedia({ media: null });
  await logout(page);
  await expect(toast(page)).toHaveText("Retour au mode client.");
  await expect(page.locator("body > .print-root")).toBeEmpty();
  await expect(page).toHaveTitle(PAGE_TITLE);
  const text = await page.evaluate(() => document.body.textContent);
  for (const name of ["Ariele Gsell", "Noah Bernard", "a.gsell@exemple.fr"]) {
    expect(text).not.toContain(name);
  }
});
