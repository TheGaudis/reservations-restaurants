import type { Page } from "@playwright/test";

import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { TEST_NOW } from "@/test/clock";

import { expect, test } from "../fixtures";
import { longDate, selectDay } from "../pages/calendar";
import { toast } from "../pages/home";
import { bookingLines, bookingRow, confirmDelete, staffCard } from "../pages/staff";
import { target } from "../pages/target";
import { actionBodies, loginAsStaff, veil, veilGone } from "./staff-helpers";

// Staff card of R1: bookings, their edition and deletion, the day (09 § 4: C-10, C-10b, C-11, C-13, C-14;
// 05 § 4.6, § 5.3; 06 § 5, § 7).

const TOMORROW = "2026-10-06";

test.use({ reducedMotion: "reduce" });

async function tomorrowCard(page: Page) {
  await loginAsStaff(page);
  await selectDay(page, "r1", TOMORROW);
  return staffCard(page, "r1");
}

/**
 * Legacy: the veil makes the page inert during the deletion and the deleted button has no key (03 § 5.4): the focus
 * falls on body. React (E-04, no veil): on the date of the card (03 § 5.4, 08 § 7.6).
 */
async function expectFocusAfterDeletion(page: Page): Promise<void> {
  if (target(test.info()) === "legacy") {
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    return;
  }
  await expect(staffCard(page, "r1").getByText(longDate(TOMORROW), { exact: true })).toBeFocused();
}

function editButton(page: Page, name: string) {
  return bookingRow(page, "r1", name).getByRole("button", { name: "Modifier", exact: true });
}

test.describe("r1StaffCard (REG-35)", () => {
  test(
    "r1StaffCard (REG-35) — lines and actions",
    { tag: ["@parity", "@C-10", "@C-10b", "@p5"] },
    async ({ page }) => {
      const card = await tomorrowCard(page);
      // 05 § 4.6: sheet order, empty parts left out, `PrixTotal` empty not shown.
      await expect(bookingLines(card)).toHaveText([
        "Cyrille Ungerer — TS2 — 3 couverts — 16,00 € — c.ungerer@exemple.fr — Table près de la fenêtre",
        "Léa Martin — BTS1 — 8 couverts — 79,20 € — 06 12 34 56 78",
        "Jean Petit — Personnel — 4 couverts — j.petit@exemple.fr",
      ]);
      await expect(card).toContainText("Ouvert par M. Dupont");
      await expect(card).toContainText("5 / 20 couverts");
      // 05 § 5.3: the day's actions, in this order; never « Réserver » in staff mode.
      const names = await card
        .getByRole("button")
        .evaluateAll((buttons) => buttons.map((button) => button.textContent.trim()));
      expect(names.slice(-4)).toStrictEqual([
        "+ Ajouter une personne",
        "Modifier ce jour",
        "Imprimer la liste",
        "Supprimer ce jour",
      ]);
      await expect(card.getByRole("button", { name: "Réserver", exact: true })).toHaveCount(0);

      // C-10b: day without service, staff message (05 § 4.3).
      await selectDay(page, "r1", "2026-10-07");
      await expect(staffCard(page, "r1")).toContainText(
        "Aucun jour ouvert. Utilisez le formulaire « Ouvrir un jour » pour en créer un à cette date.",
      );
    },
  );

  test(
    "r1StaffCard (REG-35) — edit form checks and cancel",
    { tag: ["@parity", "@changed:E-48", "@C-11", "@p5"] },
    async ({ page, fakeScript }) => {
      const card = await tomorrowCard(page);
      const edit = editButton(page, "Cyrille Ungerer");
      await edit.click();
      await expect(edit).toHaveAttribute("aria-expanded", "true");
      await expect(card.getByLabel("Nom", { exact: true })).toHaveValue("Cyrille Ungerer");
      await expect(card.getByLabel("Classe ou service")).toHaveValue("TS2");
      const contact = card.getByLabel("Téléphone ou email");
      await expect(contact).toHaveValue("c.ungerer@exemple.fr");
      await expect(card.getByLabel(/^Élèves/u)).toHaveValue("2");
      await expect(card.getByLabel(/^Personnels/u)).toHaveValue("1");
      await expect(card.getByLabel("Observation (optionnel)")).toHaveValue(
        "Table près de la fenêtre",
      );
      // Maximum: seats left plus the booking's own seats (06 § 7.3).
      await expect(
        card.getByRole("group", { name: "Nombre de personnes (8 au maximum)" }),
      ).toBeVisible();
      await expect(card.getByText(/· Total :/u)).toHaveText("3 couverts · Total : 16,00 €");

      // D-04 not retained: the contact stays required.
      const save = card.getByRole("button", { name: "Enregistrer", exact: true });
      await contact.fill("");
      await save.click();
      await expect(
        card.getByText("Indiquez un téléphone ou un email.", { exact: true }),
      ).toBeVisible();
      await contact.fill("c.ungerer@exemple.fr");
      await card.getByLabel(/^Élèves/u).fill("9");
      await save.click();
      await expect(
        card.getByText(
          "8 couverts au maximum pour cette réservation (places restantes ce jour-là).",
          { exact: true },
        ),
      ).toBeVisible();
      expect(actionBodies(fakeScript.requests, "editBookingR1")).toStrictEqual([]);

      await card.getByRole("button", { name: "Annuler", exact: true }).click();
      await expect(card.getByLabel("Nom", { exact: true })).toHaveCount(0);
      if (target(test.info()) === "legacy") {
        // 03 § 5.4: « Annuler » has no key to find again, the focus falls on body.
        expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
      } else {
        // E-48: back to the button that opened the form.
        await expect(edit).toBeFocused();
      }

      // A booking written before the prices: empty counters and help (06 § 7.3).
      await editButton(page, "Jean Petit").click();
      for (const label of [/^Élèves/u, /^Personnels/u, /^Extérieurs/u]) {
        await expect(card.getByLabel(label)).toHaveValue("");
      }
      await expect(
        card.getByText(
          "Réservation enregistrée avant les tarifs : indiquez la répartition de ses 4 couverts.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        card.getByRole("group", { name: "Nombre de personnes (9 au maximum)" }),
      ).toBeVisible();
    },
  );

  test(
    "r1StaffCard (REG-35) — edit sent",
    { tag: ["@parity", "@C-11", "@p5"] },
    async ({ page, fakeScript }) => {
      const card = await tomorrowCard(page);
      await editButton(page, "Cyrille Ungerer").click();
      await card.getByLabel(/^Extérieurs/u).fill("1");
      await card.getByRole("button", { name: "Enregistrer", exact: true }).click();

      await expect(toast(page)).toHaveText("Réservation modifiée.");
      // 06 § 7.3: `qte` and `prixTotal` are sent, the script recomputes them.
      expect(actionBodies(fakeScript.requests, "editBookingR1")).toStrictEqual([
        {
          action: "editBookingR1",
          password: SEED_PASSWORD,
          id: "r1b-d+1-ungerer",
          nom: "Cyrille Ungerer",
          contact: "c.ungerer@exemple.fr",
          classe: "TS2",
          qte: 4,
          nbEleve: 2,
          nbProf: 1,
          nbExt: 1,
          prixTotal: 25.9,
          observation: "Table près de la fenêtre",
        },
      ]);
      await expect(bookingLines(card).first()).toHaveText(
        "Cyrille Ungerer — TS2 — 4 couverts — 25,90 € — c.ungerer@exemple.fr — Table près de la fenêtre",
      );
      await expect(card.getByLabel("Nom", { exact: true })).toHaveCount(0);
    },
  );

  test(
    "r1StaffCard (REG-35) — edit the day",
    { tag: ["@parity", "@C-13", "@p5"] },
    async ({ page, fakeScript }) => {
      const card = await tomorrowCard(page);
      await card.getByRole("button", { name: "Modifier ce jour", exact: true }).click();
      const capacity = card.getByLabel("Nombre de couverts disponibles");
      await expect(capacity).toHaveValue("20");
      await expect(card.getByLabel("Menu du jour (optionnel)")).toHaveValue(
        "Velouté de potiron, blanquette, tarte Tatin",
      );
      const save = card.getByRole("button", { name: "Enregistrer", exact: true });

      // Below the 15 booked seats: the script's message (06 § 5.1).
      await capacity.fill("14");
      await save.click();
      await expect(
        page
          .getByText(
            "Impossible : 15 couvert(s) déjà réservé(s) pour ce jour, la capacité ne peut pas être inférieure.",
            { exact: true },
          )
          .first(),
      ).toBeVisible();

      await capacity.fill("16");
      await save.click();
      await expect(toast(page)).toHaveText("Jour modifié.");
      expect(actionBodies(fakeScript.requests, "editDayR1").at(-1)).toStrictEqual({
        action: "editDayR1",
        password: SEED_PASSWORD,
        date: TOMORROW,
        capacity: 16,
        menu: "Velouté de potiron, blanquette, tarte Tatin",
        theme: "",
      });
      await expect(card).toContainText("1 / 16 couverts");
      await expect(capacity).toHaveCount(0);
    },
  );

  test.describe("deletion", () => {
    test.use({ fixedTime: null });

    test(
      "r1StaffCard (REG-35) — delete a booking in two clicks",
      { tag: ["@parity", "@changed:E-04", "@C-14", "@p5"] },
      async ({ page, fakeScript }) => {
        await page.clock.install({ time: TEST_NOW });
        const card = await tomorrowCard(page);
        const detail = "Confirmer la suppression de cette réservation";
        const remove = bookingRow(page, "r1", "Léa Martin").getByRole("button", {
          name: new RegExp(`^(?:Supprimer|${detail})$`, "u"),
        });

        // Armed, then back to rest after 4 s without a second click (06 § 5.2).
        await remove.click();
        await expect(remove).toHaveText("Confirmer ?");
        await expect(remove).toHaveAccessibleName(detail);
        await expect(remove).toHaveAttribute("title", detail);
        await page.clock.runFor("00:04");
        await expect(remove).toHaveText("Supprimer");
        await expect(remove).toHaveAccessibleName("Supprimer");
        expect(actionBodies(fakeScript.requests, "deleteBookingR1")).toStrictEqual([]);

        await confirmDelete(remove);
        await veilGone(page);
        await expect(toast(page)).toHaveText("Réservation supprimée.");
        expect(actionBodies(fakeScript.requests, "deleteBookingR1")).toStrictEqual([
          { action: "deleteBookingR1", password: SEED_PASSWORD, id: "r1b-d+1-martin" },
        ]);
        await expect(card).not.toContainText("Léa Martin");
        // Focus on the date of the card (03 § 5.4, 08 § 7.6).
        await expectFocusAfterDeletion(page);
      },
    );
  });

  test(
    "r1StaffCard (REG-35) — delete a day with bookings",
    { tag: ["@changed:E-04", "@changed:E-38", "@G-06", "@C-14", "@p5"] },
    async ({ page, fakeScript }) => {
      const legacy = target(test.info()) === "legacy";
      const card = await tomorrowCard(page);
      const detail = legacy
        ? "Confirmer la suppression du jour et de toutes ses réservations"
        : "Confirmer la suppression du jour et de ses 3 réservations (les personnes ne seront pas prévenues)";
      const remove = card.getByRole("button", {
        name: /^(?:Supprimer ce jour|Confirmer la suppression du jour.*)$/u,
      });
      await remove.click();
      await expect(remove).toHaveText("Confirmer ?");
      await expect(remove).toHaveAccessibleName(detail);
      // E-38 (D-21): a visible note on React.
      await expect(card.getByText(detail, { exact: true })).toHaveCount(legacy ? 0 : 1);

      const release = fakeScript.hold();
      await remove.click();
      await expect.poll(() => actionBodies(fakeScript.requests, "deleteDayR1").length).toBe(1);
      if (legacy) {
        await expect(veil(page)).toBeVisible();
      } else {
        // E-04: the button is busy, nothing else.
        await expect(veil(page)).toHaveCount(0);
        await expect(remove).toHaveAttribute("aria-busy", "true");
      }
      release();
      await veilGone(page);
      await expect(toast(page)).toHaveText("Jour supprimé.");
      expect(actionBodies(fakeScript.requests, "deleteDayR1")).toStrictEqual([
        { action: "deleteDayR1", password: SEED_PASSWORD, date: TOMORROW },
      ]);
      await expect(staffCard(page, "r1")).toContainText(
        "Aucun jour ouvert. Utilisez le formulaire « Ouvrir un jour » pour en créer un à cette date.",
      );
      await expectFocusAfterDeletion(page);
    },
  );
});
