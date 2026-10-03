import { http, passthrough } from "msw";
import { setupWorker } from "msw/browser";

import { createFakeAppsScript } from "@/mocks/apps-script";
import { createSeed } from "@/mocks/fixtures/seed";

// Paris date of the page load: under `pnpm dev`, the seed surrounds the developer's today.
function parisToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(Date.now());
}

/**
 * Fake script for `pnpm dev` (PLAN § 3.11). Requests to the dev server (modules, page navigations) pass through;
 * the fake script answers the Apps Script URL; any other request gets an error response and never reaches the
 * network (R-33).
 */
export async function startDevWorker(): Promise<void> {
  const fakeScript = createFakeAppsScript({ seed: createSeed(parisToday()) });
  const worker = setupWorker(
    http.all(`${location.origin}/*`, () => passthrough()),
    ...fakeScript.handlers,
  );
  await worker.start({
    quiet: true,
    onUnhandledFrame: "error",
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}
