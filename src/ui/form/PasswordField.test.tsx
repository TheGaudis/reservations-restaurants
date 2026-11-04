import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { renderWithProviders } from "@/test/render";
import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";

// The staff login field (06 § 1.1): no visible label, a placeholder, a name for assistive technologies.
function LoginForm() {
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

describe("PasswordField", () => {
  it("hides the password, named for assistive technologies only (06 § 1.1)", async () => {
    const { screen } = await renderWithProviders(<LoginForm />);
    const input = screen.getByLabelText("Mot de passe collègue");
    await expect.element(input).toHaveAttribute("type", "password");
    await expect.element(input).toHaveAttribute("autocomplete", "current-password");
    await expect.element(input).toHaveAttribute("placeholder", "Mot de passe");
    await expect.element(screen.getByText("Mot de passe collègue")).toHaveClass("visually-hidden");
  });

  it("shows and hides the text with the eye button, whose name follows (06 § 1.2)", async () => {
    const { screen } = await renderWithProviders(<LoginForm />);
    const input = screen.getByLabelText("Mot de passe collègue");
    await userEvent.type(input, "secret");
    await userEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    await expect.element(input).toHaveAttribute("type", "text");
    await expect.element(input).toHaveValue("secret");
    await userEvent.click(screen.getByRole("button", { name: "Masquer le mot de passe" }));
    await expect.element(input).toHaveAttribute("type", "password");
  });
});
