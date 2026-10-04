// Timers and global listeners of the app, outside React (PLAN § 3.4, R-25). Started from getRouter(), in the
// browser only: the shell prerender runs getRouter() in Node (R-02).
import { startClock, watchR2Cutoff } from "@/background/clock";
import type { BackgroundDeps } from "@/background/deps";
import { startInactivity } from "@/background/inactivity";
import { watchLogout } from "@/background/logout";

let stopCurrent: (() => void) | undefined;

/** Idempotent: a second call (tests, HMR) stops the tasks of the first one. Returns the stop. */
export function startBackgroundTasks(deps: BackgroundDeps): () => void {
  stopCurrent?.();
  const stops = [
    startClock(),
    watchR2Cutoff(deps),
    startInactivity(deps.session),
    watchLogout(deps),
  ];
  const stop = (): void => {
    for (const stopTask of stops) stopTask();
    if (stopCurrent === stop) stopCurrent = undefined;
  };
  stopCurrent = stop;
  import.meta.hot?.dispose(stop);
  return stop;
}

/**
 * Stops the tasks that `getRouter()` started: a test that drives one task with its own doubles.
 * @internal exported for the tests
 */
export function stopBackgroundTasks(): void {
  stopCurrent?.();
}
