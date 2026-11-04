import { cell, isRecord, orEmpty, sameCell, sumQte, toCount } from "@/mocks/sheet";
import type { Body, Write } from "@/mocks/sheet";

// Protected R2 actions of Code.gs (02 § 4.7, 06 § 4.2, § 5.2, § 6, § 7.4), in the script's order of checks. The
// password is checked before them, and the full state answered after them, by `script.ts`.

// `(items || []).filter(it => …).map(it => …)` of Code.gs: a null or undefined line throws on `it.name`, any
// other value that is not an object reads as a dish without name, stock or price.
function dishLines(items: unknown): Body[] {
  const present = Boolean(items);
  if (!present) {
    return [];
  }
  if (!Array.isArray(items)) {
    throw new TypeError("(items || []).filter is not a function");
  }
  const lines: unknown[] = items;
  return lines.map((line) => {
    if (line === null || line === undefined) {
      throw new TypeError(`Cannot read properties of ${String(line)} (reading 'name')`);
    }
    return isRecord(line) ? line : {};
  });
}

/**
 * Day written first, then the dishes: an open day keeps its dishes and only gets the names it lacks, compared
 * without case (06 § 4.2); `items: []` changes the note, the theme and « ouvert par » only (b-12).
 */
const addDayR2: Write = (script, body) => {
  const { db } = script;
  const date = body["date"];
  const fields = {
    Note: cell(body["note"]),
    Theme: orEmpty(body["theme"]),
    OuvertPar: orEmpty(body["collegue"]),
  };
  const day = db.r2Days.find((d) => sameCell(d.Date, date));
  if (day === undefined) {
    db.r2Days.push({ Date: cell(date), ...fields });
  } else {
    Object.assign(day, fields);
  }
  const existing =
    day === undefined
      ? []
      : db.r2Items
          .filter((dish) => dish.Date === date)
          .map((dish) => String(dish.Nom).toLowerCase());
  for (const line of dishLines(body["items"])) {
    if (!existing.includes(String(line["name"]).toLowerCase())) {
      db.r2Items.push({
        ID: crypto.randomUUID(),
        Date: cell(date),
        Nom: cell(line["name"]),
        Stock: cell(line["stock"]),
        Prix: orEmpty(line["price"]),
      });
    }
  }
};

/** Stock is not checked (b-4); price 0 is written empty (b-8). */
const addItemR2: Write = (script, body) => {
  const { db } = script;
  if (!db.r2Days.some((d) => d.Date === body["date"])) {
    throw new Error("Ce jour n'est pas ouvert.");
  }
  db.r2Items.push({
    ID: crypto.randomUUID(),
    Date: cell(body["date"]),
    Nom: cell(body["name"]),
    Stock: cell(body["stock"]),
    Prix: orEmpty(body["price"]),
  });
};

/** Stock may go below the booked portions (b-4); price 0 is written empty (b-8). */
const editItemR2: Write = (script, body) => {
  const dish = script.db.r2Items.find((d) => sameCell(d.ID, body["itemId"]));
  if (dish === undefined) {
    throw new Error("Plat introuvable.");
  }
  Object.assign(dish, {
    Nom: cell(body["name"]),
    Stock: cell(body["stock"]),
    Prix: orEmpty(body["price"]),
  });
};

/** The bookings of the dish stay, orphaned (b-3). */
const deleteItemR2: Write = (script, body) => {
  const { db } = script;
  db.r2Items = db.r2Items.filter((d) => !sameCell(d.ID, body["itemId"]));
};

/** Day, dishes and bookings of the date go, without any e-mail (02 § 6.2). */
const deleteDayR2: Write = (script, body) => {
  const { db } = script;
  const date = body["date"];
  db.r2Days = db.r2Days.filter((d) => !sameCell(d.Date, date));
  db.r2Items = db.r2Items.filter((d) => !sameCell(d.Date, date));
  db.r2Bookings = db.r2Bookings.filter((b) => !sameCell(b.Date, date));
};

/** The cancellation e-mail goes after the response is built: its status is never returned (02 § 6.2). */
const deleteBookingR2: Write = (script, body) => {
  const { db } = script;
  db.r2Bookings = db.r2Bookings.filter((b) => !sameCell(b.ID, body["id"]));
};

/** The dish cannot change; an orphan booking (dish deleted) is not checked against any stock. */
const editBookingR2: Write = (script, body) => {
  const { db } = script;
  const qte = toCount(body["qte"]);
  if (qte <= 0) {
    throw new Error("Indiquez une quantité supérieure à 0.");
  }
  const booking = db.r2Bookings.find((b) => b.ID === body["id"]);
  if (booking === undefined) {
    throw new Error("Réservation introuvable.");
  }
  const dish = db.r2Items.find((d) => d.ID === booking.ItemID);
  if (dish !== undefined) {
    const others = sumQte(db.r2Bookings, (b) => b.ItemID === booking.ItemID && b.ID !== booking.ID);
    const remaining = Number(dish.Stock) - others;
    if (qte > remaining) {
      throw new Error(`Il ne reste que ${remaining} portion(s) disponible(s) pour ce plat.`);
    }
  }
  Object.assign(booking, {
    Nom: cell(body["nom"]),
    Contact: cell(body["contact"]),
    Classe: cell(body["classe"]),
    Qte: qte,
    Mode: cell(body["mode"]),
    Observation: orEmpty(body["observation"]),
  });
};

export const R2_WRITES = {
  addDayR2,
  addItemR2,
  editItemR2,
  deleteItemR2,
  deleteDayR2,
  deleteBookingR2,
  editBookingR2,
};
