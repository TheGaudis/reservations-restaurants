import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { TEST_NOW, TODAY } from "@/test/clock";

import { expect, test } from "../fixtures";
import { calendarDays, longDate, selectDay, selectedDay } from "../pages/calendar";
import { gotoHome, toast, toastKind } from "../pages/home";
import { login, modeButton, openLogin, passwordField } from "../pages/login";
import { bookingRow, staffCard } from "../pages/staff";
import { readLocalCache, seedLocalCache } from "../pages/storage";
import { target } from "../pages/target";
import { exposed } from "./helpers";
import {
  actionBodies,
  expectNoPersonalData,
  loginAsStaff,
  toastShown,
  veil,
  veilGone,
} from "./staff-helpers";

// Access to the staff mode: login panel, login, guard of /collegue (09 § 2: G-02, G-06, G-08; 09 § 3: L-01; 06 § 1).

const DAY = 24 * 60 * 60 * 1000;

test.use({ reducedMotion: "reduce" });

function searchOf(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams);
}

test.describe("loginPanel (REG-27)", () => {
  test(
    "loginPanel (REG-27) — refused while the local copy shows",
    { tag: ["@parity", "@L-01", "@G-02", "@p5"] },
    async ({ page, fakeScript }) => {
      await seedLocalCache(page, fakeScript.db, TEST_NOW - DAY);
      const release = fakeScript.hold();
      await gotoHome(page);
      await expect(calendarDays(page, "r1")).toBeVisible();

      // 06 § 1.3 (1): never on the copy of the last visit.
      await login(page, SEED_PASSWORD);
      await expect(toast(page)).toHaveText("Les données se chargent. Réessayez dans un instant.");
      expect(await toastKind(page)).toBe("error");
      expect(actionBodies(fakeScript.requests, "getAdminState")).toStrictEqual([]);

      // The read answers `{ unchanged }`: the data is confirmed, the copy saved again.
      release();
      await expect
        .poll(async () => {
          const copy = await readLocalCache(page);
          return copy?.["savedAt"];
        })
        .toBe(TEST_NOW);
      await login(page, SEED_PASSWORD);
      await veilGone(page);
      await expect(toast(page)).toHaveText("Mode collègue activé.");
    },
  );

  test(
    "loginPanel (REG-27) — panel, eye and Escape",
    { tag: ["@parity", "@L-01", "@p5"] },
    async ({ page }) => {
      await gotoHome(page);
      await expect(calendarDays(page, "r1")).toBeVisible();
      const client = modeButton(page, "client");
      const staff = modeButton(page, "staff");
      await expect(client).toHaveAttribute("aria-pressed", "true");
      await expect(staff).toHaveAttribute("aria-pressed", "false");
      await expect(staff).toHaveAttribute("aria-expanded", "false");

      // 06 § 1.2: « Collègue » opens the panel and moves the focus into the field.
      await openLogin(page);
      await expect(staff).toHaveAttribute("aria-pressed", "true");
      await expect(staff).toHaveAttribute("aria-expanded", "true");
      await expect(client).toHaveAttribute("aria-pressed", "false");
      const field = passwordField(page);
      await expect(field).toBeFocused();
      await expect(field).toHaveAttribute("type", "password");

      // Eye: shows then hides the password, its label follows.
      await field.fill("secret");
      await page.getByRole("button", { name: "Afficher le mot de passe", exact: true }).click();
      await expect(field).toHaveAttribute("type", "text");
      await page.getByRole("button", { name: "Masquer le mot de passe", exact: true }).click();
      await expect(field).toHaveAttribute("type", "password");
      await expect(
        page.getByRole("button", { name: "Afficher le mot de passe", exact: true }),
      ).toBeVisible();

      // Escape: back to the client mode, focus on « Client », field emptied (06 § 1.1).
      await field.press("Escape");
      await expect(client).toBeFocused();
      await expect(client).toHaveAttribute("aria-pressed", "true");
      await expect(staff).toHaveAttribute("aria-expanded", "false");
      await expect.poll(async () => exposed(field)).toBe(false);
      await openLogin(page);
      await expect(field).toHaveValue("");
    },
  );

  test(
    "loginPanel (REG-27) — wrong passwords and network error",
    { tag: ["@changed:E-02", "@L-01", "@G-07", "@p5"] },
    async ({ page, fakeScript }) => {
      await gotoHome(page);
      await expect(calendarDays(page, "r1")).toBeVisible();

      await login(page, "faux");
      await veilGone(page);
      await expect(toast(page)).toHaveText("Mot de passe incorrect.");
      expect(await toastKind(page)).toBe("error");
      const firstShown = Date.now();

      // Second refusal 2 s later, while the first toast still shows (3,5 s): 1,5 s left for the answer.
      await page.waitForTimeout(firstShown + 2000 - Date.now());
      await page.getByRole("button", { name: "Valider", exact: true }).click();
      await expect.poll(() => actionBodies(fakeScript.requests, "getAdminState").length).toBe(2);
      await veilGone(page);
      await expect.poll(async () => toastShown(page)).toBe(true);
      const secondShown = Date.now();
      await expect(toast(page)).toHaveText("Mot de passe incorrect.");
      if (target(test.info()) === "legacy") {
        // 06 PA 16: the timer of the first toast hides the second one before its 3,5 s.
        await expect
          .poll(async () => toastShown(page), { timeout: 3000, intervals: [100] })
          .toBe(false);
        expect(Date.now() - secondShown).toBeLessThan(3000);
      } else {
        // E-02: one toast at a time, the new one replaces the old one with its full time.
        await page.waitForTimeout(1500);
        expect(await toastShown(page)).toBe(true);
        await expect(toast(page).locator('[role="dialog"], [role="alertdialog"]')).toHaveCount(1);
      }

      // Any other failure: « Erreur de connexion. Réessayez. » (06 § 1.3).
      fakeScript.failNext("network");
      await login(page, SEED_PASSWORD);
      await veilGone(page);
      await expect(toast(page)).toHaveText("Erreur de connexion. Réessayez.");
      expect(await toastKind(page)).toBe("error");
      expect(actionBodies(fakeScript.requests, "getAdminState")).toStrictEqual([
        { action: "getAdminState", password: "faux" },
        { action: "getAdminState", password: "faux" },
        { action: "getAdminState", password: SEED_PASSWORD },
      ]);
    },
  );

  test(
    "loginPanel (REG-27) — veil or busy button, then staff mode",
    { tag: ["@changed:E-04", "@changed:E-23", "@L-01", "@G-06", "@G-08", "@p5"] },
    async ({ page, fakeScript }) => {
      await gotoHome(page);
      await expect(calendarDays(page, "r1")).toBeVisible();
      const release = fakeScript.hold();
      await login(page, SEED_PASSWORD);
      await expect.poll(() => actionBodies(fakeScript.requests, "getAdminState").length).toBe(1);

      if (target(test.info()) === "legacy") {
        // G-06: full-page veil, the button keeps its label.
        await expect(veil(page)).toBeVisible();
        await expect(page.locator('button[aria-busy="true"]')).toHaveCount(0);
      } else {
        // E-04: busy button, no veil.
        await expect(veil(page)).toHaveCount(0);
        await expect(page.locator('button[aria-busy="true"]')).toHaveCount(1);
      }
      release();

      await veilGone(page);
      await expect(toast(page)).toHaveText("Mode collègue activé.");
      expect(await toastKind(page)).toBe("success");
      const staff = modeButton(page, "staff");
      await expect(staff).toHaveAttribute("aria-pressed", "true");
      await expect(staff).toHaveAttribute("aria-expanded", "false");
      if (target(test.info()) === "legacy") {
        // 06 § 1.3 (5) focuses « Collègue » while the veil keeps the page inert: the focus falls on body.
        expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
        expect(new URL(page.url()).pathname).toBe("/reservations-restaurants/");
      } else {
        // E-04: nothing inert, the focus reaches « Collègue ».
        await expect(staff).toBeFocused();
        // E-23: the staff mode has its own URL (G-08).
        await expect(page).toHaveURL(/\/reservations-restaurants\/collegue(?:\?|$)/u);
      }
    },
  );
});

test("staffGuardReload (REG-28)", { tag: ["@changed:E-23", "@G-08", "@p5"] }, async ({ page }) => {
  await loginAsStaff(page);
  await selectDay(page, "r1", "2026-10-06");
  await bookingRow(page, "r1", "Cyrille Ungerer")
    .getByRole("button", { name: "Modifier", exact: true })
    .click();
  const nameField = staffCard(page, "r1").getByLabel("Nom", { exact: true });
  await expect(nameField).toHaveValue("Cyrille Ungerer");
  const before = page.url();

  await page.reload();
  if (target(test.info()) === "legacy") {
    // One URL, state in memory: a reload is back to the client mode, on today (06 § 1.4).
    await expect(calendarDays(page, "r1")).toBeVisible();
    await expect(modeButton(page, "client")).toHaveAttribute("aria-pressed", "true");
    await expect(selectedDay(page, "r1")).toHaveAccessibleName(
      new RegExp(`^${longDate(TODAY)},`, "u"),
    );
    await expect(nameField).toHaveCount(0);
    await expectNoPersonalData(page);
    return;
  }
  // E-23: the URL holds the day and the open form; the guard asks for the password, then returns there.
  expect(new URL(before).pathname).toBe("/reservations-restaurants/collegue");
  expect(searchOf(before)).toMatchObject({ r1: "2026-10-06", editResa: "r1:r1b-d+1-ungerer" });
  await expect(passwordField(page)).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/reservations-restaurants/");
  expect(searchOf(page.url())).toMatchObject({ connexion: "true" });
  expect(searchOf(page.url())["retour"]).toContain("editResa");
  await expectNoPersonalData(page);
  await login(page, SEED_PASSWORD);
  await expect(toast(page)).toHaveText("Mode collègue activé.");
  await expect(page).toHaveURL(before);
  await expect(nameField).toHaveValue("Cyrille Ungerer");
});
