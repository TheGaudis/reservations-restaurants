import { Suspense } from "react";
import { expect, fn } from "storybook/test";

import type { SummaryR1 } from "@/domain/bookings";
import { BookingSummary } from "@/features/booking/BookingSummary";

import preview from "../../../.storybook/preview";

// Booking summary in each state of 09 § 3 (P-06 for R1, P-14 for R2; 04 § 7), the cancellation contact read from
// the fake script (« le secrétariat », parite.md § 2). The card rises in: the play functions check presence.

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
});

/** P-06: R1 booking recorded. */
export const BookedR1 = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Réservation enregistrée")).toBeInTheDocument();
    await expect(
      await canvas.findByText("Pour annuler ou modifier, contactez le secrétariat."),
    ).toBeInTheDocument();
  },
});

/** P-06: the confirmation e-mail did not leave (04 § 7). */
export const EmailFailed = meta.story({
  args: {
    summary: { ...BOOKED_R1, warnings: ["emailFailed"] },
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(
        "L'email de confirmation n'a pas pu être envoyé. Gardez ce récapitulatif.",
      ),
    ).toBeInTheDocument();
  },
});

/** D-16: the booking was already recorded (`_duplicate`). */
export const Duplicate = meta.story({
  args: { summary: { ...BOOKED_R1, duplicate: true } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Réservation déjà enregistrée")).toBeInTheDocument();
  },
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
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Lasagnes")).toBeInTheDocument();
    await expect(canvas.getByText(/^9,00\s€ \+ 1 ticket restaurant$/u)).toBeInTheDocument();
  },
});
