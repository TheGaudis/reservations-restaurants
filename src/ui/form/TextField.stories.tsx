import { expect, userEvent } from "storybook/test";

import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

import preview from "../../../.storybook/preview";

interface DemoProps {
  initial: string;
  hideLabel: boolean;
}

// « Adresse email » of the public forms (04 § 5.2), required.
function ContactDemo({ initial, hideLabel }: DemoProps) {
  const form = useAppForm({
    defaultValues: { contact: initial },
    validators: {
      onDynamic: ({ value }) =>
        value.contact.trim() === ""
          ? { fields: { contact: "Indiquez votre adresse email." } }
          : undefined,
    },
  });
  return (
    <Form form={form}>
      <form.AppField name="contact">
        {(field) => (
          <field.TextField
            label="Adresse email"
            hideLabel={hideLabel}
            description="Pour vous envoyer la confirmation."
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="Ex. Ariele.gsell@exemple.fr"
          />
        )}
      </form.AppField>
      <form.SubmitButton>Confirmer la réservation</form.SubmitButton>
    </Form>
  );
}

const meta = preview.meta({
  component: ContactDemo,
  args: { initial: "", hideLabel: false },
  globals: { accent: "r1" },
});

export const Empty = meta.story({
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "Adresse email" }),
    ).toHaveAccessibleDescription("Pour vous envoyer la confirmation.");
  },
});

export const Filled = meta.story({ args: { initial: "ariele.gsell@exemple.fr" } });

export const HiddenLabel = meta.story({
  args: { hideLabel: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Adresse email" })).toBeVisible();
  },
});

export const Error = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Confirmer la réservation" }));
    const input = canvas.getByRole("textbox", { name: "Adresse email" });
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription(
      "Indiquez votre adresse email. Pour vous envoyer la confirmation.",
    );
    await expect(input).toHaveFocus();
  },
});
