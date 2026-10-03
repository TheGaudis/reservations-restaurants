import type { TestInfo } from "@playwright/test";

/** Site under test, from the Playwright project name: the only switch between variants (PLAN P1). */
export type Target = "legacy" | "react";

export type Restaurant = "r1" | "r2";

export function target(testInfo: TestInfo): Target {
  return testInfo.project.name === "legacy" ? "legacy" : "react";
}

/** Error thrown by a page object whose body a later session writes; the scenario fails with its name. */
export function notWritten(phase: string, name: string): Error {
  return new Error(`Page object ${name} : à écrire en ${phase}.`);
}
