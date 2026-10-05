import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { CalendarDemo } from "@/test/calendar-demo";
import { TODAY } from "@/test/clock";
import { renderWithProviders } from "@/test/render";

// Seed of parite.md § 2 for R1, around Monday 5 October 2026 (REG-09 to REG-12).
const STATUSES = {
  "2026-10-01": "available",
  "2026-10-05": "available",
  "2026-10-06": "almostFull",
  "2026-10-09": "full",
} as const;

function grid(screen: Awaited<ReturnType<typeof renderWithProviders>>["screen"]) {
  return screen.getByRole("grid");
}

function selectedButton(screen: Awaited<ReturnType<typeof renderWithProviders>>["screen"]) {
  return grid(screen).getByRole("gridcell", { selected: true }).getByRole("button");
}

describe("CalendarGrid: structure (05 § 2.2-2.6, E-05)", () => {
  it("is a grid named by the period label, one selected cell, a button per day", async () => {
    const { screen } = await renderWithProviders(
      <CalendarDemo today={TODAY} statuses={STATUSES} />,
    );
    await expect.element(grid(screen)).toHaveAccessibleName("5 – 11 oct. 2026");
    expect(screen.getByText("5 – 11 oct. 2026").element().getAttribute("aria-live")).toBe("polite");
    expect(grid(screen).getByRole("gridcell").all()).toHaveLength(7);
    expect(grid(screen).getByRole("gridcell", { selected: true }).all()).toHaveLength(1);
    expect(grid(screen).getByRole("gridcell", { selected: false }).all()).toHaveLength(6);
    expect(grid(screen).getByRole("button").all()).toHaveLength(7);
    await expect
      .element(selectedButton(screen))
      .toHaveAccessibleName("lundi 5 octobre 2026, places disponibles");
  });

  it("names each day as 05 § 2.5, with « 1er » (E-21) and the 10:00 cut-off (E-43)", async () => {
    const { screen } = await renderWithProviders(
      <CalendarDemo
        restaurant="r2"
        today={TODAY}
        statuses={STATUSES}
        closedDays={["2026-10-01", TODAY]}
        search={{ r2vue: "mois" }}
      />,
    );
    const names = grid(screen)
      .getByRole("button")
      .all()
      .map((button) => button.element().getAttribute("aria-label"));
    expect(names).toContain("lundi 28 septembre 2026, aucun service, passé");
    expect(names).toContain("jeudi 1er octobre 2026, places disponibles, passé");
    expect(names).toContain("lundi 5 octobre 2026, places disponibles, commandes closes");
    expect(names).toContain("mardi 6 octobre 2026, bientôt complet");
    expect(names).toContain("vendredi 9 octobre 2026, complet");
    expect(names).toContain("dimanche 1er novembre 2026, aucun service");
    expect(names).toHaveLength(42);
  });

  it("marks today with aria-current=date, on the button (never aria-current=page)", async () => {
    const { screen } = await renderWithProviders(
      <CalendarDemo today={TODAY} search={{ r1: "2026-10-07" }} />,
    );
    const today = grid(screen).getByRole("button", { name: /^lundi 5 octobre 2026,/u });
    await expect.element(today).toHaveAttribute("aria-current", "date");
    expect(grid(screen).element().querySelectorAll("[aria-current]")).toHaveLength(1);
  });

  it("has one Tab stop: the selected day (05 § 2.6)", async () => {
    const { screen } = await renderWithProviders(<CalendarDemo today={TODAY} />);
    expect(grid(screen).element().querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    await expect.element(selectedButton(screen)).toHaveAttribute("tabindex", "0");
    // The toolbar comes before the grid: Tab from « Aujourd'hui » enters it on the selected day.
    screen.getByRole("button", { name: "Aujourd'hui" }).element().focus();
    await userEvent.tab();
    await expect.element(selectedButton(screen)).toHaveFocus();
  });

  it("puts the Tab stop on the first square when the selected day is not shown (05 § 2.6)", async () => {
    const { screen } = await renderWithProviders(<CalendarDemo today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: "Semaine suivante" }));
    await expect.element(grid(screen)).toHaveAccessibleName("12 – 18 oct. 2026");
    expect(grid(screen).getByRole("gridcell", { selected: true }).all()).toHaveLength(0);
    const stops = grid(screen).element().querySelectorAll<HTMLElement>('[tabindex="0"]');
    expect(stops).toHaveLength(1);
    expect(stops[0]?.dataset["iso"]).toBe("2026-10-12");
    // ‹ › keep the focus on the button (05 § 2.6).
    await expect.element(screen.getByRole("button", { name: "Semaine suivante" })).toHaveFocus();
  });

  it("does not take the focus when it mounts", async () => {
    await renderWithProviders(<CalendarDemo today={TODAY} />);
    expect(document.activeElement).toBe(document.body);
  });
});

describe("CalendarGrid: mouse (05 § 3.1)", () => {
  it("selects a clicked day, without the keyboard flag", async () => {
    const onSelect = vi.fn();
    const { screen } = await renderWithProviders(
      <CalendarDemo today={TODAY} onSelect={onSelect} />,
    );
    await userEvent.click(grid(screen).getByRole("button", { name: /^mercredi 7 octobre/u }));
    expect(onSelect).toHaveBeenLastCalledWith("2026-10-07", { viaKeyboard: false });
    await expect.element(selectedButton(screen)).toHaveAccessibleName(/^mercredi 7 octobre/u);
  });

  it("selects a day of the next month without leaving the month shown (REG-10)", async () => {
    const { screen } = await renderWithProviders(
      <CalendarDemo today={TODAY} search={{ r1vue: "mois" }} />,
    );
    await userEvent.click(grid(screen).getByRole("button", { name: /^dimanche 1er novembre/u }));
    await expect.element(grid(screen)).toHaveAccessibleName("Octobre 2026");
    await expect
      .element(selectedButton(screen))
      .toHaveAccessibleName("dimanche 1er novembre 2026, aucun service");
  });

  it.each([
    ["Enter", "{Enter}"],
    ["Space", " "],
  ])("selects the focused day with %s, as a click", async (_name, key) => {
    const onSelect = vi.fn();
    const { screen } = await renderWithProviders(
      <CalendarDemo today={TODAY} onSelect={onSelect} />,
    );
    const day = grid(screen).getByRole("button", { name: /^jeudi 8 octobre/u });
    day.element().focus();
    await userEvent.keyboard(key);
    expect(onSelect).toHaveBeenLastCalledWith("2026-10-08", { viaKeyboard: false });
    await expect.element(selectedButton(screen)).toHaveAccessibleName(/^jeudi 8 octobre/u);
  });
});
