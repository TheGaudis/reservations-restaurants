import { expect, screen, userEvent, waitFor } from "storybook/test";

import { Button } from "@/ui/button/Button";
import { showToast, toastManager } from "@/ui/feedback/toast";
import type { ToastKind } from "@/ui/feedback/toast";
import { Toaster } from "@/ui/feedback/Toaster";

import preview from "../../../.storybook/preview";

function ToasterDemo({ message, kind }: { message: string; kind: ToastKind }) {
  return (
    <>
      <Button
        onClick={() => {
          showToast(message, kind);
        }}
      >
        Afficher
      </Button>
      <Toaster />
    </>
  );
}

const meta = preview.meta({
  component: ToasterDemo,
  args: { message: "Réservation confirmée.", kind: "success" as const },
  beforeEach: () => () => {
    toastManager.close();
  },
});

async function showFromButton(message: string) {
  await userEvent.click(screen.getByRole("button", { name: "Afficher" }));
  const region = screen.getByRole("region", { name: "Notifications" });
  await waitFor(async () => {
    await expect(region).toHaveTextContent(message);
  });
}

export const Success = meta.story({
  play: async ({ args }) => {
    await showFromButton(args.message);
  },
});

/** Cut-off of the R2 orders, green like a success (04 § 9). */
export const Neutral = meta.story({
  args: {
    message:
      "Commandes en ligne clôturées à 10h. Venez au restaurant Aristide à partir de 12h pour commander sur place.",
    kind: "neutral",
  },
  play: async ({ args }) => {
    await showFromButton(args.message);
  },
});

/** Red, announced at once (a-8). */
export const Error = meta.story({
  args: {
    message: "Le serveur est très sollicité : réessayez dans quelques secondes.",
    kind: "error",
  },
  play: async ({ args }) => {
    await showFromButton(args.message);
    await expect(screen.getByRole("alert")).toHaveTextContent(args.message);
  },
});
