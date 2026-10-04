import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { useClock } from "@/background/clock";
import { OpenDayFormR1 } from "@/features/staff/OpenDayFormR1";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { urlParams } from "@/test/public-page";
import { actionPosts, expectToast, renderStaffColumn } from "@/test/staff-column";

// « Ouvrir un jour » of R1 (06 § 3, § 4.1; D-19; E-36; 09 C-04, C-05) on the seed of parite.md § 2, Monday 5 October
// 2026 at 9:30 in Paris: R1 is open on the 1st, the 5th, the 6th, the 9th and the 12th.

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
});

const initialClock = useClock.getState();

afterEach(() => {
  useClock.setState(initialClock, true);
  vi.useRealTimers();
});

const renderPage = async (url: string) =>
  renderStaffColumn(
    url,
    "r1",
    <>
      <OpenDayFormR1 />
      <StaffDayCardR1 />
    </>,
  );

const button = (name: string | RegExp) => page.getByRole("button", { name, exact: true });
const field = (name: string) => page.getByLabelText(name, { exact: true });
const trigger = () => button(/Ouvrir un jour$/u);
const dateButton = () => button("Date");
const submit = () =>
  page.getByRole("button", { name: /^(?:Ouvrir ce jour|Ouverture en cours…)$/u });

/** The page at `url`, then « + Ouvrir un jour » clicked. */
async function openPanel(url = "/collegue") {
  const rendered = await renderPage(url);
  await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(trigger());
  await expect.element(field("Nombre de couverts disponibles")).toBeVisible();
  return rendered;
}

/** The panel open from the URL on 20 October, a free day (06 § 3.1). */
async function openOn20() {
  const rendered = await renderPage("/collegue?ouvrir=r1&ouvrirDate=2026-10-20");
  await expect.element(field("Nombre de couverts disponibles")).toBeVisible();
  return rendered;
}

const picker = () => page.getByRole("dialog", { name: "Choisir la date" });

describe("panel (06 § 4, PLAN § 3.2)", () => {
  it("opens and closes from its title, the state in the URL (`ouvrir`)", async () => {
    const { router } = await openPanel();
    await expect.element(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(urlParams(router)).toStrictEqual(["ouvrir=r1"]);
    await expect.element(dateButton()).toHaveTextContent("lundi 5 octobre 2026");
    await expect
      .element(field("Votre nom (collègue qui ouvre ce jour)"))
      .toHaveAttribute("placeholder", "Ex. M. Dupont");
    await expect
      .element(field("Nombre de couverts disponibles"))
      .toHaveAttribute("placeholder", "Ex. 20");
    await expect
      .element(field("Thème du jour (optionnel)"))
      .toHaveAttribute("placeholder", "Ex. cuisine italienne");
    await expect
      .element(field("Menu du jour (optionnel)"))
      .toHaveAttribute("placeholder", "Ex. menu gastronomique, classe TS2");
    await userEvent.click(trigger());
    await expect.element(field("Nombre de couverts disponibles")).not.toBeInTheDocument();
    expect(urlParams(router)).toStrictEqual([]);
  });

  it("takes the date chosen in the picker (`ouvrirDate`), dropped when a day is chosen in the calendar", async () => {
    const { router } = await openPanel();
    await userEvent.click(dateButton());
    await userEvent.click(picker().getByRole("button", { name: "mardi 20 octobre 2026" }));
    await expect.element(picker()).not.toBeInTheDocument();
    await expect.element(dateButton()).toHaveTextContent("mardi 20 octobre 2026");
    expect(urlParams(router)).toStrictEqual(["ouvrir=r1", "ouvrirDate=2026-10-20"]);
    await userEvent.click(
      page.getByRole("grid").getByRole("button", { name: /^mercredi 7 octobre 2026/u }),
    );
    await expect.element(dateButton()).toHaveTextContent("mercredi 7 octobre 2026");
    expect(urlParams(router)).toStrictEqual(["ouvrir=r1", "r1=2026-10-07"]);
  });
});

describe("checks (06 § 4.1, D-19, E-36)", () => {
  it("asks for the capacity, sends nothing and focuses the field", async () => {
    await openOn20();
    await userEvent.click(submit());
    await expect
      .element(page.getByText("Indiquez un nombre de couverts supérieur à 0.", { exact: true }))
      .toBeVisible();
    await expect.element(field("Nombre de couverts disponibles")).toHaveFocus();
    expect(actionPosts("addDayR1")).toStrictEqual([]);
  });

  it("refuses a past day, the default when the calendar shows one, and focuses the date", async () => {
    await openPanel("/collegue?r1=2026-10-02");
    await expect.element(dateButton()).toHaveTextContent("vendredi 2 octobre 2026");
    await userEvent.type(field("Nombre de couverts disponibles"), "10");
    await userEvent.click(submit());
    await expect
      .element(
        page.getByText("Choisissez la date d'aujourd'hui ou une date ultérieure.", { exact: true }),
      )
      .toBeVisible();
    await expect.element(dateButton()).toHaveFocus();
    await expect.element(dateButton()).toHaveAttribute("aria-invalid", "true");
    expect(actionPosts("addDayR1")).toStrictEqual([]);
  });

  it("blocks a day already open, then clears the message when a free day is chosen", async () => {
    await openPanel("/collegue?r1=2026-10-06");
    await userEvent.type(field("Nombre de couverts disponibles"), "10");
    await userEvent.click(submit());
    const message = page.getByText("Ce jour est déjà ouvert : utilisez « Modifier ce jour ».", {
      exact: true,
    });
    await expect.element(message).toBeVisible();
    expect(actionPosts("addDayR1")).toStrictEqual([]);
    await userEvent.click(dateButton());
    await userEvent.click(picker().getByRole("button", { name: "mardi 20 octobre 2026" }));
    await expect.element(message).not.toBeInTheDocument();
    await expect.element(dateButton()).not.toHaveAttribute("aria-invalid");
  });
});

describe("sending (06 § 4.1, 02 § 4.7)", () => {
  it("sends the exact body, keeps the panel open on the date, empties the fields, selects the day", async () => {
    const { router } = await openOn20();
    await userEvent.type(field("Votre nom (collègue qui ouvre ce jour)"), " M. Leroy ");
    await userEvent.type(field("Nombre de couverts disponibles"), "12");
    await userEvent.type(field("Thème du jour (optionnel)"), "Cuisine du Sud-Ouest");
    await userEvent.type(field("Menu du jour (optionnel)"), "Garbure");
    await userEvent.click(submit());
    await expectToast("Jour ajouté.");
    // Exact body: api/actions.test.ts and REG-33; here, the values the form sends, texts trimmed.
    const [body] = actionPosts("addDayR1");
    expect(body).toStrictEqual(
      expect.objectContaining({
        password: SEED_PASSWORD,
        date: "2026-10-20",
        capacity: 12,
        menu: "Garbure",
        theme: "Cuisine du Sud-Ouest",
      }),
    );
    expect(Object.values(body ?? {})).toContain("M. Leroy");
    await expect.element(dateButton()).toHaveTextContent("mardi 20 octobre 2026");
    await expect.element(field("Votre nom (collègue qui ouvre ce jour)")).toHaveValue("");
    await expect.element(field("Nombre de couverts disponibles")).toHaveValue(null);
    await expect.element(field("Thème du jour (optionnel)")).toHaveValue("");
    await expect.element(field("Menu du jour (optionnel)")).toHaveValue("");
    expect(urlParams(router)).toStrictEqual(["ouvrir=r1", "r1=2026-10-20"]);
    await expect.element(page.getByText("Ouvert par M. Leroy", { exact: true })).toBeVisible();
    await expect.element(page.getByText("12 / 12 couverts", { exact: true })).toBeVisible();
    // A second send on the same day: the day is open now (D-19).
    await userEvent.type(field("Nombre de couverts disponibles"), "8");
    await userEvent.click(submit());
    await expect
      .element(
        page.getByText("Ce jour est déjà ouvert : utilisez « Modifier ce jour ».", { exact: true }),
      )
      .toBeVisible();
  });

  it("keeps the input after a failure of the service, with the staff text of D-14", async () => {
    await openOn20();
    await userEvent.type(field("Nombre de couverts disponibles"), "12");
    fakeScript().failNext("html");
    await userEvent.click(submit());
    await expectToast("Le service ne répond pas. Réessayez dans un instant.");
    await expect.element(field("Nombre de couverts disponibles")).toHaveValue(12);
    await expect.element(submit()).toHaveTextContent("Ouvrir ce jour");
  });
});
