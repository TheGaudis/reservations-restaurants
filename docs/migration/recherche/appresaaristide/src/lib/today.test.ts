import { afterEach, describe, expect, test, vi } from "vitest";
import { getToday, subscribeToday } from "./today";

afterEach(() => {
  vi.useRealTimers();
});

describe("today", () => {
  test("notifies subscribers once the clock passes midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 24, 23, 59, 0));
    const listener = vi.fn();
    const unsubscribe = subscribeToday(listener);
    expect(getToday()).toBe("2026-09-24");

    vi.advanceTimersByTime(30_000);
    expect(listener).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getToday()).toBe("2026-09-25");

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getToday()).toBe("2026-09-26");

    unsubscribe();
    expect(vi.getTimerCount()).toBe(0);
  });
});
