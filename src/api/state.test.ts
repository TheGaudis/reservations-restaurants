import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessError, PasswordRejectedError, ServiceError } from "@/api/errors";
import { fetchFullState, fetchPublicState, retryRead } from "@/api/state";
import { stateUrl } from "@/api/transport";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { fakeScriptPerTest, SCRIPT_URL } from "@/test/fake-script-server";

// Reads through the fake script (src/mocks/node.ts), timers faked and advanced explicitly (02 § 1.5, E-45); the
// fake script answers through real I/O, which `settled` waits for without moving the fake clock.
// A slow read is an early fetch whose Response the test hands over itself: under msw 3 and Node 22, a request
// held by `hold()` then aborted by the client ends in an uncaught undici assertion (journal p2b1).

const start = fakeScriptPerTest();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  globalThis.__EARLY_FETCH__ = undefined;
});

async function settled(check: () => void): Promise<void> {
  await vi.waitFor(check, { interval: 0, timeout: 5000 });
}

/** What the inline script of the <head> leaves behind (03 § 2.1), started `ageMs` ago. */
function earlyFetch(since: string, response: Promise<Response>, ageMs = 0): void {
  globalThis.__EARLY_FETCH__ = { since, response, startedAt: performance.now() - ageMs };
}

/** An early fetch that answers when the test says so. */
function slowEarlyFetch(since: string, ageMs = 0): { answer: () => void } {
  const gate: { open?: () => void } = {};
  const response = new Promise<Response>((resolve) => {
    gate.open = () => {
      resolve(fetch(stateUrl(since)));
    };
  });
  earlyFetch(since, response, ageMs);
  return { answer: () => gate.open?.() };
}

/** Records how a read settled, without awaiting it. */
function outcomeOf(read: Promise<unknown>): { value?: unknown; error?: unknown } {
  const outcome: { value?: unknown; error?: unknown } = {};
  const settle = async () => {
    try {
      outcome.value = await read;
    } catch (error) {
      outcome.error = error;
    }
  };
  void settle();
  return outcome;
}

describe("fetchPublicState (02 § 3, § 1.5)", () => {
  it("reads and translates the public state, without since on a first visit", async () => {
    const fakeScript = start();
    const response = await fetchPublicState({ since: "" });
    expect(response).toMatchObject({ type: "state", state: { etag: "E1" } });
    expect(fakeScript.requests.map((request) => request.url)).toStrictEqual([SCRIPT_URL]);
  });

  it("sends the etag as since and reads { unchanged } (02 § 3.3, § 5.1)", async () => {
    const fakeScript = start();
    await expect(fetchPublicState({ since: "E1" })).resolves.toStrictEqual({
      type: "unchanged",
      etag: "E1",
    });
    expect(fakeScript.requests[0]?.url).toBe(`${SCRIPT_URL}?since=E1`);
  });

  it("throws the { error } of the script as a BusinessError (03 § 3)", async () => {
    const fakeScript = start();
    fakeScript.failNext("error", "Service indisponible");
    await expect(fetchPublicState({ since: "" })).rejects.toThrow(BusinessError);
  });

  it.each(["html", "network"] as const)("throws a ServiceError on a %s failure", async (kind) => {
    const fakeScript = start();
    fakeScript.failNext(kind);
    await expect(fetchPublicState({ since: "" })).rejects.toThrow(ServiceError);
  });

  it("starts nothing for a read that TanStack Query already cancelled", async () => {
    const fakeScript = start();
    const controller = new AbortController();
    controller.abort();
    await expect(fetchPublicState({ since: "", signal: controller.signal })).rejects.toHaveProperty(
      "name",
      "AbortError",
    );
    expect(fakeScript.requests).toHaveLength(0);
  });
});

describe("fetchPublicState and the early fetch (02 § 1.5, 03 § 2.4, PLAN § 3.3.1)", () => {
  it("takes the early fetch sent with the same since, once", async () => {
    const fakeScript = start();
    earlyFetch("E1", fetch(stateUrl("E1")));
    await expect(fetchPublicState({ since: "E1" })).resolves.toMatchObject({ type: "unchanged" });
    expect(fakeScript.requests).toHaveLength(1);
    await fetchPublicState({ since: "E1" });
    expect(fakeScript.requests).toHaveLength(2);
  });

  it("reads anew when the early fetch had another since", async () => {
    const fakeScript = start();
    earlyFetch("", fetch(stateUrl("")));
    await expect(fetchPublicState({ since: "E1" })).resolves.toMatchObject({ type: "unchanged" });
    expect(fakeScript.requests.map((request) => request.url)).toStrictEqual([
      SCRIPT_URL,
      `${SCRIPT_URL}?since=E1`,
    ]);
    expect(globalThis.__EARLY_FETCH__).toBeUndefined();
  });

  it("hedges a slow read at 6 000 ms, not before, and keeps the hedge's answer", async () => {
    const fakeScript = start();
    slowEarlyFetch("E1");
    const read = fetchPublicState({ since: "E1" });
    await vi.advanceTimersByTimeAsync(5999);
    expect(fakeScript.requests).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    await settled(() => {
      expect(fakeScript.requests.map((request) => request.url)).toStrictEqual([
        `${SCRIPT_URL}?since=E1`,
      ]);
    });
    await expect(read).resolves.toStrictEqual({ type: "unchanged", etag: "E1" });
  });

  it("hedges the early fetch for the rest of its 6 s", async () => {
    const fakeScript = start();
    slowEarlyFetch("", 4000);
    const read = fetchPublicState({ since: "" });
    await vi.advanceTimersByTimeAsync(1999);
    expect(fakeScript.requests).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    await settled(() => {
      expect(fakeScript.requests).toHaveLength(1);
    });
    await expect(read).resolves.toMatchObject({ type: "state" });
  });

  it("keeps the early answer when it comes first, and starts no hedge", async () => {
    const fakeScript = start();
    const early = slowEarlyFetch("E1");
    const read = fetchPublicState({ since: "E1" });
    await vi.advanceTimersByTimeAsync(3000);
    early.answer();
    await expect(read).resolves.toMatchObject({ type: "unchanged" });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fakeScript.requests).toHaveLength(1);
  });

  it("abandons the early fetch 30 s after its start, then fails as the hedge failed too (E-45)", async () => {
    const fakeScript = start();
    fakeScript.failNext("network");
    slowEarlyFetch("", 1000);
    const outcome = outcomeOf(fetchPublicState({ since: "" }));
    await vi.advanceTimersByTimeAsync(5000);
    await settled(() => {
      expect(fakeScript.requests).toHaveLength(1);
    });
    await vi.advanceTimersByTimeAsync(23_999);
    expect(outcome).toStrictEqual({});
    await vi.advanceTimersByTimeAsync(1);
    await settled(() => {
      expect(outcome.error).toBeInstanceOf(ServiceError);
    });
  });

  it("stops the hedge when TanStack Query cancels the read", async () => {
    const fakeScript = start();
    slowEarlyFetch("");
    const controller = new AbortController();
    const outcome = outcomeOf(fetchPublicState({ since: "", signal: controller.signal }));
    await vi.advanceTimersByTimeAsync(1000);
    controller.abort();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(outcome.error).toHaveProperty("name", "AbortError");
    expect(fakeScript.requests).toHaveLength(0);
  });

  it("fails like any read when the early fetch failed", async () => {
    const fakeScript = start();
    fakeScript.failNext("network");
    earlyFetch("", fetch(stateUrl("")));
    await expect(fetchPublicState({ since: "" })).rejects.toThrow(ServiceError);
    expect(fakeScript.requests).toHaveLength(1);
  });
});

describe("fetchFullState (02 § 4.3)", () => {
  it("posts getAdminState with the password in the body and translates the full state", async () => {
    const fakeScript = start();
    const state = await fetchFullState(SEED_PASSWORD);
    expect(state.r1Bookings.map((booking) => booking.name)).toContain("Cyrille Ungerer");
    expect(state.r1Booked.length).toBeGreaterThan(0);
    expect(
      fakeScript.requests.map(({ method, url, json }) => ({ method, url, json })),
    ).toStrictEqual([
      {
        method: "POST",
        url: SCRIPT_URL,
        json: { action: "getAdminState", password: SEED_PASSWORD },
      },
    ]);
  });

  it("throws a PasswordRejectedError on a wrong password (02 § 2)", async () => {
    start();
    await expect(fetchFullState("faux")).rejects.toThrow(PasswordRejectedError);
  });
});

describe("retryRead (02 § 1.5, PLAN § 3.3)", () => {
  it.each([
    [0, new ServiceError("No answer from the script."), true, true],
    [0, new TypeError("Failed to fetch"), true, true],
    [1, new ServiceError("No answer from the script."), true, false],
    [0, new BusinessError("Erreur"), true, false],
    [0, new PasswordRejectedError("Mot de passe incorrect."), true, false],
    [0, new ServiceError("No answer from the script."), false, false],
  ])("after %i failure(s), %o, online %j: retry %j", (failures, error, onLine, retry) => {
    vi.stubGlobal("navigator", { onLine });
    expect(retryRead(failures, error)).toBe(retry);
  });
});
