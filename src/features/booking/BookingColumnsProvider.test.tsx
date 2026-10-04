import { Suspense } from "react";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import type { SummaryR1 } from "@/domain/bookings";
import { useBookingColumns } from "@/features/booking/booking-columns";
import { BookingColumnsProvider } from "@/features/booking/BookingColumnsProvider";
import { BookingSummary } from "@/features/booking/BookingSummary";
import { createQueryClient } from "@/queries/client";
import { stateKeys } from "@/queries/state";
import { publicState } from "@/test/domain-states";
import { renderWithProviders } from "@/test/render";

// One summary per column (D-11), focus on its title (E-12).

const SUMMARY: SummaryR1 = {
  restaurant: "r1",
  date: "2026-10-05",
  duplicate: false,
  name: "Jean Dupuis",
  className: "TS2",
  counts: { students: 1, staffMembers: 0, externals: 0 },
  seats: 1,
  price: 4.95,
  warnings: [],
};

function Column() {
  const columns = useBookingColumns();
  const summary = columns.summaries.r1;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          columns.show(SUMMARY);
        }}
      >
        Envoyer
      </button>
      {summary === null ? null : (
        <BookingSummary
          summary={summary}
          titleRef={columns.titleRef("r1")}
          onClose={() => {
            columns.clear("r1");
          }}
        />
      )}
    </>
  );
}

async function renderColumn() {
  const queryClient = createQueryClient();
  queryClient.setQueryData(stateKeys.public(), publicState());
  return renderWithProviders(
    <BookingColumnsProvider>
      <Suspense fallback={null}>
        <Column />
      </Suspense>
    </BookingColumnsProvider>,
    { queryClient },
  );
}

describe("BookingColumnsProvider", () => {
  it("shows the summary of a column with the focus on its title, until « Fermer »", async () => {
    const { screen } = await renderColumn();
    await userEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    await expect.element(screen.getByText("Réservation enregistrée")).toHaveFocus();
    expect(screen.getByRole("status").element().textContent).toContain("Jean Dupuis");
    await userEvent.click(screen.getByRole("button", { name: "Fermer" }));
    await expect.element(screen.getByRole("status")).not.toBeInTheDocument();
  });
});
