import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { addBookingR2Multi, addDayR2, setConfigField } from "@/api/actions";
import { useClock } from "@/background/clock";
import { TomorrowPanel } from "@/features/staff/TomorrowPanel";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { useSessionStore } from "@/session/session";
import { TEST_NOW } from "@/test/clock";
import { renderColumn } from "@/test/column-page";

// « Demain ({date}) » (06 § 2.1, 07 § 5, D-07, E-30, E-44; 09 C-01, C-03) on the seed of parite.md § 2: tomorrow is
// Tuesday 6 October 2026, with 15 seats booked in R1 and, in R2, 4 portions of its dishes plus 2 of a deleted dish.
// `window.print` is a spy that records the title and the printed text at the call (PLAN § 3.8).

const PAGE_TITLE = "Réservations — Restaurants pédagogiques";
/** Tuesday 6 October 2026, 9:30 in Paris: tomorrow is Wednesday 7, where the seed opens nothing. */
const TUESDAY = Date.parse("2026-10-06T07:30:00Z");
const WEDNESDAY = "2026-10-07";

interface PrintCall {
  title: string;
  text: string;
}

let calls: PrintCall[];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
  document.title = PAGE_TITLE;
  calls = [];
  vi.spyOn(window, "print").mockImplementation(() => {
    calls.push({
      title: document.title,
      text: document.body.querySelector(":scope > .print-root")?.textContent ?? "",
    });
  });
  useSessionStore.getState().open(SEED_PASSWORD);
});

const initialClock = useClock.getState();

afterEach(() => {
  globalThis.dispatchEvent(new Event("afterprint"));
  useClock.setState(initialClock, true);
  vi.useRealTimers();
});

function panel() {
  return page.getByRole("region", { name: /^Demain \(/u });
}

/** Block of a restaurant: the parent of the row that holds its name (07 § 5). */
function block(name: string) {
  return panel().getByRole("heading", { level: 3, name }).element().parentElement?.parentElement;
}

function printButton(name: string) {
  return panel()
    .getByRole("button", { name: "Imprimer" })
    .nth(name === "Aristide" ? 1 : 0);
}

/** Text of each total, then its number in bold. */
function totals(): Array<[string, string]> {
  return [...document.querySelectorAll("section[aria-labelledby] > div > p")].map((item) => [
    item.textContent,
    item.querySelector("b")?.textContent ?? "",
  ]);
}

/** Lines of a block under its name and button (07 § 5). */
function blockLines(name: string): string[] {
  return [...(block(name)?.querySelectorAll(":scope > p") ?? [])].map((line) => line.textContent);
}

async function renderPanel() {
  await renderColumn("/collegue", "r1", <TomorrowPanel />);
  await expect.element(panel().getByRole("heading", { level: 2 })).toBeVisible();
}

describe("TomorrowPanel, totals row (06 § 2.1)", () => {
  it("titles the panel with tomorrow in Paris and totals the bookings, orphans left out (E-30)", async () => {
    await renderPanel();
    await expect
      .element(panel().getByRole("heading", { level: 2, name: "Demain (mardi 6 octobre 2026)" }))
      .toBeVisible();
    expect(totals()).toStrictEqual([
      ["Restaurant Pédagogique : 15 couverts réservés", "15"],
      ["Aristide : 4 portions réservées", "4"],
    ]);
  });

  it("says « 0 couvert réservé », « 0 portion réservée » and « Aucun jour ouvert pour demain. »", async () => {
    await renderPanel();
    useClock.setState({ now: TUESDAY });
    await expect
      .element(panel().getByRole("heading", { name: "Demain (mercredi 7 octobre 2026)" }))
      .toBeVisible();
    expect(totals()).toStrictEqual([
      ["Restaurant Pédagogique : 0 couvert réservé", "0"],
      ["Aristide : 0 portion réservée", "0"],
    ]);
    await expect.element(panel().getByText("Aucun jour ouvert pour demain.")).toBeVisible();
    await expect.element(panel().getByRole("button")).not.toBeInTheDocument();
  });

  it("names the restaurants as the settings do", async () => {
    await setConfigField(SEED_PASSWORD, { key: "name2", value: "Le Bistrot" });
    await renderPanel();
    await expect.element(panel().getByText("Le Bistrot : 4 portions réservées")).toBeVisible();
  });
});

describe("TomorrowPanel, blocks per restaurant (07 § 5, D-07)", () => {
  it("shows « Ouvert par », the seats with their price and the customers of restaurant 1", async () => {
    await renderPanel();
    expect(blockLines("Restaurant Pédagogique")).toStrictEqual([
      "Ouvert par M. Dupont",
      "Réservés : 15 / 20 couverts — 95,20 €",
      "Clients : Cyrille Ungerer (TS2), Léa Martin (BTS1), Jean Petit (Personnel)",
    ]);
  });

  it("shows a line per booked dish with one voucher per order, and the total of restaurant 2 (E-30, E-44)", async () => {
    await renderPanel();
    expect(blockLines("Aristide")).toStrictEqual([
      "Ouvert par M. Dupont",
      "• Lasagnes : 1 portion — 4,50 € (Noah Bernard)",
      "• Bowl : 3 portions — 1 ticket restaurant (Ariele Gsell)",
      "Total Aristide : 4,50 € + 1 ticket restaurant",
    ]);
    await expect.element(panel().getByText(/Paul Durand/u)).not.toBeInTheDocument();
  });

  it("says « (aucun) », skips the dishes nobody booked, and marks a dish without price (D-03)", async () => {
    const state = await addDayR2(SEED_PASSWORD, {
      date: WEDNESDAY,
      note: "",
      theme: "",
      openedBy: "",
      dishes: [
        { name: "Soupe", stock: 10, price: 3, voucher: false },
        { name: "Salade", stock: 5, price: null, voucher: false },
        { name: "Tarte", stock: 5, price: 2, voucher: false },
      ],
    });
    const dishId = (name: string) =>
      state.dishes.find((dish) => dish.date === WEDNESDAY && dish.name === name)?.id ?? "";
    await addBookingR2Multi({
      date: WEDNESDAY,
      name: "Emma Roy",
      contact: "",
      className: "TS2",
      serviceMode: "takeaway",
      items: [
        { dishId: dishId("Soupe"), portions: 1 },
        { dishId: dishId("Salade"), portions: 2 },
      ],
      observation: "",
      requestId: "wednesday",
    });
    await renderPanel();
    useClock.setState({ now: TUESDAY });
    await expect.element(panel().getByText("Ouvert par (aucun)")).toBeVisible();
    expect(blockLines("Aristide")).toStrictEqual([
      "Ouvert par (aucun)",
      "• Soupe : 1 portion — 3,00 € (Emma Roy)",
      "• Salade : 2 portions (Emma Roy)",
      "Total Aristide (hors plats sans prix indiqué) : 3,00 €",
    ]);
    await expect
      .element(panel().getByRole("heading", { name: "Restaurant Pédagogique" }))
      .not.toBeInTheDocument();
  });

  it("says « Aucun plat ouvert. » for a restaurant 2 day without dish", async () => {
    await addDayR2(SEED_PASSWORD, {
      date: WEDNESDAY,
      note: "",
      theme: "",
      openedBy: "Mme Roux",
      dishes: [],
    });
    await renderPanel();
    useClock.setState({ now: TUESDAY });
    await expect.element(panel().getByText("Aucun plat ouvert.")).toBeVisible();
    expect(blockLines("Aristide")).toStrictEqual(["Ouvert par Mme Roux", "Aucun plat ouvert."]);
  });
});

describe("TomorrowPanel, « Imprimer » (07 § 6-7)", () => {
  it("prints document C from the block of restaurant 1, then gives the focus back", async () => {
    await renderPanel();
    await userEvent.click(printButton("Restaurant Pédagogique"));
    await vi.waitFor(() => {
      expect(calls).toHaveLength(1);
    });
    expect(calls[0]?.title).toBe("Restaurant Pédagogique — demain mardi 6 octobre 2026");
    expect(calls[0]?.text).toContain("Demain, mardi 6 octobre 2026");
    expect(calls[0]?.text).toContain("15 couverts · 95,20 €");
    globalThis.dispatchEvent(new Event("afterprint"));
    expect(document.title).toBe(PAGE_TITLE);
    await expect.element(printButton("Restaurant Pédagogique")).toHaveFocus();
  });

  it("prints document D from the block of restaurant 2, one voucher per order (E-16)", async () => {
    await renderPanel();
    await userEvent.click(printButton("Aristide"));
    await vi.waitFor(() => {
      expect(calls).toHaveLength(1);
    });
    expect(calls[0]?.title).toBe("Aristide — demain mardi 6 octobre 2026");
    expect(calls[0]?.text).toContain("4 portions · 4,50 € + 1 ticket restaurant");
    expect(calls[0]?.text).not.toContain("Paul Durand");
  });

  it("names the icon buttons « Imprimer », with the same tooltip (07 § 5)", async () => {
    await renderPanel();
    await expect.element(printButton("Aristide")).toHaveAttribute("title", "Imprimer");
  });
});
