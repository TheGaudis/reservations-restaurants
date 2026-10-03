import { describe, expect, it } from "vitest";

import { createSeed } from "@/mocks/fixtures/seed";
import { fakeScriptPerTest, postStaff, rowsOf } from "@/test/fake-script-server";

// R2 protected actions: body of 02 § 4.7 → tables → full state, errors of Code.gs word for word.

const start = fakeScriptPerTest();

const martin = {
  action: "editBookingR2",
  id: "r2b-d0-martin",
  nom: "Léa Martin",
  contact: "06 12 34 56 78",
  classe: "BTS1",
  qte: 2,
  mode: "surplace",
  observation: "",
};

describe("addDayR2 (06 § 4.2)", () => {
  it("opens a new day with its dishes, price 0 written empty (b-8)", async () => {
    const fake = start();
    const state = await postStaff({
      action: "addDayR2",
      date: "2026-10-20",
      note: "Menu bistrot",
      items: [
        { name: "Bowl (ticket restaurant)", stock: 10, price: "" },
        { name: "Lasagnes", stock: 8, price: 4.5 },
        { name: "Salade", stock: 5, price: 0 },
      ],
      theme: "Italie",
      collegue: "Mme Martin",
    });
    const day = {
      Date: "2026-10-20",
      Note: "Menu bistrot",
      Theme: "Italie",
      OuvertPar: "Mme Martin",
    };
    const dishes = [
      { Date: "2026-10-20", Nom: "Bowl (ticket restaurant)", Stock: 10, Prix: "" },
      { Date: "2026-10-20", Nom: "Lasagnes", Stock: 8, Prix: 4.5 },
      { Date: "2026-10-20", Nom: "Salade", Stock: 5, Prix: "" },
    ].map((dish) => ({ ID: expect.any(String) as unknown, ...dish }));
    expect(fake.db.r2Days.at(-1)).toStrictEqual(day);
    expect(fake.db.r2Items.slice(-3)).toStrictEqual(dishes);
    expect(new Set(fake.db.r2Items.map((dish) => dish.ID)).size).toBe(fake.db.r2Items.length);
    expect(rowsOf(state, "r2Items").slice(-3)).toStrictEqual(dishes);
  });

  it("adds to an open day only the dish names it lacks, compared without case", async () => {
    const fake = start();
    const seed = createSeed();
    await postStaff({
      action: "addDayR2",
      date: "2026-10-13",
      note: "Nouvelle note",
      items: [
        { name: "lasagnes", stock: 3, price: 5 },
        { name: "Tiramisu", stock: 4, price: 3 },
      ],
      theme: "",
      collegue: "",
    });
    expect(fake.db.r2Days.find((d) => d.Date === "2026-10-13")).toStrictEqual({
      Date: "2026-10-13",
      Note: "Nouvelle note",
      Theme: "",
      OuvertPar: "",
    });
    expect(fake.db.r2Items.slice(0, -1)).toStrictEqual(seed.r2Items);
    expect(fake.db.r2Items.at(-1)).toMatchObject({
      Date: "2026-10-13",
      Nom: "Tiramisu",
      Stock: 4,
      Prix: 3,
    });
  });

  it.each([[[]], [undefined]])(
    "with items %j changes note, theme and « ouvert par » only (b-12)",
    async (items) => {
      const fake = start();
      const seed = createSeed();
      await postStaff({
        action: "addDayR2",
        date: "2026-10-10",
        note: "Galettes",
        items,
        theme: "Bretagne",
        collegue: "M. Dupont",
      });
      expect(fake.db.r2Days.find((d) => d.Date === "2026-10-10")).toStrictEqual({
        Date: "2026-10-10",
        Note: "Galettes",
        Theme: "Bretagne",
        OuvertPar: "M. Dupont",
      });
      expect(fake.db.r2Items).toStrictEqual(seed.r2Items);
    },
  );

  it.each([
    [[{ name: "Soupe", stock: 4 }, null], "Cannot read properties of null (reading 'name')"],
    ["Soupe", "(items || []).filter is not a function"],
  ])(
    "answers items %j with the error of Code.gs, the day already written",
    async (items, error) => {
      const fake = start();
      const seed = createSeed();
      const body = {
        action: "addDayR2",
        date: "2026-10-20",
        note: "",
        items,
        theme: "",
        collegue: "",
      };
      expect(await postStaff(body)).toStrictEqual({ error });
      expect(fake.db.r2Days.at(-1)).toMatchObject({ Date: "2026-10-20" });
      expect(fake.db.r2Items).toStrictEqual(seed.r2Items);
    },
  );
});

describe("addItemR2 (06 § 6.2)", () => {
  it("adds a dish to an open day, price 0 written empty (b-8)", async () => {
    const fake = start();
    const state = await postStaff({
      action: "addItemR2",
      date: "2026-10-10",
      name: "Crêpe",
      stock: 20,
      price: 0,
    });
    const dish = {
      ID: expect.any(String) as unknown,
      Date: "2026-10-10",
      Nom: "Crêpe",
      Stock: 20,
      Prix: "",
    };
    expect(fake.db.r2Items.at(-1)).toStrictEqual(dish);
    expect(rowsOf(state, "r2Items").at(-1)).toStrictEqual(dish);
  });

  it("refuses a day that is not open", async () => {
    const fake = start();
    const body = { action: "addItemR2", date: "2026-10-07", name: "Crêpe", stock: 20, price: 2 };
    expect(await postStaff(body)).toStrictEqual({ error: "Ce jour n'est pas ouvert." });
    expect(fake.db).toStrictEqual(createSeed());
  });
});

describe("editItemR2 (06 § 6.3)", () => {
  it("changes name, stock and price, even below the booked portions (b-4)", async () => {
    const fake = start();
    const state = await postStaff({
      action: "editItemR2",
      itemId: "r2i-d+6-couscous",
      name: "Couscous royal",
      stock: 1,
      price: 0,
    });
    const dish = {
      ID: "r2i-d+6-couscous",
      Date: "2026-10-11",
      Nom: "Couscous royal",
      Stock: 1,
      Prix: "",
    };
    expect(fake.db.r2Items.find((d) => d.ID === "r2i-d+6-couscous")).toStrictEqual(dish);
    expect(rowsOf(state, "r2Items")).toContainEqual(dish);
  });

  it("refuses an unknown dish", async () => {
    const fake = start();
    const body = { action: "editItemR2", itemId: "r2i-gone", name: "X", stock: 1, price: "" };
    expect(await postStaff(body)).toStrictEqual({ error: "Plat introuvable." });
    expect(fake.db).toStrictEqual(createSeed());
  });
});

describe("deleteItemR2 (06 § 6.4)", () => {
  it("removes the dish and keeps its bookings, orphaned (b-3)", async () => {
    const fake = start();
    const seed = createSeed();
    await postStaff({ action: "deleteItemR2", itemId: "r2i-d+6-couscous" });
    expect(fake.db.r2Items).toStrictEqual(seed.r2Items.filter((d) => d.ID !== "r2i-d+6-couscous"));
    expect(fake.db.r2Bookings).toStrictEqual(seed.r2Bookings);
  });
});

describe("deleteDayR2 (06 § 5.2)", () => {
  it("removes the day, its dishes and every booking of the date", async () => {
    const fake = start();
    const seed = createSeed();
    const state = await postStaff({ action: "deleteDayR2", date: "2026-10-06" });
    expect(fake.db.r2Days).toStrictEqual(seed.r2Days.filter((d) => d.Date !== "2026-10-06"));
    expect(fake.db.r2Items).toStrictEqual(seed.r2Items.filter((d) => d.Date !== "2026-10-06"));
    expect(fake.db.r2Bookings).toStrictEqual(
      seed.r2Bookings.filter((b) => b.Date !== "2026-10-06"),
    );
    expect(fake.db.r2Bookings.some((b) => b.ID === "r2b-d+1-durand")).toBe(false);
    expect(fake.db.r1Days).toStrictEqual(seed.r1Days);
    expect(rowsOf(state, "r2Bookings")).toStrictEqual(fake.db.r2Bookings);
  });
});

describe("deleteBookingR2 (06 § 5.2)", () => {
  it("removes the booking only", async () => {
    const fake = start();
    const seed = createSeed();
    await postStaff({ action: "deleteBookingR2", id: "r2b-d+1-gsell" });
    expect(fake.db.r2Bookings).toStrictEqual(
      seed.r2Bookings.filter((b) => b.ID !== "r2b-d+1-gsell"),
    );
  });

  it("answers the full state for an id that no longer exists", async () => {
    const fake = start();
    expect(await postStaff({ action: "deleteBookingR2", id: "r2b-gone" })).not.toHaveProperty(
      "error",
    );
    expect(fake.db).toStrictEqual(createSeed());
  });
});

describe("editBookingR2 (06 § 7.4)", () => {
  it("changes identity, portions and mode, never the dish", async () => {
    const fake = start();
    const state = await postStaff({
      ...martin,
      itemId: "r2i-d0-bowl",
      nom: "Léa Martin-Roux",
      qte: 6,
      mode: "emporter",
      observation: "Sans sauce",
    });
    const booking = {
      ...createSeed().r2Bookings.find((b) => b.ID === "r2b-d0-martin"),
      Nom: "Léa Martin-Roux",
      Qte: 6,
      Mode: "emporter",
      Observation: "Sans sauce",
    };
    expect(fake.db.r2Bookings.find((b) => b.ID === "r2b-d0-martin")).toStrictEqual(booking);
    expect(rowsOf(state, "r2Bookings")).toContainEqual(booking);
  });

  it("does not check the stock of an orphan booking", async () => {
    const fake = start();
    expect(await postStaff({ ...martin, id: "r2b-d+1-durand", qte: 50 })).not.toHaveProperty(
      "error",
    );
    expect(fake.db.r2Bookings.find((b) => b.ID === "r2b-d+1-durand")?.Qte).toBe(50);
  });

  it.each([
    [{ qte: "abc" }, "Quantité invalide : indiquez un nombre entier positif."],
    [{ qte: 1.5 }, "Quantité invalide : indiquez un nombre entier positif."],
    [{ qte: 0 }, "Indiquez une quantité supérieure à 0."],
    [{ qte: "" }, "Indiquez une quantité supérieure à 0."],
    [{ id: "r2b-gone" }, "Réservation introuvable."],
    [{ qte: 7 }, "Il ne reste que 6 portion(s) disponible(s) pour ce plat."],
    // The quantity is checked before the id.
    [{ id: "r2b-gone", qte: 0 }, "Indiquez une quantité supérieure à 0."],
  ])("answers %j with « %s » and writes nothing", async (change, error) => {
    const fake = start();
    expect(await postStaff({ ...martin, ...change })).toStrictEqual({ error });
    expect(fake.db).toStrictEqual(createSeed());
  });
});
