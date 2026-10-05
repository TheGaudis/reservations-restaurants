import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages "project site" : https://<user>.github.io/<repo>/
const base = process.env["BASE_PATH"] ?? "/";

export default defineConfig({
  base,
  resolve: { tsconfigPaths: true },
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
        // GitHub Pages sert index.html ; 404.html (copie) gère le deep-linking
        prerender: { outputPath: "/index.html" },
      },
    }),
    // après tanstackStart() ; React Compiler via oxc-transform-react (peer optionnelle)
    react({ compiler: true }),
  ],
});
