import { defineNetworkFixture } from "@msw/playwright";
import type { NetworkFixture } from "@msw/playwright";
import { test as base, expect } from "@playwright/test";
import type { BrowserContext, ConsoleMessage } from "@playwright/test";
import { http, passthrough } from "msw";

import { createFakeAppsScript } from "@/mocks/apps-script";
import type { FakeAppsScript, FakeAppsScriptOptions } from "@/mocks/apps-script";
import { TEST_NOW } from "@/test/clock";

/**
 * Fixtures of every E2E test (PLAN P1, R-33), set up in this order:
 * 1. `isolation`: aborts every request that leaves 127.0.0.1 or localhost, Google Fonts included;
 * 2. `network`: msw handlers of a fresh fake script, routed before the isolation (Playwright runs the routes in
 *    reverse order of registration); a request that no handler answers falls back to the isolation;
 * 3. `pageClock`: `page.clock.setFixedTime(fixedTime)`, TEST_NOW by default;
 * 4. `consoleLog`: the test fails on any console error or warning, and on any uncaught page error.
 */

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);
const LOCAL_URL = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//u;
// Hosts of the real script: a request blocked there is one the fake script did not answer.
const SCRIPT_HOSTS = new Set(["script.google.com", "script.googleusercontent.com"]);

interface NetworkLog {
  /** Requests let through to the local servers. */
  allowed: string[];
  /** Requests aborted before leaving the machine. */
  blocked: string[];
}

interface ConsoleLog {
  /** Errors and warnings kept so far. */
  messages: string[];
  /** Accepts the console errors matching `pattern` in this test (a failure the scenario provokes). */
  allow: (pattern: RegExp) => void;
}

interface Fixtures {
  /** Seed and password of the fake script; `test.use({ fakeScriptOptions: { seed } })`. */
  fakeScriptOptions: FakeAppsScriptOptions;
  /** Frozen page time; null leaves the clock alone, for `page.clock.install()` before `goto` (10 h, midnight…). */
  fixedTime: number | null;
  isolation: NetworkLog;
  fakeScript: FakeAppsScript;
  network: NetworkFixture;
  pageClock: undefined;
  consoleLog: ConsoleLog;
}

function isLocal(url: string): boolean {
  return URL.canParse(url) && LOCAL_HOSTS.has(new URL(url).hostname);
}

// Chromium logs a failed resource with its URL: the isolation's own aborts, the failures a scenario asks of the
// fake script, and the 404 status of a deep link served by 404.html (GitHub Pages).
function isExpectedLoadFailure(message: ConsoleMessage): boolean {
  if (!message.text().startsWith("Failed to load resource")) return false;
  const { url } = message.location();
  const isDeepLinkDocument =
    url === message.page()?.url() && message.text().includes("status of 404");
  return !isLocal(url) || isDeepLinkDocument;
}

async function isolate(context: BrowserContext, log: NetworkLog): Promise<void> {
  await context.route(
    () => true,
    async (route) => {
      const url = route.request().url();
      if (isLocal(url)) {
        log.allowed.push(url);
        await route.fallback();
        return;
      }
      log.blocked.push(url);
      await route.abort("blockedbyclient");
    },
  );
}

export const test = base.extend<Fixtures>({
  // A service worker would answer requests that context.route() never sees.
  serviceWorkers: "block",
  fakeScriptOptions: [{}, { option: true }],
  fixedTime: [TEST_NOW, { option: true }],
  isolation: [
    async ({ context }, use) => {
      const log: NetworkLog = { allowed: [], blocked: [] };
      await isolate(context, log);
      await use(log);
    },
    { auto: true },
  ],
  fakeScript: async ({ fakeScriptOptions }, use) => {
    await use(createFakeAppsScript(fakeScriptOptions));
  },
  network: [
    async ({ context, isolation, fakeScript }, use) => {
      const network = defineNetworkFixture({
        context,
        handlers: [...fakeScript.handlers, http.all(LOCAL_URL, () => passthrough())],
      });
      await network.enable();
      await use(network);
      await network.disable();
      const unanswered = isolation.blocked.filter((url) => SCRIPT_HOSTS.has(new URL(url).hostname));
      expect(
        unanswered,
        "requests to the script that the fake script did not answer",
      ).toStrictEqual([]);
    },
    { auto: true },
  ],
  pageClock: [
    async ({ page, fixedTime }, use) => {
      if (fixedTime !== null) await page.clock.setFixedTime(fixedTime);
      await use(undefined);
    },
    { auto: true },
  ],
  consoleLog: [
    async ({ context }, use) => {
      const allowed: RegExp[] = [];
      const log: ConsoleLog = { messages: [], allow: (pattern) => allowed.push(pattern) };
      context.on("console", (message) => {
        if (message.type() !== "error" && message.type() !== "warning") return;
        if (isExpectedLoadFailure(message)) return;
        log.messages.push(message.text());
      });
      context.on("weberror", (error) => log.messages.push(error.error().message));
      await use(log);
      const unexpected = log.messages.filter(
        (text) => !allowed.some((pattern) => pattern.test(text)),
      );
      expect(unexpected, "console errors and warnings").toStrictEqual([]);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
