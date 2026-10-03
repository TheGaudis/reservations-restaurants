import { describe, expect, it } from "vitest";

import { addDayR2, addItemR2, editItemR2, SETTINGS_API_KEYS, setConfigField } from "@/api/actions";
import type { SettingKey } from "@/domain/types";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { fakeScriptPerTest } from "@/test/fake-script-server";

// Voucher mark and empty price of the dishes sent by a colleague (02 § 4.7, 01 § 2.5, § 3.5, 06 § 4.3), and the
// script key of each setting (`setConfigField`, 01 § 2.1).

const start = fakeScriptPerTest();

describe("dishes sent by a colleague (06 § 4.2-4.3, § 6.1)", () => {
  it('adds the voucher mark and sends no price as "" (addDayR2)', async () => {
    const fakeScript = start();
    const state = await addDayR2(SEED_PASSWORD, {
      date: "2026-10-20",
      note: "Note",
      theme: "Thème",
      openedBy: "M. Dupont",
      dishes: [
        { name: "Bowl", stock: 10, price: null, voucher: true },
        { name: "Lasagnes", stock: 8, price: 4.5, voucher: false },
        { name: "Salade", stock: 5, price: null, voucher: false },
      ],
    });
    expect(fakeScript.requests[0]?.json).toMatchObject({
      items: [
        { name: "Bowl (ticket restaurant)", stock: 10, price: "" },
        { name: "Lasagnes", stock: 8, price: 4.5 },
        { name: "Salade", stock: 5, price: "" },
      ],
    });
    expect(state.dishes.filter((dish) => dish.date === "2026-10-20")).toMatchObject([
      { name: "Bowl", stock: 10, price: null, voucher: true },
      { name: "Lasagnes", stock: 8, price: 4.5, voucher: false },
      { name: "Salade", stock: 5, price: null, voucher: false },
    ]);
  });

  it.each([
    ["Bowl", true, "Bowl (ticket restaurant)"],
    ["Bowl (ticket restaurant)", true, "Bowl (ticket restaurant)"],
    ["Bowl (ticket restaurant)", false, "Bowl"],
    ["Lasagnes", false, "Lasagnes"],
  ])("sends %j with voucher %j as %j (addItemR2, idempotent)", async (name, voucher, sent) => {
    const fakeScript = start();
    await addItemR2(SEED_PASSWORD, { date: "2026-10-06", name, stock: 5, price: null, voucher });
    expect(fakeScript.requests[0]?.json).toMatchObject({ name: sent, price: "" });
  });

  it("removes the voucher mark of a dish (editItemR2)", async () => {
    const fakeScript = start();
    const state = await editItemR2(SEED_PASSWORD, {
      dishId: "r2i-d+1-bowl",
      name: "Bowl",
      stock: 10,
      price: 3.5,
      voucher: false,
    });
    expect(fakeScript.requests[0]?.json).toMatchObject({ name: "Bowl", price: 3.5 });
    expect(state.dishes.find((dish) => dish.id === "r2i-d+1-bowl")).toMatchObject({
      name: "Bowl",
      price: 3.5,
      voucher: false,
    });
  });
});

describe("setConfigField (02 § 4.7, 01 § 2.1)", () => {
  it.each<[SettingKey, string]>([
    ["name1", "name1"],
    ["name2", "name2"],
    ["desc1", "desc1"],
    ["desc2", "desc2"],
    ["cancellationContact", "contactAnnulation"],
    ["priceStudent", "priceEleve"],
    ["priceStaff", "priceProf"],
    ["priceExternal", "priceExterieur"],
  ])("sends %s under the script key %s", async (key, scriptKey) => {
    expect(SETTINGS_API_KEYS[key]).toBe(scriptKey);
    const fakeScript = start();
    await setConfigField(SEED_PASSWORD, { key, value: "7.5" });
    expect(fakeScript.requests[0]?.json).toStrictEqual({
      action: "setConfigField",
      password: SEED_PASSWORD,
      key: scriptKey,
      value: "7.5",
    });
    expect(fakeScript.db.config[scriptKey]).toBe("7.5");
  });
});
