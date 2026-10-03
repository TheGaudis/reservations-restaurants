import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { renderWithProviders } from "@/test/render";
import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

type ServiceMode = "takeaway" | "dineIn";

const BOTH = [
  { value: "takeaway", label: "À emporter" },
  { value: "dineIn", label: "Sur place" },
] as const;
const DINE_IN_ONLY = [{ value: "dineIn", label: "Sur place" }] as const;

function ModeForm({ voucherDay }: { voucherDay: boolean }) {
  const initialMode: ServiceMode = voucherDay ? "dineIn" : "takeaway";
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
      <form.Subscribe selector={(state) => state.values.mode}>
        {(mode) => <output>{mode}</output>}
      </form.Subscribe>
    </Form>
  );
}

describe("SegmentedRadio", () => {
  it("is a radio group named by its legend, the default checked (04 § 5.3)", async () => {
    const { screen } = await renderWithProviders(<ModeForm voucherDay={false} />);
    await expect
      .element(screen.getByRole("radiogroup", { name: "Mode de service" }))
      .toBeInTheDocument();
    await expect.element(screen.getByRole("radio", { name: "À emporter" })).toBeChecked();
    await expect.element(screen.getByRole("radio", { name: "Sur place" })).not.toBeChecked();
  });

  it("changes the field on a click and with the arrow keys", async () => {
    const { screen } = await renderWithProviders(<ModeForm voucherDay={false} />);
    await userEvent.click(screen.getByRole("radio", { name: "Sur place" }));
    await expect.element(screen.getByRole("radio", { name: "Sur place" })).toBeChecked();
    expect(screen.container.querySelector("output")?.textContent).toBe("dineIn");
    await userEvent.keyboard("{ArrowLeft}");
    await expect.element(screen.getByRole("radio", { name: "À emporter" })).toBeChecked();
    await expect.element(screen.getByRole("radio", { name: "À emporter" })).toHaveFocus();
    expect(screen.container.querySelector("output")?.textContent).toBe("takeaway");
  });

  it("enters and leaves the group with one Tab", async () => {
    const { screen } = await renderWithProviders(<ModeForm voucherDay={false} />);
    await userEvent.tab();
    await expect.element(screen.getByRole("radio", { name: "À emporter" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.container.contains(document.activeElement)).toBe(false);
  });

  it("offers a single full-width option with its help on a voucher day (04 § 5.3)", async () => {
    const { screen } = await renderWithProviders(<ModeForm voucherDay />);
    expect(screen.getByRole("radio").all()).toHaveLength(1);
    const only = screen.getByRole("radio", { name: "Sur place" });
    await expect.element(only).toBeChecked();
    await expect
      .element(screen.getByRole("radiogroup", { name: "Mode de service" }))
      .toHaveAccessibleDescription(
        "Sur place uniquement ce jour-là : repas au prix d'un ticket restaurant.",
      );
    const radius = getComputedStyle(only.element()).borderTopRightRadius;
    expect(radius).toBe("999px");
  });
});
