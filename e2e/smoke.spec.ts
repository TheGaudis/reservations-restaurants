import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Shell served as GitHub Pages serves it (PLAN P0). Requests that leave 127.0.0.1 are aborted, except the read of
// the fake script URL of .env.test, answered locally: the real Apps Script is never called (R-33).
const SCRIPT_URL = "https://script.google.com/macros/s/FAKE/exec";

// Pages answers a deep link with 404.html and status 404: Chromium logs that status for the document itself.
function isDeepLinkStatus(page: Page, text: string, url: string): boolean {
  return url === page.url() && text.includes("status of 404");
}

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error" && message.type() !== "warning") return;
    if (isDeepLinkStatus(page, message.text(), message.location().url)) return;
    errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== "127.0.0.1",
    async (route) => {
      if (route.request().url().startsWith(SCRIPT_URL)) {
        await route.fulfill({
          json: { unchanged: true },
          headers: { "access-control-allow-origin": "*" },
        });
        return;
      }
      await route.abort();
    },
  );
});

test("root serves the prerendered shell", async ({ page }) => {
  const errors = watchConsole(page);
  const response = await page.goto("./");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Réservations — Restaurants pédagogiques");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.waitForLoadState("networkidle");
  // No local copy: the skeleton stays (G-01).
  await expect(page.getByRole("main")).toHaveAttribute("aria-busy", "true");
  expect(errors).toStrictEqual([]);
});

test("deep link /collegue gets 404.html and the app starts", async ({ page }) => {
  const errors = watchConsole(page);
  const response = await page.goto("./collegue");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Page introuvable" })).toBeVisible();
  await page.getByRole("link", { name: "Revenir à l'accueil" }).click();
  await expect(page).toHaveURL(/\/reservations-restaurants\/$/u);
  expect(errors).toStrictEqual([]);
});

test("/index.html redirects to the root", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("./index.html");
  await expect(page).toHaveURL(/\/reservations-restaurants\/$/u);
  await page.waitForLoadState("networkidle");
  expect(errors).toStrictEqual([]);
});
