import { afterEach, beforeEach, expect, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { useClock } from "@/background/clock";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { renderColumn } from "@/test/column-page";

// Helpers of the tests of the dishes of the R2 staff card (features/staff/DishForm*.test.tsx): the R2 column with the
// staff card, a staff session open, on the fake script of the test (`renderColumn`, R-36). Seed of parite.md § 2:
// Tuesday 6 October 2026 has « Lasagnes » (15, 4,50 €, 1 booking of 1 portion) and « Bowl » (10, voucher, 1 booking of
// 3 portions); an orphan booking of 2 portions belongs to a deleted dish.

export const TUESDAY = "/collegue?r2=2026-10-06";
const initialClock = useClock.getState();

/** Date at TEST_NOW and the staff session open for each test; clock and local copy put back afterwards. */
export function setUpDishTests() {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TEST_NOW);
    useSessionStore.getState().open(SEED_PASSWORD);
  });
  afterEach(() => {
    useClock.setState(initialClock, true);
    vi.useRealTimers();
    localStorage.clear();
  });
}

export const renderCard = async (url = TUESDAY) => renderColumn(url, "r2", <StaffDayCardR2 />);
export const button = (name: string | RegExp) => page.getByRole("button", { name, exact: true });
export const field = (name: string) => page.getByRole("textbox", { name, exact: true });
// With its suggestions (`list`), the price input is a combobox.
export const price = () => page.getByLabelText("Prix (optionnel)", { exact: true });
export const voucher = () => page.getByRole("checkbox", { name: "Ticket restaurant" });
export const toastText = (text: string) => page.getByText(text, { exact: true }).first();
export const editButtons = () => button("Modifier ce plat");

/** Writes sent to the script, reads of the full state left out. */
export function posts() {
  return fakeScript()
    .requests.filter((request) => request.method === "POST")
    .map((request) => request.json as Record<string, unknown>)
    .filter((body) => body["action"] !== "getAdminState");
}

/** Opens « Ajouter un plat » by its button: the name takes the focus. */
export async function openAdd() {
  const rendered = await renderCard();
  await userEvent.click(button("+ Ajouter un plat à ce jour"));
  await expect.element(field("Nom du plat")).toHaveFocus();
  return rendered;
}

/** Opens « Modifier ce plat » of the dish at `index` on the card: the name takes the focus. */
export async function openEdit(index: number) {
  const rendered = await renderCard();
  await userEvent.click(editButtons().nth(index));
  await expect.element(field("Nom du plat")).toHaveFocus();
  return rendered;
}
