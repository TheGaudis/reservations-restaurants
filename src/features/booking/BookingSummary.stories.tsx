import { Suspense } from "react";
import { fn } from "storybook/test";

import type { SummaryR1 } from "@/domain/bookings";
import { BookingSummary } from "@/features/booking/BookingSummary";

import preview from "../../../.storybook/preview";

// Booking summary in each state of 09 § 3 (P-06 for R1, P-14 for R2; 04 § 7), the cancellation contact read from
// the fake script (« le secrétariat », parite.md § 2). The summary suspends until the script answers: the play of the
// meta waits for the contact before axe runs.

const BOOKED_R1: SummaryR1 = {
  restaurant: "r1",
  date: "2026-10-05",
  duplicate: false,
  name: "Jean Dupuis",
  className: "TS2",
  counts: { students: 2, staffMembers: 1, externals: 0 },
  seats: 3,
  price: 16,
  warnings: [],
};

const meta = preview.meta({
  component: BookingSummary,
  render: (args) => (
    <Suspense fallback={null}>
      <BookingSummary {...args} />
    </Suspense>
  ),
  args: {
    onClose: fn(),
    summary: BOOKED_R1,
  },
  globals: { accent: "r1" },
  play: async ({ canvas }) => {
    await canvas.findByText(/^Pour annuler ou modifier, contactez/u);
  },
});

/** P-06: R1 booking recorded. */
export const BookedR1 = meta.story();

/** P-06: the confirmation e-mail did not leave (04 § 7). */
export const EmailFailed = meta.story({
  args: {
    summary: { ...BOOKED_R1, warnings: ["emailFailed"] },
  },
});

/** D-16: the booking was already recorded (`_duplicate`). */
export const Duplicate = meta.story({
  args: { summary: { ...BOOKED_R1, duplicate: true } },
});

/** P-14: R2 order, portions adjusted and e-mail failed, both said (E-14). */
export const OrderR2 = meta.story({
  globals: { accent: "r2" },
  args: {
    summary: {
      restaurant: "r2",
      date: "2026-10-05",
      duplicate: false,
      name: "Léa Martin",
      className: "BTS1",
      serviceMode: "dineIn",
      dishes: [
        { name: "Lasagnes", portions: 2 },
        { name: "Bowl", portions: 1 },
      ],
      amounts: { euros: 9, vouchers: 1, gap: false },
      warnings: ["adjusted", "emailFailed"],
    },
  },
});
