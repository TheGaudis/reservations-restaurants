import { defineMain } from "@storybook/react-vite/node";

export default defineMain({
  framework: "@storybook/react-vite", // reads the root vite.config.ts
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-vitest", "msw-storybook-addon"],
  // public/mockServiceWorker.js: the msw worker of the stories.
  staticDirs: ["../public"],
  core: { disableTelemetry: true },
  // .env.test in every mode: the fake Apps Script URL (PLAN § 3.11).
  viteFinal: (config) => ({ ...config, mode: "test" }),
});
