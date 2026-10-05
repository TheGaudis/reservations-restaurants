import { expect, userEvent } from "storybook/test";

import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

import preview from "../../../.storybook/preview";

interface DemoProps {
  initial: string;
  voucher: boolean;
  suggestions: readonly string[];
}

// Price of the dish form (06 § 6.1); « Ticket restaurant » clears and disables it (06 § 4.3).
function PriceDemo({ initial, voucher, suggestions }: DemoProps) {
  const form = useAppForm({
    defaultValues: { price: initial, voucher },
    validators: {
      onDynamic: ({ value }) =>
        value.price.trim() === "0"
          ? { fields: { price: "Indiquez un prix supérieur à 0, ou laissez le champ vide." } }
          : undefined,
    },
  });
  return (
    <Form form={form}>
      <form.Subscribe selector={(state) => state.values.voucher}>
        {(isVoucher) => (
          <form.AppField name="price">
            {(field) => (
              <field.PriceField
                label="Prix (optionnel)"
                placeholder={isVoucher ? "Ticket" : "Ex. 3,50"}
                suggestions={suggestions}
                disabled={isVoucher}
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
        {(field) => <field.CheckboxField label="Ticket restaurant" />}
      </form.AppField>
      <form.SubmitButton>Enregistrer</form.SubmitButton>
    </Form>
  );
}

const meta = preview.meta({
  component: PriceDemo,
  args: { initial: "", voucher: false, suggestions: [] },
  globals: { accent: "r2" },
});

export const Empty = meta.story();

export const WithSuggestions = meta.story({
  args: { initial: "3,50", suggestions: ["3,50", "4,50", "5"] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox", { name: "Prix (optionnel)" })).toHaveValue("3,50");
  },
});

export const Voucher = meta.story({
  args: { voucher: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Prix (optionnel)" })).toBeDisabled();
  },
});

export const Error = meta.story({
  args: { initial: "0" },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Enregistrer" }));
    await expect(
      canvas.getByRole("textbox", { name: "Prix (optionnel)" }),
    ).toHaveAccessibleDescription("Indiquez un prix supérieur à 0, ou laissez le champ vide.");
  },
});
