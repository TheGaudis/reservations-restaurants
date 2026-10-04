import type { Page } from "@playwright/test";

import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { TEST_NOW } from "@/test/clock";

import { expect, test } from "./fixtures";
import { calendarDays } from "./pages/calendar";
import { column, gotoHome, toast, toastKind } from "./pages/home";
import { login, logout, modeButton, passwordField } from "./pages/login";
import { readLocalCache } from "./pages/storage";

// Staff session on the built site (P5 (a)): guard and return, the three logouts, nothing of the session left in the
// page nor in the storages (PLAN § 3.3.3-3.3.4, S8; 06 § 1.4-1.7; 09 G-08, C-30). The regression scenarios REG-28 to
// REG-31 go through panels of P5 (b) to (e); these checks need only the staff page and its cards.

test.use({ reducedMotion: "reduce" });

/** Every name of a colleague that a staff card of the seed shows (« Ouvert par »): staff data only (01 § 2.2). */
async function expectNoStaffData(page: Page): Promise<void> {
  await expect(page.locator("body")).not.toContainText("Ouvert par");
}

async function expectPasswordNowhere(page: Page): Promise<void> {
  const stored = await page.evaluate(() =>
    JSON.stringify([
      Object.entries(localStorage),
      Object.entries(sessionStorage),
      location.href,
      document.cookie,
    ]),
  );
  expect(stored).not.toContain(SEED_PASSWORD);
}

async function logIn(page: Page): Promise<void> {
  await login(page, SEED_PASSWORD);
  await expect(toast(page)).toHaveText("Mode collègue activé.");
}

test("reload of /collegue: login, then back to the exact URL (D-11, E-23)", async ({ page }) => {
  await gotoHome(page);
  const wanted = new URL(
    "collegue?r1=2026-10-06&editResa=r1%3Ar1b-d%2B1-ungerer&parametres=true",
    page.url(),
  ).href;
  await expect(calendarDays(page, "r1")).toBeVisible();
  await logIn(page);
  await expect(page).toHaveURL(/\/reservations-restaurants\/collegue$/u);
  await expect(column(page, "r1")).toContainText("Ouvert par Mme Martin");

  await page.goto(wanted);
  await expect(passwordField(page)).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/reservations-restaurants/");
  await expectNoStaffData(page);
  await logIn(page);
  await expect(page).toHaveURL(wanted);
  await expect(column(page, "r1")).toContainText("Ouvert par M. Dupont");
  await expect(modeButton(page, "staff")).toBeFocused();
  await expectPasswordNowhere(page);
});

test("« Client »: back to / with the calendars, nothing of the session left (06 § 1.5)", async ({
  page,
}) => {
  await gotoHome(page, { r1: "2026-10-06", r1vue: "mois" });
  await expect(calendarDays(page, "r1")).toBeVisible();
  await logIn(page);
  await expect(page).toHaveURL(/\/collegue\?r1=2026-10-06&r1vue=mois$/u);
  await expect(column(page, "r1")).toContainText("Ouvert par M. Dupont");

  await logout(page);
  await expect(toast(page)).toHaveText("Retour au mode client.");
  expect(await toastKind(page)).toBe("success");
  await expect(page).toHaveURL(/\/reservations-restaurants\/\?r1=2026-10-06&r1vue=mois$/u);
  await expect(modeButton(page, "client")).toHaveAttribute("aria-pressed", "true");
  await expect(modeButton(page, "client")).toBeFocused();
  await expectNoStaffData(page);
  await expectPasswordNowhere(page);
  // The local copy keeps being written from the public state only (E-17).
  expect(await readLocalCache(page)).toHaveProperty("etag", "E1");
});

test.describe("timed logouts", () => {
  test.use({ fixedTime: null });

  test("10 minutes without activity (06 § 1.6)", async ({ page }) => {
    await page.clock.install({ time: TEST_NOW });
    await gotoHome(page);
    await expect(calendarDays(page, "r1")).toBeVisible();
    await logIn(page);
    await expect(column(page, "r1")).toContainText("Ouvert par");
    await page.clock.fastForward("10:01");
    await expect(toast(page)).toHaveText(
      "Déconnecté du mode collègue après 10 minutes d'inactivité.",
    );
    await expect(page).toHaveURL(/\/reservations-restaurants\/$/u);
    await expectNoStaffData(page);
  });

  test("password changed, seen by the refresh (06 § 1.7, § 1.8)", async ({ page, fakeScript }) => {
    await page.clock.install({ time: TEST_NOW });
    await gotoHome(page);
    await expect(calendarDays(page, "r1")).toBeVisible();
    await logIn(page);
    await expect(column(page, "r1")).toContainText("Ouvert par");
    fakeScript.setPassword("autre");
    await page.clock.runFor("03:00");
    await expect(toast(page)).toHaveText(
      "Le mot de passe du mode collègue a changé. Reconnectez-vous.",
    );
    expect(await toastKind(page)).toBe("error");
    await expect(page).toHaveURL(/\/reservations-restaurants\/$/u);
    await expectNoStaffData(page);
    await login(page, "autre");
    await expect(toast(page)).toHaveText("Mode collègue activé.");
  });
});
