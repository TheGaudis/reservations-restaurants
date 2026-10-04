import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";

import { setConfigField } from "@/api/actions";
import { useClock } from "@/background/clock";
import { TomorrowPanel } from "@/features/staff/TomorrowPanel";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { useSessionStore } from "@/session/session";
import { TEST_NOW } from "@/test/clock";
import { renderColumn } from "@/test/column-page";

// « Demain ({date}) », totals row (06 § 2.1, D-07, E-30; 09 C-01) on the seed of parite.md § 2: tomorrow is Tuesday
// 6 October 2026, with 15 seats booked in R1 and, in R2, 4 portions of its dishes plus 2 of a deleted dish.

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

function panel() {
  return page.getByRole("region", { name: /^Demain \(/u });
}

/** Text of each total, then its number in bold. */
function totals(): Array<[string, string]> {
  return [...document.querySelectorAll("section[aria-labelledby] p")].map((item) => [
    item.textContent,
    item.querySelector("b")?.textContent ?? "",
  ]);
}

describe("TomorrowPanel (06 § 2.1)", () => {
  it("titles the panel with tomorrow in Paris and totals the bookings, orphans left out (E-30)", async () => {
    await renderColumn("/collegue", "r1", <TomorrowPanel />);
    await expect
      .element(panel().getByRole("heading", { level: 3, name: "Demain (mardi 6 octobre 2026)" }))
      .toBeVisible();
    expect(totals()).toStrictEqual([
      ["Restaurant Pédagogique : 15 couverts réservés", "15"],
      ["Aristide : 4 portions réservées", "4"],
    ]);
  });

  it("says « 0 couvert réservé » and « 0 portion réservée » for a day without service", async () => {
    await renderColumn("/collegue", "r1", <TomorrowPanel />);
    // Tuesday 6 October, 9:30 in Paris: nothing is open on Wednesday 7.
    useClock.setState({ now: Date.parse("2026-10-06T07:30:00Z") });
    await expect
      .element(panel().getByRole("heading", { name: "Demain (mercredi 7 octobre 2026)" }))
      .toBeVisible();
    expect(totals()).toStrictEqual([
      ["Restaurant Pédagogique : 0 couvert réservé", "0"],
      ["Aristide : 0 portion réservée", "0"],
    ]);
  });

  it("names the restaurants as the settings do", async () => {
    await setConfigField(SEED_PASSWORD, { key: "name2", value: "Le Bistrot" });
    await renderColumn("/collegue", "r1", <TomorrowPanel />);
    await expect.element(panel().getByText("Le Bistrot : 4 portions réservées")).toBeVisible();
  });
});
