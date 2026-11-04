// R2 cutoff and past days, in Paris time whatever the device's time zone (01 § 3.7, § 3.8, D-12, E-01).

import { R2_CUTOFF_HOUR } from "@/domain/constants";
import { parisDate, parisHour } from "@/domain/paris";
import type { IsoDate } from "@/domain/types";

/** Day before today (01 § 3.8): no "Réserver" in either restaurant. */
export function isPast(iso: IsoDate, today: IsoDate): boolean {
  return iso < today;
}

/**
 * No public R2 order online any more (`r2OrdersClosed`, 01 § 3.7, invariant 4): a past day, or today from
 * 10 a.m. in Paris. Staff additions are never closed.
 */
export function isR2OrderingClosed(iso: IsoDate, now: number): boolean {
  const today = parisDate(now);
  return isPast(iso, today) || (iso === today && parisHour(now) >= R2_CUTOFF_HOUR);
}
