// « Paramètres » of the staff mode (06 § 2.2, D-20): values of the form, rules, and the fields to send. The form
// holds every setting as text; the prices come from number inputs (06 § 2.2), read by `parseAmount`.

import type { SettingInput, SettingKey, Settings } from "@/domain/types";
import { compose, nonNegativeAmount, parseAmount, required } from "@/domain/validation";

/** The eight settings as typed in the form. */
export type SettingsValues = Record<SettingKey, string>;

/** Order of the fields in the panel and of the requests (06 § 2.2, `SETTINGS_FIELDS` of collegue.js). */
export const SETTING_KEYS = [
  "name1",
  "name2",
  "desc1",
  "desc2",
  "cancellationContact",
  "priceStudent",
  "priceStaff",
  "priceExternal",
] as const satisfies readonly SettingKey[];

type PriceKey = "priceStudent" | "priceStaff" | "priceExternal";

function isPriceKey(key: SettingKey): key is PriceKey {
  return key === "priceStudent" || key === "priceStaff" || key === "priceExternal";
}

/** Refusal of a field (D-20); the panel words it (`staff.settings.error.*`, PLAN annexe F). */
export type SettingError = "nameRequired" | "invalidPrice";

const nameRule = required<SettingError>("nameRequired");
// A blank price is refused too: it is no « tarif positif ou nul ».
const priceRule = compose(
  required<SettingError>("invalidPrice"),
  nonNegativeAmount<SettingError>("invalidPrice"),
);

/** A price as its number input holds it: `4.95`, `6.10`; more than two decimals kept as stored. */
export function priceText(price: number): string {
  const cents = price.toFixed(2);
  return Number(cents) === price ? cents : String(price);
}

/** Values of the form for the settings of the full state. */
export function settingsValues(settings: Settings): SettingsValues {
  return {
    name1: settings.name1,
    name2: settings.name2,
    desc1: settings.desc1,
    desc2: settings.desc2,
    cancellationContact: settings.cancellationContact,
    priceStudent: priceText(settings.priceStudent),
    priceStaff: priceText(settings.priceStaff),
    priceExternal: priceText(settings.priceExternal),
  };
}

/**
 * Refused fields (D-20): both names required (the script would put « Restaurant 1 » back for an empty one, b-9),
 * prices a number of at least 0 with two decimals at most. Descriptions and the contact may be emptied.
 */
export function settingErrors(values: SettingsValues): Partial<Record<SettingKey, SettingError>> {
  const errors: Partial<Record<SettingKey, SettingError>> = {};
  for (const key of SETTING_KEYS) {
    const value = { value: values[key] };
    let error: SettingError | undefined;
    if (key === "name1" || key === "name2") error = nameRule(value);
    else if (isPriceKey(key)) error = priceRule(value);
    if (error !== undefined) errors[key] = error;
  }
  return errors;
}

/** Value sent for a field: trimmed; a price always with a dot (« 5,20 » → `5.20`), as the script reads it. */
function sentValue(key: SettingKey, value: string): string {
  const trimmed = value.trim();
  return isPriceKey(key) ? trimmed.replace(",", ".") : trimmed;
}

function isChanged(key: SettingKey, value: string, settings: Settings): boolean {
  if (isPriceKey(key)) return parseAmount(value) !== settings[key];
  return value.trim() !== settings[key].trim();
}

/**
 * Fields that differ from the full state, in the order of the panel, as `setConfigField` sends them (06 § 2.2 (1)).
 * A price counts as changed when its amount differs (`4.950` for 4.95 is no change). An emptied description or
 * contact is sent `""`: the script puts its default text back (E-37). Call it on valid values (`settingErrors`).
 */
export function changedSettings(values: SettingsValues, settings: Settings): SettingInput[] {
  return SETTING_KEYS.filter((key) => isChanged(key, values[key], settings)).map((key) => ({
    key,
    value: sentValue(key, values[key]),
  }));
}
