import { expect, screen } from "storybook/test";

import { Dialog } from "@/ui/Dialog";

import preview from "../../.storybook/preview";

const meta = preview.meta({
  component: Dialog,
  args: {
    trigger: "Voir le menu",
    title: "Menu du jour",
    children: <p>Velouté, suprême de volaille</p>,
  },
});

export const Closed = meta.story();

export const Opened = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Voir le menu" }));
    // The popup is portalled into document.body, outside the story canvas.
    await expect(await screen.findByRole("dialog", { name: "Menu du jour" })).toBeVisible();
  },
});

export const FetchesFakeScript = meta.story({
  play: async () => {
    const response = await fetch("https://script.google.com/macros/s/STORY/exec");
    const json = (await response.json()) as { name1: string };
    await expect(json.name1).toBe("Restaurant Pédagogique");
  },
});
