import type { Cell, FakeDb, Script } from "@/mocks/fake-db";

// Helpers of Code.gs (`cell`, `toCount`, `isEmail`, `sumQte`, `getConfig`, `getState`, `buildPublicState`), same rules.

export type Body = Record<string, unknown>;

/** A protected action of 02 § 4.7 once the password is checked: it changes the tables and answers nothing. */
export type Write = (script: Script, body: Body) => void;

export function isRecord(value: unknown): value is Body {
  return typeof value === "object" && value !== null;
}

/** Value written in a cell: null and undefined become an empty cell. */
export function cell(value: unknown): Cell {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return JSON.stringify(value);
}

/** Key match of Code.gs `updateRowByKey` and `removeRowsByValue`: both cells read as strings. */
export function sameCell(cellValue: Cell, value: unknown): boolean {
  return String(cellValue) === String(value);
}

/** `value || ''` of Code.gs (Observation, Prix, Theme, OuvertPar). */
export function orEmpty(value: unknown): Cell {
  const present = Boolean(value);
  return present ? cell(value) : "";
}

/** Number of people or portions: integer ≥ 0, empty = 0, anything else refused. */
export function toCount(value: unknown): number {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("Quantité invalide : indiquez un nombre entier positif.");
  }
  return n;
}

export function isEmail(value: unknown): boolean {
  const present = Boolean(value);
  return /\S+@\S+\.\S+/u.test(present ? String(value) : "");
}

export function sumQte<T extends { Qte: Cell }>(rows: T[], match: (row: T) => boolean): number {
  let sum = 0;
  for (const row of rows) {
    if (match(row)) {
      sum += Number(row.Qte) || 0;
    }
  }
  return sum;
}

// Sums of `Qte` per key, in order of first appearance.
function sums<T extends { Qte: Cell }>(
  rows: T[],
  keyOf: (row: T) => Cell,
): Array<[string, number]> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = String(keyOf(row));
    totals.set(key, (totals.get(key) ?? 0) + (Number(row.Qte) || 0));
  }
  return [...totals];
}

function configValue(db: FakeDb, key: string, fallback: string): Cell {
  const value = db.config[key];
  return value === undefined || value === "" || value === 0 || value === false ? fallback : value;
}

/** Settings with the script's defaults for missing or empty values. */
export function readConfig(db: FakeDb) {
  return {
    name1: configValue(db, "name1", "Restaurant 1"),
    name2: configValue(db, "name2", "Restaurant 2"),
    desc1: configValue(db, "desc1", "Table réservée par nombre de couverts, avec le menu du jour."),
    desc2: configValue(db, "desc2", "Plats à emporter ou sur place, chacun avec son propre stock."),
    contactAnnulation: configValue(db, "contactAnnulation", "l'établissement"),
    priceEleve: configValue(db, "priceEleve", "4.95"),
    priceProf: configValue(db, "priceProf", "6.10"),
    priceExterieur: configValue(db, "priceExterieur", "9.90"),
  };
}

/** Code.gs `getState`: every row with every column, personal data included, and no etag (02 § 4.3). */
export function fullState(db: FakeDb): object {
  return structuredClone({
    r1Days: db.r1Days,
    r1Bookings: db.r1Bookings,
    r2Days: db.r2Days,
    r2Items: db.r2Items,
    r2Bookings: db.r2Bookings,
    ...readConfig(db),
  });
}

/** Public state without its etag: no personal data, bookings summed per date (R1) and per dish (R2). */
export function publicContent(db: FakeDb) {
  return {
    r1Days: db.r1Days.map((d) => ({
      Date: d.Date,
      Capacite: d.Capacite,
      Menu: d.Menu,
      Theme: d.Theme,
    })),
    r1Bookings: sums(db.r1Bookings, (b) => b.Date).map(([date, qte]) => ({ Date: date, Qte: qte })),
    r2Days: db.r2Days.map((d) => ({ Date: d.Date, Note: d.Note, Theme: d.Theme })),
    r2Items: db.r2Items.map((dish) => ({
      ID: dish.ID,
      Date: dish.Date,
      Nom: dish.Nom,
      Stock: dish.Stock,
      Prix: dish.Prix,
    })),
    r2Bookings: sums(db.r2Bookings, (b) => b.ItemID).map(([itemId, qte]) => ({
      ItemID: itemId,
      Qte: qte,
    })),
    ...readConfig(db),
  };
}

/** Paris date of a write, as a date cell reads back (`Timestamp: new Date()`). */
export function parisToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(Date.now());
}
