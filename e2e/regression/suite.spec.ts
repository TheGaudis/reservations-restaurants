/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import type { Page, TestInfo } from "@playwright/test";
import { http, passthrough } from "msw";

import { APPS_SCRIPT_URL_PATTERN } from "@/mocks/apps-script";

import { expect, test } from "../fixtures";
import * as bookingR1 from "../pages/booking-r1";
import * as calendar from "../pages/calendar";
import * as dayCard from "../pages/day-card";
import * as home from "../pages/home";
import * as login from "../pages/login";
import * as orderR2 from "../pages/order-r2";
import * as print from "../pages/print";
import * as staff from "../pages/staff";
import * as storage from "../pages/storage";
import * as targetModule from "../pages/target";
import { target } from "../pages/target";

// Checks of the suite itself (PLAN P1): network isolation, `@changed` tags, page object signatures.

const ROOT = join(import.meta.dirname, "../..");
const TAG_PREFIX = "@changed:";

async function fetchFromPage(page: Page, url: string): Promise<string> {
  return page.evaluate(async (address) => {
    try {
      const response = await fetch(address);
      return `answered ${response.status}`;
    } catch {
      return "failed";
    }
  }, url);
}

test(
  "networkIsolation",
  { tag: ["@framework"] },
  async ({ page, isolation, network, fakeScript }) => {
    await page.goto("./");
    await expect.poll(() => fakeScript.requests.length).toBeGreaterThan(0);
    // The site's read reached the fake script, the legacy one with the real deployment URL (R-33).
    const deployment = target(test.info()) === "legacy" ? "/macros/s/AKfycbz" : "/macros/s/FAKE/";
    expect(fakeScript.requests[0]?.url).toContain(deployment);
    if (target(test.info()) === "legacy") {
      expect(isolation.blocked.some((url) => url.startsWith("https://fonts.googleapis.com/"))).toBe(
        true,
      );
    }

    expect(await fetchFromPage(page, "https://example.com/")).toBe("failed");
    expect(isolation.blocked).toContain("https://example.com/");

    // Without the fake script, a request to the script is aborted on this machine.
    network.use(http.all(APPS_SCRIPT_URL_PATTERN, () => passthrough()));
    const scriptUrl = "https://script.google.com/macros/s/FAKE/exec?probe=1";
    expect(await fetchFromPage(page, scriptUrl)).toBe("failed");
    expect(isolation.blocked).toContain(scriptUrl);
    expect(fakeScript.requests.map((request) => request.url)).not.toContain(scriptUrl);
    expect(isolation.allowed.every((url) => new URL(url).hostname === "127.0.0.1")).toBe(true);
    // The fixture fails any test whose script request was blocked; this one was provoked.
    isolation.blocked.splice(isolation.blocked.indexOf(scriptUrl), 1);
  },
);

// Observable gaps of PLAN § 4.2: rows whose « Scénario » cell is not « n/a », struck rows excluded.
function observableGaps(): string[] {
  const plan = readFileSync(join(ROOT, "docs/migration/PLAN.md"), "utf-8");
  const section = plan.slice(plan.indexOf("### 4.2"), plan.indexOf("### 4.3"));
  return section
    .split("\n")
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((cells) => /^E-\d{2}$/u.test(cells[1] ?? "") && cells.at(-2) !== "n/a")
    .map((cells) => cells[1] ?? "");
}

// Changed tags of the regression specs (scenarios written or declared with test.fixme), this file excluded.
function changedTags(): string[] {
  const dir = join(ROOT, "e2e/regression");
  const tags = readdirSync(dir)
    .filter((file) => file.endsWith(".spec.ts") && file !== basename(import.meta.filename))
    .flatMap((file) => [
      ...readFileSync(join(dir, file), "utf-8").matchAll(/["'`](@changed:[^"'`]*)["'`]/gu),
    ])
    .map((match) => match[1] ?? "");
  return [...new Set(tags)];
}

test("changedTagsMatchPlanGaps", { tag: ["@framework"] }, () => {
  const gaps = observableGaps();
  expect(gaps.length).toBeGreaterThan(40);
  const tags = changedTags();
  expect(
    tags.filter((tag) => !/^@changed:E-\d{2}$/u.test(tag)),
    "malformed tags",
  ).toStrictEqual([]);
  expect(tags.map((tag) => tag.slice(TAG_PREFIX.length)).toSorted()).toStrictEqual(gaps.toSorted());
});

test("pageObjectSignatures", { tag: ["@framework"] }, () => {
  const exported = (module: object) => Object.keys(module).toSorted();
  expect(exported(home)).toStrictEqual([
    "column",
    "columnTitle",
    "gotoHome",
    "loadError",
    "logo",
    "retryButton",
    "retryLoad",
    "toast",
    "toastKind",
  ]);
  expect(exported(calendar)).toStrictEqual([
    "calendarDays",
    "dayButton",
    "goToToday",
    "longDate",
    "periodLabel",
    "selectDay",
    "selectedDay",
    "setView",
    "showPeriod",
  ]);
  expect(exported(dayCard)).toStrictEqual([
    "bookingSummary",
    "dayCard",
    "dishRow",
    "reserveButton",
    "seatsPill",
  ]);
  expect(exported(bookingR1)).toStrictEqual([
    "bookingR1Field",
    "bookingR1Form",
    "bookingR1Total",
    "cancelBookingR1",
    "fillBookingR1",
    "openBookingR1",
    "submitBookingR1",
  ]);
  expect(exported(orderR2)).toStrictEqual([
    "cancelOrderR2",
    "fillOrderR2",
    "openOrderR2",
    "orderR2Form",
    "orderR2Total",
    "quantityField",
    "selectedServiceMode",
    "serviceModeOption",
    "submitOrderR2",
  ]);
  expect(exported(login)).toStrictEqual([
    "login",
    "logout",
    "modeButton",
    "openLogin",
    "passwordField",
  ]);
  expect(exported(staff)).toStrictEqual([
    "bookingLines",
    "bookingRow",
    "confirmDelete",
    "datePicker",
    "openAddPerson",
    "openDayForm",
    "openDayPanel",
    "openSettings",
    "staffCard",
    "staffDish",
    "staffPanel",
  ]);
  expect(exported(print)).toStrictEqual([
    "closePrintedDocument",
    "printedDocument",
    "printedInfo",
    "printedRow",
    "stubPrint",
    "tomorrowBlock",
    "tomorrowPanel",
    "tomorrowPrintButton",
    "tomorrowSummary",
  ]);
  expect(exported(storage)).toStrictEqual(["readLocalCache", "seedLocalCache", "seedStoredTexts"]);
  expect(exported(targetModule)).toStrictEqual(["currentTarget", "notWritten", "target"]);
  expect(target({ project: { name: "legacy" } } as TestInfo)).toBe("legacy");
  expect(target({ project: { name: "react" } } as TestInfo)).toBe("react");
});
