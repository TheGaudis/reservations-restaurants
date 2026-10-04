// Content of document B, list of an R2 day (07 § 4): informations, columns, rows and total; texts that document D
// (07 § 7) prints too.
import { defineMessages } from "react-intl";
import type { IntlShape } from "react-intl";

import type { DishTotal, R2DayTotals } from "@/domain/print";
import type { ServiceMode, StaffServiceDayR2 } from "@/domain/types";
import { documentMessages, dotted, joinParts, openedByText } from "@/features/print/document-texts";
import { amountsText, dishPriceText } from "@/intl/amounts";
import { commonMessages } from "@/intl/common-messages";
import type { PrintInfo } from "@/ui/print/PrintLayout";
import type { PrintColumn, PrintRow } from "@/ui/print/PrintTable";

// Value types of each message: react-intl types `formatMessage` from them.
const messages = defineMessages<{
  theme: Record<string, never>;
  note: Record<string, never>;
  dishes: Record<string, never>;
  mode: Record<string, never>;
  contact: Record<string, never>;
  dish: Record<string, never>;
  unitPrice: Record<string, never>;
  amount: Record<string, never>;
  noDish: Record<string, never>;
  dayTotal: Record<string, never>;
  clients: { count: number };
  modes: { before: string; after: string };
}>({
  theme: {
    id: "print.r2.list.info.theme",
    defaultMessage: "Thème",
    description: "07 § 4 — information « Thème » de la liste R2",
  },
  note: {
    id: "print.r2.list.info.note",
    defaultMessage: "Note",
    description: "07 § 4 — information « Note » de la liste R2",
  },
  dishes: {
    id: "print.r2.list.column.dishes",
    defaultMessage: "Plats",
    description: "07 § 4.2 — colonne du tableau « Par client »",
  },
  mode: {
    id: "print.r2.list.column.mode",
    defaultMessage: "Mode",
    description: "07 § 4.2 — colonne du tableau « Par client »",
  },
  contact: {
    id: "print.r2.list.column.contact",
    defaultMessage: "Contact",
    description: "07 § 4.2 — colonne du tableau « Par client »",
  },
  dish: {
    id: "print.r2.list.column.dish",
    defaultMessage: "Plat",
    description: "07 § 4.2 — colonne du récapitulatif par plat",
  },
  unitPrice: {
    id: "print.r2.list.column.unitPrice",
    defaultMessage: "Prix unitaire",
    description: "07 § 4.2 — colonne du récapitulatif par plat",
  },
  amount: {
    id: "print.r2.list.column.amount",
    defaultMessage: "Montant",
    description: "07 § 4.2 — colonne du récapitulatif par plat",
  },
  noDish: {
    id: "print.r2.list.noDish",
    defaultMessage: "Aucun plat.",
    description: "07 § 4.2 — récapitulatif par plat d'un jour sans plat",
  },
  dayTotal: {
    id: "print.r2.list.total.label",
    defaultMessage: "Total du jour",
    description: "07 § 4.2 — intitulé du total de la liste R2",
  },
  clients: {
    id: "print.r2.list.total.clients",
    defaultMessage: "{count, plural, one {# client} other {# clients}}",
    description: "07 § 4.2 — nombre de clients du total (« 2 clients »)",
  },
  modes: {
    id: "print.r2.list.modes",
    defaultMessage: "{before} + {after}",
    description: "07 § 4.2 — modes d'un client joints par « + » (« À emporter + Sur place »)",
  },
});

/** Texts of document B that document D prints too (07 § 4.2, § 7). */
export const r2Messages = defineMessages<{
  className: Record<string, never>;
  portions: Record<string, never>;
  portionCount: { count: number };
  booked: { portions: number; stock: number };
}>({
  className: {
    id: "print.r2.column.className",
    defaultMessage: "Classe",
    description: "07 § 4.2, § 7 — colonne des tableaux R2",
  },
  portions: {
    id: "print.r2.column.portions",
    defaultMessage: "Portions",
    description: "07 § 4.2, § 7 — colonne des tableaux R2",
  },
  portionCount: {
    id: "print.r2.total.portions",
    defaultMessage: "{count, plural, one {# portion} other {# portions}}",
    description: "07 § 4.2, § 7 — nombre de portions du total (« 4 portions »)",
  },
  booked: {
    id: "print.r2.dish.booked",
    defaultMessage: "{portions} / {stock}",
    description: "07 § 4.2, § 7 — portions réservées sur le stock d'un plat (« 3 / 10 »)",
  },
});

/** Informations of document B (07 § 4): « Thème » and « Note » when not empty, then « Ouvert par ». */
export function listInfosR2(intl: IntlShape, day: StaffServiceDayR2 | undefined): PrintInfo[] {
  const optional: PrintInfo[] = [
    { key: "theme", label: intl.formatMessage(messages.theme), value: day?.theme ?? "" },
    { key: "note", label: intl.formatMessage(messages.note), value: day?.note ?? "" },
  ];
  return [
    ...optional.filter((info) => info.value !== ""),
    {
      key: "openedBy",
      label: intl.formatMessage(documentMessages.openedBy),
      value: openedByText(day?.openedBy ?? ""),
    },
  ];
}

/** Columns of the table « Par client » (07 § 4.2). */
export function customerColumns(intl: IntlShape): PrintColumn[] {
  return [
    { key: "name", label: intl.formatMessage(documentMessages.name) },
    { key: "className", label: intl.formatMessage(r2Messages.className) },
    { key: "dishes", label: intl.formatMessage(messages.dishes) },
    { key: "portions", label: intl.formatMessage(r2Messages.portions), align: "end" },
    { key: "price", label: intl.formatMessage(documentMessages.price), align: "end" },
    { key: "mode", label: intl.formatMessage(messages.mode) },
    { key: "contact", label: intl.formatMessage(messages.contact) },
  ];
}

/** Modes of a customer joined by « + », in the order of the bookings (07 § 4.1). */
export function modesText(intl: IntlShape, modes: readonly ServiceMode[]): string {
  const labels = modes.map((mode) =>
    intl.formatMessage(mode === "takeaway" ? commonMessages.takeaway : commonMessages.dineIn),
  );
  return joinParts(labels, (before, after) =>
    intl.formatMessage(messages.modes, { before, after }),
  );
}

/** Columns of the per-dish summary (07 § 4.2). */
export function dishColumns(intl: IntlShape): PrintColumn[] {
  return [
    { key: "dish", label: intl.formatMessage(messages.dish) },
    { key: "unitPrice", label: intl.formatMessage(messages.unitPrice), align: "end" },
    { key: "portions", label: intl.formatMessage(r2Messages.portions), align: "end" },
    { key: "amount", label: intl.formatMessage(messages.amount), align: "end" },
  ];
}

/** « {réservées} / {Stock} » of a dish (07 § 4.2, § 7). */
export function bookedText(intl: IntlShape, total: DishTotal): string {
  return intl.formatMessage(r2Messages.booked, {
    portions: total.portions,
    stock: total.dish.stock,
  });
}

/** Row of a dish in the per-dish summary; one voucher per order in the amount (07 § 4.2, E-16). */
export function dishRow(intl: IntlShape, total: DishTotal): PrintRow {
  return {
    key: total.dish.id,
    cells: [
      total.dish.name,
      dishPriceText(total.dish),
      bookedText(intl, total),
      amountsText(total.amounts),
    ],
  };
}

/** « Aucun plat. » (07 § 4.2). */
export function noDishText(intl: IntlShape): string {
  return intl.formatMessage(messages.noDish);
}

/** « Total du jour » → « 2 clients · 4 portions · 4,50 € + 1 ticket restaurant » (07 § 4.2, E-16). */
export function listTotalR2(intl: IntlShape, totals: R2DayTotals) {
  return {
    label: intl.formatMessage(messages.dayTotal),
    value: dotted([
      intl.formatMessage(messages.clients, { count: totals.clients }),
      intl.formatMessage(r2Messages.portionCount, { count: totals.portions }),
      amountsText(totals.amounts),
    ]),
  };
}
