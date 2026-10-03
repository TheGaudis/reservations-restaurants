import { asError } from "@/api/errors";
import { abortReason, anySignal, timeoutSignal } from "@/api/signals";
import { HEDGE_DELAY_MS, READ_TIMEOUT_MS } from "@/domain/constants";

/** One read attempt; it must stop when `signal` aborts. */
export type ReadAttempt<T> = (signal: AbortSignal) => Promise<T>;

export interface HedgeOptions<T> {
  /** Signal of the caller (TanStack Query): aborting it rejects the read and aborts every attempt. */
  signal?: AbortSignal | undefined;
  /** Attempt started earlier (early fetch, 03 § 2.1) and its age: the hedge and its timeout count from its start. */
  first?: { attempt: ReadAttempt<T>; elapsedMs: number } | null | undefined;
}

/**
 * `hedgedRead` of 02 § 1.5, for reads only: when the first attempt has not answered after 6 s, a second,
 * identical attempt starts; the first answer wins and the other attempt is aborted; the read fails only when
 * every attempt started has failed, with the last error. Each attempt is abandoned after 30 s (E-45).
 * The single retry after 1.5 s belongs to TanStack Query (`retryRead`, PLAN § 3.3).
 */
export async function hedgedRead<T>(
  attempt: ReadAttempt<T>,
  { signal, first }: HedgeOptions<T> = {},
): Promise<T> {
  if (signal?.aborted === true) throw abortReason(signal);
  const elapsedMs = first?.elapsedMs ?? 0;
  return new Promise<T>((resolve, reject) => {
    // Aborted when the read settles: stops the losing attempt, the hedge and the listener on `signal`.
    const over = new AbortController();
    let running = 0;
    const settle = (outcome: () => void) => {
      if (over.signal.aborted) return;
      over.abort();
      outcome();
    };
    const launch = async (run: ReadAttempt<T>, timeoutMs: number) => {
      running += 1;
      const signals = [over.signal, timeoutSignal(timeoutMs)];
      if (signal !== undefined) signals.push(signal);
      try {
        const value = await run(anySignal(...signals));
        settle(() => {
          resolve(value);
        });
      } catch (error) {
        running -= 1;
        if (running === 0) {
          settle(() => {
            reject(asError(error));
          });
        }
      }
    };

    if (signal !== undefined) {
      signal.addEventListener(
        "abort",
        () => {
          settle(() => {
            reject(abortReason(signal));
          });
        },
        { once: true, signal: over.signal },
      );
    }
    const hedge = setTimeout(
      () => {
        if (!over.signal.aborted) void launch(attempt, READ_TIMEOUT_MS);
      },
      Math.max(0, HEDGE_DELAY_MS - elapsedMs),
    );
    over.signal.addEventListener("abort", () => {
      clearTimeout(hedge);
    });
    if (first) void launch(first.attempt, Math.max(0, READ_TIMEOUT_MS - elapsedMs));
    else void launch(attempt, READ_TIMEOUT_MS);
  });
}
