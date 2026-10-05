// Calendar arithmetic on ISO days (`YYYY-MM-DD`), computed in UTC so that the device's time zone and the
// daylight saving changes never shift a day (PLAN § 3.7). Adapted from AppResaAristide `src/lib/dates.ts`.

import type { IsoDate } from "@/domain/types";

const DAY_MS = 24 * 3600 * 1000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;

/** One square of a calendar grid (05 § 2.1). */
export interface CalendarCell {
  iso: IsoDate;
  /** Day of the month, shown in the square. */
  day: number;
  /** False for the days of the neighbouring months in the month view (`.cal-dim`). */
  inMonth: boolean;
}

/** Midnight UTC of the day, in ms: the instant that `intl/` formats with `timeZone: 'UTC'`. */
export function utcTime(iso: IsoDate): number {
  const match = ISO_DATE.exec(iso);
  if (match === null) throw new RangeError(`Invalid ISO date ${iso}`);
  const [, year, month, day] = match.map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    throw new RangeError(`Invalid ISO date ${iso}`);
  }
  return Date.UTC(year, month - 1, day);
}

function fromUtcTime(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return fromUtcTime(utcTime(iso) + days * DAY_MS);
}

/** Day of the month (1 to 31). */
export function dayOfMonth(iso: IsoDate): number {
  return new Date(utcTime(iso)).getUTCDate();
}

/** Monday of the week of `iso`: weeks start on Monday, Sunday belongs to the week before (05 § 2.1). */
export function mondayOf(iso: IsoDate): IsoDate {
  const weekday = (new Date(utcTime(iso)).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(iso, -weekday);
}

export function firstOfMonth(iso: IsoDate): IsoDate {
  return `${iso.slice(0, 7)}-01`;
}

/** Same day `months` months later, clamped to the last day of that month (Page ↑ / ↓, a-23, E-07). */
export function addMonthsClamped(iso: IsoDate, months: number): IsoDate {
  const date = new Date(utcTime(iso));
  const first = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months + 1, 0),
  ).getUTCDate();
  return addDays(fromUtcTime(first), Math.min(date.getUTCDate(), lastDay) - 1);
}

export function isSameWeek(a: IsoDate, b: IsoDate): boolean {
  return mondayOf(a) === mondayOf(b);
}

export function isSameMonth(a: IsoDate, b: IsoDate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

function cells(start: IsoDate, count: number, month: string | null): CalendarCell[] {
  return Array.from({ length: count }, (_, i) => {
    const iso = addDays(start, i);
    return { iso, day: dayOfMonth(iso), inMonth: month === null || iso.slice(0, 7) === month };
  });
}

/** The 7 days, Monday to Sunday, of the week of `anchor` (05 § 2.1). */
export function weekCells(anchor: IsoDate): CalendarCell[] {
  return cells(mondayOf(anchor), 7, null);
}

/** 42 days (6 full weeks) from the Monday of the week of the 1st of the month of `anchor` (05 § 2.1). */
export function monthCells(anchor: IsoDate): CalendarCell[] {
  return cells(mondayOf(firstOfMonth(anchor)), 42, anchor.slice(0, 7));
}

/**
 * Day reached by a key from `iso` (`keyTargetIso`, 05 § 3.2), shared by the calendar and the date picker:
 * ← → one day, ↑ ↓ one week, Home / End Monday / Sunday, Page ↑ / ↓ same day of the previous or next month,
 * clamped to its last day (a-23). Null for any other key.
 */
export function keyTargetIso(key: string, iso: IsoDate): IsoDate | null {
  switch (key) {
    case "ArrowLeft": {
      return addDays(iso, -1);
    }
    case "ArrowRight": {
      return addDays(iso, 1);
    }
    case "ArrowUp": {
      return addDays(iso, -7);
    }
    case "ArrowDown": {
      return addDays(iso, 7);
    }
    case "Home": {
      return mondayOf(iso);
    }
    case "End": {
      return addDays(mondayOf(iso), 6);
    }
    case "PageUp": {
      return addMonthsClamped(iso, -1);
    }
    case "PageDown": {
      return addMonthsClamped(iso, 1);
    }
    default: {
      return null;
    }
  }
}
