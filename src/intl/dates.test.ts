import { describe, expect, it } from "vitest";

import { formatLongDate, formatMonthLabel, formatPeriodLabel, formatWeekLabel } from "@/intl/dates";

// Runs under TZ=Europe/Paris (node) and TZ=America/New_York (node-ny): the results must not change.

describe("formatLongDate (04 § 8, D-03, E-21)", () => {
  it.each([
    ["2026-10-01", "jeudi 1er octobre 2026"],
    ["2026-10-03", "samedi 3 octobre 2026"],
    ["2026-10-05", "lundi 5 octobre 2026"],
    ["2026-10-31", "samedi 31 octobre 2026"],
    // Daylight saving changes in Paris and New York.
    ["2026-03-29", "dimanche 29 mars 2026"],
    ["2026-10-25", "dimanche 25 octobre 2026"],
    ["2026-11-01", "dimanche 1er novembre 2026"],
    ["2027-01-01", "vendredi 1er janvier 2027"],
  ])("%s → %s", (iso, expected) => {
    expect(formatLongDate(iso)).toBe(expected);
  });

  it.each([
    ["2026-01-01", "jeudi 1er janvier 2026"],
    ["2026-02-01", "dimanche 1er février 2026"],
    ["2026-03-01", "dimanche 1er mars 2026"],
    ["2026-04-01", "mercredi 1er avril 2026"],
    ["2026-05-01", "vendredi 1er mai 2026"],
    ["2026-06-01", "lundi 1er juin 2026"],
    ["2026-07-01", "mercredi 1er juillet 2026"],
    ["2026-08-01", "samedi 1er août 2026"],
    ["2026-09-01", "mardi 1er septembre 2026"],
    ["2026-10-01", "jeudi 1er octobre 2026"],
    ["2026-11-01", "dimanche 1er novembre 2026"],
    ["2026-12-01", "mardi 1er décembre 2026"],
  ])("writes « 1er » on the first day of each month: %s → %s", (iso, expected) => {
    expect(formatLongDate(iso)).toBe(expected);
  });

  it.each(["2026-10-02", "2026-10-11", "2026-10-21", "2026-10-22", "2026-10-23"])(
    "writes no ordinal on %s",
    (iso) => {
      expect(formatLongDate(iso)).not.toMatch(/\d(?:er|e|ème)\s/u);
    },
  );
});

describe("formatWeekLabel (05 § 2.3, a-23, E-06)", () => {
  it.each([
    // Any day of the week gives the label of its Monday-to-Sunday week.
    ["2026-10-05", "5 – 11 oct. 2026"],
    ["2026-10-08", "5 – 11 oct. 2026"],
    ["2026-10-11", "5 – 11 oct. 2026"],
    ["2026-09-21", "21 – 27 sept. 2026"],
    ["2026-09-30", "28 sept. – 4 oct. 2026"],
    ["2026-10-04", "28 sept. – 4 oct. 2026"],
    ["2027-01-25", "25 – 31 janv. 2027"],
    ["2026-12-31", "28 déc. 2026 – 3 janv. 2027"],
    ["2025-12-29", "29 déc. 2025 – 4 janv. 2026"],
    ["2026-03-29", "23 – 29 mars 2026"],
    ["2026-10-25", "19 – 25 oct. 2026"],
  ])("week of %s → %s", (iso, expected) => {
    expect(formatWeekLabel(iso)).toBe(expected);
  });
});

describe("formatMonthLabel (05 § 2.3, 06 § 3.2)", () => {
  it.each([
    ["2026-10-01", "Octobre 2026"],
    ["2026-10-31", "Octobre 2026"],
    ["2026-11-15", "Novembre 2026"],
    ["2026-08-01", "Août 2026"],
    ["2027-01-31", "Janvier 2027"],
  ])("month of %s → %s", (iso, expected) => {
    expect(formatMonthLabel(iso)).toBe(expected);
  });
});

describe("formatPeriodLabel (05 § 2.3)", () => {
  it.each([
    ["semaine", "2026-09-30", "28 sept. – 4 oct. 2026"],
    ["mois", "2026-09-30", "Septembre 2026"],
  ] as const)("%s of %s → %s", (view, iso, expected) => {
    expect(formatPeriodLabel(view, iso)).toBe(expected);
  });
});
