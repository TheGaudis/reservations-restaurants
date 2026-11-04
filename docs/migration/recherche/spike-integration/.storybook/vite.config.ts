import formatjs from "@formatjs/unplugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Storybook's Vite config: the root vite.config.ts carries tanstackStart(), which breaks the Storybook build.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react(), formatjs({ ast: true, preserveWhitespace: true })],
});
