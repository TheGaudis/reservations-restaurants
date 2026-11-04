import { describe, expect, test } from "vitest";
import { formatWeekLabel } from "./dates";

describe("formatWeekLabel", () => {
  test("names the month once for a week within one month", () => {
    expect(formatWeekLabel("2026-09-23")).toBe("21 – 27 sept. 2026");
  });

  test("names both months for a week across two months", () => {
    expect(formatWeekLabel("2026-10-01")).toBe("28 sept. – 4 oct. 2026");
  });

  test("names both years for a week across two years", () => {
    expect(formatWeekLabel("2026-12-31")).toBe("28 déc. 2026 – 3 janv. 2027");
  });
});
