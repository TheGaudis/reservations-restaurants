import { expect, userEvent } from "storybook/test";

import { DayActions } from "@/features/calendar/DayCard";
import { DeleteDayButton } from "@/features/staff/DeleteDayButton";
import { staffStory } from "@/test/staff-story";
import { atUrl } from "@/test/story-router";

import preview from "../../../.storybook/preview";

// « Supprimer ce jour » in the states of 09 C-14, day variant (06 § 5.2; D-21), on the seed of parite.md § 2: in R1,
// Tuesday 6 October 2026 has 3 bookings.

const meta = preview.meta({
  component: DeleteDayButton,
  args: { restaurant: "r1" as const, iso: "2026-10-06" },
  render: (args) => (
    <DayActions>
      <DeleteDayButton {...args} />
    </DayActions>
  ),
  decorators: [atUrl("/collegue?r1=2026-10-06")],
  beforeEach: staffStory,
  globals: { accent: "r1" },
});

/** At rest. */
export const AtRest = meta.story({
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("button", { name: "Supprimer ce jour" }),
    ).toBeInTheDocument();
  },
});

/** C-14 armed: « Confirmer ? », and the note of D-21 for a day with bookings. */
export const Armed = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Supprimer ce jour" }));
    const detail =
      "Confirmer la suppression du jour et de ses 3 réservations (les personnes ne seront pas prévenues)";
    await expect(canvas.getByRole("button", { name: detail })).toHaveTextContent("Confirmer ?");
    await expect(canvas.getByText(detail)).toBeInTheDocument();
  },
});
