import { describe, expect, it } from "vitest";

import type { Cell, FakeDb } from "@/mocks/fake-db";
import { createSeed } from "@/mocks/fixtures/seed";
import { TEST_NOW, TODAY } from "@/test/clock";

function booked(rows: Array<{ Qte: Cell }>): number {
  return rows.reduce((sum, row) => sum + Number(row.Qte), 0);
}

function r1(db: FakeDb, date: string) {
  const day = db.r1Days.find((d) => d.Date === date);
  return { capacity: day?.Capacite, booked: booked(db.r1Bookings.filter((b) => b.Date === date)) };
}

function r2(db: FakeDb, date: string) {
  return db.r2Items
    .filter((dish) => dish.Date === date)
    .map((dish) => ({
      name: dish.Nom,
      price: dish.Prix,
      stock: dish.Stock,
      booked: booked(db.r2Bookings.filter((b) => b.ItemID === dish.ID)),
    }));
}

describe("TEST_NOW", () => {
  it("is Monday 5 October 2026, 9:30 in Paris", () => {
    const paris = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      dateStyle: "full",
      timeStyle: "short",
    }).format(TEST_NOW);
    expect(paris).toBe("lundi 5 octobre 2026 à 09:30");
    expect(TODAY).toBe("2026-10-05");
  });
});

describe("seed of parite.md § 2", () => {
  const db = createSeed();

  it("has the settings, etag E1 and no processed request", () => {
    expect(db.config).toStrictEqual({
      name1: "Restaurant Pédagogique",
      name2: "Aristide",
      contactAnnulation: "le secrétariat",
      priceEleve: "4.95",
      priceProf: "6.10",
      priceExterieur: "9.90",
    });
    expect(db.etag).toBe("E1");
    expect(db.requestIds).toStrictEqual([]);
    expect(db.mailError).toBeNull();
  });

  it.each([
    ["2026-10-01", 20, 4],
    ["2026-10-05", 20, 8],
    ["2026-10-06", 20, 15],
    ["2026-10-09", 10, 10],
    ["2026-10-12", 150, 120],
  ])("R1 day %s: capacity %i, %i booked", (date, capacity, seats) => {
    expect(r1(db, date)).toStrictEqual({ capacity, booked: seats });
  });

  it("R1 tomorrow has a detailed booking at 16 € and an old one with empty counters", () => {
    const tomorrow = db.r1Bookings.filter((b) => b.Date === "2026-10-06");
    expect(tomorrow).toContainEqual(
      expect.objectContaining({ Qte: 3, NbEleve: 2, NbProf: 1, NbExt: 0, PrixTotal: 16 }),
    );
    expect(tomorrow).toContainEqual(
      expect.objectContaining({ NbEleve: "", NbProf: "", NbExt: "", PrixTotal: "" }),
    );
    expect(db.r1Bookings.find((b) => b.Date === "2026-10-12")).toMatchObject({
      NbExt: 120,
      PrixTotal: 1188,
    });
  });

  it.each([
    ["2026-10-01", [{ name: "Lasagnes", price: 4.5, stock: 10, booked: 2 }]],
    [
      "2026-10-05",
      [
        { name: "Lasagnes", price: 4.5, stock: 10, booked: 6 },
        { name: "Bowl (ticket restaurant)", price: "", stock: 10, booked: 0 },
        { name: "Wrap (ticket restaurant)", price: "", stock: 5, booked: 0 },
        { name: "Salade", price: "", stock: 5, booked: 0 },
      ],
    ],
    [
      "2026-10-06",
      [
        { name: "Lasagnes", price: 4.5, stock: 15, booked: 1 },
        { name: "Bowl (ticket restaurant)", price: "", stock: 10, booked: 3 },
      ],
    ],
    ["2026-10-10", []],
    [
      "2026-10-11",
      [
        { name: "Couscous", price: 6, stock: 3, booked: 3 },
        { name: "Tajine", price: 6.5, stock: 2, booked: 2 },
      ],
    ],
    [
      "2026-10-13",
      [
        { name: "Lasagnes", price: 4.5, stock: 8, booked: 0 },
        { name: "Salade", price: "", stock: 6, booked: 0 },
      ],
    ],
  ])("R2 day %s: dishes %j", (date, dishes) => {
    expect(db.r2Days.some((d) => d.Date === date)).toBe(true);
    expect(r2(db, date)).toStrictEqual(dishes);
  });

  it("R2 tomorrow has an orphan booking of 2 portions", () => {
    const orphans = db.r2Bookings.filter((b) => !db.r2Items.some((dish) => dish.ID === b.ItemID));
    expect(orphans).toMatchObject([{ Date: "2026-10-06", Qte: 2 }]);
  });

  it("has no day on 2026-10-07", () => {
    expect([...db.r1Days, ...db.r2Days].some((d) => d.Date === "2026-10-07")).toBe(false);
  });

  it("dates every row from the given day", () => {
    const shifted = createSeed("2027-03-01");
    expect(shifted.r1Days.map((d) => d.Date)).toStrictEqual([
      "2027-02-25",
      "2027-03-01",
      "2027-03-02",
      "2027-03-05",
      "2027-03-08",
    ]);
    expect(shifted.r2Items.map((dish) => dish.ID)).toStrictEqual(db.r2Items.map((dish) => dish.ID));
  });
});
