import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addBookingR1 } from "@/api/actions";
import { ServiceError } from "@/api/errors";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { createQueryClient } from "@/queries/client";
import { publicStateOptions, stateKeys, staffStateOptions } from "@/queries/state";
import { TEST_NOW } from "@/test/clock";
import { fakeScriptPerTest, SCRIPT_URL } from "@/test/fake-script-server";

// Query options of the script state (PLAN § 3.3) on a real QueryClient and the fake script. Only the date is
// faked: `dataUpdatedAt` moves with it.

const start = fakeScriptPerTest();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("publicStateOptions (02 § 3, § 5.1)", () => {
  it("reads the whole state without since, then sends the etag shown", async () => {
    const fakeScript = start();
    const queryClient = createQueryClient();
    const first = await queryClient.query(publicStateOptions);
    expect(first.etag).toBe("E1");
    await queryClient.query({ ...publicStateOptions, staleTime: 0 });
    expect(fakeScript.requests.map((request) => request.url)).toStrictEqual([
      SCRIPT_URL,
      `${SCRIPT_URL}?since=E1`,
    ]);
  });

  it("keeps the same reference on { unchanged } and refreshes dataUpdatedAt (02 § 3.3)", async () => {
    start();
    const queryClient = createQueryClient();
    const first = await queryClient.query(publicStateOptions);
    vi.setSystemTime(TEST_NOW + 60_000);
    const second = await queryClient.query({ ...publicStateOptions, staleTime: 0 });
    expect(second).toBe(first);
    expect(queryClient.getQueryData(publicStateOptions.queryKey)).toBe(first);
    expect(queryClient.getQueryState(publicStateOptions.queryKey)?.dataUpdatedAt).toBe(
      TEST_NOW + 60_000,
    );
  });

  it("replaces a changed state and keeps the unchanged parts (structural sharing)", async () => {
    start();
    const queryClient = createQueryClient();
    const first = await queryClient.query(publicStateOptions);
    await addBookingR1({
      date: "2026-10-06",
      name: "Autre visiteur",
      contact: "",
      className: "",
      students: 1,
      staffMembers: 0,
      externals: 0,
      observation: "",
      requestId: "other",
    });
    await queryClient.query({ ...publicStateOptions, staleTime: 0 });
    // The cache holds the shared result (the promise of `query` resolves to the parsed answer).
    const second = queryClient.getQueryData(publicStateOptions.queryKey);
    if (second === undefined) throw new Error("no public state");
    expect(second).not.toBe(first);
    expect(second.etag).not.toBe(first.etag);
    expect(second.r1Booked).not.toBe(first.r1Booked);
    expect(second.r1Days).toBe(first.r1Days);
    expect(second.dishes).toBe(first.dishes);
  });

  it("keeps the public state in memory for the whole visit (PLAN § 3.3)", () => {
    expect(publicStateOptions.gcTime).toBe(Number.POSITIVE_INFINITY);
    expect(publicStateOptions.staleTime).toBe(180_000);
    expect(publicStateOptions.queryKey).toStrictEqual(["state", "public"]);
  });
});

describe("staffStateOptions (02 § 4.3)", () => {
  it("reads the full state with the password in the body, never in the key", async () => {
    const fakeScript = start();
    const queryClient = createQueryClient();
    const options = staffStateOptions(3, SEED_PASSWORD);
    const state = await queryClient.query(options);
    expect(state.r1Bookings.length).toBeGreaterThan(0);
    expect(options.queryKey).toStrictEqual(stateKeys.staff(3));
    expect(JSON.stringify(options.queryKey)).not.toContain(SEED_PASSWORD);
    expect(fakeScript.requests[0]?.json).toStrictEqual({
      action: "getAdminState",
      password: SEED_PASSWORD,
    });
  });

  it("drops the full state as soon as nothing observes it (gcTime 0, invariant 1)", () => {
    expect(staffStateOptions(1, SEED_PASSWORD).gcTime).toBe(0);
  });

  it("never retries getAdminState, a POST (02 § 1.5)", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    const fakeScript = start();
    fakeScript.failNext("html");
    const queryClient = createQueryClient();
    await expect(queryClient.query(staffStateOptions(1, SEED_PASSWORD))).rejects.toBeInstanceOf(
      ServiceError,
    );
    expect(fakeScript.requests).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});
