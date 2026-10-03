import formatjs from "@formatjs/unplugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Storybook's own Vite config: same transforms as vitest.config.ts, without the Start plugin (PLAN § 3.1).
export default defineConfig({
  mode: "test", // .env.test: fake Apps Script URL (PLAN § 3.11)
  resolve: { tsconfigPaths: true },
  plugins: [react(), formatjs({ ast: true, preserveWhitespace: true })],
});
