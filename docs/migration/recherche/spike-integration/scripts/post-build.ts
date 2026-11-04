/// <reference types="node" />
// GitHub Pages: 404.html = SPA shell (deep links); the msw worker never ships.
import { copyFileSync, rmSync } from "node:fs";

copyFileSync("dist/client/index.html", "dist/client/404.html");
rmSync("dist/client/mockServiceWorker.js", { force: true });
