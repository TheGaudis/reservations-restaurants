import type { Locator, Page } from "@playwright/test";

// Client / Collègue switch and login panel (09 § 3: L-01; 06 § 1.1-1.2). Same roles and names on both sites:
// segments with `aria-pressed` in the group « Mode d'accès » (`segGroup` on the legacy site, `ViewToggle` on the
// React one), password field named by its `aria-label`.

const MODE_LABELS = { client: "Client", staff: "Collègue" } as const;

/** Segment « Client » or « Collègue » of the group « Mode d'accès ». */
export function modeButton(page: Page, mode: "client" | "staff"): Locator {
  return page
    .getByRole("group", { name: "Mode d'accès" })
    .getByRole("button", { name: MODE_LABELS[mode], exact: true });
}

/** Password field of the login panel. */
export function passwordField(page: Page): Locator {
  return page.getByLabel("Mot de passe collègue", { exact: true });
}

/** Clicks « Collègue »: the login panel opens. */
export async function openLogin(page: Page): Promise<void> {
  await modeButton(page, "staff").click();
}

/** Opens the panel if needed, types the password and validates (« Valider »). */
export async function login(page: Page, password: string): Promise<void> {
  // A closed panel keeps its field in the page (legacy, `inert`): « Collègue » says whether it is open.
  if ((await modeButton(page, "staff").getAttribute("aria-expanded")) !== "true") {
    await openLogin(page);
  }
  await passwordField(page).fill(password);
  await page.getByRole("button", { name: "Valider", exact: true }).click();
}

/** Clicks « Client » (C-30). */
export async function logout(page: Page): Promise<void> {
  await modeButton(page, "client").click();
}
