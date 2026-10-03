import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { afterEach, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { getRouter } from "@/router";

async function renderRoute(url: string) {
  const router = getRouter();
  router.update({ ...router.options, history: createMemoryHistory({ initialEntries: [url] }) });
  const screen = await render(<RouterProvider router={router} />);
  return { router, screen };
}

afterEach(() => {
  localStorage.clear();
});

it("renders the restaurant names of the local copy on / (PLAN § 3.3.1)", async () => {
  localStorage.setItem(
    "reservations-cache-v1",
    JSON.stringify({
      savedAt: Date.now(),
      etag: "ETAG",
      config: { name1: "Restaurant de la copie", name2: "Aristide de la copie" },
    }),
  );
  const { screen } = await renderRoute("/");
  await expect
    .element(screen.getByRole("heading", { name: "Restaurant de la copie" }))
    .toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "Aristide de la copie" })).toBeVisible();
});

it("keeps the skeleton on / without a local copy (G-01)", async () => {
  const { screen } = await renderRoute("/");
  await expect.element(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
});

it("shows the not-found page for an unknown path (PLAN § 3.2)", async () => {
  const { screen } = await renderRoute("/inconnue");
  await expect
    .element(screen.getByRole("heading", { level: 1, name: "Page introuvable" }))
    .toBeVisible();
  await expect.element(screen.getByRole("link", { name: "Revenir à l'accueil" })).toBeVisible();
});

it("redirects /index.html to / (PLAN § 3.2)", async () => {
  const { router } = await renderRoute("/index.html");
  await expect.poll(() => router.state.location.pathname).toBe("/");
});
