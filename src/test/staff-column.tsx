import type { ReactNode } from "react";
import { expect } from "vitest";
import { page } from "vitest/browser";

import type { Restaurant } from "@/domain/types";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { renderColumn } from "@/test/column-page";

// One staff column (calendar, then `content`) on the fake script of the test, the session open with the password of
// the seed: the page reads the full state itself (journal p5a, « Tests et stories »). Forms focus their fields, hence
// `renderColumn` rather than `renderRoute` (R-36).

/** The column of `restaurant` at `url` in staff mode; resolves once its calendar is there. */
export async function renderStaffColumn(url: string, restaurant: Restaurant, content: ReactNode) {
  useSessionStore.getState().open(SEED_PASSWORD);
  return renderColumn(url, restaurant, content);
}

/** Bodies of the POST requests received by the fake script, in order. */
function posts(): Array<Record<string, unknown>> {
  return fakeScript()
    .requests.filter((request) => request.method === "POST")
    .map((request) => request.json as Record<string, unknown>);
}

/** Bodies of the POST requests of one action. */
export function actionPosts(action: string): Array<Record<string, unknown>> {
  return posts().filter((body) => body["action"] === action);
}

/** The toast region of `TestToaster`. */
function toasts() {
  return page.getByRole("region", { name: "Notifications" });
}

/** Waits for a toast with exactly this text. */
export async function expectToast(text: string) {
  await expect.element(toasts().getByText(text, { exact: true })).toBeVisible();
}
