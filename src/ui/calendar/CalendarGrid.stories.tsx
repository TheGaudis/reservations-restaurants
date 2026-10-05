import { expect, userEvent, within } from "storybook/test";

import type { CapacityClass } from "@/domain/capacity";
import type { IsoDate } from "@/domain/types";
import { CalendarDemo } from "@/test/calendar-demo";
import { TODAY } from "@/test/clock";

import preview from "../../../.storybook/preview";

// A column calendar: `CalendarHeader` (‹ period ›, « Semaine | Mois », « Aujourd'hui ») above `CalendarGrid`, wired
// as P4 (b) will wire it (`src/test/calendar-demo.tsx`). Seed of parite.md § 2 around Monday 5 October 2026.
// Testing Library reads a <td> of a grid table as a « cell », without `aria-selected` (browsers, axe and Playwright:
// « gridcell »): the plays below find the selected cell by its attribute.
const STATUSES: Readonly<Record<IsoDate, CapacityClass>> = {
  "2026-10-01": "available",
  "2026-10-05": "available",
  "2026-10-06": "almostFull",
  "2026-10-09": "full",
  "2026-10-13": "available",
};

const meta = preview.meta({
  component: CalendarDemo,
  args: {
    restaurant: "r1" as const,
    today: TODAY,
    statuses: STATUSES,
  },
  globals: { accent: "r1" },
});

/** Week view (P-01): today selected, dots of the service days. */
export const Week = meta.story({
  play: async ({ canvas }) => {
    const grid = canvas.getByRole("grid", { name: "5 – 11 oct. 2026" });
    await expect(within(grid).getAllByRole("cell")).toHaveLength(7);
    await expect(
      within(grid).getByRole("button", { name: "lundi 5 octobre 2026, places disponibles" }),
    ).toHaveAttribute("tabindex", "0");
  },
});

/** Month view (P-02): 42 squares, the days of September and November dimmed. */
export const Month = meta.story({
  args: { search: { r1vue: "mois" } },
  play: async ({ canvas }) => {
    const grid = canvas.getByRole("grid", { name: "Octobre 2026" });
    await expect(within(grid).getAllByRole("cell")).toHaveLength(42);
  },
});

/** The selected day is outside the week shown (after ›): no selected cell, Tab stop on the Monday (05 § 2.6). */
export const SelectedDayOutsidePeriod = meta.story({
  args: { search: { r1: "2026-10-07", r1periode: "2026-10-19" } },
  play: async ({ canvas }) => {
    const grid = canvas.getByRole("grid", { name: "19 – 25 oct. 2026" });
    await expect(grid.querySelectorAll('[aria-selected="true"]')).toHaveLength(0);
    await expect(
      within(grid).getByRole("button", { name: "lundi 19 octobre 2026, aucun service" }),
    ).toHaveAttribute("tabindex", "0");
  },
});

/** A day of the next month selected in the month view, which stays on October (05 § 3.1, REG-10). */
export const SelectedDayOfNextMonth = meta.story({
  args: { search: { r1vue: "mois", r1: "2026-11-01", r1periode: "2026-10-01" } },
  play: async ({ canvas }) => {
    const grid = canvas.getByRole("grid", { name: "Octobre 2026" });
    await expect(grid.querySelector('[aria-selected="true"]')).toHaveTextContent("1");
  },
});

/** The week before today: every day past, faded (05 § 2.5). */
export const PastDays = meta.story({
  args: { search: { r1periode: "2026-09-28" } },
  play: async ({ canvas }) => {
    const grid = canvas.getByRole("grid", { name: "28 sept. – 4 oct. 2026" });
    await expect(
      within(grid).getByRole("button", {
        name: "jeudi 1er octobre 2026, places disponibles, passé",
      }),
    ).toBeVisible();
  },
});

/** R2 after 10:00: today's orders are closed (E-43), magenta accent. */
export const OrdersClosed = meta.story({
  args: { restaurant: "r2" as const, closedDays: [TODAY] },
  globals: { accent: "r2" as const },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", {
        name: "lundi 5 octobre 2026, places disponibles, commandes closes",
      }),
    ).toBeVisible();
  },
});

/** The keys move the selection and the focus, the view follows (05 § 3.2). */
export const Keyboard = meta.story({
  play: async ({ canvas }) => {
    canvas.getByRole("button", { name: "lundi 5 octobre 2026, places disponibles" }).focus();
    await userEvent.keyboard("{ArrowLeft}");
    const selected = canvas
      .getByRole("grid", { name: "28 sept. – 4 oct. 2026" })
      .querySelector('[aria-selected="true"] button');
    await expect(selected).toHaveFocus();
  },
});
