import { listR1 } from "@/domain/print";
import { PrintListR1 } from "@/features/print/PrintListR1";
import { TEST_NOW } from "@/test/clock";
import { fullState } from "@/test/domain-states";
import { DAY, MARTIN, PETIT, UNGERER, longBookingsR1, seedDayR1 } from "@/test/print-lists";

import preview from "../../../.storybook/preview";

// Documents A (07 § 3; 09 I-01) and C (07 § 6; 09 I-03), shown as on paper; printing itself: e2e/print-pdf.spec.ts.

const SEED = listR1(
  fullState({ r1Days: [seedDayR1()], r1Bookings: [UNGERER, MARTIN, PETIT] }),
  DAY,
);
const NO_DAY = listR1(fullState(), DAY);

const meta = preview.meta({
  component: PrintListR1,
  args: { printedAt: TEST_NOW, tomorrow: false, list: SEED },
});

/** I-01: menu, « Ouvert par », « Places », framed table, total without the detail, signature. */
export const List = meta.story();

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
});

/** Day deleted between the display and the click (PLAN annexe F, a-24). */
export const DayClosed = meta.story({ args: { list: NO_DAY } });

/** I-03: « Ouvert par », « Places », plain table, total without the detail, no signature. */
export const Tomorrow = meta.story({ args: { tomorrow: true } });

export const TomorrowNoDay = meta.story({ args: { tomorrow: true, list: NO_DAY } });
