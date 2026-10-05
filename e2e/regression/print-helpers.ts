import type { Page } from "@playwright/test";

import { SEED_PASSWORD } from "@/mocks/fixtures/seed";

import { expect } from "../fixtures";
import { gotoHome, toast } from "../pages/home";
import { login } from "../pages/login";

// Helpers of the print scenarios (REG-39 to REG-42): staff login and the restaurant names of the seed.

export const NAME1 = "Restaurant Pédagogique";
export const NAME2 = "Aristide";

/** Opens the public page and logs in with the seed password (06 § 1.3), through « Collègue » on both sites. */
export async function enterStaffMode(page: Page): Promise<void> {
  await gotoHome(page);
  await login(page, SEED_PASSWORD);
  await expect(toast(page)).toHaveText("Mode collègue activé.");
}
