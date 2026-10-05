import { describe, expect, it } from "vitest";

import { orderAmounts } from "@/domain/pricing";
import { chosenLines, dishErrors, orderablePortions } from "@/features/r2/order-rules";
import type { DishStock, Portions } from "@/features/r2/order-rules";
import { r2TotalText } from "@/intl/amounts";
import { dish } from "@/test/domain-states";

// Dishes and quantities of the R2 form (04 § 5.3, D-18, E-11, E-41), on the dishes of Monday 5 October 2026 of
// parite.md § 2.

const DATE = "2026-10-05";
const DISHES: DishStock[] = [
  { dish: dish("lasagnes", DATE, { name: "Lasagnes", price: 4.5 }), remaining: 4 },
  { dish: dish("bowl", DATE, { name: "Bowl", price: null, voucher: true }), remaining: 10 },
  { dish: dish("wrap", DATE, { name: "Wrap", price: null, voucher: true }), remaining: 5 },
  { dish: dish("salade", DATE, { name: "Salade", price: null }), remaining: 5 },
  { dish: dish("tajine", DATE, { name: "Tajine", price: 6.5 }), remaining: 0 },
];

const NO_DISH = "Choisissez au moins un plat.";
const EVERY_QUANTITY = {
  "portions.lasagnes": NO_DISH,
  "portions.bowl": NO_DISH,
  "portions.wrap": NO_DISH,
  "portions.salade": NO_DISH,
};

describe("live total (04 § 5.3)", () => {
  it.each<[string, Portions, string]>([
    ["2 × Lasagnes", { lasagnes: 2 }, "Total : 9,00 €"],
    [
      "2 × Lasagnes + 3 × Bowl + 1 × Wrap",
      { lasagnes: 2, bowl: 3, wrap: 1 },
      "Total : 9,00 € + 1 ticket restaurant",
    ],
    ["1 × Bowl", { bowl: 1 }, "Total : 1 ticket restaurant"],
    [
      "1 × Lasagnes + 1 × Salade",
      { lasagnes: 1, salade: 1 },
      "Total (hors plats sans prix indiqué) : 4,50 €",
    ],
    ["nothing", { lasagnes: null, bowl: 0 }, ""],
    ["a dish without a price only", { salade: 2 }, ""],
    ["a sold-out dish typed before", { tajine: 1 }, ""],
  ])("%s", (_, portions, text) => {
    expect(r2TotalText(orderAmounts(chosenLines(portions, DISHES)))).toBe(text);
  });
});

describe("dishErrors (04 § 5.3, D-18, E-41)", () => {
  it.each<[string, Portions, Record<string, string>]>([
    ["nothing chosen: every quantity", {}, EVERY_QUANTITY],
    ["only zeros and empty fields", { lasagnes: 0, bowl: null }, EVERY_QUANTITY],
    ["only a sold-out dish", { tajine: 2 }, EVERY_QUANTITY],
    ["one dish chosen", { salade: 1 }, {}],
    ["all the portions left", { lasagnes: 4, wrap: 5 }, {}],
    [
      "more portions than left",
      { lasagnes: 5, bowl: 11 },
      {
        "portions.lasagnes": "4 portions au maximum (stock restant).",
        "portions.bowl": "10 portions au maximum (stock restant).",
      },
    ],
  ])("%s", (_, portions, errors) => {
    expect(dishErrors(portions, DISHES)).toStrictEqual(errors);
  });

  it("says « 1 portion » in the singular", () => {
    const stocks = [{ dish: dish("wrap", DATE), remaining: 1 }];
    expect(dishErrors({ wrap: 2 }, stocks)).toStrictEqual({
      "portions.wrap": "1 portion au maximum (stock restant).",
    });
  });
});

describe("orderablePortions (E-11)", () => {
  it("drops the portions of a dish sold out since they were typed", () => {
    expect(orderablePortions({ lasagnes: 2, tajine: 3 }, DISHES)).toStrictEqual({
      lasagnes: 2,
      bowl: null,
      wrap: null,
      salade: null,
    });
  });
});
