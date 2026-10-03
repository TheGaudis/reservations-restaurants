import formatjs from "@formatjs/unplugin/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages project site. Custom domain: BASE_PATH=/
const base = process.env["BASE_PATH"] ?? "/reservations-restaurants/";

export default defineConfig(({ command }) => ({
  base, // Start derives the router basepath from it: never hard-code /reservations-restaurants
  resolve: {
    tsconfigPaths: true, // @/* alias from tsconfig
    // Messages are precompiled to AST by @formatjs/unplugin: every build (production and build:e2e) drops the ICU parser (-7.4 kB gzip)
    alias:
      command === "build"
        ? {
            "@formatjs/icu-messageformat-parser": "@formatjs/icu-messageformat-parser/no-parser.js",
          }
        : {},
  },
  build: { manifest: true, sourcemap: true }, // manifest read by scripts/check-budget.ts
  plugins: [
    tanstackStart({ spa: { enabled: true, prerender: { outputPath: "/index.html" } } }),
    react({ compiler: true }), // after tanstackStart(); requires oxc-transform-react@~0.145.0 (experimental)
    formatjs({ ast: true, preserveWhitespace: true }), // defaultMessage kept (single locale), compiled to AST
  ],
}));
