import { expect } from "storybook/test";

import { DayCard, DayCardTop, DayNote, TextBlock } from "@/features/calendar/DayCard";
import { CapacityPill } from "@/ui/feedback/CapacityPill";

import preview from "../../../.storybook/preview";

// Frame of a day card (05 § 4) composed by hand. `DayCardR1` and `DayCardR2` fill it from the state: their stories
// show the business states.

const menu = <TextBlock label="Menu du jour" text="Velouté de potimarron, suprême de volaille" />;

const meta = preview.meta({ component: DayCard, globals: { accent: "r1" } });

/** R1 card: the gauge on the right of the date (05 § 5.1). */
export const WithGauge = meta.story({
  args: {
    past: false,
    children: (
      <>
        <DayCardTop iso="2026-10-05">
          <CapacityPill percent={60} state="available">
            12 / 20 couverts
          </CapacityPill>
        </DayCardTop>
        {menu}
      </>
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("lundi 5 octobre 2026")).toHaveAttribute("tabindex", "-1");
    await expect(canvas.getByText("12 / 20 couverts")).toBeVisible();
  },
});

/** R2 card: the date alone on its row (05 § 6.2). */
export const DateOnly = meta.story({
  args: {
    past: false,
    children: (
      <>
        <DayCardTop iso="2026-10-01" />
        <DayNote>Tous les plats sont épuisés.</DayNote>
      </>
    ),
  },
  globals: { accent: "r2" },
});

/** Past day: the card pales, its texts stay readable (05 § 4.2, E-56). */
export const Past = meta.story({
  args: {
    past: true,
    children: (
      <>
        <DayCardTop iso="2026-10-01" />
        {menu}
      </>
    ),
  },
});
