import type { StaffWriteDomain } from "@/mutations/staff/write";

// Staff writes of the bookings (02 § 4.7, 06 § 7): `editBookingR1`, `editBookingR2`, `deleteBookingR1`,
// `deleteBookingR2`, one hook each built with `staffWriteOptions` (write.ts). Owned by P5 (d1). The person added by a
// colleague goes through `useBookR1` / `useOrderR2` of mutations/bookings.ts, without password (06 § 8).

/** Domain of these writes in their key `['write', 'bookings', action]`. */
export const BOOKINGS_DOMAIN: StaffWriteDomain = "bookings";
