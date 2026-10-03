import { http, passthrough } from "msw";
import { setupWorker } from "msw/browser";

/**
 * Fake script for `pnpm dev` (PLAN § 3.11). Requests to the dev server (modules, page navigations) pass through;
 * any other unhandled request gets an error response and never reaches the network (R-33).
 */
export async function startDevWorker(): Promise<void> {
  const worker = setupWorker(http.all(`${location.origin}/*`, () => passthrough()));
  await worker.start({
    quiet: true,
    onUnhandledFrame: "error",
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}
