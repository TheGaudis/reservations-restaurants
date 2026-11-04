import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
const logs = [];
page.on("console", (m) => {
  if (["error", "warning"].includes(m.type())) logs.push(m.text().slice(0, 200));
});
page.on("pageerror", (e) => logs.push(e.message.slice(0, 200)));
await page.route("https://script.google.com/**", (r) =>
  r.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: '{"unchanged":true,"etag":"OLD"}',
  }),
);
await page.addInitScript(() =>
  localStorage.setItem(
    "reservations-cache-v1",
    JSON.stringify({
      savedAt: Date.now() - 60000,
      etag: "OLD",
      config: { name1: "Copie locale", priceEleve: "4.95" },
      r1Used: {},
      r1Days: [{ Date: "2026-10-01", Capacite: 20, Menu: "m" }],
    }),
  ),
);
await page.goto("http://localhost:5300/reservations-restaurants/");
await page.waitForTimeout(4000);
console.log("h1:", await page.locator("h1").first().textContent());
console.log("logs:", logs.length ? logs.join("\n  ") : "none");
await browser.close();
