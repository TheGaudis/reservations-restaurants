import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { renderWithProviders } from "@/test/render";
import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

interface PendingSend {
  calls: number;
  finish: () => void;
}

// `onSubmit` awaits a send the test finishes, like a mutation awaited by `mutateAsync`.
function pendingSend(): PendingSend & { send: () => Promise<void> } {
  const state: PendingSend & { send: () => Promise<void> } = {
    calls: 0,
    finish: vi.fn(),
    send: async () => {
      state.calls += 1;
      await new Promise<void>((resolve) => {
        state.finish = resolve;
      });
    },
  };
  return state;
}

function SendForm({ send, pendingLabel }: { send: () => Promise<void>; pendingLabel?: string }) {
  const form = useAppForm({ defaultValues: { name: "Cyrille" }, onSubmit: send });
  return (
    <Form form={form}>
      <form.AppField name="name">
        {(field) => <field.TextField label="Nom et prénom" />}
      </form.AppField>
      <form.SubmitButton pendingLabel={pendingLabel}>Confirmer la réservation</form.SubmitButton>
    </Form>
  );
}

describe("SubmitButton", () => {
  it("is busy while the form sends, keeps the focus, then comes back (04 § 6.1)", async () => {
    const pending = pendingSend();
    const { screen } = await renderWithProviders(<SendForm send={pending.send} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmer la réservation" }));
    const busy = screen.getByRole("button", { name: "Envoi en cours…" });
    await expect.element(busy).toHaveAttribute("aria-busy", "true");
    await expect.element(busy).toHaveAttribute("aria-disabled", "true");
    await expect.element(busy).toHaveAttribute("type", "submit");
    await expect.element(busy).toHaveFocus();
    pending.finish();
    const idle = screen.getByRole("button", { name: "Confirmer la réservation" });
    await expect.element(idle).not.toHaveAttribute("aria-busy");
    await expect.element(idle).not.toHaveAttribute("aria-disabled", "true");
  });

  it("sends once: a click, Enter or another submit during the send is ignored (04 § 6.1)", async () => {
    const pending = pendingSend();
    const { screen } = await renderWithProviders(<SendForm send={pending.send} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmer la réservation" }));
    // Playwright waits for an enabled button: `force` clicks the busy one as a hurried user would.
    await userEvent.click(screen.getByRole("button", { name: "Envoi en cours…" }), { force: true });
    await userEvent.type(screen.getByRole("textbox", { name: "Nom et prénom" }), "{Enter}");
    screen.container.querySelector("form")?.requestSubmit();
    // A second `handleSubmit` would reach `onSubmit` after its validation, a few microtasks later.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(pending.calls).toBe(1);
    pending.finish();
  });

  it("takes the waiting label of a staff form (08 § 4.2)", async () => {
    const pending = pendingSend();
    const { screen } = await renderWithProviders(
      <SendForm send={pending.send} pendingLabel="Ouverture en cours…" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirmer la réservation" }));
    await expect
      .element(screen.getByRole("button", { name: "Ouverture en cours…" }))
      .toBeInTheDocument();
    pending.finish();
  });
});
