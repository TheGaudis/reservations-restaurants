import { DayDetail } from "@/features/calendar/DayCard";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { atUrl, clockAt } from "@/test/story-router";
import { staffSession } from "@/test/story-session";

import preview from "../../../.storybook/preview";

// « Modifier » of a booking under its row, R1 (06 § 7.3; 09 C-11) and R2 (06 § 7.4; 09 C-24), on the seed of
// parite.md § 2: Tuesday 6 October 2026 has 5 seats left.

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

const r2 = {
  render: () => (
    <DayDetail restaurant="r2">
      <StaffDayCardR2 />
    </DayDetail>
  ),
  globals: { accent: "r2" },
} as const;

/** C-11: the booking in the form, maximum = seats left + its own seats, live total. */
export const Open = meta.story({
  decorators: [atUrl("/collegue?r1=2026-10-06&editResa=r1:r1b-d%2B1-ungerer")],
  play: async ({ canvas }) => {
    await canvas.findByRole("textbox", { name: "Nom" });
  },
});

/** C-11, booking made before the prices: empty counters and the help under the legend. */
export const BeforePrices = meta.story({
  decorators: [atUrl("/collegue?r1=2026-10-06&editResa=r1:r1b-d%2B1-petit")],
  play: async ({ canvas }) => {
    await canvas.findByText(
      "Réservation enregistrée avant les tarifs : indiquez la répartition de ses 4 couverts.",
    );
  },
});

/** C-24 on a voucher day: « Sur place » alone (D-19). */
export const R2VoucherDay = meta.story({
  ...r2,
  decorators: [atUrl("/collegue?editResa=r2:r2b-d0-ungerer")],
  play: async ({ canvas }) => {
    await canvas.findByRole("textbox", { name: "Portions" });
  },
});

/** C-24 on a day without voucher dish: both modes, the booking's chosen. */
export const R2OtherDay = meta.story({
  ...r2,
  decorators: [atUrl("/collegue?r2=2026-10-11&editResa=r2:r2b-d%2B6-bernard")],
  play: async ({ canvas }) => {
    await canvas.findByRole("radio", { name: "À emporter" });
  },
});
