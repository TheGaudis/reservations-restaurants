import "vitest-browser-react";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";

import { useSessionStore } from "@/session/session";
import { installFakeScript, removeFakeScript, worker } from "@/test/browser-fake-script";
import { clearFocusRequest } from "@/ui/pending-focus";

// Staff session closed at the start of each test: the store is a module singleton (R-25).
const initialSession = useSessionStore.getState();

// Strict mode: a request that no handler answers fails the test, so no test can reach the real Apps Script (R-33).
beforeAll(async () => {
  await worker.start({ quiet: true, onUnhandledFrame: "error" });
});
// One fake script per test (PLAN P1): tables, requests and failures never leak from a test to the next; nor does a
// focus request that the test ended before an element took (ui/pending-focus.ts).
beforeEach(() => {
  installFakeScript();
  useSessionStore.setState(initialSession, true);
  clearFocusRequest();
});
afterEach(() => {
  removeFakeScript();
});
afterAll(async () => {
  await worker.stop();
});
