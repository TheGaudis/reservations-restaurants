import { useState } from "react";
import { expect, userEvent } from "storybook/test";

import { ViewToggle } from "@/ui/toggle/ViewToggle";

import preview from "../../../.storybook/preview";

type View = "week" | "month";

function CalendarViewDemo({ initial }: { initial: View }) {
  const [view, setView] = useState<View>(initial);
  return (
    <ViewToggle
      aria-label="Affichage du calendrier"
      items={[
        { value: "week", label: "Semaine" },
        { value: "month", label: "Mois" },
      ]}
      value={view}
      onValueChange={setView}
      size="small"
    />
  );
}

const meta = preview.meta({ component: CalendarViewDemo, args: { initial: "week" as const } });

/** Calendar view of a column (05 § 2.2), compact. */
export const Week = meta.story({ globals: { accent: "r1" } });

export const Month = meta.story({ args: { initial: "month" as const }, globals: { accent: "r2" } });

/** The segment just chosen bounces and its check opens (08 § 4.5). */
export const Chosen = meta.story({
  globals: { accent: "r1" },
  play: async ({ canvas }) => {
    const month = canvas.getByRole("button", { name: "Mois" });
    await userEvent.click(month);
    await expect(month).toHaveAttribute("aria-pressed", "true");
  },
});

/** « Mode d'accès » of the header (06 § 1.1): blue, « Collègue » controls the login panel. */
export const AccessMode = meta.story({
  render: () => (
    <ViewToggle
      aria-label="Mode d'accès"
      items={[
        { value: "client", label: "Client" },
        {
          value: "staff",
          label: "Collègue",
          "aria-controls": "staff-login",
          "aria-expanded": false,
        },
      ]}
      value="client"
      onValueChange={() => {
        // Static story.
      }}
    />
  ),
});

/** Full width (`.seg-group.block`). */
export const FullWidth = meta.story({
  render: () => (
    <ViewToggle
      aria-label="Affichage du calendrier"
      items={[
        { value: "week", label: "Semaine" },
        { value: "month", label: "Mois" },
      ]}
      value="week"
      onValueChange={() => {
        // Static story.
      }}
      fullWidth
    />
  ),
});
