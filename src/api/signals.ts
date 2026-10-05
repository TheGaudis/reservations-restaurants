// Fallbacks of `AbortSignal.any` and `AbortSignal.timeout`, missing before Safari 17.4 (R-22). Both run on
// setTimeout and addEventListener, which also lets the tests drive them with fake timers.

/** Reason of an aborted signal, as an `Error` (`AbortError` when the signal was aborted without reason). */
export function abortReason(signal: AbortSignal): Error {
  const reason: unknown = signal.reason;
  return reason instanceof Error ? reason : new DOMException("The read was aborted.", "AbortError");
}

/** Aborts as soon as one of the signals aborts, with that signal's reason. */
export function anySignal(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const aborted = signals.find((signal) => signal.aborted);
  if (aborted !== undefined) {
    controller.abort(abortReason(aborted));
    return controller.signal;
  }
  for (const signal of signals) {
    // The listeners go away with the combined signal (option `signal`, Safari 15).
    signal.addEventListener("abort", () => controller.abort(abortReason(signal)), {
      once: true,
      signal: controller.signal,
    });
  }
  return controller.signal;
}

/** Aborts after `ms` with a `TimeoutError`, like `AbortSignal.timeout`. */
export function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => {
    controller.abort(new DOMException("The read took too long.", "TimeoutError"));
  }, ms);
  return controller.signal;
}

/**
 * Settles like `promise`, or rejects with the reason of `signal` when it aborts first. For a request that
 * cannot take a signal (early fetch): the request goes on, its result is ignored.
 */
export async function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw abortReason(signal);
  const settled = new AbortController(); // drops the listener once the race is over
  const aborted = new Promise<never>((_resolve, reject) => {
    signal.addEventListener(
      "abort",
      () => {
        reject(abortReason(signal));
      },
      { once: true, signal: settled.signal },
    );
  });
  try {
    return await Promise.race([promise, aborted]);
  } finally {
    settled.abort();
  }
}
