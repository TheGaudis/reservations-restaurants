/**
 * Mutation keys of the bookings (PLAN § 3.3), read by the booking mutations, the day cards and the clock. Apart from
 * mutations/bookings.ts: the staff writes share `WRITE_SCOPE` without importing the public mutations.
 */
export const bookingKeys = {
  r1: () => ["write", "booking", "r1"] as const,
  r2: () => ["write", "booking", "r2"] as const,
};

/** Every write, public or staff, goes to the script after the previous one has answered (PLAN § 3.3). */
export const WRITE_SCOPE = { id: "write" };
