import { intl } from "@/intl/intl";

/** "jeudi 1er octobre 2026" from an ISO date (UTC arithmetic). */
export function formatLongDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return intl.formatMessage(
    {
      id: "common.date.long",
      defaultMessage: "{weekday} {day, selectordinal, one {#er} other {#}} {month} {year}",
      description: "00 § 3 — date longue avec ordinal",
    },
    {
      weekday: intl.formatDate(date, { format: "weekday" }),
      day: date.getUTCDate(),
      month: intl.formatDate(date, { format: "month" }),
      year: intl.formatDate(date, { format: "year" }),
    },
  );
}
