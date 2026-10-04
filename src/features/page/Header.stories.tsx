import { expect } from "storybook/test";

import { Header } from "@/features/page/Header";

import preview from "../../../.storybook/preview";

// The header before any data: the names of the last visit (`reservations-textes`, 03 § 1.2) or the defaults.

const meta = preview.meta({ component: Header });

/** 04 § 2, 08 § 7.2: logo, school, title, subtitle. */
export const Default = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img", { name: "Lycée Aristide Briand" })).toBeVisible();
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Réservations des restaurants pédagogiques et Aristide",
    );
  },
});

/** D-24: the title follows the name of the second restaurant. */
export const RenamedRestaurants = meta.story({
  beforeEach: () => {
    localStorage.setItem(
      "reservations-textes",
      JSON.stringify({ name1: "Le Gourmet", name2: "Bistrot" }),
    );
    return () => {
      localStorage.removeItem("reservations-textes");
    };
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Réservations des restaurants pédagogiques et Bistrot",
    );
  },
});
