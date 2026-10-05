import { expect } from "storybook/test";

import { DayDetail } from "@/features/calendar/DayCard";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { atUrl, clockAt } from "@/test/story-router";
import { staffSession } from "@/test/story-session";

import preview from "../../../.storybook/preview";

// Frame of the R2 staff card (05 § 6.2, § 6.3; 09 C-20, C-10b) on the seed of parite.md § 2, before P5 (c), (d1),
// (d2), (b) and P6 (a) fill its slots: Monday 5 October 2026, 9:30 in Paris.

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

/** C-20: dishes with their gauge, theme, « Ouvert par », no « Réserver ». */
export const OpenDay = meta.story({
  decorators: [atUrl("/collegue")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Ouvert par Mme Martin")).toBeVisible();
    await expect(canvas.getByText("Semaine italienne")).toBeVisible();
    await expect(canvas.getByText(/^Lasagnes/u)).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Réserver" })).toBeNull();
  },
});

/** C-10b: no service. */
export const NoService = meta.story({
  decorators: [atUrl("/collegue?r2=2026-10-07")],
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(
        "Aucun jour ouvert. Utilisez le formulaire « Ouvrir un jour » pour en créer un à cette date.",
      ),
    ).toBeVisible();
  },
});
