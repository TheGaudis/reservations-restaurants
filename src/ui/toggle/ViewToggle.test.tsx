import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { renderWithProviders } from "@/test/render";
import { ViewToggle } from "@/ui/toggle/ViewToggle";

type View = "week" | "month";

const VIEWS = [
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
] as const;

function CalendarView({ onChange = vi.fn() }: { onChange?: (view: View) => void }) {
  const [view, setView] = useState<View>("week");
  return (
    <ViewToggle
      aria-label="Affichage du calendrier"
      items={VIEWS}
      value={view}
      onValueChange={(next) => {
        onChange(next);
        setView(next);
      }}
      size="small"
    />
  );
}

describe("ViewToggle", () => {
  it("is a named group of toggle buttons, the current view pressed (08 § 6.3)", async () => {
    const { screen } = await renderWithProviders(<CalendarView />);
    await expect
      .element(screen.getByRole("group", { name: "Affichage du calendrier" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Semaine" }))
      .toHaveAttribute("aria-pressed", "true");
    await expect
      .element(screen.getByRole("button", { name: "Mois" }))
      .toHaveAttribute("aria-pressed", "false");
  });

  it("chooses another view with a click, and the chosen segment bounces once (08 § 4.5)", async () => {
    const onChange = vi.fn();
    const { screen } = await renderWithProviders(<CalendarView onChange={onChange} />);
    const month = screen.getByRole("button", { name: "Mois" });
    await expect.element(month).not.toHaveAttribute("data-pop");
    await userEvent.click(month);
    expect(onChange).toHaveBeenCalledWith("month");
    await expect.element(month).toHaveAttribute("aria-pressed", "true");
    await expect.element(month).toHaveAttribute("data-pop");
    await expect
      .element(screen.getByRole("button", { name: "Semaine" }))
      .toHaveAttribute("aria-pressed", "false");
  });

  it("ignores a click on the pressed view: Base UI would empty the group (R-16)", async () => {
    const onChange = vi.fn();
    const { screen } = await renderWithProviders(<CalendarView onChange={onChange} />);
    const week = screen.getByRole("button", { name: "Semaine" });
    await userEvent.click(week);
    await userEvent.click(week);
    expect(onChange).not.toHaveBeenCalled();
    await expect.element(week).toHaveAttribute("aria-pressed", "true");
  });

  it("puts each view in the Tab order, as the legacy segGroup; Enter and Space choose (08 § 6.3)", async () => {
    const onChange = vi.fn();
    const { screen } = await renderWithProviders(<CalendarView onChange={onChange} />);
    const week = screen.getByRole("button", { name: "Semaine" });
    const month = screen.getByRole("button", { name: "Mois" });
    await userEvent.tab();
    await expect.element(week).toHaveFocus();
    await userEvent.tab();
    await expect.element(month).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect.element(month).toHaveAttribute("aria-pressed", "true");
    await userEvent.tab({ shift: true });
    await expect.element(week).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect.element(week).toHaveAttribute("aria-pressed", "true");
    expect(onChange.mock.calls).toStrictEqual([["month"], ["week"]]);
  });

  it("leaves the arrow keys alone: no roving focus", async () => {
    const { screen } = await renderWithProviders(<CalendarView />);
    const week = screen.getByRole("button", { name: "Semaine" });
    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(week).toHaveFocus();
    await expect.element(week).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Mois" }).element().getAttribute("tabindex"),
    ).not.toBe("-1");
  });

  it("passes aria-controls and aria-expanded of « Collègue » (06 § 1.1)", async () => {
    const { screen } = await renderWithProviders(
      <ViewToggle
        aria-label="Mode d'accès"
        items={[
          { value: "client", label: "Client" },
          {
            value: "staff",
            label: "Collègue",
            "aria-controls": "staff-login",
            "aria-expanded": false,
          },
        ]}
        value="client"
        onValueChange={vi.fn()}
      />,
    );
    const staff = screen.getByRole("button", { name: "Collègue" });
    await expect.element(staff).toHaveAttribute("aria-controls", "staff-login");
    await expect.element(staff).toHaveAttribute("aria-expanded", "false");
  });

  it("draws 40 px segments, 32 px in the small size, the check on the pressed one (08 § 4.5)", async () => {
    const { screen } = await renderWithProviders(
      <>
        <CalendarView />
        <ViewToggle
          aria-label="Mode d'accès"
          items={[
            { value: "client", label: "Client" },
            { value: "staff", label: "Collègue" },
          ]}
          value="client"
          onValueChange={vi.fn()}
        />
      </>,
      { accent: "r1" },
    );
    const week = screen.getByRole("button", { name: "Semaine" }).element();
    const client = screen.getByRole("button", { name: "Client" }).element();
    expect(week.getBoundingClientRect().height).toBe(32);
    expect(client.getBoundingClientRect().height).toBe(40);
    // --accent-container of the green theme: rgba(169, 194, 63, .32).
    expect(getComputedStyle(week).backgroundColor).toBe("rgba(169, 194, 63, 0.32)");
    expect(week.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
