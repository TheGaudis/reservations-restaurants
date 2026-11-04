import { describe, expect, test } from "vitest";
import {
  addDays,
  daysBetween,
  formatDateFr,
  isIsoDate,
  parisDate,
  parisHour,
} from "./model/dates";
import { groupByContact, looksLikeEmail, needsReminder } from "./model/emails";
import { formatEuro, r1Total, r2Total } from "./model/pricing";
import { DEFAULT_SETTINGS } from "./model/settings";

describe("Paris date helpers", () => {
  test("summer time is UTC+2", () => {
    const t = Date.UTC(2026, 6, 14, 22, 30);
    expect(parisDate(t)).toBe("2026-07-15");
    expect(parisHour(t)).toBe(0);
    expect(parisHour(Date.UTC(2026, 6, 14, 16, 0))).toBe(18);
  });

  test("winter time is UTC+1", () => {
    expect(parisDate(Date.UTC(2026, 11, 31, 22, 59))).toBe("2026-12-31");
    expect(parisDate(Date.UTC(2026, 11, 31, 23, 0))).toBe("2027-01-01");
    expect(parisHour(Date.UTC(2026, 0, 10, 17, 0))).toBe(18);
  });

  test("date arithmetic and validation", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
    expect(daysBetween("2026-01-01", "2026-03-04")).toBe(62);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
    expect(formatDateFr("2026-09-23")).toBe("mercredi 23 septembre 2026");
  });
});

describe("pricing", () => {
  test("R1 total uses per-status prices", () => {
    expect(r1Total(DEFAULT_SETTINGS, { nbEleve: 2, nbProf: 1, nbExt: 1 })).toBe(
      25.9,
    );
  });

  test("R2 total flags unpriced lines", () => {
    expect(r2Total([{ qty: 2, unitPrice: 3.5 }, { qty: 1 }])).toEqual({
      totalPrice: 7,
      hasPriceGap: true,
    });
    expect(r2Total([{ qty: 3, unitPrice: 0 }])).toEqual({
      totalPrice: 0,
      hasPriceGap: false,
    });
  });

  test("euro formatting", () => {
    expect(formatEuro(4.95)).toBe("4,95 €");
  });
});

describe("reminder selection", () => {
  test("only unreminded email contacts are selected", () => {
    expect(needsReminder({ contact: "a@b.fr" })).toBe(true);
    expect(needsReminder({ contact: "a@b.fr", reminderSentAt: 1 })).toBe(false);
    expect(needsReminder({ contact: "06 12 34 56 78" })).toBe(false);
    expect(looksLikeEmail("  x@y.z ")).toBe(true);
  });

  test("groups by normalized contact", () => {
    const groups = groupByContact([
      { contact: "A@b.fr", id: 1 },
      { contact: "a@b.fr ", id: 2 },
      { contact: "c@d.fr", id: 3 },
    ]);
    expect([...groups.values()].map((g) => g.map((b) => b.id))).toEqual([
      [1, 2],
      [3],
    ]);
  });
});
