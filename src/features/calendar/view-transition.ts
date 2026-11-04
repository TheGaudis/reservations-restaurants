import type { AnyRouter } from "@tanstack/react-router";

/** Transition asked for a navigation: `false` or the list of types of `page-search.ts` (05 § 3.4). */
type NavigationTransition = AnyRouter["shouldViewTransition"];

/**
 * Waits for a promise of a view transition. The browser rejects `ready` when it skips the transition: another one
 * starts (`AbortError`), the tab is hidden (`InvalidStateError`), the page does not render within 4 s, as when it is
 * unmounted (`TimeoutError`). The update runs all the same: the page has its new state, only the motion is lost.
 */
async function settle(promise: Promise<void>): Promise<void> {
  try {
    await promise;
  } catch {
    // Nothing to show: without this handler the rejection reaches the console as an unhandled rejection.
  }
}

/**
 * The motion is an extra, left out when the visitor asks for less motion or the browser lacks transition types
 * (05 § 3.4). Read at each navigation: the preference can change while the page is open.
 */
function motionAllowed(): boolean {
  return (
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    CSS.supports("selector(:active-view-transition-type(a))")
  );
}

/**
 * Starts the view transition of a calendar navigation in place of `RouterCore.startViewTransition`, which hands
 * `updateCallbackDone` back to the router and leaves `ready` and `finished` without a handler (`router.tsx`).
 * `page-search.ts` passes `false` or a list of types; the router's other forms (`true`, a function of the location
 * change) are not used and navigate without a transition.
 */
export async function startViewTransition(
  update: () => Promise<void>,
  transition: NavigationTransition,
): Promise<void> {
  if (
    typeof transition !== "object" ||
    typeof transition.types === "function" ||
    !motionAllowed()
  ) {
    return update();
  }
  const started = document.startViewTransition({ update, types: transition.types });
  void settle(started.ready);
  // `finished` rejects only with the update, whose error reaches the router through `updateCallbackDone`.
  void settle(started.finished);
  return started.updateCallbackDone;
}
