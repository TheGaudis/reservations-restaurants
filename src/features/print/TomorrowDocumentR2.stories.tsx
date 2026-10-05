import { expect } from "storybook/test";

import { listR2 } from "@/domain/print";
import { TomorrowDocumentR2 } from "@/features/print/TomorrowDocumentR2";
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

// Document D, R2 summary of tomorrow (07 § 7; 09 I-04), shown as on paper.

const meta = preview.meta({
  component: TomorrowDocumentR2,
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

/** I-04: one heading and one table per dish, one voucher per order in the total (E-16). */
export const Tomorrow = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Demain, mardi 6 octobre 2026")).toBeVisible();
    await expect(canvas.getByText(/^4 portions · 4,50\s€ \+ 1 ticket restaurant$/u)).toBeVisible();
  },
});

/** Day open without dish (07 § 7). */
export const NoDish = meta.story({
  args: { list: listR2(fullState({ r2Days: [seedDayR2()] }), DAY) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Aucun plat ouvert.")).toBeVisible();
  },
});

/** No R2 day tomorrow (07 § 7). */
export const NoDay = meta.story({
  args: { list: listR2(fullState(), DAY) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Aucun jour ouvert pour demain.")).toBeVisible();
  },
});
