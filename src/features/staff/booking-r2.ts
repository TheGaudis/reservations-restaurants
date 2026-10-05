import type { ServiceMode } from "@/domain/types";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";

// Portions and service mode of an R2 booking, shared by « + Ajouter une personne » (06 § 8.3) and « Modifier » (06 § 7.4).

/** Portions: at least 1, at most `max` (06 § 7.4, § 8.3, D-19). */
export function portionsError(portions: number | null, max: number): string | undefined {
  const count = portions ?? 0;
  if (count <= 0) return intl.formatMessage(staffCommonMessages.quantityRequired);
  if (count > max) return intl.formatMessage(commonMessages.maxPortions, { count: max });
  return undefined;
}

/** « À emporter » (first, the default) and « Sur place »; « Sur place » alone on a voucher day (D-19, E-36). */
export function modeOptions(voucherDay: boolean): Array<{ value: ServiceMode; label: string }> {
  const dineIn = { value: "dineIn" as const, label: intl.formatMessage(commonMessages.dineIn) };
  if (voucherDay) return [dineIn];
  return [{ value: "takeaway", label: intl.formatMessage(commonMessages.takeaway) }, dineIn];
}
