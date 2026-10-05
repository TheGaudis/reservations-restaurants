import { describe, expect, it } from "vitest";

import { createSeed } from "@/mocks/fixtures/seed";
import { fakeScript, installFakeScript } from "@/test/browser-fake-script";

const SCRIPT_URL = "https://script.google.com/macros/s/FAKE/exec";

async function postBooking(): Promise<Record<string, unknown>> {
  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "addBookingR1",
      date: "2026-10-05",
      nom: "Inès Roux",
      nbEleve: 2,
    }),
  });
  return (await response.json()) as Record<string, unknown>;
}

describe("fake script in the browser project", () => {
  it("answers the Apps Script URL through the msw worker", async () => {
    const response = await fetch(`${SCRIPT_URL}?since=E0`);
    const state = (await response.json()) as Record<string, unknown>;
    expect(state["etag"]).toBe("E1");
    expect(state["name1"]).toBe("Restaurant Pédagogique");
    expect(fakeScript().requests.map((r) => r.url)).toStrictEqual([`${SCRIPT_URL}?since=E0`]);
  });

  it("writes into the tables of the running test only (1/2)", async () => {
    const response = await postBooking();
    expect(response["_emailStatus"]).toStrictEqual({ sent: false, reason: "no-email" });
    expect(fakeScript().db.r1Bookings).toHaveLength(createSeed().r1Bookings.length + 1);
  });

  it("starts each test from the seed (2/2)", () => {
    expect(fakeScript().requests).toStrictEqual([]);
    expect(fakeScript().db).toStrictEqual(createSeed());
  });

  it("can replace the fake script of a test", async () => {
    installFakeScript({ seed: { ...createSeed(), etag: "AUTRE" } });
    const response = await fetch(SCRIPT_URL);
    const state = (await response.json()) as Record<string, unknown>;
    expect(state["etag"]).toBe("AUTRE");
  });
});
