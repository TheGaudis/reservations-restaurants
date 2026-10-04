import { expect } from "storybook/test";

import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";

import preview from "../../../.storybook/preview";

// Slow-write note under a busy button (D-15).

const meta = preview.meta({
  component: SlowWriteNotice,
  args: { slow: false, timerRef: null },
  globals: { accent: "r1" },
});

/** Before 20 s: an empty live region. */
export const Waiting = meta.story({
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("output")).toBeEmptyDOMElement();
  },
});

/** After 20 s (E-10). */
export const Slow = meta.story({
  args: { slow: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(
        "Le service met du temps à répondre. Gardez cette page ouverte : la confirmation s'affichera ici.",
      ),
    ).toBeInTheDocument();
  },
});
