import { expect } from "storybook/test";

import { listR2 } from "@/domain/print";
import { ListDocumentR2 } from "@/features/print/ListDocumentR2";
import { TEST_NOW } from "@/test/clock";
import { fullState } from "@/test/domain-states";
import {
  BERNARD_LASAGNES,
  BOWL,
  DAY,
  DURAND_ORPHAN,
  GSELL_BOWL,
  LASAGNES,
  seedDayR2,
} from "@/test/print-lists";

import preview from "../../../.storybook/preview";

// Document B, list of an R2 day (07 § 4; 09 I-02), shown as on paper.

const meta = preview.meta({
  component: ListDocumentR2,
  args: {
    printedAt: TEST_NOW,
    list: listR2(
      fullState({
        r2Days: [seedDayR2()],
        dishes: [LASAGNES, BOWL],
        r2Bookings: [GSELL_BOWL, BERNARD_LASAGNES, DURAND_ORPHAN],
      }),
      DAY,
    ),
  },
});

/** I-02: customers by class then name, the orphan left out, one voucher for the 3-Bowl order (E-16). */
export const Bookings = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Par client (2)" })).toBeVisible();
    await expect(
      canvas.getByText(/^2 clients · 4 portions · 4,50\s€ \+ 1 ticket restaurant$/u),
    ).toBeVisible();
  },
});

/** Theme and note of the day in the informations (07 § 4). */
export const ThemeAndNote = meta.story({
  args: {
    list: listR2(
      fullState({
        r2Days: [seedDayR2({ theme: "Italie", note: "Pâtes fraîches" })],
        dishes: [LASAGNES, BOWL],
        r2Bookings: [GSELL_BOWL, BERNARD_LASAGNES],
      }),
      DAY,
    ),
  },
});

export const NoBookings = meta.story({
  args: { list: listR2(fullState({ r2Days: [seedDayR2()], dishes: [LASAGNES, BOWL] }), DAY) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Aucune réservation.")).toBeVisible();
  },
});

export const NoDish = meta.story({
  args: { list: listR2(fullState({ r2Days: [seedDayR2()] }), DAY) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Aucun plat.")).toBeVisible();
  },
});
