import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessError, ServiceError } from "@/api/errors";
import { fetchPublicState } from "@/api/state";
import { createQueryClient } from "@/queries/client";
import { fakeScriptPerTest } from "@/test/fake-script-server";

// Single retry of the reads after 1.5 s (02 § 1.5, PLAN § 3.3), with the client defaults, a real QueryClient and
// the fake script. Timers are faked and advanced explicitly; the fake script answers through real I/O, which
// `settled` waits for without moving the fake clock.

const start = fakeScriptPerTest();
const KEY = ["state", "public"];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  vi.stubGlobal("navigator", { onLine: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function settled(check: () => void): Promise<void> {
  await vi.waitFor(check, { interval: 0, timeout: 5000 });
}

/** Reads the public state through a fresh client; records how the query settled. */
function readPublicState() {
  const queryClient = createQueryClient();
  const outcome: { error?: unknown; done: boolean } = { done: false };
  const run = async () => {
    try {
      await queryClient.query({
        queryKey: KEY,
        queryFn: async ({ signal }) => fetchPublicState({ since: "", signal }),
      });
    } catch (error) {
      outcome.error = error;
    }
    outcome.done = true;
  };
  void run();
  const failures = () => queryClient.getQueryState(KEY)?.fetchFailureCount ?? 0;
  return { outcome, failures };
}

describe("retry of the reads (02 § 1.5)", () => {
  it.each(["html", "network"] as const)(
    "retries once, 1 500 ms after a %s failure",
    async (kind) => {
      const fakeScript = start();
      fakeScript.failNext(kind);
      const { outcome, failures } = readPublicState();
      await settled(() => {
        expect(failures()).toBe(1);
      });
      await vi.advanceTimersByTimeAsync(1499);
      expect(fakeScript.requests).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      await settled(() => {
        expect(outcome.done).toBe(true);
      });
      expect(fakeScript.requests).toHaveLength(2);
      expect(outcome.error).toBeUndefined();
    },
  );

  it("fails after the second failure, without a third attempt", async () => {
    const fakeScript = start();
    fakeScript.failNext("html");
    fakeScript.failNext("html");
    const { outcome, failures } = readPublicState();
    await settled(() => {
      expect(failures()).toBe(1);
    });
    await vi.advanceTimersByTimeAsync(1500);
    await settled(() => {
      expect(outcome.done).toBe(true);
    });
    expect(outcome.error).toBeInstanceOf(ServiceError);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fakeScript.requests).toHaveLength(2);
  });

  it("never retries an answer of the script ({ error })", async () => {
    const fakeScript = start();
    fakeScript.failNext("error", "Erreur");
    const { outcome } = readPublicState();
    await settled(() => {
      expect(outcome.done).toBe(true);
    });
    expect(outcome.error).toBeInstanceOf(BusinessError);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fakeScript.requests).toHaveLength(1);
  });

  it("never retries offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const fakeScript = start();
    fakeScript.failNext("network");
    const { outcome } = readPublicState();
    await settled(() => {
      expect(outcome.done).toBe(true);
    });
    expect(outcome.error).toBeInstanceOf(ServiceError);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fakeScript.requests).toHaveLength(1);
  });
});
