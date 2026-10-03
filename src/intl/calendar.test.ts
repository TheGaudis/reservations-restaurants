import { describe, expect, it } from "vitest";

import { calendarDayLabel } from "@/intl/calendar";
import type { CalendarDayState } from "@/intl/calendar";

// Runs under TZ=Europe/Paris (node) and TZ=America/New_York (node-ny). Labels of REG-12 (parite.md).

describe("calendarDayLabel (05 § 2.4, § 2.5, E-21, E-43)", () => {
  it.each<[string, CalendarDayState, string]>([
    [
      "2026-10-05",
      { status: "available", past: false },
      "lundi 5 octobre 2026, places disponibles",
    ],
    ["2026-10-06", { status: "almostFull", past: false }, "mardi 6 octobre 2026, bientôt complet"],
    ["2026-10-09", { status: "full", past: false }, "vendredi 9 octobre 2026, complet"],
    ["2026-10-07", { status: null, past: false }, "mercredi 7 octobre 2026, aucun service"],
    [
      "2026-09-30",
      { status: null, past: true },
      "mercredi 30 septembre 2026, aucun service, passé",
    ],
    [
      "2026-10-01",
      { status: "available", past: true },
      "jeudi 1er octobre 2026, places disponibles, passé",
    ],
    [
      "2026-10-05",
      { status: "available", past: false, ordersClosed: true },
      "lundi 5 octobre 2026, places disponibles, commandes closes",
    ],
    [
      "2026-10-01",
      { status: "available", past: true, ordersClosed: true },
      "jeudi 1er octobre 2026, places disponibles, passé",
    ],
    [
      "2026-10-11",
      { status: "full", past: false, ordersClosed: false },
      "dimanche 11 octobre 2026, complet",
    ],
  ])("%s %o → %s", (iso, day, expected) => {
    expect(calendarDayLabel(iso, day)).toBe(expected);
  });
});
