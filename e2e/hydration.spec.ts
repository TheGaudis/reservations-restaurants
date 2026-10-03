import type { Page } from "@playwright/test";

import type { FakeAppsScript } from "@/mocks/apps-script";

import { expect, test } from "./fixtures";

// S4 (PLAN § 1.5, arbitrage 16) on the build:e2e output: first render from the local copy while the fake script
// holds its answer for 5 s. A MutationObserver installed before any page script timestamps every switch between the
// visible skeleton (main[aria-busy=true]) and the visible content. The fixtures fail the test on any console error.
const SCRIPT_URL = "https://script.google.com/macros/s/FAKE/exec";
const HOLD_MS = 5000;
const SKELETON_MAX_MS = 600;

interface Sample {
  t: number;
  view: "none" | "skeleton" | "content";
}

declare global {
  interface Window {
    hydrationTimeline: Sample[];
  }
}

// Holds the first read of the fake script for HOLD_MS from now (call before goto); `responses` records the release.
function holdScript(fakeScript: FakeAppsScript): { requests: () => string[]; responses: number[] } {
  const responses: number[] = [];
  const release = fakeScript.hold();
  setTimeout(() => {
    release();
    responses.push(Date.now());
  }, HOLD_MS);
  return { requests: () => fakeScript.requests.map((request) => request.url), responses };
}

async function installTimeline(page: Page, storage: Record<string, unknown>): Promise<void> {
  await page.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      const json = JSON.stringify(value).replace('"__SAVED_AT__"', String(Date.now() - 60_000));
      localStorage.setItem(key, json);
    }
    window.hydrationTimeline = [];
    const visible = (selector: string) =>
      [...document.querySelectorAll<HTMLElement>(selector)].some((el) => el.checkVisibility());
    const sample = () => {
      let view: Sample["view"] = "none";
      if (visible('main:not([aria-busy="true"])')) view = "content";
      else if (visible('main[aria-busy="true"]')) view = "skeleton";
      if (window.hydrationTimeline.at(-1)?.view !== view) {
        window.hydrationTimeline.push({ t: Math.round(performance.now()), view });
      }
    };
    new MutationObserver(sample).observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "aria-busy", "hidden"],
    });
  }, storage);
}

const LOCAL_COPY = {
  savedAt: "__SAVED_AT__",
  etag: "ETAG-LOCAL",
  config: {
    name1: "Restaurant de la copie",
    name2: "Aristide de la copie",
    desc1: "",
    desc2: "",
    contactAnnulation: "l'établissement",
    priceEleve: "4.95",
    priceProf: "6.10",
    priceExterieur: "9.90",
  },
  r1Used: {},
  r2Used: {},
  r1Days: [],
  r2Days: [],
  r2Items: [],
};

test("first render from the local copy, before any script response", async ({
  page,
  fakeScript,
}) => {
  const script = holdScript(fakeScript);
  await installTimeline(page, { "reservations-cache-v1": LOCAL_COPY });

  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Restaurant de la copie" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aristide de la copie" })).toBeVisible();
  expect(script.responses).toStrictEqual([]);
  // The inline script of the <head> sent the etag of the copy (03 § 2.1).
  expect(script.requests()).toContain(`${SCRIPT_URL}?since=ETAG-LOCAL`);

  await expect.poll(() => script.responses.length, { timeout: HOLD_MS + 2000 }).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  const timeline = await page.evaluate(() => window.hydrationTimeline);
  test.info().annotations.push({ type: "timeline", description: JSON.stringify(timeline) });

  const firstSkeleton = timeline.find((s) => s.view === "skeleton");
  const firstContent = timeline.findIndex((s) => s.view === "content");
  expect(firstSkeleton).toBeDefined();
  expect(firstContent).toBeGreaterThan(-1);
  const contentAt = timeline[firstContent]?.t ?? Number.POSITIVE_INFINITY;
  expect(contentAt - (firstSkeleton?.t ?? 0)).toBeLessThanOrEqual(SKELETON_MAX_MS);
  // Never back to the skeleton (or to nothing) once the content shows.
  expect(timeline.slice(firstContent).map((s) => s.view)).toStrictEqual(["content"]);
});

test("stored titles only: the skeleton stays, without hydration error", async ({
  page,
  fakeScript,
}) => {
  const script = holdScript(fakeScript);
  await installTimeline(page, {
    "reservations-textes": {
      name1: "Titre mémorisé",
      name2: "Aristide mémorisé",
      desc1: "",
      desc2: "",
    },
  });

  await page.goto("./");
  await page.waitForTimeout(1500);
  expect(script.responses).toStrictEqual([]);
  // No copy: the inline script reads without etag.
  expect(script.requests()).toStrictEqual([SCRIPT_URL]);
  await expect(page.getByRole("main")).toHaveAttribute("aria-busy", "true");

  await expect.poll(() => script.responses.length, { timeout: HOLD_MS + 2000 }).toBeGreaterThan(0);
  const timeline = await page.evaluate(() => window.hydrationTimeline);
  test.info().annotations.push({ type: "timeline", description: JSON.stringify(timeline) });
  expect(timeline.map((s) => s.view)).not.toContain("content");
});
