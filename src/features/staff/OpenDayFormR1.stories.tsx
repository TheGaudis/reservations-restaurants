import { expect, screen, userEvent, waitFor } from "storybook/test";

import { OpenDayFormR1 } from "@/features/staff/OpenDayFormR1";
import { staffStory } from "@/test/staff-story";
import { atUrl } from "@/test/story-router";

import preview from "../../../.storybook/preview";

// « Ouvrir un jour » of R1 in the states of 09 C-04 and C-05 (06 § 3, § 4.1; D-19), on the seed of parite.md § 2:
// Monday 5 October 2026 at 9:30 in Paris, R1 open on the 1st, 5th, 6th, 9th and 12th.

const meta = preview.meta({
  component: OpenDayFormR1,
  beforeEach: staffStory,
  globals: { accent: "r1" },
});

/** C-04 closed: the dashed « + Ouvrir un jour ». */
export const Closed = meta.story({
  decorators: [atUrl("/collegue")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "Ouvrir un jour" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  },
});

/** C-04 open on a free day, chosen in the picker (`ouvrirDate`). */
export const Open = meta.story({
  decorators: [atUrl("/collegue?ouvrir=r1&ouvrirDate=2026-10-20")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "Date" })).toHaveTextContent(
      "mardi 20 octobre 2026",
    );
    await expect(canvas.getByLabelText("Nombre de couverts disponibles")).toBeInTheDocument();
  },
});

/** C-05: the picker of the Date field, past days disabled, open days marked. */
export const DatePicker = meta.story({
  decorators: [atUrl("/collegue?ouvrir=r1&ouvrirDate=2026-10-20")],
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Date" }));
    const dialog = await screen.findByRole("dialog", { name: "Choisir la date" });
    await waitFor(async () => {
      await expect(dialog).toBeInTheDocument();
    });
    await expect(
      screen.getByRole("button", { name: "mardi 6 octobre 2026, déjà ouvert" }),
    ).toBeInTheDocument();
  },
});

/** D-19: a day already open, refused with its message; the capacity is missing too. */
export const Errors = meta.story({
  decorators: [atUrl("/collegue?ouvrir=r1&ouvrirDate=2026-10-06")],
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Ouvrir ce jour" }));
    await expect(
      await canvas.findByText("Ce jour est déjà ouvert : utilisez « Modifier ce jour »."),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText("Indiquez un nombre de couverts supérieur à 0."),
    ).toBeInTheDocument();
  },
});
