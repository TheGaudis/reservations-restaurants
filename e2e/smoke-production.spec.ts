import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { parisDate } from "@/domain/paris";

import { bookingR1Form, cancelBookingR1, openBookingR1 } from "./pages/booking-r1";
import { calendarDays, periodLabel, selectedDay, setView, showPeriod } from "./pages/calendar";
import { columnTitle, loadError } from "./pages/home";
import { readLocalCache } from "./pages/storage";

/**
 * Read-only checks of the published site after the switch (PLAN P8, § 7), on the real script and its real data:
 * `pnpm test:e2e:production` (playwright.production.config.ts), never in `pnpm test:e2e` nor in the CI. No click
 * on a submit button; the `readOnly` fixture also aborts any request to the script other than a GET.
 */

const SCRIPT_HOSTS = new Set(["script.google.com", "script.googleusercontent.com"]);
// Fields of the public answer's bookings (02 § 3.2): totals only, no name nor contact (invariant 1).
const PUBLIC_BOOKING_FIELDS = new Set(["Date", "ItemID", "Qte"]);
const MONTH_LABEL = /^\S+ \d{4}$/u;

interface Fixtures {
  /** Requests to the script other than a GET, aborted before they leave the browser. */
  readOnly: string[];
  /** Uncaught page errors and console errors, failed resources excepted (aborted writes, 404 of a deep link). */
  pageErrors: string[];
}

const test = base.extend<Fixtures>({
  readOnly: [
    async ({ context }, use) => {
      const aborted: string[] = [];
      await context.route(
        (url) => SCRIPT_HOSTS.has(url.hostname),
        async (route) => {
          if (route.request().method() === "GET") {
            await route.fallback();
            return;
          }
          aborted.push(`${route.request().method()} ${route.request().url()}`);
          await route.abort("blockedbyclient");
        },
      );
      await use(aborted);
      expect(aborted, "requests to the script other than a GET").toStrictEqual([]);
    },
    { auto: true },
  ],
  pageErrors: [
    async ({ context }, use) => {
      const errors: string[] = [];
      context.on("weberror", (error) => errors.push(error.error().message));
      context.on("console", (message) => {
        if (message.type() !== "error") return;
        if (message.text().startsWith("Failed to load resource")) return;
        errors.push(message.text());
      });
      await use(errors);
      expect(errors, "page errors and console errors").toStrictEqual([]);
    },
    { auto: true },
  ],
});

interface PublicAnswer {
  r1Days?: Array<{ Date?: unknown; Capacite?: unknown }>;
  r1Bookings?: Array<Record<string, unknown>>;
  r2Bookings?: Array<Record<string, unknown>>;
}

/** Opens the public page and returns the first full answer of the script (no local copy in a new context). */
async function openWithAnswer(page: Page): Promise<PublicAnswer> {
  const answer = page.waitForResponse(
    (response) =>
      SCRIPT_HOSTS.has(new URL(response.url()).hostname) &&
      response.request().method() === "GET" &&
      response.status() === 200,
  );
  const response = await page.goto("./");
  expect(response?.status()).toBe(200);
  const scriptResponse = await answer;
  return (await scriptResponse.json()) as PublicAnswer;
}

/** First R1 day after today (Paris) with seats left, from the public answer (01 § 3.1); null when none. */
function bookableR1Day(answer: PublicAnswer, today: string): string | null {
  const booked = new Map<string, number>();
  for (const booking of answer.r1Bookings ?? []) {
    const date = String(booking["Date"]).slice(0, 10);
    booked.set(date, (booked.get(date) ?? 0) + Number(booking["Qte"]));
  }
  const days = (answer.r1Days ?? [])
    .map((day) => ({ date: String(day.Date).slice(0, 10), capacity: Number(day.Capacite) }))
    .filter(({ date, capacity }) => date > today && capacity - (booked.get(date) ?? 0) > 0)
    .map(({ date }) => date)
    .toSorted();
  return days[0] ?? null;
}

test("public page loads from the real script, without personal data", async ({ page }) => {
  const answer = await openWithAnswer(page);
  await expect(page).toHaveTitle("Réservations — Restaurants pédagogiques");
  await expect(page.getByRole("main")).toHaveAttribute("aria-busy", "false");
  await expect(columnTitle(page, "r1")).toBeVisible();
  await expect(columnTitle(page, "r2")).toBeVisible();
  await expect(calendarDays(page, "r1")).toBeVisible();
  await expect(calendarDays(page, "r2")).toBeVisible();
  // The build has the script URL (D-05), and is not the development server on real data (DevDataBanner).
  await expect(page.getByText(/^Configuration manquante/u)).toHaveCount(0);
  await expect(page.getByText("Données réelles", { exact: true })).toHaveCount(0);
  await expect(loadError(page)).toHaveCount(0);

  const bookingFields = [...(answer.r1Bookings ?? []), ...(answer.r2Bookings ?? [])].flatMap(
    (booking) => Object.keys(booking),
  );
  expect(bookingFields.filter((field) => !PUBLIC_BOOKING_FIELDS.has(field))).toStrictEqual([]);
});

test("local copy shown at once when the script does not answer (03 § 1.1, R-21)", async ({
  page,
  context,
}) => {
  await openWithAnswer(page);
  await expect
    .poll(async () => {
      const copy = await readLocalCache(page);
      return copy?.["etag"];
    })
    .toBeTruthy();
  const names = [
    await columnTitle(page, "r1").textContent(),
    await columnTitle(page, "r2").textContent(),
  ];

  // The second visit reads nothing: the page shows the copy.
  await context.route(
    (url) => SCRIPT_HOSTS.has(url.hostname),
    async (route) => {
      await route.abort("blockedbyclient");
    },
  );
  await page.reload();
  await expect(columnTitle(page, "r1")).toHaveText(names[0] ?? "", { timeout: 5000 });
  await expect(columnTitle(page, "r2")).toHaveText(names[1] ?? "", { timeout: 5000 });
  await expect(selectedDay(page, "r1")).toBeVisible({ timeout: 5000 });
  await expect(selectedDay(page, "r2")).toBeVisible({ timeout: 5000 });
});

test("calendars: month view in the URL, next period (05 § 2-3)", async ({ page }) => {
  await openWithAnswer(page);
  for (const restaurant of ["r1", "r2"] as const) {
    await setView(page, restaurant, "month");
    await expect(page).toHaveURL(new RegExp(`[?&]${restaurant}vue=mois`, "u"));
    const label = periodLabel(page, restaurant);
    await expect(label).toHaveText(MONTH_LABEL);
    const month = await label.textContent();
    await showPeriod(page, restaurant, "next");
    await expect(label).not.toHaveText(month ?? "");
    await setView(page, restaurant, "week");
  }
});

test("R1 booking form opens and closes without sending (04 § 5.2)", async ({ page }) => {
  const answer = await openWithAnswer(page);
  const day = bookableR1Day(answer, parisDate(Date.now()));
  expect(
    day,
    "no R1 day with seats left after today in the real data: open a form by hand (docs/migration/bascule.md)",
  ).not.toBeNull();

  await page.goto(`./?r1=${day ?? ""}`);
  await openBookingR1(page);
  await expect(bookingR1Form(page)).toBeVisible();
  await cancelBookingR1(page);
  await expect(bookingR1Form(page)).toHaveCount(0);
});

test("deep link /collegue: 404.html, then the login panel (PLAN § 3.2, § 7)", async ({ page }) => {
  const response = await page.goto("./collegue");
  expect(response?.status()).toBe(404);
  await expect(page.getByLabel("Mot de passe collègue", { exact: true })).toBeVisible();
});

test("/index.html redirects to the root (PLAN § 7)", async ({ page }) => {
  await page.goto("./index.html");
  await expect(page).toHaveURL(/\/$/u);
  await expect(columnTitle(page, "r1")).toBeVisible();
});
