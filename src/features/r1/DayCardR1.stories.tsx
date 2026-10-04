import { expect } from "storybook/test";

import { DayDetail } from "@/features/calendar/DayCard";
import { DayCardR1 } from "@/features/r1/DayCardR1";
import { atUrl, clockAt } from "@/test/story-router";

import preview from "../../../.storybook/preview";

// Public R1 card in each state of 09 § 3 (P-03, P-04, P-07, P-08), on the seed of parite.md § 2 served by the fake
// script: Monday 5 October 2026, 9:30 in Paris.

const meta = preview.meta({
  component: DayCardR1,
  render: () => (
    <DayDetail restaurant="r1">
      <DayCardR1 />
    </DayDetail>
  ),
  beforeEach: clockAt(),
  globals: { accent: "r1" },
});

/** P-04: seats available, theme, menu and « Réserver ». */
export const Available = meta.story({
  decorators: [atUrl("/")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("12 / 20 couverts")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Réserver" })).toBeVisible();
  },
});

/** P-04: almost full, « Bientôt complet » next to the gauge (D-02). */
export const AlmostFull = meta.story({
  decorators: [atUrl("/?r1=2026-10-06")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Bientôt complet")).toBeVisible();
  },
});

/** P-03: no service. */
export const NoService = meta.story({
  decorators: [atUrl("/?r1=2026-10-07")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Aucune réservation possible ce jour-là.")).toBeVisible();
  },
});

/** P-07: full, « Complet » and « Complet. » instead of « Réserver » (D-02). */
export const Full = meta.story({
  decorators: [atUrl("/?r1=2026-10-09")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Complet.")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Réserver" })).toBeNull();
  },
});

/**
 * P-08: past day, faded, without button. The texts at `--past-opacity` (05 § 4.2, 08 § 1) fall under the 4.5:1 of
 * 08 § 8: contrast left out of axe for this state only (journal p4b, contradictions).
 */
export const Past = meta.story({
  decorators: [atUrl("/?r1=2026-10-01")],
  parameters: { a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("jeudi 1er octobre 2026")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Réserver" })).toBeNull();
  },
});
