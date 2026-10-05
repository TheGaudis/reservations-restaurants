import * as v from "valibot";

// Search params of the two calendars, shared by `/` and `/collegue` (PLAN § 3.2, 09 § 1). Every param has a
// fallback: a damaged URL never shows an error. « Today » is never a default here: validateSearch stays pure and the
// component resolves it with the clock.

const IsoDateSchema = v.pipe(v.string(), v.isoDate());

const DaySchema = v.fallback(v.optional(IsoDateSchema), undefined);

const ViewSchema = v.fallback(v.optional(v.picklist(["semaine", "mois"]), "semaine"), "semaine");

/** `r1`, `r2`: selected day; `r1vue`, `r2vue`: week or month; `r1periode`, `r2periode`: anchor of the period. */
export const CalendarSearch = v.object({
  r1: DaySchema,
  r2: DaySchema,
  r1vue: ViewSchema,
  r2vue: ViewSchema,
  r1periode: DaySchema,
  r2periode: DaySchema,
});

/** Defaults left out of the URL by `stripSearchParams` (PLAN § 3.2). */
export const CALENDAR_DEFAULTS = { r1vue: "semaine", r2vue: "semaine" } as const;
