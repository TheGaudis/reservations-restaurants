// Groupings and totals of the printed lists and of the "Demain" panel (07 § 3 to § 7, D-07, D-08).
// A customer's order counts one meal voucher at most, in every total (E-16, a-11, invariant 5).

import { findDay } from "@/domain/capacity";
import { addAmounts, orderAmounts, r2Amounts } from "@/domain/pricing";
import type { Amounts } from "@/domain/pricing";
import type {
  BookingR1,
  BookingR2,
  Dish,
  FullState,
  IsoDate,
  ServiceMode,
  StaffServiceDayR1,
  StaffServiceDayR2,
} from "@/domain/types";

export type PrintStateR1 = Pick<FullState, "r1Days" | "r1Bookings">;
export type ListStateR1 = PrintStateR1 & Pick<FullState, "settings">;
export type PrintStateR2 = Pick<FullState, "dishes" | "r2Bookings">;
export type ListStateR2 = PrintStateR2 & Pick<FullState, "r2Days" | "settings">;

/** Totals of an R1 list (07 § 3, § 5, § 6). */
export interface R1Totals {
  seats: number;
  students: number;
  staffMembers: number;
  externals: number;
  /** The counters add up to the seats: false with bookings made before the prices (07 § 3). */
  detailed: boolean;
  /** Sum of the prices recorded by the script, empty ones counted 0. */
  price: number;
}

/** One booking line of an order: a dish of the day and its portions. */
export interface OrderLine {
  bookingId: string;
  dish: Dish;
  portions: number;
  observation: string;
}

/** The R2 bookings of one customer on a day (07 § 4.1). */
export interface Order {
  /** Grouping key: name, class and contact, trimmed, in lower case (07 § 4.1). */
  key: string;
  name: string;
  className: string;
  contact: string;
  lines: OrderLine[];
  portions: number;
  /** Distinct modes, in the order of the bookings. */
  serviceModes: ServiceMode[];
  amounts: Amounts;
}

/** One dish in the per-dish summary (07 § 4.2, § 5, § 7). */
export interface DishTotal {
  dish: Dish;
  /** Bookings of the dish, in the order of the sheet: customers of the "Demain" panel, rows of document D. */
  bookings: BookingR2[];
  portions: number;
  /** Euros of the portions; for a voucher dish, one voucher per order that has it (E-16). */
  amounts: Amounts;
}

/** Total of an R2 day (07 § 4.2): clients, portions, euros and one voucher per order. */
export interface R2DayTotals {
  clients: number;
  portions: number;
  amounts: Amounts;
}

/** R1 bookings of a day in the order of the sheet: no sort (07 § 3, D-08). */
export function bookingsForDayR1(state: PrintStateR1, iso: IsoDate): BookingR1[] {
  return state.r1Bookings.filter((booking) => booking.date === iso);
}

/** Totals of an R1 list; the detail is shown only when the counters add up to the seats (07 § 3). */
export function r1Totals(bookings: readonly BookingR1[]): R1Totals {
  const totals: R1Totals = {
    seats: 0,
    students: 0,
    staffMembers: 0,
    externals: 0,
    detailed: false,
    price: 0,
  };
  for (const booking of bookings) {
    totals.seats += booking.seats;
    totals.students += booking.students ?? 0;
    totals.staffMembers += booking.staffMembers ?? 0;
    totals.externals += booking.externals ?? 0;
    totals.price += booking.total ?? 0;
  }
  totals.price = Math.round(totals.price * 100) / 100;
  totals.detailed =
    totals.seats > 0 && totals.students + totals.staffMembers + totals.externals === totals.seats;
  return totals;
}

/**
 * What an R1 document prints for `iso`, read from the full state at the click (PLAN § 3.8): the day, or undefined
 * once deleted, its bookings in the order of the sheet and their totals (07 § 3, § 6).
 */
export interface ListR1 {
  iso: IsoDate;
  restaurantName: string;
  day: StaffServiceDayR1 | undefined;
  bookings: BookingR1[];
  totals: R1Totals;
}

/** Snapshot of the R1 list or tomorrow summary of `iso` (07 § 3, § 6). */
export function listR1(state: ListStateR1, iso: IsoDate): ListR1 {
  const bookings = bookingsForDayR1(state, iso);
  return {
    iso,
    restaurantName: state.settings.name1,
    day: findDay(state.r1Days, iso),
    bookings,
    totals: r1Totals(bookings),
  };
}

/** Seats booked over capacity of an open R1 day ("Places", 07 § 3, § 6); null when the day is not open. */
export function seatsLineR1(
  state: PrintStateR1,
  iso: IsoDate,
): { seats: number; capacity: number } | null {
  const day = findDay(state.r1Days, iso);
  return day === undefined
    ? null
    : { seats: r1Totals(bookingsForDayR1(state, iso)).seats, capacity: day.capacity };
}

/** R2 bookings of a dish, in the order of the sheet (07 § 7). */
export function bookingsForDish(state: PrintStateR2, dishId: string): BookingR2[] {
  return state.r2Bookings.filter((booking) => booking.dishId === dishId);
}

function orderKey(booking: BookingR2): string {
  return [booking.name, booking.className, booking.contact]
    .map((part) => part.trim().toLowerCase())
    .join("|");
}

function newOrder(key: string, booking: BookingR2): Order {
  const { name, className, contact } = booking;
  return {
    key,
    name,
    className,
    contact,
    lines: [],
    portions: 0,
    serviceModes: [],
    amounts: orderAmounts([]),
  };
}

/**
 * R2 orders of a day (07 § 4.1): bookings of the dishes of that day only (a deleted dish leaves its bookings
 * out, D-07), grouped by name, class and contact (trimmed, any case), sorted by class then name.
 */
export function ordersForDay(state: PrintStateR2, iso: IsoDate): Order[] {
  const dishes = new Map(
    state.dishes.filter((dish) => dish.date === iso).map((dish) => [dish.id, dish]),
  );
  const orders = new Map<string, Order>();
  for (const booking of state.r2Bookings) {
    const dish = dishes.get(booking.dishId);
    if (dish === undefined) continue;
    const key = orderKey(booking);
    const order = orders.get(key) ?? newOrder(key, booking);
    orders.set(key, order);
    order.lines.push({
      bookingId: booking.id,
      dish,
      portions: booking.portions,
      observation: booking.observation,
    });
    order.portions += booking.portions;
    if (!order.serviceModes.includes(booking.serviceMode)) {
      order.serviceModes.push(booking.serviceMode);
    }
  }
  for (const order of orders.values()) order.amounts = orderAmounts(order.lines);
  return [...orders.values()].toSorted(
    (a, b) => a.className.localeCompare(b.className, "fr") || a.name.localeCompare(b.name, "fr"),
  );
}

/** Per-dish summary of a day, every dish of the day in the order of the sheet (07 § 4.2). */
export function dishTotals(
  state: PrintStateR2,
  iso: IsoDate,
  orders: readonly Order[],
): DishTotal[] {
  return state.dishes
    .filter((dish) => dish.date === iso)
    .map((dish) => {
      const ordersWithDish = orders.filter((order) =>
        order.lines.some((line) => line.dish.id === dish.id),
      );
      const bookings = bookingsForDish(state, dish.id);
      const portions = bookings.reduce((sum, booking) => sum + booking.portions, 0);
      const amounts = r2Amounts([{ dish, portions }]);
      return {
        dish,
        bookings,
        portions,
        amounts: dish.voucher ? { ...amounts, vouchers: ordersWithDish.length } : amounts,
      };
    });
}

/** "Total du jour" (07 § 4.2): the sum of the orders, one voucher each at most (E-16). */
export function r2DayTotals(orders: readonly Order[]): R2DayTotals {
  return {
    clients: orders.length,
    portions: orders.reduce((sum, order) => sum + order.portions, 0),
    amounts: addAmounts(orders.map((order) => order.amounts)),
  };
}

/** Amount of one booking row (document D, 07 § 7): its portions, one voucher at most (E-16). */
export function bookingAmounts(dish: Dish, portions: number): Amounts {
  return orderAmounts([{ dish, portions }]);
}

/**
 * What an R2 document prints for `iso`, read from the full state at the click (PLAN § 3.8): the day, or undefined
 * when it is not open, the orders of its customers, every dish of the day and the day's total (07 § 4, § 5, § 7).
 */
export interface ListR2 {
  iso: IsoDate;
  restaurantName: string;
  day: StaffServiceDayR2 | undefined;
  orders: Order[];
  dishes: DishTotal[];
  totals: R2DayTotals;
}

/** Snapshot of the R2 list, tomorrow block or tomorrow summary of `iso` (07 § 4, § 5, § 7). */
export function listR2(state: ListStateR2, iso: IsoDate): ListR2 {
  const orders = ordersForDay(state, iso);
  return {
    iso,
    restaurantName: state.settings.name2,
    day: findDay(state.r2Days, iso),
    orders,
    dishes: dishTotals(state, iso, orders),
    totals: r2DayTotals(orders),
  };
}
