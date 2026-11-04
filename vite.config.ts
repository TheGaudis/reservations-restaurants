import { basename } from "node:path";

import formatjs from "@formatjs/unplugin/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, runnerImport } from "vite";
import type { CSSModulesOptions, Plugin } from "vite";

// GitHub Pages project site. Custom domain: BASE_PATH=/
const base = process.env["BASE_PATH"] ?? "/reservations-restaurants/";

/**
 * Class names of the CSS Modules: `Header-title` for `.title` of Header.module.css. The static skeleton of index.html
 * writes them by hand; the basenames of the *.module.css files are unique. Shared with vitest.config.ts.
 */
export const cssModules: CSSModulesOptions = {
  generateScopedName: (local, filename) => `${basename(filename, ".module.css")}-${local}`,
};

/**
 * Replaces `<!-- early-fetch -->` of index.html with the inline script `earlyFetchScript` of src/api/early-fetch.ts,
 * before the stylesheets (03 § 2.1, PLAN § 3.3.1 step 2). The module is evaluated by Vite with the env of the mode.
 */
function earlyFetch(): Plugin {
  let script = "";
  return {
    name: "early-fetch",
    async configResolved(config) {
      const define = Object.fromEntries(
        Object.entries(config.env).map(([key, value]) => [
          `import.meta.env.${key}`,
          JSON.stringify(value),
        ]),
      );
      const { module } = await runnerImport<typeof import("@/api/early-fetch")>(
        "/src/api/early-fetch.ts",
        {
          mode: config.mode,
          resolve: { tsconfigPaths: true },
          define,
          logLevel: "silent",
        },
      );
      script = module.earlyFetchScript;
    },
    transformIndexHtml: {
      order: "pre",
      handler: (html) =>
        html.replace("<!-- early-fetch -->", script === "" ? "" : `<script>${script}</script>`),
    },
  };
}

export default defineConfig(({ command }) => ({
  base, // the router reads it as import.meta.env.BASE_URL (src/router.tsx): never hard-code /reservations-restaurants
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
  css: { modules: cssModules },
  // The dependency scan would also read the HTML pages of docs/migration/recherche/.
  optimizeDeps: { entries: ["index.html"] },
  build: { manifest: true, sourcemap: true }, // manifest read by scripts/check-budget.ts
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }), // before react()
    react({ compiler: true }), // requires oxc-transform-react (experimental)
    formatjs({ ast: true, preserveWhitespace: true }), // defaultMessage kept (single locale), compiled to AST
    earlyFetch(),
  ],
}));
