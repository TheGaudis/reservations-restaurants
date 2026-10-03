/// <reference types="node" />
// GitHub Pages emulator (R-03: `vite preview` does real SSR). Serves --root under --base like Pages does:
// a folder without its trailing slash redirects to it, a folder serves its index.html, a file serves itself,
// anything else gets 404.html with status 404 (the SPA shell for deep links).
// Port: the environment variable named by --port-env when it is set (parallel E2E runs), otherwise --port.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import type { ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    root: { type: "string", default: "dist/client" },
    base: { type: "string", default: "/reservations-restaurants/" },
    port: { type: "string", default: "4311" },
    "port-env": { type: "string" },
  },
});

const root = resolve(values.root);
const base = values.base;
const portFromEnv = values["port-env"] === undefined ? undefined : process.env[values["port-env"]];
const port = Number(portFromEnv ?? values.port);

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
};

function sendFile(res: ServerResponse, file: string, status: number): void {
  res.writeHead(status, {
    "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream",
    "cache-control": "max-age=600", // Pages caches for 10 min
  });
  createReadStream(file).pipe(res);
}

function sendNotFound(res: ServerResponse): void {
  const page = join(root, "404.html");
  if (existsSync(page)) {
    sendFile(res, page, 404);
    return;
  }
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("404");
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const pathname = decodeURIComponent(url.pathname);
  if (`${pathname}/` === base) {
    res.writeHead(301, { location: `${base}${url.search}` });
    res.end();
    return;
  }
  if (!pathname.startsWith(base)) {
    sendNotFound(res);
    return;
  }
  const file = resolve(root, `.${sep}${pathname.slice(base.length)}`);
  if (file !== root && !file.startsWith(`${root}${sep}`)) {
    sendNotFound(res);
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!pathname.endsWith("/")) {
      res.writeHead(301, { location: `${pathname}/${url.search}` });
      res.end();
      return;
    }
    const index = join(file, "index.html");
    if (existsSync(index)) sendFile(res, index, 200);
    else sendNotFound(res);
    return;
  }
  if (existsSync(file)) sendFile(res, file, 200);
  else sendNotFound(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`serving ${root} at http://127.0.0.1:${port}${base}`);
});
