// Accessible name of a calendar day (05 § 2.4, § 2.5, E-21, E-43). `ui/calendar/CalendarGrid` shows it as is.
import { defineMessage } from "react-intl";
import type { MessageDescriptor } from "react-intl";

import type { CapacityClass } from "@/domain/capacity";
import type { IsoDate } from "@/domain/types";
import { formatLongDate } from "@/intl/dates";
import { intl } from "@/intl/intl";

/** Gauge state of a day (05 § 2.4, CAL_STATUS_WORD). */
const statusMessages: Record<CapacityClass, MessageDescriptor> = {
  available: defineMessage({
    id: "public.calendar.day.available",
    defaultMessage: "places disponibles",
    description:
      "05 § 2.4 — état d'un jour dans l'aria-label d'une case du calendrier (CAL_STATUS_WORD)",
  }),
  almostFull: defineMessage({
    id: "public.calendar.day.almostFull",
    defaultMessage: "bientôt complet",
    description:
      "05 § 2.4 — état d'un jour dans l'aria-label d'une case du calendrier (CAL_STATUS_WORD)",
  }),
  full: defineMessage({
    id: "public.calendar.day.full",
    defaultMessage: "complet",
    description:
      "05 § 2.4 — état d'un jour dans l'aria-label d'une case du calendrier (CAL_STATUS_WORD)",
  }),
};

const noServiceText = defineMessage({
  id: "public.calendar.day.noService",
  defaultMessage: "aucun service",
  description: "05 § 2.4, § 2.5 — jour sans service dans l'aria-label d'une case du calendrier",
});

const pastText = defineMessage({
  id: "public.calendar.day.past",
  defaultMessage: "passé",
  description: "05 § 2.5 — suffixe de l'aria-label d'un jour passé",
});

const ordersClosedText = defineMessage({
  id: "public.calendar.day.r2Closed",
  defaultMessage: "commandes closes",
  description: "annexe F, a-23, E-43 — suffixe de l'aria-label d'un jour R2 clos à 10 h",
});

const partText = defineMessage<{ text: string; part: string }>({
  id: "public.calendar.day.part",
  defaultMessage: "{text}, {part}",
  description:
    "05 § 2.5 — une partie de l'aria-label d'une case ajoutée après une virgule (« {date}, {état}[, passé] »)",
});

export interface CalendarDayState {
  /** Gauge state of the day; `null`: no service (05 § 2.4). */
  status: CapacityClass | null;
  /** Before today in Paris. */
  past: boolean;
  /** R2 day whose online orders are closed (10:00 cut-off, 01 § 3.7). */
  ordersClosed?: boolean | undefined;
}

/**
 * « {date longue}, {état}[, passé] » (05 § 2.5) with « 1er » (E-21), e.g. « jeudi 1er octobre 2026, places
 * disponibles, passé ». A day that is not past and whose orders are closed ends with « , commandes closes » (E-43):
 * today after 10:00. A past day says « passé » only, as on the legacy site.
 */
export function calendarDayLabel(iso: IsoDate, day: CalendarDayState): string {
  const status: MessageDescriptor =
    day.status === null ? noServiceText : statusMessages[day.status];
  const label = intl.formatMessage(partText, {
    text: formatLongDate(iso),
    part: intl.formatMessage(status),
  });
  let suffix: MessageDescriptor | null = null;
  if (day.past) suffix = pastText;
  else if (day.ordersClosed === true) suffix = ordersClosedText;
  if (suffix === null) return label;
  return intl.formatMessage(partText, { text: label, part: intl.formatMessage(suffix) });
}
