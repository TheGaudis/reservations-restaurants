// Bookings: inputs of the booking actions built from the forms, maxima, reading of the answer, content of the
// booking summary (04 § 5 to § 7, 06 § 7 and § 8). Numbers and structures only: the texts come from `intl/`.

import {
  dishesForDay,
  findDay,
  isSoldOut,
  remainingSeats,
  remainingStock,
} from "@/domain/capacity";
import type { CapacityState } from "@/domain/capacity";
import { isPast, isR2OrderingClosed } from "@/domain/cutoff";
import { orderAmounts, priceR1, seatTotal } from "@/domain/pricing";
import type { Amounts, DishLine, R1Prices, SeatCounts } from "@/domain/pricing";
import type {
  BookingR1,
  BookingR1Input,
  BookingR2,
  BookingResult,
  Dish,
  EditBookingR1Input,
  EditBookingR2Input,
  EmailStatus,
  IsoDate,
  OrderR2Input,
  ServiceMode,
  WriteResponse,
} from "@/domain/types";
import { countValue } from "@/domain/validation";
import { serviceMode } from "@/domain/vouchers";

/** Identity fields of every booking form, as typed (04 § 5.2, 06 § 7.2, § 8.1). */
export interface IdentityValues {
  name: string;
  contact: string;
  className: string;
  observation: string;
}

/** R1 counters as held by the number fields: empty = null (PLAN § 3.5). */
export interface SeatCountValues {
  students: number | null;
  staffMembers: number | null;
  externals: number | null;
}

export interface BookingR1Values extends IdentityValues, SeatCountValues {}

/** R2 order form: mode chosen by the customer and portions per dish id (04 § 5.3). */
export interface OrderR2Values extends IdentityValues {
  serviceMode: ServiceMode;
  portions: Partial<Record<string, number | null>>;
}

/** The form being sent: its day and the `requestId` created when it opened (02 § 5.3, invariant 3). */
export interface BookingTarget {
  date: IsoDate;
  requestId: string;
}

/** Warnings of the summary, both shown when both apply (04 § 7, E-14). */
export type SummaryWarning = "adjusted" | "emailFailed";

/** Content of the R1 summary (04 § 7). */
export interface SummaryR1 {
  restaurant: "r1";
  date: IsoDate;
  /** Already recorded (`_duplicate`): rebuilt from the form (D-16). */
  duplicate: boolean;
  name: string;
  className: string;
  counts: SeatCounts;
  seats: number;
  /** Prices of the state received (04 § 7). */
  price: number;
  warnings: SummaryWarning[];
}

/** One dish line of the R2 summary: name without the voucher mark, portions granted. */
export interface SummaryDish {
  name: string;
  portions: number;
}

/** Content of the R2 summary (04 § 7). */
export interface SummaryR2 {
  restaurant: "r2";
  date: IsoDate;
  duplicate: boolean;
  name: string;
  className: string;
  serviceMode: ServiceMode;
  dishes: SummaryDish[];
  /** One meal voucher per order (`orderAmounts`, invariant 5). */
  amounts: Amounts;
  warnings: SummaryWarning[];
}

/** What an R2 order answer means for the form (04 § 6.3, D-16). */
export type OrderOutcome = "duplicate" | "nothingConfirmed" | "confirmed";

function counts(values: SeatCountValues): SeatCounts {
  return {
    students: countValue(values.students),
    staffMembers: countValue(values.staffMembers),
    externals: countValue(values.externals),
  };
}

function trimmedIdentity(values: IdentityValues): IdentityValues {
  return {
    name: values.name.trim(),
    contact: values.contact.trim(),
    className: values.className.trim(),
    observation: values.observation.trim(),
  };
}

/** R1 can be booked (05 § 5.2): open, not past, seats left. No cutoff hour in R1. */
export function canBookR1(state: CapacityState, iso: IsoDate, today: IsoDate): boolean {
  const day = findDay(state.r1Days, iso);
  return day !== undefined && !isPast(iso, today) && remainingSeats(state, day) > 0;
}

/** R2 can be ordered online (05 § 6.5): open with a dish left, before 10 a.m. on the day (invariant 4). */
export function canOrderR2(state: CapacityState, iso: IsoDate, now: number): boolean {
  const open = findDay(state.r2Days, iso) !== undefined;
  const dishLeft = dishesForDay(state, iso).some((dish) => !isSoldOut(state, dish));
  return open && dishLeft && !isR2OrderingClosed(iso, now);
}

/** `addBookingR1` (02 § 4.4): texts trimmed, empty counters sent as 0 (04 § 6.2). */
export function bookingR1Input(target: BookingTarget, values: BookingR1Values): BookingR1Input {
  return { ...target, ...trimmedIdentity(values), ...counts(values) };
}

/**
 * `addBookingR2Multi` (02 § 4.5): dishes with portions above 0, in the order of the sheet; dine-in on a voucher
 * day (invariant 5), for the public form and the staff addition alike (D-19).
 */
export function orderR2Input(
  target: BookingTarget,
  values: OrderR2Values,
  dishesOfDay: readonly Dish[],
): OrderR2Input {
  const items = dishesOfDay
    .map((dish) => ({ dishId: dish.id, portions: countValue(values.portions[dish.id] ?? null) }))
    .filter((item) => item.portions > 0);
  return {
    ...target,
    ...trimmedIdentity(values),
    serviceMode: serviceMode(dishesOfDay, values.serviceMode),
    items,
  };
}

/** Seats allowed when a colleague edits an R1 booking (`editMaxR1`, 06 § 7.3, D-19). */
export function maxSeatsForEdit(state: CapacityState, booking: BookingR1): number {
  const day = findDay(state.r1Days, booking.date);
  if (day === undefined) return booking.seats;
  return Math.max(booking.seats, remainingSeats(state, day) + booking.seats);
}

/** Portions allowed when a colleague edits an R2 booking: stock left plus its own portions (D-19). */
export function maxPortionsForEdit(state: CapacityState, booking: BookingR2): number {
  const dish = state.dishes.find((d) => d.id === booking.dishId);
  if (dish === undefined) return booking.portions;
  return Math.max(booking.portions, remainingStock(state, dish) + booking.portions);
}

/** `editBookingR1` (06 § 7.3): seats and price rounded to the cent are sent, the script recomputes both. */
export function editBookingR1Input(
  id: string,
  values: BookingR1Values,
  prices: R1Prices,
): EditBookingR1Input {
  const seatCounts = counts(values);
  return {
    id,
    ...trimmedIdentity(values),
    ...seatCounts,
    seats: seatTotal(seatCounts),
    total: priceR1(prices, seatCounts),
  };
}

/** `editBookingR2` (06 § 7.4). */
export function editBookingR2Input(
  id: string,
  values: IdentityValues & { portions: number | null; serviceMode: ServiceMode },
): EditBookingR2Input {
  return {
    id,
    ...trimmedIdentity(values),
    portions: countValue(values.portions),
    serviceMode: values.serviceMode,
  };
}

/** The confirmation e-mail could not be sent (`emailWarning`, 04 § 7): no address is not a failure. */
export function emailFailed(status: EmailStatus | null): boolean {
  return status !== null && !status.sent && status.reason !== "no-email";
}

/** Some portions were reduced or some dishes left out for lack of stock (04 § 7). */
export function wasAdjusted(result: BookingResult): boolean {
  return result.adjusted.length > 0 || result.skipped.length > 0;
}

/** `confirmed` empty: nothing was booked (04 § 6.3, E-11). A missing `_bookingResult` counts as empty. */
export function orderOutcome(response: WriteResponse): OrderOutcome {
  if (response.duplicate) return "duplicate";
  return (response.bookingResult?.confirmed.length ?? 0) === 0 ? "nothingConfirmed" : "confirmed";
}

/** R1 summary (04 § 7): counters typed, price at the prices of the state received. */
export function summaryR1(input: BookingR1Input, response: WriteResponse): SummaryR1 {
  const seatCounts = {
    students: input.students,
    staffMembers: input.staffMembers,
    externals: input.externals,
  };
  return {
    restaurant: "r1",
    date: input.date,
    duplicate: response.duplicate,
    name: input.name,
    className: input.className,
    counts: seatCounts,
    seats: seatTotal(seatCounts),
    price: priceR1(response.state.settings, seatCounts),
    warnings: emailFailed(response.emailStatus) ? ["emailFailed"] : [],
  };
}

function requestedLines(
  input: OrderR2Input,
  dishesOfDay: readonly Dish[],
): Array<DishLine & SummaryDish> {
  return input.items.map((item) => {
    const dish = dishesOfDay.find((d) => d.id === item.dishId);
    return {
      dish: { price: dish?.price ?? null, voucher: dish?.voucher ?? false },
      name: dish?.name ?? "",
      portions: item.portions,
    };
  });
}

/**
 * R2 summary (04 § 7): portions granted by the script, amounts recomputed with one voucher per order; for a
 * duplicate, portions requested (D-16). Null when nothing was confirmed (04 § 6.3).
 */
export function summaryR2(
  input: OrderR2Input,
  response: WriteResponse,
  dishesOfDay: readonly Dish[],
): SummaryR2 | null {
  const outcome = orderOutcome(response);
  if (outcome === "nothingConfirmed") return null;
  const result = response.bookingResult;
  const lines =
    outcome === "duplicate" || result === null
      ? requestedLines(input, dishesOfDay)
      : result.confirmed.map((dish) => ({ dish, name: dish.name, portions: dish.portions }));
  const warnings: SummaryWarning[] = [];
  if (result !== null && wasAdjusted(result)) warnings.push("adjusted");
  if (emailFailed(response.emailStatus)) warnings.push("emailFailed");
  return {
    restaurant: "r2",
    date: input.date,
    duplicate: response.duplicate,
    name: input.name,
    className: input.className,
    serviceMode: input.serviceMode,
    dishes: lines.map(({ name, portions }) => ({ name, portions })),
    amounts: orderAmounts(lines),
    warnings,
  };
}
