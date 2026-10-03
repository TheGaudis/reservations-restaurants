// Named formats (PLAN § 3.10). No `satisfies CustomFormats`: FormatjsIntl.Formats is derived from this object.
export const formats = {
  number: { euro: { style: "currency", currency: "EUR" } },
  date: {
    weekday: { weekday: "long", timeZone: "UTC" },
    month: { month: "long", timeZone: "UTC" },
    year: { year: "numeric", timeZone: "UTC" },
    dayMonth: { day: "numeric", month: "short", timeZone: "UTC" },
    monthYear: { month: "long", year: "numeric", timeZone: "UTC" },
    printedOn: { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" },
  },
} as const;
