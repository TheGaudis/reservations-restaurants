import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { useClock } from "@/background/clock";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { actionPosts, expectToast, renderStaffColumn } from "@/test/staff-column";

// « Supprimer ce jour » of both staff cards (06 § 5.2; D-21; E-04, E-38, E-48; 09 C-14) on the seed of parite.md § 2:
// in R1, Tuesday 6 October 2026 has 3 bookings and Friday 9 one; in R2, the 6th has 2 bookings of its dishes and one of
// a deleted dish.

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
});

const initialClock = useClock.getState();

afterEach(() => {
  useClock.setState(initialClock, true);
  vi.useRealTimers();
});

const NO_SERVICE =
  "Aucun jour ouvert. Utilisez le formulaire « Ouvrir un jour » pour en créer un à cette date.";

/** The button at rest or armed: its name becomes the detail of the deletion (06 § 5.2). */
const deleteButton = (detail: string) =>
  page.getByRole("button", {
    name: new RegExp(
      `^(?:Supprimer ce jour|${detail.replaceAll(/[()]/gu, String.raw`\$&`)})$`,
      "u",
    ),
  });

describe("R1 (06 § 5.2, D-21)", () => {
  const DETAIL =
    "Confirmer la suppression du jour et de ses 3 réservations (les personnes ne seront pas prévenues)";

  it("arms with the detailed note, then deletes, busy until the answer, focus on the date", async () => {
    await renderStaffColumn("/collegue?r1=2026-10-06", "r1", <StaffDayCardR1 />);
    const remove = deleteButton(DETAIL);
    await userEvent.click(remove);
    await expect.element(remove).toHaveTextContent("Confirmer ?");
    await expect.element(remove).toHaveAccessibleName(DETAIL);
    await expect.element(page.getByText(DETAIL, { exact: true })).toBeVisible();
    expect(actionPosts("deleteDayR1")).toStrictEqual([]);

    const release = fakeScript().hold();
    await userEvent.click(remove);
    await expect.element(remove).toHaveAttribute("aria-busy", "true");
    release();
    await expectToast("Jour supprimé.");
    expect(actionPosts("deleteDayR1")).toStrictEqual([
      { action: "deleteDayR1", password: SEED_PASSWORD, date: "2026-10-06" },
    ]);
    await expect.element(page.getByText(NO_SERVICE, { exact: true })).toBeVisible();
    await expect.element(page.getByText("mardi 6 octobre 2026", { exact: true })).toHaveFocus();
  });

  it("goes back to rest and shows the error when the deletion fails", async () => {
    await renderStaffColumn("/collegue?r1=2026-10-06", "r1", <StaffDayCardR1 />);
    const remove = deleteButton(DETAIL);
    await userEvent.click(remove);
    fakeScript().failNext("html");
    await userEvent.click(remove);
    await expectToast("Le service ne répond pas. Réessayez dans un instant.");
    await expect.element(remove).toHaveTextContent("Supprimer ce jour");
    await expect.element(page.getByText("5 / 20 couverts", { exact: true })).toBeVisible();
  });
});

describe("R2 (06 § 5.2, D-21)", () => {
  it("keeps the text of 06 § 5.2 for a day without bookings", async () => {
    // Saturday 10 October: an R2 day open without any dish, so without bookings.
    await renderStaffColumn("/collegue?r2=2026-10-10", "r2", <StaffDayCardR2 />);
    const detail = "Confirmer la suppression du jour et de toutes ses réservations";
    const remove = deleteButton(detail);
    await userEvent.click(remove);
    await expect.element(remove).toHaveAccessibleName(detail);
    await expect.element(page.getByText(detail, { exact: true })).not.toBeInTheDocument();
  });

  it("counts the bookings of the dishes of the day, not those of a deleted dish (b-3)", async () => {
    await renderStaffColumn("/collegue?r2=2026-10-06", "r2", <StaffDayCardR2 />);
    const detail =
      "Confirmer la suppression du jour et de ses 2 réservations (les personnes ne seront pas prévenues)";
    const remove = deleteButton(detail);
    await userEvent.click(remove);
    await expect.element(remove).toHaveAccessibleName(detail);
    await userEvent.click(remove);
    await expectToast("Jour supprimé.");
    expect(actionPosts("deleteDayR2")).toStrictEqual([
      { action: "deleteDayR2", password: SEED_PASSWORD, date: "2026-10-06" },
    ]);
    await expect.element(page.getByText(NO_SERVICE, { exact: true })).toBeVisible();
    await expect.element(page.getByText("mardi 6 octobre 2026", { exact: true })).toHaveFocus();
  });
});
