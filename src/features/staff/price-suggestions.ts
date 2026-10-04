import { priceInputText, priceSuggestions } from "@/domain/dishes";
import type { Dish, FullState } from "@/domain/types";
import { useStaffState } from "@/features/staff/use-staff-state";

// Price suggestions of the dish price fields (`renderPriceSuggestions`, 08 § 6.4; 06 § 4.2, § 6.1): the prices
// already used by the R2 dishes, offered by the `<datalist>` of `PriceField`.

const allDishes = (state: FullState): readonly Dish[] => state.dishes;

/** Suggestions from every R2 dish of the full state, all days together, as typed (« 4,50 »). */
export function usePriceSuggestions(): string[] {
  return priceSuggestions(useStaffState(allDishes)).map((price) => priceInputText(price));
}
