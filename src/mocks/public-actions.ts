import type { Cell, Script } from "@/mocks/fake-db";
import { cell, isRecord, orEmpty, parisToday, readConfig, sumQte, toCount } from "@/mocks/sheet";
import type { Body } from "@/mocks/sheet";

// Public bookings of Code.gs, sent without password (02 § 4.4, § 4.5), in the script's order of checks.

/** `addBookingR1`: `_duplicate` comes before any check (02 § 5.3). */
export function addBookingR1(script: Script, body: Body): object {
  const { db } = script;
  if (script.alreadyProcessed(body["requestId"])) {
    return { ...script.publicState(), _duplicate: true };
  }
  const nbEleve = toCount(body["nbEleve"]);
  const nbProf = toCount(body["nbProf"]);
  const nbExt = toCount(body["nbExt"]);
  const qte = nbEleve + nbProf + nbExt;
  if (qte <= 0) {
    throw new Error("Merci de renseigner au moins une personne.");
  }
  const date = body["date"];
  const day = db.r1Days.find((d) => d.Date === date);
  if (day === undefined) {
    throw new Error("Ce jour n'existe plus.");
  }
  const remaining = Number(day.Capacite) - sumQte(db.r1Bookings, (b) => b.Date === date);
  if (qte > remaining) {
    throw new Error(`Il ne reste que ${remaining} couvert(s) pour ce jour.`);
  }
  const cfg = readConfig(db);
  const total =
    nbEleve * Number(cfg.priceEleve) +
    nbProf * Number(cfg.priceProf) +
    nbExt * Number(cfg.priceExterieur);
  db.r1Bookings.push({
    ID: crypto.randomUUID(),
    Date: cell(date),
    Nom: cell(body["nom"]),
    Contact: cell(body["contact"]),
    Classe: cell(body["classe"]),
    Qte: qte,
    Timestamp: parisToday(),
    Observation: orEmpty(body["observation"]),
    NbEleve: nbEleve,
    NbProf: nbProf,
    NbExt: nbExt,
    PrixTotal: Math.round(total * 100) / 100,
  });
  script.markProcessed(body["requestId"]);
  const emailStatus = script.sendMail(body["contact"]);
  return { ...script.publicState(), _emailStatus: emailStatus };
}

interface BookingResult {
  confirmed: Array<{ itemId: unknown; nom: Cell; qte: number; prix: Cell }>;
  adjusted: Array<{ nom: Cell; demande: number; accorde: number }>;
  skipped: Array<{ nom: Cell }>;
}

// Requested lines with a quantity above 0; an invalid quantity refuses the whole order.
function requestedLines(items: unknown): Array<{ itemId: unknown; qte: number }> {
  if (!Array.isArray(items)) {
    throw new TypeError("Choisissez au moins un plat.");
  }
  const list: unknown[] = items;
  return list
    .map((line) => ({
      itemId: isRecord(line) ? line["itemId"] : undefined,
      qte: toCount(isRecord(line) ? line["qte"] : undefined),
    }))
    .filter((line) => line.qte > 0);
}

// Each line gets what is left of its dish, counting the earlier lines of the same order; 0 left = skipped.
function grantLines(
  script: Script,
  body: Body,
  lines: Array<{ itemId: unknown; qte: number }>,
): BookingResult {
  const { db } = script;
  const before = [...db.r2Bookings];
  const result: BookingResult = { confirmed: [], adjusted: [], skipped: [] };
  for (const line of lines) {
    const dish = db.r2Items.find((d) => d.ID === line.itemId);
    if (dish === undefined) {
      result.skipped.push({ nom: "(plat supprimé)" });
      continue;
    }
    let used = sumQte(before, (b) => b.ItemID === line.itemId);
    for (const c of result.confirmed) {
      if (c.itemId === line.itemId) {
        used += c.qte;
      }
    }
    const granted = Math.max(0, Math.min(line.qte, Number(dish.Stock) - used));
    if (granted <= 0) {
      result.skipped.push({ nom: dish.Nom });
      continue;
    }
    db.r2Bookings.push({
      ID: crypto.randomUUID(),
      ItemID: cell(line.itemId),
      Date: cell(body["date"]),
      Nom: cell(body["nom"]),
      Contact: cell(body["contact"]),
      Classe: cell(body["classe"]),
      Qte: granted,
      Mode: cell(body["mode"]),
      Timestamp: parisToday(),
      Observation: orEmpty(body["observation"]),
    });
    result.confirmed.push({
      itemId: line.itemId,
      nom: dish.Nom,
      qte: granted,
      prix: orEmpty(dish.Prix),
    });
    if (granted < line.qte) {
      result.adjusted.push({ nom: dish.Nom, demande: line.qte, accorde: granted });
    }
  }
  return result;
}

/** `addBookingR2Multi`: never an error for missing stock, the order is reduced (02 § 4.5). */
export function addBookingR2Multi(script: Script, body: Body): object {
  const lines = requestedLines(body["items"]);
  if (script.alreadyProcessed(body["requestId"])) {
    return { ...script.publicState(), _duplicate: true };
  }
  const result = grantLines(script, body, lines);
  if (result.confirmed.length > 0) {
    script.markProcessed(body["requestId"]);
  }
  let totalPrix = 0;
  let hasPriceGap = false;
  for (const c of result.confirmed) {
    if (c.prix === "") {
      hasPriceGap = true;
    } else {
      totalPrix += Number(c.prix) * c.qte;
    }
  }
  const emailStatus = result.confirmed.length > 0 ? script.sendMail(body["contact"]) : null;
  return {
    ...script.publicState(),
    _bookingResult: { ...result, totalPrix, hasPriceGap },
    _emailStatus: emailStatus,
  };
}
