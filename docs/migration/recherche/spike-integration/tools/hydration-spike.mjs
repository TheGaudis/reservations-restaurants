// R-01 spike: open the prerendered shell in Chromium, with and without a local copy, and record
// console errors (React #418), recoverable errors and the skeleton -> content timeline.
import { readFileSync } from "node:fs";

import { chromium } from "playwright";

const BASE = process.env.SPIKE_URL ?? "http://localhost:5180/reservations-restaurants/";
const state = JSON.parse(
  readFileSync(new URL("../src/mocks/fixtures/public-state.json", import.meta.url), "utf8"),
);
const cache = {
  savedAt: Date.now() - 60_000,
  etag: "OLD-ETAG",
  config: {
    name1: "Copie locale",
    name2: "Aristide",
    desc1: "",
    desc2: "",
    contactAnnulation: "",
    priceEleve: "4.95",
    priceProf: "6.10",
    priceExterieur: "9.90",
  },
  r1Used: { "2026-10-01": 5 },
  r2Used: {},
  r1Days: [{ Date: "2026-10-01", Capacite: 20, Theme: "", Menu: "Menu en cache" }],
  r2Days: [],
  r2Items: [],
};

async function run(name, { withCache, path = "", delayMs = 800 }) {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const context = await browser.newContext({ locale: "fr-FR", timezoneId: "Europe/Paris" });
  const page = await context.newPage();
  const logs = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning" || m.text().startsWith("[spike]"))
      logs.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });
  page.on("pageerror", (e) => logs.push(`pageerror: ${e.message.slice(0, 300)}`));
  let requests = 0;
  await page.route("https://script.google.com/**", async (route) => {
    requests += 1;
    const url = new URL(route.request().url());
    await new Promise((r) => setTimeout(r, delayMs));
    const body =
      url.searchParams.get("since") === state.etag ? { unchanged: true, etag: state.etag } : state;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });
  await page.addInitScript(
    ({ withCache, cache }) => {
      if (withCache) localStorage.setItem("reservations-cache-v1", JSON.stringify(cache));
      const t0 = performance.now();
      const seen = [];
      window.__TIMELINE__ = seen;
      const snap = () => {
        const s = document.querySelector("[data-testid=skeleton]")
          ? "skeleton"
          : document.querySelector("[data-testid=content]")
            ? `content(${document.querySelector("h1")?.textContent})`
            : document.body
              ? `other(${document.body.innerText.slice(0, 40).replace(/\n/g, " ")})`
              : "nobody";
        if (seen.at(-1)?.s !== s) seen.push({ t: Math.round(performance.now() - t0), s });
      };
      new MutationObserver(snap).observe(document, { childList: true, subtree: true });
    },
    { withCache, cache },
  );
  const t = Date.now();
  await page.goto(BASE + path, { waitUntil: "load" });
  const tLoad = Date.now() - t;
  await page.waitForTimeout(delayMs + 1500);
  const timeline = await page.evaluate(() => window.__TIMELINE__);
  const h1 = await page
    .locator("h1")
    .first()
    .textContent({ timeout: 1000 })
    .catch(() => null);
  const status = await page.evaluate(() => document.body.innerText.slice(0, 200));
  console.log(
    `\n### ${name}  (load ${tLoad} ms, total ${Date.now() - t} ms, ${requests} script request(s))`,
  );
  console.log("URL:", page.url());
  console.log("timeline:", JSON.stringify(timeline));
  console.log("h1:", h1, "| text:", JSON.stringify(status));
  console.log("console/page errors:", logs.length ? "\n  " + logs.join("\n  ") : "none");
  if (process.env.SPIKE_SHOTS) await page.screenshot({ path: `test-results/${name}.png` });
  await browser.close();
}

if (!process.env.ONLY) await run("A-sans-copie", { withCache: false });
if (!process.env.ONLY) await run("B-avec-copie", { withCache: true });
if (!process.env.ONLY)
  await run("C-avec-copie-reserver", { withCache: true, path: "?reserver=r1&r1vue=mois" });
await run("D-lien-profond-collegue", { withCache: true, path: "collegue" });
if (!process.env.ONLY) await run("E-index-html", { withCache: true, path: "index.html" });
if (!process.env.ONLY)
  await run("F-reserver-1", { withCache: true, path: "?reserver=1&connexion=1" });
