import type { Page } from "@playwright/test";

import { SEED_PASSWORD } from "@/mocks/fixtures/seed";

import { expect, test } from "../fixtures";
import { columnTitle, toast, toastKind } from "../pages/home";
import { openSettings, staffPanel } from "../pages/staff";
import { target } from "../pages/target";
import { settle } from "./helpers";
import { actionBodies, loginAsStaff, storedJson } from "./staff-helpers";

// « Paramètres » (09 § 4: C-02; 06 § 2.2; D-20).

const LOCK_BUSY = "Le serveur est très sollicité : réessayez dans quelques secondes.";

test.use({ reducedMotion: "reduce" });

async function openSettingsPanel(page: Page) {
  await loginAsStaff(page);
  await openSettings(page);
  const panel = staffPanel(page, "Paramètres");
  return {
    panel,
    field: (label: string) => panel.getByLabel(label, { exact: true }),
    save: async () =>
      panel.getByRole("button", { name: "Enregistrer les paramètres", exact: true }).click(),
  };
}

test.describe("settingsPanel (REG-32)", () => {
  test(
    "settingsPanel (REG-32) — no change, then two fields in sequence",
    { tag: ["@parity", "@changed:E-18", "@changed:E-40", "@C-02", "@p5"] },
    async ({ page, fakeScript }) => {
      const { panel, field, save } = await openSettingsPanel(page);
      await expect(field("Nom du restaurant 1")).toHaveValue("Restaurant Pédagogique");
      await expect(field("Nom du restaurant 2")).toHaveValue("Aristide");

      await save();
      await expect(toast(page)).toHaveText("Aucune modification à enregistrer.");
      expect(await toastKind(page)).toBe("success");

      // One request per changed field, the second after the answer to the first (06 § 2.2).
      await field("Nom du restaurant 2").fill("Le Bistrot");
      await field("Tarif élève (€)").fill("5.20");
      const release = fakeScript.hold();
      await save();
      await expect.poll(() => actionBodies(fakeScript.requests, "setConfigField").length).toBe(1);
      await expect(panel.getByRole("button", { name: "Enregistrement…" })).toBeDisabled();
      await settle(page);
      expect(actionBodies(fakeScript.requests, "setConfigField")).toHaveLength(1);
      release();

      await expect(toast(page)).toHaveText("Paramètres enregistrés.");
      expect(actionBodies(fakeScript.requests, "setConfigField")).toStrictEqual([
        { action: "setConfigField", password: SEED_PASSWORD, key: "name2", value: "Le Bistrot" },
        { action: "setConfigField", password: SEED_PASSWORD, key: "priceEleve", value: "5.20" },
      ]);
      await expect(columnTitle(page, "r2")).toHaveText("Le Bistrot");
      await expect(
        page.getByText(
          "Table côté Restaurant Pédagogique · Plats à emporter ou sur place côté Le Bistrot",
          { exact: true },
        ),
      ).toBeVisible();
      // The panel stays open after a success.
      await expect(field("Nom du restaurant 1")).toBeVisible();

      const heading = page.getByRole("heading", { level: 1 });
      const storedTexts = await storedJson(page, "reservations-textes");
      if (target(test.info()) === "legacy") {
        // E-40: « … et Aristide » written in the page; E-18: the titles saved for the next visit.
        await expect(heading).toHaveText("Réservations des restaurants pédagogiques et Aristide");
        expect(storedTexts).toMatchObject({ name1: "Restaurant Pédagogique", name2: "Le Bistrot" });
      } else {
        await expect(heading).toHaveText("Réservations des restaurants pédagogiques et Le Bistrot");
        expect(storedTexts).toBeNull();
      }
    },
  );

  test(
    "settingsPanel (REG-32) — emptied description",
    { tag: ["@changed:E-37", "@C-02", "@p5"] },
    async ({ page, fakeScript }) => {
      const { field, save } = await openSettingsPanel(page);
      await field("Description du restaurant 2").fill("");
      await save();
      if (target(test.info()) === "legacy") {
        // 06 § 2.2 (1): an emptied field is ignored.
        await expect(toast(page)).toHaveText("Aucune modification à enregistrer.");
        expect(actionBodies(fakeScript.requests, "setConfigField")).toStrictEqual([]);
      } else {
        // E-37: sent empty, the script puts its default text back (b-9).
        await expect(toast(page)).toHaveText("Paramètre enregistré.");
        expect(actionBodies(fakeScript.requests, "setConfigField")).toStrictEqual([
          { action: "setConfigField", password: SEED_PASSWORD, key: "desc2", value: "" },
        ]);
      }
    },
  );

  test(
    "settingsPanel (REG-32) — second field refused",
    { tag: ["@changed:E-37", "@C-02", "@p5"] },
    async ({ page, fakeScript }) => {
      const { field, save } = await openSettingsPanel(page);
      const contact = "le secrétariat au 03 88 00 00 00";
      await field("Contact à indiquer pour une annulation (affiché dans les emails)").fill(contact);
      await field("Tarif professeur/personnel (€)").fill("6.50");
      const release = fakeScript.hold();
      await save();
      await expect.poll(() => actionBodies(fakeScript.requests, "setConfigField").length).toBe(1);
      fakeScript.failNext("error");
      release();

      await expect.poll(() => actionBodies(fakeScript.requests, "setConfigField").length).toBe(2);
      if (target(test.info()) === "legacy") {
        // 06 § 2.2 (6): the script's message alone.
        await expect(toast(page)).toHaveText(LOCK_BUSY);
      } else {
        // E-37 (D-20): what was saved and what was not.
        await expect(toast(page)).toHaveText(
          `Enregistré : Contact à indiquer pour une annulation (affiché dans les emails). Non enregistré : Tarif professeur/personnel (€) (${LOCK_BUSY}).`,
        );
      }
      expect(await toastKind(page)).toBe("error");
      expect(fakeScript.db.config["contactAnnulation"]).toBe(contact);
      expect(fakeScript.db.config["priceProf"]).toBe("6.10");
    },
  );

  test(
    "settingsPanel (REG-32) — invalid values",
    { tag: ["@changed:E-37", "@C-02", "@p5"] },
    async ({ page, fakeScript }) => {
      const { panel, field, save } = await openSettingsPanel(page);
      await field("Nom du restaurant 1").fill("");
      await field("Tarif extérieur (€)").fill("-1");
      await save();
      if (target(test.info()) === "legacy") {
        // No check (06 § 2.2): the emptied name is ignored, the negative price sent.
        await expect(toast(page)).toHaveText("Paramètre enregistré.");
        expect(actionBodies(fakeScript.requests, "setConfigField")).toStrictEqual([
          { action: "setConfigField", password: SEED_PASSWORD, key: "priceExterieur", value: "-1" },
        ]);
      } else {
        // E-37 (D-20): both refused under their field, nothing sent.
        await expect(
          panel.getByText("Indiquez le nom du restaurant.", { exact: true }),
        ).toBeVisible();
        await expect(
          panel.getByText("Indiquez un tarif positif ou nul (ex. 4,95).", { exact: true }),
        ).toBeVisible();
        expect(actionBodies(fakeScript.requests, "setConfigField")).toStrictEqual([]);
      }
    },
  );
});
