import { afterEach, describe, expect, it } from "vitest";
import { cdp } from "vitest/browser";

import { startViewTransition } from "@/features/calendar/view-transition";

// View transitions of the calendar navigations (05 § 3.4), started in place of the router's (router.tsx).

const unhandled: unknown[] = [];
function recordUnhandled(event: PromiseRejectionEvent): void {
  unhandled.push(event.reason);
}
window.addEventListener("unhandledrejection", recordUnhandled);

async function emulateReducedMotion(reduce: boolean): Promise<void> {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: reduce ? "reduce" : "no-preference" }],
  });
}

afterEach(async () => {
  unhandled.length = 0;
  await emulateReducedMotion(false);
});

/** Update of a navigation, like the router's: `step` changes the page, then the update ends. */
function updateBy(step: () => void): () => Promise<void> {
  return async () => {
    step();
    await Promise.resolve();
  };
}

/** Next frame: a skipped transition has settled its promises two frames later. */
async function nextFrame(): Promise<void> {
  await new Promise<number>((resolve) => {
    requestAnimationFrame(resolve);
  });
}

describe("startViewTransition", () => {
  it("starts a transition with the types of the navigation", async () => {
    let typed = false;
    const update = updateBy(() => {
      typed = document.documentElement.matches(":active-view-transition-type(r1-next)");
    });
    await startViewTransition(update, { types: ["r1-next"] });
    expect(typed).toBe(true);
  });

  it.each([false, undefined, true])("navigates without a transition for %s", async (transition) => {
    // Without a transition the update runs at once; a transition first captures the page as it is.
    let updated = false;
    const navigation = startViewTransition(
      updateBy(() => {
        updated = true;
      }),
      transition,
    );
    expect(updated).toBe(true);
    await navigation;
  });

  it("navigates without a transition when the visitor asks for less motion (05 § 3.4)", async () => {
    await emulateReducedMotion(true);
    let updated = false;
    const navigation = startViewTransition(
      updateBy(() => {
        updated = true;
      }),
      { types: ["r1-next"] },
    );
    expect(updated).toBe(true);
    await navigation;
  });

  it("skips a transition that another one replaces, without an unhandled rejection", async () => {
    const updated: string[] = [];
    const first = startViewTransition(
      updateBy(() => updated.push("first")),
      { types: ["r1-day-next"] },
    );
    const second = startViewTransition(
      updateBy(() => updated.push("second")),
      { types: ["r1-day-prev"] },
    );
    await Promise.all([first, second]);
    await nextFrame();
    await nextFrame();
    // The skipped navigation still updated the page: only its motion is lost.
    expect(updated).toStrictEqual(["first", "second"]);
    expect(unhandled).toStrictEqual([]);
  });
});
