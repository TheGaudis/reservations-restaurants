// ============================================================
// RÉSERVATIONS RESTAURANTS PÉDAGOGIQUES — Backend Google Apps Script
// Version API JSON (compatible avec un site hébergé ailleurs, ex. Netlify)
// À coller dans Extensions > Apps Script > fichier Code.gs
// ============================================================

const SS = SpreadsheetApp.getActiveSpreadsheet();
const ADMIN_PASSWORD = "ResaRestos2026"; // change cette valeur si tu veux un autre mot de passe

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
      case 'addDayR1': result = addDayR1(body.password, body.date, body.capacity, body.menu); break;
      case 'deleteDayR1': result = deleteDayR1(body.password, body.date); break;
      case 'deleteBookingR1': result = deleteBookingR1(body.password, body.id); break;
      case 'addBookingR1': result = addBookingR1(body.date, body.nom, body.contact, body.classe, body.qte); break;
      case 'addDayR2': result = addDayR2(body.password, body.date, body.note, body.items); break;
      case 'deleteDayR2': result = deleteDayR2(body.password, body.date); break;
      case 'deleteBookingR2': result = deleteBookingR2(body.password, body.id); break;
      case 'addBookingR2': result = addBookingR2(body.date, body.itemId, body.nom, body.contact, body.classe, body.qte, body.mode); break;
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

function checkPassword(pwd) {
  return pwd === ADMIN_PASSWORD;
}

function isEmail(str) {
  return /\S+@\S+\.\S+/.test(String(str || ''));
}

function sendMailSafe(to, subject, body) {
  try {
    if (isEmail(to)) MailApp.sendEmail(to, subject, body);
  } catch (e) {
    console.log('Erreur envoi email: ' + e);
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
    contactAnnulation: cfg.contactAnnulation || "l'établissement"
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
  const r1Days = sheetToObjects(getSheet('R1_Days', ['Date', 'Capacite', 'Menu']));
  const r1Bookings = sheetToObjects(getSheet('R1_Bookings', ['ID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Timestamp']));
  const r2Days = sheetToObjects(getSheet('R2_Days', ['Date', 'Note']));
  const r2Items = sheetToObjects(getSheet('R2_Items', ['ID', 'Date', 'Nom', 'Stock']));
  const r2Bookings = sheetToObjects(getSheet('R2_Bookings', ['ID', 'ItemID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Mode', 'Timestamp']));
  const cfg = getConfig();
  return { r1Days, r1Bookings, r2Days, r2Items, r2Bookings, name1: cfg.name1, name2: cfg.name2, contactAnnulation: cfg.contactAnnulation };
}

// ---------- Restaurant 1 ----------

function addDayR1(password, date, capacity, menu) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  removeRowsByValue('R1_Days', 'Date', date);
  getSheet('R1_Days', ['Date', 'Capacite', 'Menu']).appendRow([date, capacity, menu]);
  return getState();
}

function deleteDayR1(password, date) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  removeRowsByValue('R1_Days', 'Date', date);
  removeRowsByValue('R1_Bookings', 'Date', date);
  return getState();
}

function deleteBookingR1(password, id) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  removeRowsByValue('R1_Bookings', 'ID', id);
  return getState();
}

function addBookingR1(date, nom, contact, classe, qte) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const days = sheetToObjects(getSheet('R1_Days', ['Date', 'Capacite', 'Menu']));
    const day = days.find(d => d.Date === date);
    if (!day) throw new Error("Ce jour n'existe plus.");
    const bookings = sheetToObjects(getSheet('R1_Bookings', ['ID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Timestamp']));
    const used = bookings.filter(b => b.Date === date).reduce((s, b) => s + Number(b.Qte), 0);
    const remaining = Number(day.Capacite) - used;
    if (Number(qte) > remaining) throw new Error('Il ne reste que ' + remaining + ' couvert(s) pour ce jour.');
    getSheet('R1_Bookings', ['ID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Timestamp'])
      .appendRow([Utilities.getUuid(), date, nom, contact, classe, qte, new Date()]);

    const cfg = getConfig();
    const body = 'Bonjour ' + nom + ',\n\n' +
      'Votre réservation est confirmée :\n' +
      '- Restaurant : ' + cfg.name1 + '\n' +
      '- Date : ' + date + '\n' +
      '- Nombre de couverts : ' + qte + '\n' +
      (day.Menu ? ('- Menu du jour : ' + day.Menu + '\n') : '') +
      '\nPour annuler ou modifier cette réservation, contactez ' + cfg.contactAnnulation + '.\n';
    sendMailSafe(contact, 'Confirmation de réservation - ' + cfg.name1 + ' - ' + date, body);

    return getState();
  } finally {
    lock.releaseLock();
  }
}

// ---------- Restaurant 2 ----------

function addDayR2(password, date, note, items) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  removeRowsByValue('R2_Days', 'Date', date);
  removeRowsByValue('R2_Items', 'Date', date);
  getSheet('R2_Days', ['Date', 'Note']).appendRow([date, note]);
  const shItems = getSheet('R2_Items', ['ID', 'Date', 'Nom', 'Stock']);
  items.forEach(it => shItems.appendRow([Utilities.getUuid(), date, it.name, it.stock]));
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
  removeRowsByValue('R2_Bookings', 'ID', id);
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
