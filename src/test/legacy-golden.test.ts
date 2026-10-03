import { describe, expect, it } from "vitest";

import { capacityClass } from "@/domain/capacity";
import { keyTargetIso } from "@/domain/dates";
import { intl } from "@/intl/intl";
import { loadLegacyPage } from "@/test/legacy-scripts";

// Golden tests (PLAN P2): the old site's functions, run unchanged, against the new code on the same tables. A
// difference is either listed here as expected (PLAN § 4.2) or a defect of the new code.

const legacy = loadLegacyPage();

describe("golden: formatEuro (legacy/js/outils.js) against the euro format (00 § 3, E-20)", () => {
  it.each([0, 0.5, 4.95, "4.95", 6.1, 12.5, 16, 99.9, 120.45, 999.99])(
    "formats %j identically",
    (amount) => {
      const old = legacy.evaluate(`formatEuro(${JSON.stringify(amount)})`);
      expect(intl.formatNumber(Number(amount), { format: "euro" })).toBe(old);
    },
  );

  it.each([
    [1000, "1 000,00 €", "1000,00 €"],
    [1188, "1 188,00 €", "1188,00 €"],
  ])("formats %j with a thousands separator (expected difference, E-20)", (amount, now, old) => {
    expect(legacy.evaluate(`formatEuro(${String(amount)})`)).toBe(old);
    expect(intl.formatNumber(amount, { format: "euro" })).toBe(now);
  });
});

const KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
];
// Mondays, Sundays, month ends, leap day, both clock changes of 2026 (29 March, 25 October).
const DAYS = [
  "2026-10-05",
  "2026-10-04",
  "2026-10-01",
  "2026-03-29",
  "2026-03-30",
  "2026-10-25",
  "2026-10-26",
  "2026-12-31",
  "2027-01-01",
  "2028-02-29",
  "2026-01-31",
  "2026-03-31",
  "2026-05-31",
];
/**
 * Page ↑ / ↓ from a day the target month lacks (31st, 29 to 31 towards February): the old `setMonth` overflows into
 * the next month, the new code stops at the last day of the target month (E-07, a-23).
 */
function overflowsMonth(key: string, iso: string): boolean {
  if (key !== "PageUp" && key !== "PageDown") return false;
  const [year = 0, month = 0, day = 0] = iso.split("-").map(Number);
  const target = month - 1 + (key === "PageUp" ? -1 : 1);
  const daysInTarget = new Date(Date.UTC(year, target + 1, 0)).getUTCDate();
  return day > daysInTarget;
}

describe("golden: keyTargetIso (legacy/js/calendrier.js, 05 § 3.2)", () => {
  const cases = KEYS.flatMap((key) => DAYS.map((iso) => [key, iso] as const));

  it.each(cases)("%s from %s", (key, iso) => {
    const old = legacy.evaluate(`keyTargetIso(${JSON.stringify(key)}, ${JSON.stringify(iso)})`);
    const now = keyTargetIso(key, iso);
    if (overflowsMonth(key, iso)) {
      expect(now).not.toBe(old);
    } else {
      expect(now).toBe(old);
    }
  });

  it("returns null for another key, like the old code", () => {
    expect(legacy.evaluate(`keyTargetIso("Enter", "2026-10-05")`)).toBeNull();
    expect(keyTargetIso("Enter", "2026-10-05")).toBeNull();
  });
});

describe("golden: capacityClass (legacy/js/donnees.js, 01 § 3.3)", () => {
  const OLD_CLASSES: Record<string, string> = {
    "cap-ok": "available",
    "cap-low": "almostFull",
    "cap-full": "full",
  };
  const cases = [20, 10, 3, 1, 0].flatMap((capacity) =>
    [capacity + 1, capacity, 10, 9.5, 5, 4, 1, 0, -2].map((remaining) => [remaining, capacity]),
  );

  it.each(cases)("remaining %d of %d", (remaining, capacity) => {
    const old = legacy.evaluate(`capacityClass(${String(remaining)}, ${String(capacity)})`);
    expect(capacityClass(remaining, capacity)).toBe(OLD_CLASSES[String(old)]);
  });
});
