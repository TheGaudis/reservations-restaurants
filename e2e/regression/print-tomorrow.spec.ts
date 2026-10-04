import { expect, test } from "../fixtures";
import {
  closePrintedDocument,
  printedDocument,
  printedInfo,
  printedRow,
  stubPrint,
  tomorrowBlock,
  tomorrowPanel,
  tomorrowPrintButton,
  tomorrowSummary,
} from "../pages/print";
import { target } from "../pages/target";
import { NAME1, NAME2, enterStaffMode } from "./print-helpers";

// Tomorrow panel and its printed summaries (09 § 4: C-01, C-03; 09 § 5: I-03, I-04; 06 § 2.1, 07 § 5-7). Tomorrow
// is 2026-10-06: R1 day with 3 bookings, R2 day with a 3-Bowl order, a Lasagnes order and an orphan booking.

const TOMORROW = "mardi 6 octobre 2026";

test.use({ reducedMotion: "reduce" });

test.beforeEach(async ({ page }) => {
  await stubPrint(page);
});

test(
  "tomorrowPanel (REG-39)",
  { tag: ["@changed:E-30", "@changed:E-44", "@C-01", "@C-03", "@p6"] },
  async ({ page }) => {
    await enterStaffMode(page);
    const legacy = target(test.info()) === "legacy";
    const panel = tomorrowPanel(page);
    await expect(panel.getByRole("heading", { name: `Demain (${TOMORROW})` })).toBeVisible();
    await expect(panel.getByText(`${NAME1} : 15 couverts réservés`)).toBeVisible();
    // E-30: the orphan booking (2 portions of a deleted dish) counts on the legacy panel only.
    await expect(panel.getByText(`${NAME2} : ${legacy ? 6 : 4} portions réservées`)).toBeVisible();
    // E-30: two panels on the legacy site, one merged panel on the React one (D-07).
    await expect(page.getByText(`Résumé pour demain (${TOMORROW})`)).toHaveCount(legacy ? 1 : 0);

    const r1 = tomorrowBlock(page, NAME1);
    await expect(r1.getByText("Ouvert par M. Dupont")).toBeVisible();
    await expect(r1.getByText("Réservés : 15 / 20 couverts — 95,20 €")).toBeVisible();
    await expect(
      r1.getByText("Clients : Cyrille Ungerer (TS2), Léa Martin (BTS1), Jean Petit (Personnel)"),
    ).toBeVisible();
    await expect(tomorrowPrintButton(page, NAME1)).toBeVisible();

    const r2 = tomorrowBlock(page, NAME2);
    await expect(r2.getByText("Ouvert par M. Dupont")).toBeVisible();
    await expect(tomorrowPrintButton(page, NAME2)).toBeVisible();
    await expect(r2.getByText(/Paul Durand/u)).toHaveCount(0);
    if (legacy) {
      await expect(r2.getByText("• Lasagnes: 1 portion(s) — 4,50 € (Noah Bernard)")).toBeVisible();
      await expect(
        r2.getByText("• Bowl: 3 portion(s) — 3 tickets restaurant (Ariele Gsell)"),
      ).toBeVisible();
      await expect(r2.getByText(`Total ${NAME2} : 4,50 € + 3 tickets restaurant`)).toBeVisible();
    } else {
      // E-44: ICU plurals and « {name} : » (annexe F); E-30: one voucher for the 3-Bowl order.
      await expect(r2.getByText("• Lasagnes : 1 portion — 4,50 € (Noah Bernard)")).toBeVisible();
      await expect(r2.getByText(/^• Bowl : 3 portions\b.*\(Ariele Gsell\)$/u)).toBeVisible();
      await expect(r2.getByText(`Total ${NAME2} : 4,50 € + 1 ticket restaurant`)).toBeVisible();
    }
  },
);

test.describe("tomorrowPanel (REG-39) — no day tomorrow", () => {
  // Tuesday 6 October 2026, 9:30 in Paris: nothing is open on Wednesday 7.
  test.use({ fixedTime: Date.parse("2026-10-06T07:30:00Z") });

  test(
    "tomorrowPanel (REG-39) — no day tomorrow",
    { tag: ["@changed:E-30", "@C-01", "@C-03", "@p6"] },
    async ({ page }) => {
      await enterStaffMode(page);
      const panel = tomorrowPanel(page);
      await expect(
        panel.getByRole("heading", { name: "Demain (mercredi 7 octobre 2026)" }),
      ).toBeVisible();
      await expect(panel.getByText(`${NAME1} : 0 couvert réservé`)).toBeVisible();
      await expect(panel.getByText(`${NAME2} : 0 portion réservée`)).toBeVisible();
      const summary = tomorrowSummary(page);
      await expect(summary.getByText("Aucun jour ouvert pour demain.")).toBeVisible();
      await expect(summary.getByRole("button", { name: "Imprimer" })).toHaveCount(0);
    },
  );
});

test(
  "printTomorrowDocuments (REG-42)",
  { tag: ["@changed:E-16", "@changed:E-44", "@I-03", "@I-04", "@p6"] },
  async ({ page }) => {
    await enterStaffMode(page);
    const legacy = target(test.info()) === "legacy";

    // Document C (07 § 6): short table, no theme, menu, detail nor signature.
    const r1 = await printedDocument(page, async () => tomorrowPrintButton(page, NAME1).click());
    await expect(r1.page()).toHaveTitle(`${NAME1} — demain ${TOMORROW}`);
    await expect(r1.getByRole("heading", { level: 1 })).toHaveText(NAME1);
    await expect(r1.getByText(`Demain, ${TOMORROW}`, { exact: true })).toBeVisible();
    await expect(r1.getByRole("term")).toHaveText(["Ouvert par", "Places"]);
    await expect(printedInfo(r1, "Places")).toHaveText("15 / 20 couverts réservés");
    await expect(r1.getByRole("columnheader")).toHaveText(["Nom", "Classe", "Couverts", "Prix"]);
    await expect(r1.getByRole("row")).toHaveText([
      /^Nom/u,
      /^Cyrille Ungerer/u,
      /^Léa Martin/u,
      /^Jean Petit/u,
    ]);
    expect(await printedRow(r1, "Cyrille Ungerer")).toStrictEqual([
      "Cyrille Ungerer",
      "TS2",
      "3",
      "16,00\u00A0€",
    ]);
    expect(await printedRow(r1, "Jean Petit")).toStrictEqual(["Jean Petit", "Personnel", "4", ""]);
    await expect(r1.getByText("15 couverts · 95,20 €", { exact: true })).toBeVisible();
    await expect(r1.getByText("Nom du responsable")).toHaveCount(0);
    await closePrintedDocument(r1);

    // E-44: the summary line next to the R2 button (annexe F on the React site).
    const lasagnes = legacy ? "• Lasagnes: 1 portion(s)" : "• Lasagnes : 1 portion —";
    await expect(tomorrowBlock(page, NAME2).getByText(lasagnes)).toBeVisible();

    // Document D (07 § 7): one heading and one table per dish; E-16: one voucher per order.
    const r2 = await printedDocument(page, async () => tomorrowPrintButton(page, NAME2).click());
    const voucher = legacy ? "3 tickets restaurant" : "1 ticket restaurant";
    await expect(r2.page()).toHaveTitle(`${NAME2} — demain ${TOMORROW}`);
    await expect(r2.getByText(`Demain, ${TOMORROW}`, { exact: true })).toBeVisible();
    await expect(r2.getByRole("term")).toHaveText(["Ouvert par"]);
    await expect(printedInfo(r2, "Ouvert par")).toHaveText("M. Dupont");
    await expect(r2.getByRole("heading", { level: 3 })).toHaveText([
      /^Lasagnes\s—\s4,50\s€ l'unité\s*1 \/ 15$/u,
      /^Bowl\s—\sprix d'un ticket restaurant\s*3 \/ 10$/u,
    ]);
    const tables = r2.getByRole("table");
    await expect(tables.first().getByRole("columnheader")).toHaveText([
      "Nom",
      "Classe",
      "Portions",
      "Prix",
    ]);
    expect(await printedRow(tables.first(), "Noah Bernard")).toStrictEqual([
      "Noah Bernard",
      "TS1",
      "1",
      "4,50\u00A0€",
    ]);
    expect(await printedRow(tables.nth(1), "Ariele Gsell")).toStrictEqual([
      "Ariele Gsell",
      "Vie scolaire",
      "3",
      voucher,
    ]);
    await expect(r2.getByText("Paul Durand")).toHaveCount(0);
    await expect(r2.getByText(`4 portions · 4,50 € + ${voucher}`, { exact: true })).toBeVisible();
    await expect(r2.getByText("Nom du responsable")).toHaveCount(0);
  },
);
