/// <reference types="node" />
import { defineConfig, devices } from "@playwright/test";

// Read-only checks of the published site (PLAN P8, § 7), run by hand after the switch: `pnpm test:e2e:production`.
// A configuration of their own, without the local server nor the fake script: `pnpm test:e2e` and the CI, which
// read playwright.config.ts, never reach the real site nor the real script.
// E2E_PRODUCTION_URL: another published copy (rollback rehearsal on a test repository, custom domain).
const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE"];
const url =
  process.env["E2E_PRODUCTION_URL"] ?? "https://thegaudis.github.io/reservations-restaurants/";

export default defineConfig({
  testDir: "e2e",
  testMatch: "smoke-production.spec.ts",
  forbidOnly: true,
  retries: 0,
  // A cold start of Apps Script can exceed 10 s (R-10).
  timeout: 90_000,
  expect: { timeout: 30_000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: url.endsWith("/") ? url : `${url}/`,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    ...(executablePath === undefined ? {} : { launchOptions: { executablePath } }),
  },
  projects: [{ name: "production" }],
});
