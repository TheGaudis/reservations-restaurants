import type { StaffWriteDomain } from "@/mutations/staff/write";

// Writes of the days (02 § 4.7, 06 § 4-5): `addDayR1`, `editDayR1`, `deleteDayR1`, `addDayR2`, `deleteDayR2`, one hook
// each built with `staffWriteOptions` (write.ts). Owned by P5 (b).

/** Domain of these writes in their key `['write', 'days', action]`. */
export const DAYS_DOMAIN: StaffWriteDomain = "days";
