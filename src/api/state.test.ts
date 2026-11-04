import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessError, PasswordRejectedError, ServiceError } from "@/api/errors";
import { fetchFullState, fetchPublicState, retryRead } from "@/api/state";
import { stateUrl } from "@/api/transport";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { fakeScriptPerTest, SCRIPT_URL } from "@/test/fake-script-server";

// Reads through the fake script (src/mocks/node.ts), timers faked (02 § 1.5). Hedging and timeouts:
// hedged-read.test.ts.

const start = fakeScriptPerTest();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  globalThis.__EARLY_FETCH__ = undefined;
});

/** What the inline script of the <head> leaves behind (03 § 2.1). */
function earlyFetch(since: string, response: Promise<Response>): void {
  globalThis.__EARLY_FETCH__ = { since, response, startedAt: performance.now() };
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
