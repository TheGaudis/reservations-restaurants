import type { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BackgroundDeps } from "@/background/deps";
import { afterLogout, watchLogout } from "@/background/logout";
import { stateKeys } from "@/queries/state";
import { getRouter } from "@/router";
import { useSessionStore } from "@/session/session";
import type { SessionEnd } from "@/session/session";

const initialSession = useSessionStore.getState();
const STAFF_KEY = ["state", "staff", 1] as const;

afterEach(() => {
  useSessionStore.setState(initialSession, true);
});

// Same steps as queries/purge.ts (PLAN § 3.3.4, step 2), which this session does not write.
function purgeDouble(queryClient: QueryClient): void {
  void queryClient.cancelQueries({ queryKey: ["state", "staff"] });
  queryClient.removeQueries({ queryKey: ["state", "staff"] });
  queryClient.getMutationCache().clear();
}

async function depsAt(url: string) {
  const router = getRouter();
  router.update({ ...router.options, history: createMemoryHistory({ initialEntries: [url] }) });
  await router.load();
  const { queryClient } = router.options.context;
  queryClient.setQueryData(stateKeys.public(), { settings: { name2: "Aristide" } });
  queryClient.setQueryData(STAFF_KEY, { r1Bookings: [{ name: "Cyrille Ungerer" }] });
  const deps: BackgroundDeps = {
    queryClient,
    router,
    session: useSessionStore,
    purgeStaffSession: vi.fn(purgeDouble),
    showToast: vi.fn<BackgroundDeps["showToast"]>(),
  };
  return { deps, router, queryClient };
}

describe("afterLogout (PLAN § 3.3.4)", () => {
  it("purges the staff state and reads the public state again (steps 2 and 4)", async () => {
    const { deps, queryClient } = await depsAt("/");
    afterLogout(deps, "logout");
    expect(deps.purgeStaffSession).toHaveBeenCalledExactlyOnceWith(queryClient);
    expect(queryClient.getQueryCache().findAll({ queryKey: ["state", "staff"] })).toStrictEqual([]);
    expect(queryClient.getQueryState(stateKeys.public())?.isInvalidated).toBe(true);
    expect(queryClient.getQueryData(stateKeys.public())).toStrictEqual({
      settings: { name2: "Aristide" },
    });
  });

  it.each<[SessionEnd, string, string]>([
    ["logout", "Retour au mode client.", "neutral"],
    ["inactivity", "Déconnecté du mode collègue après 10 minutes d'inactivité.", "neutral"],
    ["password-changed", "Le mot de passe du mode collègue a changé. Reconnectez-vous.", "error"],
  ])("shows the toast of %s (06 § 1.5-1.7, step 5)", async (reason, message, type) => {
    const { deps } = await depsAt("/");
    afterLogout(deps, reason);
    expect(deps.showToast).toHaveBeenCalledExactlyOnceWith(message, type);
  });

  it("leaves /collegue for / with the calendars only (step 6, a-13, a-14)", async () => {
    const { deps, router } = await depsAt(
      "/collegue?r1=2026-10-07&r1vue=mois&r2periode=2026-11-02&parametres=true&editResa=r1%3AB1&ouvrir=r2",
    );
    const invalidate = vi.spyOn(router, "invalidate");
    afterLogout(deps, "inactivity");
    expect(invalidate).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
    });
    expect(router.state.location.href).toBe("/?r1=2026-10-07&r1vue=mois&r2periode=2026-11-02");
    expect(router.history.length).toBe(1);
  });

  it("reloads the current route outside /collegue (step 6)", async () => {
    const { deps, router } = await depsAt("/?r1=2026-10-07&connexion=true");
    const invalidate = vi.spyOn(router, "invalidate");
    const navigate = vi.spyOn(router, "navigate");
    afterLogout(deps, "password-changed");
    expect(invalidate).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("watchLogout", () => {
  it("runs afterLogout once per closed session, with its reason", async () => {
    const { deps, queryClient } = await depsAt("/");
    const stop = watchLogout(deps);
    useSessionStore.getState().open("secret");
    expect(deps.purgeStaffSession).not.toHaveBeenCalled();
    useSessionStore.getState().close("inactivity");
    useSessionStore.getState().close("logout");
    stop();
    expect(deps.purgeStaffSession).toHaveBeenCalledOnce();
    expect(deps.showToast).toHaveBeenCalledExactlyOnceWith(
      "Déconnecté du mode collègue après 10 minutes d'inactivité.",
      "neutral",
    );
    expect(queryClient.getQueryData(STAFF_KEY)).toBeUndefined();
  });

  it("does nothing once stopped", async () => {
    const { deps } = await depsAt("/");
    watchLogout(deps)();
    useSessionStore.getState().open("secret");
    useSessionStore.getState().close("logout");
    expect(deps.purgeStaffSession).not.toHaveBeenCalled();
  });
});
