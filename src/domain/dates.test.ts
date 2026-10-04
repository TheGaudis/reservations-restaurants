import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonthsClamped,
  dayOfMonth,
  firstOfMonth,
  isSameMonth,
  isSameWeek,
  keyTargetIso,
  mondayOf,
  monthCells,
  utcTime,
  weekCells,
} from "@/domain/dates";
import { TODAY } from "@/test/clock";

// Runs under TZ=Europe/Paris and TZ=America/New_York; the days around 29 March and 25 October 2026
// (daylight saving changes in Paris) must not shift.

describe("day arithmetic (PLAN § 3.7)", () => {
  it.each([
    [TODAY, 1, "2026-10-06"],
    [TODAY, -5, "2026-09-30"],
    ["2026-03-28", 1, "2026-03-29"],
    ["2026-03-29", 1, "2026-03-30"],
    ["2026-10-25", 1, "2026-10-26"],
    ["2026-10-26", -1, "2026-10-25"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2028-02-28", 1, "2028-02-29"],
  ])("%s + %i days = %s", (iso, days, expected) => {
    expect(addDays(iso, days)).toBe(expected);
  });

  it.each([
    [TODAY, "2026-10-05"],
    ["2026-10-11", "2026-10-05"],
    ["2026-10-04", "2026-09-28"],
    ["2026-03-29", "2026-03-23"],
    ["2026-10-25", "2026-10-19"],
    ["2027-01-03", "2026-12-28"],
  ])("the week of %s starts on Monday %s (05 § 2.1)", (iso, monday) => {
    expect(mondayOf(iso)).toBe(monday);
  });

  it.each([
    ["2026-01-31", 1, "2026-02-28"],
    ["2026-03-31", -1, "2026-02-28"],
    ["2024-01-31", 1, "2024-02-29"],
    ["2026-10-31", 1, "2026-11-30"],
    ["2026-12-31", 1, "2027-01-31"],
    ["2026-01-15", -1, "2025-12-15"],
    [TODAY, 12, "2027-10-05"],
  ])("%s + %i month = %s, clamped to the end of the month (a-23)", (iso, months, expected) => {
    expect(addMonthsClamped(iso, months)).toBe(expected);
  });

  it("reads the day of the month, the 1st of the month and the UTC midnight", () => {
    expect(dayOfMonth("2026-10-01")).toBe(1);
    expect(dayOfMonth("2026-10-31")).toBe(31);
    expect(firstOfMonth("2026-10-17")).toBe("2026-10-01");
    expect(utcTime("2026-10-01")).toBe(Date.parse("2026-10-01T00:00:00.000Z"));
  });

  it.each(["", "2026-1-05", "05/10/2026", "2026-10-05T00:00"])("refuses %j", (iso) => {
    expect(() => utcTime(iso)).toThrow(RangeError);
  });

  it.each([
    ["2026-10-05", "2026-10-11", true, true],
    ["2026-10-04", "2026-10-05", false, true],
    ["2026-09-30", "2026-10-01", true, false],
    ["2026-12-31", "2027-01-01", true, false],
  ])("%s and %s: same week %s, same month %s", (a, b, week, month) => {
    expect(isSameWeek(a, b)).toBe(week);
    expect(isSameMonth(a, b)).toBe(month);
  });
});

describe("calendar cells (05 § 2.1)", () => {
  it.each([
    [TODAY, "2026-10-05", "2026-10-11"],
    ["2026-10-01", "2026-09-28", "2026-10-04"],
    ["2026-03-29", "2026-03-23", "2026-03-29"],
    ["2026-10-25", "2026-10-19", "2026-10-25"],
    ["2026-12-31", "2026-12-28", "2027-01-03"],
  ])("the week of %s runs from Monday %s to Sunday %s, all in the month", (anchor, first, last) => {
    const week = weekCells(anchor);
    expect(week).toHaveLength(7);
    expect(week[0]?.iso).toBe(first);
    expect(week[6]?.iso).toBe(last);
    expect(week.every((cell) => cell.inMonth)).toBe(true);
    expect(week.map((cell) => cell.day)).toStrictEqual(week.map((cell) => dayOfMonth(cell.iso)));
  });

  it.each([
    ["2026-10-17", "2026-09-28", "2026-11-08", 31],
    ["2026-03-01", "2026-02-23", "2026-04-05", 31],
    ["2027-02-01", "2027-02-01", "2027-03-14", 28],
    ["2026-11-30", "2026-10-26", "2026-12-06", 30],
  ])("the month of %s shows 42 days from Monday %s to %s", (anchor, first, last, daysInMonth) => {
    const month = monthCells(anchor);
    expect(month).toHaveLength(42);
    expect(month[0]?.iso).toBe(first);
    expect(month[41]?.iso).toBe(last);
    expect(month.filter((cell) => cell.inMonth)).toHaveLength(daysInMonth);
    expect(
      month.filter((cell) => cell.inMonth).every((cell) => isSameMonth(cell.iso, anchor)),
    ).toBe(true);
    for (const [i, cell] of month.entries()) expect(cell.iso).toBe(addDays(first, i));
  });

  it("marks the days of the neighbouring months as outside the month (05 § 2.5)", () => {
    const month = monthCells("2026-10-01");
    expect(month.slice(0, 4).map((cell) => [cell.day, cell.inMonth])).toStrictEqual([
      [28, false],
      [29, false],
      [30, false],
      [1, true],
    ]);
  });
});

describe("keyboard target (05 § 3.2)", () => {
  it.each([
    ["ArrowLeft", TODAY, "2026-10-04"],
    ["ArrowRight", TODAY, "2026-10-06"],
    ["ArrowUp", TODAY, "2026-09-28"],
    ["ArrowDown", TODAY, "2026-10-12"],
    ["Home", "2026-10-08", "2026-10-05"],
    ["End", "2026-10-08", "2026-10-11"],
    ["Home", "2026-10-11", "2026-10-05"],
    ["End", "2026-10-05", "2026-10-11"],
    ["PageUp", TODAY, "2026-09-05"],
    ["PageDown", TODAY, "2026-11-05"],
    ["PageDown", "2026-01-31", "2026-02-28"],
    ["PageUp", "2026-03-31", "2026-02-28"],
    ["PageDown", "2026-10-31", "2026-11-30"],
    ["PageDown", "2026-12-15", "2027-01-15"],
    ["ArrowRight", "2026-10-25", "2026-10-26"],
    ["ArrowDown", "2026-03-25", "2026-04-01"],
    // Sunday, year end, both clock changes of 2026, leap day; the old keyTargetIso gave the same days, except
    // after a month end that the target month lacks (E-07).
    ["Home", "2026-10-04", "2026-09-28"],
    ["End", "2026-10-04", "2026-10-04"],
    ["ArrowLeft", "2027-01-01", "2026-12-31"],
    ["ArrowRight", "2026-12-31", "2027-01-01"],
    ["ArrowDown", "2026-03-29", "2026-04-05"],
    ["ArrowUp", "2026-03-30", "2026-03-23"],
    ["PageUp", "2026-10-25", "2026-09-25"],
    ["PageUp", "2028-02-29", "2028-01-29"],
    ["PageDown", "2028-02-29", "2028-03-29"],
    ["PageDown", "2026-05-31", "2026-06-30"],
  ])("%s from %s goes to %s", (key, iso, expected) => {
    expect(keyTargetIso(key, iso)).toBe(expected);
  });

  it.each(["Enter", " ", "Tab", "a", "Escape"])("ignores %j", (key) => {
    expect(keyTargetIso(key, TODAY)).toBeNull();
  });
});
