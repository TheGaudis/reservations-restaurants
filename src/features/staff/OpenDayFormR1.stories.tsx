import { screen, userEvent } from "storybook/test";

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
    await canvas.findByRole("button", { name: "Ouvrir un jour" });
  },
});

/** C-04 open on a free day, chosen in the picker (`ouvrirDate`). */
export const Open = meta.story({
  decorators: [atUrl("/collegue?ouvrir=r1&ouvrirDate=2026-10-20")],
  play: async ({ canvas }) => {
    await canvas.findByLabelText("Nombre de couverts disponibles");
  },
});

/** C-05: the picker of the Date field, past days disabled, open days marked. */
export const DatePicker = meta.story({
  decorators: [atUrl("/collegue?ouvrir=r1&ouvrirDate=2026-10-20")],
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Date" }));
    await screen.findByRole("dialog", { name: "Choisir la date" });
  },
});

/** D-19: a day already open, refused with its message; the capacity is missing too. */
export const Errors = meta.story({
  decorators: [atUrl("/collegue?ouvrir=r1&ouvrirDate=2026-10-06")],
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Ouvrir ce jour" }));
    await canvas.findByText("Ce jour est déjà ouvert : utilisez « Modifier ce jour ».");
  },
});
