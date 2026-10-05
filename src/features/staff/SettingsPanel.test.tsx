import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { SETTINGS_API_KEYS } from "@/api/actions";
import { useClock } from "@/background/clock";
import { SettingsPanel } from "@/features/staff/SettingsPanel";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { stateKeys } from "@/queries/state";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { renderColumn } from "@/test/column-page";
import { urlParams } from "@/test/public-page";

// « Paramètres » (06 § 2.2, D-20, E-37; 09 C-02) on the seed of parite.md § 2: « Restaurant Pédagogique »,
// « Aristide », contact « le secrétariat », prices 4.95, 6.10 and 9.90, default descriptions.

const LOCK_BUSY = "Le serveur est très sollicité : réessayez dans quelques secondes.";
const CONTACT_LABEL = "Contact à indiquer pour une annulation (affiché dans les emails)";
const DEFAULT_DESC2 = "Plats à emporter ou sur place, chacun avec son propre stock.";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
  useSessionStore.getState().open(SEED_PASSWORD);
});

const initialClock = useClock.getState();

afterEach(() => {
  useClock.setState(initialClock, true);
  vi.useRealTimers();
});

async function renderPanel(url = "/collegue?parametres=true") {
  const rendered = await renderColumn(url, "r1", <SettingsPanel />);
  await expect.element(page.getByRole("button", { name: "Paramètres" })).toBeVisible();
  return rendered;
}

function field(label: string) {
  return page.getByLabelText(label, { exact: true });
}

function saveButton() {
  return page.getByRole("button", { name: /^Enregistrer les paramètres$|^Enregistrement…$/u });
}

function toastText(text: string) {
  return page.getByText(text, { exact: true }).first();
}

/** Values of the `setConfigField` bodies, in the order of api/actions.ts. */
function settingPosts(): unknown[][] {
  return fakeScript()
    .requests.filter((request) => request.method === "POST")
    .map((request) => Object.values(request.json as Record<string, unknown>))
    .filter((values) => values[0] === "setConfigField");
}

describe("panel (06 § 2.2)", () => {
  it("is closed by default; its title opens it through the URL", async () => {
    const { router } = await renderPanel("/collegue");
    const title = page.getByRole("button", { name: "Paramètres" });
    await expect.element(title).toHaveAttribute("aria-expanded", "false");
    await expect.element(field("Nom du restaurant 1")).not.toBeInTheDocument();
    await userEvent.click(title);
    await expect.element(title).toHaveAttribute("aria-expanded", "true");
    expect(urlParams(router)).toStrictEqual(["parametres=true"]);
    await userEvent.click(title);
    await expect.element(field("Nom du restaurant 1")).not.toBeInTheDocument();
  });

  it("shows the settings of the full state, the prices as number inputs", async () => {
    await renderPanel();
    await expect.element(field("Nom du restaurant 1")).toHaveValue("Restaurant Pédagogique");
    await expect.element(field("Nom du restaurant 2")).toHaveValue("Aristide");
    await expect
      .element(field("Description du restaurant 1"))
      .toHaveValue("Table réservée par nombre de couverts, avec le menu du jour.");
    await expect.element(field("Description du restaurant 2")).toHaveValue(DEFAULT_DESC2);
    await expect.element(field(CONTACT_LABEL)).toHaveValue("le secrétariat");
    await expect
      .element(field(CONTACT_LABEL))
      .toHaveAttribute("placeholder", "Ex. le secrétariat au 03 00 00 00 00");
    await expect.element(field("Tarif élève (€)")).toHaveValue(4.95);
    await expect.element(field("Tarif professeur/personnel (€)")).toHaveValue(6.1);
    await expect.element(field("Tarif extérieur (€)")).toHaveValue(9.9);
    const prices = ["Tarif élève (€)", "Tarif professeur/personnel (€)", "Tarif extérieur (€)"];
    const inputs = prices.map((label) => field(label).element());
    expect(
      inputs.map((input) => [input.getAttribute("step"), input.getAttribute("min")]),
    ).toStrictEqual([
      ["0.01", "0"],
      ["0.01", "0"],
      ["0.01", "0"],
    ]);
  });
});

describe("saving (06 § 2.2, D-20)", () => {
  it("says « Aucune modification à enregistrer. » and sends nothing", async () => {
    await renderPanel();
    await userEvent.click(saveButton());
    await expect.element(toastText("Aucune modification à enregistrer.")).toBeVisible();
    expect(settingPosts()).toStrictEqual([]);
  });

  it("sends the changed fields one after the other, busy « Enregistrement… », panel kept open", async () => {
    await renderPanel();
    await userEvent.fill(field("Nom du restaurant 2"), "Le Bistrot");
    await userEvent.fill(field("Tarif élève (€)"), "5.20");
    const release = fakeScript().hold();
    await userEvent.click(saveButton());
    await expect.element(saveButton()).toHaveTextContent("Enregistrement…");
    await expect.poll(() => settingPosts().length).toBe(1);
    release();
    await expect.element(toastText("Paramètres enregistrés.")).toBeVisible();
    expect(settingPosts()).toStrictEqual([
      ["setConfigField", SEED_PASSWORD, SETTINGS_API_KEYS.name2, "Le Bistrot"],
      ["setConfigField", SEED_PASSWORD, SETTINGS_API_KEYS.priceStudent, "5.20"],
    ]);
    await expect.element(field("Nom du restaurant 2")).toHaveValue("Le Bistrot");
    await expect.element(saveButton()).toHaveTextContent("Enregistrer les paramètres");
  });

  it('sends an emptied description as "", then shows the default text the script put back (E-37)', async () => {
    await renderPanel();
    await userEvent.clear(field("Description du restaurant 2"));
    await userEvent.click(saveButton());
    await expect.element(toastText("Paramètre enregistré.")).toBeVisible();
    expect(settingPosts()).toStrictEqual([
      ["setConfigField", SEED_PASSWORD, SETTINGS_API_KEYS.desc2, ""],
    ]);
    await expect.element(field("Description du restaurant 2")).toHaveValue(DEFAULT_DESC2);
  });

  it("refuses an emptied name and an invalid price under their fields, nothing sent", async () => {
    await renderPanel();
    await userEvent.clear(field("Nom du restaurant 1"));
    await userEvent.fill(field("Tarif extérieur (€)"), "-1");
    await userEvent.clear(field("Tarif élève (€)"));
    await userEvent.click(saveButton());
    await expect
      .element(field("Nom du restaurant 1"))
      .toHaveAccessibleDescription("Indiquez le nom du restaurant.");
    await expect
      .element(field("Tarif extérieur (€)"))
      .toHaveAccessibleDescription("Indiquez un tarif positif ou nul (ex. 4,95).");
    await expect
      .element(field("Tarif élève (€)"))
      .toHaveAccessibleDescription("Indiquez un tarif positif ou nul (ex. 4,95).");
    await expect.element(field("Nom du restaurant 1")).toHaveFocus();
    expect(settingPosts()).toStrictEqual([]);
  });

  it("details a partial failure: saved fields kept, the others named with the script's message", async () => {
    await renderPanel();
    await userEvent.fill(field(CONTACT_LABEL), "la vie scolaire");
    await userEvent.fill(field("Tarif professeur/personnel (€)"), "6.50");
    const release = fakeScript().hold();
    await userEvent.click(saveButton());
    await expect.poll(() => settingPosts().length).toBe(1);
    fakeScript().failNext("error");
    release();
    await expect
      .element(
        toastText(
          `Enregistré : ${CONTACT_LABEL}. Non enregistré : Tarif professeur/personnel (€) (${LOCK_BUSY}).`,
        ),
      )
      .toBeVisible();
    // The typed values stay, ready for a new try.
    await expect.element(field("Tarif professeur/personnel (€)")).toHaveValue(6.5);
    await expect.element(saveButton()).toHaveTextContent("Enregistrer les paramètres");
  });

  it("shows the script's message alone when the first field is refused", async () => {
    await renderPanel();
    await userEvent.fill(field("Nom du restaurant 1"), "La Table");
    fakeScript().failNext("error");
    await userEvent.click(saveButton());
    await expect.element(toastText(LOCK_BUSY)).toBeVisible();
    await expect.element(field("Nom du restaurant 1")).toHaveValue("La Table");
  });

  it("keeps what was typed through a refresh of the full state (03 § 5.4)", async () => {
    const { queryClient } = await renderPanel();
    await userEvent.fill(field("Nom du restaurant 2"), "Le Bistrot");
    fakeScript().db.config["name1"] = "La Table";
    await queryClient.refetchQueries({ queryKey: stateKeys.staffAll() });
    await expect.element(field("Nom du restaurant 2")).toHaveValue("Le Bistrot");
  });
});
