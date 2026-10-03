import { QueryClient } from "@tanstack/react-query";
import * as v from "valibot";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PublicStateSchema } from "@/api/schemas";
import { FullStateSchema } from "@/api/staff-schemas";
import type { FullState, PublicState } from "@/domain/types";
import fullStateExample from "@/mocks/fixtures/full-state.json" with { type: "json" };
import publicStateExample from "@/mocks/fixtures/public-state.json" with { type: "json" };
import { createSeed, SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { createScript, doGet } from "@/mocks/script";
import { fullState as fullStateOf } from "@/mocks/sheet";
import { restoreLocalCache, toLocalCacheV1 } from "@/queries/local-cache";
import { publicStateOptions } from "@/queries/state";
import { TEST_NOW } from "@/test/clock";
import { dayR1, dish, publicState } from "@/test/domain-states";
import { SCRIPT_URL } from "@/test/fake-script-server";
import { loadLegacyPage } from "@/test/legacy-scripts";

// Golden tests of the local copy (PLAN § 3.3.5, R-21): `loadCache` and `saveCache` of legacy/js/donnees.js, run
// unchanged, read what the new code writes and write what it reads. Same origin, same key: after the switch the
// new site reads the copies of the old one, and after a rollback the old site reads those of the new one.

const KEY = "reservations-cache-v1";
const DAY_MS = 24 * 3600 * 1000;

/** Days, dishes with and without price or voucher, sums over several days. */
const VARIED_STATE = publicState({
  etag: "a+b/c=",
  r1Days: [dayR1("2026-10-05", 20, { menu: "Menu", theme: "Automne" }), dayR1("2026-10-06", 8)],
  r1Booked: [
    { date: "2026-10-05", seats: 15 },
    { date: "2026-10-06", seats: 8 },
  ],
  r2Days: [{ date: "2026-10-06", note: "Note", theme: "" }],
  dishes: [
    dish("a", "2026-10-06", { name: "Bowl", price: null, voucher: true }),
    dish("b", "2026-10-06", { name: "Lasagnes", price: 4.5 }),
    dish("c", "2026-10-06", { name: "Salade", price: null }),
  ],
  r2Booked: [
    { dishId: "a", portions: 3 },
    { dishId: "b", portions: 1 },
  ],
});

const STATES: Array<[string, PublicState]> = [
  ["the public state of 02 § 3.2", v.parse(PublicStateSchema, publicStateExample)],
  ["an empty state", publicState()],
  ["days, dishes with and without price or voucher, sums of several days", VARIED_STATE],
];

/** Reads the copy of the old page as the new code does, or null when it is ignored. */
function restored(storage: Map<string, string>, now: number): PublicState | null {
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null });
  const queryClient = new QueryClient();
  if (!restoreLocalCache(queryClient, now)) return null;
  return queryClient.getQueryData(publicStateOptions.queryKey) ?? null;
}

/** The public view of a full state, as a copy written during a staff session holds it (03 § 1.1). */
function publicPart(state: FullState): PublicState {
  return {
    etag: null,
    settings: state.settings,
    r1Days: state.r1Days.map(({ openedBy: _openedBy, ...day }) => day),
    r1Booked: state.r1Booked,
    r2Days: state.r2Days.map(({ openedBy: _openedBy, ...day }) => day),
    dishes: state.dishes,
    r2Booked: state.r2Booked,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("golden: loadCache of the old site reads the copy of the new code", () => {
  it.each(STATES)("%s", (_label, state) => {
    const legacy = loadLegacyPage();
    legacy.setNow(TEST_NOW);
    legacy.storage.set(KEY, JSON.stringify(toLocalCacheV1(state, TEST_NOW - DAY_MS)));
    // loadCache rebuilds a public state of 02 § 3.2, which the schemas of the API read.
    expect(v.parse(PublicStateSchema, legacy.evaluate("loadCache()"))).toStrictEqual(state);
  });
});

const seedScript = createScript(createSeed(), SEED_PASSWORD);
const seedPublic = doGet(seedScript, SCRIPT_URL);
const seedFull = fullStateOf(seedScript.db);

// Answers of the script the old page saved: after a read (public state), or during a staff session (full state,
// written without etag before E-17).
const ANSWERS: Array<[string, unknown, PublicState]> = [
  [
    "the public state of 02 § 3.2",
    publicStateExample,
    v.parse(PublicStateSchema, publicStateExample),
  ],
  ["the public state of the seed", seedPublic, v.parse(PublicStateSchema, seedPublic)],
  [
    "the full state of 02 § 4.3",
    fullStateExample,
    publicPart(v.parse(FullStateSchema, fullStateExample)),
  ],
  ["the full state of the seed", seedFull, publicPart(v.parse(FullStateSchema, seedFull))],
];

describe("golden: the new code reads the copy of saveCache", () => {
  it.each(ANSWERS)("%s", (_label, answer, expected) => {
    const legacy = loadLegacyPage();
    legacy.setNow(TEST_NOW - DAY_MS);
    // `apiGet` and `postJson` hand the answer over through withTicketFlags (02 § 1.4).
    legacy.evaluate(`saveCache(withTicketFlags(${JSON.stringify(answer)}))`);
    expect(restored(legacy.storage, TEST_NOW)).toStrictEqual(expected);
  });
});

const fresh = toLocalCacheV1(VARIED_STATE, TEST_NOW - DAY_MS);

/** Copies read by both: the old site and the new code keep or ignore the same ones, except the listed ones. */
const COPIES: Array<[string, string | null, boolean]> = [
  ["a copy of one day", JSON.stringify(fresh), true],
  ["a copy of 13 days", JSON.stringify({ ...fresh, savedAt: TEST_NOW - 13 * DAY_MS }), true],
  [
    "a copy of exactly 14 days",
    JSON.stringify({ ...fresh, savedAt: TEST_NOW - 14 * DAY_MS }),
    false,
  ],
  ["a copy of 15 days", JSON.stringify({ ...fresh, savedAt: TEST_NOW - 15 * DAY_MS }), false],
  ["a copy without etag", JSON.stringify({ ...fresh, etag: undefined }), true],
  ["a copy without savedAt", JSON.stringify({ ...fresh, savedAt: undefined }), false],
  ["a copy without r1Used", JSON.stringify({ ...fresh, r1Used: undefined }), false],
  ["invalid JSON", "{", false],
  ["no copy", null, false],
];

describe("golden: the same copies are kept or ignored (03 § 1.1)", () => {
  it.each(COPIES)("%s", (_label, raw, kept) => {
    const legacy = loadLegacyPage();
    legacy.setNow(TEST_NOW);
    if (raw !== null) legacy.storage.set(KEY, raw);
    expect(legacy.evaluate("loadCache()") !== null).toBe(kept);
    expect(restored(legacy.storage, TEST_NOW) !== null).toBe(kept);
  });

  it("ignores a copy without config, which the old site kept (expected difference)", () => {
    const legacy = loadLegacyPage();
    legacy.setNow(TEST_NOW);
    legacy.storage.set(KEY, JSON.stringify({ ...fresh, config: undefined }));
    expect(legacy.evaluate("loadCache()")).not.toBeNull();
    expect(restored(legacy.storage, TEST_NOW)).toBeNull();
  });
});
