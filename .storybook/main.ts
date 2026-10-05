import { defineMain } from "@storybook/react-vite/node";

export default defineMain({
  framework: {
    name: "@storybook/react-vite",
    // The root vite.config.ts carries tanstackStart(), which breaks the Storybook build (PLAN P3, R-28).
    options: { builder: { viteConfigPath: ".storybook/vite.config.ts" } },
  },
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-vitest", "msw-storybook-addon"],
  // public/mockServiceWorker.js: the msw worker of the stories.
  staticDirs: ["../public"],
  core: { disableTelemetry: true },
});
