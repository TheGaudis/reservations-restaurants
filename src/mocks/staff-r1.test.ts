import { describe, expect, it } from "vitest";

import { createSeed } from "@/mocks/fixtures/seed";
import { fakeScriptPerTest, postStaff, rowsOf } from "@/test/fake-script-server";

// R1 protected actions: body of 02 § 4.7 → tables → full state, errors of Code.gs word for word.

const start = fakeScriptPerTest();

const ungerer = {
  action: "editBookingR1",
  id: "r1b-d+1-ungerer",
  nom: "Cyrille Ungerer",
  contact: "c.ungerer@exemple.fr",
  classe: "TS2",
  qte: 3,
  nbEleve: 2,
  nbProf: 1,
  nbExt: 0,
  prixTotal: 16,
  observation: "Table près de la fenêtre",
};

describe("addDayR1 (06 § 4.1)", () => {
  it("opens a new day with the fields of the body", async () => {
    const fake = start();
    const state = await postStaff({
      action: "addDayR1",
      date: "2026-10-20",
      capacity: 24,
      menu: "Menu bistrot",
      theme: "Bistrot",
      collegue: "M. Dupont",
    });
    const day = {
      Date: "2026-10-20",
      Capacite: 24,
      Menu: "Menu bistrot",
      Theme: "Bistrot",
      OuvertPar: "M. Dupont",
    };
    expect(fake.db.r1Days.at(-1)).toStrictEqual(day);
    expect(rowsOf(state, "r1Days").at(-1)).toStrictEqual(day);
  });

  it("writes an empty theme and « ouvert par » when they are missing", async () => {
    const fake = start();
    await postStaff({ action: "addDayR1", date: "2026-10-20", capacity: 10, menu: "" });
    expect(fake.db.r1Days.at(-1)).toStrictEqual({
      Date: "2026-10-20",
      Capacite: 10,
      Menu: "",
      Theme: "",
      OuvertPar: "",
    });
  });

  it("overwrites a day already open, even below its booked seats (b-4)", async () => {
    const fake = start();
    const days = fake.db.r1Days.length;
    await postStaff({
      action: "addDayR1",
      date: "2026-10-06",
      capacity: 5,
      menu: "Autre menu",
      theme: "",
      collegue: "",
    });
    expect(fake.db.r1Days).toHaveLength(days);
    expect(fake.db.r1Days.find((d) => d.Date === "2026-10-06")).toStrictEqual({
      Date: "2026-10-06",
      Capacite: 5,
      Menu: "Autre menu",
      Theme: "",
      OuvertPar: "",
    });
    expect(fake.db.r1Bookings.filter((b) => b.Date === "2026-10-06")).toHaveLength(3);
  });
});

describe("editDayR1 (06 § 5.1)", () => {
  it("changes capacity, menu and theme, never « ouvert par »", async () => {
    const fake = start();
    const state = await postStaff({
      action: "editDayR1",
      date: "2026-10-06",
      capacity: 15,
      menu: "Nouveau menu",
      theme: "Gibier",
    });
    const day = {
      Date: "2026-10-06",
      Capacite: 15,
      Menu: "Nouveau menu",
      Theme: "Gibier",
      OuvertPar: "M. Dupont",
    };
    expect(fake.db.r1Days.find((d) => d.Date === "2026-10-06")).toStrictEqual(day);
    expect(rowsOf(state, "r1Days")).toContainEqual(day);
  });

  it("refuses a capacity below the booked seats", async () => {
    const fake = start();
    const body = { action: "editDayR1", date: "2026-10-06", capacity: 14, menu: "", theme: "" };
    expect(await postStaff(body)).toStrictEqual({
      error:
        "Impossible : 15 couvert(s) déjà réservé(s) pour ce jour, la capacité ne peut pas être inférieure.",
    });
    expect(fake.db).toStrictEqual(createSeed());
  });

  it("answers the full state without changing anything for a date that is not open (b-10)", async () => {
    const fake = start();
    const body = { action: "editDayR1", date: "2026-10-07", capacity: 30, menu: "", theme: "" };
    expect(await postStaff(body)).not.toHaveProperty("error");
    expect(fake.db).toStrictEqual(createSeed());
  });
});

describe("deleteDayR1 (06 § 5.2)", () => {
  it("removes the day and every booking of the date, and nothing else", async () => {
    const fake = start();
    const seed = createSeed();
    const state = await postStaff({ action: "deleteDayR1", date: "2026-10-06" });
    expect(fake.db.r1Days.map((d) => d.Date)).toStrictEqual([
      "2026-10-01",
      "2026-10-05",
      "2026-10-09",
      "2026-10-12",
    ]);
    expect(fake.db.r1Bookings).toStrictEqual(
      seed.r1Bookings.filter((b) => b.Date !== "2026-10-06"),
    );
    expect(fake.db.r2Days).toStrictEqual(seed.r2Days);
    expect(rowsOf(state, "r1Bookings")).toStrictEqual(fake.db.r1Bookings);
  });
});

describe("deleteBookingR1 (06 § 5.2)", () => {
  it("removes the booking only", async () => {
    const fake = start();
    const state = await postStaff({ action: "deleteBookingR1", id: "r1b-d+1-ungerer" });
    const ids = createSeed()
      .r1Bookings.map((b) => b.ID)
      .filter((id) => id !== "r1b-d+1-ungerer");
    expect(fake.db.r1Bookings.map((b) => b.ID)).toStrictEqual(ids);
    expect(rowsOf(state, "r1Bookings").map((b) => b["ID"])).toStrictEqual(ids);
  });

  it("answers the full state for an id that no longer exists", async () => {
    const fake = start();
    expect(await postStaff({ action: "deleteBookingR1", id: "r1b-gone" })).not.toHaveProperty(
      "error",
    );
    expect(fake.db).toStrictEqual(createSeed());
  });
});

describe("editBookingR1 (06 § 7.3)", () => {
  it("ignores qte and prixTotal of the body and counts them again (b-10)", async () => {
    const fake = start();
    const state = await postStaff({
      ...ungerer,
      nom: "Cyrille Ungerer-Martin",
      contact: "06 00 00 00 00",
      classe: "TS3",
      qte: 99,
      prixTotal: 1,
      nbEleve: 3,
      nbProf: 1,
      nbExt: 1,
      observation: "",
    });
    const booking = {
      ...createSeed().r1Bookings.find((b) => b.ID === "r1b-d+1-ungerer"),
      Nom: "Cyrille Ungerer-Martin",
      Contact: "06 00 00 00 00",
      Classe: "TS3",
      Qte: 5,
      Observation: "",
      NbEleve: 3,
      NbProf: 1,
      NbExt: 1,
      PrixTotal: 30.85,
    };
    expect(fake.db.r1Bookings.find((b) => b.ID === "r1b-d+1-ungerer")).toStrictEqual(booking);
    expect(rowsOf(state, "r1Bookings")).toContainEqual(booking);
  });

  it("prices the seats at the current settings", async () => {
    const fake = start();
    fake.db.config["priceEleve"] = "5.20";
    await postStaff(ungerer);
    expect(fake.db.r1Bookings.find((b) => b.ID === "r1b-d+1-ungerer")?.PrixTotal).toBe(16.5);
  });

  it("splits an old booking with empty counters", async () => {
    const fake = start();
    await postStaff({ ...ungerer, id: "r1b-d+1-petit", nbEleve: "", nbProf: 4, nbExt: "" });
    expect(fake.db.r1Bookings.find((b) => b.ID === "r1b-d+1-petit")).toMatchObject({
      Qte: 4,
      NbEleve: 0,
      NbProf: 4,
      NbExt: 0,
      PrixTotal: 24.4,
    });
  });

  it("accepts up to the seats left plus its own seats", async () => {
    const fake = start();
    await postStaff({ ...ungerer, nbEleve: 7 });
    expect(fake.db.r1Bookings.find((b) => b.ID === "r1b-d+1-ungerer")?.Qte).toBe(8);
  });

  it("does not check the capacity of a deleted day", async () => {
    const fake = start();
    fake.db.r1Days = fake.db.r1Days.filter((d) => d.Date !== "2026-10-06");
    expect(await postStaff({ ...ungerer, nbEleve: 40 })).not.toHaveProperty("error");
  });

  it.each([
    [{ nbEleve: 2.5 }, "Quantité invalide : indiquez un nombre entier positif."],
    [{ nbProf: -1 }, "Quantité invalide : indiquez un nombre entier positif."],
    [{ nbExt: "abc" }, "Quantité invalide : indiquez un nombre entier positif."],
    [{ nbEleve: 0, nbProf: "", nbExt: null }, "Merci de renseigner au moins une personne."],
    [{ id: "r1b-gone" }, "Réservation introuvable."],
    [{ nbEleve: 8 }, "Il ne reste que 8 couvert(s) disponible(s) pour ce jour."],
    // Quantities are checked before the id.
    [{ id: "r1b-gone", nbEleve: 0, nbProf: 0 }, "Merci de renseigner au moins une personne."],
  ])("answers %j with « %s » and writes nothing", async (change, error) => {
    const fake = start();
    expect(await postStaff({ ...ungerer, ...change })).toStrictEqual({ error });
    expect(fake.db).toStrictEqual(createSeed());
  });
});
