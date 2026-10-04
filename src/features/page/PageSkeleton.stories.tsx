import { expect } from "storybook/test";

import { PageSkeleton } from "@/features/page/PageSkeleton";

import preview from "../../../.storybook/preview";

// G-01 (09 § 2, 03 § 3): the page before any data, prerendered in the shell.

const meta = preview.meta({ component: PageSkeleton });

/** First visit: default titles, a skeleton in each column, no text about loading. */
export const FirstVisit = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("main")).toHaveAttribute("aria-busy", "true");
    await expect(canvas.getByRole("heading", { name: "Restaurant Pédagogique" })).toBeVisible();
  },
});

/** Titles stored at the last visit by the old site (`reservations-textes`, 03 § 1.2). */
export const StoredTitles = meta.story({
  beforeEach: () => {
    localStorage.setItem(
      "reservations-textes",
      JSON.stringify({ name1: "Le Gourmet", name2: "Bistrot", desc1: "Menu du jour à table." }),
    );
    return () => {
      localStorage.removeItem("reservations-textes");
    };
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Le Gourmet" })).toBeVisible();
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Réservations des restaurants pédagogiques et Bistrot",
    );
  },
});
