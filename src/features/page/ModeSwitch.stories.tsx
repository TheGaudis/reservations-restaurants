import { expect } from "storybook/test";

import { ModeSwitch } from "@/features/page/ModeSwitch";
import { atUrl } from "@/test/story-router";
import { staffSession } from "@/test/story-session";

import preview from "../../../.storybook/preview";

// « Client / Collègue » of the header in its states (06 § 1.1, 09 L-01, G-08).

const meta = preview.meta({ component: ModeSwitch });

/** Client mode: « Client » pressed, panel closed. */
export const ClientMode = meta.story({
  decorators: [atUrl("/")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "Client" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(canvas.getByRole("button", { name: "Collègue" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  },
});

/** L-01: login panel unfolded (`?connexion=true`): password field, eye, « Valider ». */
export const LoginPanel = meta.story({
  decorators: [atUrl("/?connexion=true")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Mot de passe collègue")).toHaveAttribute(
      "type",
      "password",
    );
    await expect(canvas.getByRole("button", { name: "Afficher le mot de passe" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Valider" })).toBeVisible();
  },
});

/** G-08: staff session open, « Collègue » pressed, no panel. */
export const StaffMode = meta.story({
  decorators: [atUrl("/collegue")],
  beforeEach: staffSession,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "Collègue" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(canvas.queryByLabelText("Mot de passe collègue")).toBeNull();
  },
});
