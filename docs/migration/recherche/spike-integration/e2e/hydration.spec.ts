import { AxeBuilder } from "@axe-core/playwright";

import { expect, test } from "./fixtures";

test("first render from the local copy, no hydration error", async ({ page }) => {
  test.skip(test.info().project.name !== "react", "new site only");
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem(
      "reservations-cache-v1",
      JSON.stringify({
        savedAt: Date.now() - 60_000,
        etag: "OLD",
        config: { name1: "Copie locale", priceEleve: "4.95" },
        r1Used: {},
        r1Days: [{ Date: "2026-10-01", Capacite: 20, Menu: "m" }],
      }),
    );
  });
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1, name: "Copie locale" })).toBeVisible();
  await expect(page.getByText("jeudi 1er octobre 2026")).toBeVisible();
  await expect(page.getByText("4,95 €")).toBeVisible();
  expect(errors.filter((e) => e.includes("#418"))).toEqual([]);
});

test("deep link and index.html", async ({ page }) => {
  test.skip(test.info().project.name !== "react", "new site only");
  await page.goto("./collegue");
  await expect(page.getByText("Page introuvable")).toBeVisible();
  await page.goto("./index.html");
  await expect(page).toHaveURL(/\/reservations-restaurants\/$/u);
});

test("a11y of the public page (axe)", async ({ page }) => {
  test.skip(test.info().project.name !== "react", "new site only");
  await page.goto("./");
  await page.getByRole("heading", { level: 1 }).waitFor();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map((v) => v.id)).toStrictEqual([]);
});

test("search params: fallback, strip and retain", async ({ page }) => {
  test.skip(test.info().project.name !== "react", "new site only");
  await page.goto("./?r1=2026-13-45&r1vue=semaine&connexion=false&reserver=1");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await expect(page).toHaveURL(/\/reservations-restaurants\/$/u);
  await page.goto("./?r1=2026-10-01&r1vue=mois");
  await page.getByRole("link", { name: "Réserver" }).click();
  await expect(page).toHaveURL(/\?r1=2026-10-01&r1vue=mois&reserver=r1$/u);
  await expect(page.getByRole("textbox", { name: "Nom" })).toBeVisible();
});
