import formatjs from "@formatjs/unplugin/vite";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// No tanstackStart() here: routes are tested with the committed routeTree.gen.ts.
const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE"]; // cloud sessions: /opt/pw-browsers/chromium
const browser = () => ({
  enabled: true,
  headless: true,
  provider: playwright(executablePath === undefined ? {} : { launchOptions: { executablePath } }),
  instances: [{ browser: "chromium" as const }],
});

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react(), formatjs({ ast: true, preserveWhitespace: true })],
  test: {
    restoreMocks: true,
    projects: [
      { extends: true, test: { name: "node", environment: "node", include: ["src/**/*.test.ts"] } },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["src/test/setup-browser.ts"],
          browser: browser(),
        },
      },
      // storybookTest replaces test.include with the stories of .storybook/main.ts: its own project.
      {
        extends: true,
        plugins: [storybookTest({ configDir: ".storybook" })],
        test: { name: "storybook", browser: browser() },
      },
    ],
  },
});
