import { expect } from "storybook/test";

import { LoadErrorBox } from "@/features/page/LoadErrorBox";

import preview from "../../../.storybook/preview";

// G-03 (09 § 2, 03 § 3.1): a failed read, before any data or over the local copy of the last visit. The offline
// text depends on the connection of the browser (tested in LoadErrorBox.test.tsx).

const meta = preview.meta({
  component: LoadErrorBox,
  args: {
    fromCache: false,
    // A read that never settles: the button stays busy after a click.
    onRetry: async () =>
      new Promise<void>(() => {
        // Never resolved.
      }),
  },
});

export const Online = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Le service de réservation ne répond pas.",
    );
  },
});

/** With the suffix of the local copy (G-02 and G-03). */
export const OverLocalCopy = meta.story({
  args: { fromCache: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Le calendrier affiché date de votre dernière visite",
    );
  },
});

/** « Réessayer » busy while the read is in flight (03 § 3.2). */
export const Retrying = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Réessayer" }));
    await expect(canvas.getByRole("button", { name: "Nouvelle tentative…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  },
});
