import { expect, userEvent, within } from "storybook/test";

import { RestaurantCalendar } from "@/features/calendar/RestaurantCalendar";
import { TEST_NOW } from "@/test/clock";
import { atUrl, clockAt } from "@/test/story-router";

import preview from "../../../.storybook/preview";

// Calendar of a column driven by the URL (P-01, P-01b, P-02, P-02b), on the seed of parite.md § 2 served by the fake
// script: Monday 5 October 2026, 9:30 in Paris. Testing Library reads a <td> of a grid table as a « cell ».

const meta = preview.meta({
  component: RestaurantCalendar,
  args: { restaurant: "r1" as const },
  beforeEach: clockAt(),
  globals: { accent: "r1" },
});

/** P-01: week view, today selected; ‹ › move the week. */
export const Week = meta.story({
  decorators: [atUrl("/")],
  play: async ({ canvas }) => {
    const grid = await canvas.findByRole("grid", { name: "5 – 11 oct. 2026" });
    await expect(within(grid).getAllByRole("cell")).toHaveLength(7);
    await userEvent.click(canvas.getByRole("button", { name: "Semaine suivante" }));
    await expect(await canvas.findByRole("grid", { name: "12 – 18 oct. 2026" })).toBeVisible();
  },
});

/** P-02: month view (`?r1vue=mois`), 42 squares. */
export const Month = meta.story({
  decorators: [atUrl("/?r1vue=mois")],
  play: async ({ canvas }) => {
    const grid = await canvas.findByRole("grid", { name: "Octobre 2026" });
    await expect(within(grid).getAllByRole("cell")).toHaveLength(42);
  },
});

/** P-01b after 10:00: today's square says that the R2 orders are closed (E-43). */
export const R2AfterTen = meta.story({
  args: { restaurant: "r2" as const },
  globals: { accent: "r2" },
  decorators: [atUrl("/")],
  beforeEach: clockAt(TEST_NOW + 60 * 60 * 1000),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("button", {
        name: "lundi 5 octobre 2026, places disponibles, commandes closes",
      }),
    ).toBeVisible();
  },
});
