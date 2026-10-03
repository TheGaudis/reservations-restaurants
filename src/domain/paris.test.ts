import { expect, it } from "vitest";

import { parisDate, parisHour } from "@/domain/paris";
import { TEST_NOW } from "@/test/clock";

// Runs under TZ=Europe/Paris (project node) and TZ=America/New_York (project node-ny): same results.
it.each([
  ["TEST_NOW, Monday 9:30 in Paris", TEST_NOW, "2026-10-05", 9],
  ["summer, 9:59:59 in Paris", Date.parse("2026-10-05T07:59:59.999Z"), "2026-10-05", 9],
  ["summer, 10:00 in Paris", Date.parse("2026-10-05T08:00:00.000Z"), "2026-10-05", 10],
  ["winter, 9:59:59 in Paris", Date.parse("2026-12-15T08:59:59.999Z"), "2026-12-15", 9],
  ["winter, 10:00 in Paris", Date.parse("2026-12-15T09:00:00.000Z"), "2026-12-15", 10],
  ["summer midnight, still Sunday", Date.parse("2026-10-04T21:59:59.999Z"), "2026-10-04", 23],
  ["summer midnight, Monday", Date.parse("2026-10-04T22:00:00.000Z"), "2026-10-05", 0],
  ["winter midnight, new year", Date.parse("2026-12-31T23:00:00.000Z"), "2027-01-01", 0],
  ["before the spring change (29 March)", Date.parse("2026-03-29T00:59:59.000Z"), "2026-03-29", 1],
  ["after the spring change (29 March)", Date.parse("2026-03-29T01:00:00.000Z"), "2026-03-29", 3],
  [
    "before the autumn change (25 October)",
    Date.parse("2026-10-25T00:59:59.000Z"),
    "2026-10-25",
    2,
  ],
  ["after the autumn change (25 October)", Date.parse("2026-10-25T01:00:00.000Z"), "2026-10-25", 2],
  [
    "New York evening is already tomorrow in Paris",
    Date.parse("2026-10-05T23:30:00.000Z"),
    "2026-10-06",
    1,
  ],
])("reads the Paris date and hour: %s", (_case, now, date, hour) => {
  expect(parisDate(now)).toBe(date);
  expect(parisHour(now)).toBe(hour);
});
