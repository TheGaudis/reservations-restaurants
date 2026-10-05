import { expect } from "storybook/test";

import { DayDetail } from "@/features/calendar/DayCard";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { atUrl, clockAt } from "@/test/story-router";
import { staffSession } from "@/test/story-session";

import preview from "../../../.storybook/preview";

// « Modifier » of an R1 booking under its row (06 § 7.3; 09 C-11) on the seed of parite.md § 2: Tuesday 6 October
// 2026 has 5 seats left.

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

/** C-11: the booking in the form, maximum = seats left + its own seats, live total. */
export const Open = meta.story({
  decorators: [atUrl("/collegue?r1=2026-10-06&editResa=r1:r1b-d%2B1-ungerer")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("textbox", { name: "Nom" })).toHaveValue(
      "Cyrille Ungerer",
    );
    await expect(
      canvas.getByRole("group", { name: "Nombre de personnes (8 au maximum)" }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Modifier", expanded: true })).toBeVisible();
  },
});

/** C-11, booking made before the prices: empty counters and the help under the legend. */
export const BeforePrices = meta.story({
  decorators: [atUrl("/collegue?r1=2026-10-06&editResa=r1:r1b-d%2B1-petit")],
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(
        "Réservation enregistrée avant les tarifs : indiquez la répartition de ses 4 couverts.",
      ),
    ).toBeInTheDocument();
  },
});
