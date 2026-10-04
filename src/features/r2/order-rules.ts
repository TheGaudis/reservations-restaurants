import { defineMessages } from "react-intl";

import type { OrderR2Values } from "@/domain/bookings";
import type { DishLine } from "@/domain/pricing";
import type { Dish } from "@/domain/types";
import { countValue } from "@/domain/validation";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";

const messages = defineMessages({
  noDish: {
    id: "public.r2.form.dishes.required",
    defaultMessage: "Choisissez au moins un plat.",
    description: "04 § 5.3, § 9 — aucun plat choisi dans le formulaire R2 (message sous les plats)",
  },
});

/** A dish of the day and its portions left (stock minus portions booked, 01 § 3.2). */
export interface DishStock {
  dish: Dish;
  remaining: number;
}

/** Portions typed per dish id. */
export type Portions = OrderR2Values["portions"];

/** Field of the quantity of a dish in the form (`portions.{id}`). */
export function portionsField(dishId: string): `portions.${string}` {
  return `portions.${dishId}`;
}

/** « Choisissez au moins un plat. » (04 § 5.3): the text that the dishes' fieldset shows for every quantity. */
export function noDishText(): string {
  return intl.formatMessage(messages.noDish);
}

/** Dishes that can be ordered: a sold-out dish shows « Épuisé » without a field (04 § 5.3). */
function orderable(dishes: readonly DishStock[]): DishStock[] {
  return dishes.filter(({ remaining }) => remaining > 0);
}

/**
 * Portions of the dishes that can still be ordered: a quantity typed before its dish sold out (state read again,
 * E-11) has no field any more and is not sent.
 */
export function orderablePortions(portions: Portions, dishes: readonly DishStock[]): Portions {
  return Object.fromEntries(
    orderable(dishes).map(({ dish }) => [dish.id, portions[dish.id] ?? null] as const),
  );
}

/** Lines of the live total (04 § 5.3): each dish that can be ordered with portions above 0. */
export function chosenLines(portions: Portions, dishes: readonly DishStock[]): DishLine[] {
  return orderable(dishes)
    .map(({ dish }) => ({ dish, portions: countValue(portions[dish.id] ?? null) }))
    .filter((line) => line.portions > 0);
}

/**
 * Messages of the quantities, for the form's `onDynamic` validator: nothing chosen puts « Choisissez au moins un
 * plat. » on every quantity, so that the first one takes the focus (04 § 5.4, E-41); more portions than left puts
 * « {n} portions au maximum (stock restant). » on that dish (D-18). The script reduces the order anyway (02 § 4.5).
 */
export function dishErrors(
  portions: Portions,
  dishes: readonly DishStock[],
): Partial<Record<`portions.${string}`, string>> {
  const candidates = orderable(dishes);
  if (chosenLines(portions, dishes).length === 0) {
    const message = noDishText();
    return Object.fromEntries(candidates.map(({ dish }) => [portionsField(dish.id), message]));
  }
  const errors: Partial<Record<`portions.${string}`, string>> = {};
  for (const { dish, remaining } of candidates) {
    if (countValue(portions[dish.id] ?? null) > remaining) {
      errors[portionsField(dish.id)] = intl.formatMessage(commonMessages.maxPortions, {
        count: remaining,
      });
    }
  }
  return errors;
}
