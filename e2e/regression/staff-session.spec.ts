import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { TEST_NOW, TODAY } from "@/test/clock";

import { expect, test } from "../fixtures";
import { longDate, selectedDay } from "../pages/calendar";
import { BLOCKED_FONT_PRELOAD, toast, toastKind } from "../pages/home";
import { login, logout, modeButton, passwordField } from "../pages/login";
import {
  bookingRow,
  datePicker,
  openAddPerson,
  openDayForm,
  openDayPanel,
  openSettings,
  staffCard,
  staffPanel,
} from "../pages/staff";
import { readLocalCache } from "../pages/storage";
import { target } from "../pages/target";
import { exposed, settle } from "./helpers";
import {
  actionBodies,
  expectNoPersonalData,
  loginAsStaff,
  readCount,
  veilGone,
} from "./staff-helpers";

// End of a staff session: « Client », inactivity, password changed (09 § 4: C-30; 06 § 1.5-1.8; invariant 1).

test.use({ reducedMotion: "reduce" });

test.beforeEach(({ consoleLog }) => {
  consoleLog.allow(BLOCKED_FONT_PRELOAD);
});

test.describe("logoutPurgeAndPanels (REG-29)", () => {
  test.use({ fixedTime: null });

  test(
    "logoutPurgeAndPanels (REG-29)",
    {
      tag: ["@changed:E-24", "@changed:E-17", "@changed:E-08", "@C-30", "@C-02", "@C-05", "@p5"],
    },
    async ({ page, fakeScript }) => {
      const legacy = target(test.info()) === "legacy";
      await page.clock.install({ time: TEST_NOW });
      await loginAsStaff(page);
      await expect(staffCard(page, "r1")).toContainText("Ariele Gsell");
      await openSettings(page);
      const restaurantName = staffPanel(page, "Paramètres").getByLabel("Nom du restaurant 1");
      await expect(restaurantName).toBeVisible();
      await openDayForm(page, "r1");
      await openDayPanel(page, "r1").getByRole("button", { name: "Date", exact: true }).click();
      await expect(datePicker(page)).toBeVisible();

      // With the keyboard: a pointer outside the Date field would close the picker first (06 § 3.3).
      await modeButton(page, "client").press("Enter");
      await expect(toast(page)).toHaveText("Retour au mode client.");
      await expectNoPersonalData(page);
      await settle(page);
      const readsAfterLogout = readCount(fakeScript.requests);
      const staffReads = actionBodies(fakeScript.requests, "getAdminState").length;

      // Refresh 3 min later: blocked by the picker left open on the legacy site (a-13), public read on React.
      await page.clock.runFor("03:00");
      await settle(page);
      if (legacy) {
        expect(readCount(fakeScript.requests)).toBe(readsAfterLogout);
      } else {
        await expect.poll(() => readCount(fakeScript.requests)).toBeGreaterThan(readsAfterLogout);
      }
      expect(actionBodies(fakeScript.requests, "getAdminState")).toHaveLength(staffReads);

      // Login again, with the keyboard too (06 § 1.2: Entrée in the field).
      await modeButton(page, "staff").press("Enter");
      await passwordField(page).fill(SEED_PASSWORD);
      await passwordField(page).press("Enter");
      await veilGone(page);
      await expect(toast(page)).toHaveText("Mode collègue activé.");
      await expect(staffCard(page, "r1")).toContainText("Ariele Gsell");
      if (legacy) {
        // 06 PA 2-3 (a-13, a-14): the panels come back as they were.
        await expect(restaurantName).toBeVisible();
        await expect(datePicker(page)).toBeVisible();
      } else {
        // E-24: the logout closed them.
        await expect.poll(async () => exposed(restaurantName)).toBe(false);
        await expect.poll(async () => exposed(datePicker(page))).toBe(false);
      }

      // E-17: the legacy page saves its copy from the full state too (no etag); React only from the public one.
      const copy = await readLocalCache(page);
      if (legacy) {
        expect(copy).not.toHaveProperty("etag");
      } else {
        expect(copy).toHaveProperty("etag", "E1");
      }
    },
  );
});

test(
  "logoutPurgeAndPanels (REG-29) — write answered after the logout",
  { tag: ["@changed:E-55", "@C-30", "@p5"] },
  async ({ page, fakeScript }) => {
    await loginAsStaff(page);
    const card = staffCard(page, "r1");
    await card.getByRole("button", { name: "Modifier ce jour", exact: true }).click();
    await card.getByLabel("Nombre de couverts disponibles").fill("18");
    const release = fakeScript.hold();
    await card.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect.poll(() => actionBodies(fakeScript.requests, "editDayR1").length).toBe(1);

    await logout(page);
    await expect(toast(page)).toHaveText("Retour au mode client.");
    release();
    // The script wrote it; the answer (full state, names included) comes after the logout.
    await expect
      .poll(() => fakeScript.db.r1Days.find((day) => day.Date === TODAY)?.Capacite)
      .toBe(18);
    await settle(page);
    // The legacy page announces the write it no longer shows; on React the session guard throws the answer away,
    // toast included (E-55).
    await (target(test.info()) === "legacy"
      ? expect(toast(page)).toHaveText("Jour modifié.")
      : expect(page.getByText("Jour modifié.", { exact: true })).toHaveCount(0));
    await expectNoPersonalData(page);
    await expect(modeButton(page, "client")).toHaveAttribute("aria-pressed", "true");
    expect(new URL(page.url()).pathname).toBe("/reservations-restaurants/");
  },
);

test.describe("inactivity and password", () => {
  test.use({ fixedTime: null });

  test(
    "inactivityLogoutJourney (REG-30)",
    { tag: ["@parity", "@C-04", "@C-12", "@C-30", "@p5"] },
    async ({ page }) => {
      await page.clock.install({ time: TEST_NOW });
      await loginAsStaff(page);

      // Open a day (C-04) on 20 October, chosen in the picker.
      await openDayForm(page, "r1");
      const dayForm = openDayPanel(page, "r1");
      await dayForm.getByRole("button", { name: "Date", exact: true }).click();
      await datePicker(page)
        .getByRole("button", { name: new RegExp(`^${longDate("2026-10-20")}`, "u") })
        .click();
      await dayForm.getByLabel("Nombre de couverts disponibles").fill("12");
      await dayForm.getByRole("button", { name: "Ouvrir ce jour", exact: true }).click();
      await expect(toast(page)).toHaveText("Jour ajouté.");
      await expect(selectedDay(page, "r1")).toHaveAccessibleName(
        new RegExp(`^${longDate("2026-10-20")},`, "u"),
      );

      // Add a person (C-12): the name shows once the full state is read again.
      await openAddPerson(page, "r1");
      const card = staffCard(page, "r1");
      await card.getByLabel("Nom et prénom").fill("Zoé Lambert");
      await card.getByLabel("Classe ou service").fill("TS2");
      await card.getByLabel(/^Élèves/u).fill("2");
      await card.getByRole("button", { name: "Ajouter cette personne", exact: true }).click();
      await expect(toast(page)).toHaveText("Personne ajoutée.");
      await expect(bookingRow(page, "r1", "Zoé Lambert")).toBeVisible();

      // 06 § 1.6: an activity at 9 min pushes the logout back.
      await page.clock.fastForward("09:00");
      await page.mouse.move(10, 10);
      await page.mouse.move(20, 20);
      await page.clock.fastForward("01:30");
      await expect(bookingRow(page, "r1", "Zoé Lambert")).toBeVisible();
      await expect(modeButton(page, "staff")).toHaveAttribute("aria-pressed", "true");

      // 10 minutes and 1 second after the last activity.
      await page.clock.fastForward("08:31");
      await expect(toast(page)).toHaveText(
        "Déconnecté du mode collègue après 10 minutes d'inactivité.",
      );
      expect(await toastKind(page)).toBe("success");
      await expect(modeButton(page, "client")).toHaveAttribute("aria-pressed", "true");
      await expectNoPersonalData(page, ["Zoé Lambert"]);
    },
  );

  test(
    "passwordChanged (REG-31)",
    { tag: ["@parity", "@C-30", "@p5"] },
    async ({ page, fakeScript }) => {
      await page.clock.install({ time: TEST_NOW });
      await loginAsStaff(page);
      await expect(staffCard(page, "r1")).toContainText("Ariele Gsell");
      const readsBefore = readCount(fakeScript.requests);

      fakeScript.setPassword("autre");
      await page.clock.runFor("03:00");
      await expect(toast(page)).toHaveText(
        "Le mot de passe du mode collègue a changé. Reconnectez-vous.",
      );
      expect(await toastKind(page)).toBe("error");
      // The refresh sent the old password; the page reads the public state instead (06 § 1.7).
      expect(actionBodies(fakeScript.requests, "getAdminState").at(-1)).toStrictEqual({
        action: "getAdminState",
        password: SEED_PASSWORD,
      });
      await expect.poll(() => readCount(fakeScript.requests)).toBeGreaterThan(readsBefore);
      await expect(modeButton(page, "client")).toHaveAttribute("aria-pressed", "true");
      await expectNoPersonalData(page);
      await login(page, "autre");
      await veilGone(page);
      await expect(toast(page)).toHaveText("Mode collègue activé.");
    },
  );
});
