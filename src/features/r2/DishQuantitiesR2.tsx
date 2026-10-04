import { defineMessages } from "react-intl";

import { orderAmounts } from "@/domain/pricing";
import { DishFieldset, DishLabel, SoldOutRow } from "@/features/r2/DishFieldsetR2";
import { chosenLines, noDishText, portionsField } from "@/features/r2/order-rules";
import type { DishStock, Portions } from "@/features/r2/order-rules";
import { r2TotalText } from "@/intl/amounts";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { withFieldGroup } from "@/ui/form/app-form";
import { errorText } from "@/ui/form/errors";

import styles from "@/features/r2/DishQuantitiesR2.module.css";

const messages = defineMessages<{
  quantity: { name: string };
}>({
  quantity: {
    id: "public.r2.form.quantity.label",
    defaultMessage: "Quantité : {name}",
    description:
      "04 § 5.3, § 10 — nom accessible du champ quantité d'un plat (sans libellé visible)",
  },
});

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
                label={intl.formatMessage(messages.quantity, { name: stock.dish.name })}
                max={stock.remaining}
                decrementLabel={intl.formatMessage(commonMessages.quantityDecrement, {
                  name: stock.dish.name,
                })}
                incrementLabel={intl.formatMessage(commonMessages.quantityIncrement, {
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
