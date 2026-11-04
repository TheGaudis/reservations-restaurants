// "Now" in Paris, whatever the device's time zone (D-12, E-01, PLAN § 3.7).
// Adapted from AppResaAristide `convex/model/dates.ts`.

import type { IsoDate } from "@/domain/types";

const PARIS = "Europe/Paris";

// en-CA writes YYYY-MM-DD parts; en-GB with h23 writes 0 to 23 (never 24 at midnight).
const parisDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: PARIS,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const parisHourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: PARIS,
  hour: "2-digit",
  hourCycle: "h23",
});

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  const found = parts.find((p) => p.type === type);
  if (found === undefined) throw new Error(`Missing date part ${type}`);
  return found.value;
}

/** Paris calendar date of the instant `now` (ms since epoch): "today" of the whole site. */
export function parisDate(now: number): IsoDate {
  const parts = parisDateFormat.formatToParts(new Date(now));
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
}

/** Paris hour (0 to 23) of the instant `now` (ms since epoch), for the 10 a.m. cutoff (01 § 3.7). */
export function parisHour(now: number): number {
  return Number(part(parisHourFormat.formatToParts(new Date(now)), "hour"));
}
