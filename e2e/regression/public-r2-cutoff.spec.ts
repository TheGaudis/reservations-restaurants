import { expect, test } from "../fixtures";
import { longDate } from "../pages/calendar";
import { dayCard, dishRow, reserveButton } from "../pages/day-card";
import { BLOCKED_FONT_PRELOAD, gotoHome, toast, toastKind } from "../pages/home";
import { fillOrderR2, openOrderR2, orderR2Form, submitOrderR2 } from "../pages/order-r2";
import { target } from "../pages/target";
import { pauseClock, posts } from "./helpers";

// R2 orders closed at 10:00, Paris time (09 § 3: P-13, P-15, P-12; 04 § 4.3, § 5.3; 03 § 5.3; invariant 4).

const PERSON = { name: "Ariele Gsell", contact: "a.gsell@exemple.fr", className: "Vie scolaire" };
const CLOSED =
  "Commandes en ligne clôturées à 10h. Venez au restaurant Aristide à partir de 12h pour commander sur place.";

test.use({ reducedMotion: "reduce" });

test.beforeEach(({ consoleLog }) => {
  consoleLog.allow(BLOCKED_FONT_PRELOAD);
});

test.describe("r2CutoffAt10 (REG-25)", () => {
  const BEFORE_TEN = Date.parse("2026-10-05T07:59:30Z");
  test.use({ fixedTime: null });

  test.beforeEach(async ({ page }) => {
    await pauseClock(page, BEFORE_TEN);
  });

  test(
    "r2CutoffAt10 (REG-25) — the open form at 10:00",
    { tag: ["@changed:E-09", "@P-13", "@P-15", "@p4"] },
    async ({ page }) => {
      await gotoHome(page);
      await openOrderR2(page);
      await fillOrderR2(page, { quantities: { Lasagnes: "1" }, name: PERSON.name });

      await page.clock.runFor(29_000);
      await expect(orderR2Form(page)).toBeVisible();
      await page.clock.runFor(2000);
      await expect(orderR2Form(page)).toHaveCount(0);
      const card = dayCard(page, "r2");
      await expect(card.getByText(CLOSED, { exact: true })).toBeVisible();
      await expect(reserveButton(page, "r2")).toHaveCount(0);
      // Menu, prices and stock stay on the card (04 § 4.3).
      await expect(dishRow(page, "Lasagnes")).toBeVisible();
      if (target(test.info()) === "legacy") {
        // Closed without a word (03 PA 7).
        await expect(toast(page)).toHaveText("");
      } else {
        // E-09: the neutral toast of the cut-off.
        await expect(toast(page)).toHaveText(CLOSED);
        expect(await toastKind(page)).toBe("success");
      }
    },
  );

  test(
    "r2CutoffAt10 (REG-25) — checked again on sending",
    { tag: ["@changed:E-09", "@P-13", "@P-15", "@p4"] },
    async ({ page, fakeScript }) => {
      await gotoHome(page);
      await openOrderR2(page);
      await fillOrderR2(page, { quantities: { Lasagnes: "1" }, ...PERSON });
      // 10:00:01 without running the page timers: only the check on sending can see it.
      await page.clock.setSystemTime(BEFORE_TEN + 31_000);
      await submitOrderR2(page);

      await expect(toast(page)).toHaveText(CLOSED);
      expect(await toastKind(page)).toBe("success");
      await expect(orderR2Form(page)).toHaveCount(0);
      expect(posts(fakeScript.requests)).toStrictEqual([]);
    },
  );
});

test.describe("r2ParisTime (REG-26)", () => {
  // 10:30 in Paris, 4:30 in New York.
  test.use({ timezoneId: "America/New_York", fixedTime: Date.parse("2026-10-05T08:30:00Z") });

  test(
    "r2ParisTime (REG-26)",
    { tag: ["@changed:E-01", "@P-12", "@P-15", "@p4"] },
    async ({ page }) => {
      await gotoHome(page);
      const card = dayCard(page, "r2");
      await expect(card).toContainText(longDate("2026-10-05"));
      await expect(dishRow(page, "Lasagnes")).toBeVisible();
      if (target(test.info()) === "legacy") {
        // The device's clock says 4:30: orders still open.
        await expect(reserveButton(page, "r2")).toBeVisible();
        await expect(card.getByText(CLOSED)).toHaveCount(0);
      } else {
        // E-01: Paris time decides.
        await expect(card.getByText(CLOSED, { exact: true })).toBeVisible();
        await expect(reserveButton(page, "r2")).toHaveCount(0);
      }
    },
  );
});
