import { userEvent } from "storybook/test";

import { DayDetail } from "@/features/calendar/DayCard";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { atUrl, clockAt } from "@/test/story-router";
import { staffSession } from "@/test/story-session";

import preview from "../../../.storybook/preview";

// Dishes of the R2 staff card (06 § 6; 09 C-14, C-20 to C-22) on the seed of parite.md § 2, Monday 5 October 2026 at
// 9:30 in Paris: Tuesday 6 has « Lasagnes » (1 booking) and « Bowl » (voucher, 1 booking). The dish actions at rest
// (C-20): `BookingList.stories.tsx`, story `R2Bookings`.

const TUESDAY = "/collegue?r2=2026-10-06";

const meta = preview.meta({
  component: StaffDayCardR2,
  render: () => (
    <DayDetail restaurant="r2">
      <StaffDayCardR2 />
    </DayDetail>
  ),
  beforeEach: () => {
    const restoreClock = clockAt()();
    const closeSession = staffSession();
    return () => {
      closeSession();
      restoreClock();
    };
  },
  globals: { accent: "r2" },
});

/** C-21: « Ajouter un plat », open (`ajoutPlat=true`). */
export const AddDish = meta.story({
  decorators: [atUrl(`${TUESDAY}&ajoutPlat=true`)],
  play: async ({ canvas }) => {
    await canvas.findByRole("textbox", { name: "Nom du plat" });
  },
});

/** C-21, refused: empty name and stock, price of 0 (06 § 6.1, D-22). */
export const AddDishRefused = meta.story({
  decorators: [atUrl(`${TUESDAY}&ajoutPlat=true`)],
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByLabelText("Prix (optionnel)"), "0");
    await userEvent.click(canvas.getByRole("button", { name: "Ajouter ce plat" }));
    await canvas.findByText("Indiquez le nom du plat.");
  },
});

/** C-22: « Modifier ce plat » of a voucher dish, price disabled (`editPlat`, 06 § 4.3). */
export const EditVoucherDish = meta.story({
  decorators: [atUrl(`${TUESDAY}&editPlat=r2i-d%2B1-bowl`)],
  play: async ({ canvas }) => {
    await canvas.findByRole("textbox", { name: "Nom du plat" });
  },
});

/** C-22, refused: stock under the 3 portions booked (D-19, E-36). */
export const EditStockBelowBooked = meta.story({
  decorators: [atUrl(`${TUESDAY}&editPlat=r2i-d%2B1-bowl`)],
  play: async ({ canvas }) => {
    const stock = await canvas.findByRole("textbox", { name: "Stock" });
    await userEvent.clear(stock);
    await userEvent.type(stock, "2");
    await userEvent.click(canvas.getByRole("button", { name: "Enregistrer" }));
    await canvas.findByText(
      "Impossible : 3 portions déjà réservées pour ce plat, le stock ne peut pas être inférieur.",
    );
  },
});

/** C-14 (dish): armed deletion of a dish that has a booking, with its note (D-21, E-38). */
export const DeleteArmed = meta.story({
  decorators: [atUrl(TUESDAY)],
  play: async ({ canvas }) => {
    const [remove] = await canvas.findAllByRole("button", { name: "Supprimer ce plat" });
    if (remove === undefined) throw new Error("No « Supprimer ce plat » button.");
    await userEvent.click(remove);
  },
});
