import type { Page } from "@playwright/test";

import type { FakeDb } from "@/mocks/fake-db";
import { publicContent } from "@/mocks/sheet";

// Browser storage of the public page (03 § 1): the local copy `reservations-cache-v1` and the stored titles
// `reservations-textes`. Seeded by an init script, so the copy exists before the page's first script runs.

const CACHE_KEY = "reservations-cache-v1";
const TEXTS_KEY = "reservations-textes";
const CONFIG_KEYS = [
  "name1",
  "name2",
  "desc1",
  "desc2",
  "contactAnnulation",
  "priceEleve",
  "priceProf",
  "priceExterieur",
] as const;
const VOUCHER_MARK = /\s*\(ticket restaurant\)\s*$/iu;

/** Local copy v1 (03 § 1.1) of the public state of `db`, as the legacy `saveCache` writes it. */
function localCacheOf(db: FakeDb, savedAt: number): object {
  const content = publicContent(db);
  return {
    savedAt,
    etag: db.etag,
    config: Object.fromEntries(CONFIG_KEYS.map((key) => [key, content[key]])),
    r1Used: Object.fromEntries(content.r1Bookings.map((b) => [b.Date, b.Qte])),
    r2Used: Object.fromEntries(content.r2Bookings.map((b) => [b.ItemID, b.Qte])),
    r1Days: content.r1Days.map(({ Date, Capacite, Theme, Menu }) => ({
      Date,
      Capacite,
      Theme,
      Menu,
    })),
    r2Days: content.r2Days.map(({ Date, Theme, Note }) => ({ Date, Theme, Note })),
    r2Items: content.r2Items.map((dish) => ({
      ...dish,
      Nom: String(dish.Nom).replace(VOUCHER_MARK, ""),
      Ticket: VOUCHER_MARK.test(String(dish.Nom)),
    })),
  };
}

async function seed(page: Page, key: string, value: object): Promise<void> {
  await page.addInitScript(
    ([storageKey, json]) => {
      // First load of the tab only: a reload must find what the page itself wrote.
      const flag = `e2e-seeded:${storageKey}`;
      if (sessionStorage.getItem(flag) === null) {
        localStorage.setItem(storageKey, json);
        sessionStorage.setItem(flag, "1");
      }
    },
    [key, JSON.stringify(value)] as const,
  );
}

/** Seeds the local copy of `db` (call before `goto`). */
export async function seedLocalCache(page: Page, db: FakeDb, savedAt: number): Promise<void> {
  await seed(page, CACHE_KEY, localCacheOf(db, savedAt));
}

/** Seeds `reservations-textes` (call before `goto`). */
export async function seedStoredTexts(page: Page, texts: Record<string, string>): Promise<void> {
  await seed(page, TEXTS_KEY, texts);
}

/** Local copy as stored now, or null. */
export async function readLocalCache(page: Page): Promise<Record<string, unknown> | null> {
  const json = await page.evaluate((key) => localStorage.getItem(key), CACHE_KEY);
  return json === null ? null : (JSON.parse(json) as Record<string, unknown>);
}
