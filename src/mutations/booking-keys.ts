/**
 * Mutation keys of the bookings (PLAN § 3.3). Apart from mutations/bookings.ts, so that the day card can watch a
 * booking in flight without bringing the API client into the initial path (S3).
 */
export const bookingKeys = {
  r1: () => ["write", "booking", "r1"] as const,
  r2: () => ["write", "booking", "r2"] as const,
};

/** Every write, public or staff, goes to the script after the previous one has answered (PLAN § 3.3). */
export const WRITE_SCOPE = { id: "write" };
