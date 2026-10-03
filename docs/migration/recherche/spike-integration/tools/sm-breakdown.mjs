// Attribute minified bytes of a chunk to package names via its source map (approximation).
import { readFileSync } from "node:fs";
const file = process.argv[2];
const map = JSON.parse(readFileSync(file + ".map", "utf8"));
const code = readFileSync(file, "utf8");
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const lines = code.split("\n");
const bytes = new Map();
let src = 0;
map.mappings.split(";").forEach((line, li) => {
  let col = 0;
  const segs = [];
  for (const seg of line.split(",")) {
    if (!seg) continue;
    const vals = [];
    let v = 0,
      shift = 0;
    for (const ch of seg) {
      const d = chars.indexOf(ch);
      v += (d & 31) << shift;
      if (d & 32) shift += 5;
      else {
        vals.push(v & 1 ? -(v >> 1) : v >> 1);
        v = 0;
        shift = 0;
      }
    }
    col += vals[0];
    if (vals.length > 1) src += vals[1];
    segs.push([col, vals.length > 1 ? src : -1]);
  }
  const len = (lines[li] ?? "").length;
  segs.forEach(([c, s], i) => {
    const end = i + 1 < segs.length ? segs[i + 1][0] : len;
    const name = s < 0 ? "?" : map.sources[s];
    bytes.set(name, (bytes.get(name) ?? 0) + end - c);
  });
});
const pkg = new Map();
for (const [s, b] of bytes) {
  const m = s.match(/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/);
  const k = m ? m[1] : s.includes("src/") ? "src (app)" : s;
  pkg.set(k, (pkg.get(k) ?? 0) + b);
}
const total = code.length;
[...pkg]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25)
  .forEach(([k, b]) =>
    console.log(
      `${(b / 1024).toFixed(1).padStart(7)} kB ${((b / total) * 100).toFixed(1).padStart(5)}%  ${k}`,
    ),
  );
