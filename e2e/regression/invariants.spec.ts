import { expect, test } from "../fixtures";
import { fillBookingR1, bookingR1Form, openBookingR1, submitBookingR1 } from "../pages/booking-r1";
import { dayButton, goToToday, longDate, selectDay, selectedDay } from "../pages/calendar";
import { dayCard, reserveButton } from "../pages/day-card";
import { BLOCKED_FONT_PRELOAD, gotoHome } from "../pages/home";
import { pauseClock, posts, reads } from "./helpers";

// Midnight without reloading the page (PLAN § 3.4 « Minuit », R-26; 01 § 3.7): the new day reaches the calendars,
// a form already open keeps its date. Variants of the clock scenario REG-25 (invariant 4), shared by both sites.

// Monday 5 October 2026, 23:59:30 in Paris.
const BEFORE_MIDNIGHT = Date.parse("2026-10-05T21:59:30Z");
const PAST = /, passé$/u;

test.use({ reducedMotion: "reduce", fixedTime: null });

test.beforeEach(async ({ page, consoleLog }) => {
  consoleLog.allow(BLOCKED_FONT_PRELOAD);
  await pauseClock(page, BEFORE_MIDNIGHT);
});

test(
  "r2CutoffAt10 (REG-25) — midnight reaches the calendars",
  { tag: ["@parity", "@P-01", "@P-04", "@P-12", "@p4"] },
  async ({ page, fakeScript }) => {
    await gotoHome(page);
    await expect(dayButton(page, "r1", "2026-10-05")).not.toHaveAccessibleName(PAST);
    await expect(reserveButton(page, "r1")).toBeVisible();

    await page.clock.runFor(60_000);
    await goToToday(page, "r1");
    await expect(selectedDay(page, "r1")).toHaveAccessibleName(
      new RegExp(`^${longDate("2026-10-06")},`, "u"),
    );
    await expect(dayButton(page, "r1", "2026-10-05")).toHaveAccessibleName(PAST);
    await expect(reserveButton(page, "r1")).toBeVisible();

    // Tuesday before 10:00: tomorrow's dishes became today's and can still be ordered.
    await goToToday(page, "r2");
    await expect(selectedDay(page, "r2")).toHaveAccessibleName(
      new RegExp(`^${longDate("2026-10-06")},`, "u"),
    );
    await expect(dayButton(page, "r2", "2026-10-05")).toHaveAccessibleName(PAST);
    await expect(reserveButton(page, "r2")).toBeVisible();
    // Same page: one read at load, no other one within the minute.
    expect(reads(fakeScript.requests)).toHaveLength(1);
  },
);

test(
  "r2CutoffAt10 (REG-25) — midnight keeps the open form's date",
  { tag: ["@parity", "@P-05", "@p4"] },
  async ({ page, fakeScript }) => {
    await gotoHome(page);
    await selectDay(page, "r1", "2026-10-06");
    await openBookingR1(page);
    await fillBookingR1(page, {
      name: "Cyrille Ungerer",
      contact: "c.ungerer@exemple.fr",
      className: "TS2",
      students: "2",
    });

    await page.clock.runFor(60_000);
    await expect(bookingR1Form(page)).toBeVisible();
    await expect(dayCard(page, "r1").getByText(longDate("2026-10-06"))).toBeVisible();
    await submitBookingR1(page);

    await expect(bookingR1Form(page)).toHaveCount(0);
    expect(posts(fakeScript.requests)).toStrictEqual([
      expect.objectContaining({ action: "addBookingR1", date: "2026-10-06", nbEleve: 2 }),
    ]);
  },
);
