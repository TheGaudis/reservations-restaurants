import { describe, expect, it } from "vitest";

import { orderAmounts, priceR1, r2Amounts } from "@/domain/pricing";
import type { Amounts, DishLine } from "@/domain/pricing";
import {
  amountsText,
  dishAmountText,
  dishPriceText,
  formatEuros,
  r1TotalText,
  r2TotalText,
  seatsText,
  summaryR1TotalText,
  summaryR2TotalText,
  vouchersText,
  withPrice,
} from "@/intl/amounts";

// U+00A0 before € (E-20), written explicitly: the spec's « ␣ ».
const NBSP = " ";

const lasagnes = { price: 4.5, voucher: false };
const bowl = { price: null, voucher: true };
const wrap = { price: null, voucher: true };
const salade = { price: null, voucher: false };
const free = { price: 0, voucher: false };

function amounts(euros: number, vouchers: number, gap = false): Amounts {
  return { euros, vouchers, gap };
}

describe("formatEuros (04 § 8, 00 § 3)", () => {
  it.each<[number | string, string]>([
    [12.5, `12,50${NBSP}€`],
    ["4.95", `4,95${NBSP}€`],
    [0, `0,00${NBSP}€`],
    [16, `16,00${NBSP}€`],
    [3.5, `3,50${NBSP}€`],
    ["6.10", `6,10${NBSP}€`],
    [999.99, `999,99${NBSP}€`],
  ])("%s → %s", (value, expected) => {
    expect(formatEuros(value)).toBe(expected);
  });

  it("separates thousands with U+202F beyond 999 € (E-20)", () => {
    expect(formatEuros(1234.5)).toBe(`1 234,50${NBSP}€`);
  });
});

describe("plurals (00 § 3, 04 § 8)", () => {
  it.each([
    [0, "0 couvert"],
    [1, "1 couvert"],
    [2, "2 couverts"],
    [12, "12 couverts"],
  ])("%d seats → %s", (count, expected) => {
    expect(seatsText(count)).toBe(expected);
  });

  it.each([
    [1, "1 ticket restaurant"],
    [2, "2 tickets restaurant"],
  ])("%d vouchers → %s", (count, expected) => {
    expect(vouchersText(count)).toBe(expected);
  });
});

describe("amountsText (01 § 3.5)", () => {
  it.each([
    [amounts(12, 1), `12,00${NBSP}€ + 1 ticket restaurant`],
    [amounts(0, 1), "1 ticket restaurant"],
    [amounts(0, 2), "2 tickets restaurant"],
    [amounts(7, 0), `7,00${NBSP}€`],
    [amounts(0, 0), ""],
    [amounts(0, 0, true), ""],
    [amounts(4.5, 0, true), `4,50${NBSP}€`],
  ])("%o → %s", (value, expected) => {
    expect(amountsText(value)).toBe(expected);
  });
});

describe("dish prices (01 § 3.5, b-8)", () => {
  it.each<[DishLine["dish"], string]>([
    [{ price: 3.5, voucher: false }, `3,50${NBSP}€`],
    [bowl, "prix d'un ticket restaurant"],
    [salade, ""],
    [free, ""],
  ])("%o → %s", (dish, expected) => {
    expect(dishPriceText(dish)).toBe(expected);
  });

  it.each<[DishLine["dish"], number, string]>([
    [{ price: 3.5, voucher: false }, 2, `7,00${NBSP}€`],
    [bowl, 2, "2 tickets restaurant"],
    [bowl, 1, "1 ticket restaurant"],
    [salade, 3, ""],
    [free, 3, ""],
  ])("%o × %d → %s", (dish, portions, expected) => {
    expect(dishAmountText(dish, portions)).toBe(expected);
  });
});

describe("withPrice (00 § 3, dash)", () => {
  it("puts U+00A0, an em dash and a normal space before the price", () => {
    expect(withPrice("Bowl", `3,50${NBSP}€`)).toBe(`Bowl${NBSP}— 3,50${NBSP}€`);
    expect(withPrice("Lasagnes", dishPriceText(lasagnes))).toBe(`Lasagnes${NBSP}— 4,50${NBSP}€`);
    expect(withPrice("Bowl", dishPriceText(bowl))).toBe(`Bowl${NBSP}— prix d'un ticket restaurant`);
  });

  it("keeps the label alone without a price", () => {
    expect(withPrice("Salade", dishPriceText(salade))).toBe("Salade");
    expect(withPrice("Gratuit", dishPriceText(free))).toBe("Gratuit");
  });
});

describe("live totals of the forms (04 § 5.2, § 5.3)", () => {
  const prices = { priceStudent: 4.95, priceStaff: 6.1, priceExternal: 9.9 };

  it.each([
    [{ students: 0, staffMembers: 0, externals: 0 }, `0 couvert · Total : 0,00${NBSP}€`],
    [{ students: 1, staffMembers: 0, externals: 0 }, `1 couvert · Total : 4,95${NBSP}€`],
    [{ students: 2, staffMembers: 1, externals: 0 }, `3 couverts · Total : 16,00${NBSP}€`],
  ])("R1 %o → %s", (counts, expected) => {
    const seats = counts.students + counts.staffMembers + counts.externals;
    expect(r1TotalText(seats, priceR1(prices, counts))).toBe(expected);
  });

  it.each<[string, DishLine[], string]>([
    ["2 × Lasagnes", [{ dish: lasagnes, portions: 2 }], `Total : 9,00${NBSP}€`],
    [
      "2 × Lasagnes + 3 × Bowl + 1 × Wrap",
      [
        { dish: lasagnes, portions: 2 },
        { dish: bowl, portions: 3 },
        { dish: wrap, portions: 1 },
      ],
      `Total : 9,00${NBSP}€ + 1 ticket restaurant`,
    ],
    ["1 × Bowl", [{ dish: bowl, portions: 1 }], "Total : 1 ticket restaurant"],
    [
      "1 × Lasagnes + 1 × Salade",
      [
        { dish: lasagnes, portions: 1 },
        { dish: salade, portions: 1 },
      ],
      `Total (hors plats sans prix indiqué) : 4,50${NBSP}€`,
    ],
    ["nothing chosen", [{ dish: lasagnes, portions: 0 }], ""],
    ["only a dish without a price", [{ dish: salade, portions: 2 }], ""],
  ])("R2 %s → %s", (_, lines, expected) => {
    expect(r2TotalText(orderAmounts(lines))).toBe(expected);
  });
});

describe("summary totals (04 § 7, D-03, E-28)", () => {
  it.each([
    [3, 16, `3 couverts — 16,00${NBSP}€`],
    [1, 4.95, `1 couvert — 4,95${NBSP}€`],
    [2, 0, "2 couverts"],
  ])("R1 %d seats, %d € → %s", (seats, price, expected) => {
    expect(summaryR1TotalText(seats, price)).toBe(expected);
  });

  it.each([
    [amounts(9, 1), `9,00${NBSP}€ + 1 ticket restaurant`],
    [amounts(4.5, 0, true), `4,50${NBSP}€ (hors plats sans prix indiqué)`],
    [amounts(0, 1, true), "1 ticket restaurant (hors plats sans prix indiqué)"],
    [amounts(0, 0, true), ""],
  ])("R2 %o → %s", (value, expected) => {
    expect(summaryR2TotalText(value)).toBe(expected);
  });

  it("counts one meal voucher per order (invariant 5)", () => {
    const lines = [
      { dish: bowl, portions: 3 },
      { dish: wrap, portions: 2 },
    ];
    expect(amountsText(r2Amounts(lines))).toBe("5 tickets restaurant");
    expect(summaryR2TotalText(orderAmounts(lines))).toBe("1 ticket restaurant");
  });
});
