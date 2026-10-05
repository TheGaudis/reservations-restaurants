import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { renderWithProviders } from "@/test/render";
import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

// The price of the dish form, with the meal voucher box that disables it (06 § 4.3, § 6.1).
function DishPriceForm({ suggestions }: { suggestions?: readonly string[] }) {
  const form = useAppForm({ defaultValues: { price: "", voucher: false } });
  return (
    <Form form={form}>
      <form.Subscribe selector={(state) => state.values.voucher}>
        {(voucher) => (
          <form.AppField name="price">
            {(field) => (
              <field.PriceField
                label="Prix (optionnel)"
                placeholder={voucher ? "Ticket" : "Ex. 3,50"}
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
        {(field) => <field.CheckboxField label="Ticket restaurant" />}
      </form.AppField>
      <form.Subscribe selector={(state) => state.values.price}>
        {(price) => <output>{price}</output>}
      </form.Subscribe>
    </Form>
  );
}

describe("PriceField", () => {
  it("is a text input with a decimal keyboard, which keeps a comma (06 § 6.1)", async () => {
    const { screen } = await renderWithProviders(<DishPriceForm />);
    const input = screen.getByRole("textbox", { name: "Prix (optionnel)" });
    await expect.element(input).toHaveAttribute("type", "text");
    await expect.element(input).toHaveAttribute("inputmode", "decimal");
    await expect.element(input).toHaveAttribute("placeholder", "Ex. 3,50");
    await expect.element(input).not.toHaveAttribute("list");
    await userEvent.type(input, "3,50");
    await expect.element(input).toHaveValue("3,50");
    expect(screen.container.querySelector("output")?.textContent).toBe("3,50");
  });

  it("offers the prices already used in a datalist (06 § 6.1)", async () => {
    const { screen } = await renderWithProviders(<DishPriceForm suggestions={["3,50", "4,50"]} />);
    const input = screen.getByRole("combobox", { name: "Prix (optionnel)" }).element();
    const list = document.querySelector(`#${CSS.escape(input.getAttribute("list") ?? "")}`);
    expect(list?.tagName).toBe("DATALIST");
    expect(
      [...(list?.querySelectorAll("option") ?? [])].map((option) => option.value),
    ).toStrictEqual(["3,50", "4,50"]);
  });

  it("is cleared and disabled by « Ticket restaurant » (06 § 4.3)", async () => {
    const { screen } = await renderWithProviders(<DishPriceForm />);
    const input = screen.getByRole("textbox", { name: "Prix (optionnel)" });
    await userEvent.type(input, "3,50");
    await userEvent.click(screen.getByRole("checkbox", { name: "Ticket restaurant" }));
    await expect.element(input).toBeDisabled();
    await expect.element(input).toHaveValue("");
    await expect.element(input).toHaveAttribute("placeholder", "Ticket");
  });
});
