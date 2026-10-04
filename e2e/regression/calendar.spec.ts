import { expect, test } from "../fixtures";
import {
  calendarDays,
  dayButton,
  goToToday,
  longDate,
  periodLabel,
  selectDay,
  selectedDay,
  setView,
  showPeriod,
} from "../pages/calendar";
import { dayCard } from "../pages/day-card";
import { column, gotoHome } from "../pages/home";
import { target } from "../pages/target";
import type { Restaurant } from "../pages/target";

// Calendars (09 § 3: P-01, P-01b, P-02, P-02b; 05 § 2-3). Seed of parite.md § 2, dated from 2026-10-05.

/** Cells of the calendar: buttons of the group (legacy), gridcells (React). */
function cells(page: Parameters<typeof calendarDays>[0], restaurant: Restaurant) {
  const days = calendarDays(page, restaurant);
  return target(test.info()) === "legacy" ? days.getByRole("button") : days.getByRole("gridcell");
}

test.describe("at 9:00 on Wednesday 30 September 2026", () => {
  test.use({ fixedTime: Date.parse("2026-09-30T07:00:00Z") });

  test(
    "calendarWeekNavigation (REG-09)",
    { tag: ["@changed:E-05", "@changed:E-06", "@P-01", "@P-01b", "@p4"] },
    async ({ page }) => {
      const site = target(test.info());
      await gotoHome(page);

      for (const restaurant of ["r1", "r2"] as const) {
        // E-06: the month of the Monday is written when it differs from the Sunday's.
        const week = site === "legacy" ? "28 – 4 oct. 2026" : "28 sept. – 4 oct. 2026";
        await expect(periodLabel(page, restaurant)).toHaveText(week);
        await expect(selectedDay(page, restaurant)).toHaveAccessibleName(
          `${longDate("2026-09-30")}, aucun service`,
        );
        const columnOf = column(page, restaurant);
        await expect(columnOf.getByRole("button", { name: "Semaine précédente" })).toBeVisible();
        await expect(columnOf.getByRole("button", { name: "Semaine suivante" })).toBeVisible();

        // ‹ › change the week shown, never the selection.
        await showPeriod(page, restaurant, "next");
        await expect(periodLabel(page, restaurant)).toHaveText("5 – 11 oct. 2026");
        await expect(selectedDay(page, restaurant)).toHaveCount(0);
        await expect(dayCard(page, restaurant)).toContainText(longDate("2026-09-30"));
        await showPeriod(page, restaurant, "previous");
        await showPeriod(page, restaurant, "previous");
        await expect(periodLabel(page, restaurant)).toHaveText("21 – 27 sept. 2026");
        await expect(dayCard(page, restaurant)).toContainText(longDate("2026-09-30"));

        await goToToday(page, restaurant);
        await expect(periodLabel(page, restaurant)).toHaveText(week);
        await expect(selectedDay(page, restaurant)).toHaveAccessibleName(
          `${longDate("2026-09-30")}, aucun service`,
        );
      }

      // E-05: a group of toggle buttons (legacy), a grid of selectable cells (React).
      const days = calendarDays(page, "r1");
      if (site === "legacy") {
        await expect(days).toHaveAccessibleName(
          "Jours de la semaine — flèches pour changer de jour",
        );
        await expect(days.getByRole("button", { pressed: true })).toHaveCount(1);
        await expect(days.getByRole("button", { pressed: false })).toHaveCount(6);
      } else {
        await expect(days.getByRole("gridcell")).toHaveCount(7);
        await expect(days.getByRole("gridcell", { selected: true })).toHaveCount(1);
        await expect(days.getByRole("gridcell", { selected: false })).toHaveCount(6);
      }
    },
  );
});

test(
  "calendarMonthView (REG-10)",
  { tag: ["@changed:E-23", "@P-02", "@P-02b", "@p4"] },
  async ({ page }) => {
    await gotoHome(page);

    for (const restaurant of ["r1", "r2"] as const) {
      await setView(page, restaurant, "month");
      await expect(periodLabel(page, restaurant)).toHaveText("Octobre 2026");
      await expect(cells(page, restaurant)).toHaveCount(42);
      await expect(
        column(page, restaurant).getByRole("button", { name: "Mois précédent" }),
      ).toBeVisible();
      await expect(
        column(page, restaurant).getByRole("button", { name: "Mois suivant" }),
      ).toBeVisible();
      // The grid runs from Monday 28 September to Sunday 8 November.
      await expect(dayButton(page, restaurant, "2026-09-28")).toBeVisible();
      await expect(dayButton(page, restaurant, "2026-11-08")).toBeVisible();

      // A day of the next month is selected without leaving October.
      await selectDay(page, restaurant, "2026-11-01");
      await expect(selectedDay(page, restaurant)).toHaveAccessibleName(
        `${longDate("2026-11-01")}, aucun service`,
      );
      await expect(periodLabel(page, restaurant)).toHaveText("Octobre 2026");
      await expect(dayCard(page, restaurant)).toContainText(longDate("2026-11-01"));

      await showPeriod(page, restaurant, "next");
      await expect(periodLabel(page, restaurant)).toHaveText("Novembre 2026");
      await showPeriod(page, restaurant, "previous");
      await setView(page, restaurant, "week");
      await expect(cells(page, restaurant)).toHaveCount(7);
      await setView(page, restaurant, "month");
    }

    // E-23: the view lives in the URL on the React site only.
    await page.reload();
    if (target(test.info()) === "legacy") {
      await expect(periodLabel(page, "r1")).toHaveText("5 – 11 oct. 2026");
      await expect(cells(page, "r1")).toHaveCount(7);
      await expect(selectedDay(page, "r1")).toHaveAccessibleName(
        `${longDate("2026-10-05")}, places disponibles`,
      );
    } else {
      await expect(cells(page, "r1")).toHaveCount(42);
      await expect(selectedDay(page, "r1")).toHaveAccessibleName(
        `${longDate("2026-11-01")}, aucun service`,
      );
    }
  },
);

test(
  "calendarKeyboard (REG-11)",
  { tag: ["@changed:E-07", "@P-01", "@P-02", "@p4"] },
  async ({ page }) => {
    await gotoHome(page);
    const days = calendarDays(page, "r1");

    async function press(key: string, iso: string): Promise<void> {
      await page.keyboard.press(key);
      const selected = selectedDay(page, "r1");
      await expect(selected).toHaveAccessibleName(new RegExp(`^${longDate(iso)},`, "u"));
      await expect(selected).toBeFocused();
    }

    await dayButton(page, "r1", "2026-10-05").focus();
    // Page ↓ goes to the same day of the next month; the view follows the selection.
    await press("PageDown", "2026-11-05");
    await press("PageDown", "2026-12-05");
    await press("PageDown", "2027-01-05");
    await press("ArrowDown", "2027-01-12");
    await press("ArrowDown", "2027-01-19");
    await press("ArrowDown", "2027-01-26");
    await press("ArrowRight", "2027-01-27");
    await press("ArrowRight", "2027-01-28");
    await press("ArrowRight", "2027-01-29");
    await expect(periodLabel(page, "r1")).toHaveText("25 – 31 janv. 2027");

    // Roving tabindex: the selected day is the only tab stop of the calendar (05 § 2.6).
    await expect(days.locator('[tabindex="0"]')).toHaveCount(1);
    await expect(selectedDay(page, "r1")).toHaveAttribute("tabindex", "0");

    await press("ArrowLeft", "2027-01-28");
    await press("ArrowRight", "2027-01-29");
    await press("ArrowUp", "2027-01-22");
    await press("ArrowDown", "2027-01-29");
    await press("Home", "2027-01-25");
    await press("End", "2027-01-31");
    await expect(dayCard(page, "r1")).toContainText(longDate("2027-01-31"));

    // E-07: legacy overflows (31 January + 1 month = 3 March), React stops at the last day of February.
    const nextMonth = target(test.info()) === "legacy" ? "2027-03-03" : "2027-02-28";
    await press("PageDown", nextMonth);
    await expect(days.locator('[tabindex="0"]')).toHaveCount(1);
  },
);

test.describe("at 10:30 on Monday 5 October 2026", () => {
  test.use({ fixedTime: Date.parse("2026-10-05T08:30:00Z") });

  test(
    "calendarDayAriaLabels (REG-12)",
    { tag: ["@changed:E-21", "@changed:E-43", "@P-01", "@P-02b", "@P-15", "@p4"] },
    async ({ page }) => {
      const site = target(test.info());
      await gotoHome(page);

      const label = async (restaurant: Restaurant, iso: string, state: string) => {
        await expect(dayButton(page, restaurant, iso)).toHaveAccessibleName(
          `${longDate(iso)}, ${state}`,
        );
      };
      await label("r1", "2026-10-05", "places disponibles");
      await label("r1", "2026-10-06", "bientôt complet");
      await label("r1", "2026-10-07", "aucun service");
      await label("r1", "2026-10-09", "complet");
      await label("r1", "2026-10-11", "aucun service");
      await showPeriod(page, "r1", "previous");
      await label("r1", "2026-09-30", "aucun service, passé");
      // E-21: « jeudi 1 octobre 2026 » (legacy), « jeudi 1er octobre 2026 » (React).
      await label("r1", "2026-10-01", "places disponibles, passé");
      await expect(dayButton(page, "r1", "2026-10-01")).toHaveAccessibleName(
        site === "legacy"
          ? "jeudi 1 octobre 2026, places disponibles, passé"
          : "jeudi 1er octobre 2026, places disponibles, passé",
      );

      // E-43: after 10:00, today's R2 day says its orders are closed on the React site only.
      await label(
        "r2",
        "2026-10-05",
        site === "legacy" ? "places disponibles" : "places disponibles, commandes closes",
      );
      await label("r2", "2026-10-06", "places disponibles");
      // A day open without any dish has no service in the calendar (05 § 6.5).
      await label("r2", "2026-10-10", "aucun service");
      await label("r2", "2026-10-11", "complet");
      await setView(page, "r2", "month");
      await label("r2", "2026-10-01", "places disponibles, passé");
      await label("r2", "2026-10-13", "places disponibles");
      await label("r2", "2026-11-02", "aucun service");
    },
  );
});
