import type { StaffWriteDomain } from "@/mutations/staff/write";

// Writes of the settings (02 § 4.7, 06 § 2.2, D-20): one `setConfigField` per changed field, in sequence, in a single
// `write` of `staffWriteOptions` (write.ts); `adoptStaffState` keeps the fields saved before a failure. Owned by P5 (e).

/** Domain of these writes in their key `['write', 'settings', 'save']`. */
export const SETTINGS_DOMAIN: StaffWriteDomain = "settings";
