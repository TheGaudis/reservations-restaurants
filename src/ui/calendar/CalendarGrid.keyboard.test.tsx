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
  // The focus and the Tab stop follow the selection, also when the period changes (no effect: ref callback of the
  // new square). The target of each key: `keyTargetIso` in src/domain/dates.test.ts.
  it.each([
    {
      view: "semaine",
      from: "2026-10-07",
      key: "{ArrowRight}",
      to: "2026-10-08",
      period: "5 – 11 oct. 2026",
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
      from: "2026-10-28",
      key: "{ArrowDown}",
      to: "2026-11-04",
      period: "Novembre 2026",
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

  it("leaves the grid with one Tab", async () => {
    const { screen } = await renderWithProviders(<CalendarDemo today={TODAY} />);
    selectedButton(screen).element().focus();
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.tab();
    expect(grid(screen).element().contains(document.activeElement)).toBe(false);
  });
});
