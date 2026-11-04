import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import type { IdentityValues } from "@/domain/bookings";
import { identityErrors } from "@/features/booking/identity-rules";
import type { IdentityVariant } from "@/features/booking/identity-rules";
import { IdentityFields, ObservationField } from "@/features/booking/IdentityFields";
import { renderWithProviders } from "@/test/render";
import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

// Identity fields of the booking forms: public (04 § 5.2-5.4) and person added by a colleague (06 § 8.1).

const EMPTY: IdentityValues = { name: "", contact: "", className: "", observation: "" };

function IdentityDemo({ variant }: { variant: IdentityVariant }) {
  const form = useAppForm({
    defaultValues: EMPTY,
    validators: {
      onDynamic: ({ value }: { value: IdentityValues }) => {
        const fields = identityErrors(value, variant);
        return Object.keys(fields).length === 0 ? undefined : { fields };
      },
    },
  });
  return (
    <Form form={form}>
      <IdentityFields
        form={form}
        fields={{ name: "name", contact: "contact", className: "className" }}
        variant={variant}
      />
      <ObservationField form={form} fields={{ observation: "observation" }} />
      <form.SubmitButton>Confirmer la réservation</form.SubmitButton>
    </Form>
  );
}

const textboxNames = () =>
  [...document.querySelectorAll("input:not([type=hidden])")].map(
    (input) => input.getAttribute("placeholder") ?? "",
  );

describe("IdentityFields, public forms (04 § 5.2)", () => {
  it("renders the fields in the order of 04 § 5.2 with their attributes and help", async () => {
    const { screen } = await renderWithProviders(<IdentityDemo variant="public" />);
    expect(textboxNames()).toStrictEqual([
      "Ex. Cyrille Ungerer",
      "Ex. Ariele.gsell@exemple.fr",
      "Ex. TS2 ou vie scolaire",
      "Ex. table partagée, allergie…",
    ]);
    const name = screen.getByRole("textbox", { name: "Nom et prénom" });
    await expect.element(name).toHaveAttribute("autocomplete", "name");
    const contact = screen.getByRole("textbox", { name: "Adresse email" });
    await expect.element(contact).toHaveAttribute("type", "email");
    await expect.element(contact).toHaveAttribute("autocomplete", "email");
    await expect.element(contact).toHaveAttribute("inputmode", "email");
    await expect.element(contact).toHaveAttribute("spellcheck", "false");
    await expect.element(contact).toHaveAccessibleDescription("Pour vous envoyer la confirmation.");
    await expect.element(screen.getByRole("textbox", { name: "Classe ou service" })).toBeVisible();
    await expect
      .element(screen.getByRole("textbox", { name: "Observation (optionnel)" }))
      .toBeVisible();
  });

  it("shows every message of 04 § 5.2 on submit, focus on the name, help hidden under an error", async () => {
    const { screen } = await renderWithProviders(<IdentityDemo variant="public" />);
    await userEvent.type(screen.getByRole("textbox", { name: "Adresse email" }), "jean");
    await userEvent.click(screen.getByRole("button", { name: "Confirmer la réservation" }));
    const name = screen.getByRole("textbox", { name: "Nom et prénom" });
    await expect.element(name).toHaveAccessibleDescription("Indiquez vos nom et prénom.");
    await expect.element(name).toHaveFocus();
    await expect
      .element(screen.getByRole("textbox", { name: "Adresse email" }))
      .toHaveAccessibleDescription(
        "Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr). Pour vous envoyer la confirmation.",
      );
    await expect
      .element(screen.getByRole("textbox", { name: "Classe ou service" }))
      .toHaveAccessibleDescription("Indiquez votre classe ou votre service.");
    await expect.element(screen.getByText("Pour vous envoyer la confirmation.")).not.toBeVisible();
  });
});

describe("IdentityFields, person added by a colleague (06 § 8.1)", () => {
  it("puts name and class first, then the optional e-mail with its help", async () => {
    const { screen } = await renderWithProviders(<IdentityDemo variant="staffAdd" />);
    expect(textboxNames()).toStrictEqual([
      "Ex. Cyrille Ungerer",
      "Ex. TS2 ou vie scolaire",
      "Ex. Ariele.gsell@exemple.fr",
      "Ex. table partagée, allergie…",
    ]);
    await expect
      .element(screen.getByRole("textbox", { name: "Adresse email (optionnel)" }))
      .toHaveAccessibleDescription("Si elle est indiquée, la confirmation y est envoyée.");
  });

  it("accepts an empty e-mail and words the other rules for a colleague", async () => {
    const { screen } = await renderWithProviders(<IdentityDemo variant="staffAdd" />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmer la réservation" }));
    await expect
      .element(screen.getByRole("textbox", { name: "Nom et prénom" }))
      .toHaveAccessibleDescription("Indiquez le nom.");
    await expect
      .element(screen.getByRole("textbox", { name: "Classe ou service" }))
      .toHaveAccessibleDescription("Indiquez la classe ou le service.");
    await expect
      .element(screen.getByRole("textbox", { name: "Adresse email (optionnel)" }))
      .not.toHaveAttribute("aria-invalid");
  });
});

describe("identityErrors (04 § 5.2, 06 § 8.1)", () => {
  it.each<[IdentityVariant, Partial<IdentityValues>, Record<string, string>]>([
    [
      "public",
      {},
      {
        name: "Indiquez vos nom et prénom.",
        contact: "Indiquez votre adresse email.",
        className: "Indiquez votre classe ou votre service.",
      },
    ],
    [
      "public",
      { name: "  ", contact: "jean@exemple", className: "TS2" },
      {
        name: "Indiquez vos nom et prénom.",
        contact: "Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr).",
      },
    ],
    ["public", { name: "Jean", contact: " jean@exemple.fr ", className: "TS2" }, {}],
    ["staffAdd", {}, { name: "Indiquez le nom.", className: "Indiquez la classe ou le service." }],
    [
      "staffAdd",
      { name: "Jean", contact: "jean", className: "TS2" },
      { contact: "Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr)." },
    ],
  ])("%s %o → %o", (variant, values, expected) => {
    expect(identityErrors({ ...EMPTY, ...values }, variant)).toStrictEqual(expected);
  });
});
