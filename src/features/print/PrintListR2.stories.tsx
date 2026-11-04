import { listR2 } from "@/domain/print";
import { PrintListR2 } from "@/features/print/PrintListR2";
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

// Documents B (07 § 4; 09 I-02) and D (07 § 7; 09 I-04), shown as on paper.

const NO_DISH = listR2(fullState({ r2Days: [seedDayR2()] }), DAY);

const meta = preview.meta({
  component: PrintListR2,
  args: {
    printedAt: TEST_NOW,
    tomorrow: false,
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
export const List = meta.story();

/** « Aucune réservation. » and « Aucun plat. » (07 § 4.2). */
export const NoDish = meta.story({ args: { list: NO_DISH } });

/** I-04: one heading and one table per dish, one voucher per order in the total (E-16). */
export const Tomorrow = meta.story({ args: { tomorrow: true } });

export const TomorrowNoDish = meta.story({ args: { tomorrow: true, list: NO_DISH } });

export const TomorrowNoDay = meta.story({
  args: { tomorrow: true, list: listR2(fullState(), DAY) },
});
