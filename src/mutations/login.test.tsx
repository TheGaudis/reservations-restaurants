import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";

import { PasswordRejectedError, ServiceError } from "@/api/errors";
import type { FullState } from "@/domain/types";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { useLogin } from "@/mutations/login";
import { createQueryClient } from "@/queries/client";
import { stateKeys } from "@/queries/state";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { TestProviders } from "@/test/providers";

// Staff login on the fake script (06 § 1.3, 02 § 4.3, PLAN § 3.3.3). The session store starts closed (setup-browser.ts).

function wrapperOf(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <TestProviders queryClient={queryClient}>{children}</TestProviders>
  );
}

async function renderLogin() {
  const queryClient = createQueryClient();
  const { result } = await renderHook(() => useLogin(), { wrapper: wrapperOf(queryClient) });
  return { result, queryClient };
}

function adminStateBodies(): unknown[] {
  return fakeScript()
    .requests.filter((request) => request.method === "POST")
    .map((request) => request.json);
}

describe("useLogin (06 § 1.3)", () => {
  it("puts the full state under the next session number, then opens the session", async () => {
    useSessionStore.setState({ id: 4 });
    const { result, queryClient } = await renderLogin();
    // The cache holds the full state when the session opens: the page never suspends (PLAN § 3.4).
    let cachedAtOpen: unknown;
    const stop = useSessionStore.subscribe(
      (session) => session.password,
      () => {
        cachedAtOpen = queryClient.getQueryData(stateKeys.staff(5));
      },
    );
    await result.current.mutateAsync(SEED_PASSWORD);
    stop();
    expect(useSessionStore.getState()).toMatchObject({ password: SEED_PASSWORD, id: 5 });
    expect((cachedAtOpen as FullState).r1Bookings.length).toBeGreaterThan(0);
    expect(adminStateBodies()).toStrictEqual([
      { action: "getAdminState", password: SEED_PASSWORD },
    ]);
  });

  it("sends the password as typed, spaces and empty value included (06 § 1.3 (2))", async () => {
    const { result } = await renderLogin();
    await expect(result.current.mutateAsync(" secret ")).rejects.toThrow(PasswordRejectedError);
    await expect(result.current.mutateAsync("")).rejects.toThrow(PasswordRejectedError);
    expect(adminStateBodies()).toStrictEqual([
      { action: "getAdminState", password: " secret " },
      { action: "getAdminState", password: "" },
    ]);
  });

  it("leaves the session closed and the cache without full state after a refusal", async () => {
    const { result, queryClient } = await renderLogin();
    await expect(result.current.mutateAsync("faux")).rejects.toThrow("Mot de passe incorrect.");
    expect(useSessionStore.getState()).toMatchObject({ password: null, id: 0, endReason: null });
    expect(queryClient.getQueryCache().findAll({ queryKey: stateKeys.staffAll() })).toHaveLength(0);
  });

  it("rejects with a ServiceError when the script does not answer", async () => {
    fakeScript().failNext("html");
    const { result } = await renderLogin();
    await expect(result.current.mutateAsync(SEED_PASSWORD)).rejects.toThrow(ServiceError);
    expect(useSessionStore.getState().password).toBeNull();
  });

  it("forgets the typed password once reset: no mutation left in the cache (invariant 1)", async () => {
    const { result, queryClient } = await renderLogin();
    await expect(result.current.mutateAsync("faux")).rejects.toThrow(PasswordRejectedError);
    result.current.reset();
    await expect.poll(() => queryClient.getMutationCache().getAll()).toHaveLength(0);
  });
});
