import { expect } from "storybook/test";

import { DayDetail } from "@/features/calendar/DayCard";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { atUrl, clockAt } from "@/test/story-router";
import { staffSession } from "@/test/story-session";

import preview from "../../../.storybook/preview";

// « Modifier » of an R2 booking line under its row (06 § 7.4; 09 C-24) on the seed of parite.md § 2.

const meta = preview.meta({
  component: StaffDayCardR2,
  render: () => (
    <DayDetail restaurant="r2">
      <StaffDayCardR2 />
    </DayDetail>
  ),
  beforeEach: () => {
    const restoreClock = clockAt()();
    const closeSession = staffSession();
    return () => {
      closeSession();
      restoreClock();
    };
  },
  globals: { accent: "r2" },
});

/** C-24 on a voucher day: « Sur place » alone (D-19). */
export const VoucherDay = meta.story({
  decorators: [atUrl("/collegue?editResa=r2:r2b-d0-ungerer")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("textbox", { name: "Portions" })).toHaveValue("4");
    await expect(canvas.getAllByRole("radio")).toHaveLength(1);
  },
});

/** C-24 on a day without voucher dish: both modes, the booking's chosen. */
export const OtherDay = meta.story({
  decorators: [atUrl("/collegue?r2=2026-10-11&editResa=r2:r2b-d%2B6-bernard")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("radio", { name: "À emporter" })).toBeChecked();
  },
});
