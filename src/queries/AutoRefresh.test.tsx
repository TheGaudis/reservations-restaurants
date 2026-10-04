import { focusManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { AutoRefresh } from "@/queries/AutoRefresh";
import { createQueryClient } from "@/queries/client";
import { publicStateOptions, stateKeys } from "@/queries/state";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { fullState, publicState } from "@/test/domain-states";
import { TestProviders } from "@/test/providers";

// Refresh of the state shown (PLAN § 3.3.2, 03 § 5.1, E-08): every 3 minutes, paused while the tab is hidden and
// caught up when it comes back. Only the interval timer and the date are faked: the fake script answers for real.

const initialSession = useSessionStore.getState();

function reads(): number {
  return fakeScript().requests.filter((request) => request.method === "GET").length;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  focusManager.setFocused(undefined);
  useSessionStore.setState(initialSession, true);
});

async function mount() {
  const queryClient = createQueryClient();
  queryClient.setQueryData(publicStateOptions.queryKey, publicState());
  await render(
    <TestProviders queryClient={queryClient}>
      <AutoRefresh />
    </TestProviders>,
  );
  return queryClient;
}

describe("AutoRefresh", () => {
  it("reads the public state every 3 minutes", async () => {
    await mount();
    expect(reads()).toBe(0);
    vi.advanceTimersByTime(179_999);
    expect(reads()).toBe(0);
    vi.advanceTimersByTime(1);
    await expect.poll(reads).toBe(1);
    vi.advanceTimersByTime(180_000);
    await expect.poll(reads).toBe(2);
  });

  it("skips the refresh while the tab is hidden and reads once when it comes back (03 § 5.1)", async () => {
    await mount();
    focusManager.setFocused(false);
    vi.advanceTimersByTime(360_000);
    expect(reads()).toBe(0);
    focusManager.setFocused(true);
    await expect.poll(reads).toBe(1);
  });

  it("refreshes the full state while a staff session is open (06 § 1.8)", async () => {
    const queryClient = await mount();
    queryClient.setQueryData(stateKeys.staff(1), fullState());
    useSessionStore.getState().open("secret");
    await expect
      .poll(() =>
        queryClient
          .getQueryCache()
          .find({ queryKey: stateKeys.staff(1) })
          ?.getObserversCount(),
      )
      .toBe(1);
    const publicQuery = queryClient.getQueryCache().find({ queryKey: publicStateOptions.queryKey });
    expect(publicQuery?.getObserversCount()).toBe(0);
  });
});
