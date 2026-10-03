import type { Page } from "@playwright/test";

import { SEED_PASSWORD } from "@/mocks/fixtures/seed";

import { expect } from "../fixtures";
import { gotoHome } from "../pages/home";
import { currentTarget } from "../pages/target";

// Helpers of the print scenarios (REG-39 to REG-42): staff login and the restaurant names of the seed.

export const NAME1 = "Restaurant Pédagogique";
export const NAME2 = "Aristide";

/**
 * Opens the public page and logs in with the seed password (06 § 1.3; React: link « Collègue », E-23). The
 * staff page objects of e2e/pages/login.ts belong to P1 (c).
 */
export async function enterStaffMode(page: Page): Promise<void> {
  await gotoHome(page);
  const colleague = page.getByRole(currentTarget() === "legacy" ? "button" : "link", {
    name: "Collègue",
    exact: true,
  });
  await colleague.click();
  await page.getByLabel("Mot de passe collègue").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Valider", exact: true }).click();
  // Not `toast()` of home.ts: on the legacy site, the loading veil's own status (G-06) is visible during the login.
  await expect(page.getByText("Mode collègue activé.", { exact: true })).toHaveCount(1);
}
