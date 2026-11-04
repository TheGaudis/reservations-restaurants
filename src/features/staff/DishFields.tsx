import { defineMessage, useIntl } from "react-intl";

import { dishDraftInput, priceInputText, priceSuggestions } from "@/domain/dishes";
import type { DishDraft } from "@/domain/dishes";
import type { DishInput } from "@/domain/types";
import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";
import { useSlowWrite } from "@/features/booking/use-slow-write";
import { dishErrors } from "@/features/staff/dish-rules";
import { FormActions } from "@/features/staff/FormActions";
import { useFullState } from "@/features/staff/use-staff-state";
import {
  dishNamePlaceholder,
  dishStockLabel,
  dishPriceLabel,
  dishVoucherPricePlaceholder,
  dishVoucherLabel,
} from "@/intl/staff-messages";
import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

import styles from "@/features/staff/DishForm.module.css";

const nameLabel = defineMessage({
  id: "staff.dishForm.name.label",
  defaultMessage: "Nom du plat",
  description: "06 § 6.1 — libellé du nom du plat (ajout et modification)",
});

const stockPlaceholder = defineMessage({
  id: "staff.dishForm.stock.placeholder",
  defaultMessage: "Ex. 10",
  description: "06 § 6.1 — placeholder du stock (ajout)",
});

const pricePlaceholder = defineMessage({
  id: "staff.dishForm.price.placeholder",
  defaultMessage: "Ex. 3,50",
  description: "06 § 6.1 — placeholder du prix du plat",
});

/**
 * Price suggestions of the dish price fields (`renderPriceSuggestions`, 08 § 6.4; 06 § 4.2, § 6.1): the prices already
 * used by every R2 dish of the full state, all days together, as typed (« 4,50 »), for the `<datalist>` of `PriceField`.
 */
export function usePriceSuggestions(): string[] {
  return priceSuggestions(useFullState().dishes).map((price) => priceInputText(price));
}

interface DishFieldsProps {
  initial: DishDraft;
  /** Portions already booked of the dish: the stock may not go under (D-19); 0 for a new dish. */
  booked: number;
  /** A new dish has placeholders on its name and stock (06 § 6.1). */
  adding: boolean;
  submitLabel: string;
  pendingLabel: string;
  /** Sends the dish; reports its own failure (toast) and resolves once the answer came. */
  save: (input: DishInput) => Promise<void>;
  cancel: () => void;
  /** Ref callback of the wrapper (focus of the first field). */
  wrapperRef: (element: HTMLElement | null) => void;
  id?: string | undefined;
}

/**
 * Dish form (`itemFormHtml`, 06 § 6.1): name and stock side by side, price with the suggestions (08 § 6.4),
 * « Ticket restaurant » that empties and disables the price (06 § 4.3). Busy button while sending (E-04), « Annuler »
 * disabled meanwhile.
 */
export function DishFields({
  initial,
  booked,
  adding,
  submitLabel,
  pendingLabel,
  save,
  cancel,
  wrapperRef,
  id,
}: DishFieldsProps) {
  const intl = useIntl();
  const suggestions = usePriceSuggestions();
  const slowWrite = useSlowWrite();
  // Every message at once after a submit (06 § 6.1, D-19, D-22), slow-write signal while sending (D-15).
  const form = useAppForm({
    defaultValues: initial,
    validators: {
      onDynamic: ({ value }: { value: DishDraft }) => {
        const fields = dishErrors(value, booked);
        return Object.keys(fields).length === 0 ? undefined : { fields };
      },
    },
    onSubmit: async ({ value }) => {
      slowWrite.start();
      try {
        await save(dishDraftInput(value));
      } finally {
        slowWrite.stop();
      }
    },
  });
  return (
    <div ref={wrapperRef} id={id}>
      <Form form={form} className={styles["form"]}>
        <div className={styles["row"]}>
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label={intl.formatMessage(nameLabel)}
                placeholder={adding ? intl.formatMessage(dishNamePlaceholder) : undefined}
                autoComplete="off"
              />
            )}
          </form.AppField>
          <form.AppField name="stock">
            {(field) => (
              <field.TextField
                label={intl.formatMessage(dishStockLabel)}
                placeholder={adding ? intl.formatMessage(stockPlaceholder) : undefined}
                inputMode="numeric"
                autoComplete="off"
              />
            )}
          </form.AppField>
        </div>
        <form.Subscribe selector={(state) => state.values.voucher}>
          {(voucher) => (
            <form.AppField name="price">
              {(field) => (
                <field.PriceField
                  label={intl.formatMessage(dishPriceLabel)}
                  placeholder={intl.formatMessage(
                    voucher ? dishVoucherPricePlaceholder : pricePlaceholder,
                  )}
                  suggestions={suggestions}
                  disabled={voucher}
                />
              )}
            </form.AppField>
          )}
        </form.Subscribe>
        <form.AppField
          name="voucher"
          listeners={{
            onChange: ({ value }) => {
              if (value) form.setFieldValue("price", "");
            },
          }}
        >
          {(field) => <field.CheckboxField label={intl.formatMessage(dishVoucherLabel)} />}
        </form.AppField>
        <FormActions onCancel={cancel} submitLabel={submitLabel} pendingLabel={pendingLabel} />
        <SlowWriteNotice slow={slowWrite.slow} />
      </Form>
    </div>
  );
}
