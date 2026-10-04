import { expect } from "storybook/test";

import { DayDetail } from "@/features/calendar/DayCard";
import { DayCardR2 } from "@/features/r2/DayCardR2";
import { TEST_NOW } from "@/test/clock";
import { atUrl, clockAt } from "@/test/story-router";

import preview from "../../../.storybook/preview";

// Public R2 card in each state of 09 § 3 (P-10 to P-12, P-15 to P-17), on the seed of parite.md § 2 served by the
// fake script: Monday 5 October 2026, 9:30 in Paris.

const CLOSED =
  "Commandes en ligne clôturées à 10h. Venez au restaurant Aristide à partir de 12h pour commander sur place.";

const meta = preview.meta({
  component: DayCardR2,
  render: () => (
    <DayDetail restaurant="r2">
      <DayCardR2 />
    </DayDetail>
  ),
  beforeEach: clockAt(),
  globals: { accent: "r2" },
});

/** P-12: orders open, dishes with their price and gauge, « Réserver ». */
export const Open = meta.story({
  decorators: [atUrl("/")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("4 / 10")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Réserver" })).toBeVisible();
  },
});

/** P-10: no service. */
export const NoService = meta.story({
  decorators: [atUrl("/?r2=2026-10-07")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Aucune réservation possible ce jour-là.")).toBeVisible();
  },
});

/** P-11: a day open without any dish: its texts only. */
export const WithoutDishes = meta.story({
  decorators: [atUrl("/?r2=2026-10-10")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Crêpes à emporter le midi")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Réserver" })).toBeNull();
  },
});

/** P-16: every dish sold out (D-02). */
export const AllSoldOut = meta.story({
  decorators: [atUrl("/?r2=2026-10-11")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Tous les plats sont épuisés.")).toBeVisible();
    await expect(canvas.getAllByText("Épuisé")).toHaveLength(2);
  },
});

/** P-15: today after 10:00 in Paris, the closing note instead of « Réserver ». */
export const ClosedAt10 = meta.story({
  decorators: [atUrl("/")],
  beforeEach: clockAt(TEST_NOW + 60 * 60 * 1000),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(CLOSED)).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Réserver" })).toBeNull();
  },
});

/** P-17: past day, paled without losing contrast (E-56), without button nor note. */
export const Past = meta.story({
  decorators: [atUrl("/?r2=2026-10-01")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("8 / 10")).toBeVisible();
    await expect(canvas.queryByText(CLOSED)).toBeNull();
  },
});
