// ============================================================
// RÉSERVATIONS RESTAURANTS PÉDAGOGIQUES — Backend Google Apps Script
// Version API JSON (compatible avec un site hébergé ailleurs, ex. Netlify)
// À coller dans Extensions > Apps Script > fichier Code.gs
// ============================================================

const SS = SpreadsheetApp.getActiveSpreadsheet();
const ADMIN_PASSWORD = "*************"; // change cette valeur si tu veux un autre mot de passe

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    return jsonOut(getState());
  } catch (err) {
    return jsonOut({ error: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    let result;
    switch (action) {
      case 'checkPassword': result = { ok: checkPassword(body.password) }; break;
      case 'addDayR1': result = addDayR1(body.password, body.date, body.capacity, body.menu, body.theme, body.collegue); break;
      case 'editDayR1': result = editDayR1(body.password, body.date, body.capacity, body.menu, body.theme); break;
      case 'deleteDayR1': result = deleteDayR1(body.password, body.date); break;
      case 'deleteBookingR1': result = deleteBookingR1(body.password, body.id); break;
      case 'addBookingR1': result = addBookingR1(body.date, body.nom, body.contact, body.classe, body.nbEleve, body.nbProf, body.nbExt, body.observation); break;
      case 'editBookingR1': result = editBookingR1(body.password, body.id, body.nom, body.contact, body.classe, body.nbEleve, body.nbProf, body.nbExt, body.observation); break;
      case 'addDayR2': result = addDayR2(body.password, body.date, body.note, body.items, body.theme, body.collegue); break;
      case 'addItemR2': result = addItemR2(body.password, body.date, body.name, body.stock, body.price); break;
      case 'editItemR2': result = editItemR2(body.password, body.itemId, body.name, body.stock, body.price); break;
      case 'deleteItemR2': result = deleteItemR2(body.password, body.itemId); break;
      case 'deleteDayR2': result = deleteDayR2(body.password, body.date); break;
      case 'deleteBookingR2': result = deleteBookingR2(body.password, body.id); break;
      case 'addBookingR2': result = addBookingR2(body.date, body.itemId, body.nom, body.contact, body.classe, body.qte, body.mode); break;
      case 'addBookingR2Multi': result = addBookingR2Multi(body.date, body.nom, body.contact, body.classe, body.mode, body.items, body.observation); break;
      case 'editBookingR2': result = editBookingR2(body.password, body.id, body.nom, body.contact, body.classe, body.qte, body.mode, body.observation); break;
      case 'setConfigField': result = setConfigField(body.password, body.key, body.value); break;
      default: throw new Error('Action inconnue: ' + action);
    }
    return jsonOut(result);
  } catch (err) {
    return jsonOut({ error: err.message });
  }
}

function getSheet(name, headers) {
  let sh = SS.getSheetByName(name);
  if (!sh) {
    sh = SS.insertSheet(name);
    sh.appendRow(headers);
  } else {
    const lastCol = Math.max(sh.getLastColumn(), 1);
    const existing = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    headers.forEach(h => {
      if (existing.indexOf(h) === -1) {
        sh.getRange(1, sh.getLastColumn() + 1).setValue(h);
        existing.push(h);
      }
    });
  }
  return sh;
}

function sheetToObjects(sh) {
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const tz = Session.getScriptTimeZone();
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
      }
      obj[h] = val;
    });
    return obj;
  });
}

function removeRowsByValue(sheetName, colName, value) {
  const sh = SS.getSheetByName(sheetName);
  if (!sh) return;
  const tz = Session.getScriptTimeZone();
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const colIdx = headers.indexOf(colName);
  for (let i = data.length - 1; i >= 1; i--) {
    let cell = data[i][colIdx];
    if (cell instanceof Date) cell = Utilities.formatDate(cell, tz, 'yyyy-MM-dd');
    if (String(cell) === String(value)) sh.deleteRow(i + 1);
  }
}

function updateRowById(sheetName, id, updates) {
  const sh = SS.getSheetByName(sheetName);
  if (!sh) throw new Error('Feuille introuvable.');
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('ID');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      Object.keys(updates).forEach(key => {
        const colIdx = headers.indexOf(key);
        if (colIdx !== -1) sh.getRange(i + 1, colIdx + 1).setValue(updates[key]);
      });
      return true;
    }
  }
  throw new Error('Réservation introuvable.');
}

function updateRowByKey(sheetName, keyCol, keyVal, updates) {
  const sh = SS.getSheetByName(sheetName);
  if (!sh) return false;
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const tz = Session.getScriptTimeZone();
  const keyIdx = headers.indexOf(keyCol);
  for (let i = 1; i < data.length; i++) {
    let cell = data[i][keyIdx];
    if (cell instanceof Date) cell = Utilities.formatDate(cell, tz, 'yyyy-MM-dd');
    if (String(cell) === String(keyVal)) {
      Object.keys(updates).forEach(key => {
        const colIdx = headers.indexOf(key);
        if (colIdx !== -1) sh.getRange(i + 1, colIdx + 1).setValue(updates[key]);
      });
      return true;
    }
  }
  return false;
}

function checkPassword(pwd) {
  return pwd === ADMIN_PASSWORD;
}

function isEmail(str) {
  return /\S+@\S+\.\S+/.test(String(str || ''));
}

function sendMailSafe(to, subject, body) {
  if (!isEmail(to)) return { sent: false, reason: 'no-email' };
  try {
    MailApp.sendEmail(to, subject, body);
    return { sent: true };
  } catch (e) {
    console.log('Erreur envoi email: ' + e);
    return { sent: false, reason: String(e) };
  }
}

function getConfig() {
  const sh = getSheet('Config', ['Key', 'Value']);
  const rows = sheetToObjects(sh);
  const cfg = {};
  rows.forEach(r => cfg[r.Key] = r.Value);
  return {
    name1: cfg.name1 || 'Restaurant 1',
    name2: cfg.name2 || 'Restaurant 2',
    desc1: cfg.desc1 || 'Table réservée par nombre de couverts, avec le menu du jour.',
    desc2: cfg.desc2 || 'Plats à emporter ou sur place, chacun avec son propre stock.',
    contactAnnulation: cfg.contactAnnulation || "l'établissement",
    priceEleve: cfg.priceEleve || '4.95',
    priceProf: cfg.priceProf || '6.10',
    priceExterieur: cfg.priceExterieur || '9.90'
  };
}

function setConfigValue(key, value) {
  const sh = getSheet('Config', ['Key', 'Value']);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) { sh.getRange(i + 1, 2).setValue(value); return; }
  }
  sh.appendRow([key, value]);
}

function setConfigField(password, key, value) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  setConfigValue(key, value);
  return getState();
}

function getState() {
  const r1Days = sheetToObjects(getSheet('R1_Days', ['Date', 'Capacite', 'Menu', 'Theme', 'OuvertPar']));
  const r1Bookings = sheetToObjects(getSheet('R1_Bookings', ['ID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Timestamp', 'Observation', 'NbEleve', 'NbProf', 'NbExt', 'PrixTotal']));
  const r2Days = sheetToObjects(getSheet('R2_Days', ['Date', 'Note', 'Theme', 'OuvertPar']));
  const r2Items = sheetToObjects(getSheet('R2_Items', ['ID', 'Date', 'Nom', 'Stock', 'Prix']));
  const r2Bookings = sheetToObjects(getSheet('R2_Bookings', ['ID', 'ItemID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Mode', 'Timestamp', 'Observation']));
  const cfg = getConfig();
  return {
    r1Days, r1Bookings, r2Days, r2Items, r2Bookings,
    name1: cfg.name1, name2: cfg.name2, desc1: cfg.desc1, desc2: cfg.desc2, contactAnnulation: cfg.contactAnnulation,
    priceEleve: cfg.priceEleve, priceProf: cfg.priceProf, priceExterieur: cfg.priceExterieur
  };
}

// ---------- Restaurant 1 ----------

function addDayR1(password, date, capacity, menu, theme, collegue) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const exists = updateRowByKey('R1_Days', 'Date', date, { Capacite: capacity, Menu: menu, Theme: theme || '', OuvertPar: collegue || '' });
    if (!exists) {
      getSheet('R1_Days', ['Date', 'Capacite', 'Menu', 'Theme', 'OuvertPar']).appendRow([date, capacity, menu, theme || '', collegue || '']);
    }
    return getState();
  } finally {
    lock.releaseLock();
  }
}

function editDayR1(password, date, capacity, menu, theme) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const bookings = sheetToObjects(getSheet('R1_Bookings', ['ID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Timestamp', 'Observation']));
    const used = bookings.filter(b => b.Date === date).reduce((s, b) => s + Number(b.Qte), 0);
    if (Number(capacity) < used) throw new Error('Impossible : ' + used + ' couvert(s) déjà réservé(s) pour ce jour, la capacité ne peut pas être inférieure.');
    updateRowByKey('R1_Days', 'Date', date, { Capacite: capacity, Menu: menu, Theme: theme || '' });
    return getState();
  } finally {
    lock.releaseLock();
  }
}

function deleteDayR1(password, date) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  removeRowsByValue('R1_Days', 'Date', date);
  removeRowsByValue('R1_Bookings', 'Date', date);
  return getState();
}

function deleteBookingR1(password, id) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  const bookings = sheetToObjects(getSheet('R1_Bookings', ['ID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Timestamp']));
  const booking = bookings.find(b => b.ID === id);
  removeRowsByValue('R1_Bookings', 'ID', id);
  if (booking) {
    const cfg = getConfig();
    const body = 'Bonjour ' + booking.Nom + ',\n\n' +
      'Votre réservation a été annulée :\n' +
      '- Restaurant : ' + cfg.name1 + '\n' +
      '- Date : ' + booking.Date + '\n' +
      '- Nombre de couverts : ' + booking.Qte + '\n' +
      '\nPour toute question, contactez ' + cfg.contactAnnulation + '.\n';
    sendMailSafe(booking.Contact, 'Annulation de réservation - ' + cfg.name1 + ' - ' + booking.Date, body);
  }
  return getState();
}

function editBookingR1(password, id, nom, contact, classe, nbEleve, nbProf, nbExt, observation) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  nbEleve = Number(nbEleve) || 0;
  nbProf = Number(nbProf) || 0;
  nbExt = Number(nbExt) || 0;
  const qte = nbEleve + nbProf + nbExt;
  if (qte <= 0) throw new Error('Merci de renseigner au moins une personne.');
  const days = sheetToObjects(getSheet('R1_Days', ['Date', 'Capacite', 'Menu']));
  const bookings = sheetToObjects(getSheet('R1_Bookings', ['ID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Timestamp', 'Observation']));
  const booking = bookings.find(b => b.ID === id);
  if (!booking) throw new Error('Réservation introuvable.');
  const day = days.find(d => d.Date === booking.Date);
  if (day) {
    const usedByOthers = bookings.filter(b => b.Date === booking.Date && b.ID !== id).reduce((s, b) => s + Number(b.Qte), 0);
    const remaining = Number(day.Capacite) - usedByOthers;
    if (qte > remaining) throw new Error('Il ne reste que ' + remaining + ' couvert(s) disponible(s) pour ce jour.');
  }
  const cfg = getConfig();
  const prixTotal = Math.round((nbEleve * Number(cfg.priceEleve) + nbProf * Number(cfg.priceProf) + nbExt * Number(cfg.priceExterieur)) * 100) / 100;
  updateRowById('R1_Bookings', id, { Nom: nom, Contact: contact, Classe: classe, Qte: qte, Observation: observation || '', NbEleve: nbEleve, NbProf: nbProf, NbExt: nbExt, PrixTotal: prixTotal });
  return getState();
}

function addBookingR1(date, nom, contact, classe, nbEleve, nbProf, nbExt, observation) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    nbEleve = Number(nbEleve) || 0;
    nbProf = Number(nbProf) || 0;
    nbExt = Number(nbExt) || 0;
    const qte = nbEleve + nbProf + nbExt;
    if (qte <= 0) throw new Error('Merci de renseigner au moins une personne.');

    const days = sheetToObjects(getSheet('R1_Days', ['Date', 'Capacite', 'Menu']));
    const day = days.find(d => d.Date === date);
    if (!day) throw new Error("Ce jour n'existe plus.");
    const bookings = sheetToObjects(getSheet('R1_Bookings', ['ID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Timestamp', 'Observation']));
    const used = bookings.filter(b => b.Date === date).reduce((s, b) => s + Number(b.Qte), 0);
    const remaining = Number(day.Capacite) - used;
    if (qte > remaining) throw new Error('Il ne reste que ' + remaining + ' couvert(s) pour ce jour.');

    const cfg = getConfig();
    const prixTotal = (nbEleve * Number(cfg.priceEleve) + nbProf * Number(cfg.priceProf) + nbExt * Number(cfg.priceExterieur));
    const prixTotalRounded = Math.round(prixTotal * 100) / 100;

    getSheet('R1_Bookings', ['ID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Timestamp', 'Observation', 'NbEleve', 'NbProf', 'NbExt', 'PrixTotal'])
      .appendRow([Utilities.getUuid(), date, nom, contact, classe, qte, new Date(), observation || '', nbEleve, nbProf, nbExt, prixTotalRounded]);

    let detailLignes = '';
    if (nbEleve > 0) detailLignes += '- ' + nbEleve + ' élève(s) x ' + cfg.priceEleve + ' €\n';
    if (nbProf > 0) detailLignes += '- ' + nbProf + ' professeur(s)/personnel x ' + cfg.priceProf + ' €\n';
    if (nbExt > 0) detailLignes += '- ' + nbExt + ' extérieur(s) x ' + cfg.priceExterieur + ' €\n';

    const body = 'Bonjour ' + nom + ',\n\n' +
      'Votre réservation est confirmée :\n' +
      '- Restaurant : ' + cfg.name1 + '\n' +
      '- Date : ' + date + '\n' +
      '- Nombre de couverts : ' + qte + '\n' +
      detailLignes +
      '- Total : ' + prixTotalRounded.toFixed(2).replace('.', ',') + ' €\n' +
      (day.Menu ? ('- Menu du jour : ' + day.Menu + '\n') : '') +
      (observation ? ('- Observation : ' + observation + '\n') : '') +
      '\nPour annuler ou modifier cette réservation, contactez ' + cfg.contactAnnulation + '.\n';
    const mailResult = sendMailSafe(contact, 'Confirmation de réservation - ' + cfg.name1 + ' - ' + date, body);

    const result = getState();
    result._emailStatus = mailResult;
    return result;
  } finally {
    lock.releaseLock();
  }
}

// ---------- Restaurant 2 ----------

function addDayR2(password, date, note, items, theme, collegue) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const exists = updateRowByKey('R2_Days', 'Date', date, { Note: note, Theme: theme || '', OuvertPar: collegue || '' });
    if (!exists) {
      getSheet('R2_Days', ['Date', 'Note', 'Theme', 'OuvertPar']).appendRow([date, note, theme || '', collegue || '']);
    }
    const shItems = getSheet('R2_Items', ['ID', 'Date', 'Nom', 'Stock', 'Prix']);
    if (!exists) {
      items.forEach(it => shItems.appendRow([Utilities.getUuid(), date, it.name, it.stock, it.price || '']));
    } else {
      const existingNames = sheetToObjects(getSheet('R2_Items', ['ID', 'Date', 'Nom', 'Stock', 'Prix']))
        .filter(it => it.Date === date).map(it => it.Nom.toLowerCase());
      items.forEach(it => {
        if (existingNames.indexOf(it.name.toLowerCase()) === -1) {
          shItems.appendRow([Utilities.getUuid(), date, it.name, it.stock, it.price || '']);
        }
      });
    }
    return getState();
  } finally {
    lock.releaseLock();
  }
}

function addItemR2(password, date, name, stock, price) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const days = sheetToObjects(getSheet('R2_Days', ['Date', 'Note', 'Theme', 'OuvertPar']));
    if (!days.find(d => d.Date === date)) throw new Error("Ce jour n'est pas ouvert.");
    getSheet('R2_Items', ['ID', 'Date', 'Nom', 'Stock', 'Prix']).appendRow([Utilities.getUuid(), date, name, stock, price || '']);
    return getState();
  } finally {
    lock.releaseLock();
  }
}

function editItemR2(password, itemId, name, stock, price) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    updateRowById('R2_Items', itemId, { Nom: name, Stock: stock, Prix: price || '' });
    return getState();
  } finally {
    lock.releaseLock();
  }
}

function deleteItemR2(password, itemId) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  removeRowsByValue('R2_Items', 'ID', itemId);
  return getState();
}

function deleteDayR2(password, date) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  removeRowsByValue('R2_Days', 'Date', date);
  removeRowsByValue('R2_Items', 'Date', date);
  removeRowsByValue('R2_Bookings', 'Date', date);
  return getState();
}

function deleteBookingR2(password, id) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  const bookings = sheetToObjects(getSheet('R2_Bookings', ['ID', 'ItemID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Mode', 'Timestamp']));
  const booking = bookings.find(b => b.ID === id);
  removeRowsByValue('R2_Bookings', 'ID', id);
  if (booking) {
    const cfg = getConfig();
    const items = sheetToObjects(getSheet('R2_Items', ['ID', 'Date', 'Nom', 'Stock']));
    const item = items.find(it => it.ID === booking.ItemID);
    const body = 'Bonjour ' + booking.Nom + ',\n\n' +
      'Votre réservation a été annulée :\n' +
      '- Restaurant : ' + cfg.name2 + '\n' +
      '- Date : ' + booking.Date + '\n' +
      '- Plat : ' + (item ? item.Nom : 'plat') + '\n' +
      '- Quantité : ' + booking.Qte + '\n' +
      '\nPour toute question, contactez ' + cfg.contactAnnulation + '.\n';
    sendMailSafe(booking.Contact, 'Annulation de réservation - ' + cfg.name2 + ' - ' + booking.Date, body);
  }
  return getState();
}

function editBookingR2(password, id, nom, contact, classe, qte, mode, observation) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  const items = sheetToObjects(getSheet('R2_Items', ['ID', 'Date', 'Nom', 'Stock']));
  const bookings = sheetToObjects(getSheet('R2_Bookings', ['ID', 'ItemID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Mode', 'Timestamp', 'Observation']));
  const booking = bookings.find(b => b.ID === id);
  if (!booking) throw new Error('Réservation introuvable.');
  const item = items.find(it => it.ID === booking.ItemID);
  if (item) {
    const usedByOthers = bookings.filter(b => b.ItemID === booking.ItemID && b.ID !== id).reduce((s, b) => s + Number(b.Qte), 0);
    const remaining = Number(item.Stock) - usedByOthers;
    if (Number(qte) > remaining) throw new Error('Il ne reste que ' + remaining + ' portion(s) disponible(s) pour ce plat.');
  }
  updateRowById('R2_Bookings', id, { Nom: nom, Contact: contact, Classe: classe, Qte: qte, Mode: mode, Observation: observation || '' });
  return getState();
}

function addBookingR2(date, itemId, nom, contact, classe, qte, mode) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const items = sheetToObjects(getSheet('R2_Items', ['ID', 'Date', 'Nom', 'Stock']));
    const item = items.find(it => it.ID === itemId);
    if (!item) throw new Error("Ce plat n'existe plus.");
    const bookings = sheetToObjects(getSheet('R2_Bookings', ['ID', 'ItemID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Mode', 'Timestamp']));
    const used = bookings.filter(b => b.ItemID === itemId).reduce((s, b) => s + Number(b.Qte), 0);
    const remaining = Number(item.Stock) - used;
    if (Number(qte) > remaining) throw new Error('Il ne reste que ' + remaining + ' portion(s) de ce plat.');
    getSheet('R2_Bookings', ['ID', 'ItemID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Mode', 'Timestamp'])
      .appendRow([Utilities.getUuid(), itemId, date, nom, contact, classe, qte, mode, new Date()]);

    const cfg = getConfig();
    const body = 'Bonjour ' + nom + ',\n\n' +
      'Votre réservation est confirmée :\n' +
      '- Restaurant : ' + cfg.name2 + '\n' +
      '- Date : ' + date + '\n' +
      '- Plat : ' + item.Nom + '\n' +
      '- Quantité : ' + qte + '\n' +
      '- Mode : ' + (mode === 'emporter' ? 'à emporter' : 'sur place') + '\n' +
      '\nPour annuler ou modifier cette réservation, contactez ' + cfg.contactAnnulation + '.\n';
    sendMailSafe(contact, 'Confirmation de réservation - ' + cfg.name2 + ' - ' + date, body);

    return getState();
  } finally {
    lock.releaseLock();
  }
}

function addBookingR2Multi(date, nom, contact, classe, mode, items, observation) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const allItems = sheetToObjects(getSheet('R2_Items', ['ID', 'Date', 'Nom', 'Stock', 'Prix']));
    const bookings = sheetToObjects(getSheet('R2_Bookings', ['ID', 'ItemID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Mode', 'Timestamp', 'Observation']));
    const sh = getSheet('R2_Bookings', ['ID', 'ItemID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Mode', 'Timestamp', 'Observation']);
    const confirmed = [];
    const adjusted = [];
    const skipped = [];

    items.forEach(reqItem => {
      const item = allItems.find(it => it.ID === reqItem.itemId);
      if (!item) { skipped.push({ nom: '(plat supprimé)' }); return; }
      const usedBefore = bookings.filter(b => b.ItemID === reqItem.itemId).reduce((s, b) => s + Number(b.Qte), 0);
      const usedThisOrder = confirmed.filter(c => c.itemId === reqItem.itemId).reduce((s, c) => s + c.qte, 0);
      const remaining = Number(item.Stock) - usedBefore - usedThisOrder;
      const qteVoulue = Number(reqItem.qte);
      const qteAccordee = Math.max(0, Math.min(qteVoulue, remaining));
      if (qteAccordee <= 0) {
        skipped.push({ nom: item.Nom });
        return;
      }
      sh.appendRow([Utilities.getUuid(), reqItem.itemId, date, nom, contact, classe, qteAccordee, mode, new Date(), observation || '']);
      confirmed.push({ itemId: reqItem.itemId, nom: item.Nom, qte: qteAccordee, prix: item.Prix || '' });
      if (qteAccordee < qteVoulue) adjusted.push({ nom: item.Nom, demande: qteVoulue, accorde: qteAccordee });
    });

    const cfg = getConfig();
    let mailResult = null;
    let totalPrix = 0;
    let hasPriceGap = false;
    confirmed.forEach(c => {
      if (c.prix !== '' && c.prix != null) totalPrix += Number(c.prix) * c.qte;
      else hasPriceGap = true;
    });
    if (confirmed.length > 0) {
      let body = 'Bonjour ' + nom + ',\n\nVotre réservation est confirmée :\n' +
        '- Restaurant : ' + cfg.name2 + '\n' +
        '- Date : ' + date + '\n' +
        '- Mode : ' + (mode === 'emporter' ? 'à emporter' : 'sur place') + '\n\n';
      confirmed.forEach(c => {
        body += '- ' + c.nom + ' x' + c.qte + (c.prix !== '' && c.prix != null ? ' (' + Number(c.prix).toFixed(2).replace('.', ',') + ' € x ' + c.qte + ')' : '') + '\n';
      });
      if (totalPrix > 0) {
        body += '\nTotal' + (hasPriceGap ? ' (hors plats sans prix indiqué)' : '') + ' : ' + totalPrix.toFixed(2).replace('.', ',') + ' €\n';
      }
      if (adjusted.length > 0) {
        body += '\nAttention, certaines quantités ont été réduites faute de stock suffisant :\n';
        adjusted.forEach(a => { body += '- ' + a.nom + ' : ' + a.demande + ' demandé(s), ' + a.accorde + ' accordé(s)\n'; });
      }
      if (skipped.length > 0) {
        body += '\nCes plats n\'ont pas pu être réservés (stock épuisé) :\n';
        skipped.forEach(s => { body += '- ' + s.nom + '\n'; });
      }
      if (observation) body += '\nObservation : ' + observation + '\n';
      body += '\nPour annuler ou modifier cette réservation, contactez ' + cfg.contactAnnulation + '.\n';
      mailResult = sendMailSafe(contact, 'Confirmation de réservation - ' + cfg.name2 + ' - ' + date, body);
    }

    const result = getState();
    result._bookingResult = { confirmed, adjusted, skipped, totalPrix, hasPriceGap };
    result._emailStatus = mailResult;
    return result;
  } finally {
    lock.releaseLock();
  }
}

// ---------- Rappels automatiques la veille ----------

function sendReminders() {
  const tz = Session.getScriptTimeZone();
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const tomorrow = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  const cfg = getConfig();

  const r1Days = sheetToObjects(getSheet('R1_Days', ['Date', 'Capacite', 'Menu']));
  const r1Bookings = sheetToObjects(getSheet('R1_Bookings', ['ID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Timestamp']));
  const day1 = r1Days.find(dd => dd.Date === tomorrow);
  r1Bookings.filter(b => b.Date === tomorrow && isEmail(b.Contact)).forEach(b => {
    const body = 'Bonjour ' + b.Nom + ',\n\nPetit rappel : vous avez une réservation demain (' + tomorrow + ') au ' + cfg.name1 +
      ' pour ' + b.Qte + ' couvert(s)' + (day1 && day1.Menu ? (' — menu : ' + day1.Menu) : '') + '.\n\n' +
      'Pour annuler, contactez ' + cfg.contactAnnulation + '.\n';
    sendMailSafe(b.Contact, 'Rappel : réservation demain - ' + cfg.name1, body);
  });

  const r2Items = sheetToObjects(getSheet('R2_Items', ['ID', 'Date', 'Nom', 'Stock']));
  const r2Bookings = sheetToObjects(getSheet('R2_Bookings', ['ID', 'ItemID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Mode', 'Timestamp']));
  r2Bookings.filter(b => b.Date === tomorrow && isEmail(b.Contact)).forEach(b => {
    const item = r2Items.find(it => it.ID === b.ItemID);
    const body = 'Bonjour ' + b.Nom + ',\n\nPetit rappel : vous avez une réservation demain (' + tomorrow + ') au ' + cfg.name2 +
      ' — ' + b.Qte + ' portion(s) de ' + (item ? item.Nom : 'plat') + ', ' + (b.Mode === 'emporter' ? 'à emporter' : 'sur place') + '.\n\n' +
      'Pour annuler, contactez ' + cfg.contactAnnulation + '.\n';
    sendMailSafe(b.Contact, 'Rappel : réservation demain - ' + cfg.name2, body);
  });
}

// À exécuter UNE SEULE FOIS manuellement pour activer le rappel quotidien à 18h.
function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sendReminders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendReminders').timeBased().everyDays(1).atHour(18).create();
}