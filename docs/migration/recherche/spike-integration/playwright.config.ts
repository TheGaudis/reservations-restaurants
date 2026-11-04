import { defineConfig, devices } from "@playwright/test";

// Cloud sessions: Chromium preinstalled (revision 1194) does not match Playwright 1.63 (1243): explicit path.
const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE"];
const BASE = "/reservations-restaurants/";

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  use: {
    ...devices["Desktop Chrome"],
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    ...(executablePath === undefined ? {} : { launchOptions: { executablePath } }),
  },
  projects: [
    { name: "legacy", use: { baseURL: `http://localhost:5190${BASE}` } },
    { name: "react", use: { baseURL: `http://localhost:5191${BASE}` } },
  ],
  webServer: [
    {
      command: "node scripts/serve-pages.ts --root legacy --port 5190",
      url: `http://localhost:5190${BASE}`,
      reuseExistingServer: true,
    },
    {
      command: "node scripts/serve-pages.ts --root dist/client --port 5191",
      url: `http://localhost:5191${BASE}`,
      reuseExistingServer: true,
    },
  ],
});
