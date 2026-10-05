import { describe, expect, it } from "vitest";

import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";

// Shared texts of 04 § 9, 00 § 2.3 and PLAN annexe F, with their plurals (D-18).

describe("commonMessages", () => {
  it.each([
    [1, "1 couvert au maximum (places restantes ce jour-là)."],
    [4, "4 couverts au maximum (places restantes ce jour-là)."],
  ])("writes the seat maximum of D-18 for %i", (count, text) => {
    expect(intl.formatMessage(commonMessages.maxSeats, { count })).toBe(text);
  });

  it.each([
    [1, "1 portion au maximum (stock restant)."],
    [2, "2 portions au maximum (stock restant)."],
  ])("writes the portion maximum of D-18 for %i", (count, text) => {
    expect(intl.formatMessage(commonMessages.maxPortions, { count })).toBe(text);
  });

  it("writes the R2 cutoff with the name of the restaurant (04 § 9)", () => {
    expect(intl.formatMessage(commonMessages.r2Closed, { name2: "Aristide" })).toBe(
      "Commandes en ligne clôturées à 10h. Venez au restaurant Aristide à partir de 12h pour commander sur place.",
    );
  });

  it.each([
    ["book", "Réserver"],
    ["confirmBooking", "Confirmer la réservation"],
    ["cancel", "Annuler"],
    ["close", "Fermer"],
    ["save", "Enregistrer"],
    ["bookingConfirmed", "Réservation confirmée."],
    ["noService", "Aucune réservation possible ce jour-là."],
    ["dineInOnly", "Sur place uniquement ce jour-là : repas au prix d'un ticket restaurant."],
    ["emailInvalid", "Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr)."],
  ] as const)("keeps the text of %s (04 § 9)", (key, text) => {
    expect(intl.formatMessage(commonMessages[key])).toBe(text);
  });

  it("writes a counter label with its price (04 § 5.2)", () => {
    const label = intl.formatMessage(commonMessages.students);
    expect(intl.formatMessage(commonMessages.counterWithPrice, { label, price: "4,95 €" })).toBe(
      "Élèves · 4,95 €",
    );
    expect(intl.formatMessage(commonMessages.counterDecrement, { label })).toBe(
      "Diminuer : Élèves",
    );
  });
});
