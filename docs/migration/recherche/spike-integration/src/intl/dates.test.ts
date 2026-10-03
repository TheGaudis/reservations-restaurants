import { expect, it } from "vitest";

import { formatLongDate } from "@/intl/dates";
import { intl } from "@/intl/intl";

it("selectordinal « 1er » and euro format (node project)", () => {
  expect(formatLongDate("2026-10-01")).toBe("jeudi 1er octobre 2026");
  expect(formatLongDate("2026-10-03")).toBe("samedi 3 octobre 2026");
  expect(intl.formatNumber(4.95, { format: "euro" })).toBe("4,95 €");
});
