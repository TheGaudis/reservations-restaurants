import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { TEST_NOW } from "@/test/clock";

import { expect, test } from "./fixtures";
import { bookingR1Form, openBookingR1, submitBookingR1 } from "./pages/booking-r1";
import { calendarDays, setView } from "./pages/calendar";
import { reserveButton, seatsPill } from "./pages/day-card";
import { gotoHome, toast } from "./pages/home";
import { login, openLogin, passwordField } from "./pages/login";
import { openOrderR2, orderR2Form } from "./pages/order-r2";
import { openSettings, staffPanel } from "./pages/staff";
import { seedLocalCache } from "./pages/storage";

// Axe on complete screens of the build:e2e output (PLAN § 1.5, S5; P7): G-02, G-04 in week and month view, P-05,
// P-13, L-01, G-08, C-02 (09 § 2-4). Every rule of axe-core runs, none is disabled: 0 violation, no exception list.
// Reduced motion: the scan never reads a colour in the middle of an animation.

const DAY_MS = 86_400_000;

test.use({ reducedMotion: "reduce" });

/** One line per violation and node: rule, impact, target and axe's summary, readable in the failure message. */
async function expectNoViolation(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const report = violations.flatMap((violation) =>
    violation.nodes.map(
      (node) =>
        `${violation.id} (${violation.impact ?? "?"}) ${node.target.join(" ")}: ${node.failureSummary ?? ""}`,
    ),
  );
  expect(report, "axe violations").toStrictEqual([]);
}

async function gotoPublicPage(page: Page): Promise<void> {
  await gotoHome(page);
  await expect(page.getByRole("main")).toHaveAttribute("aria-busy", "false");
  await expect(reserveButton(page, "r1")).toBeEnabled();
  await expect(reserveButton(page, "r2")).toBeEnabled();
}

async function enterStaffMode(page: Page): Promise<void> {
  await gotoPublicPage(page);
  await login(page, SEED_PASSWORD);
  await expect(toast(page)).toHaveText("Mode collègue activé.");
  await expect(page).toHaveURL(/\/collegue$/u);
}

test("G-02: page shown from the local copy, script not answered yet", async ({
  page,
  fakeScript,
}) => {
  await seedLocalCache(page, fakeScript.db, TEST_NOW - DAY_MS);
  const release = fakeScript.hold();
  await gotoHome(page);
  await expect(seatsPill(page)).toHaveText("12 / 20 couverts");
  await expectNoViolation(page);
  release();
});

test("G-04: public page, week view", async ({ page }) => {
  await gotoPublicPage(page);
  await expectNoViolation(page);
});

test("G-04: public page, month view", async ({ page }) => {
  await gotoPublicPage(page);
  await setView(page, "r1", "month");
  await setView(page, "r2", "month");
  await expect(page).toHaveURL(/r1vue=mois.*r2vue=mois|r2vue=mois.*r1vue=mois/u);
  await expect(calendarDays(page, "r2")).toBeVisible();
  await expectNoViolation(page);
});

test("P-05: R1 booking form, then its field errors", async ({ page }) => {
  await gotoPublicPage(page);
  await openBookingR1(page);
  await expect(bookingR1Form(page)).toBeVisible();
  await expectNoViolation(page);

  await submitBookingR1(page);
  await expect(bookingR1Form(page).getByText("Indiquez vos nom et prénom.")).toBeVisible();
  await expectNoViolation(page);
});

test("P-13: R2 order form", async ({ page }) => {
  await gotoPublicPage(page);
  await openOrderR2(page);
  await expect(orderR2Form(page)).toBeVisible();
  await expectNoViolation(page);
});

test("L-01: login panel open", async ({ page }) => {
  await gotoPublicPage(page);
  await openLogin(page);
  await expect(passwordField(page)).toBeFocused();
  await expectNoViolation(page);
});

test("G-08: staff page", async ({ page }) => {
  await enterStaffMode(page);
  await expect(page.getByRole("region", { name: /^Demain \(/u })).toBeVisible();
  await expectNoViolation(page);
});

test("C-02: settings panel open", async ({ page }) => {
  await enterStaffMode(page);
  await openSettings(page);
  await expect(
    staffPanel(page, "Paramètres").getByRole("button", { name: /^Enregistrer/u }),
  ).toBeVisible();
  await expectNoViolation(page);
});
