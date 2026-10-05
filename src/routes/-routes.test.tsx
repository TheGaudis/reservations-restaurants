import type { AnyRouter } from "@tanstack/react-router";
import { afterEach, describe, expect, it } from "vitest";

import { toLocalCacheV1 } from "@/queries/local-cache";
import { publicStateOptions } from "@/queries/state";
import { fakeScript } from "@/test/browser-fake-script";
import { publicState, SETTINGS } from "@/test/domain-states";
import { renderRoute } from "@/test/render";

afterEach(() => {
  localStorage.clear();
});

/** Search params of the page after validation (the location keeps the raw ones), without the absent ones. */
function validatedSearch(router: AnyRouter): Record<string, unknown> {
  const search: Record<string, unknown> = router.state.matches.at(-1)?.search ?? {};
  return Object.fromEntries(Object.entries(search).filter(([, value]) => value !== undefined));
}

/** Query string of a link, keys sorted. */
function query(searchStr: string): string[] {
  return [...new URLSearchParams(searchStr)].map(([key, value]) => `${key}=${value}`).toSorted();
}

it("renders the restaurant names of the local copy on / (PLAN § 3.3.1)", async () => {
  const release = fakeScript().hold();
  const copy = publicState({
    settings: { ...SETTINGS, name1: "Restaurant de la copie", name2: "Aristide de la copie" },
  });
  localStorage.setItem("reservations-cache-v1", JSON.stringify(toLocalCacheV1(copy, Date.now())));
  const { screen } = await renderRoute("/");
  await expect
    .element(screen.getByRole("heading", { name: "Restaurant de la copie", exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("heading", { name: "Aristide de la copie", exact: true }))
    .toBeVisible();
  // The read of AutoRefresh reaches this fake script: sent later, it would hit the one of the next test.
  await expect.poll(() => fakeScript().requests).toHaveLength(1);
  release();
});

it("keeps the skeleton on / without a local copy until the script answers (G-01)", async () => {
  const release = fakeScript().hold();
  const { screen } = await renderRoute("/");
  await expect.element(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
  release();
  await expect.element(screen.getByRole("main")).toHaveAttribute("aria-busy", "false");
  // The loader started the only read (03 § 2.4).
  expect(fakeScript().requests.filter((request) => request.method === "GET")).toHaveLength(1);
});

it("keeps the header, « Client / Collègue » and the password typed from the skeleton to the page (03 § 2.3, § 5.4)", async () => {
  const release = fakeScript().hold();
  const { screen } = await renderRoute("/?connexion=true");
  const field = screen.getByLabelText("Mot de passe collègue", { exact: true });
  await expect.element(field).toBeVisible();
  await expect.element(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
  await field.fill("secret");
  const header = screen.container.querySelector("header");
  const input = field.element();
  release();
  await expect.element(screen.getByRole("main")).toHaveAttribute("aria-busy", "false");
  expect(screen.container.querySelector("header")).toBe(header);
  expect(field.element()).toBe(input);
  await expect.element(field).toHaveValue("secret");
});

it("shows the load error box under the same header after a failed first read, then the page (G-03, 03 § 3.2)", async () => {
  fakeScript().failNext("error");
  const { screen } = await renderRoute("/");
  await expect
    .poll(() => screen.container.querySelector('[role="alert"]')?.textContent)
    .toMatch(/^Le service de réservation ne répond pas\./u);
  await expect.element(screen.getByRole("main")).toHaveAttribute("aria-busy", "false");
  expect(screen.container.querySelectorAll('[data-still="true"]').length).toBeGreaterThan(0);
  const header = screen.container.querySelector("header");
  await screen.getByRole("button", { name: "Réessayer" }).click();
  await expect.element(screen.getByRole("grid").first()).toBeVisible();
  expect(screen.container.querySelector('[role="alert"]')).toBeNull();
  expect(screen.container.querySelector("header")).toBe(header);
  // The first read, then « Réessayer »: nothing else read the script (03 § 3.2).
  expect(fakeScript().requests.filter((request) => request.method === "GET")).toHaveLength(2);
});

it("keeps the load error box, without reading, when the login panel opens (03 § 3.2, § 5.2)", async () => {
  fakeScript().failNext("error");
  const { screen, router } = await renderRoute("/?r1=2026-10-06");
  await expect
    .poll(() => screen.container.querySelector('[role="alert"]')?.textContent)
    .toMatch(/^Le service de réservation ne répond pas\./u);
  const box = screen.container.querySelector('[role="alert"]');
  const reads = () => fakeScript().requests.filter((request) => request.method === "GET").length;
  expect(reads()).toBe(1);
  await screen.getByRole("button", { name: "Collègue", exact: true }).click();
  await expect
    .element(screen.getByLabelText("Mot de passe collègue", { exact: true }))
    .toBeVisible();
  expect(router.state.location.search).toMatchObject({ connexion: true, r1: "2026-10-06" });
  await router.navigate({ to: "/", search: (previous) => ({ ...previous, r1vue: "mois" }) });
  await expect.poll(() => router.state.location.searchStr).toContain("r1vue=mois");
  // The same element: the alert is not announced again (E-42).
  expect(screen.container.querySelector('[role="alert"]')).toBe(box);
  expect(screen.container.querySelector('main[aria-busy="true"]')).toBeNull();
  expect(reads()).toBe(1);
});

it("gives the page back when a background read succeeds after a failed first read (03 § 5.2)", async () => {
  fakeScript().failNext("error");
  const { screen, queryClient } = await renderRoute("/");
  await expect
    .poll(() => screen.container.querySelector('[role="alert"]')?.textContent)
    .toMatch(/^Le service de réservation/u);
  // What AutoRefresh does every 3 minutes, or when the tab comes back.
  await queryClient.refetchQueries({ queryKey: publicStateOptions.queryKey });
  await expect.element(screen.getByRole("grid").first()).toBeVisible();
  expect(screen.container.querySelector('[role="alert"]')).toBeNull();
});

it("mounts a single refreshing observer (PLAN § 3.3.2, R-18)", async () => {
  const { screen, queryClient } = await renderRoute("/");
  await expect.element(screen.getByRole("main")).toHaveAttribute("aria-busy", "false");
  const publicQuery = queryClient.getQueryCache().find({ queryKey: publicStateOptions.queryKey });
  const intervals = publicQuery?.observers.map((observer) => observer.options.refetchInterval);
  expect(intervals?.filter((interval) => interval !== undefined)).toStrictEqual([180_000]);
});

it("shows the not-found page for an unknown path (PLAN § 3.2)", async () => {
  const { screen } = await renderRoute("/inconnue");
  await expect
    .element(screen.getByRole("heading", { level: 2, name: "Page introuvable" }))
    .toBeVisible();
  await expect.element(screen.getByRole("link", { name: "Revenir à l'accueil" })).toBeVisible();
});

it("redirects /index.html to / (PLAN § 3.2)", async () => {
  const { router } = await renderRoute("/index.html");
  await expect.poll(() => router.state.location.pathname).toBe("/");
});

describe("search params of / (PLAN § 3.2, 09 § 1, R-19)", () => {
  it("reads every param of the schema", async () => {
    const { router } = await renderRoute(
      "/?r1=2026-10-06&r2=2026-10-07&r1vue=mois&r2periode=2026-11-01&reserver=r2&connexion=true&retour=%2Fcollegue%3Fparametres%3Dtrue",
    );
    expect(validatedSearch(router)).toStrictEqual({
      r1: "2026-10-06",
      r2: "2026-10-07",
      r1vue: "mois",
      r2vue: "semaine",
      r2periode: "2026-11-01",
      reserver: "r2",
      connexion: true,
      retour: "/collegue?parametres=true",
    });
  });

  it("falls back on a damaged URL without any error", async () => {
    const { router, screen } = await renderRoute(
      "/?r1=2026-13-45&r2=demain&r1vue=annee&r2periode=12&reserver=1&connexion=1&retour=https%3A%2F%2Fexemple.fr",
    );
    expect(validatedSearch(router)).toStrictEqual({
      r1vue: "semaine",
      r2vue: "semaine",
      connexion: false,
    });
    await expect.element(screen.getByRole("heading", { level: 1 })).toBeVisible();
  });

  it("leaves the defaults out of the links and keeps the calendars from page to page", async () => {
    const { router } = await renderRoute("/?r1=2026-10-06&r2vue=mois");
    const location = router.buildLocation({
      to: "/",
      search: (previous) => ({ ...previous, r1vue: "semaine", connexion: false, reserver: "r1" }),
    });
    expect(query(location.searchStr)).toStrictEqual(["r1=2026-10-06", "r2vue=mois", "reserver=r1"]);
    // retainSearchParams: a link that only names its own param keeps the calendars.
    const retained = router.buildLocation({ to: "/", search: { connexion: true } });
    expect(query(retained.searchStr)).toStrictEqual([
      "connexion=true",
      "r1=2026-10-06",
      "r2vue=mois",
    ]);
  });
});
