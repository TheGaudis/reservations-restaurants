import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { renderWithProviders } from "@/test/render";
import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

interface Identity {
  name: string;
  contact: string;
}

// 04 § 5.2: rules in the order of the table, messages copied from the spec.
function identityRules({ value }: { value: Identity }) {
  const fields: Partial<Record<keyof Identity, string>> = {};
  if (value.contact.trim() === "") {
    fields.contact = "Indiquez votre adresse email.";
  } else if (!EMAIL.test(value.contact.trim())) {
    fields.contact = "Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr).";
  }
  if (value.name.trim() === "") {
    fields.name = "Indiquez vos nom et prénom.";
  }
  return Object.keys(fields).length === 0 ? undefined : { fields };
}

function IdentityForm({ onSubmit }: { onSubmit: (value: Identity) => void }) {
  const form = useAppForm({
    defaultValues: { name: "", contact: "" } satisfies Identity,
    validators: { onDynamic: identityRules },
    onSubmit: ({ value }) => {
      onSubmit(value);
    },
  });
  return (
    <Form form={form} aria-label="Réservation">
      <form.AppField name="name">
        {(field) => <field.TextField label="Nom et prénom" autoComplete="name" />}
      </form.AppField>
      <form.AppField name="contact">
        {(field) => (
          <field.TextField
            label="Adresse email"
            description="Pour vous envoyer la confirmation."
            type="email"
            inputMode="email"
          />
        )}
      </form.AppField>
      <form.SubmitButton>Confirmer la réservation</form.SubmitButton>
    </Form>
  );
}

describe("TextField", () => {
  it("ties the label and the help to the input, without native constraints (04 § 5.4, § 10)", async () => {
    const { screen } = await renderWithProviders(<IdentityForm onSubmit={vi.fn()} />);
    const contact = screen.getByRole("textbox", { name: "Adresse email" });
    await expect.element(contact).toHaveAccessibleDescription("Pour vous envoyer la confirmation.");
    await expect.element(contact).not.toHaveAttribute("aria-invalid");
    await expect.element(contact).not.toHaveAttribute("required");
    await expect.element(contact).not.toHaveAttribute("pattern");
    await expect.element(contact).toHaveAttribute("type", "email");
  });

  it("shows nothing before the first submit, even for an invalid value (04 § 5.4)", async () => {
    const { screen } = await renderWithProviders(<IdentityForm onSubmit={vi.fn()} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Adresse email" }), "faux");
    await userEvent.tab();
    expect(screen.container.querySelector('[aria-invalid="true"]')).toBeNull();
  });

  it("marks every field in error on submit, error then help, help hidden (04 § 5.4)", async () => {
    const { screen } = await renderWithProviders(<IdentityForm onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmer la réservation" }));
    const name = screen.getByRole("textbox", { name: "Nom et prénom" });
    const contact = screen.getByRole("textbox", { name: "Adresse email" });
    await expect.element(name).toHaveAttribute("aria-invalid", "true");
    await expect.element(name).toHaveAccessibleDescription("Indiquez vos nom et prénom.");
    await expect.element(contact).toHaveAttribute("aria-invalid", "true");
    const ids = contact.element().getAttribute("aria-describedby")?.split(" ") ?? [];
    const texts = ids.map((id) => document.querySelector(`#${CSS.escape(id)}`)?.textContent);
    // The error starts with its hidden « ! » mark.
    expect(texts).toStrictEqual([
      "!Indiquez votre adresse email.",
      "Pour vous envoyer la confirmation.",
    ]);
    await expect.element(screen.getByText("Pour vous envoyer la confirmation.")).not.toBeVisible();
  });

  it("focuses the first field in error in DOM order, not in rule order (04 § 5.4)", async () => {
    const { screen } = await renderWithProviders(<IdentityForm onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmer la réservation" }));
    await expect.element(screen.getByRole("textbox", { name: "Nom et prénom" })).toHaveFocus();
  });

  it("keeps the message while the value stays invalid, changes it, drops it once valid (E-46)", async () => {
    const { screen } = await renderWithProviders(<IdentityForm onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmer la réservation" }));
    const contact = screen.getByRole("textbox", { name: "Adresse email" });
    await userEvent.type(contact, "ariele");
    await expect
      .element(contact)
      .toHaveAccessibleDescription(
        "Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr). Pour vous envoyer la confirmation.",
      );
    await userEvent.type(contact, "@exemple.fr");
    await expect.element(contact).not.toHaveAttribute("aria-invalid");
    await expect.element(contact).toHaveAccessibleDescription("Pour vous envoyer la confirmation.");
    await expect.element(screen.getByText("Pour vous envoyer la confirmation.")).toBeVisible();
  });

  it("submits with Enter in a field (E-03) and sends the typed values", async () => {
    const sent: Identity[] = [];
    const { screen } = await renderWithProviders(
      <IdentityForm
        onSubmit={(value) => {
          sent.push(value);
        }}
      />,
    );
    await userEvent.type(screen.getByRole("textbox", { name: "Nom et prénom" }), "Cyrille Ungerer");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Adresse email" }),
      "ariele.gsell@exemple.fr{Enter}",
    );
    await expect
      .poll(() => sent)
      .toStrictEqual([{ name: "Cyrille Ungerer", contact: "ariele.gsell@exemple.fr" }]);
  });
});
