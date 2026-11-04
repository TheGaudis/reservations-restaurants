import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import { listR1 } from "@/domain/print";
import type { BookingR1, StaffServiceDayR1 } from "@/domain/types";
import { ListDocumentR1 } from "@/features/print/ListDocumentR1";
import { TEST_NOW } from "@/test/clock";
import { fullState } from "@/test/domain-states";
import { DAY, MARTIN, PETIT, UNGERER, seedDayR1 as seedDay } from "@/test/print-lists";
import { renderWithProviders } from "@/test/render";

// Document A, list of an R1 day (07 § 2-3), rendered from a snapshot of the full state (src/test/print-lists.ts).

async function renderList(
  bookings: BookingR1[] = [UNGERER, MARTIN, PETIT],
  days: StaffServiceDayR1[] = [seedDay()],
) {
  const list = listR1(fullState({ r1Days: days, r1Bookings: bookings }), DAY);
  const rendered = await renderWithProviders(<ListDocumentR1 list={list} printedAt={TEST_NOW} />);
  await expect.element(page.getByRole("heading", { level: 1 })).toBeVisible();
  return rendered;
}

function texts(role: "term" | "definition"): string[] {
  return page
    .getByRole(role)
    .elements()
    .map((element) => element.textContent);
}

function rowCells(name: string): string[] {
  return page
    .getByRole("row")
    .filter({ hasText: name })
    .getByRole("cell")
    .elements()
    .map((cell) => cell.textContent);
}

/** Value next to the label « Total » (07 § 2.2). */
function totalValue(): string | undefined {
  return page.getByText("Total", { exact: true }).element().nextElementSibling?.textContent;
}

describe("ListDocumentR1 (07 § 3)", () => {
  it("prints « Thème » first, and « Non renseigné » for a day opened without a name", async () => {
    await renderList([], [seedDay({ theme: "Automne", menu: "", openedBy: "" })]);
    expect(texts("term")).toStrictEqual(["Thème", "Ouvert par", "Places"]);
    expect(texts("definition")).toStrictEqual([
      "Automne",
      "Non renseigné",
      "0 / 20 couverts réservés",
    ]);
  });

  it("greys the dashes and marks a written observation only", async () => {
    await renderList();
    const cells = page.getByRole("row").filter({ hasText: "Cyrille Ungerer" }).getByRole("cell");
    expect(cells.nth(4).element().dataset["tone"]).toBe("muted");
    expect(cells.nth(8).element().dataset["tone"]).toBe("marked");
    const petit = page.getByRole("row").filter({ hasText: "Jean Petit" }).getByRole("cell");
    expect(petit.nth(8).element().dataset["tone"]).toBeUndefined();
  });

  it("leaves a price of 0 empty (spec/README § 4.1)", async () => {
    await renderList([{ ...UNGERER, total: 0 }]);
    expect(rowCells("Cyrille Ungerer")[6]).toBe("");
  });

  it.each<[string, BookingR1[], string]>([
    [
      "detail with the counts, empty parts left out",
      [UNGERER, MARTIN],
      "11 couverts · 2 élèves, 1 personnel, 8 extérieurs · 95,20\u00A0€",
    ],
    ["no price when the sum is 0", [{ ...PETIT, seats: 1 }], "1 couvert"],
  ])("writes the total: %s (07 § 3)", async (_case, bookings, total) => {
    await renderList(bookings);
    await expect.element(page.getByText("Total", { exact: true })).toBeVisible();
    expect(totalValue()).toBe(total);
  });

  it("says « Aucune réservation. » in a single row, and totals 0 couvert", async () => {
    await renderList([]);
    const cell = page.getByText("Aucune réservation.", { exact: true });
    await expect.element(cell).toBeVisible();
    expect(cell.element().tagName).toBe("TD");
    expect(cell.element().getAttribute("colspan")).toBe("11");
    expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(totalValue()).toBe("0 couvert");
  });

  it("says « Ce jour n'est plus ouvert. » for a day deleted since, without informations nor total (a-24)", async () => {
    await renderList([], []);
    await expect
      .element(page.getByText("Ce jour n'est plus ouvert.", { exact: true }))
      .toBeVisible();
    expect(texts("term")).toStrictEqual([]);
    await expect.element(page.getByRole("table")).not.toBeInTheDocument();
    await expect.element(page.getByText("Total", { exact: true })).not.toBeInTheDocument();
  });
});
