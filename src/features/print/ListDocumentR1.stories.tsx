import { expect } from "storybook/test";

import { listR1 } from "@/domain/print";
import { ListDocumentR1 } from "@/features/print/ListDocumentR1";
import { TEST_NOW } from "@/test/clock";
import { fullState } from "@/test/domain-states";
import { DAY, MARTIN, PETIT, UNGERER, longBookingsR1, seedDayR1 } from "@/test/print-lists";

import preview from "../../../.storybook/preview";

// Document A, list of an R1 day (07 § 3; 09 I-01), shown as on paper; printing itself: e2e/print-pdf.spec.ts.

const meta = preview.meta({
  component: ListDocumentR1,
  args: {
    printedAt: TEST_NOW,
    list: listR1(fullState({ r1Days: [seedDayR1()], r1Bookings: [UNGERER, MARTIN, PETIT] }), DAY),
  },
});

/** I-01: menu, « Ouvert par », « Places », framed table, total without the detail, signature. */
export const Bookings = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Restaurant Pédagogique",
    );
    await expect(canvas.getByText(/^15 couverts · 95,20\s€$/u)).toBeVisible();
  },
});

/** Every count filled: the total gives the detail (07 § 3). */
export const DetailedTotal = meta.story({
  args: {
    list: listR1(
      fullState({
        r1Days: [seedDayR1({ theme: "Automne" })],
        r1Bookings: [UNGERER, MARTIN, ...longBookingsR1(2)],
      }),
      DAY,
    ),
  },
});

/** Longer than one A4 landscape page: header repeated, rows never split (07 § 2.4). */
export const LongList = meta.story({
  args: {
    list: listR1(
      fullState({ r1Days: [seedDayR1()], r1Bookings: [UNGERER, ...longBookingsR1(30)] }),
      DAY,
    ),
  },
});

export const NoBookings = meta.story({
  args: { list: listR1(fullState({ r1Days: [seedDayR1({ openedBy: "" })] }), DAY) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Aucune réservation.")).toBeVisible();
    await expect(canvas.getByText("Non renseigné")).toBeVisible();
  },
});

/** Day deleted between the display and the click (PLAN annexe F, a-24). */
export const DayClosed = meta.story({
  args: { list: listR1(fullState(), DAY) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Ce jour n'est plus ouvert.")).toBeVisible();
  },
});
