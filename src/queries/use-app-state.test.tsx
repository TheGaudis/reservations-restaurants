import type { QueryClient } from "@tanstack/react-query";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";

import { createQueryClient } from "@/queries/client";
import { publicStateOptions, stateKeys } from "@/queries/state";
import { APP_START, useAppState, useIsFromCache } from "@/queries/use-app-state";
import type { AppState } from "@/queries/use-app-state";
import { useSessionStore } from "@/session/session";
import { bookingR1, fullState, publicState, SETTINGS } from "@/test/domain-states";
import { TestProviders } from "@/test/providers";

// State shown by the page (PLAN § 3.3.1, step 5; § 3.3.4, step 3), on a real QueryClient and the fake script.

const initialSession = useSessionStore.getState();

beforeEach(() => {
  useSessionStore.setState(initialSession, true);
});

function wrapperOf(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <TestProviders queryClient={queryClient}>
      <Suspense fallback={null}>{children}</Suspense>
    </TestProviders>
  );
}

const shownName = (state: AppState) => state.settings.name1;
const isFull = (state: AppState) => "r1Bookings" in state;

describe("useAppState (PLAN § 3.3)", () => {
  it("shows the public state outside a staff session", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(
      publicStateOptions.queryKey,
      publicState({ settings: { ...SETTINGS, name1: "Public" } }),
    );
    const { result } = await renderHook(() => useAppState(shownName), {
      wrapper: wrapperOf(queryClient),
    });
    expect(result.current).toBe("Public");
  });

  it("switches to the full state when the session opens, and back to the public state when it closes", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(publicStateOptions.queryKey, publicState());
    const { result, act } = await renderHook(() => useAppState(isFull), {
      wrapper: wrapperOf(queryClient),
    });
    expect(result.current).toBe(false);
    // Login (PLAN § 3.3.3): the full state is in the cache before the session opens.
    queryClient.setQueryData(
      stateKeys.staff(1),
      fullState({ r1Bookings: [bookingR1("r1b", "2026-10-06")] }),
    );
    await act(() => {
      useSessionStore.getState().open("secret");
    });
    expect(result.current).toBe(true);
    await act(() => {
      useSessionStore.getState().close("logout");
    });
    expect(result.current).toBe(false);
  });
});

describe("useIsFromCache (G-02)", () => {
  it("is true for a restored copy, false once a read of the script succeeds", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(publicStateOptions.queryKey, publicState({ etag: "ancien" }), {
      updatedAt: APP_START - 60_000,
    });
    void queryClient.invalidateQueries({
      queryKey: publicStateOptions.queryKey,
      refetchType: "none",
    });
    const { result } = await renderHook(() => useIsFromCache(), {
      wrapper: wrapperOf(queryClient),
    });
    expect(result.current).toBe(true);
    // The stale copy is read again at mount: the fake script answers with the seed.
    await expect.poll(() => result.current).toBe(false);
    expect(queryClient.getQueryData(publicStateOptions.queryKey)?.etag).toBe("E1");
  });
});
