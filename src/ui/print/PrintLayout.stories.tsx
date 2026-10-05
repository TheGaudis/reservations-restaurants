import { expect } from "storybook/test";

import logoUrl from "@/features/page/logo.png";
import { TEST_NOW } from "@/test/clock";
import { PrintLayout, PrintNote } from "@/ui/print/PrintLayout";

import preview from "../../../.storybook/preview";

// Common frame of the printed documents (07 § 2.2), shown as on paper.

const meta = preview.meta({
  component: PrintLayout,
  args: {
    accent: "r2" as const,
    logo: logoUrl,
    printedAt: TEST_NOW,
    heading: "Aristide",
    subtitle: "mardi 6 octobre 2026",
    children: <PrintNote>Aucun plat ouvert.</PrintNote>,
  },
});

/** Every block: informations with a wide one, total, signature. */
export const Complete = meta.story({
  args: {
    infos: [
      { key: "theme", label: "Thème", value: "Automne" },
      { key: "note", label: "Note", value: "Desserts maison", wide: true },
      { key: "openedBy", label: "Ouvert par", value: "M. Dupont" },
    ],
    total: { label: "Total du jour", value: "2 clients · 4 portions" },
    signature: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Imprimé le 5 octobre 2026")).toBeVisible();
    await expect(canvas.getByText("Nom du responsable")).toBeVisible();
  },
});

/** Title, date and body only. */
export const Minimal = meta.story({});
