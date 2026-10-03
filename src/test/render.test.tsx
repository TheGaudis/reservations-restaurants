import { describe, expect, it } from "vitest";

import { renderRoute, renderWithProviders } from "@/test/render";
import { Spinner } from "@/ui/feedback/Spinner";

describe("renderWithProviders", () => {
  it("renders inside the app container, with react-intl", async () => {
    const { screen } = await renderWithProviders(<Spinner />);
    const progress = screen.getByRole("progressbar", { name: "Chargement en cours" });
    expect(progress.element().closest(".app-root")).not.toBeNull();
  });

  it("sets the restaurant accent on the container (08 § 2)", async () => {
    const { screen } = await renderWithProviders(<Spinner />, { accent: "r2" });
    const container = screen.container.querySelector<HTMLElement>(".app-root");
    expect(container?.dataset["accent"]).toBe("r2");
    // --ab-magenta (#A3237F), accent of the magenta theme.
    expect(getComputedStyle(container ?? document.body).getPropertyValue("--accent")).toBe(
      "#a3237f",
    );
  });

  it("gives each render a new QueryClient", async () => {
    const first = await renderWithProviders(<Spinner />);
    const second = await renderWithProviders(<Spinner />);
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
