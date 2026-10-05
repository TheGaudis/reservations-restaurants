import { expect, test } from "./fixtures";

// Shell served as GitHub Pages serves it (PLAN P0), on the fixtures of e2e/fixtures.ts: network isolation, fake
// script, strict console (the 404 status of a deep link served by 404.html is expected).

test("root serves the prerendered shell", async ({ page }) => {
  const response = await page.goto("./");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Réservations — Restaurants pédagogiques");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.waitForLoadState("networkidle");
  // No local copy: the skeleton until the fake script answers, then the page (G-01, G-04).
  await expect(page.getByRole("main")).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Restaurant Pédagogique",
    "Aristide",
  ]);
});

test("deep link /collegue gets 404.html, then the login panel of the guard", async ({ page }) => {
  const response = await page.goto("./collegue?r1=2026-10-06");
  expect(response?.status()).toBe(404);
  // No staff session in memory: the guard opens the login on / and keeps the URL to come back to (PLAN § 3.2).
  await expect(page.getByLabel("Mot de passe collègue", { exact: true })).toBeVisible();
  const url = new URL(page.url());
  expect(url.pathname).toBe("/reservations-restaurants/");
  expect(Object.fromEntries(url.searchParams)).toStrictEqual({
    r1: "2026-10-06",
    connexion: "true",
    retour: "/collegue?r1=2026-10-06",
  });
});

test("/index.html redirects to the root", async ({ page }) => {
  await page.goto("./index.html");
  await expect(page).toHaveURL(/\/reservations-restaurants\/$/u);
  await page.waitForLoadState("networkidle");
});
