import { expect } from "storybook/test";

import { PrintTable } from "@/ui/print/PrintTable";
import type { PrintColumn, PrintColumnGroup, PrintRow } from "@/ui/print/PrintTable";

import preview from "../../../.storybook/preview";

// Table of the printed documents (07 § 2.4), inside the accent of R1 (`data-print-accent`, styles/print.css).

const COLUMNS: PrintColumn[] = [
  { key: "name", label: "Nom" },
  { key: "count", label: "Couverts", align: "center" },
  { key: "price", label: "Prix", align: "end" },
  { key: "note", label: "Observation" },
];

const ROWS: PrintRow[] = [
  {
    key: "a",
    cells: [
      "Cyrille Ungerer",
      3,
      "16,00\u00A0€",
      { content: "Table près de la fenêtre", tone: "marked" },
    ],
  },
  { key: "b", cells: ["Jean Petit", { content: "–", tone: "muted" }, "", ""] },
];

const GROUPS: PrintColumnGroup[] = [
  { key: "customer", label: "Client", span: 1 },
  { key: "booking", label: "Réservation", span: 2, center: true },
  { key: "information", label: "Informations", span: 1 },
];

const meta = preview.meta({
  component: PrintTable,
  decorators: [
    (Story) => (
      <div data-print-accent="r1">
        <Story />
      </div>
    ),
  ],
  args: {
    columns: COLUMNS,
    rows: ROWS,
    empty: "Aucune réservation.",
  },
});

export const Plain = meta.story({});

/** Framed cells and group headers (document A, 07 § 3). */
export const Grid = meta.story({
  args: {
    variant: "grid",
    groups: GROUPS,
  },
});

export const Empty = meta.story({
  args: { rows: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Aucune réservation.")).toBeVisible();
  },
});
