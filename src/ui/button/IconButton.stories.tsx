import { expect } from "storybook/test";

import { IconButton } from "@/ui/button/IconButton";
import { ChevronNextIcon, PrintIcon, VisibilityIcon } from "@/ui/icons";

import preview from "../../../.storybook/preview";

const meta = preview.meta({
  component: IconButton,
  args: { "aria-label": "Afficher le mot de passe", children: <VisibilityIcon /> },
});

export const Standard = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Afficher le mot de passe" })).toBeVisible();
  },
});

/** ‹ › of the calendars, tinted with the column accent (08 § 4.4). */
export const Tonal = meta.story({
  args: { "aria-label": "Semaine suivante", tone: "tonal", children: <ChevronNextIcon /> },
  globals: { accent: "r2" },
});

export const StrokeIcon = meta.story({
  args: { "aria-label": "Imprimer", children: <PrintIcon /> },
});

export const Disabled = meta.story({
  args: { "aria-label": "Semaine précédente", disabled: true, children: <ChevronNextIcon /> },
});
