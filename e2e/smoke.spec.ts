import { expect, test } from "./fixtures";

// Shell served as GitHub Pages serves it (PLAN P0), on the fixtures of e2e/fixtures.ts: network isolation, fake
// script, strict console (the 404 status of a deep link served by 404.html is expected).

test("root serves the prerendered shell", async ({ page }) => {
  const response = await page.goto("./");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Réservations — Restaurants pédagogiques");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.waitForLoadState("networkidle");
  // No local copy: the skeleton stays (G-01).
  await expect(page.getByRole("main")).toHaveAttribute("aria-busy", "true");
});

test("deep link /collegue gets 404.html and the app starts", async ({ page }) => {
  const response = await page.goto("./collegue");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Page introuvable" })).toBeVisible();
  await page.getByRole("link", { name: "Revenir à l'accueil" }).click();
  await expect(page).toHaveURL(/\/reservations-restaurants\/$/u);
});

test("/index.html redirects to the root", async ({ page }) => {
  await page.goto("./index.html");
  await expect(page).toHaveURL(/\/reservations-restaurants\/$/u);
  await page.waitForLoadState("networkidle");
});
