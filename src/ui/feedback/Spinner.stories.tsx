import { expect } from "storybook/test";

import { Spinner } from "@/ui/feedback/Spinner";

import preview from "../../../.storybook/preview";

const meta = preview.meta({ component: Spinner });

export const Default = meta.story({
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("progressbar", { name: "Chargement en cours" }),
    ).toBeInTheDocument();
  },
});
