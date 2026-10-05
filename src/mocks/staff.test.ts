import { describe, expect, it } from "vitest";

import type { FakeDb } from "@/mocks/fake-db";
import fullStateExample from "@/mocks/fixtures/full-state.json" with { type: "json" };
import { createSeed } from "@/mocks/fixtures/seed";
import {
  fakeScriptPerTest,
  getState,
  postAction,
  postStaff,
  rowsOf,
  SCRIPT_URL,
} from "@/test/fake-script-server";

const LOCK_BUSY = "Le serveur est très sollicité : réessayez dans quelques secondes.";
const WRONG_PASSWORD = { error: "Mot de passe incorrect." };
const start = fakeScriptPerTest();

// One valid body per protected action of 02 § 4.1, shaped as in 02 § 4.7, for the seed of parite.md § 2.
const STAFF_BODIES: Record<string, Record<string, unknown>> = {
  getAdminState: {},
  addDayR1: {
    date: "2026-10-20",
    capacity: 24,
    menu: "Menu",
    theme: "",
    collegue: "M. Dupont",
  },
  editDayR1: { date: "2026-10-06", capacity: 22, menu: "Velouté", theme: "" },
  deleteDayR1: { date: "2026-10-09" },
  deleteBookingR1: { id: "r1b-d+1-ungerer" },
  editBookingR1: {
    id: "r1b-d+1-ungerer",
    nom: "Cyrille Ungerer",
    contact: "c.ungerer@exemple.fr",
    classe: "TS2",
    qte: 4,
    nbEleve: 3,
    nbProf: 1,
    nbExt: 0,
    prixTotal: 20.95,
    observation: "",
  },
  addDayR2: {
    date: "2026-10-20",
    note: "",
    items: [{ name: "Lasagnes", stock: 10, price: 4.5 }],
    theme: "",
    collegue: "",
  },
  addItemR2: { date: "2026-10-06", name: "Salade", stock: 5, price: "" },
  editItemR2: { itemId: "r2i-d+1-lasagnes", name: "Lasagnes", stock: 12, price: 4.5 },
  deleteItemR2: { itemId: "r2i-d+1-bowl" },
  deleteDayR2: { date: "2026-10-13" },
  deleteBookingR2: { id: "r2b-d+1-bernard" },
  editBookingR2: {
    id: "r2b-d+1-bernard",
    nom: "Noah Bernard",
    contact: "n.bernard@exemple.fr",
    classe: "TS1",
    qte: 2,
    mode: "emporter",
    observation: "",
  },
  setConfigField: { key: "name2", value: "Le Bistrot" },
};
const STAFF_ACTIONS = Object.keys(STAFF_BODIES);
const STAFF_WRITES = STAFF_ACTIONS.filter((action) => action !== "getAdminState");

const PUBLIC_BOOKINGS = [
  { action: "addBookingR1", date: "2026-10-06", nom: "Inès Roux", nbEleve: 1, requestId: "a" },
  {
    action: "addBookingR2Multi",
    date: "2026-10-06",
    nom: "Inès Roux",
    mode: "surplace",
    items: [{ itemId: "r2i-d+1-lasagnes", qte: 1 }],
    requestId: "b",
  },
];

function exampleTables(): FakeDb {
  const { r1Days, r1Bookings, r2Days, r2Items, r2Bookings, ...config } = fullStateExample;
  return {
    etag: "E1",
    config,
    r1Days,
    r1Bookings,
    r2Days,
    r2Items,
    r2Bookings,
    requestIds: [],
    mailError: null,
  };
}

describe("getAdminState (02 § 4.3)", () => {
  it("answers the full state of 02 § 4.3", async () => {
    start({ seed: exampleTables() });
    expect(await postStaff({ action: "getAdminState" })).toStrictEqual(fullStateExample);
  });

  it("answers every row of the seed with names and contacts, without etag", async () => {
    start();
    const seed = createSeed();
    const state = await postStaff({ action: "getAdminState" });
    expect(state).not.toHaveProperty("etag");
    expect(rowsOf(state, "r1Bookings")).toStrictEqual(seed.r1Bookings);
    expect(rowsOf(state, "r2Bookings")).toStrictEqual(seed.r2Bookings);
    expect(rowsOf(state, "r1Days")).toStrictEqual(seed.r1Days);
    expect(state).toMatchObject({
      name1: "Restaurant Pédagogique",
      name2: "Aristide",
      desc1: "Table réservée par nombre de couverts, avec le menu du jour.",
      contactAnnulation: "le secrétariat",
      priceEleve: "4.95",
    });
  });
});

describe("password of the protected actions (02 § 2)", () => {
  it.each(STAFF_ACTIONS)(
    "%s refuses a wrong or missing password and writes nothing",
    async (action) => {
      const fake = start();
      const body = { action, ...STAFF_BODIES[action] };
      expect(await postAction({ ...body, password: "faux" })).toStrictEqual(WRONG_PASSWORD);
      expect(await postAction(body)).toStrictEqual(WRONG_PASSWORD);
      expect(await postAction({ ...body, password: "" })).toStrictEqual(WRONG_PASSWORD);
      expect(fake.db).toStrictEqual(createSeed());
    },
  );

  it.each(STAFF_ACTIONS)("%s answers the full state with the right password", async (action) => {
    const fake = start();
    const state = await postStaff({ action, ...STAFF_BODIES[action] });
    expect(state).not.toHaveProperty("error");
    expect(state).not.toHaveProperty("etag");
    expect(rowsOf(state, "r1Bookings")).toStrictEqual(fake.db.r1Bookings);
    expect(rowsOf(state, "r2Items")).toStrictEqual(fake.db.r2Items);
    const written = JSON.stringify(fake.db) !== JSON.stringify(createSeed());
    expect(written).toBe(action !== "getAdminState");
  });

  it("follows the password changed by setPassword (REG-31)", async () => {
    const fake = start({ password: "premier" });
    expect(await postStaff({ action: "getAdminState" })).toStrictEqual(WRONG_PASSWORD);
    expect(await postAction({ action: "getAdminState", password: "premier" })).not.toHaveProperty(
      "error",
    );
    fake.setPassword("autre");
    const old = { action: "deleteDayR1", date: "2026-10-09", password: "premier" };
    expect(await postAction(old)).toStrictEqual(WRONG_PASSWORD);
    expect(fake.db.r1Days.some((d) => d.Date === "2026-10-09")).toBe(true);
    const state = await postAction({ ...old, password: "autre" });
    expect(rowsOf(state, "r1Days").map((d) => d["Date"])).not.toContain("2026-10-09");
  });

  it("refuses everything when the script has no password (Code.gs checkPassword)", async () => {
    start({ password: "" });
    expect(await postAction({ action: "getAdminState", password: "" })).toStrictEqual(
      WRONG_PASSWORD,
    );
  });
});

describe("script lock (02 § 1.7)", () => {
  it.each([
    ...STAFF_WRITES.map((action) => ({ action, ...STAFF_BODIES[action], password: "secret" })),
    ...PUBLIC_BOOKINGS,
    { action: "addBookingR2" },
    { action: "foo" },
    {},
  ])("answers $action with the lock error, before any other check", async (body) => {
    const fake = start({ seed: { ...createSeed(), lockBusy: true } });
    expect(await postAction(body)).toStrictEqual({ error: LOCK_BUSY });
    expect(await postAction({ ...body, password: "faux" })).toStrictEqual({ error: LOCK_BUSY });
    expect(fake.db).toStrictEqual({ ...createSeed(), lockBusy: true });
  });

  it("lets getAdminState, checkPassword and the public read through", async () => {
    const fake = start();
    fake.db.lockBusy = true;
    expect(await postStaff({ action: "getAdminState" })).not.toHaveProperty("error");
    expect(await postAction({ action: "getAdminState", password: "faux" })).toStrictEqual(
      WRONG_PASSWORD,
    );
    const checked = await postStaff({ action: "checkPassword" });
    expect(checked["error"]).toMatch(/^Action jamais envoyée/u);
    expect(await getState()).toHaveProperty("etag", "E1");
  });

  it("reads the body before taking the lock", async () => {
    const fake = start();
    fake.db.lockBusy = true;
    const response = await fetch(SCRIPT_URL, { method: "POST", body: "{nope" });
    const { error } = (await response.json()) as { error: string };
    expect(error).toMatch(/JSON/u);
    expect(await postAction(null)).toStrictEqual({
      error: "Cannot read properties of null (reading 'action')",
    });
  });

  it("writes again once the lock is free", async () => {
    const fake = start();
    fake.db.lockBusy = true;
    const body = { action: "deleteDayR1", date: "2026-10-09" };
    expect(await postStaff(body)).toStrictEqual({ error: LOCK_BUSY });
    fake.db.lockBusy = false;
    expect(await postStaff(body)).not.toHaveProperty("error");
    expect(fake.db.r1Days.some((d) => d.Date === "2026-10-09")).toBe(false);
  });
});

describe("setConfigField (02 § 4.7)", () => {
  it("changes a setting, seen by the full state and by the public read", async () => {
    const fake = start();
    const state = await postStaff({ action: "setConfigField", key: "name2", value: "Le Bistrot" });
    expect(state).toHaveProperty("name2", "Le Bistrot");
    expect(fake.db.config["name2"]).toBe("Le Bistrot");
    expect(await getState("?since=E1")).toMatchObject({ etag: "E2", name2: "Le Bistrot" });
  });

  it.each([
    ["name1", "Restaurant 1"],
    ["name2", "Restaurant 2"],
    ["contactAnnulation", "l'établissement"],
    ["priceEleve", "4.95"],
  ])('brings back the script\'s default for %s set to "" (b-9)', async (key, fallback) => {
    const fake = start();
    const state = await postStaff({ action: "setConfigField", key, value: "" });
    expect(state).toHaveProperty(key, fallback);
    expect(fake.db.config[key]).toBe("");
  });

  it("adds a missing setting and accepts any key (b-10)", async () => {
    const fake = start();
    const desc = await postStaff({
      action: "setConfigField",
      key: "desc1",
      value: "Service à table",
    });
    expect(desc).toHaveProperty("desc1", "Service à table");
    const other = await postStaff({ action: "setConfigField", key: "couleur", value: "vert" });
    expect(other).not.toHaveProperty("couleur");
    expect(fake.db.config).toMatchObject({ desc1: "Service à table", couleur: "vert" });
  });
});

describe("etag after a protected write (02 § 3.2)", () => {
  it("changes when the public content changes, and only then", async () => {
    start();
    const rename = {
      ...STAFF_BODIES["editBookingR1"],
      action: "editBookingR1",
      nbEleve: 2,
      nbProf: 1,
      nom: "C. Ungerer",
    };
    expect(await postStaff(rename)).not.toHaveProperty("error");
    expect(await getState("?since=E1")).toStrictEqual({ unchanged: true, etag: "E1" });
    await postStaff({ action: "editDayR1", date: "2026-10-06", capacity: 25, menu: "", theme: "" });
    expect(await getState("?since=E1")).toHaveProperty("etag", "E2");
  });
});
