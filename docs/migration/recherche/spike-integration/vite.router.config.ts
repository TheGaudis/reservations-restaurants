import { fileURLToPath } from "node:url";

import formatjs from "@formatjs/unplugin/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Spike only: "Router seul" fallback of PLAN § 2.1, same app code, no Start, no hydration.
export default defineConfig({
  root: "router-only",
  base: "/reservations-restaurants/",
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@formatjs/icu-messageformat-parser": "@formatjs/icu-messageformat-parser/no-parser.js",
      "@/": fileURLToPath(new URL("src/", import.meta.url)),
    },
  },
  build: { outDir: "../dist-router", emptyOutDir: true, manifest: true, sourcemap: true },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "routes",
      generatedRouteTree: "routeTree.gen.ts",
    }),
    react({ compiler: true }),
    formatjs({ ast: true, preserveWhitespace: true }),
  ],
});
