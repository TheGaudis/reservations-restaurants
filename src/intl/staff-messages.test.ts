import { describe, expect, it } from "vitest";

import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";

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
    expect(intl.formatMessage(staffCommonMessages.deleteDayWithBookings, { n })).toBe(text);
  });

  it.each([
    ["serviceUnavailable", "Le service ne répond pas. Réessayez dans un instant."],
    [
      "personDuplicate",
      "Cette personne était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.",
    ],
    ["pastDate", "Choisissez la date d'aujourd'hui ou une date ultérieure."],
    ["addPerson", "+ Ajouter une personne"],
  ] as const)("keeps the text of %s", (key, text) => {
    expect(intl.formatMessage(staffCommonMessages[key])).toBe(text);
  });
});
