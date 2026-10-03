import { FormattedMessage } from "react-intl";
import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { renderWithProviders } from "@/test/render";
import { Dialog } from "@/ui/Dialog";
import { NumberField } from "@/ui/NumberField";

it("FormattedMessage (plural) and Base UI Dialog in a real browser", async () => {
  const screen = await renderWithProviders(
    <Dialog
      trigger="Voir le menu"
      title={
        <FormattedMessage
          id="public.r1.remaining"
          defaultMessage="{rem, plural, one {# place restante} other {# places restantes}}"
          description="test"
          values={{ rem: 0 }}
        />
      }
    >
      <p>Contenu</p>
    </Dialog>,
  );
  await screen.getByRole("button", { name: "Voir le menu" }).click();
  const dialog = screen.getByRole("dialog");
  await expect.element(dialog).toBeVisible();
  await expect.element(dialog.getByRole("heading")).toHaveTextContent("0 place restante");
  await userEvent.keyboard("{Escape}");
  await expect.element(dialog).not.toBeInTheDocument();
});

it("NumberField: French labels override Base UI defaults", async () => {
  let value = 2;
  const screen = await renderWithProviders(
    <NumberField
      label="Couverts"
      value={value}
      max={5}
      onChange={(v) => {
        value = v;
      }}
    />,
  );
  await expect.element(screen.getByRole("button", { name: "Augmenter" })).toBeInTheDocument();
  await expect.element(screen.getByRole("button", { name: "Diminuer" })).toBeInTheDocument();
  await expect
    .element(screen.getByRole("textbox", { name: "Couverts" }))
    .toHaveAttribute("aria-roledescription", "champ numérique");
  await screen.getByRole("button", { name: "Augmenter" }).click();
  expect(value).toBe(3);
});
