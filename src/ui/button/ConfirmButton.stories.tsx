import { expect, fn, userEvent } from "storybook/test";

import { ConfirmButton } from "@/ui/button/ConfirmButton";

import preview from "../../../.storybook/preview";

const meta = preview.meta({
  component: ConfirmButton,
  args: {
    children: "Supprimer ce jour",
    detail: "Confirmer la suppression du jour et de toutes ses réservations",
    onConfirm: fn(),
    size: "small" as const,
  },
});

export const Rest = meta.story();

/** After the first click (06 § 5.2); back to rest after 4 s. */
export const Armed = meta.story({
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Supprimer ce jour" }));
    const button = canvas.getByRole("button", { name: args.detail });
    await expect(button).toHaveTextContent("Confirmer ?");
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Cliquez de nouveau pour confirmer.",
    );
  },
});

/** Day with bookings: the detail is also written next to the button (D-21). */
export const ArmedWithDetail = meta.story({
  args: {
    detail:
      "Confirmer la suppression du jour et de ses 3 réservations (les personnes ne seront pas prévenues)",
    showDetail: true,
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Supprimer ce jour" }));
    await expect(canvas.getByText(args.detail)).toBeVisible();
  },
});

/** Second click sent, waiting for the script (E-04). */
export const Busy = meta.story({
  args: { busy: true },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole("button", { name: args.detail })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  },
});
