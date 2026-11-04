import { describe, expect, it } from "vitest";

import { emptyDishDraft } from "@/domain/dishes";
import type { DishDraft } from "@/domain/dishes";
import { bookingsOfDish, dishErrors } from "@/features/staff/dish-rules";
import { bookingR2, fullState } from "@/test/domain-states";

// Rules of the dish form (06 § 6.1; D-19, D-21, D-22). Reading the stock and the price, the body and the price
// suggestions: domain/dishes.test.ts.

const NAME = "Indiquez le nom du plat.";
const STOCK = "Indiquez un stock supérieur à 0.";
const ZERO_PRICE = "Indiquez un prix supérieur à 0, ou laissez le champ vide.";

const values = (overrides: Partial<DishDraft>): DishDraft => ({
  ...emptyDishDraft(),
  name: "Tiramisu",
  stock: "6",
  ...overrides,
});

describe("dishErrors (06 § 6.1, D-19, D-22)", () => {
  it.each<[string, Partial<DishDraft>, number, Record<string, string>]>([
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
