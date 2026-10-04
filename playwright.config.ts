/// <reference types="node" />
import { defineConfig, devices } from "@playwright/test";

// Cloud sessions: the preinstalled Chromium does not match Playwright's revision, hence the explicit path (PLAN § 2.1).
const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE"];
// Default port of `pnpm serve`; sessions running in parallel set their own.
const reactPort = Number(process.env["E2E_REACT_PORT"] ?? 4311);
const reactUrl = `http://127.0.0.1:${reactPort}/reservations-restaurants/`;

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
    // Regression suite (PLAN § 1.5, S1). The `legacy` branches of its scenarios record each E-xx gap
    // (docs/migration/parite.md, `legacy` column frozen at the switch); only `react` runs them.
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
  webServer: { command: "pnpm serve", url: reactUrl, reuseExistingServer: false },
});
