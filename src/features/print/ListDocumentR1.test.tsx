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

/** Header cells, group headers first (Vitest gives the group headers the role `cell`, Playwright `columnheader`). */
function headers(): string[] {
  return [...document.querySelectorAll("thead th")].map((header) => header.textContent);
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
  it("prints the frame: school, date of printing, name, date, then « Menu », « Ouvert par », « Places »", async () => {
    await renderList();
    await expect.element(page.getByRole("img", { name: "Lycée Aristide Briand" })).toBeVisible();
    await expect
      .element(page.getByText(/^Lycée professionnel Aristide BriandRestaurants pédagogiques$/u))
      .toBeVisible();
    await expect
      .element(page.getByText("Imprimé le 5 octobre 2026", { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByRole("heading", { level: 1 }))
      .toHaveTextContent("Restaurant Pédagogique");
    await expect.element(page.getByText("mardi 6 octobre 2026", { exact: true })).toBeVisible();
    // Empty theme left out (07 § 3).
    expect(texts("term")).toStrictEqual(["Menu", "Ouvert par", "Places"]);
    expect(texts("definition")).toStrictEqual([
      "Velouté de potiron, blanquette, tarte Tatin",
      "M. Dupont",
      "15 / 20 couverts réservés",
    ]);
  });

  it("prints « Thème » first, and « Non renseigné » for a day opened without a name", async () => {
    await renderList([], [seedDay({ theme: "Automne", menu: "", openedBy: "" })]);
    expect(texts("term")).toStrictEqual(["Thème", "Ouvert par", "Places"]);
    expect(texts("definition")).toStrictEqual([
      "Automne",
      "Non renseigné",
      "0 / 20 couverts réservés",
    ]);
  });

  it("has the column groups and the columns of 07 § 3, the last two to fill in the room", async () => {
    await renderList();
    expect(headers()).toStrictEqual([
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
  });

  it("lists the bookings in the order of the sheet (D-08 not retained), « – » for empty counts", async () => {
    await renderList();
    const names = page
      .getByRole("row")
      .elements()
      .slice(2)
      .map((row) => row.querySelector("td")?.textContent);
    expect(names).toStrictEqual(["Cyrille Ungerer", "Léa Martin", "Jean Petit"]);
    expect(rowCells("Cyrille Ungerer")).toStrictEqual([
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
    // Booked before the prices: no count, no price (`PrixTotal` empty, 07 § 3).
    expect(rowCells("Jean Petit")).toStrictEqual([
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
      "detail left out when the counts do not add up",
      [UNGERER, MARTIN, PETIT],
      "15 couverts · 95,20\u00A0€",
    ],
    [
      "detail with the counts, empty parts left out",
      [UNGERER, MARTIN],
      "11 couverts · 2 élèves, 1 personnel, 8 extérieurs · 95,20\u00A0€",
    ],
    ["no price when the sum is 0", [{ ...PETIT, seats: 1 }], "1 couvert"],
    [
      "thousands separator of the euro format (E-20)",
      [{ ...MARTIN, seats: 120, externals: 120, total: 1188 }],
      "120 couverts · 120 extérieurs · 1\u202F188,00\u00A0€",
    ],
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

  it("prints the signature (07 § 3)", async () => {
    await renderList();
    await expect.element(page.getByText("Nom du responsable", { exact: true })).toBeVisible();
    await expect.element(page.getByText("Signature", { exact: true })).toBeVisible();
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
