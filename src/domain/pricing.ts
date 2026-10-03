// Prices and amounts as numbers (01 § 3.4, § 3.5); `intl/amounts.ts` turns them into text.
// `priceR1` adapted from AppResaAristide `convex/model/pricing.ts` (`r1Total`).

import type { Dish, Settings } from "@/domain/types";

/** The three counters of an R1 booking (04 § 5.2). */
export interface SeatCounts {
  students: number;
  staffMembers: number;
  externals: number;
}

export type R1Prices = Pick<Settings, "priceStudent" | "priceStaff" | "priceExternal">;

/** R2 amount: euros, meal vouchers, and whether a booked dish has neither (« hors plats sans prix indiqué »). */
export interface Amounts {
  euros: number;
  vouchers: number;
  gap: boolean;
}

/** Portions of one dish. */
export interface DishLine {
  dish: Pick<Dish, "price" | "voucher">;
  portions: number;
}

const NO_AMOUNT: Amounts = { euros: 0, vouchers: 0, gap: false };

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Seats of an R1 booking: students + staff members + externals (01 § 2.3). */
export function seatTotal(counts: SeatCounts): number {
  return counts.students + counts.staffMembers + counts.externals;
}

/** `priceR1` (01 § 3.4): each counter at its price, rounded to the cent as the script records it. */
export function priceR1(prices: R1Prices, counts: SeatCounts): number {
  return roundCents(
    counts.students * prices.priceStudent +
      counts.staffMembers * prices.priceStaff +
      counts.externals * prices.priceExternal,
  );
}

/**
 * `r2Amounts` (01 § 3.5): a voucher dish counts one voucher per portion; a priced dish counts in euros (a price
 * of 0 included, 01 point 9); a booked dish with neither sets `gap`.
 */
export function r2Amounts(lines: readonly DishLine[]): Amounts {
  let euros = 0;
  let vouchers = 0;
  let gap = false;
  for (const { dish, portions } of lines) {
    if (dish.voucher) vouchers += portions;
    else if (dish.price !== null) euros += dish.price * portions;
    else if (portions > 0) gap = true;
  }
  return { euros: roundCents(euros), vouchers, gap };
}

/** `orderAmounts` (01 § 3.5, invariant 5): an order counts one meal voucher at most. */
export function orderAmounts(lines: readonly DishLine[]): Amounts {
  const amounts = r2Amounts(lines);
  return { ...amounts, vouchers: Math.min(amounts.vouchers, 1) };
}

/** Sum of several amounts, for instance the orders of a day (07 § 4.2). */
export function addAmounts(amounts: readonly Amounts[]): Amounts {
  let sum = NO_AMOUNT;
  for (const a of amounts) {
    sum = {
      euros: roundCents(sum.euros + a.euros),
      vouchers: sum.vouchers + a.vouchers,
      gap: sum.gap || a.gap,
    };
  }
  return sum;
}

/** Something to show: `amountsText` is empty otherwise (01 § 3.5). */
export function hasAmounts(amounts: Amounts): boolean {
  return amounts.euros > 0 || amounts.vouchers > 0;
}
