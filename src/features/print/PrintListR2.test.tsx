import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import { listR2 } from "@/domain/print";
import type { BookingR2, Dish, StaffServiceDayR2 } from "@/domain/types";
import { PrintListR2 } from "@/features/print/PrintListR2";
import { TEST_NOW } from "@/test/clock";
import { bookingR2, dish, fullState } from "@/test/domain-states";
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

// Documents B (07 § 4) and D (07 § 7), rendered from a snapshot of the full state (src/test/print-lists.ts).

async function renderList(
  tomorrow: boolean,
  r2Bookings: BookingR2[] = [GSELL_BOWL, BERNARD_LASAGNES, DURAND_ORPHAN],
  dishes: Dish[] = [LASAGNES, BOWL],
  days: StaffServiceDayR2[] = [seedDayR2()],
) {
  const list = listR2(fullState({ r2Days: days, dishes, r2Bookings }), DAY);
  await renderWithProviders(<PrintListR2 list={list} tomorrow={tomorrow} printedAt={TEST_NOW} />);
  await expect.element(page.getByRole("heading", { level: 1 })).toBeVisible();
}

function texts(selector: string): string[] {
  return [...document.querySelectorAll(selector)].map((element) => element.textContent);
}

function rowCells(tableIndex: number, name: string): string[] {
  return page
    .getByRole("table")
    .nth(tableIndex)
    .getByRole("row")
    .filter({ hasText: name })
    .getByRole("cell")
    .elements()
    .map((cell) => cell.textContent);
}

function totalValue(label: string): string | undefined {
  return page.getByText(label, { exact: true }).element().nextElementSibling?.textContent;
}

describe("PrintListR2, document B (07 § 4)", () => {
  it("prints « Ouvert par » alone when the theme and the note are empty", async () => {
    await renderList(false);
    await expect.element(page.getByText("mardi 6 octobre 2026", { exact: true })).toBeVisible();
    expect(texts("dt")).toStrictEqual(["Ouvert par"]);
    expect(texts("dd")).toStrictEqual(["M. Dupont"]);
  });

  it("prints « Thème », « Note », then « Non renseigné » for a day opened without a name", async () => {
    await renderList(false, [], [], [seedDayR2({ theme: "Italie", note: "Pâtes", openedBy: "" })]);
    expect(texts("dt")).toStrictEqual(["Thème", "Note", "Ouvert par"]);
    expect(texts("dd")).toStrictEqual(["Italie", "Pâtes", "Non renseigné"]);
  });

  it("lists one row per customer sorted by class then name, the orphan left out (07 § 4.1, b-3)", async () => {
    await renderList(false);
    expect(texts("h2")).toStrictEqual(["Par client (2)", "Récapitulatif par plat"]);
    expect(texts("table:first-of-type thead th")).toStrictEqual([
      "Nom",
      "Classe",
      "Plats",
      "Portions",
      "Prix",
      "Mode",
      "Contact",
    ]);
    expect(rowCells(0, "Noah Bernard")).toStrictEqual([
      "Noah Bernard",
      "TS1",
      "1× Lasagnes\u00A0— 4,50\u00A0€Sans fromage",
      "1",
      "4,50\u00A0€",
      "Sur place",
      "n.bernard@exemple.fr",
    ]);
    expect(texts("table:first-of-type tbody tr").map((row) => row.split(" ")[0])).toStrictEqual([
      "Noah",
      "Ariele",
    ]);
    await expect.element(page.getByText("Paul Durand")).not.toBeInTheDocument();
  });

  it("groups the bookings of a customer, one voucher per order, modes joined with « + » (07 § 4.1, E-16)", async () => {
    const takeaway = bookingR2("gsell-2", "lasagnes", {
      name: " ariele GSELL",
      className: "Vie scolaire",
      contact: "A.Gsell@exemple.fr",
      portions: 2,
      serviceMode: "takeaway",
    });
    await renderList(false, [GSELL_BOWL, takeaway]);
    expect(rowCells(0, "Ariele Gsell")).toStrictEqual([
      "Ariele Gsell",
      "Vie scolaire",
      "3× Bowl\u00A0— 1 ticket restaurant2× Lasagnes\u00A0— 9,00\u00A0€",
      "5",
      "9,00\u00A0€ + 1 ticket restaurant",
      "Sur place + À emporter",
      "a.gsell@exemple.fr",
    ]);
  });

  it("summarises every dish of the day, totals the day, then the signature (07 § 4.2, E-16)", async () => {
    await renderList(false);
    expect(rowCells(1, "Lasagnes")).toStrictEqual([
      "Lasagnes",
      "4,50\u00A0€",
      "1 / 15",
      "4,50\u00A0€",
    ]);
    expect(rowCells(1, "Bowl")).toStrictEqual([
      "Bowl",
      "prix d'un ticket restaurant",
      "3 / 10",
      "1 ticket restaurant",
    ]);
    expect(totalValue("Total du jour")).toBe(
      "2 clients · 4 portions · 4,50\u00A0€ + 1 ticket restaurant",
    );
    await expect.element(page.getByText("Nom du responsable", { exact: true })).toBeVisible();
  });

  it("prints « Aucune réservation. » and « Aucun plat. » for an empty day", async () => {
    await renderList(false, [], []);
    await expect.element(page.getByText("Aucune réservation.", { exact: true })).toBeVisible();
    await expect.element(page.getByText("Aucun plat.", { exact: true })).toBeVisible();
    expect(totalValue("Total du jour")).toBe("0 client · 0 portion");
  });
});

describe("PrintListR2, document D (07 § 7)", () => {
  it("prints « Demain, {date} » as an h2 and « Ouvert par » only", async () => {
    await renderList(true);
    await expect
      .element(page.getByRole("heading", { level: 2 }))
      .toHaveTextContent("Demain, mardi 6 octobre 2026");
    expect(texts("dt")).toStrictEqual(["Ouvert par"]);
  });

  it("titles each dish with its price, « l'unité » for euros only, and the booked portions", async () => {
    const free = dish("pain", DAY, { name: "Pain", stock: 20, price: 0 });
    const noPrice = dish("salade", DAY, { name: "Salade", stock: 5 });
    await renderList(true, undefined, [LASAGNES, BOWL, free, noPrice]);
    expect(texts("h3")).toStrictEqual([
      "Lasagnes\u00A0— 4,50\u00A0€ l'unité1 / 15",
      "Bowl\u00A0— prix d'un ticket restaurant3 / 10",
      "Pain0 / 20",
      "Salade0 / 5",
    ]);
    expect(texts("section:nth-of-type(3) td")).toStrictEqual(["Aucune réservation."]);
  });

  it("lists the bookings of each dish, totals with one voucher per order, no signature (E-16)", async () => {
    await renderList(true);
    expect(texts("section:first-of-type thead th")).toStrictEqual([
      "Nom",
      "Classe",
      "Portions",
      "Prix",
    ]);
    expect(rowCells(0, "Noah Bernard")).toStrictEqual(["Noah Bernard", "TS1", "1", "4,50\u00A0€"]);
    expect(rowCells(1, "Ariele Gsell")).toStrictEqual([
      "Ariele Gsell",
      "Vie scolaire",
      "3",
      "1 ticket restaurant",
    ]);
    await expect.element(page.getByText("Paul Durand")).not.toBeInTheDocument();
    expect(totalValue("Total")).toBe("4 portions · 4,50\u00A0€ + 1 ticket restaurant");
    await expect.element(page.getByText("Nom du responsable")).not.toBeInTheDocument();
  });

  it.each<[string, Dish[], StaffServiceDayR2[], string]>([
    ["without dish", [], [seedDayR2()], "Aucun plat ouvert."],
    ["without day", [LASAGNES], [], "Aucun jour ouvert pour demain."],
  ])("prints a note %s, with no total", async (_case, dishes, days, note) => {
    await renderList(true, [], dishes, days);
    await expect.element(page.getByText(note, { exact: true })).toBeVisible();
    await expect.element(page.getByText("Total", { exact: true })).not.toBeInTheDocument();
  });
});
