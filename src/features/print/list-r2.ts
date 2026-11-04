// Content of document B, list of an R2 day (07 § 4): informations, columns, rows and total; texts that document D
// (07 § 7) prints too.
import { defineMessage } from "react-intl";
import type { IntlShape } from "react-intl";

import type { DishTotal, R2DayTotals } from "@/domain/print";
import type { ServiceMode, StaffServiceDayR2 } from "@/domain/types";
import {
  dotted,
  joinParts,
  openedByText,
  openedByInfoLabel,
  nameColumnLabel,
  priceColumnLabel,
} from "@/features/print/document-texts";
import { amountsText, dishPriceText } from "@/intl/amounts";
import { takeawayLabel, dineInLabel } from "@/intl/common-messages";
import type { PrintInfo } from "@/ui/print/PrintLayout";
import type { PrintColumn, PrintRow } from "@/ui/print/PrintTable";

const themeMessage = defineMessage({
  id: "print.r2.list.info.theme",
  defaultMessage: "Thème",
  description: "07 § 4 — information « Thème » de la liste R2",
});

const noteMessage = defineMessage({
  id: "print.r2.list.info.note",
  defaultMessage: "Note",
  description: "07 § 4 — information « Note » de la liste R2",
});

const dishesMessage = defineMessage({
  id: "print.r2.list.column.dishes",
  defaultMessage: "Plats",
  description: "07 § 4.2 — colonne du tableau « Par client »",
});

const modeMessage = defineMessage({
  id: "print.r2.list.column.mode",
  defaultMessage: "Mode",
  description: "07 § 4.2 — colonne du tableau « Par client »",
});

const contactMessage = defineMessage({
  id: "print.r2.list.column.contact",
  defaultMessage: "Contact",
  description: "07 § 4.2 — colonne du tableau « Par client »",
});

const dishMessage = defineMessage({
  id: "print.r2.list.column.dish",
  defaultMessage: "Plat",
  description: "07 § 4.2 — colonne du récapitulatif par plat",
});

const unitPriceMessage = defineMessage({
  id: "print.r2.list.column.unitPrice",
  defaultMessage: "Prix unitaire",
  description: "07 § 4.2 — colonne du récapitulatif par plat",
});

const amountMessage = defineMessage({
  id: "print.r2.list.column.amount",
  defaultMessage: "Montant",
  description: "07 § 4.2 — colonne du récapitulatif par plat",
});

const noDishMessage = defineMessage({
  id: "print.r2.list.noDish",
  defaultMessage: "Aucun plat.",
  description: "07 § 4.2 — récapitulatif par plat d'un jour sans plat",
});

const dayTotalMessage = defineMessage({
  id: "print.r2.list.total.label",
  defaultMessage: "Total du jour",
  description: "07 § 4.2 — intitulé du total de la liste R2",
});

const clientsMessage = defineMessage<{ count: number }>({
  id: "print.r2.list.total.clients",
  defaultMessage: "{count, plural, one {# client} other {# clients}}",
  description: "07 § 4.2 — nombre de clients du total (« 2 clients »)",
});

const modesMessage = defineMessage<{ before: string; after: string }>({
  id: "print.r2.list.modes",
  defaultMessage: "{before} + {after}",
  description: "07 § 4.2 — modes d'un client joints par « + » (« À emporter + Sur place »)",
});

// Texts of document B that document D prints too (07 § 4.2, § 7).

export const r2ClassColumnLabel = defineMessage({
  id: "print.r2.column.className",
  defaultMessage: "Classe",
  description: "07 § 4.2, § 7 — colonne des tableaux R2",
});

export const r2PortionsColumnLabel = defineMessage({
  id: "print.r2.column.portions",
  defaultMessage: "Portions",
  description: "07 § 4.2, § 7 — colonne des tableaux R2",
});

export const r2PortionCountText = defineMessage<{ count: number }>({
  id: "print.r2.total.portions",
  defaultMessage: "{count, plural, one {# portion} other {# portions}}",
  description: "07 § 4.2, § 7 — nombre de portions du total (« 4 portions »)",
});

const bookedStockText = defineMessage<{ portions: number; stock: number }>({
  id: "print.r2.dish.booked",
  defaultMessage: "{portions} / {stock}",
  description: "07 § 4.2, § 7 — portions réservées sur le stock d'un plat (« 3 / 10 »)",
});

/** Informations of document B (07 § 4): « Thème » and « Note » when not empty, then « Ouvert par ». */
export function listInfosR2(intl: IntlShape, day: StaffServiceDayR2 | undefined): PrintInfo[] {
  const optional: PrintInfo[] = [
    { key: "theme", label: intl.formatMessage(themeMessage), value: day?.theme ?? "" },
    { key: "note", label: intl.formatMessage(noteMessage), value: day?.note ?? "" },
  ];
  return [
    ...optional.filter((info) => info.value !== ""),
    {
      key: "openedBy",
      label: intl.formatMessage(openedByInfoLabel),
      value: openedByText(day?.openedBy ?? ""),
    },
  ];
}

/** Columns of the table « Par client » (07 § 4.2). */
export function customerColumns(intl: IntlShape): PrintColumn[] {
  return [
    { key: "name", label: intl.formatMessage(nameColumnLabel) },
    { key: "className", label: intl.formatMessage(r2ClassColumnLabel) },
    { key: "dishes", label: intl.formatMessage(dishesMessage) },
    { key: "portions", label: intl.formatMessage(r2PortionsColumnLabel), align: "end" },
    { key: "price", label: intl.formatMessage(priceColumnLabel), align: "end" },
    { key: "mode", label: intl.formatMessage(modeMessage) },
    { key: "contact", label: intl.formatMessage(contactMessage) },
  ];
}

/** Modes of a customer joined by « + », in the order of the bookings (07 § 4.1). */
export function modesText(intl: IntlShape, modes: readonly ServiceMode[]): string {
  const labels = modes.map((mode) =>
    intl.formatMessage(mode === "takeaway" ? takeawayLabel : dineInLabel),
  );
  return joinParts(labels, (before, after) => intl.formatMessage(modesMessage, { before, after }));
}

/** Columns of the per-dish summary (07 § 4.2). */
export function dishColumns(intl: IntlShape): PrintColumn[] {
  return [
    { key: "dish", label: intl.formatMessage(dishMessage) },
    { key: "unitPrice", label: intl.formatMessage(unitPriceMessage), align: "end" },
    { key: "portions", label: intl.formatMessage(r2PortionsColumnLabel), align: "end" },
    { key: "amount", label: intl.formatMessage(amountMessage), align: "end" },
  ];
}

/** « {réservées} / {Stock} » of a dish (07 § 4.2, § 7). */
export function bookedText(intl: IntlShape, total: DishTotal): string {
  return intl.formatMessage(bookedStockText, {
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
  return intl.formatMessage(noDishMessage);
}

/** « Total du jour » → « 2 clients · 4 portions · 4,50 € + 1 ticket restaurant » (07 § 4.2, E-16). */
export function listTotalR2(intl: IntlShape, totals: R2DayTotals) {
  return {
    label: intl.formatMessage(dayTotalMessage),
    value: dotted([
      intl.formatMessage(clientsMessage, { count: totals.clients }),
      intl.formatMessage(r2PortionCountText, { count: totals.portions }),
      amountsText(totals.amounts),
    ]),
  };
}
