import { afterEach, expect, it, vi } from "vitest";

import { stateKeys } from "@/queries/state";
import { getRouter } from "@/router";

// getRouter() runs in Node when the shell is prerendered (R-02). The local copy below is valid: only the
// typeof window guard keeps it out of the query cache, the try/catch of the storage read does not.
function stubLocalCopy(): void {
  const copy = JSON.stringify({
    savedAt: Date.now(),
    etag: "ETAG",
    config: { name1: "Restaurant", name2: "Aristide" },
  });
  vi.stubGlobal("localStorage", { getItem: () => copy });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

it("does not read the local copy without window", () => {
  stubLocalCopy();
  const router = getRouter();
  expect(router.options.context.queryClient.getQueryData(stateKeys.public())).toBeUndefined();
});

it("restores the local copy when window exists", () => {
  stubLocalCopy();
  vi.stubGlobal("window", globalThis);
  const router = getRouter();
  expect(router.options.context.queryClient.getQueryData(stateKeys.public())).toStrictEqual({
    etag: "ETAG",
    settings: { name1: "Restaurant", name2: "Aristide" },
  });
});

it("keeps the default pendingMinMs of the router (PLAN arbitrage 16)", () => {
  expect(getRouter().options.defaultPendingMinMs).toBe(500);
});
