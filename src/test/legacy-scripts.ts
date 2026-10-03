/// <reference types="node" />
// Old site's scripts run in Node for the golden tests (PLAN P2, R-21): `legacy/js/outils.js`, `donnees.js` and
// `calendrier.js`, unchanged, in a `vm` context with a minimal document and an in-memory storage. They touch the
// DOM only in event handlers and when the URL contains `COLLE_ICI`; nothing here fetches.
import { readFileSync } from "node:fs";
import vm from "node:vm";

import { SCRIPT_URL } from "@/test/fake-script-server";

const LEGACY = new URL("../../legacy/", import.meta.url);
const SCRIPTS = ["outils.js", "donnees.js", "calendrier.js"];

export interface LegacyPage {
  /** `localStorage` of the old page. */
  storage: Map<string, string>;
  /** Value of `expression` in the old page, through JSON (plain objects of the test realm); null for undefined. */
  evaluate: (expression: string) => unknown;
  /** Fixes `Date.now()` of the old page. */
  setNow: (ms: number) => void;
}

/** One line of the inline script of `legacy/index.html` (`CACHE_KEY`, `CACHE_MAX_AGE`), read as it is. */
function headConstant(html: string, name: string): string {
  const line = new RegExp(`^const ${name} = [^;]+;`, "mu").exec(html);
  if (line === null) throw new Error(`${name} not found in legacy/index.html`);
  return line[0];
}

export function loadLegacyPage(): LegacyPage {
  const storage = new Map<string, string>();
  const context = vm.createContext({
    document: { getElementById: () => null, addEventListener: () => null },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    },
  });
  const html = readFileSync(new URL("index.html", LEGACY), "utf-8");
  // The fake URL, never the real one written in legacy/index.html (R-33).
  vm.runInContext(
    [
      `const APPS_SCRIPT_URL = ${JSON.stringify(SCRIPT_URL)};`,
      headConstant(html, "CACHE_KEY"),
      headConstant(html, "CACHE_MAX_AGE"),
    ].join("\n"),
    context,
  );
  for (const script of SCRIPTS) {
    vm.runInContext(readFileSync(new URL(`js/${script}`, LEGACY), "utf-8"), context, {
      filename: `legacy/js/${script}`,
    });
  }
  return {
    storage,
    evaluate: (expression) => {
      const json: unknown = vm.runInContext(`JSON.stringify(${expression})`, context);
      if (typeof json !== "string") return null;
      const value: unknown = JSON.parse(json);
      return value;
    },
    setNow: (ms) => {
      vm.runInContext(`Date.now = () => ${String(ms)};`, context);
    },
  };
}
