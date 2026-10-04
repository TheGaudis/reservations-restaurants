import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { fakeScript } from "@/test/browser-fake-script";
import {
  CLOSED,
  NO_DISH,
  PERSON,
  button,
  column,
  field,
  fillPerson,
  openForm,
  otherVisitorTakes,
  posts,
  quantity,
  renderPage,
  reserve,
  setUpOrderFormTests,
  submit,
  toastText,
  typeQuantity,
  watchCutoff,
} from "@/test/order-form-r2";
import { urlParams } from "@/test/public-page";

// Sending of the R2 order form (04 § 6, § 7; D-14, D-16; E-09, E-11 to E-14; invariants 3 to 5), on the seed of
// parite.md § 2 (see OrderFormR2.test.tsx).

setUpOrderFormTests();

/** Dish id and portions of each item of an order body, in the order sent. */
function dishLines(body: Record<string, unknown>): unknown[][] {
  const items = body["items"];
  if (!Array.isArray(items)) return [];
  return items.map((item: unknown): unknown[] =>
    typeof item === "object" && item !== null ? Object.values(item) : [],
  );
}

describe("sending (04 § 6, § 7)", () => {
  it("sends the exact body once, then shows the summary with the focus and closes", async () => {
    const { router } = await openForm();
    await typeQuantity("Salade", "1");
    await typeQuantity("Lasagnes", "2");
    await fillPerson({
      name: "  Ariele Gsell ",
      contact: " a.gsell@exemple.fr ",
      className: " VS ",
    });
    const release = fakeScript().hold();
    await userEvent.click(submit());
    // Busy button, « Annuler » disabled (04 § 6.1, E-13).
    await expect.element(button("Envoi en cours…")).toHaveAttribute("aria-busy", "true");
    await expect.element(button("Annuler")).toBeDisabled();
    await expect.poll(() => posts().length).toBe(1);
    release();

    const title = column().getByText("Réservation enregistrée", { exact: true });
    await expect.element(title).toHaveFocus();
    await expect.element(toastText("Réservation confirmée.")).toBeVisible();
    await expect.element(field("Nom et prénom")).not.toBeInTheDocument();
    expect(urlParams(router)).toStrictEqual(["r2=2026-10-05"]);
    // Dine-in on a voucher day (invariant 5); dishes in the order of the sheet; texts trimmed (04 § 6.2).
    // Values of the body in the order of api/actions.ts, whose names are checked there and by REG-23.
    const [body = {}] = posts();
    expect(Object.values(body)).toStrictEqual([
      "addBookingR2Multi",
      "2026-10-05",
      "Ariele Gsell",
      "a.gsell@exemple.fr",
      "VS",
      expect.any(String),
      expect.any(Array),
      "",
      expect.any(String),
    ]);
    expect(dishLines(body)).toStrictEqual([
      ["r2i-d0-lasagnes", 2],
      ["r2i-d0-salade", 1],
    ]);
    const summary = column().getByRole("status").filter({ hasText: "Réservation enregistrée" });
    await expect.element(summary.getByText("Sur place", { exact: true })).toBeVisible();
    await expect.element(summary.getByText("× 2", { exact: true })).toBeVisible();
    await expect
      .element(summary.getByText("9,00 € (hors plats sans prix indiqué)", { exact: true }))
      .toBeVisible();
    // The list comes back with the stock left, and « Réserver » under the summary (04 § 6.3).
    await expect.element(column().getByText("2 / 10", { exact: true })).toBeVisible();
    await expect.element(reserve()).toBeVisible();
  });

  it("sends the mode chosen on a day without voucher", async () => {
    await renderPage("/?r2=2026-10-13");
    await userEvent.click(reserve());
    await typeQuantity("Lasagnes", "1");
    await fillPerson();
    await userEvent.click(submit());
    await expect.element(toastText("Réservation confirmée.")).toBeVisible();
    await userEvent.click(reserve());
    await userEvent.click(column().getByRole("radio", { name: "Sur place" }));
    await typeQuantity("Lasagnes", "1");
    await fillPerson();
    await userEvent.click(submit());
    await expect.poll(() => posts().length).toBe(2);
    const [takeaway, dineIn] = posts();
    expect(takeaway?.["mode"]).not.toBe(dineIn?.["mode"]);
    const summary = column().getByRole("status").filter({ hasText: "Réservation enregistrée" });
    await expect.element(summary.getByText("Sur place", { exact: true })).toBeVisible();
  });

  it("shows the portions granted and both warnings (a-20, E-14)", async () => {
    fakeScript().db.mailError = "Service invoked too many times for one day: email.";
    await openForm();
    await typeQuantity("Lasagnes", "3");
    await fillPerson();
    await otherVisitorTakes("r2i-d0-lasagnes", 2);
    await userEvent.click(submit());
    const summary = column().getByRole("status").filter({ hasText: "Réservation enregistrée" });
    await expect.element(summary.getByText("× 2", { exact: true })).toBeVisible();
    await expect
      .element(
        summary.getByText(
          "Certaines quantités ont été ajustées faute de stock. Vérifiez votre email pour le détail.",
        ),
      )
      .toBeVisible();
    await expect
      .element(
        summary.getByText(
          /^L.email de confirmation n.a pas pu être envoyé\. Gardez ce récapitulatif\.$/u,
        ),
      )
      .toBeVisible();
  });

  it("keeps the form when nothing was granted, with the state read again and the same requestId (E-11)", async () => {
    await openForm();
    await typeQuantity("Wrap", "2");
    await fillPerson();
    await otherVisitorTakes("r2i-d0-wrap", 5);
    await userEvent.click(submit());
    await expect
      .element(toastText("Aucun des plats choisis n'est disponible en quantité suffisante."))
      .toBeVisible();
    await expect.element(field("Nom et prénom")).toHaveValue(PERSON.name);
    await expect.element(column().getByText("Épuisé", { exact: true })).toBeVisible();
    await expect
      .element(column().getByRole("status").filter({ hasText: "Réservation" }))
      .not.toBeInTheDocument();
    // The Wrap typed before has no field any more: it is not sent again.
    await userEvent.click(submit());
    await expect.element(column().getByText(NO_DISH, { exact: true })).toBeVisible();
    await typeQuantity("Lasagnes", "1");
    await userEvent.click(submit());
    await expect.element(column().getByText("Réservation enregistrée")).toHaveFocus();
    const [first, second] = posts();
    expect(dishLines(second ?? {})).toStrictEqual([["r2i-d0-lasagnes", 1]]);
    expect(second?.["requestId"]).toBe(first?.["requestId"]);
  });

  it("keeps the form and the requestId after an error; a lost answer then gets the duplicate summary (D-14, D-16)", async () => {
    await openForm();
    await typeQuantity("Lasagnes", "1");
    await fillPerson();
    fakeScript().failNext("error");
    await userEvent.click(submit());
    await expect
      .element(toastText("Le serveur est très sollicité : réessayez dans quelques secondes."))
      .toBeVisible();
    await expect.element(quantity("Lasagnes")).toHaveValue("1");
    fakeScript().failNext("network");
    await userEvent.click(submit());
    await expect.element(toastText(/^Le service de réservation ne répond pas\./u)).toBeVisible();
    await userEvent.click(submit());
    await expect.element(column().getByText("Réservation déjà enregistrée")).toHaveFocus();
    const summary = column().getByRole("status");
    await expect.element(summary.getByText("× 1", { exact: true })).toBeVisible();
    const ids = posts().map((body) => body["requestId"]);
    expect(new Set(ids).size).toBe(1);
    expect(ids).toHaveLength(3);
  });
});

describe("cut-off at 10:00 (04 § 5.3, invariant 4, E-09)", () => {
  it("closes the form on sending past 10:00, before the rules, and sends nothing", async () => {
    const rendered = await openForm();
    watchCutoff(rendered);
    await typeQuantity("Lasagnes", "1");
    vi.setSystemTime(Date.parse("2026-10-05T08:00:01.000Z"));
    // Identity left empty: the cut-off comes first.
    await userEvent.click(submit());
    await expect.element(toastText(CLOSED)).toBeVisible();
    await expect.element(quantity("Lasagnes")).not.toBeInTheDocument();
    await expect.element(column().getByText(/^Indiquez/u)).not.toBeInTheDocument();
    await expect.element(column().getByText(CLOSED, { exact: true }).last()).toBeVisible();
    expect(urlParams(rendered.router)).toStrictEqual(["r2=2026-10-05"]);
    expect(posts()).toStrictEqual([]);
  });

  it("closes a valid form on sending past 10:00", async () => {
    const rendered = await openForm();
    watchCutoff(rendered);
    await typeQuantity("Lasagnes", "1");
    await fillPerson();
    vi.setSystemTime(Date.parse("2026-10-05T08:00:01.000Z"));
    await userEvent.click(submit());
    await expect.element(toastText(CLOSED)).toBeVisible();
    await expect.element(quantity("Lasagnes")).not.toBeInTheDocument();
    expect(posts()).toStrictEqual([]);
  });
});
