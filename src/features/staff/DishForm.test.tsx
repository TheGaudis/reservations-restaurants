import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { fakeScript } from "@/test/browser-fake-script";
import { urlParams } from "@/test/public-page";
import {
  button,
  editButtons,
  field,
  openAdd,
  posts,
  price,
  renderCard,
  setUpDishTests,
  toastText,
  voucher,
} from "@/test/staff-dishes";

// Dishes of the R2 staff card (06 § 6, 05 § 6.3; D-22; E-48; 09 C-20, C-21), on the seed of parite.md § 2 (see
// src/test/staff-dishes.tsx).

setUpDishTests();

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
