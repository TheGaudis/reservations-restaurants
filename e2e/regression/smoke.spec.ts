import { expect, test } from "../fixtures";
import { gotoHome } from "../pages/home";

// G-04 shown from the fake script (seed of parite.md § 2), Monday 5 October 2026 at 9:30 in Paris.
test(
  "publicPageFromFakeScript",
  { tag: ["@parity", "@G-04", "@p4"] },
  async ({ page, fakeScript }) => {
    await gotoHome(page);

    await expect(
      page.getByRole("heading", { level: 2, name: "Restaurant Pédagogique" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Aristide" })).toBeVisible();
    // Today is selected in both calendars, and its two cards come from the seed.
    await expect(page.getByRole("button", { name: /^lundi 5 octobre 2026, /u })).toHaveCount(2);
    await expect(page.getByText("Salade de saison, pavé de saumon, crème brûlée")).toBeVisible();
    await expect(page.getByText("12 / 20 couverts")).toBeVisible();
    await expect(page.getByText("Semaine italienne")).toBeVisible();
    await expect(page.getByText("4 / 10")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réserver" })).toHaveCount(2);

    // One read, without etag (no local copy), and no write.
    expect(
      fakeScript.requests.map((request) => [request.method, new URL(request.url).search]),
    ).toStrictEqual([["GET", ""]]);
  },
);
