import { expect, userEvent } from "storybook/test";

import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

import preview from "../../../.storybook/preview";

// The send never ends: the story stays busy.
async function neverEnds() {
  await new Promise<never>(() => {
    // Never resolved.
  });
}

function SendDemo({ pendingLabel }: { pendingLabel?: string | undefined }) {
  const form = useAppForm({ defaultValues: {}, onSubmit: neverEnds });
  return (
    <Form form={form}>
      <form.SubmitButton pendingLabel={pendingLabel}>Confirmer la réservation</form.SubmitButton>
    </Form>
  );
}

const meta = preview.meta({ component: SendDemo, globals: { accent: "r1" } });

export const Idle = meta.story();

export const Busy = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Confirmer la réservation" }));
    const button = canvas.getByRole("button", { name: "Envoi en cours…" });
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(button).toHaveFocus();
  },
});

/** Waiting label of a staff form (08 § 4.2). */
export const BusyStaff = meta.story({
  args: { pendingLabel: "Ouverture en cours…" },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Confirmer la réservation" }));
    await expect(canvas.getByRole("button", { name: "Ouverture en cours…" })).toBeVisible();
  },
});
