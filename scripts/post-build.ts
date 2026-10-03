/// <reference types="node" />
// GitHub Pages serves 404.html for any unknown path: the SPA shell must answer deep links (PLAN § 3.1).
// The msw worker is a development and test tool: it never ships (R-28).
import { copyFileSync, rmSync } from "node:fs";

const OUT_DIR = "dist/client";

copyFileSync(`${OUT_DIR}/index.html`, `${OUT_DIR}/404.html`);
rmSync(`${OUT_DIR}/mockServiceWorker.js`, { force: true });
console.log(`${OUT_DIR}: 404.html written, mockServiceWorker.js removed`);
