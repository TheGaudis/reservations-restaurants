import { expect, test } from "../fixtures";
import {
  bookingR1Field,
  bookingR1Form,
  bookingR1Total,
  cancelBookingR1,
  fillBookingR1,
  openBookingR1,
  submitBookingR1,
} from "../pages/booking-r1";
import { longDate, selectDay, showPeriod } from "../pages/calendar";
import { bookingSummary, dayCard, reserveButton, seatsPill } from "../pages/day-card";
import { gotoHome } from "../pages/home";
import { openOrderR2, orderR2Form } from "../pages/order-r2";
import { target } from "../pages/target";
import { posts, rawTexts, windowValue } from "./helpers";

// R1 card, form and validation (09 § 3: P-03 to P-08; 04 § 4.2, § 5.1-5.2, § 5.4). Sending: public-r1-send.spec.ts.

const PERSON = { name: "Jean Dupuis", contact: "jean.dupuis@exemple.fr", className: "TS2" };
const FIELD_ERRORS = [
  "Indiquez vos nom et prénom.",
  "Indiquez votre adresse email.",
  "Indiquez votre classe ou votre service.",
  "Indiquez au moins une personne.",
];

test.use({ reducedMotion: "reduce" });

test(
  "columnsIndependent (REG-13)",
  { tag: ["@changed:E-32", "@changed:E-31", "@P-05", "@P-06", "@P-13", "@p4"] },
  async ({ page }) => {
    const site = target(test.info());
    await gotoHome(page);

    // A summary in the R1 column, then a day chosen in the R2 column.
    await openBookingR1(page);
    await fillBookingR1(page, { ...PERSON, students: "1" });
    await submitBookingR1(page);
    await expect(bookingSummary(page, "r1")).toBeVisible();
    await selectDay(page, "r2", "2026-10-06");
    // E-32: legacy clears every summary of the page; React keeps the other column's.
    await expect(bookingSummary(page, "r1")).toHaveCount(site === "legacy" ? 0 : 1);

    // A filled R1 form, then the R2 form: one public form at a time on both sites.
    await openBookingR1(page);
    await fillBookingR1(page, {
      name: "Léa Test",
      contact: "lea.test@exemple.fr",
      className: "BTS1",
    });
    await openOrderR2(page);
    await expect(bookingR1Form(page)).toHaveCount(0);
    await expect(orderR2Form(page)).toBeVisible();
    // E-31: legacy copies the identity typed in R1 (shared field ids, 04 PA 9); React starts empty.
    const r2 = orderR2Form(page);
    const copied = site === "legacy";
    await expect(r2.getByLabel("Nom et prénom")).toHaveValue(copied ? "Léa Test" : "");
    await expect(r2.getByLabel("Adresse email")).toHaveValue(copied ? "lea.test@exemple.fr" : "");
    await expect(r2.getByLabel("Classe ou service")).toHaveValue(copied ? "BTS1" : "");
  },
);

test(
  "r1DayCardStates (REG-14)",
  { tag: ["@changed:E-27", "@changed:E-21", "@P-03", "@P-04", "@P-07", "@P-08", "@p4"] },
  async ({ page }) => {
    const react = target(test.info()) === "react";
    await gotoHome(page);
    const card = dayCard(page, "r1");
    const statusWord = (word: string) => card.getByText(word, { exact: true });

    // P-04, places available: today, with theme and menu.
    await expect(card).toContainText(longDate("2026-10-05"));
    await expect(seatsPill(page)).toHaveText("12 / 20 couverts");
    await expect(card.getByText("Thème du jour", { exact: true })).toBeVisible();
    await expect(card.getByText("Cuisine du marché", { exact: true })).toBeVisible();
    await expect(card.getByText("Menu du jour", { exact: true })).toBeVisible();
    await expect(
      card.getByText("Salade de saison, pavé de saumon, crème brûlée", { exact: true }),
    ).toBeVisible();
    await expect(reserveButton(page, "r1")).toBeVisible();
    await expect(statusWord("Bientôt complet")).toHaveCount(0);

    // P-04, almost full: 5 seats left out of 20; E-27: the state in words on React.
    await selectDay(page, "r1", "2026-10-06");
    await expect(seatsPill(page)).toHaveText("5 / 20 couverts");
    await expect(card.getByText("Thème du jour", { exact: true })).toHaveCount(0);
    await expect(reserveButton(page, "r1")).toBeVisible();
    await expect(statusWord("Bientôt complet")).toHaveCount(react ? 1 : 0);

    // P-03, no service.
    await selectDay(page, "r1", "2026-10-07");
    await expect(card).toContainText(longDate("2026-10-07"));
    await expect(card.getByText("Aucune réservation possible ce jour-là.")).toBeVisible();
    await expect(seatsPill(page)).toHaveCount(0);
    await expect(reserveButton(page, "r1")).toHaveCount(0);

    // P-07, full: no button; E-27: « Complet » by the pill and « Complet. » under the card on React only.
    await selectDay(page, "r1", "2026-10-09");
    await expect(seatsPill(page)).toHaveText("0 / 10 couverts");
    await expect(reserveButton(page, "r1")).toHaveCount(0);
    await expect(statusWord("Complet")).toHaveCount(react ? 1 : 0);
    await expect(statusWord("Complet.")).toHaveCount(react ? 1 : 0);

    // P-08, past day: no button and no sentence. E-21: « 1 » or « 1er ».
    await showPeriod(page, "r1", "previous");
    await selectDay(page, "r1", "2026-10-01");
    await expect(card).toContainText(react ? "jeudi 1er octobre 2026" : "jeudi 1 octobre 2026");
    await expect(seatsPill(page)).toHaveText("16 / 20 couverts");
    await expect(reserveButton(page, "r1")).toHaveCount(0);
    await expect(statusWord("Complet.")).toHaveCount(0);
  },
);

test(
  "r1FormValidation (REG-15)",
  {
    tag: [
      "@changed:E-03",
      "@changed:E-19",
      "@changed:E-34",
      "@changed:E-46",
      "@changed:E-28",
      "@P-05",
      "@p4",
    ],
  },
  async ({ page, fakeScript }) => {
    const react = target(test.info()) === "react";
    // Every text ever written in the live total, the replaced ones included.
    await page.addInitScript(() => {
      const totals: string[] = [];
      const keep = (text: string | null) => {
        if (text?.includes("Total :") === true) totals.push(text);
      };
      new MutationObserver((records) => {
        for (const record of records) {
          keep(record.oldValue);
          for (const node of record.removedNodes) keep(node.textContent);
          for (const node of record.addedNodes) keep(node.textContent);
        }
      }).observe(document, {
        childList: true,
        subtree: true,
        characterData: true,
        characterDataOldValue: true,
      });
      Object.assign(window, { e2eTotals: totals });
    });
    await gotoHome(page);
    await openBookingR1(page);
    const form = bookingR1Form(page);
    await expect(bookingR1Field(page, "name")).toBeFocused();

    // E-28: legacy first writes « Total : 0,00 € » (plain space), replaced at once; React renders the exact total.
    expect(await rawTexts(page, /Total :/u)).toStrictEqual(["0 couvert · Total : 0,00\u00A0€"]);
    const totals = await windowValue<string[]>(page, "e2eTotals");
    expect(totals.some((text) => text.startsWith("Total : 0,00"))).toBe(!react);

    // E-03: Enter submits the form on React only.
    await page.keyboard.press("Enter");
    for (const message of FIELD_ERRORS) {
      await expect(form.getByText(message, { exact: true })).toHaveCount(react ? 1 : 0);
    }

    await submitBookingR1(page);
    for (const message of FIELD_ERRORS) {
      await expect(form.getByText(message, { exact: true })).toBeVisible();
    }
    await expect(bookingR1Field(page, "name")).toBeFocused();
    await expect(bookingR1Field(page, "name")).toHaveAttribute("aria-invalid", "true");

    // E-46: legacy drops the message at the first keystroke; React keeps a message until the value is valid.
    const contact = bookingR1Field(page, "contact");
    await contact.pressSequentially("jean");
    await expect(form.getByText("Indiquez votre adresse email.", { exact: true })).toHaveCount(0);
    await expect(
      form.getByText("Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr).", {
        exact: true,
      }),
    ).toHaveCount(react ? 1 : 0);
    await contact.pressSequentially(".dupuis@exemple.fr");
    await expect(form.getByText(/adresse email/u)).toHaveCount(0);
    await expect(form.getByText("Indiquez vos nom et prénom.", { exact: true })).toBeVisible();

    // E-19: a decimal count is truncated by `parseInt` (legacy), refused by an integer field (React).
    await fillBookingR1(page, { students: "2.7", staffMembers: "abc" });
    await bookingR1Field(page, "externals").focus();
    await expect(bookingR1Field(page, "staffMembers")).toHaveValue("");
    await (react
      ? expect(bookingR1Field(page, "students")).toHaveValue(/^\d*$/u)
      : expect(bookingR1Total(page)).toHaveText("2 couverts · Total : 9,90 €"));

    // E-34: − / + buttons on React only.
    const increase = form.getByRole("button", { name: "Augmenter : Extérieurs" });
    await expect(increase).toHaveCount(react ? 1 : 0);
    if (react) {
      await increase.click();
      await expect(bookingR1Field(page, "externals")).toHaveValue("1");
      await form.getByRole("button", { name: "Diminuer : Extérieurs" }).click();
      await expect(bookingR1Field(page, "externals")).toHaveValue(/^0?$/u);
    }

    await fillBookingR1(page, { students: "2", staffMembers: "1", externals: "" });
    expect(await rawTexts(page, /Total :/u)).toStrictEqual(["3 couverts · Total : 16,00\u00A0€"]);

    await cancelBookingR1(page);
    await expect(bookingR1Form(page)).toHaveCount(0);
    await expect(reserveButton(page, "r1")).toBeFocused();
    expect(posts(fakeScript.requests)).toStrictEqual([]);
  },
);
