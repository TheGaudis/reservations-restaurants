import { CapacityPill } from "@/ui/feedback/CapacityPill";

import preview from "../../../.storybook/preview";

const meta = preview.meta({
  component: CapacityPill,
  args: { percent: 60, state: "available" as const, children: "12 / 20 couverts" },
  globals: { accent: "r1" },
});

export const Available = meta.story();

/** Orange: fewer than half the seats left (01 § 3.3), « Bientôt complet » (D-02). */
export const AlmostFull = meta.story({
  args: { percent: 25, state: "almostFull", children: "5 / 20 couverts" },
});

export const Full = meta.story({
  args: { percent: 0, state: "full", children: "0 / 20 couverts" },
});

/** Dish of a R2 card (05 § 6.3): « Épuisé » (D-02). */
export const SoldOutDish = meta.story({
  args: { percent: 0, state: "full", children: "0 / 10", fullLabel: "Épuisé" },
  globals: { accent: "r2" },
});

/** Capacity lowered under the booked seats (05 PA 9). */
export const Negative = meta.story({
  args: { percent: 0, state: "full", children: "-2 / 10 couverts" },
});
