import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { deleteBookingR1 } from "@/api/actions";
import { useClock } from "@/background/clock";
import { DayCard } from "@/features/calendar/DayCard";
import { BookingListR1 } from "@/features/staff/BookingList";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { renderColumn } from "@/test/column-page";
import { urlParams } from "@/test/public-page";

// Bookings of the R1 staff card (05 § 4.6, § 5.3; 06 § 5.2, § 7.1; C-10, C-14), on the seed of parite.md § 2:
// Tuesday 6 October 2026 has Cyrille Ungerer (3), Léa Martin (8) and Jean Petit (4, before the prices).

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
  useSessionStore.getState().open(SEED_PASSWORD);
});

const initialClock = useClock.getState();

afterEach(() => {
  useClock.setState(initialClock, true);
  vi.useRealTimers();
});

const TOMORROW = "/collegue?r1=2026-10-06";

async function renderCard(url = TOMORROW) {
  const rendered = await renderColumn(url, "r1", <StaffDayCardR1 />);
  await expect.element(page.getByText("Ouvert par M. Dupont")).toBeVisible();
  return rendered;
}

function lineTexts(): string[] {
  return [...document.querySelectorAll("section b")].map(
    (name) => name.parentElement?.textContent ?? "",
  );
}

function posts() {
  return fakeScript()
    .requests.filter((request) => request.method === "POST")
    .map((request) => request.json as Record<string, unknown>)
    .filter((body) => Object.values(body)[0] !== "getAdminState");
}

/** Row of a booking (05 § 4.6) by the booked person's name in bold. */
function row(name: string) {
  const bold = [...document.querySelectorAll("section b")].find(
    (element) => element.textContent === name,
  );
  const element = bold?.closest("div");
  if (element === null || element === undefined) throw new Error(`No booking row for ${name}.`);
  return page.elementLocator(element);
}

describe("lines (05 § 4.6)", () => {
  it("lists the bookings in the order of the sheet, not sorted (D-08 not retained), empty parts left out", async () => {
    await renderCard();
    expect(lineTexts()).toStrictEqual([
      "Cyrille Ungerer — TS2 — 3 couverts — 16,00 € — c.ungerer@exemple.fr — Table près de la fenêtre",
      "Léa Martin — BTS1 — 8 couverts — 79,20 € — 06 12 34 56 78",
      "Jean Petit — Personnel — 4 couverts — j.petit@exemple.fr",
    ]);
    // Name in bold, observation in italics (05 § 4.6).
    expect(document.querySelector("section i")?.textContent).toBe("Table près de la fenêtre");
    await expect.element(page.getByRole("button", { name: "Réserver" })).not.toBeInTheDocument();
  });

  it("says « Aucune réservation. » for a day without bookings", async () => {
    await Promise.all(
      ["r1b-d+1-ungerer", "r1b-d+1-martin", "r1b-d+1-petit"].map(async (id) =>
        deleteBookingR1(SEED_PASSWORD, id),
      ),
    );
    await renderCard();
    await expect.element(page.getByText("Aucune réservation.", { exact: true })).toBeVisible();
  });

  it("puts « Modifier » and « Supprimer » on each row, « Modifier » not expanded", async () => {
    await renderCard();
    const edit = row("Léa Martin").getByRole("button", { name: "Modifier", exact: true });
    await expect.element(edit).toHaveAttribute("aria-expanded", "false");
    await expect
      .element(row("Léa Martin").getByRole("button", { name: "Supprimer", exact: true }))
      .toBeVisible();
  });
});

describe("edit form under its row (06 § 7.1, PLAN § 3.2)", () => {
  it("opens under the row from « Modifier » (editResa, aria-expanded), one at a time", async () => {
    const { router } = await renderCard();
    const edit = row("Léa Martin").getByRole("button", { name: "Modifier", exact: true });
    await userEvent.click(edit);
    await expect.element(edit).toHaveAttribute("aria-expanded", "true");
    expect(urlParams(router)).toStrictEqual(["editResa=r1:r1b-d+1-martin", "r1=2026-10-06"]);
    await expect.element(page.getByLabelText("Nom", { exact: true })).toHaveValue("Léa Martin");
    // The form comes right after the row of its booking.
    const martin = row("Léa Martin").element();
    expect(martin.nextElementSibling?.tagName).toBe("FORM");

    await userEvent.click(row("Jean Petit").getByRole("button", { name: "Modifier", exact: true }));
    await expect.element(page.getByLabelText("Nom", { exact: true })).toHaveValue("Jean Petit");
    expect(document.querySelectorAll("section form")).toHaveLength(1);
  });

  it("opens nothing for a booking that no longer exists", async () => {
    await renderCard(`${TOMORROW}&editResa=r1:r1b-gone`);
    await expect.element(page.getByLabelText("Nom", { exact: true })).not.toBeInTheDocument();
    await expect.element(page.getByText("Léa Martin", { exact: true })).toBeVisible();
  });

  it("opens from the URL (link, reload after the login)", async () => {
    await renderCard(`${TOMORROW}&editResa=r1:r1b-d%2B1-ungerer`);
    await expect
      .element(page.getByLabelText("Nom", { exact: true }))
      .toHaveValue("Cyrille Ungerer");
  });
});

describe("deletion in two clicks (06 § 5.2)", () => {
  it("arms, then deletes: toast, row gone, focus on the date of the card (03 § 5.4)", async () => {
    await renderCard();
    const remove = row("Léa Martin").getByRole("button", { name: "Supprimer", exact: true });
    await userEvent.click(remove);
    const armed = page.getByRole("button", {
      name: "Confirmer la suppression de cette réservation",
    });
    await expect.element(armed).toHaveTextContent("Confirmer ?");
    expect(posts()).toStrictEqual([]);
    await userEvent.click(armed);
    await expect
      .element(page.getByText("Réservation supprimée.", { exact: true }).first())
      .toBeVisible();
    expect(posts()).toStrictEqual([
      { action: "deleteBookingR1", password: SEED_PASSWORD, id: "r1b-d+1-martin" },
    ]);
    await expect.element(page.getByText("Léa Martin", { exact: true })).not.toBeInTheDocument();
    await expect.element(page.getByText("mardi 6 octobre 2026", { exact: true })).toHaveFocus();
  });

  it("is busy while the deletion is on its way, without a veil (E-04)", async () => {
    await renderCard();
    const release = fakeScript().hold();
    await userEvent.click(row("Léa Martin").getByRole("button", { name: "Supprimer" }));
    const armed = page.getByRole("button", {
      name: "Confirmer la suppression de cette réservation",
    });
    await userEvent.click(armed);
    await expect.element(armed).toHaveAttribute("aria-busy", "true");
    release();
    await expect.element(page.getByText("Léa Martin", { exact: true })).not.toBeInTheDocument();
  });

  it("shows the script's message and puts the button back at rest on failure", async () => {
    await renderCard();
    fakeScript().failNext("error", "Réservation introuvable.");
    await userEvent.click(row("Léa Martin").getByRole("button", { name: "Supprimer" }));
    await userEvent.click(
      page.getByRole("button", { name: "Confirmer la suppression de cette réservation" }),
    );
    await expect
      .element(page.getByText("Réservation introuvable.", { exact: true }).first())
      .toBeVisible();
    await expect
      .element(row("Léa Martin").getByRole("button", { name: "Supprimer", exact: true }))
      .toBeVisible();
  });

  it("says D-14 when the service does not answer", async () => {
    await renderCard();
    fakeScript().failNext("network");
    await userEvent.click(row("Léa Martin").getByRole("button", { name: "Supprimer" }));
    await userEvent.click(
      page.getByRole("button", { name: "Confirmer la suppression de cette réservation" }),
    );
    await expect
      .element(
        page
          .getByText("Le service ne répond pas. Réessayez dans un instant.", { exact: true })
          .first(),
      )
      .toBeVisible();
  });
});

describe("past day (05 § 4.2, § 5.3)", () => {
  it("keeps the buttons of a past day", async () => {
    await renderColumn(
      "/collegue?r1=2026-10-01",
      "r1",
      <DayCard past>
        <BookingListR1
          day={{ date: "2026-10-01", capacity: 20, menu: "", theme: "", openedBy: "" }}
        />
      </DayCard>,
    );
    await expect
      .element(row("Cyrille Ungerer").getByRole("button", { name: "Modifier", exact: true }))
      .toBeEnabled();
  });
});
