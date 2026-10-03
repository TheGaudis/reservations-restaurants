import { createMemoryHistory } from "@tanstack/react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { useClock } from "@/background/clock";
import type { BackgroundDeps } from "@/background/deps";
import { startBackgroundTasks } from "@/background/start";
import { INACTIVITY_MS } from "@/domain/constants";
import { getRouter } from "@/router";
import { useSessionStore } from "@/session/session";
import { TEST_NOW } from "@/test/clock";

const initialSession = useSessionStore.getState();
const initialClock = useClock.getState();
let stop: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(TEST_NOW);
});

afterEach(() => {
  stop?.();
  vi.useRealTimers();
  useSessionStore.setState(initialSession, true);
  useClock.setState(initialClock, true);
});

async function deps(): Promise<BackgroundDeps> {
  const router = getRouter();
  router.update({ ...router.options, history: createMemoryHistory({ initialEntries: ["/"] }) });
  await router.load();
  return {
    queryClient: router.options.context.queryClient,
    router,
    session: useSessionStore,
    purgeStaffSession: vi.fn<BackgroundDeps["purgeStaffSession"]>(),
    showToast: vi.fn<BackgroundDeps["showToast"]>(),
  };
}

it("starts the clock, the inactivity timer and the logout steps", async () => {
  const tasks = await deps();
  stop = startBackgroundTasks(tasks);
  expect(useClock.getState().now).toBe(TEST_NOW);
  useSessionStore.getState().open("secret");
  vi.advanceTimersByTime(INACTIVITY_MS);
  expect(useSessionStore.getState().endReason).toBe("inactivity");
  expect(tasks.purgeStaffSession).toHaveBeenCalledOnce();
  expect(tasks.showToast).toHaveBeenCalledOnce();
});

it("is idempotent: a second start stops the first one (R-25)", async () => {
  const first = await deps();
  const second = await deps();
  startBackgroundTasks(first);
  stop = startBackgroundTasks(second);
  expect(vi.getTimerCount()).toBe(1); // a single clock timer
  useSessionStore.getState().open("secret");
  useSessionStore.getState().close("logout");
  expect(first.purgeStaffSession).not.toHaveBeenCalled();
  expect(second.purgeStaffSession).toHaveBeenCalledOnce();
  expect(second.showToast).toHaveBeenCalledOnce();
});

it("stops every task", async () => {
  const tasks = await deps();
  startBackgroundTasks(tasks)();
  expect(vi.getTimerCount()).toBe(0);
  useSessionStore.getState().open("secret");
  vi.advanceTimersByTime(INACTIVITY_MS);
  expect(useSessionStore.getState().password).toBe("secret");
  useSessionStore.getState().close("logout");
  expect(tasks.purgeStaffSession).not.toHaveBeenCalled();
});

it("keeps the second instance when the first stop runs late", async () => {
  const stopFirst = startBackgroundTasks(await deps());
  const second = await deps();
  stop = startBackgroundTasks(second);
  stopFirst();
  useSessionStore.getState().open("secret");
  useSessionStore.getState().close("logout");
  expect(second.purgeStaffSession).toHaveBeenCalledOnce();
});
