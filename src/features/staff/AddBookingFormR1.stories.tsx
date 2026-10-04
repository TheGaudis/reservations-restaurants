import { expect, userEvent } from "storybook/test";

import { DayDetail } from "@/features/calendar/DayCard";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { staffStory } from "@/test/staff-story";
import { atUrl } from "@/test/story-router";

import preview from "../../../.storybook/preview";

// « Ajouter une personne » under the actions of the R1 card in the states of 09 C-12 (06 § 8.1-8.2), on the seed of
// parite.md § 2: Tuesday 6 October 2026, 5 seats left out of 20.

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

/** C-12: the form open, empty, with the seats left and the optional e-mail. */
export const Open = meta.story({
  decorators: [atUrl("/collegue?r1=2026-10-06&ajout=r1")],
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("group", { name: "Nombre de personnes (5 au maximum)" }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "+ Ajouter une personne" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(canvas.getByLabelText("Adresse email (optionnel)")).toHaveValue("");
  },
});

/** C-12: the rules of 06 § 8.1-8.2, every message at once, nothing sent. */
export const Errors = meta.story({
  decorators: [atUrl("/collegue?r1=2026-10-06&ajout=r1")],
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByLabelText("Adresse email (optionnel)"), "zoe@");
    await userEvent.type(canvas.getByLabelText(/^Élèves/u), "6");
    await userEvent.click(canvas.getByRole("button", { name: "Ajouter cette personne" }));
    await expect(await canvas.findByText("Indiquez le nom.")).toBeInTheDocument();
    await expect(
      canvas.getByText("Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr)."),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText("5 couverts au maximum (places restantes ce jour-là)."),
    ).toBeInTheDocument();
  },
});
