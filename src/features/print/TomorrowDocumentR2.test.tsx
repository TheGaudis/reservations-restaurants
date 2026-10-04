import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import { listR2 } from "@/domain/print";
import type { BookingR2, Dish, StaffServiceDayR2 } from "@/domain/types";
import { TomorrowDocumentR2 } from "@/features/print/TomorrowDocumentR2";
import { TEST_NOW } from "@/test/clock";
import { dish, fullState } from "@/test/domain-states";
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

// Document D, R2 summary of tomorrow (07 § 7), rendered from a snapshot of the full state (src/test/print-lists.ts).

async function renderSummary(
  r2Bookings: BookingR2[] = [GSELL_BOWL, BERNARD_LASAGNES, DURAND_ORPHAN],
  dishes: Dish[] = [LASAGNES, BOWL],
  days: StaffServiceDayR2[] = [seedDayR2()],
) {
  const list = listR2(fullState({ r2Days: days, dishes, r2Bookings }), DAY);
  await renderWithProviders(<TomorrowDocumentR2 list={list} printedAt={TEST_NOW} />);
  await expect.element(page.getByRole("heading", { level: 1 })).toBeVisible();
}

function texts(role: "term" | "definition"): string[] {
  return page
    .getByRole(role)
    .elements()
    .map((element) => element.textContent);
}

function dishHeadings(): string[] {
  return page
    .getByRole("heading", { level: 3 })
    .elements()
    .map((heading) => heading.textContent);
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

function totalValue(): string | undefined {
  return page.getByText("Total", { exact: true }).element().nextElementSibling?.textContent;
}

describe("TomorrowDocumentR2 (07 § 7)", () => {
  it("prints « Demain, {date} » and « Ouvert par » only", async () => {
    await renderSummary();
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("Aristide");
    // The date is the h2 above the h3 of the dishes (axe `heading-order`, S5).
    await expect
      .element(page.getByRole("heading", { level: 2 }))
      .toHaveTextContent("Demain, mardi 6 octobre 2026");
    expect(texts("term")).toStrictEqual(["Ouvert par"]);
    expect(texts("definition")).toStrictEqual(["M. Dupont"]);
  });

  it("titles each dish with its price, « l'unité » for euros only, and the booked portions (07 § 7)", async () => {
    const free = dish("pain", DAY, { name: "Pain", stock: 20, price: 0 });
    const noPrice = dish("salade", DAY, { name: "Salade", stock: 5 });
    await renderSummary(undefined, [LASAGNES, BOWL, free, noPrice]);
    expect(dishHeadings()).toStrictEqual([
      "Lasagnes — 4,50 € l'unité1 / 15",
      "Bowl — prix d'un ticket restaurant3 / 10",
      "Pain0 / 20",
      "Salade0 / 5",
    ]);
  });

  it("lists the bookings of each dish, one voucher per booking (E-16), the orphan left out", async () => {
    await renderSummary();
    expect(
      page
        .getByRole("table")
        .first()
        .getByRole("columnheader")
        .elements()
        .map((header) => header.textContent),
    ).toStrictEqual(["Nom", "Classe", "Portions", "Prix"]);
    expect(rowCells(0, "Noah Bernard")).toStrictEqual(["Noah Bernard", "TS1", "1", "4,50 €"]);
    expect(rowCells(1, "Ariele Gsell")).toStrictEqual([
      "Ariele Gsell",
      "Vie scolaire",
      "3",
      "1 ticket restaurant",
    ]);
    await expect.element(page.getByText("Paul Durand")).not.toBeInTheDocument();
  });

  it("totals the portions and amounts with one voucher per order, no signature (07 § 7, E-16)", async () => {
    await renderSummary();
    expect(totalValue()).toBe("4 portions · 4,50 € + 1 ticket restaurant");
    await expect.element(page.getByText("Nom du responsable")).not.toBeInTheDocument();
  });

  it("prints « Aucune réservation. » under a dish nobody booked", async () => {
    await renderSummary([], [LASAGNES]);
    await expect.element(page.getByText("Aucune réservation.", { exact: true })).toBeVisible();
    expect(totalValue()).toBe("0 portion");
  });

  it("prints « Aucun plat ouvert. » for a day without dish, without total", async () => {
    await renderSummary([], []);
    await expect.element(page.getByText("Aucun plat ouvert.", { exact: true })).toBeVisible();
    await expect.element(page.getByText("Total", { exact: true })).not.toBeInTheDocument();
  });

  it("prints « Aucun jour ouvert pour demain. » without informations nor total", async () => {
    await renderSummary([], [LASAGNES], []);
    await expect
      .element(page.getByText("Aucun jour ouvert pour demain.", { exact: true }))
      .toBeVisible();
    expect(texts("term")).toStrictEqual([]);
    await expect.element(page.getByText("Total", { exact: true })).not.toBeInTheDocument();
  });
});
