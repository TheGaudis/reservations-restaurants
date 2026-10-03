import { expect } from "storybook/test";

import { Button } from "@/ui/button/Button";
import { Alert } from "@/ui/feedback/Alert";

import preview from "../../../.storybook/preview";

const meta = preview.meta({
  component: Alert,
  args: {
    children: "Vous semblez hors ligne. Vérifiez votre connexion internet, puis réessayez.",
  },
});

/** Load failure box (G-03, 03 § 3.1): text announced as an alert, « Réessayer » next to it. */
export const LoadFailure = meta.story({
  args: { live: "alert", action: <Button variant="primary">Réessayer</Button> },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toBeVisible();
  },
});

/** Same box while retrying (03 § 3.2). */
export const LoadFailureRetrying = meta.story({
  args: {
    live: "alert",
    action: (
      <Button variant="primary" busy busyLabel="Nouvelle tentative…">
        Réessayer
      </Button>
    ),
  },
});

export const WarningBox = meta.story({
  args: {
    tone: "warning",
    children: (
      <>
        <b>Données locales.</b> Les places affichées seront mises à jour dans un instant.
      </>
    ),
  },
});

/** Cut-off of the R2 orders in a card (08 § 4.13). */
export const WarningNote = meta.story({
  args: {
    variant: "note",
    tone: "warning",
    children:
      "Commandes en ligne clôturées à 10h. Venez au restaurant Aristide à partir de 12h pour commander sur place.",
  },
  globals: { accent: "r2" },
});

/** Configuration banner (G-05, D-05): « ⚠ » drawn as an icon. */
export const Banner = meta.story({
  args: {
    variant: "banner",
    children:
      "Configuration manquante : l'adresse du service de réservation n'est pas renseignée ou n'est pas valide. Prévenez l'établissement.",
  },
});
