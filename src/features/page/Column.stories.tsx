import { Column } from "@/features/page/Column";
import { ColumnSkeleton } from "@/features/page/ColumnSkeleton";

import preview from "../../../.storybook/preview";

// Column of a restaurant (05 § 1, 08 § 7.3): accent, oblique mark, description.

const meta = preview.meta({ component: Column });

export const RestaurantOne = meta.story({
  args: {
    restaurant: "r1" as const,
    title: "Restaurant Pédagogique",
    description: "Table réservée par nombre de couverts, avec le menu du jour.",
    children: <ColumnSkeleton />,
  },
});

export const RestaurantTwo = meta.story({
  args: {
    restaurant: "r2" as const,
    title: "Aristide",
    description: "Plats à emporter ou sur place, chacun avec son propre stock.",
    children: <ColumnSkeleton />,
  },
});

/** G-03: the skeleton stops after a failed first read. */
export const StillSkeleton = meta.story({
  args: {
    restaurant: "r1" as const,
    title: "Restaurant Pédagogique",
    description: "Table réservée par nombre de couverts, avec le menu du jour.",
    children: <ColumnSkeleton still />,
  },
});
