import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import { noDishText } from "@/features/r2/order-rules";
import type { DishStock } from "@/features/r2/order-rules";
import { dishPriceText, withPrice } from "@/intl/amounts";
import { commonMessages } from "@/intl/common-messages";

import styles from "@/features/r2/DishQuantitiesR2.module.css";

// Rows and fieldset of `DishQuantitiesR2` (04 § 5.3), apart so that its file exports the field group only.

// Red round before the message (08 § 4.6), outside the element that `aria-describedby` reads.
const MARK = "!";

/** A sold-out dish: its name and « Épuisé », without a field (04 § 5.3). */
export function SoldOutRow({ name }: { name: string }) {
  return (
    <div className={styles["row"]}>
      <span className={styles["name"]}>{name}</span>
      <span className={styles["soldOut"]}>
        <FormattedMessage {...commonMessages.soldOut} />
      </span>
    </div>
  );
}

/** The dish line of a row: « Lasagnes␣— 4,50 € » over « 4 disponibles » (04 § 5.3). */
export function DishLabel({ stock }: { stock: DishStock }) {
  const { dish, remaining } = stock;
  return (
    <span className={styles["name"]}>
      {withPrice(dish.name, dishPriceText(dish))}
      <span className={styles["available"]}>
        <FormattedMessage
          id="public.r2.form.dish.available"
          defaultMessage="{count, plural, one {# disponible} other {# disponibles}}"
          description="04 § 5.3, § 8 — portions restantes d'un plat dans le formulaire R2 (« 3 disponibles »)"
          values={{ count: remaining }}
        />
      </span>
    </span>
  );
}

interface DishFieldsetProps {
  rows: ReactNode;
  /** « Choisissez au moins un plat. » is shown: the fieldset is described by it (E-41). */
  noDish: boolean;
  errorId: string;
}

export function DishFieldset({ rows, noDish, errorId }: DishFieldsetProps) {
  return (
    <fieldset
      className={styles["group"]}
      aria-describedby={noDish ? errorId : undefined}
      data-dishes=""
    >
      <legend className={styles["legend"]}>
        <FormattedMessage
          id="public.r2.form.dishes.legend"
          defaultMessage="Choisissez vos plats et quantités"
          description="04 § 5.3 — légende du groupe des plats du formulaire R2"
        />
      </legend>
      {rows}
      {noDish ? (
        <p className={styles["error"]}>
          <span className={styles["mark"]} aria-hidden="true">
            {MARK}
          </span>
          <span id={errorId}>{noDishText()}</span>
        </p>
      ) : null}
    </fieldset>
  );
}
