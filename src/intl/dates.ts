// Dates shown by the site (04 § 8, 05 § 2.3). Business days are ISO strings: they are formatted at midnight UTC
// with `timeZone: 'UTC'` formats, so the device's time zone never shifts a day (PLAN § 3.7).
import { defineMessages } from "react-intl";

import { addDays, dayOfMonth, mondayOf, utcTime } from "@/domain/dates";
import type { CalendarView } from "@/domain/navigation";
import type { IsoDate } from "@/domain/types";
import { intl } from "@/intl/intl";

// Value types of each message: react-intl types `formatMessage` from them (a descriptor without them takes no value).
const messages = defineMessages<{
  longDate: { weekday: string; day: number; month: string; year: string };
  weekSameMonth: { startDay: number; endDayMonth: string; endYear: string };
  weekTwoMonths: { startDayMonth: string; endDayMonth: string; endYear: string };
  weekTwoYears: { startDayMonth: string; startYear: string; endDayMonth: string; endYear: string };
}>({
  longDate: {
    id: "common.date.long",
    defaultMessage: "{weekday} {day, selectordinal, one {#er} other {#}} {month} {year}",
    description:
      "04 § 8, D-03 — date longue avec « 1er » comme les e-mails du script (« jeudi 1er octobre 2026 ») ; majuscule initiale par CSS",
  },
  weekSameMonth: {
    id: "common.calendar.week.sameMonth",
    defaultMessage: "{startDay} – {endDayMonth} {endYear}",
    description: "05 § 2.3 — libellé d'une semaine dans un seul mois (« 5 – 11 oct. 2026 »)",
  },
  weekTwoMonths: {
    id: "common.calendar.week.twoMonths",
    defaultMessage: "{startDayMonth} – {endDayMonth} {endYear}",
    description:
      "05 § 2.3, a-23, E-06 — libellé d'une semaine à cheval sur deux mois (« 28 sept. – 4 oct. 2026 »)",
  },
  weekTwoYears: {
    id: "common.calendar.week.twoYears",
    defaultMessage: "{startDayMonth} {startYear} – {endDayMonth} {endYear}",
    description:
      "05 § 2.3, a-23, PLAN § 3.7 — libellé d'une semaine à cheval sur deux années (« 29 déc. 2025 – 4 janv. 2026 »)",
  },
});

/** « 4 oct. » */
function dayMonth(iso: IsoDate): string {
  return intl.formatDate(utcTime(iso), { format: "dayMonth" });
}

/** « jeudi 1er octobre 2026 » (D-03, E-21), in lower case: the capital comes from CSS (`::first-letter`). */
export function formatLongDate(iso: IsoDate): string {
  const time = utcTime(iso);
  return intl.formatMessage(messages.longDate, {
    weekday: intl.formatDate(time, { format: "weekday" }),
    day: dayOfMonth(iso),
    month: intl.formatDate(time, { format: "month" }),
    year: intl.formatDate(time, { format: "year" }),
  });
}

/**
 * Label of the week of `anchor`, Monday to Sunday (05 § 2.3): « 5 – 11 oct. 2026 » ; the Monday's month when it
 * differs, and its year when that differs too (a-23, E-06).
 * @internal exported for the tests; pages use `formatPeriodLabel`
 */
export function formatWeekLabel(anchor: IsoDate): string {
  const monday = mondayOf(anchor);
  const sunday = addDays(monday, 6);
  const start = utcTime(monday);
  const end = {
    endDayMonth: dayMonth(sunday),
    endYear: intl.formatDate(utcTime(sunday), { format: "year" }),
  };
  if (monday.slice(0, 4) !== sunday.slice(0, 4)) {
    const startYear = intl.formatDate(start, { format: "year" });
    return intl.formatMessage(messages.weekTwoYears, {
      startDayMonth: dayMonth(monday),
      startYear,
      ...end,
    });
  }
  if (monday.slice(0, 7) !== sunday.slice(0, 7)) {
    return intl.formatMessage(messages.weekTwoMonths, { startDayMonth: dayMonth(monday), ...end });
  }
  return intl.formatMessage(messages.weekSameMonth, { startDay: dayOfMonth(monday), ...end });
}

/**
 * « Octobre 2026 »: month of `anchor`, capitalised here as in the legacy code (05 § 2.3, 06 § 3.2).
 */
export function formatMonthLabel(anchor: IsoDate): string {
  const label = intl.formatDate(utcTime(anchor), { format: "monthYear" });
  return label.charAt(0).toLocaleUpperCase("fr-FR") + label.slice(1);
}

/** Label above a calendar (`.cal-label`, 05 § 2.3): the week or the month of `anchor`. */
export function formatPeriodLabel(view: CalendarView, anchor: IsoDate): string {
  return view === "mois" ? formatMonthLabel(anchor) : formatWeekLabel(anchor);
}
