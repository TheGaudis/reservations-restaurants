// Frame-by-frame skeleton/content sampling (requestAnimationFrame), with a local copy, 5 runs per build.
import { chromium } from "playwright";
const targets = {
  "Start + defaultPendingMinMs: 16": 5196,
  "Start + defaultPendingMinMs: 50": 5197,
  "Start + defaultPendingMinMs: 0": 5193,
  "Start (500 par défaut)": 5191,
  "Router seul (createRoot)": 5192,
};
const THROTTLE = Number(process.env.THROTTLE ?? 1);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [name, port] of Object.entries(targets)) {
  const rows = [];
  for (let i = 0; i < 5; i += 1) {
    const page = await browser.newPage();
    if (THROTTLE > 1) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
    }
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message.slice(0, 40)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text().slice(0, 40));
    });
    await page.route("https://script.google.com/**", (r) =>
      r.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: '{"unchanged":true,"etag":"OLD-ETAG"}',
      }),
    );
    await page.addInitScript(() => {
      localStorage.setItem(
        "reservations-cache-v1",
        JSON.stringify({
          savedAt: Date.now() - 60000,
          etag: "OLD-ETAG",
          config: { name1: "Copie locale", priceEleve: "4.95" },
          r1Used: {},
          r1Days: [{ Date: "2026-10-01", Capacite: 20, Menu: "m" }],
        }),
      );
      const t0 = performance.now();
      window.__F__ = { firstContent: null, frames: [] };
      const tick = () => {
        const s = document.querySelector("[data-testid=content]")
          ? "C"
          : document.querySelector("[data-testid=skeleton]")
            ? "S"
            : "-";
        window.__F__.frames.push(s);
        if (s === "C" && window.__F__.firstContent === null)
          window.__F__.firstContent = Math.round(performance.now() - t0);
        if (window.__F__.frames.length < 400) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto(`http://localhost:${port}/reservations-restaurants/`);
    await page.waitForTimeout(1800 * THROTTLE);
    const f = await page.evaluate(() => window.__F__);
    rows.push({
      firstContent: f.firstContent,
      skeletonFrames: f.frames.filter((x) => x === "S").length,
      blankFrames: f.frames.filter((x) => x === "-").length,
      errors: errors.length ? [...new Set(errors)].join("|") : "",
    });
    await page.close();
  }
  const med = (k) => rows.map((r) => r[k]).sort((a, b) => a - b)[2];
  console.log(
    `${name}: contenu à ${med("firstContent")} ms (médiane), images squelette ${med("skeletonFrames")}, images vides ${med("blankFrames")}, erreurs: ${[...new Set(rows.map((r) => r.errors))].join(" / ") || "aucune"}`,
  );
}
await browser.close();
