import { userEvent } from "storybook/test";

import { DayDetail } from "@/features/calendar/DayCard";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { atUrl, clockAt } from "@/test/story-router";
import { staffSession } from "@/test/story-session";

import preview from "../../../.storybook/preview";

// Booking lists of the staff cards (05 § 4.6, § 5.3, § 6.3; 06 § 5.2, § 7.1; 09 C-10, C-14, C-20) on the seed of
// parite.md § 2: Monday 5 October 2026, 9:30 in Paris.

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

/** C-10: the bookings of the day in the order of the sheet, « Modifier » and « Supprimer » on each row. */
export const R1Bookings = meta.story({
  decorators: [atUrl("/collegue?r1=2026-10-06")],
  play: async ({ canvas }) => {
    await canvas.findByText("Léa Martin");
  },
});

/** C-14: « Supprimer » armed by a first click: « Confirmer ? », detail in its name. */
export const DeleteArmed = meta.story({
  decorators: [atUrl("/collegue?r1=2026-10-06")],
  play: async ({ canvas }) => {
    const [first] = await canvas.findAllByRole("button", { name: "Supprimer" });
    if (first !== undefined) await userEvent.click(first);
  },
});

/**
 * C-20: the bookings of each R2 dish under the dish, « Modifier ce plat » and « Supprimer ce plat » for each dish,
 * « + Ajouter un plat à ce jour » under them; the orphan of a deleted dish nowhere.
 */
export const R2Bookings = meta.story({
  render: () => (
    <DayDetail restaurant="r2">
      <StaffDayCardR2 />
    </DayDetail>
  ),
  globals: { accent: "r2" },
  decorators: [atUrl("/collegue?r2=2026-10-06")],
  play: async ({ canvas }) => {
    await canvas.findByText("Noah Bernard");
  },
});

/** A dish without bookings: « Aucune réservation. ». */
export const NoBookings = meta.story({
  render: () => (
    <DayDetail restaurant="r2">
      <StaffDayCardR2 />
    </DayDetail>
  ),
  globals: { accent: "r2" },
  decorators: [atUrl("/collegue?r2=2026-10-13")],
  play: async ({ canvas }) => {
    await canvas.findAllByText("Aucune réservation.");
  },
});
