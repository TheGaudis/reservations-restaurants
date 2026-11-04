import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { renderWithProviders } from "@/test/render";
import { useAppForm, withFieldGroup } from "@/ui/form/app-form";
import { setServerErrors } from "@/ui/form/errors";
import { Form } from "@/ui/form/Form";

interface Person {
  name: string;
  className: string;
}

// A group of fields shared by two forms, like `IdentityFields` (P4).
const PersonFields = withFieldGroup({
  defaultValues: { name: "", className: "" } satisfies Person,
  render: ({ group }) => (
    <>
      <group.AppField name="name">
        {(field) => <field.TextField label="Nom et prénom" />}
      </group.AppField>
      <group.AppField name="className">
        {(field) => <field.TextField label="Classe ou service" />}
      </group.AppField>
    </>
  ),
});

interface BookingValues {
  person: Person;
  students: number | null;
  staffMembers: number | null;
}

// 04 § 5.2: field rules and the cross-field rule « at least one person » in one validator.
function bookingRules({ value }: { value: BookingValues }) {
  const fields: Record<string, string> = {};
  if (value.person.name.trim() === "") fields["person.name"] = "Indiquez vos nom et prénom.";
  if (value.person.className.trim() === "") {
    fields["person.className"] = "Indiquez votre classe ou votre service.";
  }
  // An empty counter counts as 0 (06 § 7.3).
  if ((value.students ?? 0) + (value.staffMembers ?? 0) <= 0) {
    fields["students"] = "Indiquez au moins une personne.";
  }
  return Object.keys(fields).length === 0 ? undefined : { fields };
}

interface BookingFormProps {
  /** Stands for `mutateAsync`: rejects with the message of the script. */
  send: (value: BookingValues) => Promise<void>;
  initialName?: string;
}

function BookingForm({ send, initialName = "" }: BookingFormProps) {
  const defaultValues: BookingValues = {
    person: { name: initialName, className: "" },
    students: null,
    staffMembers: null,
  };
  const form = useAppForm({
    defaultValues,
    validators: { onDynamic: bookingRules },
    onSubmit: async ({ value, formApi }) => {
      try {
        await send(value);
      } catch (error) {
        // a-5: the refusal of the script goes under the row of counters.
        setServerErrors(formApi, { students: error instanceof Error ? error.message : "Erreur" });
      }
    },
  });
  return (
    <Form form={form}>
      <PersonFields form={form} fields="person" />
      <form.AppField name="students">
        {(field) => (
          <field.NumberField
            label="Élèves"
            decrementLabel="Diminuer : Élèves"
            incrementLabel="Augmenter : Élèves"
          />
        )}
      </form.AppField>
      <form.AppField name="staffMembers">
        {(field) => (
          <field.NumberField
            label="Personnels"
            decrementLabel="Diminuer : Personnels"
            incrementLabel="Augmenter : Personnels"
          />
        )}
      </form.AppField>
      <form.SubmitButton>Confirmer la réservation</form.SubmitButton>
    </Form>
  );
}

const resolved = vi.fn<(value: BookingValues) => Promise<void>>().mockResolvedValue();

// New defaultValues with the same key, then with a new key (a form opened on another day).
function Reopen() {
  const [opening, setOpening] = useState({ key: "a", name: "Cyrille" });
  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpening(({ name }) => ({ key: "a", name: name === "Cyrille" ? "Ariele" : "Paul" }))
        }
      >
        Même clé
      </button>
      <button type="button" onClick={() => setOpening({ key: "b", name: "Paul" })}>
        Nouvelle clé
      </button>
      <BookingForm key={opening.key} send={resolved} initialName={opening.name} />
    </>
  );
}

describe("useAppForm", () => {
  it("shows the field errors and the cross-field error on the first submit (R-17, 04 § 5.2)", async () => {
    const { screen } = await renderWithProviders(<BookingForm send={resolved} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmer la réservation" }));
    await expect
      .element(screen.getByRole("textbox", { name: "Nom et prénom" }))
      .toHaveAccessibleDescription("Indiquez vos nom et prénom.");
    await expect
      .element(screen.getByRole("textbox", { name: "Classe ou service" }))
      .toHaveAccessibleDescription("Indiquez votre classe ou votre service.");
    await expect
      .element(screen.getByRole("textbox", { name: "Élèves" }))
      .toHaveAccessibleDescription("Indiquez au moins une personne.");
    await expect.element(screen.getByRole("textbox", { name: "Nom et prénom" })).toHaveFocus();
  });

  it("revalidates a cross-field rule when another field changes (E-46)", async () => {
    const { screen } = await renderWithProviders(<BookingForm send={resolved} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmer la réservation" }));
    const students = screen.getByRole("textbox", { name: "Élèves" });
    await expect.element(students).toHaveAttribute("aria-invalid", "true");
    await userEvent.click(screen.getByRole("button", { name: "Augmenter : Personnels" }));
    await expect.element(students).not.toHaveAttribute("aria-invalid");
  });

  it("shows a refusal of the script under its field, focused, until the next change (a-5)", async () => {
    const refuse = vi
      .fn<(value: BookingValues) => Promise<void>>()
      .mockRejectedValue(new Error("Il ne reste que 2 couvert(s) pour ce jour."));
    const { screen } = await renderWithProviders(
      <BookingForm send={refuse} initialName="Cyrille" />,
    );
    await userEvent.type(screen.getByRole("textbox", { name: "Classe ou service" }), "TS2");
    await userEvent.click(screen.getByRole("button", { name: "Augmenter : Élèves" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmer la réservation" }));
    const students = screen.getByRole("textbox", { name: "Élèves" });
    await expect
      .element(students)
      .toHaveAccessibleDescription("Il ne reste que 2 couvert(s) pour ce jour.");
    await expect.element(students).toHaveFocus();
    // The form keeps what was typed for another try (04 § 6.1).
    await expect
      .element(screen.getByRole("textbox", { name: "Classe ou service" }))
      .toHaveValue("TS2");
    await userEvent.keyboard("{ArrowUp}");
    await expect.element(students).not.toHaveAttribute("aria-invalid");
  });

  it("follows new defaultValues while untouched, keeps what was typed, starts again with a new key (R-17)", async () => {
    const { screen } = await renderWithProviders(<Reopen />);
    const name = screen.getByRole("textbox", { name: "Nom et prénom" });
    await expect.element(name).toHaveValue("Cyrille");
    await userEvent.click(screen.getByRole("button", { name: "Même clé" }));
    await expect.element(name).toHaveValue("Ariele");
    await userEvent.type(name, " Gsell");
    // defaultValues now say « Paul »: the typed value stays.
    await userEvent.click(screen.getByRole("button", { name: "Même clé" }));
    await expect.element(name).toHaveValue("Ariele Gsell");
    await userEvent.click(screen.getByRole("button", { name: "Nouvelle clé" }));
    await expect.element(name).toHaveValue("Paul");
  });
});
