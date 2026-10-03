import { getResponse } from "msw";

import { createFakeAppsScript } from "@/mocks/apps-script";
import type { FakeAppsScript, FakeAppsScriptOptions } from "@/mocks/apps-script";

/** Handle that puts the real `fetch` back. */
export interface FakeScriptServer {
  readonly close: () => void;
}

/** Error of an aborted request: the signal's reason, as `fetch` rejects with it. */
function abortError(signal: AbortSignal): Error {
  const reason: unknown = signal.reason;
  return reason instanceof Error
    ? reason
    : new DOMException("This operation was aborted", "AbortError");
}

async function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    if (signal.aborted) {
      reject(abortError(signal));
      return;
    }
    signal.addEventListener(
      "abort",
      () => {
        reject(abortError(signal));
      },
      { once: true },
    );
  });
}

/**
 * Fake script behind `fetch` in Node tests (projects `node` and `node-ny`). `fetch` is replaced by a function that
 * hands each request to the fake script's handlers in memory: no socket is opened, so no request can reach the
 * network (R-33). msw/node is not used here: with msw 3, a request aborted by the test (hedged read) fell through
 * to a real connection to script.google.com. A request that no handler answers throws. Call `server.close()`
 * after the test.
 */
export function listenFakeScript(options: FakeAppsScriptOptions = {}): {
  fakeScript: FakeAppsScript;
  server: FakeScriptServer;
} {
  const fakeScript = createFakeAppsScript(options);
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const response = await Promise.race([
      getResponse(fakeScript.handlers, request),
      rejectOnAbort(request.signal),
    ]);
    if (response === undefined) {
      throw new Error(`R-33: no handler for ${request.method} ${request.url}`);
    }
    if (response.type === "error") throw new TypeError("fetch failed");
    return response;
  };
  return {
    fakeScript,
    server: {
      close: () => {
        globalThis.fetch = realFetch;
      },
    },
  };
}
