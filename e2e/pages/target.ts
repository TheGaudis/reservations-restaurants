import { test } from "@playwright/test";
import type { TestInfo } from "@playwright/test";

/** Site under test, from the Playwright project name: the only switch between variants (PLAN P1). */
export type Target = "legacy" | "react";

export type Restaurant = "r1" | "r2";

export function target(testInfo: TestInfo): Target {
  return testInfo.project.name === "legacy" ? "legacy" : "react";
}

/** Target of the running test, for page objects that only receive the page. */
export function currentTarget(): Target {
  return target(test.info());
}

/** Error thrown by a page object whose body a later session writes; the scenario fails with its name. */
export function notWritten(phase: string, name: string): Error {
  return new Error(`Page object ${name} : à écrire en ${phase}.`);
}
