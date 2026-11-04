import { expect, it } from "vitest";

import { APPS_SCRIPT_URL } from "@/config";
import { posts } from "@/mocks/apps-script";

it("msw service worker intercepts GET and POST text/plain to script.google.com", async () => {
  const get = await fetch(`${APPS_SCRIPT_URL}?since=Xq3v0Gk1bWq9u2yYc5n3tA`);
  expect(await get.json()).toStrictEqual({ unchanged: true, etag: "Xq3v0Gk1bWq9u2yYc5n3tA" });
  const post = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "addBookingR1", requestId: "r-1" }),
  });
  expect(((await post.json()) as { _duplicate: boolean })._duplicate).toBe(false);
  expect(posts).toStrictEqual([
    { contentType: "text/plain;charset=utf-8", body: { action: "addBookingR1", requestId: "r-1" } },
  ]);
  expect(navigator.serviceWorker.controller?.scriptURL).toMatch(/mockServiceWorker\.js$/u);
});

it("strict mode: an unhandled request is answered with an error response", async () => {
  const response = await fetch("https://example.org/unhandled").catch((error: unknown) => error);
  expect(response instanceof Response ? response.status : String(response)).toBe(500);
});
