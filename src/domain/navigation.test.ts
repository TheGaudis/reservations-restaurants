import { describe, expect, it } from "vitest";

import {
  CALENDAR_KEYS,
  calendarAnchor,
  calendarView,
  clickDay,
  goToToday,
  isSamePeriod,
  publicSearch,
  selectDay,
  selectedDay,
  shiftPeriod,
} from "@/domain/navigation";
import type { PageSearchParams } from "@/domain/navigation";
import { TODAY } from "@/test/clock";

/** The router leaves `undefined` values out of the URL: compare without them. */
function inUrl(search: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(search).filter(([, value]) => value !== undefined));
}

// Forms open in both restaurants: a change in one column must leave the other one alone (a-12).
const bothOpen: PageSearchParams = {
  r1: "2026-10-06",
  r2: "2026-10-13",
  r1vue: "mois",
  r1periode: "2026-11-01",
  r2periode: "2026-10-20",
  editJour: "r1",
  ouvrir: "r2",
  ouvrirDate: "2026-10-20",
  editResa: "r2:b-7",
  ajout: "r1",
  ajoutPlat: true,
  editPlat: "d-3",
};

describe("defaults (05 § 1)", () => {
  it("selects and shows today in the week view when the URL says nothing", () => {
    expect(selectedDay({}, "r1", TODAY)).toBe(TODAY);
    expect(calendarAnchor({}, "r2", TODAY)).toBe(TODAY);
    expect(calendarView({}, "r1")).toBe("semaine");
  });

  it("reads each restaurant's own params", () => {
    expect(selectedDay(bothOpen, "r2", TODAY)).toBe("2026-10-13");
    expect(calendarAnchor(bothOpen, "r1", TODAY)).toBe("2026-11-01");
    expect(calendarAnchor({ r2: "2026-10-13" }, "r2", TODAY)).toBe("2026-10-13");
    expect(calendarView(bothOpen, "r1")).toBe("mois");
    expect(calendarView(bothOpen, "r2")).toBe("semaine");
  });
});

describe("periods (05 § 2.1)", () => {
  it.each([
    ["2026-10-05", "2026-10-11", "semaine", true],
    ["2026-10-04", "2026-10-05", "semaine", false],
    ["2026-10-01", "2026-10-31", "mois", true],
    ["2026-09-30", "2026-10-01", "mois", false],
  ] as const)("%s and %s in the same %s: %s", (a, b, view, same) => {
    expect(isSamePeriod(a, b, view)).toBe(same);
  });
});

describe("selectDay (05 § 3.3, a-12)", () => {
  it.each<[string, PageSearchParams, "r1" | "r2", Record<string, unknown>]>([
    ["sets the day, the view follows", { r1periode: "2026-11-01" }, "r1", { r1: "2026-10-08" }],
    ["closes the booking form of this restaurant", { reserver: "r1" }, "r1", { r1: "2026-10-08" }],
    [
      "keeps the booking form of the other restaurant",
      { reserver: "r2" },
      "r1",
      { reserver: "r2", r1: "2026-10-08" },
    ],
    [
      "clears the open-day date of this restaurant, keeps the panel",
      { ouvrir: "r2", ouvrirDate: "2026-10-20" },
      "r2",
      { ouvrir: "r2", r2: "2026-10-08" },
    ],
    [
      "keeps the open-day date of the other restaurant",
      { ouvrir: "r2", ouvrirDate: "2026-10-20" },
      "r1",
      { ouvrir: "r2", ouvrirDate: "2026-10-20", r1: "2026-10-08" },
    ],
    ["closes « Modifier ce jour » (R1)", { editJour: "r1" }, "r1", { r1: "2026-10-08" }],
    ["closes an R1 booking being edited", { editResa: "r1:b-1" }, "r1", { r1: "2026-10-08" }],
    [
      "keeps an R2 booking being edited",
      { editResa: "r2:b-1" },
      "r1",
      { editResa: "r2:b-1", r1: "2026-10-08" },
    ],
    ["closes an R2 addition", { ajout: "r2:d-1" }, "r2", { r2: "2026-10-08" }],
    ["keeps an R1 addition", { ajout: "r1" }, "r2", { ajout: "r1", r2: "2026-10-08" }],
    [
      "closes the dish forms (R2)",
      { ajoutPlat: true, editPlat: "d-3" },
      "r2",
      { r2: "2026-10-08" },
    ],
    [
      "keeps the dish forms when R1 changes",
      { ajoutPlat: true, editPlat: "d-3" },
      "r1",
      { ajoutPlat: true, editPlat: "d-3", r1: "2026-10-08" },
    ],
  ])("%s", (_case, search, restaurant, expected) => {
    expect(inUrl(selectDay(search, restaurant, "2026-10-08"))).toStrictEqual(expected);
  });

  it("touches R1 only", () => {
    expect(inUrl(selectDay(bothOpen, "r1", "2026-10-08"))).toStrictEqual({
      r1: "2026-10-08",
      r2: "2026-10-13",
      r1vue: "mois",
      r2periode: "2026-10-20",
      ouvrir: "r2",
      ouvrirDate: "2026-10-20",
      editResa: "r2:b-7",
      ajoutPlat: true,
      editPlat: "d-3",
    });
  });

  it("touches R2 only", () => {
    expect(inUrl(selectDay(bothOpen, "r2", "2026-10-08"))).toStrictEqual({
      r1: "2026-10-06",
      r2: "2026-10-08",
      r1vue: "mois",
      r1periode: "2026-11-01",
      editJour: "r1",
      ouvrir: "r2",
      ajout: "r1",
    });
  });

  it("keeps the other params of the page", () => {
    const search = { connexion: true, retour: "/collegue", parametres: true, r1: TODAY };
    expect(inUrl(selectDay(search, "r2", "2026-10-08"))).toStrictEqual({
      ...search,
      r2: "2026-10-08",
    });
  });
});

describe("clickDay (05 § 3.1, a-23)", () => {
  it.each<[string, PageSearchParams, string, Record<string, unknown>]>([
    ["a day of the displayed week", {}, "2026-10-08", { r1: "2026-10-08" }],
    [
      "a day of the displayed month",
      { r1vue: "mois" },
      "2026-10-31",
      { r1vue: "mois", r1: "2026-10-31" },
    ],
    [
      "a day of the next month shown in the month view keeps the month",
      { r1vue: "mois" },
      "2026-11-02",
      { r1vue: "mois", r1: "2026-11-02", r1periode: TODAY },
    ],
    [
      "a day of the previous month keeps the browsed month",
      { r1vue: "mois", r1periode: "2026-11-01" },
      "2026-10-26",
      { r1vue: "mois", r1: "2026-10-26", r1periode: "2026-11-01" },
    ],
    [
      "a day of the browsed week drops the anchor",
      { r1periode: "2026-10-19" },
      "2026-10-21",
      { r1: "2026-10-21" },
    ],
  ])("%s", (_case, search, iso, expected) => {
    expect(inUrl(clickDay(search, "r1", iso, TODAY))).toStrictEqual(expected);
  });

  it("closes the forms of this restaurant only", () => {
    const search: PageSearchParams = { reserver: "r2", r2vue: "mois", ajout: "r1" };
    expect(inUrl(clickDay(search, "r2", "2026-11-01", TODAY))).toStrictEqual({
      r2vue: "mois",
      r2: "2026-11-01",
      r2periode: TODAY,
      ajout: "r1",
    });
  });
});

describe("shiftPeriod (05 § 3.1)", () => {
  it.each<[string, PageSearchParams, 1 | -1, Record<string, unknown>]>([
    ["next week", {}, 1, { r2periode: "2026-10-12" }],
    ["previous week", {}, -1, { r2periode: "2026-09-28" }],
    ["back to the week of the selected day", { r2periode: "2026-10-12" }, -1, {}],
    ["next month from the 1st", { r2vue: "mois" }, 1, { r2vue: "mois", r2periode: "2026-11-01" }],
    ["previous month", { r2vue: "mois", r2periode: "2026-11-01" }, -1, { r2vue: "mois" }],
    [
      "previous month across a year",
      { r2vue: "mois", r2periode: "2026-01-31" },
      -1,
      { r2vue: "mois", r2periode: "2025-12-01" },
    ],
    [
      "a week away from a selected day",
      { r2: "2026-10-20", reserver: "r2" },
      -1,
      { r2: "2026-10-20", reserver: "r2", r2periode: "2026-10-13" },
    ],
  ])("%s, the selection does not change", (_case, search, direction, expected) => {
    expect(inUrl(shiftPeriod(search, "r2", direction, TODAY))).toStrictEqual(expected);
  });

  it("leaves the other restaurant alone", () => {
    expect(inUrl(shiftPeriod({ r1periode: "2026-12-01" }, "r2", 1, TODAY))).toStrictEqual({
      r1periode: "2026-12-01",
      r2periode: "2026-10-12",
    });
  });
});

describe("goToToday (05 § 3.1, a-12)", () => {
  it("selects and shows today, closes the forms of this restaurant, the booking form included", () => {
    expect(inUrl(goToToday({ ...bothOpen, reserver: "r1" }, "r1"))).toStrictEqual({
      r2: "2026-10-13",
      r1vue: "mois",
      r2periode: "2026-10-20",
      ouvrir: "r2",
      ouvrirDate: "2026-10-20",
      editResa: "r2:b-7",
      ajoutPlat: true,
      editPlat: "d-3",
    });
  });

  it("keeps the booking form of the other restaurant", () => {
    expect(
      inUrl(goToToday({ r2: "2026-10-13", reserver: "r1", r1: "2026-10-06" }, "r2")),
    ).toStrictEqual({
      reserver: "r1",
      r1: "2026-10-06",
    });
  });
});

describe("publicSearch (PLAN § 3.3.4)", () => {
  it("keeps the calendar params only", () => {
    const search: PageSearchParams = { ...bothOpen, reserver: "r1" };
    expect(inUrl(publicSearch(search))).toStrictEqual({
      r1: "2026-10-06",
      r2: "2026-10-13",
      r1vue: "mois",
      r1periode: "2026-11-01",
      r2periode: "2026-10-20",
    });
  });

  it("returns exactly CALENDAR_KEYS", () => {
    expect(Object.keys(publicSearch({})).toSorted()).toStrictEqual(CALENDAR_KEYS.toSorted());
  });
});
