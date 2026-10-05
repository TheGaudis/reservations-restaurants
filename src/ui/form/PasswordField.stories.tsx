import { expect, userEvent } from "storybook/test";

import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

import preview from "../../../.storybook/preview";

// The staff login field (06 § 1.1).
function LoginDemo() {
  const form = useAppForm({ defaultValues: { password: "" } });
  return (
    <Form form={form}>
      <form.AppField name="password">
        {(field) => (
          <field.PasswordField label="Mot de passe collègue" hideLabel placeholder="Mot de passe" />
        )}
      </form.AppField>
    </Form>
  );
}

const meta = preview.meta({ component: LoginDemo });

export const Hidden = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Mot de passe collègue")).toHaveAttribute(
      "type",
      "password",
    );
  },
});

export const Shown = meta.story({
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText("Mot de passe collègue"), "secret");
    await userEvent.click(canvas.getByRole("button", { name: "Afficher le mot de passe" }));
    await expect(canvas.getByLabelText("Mot de passe collègue")).toHaveAttribute("type", "text");
    await expect(canvas.getByRole("button", { name: "Masquer le mot de passe" })).toBeVisible();
  },
});
