import { expect, test } from "../fixtures";
import { longDate, selectDay, showPeriod } from "../pages/calendar";
import { bookingSummary, dayCard, dishRow, reserveButton } from "../pages/day-card";
import { gotoHome, toast, toastKind } from "../pages/home";
import {
  cancelOrderR2,
  fillOrderR2,
  openOrderR2,
  orderR2Form,
  orderR2Total,
  quantityField,
  selectedServiceMode,
  serviceModeOption,
  submitOrderR2,
} from "../pages/order-r2";
import { target } from "../pages/target";
import { exposed, otherOrderR2, posts, rawTexts } from "./helpers";

// R2 card, order form and summary (09 § 3: P-10 to P-14, P-16, P-17; 04 § 4.3, § 5.3, § 6.3, § 7; 05 § 6).
// 10:00 cut-off and Paris time: public-r2-cutoff.spec.ts.

const PERSON = { name: "Ariele Gsell", contact: "a.gsell@exemple.fr", className: "Vie scolaire" };
const CLOSED =
  "Commandes en ligne clôturées à 10h. Venez au restaurant Aristide à partir de 12h pour commander sur place.";
const NONE_AVAILABLE = "Aucun des plats choisis n'est disponible en quantité suffisante.";
const ADJUSTED =
  "Certaines quantités ont été ajustées faute de stock. Vérifiez votre email pour le détail.";
const EMAIL_FAILED = "L'email de confirmation n'a pas pu être envoyé. Gardez ce récapitulatif.";
const VOUCHER_HELP = "Sur place uniquement ce jour-là : repas au prix d'un ticket restaurant.";

test.use({ reducedMotion: "reduce" });

test(
  "r2DayCardStates (REG-21)",
  { tag: ["@changed:E-27", "@P-10", "@P-11", "@P-12", "@P-16", "@P-17", "@p4"] },
  async ({ page }) => {
    const react = target(test.info()) === "react";
    await gotoHome(page);
    const card = dayCard(page, "r2");
    const pill = (dish: string) => dishRow(page, dish).getByText(/^-?\d+ \/ \d+$/u);

    // P-12: orders open, a voucher day.
    await expect(card).toContainText(longDate("2026-10-05"));
    await expect(card.getByText("Thème du jour", { exact: true })).toBeVisible();
    await expect(card.getByText("Semaine italienne", { exact: true })).toBeVisible();
    expect(await rawTexts(card, /^(?:Lasagnes|Bowl|Wrap|Salade)/u)).toStrictEqual([
      "Lasagnes\u00A0— 4,50\u00A0€",
      "Bowl\u00A0— prix d'un ticket restaurant",
      "Wrap\u00A0— prix d'un ticket restaurant",
      "Salade",
    ]);
    await expect(pill("Lasagnes")).toHaveText("4 / 10");
    await expect(pill("Bowl")).toHaveText("10 / 10");
    await expect(pill("Wrap")).toHaveText("5 / 5");
    await expect(pill("Salade")).toHaveText("5 / 5");
    await expect(reserveButton(page, "r2")).toBeVisible();
    await expect(card.getByText(CLOSED)).toHaveCount(0);

    // P-10: no service.
    await selectDay(page, "r2", "2026-10-07");
    await expect(card.getByText("Aucune réservation possible ce jour-là.")).toBeVisible();
    await expect(reserveButton(page, "r2")).toHaveCount(0);

    // P-11: a day open without any dish.
    await selectDay(page, "r2", "2026-10-10");
    await expect(card).toContainText(longDate("2026-10-10"));
    await expect(card.getByText("Journée bretonne", { exact: true })).toBeVisible();
    await expect(card.getByText("Note", { exact: true })).toBeVisible();
    await expect(card.getByText("Crêpes à emporter le midi", { exact: true })).toBeVisible();
    await expect(card.getByText(/^-?\d+ \/ \d+$/u)).toHaveCount(0);
    await expect(reserveButton(page, "r2")).toHaveCount(0);

    // P-16: every dish sold out; E-27: « Épuisé » and a sentence on React only.
    await selectDay(page, "r2", "2026-10-11");
    await expect(pill("Couscous")).toHaveText("0 / 3");
    await expect(pill("Tajine")).toHaveText("0 / 2");
    await expect(reserveButton(page, "r2")).toHaveCount(0);
    await expect(card.getByText("Épuisé", { exact: true })).toHaveCount(react ? 2 : 0);
    await expect(card.getByText("Tous les plats sont épuisés.", { exact: true })).toHaveCount(
      react ? 1 : 0,
    );

    // P-17: past day, no button and no closing note.
    await showPeriod(page, "r2", "previous");
    await selectDay(page, "r2", "2026-10-01");
    await expect(pill("Lasagnes")).toHaveText("8 / 10");
    await expect(reserveButton(page, "r2")).toHaveCount(0);
    await expect(card.getByText(CLOSED)).toHaveCount(0);
  },
);

test.describe("r2OrderFormVoucherDay (REG-22)", () => {
  test(
    "r2OrderFormVoucherDay (REG-22)",
    { tag: ["@changed:E-34", "@changed:E-41", "@P-13", "@p4"] },
    async ({ page, fakeScript }) => {
      const react = target(test.info()) === "react";
      await gotoHome(page);
      await openOrderR2(page);
      const form = orderR2Form(page);

      // The dish list folds away (05 § 6.4); focus on the first quantity.
      await expect.poll(async () => exposed(dishRow(page, "Lasagnes"))).toBe(false);
      await expect(quantityField(page, "Lasagnes")).toBeFocused();
      await expect(form.getByText("4 disponibles", { exact: true })).toBeVisible();

      // A voucher day is dine-in only (invariant 5).
      await expect(selectedServiceMode(page)).toHaveAccessibleName("Sur place");
      await expect(serviceModeOption(page, "takeaway")).toHaveCount(0);
      await expect(form.getByText(VOUCHER_HELP, { exact: true })).toBeVisible();

      // E-34: − / + buttons on React only.
      await expect(
        form.getByRole("button", { name: "Ajouter une portion : Lasagnes" }),
      ).toHaveCount(react ? 1 : 0);

      // The four totals of 04 § 5.3: one voucher per order at most.
      const total = async (quantities: Record<string, string>, text: string) => {
        await fillOrderR2(page, { quantities });
        expect(await rawTexts(form, /^Total/u)).toStrictEqual([text]);
      };
      await total({ Lasagnes: "2" }, "Total : 9,00\u00A0€");
      await total({ Bowl: "3", Wrap: "1" }, "Total : 9,00\u00A0€ + 1 ticket restaurant");
      await total({ Lasagnes: "", Wrap: "", Bowl: "1" }, "Total : 1 ticket restaurant");
      await total(
        { Bowl: "", Lasagnes: "1", Salade: "1" },
        "Total (hors plats sans prix indiqué) : 4,50\u00A0€",
      );

      // Nothing chosen: only « Choisissez au moins un plat. »
      await fillOrderR2(page, { quantities: { Lasagnes: "", Salade: "" }, ...PERSON });
      await expect(orderR2Total(page)).toHaveCount(0);
      await submitOrderR2(page);
      const message = "Choisissez au moins un plat.";
      await expect(form.getByText(message, { exact: true })).toBeVisible();
      await expect(form.getByText(/^Indiquez/u)).toHaveCount(0);
      expect(posts(fakeScript.requests)).toStrictEqual([]);
      if (react) {
        // E-41: tied to the dishes' fieldset, focus on the first quantity.
        await expect(
          form.getByRole("group", { name: "Choisissez vos plats et quantités" }),
        ).toHaveAccessibleDescription(new RegExp(message, "u"));
        await expect(quantityField(page, "Lasagnes")).toBeFocused();
      } else {
        // No field holds the error: the focus stays on the button (04 § 5.4).
        await expect(form.getByRole("button", { name: "Confirmer la réservation" })).toBeFocused();
      }

      await cancelOrderR2(page);
      await expect(orderR2Form(page)).toHaveCount(0);
      await expect.poll(async () => exposed(dishRow(page, "Lasagnes"))).toBe(true);
      await expect(reserveButton(page, "r2")).toBeFocused();
    },
  );

  test(
    "r2OrderFormVoucherDay (REG-22) — a day without voucher",
    { tag: ["@changed:E-34", "@changed:E-41", "@changed:E-50", "@P-13", "@p4"] },
    async ({ page }) => {
      const react = target(test.info()) === "react";
      await gotoHome(page);
      await showPeriod(page, "r2", "next");
      await selectDay(page, "r2", "2026-10-13");
      await openOrderR2(page);
      // E-50: a radio group on React, toggle buttons on the old site.
      await expect(
        orderR2Form(page).getByRole(react ? "radio" : "button", { name: "Sur place", exact: true }),
      ).toHaveCount(1);
      await expect(selectedServiceMode(page)).toHaveAccessibleName("À emporter");
      await expect(serviceModeOption(page, "dineIn")).toBeVisible();
      await expect(orderR2Form(page).getByText(VOUCHER_HELP)).toHaveCount(0);
      await serviceModeOption(page, "dineIn").click();
      await expect(selectedServiceMode(page)).toHaveAccessibleName("Sur place");
    },
  );
});

test(
  "r2OrderAdjustedAndEmail (REG-23)",
  { tag: ["@changed:E-14", "@changed:E-28", "@P-14", "@p4"] },
  async ({ page, fakeScript }) => {
    const react = target(test.info()) === "react";
    const { db } = fakeScript;
    db.mailError = "Service invoked too many times for one day: email.";
    await gotoHome(page);
    await openOrderR2(page);
    // Another visitor takes 2 of the 4 Lasagnes shown.
    fakeScript.db.r2Bookings.push(otherOrderR2("r2i-d0-lasagnes", 2));
    await fillOrderR2(page, {
      quantities: { Lasagnes: "3", Bowl: "3", Wrap: "1", Salade: "1" },
      ...PERSON,
    });
    await submitOrderR2(page);

    await expect(toast(page)).toHaveText("Réservation confirmée.");
    const [order = {}] = posts(fakeScript.requests);
    const { items, ...fields } = order;
    expect(fields).toStrictEqual({
      action: "addBookingR2Multi",
      date: "2026-10-05",
      nom: PERSON.name,
      contact: PERSON.contact,
      classe: PERSON.className,
      mode: "surplace",
      observation: "",
      requestId: expect.any(String),
    });
    const lines = items as Array<{ itemId: string }>;
    expect(lines.toSorted((a, b) => a.itemId.localeCompare(b.itemId))).toStrictEqual([
      { itemId: "r2i-d0-bowl", qte: 3 },
      { itemId: "r2i-d0-lasagnes", qte: 3 },
      { itemId: "r2i-d0-salade", qte: 1 },
      { itemId: "r2i-d0-wrap", qte: 1 },
    ]);

    // Quantities granted by the script: 2 Lasagnes out of 3.
    const summary = bookingSummary(page, "r2");
    const line = (label: string) => summary.getByRole("listitem").filter({ hasText: label });
    await expect(line("Mode")).toHaveText(/^Mode\s*Sur place$/u);
    await expect(line("Lasagnes")).toHaveText(/^Lasagnes\s*× 2$/u);
    await expect(line("Bowl")).toHaveText(/^Bowl\s*× 3$/u);
    await expect(line("Wrap")).toHaveText(/^Wrap\s*× 1$/u);
    await expect(line("Salade")).toHaveText(/^Salade\s*× 1$/u);
    const text = (await summary.textContent()) ?? "";
    expect(text).toContain("9,00\u00A0€ + 1 ticket restaurant");
    // E-28: « (hors plats sans prix) » in the legacy summary, « (hors plats sans prix indiqué) » everywhere on React.
    expect(text).toContain(react ? "(hors plats sans prix indiqué)" : "(hors plats sans prix)");
    // E-14: the adjustment hides the e-mail failure on legacy; React shows both.
    await expect(summary).toContainText(ADJUSTED);
    await (react
      ? expect(summary).toContainText(EMAIL_FAILED)
      : expect(summary).not.toContainText(EMAIL_FAILED));
  },
);

test(
  "r2ConfirmedEmpty (REG-24)",
  { tag: ["@changed:E-11", "@P-13", "@p4"] },
  async ({ page, fakeScript }) => {
    await gotoHome(page);
    await openOrderR2(page);
    await expect(quantityField(page, "Wrap")).toBeVisible();
    // Another visitor takes every Wrap left.
    fakeScript.db.r2Bookings.push(otherOrderR2("r2i-d0-wrap", 5));
    await fillOrderR2(page, { quantities: { Wrap: "2" }, ...PERSON });
    await submitOrderR2(page);

    await expect(toast(page)).toHaveText(NONE_AVAILABLE);
    expect(await toastKind(page)).toBe("error");
    expect(posts(fakeScript.requests)).toHaveLength(1);
    await expect(bookingSummary(page, "r2")).toHaveCount(0);
    if (target(test.info()) === "legacy") {
      // The form closes and the input is lost (04 PA 3).
      await expect(orderR2Form(page)).toHaveCount(0);
      await expect(dishRow(page, "Wrap").getByText("0 / 5", { exact: true })).toBeVisible();
    } else {
      // E-11: the form and its input stay; the state read again shows the Wrap sold out.
      await expect(orderR2Form(page).getByLabel("Nom et prénom")).toHaveValue(PERSON.name);
      await expect(orderR2Form(page).getByText("Épuisé", { exact: true })).toBeVisible();
    }
  },
);
