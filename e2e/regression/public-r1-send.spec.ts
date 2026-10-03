import { expect, test } from "../fixtures";
import {
  bookingR1Field,
  bookingR1Form,
  cancelBookingR1,
  fillBookingR1,
  openBookingR1,
  submitBookingR1,
} from "../pages/booking-r1";
import { longDate, selectDay } from "../pages/calendar";
import { bookingSummary, reserveButton, seatsPill } from "../pages/day-card";
import { BLOCKED_FONT_PRELOAD, gotoHome, toast, toastKind } from "../pages/home";
import { target } from "../pages/target";
import { otherBookingR1, pauseClock, posts } from "./helpers";

// R1 booking sent to the script, summary, errors and new attempts (09 § 3: P-05, P-06; 04 § 6-7; invariant 3).

const PERSON = { name: "Jean Dupuis", contact: "jean.dupuis@exemple.fr", className: "TS2" };
const LOCK_BUSY = "Le serveur est très sollicité : réessayez dans quelques secondes.";
const DUPLICATE =
  "Cette réservation était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.";

test.use({ reducedMotion: "reduce" });

test.beforeEach(({ consoleLog }) => {
  consoleLog.allow(BLOCKED_FONT_PRELOAD);
});

test.describe("r1MaxSeats (REG-16)", () => {
  test(
    "r1MaxSeats (REG-16) — more than the seats shown",
    { tag: ["@changed:E-35", "@P-05", "@p4"] },
    async ({ page, fakeScript }) => {
      await gotoHome(page);
      await selectDay(page, "r1", "2026-10-06");
      await openBookingR1(page);
      await fillBookingR1(page, { ...PERSON, students: "6" });
      await submitBookingR1(page);

      if (target(test.info()) === "legacy") {
        // Sent, refused by the script, shown in a toast; the form stays.
        await expect(toast(page)).toHaveText("Il ne reste que 5 couvert(s) pour ce jour.");
        expect(await toastKind(page)).toBe("error");
        expect(posts(fakeScript.requests)).toHaveLength(1);
      } else {
        // E-35: blocked before sending, message under the row (text of 06 § 8.2).
        await expect(
          bookingR1Form(page).getByText("5 couverts au maximum (places restantes ce jour-là).", {
            exact: true,
          }),
        ).toBeVisible();
        expect(posts(fakeScript.requests)).toStrictEqual([]);
      }
      await expect(bookingR1Field(page, "name")).toHaveValue(PERSON.name);
    },
  );

  test(
    "r1MaxSeats (REG-16) — fewer seats left than shown",
    { tag: ["@changed:E-35", "@P-05", "@p4"] },
    async ({ page, fakeScript }) => {
      await gotoHome(page);
      await selectDay(page, "r1", "2026-10-06");
      await openBookingR1(page);
      const legend = bookingR1Form(page).getByRole("group", { name: /au maximum/u });
      await expect(legend).toHaveAccessibleName("Nombre de personnes (5 au maximum)");
      // Another visitor takes 3 of the 5 seats shown.
      fakeScript.db.r1Bookings.push(otherBookingR1("2026-10-06", 3));
      await fillBookingR1(page, { ...PERSON, students: "3" });
      await submitBookingR1(page);

      const refusal = "Il ne reste que 2 couvert(s) pour ce jour.";
      await expect.poll(() => posts(fakeScript.requests).length).toBe(1);
      if (target(test.info()) === "legacy") {
        await expect(toast(page)).toHaveText(refusal);
        // The state is not read again after the refusal (04 PA 1).
        await expect(legend).toHaveAccessibleName("Nombre de personnes (5 au maximum)");
      } else {
        // E-35: the script's refusal under the row, and the state read again.
        await expect(bookingR1Form(page).getByText(refusal, { exact: true })).toBeVisible();
        await expect(legend).toHaveAccessibleName("Nombre de personnes (2 au maximum)");
      }
      await expect(bookingR1Field(page, "students")).toHaveValue("3");
    },
  );
});

test(
  "r1BookingSuccess (REG-17)",
  { tag: ["@changed:E-12", "@changed:E-13", "@P-05", "@P-06", "@p4"] },
  async ({ page, fakeScript }) => {
    const react = target(test.info()) === "react";
    const { db } = fakeScript;
    db.mailError = "Service invoked too many times for one day: email.";
    await gotoHome(page);
    await openBookingR1(page);
    await fillBookingR1(page, {
      name: "  Jean Dupuis ",
      contact: " jean.dupuis@exemple.fr ",
      className: " TS2 ",
      students: "2",
      staffMembers: "1",
      observation: " Allergie aux noix ",
    });
    const release = fakeScript.hold();
    await submitBookingR1(page);

    // Busy button; E-13: « Annuler » stays active on legacy, disabled on React.
    const form = bookingR1Form(page);
    const busy = form.getByRole("button", { name: "Envoi en cours…" });
    await expect(busy).toBeDisabled();
    await expect(busy).toHaveAttribute("aria-busy", "true");
    const cancel = form.getByRole("button", { name: "Annuler", exact: true });
    await (react ? expect(cancel).toBeDisabled() : expect(cancel).toBeEnabled());

    // Body of 02 § 4.4, every text trimmed, with the requestId created at the opening.
    await expect.poll(() => posts(fakeScript.requests).length).toBe(1);
    const request = fakeScript.requests.find((r) => r.method === "POST");
    expect(request?.headers["content-type"]).toBe("text/plain;charset=utf-8");
    expect(request?.json).toStrictEqual({
      action: "addBookingR1",
      date: "2026-10-05",
      nom: "Jean Dupuis",
      contact: "jean.dupuis@exemple.fr",
      classe: "TS2",
      nbEleve: 2,
      nbProf: 1,
      nbExt: 0,
      observation: "Allergie aux noix",
      requestId: expect.any(String),
    });
    release();

    await expect(toast(page)).toHaveText("Réservation confirmée.");
    expect(await toastKind(page)).toBe("success");
    const summary = bookingSummary(page, "r1");
    await expect(summary).toContainText("Réservation enregistrée");
    await expect(summary).toContainText(longDate("2026-10-05"));
    await expect(summary).toContainText(
      "L'email de confirmation n'a pas pu être envoyé. Gardez ce récapitulatif.",
    );
    for (const [label, value] of [
      ["Nom", "Jean Dupuis"],
      ["Classe / service", "TS2"],
      ["Élèves", "2"],
      ["Personnels", "1"],
    ]) {
      await expect(summary.getByRole("listitem").filter({ hasText: label ?? "" })).toHaveText(
        `${label}${value}`,
      );
    }
    await expect(summary.getByRole("listitem").filter({ hasText: "Extérieurs" })).toHaveCount(0);
    expect(await summary.textContent()).toContain("3 couverts — 16,00\u00A0€");
    await expect(summary).toContainText("Pour annuler ou modifier, contactez le secrétariat.");
    await expect(bookingR1Form(page)).toHaveCount(0);
    // 9 seats left: « Réserver » comes back under the summary.
    await expect(seatsPill(page)).toHaveText("9 / 20 couverts");
    await expect(reserveButton(page, "r1")).toBeVisible();

    // E-12: focus on body (legacy) or on the summary title (React).
    if (react) {
      await expect(summary.getByText("Réservation enregistrée", { exact: true })).toBeFocused();
    } else {
      expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    }

    await summary.getByRole("button", { name: "Fermer" }).click();
    await expect(bookingSummary(page, "r1")).toHaveCount(0);
  },
);

test(
  "r1RetryKeepsRequestId (REG-18)",
  { tag: ["@parity", "@P-05", "@p4"] },
  async ({ page, fakeScript }) => {
    await gotoHome(page);
    await openBookingR1(page);
    await fillBookingR1(page, { ...PERSON, students: "1" });
    fakeScript.failNext("error");
    fakeScript.failNext("error");

    await submitBookingR1(page);
    await expect(toast(page)).toHaveText(LOCK_BUSY);
    expect(await toastKind(page)).toBe("error");
    // The form, its input and its button stay.
    await expect(bookingR1Field(page, "name")).toHaveValue(PERSON.name);
    await submitBookingR1(page);
    await expect.poll(() => posts(fakeScript.requests).length).toBe(2);
    await expect(
      bookingR1Form(page).getByRole("button", { name: "Confirmer la réservation" }),
    ).toBeEnabled();

    // A new opening gets a new requestId.
    await cancelBookingR1(page);
    await openBookingR1(page);
    await fillBookingR1(page, { ...PERSON, students: "1" });
    await submitBookingR1(page);
    await expect(bookingSummary(page, "r1")).toBeVisible();

    const ids = posts(fakeScript.requests).map((body) => body["requestId"]);
    expect(ids).toHaveLength(3);
    expect(typeof ids[0]).toBe("string");
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[0]);
    expect(fakeScript.db.r1Bookings.filter((b) => b.Nom === PERSON.name)).toHaveLength(1);
  },
);

test(
  "duplicateAfterLostResponse (REG-19)",
  { tag: ["@changed:E-10", "@changed:E-33", "@P-06", "@p4"] },
  async ({ page, fakeScript }) => {
    const react = target(test.info()) === "react";
    await gotoHome(page);
    await openBookingR1(page);
    await fillBookingR1(page, { ...PERSON, students: "2" });
    // The script writes the booking, then the response is lost.
    fakeScript.failNext("network");
    await submitBookingR1(page);

    // E-10: the browser's raw message (legacy), the text of D-14 (React).
    await expect(toast(page)).toHaveText(
      react
        ? "Le service de réservation ne répond pas. Réessayez dans un instant : une même réservation n'est jamais enregistrée deux fois."
        : "Failed to fetch",
    );
    expect(await toastKind(page)).toBe("error");
    await expect(bookingR1Field(page, "name")).toHaveValue(PERSON.name);

    await submitBookingR1(page);
    await expect(toast(page)).toHaveText(DUPLICATE);
    expect(await toastKind(page)).toBe("success");
    await expect(bookingR1Form(page)).toHaveCount(0);
    // E-33: toast only (legacy), toast and summary « Réservation déjà enregistrée » (React).
    const summary = bookingSummary(page, "r1");
    if (react) {
      await expect(summary).toContainText("Réservation déjà enregistrée");
      await expect(summary).toContainText(DUPLICATE);
    } else {
      await expect(summary).toHaveCount(0);
    }

    const ids = posts(fakeScript.requests).map((body) => body["requestId"]);
    expect(ids).toHaveLength(2);
    expect(ids[1]).toBe(ids[0]);
    expect(fakeScript.db.r1Bookings.filter((b) => b.Nom === PERSON.name)).toHaveLength(1);
  },
);

test.describe("slowWriteNeverReplayed (REG-20)", () => {
  test.use({ fixedTime: null });

  test(
    "slowWriteNeverReplayed (REG-20)",
    { tag: ["@changed:E-10", "@P-05", "@p4"] },
    async ({ page, fakeScript }) => {
      await pauseClock(page);
      await gotoHome(page);
      await openBookingR1(page);
      await fillBookingR1(page, { ...PERSON, students: "1" });
      const release = fakeScript.hold();
      await submitBookingR1(page);
      await expect.poll(() => posts(fakeScript.requests).length).toBe(1);

      const slow = page.getByText(
        "Le service met du temps à répondre. Gardez cette page ouverte : la confirmation s'affichera ici.",
      );
      await page.clock.runFor(19_000);
      await expect(slow).toHaveCount(0);
      await page.clock.runFor(1000);
      // E-10: the D-15 message at 20 s on React; nothing on legacy.
      await expect(slow).toHaveCount(target(test.info()) === "react" ? 1 : 0);
      await page.clock.runFor(5000);
      await expect(
        bookingR1Form(page).getByRole("button", { name: "Envoi en cours…" }),
      ).toBeDisabled();

      release();
      await expect(bookingSummary(page, "r1")).toBeVisible();
      await page.clock.runFor(60_000);
      // One write, never sent again.
      expect(posts(fakeScript.requests)).toHaveLength(1);
      expect(fakeScript.db.r1Bookings.filter((b) => b.Nom === PERSON.name)).toHaveLength(1);
    },
  );
});
