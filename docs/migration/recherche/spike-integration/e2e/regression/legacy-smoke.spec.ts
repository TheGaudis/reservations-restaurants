import { http, HttpResponse } from "msw";

import publicState from "@/mocks/fixtures/public-state.json" with { type: "json" };

import { expect, test } from "../fixtures";

const SCRIPT = "https://script.google.com/macros/s/:deployment/exec";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-30T08:00:00+02:00"));
});

test("public state: GET intercepted, calendar rendered @parity", async ({ page, network }) => {
  test.skip(test.info().project.name !== "legacy", "legacy DOM only in this spike");
  const gets: string[] = [];
  network.use(
    http.get(SCRIPT, ({ request }) => {
      gets.push(request.url);
      return HttpResponse.json(publicState);
    }),
  );
  await page.goto("./");
  const r1 = page.locator("#col-r1");
  await expect(r1.getByRole("group", { name: /Jours de la semaine/u })).toBeVisible();
  await expect(r1.getByRole("heading", { name: "Restaurant Pédagogique" })).toBeVisible();
  await r1
    .getByRole("button", { name: /1 octobre/u })
    .first()
    .click();
  await expect(r1.getByText("Velouté, suprême de volaille, tarte fine")).toBeVisible();
  expect(gets.length).toBeGreaterThan(0);
  expect(gets[0]).toMatch(/AKfycbzLVvpP6oSS/u);
});

test("colleague login: POST text/plain intercepted, print popup captured", async ({
  page,
  network,
}) => {
  test.skip(test.info().project.name !== "legacy", "legacy DOM only in this spike");
  const posts: Array<{ type: string | null; body: unknown }> = [];
  network.use(
    http.post(SCRIPT, async ({ request }) => {
      const body = JSON.parse(await request.text()) as { action: string };
      posts.push({ type: request.headers.get("content-type"), body });
      return HttpResponse.json({
        ...publicState,
        etag: undefined,
        r1Days: publicState.r1Days.map((d) => ({ ...d, OuvertPar: "M. Dupont" })),
        r1Bookings: [
          {
            ID: "b1",
            Date: "2026-10-01",
            Nom: "Cyrille Ungerer",
            Contact: "c@x.fr",
            Classe: "TS2",
            Qte: 3,
            Timestamp: "2026-09-29",
            Observation: "",
            NbEleve: 2,
            NbProf: 1,
            NbExt: 0,
            PrixTotal: 16,
          },
        ],
        r2Bookings: [],
      });
    }),
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Collègue" }).click();
  await page.getByRole("textbox", { name: "Mot de passe collègue" }).fill("secret");
  await page.getByRole("button", { name: "Valider" }).click();
  await expect.poll(() => posts.length).toBeGreaterThan(0);
  expect(posts[0]).toEqual({
    type: "text/plain;charset=utf-8",
    body: { action: "getAdminState", password: "secret" },
  });
  const r1 = page.locator("#col-r1");
  await r1
    .getByRole("button", { name: /1 octobre/u })
    .first()
    .click();
  const popupPromise = page.waitForEvent("popup");
  await r1.getByRole("button", { name: /Imprimer la liste/u }).click();
  const popup = await popupPromise;
  await expect(popup.getByText("Cyrille Ungerer")).toBeVisible();
});
