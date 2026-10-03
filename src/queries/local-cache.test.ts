import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";

import { restoreLocalCache } from "@/queries/local-cache";
import { stateKeys } from "@/queries/state";

const NOW = Date.parse("2026-10-05T07:30:00.000Z");
const DAY_MS = 24 * 3600 * 1000;

function stubStorage(raw: string | null): void {
  vi.stubGlobal("localStorage", { getItem: () => raw });
}

function copy(savedAt: number, etag?: string): string {
  return JSON.stringify({
    savedAt,
    ...(etag === undefined ? {} : { etag }),
    config: { name1: "Restaurant Pédagogique", name2: "Aristide", priceEleve: "4.95" },
    r1Used: {},
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

it("restores a copy younger than 14 days with its save date (03 § 1.1)", () => {
  stubStorage(copy(NOW - DAY_MS, "ETAG"));
  const queryClient = new QueryClient();
  expect(restoreLocalCache(queryClient, NOW)).toBe(true);
  expect(queryClient.getQueryData(stateKeys.public())).toStrictEqual({
    etag: "ETAG",
    settings: { name1: "Restaurant Pédagogique", name2: "Aristide" },
  });
  expect(queryClient.getQueryState(stateKeys.public())?.dataUpdatedAt).toBe(NOW - DAY_MS);
});

it("accepts a copy without etag", () => {
  stubStorage(copy(NOW));
  const queryClient = new QueryClient();
  expect(restoreLocalCache(queryClient, NOW)).toBe(true);
  expect(queryClient.getQueryData(stateKeys.public())).toMatchObject({ etag: null });
});

it.each([
  ["no copy", null],
  ["a copy of 14 days", copy(NOW - 14 * DAY_MS, "ETAG")],
  ["invalid JSON", "{"],
  ["a copy without config", JSON.stringify({ savedAt: NOW })],
])("ignores %s", (_label, raw) => {
  stubStorage(raw);
  const queryClient = new QueryClient();
  expect(restoreLocalCache(queryClient, NOW)).toBe(false);
  expect(queryClient.getQueryData(stateKeys.public())).toBeUndefined();
});

it("ignores a storage that throws (private browsing, 03 § 1)", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("SecurityError");
    },
  });
  expect(restoreLocalCache(new QueryClient(), NOW)).toBe(false);
});
