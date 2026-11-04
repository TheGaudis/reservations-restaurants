import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import type { SummaryR1, SummaryR2 } from "@/domain/bookings";
import type { BookingSummaryContent } from "@/features/booking/booking-columns";
import { BookingSummary } from "@/features/booking/BookingSummary";
import { createQueryClient } from "@/queries/client";
import { stateKeys } from "@/queries/state";
import { publicState, SETTINGS } from "@/test/domain-states";
import { renderWithProviders } from "@/test/render";

// Booking summary (04 § 7, 08 § 6.1; D-16, E-14, E-28).

const R1: SummaryR1 = {
  restaurant: "r1",
  date: "2026-10-01",
  duplicate: false,
  name: "Jean Dupuis",
  className: "TS2",
  counts: { students: 2, staffMembers: 1, externals: 0 },
  seats: 3,
  price: 16,
  warnings: [],
};

const R2: SummaryR2 = {
  restaurant: "r2",
  date: "2026-10-05",
  duplicate: false,
  name: "Léa Martin",
  className: "BTS1",
  serviceMode: "takeaway",
  dishes: [
    { name: "Lasagnes", portions: 2 },
    { name: "", portions: 1 },
  ],
  amounts: { euros: 9, vouchers: 1, gap: true },
  warnings: ["adjusted", "emailFailed"],
};

async function renderSummary(
  summary: BookingSummaryContent,
  cancellationContact = "le secrétariat",
) {
  const queryClient = createQueryClient();
  queryClient.setQueryData(
    stateKeys.public(),
    publicState({ settings: { ...SETTINGS, cancellationContact } }),
  );
  const onClose = vi.fn<() => void>();
  const { screen } = await renderWithProviders(
    <Suspense fallback={null}>
      <BookingSummary summary={summary} onClose={onClose} />
    </Suspense>,
    { queryClient },
  );
  return { screen, onClose };
}

const lineTexts = () => [...document.querySelectorAll("li")].map((li) => li.textContent);

describe("BookingSummary (04 § 7)", () => {
  it("shows the R1 lines, the total and the cancellation contact, in a status", async () => {
    const { screen } = await renderSummary(R1);
    const status = screen.getByRole("status");
    await expect.element(status).toBeInTheDocument();
    expect(status.element().textContent).toMatch(
      /^Réservation enregistréejeudi 1er octobre 2026Nom/u,
    );
    expect(lineTexts()).toStrictEqual([
      "NomJean Dupuis",
      "Classe / serviceTS2",
      "Élèves2",
      "Personnels1",
    ]);
    expect(status.element().textContent).toContain("Total3 couverts — 16,00\u00A0€");
    await expect
      .element(screen.getByText("Pour annuler ou modifier, contactez le secrétariat."))
      .toBeVisible();
    expect(status.element().dataset["warning"]).toBeUndefined();
  });

  it("shows the seats alone when the price is 0, and « l'établissement » without a contact", async () => {
    const { screen } = await renderSummary({ ...R1, price: 0, seats: 1 }, "");
    expect(screen.getByRole("status").element().textContent).toContain("Total1 couvert");
    await expect
      .element(screen.getByText("Pour annuler ou modifier, contactez l'établissement."))
      .toBeVisible();
  });

  it("warns when the confirmation e-mail did not leave (04 § 7)", async () => {
    const { screen } = await renderSummary({ ...R1, warnings: ["emailFailed"] });
    await expect
      .element(
        screen.getByText(
          "L'email de confirmation n'a pas pu être envoyé. Gardez ce récapitulatif.",
        ),
      )
      .toBeVisible();
    expect(screen.getByRole("status").element().dataset["warning"]).toBe("true");
  });

  it("says « déjà enregistrée » for a duplicate (D-16)", async () => {
    const { screen } = await renderSummary({ ...R1, duplicate: true });
    await expect.element(screen.getByText("Réservation déjà enregistrée")).toBeVisible();
    await expect
      .element(
        screen.getByText(
          "Cette réservation était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.",
        ),
      )
      .toBeVisible();
  });

  it("shows the R2 lines, both warnings (E-14) and the total « hors plats sans prix indiqué » (E-28)", async () => {
    const { screen } = await renderSummary(R2);
    expect(lineTexts()).toStrictEqual([
      "NomLéa Martin",
      "Classe / serviceBTS1",
      "ModeÀ emporter",
      "Lasagnes× 2",
      "Plat× 1",
    ]);
    await expect
      .element(
        screen.getByText(
          "Certaines quantités ont été ajustées faute de stock. Vérifiez votre email pour le détail.",
        ),
      )
      .toBeVisible();
    await expect
      .element(
        screen.getByText(
          "L'email de confirmation n'a pas pu être envoyé. Gardez ce récapitulatif.",
        ),
      )
      .toBeVisible();
    expect(screen.getByRole("status").element().textContent).toContain(
      "Total9,00\u00A0€ + 1 ticket restaurant (hors plats sans prix indiqué)",
    );
  });

  it("has no total line when nothing priced was confirmed", async () => {
    const { screen } = await renderSummary({
      ...R2,
      dishes: [{ name: "Salade", portions: 1 }],
      amounts: { euros: 0, vouchers: 0, gap: true },
      warnings: [],
    });
    await expect.element(screen.getByText("Total", { exact: true })).not.toBeInTheDocument();
  });

  it("closes with « Fermer »", async () => {
    const { screen, onClose } = await renderSummary(R1);
    await userEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
