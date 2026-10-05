import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { stopBackgroundTasks } from "@/background/start";
import { TEST_NOW } from "@/test/clock";
import { columnOf, renderPublicPage, urlParams } from "@/test/public-page";

// Public R2 card (05 § 6, 04 § 4.3, 01 § 3.7, D-02), on the seed of parite.md § 2: Monday 5 October 2026, 9:30 in
// Paris.

const CLOSED =
  "Commandes en ligne clôturées à 10h. Venez au restaurant Aristide à partir de 12h pour commander sur place.";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
});

afterEach(() => {
  stopBackgroundTasks();
  vi.useRealTimers();
  localStorage.clear();
});

const column = () => columnOf("r2");
const text = (value: string) => column().getByText(value, { exact: true });
const reserve = () => column().getByRole("button", { name: "Réserver", exact: true });

/** Dish lines as rendered, non-breaking spaces kept. */
function dishLines(): string[] {
  return column()
    .getByText(/^(?:Lasagnes|Bowl|Wrap|Salade|Couscous|Tajine)/u)
    .elements()
    .map((element) => element.textContent);
}

describe("DayCardR2 states (05 § 6.5)", () => {
  it("lists the dishes with their price and gauge, then « Réserver » (P-12, 04 § 4.3)", async () => {
    await renderPublicPage("/");
    await expect.element(text("lundi 5 octobre 2026")).toBeVisible();
    await expect.element(text("Thème du jour")).toBeVisible();
    await expect.element(text("Semaine italienne")).toBeVisible();
    expect(dishLines()).toStrictEqual([
      "Lasagnes — 4,50 €",
      "Bowl — prix d'un ticket restaurant",
      "Wrap — prix d'un ticket restaurant",
      "Salade",
    ]);
    await expect.element(column().getByText("4 / 10", { exact: true })).toBeVisible();
    await expect.element(column().getByText("10 / 10", { exact: true })).toBeVisible();
    await expect.element(column().getByText("5 / 5", { exact: true })).toHaveLength(2);
    // Lasagnes: 4 portions left out of 10 (D-02).
    await expect.element(text("Bientôt complet")).toBeVisible();
    await expect.element(reserve()).toBeVisible();
    await expect.element(text(CLOSED)).not.toBeInTheDocument();
  });

  it("shows the no-service text for a day nobody opened (P-10)", async () => {
    await renderPublicPage("/?r2=2026-10-07");
    await expect.element(text("Aucune réservation possible ce jour-là.")).toBeVisible();
    await expect.element(reserve()).not.toBeInTheDocument();
  });

  it("shows the texts only of a day open without any dish (P-11)", async () => {
    await renderPublicPage("/?r2=2026-10-10");
    await expect.element(text("samedi 10 octobre 2026")).toBeVisible();
    await expect.element(text("Journée bretonne")).toBeVisible();
    await expect.element(text("Note")).toBeVisible();
    await expect.element(text("Crêpes à emporter le midi")).toBeVisible();
    await expect.element(column().getByText(/^-?\d+ \/ \d+$/u)).not.toBeInTheDocument();
    await expect.element(text("Aucune réservation possible ce jour-là.")).not.toBeInTheDocument();
    await expect.element(reserve()).not.toBeInTheDocument();
  });

  it("says « Épuisé » by each gauge and « Tous les plats sont épuisés. » (P-16, E-27)", async () => {
    await renderPublicPage("/?r2=2026-10-11");
    expect(dishLines()).toStrictEqual(["Couscous — 6,00 €", "Tajine — 6,50 €"]);
    await expect.element(text("0 / 3")).toBeVisible();
    await expect.element(text("0 / 2")).toBeVisible();
    await expect.element(text("Épuisé")).toHaveLength(2);
    await expect.element(text("Tous les plats sont épuisés.")).toBeVisible();
    await expect.element(reserve()).not.toBeInTheDocument();
  });

  it("pales a past day, without button nor closing note (P-17, E-56)", async () => {
    await renderPublicPage("/?r2=2026-10-01");
    await expect.element(text("8 / 10")).toBeVisible();
    await expect.element(reserve()).not.toBeInTheDocument();
    await expect.element(text(CLOSED)).not.toBeInTheDocument();
  });

  it("replaces « Réserver » with the closing note from 10:00 in Paris (P-15, 01 § 3.7)", async () => {
    vi.setSystemTime(Date.parse("2026-10-05T08:00:00.000Z"));
    await renderPublicPage("/");
    await expect.element(text(CLOSED)).toBeVisible();
    await expect.element(reserve()).not.toBeInTheDocument();
    // Menu, prices and stock stay (04 § 4.3).
    await expect.element(column().getByText(/^Lasagnes/u)).toBeVisible();
    // Tomorrow can still be ordered.
    await userEvent.click(column().getByRole("button", { name: /^mardi 6 octobre 2026,/u }));
    await expect.element(reserve()).toBeVisible();
    await expect.element(text(CLOSED)).not.toBeInTheDocument();
  });
});

describe("« Réserver » (05 § 6.2, PLAN § 3.2)", () => {
  it("opens the order form of this day: `reserver` and the date written in the URL (push)", async () => {
    const { router } = await renderPublicPage("/?reserver=r1&r1=2026-10-06");
    const before = router.history.length;
    await userEvent.click(reserve());
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-06", "r2=2026-10-05", "reserver=r2"]);
    expect(router.history.length).toBe(before + 1);
  });

  it("folds the dish list while the order form is open (05 § 6.4)", async () => {
    await renderPublicPage("/?reserver=r2");
    await expect
      .element(column().getByRole("group", { name: "Choisissez vos plats et quantités" }))
      .toBeVisible();
    await expect.element(text("4 / 10")).not.toBeInTheDocument();
    await expect.element(reserve()).not.toBeInTheDocument();
  });

  it("opens no form on a day whose orders are closed", async () => {
    await renderPublicPage("/?r2=2026-10-01&reserver=r2");
    await expect.element(reserve()).not.toBeInTheDocument();
    await expect.element(text("8 / 10")).toBeVisible();
  });
});
