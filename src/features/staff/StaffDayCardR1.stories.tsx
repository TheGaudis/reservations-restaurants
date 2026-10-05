import { expect } from "storybook/test";

import { DayDetail } from "@/features/calendar/DayCard";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { atUrl, clockAt } from "@/test/story-router";
import { staffSession } from "@/test/story-session";

import preview from "../../../.storybook/preview";

// Frame of the R1 staff card (05 § 5.1, § 5.3; 09 C-10, C-10b) on the seed of parite.md § 2, before P5 (b), (d1),
// (d2) and P6 (a) fill its slots: Monday 5 October 2026, 9:30 in Paris.

const meta = preview.meta({
  component: StaffDayCardR1,
  render: () => (
    <DayDetail restaurant="r1">
      <StaffDayCardR1 />
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
  globals: { accent: "r1" },
});

/** C-10: open day, gauge, theme, menu, « Ouvert par », never « Réserver ». */
export const OpenDay = meta.story({
  decorators: [atUrl("/collegue")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Ouvert par Mme Martin")).toBeVisible();
    await expect(canvas.getByText("12 / 20 couverts")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Réserver" })).toBeNull();
  },
});

/** C-10b: no service, « Ouvrir un jour » is the way to create the day. */
export const NoService = meta.story({
  decorators: [atUrl("/collegue?r1=2026-10-07")],
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(
        "Aucun jour ouvert. Utilisez le formulaire « Ouvrir un jour » pour en créer un à cette date.",
      ),
    ).toBeVisible();
  },
});
