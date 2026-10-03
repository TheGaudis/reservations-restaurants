import { expect } from "storybook/test";

import { Button } from "@/ui/button/Button";
import { PrintIcon } from "@/ui/icons";

import preview from "../../../.storybook/preview";

const meta = preview.meta({ component: Button, args: { children: "Modifier ce jour" } });

export const Neutral = meta.story();

/** One per zone (08 § 8), in the colour of the column. */
export const Primary = meta.story({
  args: { variant: "primary", children: "Réserver" },
  globals: { accent: "r1" },
});

export const PrimaryR2 = meta.story({
  args: { variant: "primary", children: "Réserver" },
  globals: { accent: "r2" },
});

export const Ghost = meta.story({ args: { variant: "ghost", children: "Annuler" } });

export const Danger = meta.story({
  args: { variant: "danger", size: "small", children: "Supprimer" },
});

export const Small = meta.story({ args: { size: "small", children: "Modifier" } });

export const WithIcon = meta.story({
  args: {
    size: "small",
    children: (
      <>
        <PrintIcon />
        Imprimer la liste
      </>
    ),
  },
});

export const Disabled = meta.story({ args: { disabled: true, children: "Annuler" } });

/** Busy with the default label (04 § 6.1). */
export const Busy = meta.story({
  args: { variant: "primary", busy: true, children: "Confirmer la réservation" },
  globals: { accent: "r1" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Envoi en cours…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  },
});

/** Busy with the label of the load error box (03 § 3.2). */
export const BusyRetry = meta.story({
  args: { variant: "primary", busy: true, busyLabel: "Nouvelle tentative…", children: "Réessayer" },
});
