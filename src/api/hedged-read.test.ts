import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hedgedRead } from "@/api/hedged-read";
import { abortReason } from "@/api/signals";

// 02 § 1.5 and E-45 with fake timers advanced explicitly. Each attempt is a promise the test settles by hand;
// like a fetch, it rejects when its signal aborts.

interface Call {
  signal: AbortSignal;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
}

function attempts() {
  const calls: Call[] = [];
  const attempt = async (signal: AbortSignal) =>
    new Promise<string>((resolve, reject) => {
      calls.push({ signal, resolve, reject });
      signal.addEventListener("abort", () => {
        reject(abortReason(signal));
      });
    });
  return { calls, attempt };
}

/** Records how the read settled, without awaiting it. */
function watch(read: Promise<string>) {
  const outcome: { value?: string; error?: unknown } = {};
  const settle = async () => {
    try {
      outcome.value = await read;
    } catch (error) {
      outcome.error = error;
    }
  };
  void settle();
  return outcome;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("hedgedRead (02 § 1.5)", () => {
  it("starts a second, identical attempt at 6 000 ms, not before", async () => {
    const { calls, attempt } = attempts();
    watch(hedgedRead(attempt));
    await vi.advanceTimersByTimeAsync(5999);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toHaveLength(2);
  });

  it("never hedges a read that answers within 6 s", async () => {
    const { calls, attempt } = attempts();
    const read = hedgedRead(attempt);
    await vi.advanceTimersByTimeAsync(3000);
    calls[0]?.resolve("first");
    await expect(read).resolves.toBe("first");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(calls).toHaveLength(1);
  });

  it.each([
    [0, 1],
    [1, 0],
  ])("keeps the first answer (attempt %i) and aborts the other one", async (winner, loser) => {
    const { calls, attempt } = attempts();
    const read = hedgedRead(attempt);
    await vi.advanceTimersByTimeAsync(7000);
    calls[winner]?.resolve(`answer ${String(winner)}`);
    calls[loser]?.resolve("too late");
    await expect(read).resolves.toBe(`answer ${String(winner)}`);
    expect(calls[loser]?.signal.aborted).toBe(true);
  });

  it("waits for the other attempt when one fails, fails when both have failed", async () => {
    const { calls, attempt } = attempts();
    const outcome = watch(hedgedRead(attempt));
    await vi.advanceTimersByTimeAsync(7000);
    calls[0]?.reject(new TypeError("first"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(outcome).toStrictEqual({});
    const last = new TypeError("second");
    calls[1]?.reject(last);
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toStrictEqual({ error: last });
  });

  it("succeeds when the second attempt answers after the first failed", async () => {
    const { calls, attempt } = attempts();
    const read = hedgedRead(attempt);
    await vi.advanceTimersByTimeAsync(6500);
    calls[0]?.reject(new TypeError("first"));
    calls[1]?.resolve("second");
    await expect(read).resolves.toBe("second");
  });

  it("fails at once, without hedge, when the only attempt fails before 6 s", async () => {
    const { calls, attempt } = attempts();
    const outcome = watch(hedgedRead(attempt));
    await vi.advanceTimersByTimeAsync(2000);
    const error = new TypeError("Failed to fetch");
    calls[0]?.reject(error);
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toStrictEqual({ error });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(calls).toHaveLength(1);
  });

  it("abandons each attempt after 30 s, then fails with a TimeoutError (E-45)", async () => {
    const { calls, attempt } = attempts();
    const outcome = watch(hedgedRead(attempt));
    await vi.advanceTimersByTimeAsync(29_999);
    expect(calls.map((call) => call.signal.aborted)).toStrictEqual([false, false]);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls.map((call) => call.signal.aborted)).toStrictEqual([true, false]);
    expect(outcome).toStrictEqual({});
    await vi.advanceTimersByTimeAsync(6000);
    expect(calls[1]?.signal.aborted).toBe(true);
    expect(outcome.error).toBeInstanceOf(DOMException);
    expect(outcome.error).toHaveProperty("name", "TimeoutError");
  });

  it("rejects and aborts every attempt when the caller aborts", async () => {
    const { calls, attempt } = attempts();
    const controller = new AbortController();
    const outcome = watch(hedgedRead(attempt, { signal: controller.signal }));
    await vi.advanceTimersByTimeAsync(6000);
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls.every((call) => call.signal.aborted)).toBe(true);
    expect(outcome.error).toHaveProperty("name", "AbortError");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toHaveLength(2);
  });

  it("starts nothing for a caller that already aborted", async () => {
    const { calls, attempt } = attempts();
    const controller = new AbortController();
    controller.abort();
    await expect(hedgedRead(attempt, { signal: controller.signal })).rejects.toThrow(DOMException);
    expect(calls).toHaveLength(0);
  });
});

describe("hedgedRead of the early fetch (02 § 1.5, 03 § 2.4)", () => {
  it("hedges for the rest of the 6 s counted from the early fetch", async () => {
    const early = attempts();
    const { calls, attempt } = attempts();
    watch(hedgedRead(attempt, { first: { attempt: early.attempt, elapsedMs: 4000 } }));
    expect([early.calls.length, calls.length]).toStrictEqual([1, 0]);
    await vi.advanceTimersByTimeAsync(1999);
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(1);
  });

  it("hedges at once an early fetch older than 6 s, and abandons it at 30 s from its start", async () => {
    const early = attempts();
    const { calls, attempt } = attempts();
    watch(hedgedRead(attempt, { first: { attempt: early.attempt, elapsedMs: 7000 } }));
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(22_999);
    expect(early.calls[0]?.signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(early.calls[0]?.signal.aborted).toBe(true);
    expect(calls[0]?.signal.aborted).toBe(false);
  });

  it("keeps the answer of the early fetch and aborts the hedge", async () => {
    const early = attempts();
    const { calls, attempt } = attempts();
    const read = hedgedRead(attempt, { first: { attempt: early.attempt, elapsedMs: 5000 } });
    await vi.advanceTimersByTimeAsync(1500);
    early.calls[0]?.resolve("early");
    await expect(read).resolves.toBe("early");
    expect(calls[0]?.signal.aborted).toBe(true);
  });
});
