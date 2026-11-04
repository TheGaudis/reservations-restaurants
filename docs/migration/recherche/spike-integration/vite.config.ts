import formatjs from "@formatjs/unplugin/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages project site. Custom domain: BASE_PATH=/
const base = process.env["BASE_PATH"] ?? "/reservations-restaurants/";
const noParser = process.env["SPIKE_KEEP_PARSER"] !== "1";

export default defineConfig(({ mode }) => ({
  base,
  resolve: {
    tsconfigPaths: true,
    alias:
      mode === "production" && noParser
        ? {
            "@formatjs/icu-messageformat-parser": "@formatjs/icu-messageformat-parser/no-parser.js",
          }
        : {},
  },
  build: { manifest: true, sourcemap: true },
  plugins: [
    tanstackStart({ spa: { enabled: true, prerender: { outputPath: "/index.html" } } }),
    react({ compiler: true }),
    formatjs({ ast: true, preserveWhitespace: true }),
  ],
}));
