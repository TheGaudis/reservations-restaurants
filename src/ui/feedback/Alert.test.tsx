import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";
import { Button } from "@/ui/button/Button";
import { Alert } from "@/ui/feedback/Alert";

const OFFLINE = "Vous semblez hors ligne. Vérifiez votre connexion internet, puis réessayez.";

describe("Alert", () => {
  it("announces the text of a load failure as an alert, without its button (03 § 3.1, 08 § 4.12)", async () => {
    const { screen } = await renderWithProviders(
      <Alert live="alert" action={<Button variant="primary">Réessayer</Button>}>
        {OFFLINE}
      </Alert>,
    );
    const alert = screen.getByRole("alert");
    await expect.element(alert).toHaveTextContent(OFFLINE);
    expect(alert.element().querySelector("button")).toBeNull();
    await expect.element(screen.getByRole("button", { name: "Réessayer" })).toBeVisible();
    // Icon: decorative.
    expect(screen.container.querySelector("svg")?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("frames a box in the state colour with a 6 px left bar (08 § 4.12)", async () => {
    const { screen } = await renderWithProviders(<Alert>{OFFLINE}</Alert>);
    const box = screen.getByText(OFFLINE).element().parentElement ?? document.body;
    const style = getComputedStyle(box);
    // --danger (#B7372F).
    expect(style.borderLeftColor).toBe("rgb(183, 55, 47)");
    expect(style.borderLeftWidth).toBe("6px");
  });

  it("writes a warning note in the warning colour, polite when asked (08 § 4.13)", async () => {
    const { screen } = await renderWithProviders(
      <Alert variant="note" tone="warning" live="status">
        Commandes en ligne clôturées à 10h.
      </Alert>,
    );
    const note = screen.getByRole("status");
    await expect.element(note).toHaveTextContent("Commandes en ligne clôturées à 10h.");
    // --warning (#9A600A), 4 px bar.
    expect(getComputedStyle(note.element()).borderLeftColor).toBe("rgb(154, 96, 10)");
    expect(getComputedStyle(note.element()).borderLeftWidth).toBe("4px");
  });

  it("draws the configuration banner in red with the warning sign as an icon (08 § 4.20, annexe F)", async () => {
    const { screen } = await renderWithProviders(
      <Alert variant="banner">Configuration manquante.</Alert>,
    );
    const banner = screen.getByText("Configuration manquante.").element();
    expect(getComputedStyle(banner).backgroundColor).toBe("rgb(183, 55, 47)");
    expect(getComputedStyle(banner).color).toBe("rgb(255, 255, 255)");
    expect(banner.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(banner.textContent).toBe("Configuration manquante.");
  });
});
