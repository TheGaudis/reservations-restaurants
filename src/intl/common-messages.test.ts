import { describe, expect, it } from "vitest";

import { maxSeatsMessage } from "@/features/r1/seat-rules";
import { counterWithPriceLabel, counterDecrementLabel } from "@/features/r1/SeatCountersR1";
import {
  cancelAction,
  maxPortionsMessage,
  r2ClosedMessage,
  saveAction,
  studentsLabel,
} from "@/intl/common-messages";
import { intl } from "@/intl/intl";

// Shared texts of 04 § 9, 00 § 2.3 and PLAN annexe F, with their plurals (D-18).

describe("commonMessages", () => {
  it.each([
    [1, "1 couvert au maximum (places restantes ce jour-là)."],
    [4, "4 couverts au maximum (places restantes ce jour-là)."],
  ])("writes the seat maximum of D-18 for %i", (count, text) => {
    expect(intl.formatMessage(maxSeatsMessage, { count })).toBe(text);
  });

  it.each([
    [1, "1 portion au maximum (stock restant)."],
    [2, "2 portions au maximum (stock restant)."],
  ])("writes the portion maximum of D-18 for %i", (count, text) => {
    expect(intl.formatMessage(maxPortionsMessage, { count })).toBe(text);
  });

  it("writes the R2 cutoff with the name of the restaurant (04 § 9)", () => {
    expect(intl.formatMessage(r2ClosedMessage, { name2: "Aristide" })).toBe(
      "Commandes en ligne clôturées à 10h. Venez au restaurant Aristide à partir de 12h pour commander sur place.",
    );
  });

  it.each([
    [cancelAction, "Annuler"],
    [saveAction, "Enregistrer"],
  ])("keeps the text of $0.id (04 § 9)", (message, text) => {
    expect(intl.formatMessage(message)).toBe(text);
  });

  it("writes a counter label with its price (04 § 5.2)", () => {
    const label = intl.formatMessage(studentsLabel);
    expect(intl.formatMessage(counterWithPriceLabel, { label, price: "4,95 €" })).toBe(
      "Élèves · 4,95 €",
    );
    expect(intl.formatMessage(counterDecrementLabel, { label })).toBe("Diminuer : Élèves");
  });
});
