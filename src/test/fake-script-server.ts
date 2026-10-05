import { afterEach } from "vitest";

import type { FakeAppsScript, FakeAppsScriptOptions } from "@/mocks/apps-script";
import { listenFakeScript } from "@/mocks/node";

// Helpers of the fake script's own tests: one msw server per test, closed after it.

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

export async function getState(query = ""): Promise<Record<string, unknown>> {
  const response = await fetch(SCRIPT_URL + query);
  return (await response.json()) as Record<string, unknown>;
}

export async function postAction(body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });
  return (await response.json()) as Record<string, unknown>;
}

/** Protected action with the seed's password (`SEED_PASSWORD`). */
export async function postStaff(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return postAction({ password: "secret", ...body });
}

/** Rows of one table of a response (`r1Days`, `r2Items`…). */
export function rowsOf(
  state: Record<string, unknown>,
  table: string,
): Array<Record<string, unknown>> {
  return state[table] as Array<Record<string, unknown>>;
}
