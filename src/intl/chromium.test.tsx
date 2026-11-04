import { expect, it } from "vitest";

import { amountsText, formatEuros, seatsText, withPrice } from "@/intl/amounts";
import { formatLongDate, formatMonthLabel, formatWeekLabel } from "@/intl/dates";

// Same strings in Chromium's ICU as in Node's (R-20, PLAN § 3.10): the E2E suite reads them in Chromium.
it("formats dates and amounts in Chromium as in Node", () => {
  expect(formatLongDate("2026-10-01")).toBe("jeudi 1er octobre 2026");
  expect(formatWeekLabel("2026-09-30")).toBe("28 sept. – 4 oct. 2026");
  expect(formatWeekLabel("2027-01-25")).toBe("25 – 31 janv. 2027");
  expect(formatMonthLabel("2026-10-05")).toBe("Octobre 2026");
  expect(formatEuros("4.95")).toBe("4,95 €");
  expect(amountsText({ euros: 9, vouchers: 1, gap: false })).toBe("9,00 € + 1 ticket restaurant");
  expect(seatsText(0)).toBe("0 couvert");
  expect(withPrice("Bowl", formatEuros(3.5))).toBe("Bowl — 3,50 €");
});
