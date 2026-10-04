import { useMutation } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "vitest-browser-react";
import { page } from "vitest/browser";

import { editDayR1 } from "@/api/actions";
import { fetchFullState } from "@/api/state";
import { stopBackgroundTasks } from "@/background/start";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { staffWriteOptions } from "@/mutations/staff/write";
import { stateKeys } from "@/queries/state";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW, TODAY } from "@/test/clock";
import { TestProviders } from "@/test/providers";
import { columnOf, urlParams } from "@/test/public-page";
import { renderRoute } from "@/test/render";

// Route /collegue (PLAN § 3.2, § 3.3.3, § 3.3.4; 06 § 1.4-1.8; 09 G-08, C-10b, C-30; S8), whole app on the fake
// script, at Monday 5 October 2026, 9:30 in Paris. The login itself, which types in a field, is tested in
// features/page/ModeSwitch.test.tsx: here the session opens as the login opens it.

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
});

afterEach(() => {
  stopBackgroundTasks();
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

/** What `useLogin` does on success: the full state under the next session number, then the session (PLAN § 3.3.3). */
async function logIn(queryClient: QueryClient): Promise<void> {
  const id = useSessionStore.getState().id + 1;
  queryClient.setQueryData(stateKeys.staff(id), await fetchFullState(SEED_PASSWORD));
  useSessionStore.getState().open(SEED_PASSWORD);
}

/** The staff page at `url`, the session open as after a login on /. */
async function renderStaffPage(url: string) {
  const rendered = await renderRoute("/");
  await expect.element(rendered.screen.getByRole("main")).toHaveAttribute("aria-busy", "false");
  await logIn(rendered.queryClient);
  await rendered.router.navigate({ href: url });
  await expect.poll(() => rendered.router.state.location.pathname).toBe("/collegue");
  await expect.element(rendered.screen.getByRole("main")).toHaveAttribute("aria-busy", "false");
  return rendered;
}

function validatedSearch(router: AnyRouter): Record<string, unknown> {
  const search: Record<string, unknown> = router.state.matches.at(-1)?.search ?? {};
  return Object.fromEntries(Object.entries(search).filter(([, value]) => value !== undefined));
}

function adminStateCount(): number {
  return fakeScript().requests.filter(
    (request) => (request.json as { action?: string } | null)?.action === "getAdminState",
  ).length;
}

const toast = () => page.getByRole("region", { name: "Notifications" });

describe("guard of /collegue (PLAN § 3.2, 06 § 1.4, E-23)", () => {
  it("opens the login on / without a session, keeping the calendars and the URL to come back to", async () => {
    const url =
      "/collegue?r1=2026-10-06&r2vue=mois&editResa=r1%3Ar1b-d%2B1-ungerer&parametres=true";
    const { router, screen } = await renderRoute(url);
    await expect.poll(() => router.state.location.pathname).toBe("/");
    expect(validatedSearch(router)).toStrictEqual({
      r1: "2026-10-06",
      r1vue: "semaine",
      r2vue: "mois",
      connexion: true,
      retour: "/collegue?r1=2026-10-06&r2vue=mois&editResa=r1%3Ar1b-d%2B1-ungerer&parametres=true",
    });
    // A redirect, not a new history entry: Back does not come back to /collegue.
    expect(router.history.length).toBe(1);
    await expect
      .element(screen.getByRole("button", { name: "Collègue", exact: true }))
      .toHaveAttribute("aria-expanded", "true");
    expect(adminStateCount()).toBe(0);
  });

  it("lets an open session in, on the full state of the login, without reading it again", async () => {
    const { router, screen } = await renderStaffPage("/collegue?r1=2026-10-06");
    expect(adminStateCount()).toBe(1);
    await expect.element(columnOf("r1").getByText("Ouvert par M. Dupont")).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Collègue", exact: true }))
      .toHaveAttribute("aria-pressed", "true");
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-06"]);
  });

  it("reads the full state when the cache lost it (loader)", async () => {
    useSessionStore.getState().open(SEED_PASSWORD);
    const { screen } = await renderRoute(`/collegue?r1=${TODAY}`);
    await expect.element(screen.getByRole("main")).toHaveAttribute("aria-busy", "false");
    await expect.element(columnOf("r1").getByText(/^Ouvert par /u)).toBeVisible();
    expect(adminStateCount()).toBe(1);
  });
});

describe("search params of /collegue (PLAN § 3.2)", () => {
  it("reads every param of the schema, the ids of the fake script included", async () => {
    useSessionStore.getState().open(SEED_PASSWORD);
    const { router } = await renderRoute(
      "/collegue?r1=2026-10-06&r1vue=mois&ouvrir=r2&ouvrirDate=2026-10-20&parametres=true&editJour=r1" +
        "&editResa=r1%3Ar1b-d%2B1-ungerer&ajout=r2%3Ar2i-d0-bowl&ajoutPlat=true&editPlat=r2i-d0-bowl",
    );
    await expect.poll(() => router.state.status).toBe("idle");
    expect(validatedSearch(router)).toStrictEqual({
      r1: "2026-10-06",
      r1vue: "mois",
      r2vue: "semaine",
      ouvrir: "r2",
      ouvrirDate: "2026-10-20",
      parametres: true,
      editJour: "r1",
      editResa: "r1:r1b-d+1-ungerer",
      ajout: "r2:r2i-d0-bowl",
      ajoutPlat: true,
      editPlat: "r2i-d0-bowl",
    });
  });

  it("falls back on damaged values without an error (v.fallback)", async () => {
    useSessionStore.getState().open(SEED_PASSWORD);
    const { router } = await renderRoute(
      "/collegue?ouvrir=r3&ouvrirDate=hier&parametres=1&editJour=r2&editResa=r3%3Ax&ajout=r1%3Ax" +
        "&ajoutPlat=oui&editPlat=a%20b",
    );
    await expect.poll(() => router.state.status).toBe("idle");
    expect(validatedSearch(router)).toStrictEqual({
      r1vue: "semaine",
      r2vue: "semaine",
      parametres: false,
      ajoutPlat: false,
    });
  });
});

describe("staff cards (05 § 4.3, § 5.1, § 6.2)", () => {
  it("says how to open a day without service, in both columns (C-10b)", async () => {
    await renderStaffPage("/collegue?r1=2026-10-07&r2=2026-10-07");
    const message =
      "Aucun jour ouvert. Utilisez le formulaire « Ouvrir un jour » pour en créer un à cette date.";
    await expect.element(columnOf("r1").getByText(message)).toBeVisible();
    await expect.element(columnOf("r2").getByText(message)).toBeVisible();
  });

  it("shows « Ouvert par », the dishes of a voucher day and never « Réserver » (C-10, C-20)", async () => {
    await renderStaffPage(`/collegue?r1=${TODAY}&r2=${TODAY}`);
    await expect.element(columnOf("r1").getByText("12 / 20 couverts")).toBeVisible();
    await expect.element(columnOf("r2").getByText("Ouvert par Mme Martin")).toBeVisible();
    await expect.element(columnOf("r2").getByText(/^Lasagnes/u)).toBeVisible();
    expect(page.getByRole("button", { name: "Réserver" }).query()).toBeNull();
    // No closing note at 10:00 for the staff (06 § 8: no cut-off for them).
    vi.setSystemTime(TEST_NOW + 60 * 60 * 1000);
    expect(page.getByText(/Commandes en ligne clôturées/u).query()).toBeNull();
  });
});

describe("logout (PLAN § 3.3.4, S8)", () => {
  it("purges the cache and the page, closes the panels and says « Retour au mode client. »", async () => {
    // Without `parametres=true`: the filled fields of « Paramètres » freeze a page of `renderRoute` (R-36); REG-29
    // checks that panel after the logout on the built site.
    const { router, queryClient } = await renderStaffPage(
      `/collegue?r1=${TODAY}&r1vue=mois&ouvrir=r1`,
    );
    await expect.element(columnOf("r1").getByText(/^Ouvert par /u)).toBeVisible();
    await page.getByRole("button", { name: "Client", exact: true }).click();
    // Steps 1 and 2 are synchronous: nothing of the session is left once « Client » is handled.
    expect(queryClient.getQueryCache().findAll({ queryKey: stateKeys.staffAll() })).toHaveLength(0);
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
    await expect.element(toast()).toHaveTextContent("Retour au mode client.");
    await expect.poll(() => router.state.location.pathname).toBe("/");
    expect(urlParams(router)).toStrictEqual([`r1=${TODAY}`, "r1vue=mois"]);
    expect(document.body.textContent).not.toContain("Ouvert par");
    await expect
      .element(page.getByRole("button", { name: "Client", exact: true }))
      .toHaveAttribute("aria-pressed", "true");
  });

  it("writes nothing back for a staff write answered after the logout (F-02, E-55)", async () => {
    const { queryClient } = await renderStaffPage(`/collegue?r1=${TODAY}`);
    const { result } = await renderHook(
      () => useMutation(staffWriteOptions({ domain: "days", action: "editR1", write: editDayR1 })),
      {
        wrapper: ({ children }) => (
          <TestProviders queryClient={queryClient}>{children}</TestProviders>
        ),
      },
    );
    const release = fakeScript().hold();
    const sending = result.current.mutateAsync({ date: TODAY, capacity: 18, menu: "", theme: "" });
    await expect
      .poll(() => fakeScript().requests.at(-1)?.json)
      .toMatchObject({ action: "editDayR1" });
    useSessionStore.getState().close("inactivity");
    await expect
      .element(toast())
      .toHaveTextContent("Déconnecté du mode collègue après 10 minutes d'inactivité.");
    release();
    await sending;
    expect(queryClient.getQueryCache().findAll({ queryKey: stateKeys.staffAll() })).toHaveLength(0);
    expect(document.body.textContent).not.toContain("Ouvert par");
  });

  it("keeps the password out of the storages, the URL, the query keys and the console (S8, invariant 1)", async () => {
    const logged: unknown[] = [];
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logged.push(...args);
      });
    }
    // `ouvrir=r1` rather than `parametres=true`: the filled fields of « Paramètres » freeze a page of `renderRoute`
    // (R-36).
    const { router, queryClient } = await renderStaffPage(`/collegue?r1=${TODAY}&ouvrir=r1`);
    await page.getByRole("button", { name: "Client", exact: true }).click();
    await expect.poll(() => router.state.location.pathname).toBe("/");
    const seen = [
      JSON.stringify(Object.entries(localStorage)),
      JSON.stringify(Object.entries(sessionStorage)),
      router.state.location.href,
      router.history.location.href,
      JSON.stringify(
        queryClient
          .getQueryCache()
          .getAll()
          .map((query) => query.queryKey),
      ),
      JSON.stringify(logged, (_key, value: unknown) =>
        value instanceof Error ? value.message : value,
      ),
    ].join("\n");
    expect(seen).not.toContain(SEED_PASSWORD);
    expect(localStorage.getItem("reservations-cache-v1")).not.toBeNull();
  });
});
