import { cell, orEmpty, readConfig, sameCell, sumQte, toCount } from "@/mocks/sheet";
import type { Write } from "@/mocks/sheet";

// Protected R1 actions of Code.gs (02 § 4.7, 06 § 4.1, § 5, § 7.3), in the script's order of checks. The password
// is checked before them, and the full state answered after them, by `script.ts`.

/** A date already open is overwritten, booked seats or not (b-4). */
const addDayR1: Write = (script, body) => {
  const { db } = script;
  const fields = {
    Capacite: cell(body["capacity"]),
    Menu: cell(body["menu"]),
    Theme: orEmpty(body["theme"]),
    OuvertPar: orEmpty(body["collegue"]),
  };
  const day = db.r1Days.find((d) => sameCell(d.Date, body["date"]));
  if (day === undefined) {
    db.r1Days.push({ Date: cell(body["date"]), ...fields });
  } else {
    Object.assign(day, fields);
  }
};

/** A date that is not open changes nothing and answers no error (b-10). */
const editDayR1: Write = (script, body) => {
  const { db } = script;
  const date = body["date"];
  const used = sumQte(db.r1Bookings, (b) => b.Date === date);
  if (Number(body["capacity"]) < used) {
    throw new Error(
      `Impossible : ${used} couvert(s) déjà réservé(s) pour ce jour, la capacité ne peut pas être inférieure.`,
    );
  }
  const day = db.r1Days.find((d) => sameCell(d.Date, date));
  if (day !== undefined) {
    Object.assign(day, {
      Capacite: cell(body["capacity"]),
      Menu: cell(body["menu"]),
      Theme: orEmpty(body["theme"]),
    });
  }
};

/** The day and all its bookings go, without any e-mail (02 § 6.2). */
const deleteDayR1: Write = (script, body) => {
  const { db } = script;
  db.r1Days = db.r1Days.filter((d) => !sameCell(d.Date, body["date"]));
  db.r1Bookings = db.r1Bookings.filter((b) => !sameCell(b.Date, body["date"]));
};

/** The cancellation e-mail goes after the response is built: its status is never returned (02 § 6.2). */
const deleteBookingR1: Write = (script, body) => {
  const { db } = script;
  db.r1Bookings = db.r1Bookings.filter((b) => !sameCell(b.ID, body["id"]));
};

/** `qte` and `prixTotal` of the body are ignored: the script counts the seats and the price again (b-10). */
const editBookingR1: Write = (script, body) => {
  const { db } = script;
  const nbEleve = toCount(body["nbEleve"]);
  const nbProf = toCount(body["nbProf"]);
  const nbExt = toCount(body["nbExt"]);
  const qte = nbEleve + nbProf + nbExt;
  if (qte <= 0) {
    throw new Error("Merci de renseigner au moins une personne.");
  }
  const booking = db.r1Bookings.find((b) => b.ID === body["id"]);
  if (booking === undefined) {
    throw new Error("Réservation introuvable.");
  }
  const day = db.r1Days.find((d) => d.Date === booking.Date);
  if (day !== undefined) {
    const others = sumQte(db.r1Bookings, (b) => b.Date === booking.Date && b.ID !== booking.ID);
    const remaining = Number(day.Capacite) - others;
    if (qte > remaining) {
      throw new Error(`Il ne reste que ${remaining} couvert(s) disponible(s) pour ce jour.`);
    }
  }
  const cfg = readConfig(db);
  const total =
    nbEleve * Number(cfg.priceEleve) +
    nbProf * Number(cfg.priceProf) +
    nbExt * Number(cfg.priceExterieur);
  Object.assign(booking, {
    Nom: cell(body["nom"]),
    Contact: cell(body["contact"]),
    Classe: cell(body["classe"]),
    Qte: qte,
    Observation: orEmpty(body["observation"]),
    NbEleve: nbEleve,
    NbProf: nbProf,
    NbExt: nbExt,
    PrixTotal: Math.round(total * 100) / 100,
  });
};

export const R1_WRITES = { addDayR1, editDayR1, deleteDayR1, deleteBookingR1, editBookingR1 };
