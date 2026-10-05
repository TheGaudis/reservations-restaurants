import { expect } from "storybook/test";

import { listR1 } from "@/domain/print";
import { TomorrowDocumentR1 } from "@/features/print/TomorrowDocumentR1";
import { TEST_NOW } from "@/test/clock";
import { fullState } from "@/test/domain-states";
import { DAY, MARTIN, PETIT, UNGERER, seedDayR1 } from "@/test/print-lists";

import preview from "../../../.storybook/preview";

// Document C, R1 summary of tomorrow (07 § 6; 09 I-03), shown as on paper.

const meta = preview.meta({
  component: TomorrowDocumentR1,
  args: {
    printedAt: TEST_NOW,
    list: listR1(fullState({ r1Days: [seedDayR1()], r1Bookings: [UNGERER, MARTIN, PETIT] }), DAY),
  },
});

/** I-03: « Ouvert par », « Places », plain table, total without the detail, no signature. */
export const Tomorrow = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Demain, mardi 6 octobre 2026")).toBeVisible();
    await expect(canvas.getByText(/^15 couverts · 95,20\s€$/u)).toBeVisible();
  },
});

export const NoBookings = meta.story({
  args: { list: listR1(fullState({ r1Days: [seedDayR1()] }), DAY) },
});

/** No R1 day tomorrow (07 § 6). */
export const NoDay = meta.story({
  args: { list: listR1(fullState(), DAY) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Aucun jour ouvert pour demain.")).toBeVisible();
  },
});
