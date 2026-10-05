import type { AnyRouter } from "@tanstack/react-router";
import { expect } from "vitest";
import { page } from "vitest/browser";
import type { Locator } from "vitest/browser";

import type { Restaurant } from "@/domain/types";
import { renderRoute } from "@/test/render";

// The public page at a URL, on the fake script of the test, once its first read answered (calendars and cards of
// P4 (b)). The test fakes `Date` at TEST_NOW before: the clock that `getRouter()` starts reads it.

/** Renders `/…` and waits for the columns to leave their skeleton. */
export async function renderPublicPage(url: string) {
  const rendered = await renderRoute(url);
  await expect.element(rendered.screen.getByRole("main")).toHaveAttribute("aria-busy", "false");
  await expect.element(rendered.screen.getByRole("grid").first()).toBeVisible();
  return rendered;
}

/** Column of a restaurant (05 § 1): R1 comes first in the page; the staff panels above are sections too. */
export function columnOf(restaurant: Restaurant): Locator {
  const sections = document.querySelectorAll("main section[data-accent]");
  const section = sections.item(restaurant === "r1" ? 0 : 1);
  return page.elementLocator(section);
}

/** Search params of the current location, as the URL writes them (defaults left out), keys sorted. */
export function urlParams(router: AnyRouter): string[] {
  return [...new URLSearchParams(router.state.location.searchStr)]
    .map(([key, value]) => `${key}=${value}`)
    .toSorted();
}
