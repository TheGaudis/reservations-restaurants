import { userEvent } from "storybook/test";

import { DayDetail } from "@/features/calendar/DayCard";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { staffStory } from "@/test/staff-story";
import { atUrl } from "@/test/story-router";

import preview from "../../../.storybook/preview";

// « Ajouter une personne » in the states of 09 C-12 (R1 card, 06 § 8.1-8.2) and C-23 (R2 dish, 06 § 8.3; D-19), on the
// seed of parite.md § 2: Tuesday 6 October 2026 has 5 seats left out of 20; today's Lasagnes have 4 portions left
// (voucher day), the Lasagnes of Tuesday 13 October 8 (no voucher dish).

const meta = preview.meta({
  component: StaffDayCardR1,
  render: () => (
    <DayDetail restaurant="r1">
      <StaffDayCardR1 />
    </DayDetail>
  ),
  beforeEach: staffStory,
  globals: { accent: "r1" },
});

const r2 = {
  render: () => (
    <DayDetail restaurant="r2">
      <StaffDayCardR2 />
    </DayDetail>
  ),
  globals: { accent: "r2" },
} as const;

/** C-12: the form open, empty, with the seats left and the optional e-mail. */
export const Open = meta.story({
  decorators: [atUrl("/collegue?r1=2026-10-06&ajout=r1")],
  play: async ({ canvas }) => {
    await canvas.findByRole("group", { name: "Nombre de personnes (5 au maximum)" });
  },
});

/** C-12: the rules of 06 § 8.1-8.2, every message at once, nothing sent. */
export const Errors = meta.story({
  decorators: [atUrl("/collegue?r1=2026-10-06&ajout=r1")],
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByLabelText("Adresse email (optionnel)"), "zoe@");
    await userEvent.type(canvas.getByLabelText(/^Élèves/u), "6");
    await userEvent.click(canvas.getByRole("button", { name: "Ajouter cette personne" }));
    await canvas.findByText("Indiquez le nom.");
  },
});

/** C-23 on a voucher day: one portion, « Sur place » alone (D-19, E-36). */
export const R2VoucherDay = meta.story({
  ...r2,
  decorators: [atUrl("/collegue?ajout=r2:r2i-d0-lasagnes")],
  play: async ({ canvas }) => {
    await canvas.findByLabelText("Portions (4 au maximum)");
  },
});

/** C-23 on a day without voucher dish: « À emporter » by default. */
export const R2OtherDay = meta.story({
  ...r2,
  decorators: [atUrl("/collegue?r2=2026-10-13&ajout=r2:r2i-d%2B8-lasagnes")],
  play: async ({ canvas }) => {
    await canvas.findByLabelText("Portions (8 au maximum)");
  },
});
