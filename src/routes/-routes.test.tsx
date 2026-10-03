import { afterEach, expect, it } from "vitest";

import { toLocalCacheV1 } from "@/queries/local-cache";
import { publicState, SETTINGS } from "@/test/domain-states";
import { renderRoute } from "@/test/render";

afterEach(() => {
  localStorage.clear();
});

it("renders the restaurant names of the local copy on / (PLAN § 3.3.1)", async () => {
  const copy = publicState({
    settings: { ...SETTINGS, name1: "Restaurant de la copie", name2: "Aristide de la copie" },
  });
  localStorage.setItem("reservations-cache-v1", JSON.stringify(toLocalCacheV1(copy, Date.now())));
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
