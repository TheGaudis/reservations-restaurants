import { defineMessages } from "react-intl";

import type { BookingR1, BookingR2, Dish, Restaurant } from "@/domain/types";
import { dishAmountText, formatEuros, seatsText } from "@/intl/amounts";
import { intl } from "@/intl/intl";

// Text of a booking line of the staff cards (05 § 4.6) and the `editResa` value of a booking (PLAN § 3.2).

const messages = defineMessages<{
  portions: { count: number };
  takeaway: Record<string, never>;
  dineIn: Record<string, never>;
}>({
  portions: {
    id: "staff.booking.line.portions",
    defaultMessage: "{count, plural, one {# portion} other {# portions}}",
    description: "05 § 4.6 — quantité d'une ligne de réservation R2 (plural(Qte, 'portion'))",
  },
  takeaway: {
    id: "staff.booking.line.takeaway",
    defaultMessage: "à emporter",
    description: "05 § 4.6 — mode d'une ligne de réservation R2 commandée à emporter",
  },
  dineIn: {
    id: "staff.booking.line.dineIn",
    defaultMessage: "sur place",
    description: "05 § 4.6 — mode d'une ligne de réservation R2 servie sur place (tout autre mode)",
  },
});

/** Parts of a booking line (05 § 4.6): the name in bold, the details, the observation in italics; empty parts left out. */
export interface BookingLine {
  name: string;
  details: string[];
  observation: string;
}

/**
 * R1 line (05 § 4.6): « Nom — Classe — 3 couverts — 16,00 € — contact — observation ». A total that is empty (bookings
 * made before the prices) or 0 is left out.
 */
export function bookingLineR1(booking: BookingR1): BookingLine {
  const total = booking.total === null || booking.total === 0 ? "" : formatEuros(booking.total);
  const details = [booking.className, seatsText(booking.seats), total, booking.contact];
  return {
    name: booking.name,
    details: details.filter((part) => part !== ""),
    observation: booking.observation,
  };
}

/**
 * R2 line (05 § 4.6): « Nom — Classe — 1 portion — 4,50 € — sur place — contact — observation »; the amount of these
 * portions of the dish (« 7,00 € », « 2 tickets restaurant » or nothing), the mode in lower case.
 */
export function bookingLineR2(booking: BookingR2, dish: Dish): BookingLine {
  const mode = intl.formatMessage(
    booking.serviceMode === "takeaway" ? messages.takeaway : messages.dineIn,
  );
  const details = [
    booking.className,
    intl.formatMessage(messages.portions, { count: booking.portions }),
    dishAmountText(dish, booking.portions),
    mode,
    booking.contact,
  ];
  return {
    name: booking.name,
    details: details.filter((part) => part !== ""),
    observation: booking.observation,
  };
}

/** `editResa` of a booking: `{restaurant}:{id}` (PLAN § 3.2). */
export function editResaValue(restaurant: Restaurant, id: string): string {
  return `${restaurant}:${id}`;
}
