import type { Locator, Page } from "@playwright/test";

import type { FakeAppsScript } from "@/mocks/apps-script";
import type { R1BookingRow, R2BookingRow } from "@/mocks/fake-db";
import { TEST_NOW } from "@/test/clock";

// Helpers shared by the public scenarios: requests received by the fake script, page clock, raw texts.

type Requests = FakeAppsScript["requests"];

/** Query strings of the reads (GET) received, in order (`""` or `?since=E1`). */
export function reads(requests: Requests): string[] {
  return requests.filter((r) => r.method === "GET").map((r) => new URL(r.url).search);
}

/** Parsed bodies of the writes (POST) received, in order. */
export function posts(requests: Requests): Array<Record<string, unknown>> {
  return requests.filter((r) => r.method === "POST").map((r) => r.json as Record<string, unknown>);
}

/** Fake page clock paused at `time`: page timers only fire through `runFor` (call before `goto`). */
export async function pauseClock(page: Page, time = TEST_NOW): Promise<void> {
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
}

/** Lets a request sent by a page timer reach the fake script (real time; the page clock stays paused). */
export async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(300);
}

/** Texts as rendered, non-breaking spaces kept (Playwright's text matchers turn them into spaces). */
export async function rawTexts(scope: Locator | Page, text: RegExp): Promise<string[]> {
  return scope.getByText(text).allTextContents();
}

/** True when one of the elements is visible and neither inert nor hidden from assistive technologies. */
export async function exposed(locator: Locator): Promise<boolean> {
  return locator.evaluateAll((elements) =>
    elements.some(
      (element) =>
        element.closest('[inert], [aria-hidden="true"]') === null && element.checkVisibility(),
    ),
  );
}

/** Hides or shows the tab as the page sees it (`document.hidden`, `visibilityState`, `visibilitychange`). */
export async function setHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((isHidden) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => isHidden });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (isHidden ? "hidden" : "visible"),
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

/** R1 booking of another visitor, to write straight into the script's sheet. */
export function otherBookingR1(date: string, seats: number): R1BookingRow {
  return {
    ID: `r1b-other-${date}`,
    Date: date,
    Nom: "Autre visiteur",
    Contact: "autre@exemple.fr",
    Classe: "TS1",
    Qte: seats,
    Timestamp: date,
    Observation: "",
    NbEleve: seats,
    NbProf: 0,
    NbExt: 0,
    PrixTotal: seats * 4.95,
  };
}

/** R2 order of another visitor for today's dish `itemId`, to write straight into the script's sheet. */
export function otherOrderR2(itemId: string, portions: number): R2BookingRow {
  return {
    ID: `r2b-other-${itemId}`,
    ItemID: itemId,
    Date: "2026-10-05",
    Nom: "Autre visiteur",
    Contact: "autre@exemple.fr",
    Classe: "TS1",
    Qte: portions,
    Mode: "surplace",
    Timestamp: "2026-10-05",
    Observation: "",
  };
}

/** Value that a test stored on `window` from an init script. */
export async function windowValue<T>(page: Page, key: string): Promise<T> {
  return page.evaluate(
    (name) => (window as unknown as Record<string, unknown>)[name],
    key,
  ) as Promise<T>;
}
