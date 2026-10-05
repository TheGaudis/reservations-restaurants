import { expect } from "storybook/test";

import { DayDetail } from "@/features/calendar/DayCard";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { staffStory } from "@/test/staff-story";
import { atUrl } from "@/test/story-router";

import preview from "../../../.storybook/preview";

// « Ajouter une personne » under an R2 dish in the states of 09 C-23 (06 § 8.3; D-19), on the seed of parite.md § 2:
// today's Lasagnes have 4 portions left (voucher day); the Lasagnes of Tuesday 13 October 8 (no voucher dish).

const meta = preview.meta({
  component: StaffDayCardR2,
  render: () => (
    <DayDetail restaurant="r2">
      <StaffDayCardR2 />
    </DayDetail>
  ),
  beforeEach: staffStory,
  globals: { accent: "r2" },
});

/** C-23 on a voucher day: one portion, « Sur place » alone (D-19, E-36). */
export const VoucherDay = meta.story({
  decorators: [atUrl("/collegue?ajout=r2:r2i-d0-lasagnes")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Portions (4 au maximum)")).toHaveValue("1");
    await expect(canvas.getAllByRole("radio")).toHaveLength(1);
  },
});

/** C-23 on a day without voucher dish: « À emporter » by default. */
export const OtherDay = meta.story({
  decorators: [atUrl("/collegue?r2=2026-10-13&ajout=r2:r2i-d%2B8-lasagnes")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("radio", { name: "À emporter" })).toBeChecked();
    await expect(canvas.getByLabelText("Portions (8 au maximum)")).toHaveValue("1");
  },
});
