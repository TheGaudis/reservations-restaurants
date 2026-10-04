import type { QueryClient } from "@tanstack/react-query";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";

import { createQueryClient } from "@/queries/client";
import { publicStateOptions, stateKeys } from "@/queries/state";
import {
  APP_START,
  useAppState,
  useIsFromCache,
  useLoadedAppState,
  usePublicReadStatus,
} from "@/queries/use-app-state";
import type { AppState } from "@/queries/use-app-state";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
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

/** A read of the script outside any observer (as AutoRefresh does); a failure stays in the query. */
async function read(queryClient: QueryClient): Promise<void> {
  await queryClient.query({ ...publicStateOptions, staleTime: 0 }).catch(() => null);
}

/** The local copy as restoreLocalCache leaves it: dated before the page load, stale. */
function restoredCopy(): QueryClient {
  const queryClient = createQueryClient();
  queryClient.setQueryData(publicStateOptions.queryKey, publicState({ etag: "ancien" }), {
    updatedAt: APP_START - 60_000,
  });
  void queryClient.invalidateQueries({
    queryKey: publicStateOptions.queryKey,
    refetchType: "none",
  });
  return queryClient;
}
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
  it("is false before any data, without suspending nor reading (header of the skeleton)", async () => {
    const { result } = await renderHook(() => useIsFromCache(), {
      wrapper: wrapperOf(createQueryClient()),
    });
    expect(result.current).toBe(false);
    expect(fakeScript().requests).toStrictEqual([]);
  });

  it("is true for a restored copy, false once a read of the script succeeds", async () => {
    const queryClient = restoredCopy();
    const { result } = await renderHook(() => useIsFromCache(), {
      wrapper: wrapperOf(queryClient),
    });
    expect(result.current).toBe(true);
    // AutoRefresh reads the script (here, by hand): the fake script answers with the seed.
    await read(queryClient);
    await expect.poll(() => result.current).toBe(false);
    expect(queryClient.getQueryData(publicStateOptions.queryKey)?.etag).toBe("E1");
  });
});

describe("reads (PLAN § 3.3.2)", () => {
  it("never reads the script when a component mounts: AutoRefresh alone schedules the reads", async () => {
    const queryClient = restoredCopy();
    await renderHook(
      () => [useAppState(shownName), useIsFromCache(), useLoadedAppState(shownName)],
      {
        wrapper: wrapperOf(queryClient),
      },
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    expect(fakeScript().requests).toStrictEqual([]);
  });

  it("gives nothing before any data, without suspending nor reading", async () => {
    const queryClient = createQueryClient();
    const { result } = await renderHook(() => useLoadedAppState(shownName), {
      wrapper: wrapperOf(queryClient),
    });
    expect(result.current).toBeUndefined();
    expect(fakeScript().requests).toStrictEqual([]);
  });
});

describe("usePublicReadStatus (G-03, 03 § 3, § 5.2)", () => {
  it("reports a failure before any success, over the local copy, and keeps it while reading again", async () => {
    const queryClient = restoredCopy();
    queryClient.setQueryDefaults(publicStateOptions.queryKey, { retry: false });
    const { result } = await renderHook(() => usePublicReadStatus(), {
      wrapper: wrapperOf(queryClient),
    });
    expect(result.current).toMatchObject({ failed: false, fromCache: true });
    fakeScript().failNext("error");
    await read(queryClient);
    await expect.poll(() => result.current.failed).toBe(true);
    expect(result.current.fromCache).toBe(true);
    // « Réessayer »: the box stays during the read, then goes with the first success.
    const release = fakeScript().hold();
    const retried = result.current.retry();
    await expect.poll(() => queryClient.isFetching()).toBe(1);
    expect(result.current.failed).toBe(true);
    release();
    await retried;
    await expect.poll(() => result.current).toMatchObject({ failed: false, fromCache: false });
  });

  it("keeps the failure while reading again without data (TanStack Query goes back to pending)", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryDefaults(publicStateOptions.queryKey, { retry: false });
    fakeScript().failNext("error");
    await read(queryClient);
    const { result } = await renderHook(() => usePublicReadStatus(), {
      wrapper: wrapperOf(queryClient),
    });
    expect(result.current).toMatchObject({ failed: true, fromCache: false });
    const release = fakeScript().hold();
    const retried = result.current.retry();
    await expect
      .poll(() => queryClient.getQueryState(publicStateOptions.queryKey)?.status)
      .toBe("pending");
    expect(result.current.failed).toBe(true);
    release();
    await retried;
    await expect.poll(() => result.current.failed).toBe(false);
  });

  it("stays silent after a first success (03 § 5.2)", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryDefaults(publicStateOptions.queryKey, { retry: false });
    queryClient.setQueryData(publicStateOptions.queryKey, publicState());
    const { result } = await renderHook(() => usePublicReadStatus(), {
      wrapper: wrapperOf(queryClient),
    });
    fakeScript().failNext("error");
    await read(queryClient);
    expect(queryClient.getQueryState(publicStateOptions.queryKey)?.status).toBe("error");
    expect(result.current).toMatchObject({ failed: false, fromCache: false });
  });
});
