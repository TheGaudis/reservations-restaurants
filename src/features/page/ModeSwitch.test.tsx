import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import type { AnyRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";

import { ModeSwitch } from "@/features/page/ModeSwitch";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { createQueryClient } from "@/queries/client";
import { publicStateOptions, stateKeys } from "@/queries/state";
import { APP_START } from "@/queries/use-app-state";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { publicState } from "@/test/domain-states";
import { TestProviders } from "@/test/providers";
import { urlParams } from "@/test/public-page";
import { StoryRoot, StoryRouter } from "@/test/StoryRouter";
import { TestToaster } from "@/test/TestToaster";

// « Client / Collègue » and the login panel (06 § 1.1-1.3, 09 L-01, E-04, E-23), in a memory router with the paths
// / and /collegue but without the HTML shell: a focused field in `renderRoute` blocks the test page (journal p4c).
// Like the root, the router keeps the same switch from one path to the other.

function memoryRouter(url: string): AnyRouter {
  const root = createRootRoute({ component: StoryRoot });
  const routes = ["/", "/collegue"].map((path) =>
    createRoute({ getParentRoute: () => root, path, component: () => null }),
  );
  return createRouter({
    routeTree: root.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [url] }),
  });
}

/** The switch at `url`; `fromCache`: the page shows the local copy of the last visit (G-02). */
async function renderSwitch(url = "/", { fromCache = false } = {}) {
  const queryClient = createQueryClient();
  queryClient.setQueryData(publicStateOptions.queryKey, publicState(), {
    updatedAt: fromCache ? APP_START - 60_000 : Date.now(),
  });
  const router = memoryRouter(url);
  const screen = await render(
    <TestProviders queryClient={queryClient}>
      <StoryRouter router={router}>
        <ModeSwitch />
        <TestToaster />
      </StoryRouter>
    </TestProviders>,
  );
  await expect.element(page.getByRole("group", { name: "Mode d'accès" })).toBeVisible();
  return { screen, router, queryClient };
}

const segment = (name: "Client" | "Collègue") =>
  page.getByRole("group", { name: "Mode d'accès" }).getByRole("button", { name, exact: true });
const field = () => page.getByLabelText("Mot de passe collègue", { exact: true });
const validate = () => page.getByRole("button", { name: /^(Valider|Envoi en cours…)$/u });
const toast = () => page.getByRole("region", { name: "Notifications" });

function adminStateBodies(): unknown[] {
  return fakeScript()
    .requests.filter((request) => request.method === "POST")
    .map((request) => request.json);
}

async function typePassword(password: string) {
  await userEvent.click(segment("Collègue"));
  await userEvent.fill(field(), password);
}

describe("mode switch (06 § 1.1-1.2)", () => {
  it("opens the panel on « Collègue », focused in a hidden password field (?connexion=true)", async () => {
    const { router } = await renderSwitch("/?r1=2026-10-06");
    await expect.element(segment("Client")).toHaveAttribute("aria-pressed", "true");
    await expect.element(segment("Collègue")).toHaveAttribute("aria-pressed", "false");
    await expect.element(segment("Collègue")).toHaveAttribute("aria-expanded", "false");
    expect(field().query()).toBeNull();

    await userEvent.click(segment("Collègue"));
    await expect.element(field()).toHaveFocus();
    await expect.element(field()).toHaveAttribute("type", "password");
    await expect.element(field()).toHaveAttribute("placeholder", "Mot de passe");
    await expect.element(segment("Collègue")).toHaveAttribute("aria-pressed", "true");
    await expect.element(segment("Collègue")).toHaveAttribute("aria-expanded", "true");
    await expect.element(segment("Client")).toHaveAttribute("aria-pressed", "false");
    const panelId = segment("Collègue").element().getAttribute("aria-controls") ?? "";
    const panel = document.querySelector(`#${CSS.escape(panelId)}`);
    expect(panel?.contains(field().element())).toBe(true);
    expect(urlParams(router)).toStrictEqual(["connexion=true", "r1=2026-10-06"]);
  });

  it("shows and hides the password with the eye (06 § 1.2)", async () => {
    await renderSwitch();
    await typePassword("secret");
    await userEvent.click(page.getByRole("button", { name: "Afficher le mot de passe" }));
    await expect.element(field()).toHaveAttribute("type", "text");
    await userEvent.click(page.getByRole("button", { name: "Masquer le mot de passe" }));
    await expect.element(field()).toHaveAttribute("type", "password");
  });

  it("goes back to the client mode on Échap, focus on « Client », field emptied (06 § 1.1-1.2)", async () => {
    const { router } = await renderSwitch("/?retour=%2Fcollegue");
    await typePassword("secret");
    await userEvent.click(page.getByRole("button", { name: "Afficher le mot de passe" }));
    await userEvent.click(field());
    await userEvent.keyboard("{Escape}");
    await expect.element(segment("Client")).toHaveFocus();
    await expect.element(segment("Client")).toHaveAttribute("aria-pressed", "true");
    expect(field().query()).toBeNull();
    expect(urlParams(router)).toStrictEqual([]);
    await userEvent.click(segment("Collègue"));
    await expect.element(field()).toHaveValue("");
    await expect.element(field()).toHaveAttribute("type", "password");
  });

  it("closes the panel on « Client » (06 § 1.2)", async () => {
    const { router } = await renderSwitch("/?connexion=true");
    await expect.element(field()).toBeVisible();
    await userEvent.click(segment("Client"));
    expect(field().query()).toBeNull();
    expect(urlParams(router)).toStrictEqual([]);
  });

  it("logs out on « Client » during a session (06 § 1.5)", async () => {
    useSessionStore.getState().open(SEED_PASSWORD);
    await renderSwitch("/collegue");
    await expect.element(segment("Collègue")).toHaveAttribute("aria-pressed", "true");
    await expect.element(segment("Collègue")).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(segment("Collègue"));
    expect(useSessionStore.getState().password).toBe(SEED_PASSWORD);
    await userEvent.click(segment("Client"));
    expect(useSessionStore.getState()).toMatchObject({ password: null, endReason: "logout" });
  });
});

describe("login (06 § 1.3)", () => {
  it("is refused while the page shows the local copy, without request (G-02)", async () => {
    await renderSwitch("/", { fromCache: true });
    await typePassword(SEED_PASSWORD);
    await userEvent.click(validate());
    await expect
      .element(toast())
      .toHaveTextContent("Les données se chargent. Réessayez dans un instant.");
    expect(adminStateBodies()).toStrictEqual([]);
    expect(useSessionStore.getState().password).toBeNull();
  });

  it("says « Mot de passe incorrect. » for a refused password, panel kept (06 § 1.3 (6))", async () => {
    const { router } = await renderSwitch();
    await typePassword("faux");
    await userEvent.keyboard("{Enter}");
    await expect.element(toast()).toHaveTextContent("Mot de passe incorrect.");
    expect(adminStateBodies()).toStrictEqual([{ action: "getAdminState", password: "faux" }]);
    expect(router.state.location.pathname).toBe("/");
    await expect.element(field()).toBeVisible();
    expect(useSessionStore.getState().password).toBeNull();
  });

  it("says « Erreur de connexion. Réessayez. » for any other failure (06 § 1.3 (6))", async () => {
    fakeScript().failNext("network");
    await renderSwitch();
    await typePassword(SEED_PASSWORD);
    await userEvent.click(validate());
    await expect.element(toast()).toHaveTextContent("Erreur de connexion. Réessayez.");
  });

  it("keeps « Valider » busy during the request, without veil (E-04)", async () => {
    const release = fakeScript().hold();
    await renderSwitch();
    await typePassword(SEED_PASSWORD);
    await userEvent.click(validate());
    await expect.element(validate()).toHaveAttribute("aria-busy", "true");
    await expect.element(validate()).toHaveTextContent("Envoi en cours…");
    release();
    await expect.element(toast()).toHaveTextContent("Mode collègue activé.");
  });

  it("opens the session and goes to /collegue with the calendars, focus on « Collègue »", async () => {
    const { router, queryClient } = await renderSwitch("/?r1=2026-10-06&r2vue=mois");
    await typePassword(SEED_PASSWORD);
    await userEvent.click(validate());
    await expect.element(toast()).toHaveTextContent("Mode collègue activé.");
    await expect.poll(() => router.state.location.pathname).toBe("/collegue");
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-06", "r2vue=mois"]);
    expect(useSessionStore.getState()).toMatchObject({ password: SEED_PASSWORD, id: 1 });
    expect(queryClient.getQueryData(stateKeys.staff(1))).toBeDefined();
    await expect.element(segment("Collègue")).toHaveFocus();
    await expect.element(segment("Collègue")).toHaveAttribute("aria-expanded", "false");
    // The password is never kept by Query: neither in a key nor in a mutation left in the cache (invariant 1).
    const keys = JSON.stringify(
      queryClient
        .getQueryCache()
        .getAll()
        .map((query) => query.queryKey),
    );
    expect(keys).not.toContain(SEED_PASSWORD);
    await expect.poll(() => queryClient.getMutationCache().getAll()).toHaveLength(0);
  });

  it("goes back to the URL kept by the guard of /collegue (D-11, E-23)", async () => {
    const retour = "/collegue?r1=2026-10-06&editResa=r1%3Ar1b-d%2B1-ungerer";
    const { router } = await renderSwitch(
      `/?r1=2026-10-06&connexion=true&retour=${encodeURIComponent(retour)}`,
    );
    await userEvent.fill(field(), SEED_PASSWORD);
    await userEvent.click(validate());
    await expect.poll(() => router.state.location.href).toBe(retour);
  });
});
