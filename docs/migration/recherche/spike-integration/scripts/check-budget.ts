/// <reference types="node" />
// Initial JS/CSS budget: files referenced by dist/client/index.html (modulepreload, module script, stylesheet), gzipped.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const LIMIT_KB = Number(process.env["BUDGET_KB"] ?? 200);
const html = readFileSync("dist/client/index.html", "utf-8");
const base = process.env["BASE_PATH"] ?? "/reservations-restaurants/";
const urls = new Set(
  [...html.matchAll(/(?:href|src)="([^"]+\.(?:js|css))"/gu)].map((m) =>
    (m[1] ?? "").replace(base, ""),
  ),
);
let total = 0;
for (const url of urls) {
  const size = gzipSync(readFileSync(`dist/client/${url}`), { level: 9 }).length;
  total += size;
  console.log(`${(size / 1024).toFixed(1).padStart(7)} kB  ${url}`);
}
console.log(`${(total / 1024).toFixed(1).padStart(7)} kB  total (limit ${LIMIT_KB} kB)`);
if (total / 1024 > LIMIT_KB) process.exit(1);
