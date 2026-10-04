import { describe, expect, it } from "vitest";

import { renderRoute, renderWithProviders } from "@/test/render";
import { CapacityPill } from "@/ui/feedback/CapacityPill";

const sample = (
  <CapacityPill percent={0} state="full">
    0 / 20
  </CapacityPill>
);

describe("renderWithProviders", () => {
  it("renders inside the app container, with react-intl", async () => {
    const { screen } = await renderWithProviders(sample);
    const word = screen.getByText("Complet", { exact: true });
    expect(word.element().closest(".app-root")).not.toBeNull();
  });

  it("sets the restaurant accent on the container (08 § 2)", async () => {
    const { screen } = await renderWithProviders(sample, { accent: "r2" });
    const container = screen.container.querySelector<HTMLElement>(".app-root");
    expect(container?.dataset["accent"]).toBe("r2");
    // --ab-magenta (#A3237F), accent of the magenta theme.
    expect(getComputedStyle(container ?? document.body).getPropertyValue("--accent")).toBe(
      "#a3237f",
    );
  });

  it("gives each render a new QueryClient", async () => {
    const first = await renderWithProviders(sample);
    const second = await renderWithProviders(sample);
    expect(second.queryClient).not.toBe(first.queryClient);
  });
});

describe("renderRoute", () => {
  it("renders the route of the URL inside the app container", async () => {
    const { screen, router } = await renderRoute("/inconnue");
    await expect
      .element(screen.getByRole("heading", { level: 1, name: "Page introuvable" }))
      .toBeVisible();
    expect(router.state.location.pathname).toBe("/inconnue");
    expect(screen.container.querySelector(".app-root main")).not.toBeNull();
  });
});
