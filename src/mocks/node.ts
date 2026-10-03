import { setupServer } from "msw/node";
import type { SetupServer } from "msw/node";

import { createFakeAppsScript } from "@/mocks/apps-script";
import type { FakeAppsScript, FakeAppsScriptOptions } from "@/mocks/apps-script";

/**
 * Fake script behind `fetch` in Node tests (projects `node` and `node-ny`). Strict: a request that no handler
 * answers fails the test and never reaches the network (R-33). Call `server.close()` after the test.
 */
export function listenFakeScript(options: FakeAppsScriptOptions = {}): {
  fakeScript: FakeAppsScript;
  server: SetupServer;
} {
  const fakeScript = createFakeAppsScript(options);
  const server = setupServer(...fakeScript.handlers);
  server.listen({ onUnhandledFrame: "error" });
  return { fakeScript, server };
}
