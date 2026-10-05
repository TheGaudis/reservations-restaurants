import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { CalendarDemo } from "@/test/calendar-demo";
import { TODAY } from "@/test/clock";
import { renderWithProviders } from "@/test/render";

type Screen = Awaited<ReturnType<typeof renderWithProviders>>["screen"];

function grid(screen: Screen) {
  return screen.getByRole("grid");
}

function selectedButton(screen: Screen) {
  return grid(screen).getByRole("gridcell", { selected: true }).getByRole("button");
}

describe("CalendarGrid: keyboard (05 § 3.2, E-07)", () => {
  // From the focused day: every key of 05 § 3.2, in a week and in a month view; the focus follows the selection,
  // also when the period changes (no effect: ref callback of the new square).
  it.each([
    {
      view: "semaine",
      from: "2026-10-07",
      key: "{ArrowLeft}",
      to: "2026-10-06",
      period: "5 – 11 oct. 2026",
    },
    {
      view: "semaine",
      from: "2026-10-07",
      key: "{ArrowRight}",
      to: "2026-10-08",
      period: "5 – 11 oct. 2026",
    },
    {
      view: "semaine",
      from: "2026-10-07",
      key: "{ArrowUp}",
      to: "2026-09-30",
      period: "28 sept. – 4 oct. 2026",
    },
    {
      view: "semaine",
      from: "2026-10-07",
      key: "{ArrowDown}",
      to: "2026-10-14",
      period: "12 – 18 oct. 2026",
    },
    {
      view: "semaine",
      from: "2026-10-07",
      key: "{Home}",
      to: "2026-10-05",
      period: "5 – 11 oct. 2026",
    },
    {
      view: "semaine",
      from: "2026-10-07",
      key: "{End}",
      to: "2026-10-11",
      period: "5 – 11 oct. 2026",
    },
    {
      view: "semaine",
      from: "2026-10-07",
      key: "{PageUp}",
      to: "2026-09-07",
      period: "7 – 13 sept. 2026",
    },
    {
      view: "semaine",
      from: "2026-10-07",
      key: "{PageDown}",
      to: "2026-11-07",
      period: "2 – 8 nov. 2026",
    },
    {
      view: "semaine",
      from: "2026-10-05",
      key: "{ArrowLeft}",
      to: "2026-10-04",
      period: "28 sept. – 4 oct. 2026",
    },
    {
      view: "semaine",
      from: "2026-10-11",
      key: "{ArrowRight}",
      to: "2026-10-12",
      period: "12 – 18 oct. 2026",
    },
    {
      view: "mois",
      from: "2026-10-07",
      key: "{ArrowRight}",
      to: "2026-10-08",
      period: "Octobre 2026",
    },
    {
      view: "mois",
      from: "2026-10-07",
      key: "{ArrowUp}",
      to: "2026-09-30",
      period: "Septembre 2026",
    },
    {
      view: "mois",
      from: "2026-10-28",
      key: "{ArrowDown}",
      to: "2026-11-04",
      period: "Novembre 2026",
    },
    { view: "mois", from: "2026-10-01", key: "{Home}", to: "2026-09-28", period: "Septembre 2026" },
    { view: "mois", from: "2026-10-31", key: "{End}", to: "2026-11-01", period: "Novembre 2026" },
    {
      view: "mois",
      from: "2026-10-07",
      key: "{PageUp}",
      to: "2026-09-07",
      period: "Septembre 2026",
    },
    {
      view: "mois",
      from: "2026-10-07",
      key: "{PageDown}",
      to: "2026-11-07",
      period: "Novembre 2026",
    },
    // a-23, E-07: the same day of the next or previous month, clamped to its last day.
    {
      view: "mois",
      from: "2027-01-31",
      key: "{PageDown}",
      to: "2027-02-28",
      period: "Février 2027",
    },
    {
      view: "mois",
      from: "2028-01-31",
      key: "{PageDown}",
      to: "2028-02-29",
      period: "Février 2028",
    },
    { view: "mois", from: "2026-03-31", key: "{PageUp}", to: "2026-02-28", period: "Février 2026" },
    {
      view: "semaine",
      from: "2026-12-31",
      key: "{PageDown}",
      to: "2027-01-31",
      period: "25 – 31 janv. 2027",
    },
  ] as const)(
    "$view view, $from + $key → $to ($period)",
    async ({ view, from, key, to, period }) => {
      const onSelect = vi.fn();
      const { screen } = await renderWithProviders(
        <CalendarDemo today={TODAY} search={{ r1: from, r1vue: view }} onSelect={onSelect} />,
      );
      selectedButton(screen).element().focus();
      await userEvent.keyboard(key);
      expect(onSelect).toHaveBeenLastCalledWith(to, { viaKeyboard: true });
      await expect.element(grid(screen)).toHaveAccessibleName(period);
      const selected = selectedButton(screen);
      await expect.element(selected).toHaveAttribute("data-iso", to);
      await expect.element(selected).toHaveFocus();
      await expect.element(selected).toHaveAttribute("tabindex", "0");
      expect(grid(screen).element().querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    },
  );

  it("follows a run of keys across periods (REG-11)", async () => {
    const { screen } = await renderWithProviders(<CalendarDemo today={TODAY} />);
    selectedButton(screen).element().focus();
    await userEvent.keyboard(
      "{PageDown}{PageDown}{PageDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowRight}{ArrowRight}{ArrowRight}",
    );
    await expect.element(grid(screen)).toHaveAccessibleName("25 – 31 janv. 2027");
    await expect.element(selectedButton(screen)).toHaveAttribute("data-iso", "2027-01-29");
    await expect.element(selectedButton(screen)).toHaveFocus();
    await userEvent.keyboard("{End}{PageDown}");
    await expect.element(selectedButton(screen)).toHaveAttribute("data-iso", "2027-02-28");
    await expect.element(selectedButton(screen)).toHaveFocus();
  });

  it("ignores the other keys", async () => {
    const onSelect = vi.fn();
    const { screen } = await renderWithProviders(
      <CalendarDemo today={TODAY} onSelect={onSelect} />,
    );
    selectedButton(screen).element().focus();
    await userEvent.keyboard("{a}{Escape}{Shift}");
    expect(onSelect).not.toHaveBeenCalled();
    await expect.element(selectedButton(screen)).toHaveAttribute("data-iso", TODAY);
  });

  it("leaves the grid with one Tab", async () => {
    const { screen } = await renderWithProviders(<CalendarDemo today={TODAY} />);
    selectedButton(screen).element().focus();
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.tab();
    expect(grid(screen).element().contains(document.activeElement)).toBe(false);
  });
});
