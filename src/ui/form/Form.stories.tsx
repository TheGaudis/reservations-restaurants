import { expect, userEvent } from "storybook/test";

import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

import preview from "../../../.storybook/preview";

interface BookingValues {
  name: string;
  contact: string;
  students: number | null;
  observation: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

// Rules of 04 § 5.2 in one validator, cross-field rule included.
function bookingRules({ value }: { value: BookingValues }) {
  const fields: Partial<Record<keyof BookingValues, string>> = {};
  if (value.name.trim() === "") fields.name = "Indiquez vos nom et prénom.";
  if (value.contact.trim() === "") {
    fields.contact = "Indiquez votre adresse email.";
  } else if (!EMAIL.test(value.contact.trim())) {
    fields.contact = "Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr).";
  }
  if ((value.students ?? 0) <= 0) fields.students = "Indiquez au moins une personne.";
  return Object.keys(fields).length === 0 ? undefined : { fields };
}

// A reduced R1 booking form: the fields of ui/form put together as P4 will.
function BookingDemo() {
  const defaultValues: BookingValues = { name: "", contact: "", students: null, observation: "" };
  const form = useAppForm({ defaultValues, validators: { onDynamic: bookingRules } });
  return (
    <Form form={form} aria-label="Réserver">
      <form.AppField name="name">
        {(field) => (
          <field.TextField
            label="Nom et prénom"
            autoComplete="name"
            placeholder="Ex. Cyrille Ungerer"
          />
        )}
      </form.AppField>
      <form.AppField name="contact">
        {(field) => (
          <field.TextField
            label="Adresse email"
            description="Pour vous envoyer la confirmation."
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="Ex. Ariele.gsell@exemple.fr"
          />
        )}
      </form.AppField>
      <form.AppField name="students">
        {(field) => (
          <field.NumberField
            label="Élèves · 4,95 €"
            decrementLabel="Diminuer : Élèves"
            incrementLabel="Augmenter : Élèves"
          />
        )}
      </form.AppField>
      <form.AppField name="observation">
        {(field) => (
          <field.TextField
            label="Observation (optionnel)"
            placeholder="Ex. table partagée, allergie…"
          />
        )}
      </form.AppField>
      <form.SubmitButton>Confirmer la réservation</form.SubmitButton>
    </Form>
  );
}

const meta = preview.meta({ component: BookingDemo, globals: { accent: "r1" } });

export const Empty = meta.story();

/** Every error at once, focus on the first field in DOM order (04 § 5.4). */
export const Errors = meta.story({
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Adresse email" }), "ariele");
    await userEvent.click(canvas.getByRole("button", { name: "Confirmer la réservation" }));
    await expect(canvas.getByRole("textbox", { name: "Nom et prénom" })).toHaveFocus();
    await expect(
      canvas.getByRole("textbox", { name: "Adresse email" }),
    ).toHaveAccessibleDescription(
      "Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr). Pour vous envoyer la confirmation.",
    );
    await expect(canvas.getByRole("textbox", { name: "Élèves · 4,95 €" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
});
