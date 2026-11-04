import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { useClock } from "@/background/clock";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { renderColumn } from "@/test/column-page";
import { urlParams } from "@/test/public-page";

// Dishes of the R2 staff card: addition, edition, deletion (06 § 5.2, § 6, 05 § 6.3; D-19, D-21, D-22; E-36, E-38,
// E-48; 09 C-14, C-20 to C-22). The R2 column with the staff card, a staff session open, through `renderColumn`, each
// on its own fake script. Seed of parite.md § 2: Tuesday 6 October 2026 has « Lasagnes » (15, 4,50 €, 1 booking
// of 1 portion) and « Bowl » (10, voucher, 1 booking of 3 portions); an orphan booking of 2 portions belongs to a
// deleted dish.

const TUESDAY = "/collegue?r2=2026-10-06";
const initialClock = useClock.getState();

// Date at TEST_NOW and the staff session open for each test; clock and local copy put back afterwards.
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

const renderCard = async (url = TUESDAY) => renderColumn(url, "r2", <StaffDayCardR2 />);
const button = (name: string | RegExp) => page.getByRole("button", { name, exact: true });
const field = (name: string) => page.getByRole("textbox", { name, exact: true });
// With its suggestions (`list`), the price input is a combobox.
const price = () => page.getByLabelText("Prix (optionnel)", { exact: true });
const voucher = () => page.getByRole("checkbox", { name: "Ticket restaurant" });
const toastText = (text: string) => page.getByText(text, { exact: true }).first();
const editButtons = () => button("Modifier ce plat");

/** Writes sent to the script, reads of the full state left out. */
function posts() {
  return fakeScript()
    .requests.filter((request) => request.method === "POST")
    .map((request) => request.json as Record<string, unknown>)
    .filter((body) => body["action"] !== "getAdminState");
}

/** Opens « Ajouter un plat » by its button: the name takes the focus. */
async function openAdd() {
  const rendered = await renderCard();
  await userEvent.click(button("+ Ajouter un plat à ce jour"));
  await expect.element(field("Nom du plat")).toHaveFocus();
  return rendered;
}

/** Opens « Modifier ce plat » of the dish at `index` on the card: the name takes the focus. */
async function openEdit(index: number) {
  const rendered = await renderCard();
  await userEvent.click(editButtons().nth(index));
  await expect.element(field("Nom du plat")).toHaveFocus();
  return rendered;
}

describe("dish actions (05 § 6.3, C-20)", () => {
  it("shows « Modifier ce plat » and « Supprimer ce plat » for each dish, then « + Ajouter un plat à ce jour »", async () => {
    await renderCard();
    await expect.element(editButtons().nth(1)).toBeVisible();
    expect(editButtons().elements()).toHaveLength(2);
    expect(button("Supprimer ce plat").elements()).toHaveLength(2);
    await expect.element(editButtons().first()).toHaveAttribute("aria-expanded", "false");
    await expect.element(button("+ Ajouter un plat à ce jour")).toBeVisible();
  });

  it("keeps them on a past day (05 § 5.3)", async () => {
    await renderCard("/collegue?r2=2026-10-01");
    await expect.element(editButtons()).toBeVisible();
    await expect.element(button("+ Ajouter un plat à ce jour")).toBeVisible();
  });
});

describe("« Ajouter un plat » (06 § 6.1-6.2, C-21)", () => {
  it("opens in place of its button, empty, with the placeholders and the price suggestions", async () => {
    const { router } = await openAdd();
    expect(urlParams(router)).toStrictEqual(["ajoutPlat=true", "r2=2026-10-06"]);
    await expect.element(button("+ Ajouter un plat à ce jour")).not.toBeInTheDocument();
    await expect.element(field("Nom du plat")).toHaveAttribute("placeholder", "Ex. salade César");
    await expect.element(field("Stock")).toHaveAttribute("placeholder", "Ex. 10");
    await expect.element(price()).toHaveAttribute("placeholder", "Ex. 3,50");
    await expect.element(voucher()).not.toBeChecked();
    // 08 § 6.4: every price of the R2 dishes, once, in ascending order.
    const list = document.querySelector("datalist");
    expect([...(list?.options ?? [])].map((option) => option.value)).toStrictEqual([
      "4,50",
      "6,00",
      "6,50",
    ]);
  });

  it("refuses an empty name and stock, then a price of 0 (06 § 6.1, D-22)", async () => {
    await openAdd();
    await userEvent.click(button("Ajouter ce plat"));
    await expect.element(page.getByText("Indiquez le nom du plat.")).toBeVisible();
    await expect.element(page.getByText("Indiquez un stock supérieur à 0.")).toBeVisible();
    await expect.element(field("Nom du plat")).toHaveFocus();
    await userEvent.type(field("Nom du plat"), "Tiramisu");
    await userEvent.type(field("Stock"), "0");
    await userEvent.type(price(), "0");
    await userEvent.click(button("Ajouter ce plat"));
    await expect.element(page.getByText("Indiquez un stock supérieur à 0.")).toBeVisible();
    await expect
      .element(page.getByText("Indiquez un prix supérieur à 0, ou laissez le champ vide."))
      .toBeVisible();
    expect(posts()).toStrictEqual([]);
  });

  it("sends the dish, closes and gives the focus back to its button (02 § 4.7, E-48)", async () => {
    const { router } = await openAdd();
    await userEvent.type(field("Nom du plat"), "  Tiramisu ");
    await userEvent.type(field("Stock"), "6");
    await userEvent.type(price(), "3,5");
    const release = fakeScript().hold();
    await userEvent.click(button("Ajouter ce plat"));
    await expect.element(button("Ajout en cours…")).toHaveAttribute("aria-busy", "true");
    await expect.element(button("Annuler")).toBeDisabled();
    release();
    await expect.element(toastText("Plat ajouté.")).toBeVisible();
    expect(posts()).toStrictEqual([
      {
        action: "addItemR2",
        password: SEED_PASSWORD,
        date: "2026-10-06",
        name: "Tiramisu",
        stock: 6,
        price: 3.5,
      },
    ]);
    await expect.element(button("+ Ajouter un plat à ce jour")).toHaveFocus();
    expect(urlParams(router)).toStrictEqual(["r2=2026-10-06"]);
    await expect.element(page.getByText("Tiramisu — 3,50 €")).toBeVisible();
  });

  it("codes the voucher in the name, price emptied, disabled and sent empty (06 § 4.3)", async () => {
    await openAdd();
    await userEvent.type(field("Nom du plat"), "Wrap");
    await userEvent.type(field("Stock"), "5");
    await userEvent.type(price(), "4");
    await userEvent.click(voucher());
    await expect.element(price()).toBeDisabled();
    await expect.element(price()).toHaveValue("");
    await expect.element(price()).toHaveAttribute("placeholder", "Ticket");
    await userEvent.click(button("Ajouter ce plat"));
    await expect.element(toastText("Plat ajouté.")).toBeVisible();
    expect(posts()).toStrictEqual([
      {
        action: "addItemR2",
        password: SEED_PASSWORD,
        date: "2026-10-06",
        name: "Wrap (ticket restaurant)",
        stock: 5,
        price: "",
      },
    ]);
    // Never shown with its mark (06 § 4.3).
    await expect.element(page.getByText("Wrap — prix d'un ticket restaurant")).toBeVisible();
  });

  it("keeps the form and its input after a failure, with the staff text of D-14", async () => {
    await openAdd();
    await userEvent.type(field("Nom du plat"), "Tiramisu");
    await userEvent.type(field("Stock"), "6");
    fakeScript().failNext("html");
    await userEvent.click(button("Ajouter ce plat"));
    await expect
      .element(toastText("Le service ne répond pas. Réessayez dans un instant."))
      .toBeVisible();
    await expect.element(field("Nom du plat")).toHaveValue("Tiramisu");
    await expect.element(button("Ajouter ce plat")).toBeEnabled();
  });

  it("« Annuler » closes and gives the focus back to its button (E-48)", async () => {
    const { router } = await openAdd();
    await userEvent.click(button("Annuler"));
    await expect.element(button("+ Ajouter un plat à ce jour")).toHaveFocus();
    expect(urlParams(router)).toStrictEqual(["r2=2026-10-06"]);
  });
});

describe("« Modifier ce plat » (06 § 6.1, § 6.3, C-22)", () => {
  it("accepts a stock equal to the portions booked and an emptied price (D-19, 06 § 6.1)", async () => {
    await openEdit(0);
    await userEvent.clear(field("Stock"));
    await userEvent.type(field("Stock"), "0");
    await userEvent.click(button("Enregistrer"));
    await expect.element(page.getByText("Indiquez un stock supérieur à 0.")).toBeVisible();
    await userEvent.clear(field("Stock"));
    await userEvent.type(field("Stock"), "1");
    await userEvent.clear(price());
    await userEvent.click(button("Enregistrer"));
    await expect.element(toastText("Plat modifié.")).toBeVisible();
    expect(posts().at(-1)).toMatchObject({ action: "editItemR2", stock: 1, price: "" });
    expect(Object.values(posts().at(-1) ?? {})).toContain("r2i-d+1-lasagnes");
  });

  it("sends the dish, closes and gives the focus back to « Modifier ce plat » (E-48)", async () => {
    const { router } = await openEdit(1);
    await userEvent.clear(field("Stock"));
    await userEvent.type(field("Stock"), "12");
    await userEvent.click(button("Enregistrer"));
    await expect.element(toastText("Plat modifié.")).toBeVisible();
    // The dish id goes under the script's field name (`api/actions.ts`, 02 § 4.7): only its value is read here.
    expect(posts().map((body) => Object.values(body))).toStrictEqual([
      ["editItemR2", SEED_PASSWORD, "r2i-d+1-bowl", "Bowl (ticket restaurant)", 12, ""],
    ]);
    await expect.element(editButtons().nth(1)).toHaveFocus();
    expect(urlParams(router)).toStrictEqual(["r2=2026-10-06"]);
    await expect.element(page.getByText("9 / 12")).toBeVisible();
  });

  it("shows the script's refusal and keeps the form (06 § 6.3)", async () => {
    await openEdit(0);
    fakeScript().failNext("error", "Plat introuvable.");
    await userEvent.click(button("Enregistrer"));
    await expect.element(toastText("Plat introuvable.")).toBeVisible();
    await expect.element(field("Nom du plat")).toHaveValue("Lasagnes");
  });

  it("« Annuler » closes and gives the focus back to « Modifier ce plat » (E-48)", async () => {
    const { router } = await openEdit(0);
    await userEvent.click(button("Annuler"));
    await expect.element(editButtons().first()).toHaveFocus();
    await expect.element(editButtons().first()).toHaveAttribute("aria-expanded", "false");
    expect(urlParams(router)).toStrictEqual(["r2=2026-10-06"]);
  });

  it("opens from the URL without taking the focus (reload, E-23)", async () => {
    await renderCard(`${TUESDAY}&editPlat=r2i-d%2B1-lasagnes`);
    await expect.element(field("Nom du plat")).toHaveValue("Lasagnes");
    await expect.element(field("Nom du plat")).not.toHaveFocus();
  });
});

describe("« Supprimer ce plat » (06 § 5.2, § 6.4, D-21, C-14)", () => {
  it("details the bookings left orphaned, deletes on the second click, focus on the date (E-38, E-48)", async () => {
    await renderCard();
    const detail =
      "Confirmer la suppression de ce plat (1 réservation ne sera plus affichée, les personnes ne seront pas prévenues)";
    await userEvent.click(button("Supprimer ce plat").first());
    const armed = page.getByRole("button", { name: detail });
    await expect.element(armed).toHaveTextContent("Confirmer ?");
    await expect.element(page.getByText(detail, { exact: true })).toBeVisible();
    await userEvent.click(armed);
    await expect.element(toastText("Plat supprimé.")).toBeVisible();
    expect(posts().map((body) => Object.values(body))).toStrictEqual([
      ["deleteItemR2", SEED_PASSWORD, "r2i-d+1-lasagnes"],
    ]);
    await expect.element(page.getByText(/^Lasagnes/u)).not.toBeInTheDocument();
    await expect.element(page.getByText("mardi 6 octobre 2026")).toHaveFocus();
  });

  it("keeps the text of 06 § 5.2 for a dish without booking", async () => {
    await renderCard("/collegue?r2=2026-10-13");
    await userEvent.click(button("Supprimer ce plat").first());
    await expect
      .element(page.getByRole("button", { name: "Confirmer la suppression de ce plat" }).first())
      .toHaveTextContent("Confirmer ?");
    await expect
      .element(page.getByText("Confirmer la suppression de ce plat"))
      .not.toBeInTheDocument();
  });

  it("comes back to rest after a refusal, with the script's message", async () => {
    await renderCard();
    fakeScript().failNext("error", "Plat introuvable.");
    await userEvent.click(button("Supprimer ce plat").first());
    await userEvent.click(page.getByRole("button", { name: /^Confirmer la suppression/u }));
    await expect.element(toastText("Plat introuvable.")).toBeVisible();
    await expect.element(button("Supprimer ce plat").first()).toBeEnabled();
    await expect.element(page.getByText(/^Lasagnes/u)).toBeVisible();
  });
});
