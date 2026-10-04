import type { Dish, FullState } from "@/domain/types";
import { useStaffState } from "@/features/staff/use-staff-state";

// Price suggestions of the dish price fields (`renderPriceSuggestions`, 08 § 6.4; 06 § 6.1): the prices already used
// by the R2 dishes, offered by the `<datalist>` of `PriceField`.

/** A price as a colleague types it, decimal comma and cents: 3.5 → « 3,50 » (`parseAmount` reads it back). */
export function priceInputText(price: number): string {
  return price.toFixed(2).replace(".", ",");
}

/** Distinct prices of `dishes`, dishes without a price left out, in ascending order (08 § 6.4). */
function priceSuggestions(dishes: readonly Dish[]): string[] {
  const prices = new Set<number>();
  for (const dish of dishes) {
    if (dish.price !== null) prices.add(dish.price);
  }
  return [...prices].toSorted((a, b) => a - b).map((price) => priceInputText(price));
}

const allDishes = (state: FullState): readonly Dish[] => state.dishes;

/** Suggestions from every R2 dish of the full state, all days together (08 § 6.4). */
export function usePriceSuggestions(): string[] {
  return priceSuggestions(useStaffState(allDishes));
}
