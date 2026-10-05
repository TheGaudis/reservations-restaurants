// A dish as a colleague types it, in « Ouvrir un jour » R2, « Ajouter un plat » and « Modifier ce plat » (06 § 4.2-4.3,
// § 6.1; D-22): one way to read its stock and its price, one body sent, one list of price suggestions.

import type { Dish, DishInput } from "@/domain/types";
import { parseAmount, positiveAmount } from "@/domain/validation";

/** A dish as typed: texts, and the voucher box (`draftItems` and `itemFormHtml` of the old code). */
export interface DishDraft {
  name: string;
  stock: string;
  price: string;
  voucher: boolean;
}

/** An empty dish: voucher box unticked (`newDraftItem`, 06 § 6.1). */
export function emptyDishDraft(): DishDraft {
  return { name: "", stock: "", price: "", voucher: false };
}

/** A price as a colleague types it, decimal comma and cents: 3.5 → « 3,50 » (`parseAmount` reads it back). */
export function priceInputText(price: number): string {
  return price.toFixed(2).replace(".", ",");
}

/** « Modifier ce plat » starts from the dish: name without the voucher mark, price as typed (06 § 6.1). */
export function dishDraftOf(dish: Dish): DishDraft {
  return {
    name: dish.name,
    stock: String(dish.stock),
    price: dish.price === null ? "" : priceInputText(dish.price),
    voucher: dish.voucher,
  };
}

/** Whole stock (06 § 4.2, § 6.1): « 6.7 » gives 6 as `parseInt` did; empty gives 0, unreadable NaN. */
export function dishStock(raw: string): number {
  return Math.trunc(Number(raw.trim()));
}

const priceRule = positiveAmount(true);

/**
 * The price in euros is refused (D-22): 0, negative, unreadable or with more than two decimals. Empty means no price;
 * a voucher dish has none, whatever was typed.
 */
export function isDishPriceRefused({ price, voucher }: DishDraft): boolean {
  return !voucher && priceRule({ value: price }) !== undefined;
}

/**
 * Dish sent by the script (06 § 4.2-4.3, § 6.1): trimmed name, whole stock, no price for a voucher dish or an empty
 * field (`""` for the script, 01 § 2.5); the voucher mark is added by api/actions.ts.
 */
export function dishDraftInput({ name, stock, price, voucher }: DishDraft): DishInput {
  return {
    name: name.trim(),
    stock: dishStock(stock),
    price: voucher ? null : (parseAmount(price) ?? null),
    voucher,
  };
}

/** `price-suggestions` (06 § 6.1, 08 § 6.4): prices in euros already used by the dishes, once each, ascending. */
export function priceSuggestions(dishes: readonly Dish[]): number[] {
  const prices = new Set<number>();
  for (const dish of dishes) {
    if (dish.price !== null) prices.add(dish.price);
  }
  return [...prices].toSorted((a, b) => a - b);
}
