import type { ReactNode } from "react";
import { defineMessage, FormattedMessage } from "react-intl";

import { orderAmounts } from "@/domain/pricing";
import { chosenLines, noDishText, portionsField } from "@/features/r2/order-rules";
import type { DishStock, Portions } from "@/features/r2/order-rules";
import { dishPriceText, r2TotalText, withPrice } from "@/intl/amounts";
import {
  quantityDecrementLabel,
  quantityIncrementLabel,
  soldOutLabel,
} from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { withFieldGroup } from "@/ui/form/app-form";
import { errorText } from "@/ui/form/errors";
import { ErrorMark } from "@/ui/form/FieldShell";

import styles from "@/features/r2/DishQuantitiesR2.module.css";

const quantityMessage = defineMessage<{ name: string }>({
  id: "public.r2.form.quantity.label",
  defaultMessage: "Quantité : {name}",
  description: "04 § 5.3, § 10 — nom accessible du champ quantité d'un plat (sans libellé visible)",
});

/** A sold-out dish: its name and « Épuisé », without a field (04 § 5.3). */
function SoldOutRow({ name }: { name: string }) {
  return (
    <div className={styles["row"]}>
      <span className={styles["name"]}>{name}</span>
      <span className={styles["soldOut"]}>
        <FormattedMessage {...soldOutLabel} />
      </span>
    </div>
  );
}

/** The dish line of a row: « Lasagnes␣— 4,50 € » over « 4 disponibles » (04 § 5.3). */
function DishLabel({ stock }: { stock: DishStock }) {
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
  /** One row per dish: `SoldOutRow`, or `DishLabel` and its quantity field (04 § 5.3). */
  children: ReactNode;
  /** « Choisissez au moins un plat. » is shown: the fieldset is described by it (E-41). */
  noDish: boolean;
  errorId: string;
}

function DishFieldset({ children, noDish, errorId }: DishFieldsetProps) {
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
      {children}
      {noDish ? (
        <p className={styles["error"]}>
          <ErrorMark />
          <span id={errorId}>{noDishText()}</span>
        </p>
      ) : null}
    </fieldset>
  );
}

const portionsDefaults: { portions: Portions } = { portions: {} };

interface DishQuantitiesProps {
  /** Dishes of the day in the order of the sheet, with their portions left (state shown, E-08). */
  dishes: readonly DishStock[];
  /** Id of « Choisissez au moins un plat. », unique in the page (`useId` of the form). */
  errorId: string;
}

const dishProps: DishQuantitiesProps = { dishes: [], errorId: "" };

/**
 * « Choisissez vos plats et quantités » (04 § 5.3): one row per dish of the day, a quantity with −/+ bounded by the
 * portions left (D-17, D-18), « Épuisé » for a sold-out dish; « Choisissez au moins un plat. » under the rows, tied to
 * the fieldset and to every quantity (E-41); then the live total with one meal voucher per order (invariant 5), empty
 * when nothing priced is chosen. Bound to the field `portions` of the form.
 */
export const DishQuantitiesR2 = withFieldGroup({
  defaultValues: portionsDefaults,
  props: dishProps,
  render: ({ group, dishes, errorId }) => {
    const noDish = noDishText();
    const rows = dishes.map((stock) =>
      stock.remaining <= 0 ? (
        <SoldOutRow key={stock.dish.id} name={stock.dish.name} />
      ) : (
        <group.AppField key={stock.dish.id} name={portionsField(stock.dish.id)}>
          {(field) => (
            <div className={styles["row"]}>
              <DishLabel stock={stock} />
              <field.NumberField
                hideLabel
                label={intl.formatMessage(quantityMessage, { name: stock.dish.name })}
                max={stock.remaining}
                decrementLabel={intl.formatMessage(quantityDecrementLabel, {
                  name: stock.dish.name,
                })}
                incrementLabel={intl.formatMessage(quantityIncrementLabel, {
                  name: stock.dish.name,
                })}
                errorShownBy={errorText(field.state.meta.errors) === noDish ? errorId : undefined}
              />
            </div>
          )}
        </group.AppField>
      ),
    );
    const first = dishes.find((stock) => stock.remaining > 0);
    return (
      <>
        {first === undefined ? (
          <DishFieldset noDish={false} errorId={errorId}>
            {rows}
          </DishFieldset>
        ) : (
          <group.Field name={portionsField(first.dish.id)}>
            {(field) => (
              <DishFieldset
                noDish={errorText(field.state.meta.errors) === noDish}
                errorId={errorId}
              >
                {rows}
              </DishFieldset>
            )}
          </group.Field>
        )}
        <group.Subscribe
          selector={(state) =>
            r2TotalText(orderAmounts(chosenLines(state.values.portions, dishes)))
          }
        >
          {(total) => (
            <p className={styles["total"]} aria-live="polite">
              {total}
            </p>
          )}
        </group.Subscribe>
      </>
    );
  },
});
