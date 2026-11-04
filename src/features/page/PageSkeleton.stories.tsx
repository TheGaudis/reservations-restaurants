import { PageSkeleton } from "@/features/page/PageSkeleton";

import preview from "../../../.storybook/preview";

// G-01 (09 § 2, 03 § 3): `<main>` before any data, pending component of the routes.

const meta = preview.meta({ component: PageSkeleton });

/** First visit: default titles, a skeleton in each column, no text about loading. */
export const FirstVisit = meta.story({});

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
});
