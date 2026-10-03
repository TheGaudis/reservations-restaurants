import { useId, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import type { IsoDate } from "@/domain/types";
import { TODAY } from "@/test/clock";
import { renderWithProviders } from "@/test/render";
import { DatePickerPopover } from "@/ui/calendar/DatePickerPopover";

// Days already open in R1 (parite.md § 2).
const OPEN_DAYS = new Set(["2026-10-01", "2026-10-05", "2026-10-06", "2026-10-09"]);

function DateField({
  initial = TODAY,
  onChange = vi.fn(),
}: {
  initial?: IsoDate;
  onChange?: (iso: IsoDate) => void;
}) {
  const id = useId();
  const labelId = useId();
  const [value, setValue] = useState(initial);
  return (
    <div>
      <button type="button">Ailleurs</button>
      <label id={labelId} htmlFor={id}>
        Date
      </label>
      <DatePickerPopover
        id={id}
        labelId={labelId}
        value={value}
        today={TODAY}
        accent="r1"
        isMarked={(iso) => OPEN_DAYS.has(iso)}
        onChange={(iso) => {
          onChange(iso);
          setValue(iso);
        }}
      />
    </div>
  );
}

const trigger = () => page.getByRole("button", { name: /^Date /u });
const dialog = () => page.getByRole("dialog", { name: "Choisir la date" });
const dayIn = (name: RegExp) => dialog().getByRole("button", { name });
const selectedDay = () => dialog().getByRole("gridcell", { selected: true }).getByRole("button");

async function open() {
  await userEvent.click(trigger());
  await expect.element(dialog()).toBeVisible();
}

describe("DatePickerPopover: field (06 § 3.1)", () => {
  it("is a button named by the label and the long date, which opens a dialog", async () => {
    await renderWithProviders(<DateField />);
    await expect.element(trigger()).toHaveAccessibleName("Date lundi 5 octobre 2026");
    await expect.element(trigger()).toHaveAttribute("aria-haspopup", "dialog");
    await expect.element(trigger()).toHaveAttribute("aria-expanded", "false");
    await open();
    await expect.element(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("opens with a click on its label too", async () => {
    const { screen } = await renderWithProviders(<DateField />);
    await userEvent.click(screen.getByText("Date", { exact: true }));
    await expect.element(dialog()).toBeVisible();
  });
});

describe("DatePickerPopover: month shown (06 § 3.2)", () => {
  it("shows the month of the field, focus on the chosen day, past days disabled, open days marked", async () => {
    await renderWithProviders(<DateField initial="2026-10-20" />);
    await open();
    await expect.element(dialog().getByRole("grid")).toHaveAccessibleName("Octobre 2026");
    await expect.element(selectedDay()).toHaveAccessibleName("mardi 20 octobre 2026");
    await expect.element(selectedDay()).toHaveFocus();
    await expect
      .element(dayIn(/^jeudi 1er octobre/u))
      .toHaveAccessibleName("jeudi 1er octobre 2026, déjà ouvert, passé");
    await expect.element(dayIn(/^jeudi 1er octobre/u)).toHaveAttribute("aria-disabled", "true");
    await expect
      .element(dayIn(/^lundi 5 octobre/u))
      .toHaveAccessibleName("lundi 5 octobre 2026, déjà ouvert");
    await expect.element(dayIn(/^lundi 5 octobre/u)).toHaveAttribute("aria-current", "date");
    await expect.element(dayIn(/^lundi 5 octobre/u)).not.toHaveAttribute("aria-disabled");
    await expect.element(dialog().getByText("déjà ouvert")).toBeVisible();
    // 42 squares, the days of other months left empty and hidden.
    expect(dialog().getByRole("grid").element().querySelectorAll("td")).toHaveLength(42);
    expect(dialog().getByRole("gridcell").all()).toHaveLength(31);
    expect(
      dialog()
        .getByRole("button", { name: / octobre 2026/u })
        .all(),
    ).toHaveLength(31);
  });

  it.each([
    ["the chosen date in the month", "2026-10-20", 0, "2026-10-20"],
    ["today, the chosen date elsewhere", "2026-11-20", -1, TODAY],
    ["the 1st of a later month", "2026-10-20", 1, "2026-11-01"],
    ["the 1st of an earlier month", "2026-10-20", -1, "2026-09-01"],
  ] as const)("puts the Tab stop on %s", async (_case, value, months, stop) => {
    await renderWithProviders(<DateField initial={value} />);
    await open();
    if (months !== 0) {
      const name = months > 0 ? "Mois suivant" : "Mois précédent";
      await userEvent.click(dialog().getByRole("button", { name }));
    }
    const stops = dialog()
      .getByRole("grid")
      .element()
      .querySelectorAll<HTMLElement>('[tabindex="0"]');
    expect(stops).toHaveLength(1);
    expect(stops[0]?.dataset["iso"]).toBe(stop);
  });

  it("changes the month with ‹ ›, the focus staying on the button", async () => {
    await renderWithProviders(<DateField />);
    await open();
    await userEvent.click(dialog().getByRole("button", { name: "Mois suivant" }));
    await expect.element(dialog().getByRole("grid")).toHaveAccessibleName("Novembre 2026");
    await expect.element(dialog().getByRole("button", { name: "Mois suivant" })).toHaveFocus();
    await userEvent.click(dialog().getByRole("button", { name: "Mois précédent" }));
    await userEvent.click(dialog().getByRole("button", { name: "Mois précédent" }));
    await expect.element(dialog().getByRole("grid")).toHaveAccessibleName("Septembre 2026");
  });

  it("puts the accent on the popup, outside the column (PLAN § 3.6)", async () => {
    await renderWithProviders(<DateField />);
    await open();
    expect(dialog().element().closest('[data-accent="r1"]')).not.toBeNull();
  });
});

describe("DatePickerPopover: keyboard (06 § 3.3, 05 § 3.2)", () => {
  it.each([
    ["{ArrowRight}", "2026-10-21", "Octobre 2026"],
    ["{ArrowLeft}", "2026-10-19", "Octobre 2026"],
    ["{ArrowUp}", "2026-10-13", "Octobre 2026"],
    ["{ArrowDown}", "2026-10-27", "Octobre 2026"],
    ["{Home}", "2026-10-19", "Octobre 2026"],
    ["{End}", "2026-10-25", "Octobre 2026"],
    ["{PageUp}", "2026-09-20", "Septembre 2026"],
    ["{PageDown}", "2026-11-20", "Novembre 2026"],
    ["{ArrowDown}{ArrowDown}", "2026-11-03", "Novembre 2026"],
  ])("%s only moves the focus to %s (%s)", async (keys, focused, month) => {
    const onChange = vi.fn();
    await renderWithProviders(<DateField initial="2026-10-20" onChange={onChange} />);
    await open();
    await userEvent.keyboard(keys);
    await expect.element(dialog().getByRole("grid")).toHaveAccessibleName(month);
    expect((document.activeElement as HTMLElement | null)?.dataset["iso"]).toBe(focused);
    expect(onChange).not.toHaveBeenCalled();
    await expect.element(trigger()).toHaveAccessibleName("Date mardi 20 octobre 2026");
  });

  it("chooses the focused day with Enter, closes and gives the focus back to the field", async () => {
    const onChange = vi.fn();
    await renderWithProviders(<DateField onChange={onChange} />);
    await open();
    await userEvent.keyboard("{PageDown}{ArrowRight}{Enter}");
    expect(onChange).toHaveBeenCalledWith("2026-11-06");
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(trigger()).toHaveFocus();
    await expect.element(trigger()).toHaveAccessibleName("Date vendredi 6 novembre 2026");
  });

  it("chooses with Space as well", async () => {
    const onChange = vi.fn();
    await renderWithProviders(<DateField onChange={onChange} />);
    await open();
    await userEvent.keyboard("{ArrowRight} ");
    expect(onChange).toHaveBeenCalledWith("2026-10-06");
  });

  it("ignores Enter on a past day", async () => {
    const onChange = vi.fn();
    await renderWithProviders(<DateField onChange={onChange} />);
    await open();
    await userEvent.keyboard("{ArrowLeft}{Enter}");
    expect(onChange).not.toHaveBeenCalled();
    await expect.element(dialog()).toBeVisible();
  });

  it("closes with Escape and gives the focus back to the field", async () => {
    const onChange = vi.fn();
    await renderWithProviders(<DateField onChange={onChange} />);
    await open();
    await userEvent.keyboard("{ArrowDown}{Escape}");
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(trigger()).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("DatePickerPopover: mouse (06 § 3.3)", () => {
  it("chooses a clicked day that is not past", async () => {
    const onChange = vi.fn();
    await renderWithProviders(<DateField onChange={onChange} />);
    await open();
    await userEvent.click(dayIn(/^jeudi 15 octobre/u));
    expect(onChange).toHaveBeenCalledWith("2026-10-15");
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(trigger()).toHaveFocus();
  });

  it("ignores a click on a past day", async () => {
    const onChange = vi.fn();
    await renderWithProviders(<DateField onChange={onChange} />);
    await open();
    // aria-disabled: Playwright would wait for the day to become enabled.
    await userEvent.click(dayIn(/^vendredi 2 octobre/u), { force: true });
    expect(onChange).not.toHaveBeenCalled();
    await expect.element(dialog()).toBeVisible();
  });

  it("closes on a second click on the field, focus on the field", async () => {
    await renderWithProviders(<DateField />);
    await open();
    await userEvent.click(trigger());
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(trigger()).toHaveFocus();
  });

  it("closes on a press outside without moving the focus back", async () => {
    const { screen } = await renderWithProviders(<DateField />);
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Ailleurs" }));
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "Ailleurs" })).toHaveFocus();
  });

  it("reopens on the month of the field", async () => {
    await renderWithProviders(<DateField />);
    await open();
    await userEvent.click(dialog().getByRole("button", { name: "Mois suivant" }));
    await userEvent.keyboard("{Escape}");
    await open();
    await expect.element(dialog().getByRole("grid")).toHaveAccessibleName("Octobre 2026");
  });
});
