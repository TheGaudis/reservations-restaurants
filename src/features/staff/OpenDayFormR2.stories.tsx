import { expect, userEvent } from "storybook/test";

import { OpenDayFormR2 } from "@/features/staff/OpenDayFormR2";
import { staffStory } from "@/test/staff-story";
import { atUrl } from "@/test/story-router";

import preview from "../../../.storybook/preview";

// « Ouvrir un jour » of R2 and its dish lines in the states of 09 C-06 (06 § 4.2-4.3; D-19, D-22), on the seed of
// parite.md § 2: Monday 5 October 2026 at 9:30 in Paris.

const meta = preview.meta({
  component: OpenDayFormR2,
  beforeEach: staffStory,
  globals: { accent: "r2" },
});

/** C-06 open on a free day: one empty line, price suggestions. */
export const Open = meta.story({
  decorators: [atUrl("/collegue?ouvrir=r2&ouvrirDate=2026-10-20")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Plat 1 : nom")).toBeInTheDocument();
    await expect(
      canvas.getByRole("group", { name: "Plats disponibles ce jour-là" }),
    ).toBeInTheDocument();
  },
});

/** C-06: two lines, the first one paid by a meal voucher (price emptied and disabled). */
export const VoucherLine = meta.story({
  decorators: [atUrl("/collegue?ouvrir=r2&ouvrirDate=2026-10-20")],
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByLabelText("Plat 1 : nom"), "Bowl");
    await userEvent.type(canvas.getByLabelText("Plat 1 : stock"), "10");
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Plat 1 : au prix d'un ticket restaurant" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "+ Ajouter un plat" }));
    await expect(canvas.getByLabelText("Plat 1 : prix en euros (optionnel)")).toBeDisabled();
    await expect(canvas.getByLabelText("Plat 2 : nom")).toHaveFocus();
  },
});

/** D-19, D-22: an incomplete line and a price of 0, refused. */
export const Errors = meta.story({
  decorators: [atUrl("/collegue?ouvrir=r2&ouvrirDate=2026-10-20")],
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByLabelText("Plat 1 : nom"), "Lasagnes");
    await userEvent.type(canvas.getByLabelText("Plat 1 : prix en euros (optionnel)"), "0");
    await userEvent.click(canvas.getByRole("button", { name: "Ouvrir ce jour" }));
    await expect(
      await canvas.findByText("Indiquez le nom et le stock de ce plat, ou retirez la ligne."),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText("Indiquez un prix supérieur à 0, ou laissez le champ vide."),
    ).toBeInTheDocument();
  },
});

/** D-19: a day already open in R2, a warning only. */
export const AlreadyOpen = meta.story({
  decorators: [atUrl("/collegue?ouvrir=r2&ouvrirDate=2026-10-06")],
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(
        "Ce jour est déjà ouvert : seuls les plats de nom nouveau seront ajoutés.",
      ),
    ).toBeInTheDocument();
  },
});
