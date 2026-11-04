import { afterEach } from "vitest";

import type { FakeAppsScript, FakeAppsScriptOptions } from "@/mocks/apps-script";
import { listenFakeScript } from "@/mocks/node";

// Node tests: one msw server per test, closed after it.

export const SCRIPT_URL = "https://script.google.com/macros/s/FAKE/exec";

export function fakeScriptPerTest(): (options?: FakeAppsScriptOptions) => FakeAppsScript {
  const closers: Array<() => void> = [];
  afterEach(() => {
    for (const close of closers.splice(0)) {
      close();
    }
  });
  return (options = {}) => {
    const { fakeScript, server } = listenFakeScript(options);
    closers.push(() => {
      server.close();
    });
    return fakeScript;
  };
}
