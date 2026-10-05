import { useId, useState } from "react";
import { expect, screen, userEvent, waitFor } from "storybook/test";

import type { IsoDate } from "@/domain/types";
import { TODAY } from "@/test/clock";
import { DatePickerPopover } from "@/ui/calendar/DatePickerPopover";

import preview from "../../../.storybook/preview";

// Days already open in R1 (parite.md § 2).
const OPEN_DAYS = new Set(["2026-10-01", "2026-10-05", "2026-10-06", "2026-10-09"]);

// « Date » of « Ouvrir un jour » (06 § 3.1).
function DateFieldDemo({ initial, accent }: { initial: IsoDate; accent: "r1" | "r2" }) {
  const id = useId();
  const labelId = useId();
  const [value, setValue] = useState(initial);
  return (
    <div>
      <label id={labelId} htmlFor={id}>
        Date
      </label>
      <DatePickerPopover
        id={id}
        labelId={labelId}
        value={value}
        today={TODAY}
        accent={accent}
        isMarked={(iso) => OPEN_DAYS.has(iso)}
        onChange={setValue}
      />
    </div>
  );
}

const meta = preview.meta({
  component: DateFieldDemo,
  args: { initial: TODAY, accent: "r1" as const },
  globals: { accent: "r1" },
});

/** Closed: the long date and the calendar icon. */
export const Closed = meta.story({
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Date", description: "lundi 5 octobre 2026" }),
    ).toHaveAttribute("aria-expanded", "false");
  },
});

/** Open on the month of the field: past days disabled, open days marked (06 § 3.2). */
export const Open = meta.story({
  args: { initial: "2026-10-20" },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Date" }));
    const dialog = await screen.findByRole("dialog", { name: "Choisir la date" });
    // The popup fades in (`data-starting-style`).
    await waitFor(async () => {
      await expect(dialog).toBeVisible();
    });
    await expect(
      screen.getByRole("button", { name: "jeudi 1er octobre 2026, déjà ouvert, passé" }),
    ).toHaveAttribute("aria-disabled", "true");
  },
});

/** Magenta accent of R2 on the popup, rendered in a portal. */
export const OpenR2 = meta.story({
  args: { accent: "r2" as const },
  globals: { accent: "r2" },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Date" }));
    const dialog = await screen.findByRole("dialog", { name: "Choisir la date" });
    await waitFor(async () => {
      await expect(dialog).toBeVisible();
    });
    await expect(dialog.closest('[data-accent="r2"]')).not.toBeNull();
  },
});
