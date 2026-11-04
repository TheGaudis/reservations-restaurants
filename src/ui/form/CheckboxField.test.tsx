import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { renderWithProviders } from "@/test/render";
import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

function VoucherForm({ ariaLabel }: { ariaLabel?: string }) {
  const form = useAppForm({ defaultValues: { voucher: false } });
  return (
    <Form form={form}>
      <form.AppField name="voucher">
        {(field) => <field.CheckboxField label="Ticket restaurant" aria-label={ariaLabel} />}
      </form.AppField>
      <form.Subscribe selector={(state) => state.values.voucher}>
        {(voucher) => <output>{String(voucher)}</output>}
      </form.Subscribe>
    </Form>
  );
}

describe("CheckboxField", () => {
  it("toggles the field with a click on the box or on its text (08 § 4.6)", async () => {
    const { screen } = await renderWithProviders(<VoucherForm />);
    const box = screen.getByRole("checkbox", { name: "Ticket restaurant" });
    await expect.element(box).not.toBeChecked();
    await userEvent.click(box);
    await expect.element(box).toBeChecked();
    expect(screen.container.querySelector("output")?.textContent).toBe("true");
    await userEvent.click(screen.getByText("Ticket restaurant"));
    await expect.element(box).not.toBeChecked();
  });

  it("toggles with the space bar", async () => {
    const { screen } = await renderWithProviders(<VoucherForm />);
    await userEvent.tab();
    const box = screen.getByRole("checkbox", { name: "Ticket restaurant" });
    await expect.element(box).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect.element(box).toBeChecked();
  });

  it("takes the name of a dish line instead of its text (06 § 4.2)", async () => {
    const { screen } = await renderWithProviders(
      <VoucherForm ariaLabel="Plat 1 : au prix d'un ticket restaurant" />,
    );
    await expect
      .element(screen.getByRole("checkbox", { name: "Plat 1 : au prix d'un ticket restaurant" }))
      .toBeInTheDocument();
  });

  it("gives a 48 px touch target to the label (08 § 4.6)", async () => {
    const { screen } = await renderWithProviders(<VoucherForm />);
    const label = screen.getByText("Ticket restaurant").element();
    expect(label.getBoundingClientRect().height).toBeGreaterThanOrEqual(48);
  });
});
