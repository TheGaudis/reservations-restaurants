import type { Page } from "@playwright/test";

import { TEST_NOW } from "@/test/clock";

import { expect, test } from "../fixtures";
import { dayButton } from "../pages/calendar";
import { reserveButton, seatsPill } from "../pages/day-card";
import {
  BLOCKED_FONT_PRELOAD,
  columnTitle,
  gotoHome,
  loadError,
  retryButton,
  retryLoad,
} from "../pages/home";
import { readLocalCache, seedLocalCache, seedStoredTexts } from "../pages/storage";
import { target } from "../pages/target";
import { reads, windowValue } from "./helpers";

// First load, local copy and load errors (09 § 2: G-01 to G-05; 03 § 1-3). Reads under a fake clock:
// `loading-reads.spec.ts`.

const DAY = 24 * 3600 * 1000;
const ONLINE_ERROR =
  "Le service de réservation ne répond pas. Réessayez dans un instant. Si le problème continue, prévenez l'établissement.";
const OFFLINE_ERROR = "Vous semblez hors ligne. Vérifiez votre connexion internet, puis réessayez.";
const COPY_SUFFIX =
  "Le calendrier affiché date de votre dernière visite : les places restantes ont pu changer depuis.";

test.use({ reducedMotion: "reduce" });

test.beforeEach(({ consoleLog }) => {
  consoleLog.allow(BLOCKED_FONT_PRELOAD);
});

/** Load error text as read (the `<br>` of 03 § 3.1 becomes a space). */
async function expectLoadError(page: Page, text: string): Promise<void> {
  await expect(loadError(page)).toHaveText(text, { useInnerText: true });
}

async function savedAt(page: Page): Promise<unknown> {
  const copy = await readLocalCache(page);
  return copy?.["savedAt"];
}

test(
  "shellSkeletonWithStoredTitles (REG-01)",
  { tag: ["@parity", "@G-01", "@G-04", "@p4"] },
  async ({ page, fakeScript }) => {
    await seedStoredTexts(page, { name1: "Resto Test" });
    const release = fakeScript.hold();
    await gotoHome(page);

    // G-01: stored title, default second title, skeleton without any text, no day yet.
    const skeleton = async () => {
      await expect(columnTitle(page, "r1")).toHaveText("Resto Test");
      await expect(columnTitle(page, "r2")).toHaveText("Aristide");
      await expect(
        page.getByRole("button", { name: /^\S+ \d{1,2}(?:er)? \S+ \d{4}, /u }),
      ).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Réserver" })).toHaveCount(0);
      await expect(page.getByText(/Chargement/u)).toHaveCount(0);
      await expect(loadError(page)).toBeHidden();
    };
    await skeleton();
    // The read is held 2 s: the skeleton stays, without any message.
    await page.waitForTimeout(2000);
    await skeleton();

    release();
    await expect(columnTitle(page, "r1")).toHaveText("Restaurant Pédagogique");
    await expect(dayButton(page, "r1", "2026-10-05")).toBeVisible();
    await expect(seatsPill(page)).toHaveText("12 / 20 couverts");
    expect(reads(fakeScript.requests)).toStrictEqual([""]);
  },
);

test(
  "localCacheFirstRender (REG-02)",
  { tag: ["@changed:E-47", "@G-02", "@p4"] },
  async ({ page, fakeScript }) => {
    await seedLocalCache(page, fakeScript.db, TEST_NOW - DAY);
    // First day button of the page: present when the document is parsed (legacy), or in ms after the prerendered
    // skeleton (`main[aria-busy="true"]`) entered the DOM (React).
    await page.addInitScript(() => {
      const marks = { skeletonAt: -1, shownAt: -1, shownWhenParsed: false };
      const skeleton = () => document.querySelector('main[aria-busy="true"]') !== null;
      const shown = () => document.querySelector('button[aria-label*=" 2026, "]') !== null;
      new MutationObserver(() => {
        if (marks.skeletonAt < 0 && skeleton()) marks.skeletonAt = performance.now();
        if (marks.shownAt < 0 && shown()) marks.shownAt = performance.now();
      }).observe(document, { childList: true, subtree: true });
      document.addEventListener("DOMContentLoaded", () => {
        marks.shownWhenParsed = shown();
      });
      Object.assign(window, { e2eMarks: marks });
    });
    const release = fakeScript.hold();
    await gotoHome(page);

    // The copy is on screen and bookable before the script answers.
    await expect(seatsPill(page)).toHaveText("12 / 20 couverts");
    await expect(page.getByText("Salade de saison, pavé de saumon, crème brûlée")).toBeVisible();
    await expect(reserveButton(page, "r1")).toBeEnabled();
    await expect(reserveButton(page, "r2")).toBeEnabled();
    expect(reads(fakeScript.requests)).toStrictEqual(["?since=E1"]);

    const marks = await windowValue<{
      skeletonAt: number;
      shownAt: number;
      shownWhenParsed: boolean;
    }>(page, "e2eMarks");
    if (target(test.info()) === "legacy") {
      // The copy replaces the skeleton while the document is parsed (03 § 2.3).
      expect(marks.shownWhenParsed).toBe(true);
    } else {
      // E-47, S4: skeleton of the prerendered shell until hydration, shown 600 ms at most. Counted from the moment
      // the skeleton enters the DOM, before its first paint: the time spent before (document and stylesheets routed
      // through the test runner, Playwright's clock script) is not skeleton time.
      expect(marks.skeletonAt).toBeGreaterThan(0);
      expect(marks.shownAt).toBeGreaterThan(marks.skeletonAt);
      expect(marks.shownAt - marks.skeletonAt).toBeLessThanOrEqual(600);
    }

    release();
    // { unchanged }: the copy becomes the current state and is written again with a new date.
    await expect.poll(async () => savedAt(page)).toBe(TEST_NOW);
    expect(await readLocalCache(page)).toMatchObject({ etag: "E1" });
    await expect(seatsPill(page)).toHaveText("12 / 20 couverts");
    expect(reads(fakeScript.requests)).toStrictEqual(["?since=E1"]);
  },
);

test(
  "loadErrorOnlineRetry (REG-04)",
  { tag: ["@parity", "@G-03", "@p4"] },
  async ({ page, fakeScript }) => {
    fakeScript.failNext("html");
    fakeScript.failNext("html");
    await gotoHome(page);

    // The first read and its new attempt get Google's error page.
    await expectLoadError(page, ONLINE_ERROR);
    await expect(loadError(page).locator("b, strong")).toHaveText(
      "Le service de réservation ne répond pas.",
    );
    expect(reads(fakeScript.requests)).toStrictEqual(["", ""]);

    const release = fakeScript.hold();
    await retryLoad(page);
    // The box stays while the button shows the wait (03 § 3.2).
    await expect(retryButton(page)).toHaveText("Nouvelle tentative…");
    await expect(retryButton(page)).toBeDisabled();
    await expect(retryButton(page)).toHaveAttribute("aria-busy", "true");
    await expect(loadError(page)).toBeVisible();
    release();

    await expect(loadError(page)).toBeHidden();
    await expect(seatsPill(page)).toHaveText("12 / 20 couverts");
    expect(reads(fakeScript.requests)).toStrictEqual(["", "", ""]);
  },
);

test(
  "loadErrorOfflineWithCopy (REG-05)",
  { tag: ["@parity", "@G-03", "@G-02", "@p4"] },
  async ({ page, context, fakeScript }) => {
    await seedLocalCache(page, fakeScript.db, TEST_NOW - DAY);
    const release = fakeScript.hold();
    fakeScript.failNext("html");
    await gotoHome(page);
    await expect(seatsPill(page)).toHaveText("12 / 20 couverts");
    await context.setOffline(true);
    release();

    await expectLoadError(page, `${OFFLINE_ERROR} ${COPY_SUFFIX}`);
    // The copy stays on screen and bookable.
    await expect(seatsPill(page)).toHaveText("12 / 20 couverts");
    await expect(reserveButton(page, "r1")).toBeEnabled();
    expect(reads(fakeScript.requests)).toStrictEqual(["?since=E1"]);
  },
);

test(
  "configMissingBanner (REG-07)",
  { tag: ["@changed:E-29", "@G-05", "@p4", "@legacy-only"] },
  async ({ page }) => {
    const banner = page.getByText(/Configuration manquante/u);
    if (target(test.info()) === "react") {
      // The script URL is fixed at build time (.env.test): the banner and its D-05 text are covered by the
      // story and the Vitest test of `ConfigBanner` (F-07). Here, a valid URL shows no banner.
      await gotoHome(page);
      await expect(columnTitle(page, "r1")).toHaveText("Restaurant Pédagogique");
      await expect(banner).toBeHidden();
      return;
    }
    // Legacy: the page served with the placeholder of the original setup (03 § 3).
    await page.route("**/reservations-restaurants/", async (route) => {
      const response = await route.fetch();
      const original = await response.text();
      const html = original.replace(
        /const APPS_SCRIPT_URL = "[^"]*";/u,
        'const APPS_SCRIPT_URL = "https://script.google.com/macros/s/COLLE_ICI/exec";',
      );
      await route.fulfill({ response, body: html });
    });
    await gotoHome(page);
    await expect(banner).toHaveText(
      "⚠ Configuration manquante : ouvre ce fichier et remplace APPS_SCRIPT_URL par l'URL de ton déploiement Apps Script (tout en haut du fichier, dans le <head>).",
    );
  },
);
