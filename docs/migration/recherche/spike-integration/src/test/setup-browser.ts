import "vitest-browser-react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { worker } from "@/mocks/browser";

beforeAll(async () => {
  await worker.start({ quiet: true, onUnhandledFrame: "error" });
});
afterEach(() => {
  worker.resetHandlers();
});
afterAll(async () => {
  await worker.stop();
});
