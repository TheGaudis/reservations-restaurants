import { TomorrowPanel } from "@/features/staff/TomorrowPanel";
import { atUrl, clockAt } from "@/test/story-router";
import { staffSession } from "@/test/story-session";

import preview from "../../../.storybook/preview";

// « Demain ({date}) » (06 § 2.1, 07 § 5, D-07; 09 C-01, C-03) on the seed of parite.md § 2: totals row, then the
// blocks per restaurant with their « Imprimer » buttons.

const meta = preview.meta({
  component: TomorrowPanel,
  decorators: [atUrl("/collegue")],
});

/** C-01, C-03: Monday 5 October 2026, 9:30 in Paris; the orphan booking of tomorrow is left out (E-30). */
export const Tomorrow = meta.story({
  beforeEach: () => {
    const restoreClock = clockAt()();
    const closeSession = staffSession();
    return () => {
      closeSession();
      restoreClock();
    };
  },
  play: async ({ canvas }) => {
    await canvas.findByRole("heading", { name: "Demain (mardi 6 octobre 2026)" });
  },
});

/** C-01, C-03, nothing open tomorrow: Tuesday 6 October 2026, singular totals, no block. */
export const NoServiceTomorrow = meta.story({
  beforeEach: () => {
    const restoreClock = clockAt(Date.parse("2026-10-06T07:30:00Z"))();
    const closeSession = staffSession();
    return () => {
      closeSession();
      restoreClock();
    };
  },
  play: async ({ canvas }) => {
    await canvas.findByRole("heading", { name: "Demain (mercredi 7 octobre 2026)" });
  },
});
