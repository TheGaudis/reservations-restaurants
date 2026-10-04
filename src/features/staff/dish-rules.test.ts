import { describe, expect, it } from "vitest";

import {
  bookingsOfDish,
  dishErrors,
  dishInput,
  dishValues,
  EMPTY_DISH,
} from "@/features/staff/dish-rules";
import type { DishValues } from "@/features/staff/dish-rules";
import { priceInputText } from "@/features/staff/price-suggestions";
import { bookingR2, dish, fullState } from "@/test/domain-states";

// Rules and body of the dish form (06 § 6.1, § 4.3; D-19, D-21, D-22). The price suggestions (08 § 6.4) are tested
// on the seed in DishForm.test.tsx.

const NAME = "Indiquez le nom du plat.";
const STOCK = "Indiquez un stock supérieur à 0.";
const ZERO_PRICE = "Indiquez un prix supérieur à 0, ou laissez le champ vide.";

const values = (overrides: Partial<DishValues>): DishValues => ({
  ...EMPTY_DISH,
  name: "Tiramisu",
  stock: "6",
  ...overrides,
});

describe("dishErrors (06 § 6.1, D-19, D-22)", () => {
  it.each<[string, Partial<DishValues>, number, Record<string, string>]>([
    ["valid, no price", {}, 0, {}],
    ["valid, decimal comma", { price: "3,50" }, 0, {}],
    ["empty form", { name: "  ", stock: "" }, 0, { name: NAME, stock: STOCK }],
    ["stock 0", { stock: "0" }, 0, { stock: STOCK }],
    ["negative stock", { stock: "-2" }, 0, { stock: STOCK }],
    ["unreadable stock", { stock: "dix" }, 0, { stock: STOCK }],
    ["decimal stock, cut as parseInt", { stock: "6.7" }, 6, {}],
    [
      "stock under the portions booked",
      { stock: "2" },
      3,
      {
        stock:
          "Impossible : 3 portions déjà réservées pour ce plat, le stock ne peut pas être inférieur.",
      },
    ],
    ["stock equal to the portions booked", { stock: "3" }, 3, {}],
    ["price 0 (b-8)", { price: "0" }, 0, { price: ZERO_PRICE }],
    ["price 0,00", { price: "0,00" }, 0, { price: ZERO_PRICE }],
    ["negative price", { price: "-1" }, 0, { price: ZERO_PRICE }],
    ["three decimals", { price: "3,505" }, 0, { price: ZERO_PRICE }],
    ["unreadable price", { price: "trois" }, 0, { price: ZERO_PRICE }],
    ["voucher: the price is ignored", { price: "0", voucher: true }, 0, {}],
  ])("%s", (_case, overrides, booked, expected) => {
    expect(dishErrors(values(overrides), booked)).toStrictEqual(expected);
  });
});

describe("dishInput (06 § 6.1, § 4.3)", () => {
  it.each<[string, Partial<DishValues>, ReturnType<typeof dishInput>]>([
    [
      "trimmed name, whole stock, price",
      { name: "  Tiramisu ", stock: " 6 ", price: "3,5" },
      { name: "Tiramisu", stock: 6, price: 3.5, voucher: false },
    ],
    ["empty price", { price: "" }, { name: "Tiramisu", stock: 6, price: null, voucher: false }],
    [
      "voucher: no price, the mark is added by api/actions.ts",
      { price: "4", voucher: true },
      { name: "Tiramisu", stock: 6, price: null, voucher: true },
    ],
  ])("%s", (_case, overrides, expected) => {
    expect(dishInput(values(overrides))).toStrictEqual(expected);
  });
});

describe("dishValues (06 § 6.1)", () => {
  it.each<[string, Parameters<typeof dish>[2], DishValues]>([
    [
      "priced dish",
      { name: "Lasagnes", stock: 15, price: 4.5 },
      { name: "Lasagnes", stock: "15", price: "4,50", voucher: false },
    ],
    [
      "voucher dish, name without its mark",
      { name: "Bowl", price: null, voucher: true },
      { name: "Bowl", stock: "10", price: "", voucher: true },
    ],
  ])("%s", (_case, overrides, expected) => {
    expect(dishValues(dish("d", "2026-10-06", overrides))).toStrictEqual(expected);
  });
});

describe("bookingsOfDish (D-21)", () => {
  it("counts the booking lines of the dish only, orphans left out", () => {
    const state = fullState({
      r2Bookings: [
        bookingR2("a", "lasagnes", { portions: 4 }),
        bookingR2("b", "lasagnes"),
        bookingR2("c", "bowl"),
        bookingR2("orphan", "deleted-dish"),
      ],
    });
    expect(bookingsOfDish(state, "lasagnes")).toBe(2);
    expect(bookingsOfDish(state, "bowl")).toBe(1);
    expect(bookingsOfDish(state, "tajine")).toBe(0);
  });
});

describe("priceInputText (06 § 6.1)", () => {
  it.each([
    [3.5, "3,50"],
    [6, "6,00"],
    [0.05, "0,05"],
  ])("types %d as « %s »", (price, text) => {
    expect(priceInputText(price)).toBe(text);
  });
});
