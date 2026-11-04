import { http, HttpResponse } from "msw";

import publicState from "@/mocks/fixtures/public-state.json" with { type: "json" };

const APPS_SCRIPT_PATTERN = "https://script.google.com/macros/s/:deployment/exec";

export const posts: unknown[] = [];

export const handlers = [
  http.get(APPS_SCRIPT_PATTERN, ({ request }) => {
    const since = new URL(request.url).searchParams.get("since");
    if (since === publicState.etag) {
      return HttpResponse.json({ unchanged: true, etag: publicState.etag });
    }
    return HttpResponse.json(publicState);
  }),
  http.post(APPS_SCRIPT_PATTERN, async ({ request }) => {
    const body: unknown = JSON.parse(await request.text());
    posts.push({ contentType: request.headers.get("content-type"), body });
    return HttpResponse.json({ ...publicState, _duplicate: false });
  }),
];
