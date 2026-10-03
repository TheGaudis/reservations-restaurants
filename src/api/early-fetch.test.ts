import { afterEach, describe, expect, it, vi } from "vitest";

import { LOCAL_CACHE_MAX_AGE_MS } from "@/domain/constants";

// The text of the script depends on the build configuration: each case imports a fresh module after stubbing
// import.meta.env. The script itself runs in the browser test early-fetch-script.test.tsx.

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  globalThis.__EARLY_FETCH__ = undefined;
});

async function freshModule() {
  vi.resetModules();
  return import("@/api/early-fetch");
}

describe("earlyFetchScript (03 § 2.1, PLAN § 3.11)", () => {
  it("reads the script URL, the key of the local copy and its 14 days", async () => {
    const { earlyFetchScript } = await freshModule();
    expect(earlyFetchScript).toContain('"https://script.google.com/macros/s/FAKE/exec"');
    expect(earlyFetchScript).toContain('"reservations-cache-v1"');
    expect(earlyFetchScript).toContain(`<${String(LOCAL_CACHE_MAX_AGE_MS)})`);
  });

  it("is empty on the fake script of pnpm dev: the msw worker starts after it", async () => {
    vi.stubEnv("VITE_MOCK_API", "1");
    const { earlyFetchScript } = await freshModule();
    expect(earlyFetchScript).toBe("");
  });

  it.each(["", "https://script.google.com/macros/s/COLLE_ICI/exec", "https://example.com/exec"])(
    "is empty without a valid script URL (%j, G-05): fetch('') would read the page",
    async (url) => {
      vi.stubEnv("VITE_APPS_SCRIPT_URL", url);
      const { earlyFetchScript } = await freshModule();
      expect(earlyFetchScript).toBe("");
    },
  );
});

describe("takeEarlyFetch (02 § 1.5, 03 § 2.4)", () => {
  const early = (since: string) => ({
    since,
    response: Promise.resolve(new Response("{}")),
    startedAt: 0,
  });

  it("returns the early fetch sent with the same since, once", async () => {
    const { takeEarlyFetch } = await freshModule();
    const sent = early("E1");
    globalThis.__EARLY_FETCH__ = sent;
    expect(takeEarlyFetch("E1")).toBe(sent);
    expect(takeEarlyFetch("E1")).toBeNull();
  });

  it("drops an early fetch sent with another since", async () => {
    const { takeEarlyFetch } = await freshModule();
    globalThis.__EARLY_FETCH__ = early("");
    expect(takeEarlyFetch("E1")).toBeNull();
    expect(globalThis.__EARLY_FETCH__).toBeUndefined();
  });

  it("returns null without early fetch (fake script, missing URL, old browser)", async () => {
    const { takeEarlyFetch } = await freshModule();
    expect(takeEarlyFetch("")).toBeNull();
  });
});
