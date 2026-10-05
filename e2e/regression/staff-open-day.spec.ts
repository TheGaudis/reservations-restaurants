import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { TODAY } from "@/test/clock";

import { expect, test } from "../fixtures";
import { longDate, selectDay, selectedDay, showPeriod } from "../pages/calendar";
import { BLOCKED_FONT_PRELOAD, toast } from "../pages/home";
import { datePicker, staffCard } from "../pages/staff";
import { target } from "../pages/target";
import { actionBodies, loginAsStaff, openDayFormOf, pickerDay } from "./staff-helpers";

// « Ouvrir un jour » of R1 and its date picker (09 § 4: C-04, C-05, C-10; 06 § 3, § 4.1; D-19).

test.use({ reducedMotion: "reduce" });

test.beforeEach(({ consoleLog }) => {
  consoleLog.allow(BLOCKED_FONT_PRELOAD);
});

const R1_FIELDS = {
  staffName: "Votre nom (collègue qui ouvre ce jour)",
  capacity: "Nombre de couverts disponibles",
  theme: "Thème du jour (optionnel)",
  menu: "Menu du jour (optionnel)",
} as const;

test.describe("openDayR1WithPicker (REG-33)", () => {
  test(
    "openDayR1WithPicker (REG-33) — picker",
    { tag: ["@parity", "@changed:E-05", "@C-04", "@C-05", "@p5"] },
    async ({ page }) => {
      await loginAsStaff(page);
      const { dateButton } = await openDayFormOf(page, "r1");
      // Default: the day selected in the R1 calendar.
      await expect(dateButton).toHaveText(longDate(TODAY));

      await dateButton.click();
      const picker = datePicker(page);
      await expect(picker).toBeVisible();
      await expect(picker.getByText(/^octobre 2026$/iu)).toBeVisible();
      await expect(pickerDay(page, TODAY)).toBeFocused();
      if (target(test.info()) === "legacy") {
        // 06 § 3.2: buttons with `aria-pressed`.
        await expect(pickerDay(page, TODAY)).toHaveAttribute("aria-pressed", "true");
      } else {
        // E-05: a grid, the chosen day in the selected gridcell.
        await expect(
          picker.getByRole("gridcell", { selected: true }).getByRole("button"),
        ).toHaveAccessibleName(new RegExp(`^${longDate(TODAY)}`, "u"));
      }
      await expect(pickerDay(page, "2026-10-01")).toHaveAccessibleName(
        `${longDate("2026-10-01")}, déjà ouvert, passé`,
      );
      await expect(pickerDay(page, "2026-10-01")).toHaveAttribute("aria-disabled", "true");
      await expect(pickerDay(page, "2026-10-06")).toHaveAccessibleName(
        `${longDate("2026-10-06")}, déjà ouvert`,
      );
      await expect(pickerDay(page, "2026-10-20")).toHaveAccessibleName(longDate("2026-10-20"));
      await expect(picker.getByText("déjà ouvert", { exact: true })).toBeVisible();

      // A past day cannot be chosen; the arrows only move the focus.
      // `aria-disabled`: Playwright would wait for an enabled button, hence `force`.
      await pickerDay(page, "2026-10-02").click({ force: true });
      await expect(picker).toBeVisible();
      await pickerDay(page, TODAY).focus();
      await page.keyboard.press("ArrowRight");
      await expect(pickerDay(page, "2026-10-06")).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(picker).toBeHidden();
      await expect(dateButton).toBeFocused();
      await expect(dateButton).toHaveText(longDate(TODAY));

      // Enter chooses the focused day, closes the picker and gives the focus back to the field.
      await dateButton.click();
      await page.keyboard.press("ArrowDown");
      await expect(pickerDay(page, "2026-10-12")).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(picker).toBeHidden();
      await expect(dateButton).toBeFocused();
      await expect(dateButton).toHaveText(longDate("2026-10-12"));
    },
  );

  test(
    "openDayR1WithPicker (REG-33) — success",
    { tag: ["@parity", "@C-04", "@C-10", "@p5"] },
    async ({ page, fakeScript }) => {
      await loginAsStaff(page);
      const { form, dateButton } = await openDayFormOf(page, "r1");
      await dateButton.click();
      await pickerDay(page, "2026-10-20").click();
      await expect(dateButton).toHaveText(longDate("2026-10-20"));
      await form.getByLabel(R1_FIELDS.staffName).fill(" M. Leroy ");
      await form.getByLabel(R1_FIELDS.capacity).fill("12");
      await form.getByLabel(R1_FIELDS.theme).fill("Cuisine du Sud-Ouest");
      await form.getByLabel(R1_FIELDS.menu).fill("Garbure, confit, pastis landais");
      await form.getByRole("button", { name: "Ouvrir ce jour", exact: true }).click();

      await expect(toast(page)).toHaveText("Jour ajouté.");
      expect(actionBodies(fakeScript.requests, "addDayR1")).toStrictEqual([
        {
          action: "addDayR1",
          password: SEED_PASSWORD,
          date: "2026-10-20",
          capacity: 12,
          menu: "Garbure, confit, pastis landais",
          theme: "Cuisine du Sud-Ouest",
          collegue: "M. Leroy",
        },
      ]);
      // 06 § 4.1: the panel stays open, the date stays, the other fields are emptied.
      await expect(dateButton).toHaveText(longDate("2026-10-20"));
      for (const label of Object.values(R1_FIELDS)) {
        await expect(form.getByLabel(label)).toHaveValue("");
      }
      // The R1 calendar selects the day opened (collegue.js l. 276-277).
      await expect(selectedDay(page, "r1")).toHaveAccessibleName(
        new RegExp(`^${longDate("2026-10-20")},`, "u"),
      );
      const card = staffCard(page, "r1");
      await expect(card).toContainText(longDate("2026-10-20"));
      await expect(card).toContainText("Ouvert par M. Leroy");
      await expect(card).toContainText("12 / 12 couverts");
      await expect(card).toContainText("Aucune réservation.");
    },
  );

  test(
    "openDayR1WithPicker (REG-33) — past day by default",
    { tag: ["@changed:E-36", "@C-04", "@p5"] },
    async ({ page, fakeScript }) => {
      await loginAsStaff(page);
      await showPeriod(page, "r1", "previous");
      await selectDay(page, "r1", "2026-10-02");
      const { form, dateButton } = await openDayFormOf(page, "r1");
      await expect(dateButton).toHaveText(longDate("2026-10-02"));
      await form.getByLabel(R1_FIELDS.capacity).fill("10");
      await form.getByRole("button", { name: "Ouvrir ce jour", exact: true }).click();

      if (target(test.info()) === "legacy") {
        // 06 PA 5: only a missing date is checked.
        await expect(toast(page)).toHaveText("Jour ajouté.");
        expect(actionBodies(fakeScript.requests, "addDayR1")[0]).toMatchObject({
          date: "2026-10-02",
        });
      } else {
        // E-36 (D-19).
        await expect(
          form.getByText("Choisissez la date d'aujourd'hui ou une date ultérieure.", {
            exact: true,
          }),
        ).toBeVisible();
        expect(actionBodies(fakeScript.requests, "addDayR1")).toStrictEqual([]);
      }
    },
  );

  test(
    "openDayR1WithPicker (REG-33) — day already open",
    { tag: ["@changed:E-36", "@C-04", "@C-10", "@p5"] },
    async ({ page, fakeScript }) => {
      await loginAsStaff(page);
      await selectDay(page, "r1", "2026-10-06");
      const { form, dateButton } = await openDayFormOf(page, "r1");
      await expect(dateButton).toHaveText(longDate("2026-10-06"));
      await form.getByLabel(R1_FIELDS.staffName).fill("Mme Roux");
      await form.getByLabel(R1_FIELDS.capacity).fill("10");
      await form.getByRole("button", { name: "Ouvrir ce jour", exact: true }).click();

      const card = staffCard(page, "r1");
      if (target(test.info()) === "legacy") {
        // 06 PA 4: the day is overwritten, below its 15 booked seats, « ouvert par » included.
        await expect(toast(page)).toHaveText("Jour ajouté.");
        await expect(card).toContainText("-5 / 10 couverts");
        await expect(card).toContainText("Ouvert par Mme Roux");
      } else {
        // E-36 (D-19): sending blocked.
        await expect(
          form.getByText("Ce jour est déjà ouvert : utilisez « Modifier ce jour ».", {
            exact: true,
          }),
        ).toBeVisible();
        expect(actionBodies(fakeScript.requests, "addDayR1")).toStrictEqual([]);
        await expect(card).toContainText("5 / 20 couverts");
        await expect(card).toContainText("Ouvert par M. Dupont");
      }
    },
  );
});
