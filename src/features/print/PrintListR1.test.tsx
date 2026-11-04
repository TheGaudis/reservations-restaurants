import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import { listR1 } from "@/domain/print";
import type { BookingR1, StaffServiceDayR1 } from "@/domain/types";
import { PrintListR1 } from "@/features/print/PrintListR1";
import { TEST_NOW } from "@/test/clock";
import { fullState } from "@/test/domain-states";
import { DAY, MARTIN, PETIT, UNGERER, seedDayR1 } from "@/test/print-lists";
import { renderWithProviders } from "@/test/render";

// Documents A (07 § 3) and C (07 § 6), rendered from a snapshot of the full state (src/test/print-lists.ts). At
// TEST_NOW, tomorrow is Tuesday 6 October 2026.

async function renderList(
  tomorrow: boolean,
  bookings: BookingR1[] = [UNGERER, MARTIN, PETIT],
  days: StaffServiceDayR1[] = [seedDayR1({ theme: "Automne" })],
) {
  const list = listR1(fullState({ r1Days: days, r1Bookings: bookings }), DAY);
  await renderWithProviders(<PrintListR1 list={list} tomorrow={tomorrow} printedAt={TEST_NOW} />);
  await expect.element(page.getByRole("heading", { level: 1 })).toBeVisible();
}

function texts(selector: string): string[] {
  return [...document.querySelectorAll(selector)].map((element) => element.textContent);
}

/** Value next to the label « Total » (07 § 2.2). */
function totalValue(): string | undefined {
  return page.getByText("Total", { exact: true }).element().nextElementSibling?.textContent;
}

describe("PrintListR1, document A (07 § 3)", () => {
  it("prints « Thème » first, and « Non renseigné » for a day opened without a name", async () => {
    await renderList(false, [], [seedDayR1({ theme: "Automne", menu: "", openedBy: "" })]);
    expect(texts("dt")).toStrictEqual(["Thème", "Ouvert par", "Places"]);
    expect(texts("dd")).toStrictEqual(["Automne", "Non renseigné", "0 / 20 couverts réservés"]);
  });

  it("greys the dashes, marks a written observation only, leaves a price of 0 empty", async () => {
    await renderList(false, [UNGERER, { ...PETIT, total: 0 }]);
    const ungerer = page.getByRole("row").filter({ hasText: "Cyrille Ungerer" }).getByRole("cell");
    expect(ungerer.nth(4).element().dataset["tone"]).toBe("muted");
    expect(ungerer.nth(8).element().dataset["tone"]).toBe("marked");
    const petit = page.getByRole("row").filter({ hasText: "Jean Petit" }).getByRole("cell");
    expect(petit.nth(8).element().dataset["tone"]).toBeUndefined();
    expect(petit.nth(6).element().textContent).toBe("");
  });

  it.each<[string, BookingR1[], string]>([
    [
      "detail with the counts, empty parts left out",
      [UNGERER, MARTIN],
      "11 couverts · 2 élèves, 1 personnel, 8 extérieurs · 95,20 €",
    ],
    ["no detail when the counts do not add up", [UNGERER, PETIT], "7 couverts · 16,00 €"],
    ["no price when the sum is 0", [{ ...PETIT, seats: 1 }], "1 couvert"],
  ])("writes the total: %s", async (_case, bookings, total) => {
    await renderList(false, bookings);
    expect(totalValue()).toBe(total);
    await expect.element(page.getByText("Nom du responsable", { exact: true })).toBeVisible();
  });

  it("says « Aucune réservation. » in a single row, and totals 0 couvert", async () => {
    await renderList(false, []);
    const cell = page.getByText("Aucune réservation.", { exact: true });
    await expect.element(cell).toBeVisible();
    expect(cell.element().getAttribute("colspan")).toBe("11");
    expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(totalValue()).toBe("0 couvert");
  });

  it("says « Ce jour n'est plus ouvert. » for a day deleted since, without informations nor total (a-24)", async () => {
    await renderList(false, [], []);
    await expect
      .element(page.getByText("Ce jour n'est plus ouvert.", { exact: true }))
      .toBeVisible();
    expect(texts("dt")).toStrictEqual([]);
    await expect.element(page.getByRole("table")).not.toBeInTheDocument();
    await expect.element(page.getByText("Total", { exact: true })).not.toBeInTheDocument();
  });
});

describe("PrintListR1, document C (07 § 6)", () => {
  it("prints « Demain, {date} », then « Ouvert par » and « Places » only", async () => {
    await renderList(true);
    await expect
      .element(page.getByText("Demain, mardi 6 octobre 2026", { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByText("Imprimé le 5 octobre 2026", { exact: true }))
      .toBeVisible();
    expect(texts("dt")).toStrictEqual(["Ouvert par", "Places"]);
    expect(texts("dd")).toStrictEqual(["M. Dupont", "15 / 20 couverts réservés"]);
  });

  it("lists name, class, seats and price, totals without the detail, no signature", async () => {
    await renderList(true, [UNGERER, MARTIN]);
    expect(texts("thead th")).toStrictEqual(["Nom", "Classe", "Couverts", "Prix"]);
    expect(texts("tbody tr:first-child td")).toStrictEqual([
      "Cyrille Ungerer",
      "TS2",
      "3",
      "16,00 €",
    ]);
    expect(totalValue()).toBe("11 couverts · 95,20 €");
    await expect.element(page.getByText("Nom du responsable")).not.toBeInTheDocument();
  });

  it("says « Aucun jour ouvert pour demain. » without a day, with no informations nor total", async () => {
    await renderList(true, [], []);
    await expect
      .element(page.getByText("Aucun jour ouvert pour demain.", { exact: true }))
      .toBeVisible();
    expect(texts("dt")).toStrictEqual([]);
    await expect.element(page.getByRole("table")).not.toBeInTheDocument();
    await expect.element(page.getByText("Total", { exact: true })).not.toBeInTheDocument();
  });
});
