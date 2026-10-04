import type { Locator, Page } from "@playwright/test";

import { SEED_PASSWORD } from "@/mocks/fixtures/seed";

import { expect, test } from "../fixtures";
import { selectDay } from "../pages/calendar";
import { toast, toastKind } from "../pages/home";
import { bookingLines, bookingRow, openAddPerson, staffCard, staffDish } from "../pages/staff";
import { target } from "../pages/target";
import { otherOrderR2 } from "./helpers";
import { actionBodies, loginAsStaff, veilGone } from "./staff-helpers";

// Staff card of R2: dishes, bookings of a dish (09 § 4: C-14, C-20 to C-24; 05 § 6.3; 06 § 6-8).

test.use({ reducedMotion: "reduce" });

async function tomorrowR2(page: Page): Promise<Locator> {
  await loginAsStaff(page);
  await selectDay(page, "r2", "2026-10-06");
  return staffCard(page, "r2");
}

test.describe("r2StaffCardDishes (REG-37)", () => {
  test(
    "r2StaffCardDishes (REG-37) — dish added and edited",
    { tag: ["@parity", "@C-20", "@C-21", "@C-22", "@p5"] },
    async ({ page, fakeScript }) => {
      const card = await tomorrowR2(page);
      await expect(card).toContainText("Ouvert par M. Dupont");
      // 05 § 6.3: the dish's actions, then its bookings; an orphan booking shows nowhere (b-3).
      const lasagnes = staffDish(page, "Lasagnes");
      const names = await lasagnes
        .getByRole("button")
        .evaluateAll((buttons) => buttons.map((button) => button.textContent.trim()));
      expect(names.slice(0, 3)).toStrictEqual([
        "+ Ajouter une personne",
        "Modifier ce plat",
        "Supprimer ce plat",
      ]);
      await expect(bookingLines(lasagnes)).toHaveText([
        "Noah Bernard — TS1 — 1 portion — 4,50 € — sur place — n.bernard@exemple.fr — Sans fromage",
      ]);
      await expect(card).not.toContainText("Paul Durand");

      // C-21.
      await card.getByRole("button", { name: "+ Ajouter un plat à ce jour", exact: true }).click();
      await card.getByLabel("Nom du plat").fill("Tiramisu");
      await card.getByLabel("Stock", { exact: true }).fill("6");
      await card.getByLabel("Prix (optionnel)").fill("3.5");
      await card.getByRole("button", { name: "Ajouter ce plat", exact: true }).click();
      await expect(toast(page)).toHaveText("Plat ajouté.");
      expect(actionBodies(fakeScript.requests, "addItemR2")).toStrictEqual([
        {
          action: "addItemR2",
          password: SEED_PASSWORD,
          date: "2026-10-06",
          name: "Tiramisu",
          stock: 6,
          price: 3.5,
        },
      ]);
      const tiramisu = staffDish(page, "Tiramisu");
      await expect(tiramisu).toContainText("Tiramisu — 3,50 €");
      await expect(tiramisu).toContainText("6 / 6");

      // C-22.
      const itemId = fakeScript.db.r2Items.find((dish) => dish.Nom === "Tiramisu")?.ID;
      await tiramisu.getByRole("button", { name: "Modifier ce plat", exact: true }).click();
      await expect(tiramisu.getByLabel("Nom du plat")).toHaveValue("Tiramisu");
      await expect(tiramisu.getByLabel("Stock", { exact: true })).toHaveValue("6");
      await tiramisu.getByLabel("Nom du plat").fill("Tiramisu maison");
      await tiramisu.getByLabel("Stock", { exact: true }).fill("8");
      await tiramisu.getByRole("button", { name: "Enregistrer", exact: true }).click();
      await expect(toast(page)).toHaveText("Plat modifié.");
      expect(actionBodies(fakeScript.requests, "editItemR2")).toStrictEqual([
        {
          action: "editItemR2",
          password: SEED_PASSWORD,
          itemId,
          name: "Tiramisu maison",
          stock: 8,
          price: 3.5,
        },
      ]);
      await expect(staffDish(page, "Tiramisu maison")).toContainText("8 / 8");
    },
  );

  test(
    "r2StaffCardDishes (REG-37) — stock below the booked portions, dish deletion",
    { tag: ["@changed:E-36", "@changed:E-38", "@C-22", "@C-14", "@p5"] },
    async ({ page, fakeScript }) => {
      const legacy = target(test.info()) === "legacy";
      await tomorrowR2(page);
      const bowl = staffDish(page, "Bowl");
      await bowl.getByRole("button", { name: "Modifier ce plat", exact: true }).click();
      await expect(bowl.getByLabel("Nom du plat")).toHaveValue("Bowl");
      await expect(bowl.getByLabel("Ticket restaurant")).toBeChecked();
      await expect(bowl.getByLabel("Prix (optionnel)")).toBeDisabled();
      await expect(bowl.getByLabel("Prix (optionnel)")).toHaveAttribute("placeholder", "Ticket");
      await bowl.getByLabel("Stock", { exact: true }).fill("2");
      await bowl.getByRole("button", { name: "Enregistrer", exact: true }).click();
      if (legacy) {
        // 06 PA 9: accepted under the 3 booked portions.
        await expect(toast(page)).toHaveText("Plat modifié.");
        expect(actionBodies(fakeScript.requests, "editItemR2")).toStrictEqual([
          {
            action: "editItemR2",
            password: SEED_PASSWORD,
            itemId: "r2i-d+1-bowl",
            name: "Bowl (ticket restaurant)",
            stock: 2,
            price: "",
          },
        ]);
        await expect(staffDish(page, "Bowl")).toContainText("-1 / 2");
      } else {
        // E-36 (D-19).
        await expect(
          bowl.getByText(
            "Impossible : 3 portions déjà réservées pour ce plat, le stock ne peut pas être inférieur.",
            { exact: true },
          ),
        ).toBeVisible();
        expect(actionBodies(fakeScript.requests, "editItemR2")).toStrictEqual([]);
      }

      // Deletion of a dish with a booking: E-38 (D-21) details it.
      const detail = legacy
        ? "Confirmer la suppression de ce plat"
        : "Confirmer la suppression de ce plat (1 réservation ne sera plus affichée, les personnes ne seront pas prévenues)";
      const remove = staffDish(page, "Lasagnes").getByRole("button", {
        name: /^(?:Supprimer ce plat|Confirmer la suppression de ce plat.*)$/u,
      });
      await remove.click();
      await expect(remove).toHaveText("Confirmer ?");
      await expect(remove).toHaveAccessibleName(detail);
      await expect(staffCard(page, "r2").getByText(detail, { exact: true })).toHaveCount(
        legacy ? 0 : 1,
      );
      await remove.click();
      await veilGone(page);
      await expect(toast(page)).toHaveText("Plat supprimé.");
      expect(actionBodies(fakeScript.requests, "deleteItemR2")).toStrictEqual([
        { action: "deleteItemR2", password: SEED_PASSWORD, itemId: "r2i-d+1-lasagnes" },
      ]);
      await expect(staffCard(page, "r2")).not.toContainText("Lasagnes");
      // Its booking stays in the sheet (06 § 5.2).
      expect(fakeScript.db.r2Bookings.some((b) => b.ID === "r2b-d+1-bernard")).toBe(true);
    },
  );
});

/** Service modes offered by the open staff form: a `<select>` on the legacy site, radios on React (E-50). */
async function expectServiceModes(scope: Locator, legacyValue: string): Promise<void> {
  if (target(test.info()) === "legacy") {
    // 06 PA 15: « À emporter » offered on a voucher day too.
    const select = scope.getByLabel("Mode de service");
    await expect(select).toHaveValue(legacyValue);
    await expect(select.locator("option")).toHaveText(["À emporter", "Sur place"]);
    return;
  }
  // E-36: « Sur place » alone on a voucher day (invariant 5).
  await expect(scope.getByRole("radio")).toHaveCount(1);
  await expect(scope.getByRole("radio", { name: "Sur place", exact: true })).toBeChecked();
}

test.describe("r2StaffBookings (REG-38)", () => {
  // 10 h 30 in Paris: online orders closed, staff not bound by the cut-off (06 § 8.4).
  test.use({ fixedTime: Date.parse("2026-10-05T08:30:00.000Z") });

  test(
    "r2StaffBookings (REG-38) — person added after 10 h",
    { tag: ["@parity", "@changed:E-36", "@C-23", "@p5"] },
    async ({ page, fakeScript }) => {
      await loginAsStaff(page);
      const lasagnes = staffDish(page, "Lasagnes");
      await expect(lasagnes).toContainText("4 / 10");
      await openAddPerson(page, "r2", "Lasagnes");
      await expect(lasagnes.getByLabel("Nom et prénom")).toBeFocused();
      await expect(lasagnes.getByLabel("Portions (4 au maximum)")).toHaveValue("1");
      await expectServiceModes(lasagnes, "emporter");

      await lasagnes.getByLabel("Nom et prénom").fill("Inès Haddad");
      await lasagnes.getByLabel("Classe ou service").fill("BTS2");
      await lasagnes.getByLabel("Portions (4 au maximum)").fill("4");
      // Another visitor takes 3 of the 4 portions left: the script grants 1.
      fakeScript.db.r2Bookings.push(otherOrderR2("r2i-d0-lasagnes", 3));
      await lasagnes.getByRole("button", { name: "Ajouter cette personne", exact: true }).click();

      await expect(toast(page)).toHaveText(
        "Personne ajoutée avec 1 portion seulement (stock restant).",
      );
      expect(await toastKind(page)).toBe("success");
      expect(actionBodies(fakeScript.requests, "addBookingR2Multi")).toStrictEqual([
        {
          action: "addBookingR2Multi",
          date: "2026-10-05",
          nom: "Inès Haddad",
          contact: "",
          classe: "BTS2",
          mode: target(test.info()) === "legacy" ? "emporter" : "surplace",
          items: [{ itemId: "r2i-d0-lasagnes", qte: 4 }],
          observation: "",
          requestId: expect.any(String),
        },
      ]);
      await expect(bookingRow(page, "r2", "Inès Haddad")).toContainText("1 portion");
    },
  );

  test(
    "r2StaffBookings (REG-38) — booking edited",
    { tag: ["@parity", "@changed:E-36", "@C-24", "@p5"] },
    async ({ page, fakeScript }) => {
      await loginAsStaff(page);
      const lasagnes = staffDish(page, "Lasagnes");
      await bookingRow(page, "r2", "Cyrille Ungerer")
        .getByRole("button", { name: "Modifier", exact: true })
        .click();
      await expect(lasagnes.getByLabel("Nom", { exact: true })).toHaveValue("Cyrille Ungerer");
      await expect(lasagnes.getByLabel("Téléphone ou email")).toHaveValue("c.ungerer@exemple.fr");
      const portions = lasagnes.getByLabel(/^Portions/u);
      await expect(portions).toHaveValue("4");
      await expectServiceModes(lasagnes, "surplace");

      // More than the 4 portions left plus its own 4.
      const save = lasagnes.getByRole("button", { name: "Enregistrer", exact: true });
      await portions.fill("9");
      await save.click();
      if (target(test.info()) === "legacy") {
        // 06 § 7.4: no check on the page, the script refuses.
        await expect(toast(page)).toHaveText(
          "Il ne reste que 8 portion(s) disponible(s) pour ce plat.",
        );
        expect(await toastKind(page)).toBe("error");
      } else {
        // E-36 (D-19): bounded before sending.
        await expect(portions).toHaveAttribute("aria-invalid", "true");
        expect(actionBodies(fakeScript.requests, "editBookingR2")).toStrictEqual([]);
      }

      await portions.fill("3");
      await save.click();
      await expect(toast(page)).toHaveText("Réservation modifiée.");
      expect(actionBodies(fakeScript.requests, "editBookingR2").at(-1)).toStrictEqual({
        action: "editBookingR2",
        password: SEED_PASSWORD,
        id: "r2b-d0-ungerer",
        nom: "Cyrille Ungerer",
        contact: "c.ungerer@exemple.fr",
        classe: "TS2",
        qte: 3,
        mode: "surplace",
        observation: "",
      });
      await expect(bookingRow(page, "r2", "Cyrille Ungerer")).toContainText("3 portions");
    },
  );
});
