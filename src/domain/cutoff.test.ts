import { expect, it } from "vitest";

import { isPast, isR2OrderingClosed } from "@/domain/cutoff";
import { TEST_NOW, TODAY } from "@/test/clock";

// Runs under TZ=Europe/Paris (node) and TZ=America/New_York (node-ny): the Paris hour decides (E-01).
it.each([
  ["today at 9:30 (TEST_NOW)", TODAY, TEST_NOW, false],
  ["today at 9:59:59, summer", TODAY, Date.parse("2026-10-05T07:59:59.999Z"), false],
  ["today at 10:00, summer", TODAY, Date.parse("2026-10-05T08:00:00.000Z"), true],
  ["today at 23:59, summer", TODAY, Date.parse("2026-10-05T21:59:00.000Z"), true],
  ["today at 9:59:59, winter", "2026-12-15", Date.parse("2026-12-15T08:59:59.999Z"), false],
  ["today at 10:00, winter", "2026-12-15", Date.parse("2026-12-15T09:00:00.000Z"), true],
  [
    "the day of the autumn change at 9:59",
    "2026-10-25",
    Date.parse("2026-10-25T08:59:00.000Z"),
    false,
  ],
  [
    "the day of the autumn change at 10:00",
    "2026-10-25",
    Date.parse("2026-10-25T09:00:00.000Z"),
    true,
  ],
  [
    "the day of the spring change at 10:00",
    "2026-03-29",
    Date.parse("2026-03-29T08:00:00.000Z"),
    true,
  ],
  ["tomorrow, after 10:00 today", "2026-10-06", Date.parse("2026-10-05T08:00:00.000Z"), false],
  ["tomorrow at 00:00 in Paris", "2026-10-06", Date.parse("2026-10-05T22:00:00.000Z"), false],
  ["yesterday, before 10:00 today", "2026-10-04", TEST_NOW, true],
  [
    "a day already past in Paris, still today in New York",
    TODAY,
    Date.parse("2026-10-06T02:00:00.000Z"),
    true,
  ],
])("R2 ordering for %s: closed %s", (_case, iso, now, closed) => {
  expect(isR2OrderingClosed(iso, now)).toBe(closed);
});

it.each([
  ["2026-10-04", TODAY, true],
  [TODAY, TODAY, false],
  ["2026-10-06", TODAY, false],
  ["2025-12-31", "2026-01-01", true],
])("%s is past on %s: %s (01 § 3.8)", (iso, today, past) => {
  expect(isPast(iso, today)).toBe(past);
});
