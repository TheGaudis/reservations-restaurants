import { describe, expect, it } from "vitest";

import {
  changedSettings,
  priceText,
  settingErrors,
  settingsValues,
  SETTING_KEYS,
} from "@/domain/settings";
import type { SettingsValues } from "@/domain/settings";
import type { Settings } from "@/domain/types";

// « Paramètres » (06 § 2.2, D-20, E-37): values shown, rules, fields sent in the order of the panel.

const SETTINGS: Settings = {
  name1: "Restaurant Pédagogique",
  name2: "Aristide",
  desc1: "Table réservée par nombre de couverts, avec le menu du jour.",
  desc2: "Plats à emporter ou sur place, chacun avec son propre stock.",
  cancellationContact: "le secrétariat",
  priceStudent: 4.95,
  priceStaff: 6.1,
  priceExternal: 9.9,
};

const VALUES = settingsValues(SETTINGS);

function edited(changes: Partial<SettingsValues>): SettingsValues {
  return { ...VALUES, ...changes };
}

describe("priceText", () => {
  it.each([
    [4.95, "4.95"],
    [6.1, "6.10"],
    [12, "12.00"],
    [0, "0.00"],
    [4.955, "4.955"],
  ])("%d → %s", (price, expected) => {
    expect(priceText(price)).toBe(expected);
  });
});

describe("settingsValues", () => {
  it("shows the texts as stored and the prices with two decimals", () => {
    expect(VALUES).toStrictEqual({
      name1: "Restaurant Pédagogique",
      name2: "Aristide",
      desc1: SETTINGS.desc1,
      desc2: SETTINGS.desc2,
      cancellationContact: "le secrétariat",
      priceStudent: "4.95",
      priceStaff: "6.10",
      priceExternal: "9.90",
    });
  });

  it("follows the order of the panel (06 § 2.2)", () => {
    expect(Object.keys(VALUES)).toStrictEqual([...SETTING_KEYS]);
  });
});

describe("settingErrors (D-20)", () => {
  it.each<[string, Partial<SettingsValues>, ReturnType<typeof settingErrors>]>([
    ["unchanged values", {}, {}],
    ["emptied name 1", { name1: "" }, { name1: "nameRequired" }],
    ["blank name 2", { name2: "   " }, { name2: "nameRequired" }],
    ["emptied descriptions and contact", { desc1: "", desc2: "", cancellationContact: "" }, {}],
    ["negative price", { priceExternal: "-1" }, { priceExternal: "invalidPrice" }],
    ["price in words", { priceStudent: "cinq" }, { priceStudent: "invalidPrice" }],
    ["blank price", { priceStaff: "" }, { priceStaff: "invalidPrice" }],
    ["three decimals", { priceStaff: "6,105" }, { priceStaff: "invalidPrice" }],
    ["price 0", { priceStudent: "0" }, {}],
    ["decimal comma", { priceStudent: "5,20" }, {}],
    [
      "name and price together (REG-32)",
      { name1: "", priceExternal: "-1" },
      { name1: "nameRequired", priceExternal: "invalidPrice" },
    ],
  ])("%s", (_case, changes, expected) => {
    expect(settingErrors(edited(changes))).toStrictEqual(expected);
  });
});

describe("changedSettings (06 § 2.2, E-37)", () => {
  it.each<[string, Partial<SettingsValues>, ReturnType<typeof changedSettings>]>([
    ["nothing changed", {}, []],
    ["spaces around a text", { name1: "  Restaurant Pédagogique " }, []],
    ["same amount written another way", { priceStudent: "4.950", priceStaff: "6,1" }, []],
    [
      "two fields, in the order of the panel (REG-32)",
      { priceStudent: "5.20", name2: "Le Bistrot" },
      [
        { key: "name2", value: "Le Bistrot" },
        { key: "priceStudent", value: "5.20" },
      ],
    ],
    [
      "decimal comma sent with a dot",
      { priceExternal: "10,50" },
      [{ key: "priceExternal", value: "10.50" }],
    ],
    [
      "trimmed text",
      { cancellationContact: "  la vie scolaire " },
      [{ key: "cancellationContact", value: "la vie scolaire" }],
    ],
    ["emptied description sent empty", { desc2: "" }, [{ key: "desc2", value: "" }]],
  ])("%s", (_case, changes, expected) => {
    expect(changedSettings(edited(changes), SETTINGS)).toStrictEqual(expected);
  });

  it("sends nothing for a description already empty", () => {
    expect(changedSettings(edited({ desc1: "" }), { ...SETTINGS, desc1: "" })).toStrictEqual([]);
  });
});
