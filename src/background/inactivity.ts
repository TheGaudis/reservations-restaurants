// Staff session closed after 10 minutes of inactivity (06 § 1.6, PLAN § 3.4). Activity only writes a variable
// (no render); a single timer checks the timestamps when it fires, so a device that slept closes the session as
// soon as it wakes up. Timers slow down in a hidden tab: `visibilitychange` and `pageshow` check again (R-26).
import { INACTIVITY_MS } from "@/domain/constants";
import type { SessionStore } from "@/session/session";

/** Activity of 06 § 1.6. Scrolling, focus and automatic refreshes do not count. */
const ACTIVITY_EVENTS = ["click", "keydown", "mousemove", "touchstart"] as const;

/** Listens from now on; the timer runs while a session is open. Returns the stop. */
export function startInactivity(session: SessionStore): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  let lastActivity = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const check = (): void => {
    clearTimeout(timer);
    timer = undefined;
    if (session.getState().password === null) return;
    const remaining = INACTIVITY_MS - (Date.now() - lastActivity);
    if (remaining > 0) timer = setTimeout(check, remaining);
    else session.getState().close("inactivity");
  };

  const noteActivity = (): void => {
    lastActivity = Date.now();
  };
  // Capture phase: a component that stops the propagation of a key or a click still counts as activity.
  for (const type of ACTIVITY_EVENTS) {
    document.addEventListener(type, noteActivity, { capture: true, passive: true, signal });
  }
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "visible") check();
    },
    { signal },
  );
  window.addEventListener("pageshow", check, { signal });

  // Login counts as activity; logout disarms the timer (PLAN § 3.3.4, step 7).
  const unsubscribe = session.subscribe(
    (s) => s.password !== null,
    (loggedIn) => {
      if (loggedIn) noteActivity();
      check();
    },
    { fireImmediately: true },
  );

  return () => {
    controller.abort();
    unsubscribe();
    clearTimeout(timer);
  };
}
