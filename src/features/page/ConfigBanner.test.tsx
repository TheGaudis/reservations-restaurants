import { describe, expect, it } from "vitest";

import { ConfigBanner } from "@/features/page/ConfigBanner";
import { renderWithProviders } from "@/test/render";

// G-05, D-05, E-29 (PLAN § 1.5, F-07): the build fixes the script URL, so the banner is tested here with the URL as
// a prop, never by the E2E suite.
const TEXT =
  "Configuration manquante : l'adresse du service de réservation n'est pas renseignée ou n'est pas valide. Prévenez l'établissement.";

describe("ConfigBanner (G-05, D-05)", () => {
  it.each([
    ["absent", ""],
    ["not a deployment URL", "https://example.com/macros/s/AKfycb/exec"],
    ["without /exec", "https://script.google.com/macros/s/AKfycb"],
    ["placeholder of the old setup", "https://script.google.com/macros/s/COLLE_ICI/exec"],
  ])("shows the D-05 text when the URL is %s", async (_, url) => {
    const { screen } = await renderWithProviders(<ConfigBanner url={url} />);
    const banner = screen.getByText(TEXT);
    await expect.element(banner).toBeVisible();
    // « ⚠ » drawn as an icon, hidden from assistive technologies (PLAN annexe F).
    const icon = banner.element().querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    // Never an alert: the load error box is the only one of the page (G-03).
    expect(screen.container.querySelector('[role="alert"]')).toBeNull();
  });

  it("shows nothing with a deployment URL", async () => {
    const { screen } = await renderWithProviders(
      <ConfigBanner url="https://script.google.com/macros/s/AKfycbz-legacy_ID/exec" />,
    );
    expect(screen.container.textContent).toBe("");
  });

  it("reads the URL of the build by default (.env.test: valid)", async () => {
    const { screen } = await renderWithProviders(<ConfigBanner />);
    expect(screen.container.textContent).toBe("");
  });
});
