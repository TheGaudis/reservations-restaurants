import { defineNetworkFixture } from "@msw/playwright";
import type { NetworkFixture } from "@msw/playwright";
import { test as base } from "@playwright/test";
import { http, HttpResponse, passthrough } from "msw";
import type { AnyHandler } from "msw";

import { handlers as appsScriptHandlers } from "@/mocks/apps-script";

interface Fixtures {
  handlers: AnyHandler[];
  network: NetworkFixture;
}

export const test = base.extend<Fixtures>({
  handlers: [appsScriptHandlers, { option: true }],
  network: [
    async ({ context, handlers }, use) => {
      const network = defineNetworkFixture({
        context,
        handlers: [
          ...handlers,
          http.get(
            /fonts\.(googleapis|gstatic)\.com/u,
            () => new HttpResponse(null, { status: 404 }),
          ),
          http.all(/localhost/u, () => passthrough()),
        ],
      });
      await network.enable();
      await use(network);
      await network.disable();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
