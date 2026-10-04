import { createMemoryHistory } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "vitest-browser-react";

import {
  startClock,
  useClock,
  useIsR2OrderingClosed,
  useToday,
  syncClock,
  watchR2Cutoff,
} from "@/background/clock";
import type { BackgroundDeps } from "@/background/deps";
import { stopBackgroundTasks } from "@/background/start";
import { isR2OrderingClosed } from "@/domain/cutoff";
import { parisDate } from "@/domain/paris";
import { bookingKeys } from "@/mutations/booking-keys";
import { stateKeys } from "@/queries/state";
import { getRouter } from "@/router";
import { useSessionStore } from "@/session/session";
import { TODAY } from "@/test/clock";

const initialClock = useClock.getState();
let stops: Array<() => void> = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
});

afterEach(() => {
  for (const stop of stops) stop();
  stops = [];
  vi.useRealTimers();
  useClock.setState(initialClock, true);
});

function start(at: string): void {
  vi.setSystemTime(Date.parse(at));
  stops.push(startClock());
}

describe("startClock (PLAN § 3.4)", () => {
  it.each([
    ["summer time", "2026-10-05T07:59:30.000Z", "2026-10-05"],
    ["winter time", "2026-11-02T08:59:30.000Z", "2026-11-02"],
  ])("ticks at 10:00 in Paris (%s)", (_, at, day) => {
    start(at);
    expect(useClock.getState().now).toBe(Date.parse(at));
    vi.advanceTimersByTime(29_999);
    expect(useClock.getState().now).toBe(Date.parse(at));
    vi.advanceTimersByTime(1);
    expect(useClock.getState().now).toBe(Date.parse(at) + 30_000);
    expect(isR2OrderingClosed(day, Date.parse(at))).toBe(false);
    expect(isR2OrderingClosed(day, useClock.getState().now)).toBe(true);
  });

  it.each([
    ["summer time", "2026-10-05T21:59:00.000Z", "2026-10-06"],
    ["winter time", "2026-11-02T22:59:00.000Z", "2026-11-03"],
    ["daylight saving change", "2026-10-24T21:59:00.000Z", "2026-10-25"],
  ])("changes today at midnight in Paris (%s)", (_, at, nextDay) => {
    start(at);
    vi.advanceTimersByTime(59_999);
    expect(useClock.getState().now).toBe(Date.parse(at));
    vi.advanceTimersByTime(1);
    expect(parisDate(useClock.getState().now)).toBe(nextDay);
  });

  it("aligns the ticks on the minute, then ticks every minute", () => {
    start("2026-10-05T07:30:12.345Z");
    vi.advanceTimersByTime(47_655);
    expect(useClock.getState().now).toBe(Date.parse("2026-10-05T07:31:00.000Z"));
    vi.advanceTimersByTime(60_000);
    expect(useClock.getState().now).toBe(Date.parse("2026-10-05T07:32:00.000Z"));
  });

  it.each([
    ["visibilitychange", () => document.dispatchEvent(new Event("visibilitychange"))],
    ["pageshow", () => window.dispatchEvent(new PageTransitionEvent("pageshow"))],
  ])("reads the time again on %s (frozen timers, R-26)", (_, dispatch) => {
    start("2026-10-05T07:30:00.000Z");
    vi.setSystemTime(Date.parse("2026-10-05T09:00:00.000Z"));
    dispatch();
    expect(useClock.getState().now).toBe(Date.parse("2026-10-05T09:00:00.000Z"));
  });

  it("stops ticking once stopped", () => {
    start("2026-10-05T07:30:00.000Z");
    for (const stop of stops) stop();
    stops = [];
    vi.advanceTimersByTime(120_000);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(useClock.getState().now).toBe(Date.parse("2026-10-05T07:30:00.000Z"));
  });
});

describe("derived hooks (PLAN § 3.4)", () => {
  it("re-renders useIsR2OrderingClosed only when the value changes", async () => {
    start("2026-10-05T07:57:30.000Z");
    let renders = 0;
    const { result } = await renderHook(() => {
      renders += 1;
      return useIsR2OrderingClosed(TODAY);
    });
    expect(result.current).toBe(false);
    vi.advanceTimersByTime(90_000); // 09:59:00 in Paris: a tick, same value
    await vi.waitFor(() => {
      expect(useClock.getState().now).toBe(Date.parse("2026-10-05T07:59:00.000Z"));
    });
    expect(renders).toBe(1);
    vi.advanceTimersByTime(60_000); // 10:00:00
    await vi.waitFor(() => {
      expect(result.current).toBe(true);
    });
    expect(renders).toBe(2);
  });

  it("follows midnight with useToday", async () => {
    start("2026-10-05T21:59:30.000Z");
    const { result } = await renderHook(() => useToday());
    expect(result.current).toBe("2026-10-05");
    vi.advanceTimersByTime(30_000);
    await vi.waitFor(() => {
      expect(result.current).toBe("2026-10-06");
    });
  });
});

describe("watchR2Cutoff (03 § 5.3, a-7, E-09)", () => {
  async function routerAt(url: string) {
    const router = getRouter();
    stopBackgroundTasks(); // this test drives its own task, with doubles
    router.update({ ...router.options, history: createMemoryHistory({ initialEntries: [url] }) });
    await router.load();
    return router;
  }

  async function watch(url: string, at: string) {
    const router = await routerAt(url);
    const { queryClient } = router.options.context;
    queryClient.setQueryData(stateKeys.public(), { settings: { name2: "Aristide" } });
    const showToast = vi.fn<BackgroundDeps["showToast"]>();
    const navigate = vi.spyOn(router, "navigate");
    const deps: BackgroundDeps = {
      queryClient,
      router,
      session: useSessionStore,
      purgeStaffSession: vi.fn<BackgroundDeps["purgeStaffSession"]>(),
      showToast,
    };
    start(at);
    stops.push(watchR2Cutoff(deps));
    return { router, navigate, showToast };
  }

  it("closes the open R2 form at 10:00 with the neutral toast", async () => {
    const { router, navigate, showToast } = await watch(
      `/?r1=2026-10-07&r2=${TODAY}&reserver=r2`,
      "2026-10-05T07:59:30.000Z",
    );
    vi.advanceTimersByTime(30_000);
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith({
      to: "/",
      search: { r1: "2026-10-07", r2: TODAY, reserver: undefined },
      replace: true,
    });
    expect(showToast).toHaveBeenCalledExactlyOnceWith(
      "Commandes en ligne clôturées à 10h. Venez au restaurant Aristide à partir de 12h pour commander sur place.",
      "neutral",
    );
    vi.useRealTimers();
    await vi.waitFor(() => {
      expect(router.state.location.href).toBe(`/?r1=2026-10-07&r2=${TODAY}`);
    });
  });

  it("closes a form opened on today without r2 in the URL", async () => {
    const { navigate } = await watch("/?reserver=r2", "2026-10-05T07:59:30.000Z");
    vi.advanceTimersByTime(30_000);
    expect(navigate).toHaveBeenCalledOnce();
  });

  it("closes the form when the tab comes back after 10:00", async () => {
    const { navigate, showToast } = await watch(
      `/?r2=${TODAY}&reserver=r2`,
      "2026-10-05T07:00:00.000Z",
    );
    vi.setSystemTime(Date.parse("2026-10-05T09:00:00.000Z"));
    window.dispatchEvent(new PageTransitionEvent("pageshow"));
    expect(navigate).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledOnce();
  });

  it.each([
    ["the R1 form", `/?r1=${TODAY}&reserver=r1`],
    ["an R2 form for tomorrow", "/?r2=2026-10-06&reserver=r2"],
    ["no open form", `/?r2=${TODAY}`],
    ["the staff page", `/collegue?r2=${TODAY}&reserver=r2`],
  ])("leaves %s alone", async (_, url) => {
    const { navigate, showToast } = await watch(url, "2026-10-05T07:59:30.000Z");
    vi.advanceTimersByTime(30_000);
    expect(navigate).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("acts at once when the form reads the time again on sending (04 § 5.3)", async () => {
    const { navigate, showToast } = await watch(
      `/?r2=${TODAY}&reserver=r2`,
      "2026-10-05T07:59:30.000Z",
    );
    // 10:00:01 before the minute timer fires.
    vi.setSystemTime(Date.parse("2026-10-05T08:00:01.000Z"));
    syncClock();
    expect(navigate).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledOnce();
  });

  it("leaves the form of an order already sent: its answer closes it (04 § 6.3)", async () => {
    const { router, navigate, showToast } = await watch(
      `/?r2=${TODAY}&reserver=r2`,
      "2026-10-05T07:59:30.000Z",
    );
    const { queryClient } = router.options.context;
    queryClient.getMutationCache().build(
      queryClient,
      { mutationKey: bookingKeys.r2() },
      {
        context: undefined,
        data: undefined,
        error: null,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        status: "pending",
        variables: undefined,
        submittedAt: Date.now(),
      },
    );
    vi.advanceTimersByTime(30_000);
    expect(navigate).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("shows no toast for a form on a day already closed (URL written by hand)", async () => {
    const { navigate, showToast } = await watch(
      `/?r2=${TODAY}&reserver=r2`,
      "2026-10-05T08:30:00.000Z",
    );
    vi.advanceTimersByTime(60_000);
    expect(navigate).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });
});
