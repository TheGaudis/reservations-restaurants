// Service days in the staff mode: the checks of « Ouvrir un jour », its dish drafts, the price suggestions and the
// bookings a deletion takes away (06 § 3.2, § 4, § 5.2, § 6.1; D-19, D-21, D-22).

import { dishesForDay, findDay } from "@/domain/capacity";
import { isPast } from "@/domain/cutoff";
import { bookingsForDayR1, bookingsForDish } from "@/domain/print";
import type { DishInput, FullState, IsoDate, Restaurant } from "@/domain/types";
import { parseAmount, parseCount } from "@/domain/validation";

/** One dish line of « Ouvrir un jour » R2 as typed (`draftItems`, 06 § 4.2): texts, and the voucher box. */
export interface DishDraft {
  name: string;
  stock: string;
  price: string;
  voucher: boolean;
}

/** A new line: empty, voucher box unticked (`newDraftItem`). */
export function emptyDishDraft(): DishDraft {
  return { name: "", stock: "", price: "", voucher: false };
}

/**
 * `blank`: nothing typed, left out in silence; `complete`: a name and a stock of at least 1, sent (06 § 4.2);
 * `incomplete`: anything else, refused with a message instead of being dropped (D-19, E-36).
 */
export type DishDraftStatus = "blank" | "complete" | "incomplete";

export function dishDraftStatus({ name, stock, price }: DishDraft): DishDraftStatus {
  if (name.trim() === "" && stock.trim() === "" && price.trim() === "") return "blank";
  return name.trim() !== "" && parseCount(stock) >= 1 ? "complete" : "incomplete";
}

/**
 * Dish sent by `addDayR2` for a complete line (06 § 4.2-4.3): a voucher dish has no price in euros; an empty
 * price is `null` (`""` for the script, 01 § 2.5).
 */
export function dishDraftInput({ name, stock, price, voucher }: DishDraft): DishInput {
  return {
    name: name.trim(),
    stock: parseCount(stock),
    price: voucher ? null : (parseAmount(price) ?? null),
    voucher,
  };
}

/** Dishes of the complete lines, in their order. */
export function openDayDishes(drafts: readonly DishDraft[]): DishInput[] {
  return drafts
    .filter((draft) => dishDraftStatus(draft) === "complete")
    .map((draft) => dishDraftInput(draft));
}

/** Why « Ouvrir un jour » refuses its date (D-19): a past day, or an R1 day already open (E-36). */
export type OpenDateProblem = "past" | "alreadyOpen";

export function openDateProblem(
  state: FullState,
  restaurant: Restaurant,
  date: IsoDate,
  today: IsoDate,
): OpenDateProblem | null {
  if (isPast(date, today)) return "past";
  if (restaurant === "r1" && findDay(state.r1Days, date) !== undefined) return "alreadyOpen";
  return null;
}

/** The script already has this R2 day: it adds only the dishes of a new name (02 § 4.7, D-19). */
export function isR2DayOpen(state: FullState, date: IsoDate): boolean {
  return findDay(state.r2Days, date) !== undefined;
}

/** `price-suggestions` (06 § 6.1): prices in euros already used by the dishes, once each, in ascending order. */
export function priceSuggestions(state: Pick<FullState, "dishes">): number[] {
  const prices = new Set<number>();
  for (const dish of state.dishes) {
    if (dish.price !== null) prices.add(dish.price);
  }
  return [...prices].toSorted((a, b) => a - b);
}

/**
 * Bookings the deletion of a day takes away, as the card lists them (D-21): R1, those of the date; R2, those of
 * the dishes of the date, the bookings of a deleted dish left out as everywhere else (b-3).
 */
export function bookingsOfDay(state: FullState, restaurant: Restaurant, date: IsoDate): number {
  if (restaurant === "r1") return bookingsForDayR1(state, date).length;
  return dishesForDay(state, date).reduce(
    (sum, dish) => sum + bookingsForDish(state, dish.id).length,
    0,
  );
}
