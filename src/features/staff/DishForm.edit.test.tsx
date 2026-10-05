import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { fakeScript } from "@/test/browser-fake-script";
import { urlParams } from "@/test/public-page";
import {
  button,
  editButtons,
  field,
  openEdit,
  posts,
  price,
  renderCard,
  setUpDishTests,
  toastText,
  TUESDAY,
  voucher,
} from "@/test/staff-dishes";

// Edition and deletion of a dish of the R2 staff card (06 § 5.2, § 6.3-6.4; D-19, D-21; E-36, E-38, E-48; 09 C-14,
// C-22), on the seed of parite.md § 2 (see src/test/staff-dishes.tsx).

setUpDishTests();

describe("« Modifier ce plat » (06 § 6.1, § 6.3, C-22)", () => {
  it("opens under the dish with its values, the voucher price disabled", async () => {
    const { router } = await openEdit(1);
    expect(urlParams(router)).toStrictEqual(["editPlat=r2i-d+1-bowl", "r2=2026-10-06"]);
    await expect.element(editButtons().nth(1)).toHaveAttribute("aria-expanded", "true");
    await expect.element(field("Nom du plat")).toHaveValue("Bowl");
    await expect.element(field("Stock")).toHaveValue("10");
    await expect.element(voucher()).toBeChecked();
    await expect.element(price()).toBeDisabled();
    await expect.element(price()).toHaveAttribute("placeholder", "Ticket");
  });

  it("refuses a stock under the portions booked (D-19, E-36)", async () => {
    await openEdit(1);
    await userEvent.clear(field("Stock"));
    await userEvent.type(field("Stock"), "2");
    await userEvent.click(button("Enregistrer"));
    await expect
      .element(
        page.getByText(
          "Impossible : 3 portions déjà réservées pour ce plat, le stock ne peut pas être inférieur.",
        ),
      )
      .toBeVisible();
    await expect.element(field("Stock")).toHaveFocus();
    expect(posts()).toStrictEqual([]);
  });

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
