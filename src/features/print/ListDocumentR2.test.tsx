import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import { listR2 } from "@/domain/print";
import type { BookingR2, Dish, StaffServiceDayR2 } from "@/domain/types";
import { ListDocumentR2 } from "@/features/print/ListDocumentR2";
import { TEST_NOW } from "@/test/clock";
import { bookingR2, fullState } from "@/test/domain-states";
import {
  BERNARD_LASAGNES,
  BOWL,
  DAY,
  DURAND_ORPHAN,
  GSELL_BOWL,
  LASAGNES,
  seedDayR2,
} from "@/test/print-lists";
import { renderWithProviders } from "@/test/render";

// Document B, list of an R2 day (07 § 2, § 4), rendered from a snapshot of the full state (src/test/print-lists.ts).

const SEED_BOOKINGS = [GSELL_BOWL, BERNARD_LASAGNES, DURAND_ORPHAN];

async function renderList(
  r2Bookings: BookingR2[] = SEED_BOOKINGS,
  dishes: Dish[] = [LASAGNES, BOWL],
  days: StaffServiceDayR2[] = [seedDayR2()],
) {
  const list = listR2(fullState({ r2Days: days, dishes, r2Bookings }), DAY);
  await renderWithProviders(<ListDocumentR2 list={list} printedAt={TEST_NOW} />);
  await expect.element(page.getByRole("heading", { level: 1 })).toBeVisible();
}

function texts(role: "term" | "definition" | "heading"): string[] {
  return page
    .getByRole(role)
    .elements()
    .map((element) => element.textContent);
}

function table(index: number) {
  return page.getByRole("table").nth(index);
}

function rowCells(tableIndex: number, name: string): string[] {
  return table(tableIndex)
    .getByRole("row")
    .filter({ hasText: name })
    .getByRole("cell")
    .elements()
    .map((cell) => cell.textContent);
}

function rowTexts(tableIndex: number): string[] {
  return table(tableIndex)
    .getByRole("row")
    .elements()
    .map((row) => row.textContent);
}

/** Value next to the label « Total du jour » (07 § 4.2). */
function totalValue(): string | undefined {
  return page.getByText("Total du jour", { exact: true }).element().nextElementSibling?.textContent;
}

describe("ListDocumentR2 (07 § 4)", () => {
  it("prints the frame: name, date, « Ouvert par » only when the theme and the note are empty", async () => {
    await renderList();
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("Aristide");
    await expect.element(page.getByText("mardi 6 octobre 2026", { exact: true })).toBeVisible();
    await expect
      .element(page.getByText("Imprimé le 5 octobre 2026", { exact: true }))
      .toBeVisible();
    expect(texts("term")).toStrictEqual(["Ouvert par"]);
    expect(texts("definition")).toStrictEqual(["M. Dupont"]);
  });

  it("prints « Thème », « Note », then « Non renseigné » for a day opened without a name", async () => {
    await renderList(
      [],
      [],
      [seedDayR2({ theme: "Italie", note: "Pâtes fraîches", openedBy: "" })],
    );
    expect(texts("term")).toStrictEqual(["Thème", "Note", "Ouvert par"]);
    expect(texts("definition")).toStrictEqual(["Italie", "Pâtes fraîches", "Non renseigné"]);
  });

  it("lists one row per customer sorted by class then name, the orphan left out (07 § 4.1, b-3)", async () => {
    await renderList();
    expect(texts("heading").slice(1)).toStrictEqual(["Par client (2)", "Récapitulatif par plat"]);
    expect(
      table(0)
        .getByRole("columnheader")
        .elements()
        .map((header) => header.textContent),
    ).toStrictEqual(["Nom", "Classe", "Plats", "Portions", "Prix", "Mode", "Contact"]);
    expect(
      rowTexts(0)
        .slice(1)
        .map((row) => row.split(" ")[0]),
    ).toStrictEqual(["Noah", "Ariele"]);
    await expect.element(page.getByText("Paul Durand")).not.toBeInTheDocument();
  });

  it("prints the dish lines, the observation, the amount with one voucher per order and the mode (07 § 4.2, E-16)", async () => {
    await renderList();
    expect(rowCells(0, "Noah Bernard")).toStrictEqual([
      "Noah Bernard",
      "TS1",
      "1× Lasagnes — 4,50 €Sans fromage",
      "1",
      "4,50 €",
      "Sur place",
      "n.bernard@exemple.fr",
    ]);
    expect(rowCells(0, "Ariele Gsell")).toStrictEqual([
      "Ariele Gsell",
      "Vie scolaire",
      "3× Bowl — 1 ticket restaurant",
      "3",
      "1 ticket restaurant",
      "Sur place",
      "a.gsell@exemple.fr",
    ]);
    await expect.element(page.getByText("Sans fromage")).toHaveStyle({ fontStyle: "italic" });
  });

  it("groups the bookings of a customer and joins their modes with « + » (07 § 4.1)", async () => {
    const takeaway = bookingR2("gsell-2", "lasagnes", {
      name: " ariele GSELL",
      className: "Vie scolaire",
      contact: "A.Gsell@exemple.fr",
      portions: 2,
      serviceMode: "takeaway",
    });
    await renderList([GSELL_BOWL, takeaway]);
    expect(rowCells(0, "Ariele Gsell")).toStrictEqual([
      "Ariele Gsell",
      "Vie scolaire",
      "3× Bowl — 1 ticket restaurant2× Lasagnes — 9,00 €",
      "5",
      "9,00 € + 1 ticket restaurant",
      "Sur place + À emporter",
      "a.gsell@exemple.fr",
    ]);
  });

  it("summarises every dish of the day in the order of the sheet (07 § 4.2)", async () => {
    await renderList();
    expect(rowCells(1, "Lasagnes")).toStrictEqual(["Lasagnes", "4,50 €", "1 / 15", "4,50 €"]);
    expect(rowCells(1, "Bowl")).toStrictEqual([
      "Bowl",
      "prix d'un ticket restaurant",
      "3 / 10",
      "1 ticket restaurant",
    ]);
  });

  it("totals the day with one voucher per order, then the signature (07 § 4.2, E-16)", async () => {
    await renderList();
    expect(totalValue()).toBe("2 clients · 4 portions · 4,50 € + 1 ticket restaurant");
    await expect.element(page.getByText("Nom du responsable", { exact: true })).toBeVisible();
  });

  it("prints « Aucune réservation. » and « Aucun plat. » for an empty day", async () => {
    await renderList([], []);
    await expect.element(page.getByText("Aucune réservation.", { exact: true })).toBeVisible();
    await expect.element(page.getByText("Aucun plat.", { exact: true })).toBeVisible();
    expect(texts("heading").slice(1)).toStrictEqual(["Par client (0)", "Récapitulatif par plat"]);
    expect(totalValue()).toBe("0 client · 0 portion");
  });
});
