import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import { listR1 } from "@/domain/print";
import type { BookingR1, StaffServiceDayR1 } from "@/domain/types";
import { TomorrowDocumentR1 } from "@/features/print/TomorrowDocumentR1";
import { TEST_NOW } from "@/test/clock";
import { fullState } from "@/test/domain-states";
import { DAY, MARTIN, PETIT, UNGERER, seedDayR1 } from "@/test/print-lists";
import { renderWithProviders } from "@/test/render";

// Document C, R1 summary of tomorrow (07 § 6): at TEST_NOW, tomorrow is Tuesday 6 October 2026 (src/test/print-lists.ts).

async function renderSummary(
  bookings: BookingR1[] = [UNGERER, MARTIN, PETIT],
  days: StaffServiceDayR1[] = [seedDayR1({ theme: "Automne" })],
) {
  const list = listR1(fullState({ r1Days: days, r1Bookings: bookings }), DAY);
  await renderWithProviders(<TomorrowDocumentR1 list={list} printedAt={TEST_NOW} />);
  await expect.element(page.getByRole("heading", { level: 1 })).toBeVisible();
}

function texts(selector: string): string[] {
  return [...document.querySelectorAll(selector)].map((element) => element.textContent);
}

function totalValue(): string | undefined {
  return page.getByText("Total", { exact: true }).element().nextElementSibling?.textContent;
}

describe("TomorrowDocumentR1 (07 § 6)", () => {
  it("prints « Demain, {date} », then « Ouvert par » and « Places » only (no theme nor menu)", async () => {
    await renderSummary();
    await expect
      .element(page.getByRole("heading", { level: 1 }))
      .toHaveTextContent("Restaurant Pédagogique");
    await expect
      .element(page.getByText("Demain, mardi 6 octobre 2026", { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByText("Imprimé le 5 octobre 2026", { exact: true }))
      .toBeVisible();
    expect(texts("dt")).toStrictEqual(["Ouvert par", "Places"]);
    expect(texts("dd")).toStrictEqual(["M. Dupont", "15 / 20 couverts réservés"]);
  });

  it("lists name, class, seats and price in the order of the sheet (D-08 not retained)", async () => {
    await renderSummary();
    expect(texts("thead th")).toStrictEqual(["Nom", "Classe", "Couverts", "Prix"]);
    expect(texts("tbody tr").length).toBe(3);
    expect(texts("tbody tr:first-child td")).toStrictEqual([
      "Cyrille Ungerer",
      "TS2",
      "3",
      "16,00\u00A0€",
    ]);
    expect(texts("tbody tr:last-child td")).toStrictEqual(["Jean Petit", "Personnel", "4", ""]);
  });

  it.each<[string, BookingR1[], string]>([
    ["seats and price, never the detail", [UNGERER, MARTIN], "11 couverts · 95,20\u00A0€"],
    ["seats alone without a price", [PETIT], "4 couverts"],
    ["nothing booked", [], "0 couvert"],
  ])("writes the total: %s (07 § 6)", async (_case, bookings, total) => {
    await renderSummary(bookings);
    expect(totalValue()).toBe(total);
  });

  it("says « Aucune réservation. » for an empty day, and has no signature", async () => {
    await renderSummary([]);
    await expect.element(page.getByText("Aucune réservation.", { exact: true })).toBeVisible();
    await expect.element(page.getByText("Nom du responsable")).not.toBeInTheDocument();
  });

  it("says « Aucun jour ouvert pour demain. » without a day, with no informations nor total", async () => {
    await renderSummary([], []);
    await expect
      .element(page.getByText("Aucun jour ouvert pour demain.", { exact: true }))
      .toBeVisible();
    expect(texts("dt")).toStrictEqual([]);
    await expect.element(page.getByRole("table")).not.toBeInTheDocument();
    await expect.element(page.getByText("Total", { exact: true })).not.toBeInTheDocument();
  });
});
