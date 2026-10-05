import { expect, test } from "../fixtures";
import { BLOCKED_FONT_PRELOAD, columnTitle, gotoHome, logo } from "../pages/home";
import { pauseClock } from "./helpers";

// Easter egg (09 § 7, D-01).

const VIDEO = "https://youtu.be/dQw4w9WgXcQ?list=RDdQw4w9WgXcQ";

test.use({ fixedTime: null });

test.beforeEach(({ consoleLog }) => {
  consoleLog.allow(BLOCKED_FONT_PRELOAD);
});

test(
  "easterEgg (REG-43)",
  { tag: ["@parity", "@09-7", "@p4"] },
  async ({ page, context, isolation }) => {
    await pauseClock(page);
    // Every `window.open` of the page, with its arguments and what it returned.
    await page.addInitScript(() => {
      const opened: Array<{ args: unknown[]; returned: string }> = [];
      const open = window.open.bind(window);
      window.open = (...args: Parameters<typeof window.open>) => {
        const result = open(...args);
        opened.push({ args, returned: result === null ? "null" : "window" });
        return result;
      };
      Object.assign(window, { e2eOpened: opened });
    });
    const popups: string[] = [];
    context.on("page", (popup) => popups.push(popup.url()));
    await gotoHome(page);
    await expect(columnTitle(page, "r1")).toHaveText("Restaurant Pédagogique");

    // Five clicks spread over 3 s: never five within 2 s.
    for (let click = 0; click < 5; click += 1) {
      if (click > 0) await page.clock.runFor(750);
      await logo(page).click();
    }
    await page.clock.runFor(2500);

    // Five clicks within 1.6 s: the video opens in a new tab, without opener.
    const popup = context.waitForEvent("page");
    for (let click = 0; click < 5; click += 1) {
      if (click > 0) await page.clock.runFor(400);
      await logo(page).click();
    }
    await popup;
    const opened = await page.evaluate(
      () =>
        (window as unknown as { e2eOpened: Array<{ args: unknown[]; returned: string }> })
          .e2eOpened,
    );
    expect(opened).toHaveLength(1);
    const [{ args, returned } = { args: [], returned: "" }] = opened;
    expect(args.slice(0, 2)).toStrictEqual([VIDEO, "_blank"]);
    expect(args[2]).toMatch(/\bnoopener\b/u);
    // With `noopener`, the page gets no handle on the new tab.
    expect(returned).toBe("null");
    expect(popups).toHaveLength(1);
    // The video is never loaded: the network isolation stopped it on this machine.
    await expect.poll(() => isolation.blocked).toContain(VIDEO);
  },
);
