// Meal vouchers of R2 (01 § 3.5, § 3.6). The script has no voucher column: the mark ends the dish name in the
// sheet and on the wire ("Bowl (ticket restaurant)"). The API boundary removes it on reading and adds it back
// on sending, with the same functions for the API and the local copy, so that a second pass changes nothing.

import type { Dish, ServiceMode } from "@/domain/types";

type VoucherFlag = Pick<Dish, "voucher">;

/** `TICKET_MARK` (00 § 2.1): a normal space, then the mention. */
export const VOUCHER_MARK = " (ticket restaurant)";

/** `TICKET_RE` (00 § 2.1): the mention at the end of a name, any case, spaces around. */
export const VOUCHER_MARK_RE = /\s*\(ticket restaurant\)\s*$/iu;

/** The name without the voucher mark (`plainName`, 01 § 3.5). */
export function plainName(name: string): string {
  return name.replace(VOUCHER_MARK_RE, "");
}

/** The name sent to the script (`withTicketMark`, 01 § 3.5). */
export function withVoucherMark(name: string, voucher: boolean): string {
  return plainName(name) + (voucher ? VOUCHER_MARK : "");
}

/** The name, as received from the script, carries the voucher mark (`flagTicket`, 01 § 3.5). */
export function hasVoucherMark(name: string): boolean {
  return VOUCHER_MARK_RE.test(name);
}

/** At least one dish of the day is paid with a voucher, even a sold-out one (`dayHasTicket`, 01 § 3.6). */
export function dayHasVoucher(dishesOfDay: readonly VoucherFlag[]): boolean {
  return dishesOfDay.some((dish) => dish.voucher);
}

/**
 * Service mode actually sent (`serviceMode`, 01 § 3.6, invariant 5): dine-in only on a voucher day, whatever the
 * customer chose; the choice itself is kept.
 */
export function serviceMode(dishesOfDay: readonly VoucherFlag[], chosen: ServiceMode): ServiceMode {
  return dayHasVoucher(dishesOfDay) ? "dineIn" : chosen;
}
