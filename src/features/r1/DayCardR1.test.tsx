import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { stopBackgroundTasks } from "@/background/start";
import type { PublicState } from "@/domain/types";
import { stateKeys } from "@/queries/state";
import { TEST_NOW, TODAY } from "@/test/clock";
import { columnOf, renderPublicPage, urlParams } from "@/test/public-page";

// Public R1 card (05 § 5, 04 § 4.1-4.2, D-02), on the seed of parite.md § 2: Monday 5 October 2026, 9:30 in Paris.

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
});

afterEach(() => {
  stopBackgroundTasks();
  vi.useRealTimers();
  localStorage.clear();
});

const column = () => columnOf("r1");
const text = (value: string) => column().getByText(value, { exact: true });
const reserve = () => column().getByRole("button", { name: "Réserver", exact: true });

describe("DayCardR1 states (05 § 5.2)", () => {
  it("shows today's date, gauge, theme, menu and « Réserver » (P-04)", async () => {
    await renderPublicPage("/");
    await expect.element(text("lundi 5 octobre 2026")).toBeVisible();
    await expect.element(text("12 / 20 couverts")).toBeVisible();
    await expect.element(text("Thème du jour")).toBeVisible();
    await expect.element(text("Cuisine du marché")).toBeVisible();
    await expect.element(text("Menu du jour")).toBeVisible();
    await expect.element(text("Salade de saison, pavé de saumon, crème brûlée")).toBeVisible();
    await expect.element(reserve()).toBeVisible();
    await expect.element(text("Bientôt complet")).not.toBeInTheDocument();
  });

  it("says « Bientôt complet » next to the gauge of an almost full day, without an empty block (P-04, D-02)", async () => {
    await renderPublicPage("/?r1=2026-10-06");
    await expect.element(text("5 / 20 couverts")).toBeVisible();
    await expect.element(text("Bientôt complet")).toBeVisible();
    await expect.element(text("Thème du jour")).not.toBeInTheDocument();
    await expect.element(text("Menu du jour")).toBeVisible();
    await expect.element(reserve()).toBeVisible();
  });

  it("shows the no-service text of 04 § 4.1 for a day nobody opened (P-03)", async () => {
    await renderPublicPage("/?r1=2026-10-07");
    await expect.element(text("mercredi 7 octobre 2026")).toBeVisible();
    await expect.element(text("Aucune réservation possible ce jour-là.")).toBeVisible();
    await expect.element(column().getByText(/couverts$/u)).not.toBeInTheDocument();
    await expect.element(reserve()).not.toBeInTheDocument();
  });

  it("says « Complet » and « Complet. » instead of « Réserver » on a full day (P-07, E-27)", async () => {
    await renderPublicPage("/?r1=2026-10-09");
    await expect.element(text("0 / 10 couverts")).toBeVisible();
    await expect.element(text("Complet")).toBeVisible();
    await expect.element(text("Complet.")).toBeVisible();
    await expect.element(reserve()).not.toBeInTheDocument();
  });

  it("shows a negative count when the capacity went under the seats booked (05 PA 9)", async () => {
    const { queryClient } = await renderPublicPage("/");
    const state = queryClient.getQueryData<PublicState>(stateKeys.public());
    if (state === undefined) throw new Error("État public absent après la première lecture.");
    // A colleague lowered today's capacity to 6 while 8 seats are booked (06 § 4.1, b-4).
    queryClient.setQueryData(stateKeys.public(), {
      ...state,
      r1Days: state.r1Days.map((day) => (day.date === TODAY ? { ...day, capacity: 6 } : day)),
    });
    await expect.element(text("-2 / 6 couverts")).toBeVisible();
    await expect.element(text("Complet.")).toBeVisible();
  });

  it("fades a past day, with neither button nor sentence (P-08, E-21)", async () => {
    await renderPublicPage("/?r1=2026-10-01");
    await expect.element(text("jeudi 1er octobre 2026")).toBeVisible();
    await expect.element(text("16 / 20 couverts")).toBeVisible();
    await expect.element(reserve()).not.toBeInTheDocument();
    await expect.element(text("Complet.")).not.toBeInTheDocument();
  });
});

describe("« Réserver » (05 § 5.1, PLAN § 3.2)", () => {
  it("opens the form of this day: `reserver` and the date written in the URL (push)", async () => {
    const { router } = await renderPublicPage("/?r2=2026-10-06&reserver=r2");
    const before = router.history.length;
    await userEvent.click(reserve());
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-05", "r2=2026-10-06", "reserver=r1"]);
    expect(router.history.length).toBe(before + 1);
    // The form of P4 (c) takes the place of the button.
    await expect.element(reserve()).not.toBeInTheDocument();
  });

  it("opens no form on a day that cannot be booked", async () => {
    await renderPublicPage("/?r1=2026-10-09&reserver=r1");
    await expect.element(text("Complet.")).toBeVisible();
    await expect.element(reserve()).not.toBeInTheDocument();
  });
});
