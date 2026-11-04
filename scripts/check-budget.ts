/// <reference types="node" />
// Initial budget of a public visitor on / (PLAN § 1.5, S3), read from the Vite manifest of dist/:
// JS = entry (index.html) + component chunk of the / route (a dynamic import of the entry, autoCodeSplitting) + their
// static imports; CSS = stylesheets of those chunks + the inline <style> of index.html (src/styles/).
// Sizes are gzip level 9. Fails above 240 kB of JS or 25 kB of CSS.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

import * as v from "valibot";

const OUT_DIR = "dist";
const JS_LIMIT_KB = 240;
const CSS_LIMIT_KB = 25;

const ManifestSchema = v.record(
  v.string(),
  v.object({
    file: v.string(),
    isEntry: v.optional(v.boolean()),
    imports: v.optional(v.array(v.string())),
    dynamicImports: v.optional(v.array(v.string())),
    css: v.optional(v.array(v.string())),
    assets: v.optional(v.array(v.string())),
  }),
);

const manifest = v.parse(
  ManifestSchema,
  JSON.parse(readFileSync(`${OUT_DIR}/.vite/manifest.json`, "utf-8")),
);

const entryKey = Object.keys(manifest).find((key) => manifest[key]?.isEntry === true);
const homeKey = manifest[entryKey ?? ""]?.dynamicImports?.find((key) =>
  key.startsWith("src/routes/index.tsx?"),
);
if (entryKey === undefined || homeKey === undefined) {
  console.error("manifest: entry or component chunk of src/routes/index.tsx not found");
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

function line(label: string, content: Buffer | string): number {
  const size = gzipSync(content, { level: 9 }).length;
  console.log(`${(size / 1024).toFixed(1).padStart(7)} kB  ${label}`);
  return size;
}

function report(label: string, files: Set<string>, limitKb: number, extra = 0): boolean {
  let total = extra;
  for (const file of [...files].toSorted()) {
    total += line(file, readFileSync(`${OUT_DIR}/${file}`));
  }
  const totalKb = total / 1024;
  console.log(`${totalKb.toFixed(1).padStart(7)} kB  ${label} total (limit ${limitKb} kB)\n`);
  return totalKb <= limitKb;
}

const jsOk = report("JS", jsFiles, JS_LIMIT_KB);
const inlineStyle =
  /<style>([\s\S]*?)<\/style>/u.exec(readFileSync(`${OUT_DIR}/index.html`, "utf-8"))?.[1] ?? "";
const cssOk = report("CSS", cssFiles, CSS_LIMIT_KB, line("index.html <style>", inlineStyle));
if (!jsOk || !cssOk) process.exit(1);
