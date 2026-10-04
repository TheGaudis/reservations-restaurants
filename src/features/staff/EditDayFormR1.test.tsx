import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { useClock } from "@/background/clock";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { urlParams } from "@/test/public-page";
import { actionPosts, expectToast, renderStaffColumn } from "@/test/staff-column";

// « Modifier ce jour » of the R1 card (06 § 5.1; D-19; E-48; 09 C-13) on the seed of parite.md § 2: Tuesday
// 6 October 2026 has a capacity of 20, 15 seats booked, the menu « Velouté de potiron, blanquette, tarte Tatin ».

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
});

const initialClock = useClock.getState();

afterEach(() => {
  useClock.setState(initialClock, true);
  vi.useRealTimers();
});

const MENU = "Velouté de potiron, blanquette, tarte Tatin";

const button = (name: string) => page.getByRole("button", { name, exact: true });
const field = (name: string) => page.getByLabelText(name, { exact: true });
const capacity = () => field("Nombre de couverts disponibles");
const editButton = () => button("Modifier ce jour");
const save = () => page.getByRole("button", { name: /^(?:Enregistrer|Enregistrement…)$/u });

async function openForm() {
  const rendered = await renderStaffColumn("/collegue?r1=2026-10-06", "r1", <StaffDayCardR1 />);
  await expect.element(editButton()).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(editButton());
  await expect.element(capacity()).toBeVisible();
  return rendered;
}

function adminReads(): number {
  return actionPosts("getAdminState").length;
}

describe("opening (06 § 5.1, 05 § 5.3)", () => {
  it("opens under the actions with the values of the day, `editJour=r1` in the URL", async () => {
    const { router } = await openForm();
    expect(urlParams(router)).toStrictEqual(["editJour=r1", "r1=2026-10-06"]);
    await expect.element(editButton()).toHaveAttribute("aria-expanded", "true");
    await expect.element(capacity()).toHaveValue(20);
    await expect.element(field("Thème du jour (optionnel)")).toHaveValue("");
    await expect.element(field("Menu du jour (optionnel)")).toHaveValue(MENU);
  });

  it("closes with « Annuler », sends nothing and gives the focus back to « Modifier ce jour » (E-48)", async () => {
    const { router } = await openForm();
    await userEvent.fill(capacity(), "30");
    await userEvent.click(button("Annuler"));
    await expect.element(capacity()).not.toBeInTheDocument();
    await expect.element(editButton()).toHaveFocus();
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-06"]);
    expect(actionPosts("editDayR1")).toStrictEqual([]);
  });
});

describe("checks (06 § 5.1, D-19)", () => {
  it.each([
    ["", "Indiquez un nombre de couverts supérieur à 0."],
    ["0", "Indiquez un nombre de couverts supérieur à 0."],
    [
      "14",
      "Impossible : 15 couvert(s) déjà réservé(s) pour ce jour, la capacité ne peut pas être inférieure.",
    ],
  ])("refuses the capacity « %s »: %s", async (typed, message) => {
    await openForm();
    await userEvent.fill(capacity(), typed);
    await userEvent.click(save());
    await expect.element(page.getByText(message, { exact: true })).toBeVisible();
    await expect.element(capacity()).toHaveFocus();
    expect(actionPosts("editDayR1")).toStrictEqual([]);
  });
});

describe("sending (06 § 5.1, 02 § 4.7)", () => {
  it("sends the exact body, « Jour modifié. », closes and focuses « Modifier ce jour »", async () => {
    const { router } = await openForm();
    await userEvent.fill(capacity(), "16");
    await userEvent.fill(field("Thème du jour (optionnel)"), " Automne ");
    await userEvent.click(save());
    await expectToast("Jour modifié.");
    expect(actionPosts("editDayR1")).toStrictEqual([
      {
        action: "editDayR1",
        password: SEED_PASSWORD,
        date: "2026-10-06",
        capacity: 16,
        menu: MENU,
        theme: "Automne",
      },
    ]);
    await expect.element(capacity()).not.toBeInTheDocument();
    await expect.element(editButton()).toHaveFocus();
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-06"]);
    await expect.element(page.getByText("1 / 16 couverts", { exact: true })).toBeVisible();
  });

  it("shows a refusal of the script under the capacity and reads the state again (a-4)", async () => {
    await openForm();
    await userEvent.fill(capacity(), "16");
    const reads = adminReads();
    const refusal =
      "Impossible : 17 couvert(s) déjà réservé(s) pour ce jour, la capacité ne peut pas être inférieure.";
    fakeScript().failNext("error", refusal);
    await userEvent.click(save());
    await expect.element(page.getByText(refusal, { exact: true })).toBeVisible();
    await expect.element(capacity()).toHaveFocus();
    await expect.poll(adminReads).toBeGreaterThan(reads);
  });

  it("shows the staff text of D-14 in a toast when the service fails", async () => {
    await openForm();
    fakeScript().failNext("html");
    await userEvent.click(save());
    await expectToast("Le service ne répond pas. Réessayez dans un instant.");
    await expect.element(capacity()).toHaveValue(20);
  });
});
