import { describe, expect, it } from "vitest";

import { deleteDayWithBookingsLabel } from "@/features/staff/DeleteDayButton";
import { intl } from "@/intl/intl";
import { pastDateMessage } from "@/intl/staff-messages";

// Texts of the staff mode shared by several files (06, PLAN annexe F), checked before P5 uses them.

describe("staffCommonMessages", () => {
  it.each([
    [
      0,
      "Confirmer la suppression du jour et de ses 0 réservation (les personnes ne seront pas prévenues)",
    ],
    [
      1,
      "Confirmer la suppression du jour et de ses 1 réservation (les personnes ne seront pas prévenues)",
    ],
    [
      3,
      "Confirmer la suppression du jour et de ses 3 réservations (les personnes ne seront pas prévenues)",
    ],
  ])("writes the D-21 note for %i booking(s)", (n, text) => {
    expect(intl.formatMessage(deleteDayWithBookingsLabel, { n })).toBe(text);
  });

  it("keeps the text of pastDateMessage", () => {
    expect(intl.formatMessage(pastDateMessage)).toBe(
      "Choisissez la date d'aujourd'hui ou une date ultérieure.",
    );
  });
});
