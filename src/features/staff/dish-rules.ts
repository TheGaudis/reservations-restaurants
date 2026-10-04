import { defineMessages } from "react-intl";

import { dishStock, isDishPriceRefused } from "@/domain/dishes";
import type { DishDraft } from "@/domain/dishes";
import type { FullState } from "@/domain/types";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";

// Rules of the dish form (06 § 6.1, D-19, D-22), shared by « Ajouter un plat » and « Modifier ce plat ». Reading the
// stock and the price, and the body sent: domain/dishes.ts, as for the dish lines of « Ouvrir un jour » R2.

const messages = defineMessages<{
  nameRequired: Record<string, never>;
  stockRequired: Record<string, never>;
  stockBelowBooked: { n: number };
}>({
  nameRequired: {
    id: "staff.dishForm.name.required",
    defaultMessage: "Indiquez le nom du plat.",
    description: "06 § 6.1 — nom du plat vide",
  },
  stockRequired: {
    id: "staff.dishForm.stock.required",
    defaultMessage: "Indiquez un stock supérieur à 0.",
    description: "06 § 6.1 — stock vide, nul ou négatif",
  },
  stockBelowBooked: {
    id: "staff.dish.error.stockBelowBooked",
    defaultMessage:
      "Impossible : {n, plural, one {# portion déjà réservée} other {# portions déjà réservées}} pour ce plat, le stock ne peut pas être inférieur.",
    description: "PLAN annexe F, D-19 — modification d'un plat sous les portions déjà réservées",
  },
});

/**
 * Messages of the form, for its `onDynamic` validator (06 § 6.1): name and stock required, stock not under the
 * portions already booked (`booked`: 0 for a new dish, D-19), price above 0 or empty, ignored for a voucher (D-22).
 */
export function dishErrors(value: DishDraft, booked: number): Record<string, string> {
  const fields: Record<string, string> = {};
  if (value.name.trim() === "") fields["name"] = intl.formatMessage(messages.nameRequired);
  const stock = dishStock(value.stock);
  if (!(stock > 0)) {
    fields["stock"] = intl.formatMessage(messages.stockRequired);
  } else if (stock < booked) {
    fields["stock"] = intl.formatMessage(messages.stockBelowBooked, { n: booked });
  }
  if (isDishPriceRefused(value)) {
    fields["price"] = intl.formatMessage(staffCommonMessages.dishZeroPrice);
  }
  return fields;
}

/**
 * Bookings of a dish (D-21): the lines that « Supprimer ce plat » leaves orphaned and that no list shows any more.
 * Bookings already orphaned belong to no dish and never count.
 */
export function bookingsOfDish(state: FullState, dishId: string): number {
  return state.r2Bookings.filter((booking) => booking.dishId === dishId).length;
}
