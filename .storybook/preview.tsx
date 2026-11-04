import addonA11y from "@storybook/addon-a11y";
import { definePreview } from "@storybook/react-vite";
import { QueryClient } from "@tanstack/react-query";
import { http, passthrough } from "msw";
import addonMsw from "msw-storybook-addon";
import { setupWorker } from "msw/browser";

import { createFakeAppsScript } from "@/mocks/apps-script";
import { createQueryClient } from "@/queries/client";
import { TestProviders } from "@/test/providers";
import type { Accent } from "@/test/providers";

import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/print.css";

function accentOf(value: unknown): Accent | undefined {
  return value === "r1" || value === "r2" ? value : undefined;
}

function queryClientOf(value: unknown): QueryClient {
  if (value instanceof QueryClient) return value;
  throw new TypeError("Le loader de .storybook/preview.tsx n'a pas créé de QueryClient.");
}

// Strict mode (R-33): requests to Storybook or Vite pass through, the fake script answers the Apps Script URL,
// any other request gets an error response and never reaches the network.
async function startStrictWorker() {
  const worker = setupWorker(http.all(`${location.origin}/*`, () => passthrough()));
  await worker.start({ quiet: true, onUnhandledFrame: "error" });
  return worker;
}

export default definePreview({
  addons: [addonA11y(), addonMsw(startStrictWorker)],
  // Every story is a test of the `storybook` Vitest project: an axe violation fails it (PLAN § 1.5, S5).
  parameters: { a11y: { test: "error" } },
  globalTypes: {
    accent: {
      description: "Accent du restaurant (08 § 2)",
      toolbar: {
        title: "Accent",
        dynamicTitle: true,
        items: [
          { value: "none", title: "Bleu (en-tête, panneaux du haut)" },
          { value: "r1", title: "R1 (vert)" },
          { value: "r2", title: "R2 (magenta)" },
        ],
      },
    },
  },
  // A story sets its accent with `globals: { accent: "r1" }`.
  initialGlobals: { accent: "none" },
  // A fresh fake script per story; a story that needs `hold`, `failNext` or a seed adds its own instance in its
  // `beforeEach`: msw tries the handlers added last first.
  // A new QueryClient per story (PLAN § 3.1); a play function reads it as `loaded.queryClient`.
  loaders: [() => ({ queryClient: createQueryClient() })],
  beforeEach: ({ msw }) => {
    msw.use(...createFakeAppsScript().handlers);
  },
  decorators: [
    (Story, { globals, loaded }) => (
      <TestProviders
        queryClient={queryClientOf(loaded["queryClient"])}
        accent={accentOf(globals["accent"])}
      >
        <Story />
      </TestProviders>
    ),
  ],
});
