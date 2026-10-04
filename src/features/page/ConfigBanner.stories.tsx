import { expect } from "storybook/test";

import { ConfigBanner } from "@/features/page/ConfigBanner";

import preview from "../../../.storybook/preview";

const TEXT =
  "Configuration manquante : l'adresse du service de réservation n'est pas renseignée ou n'est pas valide. Prévenez l'établissement.";

const meta = preview.meta({ component: ConfigBanner });

/** G-05: no script URL in the build (D-05). */
export const MissingUrl = meta.story({
  args: { url: "" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(TEXT)).toBeVisible();
  },
});

/** G-05: a URL that is not a deployment URL (a-25). */
export const InvalidUrl = meta.story({
  args: { url: "https://example.com/exec" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(TEXT)).toBeVisible();
  },
});

/** G-05: the placeholder of the old setup (03 § 3). */
export const Placeholder = meta.story({
  args: { url: "https://script.google.com/macros/s/COLLE_ICI/exec" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(TEXT)).toBeVisible();
  },
});
