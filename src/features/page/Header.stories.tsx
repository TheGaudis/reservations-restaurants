import { QueryClient } from "@tanstack/react-query";
import { expect } from "storybook/test";

import { Header } from "@/features/page/Header";
import { publicStateOptions } from "@/queries/state";
import { publicState, SETTINGS } from "@/test/domain-states";

import preview from "../../../.storybook/preview";

// The header with the names of the state shown, or the defaults before any data (04 § 2, 03 § 1.2).

const meta = preview.meta({ component: Header });

/** 04 § 2, 08 § 7.2: logo, school, title, subtitle. */
export const Default = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img", { name: "Lycée Aristide Briand" })).toBeVisible();
  },
});

/** D-24: the title follows the name of the second restaurant. */
export const RenamedRestaurants = meta.story({
  play: async ({ canvas, loaded }) => {
    const queryClient: unknown = loaded["queryClient"];
    if (!(queryClient instanceof QueryClient)) throw new TypeError("QueryClient manquant.");
    queryClient.setQueryData(
      publicStateOptions.queryKey,
      publicState({ settings: { ...SETTINGS, name1: "Le Gourmet", name2: "Bistrot" } }),
    );
    await expect(
      await canvas.findByText("Réservations des restaurants pédagogiques et Bistrot"),
    ).toBeVisible();
  },
});
