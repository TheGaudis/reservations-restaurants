/// <reference types="node" />
// Initial budget of a public visitor on / (PLAN § 1.5, S3), read from the Vite manifest of dist/client:
// JS = client entry + chunk of the / route + their static imports; CSS = stylesheets of those chunks and of the entry.
// Sizes are gzip level 9. Fails above 200 kB of JS or 25 kB of CSS.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

import * as v from "valibot";

const OUT_DIR = "dist/client";
const JS_LIMIT_KB = 200;
const CSS_LIMIT_KB = 25;

const ManifestSchema = v.record(
  v.string(),
  v.object({
    file: v.string(),
    isEntry: v.optional(v.boolean()),
    imports: v.optional(v.array(v.string())),
    css: v.optional(v.array(v.string())),
    assets: v.optional(v.array(v.string())),
  }),
);

const manifest = v.parse(
  ManifestSchema,
  JSON.parse(readFileSync(`${OUT_DIR}/.vite/manifest.json`, "utf-8")),
);

const entryKey = Object.keys(manifest).find((key) => manifest[key]?.isEntry === true);
const homeKey = Object.keys(manifest).find((key) => key.startsWith("src/routes/index.tsx"));
if (entryKey === undefined || homeKey === undefined) {
  console.error("manifest: client entry or chunk of src/routes/index.tsx not found");
  process.exit(1);
}

const jsFiles = new Set<string>();
const cssFiles = new Set<string>();

function collect(key: string): void {
  const chunk = manifest[key];
  if (chunk === undefined || jsFiles.has(chunk.file)) return;
  jsFiles.add(chunk.file);
  for (const file of [...(chunk.css ?? []), ...(chunk.assets ?? [])]) {
    if (file.endsWith(".css")) cssFiles.add(file);
  }
  for (const imported of chunk.imports ?? []) collect(imported);
}

collect(entryKey);
collect(homeKey);

function report(label: string, files: Set<string>, limitKb: number): boolean {
  let total = 0;
  for (const file of [...files].toSorted()) {
    const size = gzipSync(readFileSync(`${OUT_DIR}/${file}`), { level: 9 }).length;
    total += size;
    console.log(`${(size / 1024).toFixed(1).padStart(7)} kB  ${file}`);
  }
  const totalKb = total / 1024;
  console.log(`${totalKb.toFixed(1).padStart(7)} kB  ${label} total (limit ${limitKb} kB)\n`);
  return totalKb <= limitKb;
}

const jsOk = report("JS", jsFiles, JS_LIMIT_KB);
const cssOk = report("CSS", cssFiles, CSS_LIMIT_KB);
if (!jsOk || !cssOk) process.exit(1);
