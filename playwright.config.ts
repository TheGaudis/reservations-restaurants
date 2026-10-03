/// <reference types="node" />
import { defineConfig, devices } from "@playwright/test";

// Cloud sessions: the preinstalled Chromium does not match Playwright's revision, hence the explicit path (PLAN § 2.1).
const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE"];
// Default ports of `pnpm serve:legacy` and `pnpm serve`; sessions running in parallel set their own.
const legacyPort = Number(process.env["E2E_LEGACY_PORT"] ?? 4310);
const reactPort = Number(process.env["E2E_REACT_PORT"] ?? 4311);
const BASE = "/reservations-restaurants/";
const legacyUrl = `http://127.0.0.1:${legacyPort}${BASE}`;
const reactUrl = `http://127.0.0.1:${reactPort}${BASE}`;

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
  projects: [
    // Regression suite (PLAN § 1.5, S1) on the legacy site, then on the React build.
    { name: "legacy", testDir: "e2e/regression", use: { baseURL: legacyUrl } },
    { name: "react", testDir: "e2e/regression", use: { baseURL: reactUrl } },
    // Tests of the new code only (smoke, hydration, PDF printing, accessibility), on the build:e2e output.
    {
      name: "react-only",
      testIgnore: ["regression/**", "smoke-production.spec.ts"],
      use: { baseURL: reactUrl },
    },
    // Read-only checks of the public site after the switch (P8), started by hand.
    {
      name: "production",
      testMatch: "smoke-production.spec.ts",
      use: { baseURL: "https://thegaudis.github.io/reservations-restaurants/" },
    },
  ],
  // A server left by another worktree must never answer for this one.
  webServer: [
    { command: "pnpm serve:legacy", url: legacyUrl, reuseExistingServer: false },
    { command: "pnpm serve", url: reactUrl, reuseExistingServer: false },
  ],
});
