import { defineMessages } from "react-intl";

import type { DishDraft } from "@/domain/dishes";
import { newDishLine } from "@/features/staff/dish-lines";
import type { DishLine } from "@/features/staff/dish-lines";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";
import { Button } from "@/ui/button/Button";
import { IconButton } from "@/ui/button/IconButton";
import { withFieldGroup } from "@/ui/form/app-form";
import { CloseIcon } from "@/ui/icons";

import styles from "@/features/staff/OpenDayForm.module.css";

const messages = defineMessages<{
  legend: Record<string, never>;
  dishHead: Record<string, never>;
  name: { n: number };
  stock: { n: number };
  stockPlaceholder: Record<string, never>;
  price: { n: number };
  pricePlaceholder: Record<string, never>;
  remove: { n: number };
  voucherName: { n: number };
  add: Record<string, never>;
}>({
  legend: {
    id: "staff.openDay.r2.dishes.legend",
    defaultMessage: "Plats disponibles ce jour-là",
    description: "06 § 4.2 — légende du groupe des lignes de plats de « Ouvrir un jour » R2",
  },
  dishHead: {
    id: "staff.openDay.r2.dishes.dishHead",
    defaultMessage: "Plat",
    description: "06 § 4.2 — en-tête visuel (aria-hidden) de la colonne des noms",
  },
  name: {
    id: "staff.openDay.r2.dish.name",
    defaultMessage: "Plat {n} : nom",
    description: "06 § 4.2 — aria-label du nom de la ligne de plat n (numérotée à partir de 1)",
  },
  stock: {
    id: "staff.openDay.r2.dish.stock",
    defaultMessage: "Plat {n} : stock",
    description: "06 § 4.2 — aria-label du stock de la ligne de plat n",
  },
  stockPlaceholder: {
    id: "staff.openDay.r2.dish.stock.placeholder",
    defaultMessage: "10",
    description: "06 § 4.2 — exemple de stock d'une ligne de plat",
  },
  price: {
    id: "staff.openDay.r2.dish.price",
    defaultMessage: "Plat {n} : prix en euros (optionnel)",
    description: "06 § 4.2 — aria-label du prix de la ligne de plat n",
  },
  pricePlaceholder: {
    id: "staff.openDay.r2.dish.price.placeholder",
    defaultMessage: "3,50",
    description: "06 § 4.2 — exemple de prix d'une ligne de plat",
  },
  remove: {
    id: "staff.openDay.r2.dish.remove",
    defaultMessage: "Retirer le plat {n}",
    description: "06 § 4.2 — aria-label du bouton croix de la ligne de plat n",
  },
  voucherName: {
    id: "staff.openDay.r2.dish.voucher.name",
    defaultMessage: "Plat {n} : au prix d'un ticket restaurant",
    description: "06 § 4.2 — aria-label de la case ticket de la ligne de plat n",
  },
  add: {
    id: "staff.openDay.r2.dishes.add",
    defaultMessage: "+ Ajouter un plat",
    description: "06 § 4.2 — bouton qui ajoute une ligne de plat vide",
  },
});

const lineDefaults: DishDraft = newDishLine();

/** The cross took its line away: the focus goes to « + Ajouter un plat » instead of the page. */
function focusAddButton(removed: HTMLElement) {
  removed.closest("fieldset")?.querySelector<HTMLElement>("[data-add-dish]")?.focus();
}

interface LineProps {
  /** Number of the line, from 1 (06 § 4.2). */
  n: number;
  /** Prices already used, as typed (06 § 6.1). */
  suggestions: readonly string[];
  /** The voucher box of the line is ticked: no price in euros (06 § 4.3). */
  voucher: boolean;
  /** The cross: removes the line (06 § 4.2). */
  onRemove: (button: HTMLElement) => void;
}

const lineProps: LineProps = { n: 1, suggestions: [], voucher: false, onRemove: focusAddButton };

/**
 * One dish line (`.draft-item-row`, 06 § 4.2): name, stock, price, the cross, then « Ticket restaurant » on the
 * whole width. Ticking the voucher box empties and disables the price (`syncTicketPrice`, 06 § 4.3).
 */
const DishDraftLine = withFieldGroup({
  defaultValues: lineDefaults,
  props: lineProps,
  render: ({ group, n, suggestions, voucher, onRemove }) => (
    <>
      <group.AppField name="name">
        {(field) => (
          <field.TextField
            hideLabel
            label={intl.formatMessage(messages.name, { n })}
            placeholder={intl.formatMessage(staffCommonMessages.dishNamePlaceholder)}
          />
        )}
      </group.AppField>
      <group.AppField name="stock">
        {(field) => (
          <field.TextField
            hideLabel
            label={intl.formatMessage(messages.stock, { n })}
            placeholder={intl.formatMessage(messages.stockPlaceholder)}
            type="number"
            min={1}
            inputMode="numeric"
          />
        )}
      </group.AppField>
      <group.AppField name="price">
        {(field) => (
          <field.PriceField
            hideLabel
            label={intl.formatMessage(messages.price, { n })}
            placeholder={intl.formatMessage(
              voucher ? staffCommonMessages.dishVoucherPricePlaceholder : messages.pricePlaceholder,
            )}
            suggestions={suggestions}
            disabled={voucher}
          />
        )}
      </group.AppField>
      <IconButton
        className={styles["remove"]}
        aria-label={intl.formatMessage(messages.remove, { n })}
        onClick={(event) => {
          onRemove(event.currentTarget);
        }}
      >
        <CloseIcon />
      </IconButton>
      <group.AppField
        name="voucher"
        listeners={{
          onChange: ({ value }) => {
            if (value) group.setFieldValue("price", "");
          },
        }}
      >
        {(field) => (
          <field.CheckboxField
            label={intl.formatMessage(staffCommonMessages.dishVoucherLabel)}
            aria-label={intl.formatMessage(messages.voucherName, { n })}
          />
        )}
      </group.AppField>
    </>
  ),
});

const draftsDefaults: { dishes: DishLine[] } = { dishes: [newDishLine()] };

const draftsProps: { suggestions: readonly string[] } = { suggestions: [] };

// Set by « + Ajouter un plat », taken by the line it adds: its name field gets the focus.
let focusAddedLine = false;

function focusIfAdded(line: HTMLDivElement | null) {
  if (line === null || !focusAddedLine) return;
  focusAddedLine = false;
  line.querySelector("input")?.focus();
}

/**
 * « Plats disponibles ce jour-là » of « Ouvrir un jour » R2 (06 § 4.2-4.3), bound to the field `dishes`: one line per
 * dish, numbered by its place, then « + Ajouter un plat ». Removing the last line leaves an empty one. Rules:
 * `dishRules` of `OpenDayFormR2`.
 */
export const DishDraftsR2 = withFieldGroup({
  defaultValues: draftsDefaults,
  props: draftsProps,
  render: ({ group, suggestions }) => (
    <fieldset className={styles["dishes"]}>
      <legend className={styles["legend"]}>{intl.formatMessage(messages.legend)}</legend>
      <div className={styles["head"]} aria-hidden="true">
        <span>{intl.formatMessage(messages.dishHead)}</span>
        <span>{intl.formatMessage(staffCommonMessages.dishStockLabel)}</span>
        <span>{intl.formatMessage(staffCommonMessages.dishPriceLabel)}</span>
      </div>
      <group.AppField name="dishes" mode="array">
        {(dishes) => (
          <>
            {/* The lines follow every change of `dishes`, the voucher boxes included. */}
            <group.Subscribe selector={(state) => state.values.dishes}>
              {(lines) =>
                lines.map((line, index) => (
                  <div
                    key={line.key}
                    className={styles["line"]}
                    ref={index === lines.length - 1 ? focusIfAdded : undefined}
                  >
                    <DishDraftLine
                      form={group}
                      fields={`dishes[${index}]`}
                      n={index + 1}
                      suggestions={suggestions}
                      voucher={line.voucher}
                      onRemove={(button) => {
                        if (lines.length === 1) {
                          group.setFieldValue("dishes", [newDishLine()]);
                        } else {
                          dishes.removeValue(index);
                        }
                        focusAddButton(button);
                      }}
                    />
                  </div>
                ))
              }
            </group.Subscribe>
            <Button
              size="small"
              variant="ghost"
              data-add-dish=""
              onClick={() => {
                focusAddedLine = true;
                dishes.pushValue(newDishLine());
              }}
            >
              {intl.formatMessage(messages.add)}
            </Button>
          </>
        )}
      </group.AppField>
    </fieldset>
  ),
});
