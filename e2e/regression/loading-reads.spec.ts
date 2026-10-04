import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures";
import {
  bookingR1Field,
  bookingR1Form,
  fillBookingR1,
  openBookingR1,
  submitBookingR1,
} from "../pages/booking-r1";
import { selectDay } from "../pages/calendar";
import { bookingSummary, seatsPill } from "../pages/day-card";
import { gotoHome, loadError, retryLoad } from "../pages/home";
import { target } from "../pages/target";
import {
  otherBookingR1,
  pauseClock,
  posts,
  reads,
  setHidden,
  settle,
  windowValue,
} from "./helpers";

// Reads under a fake page clock (09 § 2: G-01, G-03, G-04; 02 § 1.5, 03 § 5): read doubled at 6 s, new attempt
// at 1.5 s, refresh every 3 min.

const ONLINE_ERROR =
  "Le service de réservation ne répond pas. Réessayez dans un instant. Si le problème continue, prévenez l'établissement.";
const OFFLINE_ERROR = "Vous semblez hors ligne. Vérifiez votre connexion internet, puis réessayez.";

test.use({ reducedMotion: "reduce", fixedTime: null });

/** Load error text as read (the `<br>` of 03 § 3.1 becomes a space). */
async function expectLoadError(page: Page, text: string): Promise<void> {
  await expect(loadError(page)).toHaveText(text, { useInnerText: true });
}

/** Waits for the next answer with Google's error page (status 500). */
async function errorPage(page: Page): Promise<void> {
  await page.waitForResponse((response) => response.status() === 500);
}

test(
  "hedgedReadAndRetry (REG-03) — second read at 6 s",
  { tag: ["@parity", "@G-01", "@p4"] },
  async ({ page, fakeScript }) => {
    await pauseClock(page);
    const releaseFirst = fakeScript.hold();
    await gotoHome(page);
    await expect.poll(() => reads(fakeScript.requests)).toStrictEqual([""]);

    await page.clock.runFor(5999);
    await settle(page);
    expect(reads(fakeScript.requests)).toStrictEqual([""]);
    await page.clock.runFor(1);
    // The second read answers first and wins.
    await expect.poll(() => reads(fakeScript.requests)).toStrictEqual(["", ""]);
    await expect(seatsPill(page)).toHaveText("12 / 20 couverts");
    releaseFirst();
  },
);

test(
  "hedgedReadAndRetry (REG-03) — new attempt 1.5 s after an error page",
  { tag: ["@parity", "@G-01", "@p4"] },
  async ({ page, fakeScript }) => {
    await pauseClock(page);
    fakeScript.failNext("html");
    const failed = errorPage(page);
    await gotoHome(page);
    await failed;
    await settle(page);

    await page.clock.runFor(1499);
    await settle(page);
    expect(reads(fakeScript.requests)).toStrictEqual([""]);
    await page.clock.runFor(1);
    await expect.poll(() => reads(fakeScript.requests)).toStrictEqual(["", ""]);
    await expect(seatsPill(page)).toHaveText("12 / 20 couverts");
    await expect(loadError(page)).toBeHidden();
  },
);

test(
  "hedgedReadAndRetry (REG-03) — no new attempt offline",
  { tag: ["@parity", "@G-01", "@p4"] },
  async ({ page, context, fakeScript }) => {
    await pauseClock(page);
    const release = fakeScript.hold();
    fakeScript.failNext("html");
    await gotoHome(page);
    await expect.poll(() => reads(fakeScript.requests)).toStrictEqual([""]);
    await context.setOffline(true);
    const failed = errorPage(page);
    release();
    await failed;
    await settle(page);

    // The alert text is written at the next animation frame (03 § 3).
    await page.clock.runFor(100);
    await expectLoadError(page, OFFLINE_ERROR);
    await page.clock.runFor(10_000);
    await settle(page);
    expect(reads(fakeScript.requests)).toStrictEqual([""]);
  },
);

test(
  "hedgedReadAndRetry (REG-03) — a read that never answers",
  { tag: ["@changed:E-45", "@G-01", "@p4"] },
  async ({ page, fakeScript }) => {
    await pauseClock(page);
    const releases = Array.from({ length: 6 }, () => fakeScript.hold());
    await gotoHome(page);
    await expect.poll(() => reads(fakeScript.requests)).toStrictEqual([""]);

    await page.clock.runFor("01:30");
    await settle(page);
    if (target(test.info()) === "legacy") {
      // No time limit: the first read and its double wait for ever.
      expect(reads(fakeScript.requests)).toStrictEqual(["", ""]);
      await expect(loadError(page)).toBeHidden();
    } else {
      // E-45: each read gives up after 30 s, then fails like any other read.
      await expectLoadError(page, ONLINE_ERROR);
    }
    for (const release of releases) release();
    if (target(test.info()) === "react") {
      // E-45: the abandoned reads answer no one; « Réessayer » starts a new read (03 § 3.2).
      await retryLoad(page);
    }
    await expect(seatsPill(page)).toHaveText("12 / 20 couverts");
  },
);

test(
  "loadErrorNotReannounced (REG-06)",
  { tag: ["@changed:E-42", "@G-03", "@p4"] },
  async ({ page, fakeScript }) => {
    for (let i = 0; i < 12; i += 1) fakeScript.failNext("html");
    // Each time the alert gets a new non-empty text, it is announced again (03 § 3).
    await page.addInitScript(() => {
      const marks = { announced: 0, last: "" };
      new MutationObserver(() => {
        const text = [...document.querySelectorAll('[role="alert"]')]
          .map((element) => element.textContent)
          .join("");
        if (text !== marks.last && text !== "") marks.announced += 1;
        marks.last = text;
      }).observe(document, { childList: true, subtree: true, characterData: true });
      Object.assign(window, { e2eMarks: marks });
    });
    await pauseClock(page);
    const failed = errorPage(page);
    await gotoHome(page);
    await failed;
    await settle(page);
    const retried = errorPage(page);
    await page.clock.runFor(1500);
    await retried;
    await settle(page);
    await page.clock.runFor(100);
    await expectLoadError(page, ONLINE_ERROR);

    // Six minutes: two refreshes (3 and 6 min), each with its new attempt 1.5 s later.
    for (let minute = 0; minute < 6; minute += 1) {
      await page.clock.runFor("01:00");
      await settle(page);
      await page.clock.runFor(2000);
      await settle(page);
    }
    await page.clock.runFor(20_000);
    await expectLoadError(page, ONLINE_ERROR);
    const marks = await windowValue<{ announced: number }>(page, "e2eMarks");
    // Legacy: written again at each refresh; React: once (E-42).
    expect(marks.announced).toBe(target(test.info()) === "legacy" ? 3 : 1);
  },
);

test(
  "refreshContinuesUnderOpenForm (REG-08)",
  { tag: ["@changed:E-08", "@G-04", "@P-05", "@p4"] },
  async ({ page, fakeScript }) => {
    const { db } = fakeScript;
    await pauseClock(page);
    await gotoHome(page);
    await selectDay(page, "r1", "2026-10-06");
    await openBookingR1(page);
    const legend = bookingR1Form(page).getByRole("group", { name: /au maximum/u });
    await expect(legend).toHaveAccessibleName("Nombre de personnes (5 au maximum)");

    // A first refused send gives the form its requestId.
    await fillBookingR1(page, {
      name: "Jean",
      contact: "jean.dupuis@exemple.fr",
      className: "TS2",
      students: "1",
    });
    fakeScript.failNext("error");
    await submitBookingR1(page);
    await expect.poll(() => posts(fakeScript.requests).length).toBe(1);
    const name = bookingR1Field(page, "name");
    await name.click();
    await name.press("End");
    await name.pressSequentially(" Dupuis");

    // Another visitor books 2 of the 5 seats; the refresh comes 3 min after the page load.
    await page.clock.runFor("01:00");
    db.r1Bookings.push(otherBookingR1("2026-10-06", 2));
    await page.clock.runFor("02:00");
    await settle(page);
    if (target(test.info()) === "legacy") {
      // Typing in an open form: the refresh is skipped (03 § 5.1).
      expect(reads(fakeScript.requests)).toStrictEqual([""]);
      await expect(legend).toHaveAccessibleName("Nombre de personnes (5 au maximum)");
    } else {
      // E-08: the refresh goes on under the form.
      await expect.poll(() => reads(fakeScript.requests).length).toBe(2);
      await expect(legend).toHaveAccessibleName("Nombre de personnes (3 au maximum)");
    }
    // Input and focus kept (03 § 5.4).
    await expect(name).toHaveValue("Jean Dupuis");
    await expect(name).toBeFocused();

    // Same requestId after the refresh (invariant 3).
    await submitBookingR1(page);
    await expect(bookingSummary(page, "r1")).toBeVisible();
    const ids = posts(fakeScript.requests).map((body) => body["requestId"]);
    expect(ids).toHaveLength(2);
    expect(typeof ids[0]).toBe("string");
    expect(ids[1]).toBe(ids[0]);

    // Hidden tab: no read; back in view: one read at once (03 § 5.1).
    const readsBefore = reads(fakeScript.requests).length;
    await setHidden(page, true);
    await page.clock.runFor("04:00");
    await settle(page);
    expect(reads(fakeScript.requests)).toHaveLength(readsBefore);
    await setHidden(page, false);
    await expect.poll(() => reads(fakeScript.requests).length).toBe(readsBefore + 1);
  },
);
