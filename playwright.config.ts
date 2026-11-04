/// <reference types="node" />
import { defineConfig, devices } from "@playwright/test";
import type { PlaywrightTestConfig } from "@playwright/test";

// Cloud sessions: the preinstalled Chromium does not match Playwright's revision, hence the explicit path (PLAN § 2.1).
const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE"];
// Default port of `pnpm serve`; sessions running in parallel set their own.
const reactPort = Number(process.env["E2E_REACT_PORT"] ?? 4311);
const reactUrl = `http://127.0.0.1:${reactPort}/reservations-restaurants/`;
// `pnpm test:e2e:production` sets it: the published site and the real script are reached only on that explicit
// command, never by `pnpm test:e2e` nor the CI (CLAUDE.md « Environnement »).
const production = process.env["E2E_PRODUCTION"] !== undefined;

const localProjects: PlaywrightTestConfig["projects"] = [
  // Regression suite (PLAN § 1.5, S1).
  { name: "react", testDir: "e2e/regression", use: { baseURL: reactUrl } },
  // Tests of the new code only (PDF printing, accessibility), on the build:e2e output.
  {
    name: "react-only",
    testIgnore: ["regression/**", "smoke-production.spec.ts"],
    use: { baseURL: reactUrl },
  },
];

const productionProjects: PlaywrightTestConfig["projects"] = [
  // Read-only checks of the published site (PLAN P8, § 7), run by hand after the switch.
  {
    name: "production",
    testMatch: "smoke-production.spec.ts",
    retries: 0,
    // A cold start of Apps Script can exceed 10 s (R-10).
    timeout: 90_000,
    expect: { timeout: 30_000 },
    use: { baseURL: "https://thegaudis.github.io/reservations-restaurants/" },
  },
];

export default defineConfig({
  testDir: "e2e",
  forbidOnly: process.env["CI"] !== undefined,
  retries: process.env["CI"] === undefined ? 0 : 1,
  reporter: process.env["CI"] === undefined ? "list" : [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    ...(executablePath === undefined ? {} : { launchOptions: { executablePath } }),
  },
  projects: production ? productionProjects : localProjects,
  // A server left by another worktree must never answer for this one.
  ...(production
    ? {}
    : { webServer: { command: "pnpm serve", url: reactUrl, reuseExistingServer: false } }),
});
