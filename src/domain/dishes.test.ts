import { describe, expect, it } from "vitest";

import {
  dishDraftInput,
  dishDraftOf,
  dishStock,
  emptyDishDraft,
  isDishPriceRefused,
  priceInputText,
  priceSuggestions,
} from "@/domain/dishes";
import type { DishDraft } from "@/domain/dishes";
import { dish } from "@/test/domain-states";

// A dish as typed in « Ouvrir un jour » R2 and in the dish form (06 § 4.2-4.3, § 6.1; D-22; 08 § 6.4).

const draft = (overrides: Partial<DishDraft>): DishDraft => ({
  ...emptyDishDraft(),
  name: "Tiramisu",
  stock: "6",
  ...overrides,
});

describe("dishStock (06 § 4.2, § 6.1)", () => {
  it.each<[string, number]>([
    ["6", 6],
    [" 6 ", 6],
    // Cut as `parseInt` did.
    ["6.7", 6],
    ["0.5", 0],
    ["", 0],
    ["-2", -2],
  ])("« %s » gives %d", (raw, stock) => {
    expect(dishStock(raw)).toBe(stock);
  });

  it.each(["dix", "6,5", "6abc"])("« %s » is unreadable", (raw) => {
    expect(dishStock(raw)).toBeNaN();
  });
});

describe("isDishPriceRefused (D-22)", () => {
  it.each<[string, Partial<DishDraft>, boolean]>([
    ["no price", { price: "" }, false],
    ["decimal comma", { price: "3,50" }, false],
    ["decimal point", { price: "4.5" }, false],
    ["0 (b-8)", { price: "0" }, true],
    ["0,00", { price: "0,00" }, true],
    ["negative", { price: "-1" }, true],
    ["three decimals", { price: "3,505" }, true],
    ["unreadable", { price: "trois" }, true],
    ["voucher: the price is ignored", { price: "0", voucher: true }, false],
  ])("%s: %s", (_case, overrides, refused) => {
    expect(isDishPriceRefused(draft(overrides))).toBe(refused);
  });
});

describe("dishDraftInput (06 § 4.2-4.3, § 6.1)", () => {
  it.each<[string, Partial<DishDraft>, ReturnType<typeof dishDraftInput>]>([
    [
      "trimmed name, whole stock, price with a comma",
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
    expect(dishDraftInput(draft(overrides))).toStrictEqual(expected);
  });
});

describe("dishDraftOf (06 § 6.1)", () => {
  it.each<[string, Parameters<typeof dish>[2], DishDraft]>([
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
    expect(dishDraftOf(dish("d", "2026-10-06", overrides))).toStrictEqual(expected);
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

describe("priceSuggestions (06 § 6.1, 08 § 6.4)", () => {
  it("lists the prices in euros once each, in ascending order", () => {
    expect(
      priceSuggestions([
        dish("a", "2026-10-05", { price: 6.5 }),
        dish("b", "2026-10-05", { price: 4.5 }),
        dish("c", "2026-10-06", { price: null, voucher: true }),
        dish("d", "2026-10-06", { price: 6 }),
        dish("e", "2026-10-07", { price: 4.5 }),
      ]),
    ).toStrictEqual([4.5, 6, 6.5]);
  });

  it("is empty without any price", () => {
    expect(priceSuggestions([])).toStrictEqual([]);
  });
});
