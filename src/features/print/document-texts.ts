// Texts shared by the printed documents (07 § 3 to § 7), in their chunk.
import { defineMessages } from "react-intl";

import type { BookingR1, IsoDate } from "@/domain/types";
import { formatEuros } from "@/intl/amounts";
import { formatLongDate } from "@/intl/dates";
import { intl } from "@/intl/intl";

// Value types of each message: react-intl types `formatMessage` from them.
const messages = defineMessages<{
  tomorrowSubtitle: { date: string };
  seatsBooked: { seats: number; capacity: number };
  dot: { before: string; after: string };
  notProvided: Record<string, never>;
}>({
  tomorrowSubtitle: {
    id: "print.tomorrow.subtitle",
    defaultMessage: "Demain, {date}",
    description: "07 § 6, § 7 — sous-titre du résumé du lendemain",
  },
  seatsBooked: {
    id: "print.r1.info.seatsBooked",
    defaultMessage: "{seats} / {capacity} couverts réservés",
    description: "07 § 3, § 6 — valeur de l'information « Places »",
  },
  dot: {
    id: "print.total.dot",
    defaultMessage: "{before} · {after}",
    description:
      "07 § 3, § 4, § 6, § 7 — séparateur des parties d'un total (« 12 couverts · 67,80 € »)",
  },
  notProvided: {
    id: "print.info.openedBy.none",
    defaultMessage: "Non renseigné",
    description: "07 § 3, § 4 — « Ouvert par » d'un jour ouvert sans nom",
  },
});

/** Labels and messages that several documents print (07 § 3 to § 7). */
export const documentMessages = defineMessages({
  openedBy: {
    id: "print.info.openedBy",
    defaultMessage: "Ouvert par",
    description: "07 § 3, § 4, § 6, § 7 — intitulé d'une information du document",
  },
  places: {
    id: "print.r1.info.places",
    defaultMessage: "Places",
    description: "07 § 3, § 6 — intitulé d'une information du document R1",
  },
  total: {
    id: "print.total.label",
    defaultMessage: "Total",
    description: "07 § 3, § 6, § 7 — intitulé du total",
  },
  noBookings: {
    id: "print.table.noBookings",
    defaultMessage: "Aucune réservation.",
    description: "07 § 3, § 4, § 6, § 7 — tableau sans réservation",
  },
  noDayTomorrow: {
    id: "print.tomorrow.noDay",
    defaultMessage: "Aucun jour ouvert pour demain.",
    description: "07 § 6, § 7 — résumé du lendemain sans jour ouvert",
  },
  name: {
    id: "print.column.name",
    defaultMessage: "Nom",
    description: "07 § 3, § 4, § 6, § 7 — colonne des tableaux",
  },
  seats: {
    id: "print.r1.column.seats",
    defaultMessage: "Couverts",
    description: "07 § 3, § 6 — colonne des tableaux R1",
  },
  price: {
    id: "print.column.price",
    defaultMessage: "Prix",
    description: "07 § 3, § 4, § 6, § 7 — colonne des tableaux",
  },
});

/** « Demain, {date} » (07 § 6, § 7). */
export function tomorrowSubtitle(iso: IsoDate): string {
  return intl.formatMessage(messages.tomorrowSubtitle, { date: formatLongDate(iso) });
}

/** « Ouvert par »: the colleague's name, or « Non renseigné » (07 § 3, § 4). */
export function openedByText(openedBy: string): string {
  return openedBy === "" ? intl.formatMessage(messages.notProvided) : openedBy;
}

/** « Places »: « 15 / 20 couverts réservés » (07 § 3, § 6). */
export function seatsBookedText(seats: number, capacity: number): string {
  return intl.formatMessage(messages.seatsBooked, { seats, capacity });
}

/** Price of an R1 booking: empty without a price or for 0 (07 § 3, `spec/README.md` § 4.1). */
export function bookingPriceText(booking: BookingR1): string {
  return booking.total === null || booking.total === 0 ? "" : formatEuros(booking.total);
}

/** Non-empty `parts` joined two by two with `join` (« 8 élèves, 3 personnels »). */
export function joinParts(
  parts: readonly string[],
  join: (before: string, after: string) => string,
): string {
  let text = "";
  for (const part of parts) {
    if (part !== "") text = text === "" ? part : join(text, part);
  }
  return text;
}

/** Parts of a total joined by « · », empty parts left out (07 § 3: « 12 couverts · 8 élèves… · 67,80 € »). */
export function dotted(parts: readonly string[]): string {
  return joinParts(parts, (before, after) => intl.formatMessage(messages.dot, { before, after }));
}
