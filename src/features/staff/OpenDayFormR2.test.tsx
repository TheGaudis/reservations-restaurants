import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { useClock } from "@/background/clock";
import { OpenDayFormR2 } from "@/features/staff/OpenDayFormR2";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { urlParams } from "@/test/public-page";
import { actionPosts, expectToast, renderStaffColumn } from "@/test/staff-column";

// « Ouvrir un jour » of R2 and its dish lines (06 § 4.2-4.3; D-19, D-22; E-36, E-39; 09 C-06) on the seed of
// parite.md § 2, Monday 5 October 2026 at 9:30 in Paris: R2 is open on the 1st, 5th, 6th, 10th, 11th and 13th; the
// dishes use the prices 4,50, 6 and 6,50 €.

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
});

const initialClock = useClock.getState();

afterEach(() => {
  useClock.setState(initialClock, true);
  vi.useRealTimers();
});

const PRICE = "prix en euros (optionnel)";

const field = (name: string) => page.getByLabelText(name, { exact: true });
const line = (n: number, part: string) => field(`Plat ${String(n)} : ${part}`);
const button = (name: string) => page.getByRole("button", { name, exact: true });
const submit = () =>
  page.getByRole("button", { name: /^(?:Ouvrir ce jour|Ouverture en cours…)$/u });

async function openOn(date: string) {
  const rendered = await renderStaffColumn(
    `/collegue?r2=${date}&ouvrir=r2`,
    "r2",
    <>
      <OpenDayFormR2 />
      <StaffDayCardR2 />
    </>,
  );
  await expect.element(line(1, "nom")).toBeVisible();
  return rendered;
}

describe("dish lines (06 § 4.2-4.3)", () => {
  it("shows the fields of 06 § 4.2, one empty line, and the price suggestions", async () => {
    await openOn("2026-10-20");
    await expect
      .element(field("Votre nom (collègue qui ouvre ce jour)"))
      .toHaveAttribute("placeholder", "Ex. Cyrille Ungerer");
    await expect
      .element(field("Note (optionnel)"))
      .toHaveAttribute("placeholder", "Ex. semaine du menu bistrot");
    await expect
      .element(field("Thème du jour (optionnel)"))
      .toHaveAttribute("placeholder", "Ex. semaine italienne");
    await expect
      .element(page.getByRole("group", { name: "Plats disponibles ce jour-là" }))
      .toBeVisible();
    await expect.element(line(1, "nom")).toHaveAttribute("placeholder", "Ex. salade César");
    await expect.element(line(1, "stock")).toHaveAttribute("placeholder", "10");
    await expect.element(line(1, PRICE)).toHaveAttribute("placeholder", "3,50");
    const options = [...((line(1, PRICE).element() as HTMLInputElement).list?.options ?? [])];
    expect(options.map((option) => option.value)).toStrictEqual(["4,50", "6,00", "6,50"]);
    await expect.element(line(2, "nom")).not.toBeInTheDocument();
  });

  it("empties and disables the price of a voucher dish, and gives it back", async () => {
    await openOn("2026-10-20");
    await userEvent.type(line(1, PRICE), "3,50");
    await userEvent.click(
      page.getByRole("checkbox", { name: "Plat 1 : au prix d'un ticket restaurant" }),
    );
    await expect.element(line(1, PRICE)).toHaveValue("");
    await expect.element(line(1, PRICE)).toBeDisabled();
    await expect.element(line(1, PRICE)).toHaveAttribute("placeholder", "Ticket");
    await userEvent.click(
      page.getByRole("checkbox", { name: "Plat 1 : au prix d'un ticket restaurant" }),
    );
    await expect.element(line(1, PRICE)).toBeEnabled();
    await expect.element(line(1, PRICE)).toHaveAttribute("placeholder", "3,50");
  });

  it("adds a line with the focus in its name, removes one, and keeps one empty line at least", async () => {
    await openOn("2026-10-20");
    await userEvent.type(line(1, "nom"), "Bowl");
    await userEvent.click(button("+ Ajouter un plat"));
    await expect.element(line(2, "nom")).toHaveFocus();
    await userEvent.type(line(2, "nom"), "Lasagnes");
    await userEvent.click(button("Retirer le plat 1"));
    await expect.element(line(1, "nom")).toHaveValue("Lasagnes");
    await expect.element(line(2, "nom")).not.toBeInTheDocument();
    await expect.element(button("+ Ajouter un plat")).toHaveFocus();
    await userEvent.click(button("Retirer le plat 1"));
    await expect.element(line(1, "nom")).toHaveValue("");
  });
});

describe("checks (06 § 4.2, D-19, D-22)", () => {
  it("asks for one dish at least, after the last line", async () => {
    await openOn("2026-10-20");
    await userEvent.click(submit());
    await expect
      .element(page.getByText("Ajoutez au moins un plat avec un nom et un stock.", { exact: true }))
      .toBeVisible();
    await expect.element(line(1, "nom")).toHaveFocus();
    expect(actionPosts("addDayR2")).toStrictEqual([]);
  });

  it("refuses an incomplete line and a price of 0 instead of dropping them (E-36, E-39)", async () => {
    await openOn("2026-10-20");
    await userEvent.type(line(1, "nom"), "Lasagnes");
    await userEvent.type(line(1, "stock"), "8");
    await userEvent.type(line(1, PRICE), "0");
    await userEvent.click(button("+ Ajouter un plat"));
    await userEvent.type(line(2, "nom"), "Salade");
    await userEvent.click(submit());
    await expect
      .element(
        page.getByText("Indiquez un prix supérieur à 0, ou laissez le champ vide.", {
          exact: true,
        }),
      )
      .toBeVisible();
    await expect
      .element(
        page.getByText("Indiquez le nom et le stock de ce plat, ou retirez la ligne.", {
          exact: true,
        }),
      )
      .toBeVisible();
    await expect.element(line(1, PRICE)).toHaveFocus();
    expect(actionPosts("addDayR2")).toStrictEqual([]);
  });

  it("refuses a past day", async () => {
    await openOn("2026-10-02");
    await userEvent.type(line(1, "nom"), "Lasagnes");
    await userEvent.type(line(1, "stock"), "8");
    await userEvent.click(submit());
    await expect
      .element(
        page.getByText("Choisissez la date d'aujourd'hui ou une date ultérieure.", { exact: true }),
      )
      .toBeVisible();
    await expect.element(button("Date")).toHaveFocus();
    expect(actionPosts("addDayR2")).toStrictEqual([]);
  });

  it("warns about a day already open, and sends anyway", async () => {
    await openOn("2026-10-06");
    await expect
      .element(
        page.getByText("Ce jour est déjà ouvert : seuls les plats de nom nouveau seront ajoutés.", {
          exact: true,
        }),
      )
      .toBeVisible();
    await userEvent.type(line(1, "nom"), "Couscous");
    await userEvent.type(line(1, "stock"), "6");
    await userEvent.click(submit());
    await expectToast("Jour ajouté.");
    expect(actionPosts("addDayR2")).toHaveLength(1);
  });
});

describe("sending (06 § 4.2, 02 § 4.7)", () => {
  it("sends the voucher mark in the name and an empty price, then starts again on the date", async () => {
    const { router } = await openOn("2026-10-20");
    await userEvent.type(line(1, "nom"), " Bowl ");
    await userEvent.type(line(1, "stock"), "10");
    await userEvent.click(
      page.getByRole("checkbox", { name: "Plat 1 : au prix d'un ticket restaurant" }),
    );
    await userEvent.click(button("+ Ajouter un plat"));
    await userEvent.type(line(2, "nom"), "Lasagnes");
    await userEvent.type(line(2, "stock"), "8");
    await userEvent.type(line(2, PRICE), "4,5");
    await userEvent.click(button("+ Ajouter un plat"));
    await userEvent.type(field("Note (optionnel)"), "Semaine italienne");
    await userEvent.click(submit());
    await expectToast("Jour ajouté.");
    // Exact body: api/actions.test.ts and REG-34; here, the values the form sends.
    expect(actionPosts("addDayR2")).toStrictEqual([
      expect.objectContaining({
        password: SEED_PASSWORD,
        date: "2026-10-20",
        note: "Semaine italienne",
        items: [
          { name: "Bowl (ticket restaurant)", stock: 10, price: "" },
          { name: "Lasagnes", stock: 8, price: 4.5 },
        ],
        theme: "",
      }),
    ]);
    await expect.element(line(1, "nom")).toHaveValue("");
    await expect.element(line(2, "nom")).not.toBeInTheDocument();
    await expect.element(field("Note (optionnel)")).toHaveValue("");
    expect(urlParams(router)).toStrictEqual(["ouvrir=r2", "r2=2026-10-20"]);
    await expect
      .element(page.getByText("Bowl — prix d'un ticket restaurant", { exact: true }))
      .toBeVisible();
  });

  it("shows the message of the script in a toast and keeps the lines", async () => {
    await openOn("2026-10-20");
    await userEvent.type(line(1, "nom"), "Bowl");
    await userEvent.type(line(1, "stock"), "10");
    fakeScript().failNext("error", "Service occupé, réessayez dans quelques secondes.");
    await userEvent.click(submit());
    await expectToast("Service occupé, réessayez dans quelques secondes.");
    await expect.element(line(1, "nom")).toHaveValue("Bowl");
  });
});
