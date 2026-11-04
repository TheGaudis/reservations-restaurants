import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { useClock } from "@/background/clock";
import { PrintListButton } from "@/features/print/PrintListButton";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { useSessionStore } from "@/session/session";
import { TEST_NOW } from "@/test/clock";
import { renderColumn } from "@/test/column-page";

// « Imprimer la liste » of the staff cards (05 § 5.3, § 6.2, 07 § 1, § 3, § 4; I-01, I-02) on the seed of parite.md § 2, in the same
// document (PLAN § 3.8, E-15). `window.print` is a spy that records the title and the printed text at the call.

const PAGE_TITLE = "Réservations — Restaurants pédagogiques";

interface PrintCall {
  title: string;
  text: string;
}

let calls: PrintCall[];

function printRoot(): HTMLElement | null {
  return document.body.querySelector(":scope > .print-root");
}

const initialClock = useClock.getState();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
  document.title = PAGE_TITLE;
  calls = [];
  vi.spyOn(window, "print").mockImplementation(() => {
    calls.push({ title: document.title, text: printRoot()?.textContent ?? "" });
  });
  useSessionStore.getState().open(SEED_PASSWORD);
});

afterEach(() => {
  globalThis.dispatchEvent(new Event("afterprint"));
  useClock.setState(initialClock, true);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const printButton = () => page.getByRole("button", { name: "Imprimer la liste" });

async function renderCard(url: string) {
  await renderColumn(url, "r1", <StaffDayCardR1 />);
  await expect.element(page.getByText(/^Ouvert par /u)).toBeVisible();
}

describe("PrintListButton", () => {
  it("prints document A of the selected day, titled with the restaurant and the date (07 § 3)", async () => {
    await renderCard("/collegue?r1=2026-10-06");
    await userEvent.click(printButton());
    await vi.waitFor(() => {
      expect(calls).toHaveLength(1);
    });
    expect(calls[0]?.title).toBe("Restaurant Pédagogique — mardi 6 octobre 2026");
    expect(calls[0]?.text).toContain("Imprimé le 5 octobre 2026");
    expect(calls[0]?.text).toContain("Cyrille Ungerer");
    expect(calls[0]?.text).toContain("15 couverts · 95,20\u00A0€");
  });

  it("after afterprint: title of the page, empty .print-root, focus back on the button (PLAN P6)", async () => {
    await renderCard("/collegue?r1=2026-10-06");
    await userEvent.click(printButton());
    await vi.waitFor(() => {
      expect(calls).toHaveLength(1);
    });
    globalThis.dispatchEvent(new Event("afterprint"));
    expect(document.title).toBe(PAGE_TITLE);
    expect(printRoot()?.childElementCount).toBe(0);
    await expect.element(printButton()).toHaveFocus();
  });

  it("stays on a past day, with its bookings (05 § 5.3)", async () => {
    await renderCard("/collegue?r1=2026-10-01");
    await userEvent.click(printButton());
    await vi.waitFor(() => {
      expect(calls).toHaveLength(1);
    });
    expect(calls[0]?.title).toBe("Restaurant Pédagogique — jeudi 1er octobre 2026");
  });

  it("prints document B from the R2 card: customers by class then name, one voucher per order (07 § 4, E-16)", async () => {
    await renderColumn(
      "/collegue?r2=2026-10-06",
      "r2",
      <PrintListButton restaurant="r2" iso="2026-10-06" />,
    );
    await userEvent.click(printButton());
    await vi.waitFor(() => {
      expect(calls).toHaveLength(1);
    });
    expect(calls[0]?.title).toBe("Aristide — mardi 6 octobre 2026");
    expect(calls[0]?.text).toContain("Par client (2)");
    expect(calls[0]?.text).toContain("2 clients · 4 portions · 4,50\u00A0€ + 1 ticket restaurant");
    expect(calls[0]?.text).not.toContain("Paul Durand");
  });
});
