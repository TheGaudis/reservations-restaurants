import { expect, userEvent } from "storybook/test";

import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

import preview from "../../../.storybook/preview";

interface DemoProps {
  initial: number | null;
  max?: number | undefined;
  hideLabel: boolean;
}

// An R1 counter (04 § 5.2) or, with a hidden label and a max, the quantity of an R2 dish (04 § 5.3).
function CounterDemo({ initial, max, hideLabel }: DemoProps) {
  const form = useAppForm({
    defaultValues: { quantity: initial },
    validators: {
      onDynamic: ({ value }) =>
        (value.quantity ?? 0) > 0
          ? undefined
          : { fields: { quantity: "Indiquez au moins une personne." } },
    },
  });
  return (
    <Form form={form}>
      <form.AppField name="quantity">
        {(field) =>
          hideLabel ? (
            <field.NumberField
              label="Quantité : Bowl"
              hideLabel
              decrementLabel="Retirer une portion : Bowl"
              incrementLabel="Ajouter une portion : Bowl"
              max={max}
            />
          ) : (
            <field.NumberField
              label="Élèves · 4,95 €"
              decrementLabel="Diminuer : Élèves"
              incrementLabel="Augmenter : Élèves"
              max={max}
            />
          )
        }
      </form.AppField>
      <form.SubmitButton>Confirmer la réservation</form.SubmitButton>
    </Form>
  );
}

const meta = preview.meta({
  component: CounterDemo,
  args: { initial: null, hideLabel: false },
  globals: { accent: "r1" },
});

/** Empty counter (null, 06 § 7.3): shows the grey « 0 » placeholder and counts as 0. */
export const Empty = meta.story({
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Élèves · 4,95 €" });
    await expect(input).toHaveValue("");
    await expect(input).toHaveAttribute("aria-roledescription", "champ numérique");
  },
});

export const Filled = meta.story({ args: { initial: 2 } });

/** Quantity of an R2 dish at its remaining stock: + is disabled (D-18). */
export const DishAtMax = meta.story({
  args: { initial: 3, max: 3, hideLabel: true },
  globals: { accent: "r2" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Quantité : Bowl" })).toHaveValue("3");
    await expect(
      canvas.getByRole("button", { name: "Ajouter une portion : Bowl" }),
    ).toHaveAttribute("aria-disabled", "true");
  },
});

export const Error = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Confirmer la réservation" }));
    const input = canvas.getByRole("textbox", { name: "Élèves · 4,95 €" });
    await expect(input).toHaveAccessibleDescription("Indiquez au moins une personne.");
    await expect(input).toHaveFocus();
  },
});
