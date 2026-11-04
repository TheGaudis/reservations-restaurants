import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/api/errors";
import { hedgedRead } from "@/api/hedged-read";

// 02 § 1.5 and E-45 with fake timers advanced explicitly. Each attempt is a promise the test settles by hand.

interface Call {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
}

function attempts() {
  const calls: Call[] = [];
  const attempt = async () =>
    new Promise<string>((resolve, reject) => {
      calls.push({ resolve, reject });
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
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
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

  it.each([0, 1])("keeps the first answer (attempt %i)", async (winner) => {
    const { calls, attempt } = attempts();
    const read = hedgedRead(attempt);
    await vi.advanceTimersByTimeAsync(7000);
    calls[winner]?.resolve(`answer ${String(winner)}`);
    calls[1 - winner]?.resolve("too late");
    await expect(read).resolves.toBe(`answer ${String(winner)}`);
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

  it("gives up each attempt after 30 s, then fails with a ServiceError (E-45)", async () => {
    const { calls, attempt } = attempts();
    const outcome = watch(hedgedRead(attempt));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(outcome).toStrictEqual({});
    calls[0]?.resolve("after its 30 s");
    await vi.advanceTimersByTimeAsync(5999);
    expect(outcome).toStrictEqual({});
    await vi.advanceTimersByTimeAsync(1);
    expect(outcome.error).toBeInstanceOf(ServiceError);
  });
});

describe("hedgedRead of the early fetch (02 § 1.5, 03 § 2.4)", () => {
  it("hedges for the rest of the 6 s counted from the early fetch", async () => {
    const early = attempts();
    const { calls, attempt } = attempts();
    const startedAt = performance.now();
    await vi.advanceTimersByTimeAsync(4000);
    watch(hedgedRead(attempt, { response: early.attempt(), startedAt }));
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1999);
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(1);
  });
});
