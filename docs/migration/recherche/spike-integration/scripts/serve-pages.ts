/// <reference types="node" />
// GitHub Pages emulator: static files under --base, folder -> index.html, otherwise 404.html with status 404.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    root: { type: "string", default: "dist/client" },
    base: { type: "string", default: "/reservations-restaurants/" },
    port: { type: "string", default: "5180" },
  },
});
const root = path.resolve(values.root);
const base = values.base;
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".map": "application/json",
};
http
  .createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith(base)) {
      res.writeHead(404);
      res.end("gh 404");
      return;
    }
    let file = path.join(root, decodeURIComponent(url.pathname.slice(base.length)));
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, "index.html");
    }
    if (fs.existsSync(file)) {
      res.writeHead(200, {
        "content-type": types[path.extname(file)] ?? "application/octet-stream",
        "cache-control": "max-age=600",
      });
      fs.createReadStream(file).pipe(res);
      return;
    }
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    fs.createReadStream(path.join(root, "404.html")).pipe(res);
  })
  .listen(Number(values.port), () =>
    console.log(`serving ${root} at http://localhost:${values.port}${base}`),
  );
