import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";

import preview from "../../../.storybook/preview";

// Slow-write note under a busy button (D-15).

const meta = preview.meta({
  component: SlowWriteNotice,
  args: { slow: false },
  globals: { accent: "r1" },
});

/** Before 20 s: an empty live region. */
export const Waiting = meta.story();

/** After 20 s (E-10). */
export const Slow = meta.story({
  args: { slow: true },
});
