import { defineMessages } from "react-intl";

import type { Dish, DishInput, FullState } from "@/domain/types";
import { parseAmount, positiveAmount } from "@/domain/validation";
import { priceInputText } from "@/features/staff/price-suggestions";
import { intl } from "@/intl/intl";

// Values, rules and body of the dish form (06 § 6.1, D-19, D-22), shared by « Ajouter un plat » and « Modifier ce
// plat ».

const messages = defineMessages<{
  nameRequired: Record<string, never>;
  stockRequired: Record<string, never>;
  stockBelowBooked: { n: number };
  zeroPrice: Record<string, never>;
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
  zeroPrice: {
    id: "staff.dish.error.zeroPrice",
    defaultMessage: "Indiquez un prix supérieur à 0, ou laissez le champ vide.",
    description: "PLAN annexe F, D-22 — champ Prix d'un plat à 0 (ou illisible)",
  },
});

/** What the dish form holds, as typed. */
export interface DishValues {
  name: string;
  stock: string;
  price: string;
  voucher: boolean;
}

/** « Ajouter un plat » starts empty (06 § 6.1). */
export const EMPTY_DISH: DishValues = { name: "", stock: "", price: "", voucher: false };

/** « Modifier ce plat » starts from the dish: name without the voucher mark, price disabled for a voucher (06 § 6.1). */
export function dishValues(dish: Dish): DishValues {
  return {
    name: dish.name,
    stock: String(dish.stock),
    price: dish.price === null ? "" : priceInputText(dish.price),
    voucher: dish.voucher,
  };
}

/** Whole stock (06 § 6.1): « 6.5 » gives 6 as `parseInt` did; an empty stock gives 0, an unreadable one NaN. */
function stockOf(raw: string): number {
  return Math.trunc(Number(raw.trim()));
}

const zeroPriceRule = positiveAmount("zeroPrice" as const);

/**
 * Messages of the form, for its `onDynamic` validator (06 § 6.1): name and stock required, stock not under the
 * portions already booked (`booked`: 0 for a new dish, D-19), price above 0 or empty, ignored for a voucher (D-22).
 */
export function dishErrors(value: DishValues, booked: number): Record<string, string> {
  const fields: Record<string, string> = {};
  if (value.name.trim() === "") fields["name"] = intl.formatMessage(messages.nameRequired);
  const stock = stockOf(value.stock);
  if (!(stock > 0)) {
    fields["stock"] = intl.formatMessage(messages.stockRequired);
  } else if (stock < booked) {
    fields["stock"] = intl.formatMessage(messages.stockBelowBooked, { n: booked });
  }
  if (!value.voucher && zeroPriceRule({ value: value.price }) !== undefined) {
    fields["price"] = intl.formatMessage(messages.zeroPrice);
  }
  return fields;
}

/** Dish sent by the form (06 § 6.1): trimmed name, whole stock, no price for a voucher or an empty field. */
export function dishInput(value: DishValues): DishInput {
  return {
    name: value.name.trim(),
    stock: stockOf(value.stock),
    price: value.voucher ? null : (parseAmount(value.price) ?? null),
    voucher: value.voucher,
  };
}

/**
 * Bookings of a dish (D-21): the lines that « Supprimer ce plat » leaves orphaned and that no list shows any more.
 * Bookings already orphaned belong to no dish and never count.
 */
export function bookingsOfDish(state: FullState, dishId: string): number {
  return state.r2Bookings.filter((booking) => booking.dishId === dishId).length;
}
