// Content of document A, list of an R1 day (07 § 3): informations, columns, rows and total.
import { defineMessage } from "react-intl";
import type { IntlShape } from "react-intl";

import type { R1Totals } from "@/domain/print";
import type { BookingR1, StaffServiceDayR1 } from "@/domain/types";
import {
  bookingPriceText,
  dotted,
  joinParts,
  openedByText,
  seatsBookedText,
  openedByInfoLabel,
  placesInfoLabel,
  nameColumnLabel,
  seatsColumnLabel,
  priceColumnLabel,
} from "@/features/print/document-texts";
import { formatEuros, seatsText } from "@/intl/amounts";
import type { PrintInfo } from "@/ui/print/PrintLayout";
import type { PrintCell, PrintColumn, PrintColumnGroup, PrintRow } from "@/ui/print/PrintTable";

import styles from "@/features/print/ListDocumentR1.module.css";

const themeMessage = defineMessage({
  id: "print.r1.list.info.theme",
  defaultMessage: "Thème",
  description: "07 § 3 — information « Thème » de la liste R1",
});

const menuMessage = defineMessage({
  id: "print.r1.list.info.menu",
  defaultMessage: "Menu",
  description: "07 § 3 — information « Menu » de la liste R1 (colonne large)",
});

const dayClosedMessage = defineMessage({
  id: "print.r1.list.dayClosed",
  defaultMessage: "Ce jour n'est plus ouvert.",
  description:
    "PLAN annexe F, a-24 — liste imprimée R1 d'un jour supprimé entre-temps (remplace « Aucun jour ouvert pour demain. »)",
});

const noCountMessage = defineMessage({
  id: "print.r1.list.noCount",
  defaultMessage: "–",
  description: "07 § 3 — case Élèves, Pers. ou Ext. vide ou à 0, grisée",
});

const groupCustomerMessage = defineMessage({
  id: "print.r1.list.group.customer",
  defaultMessage: "Client",
  description: "07 § 3 — en-tête de groupe (Nom, Classe ou service)",
});

const groupBookingMessage = defineMessage({
  id: "print.r1.list.group.booking",
  defaultMessage: "Réservation",
  description: "07 § 3 — en-tête de groupe (Élèves à Prix)",
});

const groupInformationMessage = defineMessage({
  id: "print.r1.list.group.information",
  defaultMessage: "Informations",
  description: "07 § 3 — en-tête de groupe (Contact, Observation)",
});

const groupRoomMessage = defineMessage({
  id: "print.r1.list.group.room",
  defaultMessage: "À remplir en salle",
  description: "07 § 3 — en-tête de groupe (N° table, Chef de rang)",
});

const classNameMessage = defineMessage({
  id: "print.r1.list.column.className",
  defaultMessage: "Classe ou service",
  description: "07 § 3 — colonne de la liste R1",
});

const studentsMessage = defineMessage({
  id: "print.r1.list.column.students",
  defaultMessage: "Élèves",
  description: "07 § 3 — colonne de la liste R1",
});

const staffMembersMessage = defineMessage({
  id: "print.r1.list.column.staffMembers",
  defaultMessage: "Pers.",
  description: "07 § 3 — colonne de la liste R1 (personnels)",
});

const externalsMessage = defineMessage({
  id: "print.r1.list.column.externals",
  defaultMessage: "Ext.",
  description: "07 § 3 — colonne de la liste R1 (extérieurs)",
});

const contactMessage = defineMessage({
  id: "print.r1.list.column.contact",
  defaultMessage: "Contact",
  description: "07 § 3 — colonne de la liste R1",
});

const observationMessage = defineMessage({
  id: "print.r1.list.column.observation",
  defaultMessage: "Observation",
  description: "07 § 3 — colonne de la liste R1",
});

const tableNumberMessage = defineMessage({
  id: "print.r1.list.column.tableNumber",
  defaultMessage: "N° table",
  description: "07 § 3 — colonne vide, à remplir en salle",
});

const headWaiterMessage = defineMessage({
  id: "print.r1.list.column.headWaiter",
  defaultMessage: "Chef de rang",
  description: "07 § 3 — colonne vide, à remplir en salle",
});

const studentCountMessage = defineMessage<{ count: number }>({
  id: "print.r1.list.total.students",
  defaultMessage: "{count, plural, one {# élève} other {# élèves}}",
  description: "07 § 3 — détail du total (« 8 élèves »)",
});

const staffCountMessage = defineMessage<{ count: number }>({
  id: "print.r1.list.total.staffMembers",
  defaultMessage: "{count, plural, one {# personnel} other {# personnels}}",
  description: "07 § 3 — détail du total (« 3 personnels »)",
});

const externalCountMessage = defineMessage<{ count: number }>({
  id: "print.r1.list.total.externals",
  defaultMessage: "{count, plural, one {# extérieur} other {# extérieurs}}",
  description: "07 § 3 — détail du total (« 1 extérieur »)",
});

const commaMessage = defineMessage<{ before: string; after: string }>({
  id: "print.r1.list.total.comma",
  defaultMessage: "{before}, {after}",
  description: "07 § 3 — séparateur du détail du total (« 8 élèves, 3 personnels »)",
});

/** Informations of document A, empty ones left out (07 § 3). */
export function listInfosR1(intl: IntlShape, day: StaffServiceDayR1, seats: number): PrintInfo[] {
  const optional: PrintInfo[] = [
    { key: "theme", label: intl.formatMessage(themeMessage), value: day.theme },
    { key: "menu", label: intl.formatMessage(menuMessage), value: day.menu, wide: true },
  ];
  return [
    ...optional.filter((info) => info.value !== ""),
    {
      key: "openedBy",
      label: intl.formatMessage(openedByInfoLabel),
      value: openedByText(day.openedBy),
    },
    {
      key: "places",
      label: intl.formatMessage(placesInfoLabel),
      value: seatsBookedText(seats, day.capacity),
    },
  ];
}

/** Columns of document A (07 § 3). */
export function listColumnsR1(intl: IntlShape): PrintColumn[] {
  return [
    { key: "name", label: intl.formatMessage(nameColumnLabel), className: styles["name"] },
    {
      key: "className",
      label: intl.formatMessage(classNameMessage),
      className: styles["className"],
    },
    {
      key: "students",
      label: intl.formatMessage(studentsMessage),
      className: styles["count"],
      align: "center",
    },
    {
      key: "staffMembers",
      label: intl.formatMessage(staffMembersMessage),
      className: styles["count"],
      align: "center",
    },
    {
      key: "externals",
      label: intl.formatMessage(externalsMessage),
      className: styles["count"],
      align: "center",
    },
    {
      key: "seats",
      label: intl.formatMessage(seatsColumnLabel),
      className: styles["seats"],
      align: "center",
    },
    {
      key: "price",
      label: intl.formatMessage(priceColumnLabel),
      className: styles["price"],
      align: "end",
    },
    { key: "contact", label: intl.formatMessage(contactMessage), className: styles["contact"] },
    { key: "observation", label: intl.formatMessage(observationMessage) },
    {
      key: "tableNumber",
      label: intl.formatMessage(tableNumberMessage),
      className: styles["tableNumber"],
      align: "center",
    },
    {
      key: "headWaiter",
      label: intl.formatMessage(headWaiterMessage),
      className: styles["headWaiter"],
      align: "center",
    },
  ];
}

/** Group headers of document A (07 § 3). */
export function listGroupsR1(intl: IntlShape): PrintColumnGroup[] {
  return [
    { key: "customer", label: intl.formatMessage(groupCustomerMessage), span: 2 },
    { key: "booking", label: intl.formatMessage(groupBookingMessage), span: 5, center: true },
    { key: "information", label: intl.formatMessage(groupInformationMessage), span: 2 },
    { key: "room", label: intl.formatMessage(groupRoomMessage), span: 2, center: true },
  ];
}

/** Row of a booking in document A (07 § 3). */
export function listRowR1(intl: IntlShape, booking: BookingR1): PrintRow {
  // `Number(v) || '–'` of printDayR1: a count of 0 or empty is a greyed dash.
  const count = (value: number | null): PrintCell =>
    value === null || value === 0
      ? { content: intl.formatMessage(noCountMessage), tone: "muted" }
      : { content: value };
  return {
    key: booking.id,
    cells: [
      booking.name,
      booking.className,
      count(booking.students),
      count(booking.staffMembers),
      count(booking.externals),
      booking.seats,
      bookingPriceText(booking),
      booking.contact,
      booking.observation === "" ? "" : { content: booking.observation, tone: "marked" },
      "",
      "",
    ],
  };
}

/** « 12 couverts · 8 élèves, 3 personnels, 1 extérieur · 67,80 € » (07 § 3); detail only when it adds up. */
export function listTotalR1(intl: IntlShape, totals: R1Totals): string {
  const detail = totals.detailed
    ? ([
        [totals.students, studentCountMessage],
        [totals.staffMembers, staffCountMessage],
        [totals.externals, externalCountMessage],
      ] as const)
    : [];
  const parts = detail
    .filter(([count]) => count > 0)
    .map(([count, message]) => intl.formatMessage(message, { count }));
  const detailText = joinParts(parts, (before, after) =>
    intl.formatMessage(commaMessage, { before, after }),
  );
  return dotted([
    seatsText(totals.seats),
    detailText,
    totals.price > 0 ? formatEuros(totals.price) : "",
  ]);
}

/** « Ce jour n'est plus ouvert. » (PLAN annexe F, a-24). */
export function dayClosedText(intl: IntlShape): string {
  return intl.formatMessage(dayClosedMessage);
}
