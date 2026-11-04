import { defineMessage } from "react-intl";

import type { ServiceMode } from "@/domain/types";
import { dineInLabel, maxPortionsMessage, takeawayLabel } from "@/intl/common-messages";
import { intl } from "@/intl/intl";

// Portions and service mode of an R2 booking, shared by « + Ajouter une personne » (06 § 8.3) and « Modifier » (06 § 7.4).

const quantityRequiredMessage = defineMessage({
  id: "staff.form.quantity.required",
  defaultMessage: "Indiquez une quantité supérieure à 0.",
  description: "06 § 7.4, § 8.3 — portions vides ou nulles",
});

/** Portions: at least 1, at most `max` (06 § 7.4, § 8.3, D-19); the message keyed by the field `portions`. */
export function portionsErrors(portions: number | null, max: number): { portions?: string } {
  const count = portions ?? 0;
  if (count <= 0) return { portions: intl.formatMessage(quantityRequiredMessage) };
  if (count > max) return { portions: intl.formatMessage(maxPortionsMessage, { count: max }) };
  return {};
}

/** « À emporter » (first, the default) and « Sur place »; « Sur place » alone on a voucher day (D-19, E-36). */
export function modeOptions(voucherDay: boolean): Array<{ value: ServiceMode; label: string }> {
  const dineIn = { value: "dineIn" as const, label: intl.formatMessage(dineInLabel) };
  if (voucherDay) return [dineIn];
  return [{ value: "takeaway", label: intl.formatMessage(takeawayLabel) }, dineIn];
}
