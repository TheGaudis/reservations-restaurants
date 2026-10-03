import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { renderWithProviders } from "@/test/render";
import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

interface CounterFormProps {
  initial: number | null;
  max?: number | undefined;
  rule?: ((students: number) => string | undefined) | undefined;
}

// An R1 counter (04 § 5.2, D-17); the value shown under the form is what the form holds.
function CounterForm({ initial, max, rule }: CounterFormProps) {
  const form = useAppForm({
    defaultValues: { students: initial },
    validators: {
      onDynamic: ({ value }) => {
        const message = rule?.(value.students ?? 0);
        return message === undefined ? undefined : { fields: { students: message } };
      },
    },
  });
  return (
    <Form form={form}>
      <form.AppField name="students">
        {(field) => (
          <field.NumberField
            label="Élèves · 4,95 €"
            decrementLabel="Diminuer : Élèves"
            incrementLabel="Augmenter : Élèves"
            max={max}
          />
        )}
      </form.AppField>
      <form.Subscribe selector={(state) => state.values.students}>
        {(students) => <output>{JSON.stringify(students)}</output>}
      </form.Subscribe>
      <form.SubmitButton>Confirmer la réservation</form.SubmitButton>
    </Form>
  );
}

function held(container: HTMLElement) {
  return container.querySelector("output")?.textContent;
}

describe("NumberField", () => {
  it("is a French text input named by its label, with French − and + buttons (D-17, R-16)", async () => {
    const { screen } = await renderWithProviders(<CounterForm initial={null} />);
    const input = screen.getByRole("textbox", { name: "Élèves · 4,95 €" });
    await expect.element(input).toHaveAttribute("aria-roledescription", "champ numérique");
    await expect
      .element(screen.getByRole("button", { name: "Diminuer : Élèves" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Augmenter : Élèves" }))
      .toBeInTheDocument();
    expect(screen.container.innerHTML).not.toMatch(/Increase|Decrease|Number field/u);
  });

  // E-19: attributes of the visible input, compared with `type="number" min="0" placeholder="0" inputmode="numeric"`.
  it("renders the attributes listed for E-19", async () => {
    const { screen } = await renderWithProviders(<CounterForm initial={null} max={5} />);
    const input = screen.getByRole("textbox", { name: "Élèves · 4,95 €" }).element();
    const attributes = Object.fromEntries(
      ["type", "min", "max", "placeholder", "inputmode", "autocomplete", "spellcheck", "name"].map(
        (name) => [name, input.getAttribute(name)],
      ),
    );
    expect(attributes).toStrictEqual({
      type: "text",
      min: null,
      max: null,
      placeholder: "0",
      inputmode: "numeric",
      autocomplete: "off",
      spellcheck: "false",
      name: null,
    });
    // The bounds and the name go to a hidden number input that the form would submit.
    const hidden = screen.container.querySelector<HTMLInputElement>('input[type="number"]');
    expect([
      hidden?.min,
      hidden?.max,
      hidden?.name,
      hidden?.getAttribute("aria-hidden"),
    ]).toStrictEqual(["0", "5", "students", "true"]);
    expect(input.hasAttribute("required")).toBe(false);
  });

  it("shows a null counter empty and keeps it null (06 § 7.3)", async () => {
    const { screen } = await renderWithProviders(<CounterForm initial={null} />);
    await expect.element(screen.getByRole("textbox", { name: "Élèves · 4,95 €" })).toHaveValue("");
    expect(held(screen.container)).toBe("null");
  });

  it("steps with the buttons: + from empty gives 1, − stops at 0 (D-17)", async () => {
    const { screen } = await renderWithProviders(<CounterForm initial={null} />);
    const input = screen.getByRole("textbox", { name: "Élèves · 4,95 €" });
    const plus = screen.getByRole("button", { name: "Augmenter : Élèves" });
    const minus = screen.getByRole("button", { name: "Diminuer : Élèves" });
    await userEvent.click(plus);
    await expect.element(input).toHaveValue("1");
    await userEvent.click(plus);
    await expect.element(input).toHaveValue("2");
    await userEvent.click(minus);
    await userEvent.click(minus);
    await expect.element(input).toHaveValue("0");
    await expect.element(minus).toHaveAttribute("aria-disabled", "true");
    expect(held(screen.container)).toBe("0");
  });

  it("steps with the arrow keys; the buttons stay out of the tab order", async () => {
    const { screen } = await renderWithProviders(<CounterForm initial={null} />);
    const input = screen.getByRole("textbox", { name: "Élèves · 4,95 €" });
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}{ArrowDown}");
    await expect.element(input).toHaveValue("2");
    await userEvent.tab();
    await expect
      .element(screen.getByRole("button", { name: "Confirmer la réservation" }))
      .toHaveFocus();
  });

  it.each([
    ["2,7", "2", 2],
    ["12", "5", 5],
    ["abc", "", null],
    ["", "", null],
  ])(
    "keeps whole numbers within max: « %s » becomes « %s » once the field is left (E-19)",
    async (typed, shown, value) => {
      const { screen } = await renderWithProviders(<CounterForm initial={2} max={5} />);
      const input = screen.getByRole("textbox", { name: "Élèves · 4,95 €" });
      await userEvent.clear(input);
      if (typed !== "") await userEvent.type(input, typed);
      await userEvent.tab();
      await expect.element(input).toHaveValue(shown);
      expect(held(screen.container)).toBe(JSON.stringify(value));
    },
  );

  it("shows the error of the form under the field and links it (04 § 5.4)", async () => {
    const { screen } = await renderWithProviders(
      <CounterForm
        initial={null}
        rule={(students) => (students > 0 ? undefined : "Indiquez au moins une personne.")}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirmer la réservation" }));
    const input = screen.getByRole("textbox", { name: "Élèves · 4,95 €" });
    await expect.element(input).toHaveAttribute("aria-invalid", "true");
    await expect.element(input).toHaveAccessibleDescription("Indiquez au moins une personne.");
    await expect.element(input).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Augmenter : Élèves" }));
    await expect.element(input).not.toHaveAttribute("aria-invalid");
  });
});
