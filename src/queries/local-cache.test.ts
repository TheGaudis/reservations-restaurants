import { QueryClient } from "@tanstack/react-query";
import * as v from "valibot";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type { PublicState } from "@/domain/types";
import localCacheExample from "@/mocks/fixtures/local-cache-v1.json" with { type: "json" };
import {
  fromLocalCacheV1,
  LocalCacheV1Schema,
  persistLocalCache,
  readFallbackTexts,
  restoreLocalCache,
  toLocalCacheV1,
} from "@/queries/local-cache";
import type { LocalCacheV1 } from "@/queries/local-cache";
import { publicStateOptions, stateKeys } from "@/queries/state";
import { TEST_NOW } from "@/test/clock";
import { fullState, publicState } from "@/test/domain-states";

// Local copy `reservations-cache-v1` (03 § 1.1, PLAN § 3.3.5) and the stored titles (03 § 1.2), on a storage
// kept in memory.

const KEY = "reservations-cache-v1";
const DAY_MS = 24 * 3600 * 1000;

/** The state of the example of 03 § 1.1, in the English model. */
const EXAMPLE_STATE: PublicState = {
  etag: "Xq3v0Gk1bWq9u2yYc5n3tA",
  settings: {
    name1: "Restaurant Pédagogique",
    name2: "Aristide",
    desc1: "…",
    desc2: "…",
    cancellationContact: "l'établissement",
    priceStudent: 4.95,
    priceStaff: 6.1,
    priceExternal: 9.9,
  },
  r1Days: [{ date: "2026-10-05", capacity: 20, menu: "…", theme: "Automne" }],
  r1Booked: [{ date: "2026-10-05", seats: 15 }],
  r2Days: [{ date: "2026-10-06", note: "", theme: "" }],
  dishes: [
    { id: "8b7d0c11-…", date: "2026-10-06", name: "Bowl", stock: 10, price: null, voucher: true },
  ],
  r2Booked: [{ dishId: "3f1c2a9e-…", portions: 3 }],
};

let storage: Map<string, string>;

beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function storedCopy(): unknown {
  return JSON.parse(storage.get(KEY) ?? "null");
}

function copyOf(savedAt: number, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ ...toLocalCacheV1(publicState(), savedAt), ...overrides });
}

describe("format v1 (03 § 1.1)", () => {
  it("reads every copy it writes (types)", () => {
    expectTypeOf<LocalCacheV1>().toExtend<v.InferInput<typeof LocalCacheV1Schema>>();
  });

  it("reads the example of 03 § 1.1 into the English model", () => {
    expect(fromLocalCacheV1(v.parse(LocalCacheV1Schema, localCacheExample))).toStrictEqual(
      EXAMPLE_STATE,
    );
  });

  it("writes the example back field for field, prices normalized by String(Number(…))", () => {
    const written = toLocalCacheV1(EXAMPLE_STATE, localCacheExample.savedAt);
    const expected = {
      ...localCacheExample,
      config: { ...localCacheExample.config, priceProf: "6.1", priceExterieur: "9.9" },
    };
    expect(JSON.stringify(written)).toBe(JSON.stringify(expected));
  });

  it("reads its own copy back unchanged (idempotent voucher translation)", () => {
    const state = publicState({
      dishes: [
        { id: "a", date: "2026-10-06", name: "Bowl", stock: 4, price: null, voucher: true },
        { id: "b", date: "2026-10-06", name: "Lasagnes", stock: 8, price: 4.5, voucher: false },
      ],
    });
    const copy = v.parse(LocalCacheV1Schema, toLocalCacheV1(state, TEST_NOW));
    expect(fromLocalCacheV1(copy)).toStrictEqual(state);
  });

  it("sums the booked seats and portions per day and per dish, like saveCache", () => {
    const copy = toLocalCacheV1(
      publicState({
        r1Booked: [
          { date: "2026-10-05", seats: 3 },
          { date: "2026-10-06", seats: 2 },
          { date: "2026-10-05", seats: 4 },
        ],
        r2Booked: [{ dishId: "a", portions: 1 }],
      }),
      TEST_NOW,
    );
    expect(copy.r1Used).toStrictEqual({ "2026-10-05": 7, "2026-10-06": 2 });
    expect(copy.r2Used).toStrictEqual({ a: 1 });
  });

  it("drops unknown keys: nothing personal enters the app from the storage", () => {
    const raw = {
      ...localCacheExample,
      password: "secret",
      r1Days: [{ ...localCacheExample.r1Days[0], Nom: "Cyrille Ungerer", Contact: "c@exemple.fr" }],
    };
    const state = fromLocalCacheV1(v.parse(LocalCacheV1Schema, raw));
    expect(state).toStrictEqual(EXAMPLE_STATE);
  });
});

describe("restoreLocalCache (03 § 1.1, PLAN § 3.3.1)", () => {
  it("restores a copy younger than 14 days, dated by savedAt and marked stale", () => {
    storage.set(KEY, copyOf(TEST_NOW - 13 * DAY_MS));
    const queryClient = new QueryClient();
    expect(restoreLocalCache(queryClient, TEST_NOW)).toBe(true);
    expect(queryClient.getQueryData(publicStateOptions.queryKey)).toStrictEqual(publicState());
    const queryState = queryClient.getQueryState(publicStateOptions.queryKey);
    expect(queryState?.dataUpdatedAt).toBe(TEST_NOW - 13 * DAY_MS);
    expect(queryState?.isInvalidated).toBe(true);
  });

  it("accepts a copy without etag, written by the old site after a staff session", () => {
    const { etag: _etag, ...withoutEtag } = toLocalCacheV1(publicState(), TEST_NOW);
    storage.set(KEY, JSON.stringify(withoutEtag));
    const queryClient = new QueryClient();
    expect(restoreLocalCache(queryClient, TEST_NOW)).toBe(true);
    expect(queryClient.getQueryData(publicStateOptions.queryKey)?.etag).toBeNull();
  });

  it("dates a copy saved in the future at the restore time", () => {
    storage.set(KEY, copyOf(TEST_NOW + DAY_MS));
    const queryClient = new QueryClient();
    expect(restoreLocalCache(queryClient, TEST_NOW)).toBe(true);
    expect(queryClient.getQueryState(publicStateOptions.queryKey)?.dataUpdatedAt).toBe(TEST_NOW);
  });

  it.each([
    ["no copy", null],
    ["a copy of 14 days", copyOf(TEST_NOW - 14 * DAY_MS)],
    ["invalid JSON", "{"],
    ["a copy without r1Used", copyOf(TEST_NOW, { r1Used: undefined })],
    ["a copy with a bad date", copyOf(TEST_NOW, { r1Used: { demain: 2 } })],
    ["a copy without savedAt", copyOf(TEST_NOW, { savedAt: undefined })],
    ["a copy of 15 days", copyOf(TEST_NOW - 15 * DAY_MS)],
    // The old loadCache kept it; the schema requires config.
    ["a copy without config", copyOf(TEST_NOW, { config: undefined })],
  ])("ignores %s", (_label, raw) => {
    if (raw !== null) storage.set(KEY, raw);
    const queryClient = new QueryClient();
    expect(restoreLocalCache(queryClient, TEST_NOW)).toBe(false);
    expect(queryClient.getQueryData(publicStateOptions.queryKey)).toBeUndefined();
  });

  it("ignores a storage that throws (private browsing, 03 § 1)", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
    });
    expect(restoreLocalCache(new QueryClient(), TEST_NOW)).toBe(false);
  });
});

describe("persistLocalCache (03 § 1.1, PLAN § 3.3.5)", () => {
  it("writes the public state after an update, with savedAt now", () => {
    const queryClient = new QueryClient();
    persistLocalCache(queryClient, () => TEST_NOW);
    queryClient.setQueryData(publicStateOptions.queryKey, EXAMPLE_STATE);
    expect(storedCopy()).toStrictEqual(toLocalCacheV1(EXAMPLE_STATE, TEST_NOW));
  });

  it("rewrites the copy with a new savedAt when the same state is confirmed (unchanged)", () => {
    const queryClient = new QueryClient();
    let now = TEST_NOW;
    persistLocalCache(queryClient, () => now);
    queryClient.setQueryData(publicStateOptions.queryKey, EXAMPLE_STATE);
    now += 60_000;
    queryClient.setQueryData(publicStateOptions.queryKey, EXAMPLE_STATE);
    expect(storedCopy()).toMatchObject({ savedAt: TEST_NOW + 60_000 });
  });

  it("never writes from the full state (a-22, E-17)", () => {
    const queryClient = new QueryClient();
    persistLocalCache(queryClient, () => TEST_NOW);
    queryClient.setQueryData(stateKeys.staff(1), fullState());
    expect(storage.has(KEY)).toBe(false);
  });

  it("never writes a state without etag", () => {
    const queryClient = new QueryClient();
    persistLocalCache(queryClient, () => TEST_NOW);
    queryClient.setQueryData(publicStateOptions.queryKey, publicState({ etag: null }));
    expect(storage.has(KEY)).toBe(false);
  });

  it("writes nothing for a restored copy, nor after the unsubscribe", () => {
    storage.set(KEY, copyOf(TEST_NOW - DAY_MS));
    const before = storage.get(KEY);
    const queryClient = new QueryClient();
    restoreLocalCache(queryClient, TEST_NOW);
    const stop = persistLocalCache(queryClient, () => TEST_NOW);
    expect(storage.get(KEY)).toBe(before);
    stop();
    queryClient.setQueryData(publicStateOptions.queryKey, EXAMPLE_STATE);
    expect(storage.get(KEY)).toBe(before);
  });

  it("keeps working when the storage refuses the write (full quota, 03 § 1)", () => {
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    const queryClient = new QueryClient();
    persistLocalCache(queryClient, () => TEST_NOW);
    expect(() => {
      queryClient.setQueryData(publicStateOptions.queryKey, EXAMPLE_STATE);
    }).not.toThrow();
  });
});

describe("readFallbackTexts (03 § 1.2)", () => {
  it.each([
    [
      "the stored titles",
      '{"name1":"Titre","name2":"Aristide","desc1":"","desc2":"D"}',
      {
        name1: "Titre",
        name2: "Aristide",
        desc1: "",
        desc2: "D",
      },
    ],
    ["a part of them", '{"name1":"Titre","autre":1}', { name1: "Titre" }],
    ["nothing", null, null],
    ["invalid JSON", "{", null],
    ["a title that is not text", '{"name1":3}', null],
  ])("reads %s", (_label, raw, expected) => {
    if (raw !== null) storage.set("reservations-textes", raw);
    expect(readFallbackTexts()).toStrictEqual(expected);
  });
});
