import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

import preview from "../../../.storybook/preview";

// « Ticket restaurant » of a dish (06 § 4.3).
function VoucherDemo({ checked }: { checked: boolean }) {
  const form = useAppForm({ defaultValues: { voucher: checked } });
  return (
    <Form form={form}>
      <form.AppField name="voucher">
        {(field) => <field.CheckboxField label="Ticket restaurant" />}
      </form.AppField>
    </Form>
  );
}

const meta = preview.meta({
  component: VoucherDemo,
  args: { checked: false },
  globals: { accent: "r2" },
});

export const Unchecked = meta.story();

export const Checked = meta.story({ args: { checked: true } });
