import { setupWorker } from "msw/browser";

import { createFakeAppsScript } from "@/mocks/apps-script";
import type { FakeAppsScript, FakeAppsScriptOptions } from "@/mocks/apps-script";

// msw worker of the `browser` Vitest project, started by setup-browser.ts with a fresh fake script per test.

export const worker = setupWorker();

let current: FakeAppsScript | null = null;

/** Gives the running test a new fake script (seed of parite.md § 2 unless `options.seed`). */
export function installFakeScript(options: FakeAppsScriptOptions = {}): FakeAppsScript {
  worker.resetHandlers();
  current = createFakeAppsScript(options);
  worker.use(...current.handlers);
  return current;
}

/** Fake script of the running test: its tables, the requests it received, failNext, hold. */
export function fakeScript(): FakeAppsScript {
  if (current === null) {
    throw new Error(
      "Aucun faux script : fakeScript() ne s'appelle que pendant un test du projet browser.",
    );
  }
  return current;
}

export function removeFakeScript(): void {
  worker.resetHandlers();
  current = null;
}
