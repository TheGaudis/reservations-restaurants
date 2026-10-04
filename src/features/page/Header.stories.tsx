import { expect } from "storybook/test";

import { Header } from "@/features/page/Header";

import preview from "../../../.storybook/preview";

const meta = preview.meta({
  component: Header,
  args: {
    texts: {
      name1: "Restaurant Pédagogique",
      name2: "Aristide",
      desc1: "",
      desc2: "",
    },
  },
});

/** 04 § 2, 08 § 7.2: logo, school, title, subtitle. */
export const Default = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img", { name: "Lycée Aristide Briand" })).toBeVisible();
  },
});

/** D-24: the title follows the name of the second restaurant. */
export const RenamedRestaurants = meta.story({
  args: { texts: { name1: "Le Gourmet", name2: "Bistrot", desc1: "", desc2: "" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Réservations des restaurants pédagogiques et Bistrot",
    );
  },
});
