import type { CapacityClass } from "@/domain/capacity";
import type { IsoDate } from "@/domain/types";
import { CalendarDemo } from "@/test/calendar-demo";
import { TODAY } from "@/test/clock";

import preview from "../../../.storybook/preview";

// A column calendar: `CalendarHeader` (‹ period ›, « Semaine | Mois », « Aujourd'hui ») above `CalendarGrid`, wired
// as P4 (b) will wire it (`src/test/calendar-demo.tsx`). Seed of parite.md § 2 around Monday 5 October 2026.
const STATUSES: Readonly<Record<IsoDate, CapacityClass>> = {
  "2026-10-01": "available",
  "2026-10-05": "available",
  "2026-10-06": "almostFull",
  "2026-10-09": "full",
  "2026-10-13": "available",
};

const meta = preview.meta({
  component: CalendarDemo,
  args: {
    restaurant: "r1" as const,
    today: TODAY,
    statuses: STATUSES,
  },
  globals: { accent: "r1" },
});

/** Week view (P-01): today selected, dots of the service days. */
export const Week = meta.story();

/** Month view (P-02): 42 squares, the days of September and November dimmed. */
export const Month = meta.story({
  args: { search: { r1vue: "mois" } },
});

/** The selected day is outside the week shown (after ›): no selected cell, Tab stop on the Monday (05 § 2.6). */
export const SelectedDayOutsidePeriod = meta.story({
  args: { search: { r1: "2026-10-07", r1periode: "2026-10-19" } },
});

/** A day of the next month selected in the month view, which stays on October (05 § 3.1, REG-10). */
export const SelectedDayOfNextMonth = meta.story({
  args: { search: { r1vue: "mois", r1: "2026-11-01", r1periode: "2026-10-01" } },
});

/** The week before today: every day past, faded (05 § 2.5). */
export const PastDays = meta.story({
  args: { search: { r1periode: "2026-09-28" } },
});

/** R2 after 10:00: today's orders are closed (E-43), magenta accent. */
export const OrdersClosed = meta.story({
  args: { restaurant: "r2" as const, closedDays: [TODAY] },
  globals: { accent: "r2" as const },
});
