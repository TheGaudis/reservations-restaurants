import { expect, userEvent } from "storybook/test";

import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

import preview from "../../../.storybook/preview";

const BOTH = [
  { value: "takeaway", label: "À emporter" },
  { value: "dineIn", label: "Sur place" },
] as const;
const DINE_IN_ONLY = [{ value: "dineIn", label: "Sur place" }] as const;

// « Mode de service » of the public R2 form (04 § 5.3).
function ModeDemo({ voucherDay }: { voucherDay: boolean }) {
  const initialMode: "takeaway" | "dineIn" = voucherDay ? "dineIn" : "takeaway";
  const form = useAppForm({ defaultValues: { mode: initialMode } });
  return (
    <Form form={form}>
      <form.AppField name="mode">
        {(field) => (
          <field.SegmentedRadio
            legend="Mode de service"
            hideLegend
            options={voucherDay ? DINE_IN_ONLY : BOTH}
            description={
              voucherDay
                ? "Sur place uniquement ce jour-là : repas au prix d'un ticket restaurant."
                : undefined
            }
          />
        )}
      </form.AppField>
    </Form>
  );
}

const meta = preview.meta({
  component: ModeDemo,
  args: { voucherDay: false },
  globals: { accent: "r2" },
});

export const TwoOptions = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Sur place" }));
    await expect(canvas.getByRole("radio", { name: "Sur place" })).toBeChecked();
  },
});

/** A day with a meal voucher dish: « Sur place » only, with its help (04 § 5.3). */
export const VoucherDay = meta.story({
  args: { voucherDay: true },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("radio")).toHaveLength(1);
  },
});
