import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { stateKeys } from "@/queries/state";
import {
  NO_DISH,
  button,
  column,
  field,
  fillPerson,
  liveTotal,
  openForm,
  otherVisitorTakes,
  posts,
  quantity,
  renderPage,
  reserve,
  setUpOrderFormTests,
  submit,
  typeQuantity,
} from "@/test/order-form-r2";
import { urlParams } from "@/test/public-page";

// R2 order form on the public page (04 § 5.1, § 5.3, § 5.4, § 6, § 7; D-10, D-16 to D-18; E-09, E-11 to E-14, E-41;
// invariants 3 to 5), on the seed of parite.md § 2: Monday 5 October 2026, 9:30, is a voucher day (Lasagnes 4 left
// out of 10 at 4,50 €, Bowl and Wrap paid with a voucher, Salade without a price); Tuesday 13 has no voucher dish.

setUpOrderFormTests();

describe("opening (04 § 5.1, § 5.3)", () => {
  it("folds the dish list, focuses the first quantity, offers dine-in only on a voucher day", async () => {
    const { router } = await openForm();
    expect(urlParams(router)).toStrictEqual(["r2=2026-10-05", "reserver=r2"]);
    await expect.element(column().getByText("4 / 10", { exact: true })).not.toBeInTheDocument();
    await expect.element(reserve()).not.toBeInTheDocument();
    await expect
      .element(column().getByRole("group", { name: "Choisissez vos plats et quantités" }))
      .toBeVisible();
    await expect.element(column().getByText("4 disponibles", { exact: true })).toBeVisible();
    await expect.element(column().getByText("10 disponibles", { exact: true })).toBeVisible();
    await expect.element(column().getByRole("radio")).toHaveAccessibleName("Sur place");
    await expect.element(column().getByRole("radio")).toBeChecked();
    await expect
      .element(
        column().getByText(
          "Sur place uniquement ce jour-là : repas au prix d'un ticket restaurant.",
          { exact: true },
        ),
      )
      .toBeVisible();
    await expect.element(button("Ajouter une portion : Lasagnes")).toBeInTheDocument();
    await expect.element(button("Retirer une portion : Salade")).toBeInTheDocument();
    expect(liveTotal()).toBe("");
  });

  it("offers « À emporter », chosen first, on a day without voucher", async () => {
    await renderPage("/?r2=2026-10-13");
    await userEvent.click(reserve());
    await expect.element(column().getByRole("radio", { name: "À emporter" })).toBeChecked();
    await expect.element(column().getByRole("radio", { name: "Sur place" })).not.toBeChecked();
    await expect
      .element(column().getByText(/^Sur place uniquement ce jour-là/u))
      .not.toBeInTheDocument();
  });

  it("computes the four totals of 04 § 5.3, one meal voucher per order", async () => {
    await openForm();
    await typeQuantity("Lasagnes", "2");
    expect(liveTotal()).toBe("Total : 9,00 €");
    await typeQuantity("Bowl", "3");
    await typeQuantity("Wrap", "1");
    expect(liveTotal()).toBe("Total : 9,00 € + 1 ticket restaurant");
    await typeQuantity("Lasagnes", "");
    await typeQuantity("Wrap", "");
    await typeQuantity("Bowl", "1");
    expect(liveTotal()).toBe("Total : 1 ticket restaurant");
    await typeQuantity("Bowl", "");
    await typeQuantity("Lasagnes", "1");
    await typeQuantity("Salade", "1");
    expect(liveTotal()).toBe("Total (hors plats sans prix indiqué) : 4,50 €");
  });

  it("shows « Épuisé » without a field for a sold-out dish", async () => {
    await otherVisitorTakes("r2i-d0-wrap", 5);
    await openForm();
    await expect.element(column().getByText("Épuisé", { exact: true })).toBeVisible();
    await expect.element(quantity("Wrap")).not.toBeInTheDocument();
  });

  it("gives the focus back to « Réserver » after « Annuler », and a new opening starts empty (D-10)", async () => {
    const { router } = await openForm();
    await typeQuantity("Lasagnes", "2");
    await userEvent.type(field("Nom et prénom"), "Ariele");
    await userEvent.click(button("Annuler"));
    await expect.element(reserve()).toHaveFocus();
    await expect.element(column().getByText("4 / 10", { exact: true })).toBeVisible();
    expect(urlParams(router)).toStrictEqual(["r2=2026-10-05"]);
    expect(posts()).toStrictEqual([]);
    await userEvent.click(reserve());
    await expect.element(quantity("Lasagnes")).toHaveValue("");
    await expect.element(field("Nom et prénom")).toHaveValue("");
  });
});

describe("validation (04 § 5.3, § 5.4, D-18, E-41)", () => {
  it("ties « Choisissez au moins un plat. » to the dishes and focuses the first quantity", async () => {
    await openForm();
    await fillPerson();
    await userEvent.click(submit());
    const dishes = column().getByRole("group", { name: "Choisissez vos plats et quantités" });
    await expect.element(dishes).toHaveAccessibleDescription(NO_DISH);
    await expect.element(quantity("Lasagnes")).toHaveFocus();
    await expect.element(quantity("Lasagnes")).toHaveAccessibleDescription(NO_DISH);
    await expect.element(column().getByText(NO_DISH, { exact: true })).toBeVisible();
    await expect.element(column().getByText(/^Indiquez/u)).not.toBeInTheDocument();
    expect(posts()).toStrictEqual([]);
    // A quantity above 0 removes the message (E-46).
    await userEvent.type(quantity("Salade"), "1");
    await expect.element(column().getByText(NO_DISH, { exact: true })).not.toBeInTheDocument();
    await expect.element(dishes).not.toHaveAttribute("aria-describedby");
  });

  it("shows every message at once, the focus on the first invalid field in DOM order", async () => {
    await openForm();
    await userEvent.click(submit());
    await expect.element(column().getByText(NO_DISH, { exact: true })).toBeVisible();
    await expect
      .element(field("Nom et prénom"))
      .toHaveAccessibleDescription("Indiquez vos nom et prénom.");
    await expect
      .element(field("Adresse email"))
      .toHaveAccessibleDescription(
        "Indiquez votre adresse email. Pour vous envoyer la confirmation.",
      );
    await expect
      .element(field("Classe ou service"))
      .toHaveAccessibleDescription("Indiquez votre classe ou votre service.");
    await expect.element(quantity("Lasagnes")).toHaveFocus();
  });

  it("refuses more portions than left after the state was read again (D-18)", async () => {
    const { queryClient } = await openForm();
    await fillPerson();
    await typeQuantity("Lasagnes", "3");
    await otherVisitorTakes("r2i-d0-lasagnes", 2);
    await queryClient.invalidateQueries({ queryKey: stateKeys.public() });
    await expect.element(column().getByText("2 disponibles", { exact: true })).toBeVisible();
    await userEvent.click(submit());
    await expect
      .element(column().getByText("2 portions au maximum (stock restant).", { exact: true }))
      .toBeVisible();
    expect(posts()).toStrictEqual([]);
  });
});
