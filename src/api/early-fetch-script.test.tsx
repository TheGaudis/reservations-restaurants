import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { earlyFetchScript, takeEarlyFetch } from "@/api/early-fetch";
import { fakeScript } from "@/test/browser-fake-script";

// The inline script of the <head> (03 § 2.1), run as the shell runs it: a <script> element, in Chromium, against
// the fake script of the msw worker. A .tsx file runs in the browser project (vitest.config.ts).

const SCRIPT_URL = "https://script.google.com/macros/s/FAKE/exec";
const DAY_MS = 24 * 3600 * 1000;

function runInlineScript(): void {
  const script = document.createElement("script");
  script.textContent = earlyFetchScript;
  document.head.append(script);
  script.remove();
}

function storeCopy(copy: unknown): void {
  localStorage.setItem(
    "reservations-cache-v1",
    typeof copy === "string" ? copy : JSON.stringify(copy),
  );
}

/** URL the early fetch requested, once its answer has come. */
async function requestedUrl(since: string): Promise<string | undefined> {
  const early = takeEarlyFetch(since);
  expect(early).not.toBeNull();
  await early?.response;
  return fakeScript().requests.at(-1)?.url;
}

beforeEach(() => {
  localStorage.clear();
  window.__EARLY_FETCH__ = undefined;
});

afterEach(() => {
  localStorage.clear();
  window.__EARLY_FETCH__ = undefined;
});

describe("inline script of the <head> (03 § 2.1)", () => {
  it("reads without since on a first visit", async () => {
    runInlineScript();
    expect(await requestedUrl("")).toBe(SCRIPT_URL);
  });

  it("sends the etag of a local copy younger than 14 days", async () => {
    storeCopy({ savedAt: Date.now() - 13 * DAY_MS, etag: "a+b/c=" });
    runInlineScript();
    expect(await requestedUrl("a+b/c=")).toBe(`${SCRIPT_URL}?since=a%2Bb%2Fc%3D`);
  });

  it.each([
    ["a copy of 14 days", { savedAt: Date.now() - 14 * DAY_MS, etag: "E1" }],
    ["a copy without etag (old site, staff session)", { savedAt: Date.now() }],
    ["a copy with an empty etag", { savedAt: Date.now(), etag: "" }],
    ["invalid JSON", "{"],
  ])("reads without since with %s", async (_label, copy) => {
    storeCopy(copy);
    runInlineScript();
    expect(await requestedUrl("")).toBe(SCRIPT_URL);
  });

  it("reads without since when the storage throws (private browsing, 03 § 1)", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    runInlineScript();
    expect(await requestedUrl("")).toBe(SCRIPT_URL);
  });

  it("keeps the Response and its start time", async () => {
    const before = performance.now();
    runInlineScript();
    const early = takeEarlyFetch("");
    expect(early?.startedAt).toBeGreaterThanOrEqual(before);
    const response = await early?.response;
    expect(response).toBeInstanceOf(Response);
  });

  it("never leaves a rejection unhandled when the read fails", async () => {
    fakeScript().failNext("network");
    runInlineScript();
    // The failure comes before anyone takes the early fetch: without its catch, Vitest reports it.
    await vi.waitFor(() => {
      expect(fakeScript().requests).toHaveLength(1);
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    await expect(takeEarlyFetch("")?.response).rejects.toThrow(TypeError);
  });
});
