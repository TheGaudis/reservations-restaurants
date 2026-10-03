// Seats and portions left, availability of a day (01 § 3.1 to § 3.3, 05 § 2.4). Works the same on the public
// state, the local copy and the full state: all three carry the anonymous totals `r1Booked` and `r2Booked`.

import { ALMOST_FULL_RATIO } from "@/domain/constants";
import type {
  Dish,
  IsoDate,
  PortionTotal,
  SeatTotal,
  ServiceDayR1,
  ServiceDayR2,
} from "@/domain/types";

/** Gauge state: `cap-ok`, `cap-low`, `cap-full` of the old code (05 § 2.4). */
export type CapacityClass = "available" | "almostFull" | "full";

/** The part of a state the capacity rules read. */
export interface CapacityState {
  r1Days: readonly ServiceDayR1[];
  r1Booked: readonly SeatTotal[];
  r2Days: readonly ServiceDayR2[];
  dishes: readonly Dish[];
  r2Booked: readonly PortionTotal[];
}

interface StateIndex {
  seatsBooked: Map<IsoDate, number>;
  portionsBooked: Map<string, number>;
  dishesByDate: Map<IsoDate, Dish[]>;
  r2Dates: Set<IsoDate>;
}

// A state is never modified, only replaced (01 § 4.1): its index is built once, on first use.
const indexes = new WeakMap<CapacityState, StateIndex>();

function buildIndex(state: CapacityState): StateIndex {
  const seats = new Map<IsoDate, number>();
  for (const total of state.r1Booked) {
    seats.set(total.date, (seats.get(total.date) ?? 0) + total.seats);
  }
  const portions = new Map<string, number>();
  for (const total of state.r2Booked) {
    portions.set(total.dishId, (portions.get(total.dishId) ?? 0) + total.portions);
  }
  const dishesByDate = new Map<IsoDate, Dish[]>();
  for (const dish of state.dishes) {
    const list = dishesByDate.get(dish.date);
    if (list === undefined) dishesByDate.set(dish.date, [dish]);
    else list.push(dish);
  }
  const r2Dates = new Set(state.r2Days.map((day) => day.date));
  return { seatsBooked: seats, portionsBooked: portions, dishesByDate, r2Dates };
}

function indexOf(state: CapacityState): StateIndex {
  let index = indexes.get(state);
  if (index === undefined) {
    index = buildIndex(state);
    indexes.set(state, index);
  }
  return index;
}

/** The service day of `iso` among `days` (R1 or R2, public or full state), if a colleague opened it. */
export function findDay<D extends { date: IsoDate }>(
  days: readonly D[],
  iso: IsoDate,
): D | undefined {
  return days.find((day) => day.date === iso);
}

/** Seats booked on `iso`, all bookings together. */
export function seatsBooked(state: CapacityState, iso: IsoDate): number {
  return indexOf(state).seatsBooked.get(iso) ?? 0;
}

/** Portions booked of a dish. */
export function portionsBooked(state: CapacityState, dishId: string): number {
  return indexOf(state).portionsBooked.get(dishId) ?? 0;
}

/** `remainingR1` (01 § 3.1): negative when the capacity was lowered under the seats booked. */
export function remainingSeats(state: CapacityState, day: ServiceDayR1): number {
  return day.capacity - seatsBooked(state, day.date);
}

/** `remainingItem` (01 § 3.2): negative when the stock was lowered under the portions booked. */
export function remainingStock(state: CapacityState, dish: Dish): number {
  return dish.stock - portionsBooked(state, dish.id);
}

/** "Épuisé" (04 § 5.3): no portion left. */
export function isSoldOut(state: CapacityState, dish: Dish): boolean {
  return remainingStock(state, dish) <= 0;
}

/** Dishes of a day, in the order of the sheet (`itemsR2`, 05 § 6.2). */
export function dishesForDay(state: CapacityState, iso: IsoDate): readonly Dish[] {
  return indexOf(state).dishesByDate.get(iso) ?? [];
}

/** Portions booked on a day, dishes of that day only: bookings of a deleted dish are left out (D-07, b-3). */
export function portionsBookedForDay(state: CapacityState, iso: IsoDate): number {
  return dishesForDay(state, iso).reduce((sum, dish) => sum + portionsBooked(state, dish.id), 0);
}

/** `capacityClass` (01 § 3.3), tested in this order: nothing left, fewer than half left, otherwise available. */
export function capacityClass(remaining: number, capacity: number): CapacityClass {
  if (remaining <= 0) return "full";
  if (remaining < capacity * ALMOST_FULL_RATIO) return "almostFull";
  return "available";
}

/** `dayStatusR1` (05 § 2.4): null when the day is not open ("aucun service"). */
export function dayStatusR1(state: CapacityState, iso: IsoDate): CapacityClass | null {
  const day = findDay(state.r1Days, iso);
  return day === undefined ? null : capacityClass(remainingSeats(state, day), day.capacity);
}

/**
 * `dayStatusR2` (05 § 2.4): seats and stocks of all the dishes of the day added up; null when the day is not
 * open or has no dish. The 10 a.m. cutoff does not change it.
 */
export function dayStatusR2(state: CapacityState, iso: IsoDate): CapacityClass | null {
  const dishes = dishesForDay(state, iso);
  if (!indexOf(state).r2Dates.has(iso) || dishes.length === 0) return null;
  const remaining = dishes.reduce((sum, dish) => sum + remainingStock(state, dish), 0);
  const stock = dishes.reduce((sum, dish) => sum + dish.stock, 0);
  return capacityClass(remaining, stock);
}
