import type { Locator, Page } from "@playwright/test";

import { notWritten } from "./target";

// Client / Collègue switch and login panel (09 § 3: L-01; 06 § 1). Bodies: P1 (c).

/** Password field of the login panel. */
export function passwordField(_page: Page): Locator {
  throw notWritten("P1 (c)", "passwordField");
}

/** Clicks « Collègue »: the login panel opens. */
export async function openLogin(_page: Page): Promise<void> {
  await Promise.reject(notWritten("P1 (c)", "openLogin"));
}

/** Opens the panel if needed, types the password and validates. */
export async function login(_page: Page, _password: string): Promise<void> {
  await Promise.reject(notWritten("P1 (c)", "login"));
}

/** Clicks « Client » (C-30). */
export async function logout(_page: Page): Promise<void> {
  await Promise.reject(notWritten("P1 (c)", "logout"));
}
