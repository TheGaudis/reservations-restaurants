import { expect, userEvent } from "storybook/test";

import { DayDetail } from "@/features/calendar/DayCard";
import { OrderFormR2 } from "@/features/r2/OrderFormR2";
import { createFakeAppsScript } from "@/mocks/apps-script";
import { atUrl, clockAt } from "@/test/story-router";

import preview from "../../../.storybook/preview";

// R2 order form in each state of 09 § 3 (P-13; 04 § 5.3, § 5.4, § 6.1), on the seed of parite.md § 2: Monday
// 5 October 2026 is a voucher day (Lasagnes 4 left at 4,50 €, Bowl and Wrap paid with a voucher, Salade without a
// price); Tuesday 13 has no voucher dish.

const meta = preview.meta({
  component: OrderFormR2,
  args: { date: "2026-10-05" },
  render: (args) => (
    <DayDetail restaurant="r2">
      <OrderFormR2 {...args} />
    </DayDetail>
  ),
  decorators: [atUrl("/?r2=2026-10-05&reserver=r2")],
  beforeEach: clockAt(),
  globals: { accent: "r2" },
});

/** P-13, voucher day: « Sur place » alone with its help, each dish with its portions left, no total yet. */
export const VoucherDay = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("4 disponibles")).toBeInTheDocument();
    await expect(canvas.getByRole("radio", { name: "Sur place" })).toBeChecked();
    await expect(
      canvas.getByText("Sur place uniquement ce jour-là : repas au prix d'un ticket restaurant."),
    ).toBeInTheDocument();
    await expect(canvas.queryByText(/^Total/u)).toBeNull();
  },
});

/** P-13, a day without voucher: « À emporter » chosen first. */
export const WithoutVoucher = meta.story({
  args: { date: "2026-10-13" },
  decorators: [atUrl("/?r2=2026-10-13&reserver=r2")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("radio", { name: "À emporter" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Sur place" })).not.toBeChecked();
  },
});

/** 04 § 5.3: the live total, one meal voucher per order. */
export const WithTotal = meta.story({
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByRole("textbox", { name: "Quantité : Lasagnes" }), "2");
    await userEvent.type(canvas.getByRole("textbox", { name: "Quantité : Bowl" }), "3");
    await userEvent.type(canvas.getByRole("textbox", { name: "Quantité : Wrap" }), "1");
    await expect(canvas.getByText(/^Total : 9,00\s€ \+ 1 ticket restaurant$/u)).toBeInTheDocument();
  },
});

/** 04 § 5.4, E-41: every message after a submit, « Choisissez au moins un plat. » under the dishes. */
export const Errors = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Confirmer la réservation" }));
    await expect(await canvas.findByText("Choisissez au moins un plat.")).toBeInTheDocument();
    await expect(canvas.getByText("Indiquez vos nom et prénom.")).toBeInTheDocument();
    await expect(canvas.getByRole("textbox", { name: "Quantité : Lasagnes" })).toHaveFocus();
  },
});

// Fake script of the story « Sending », which holds the answer of the order.
let sendingScript = createFakeAppsScript();

/** 04 § 6.1, E-13: busy button, « Annuler » disabled while the script holds the answer. */
export const Sending = meta.story({
  beforeEach: ({ msw }) => {
    sendingScript = createFakeAppsScript();
    msw.use(...sendingScript.handlers);
  },
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByRole("textbox", { name: "Quantité : Lasagnes" }), "1");
    await userEvent.type(canvas.getByRole("textbox", { name: "Nom et prénom" }), "Ariele Gsell");
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Adresse email" }),
      "a.gsell@exemple.fr",
    );
    await userEvent.type(canvas.getByRole("textbox", { name: "Classe ou service" }), "VS");
    sendingScript.hold();
    await userEvent.click(canvas.getByRole("button", { name: "Confirmer la réservation" }));
    await expect(await canvas.findByRole("button", { name: "Envoi en cours…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(canvas.getByRole("button", { name: "Annuler" })).toBeDisabled();
  },
});
