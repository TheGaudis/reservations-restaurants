import { defineMessages, useIntl } from "react-intl";

import type { DishInput } from "@/domain/types";
import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";
import { useSlowWrite } from "@/features/booking/use-slow-write";
import { DayActions } from "@/features/calendar/DayCard";
import { dishErrors, dishInput } from "@/features/staff/dish-rules";
import type { DishValues } from "@/features/staff/dish-rules";
import { usePriceSuggestions } from "@/features/staff/price-suggestions";
import { commonMessages } from "@/intl/common-messages";
import { Button } from "@/ui/button/Button";
import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

import styles from "@/features/staff/DishForm.module.css";

const messages = defineMessages({
  nameLabel: {
    id: "staff.dishForm.name.label",
    defaultMessage: "Nom du plat",
    description: "06 § 6.1 — libellé du nom du plat (ajout et modification)",
  },
  namePlaceholder: {
    id: "staff.dishForm.name.placeholder",
    defaultMessage: "Ex. salade César",
    description: "06 § 6.1 — placeholder du nom du plat (ajout)",
  },
  stockLabel: {
    id: "staff.dishForm.stock.label",
    defaultMessage: "Stock",
    description: "06 § 6.1 — libellé du stock du plat",
  },
  stockPlaceholder: {
    id: "staff.dishForm.stock.placeholder",
    defaultMessage: "Ex. 10",
    description: "06 § 6.1 — placeholder du stock (ajout)",
  },
  priceLabel: {
    id: "staff.dishForm.price.label",
    defaultMessage: "Prix (optionnel)",
    description: "06 § 6.1 — libellé du prix du plat",
  },
  pricePlaceholder: {
    id: "staff.dishForm.price.placeholder",
    defaultMessage: "Ex. 3,50",
    description: "06 § 6.1 — placeholder du prix du plat",
  },
  voucherPlaceholder: {
    id: "staff.dishForm.price.voucherPlaceholder",
    defaultMessage: "Ticket",
    description: "06 § 4.3, § 6.1 — placeholder du prix désactivé d'un plat au ticket restaurant",
  },
  voucherLabel: {
    id: "staff.dishForm.voucher.label",
    defaultMessage: "Ticket restaurant",
    description: "06 § 4.3, § 6.1 — case du plat payé par un ticket restaurant",
  },
});

export interface DishFieldsProps {
  initial: DishValues;
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

/** Form state: every message at once after a submit (06 § 6.1, D-19, D-22), slow-write signal while sending (D-15). */
function useDishForm({
  initial,
  booked,
  save,
}: Pick<DishFieldsProps, "initial" | "booked" | "save">) {
  const slowWrite = useSlowWrite();
  const form = useAppForm({
    defaultValues: initial,
    validators: {
      onDynamic: ({ value }: { value: DishValues }) => {
        const fields = dishErrors(value, booked);
        return Object.keys(fields).length === 0 ? undefined : { fields };
      },
    },
    onSubmit: async ({ value }) => {
      slowWrite.start();
      try {
        await save(dishInput(value));
      } finally {
        slowWrite.stop();
      }
    },
  });
  return { form, slowWrite };
}

/**
 * Dish form (`itemFormHtml`, 06 § 6.1): name and stock side by side, price with the suggestions (08 § 6.4),
 * « Ticket restaurant » that empties and disables the price (06 § 4.3). Busy button while sending (E-04), « Annuler »
 * disabled meanwhile.
 */
export function DishFields(props: DishFieldsProps) {
  const { adding, submitLabel, pendingLabel, cancel, wrapperRef, id } = props;
  const intl = useIntl();
  const suggestions = usePriceSuggestions();
  const { form, slowWrite } = useDishForm(props);
  return (
    <div ref={wrapperRef} id={id}>
      <Form form={form} className={styles["form"]}>
        <div className={styles["row"]}>
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label={intl.formatMessage(messages.nameLabel)}
                placeholder={adding ? intl.formatMessage(messages.namePlaceholder) : undefined}
                autoComplete="off"
              />
            )}
          </form.AppField>
          <form.AppField name="stock">
            {(field) => (
              <field.TextField
                label={intl.formatMessage(messages.stockLabel)}
                placeholder={adding ? intl.formatMessage(messages.stockPlaceholder) : undefined}
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
                  label={intl.formatMessage(messages.priceLabel)}
                  placeholder={intl.formatMessage(
                    voucher ? messages.voucherPlaceholder : messages.pricePlaceholder,
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
          {(field) => <field.CheckboxField label={intl.formatMessage(messages.voucherLabel)} />}
        </form.AppField>
        <DayActions>
          <form.SubmitButton pendingLabel={pendingLabel}>{submitLabel}</form.SubmitButton>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(sending) => (
              <Button variant="ghost" disabled={sending} onClick={cancel}>
                {intl.formatMessage(commonMessages.cancel)}
              </Button>
            )}
          </form.Subscribe>
        </DayActions>
        <SlowWriteNotice slow={slowWrite.slow} timerRef={slowWrite.clearOnUnmount} />
      </Form>
    </div>
  );
}
