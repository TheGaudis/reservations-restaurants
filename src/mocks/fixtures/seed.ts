import type { FakeDb, R1BookingRow, R2BookingRow } from "@/mocks/fake-db";
import { TODAY } from "@/test/clock";

/** Staff password of the seed (parite.md § 2). */
export const SEED_PASSWORD = "secret";

// UTC arithmetic on ISO dates: no time zone can shift a business day.
function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

type Day = (offset: number) => string;
type Person = Pick<R1BookingRow, "Nom" | "Contact" | "Classe">;

const UNGERER: Person = { Nom: "Cyrille Ungerer", Contact: "c.ungerer@exemple.fr", Classe: "TS2" };
const GSELL: Person = {
  Nom: "Ariele Gsell",
  Contact: "a.gsell@exemple.fr",
  Classe: "Vie scolaire",
};
const BERNARD: Person = { Nom: "Noah Bernard", Contact: "n.bernard@exemple.fr", Classe: "TS1" };
// Phone number: confirmation without e-mail.
const MARTIN: Person = { Nom: "Léa Martin", Contact: "06 12 34 56 78", Classe: "BTS1" };
const PETIT: Person = { Nom: "Jean Petit", Contact: "j.petit@exemple.fr", Classe: "Personnel" };
const DURAND: Person = { Nom: "Paul Durand", Contact: "p.durand@exemple.fr", Classe: "TS1" };
const VOLTAIRE: Person = {
  Nom: "Lycée Voltaire",
  Contact: "accueil@voltaire.exemple.fr",
  Classe: "Partenaires",
};
const ANCIENS: Person = {
  Nom: "Association des anciens",
  Contact: "anciens@exemple.fr",
  Classe: "Extérieurs",
};

function r1Days(day: Day): FakeDb["r1Days"] {
  return [
    // Past day; the 1st of the month (« 1er », E-21).
    {
      Date: day(-4),
      Capacite: 20,
      Menu: "Velouté, suprême de volaille, tarte fine",
      Theme: "Automne",
      OuvertPar: "M. Dupont",
    },
    // Today, with theme and menu: 8 booked.
    {
      Date: day(0),
      Capacite: 20,
      Menu: "Salade de saison, pavé de saumon, crème brûlée",
      Theme: "Cuisine du marché",
      OuvertPar: "Mme Martin",
    },
    // Tomorrow, almost full: 15 booked, 5 left.
    {
      Date: day(1),
      Capacite: 20,
      Menu: "Velouté de potiron, blanquette, tarte Tatin",
      Theme: "",
      OuvertPar: "M. Dupont",
    },
    // Full: 10 booked.
    { Date: day(4), Capacite: 10, Menu: "Menu gastronomique", Theme: "", OuvertPar: "" },
    // Amount above 999 € (E-20): 120 guests at 9,90 €.
    {
      Date: day(7),
      Capacite: 150,
      Menu: "Repas de gala",
      Theme: "Portes ouvertes",
      OuvertPar: "Mme Martin",
    },
  ];
}

function r1Bookings(day: Day): R1BookingRow[] {
  const row = (
    id: string,
    offset: number,
    person: Person,
    fields: Partial<R1BookingRow>,
  ): R1BookingRow => ({
    ID: id,
    Date: day(offset),
    ...person,
    Qte: 0,
    Timestamp: day(Math.min(offset, 0) - 3),
    Observation: "",
    NbEleve: 0,
    NbProf: 0,
    NbExt: 0,
    PrixTotal: 0,
    ...fields,
  });
  return [
    row("r1b-d-4-ungerer", -4, UNGERER, { Qte: 4, NbEleve: 4, PrixTotal: 19.8 }),
    row("r1b-d0-gsell", 0, GSELL, { Qte: 2, NbProf: 2, PrixTotal: 12.2 }),
    row("r1b-d0-bernard", 0, BERNARD, { Qte: 6, NbEleve: 6, PrixTotal: 29.7 }),
    // « Cyrille Ungerer — TS2 — 3 couverts — 16,00 € — contact — observation » (REG-35).
    row("r1b-d+1-ungerer", 1, UNGERER, {
      Qte: 3,
      NbEleve: 2,
      NbProf: 1,
      PrixTotal: 16,
      Observation: "Table près de la fenêtre",
    }),
    row("r1b-d+1-martin", 1, MARTIN, { Qte: 8, NbExt: 8, PrixTotal: 79.2 }),
    // Written before the prices existed: empty counters and total.
    row("r1b-d+1-petit", 1, PETIT, { Qte: 4, NbEleve: "", NbProf: "", NbExt: "", PrixTotal: "" }),
    row("r1b-d+4-voltaire", 4, VOLTAIRE, { Qte: 10, NbExt: 10, PrixTotal: 99 }),
    row("r1b-d+7-anciens", 7, ANCIENS, { Qte: 120, NbExt: 120, PrixTotal: 1188 }),
  ];
}

function r2Days(day: Day): FakeDb["r2Days"] {
  return [
    { Date: day(-4), Note: "", Theme: "", OuvertPar: "M. Dupont" },
    // Today: voucher dishes, dine-in only (invariant 5).
    { Date: day(0), Note: "", Theme: "Semaine italienne", OuvertPar: "Mme Martin" },
    { Date: day(1), Note: "", Theme: "", OuvertPar: "M. Dupont" },
    // Open day without any dish: no service.
    {
      Date: day(5),
      Note: "Crêpes à emporter le midi",
      Theme: "Journée bretonne",
      OuvertPar: "Mme Martin",
    },
    // Every dish sold out.
    { Date: day(6), Note: "", Theme: "", OuvertPar: "M. Dupont" },
    // No voucher dish: « À emporter » is offered.
    { Date: day(8), Note: "", Theme: "", OuvertPar: "M. Dupont" },
  ];
}

function r2Items(day: Day): FakeDb["r2Items"] {
  return [
    { ID: "r2i-d-4-lasagnes", Date: day(-4), Nom: "Lasagnes", Stock: 10, Prix: 4.5 },
    { ID: "r2i-d0-lasagnes", Date: day(0), Nom: "Lasagnes", Stock: 10, Prix: 4.5 },
    { ID: "r2i-d0-bowl", Date: day(0), Nom: "Bowl (ticket restaurant)", Stock: 10, Prix: "" },
    { ID: "r2i-d0-wrap", Date: day(0), Nom: "Wrap (ticket restaurant)", Stock: 5, Prix: "" },
    { ID: "r2i-d0-salade", Date: day(0), Nom: "Salade", Stock: 5, Prix: "" },
    { ID: "r2i-d+1-lasagnes", Date: day(1), Nom: "Lasagnes", Stock: 15, Prix: 4.5 },
    { ID: "r2i-d+1-bowl", Date: day(1), Nom: "Bowl (ticket restaurant)", Stock: 10, Prix: "" },
    { ID: "r2i-d+6-couscous", Date: day(6), Nom: "Couscous", Stock: 3, Prix: 6 },
    { ID: "r2i-d+6-tajine", Date: day(6), Nom: "Tajine", Stock: 2, Prix: 6.5 },
    { ID: "r2i-d+8-lasagnes", Date: day(8), Nom: "Lasagnes", Stock: 8, Prix: 4.5 },
    { ID: "r2i-d+8-salade", Date: day(8), Nom: "Salade", Stock: 6, Prix: "" },
  ];
}

function r2Bookings(day: Day): R2BookingRow[] {
  const row = (
    id: string,
    itemId: string,
    person: Person,
    fields: Partial<R2BookingRow>,
  ): R2BookingRow => ({
    ID: id,
    ItemID: itemId,
    Date: day(0),
    ...person,
    Qte: 0,
    Mode: "surplace",
    Timestamp: day(-2),
    Observation: "",
    ...fields,
  });
  const takeaway = { Mode: "emporter" };
  return [
    row("r2b-d-4-martin", "r2i-d-4-lasagnes", MARTIN, {
      Date: day(-4),
      Timestamp: day(-6),
      Qte: 2,
      ...takeaway,
    }),
    // Lasagnes of today: 6 booked, 4 left.
    row("r2b-d0-ungerer", "r2i-d0-lasagnes", UNGERER, { Qte: 4 }),
    row("r2b-d0-martin", "r2i-d0-lasagnes", MARTIN, { Qte: 2 }),
    // Customer A: 3 voucher dishes in one order, one voucher for the order (E-16).
    row("r2b-d+1-gsell", "r2i-d+1-bowl", GSELL, { Date: day(1), Qte: 3 }),
    // Customer B.
    row("r2b-d+1-bernard", "r2i-d+1-lasagnes", BERNARD, {
      Date: day(1),
      Qte: 1,
      Observation: "Sans fromage",
    }),
    // Orphan of tomorrow: its dish was deleted (b-3).
    row("r2b-d+1-durand", "r2i-deleted-dish", DURAND, { Date: day(1), Qte: 2 }),
    row("r2b-d+6-bernard", "r2i-d+6-couscous", BERNARD, { Date: day(6), Qte: 3, ...takeaway }),
    row("r2b-d+6-gsell", "r2i-d+6-tajine", GSELL, { Date: day(6), Qte: 2, ...takeaway }),
  ];
}

/**
 * Base data set of parite.md § 2, dated from `today` (TODAY in tests, the real Paris date under `pnpm dev`).
 * Ids name the day relative to `today` (`r2i-d0-lasagnes` today, `r1b-d+1-ungerer` tomorrow), so that scenarios
 * can target a row whatever the date.
 */
export function createSeed(today: string = TODAY): FakeDb {
  const day: Day = (offset) => addDays(today, offset);
  return {
    etag: "E1",
    config: {
      name1: "Restaurant Pédagogique",
      name2: "Aristide",
      contactAnnulation: "le secrétariat",
      priceEleve: "4.95",
      priceProf: "6.10",
      priceExterieur: "9.90",
    },
    r1Days: r1Days(day),
    r1Bookings: r1Bookings(day),
    r2Days: r2Days(day),
    r2Items: r2Items(day),
    r2Bookings: r2Bookings(day),
    requestIds: [],
    mailError: null,
  };
}
