import formatjs from "@formatjs/unplugin/vite";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// No tanstackStart() here: routes are tested with the committed routeTree.gen.ts.
const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE"]; // cloud sessions: /opt/pw-browsers/chromium

// One fresh object per project: Vitest must not share a browser config between projects.
const browser = () => ({
  enabled: true,
  headless: true,
  provider: playwright({
    contextOptions: { locale: "fr-FR", timezoneId: "Europe/Paris" },
    ...(executablePath === undefined ? {} : { launchOptions: { executablePath } }),
  }),
  instances: [{ browser: "chromium" as const }],
});

// Directories whose tests need a DOM (PLAN § 3.1); a .tsx test runs in the browser wherever it lives.
const BROWSER_DIRS = "src/{background,ui,features,routes,mutations}/**";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react(), formatjs({ ast: true, preserveWhitespace: true })],
  // Prebundled up front: a cold Vite cache otherwise reloads the browser page in the middle of a run.
  // Base UI: the components wrapped in ui/ (PLAN § 3.5).
  optimizeDeps: {
    include: [
      "react-intl",
      "@tanstack/react-query",
      "@tanstack/react-form",
      "valibot",
      "msw/browser",
      "@base-ui/react/button",
      "@base-ui/react/checkbox",
      "@base-ui/react/collapsible",
      "@base-ui/react/field",
      "@base-ui/react/fieldset",
      "@base-ui/react/input",
      "@base-ui/react/number-field",
      "@base-ui/react/popover",
      "@base-ui/react/radio",
      "@base-ui/react/radio-group",
      "@base-ui/react/toast",
      "@base-ui/react/toggle",
      "@base-ui/react/toggle-group",
    ],
  },
  test: {
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          env: { TZ: "Europe/Paris" },
          include: ["src/**/*.test.ts"],
          exclude: [`${BROWSER_DIRS}/*`],
        },
      },
      {
        extends: true,
        test: {
          name: "node-ny",
          environment: "node",
          env: { TZ: "America/New_York" },
          include: ["src/{domain,intl}/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["src/**/*.test.tsx", `${BROWSER_DIRS}/*.test.ts`],
          setupFiles: ["src/test/setup-browser.ts"],
          browser: browser(),
        },
      },
      // storybookTest replaces test.include with the stories of .storybook/main.ts: a project of its own, without
      // setupFiles (msw runs through msw-storybook-addon in .storybook/preview.tsx).
      {
        extends: true,
        plugins: [storybookTest({ configDir: ".storybook" })],
        test: { name: "storybook", browser: browser() },
      },
    ],
  },
});
