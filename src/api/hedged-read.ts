import { asError, ServiceError } from "@/api/errors";
import { HEDGE_DELAY_MS, READ_TIMEOUT_MS } from "@/domain/constants";

/** `response`, or a `ServiceError` once `ms` have passed (E-45). */
async function capped<T>(response: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_resolve, reject) => {
    setTimeout(() => {
      reject(new ServiceError("The read took too long."));
    }, ms);
  });
  return Promise.race([response, timeout]);
}

/**
 * `hedgedRead` of 02 § 1.5, for reads only: when the first attempt has not answered after 6 s, a second, identical
 * attempt starts; the first answer wins, and the read fails only when every attempt started has failed, with the last
 * error. An attempt fails after 30 s (E-45). `early` (03 § 2.4) is the first attempt, its 6 s and 30 s counted from
 * its start. Nothing is aborted: an attempt that lost, or whose query was cancelled, runs to its end unseen. The
 * retry after 1.5 s belongs to TanStack Query (`retryRead`, PLAN § 3.3).
 */
export async function hedgedRead<T>(
  attempt: () => Promise<T>,
  early?: { response: Promise<T>; startedAt: number } | null,
): Promise<T> {
  const elapsed = early ? performance.now() - early.startedAt : 0;
  return new Promise<T>((resolve, reject) => {
    let running = 0;
    let over = false;
    const watch = async (response: Promise<T>, ms: number) => {
      running += 1;
      try {
        const value = await capped(response, ms);
        over = true;
        resolve(value);
      } catch (error) {
        running -= 1;
        if (running > 0) return;
        over = true;
        reject(asError(error));
      }
    };
    // Set first: with an early fetch older than 30 s, the second attempt starts before the first one fails.
    setTimeout(() => {
      if (!over) void watch(attempt(), READ_TIMEOUT_MS);
    }, HEDGE_DELAY_MS - elapsed);
    void watch(early?.response ?? attempt(), READ_TIMEOUT_MS - elapsed);
  });
}
