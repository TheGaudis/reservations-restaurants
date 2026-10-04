import { expect, userEvent } from "storybook/test";

import { SettingsPanel } from "@/features/staff/SettingsPanel";
import { atUrl, clockAt } from "@/test/story-router";
import { staffSession } from "@/test/story-session";

import preview from "../../../.storybook/preview";

// « Paramètres » (06 § 2.2; 09 C-02) on the seed of parite.md § 2.

const meta = preview.meta({
  component: SettingsPanel,
  beforeEach: () => {
    const restoreClock = clockAt()();
    const closeSession = staffSession();
    return () => {
      closeSession();
      restoreClock();
    };
  },
});

/** C-02 closed: the title alone, a disclosure button. */
export const Closed = meta.story({
  decorators: [atUrl("/collegue")],
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("button", { name: "Paramètres", expanded: false }),
    ).toBeVisible();
  },
});

/** C-02 open: the eight fields of the full state and « Enregistrer les paramètres ». */
export const Open = meta.story({
  decorators: [atUrl("/collegue?parametres=true")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Nom du restaurant 2")).toHaveValue("Aristide");
    await expect(canvas.getByLabelText("Tarif élève (€)")).toHaveValue(4.95);
    // The body rises in (opacity from 0): present, not yet visible.
    await expect(
      canvas.getByRole("button", { name: "Enregistrer les paramètres" }),
    ).toBeInTheDocument();
  },
});

/** C-02 refused (D-20): emptied name and negative price, messages under their fields. */
export const InvalidValues = meta.story({
  decorators: [atUrl("/collegue?parametres=true")],
  play: async ({ canvas }) => {
    await userEvent.clear(await canvas.findByLabelText("Nom du restaurant 1"));
    await userEvent.clear(canvas.getByLabelText("Tarif extérieur (€)"));
    await userEvent.type(canvas.getByLabelText("Tarif extérieur (€)"), "-1");
    await userEvent.click(canvas.getByRole("button", { name: "Enregistrer les paramètres" }));
    await expect(await canvas.findByText("Indiquez le nom du restaurant.")).toBeInTheDocument();
    await expect(
      canvas.getByText("Indiquez un tarif positif ou nul (ex. 4,95)."),
    ).toBeInTheDocument();
  },
});
