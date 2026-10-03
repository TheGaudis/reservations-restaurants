import "vitest-browser-react";
import { setupWorker } from "msw/browser";
import { afterAll, afterEach, beforeAll } from "vitest";

// Strict mode: an unhandled request fails the test, so no test can reach the real Apps Script (R-33).
const worker = setupWorker();

beforeAll(async () => {
  await worker.start({ quiet: true, onUnhandledFrame: "error" });
});
afterEach(() => {
  worker.resetHandlers();
});
afterAll(async () => {
  await worker.stop();
});
