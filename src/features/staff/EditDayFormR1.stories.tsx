import { expect, userEvent } from "storybook/test";

import { DayDetail } from "@/features/calendar/DayCard";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { staffStory } from "@/test/staff-story";
import { atUrl } from "@/test/story-router";

import preview from "../../../.storybook/preview";

// « Modifier ce jour » at the bottom of the R1 card in the states of 09 C-13 (06 § 5.1; D-19), on the seed of
// parite.md § 2: Tuesday 6 October 2026, capacity 20, 15 seats booked.

const meta = preview.meta({
  component: StaffDayCardR1,
  render: () => (
    <DayDetail restaurant="r1">
      <StaffDayCardR1 />
    </DayDetail>
  ),
  beforeEach: staffStory,
  globals: { accent: "r1" },
});

/** C-13: the form open with the values of the day. */
export const Open = meta.story({
  decorators: [atUrl("/collegue?r1=2026-10-06&editJour=r1")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Nombre de couverts disponibles")).toHaveValue(20);
    await expect(canvas.getByRole("button", { name: "Modifier ce jour" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  },
});

/** D-19: a capacity under the 15 seats booked, refused with the message of the script. */
export const BelowBooked = meta.story({
  decorators: [atUrl("/collegue?r1=2026-10-06&editJour=r1")],
  play: async ({ canvas }) => {
    const capacity = await canvas.findByLabelText("Nombre de couverts disponibles");
    await userEvent.clear(capacity);
    await userEvent.type(capacity, "14");
    await userEvent.click(canvas.getByRole("button", { name: "Enregistrer" }));
    await expect(
      await canvas.findByText(
        "Impossible : 15 couvert(s) déjà réservé(s) pour ce jour, la capacité ne peut pas être inférieure.",
      ),
    ).toBeInTheDocument();
  },
});
