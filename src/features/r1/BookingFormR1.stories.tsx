import { expect, userEvent } from "storybook/test";

import { DayDetail } from "@/features/calendar/DayCard";
import { BookingFormR1 } from "@/features/r1/BookingFormR1";
import { createFakeAppsScript } from "@/mocks/apps-script";
import { atUrl, clockAt } from "@/test/story-router";

import preview from "../../../.storybook/preview";

// R1 booking form in each state of 09 § 3 (P-05; 04 § 5.2, § 5.4, § 6.1), on the seed of parite.md § 2: Tuesday
// 6 October 2026 has 5 seats left.

const meta = preview.meta({
  component: BookingFormR1,
  args: { date: "2026-10-06" },
  render: (args) => (
    <DayDetail restaurant="r1">
      <BookingFormR1 {...args} />
    </DayDetail>
  ),
  decorators: [atUrl("/?r1=2026-10-06&reserver=r1")],
  beforeEach: clockAt(),
  globals: { accent: "r1" },
});

/** P-05: empty form, legend with the seats left, exact total. */
export const Empty = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Nombre de personnes (5 au maximum)")).toBeInTheDocument();
    await expect(canvas.getByText(/^0 couvert · Total : 0,00\s€$/u)).toBeInTheDocument();
  },
});

/** 04 § 5.4: every message after a submit, the row message once under the counters. */
export const Errors = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Confirmer la réservation" }));
    await expect(await canvas.findByText("Indiquez vos nom et prénom.")).toBeInTheDocument();
    await expect(canvas.getAllByText("Indiquez au moins une personne.")).toHaveLength(1);
  },
});

/** D-18: more seats than left, refused before sending. */
export const TooManySeats = meta.story({
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByRole("textbox", { name: /^Élèves/u }), "6");
    await userEvent.click(canvas.getByRole("button", { name: "Confirmer la réservation" }));
    await expect(
      await canvas.findByText("5 couverts au maximum (places restantes ce jour-là)."),
    ).toBeInTheDocument();
  },
});

// Fake script of the story « Sending », which holds the answer of the booking.
let sendingScript = createFakeAppsScript();

/** 04 § 6.1, E-13: busy button, « Annuler » disabled while the script holds the answer. */
export const Sending = meta.story({
  beforeEach: ({ msw }) => {
    sendingScript = createFakeAppsScript();
    msw.use(...sendingScript.handlers);
  },
  play: async ({ canvas }) => {
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Nom et prénom" }),
      "Jean Dupuis",
    );
    await userEvent.type(canvas.getByRole("textbox", { name: "Adresse email" }), "jean@exemple.fr");
    await userEvent.type(canvas.getByRole("textbox", { name: "Classe ou service" }), "TS2");
    await userEvent.type(canvas.getByRole("textbox", { name: /^Élèves/u }), "1");
    sendingScript.hold();
    await userEvent.click(canvas.getByRole("button", { name: "Confirmer la réservation" }));
    await expect(await canvas.findByRole("button", { name: "Envoi en cours…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(canvas.getByRole("button", { name: "Annuler" })).toBeDisabled();
  },
});
