import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { useClock } from "@/background/clock";
import { stopBackgroundTasks } from "@/background/start";
import { TEST_NOW } from "@/test/clock";
import { columnOf, renderPublicPage, urlParams } from "@/test/public-page";

// Calendars of the public page driven by the URL (05 § 2-3, PLAN § 3.2), on the seed of parite.md § 2 and the fake
// script. « Today » is Monday 5 October 2026 in Paris.

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
});

afterEach(() => {
  stopBackgroundTasks();
  vi.useRealTimers();
  localStorage.clear();
});

function day(restaurant: "r1" | "r2", name: RegExp) {
  return columnOf(restaurant).getByRole("grid").getByRole("button", { name });
}

function selected(restaurant: "r1" | "r2") {
  return columnOf(restaurant).getByRole("gridcell", { selected: true }).getByRole("button");
}

describe("texts of 05 § 2.3", () => {
  async function expectWeekTexts(restaurant: "r1" | "r2"): Promise<void> {
    const column = columnOf(restaurant);
    await expect.element(column.getByRole("grid", { name: "5 – 11 oct. 2026" })).toBeVisible();
    await expect.element(column.getByRole("button", { name: "Semaine précédente" })).toBeVisible();
    await expect.element(column.getByRole("button", { name: "Semaine suivante" })).toBeVisible();
    const views = column.getByRole("group", { name: "Affichage du calendrier" });
    await expect
      .element(views.getByRole("button", { name: "Semaine" }))
      .toHaveAttribute("aria-pressed", "true");
    await expect
      .element(views.getByRole("button", { name: "Mois" }))
      .toHaveAttribute("aria-pressed", "false");
    await expect.element(column.getByRole("button", { name: "Aujourd'hui" })).toBeVisible();
    await expect.element(column.getByRole("gridcell")).toHaveLength(7);
  }

  it("names the period, the arrows, the views and « Aujourd'hui »", async () => {
    await renderPublicPage("/");
    expect(document.querySelectorAll('main [role="grid"]')).toHaveLength(2);
    await expectWeekTexts("r1");
    await expectWeekTexts("r2");
  });

  it("names the arrows of the month view and shows 42 squares", async () => {
    await renderPublicPage("/?r2vue=mois");
    const column = columnOf("r2");
    await expect.element(column.getByRole("grid", { name: "Octobre 2026" })).toBeVisible();
    await expect.element(column.getByRole("button", { name: "Mois précédent" })).toBeVisible();
    await expect.element(column.getByRole("button", { name: "Mois suivant" })).toBeVisible();
    await expect.element(column.getByRole("gridcell")).toHaveLength(42);
  });
});

describe("selection (05 § 3.1-3.3, a-12)", () => {
  it("resolves today with the clock, and follows it at midnight without a URL change", async () => {
    const { router } = await renderPublicPage("/");
    await expect
      .element(selected("r1"))
      .toHaveAccessibleName("lundi 5 octobre 2026, places disponibles");
    useClock.setState({ now: Date.parse("2026-10-05T22:00:00.000Z") });
    await expect
      .element(selected("r1"))
      .toHaveAccessibleName("mardi 6 octobre 2026, bientôt complet");
    await expect
      .element(day("r1", /^lundi 5 octobre 2026,/u))
      .toHaveAccessibleName("lundi 5 octobre 2026, places disponibles, passé");
    expect(urlParams(router)).toStrictEqual([]);
  });

  it("selects a day on click (push) and never touches the other column", async () => {
    const { router } = await renderPublicPage("/?r2=2026-10-06&reserver=r2");
    const before = router.history.length;
    await userEvent.click(day("r1", /^jeudi 8 octobre 2026,/u));
    await expect
      .element(selected("r1"))
      .toHaveAccessibleName("jeudi 8 octobre 2026, aucun service");
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-08", "r2=2026-10-06", "reserver=r2"]);
    expect(router.history.length).toBe(before + 1);
    // A day of the R2 column closes the R2 form.
    await userEvent.click(day("r2", /^lundi 5 octobre 2026,/u));
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-08", "r2=2026-10-05"]);
  });

  it("closes the open form of its restaurant on a click on the selected day", async () => {
    const { router } = await renderPublicPage("/?r1=2026-10-06&reserver=r1");
    await userEvent.click(selected("r1"));
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-06"]);
  });

  it("selects with the keys (replace), the view following the selection", async () => {
    const { router } = await renderPublicPage("/");
    const before = router.history.length;
    selected("r1").element().focus();
    await userEvent.keyboard("{End}{ArrowRight}");
    await expect
      .element(selected("r1"))
      .toHaveAccessibleName("lundi 12 octobre 2026, bientôt complet");
    await expect.element(selected("r1")).toHaveFocus();
    await expect
      .element(columnOf("r1").getByRole("grid", { name: "12 – 18 oct. 2026" }))
      .toBeVisible();
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-12"]);
    expect(router.history.length).toBe(before);
  });

  it("keeps the month shown when a day of the next month is clicked (05 § 3.1)", async () => {
    const { router } = await renderPublicPage("/?r1vue=mois");
    await userEvent.click(day("r1", /^dimanche 1er novembre 2026,/u));
    await expect.element(columnOf("r1").getByRole("grid", { name: "Octobre 2026" })).toBeVisible();
    expect(urlParams(router)).toStrictEqual([
      "r1=2026-11-01",
      "r1periode=2026-10-05",
      "r1vue=mois",
    ]);
  });
});

describe("period and view (05 § 3.1)", () => {
  it("moves the week with ‹ › (replace) without changing the selection", async () => {
    const { router } = await renderPublicPage("/");
    const before = router.history.length;
    const column = columnOf("r1");
    await userEvent.click(column.getByRole("button", { name: "Semaine suivante" }));
    await expect.element(column.getByRole("grid", { name: "12 – 18 oct. 2026" })).toBeVisible();
    await expect.element(column.getByRole("gridcell", { selected: true })).not.toBeInTheDocument();
    expect(urlParams(router)).toStrictEqual(["r1periode=2026-10-12"]);
    await userEvent.click(column.getByRole("button", { name: "Semaine précédente" }));
    await expect
      .element(selected("r1"))
      .toHaveAccessibleName("lundi 5 octobre 2026, places disponibles");
    // Back in the period of the selected day: the anchor leaves the URL.
    expect(urlParams(router)).toStrictEqual([]);
    expect(router.history.length).toBe(before);
  });

  it("writes the month view in the URL and leaves the week view out", async () => {
    const { router } = await renderPublicPage("/");
    const column = columnOf("r2");
    await userEvent.click(column.getByRole("button", { name: "Mois", exact: true }));
    await expect.element(column.getByRole("gridcell")).toHaveLength(42);
    expect(urlParams(router)).toStrictEqual(["r2vue=mois"]);
    await userEvent.click(column.getByRole("button", { name: "Semaine", exact: true }));
    await expect.element(column.getByRole("gridcell")).toHaveLength(7);
    expect(urlParams(router)).toStrictEqual([]);
  });

  it("« Aujourd'hui » selects today and closes the form of this restaurant only", async () => {
    const { router } = await renderPublicPage(
      "/?r1=2026-10-06&r1periode=2026-10-19&r2=2026-10-07&reserver=r1",
    );
    await userEvent.click(columnOf("r2").getByRole("button", { name: "Aujourd'hui" }));
    expect(urlParams(router)).toStrictEqual([
      "r1=2026-10-06",
      "r1periode=2026-10-19",
      "reserver=r1",
    ]);
    await userEvent.click(columnOf("r1").getByRole("button", { name: "Aujourd'hui" }));
    await expect
      .element(selected("r1"))
      .toHaveAccessibleName("lundi 5 octobre 2026, places disponibles");
    expect(urlParams(router)).toStrictEqual([]);
  });
});

describe("URL (PLAN § 3.2, R-19)", () => {
  it("drops ?r1vue=semaine and ignores ?connexion=1", async () => {
    const { router } = await renderPublicPage("/?r1vue=semaine&connexion=1&r2=2026-10-06");
    await expect.poll(() => urlParams(router)).toStrictEqual(["r2=2026-10-06"]);
  });

  it("shows today's week for a damaged URL, without any error", async () => {
    await renderPublicPage("/?r1=2026-13-45&r1vue=annee&r1periode=12&r2=demain");
    await expect
      .element(selected("r1"))
      .toHaveAccessibleName("lundi 5 octobre 2026, places disponibles");
    await expect
      .element(columnOf("r2").getByRole("grid", { name: "5 – 11 oct. 2026" }))
      .toBeVisible();
  });

  it("says that today's R2 orders are closed after 10:00 (E-43)", async () => {
    vi.setSystemTime(Date.parse("2026-10-05T08:30:00.000Z"));
    await renderPublicPage("/");
    await expect
      .element(selected("r2"))
      .toHaveAccessibleName("lundi 5 octobre 2026, places disponibles, commandes closes");
    await expect
      .element(selected("r1"))
      .toHaveAccessibleName("lundi 5 octobre 2026, places disponibles");
  });
});
