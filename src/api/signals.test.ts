import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { abortable, abortReason, anySignal, timeoutSignal } from "@/api/signals";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("anySignal (R-22)", () => {
  it("aborts with the reason of the first signal that aborts", () => {
    const a = new AbortController();
    const b = new AbortController();
    const signal = anySignal(a.signal, b.signal);
    expect(signal.aborted).toBe(false);
    const reason = new Error("b");
    b.abort(reason);
    expect(signal.reason).toBe(reason);
    a.abort(new Error("a"));
    expect(signal.reason).toBe(reason);
  });

  it("starts aborted when a signal already is", () => {
    const a = new AbortController();
    a.abort();
    const signal = anySignal(new AbortController().signal, a.signal);
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBeInstanceOf(DOMException);
  });
});

describe("timeoutSignal (R-22)", () => {
  it("aborts after the delay with a TimeoutError, not before", async () => {
    const signal = timeoutSignal(30_000);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(signal.aborted).toBe(true);
    expect(abortReason(signal).name).toBe("TimeoutError");
  });
});

describe("abortable", () => {
  it("settles like the promise", async () => {
    await expect(abortable(Promise.resolve(1), new AbortController().signal)).resolves.toBe(1);
    await expect(
      abortable(Promise.reject(new TypeError("x")), new AbortController().signal),
    ).rejects.toThrow(TypeError);
  });

  it("rejects with the reason of the signal when it aborts first", async () => {
    const controller = new AbortController();
    const late = new Promise((resolve) => {
      setTimeout(resolve, 60_000);
    });
    const pending = abortable(late, controller.signal);
    const reason = new DOMException("late", "TimeoutError");
    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
  });

  it("rejects at once on an aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(abortable(Promise.resolve(1), controller.signal)).rejects.toThrow(DOMException);
  });
});
