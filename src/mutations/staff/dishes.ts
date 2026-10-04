import type { StaffWriteDomain } from "@/mutations/staff/write";

// Writes of the dishes (02 § 4.7, 06 § 6): `addItemR2`, `editItemR2`, `deleteItemR2`, one hook each built with
// `staffWriteOptions` (write.ts). Owned by P5 (c).

/** Domain of these writes in their key `['write', 'dishes', action]`. */
export const DISHES_DOMAIN: StaffWriteDomain = "dishes";
