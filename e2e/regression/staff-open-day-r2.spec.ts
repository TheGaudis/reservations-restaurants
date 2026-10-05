import type { Page } from "@playwright/test";

import { SEED_PASSWORD } from "@/mocks/fixtures/seed";

import { expect, test } from "../fixtures";
import { longDate, selectedDay } from "../pages/calendar";
import { BLOCKED_FONT_PRELOAD, toast } from "../pages/home";
import { openDayPanel, staffCard } from "../pages/staff";
import { target } from "../pages/target";
import { actionBodies, loginAsStaff, openDayFormOf, pickerDay } from "./staff-helpers";

// « Ouvrir un jour » of R2 and its dish lines (09 § 4: C-06; 06 § 4.2-4.3; D-19, D-22).

test.use({ reducedMotion: "reduce" });

test.beforeEach(({ consoleLog }) => {
  consoleLog.allow(BLOCKED_FONT_PRELOAD);
});

/** Field of dish line `index` (06 § 4.2): « Plat 1 : nom », « … : stock », « … : prix en euros (optionnel) »… */
function dishLine(page: Page, index: number, part: string) {
  return openDayPanel(page, "r2").getByLabel(`Plat ${index} : ${part}`, { exact: true });
}

const PRICE = "prix en euros (optionnel)";

async function openDayR2On20(page: Page) {
  await loginAsStaff(page);
  const { form, dateButton } = await openDayFormOf(page, "r2");
  await dateButton.click();
  await pickerDay(page, "2026-10-20").click();
  await expect(dateButton).toHaveText(longDate("2026-10-20"));
  return { form, dateButton };
}

test.describe("openDayR2DishLines (REG-34)", () => {
  test(
    "openDayR2DishLines (REG-34) — voucher and lines",
    { tag: ["@parity", "@C-06", "@p5"] },
    async ({ page, fakeScript }) => {
      const { form, dateButton } = await openDayR2On20(page);
      await dishLine(page, 1, "nom").fill("Bowl");
      await dishLine(page, 1, "stock").fill("10");
      await dishLine(page, 1, PRICE).fill("3.50");
      // 06 § 4.3: voucher price, field emptied and disabled.
      await dishLine(page, 1, "au prix d'un ticket restaurant").check();
      const voucherPrice = dishLine(page, 1, PRICE);
      await expect(voucherPrice).toHaveValue("");
      await expect(voucherPrice).toBeDisabled();
      await expect(voucherPrice).toHaveAttribute("placeholder", "Ticket");
      // Suggestions: prices already used, once each, in ascending order (06 § 6.1).
      const suggestions = await dishLine(page, 1, PRICE).evaluate((input) =>
        [...((input as HTMLInputElement).list?.options ?? [])].map((option) => option.value),
      );
      expect(suggestions.map((value) => Number(value.replace(",", ".")))).toStrictEqual([
        4.5, 6, 6.5,
      ]);

      const addLine = form.getByRole("button", { name: "+ Ajouter un plat", exact: true });
      await addLine.click();
      await dishLine(page, 2, "nom").fill("Lasagnes");
      await dishLine(page, 2, "stock").fill("8");
      await dishLine(page, 2, PRICE).fill("4.5");
      await addLine.click();
      await expect(dishLine(page, 3, "nom")).toBeVisible();
      await form.getByRole("button", { name: "Retirer le plat 3", exact: true }).click();
      await expect(dishLine(page, 3, "nom")).toHaveCount(0);
      await form.getByRole("button", { name: "Ouvrir ce jour", exact: true }).click();

      await expect(toast(page)).toHaveText("Jour ajouté.");
      expect(actionBodies(fakeScript.requests, "addDayR2")).toStrictEqual([
        {
          action: "addDayR2",
          password: SEED_PASSWORD,
          date: "2026-10-20",
          note: "",
          items: [
            { name: "Bowl (ticket restaurant)", stock: 10, price: "" },
            { name: "Lasagnes", stock: 8, price: 4.5 },
          ],
          theme: "",
          collegue: "",
        },
      ]);
      // Back to one empty line; the panel stays open on the date; the R2 calendar on the day opened.
      await expect(dishLine(page, 1, "nom")).toHaveValue("");
      await expect(dishLine(page, 2, "nom")).toHaveCount(0);
      await expect(dateButton).toHaveText(longDate("2026-10-20"));
      await expect(selectedDay(page, "r2")).toHaveAccessibleName(
        new RegExp(`^${longDate("2026-10-20")},`, "u"),
      );
      const card = staffCard(page, "r2");
      await expect(card).toContainText("Bowl — prix d'un ticket restaurant");
      await expect(card).toContainText("Lasagnes — 4,50 €");
    },
  );

  test(
    "openDayR2DishLines (REG-34) — incomplete line and zero price",
    { tag: ["@changed:E-36", "@changed:E-39", "@C-06", "@p5"] },
    async ({ page, fakeScript }) => {
      const { form } = await openDayR2On20(page);
      await dishLine(page, 1, "nom").fill("Lasagnes");
      await dishLine(page, 1, "stock").fill("8");
      await dishLine(page, 1, PRICE).fill("0");
      await form.getByRole("button", { name: "+ Ajouter un plat", exact: true }).click();
      await dishLine(page, 2, "nom").fill("Salade");
      await form.getByRole("button", { name: "Ouvrir ce jour", exact: true }).click();

      if (target(test.info()) === "legacy") {
        // 06 PA 7-8: the incomplete line is dropped in silence; price 0 is stored as no price (b-8).
        await expect(toast(page)).toHaveText("Jour ajouté.");
        expect(actionBodies(fakeScript.requests, "addDayR2")[0]?.["items"]).toStrictEqual([
          { name: "Lasagnes", stock: 8, price: 0 },
        ]);
        expect(fakeScript.db.r2Items.find((dish) => dish.Date === "2026-10-20")?.Prix).toBe("");
      } else {
        // E-36, E-39 (D-19, D-22): both lines refused, nothing sent.
        await expect(
          form.getByText("Indiquez un prix supérieur à 0, ou laissez le champ vide.", {
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          form.getByText("Indiquez le nom et le stock de ce plat, ou retirez la ligne.", {
            exact: true,
          }),
        ).toBeVisible();
        expect(actionBodies(fakeScript.requests, "addDayR2")).toStrictEqual([]);
      }
    },
  );
});
