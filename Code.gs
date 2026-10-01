// ============================================================
// RÉSERVATIONS RESTAURANTS PÉDAGOGIQUES — Backend Google Apps Script
// Version API JSON (compatible avec un site hébergé ailleurs, ex. Netlify)
// À coller dans Extensions > Apps Script > fichier Code.gs
// ============================================================

// Feuille ouverte seulement si nécessaire : une réponse servie depuis la mémoire n'y touche pas.
let SS_ = null;
function ss() {
  if (!SS_) SS_ = SpreadsheetApp.getActiveSpreadsheet();
  return SS_;
}
// Le mot de passe du mode collègue n'est PAS écrit ici (ce fichier est public sur GitHub).
// À définir une fois : Paramètres du projet (roue dentée) > Propriétés du script >
// propriété « ADMIN_PASSWORD », valeur = le mot de passe. Voir checkPassword().

// Colonnes de chaque onglet. Les onglets et colonnes manquants sont créés à la première écriture.
const SHEETS = {
  Config: ['Key', 'Value'],
  R1_Days: ['Date', 'Capacite', 'Menu', 'Theme', 'OuvertPar'],
  R1_Bookings: ['ID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Timestamp', 'Observation', 'NbEleve', 'NbProf', 'NbExt', 'PrixTotal'],
  R2_Days: ['Date', 'Note', 'Theme', 'OuvertPar'],
  R2_Items: ['ID', 'Date', 'Nom', 'Stock', 'Prix'],
  R2_Bookings: ['ID', 'ItemID', 'Date', 'Nom', 'Contact', 'Classe', 'Qte', 'Mode', 'Timestamp', 'Observation']
};

// Jours de service (et leurs plats et réservations) passés depuis plus de ce nombre de jours :
// déplacés chaque nuit vers les onglets « Archive_… » pour que l'état renvoyé reste léger.
const ARCHIVE_AFTER_DAYS = 60;

// Mémoire de l'état public (CacheService) : renouvelée aussitôt après chaque écriture faite
// par le site, et recalculée toutes les 5 minutes en journée par rafraichirCache() (déclencheur).
// Gardée 6 heures (le maximum de CacheService) : le soir et la nuit, quand rafraichirCache()
// ne tourne pas, les visiteurs sont encore servis sans relire la feuille. Aucun risque pour les
// places : chaque écriture du site change la version, et l'ancien état n'est plus jamais servi.
// Une modification faite à la main dans Google Sheets apparaît en 5 minutes au plus en journée,
// mais seulement vers 6 h si elle est faite le soir : exécuter viderCache() pour qu'elle
// apparaisse tout de suite.
const STATE_TTL = 21600;   // secondes (6 heures)
const STATE_CHUNK = 30000; // caractères par entrée (limite CacheService : 100 Ko par entrée)
const REFRESH_FROM_HOUR = 6, REFRESH_TO_HOUR = 21; // rafraichirCache() ne travaille qu'entre ces heures

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Lecture publique : jours, plats et places prises, sans aucune donnée personnelle.
// ?since=<etag> : si rien n'a changé depuis cette version, réponse minuscule { unchanged: true }.
function doGet(e) {
  try {
    MEMO = {};
    const since = (e && e.parameter && e.parameter.since) || '';
    return ContentService.createTextOutput(publicStateJson(since)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return jsonOut({ error: err.message });
  }
}

function doPost(e) {
  MEMO = {};
  DIRTY = false;
  LAST_PUBLIC = null;
  MAILS = [];
  let lock = null, result;
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    // Toutes les actions qui écrivent passent l'une après l'autre : pas de surréservation,
    // et aucune ligne ne se décale pendant qu'une autre requête la modifie.
    if (action !== 'checkPassword' && action !== 'getAdminState') {
      lock = LockService.getScriptLock();
      if (!lock.tryLock(20000)) throw new Error('Le serveur est très sollicité : réessayez dans quelques secondes.');
    }
    switch (action) {
      case 'checkPassword': result = { ok: checkPassword(body.password) }; break;
      case 'getAdminState': result = getAdminState(body.password); break;
      case 'addDayR1': result = addDayR1(body.password, body.date, body.capacity, body.menu, body.theme, body.collegue); break;
      case 'editDayR1': result = editDayR1(body.password, body.date, body.capacity, body.menu, body.theme); break;
      case 'deleteDayR1': result = deleteDayR1(body.password, body.date); break;
      case 'deleteBookingR1': result = deleteBookingR1(body.password, body.id); break;
      case 'addBookingR1': result = addBookingR1(body.date, body.nom, body.contact, body.classe, body.nbEleve, body.nbProf, body.nbExt, body.observation, body.requestId); break;
      case 'editBookingR1': result = editBookingR1(body.password, body.id, body.nom, body.contact, body.classe, body.nbEleve, body.nbProf, body.nbExt, body.observation); break;
      case 'addDayR2': result = addDayR2(body.password, body.date, body.note, body.items, body.theme, body.collegue); break;
      case 'addItemR2': result = addItemR2(body.password, body.date, body.name, body.stock, body.price); break;
      case 'editItemR2': result = editItemR2(body.password, body.itemId, body.name, body.stock, body.price); break;
      case 'deleteItemR2': result = deleteItemR2(body.password, body.itemId); break;
      case 'deleteDayR2': result = deleteDayR2(body.password, body.date); break;
      case 'deleteBookingR2': result = deleteBookingR2(body.password, body.id); break;
      case 'addBookingR2': result = addBookingR2(body.date, body.itemId, body.nom, body.contact, body.classe, body.qte, body.mode); break;
      case 'addBookingR2Multi': result = addBookingR2Multi(body.date, body.nom, body.contact, body.classe, body.mode, body.items, body.observation, body.requestId); break;
      case 'editBookingR2': result = editBookingR2(body.password, body.id, body.nom, body.contact, body.classe, body.qte, body.mode, body.observation); break;
      case 'setConfigField': result = setConfigField(body.password, body.key, body.value); break;
      default: throw new Error('Action inconnue: ' + action);
    }
  } catch (err) {
    result = { error: err.message };
  } finally {
    if (DIRTY) {
      const ver = stateChanged();
      // Réservation du public : l'état public vient d'être relu après l'écriture (sous verrou),
      // on le range tout de suite sous la nouvelle version.
      if (ver && LAST_PUBLIC) storeState(CacheService.getScriptCache(), ver, LAST_PUBLIC);
    }
    if (lock) lock.releaseLock();
  }
  // E-mails envoyés une fois le verrou libéré (même si une erreur a suivi l'écriture :
  // ce qui a été enregistré est confirmé). Leurs statuts sont complétés avant la réponse.
  sendQueuedMails();
  return jsonOut(result);
}

// ---------- Accès à la feuille ----------

let MEMO = {};      // onglets déjà lus pendant la requête en cours (chacun n'est lu qu'une fois)
let DIRTY = false;  // la requête en cours a écrit dans la feuille
let TZ_ = null;     // fuseau du script, lu une fois par exécution

// Lecture d'un onglet : { sh, headers, values (brutes), objects (dates en 'yyyy-MM-dd') }.
// Un onglet absent se lit comme vide ; il n'est créé qu'à la première écriture.
function table(name) {
  if (MEMO[name]) return MEMO[name];
  const sh = ss().getSheetByName(name);
  const values = sh ? sh.getDataRange().getValues() : [];
  const headers = values.length ? values[0] : [];
  const tz = TZ_ || (TZ_ = Session.getScriptTimeZone());
  const objects = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val instanceof Date) val = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
      obj[h] = val;
    });
    return obj;
  });
  MEMO[name] = { sh, headers, values, objects };
  return MEMO[name];
}

function rows(name) {
  return table(name).objects;
}

// Avant une écriture : crée l'onglet ou ajoute les colonnes manquantes.
function ensureTable(name) {
  const t = table(name);
  const wanted = SHEETS[name];
  if (!t.sh) {
    ss().insertSheet(name).getRange(1, 1, 1, wanted.length).setValues([wanted]);
  } else if (t.headers.every(h => h === '')) {
    t.sh.getRange(1, 1, 1, wanted.length).setValues([wanted]);
  } else {
    const missing = wanted.filter(h => t.headers.indexOf(h) === -1);
    if (!missing.length) return t;
    t.sh.getRange(1, t.headers.length + 1, 1, missing.length).setValues([missing]);
  }
  delete MEMO[name];
  return table(name);
}

// Après une écriture : l'onglet sera relu. La mémoire de l'état public est renouvelée une fois,
// après la dernière écriture de la requête (doPost) : la version étant lue avant la feuille,
// un état lu pendant les écritures porte l'ancienne version et n'est jamais resservi.
function touched(name) {
  delete MEMO[name];
  DIRTY = true;
}

// Texte saisi : précédé d'une apostrophe pour que Google Sheets le garde tel quel
// (sinon « 0612345678 » devient un nombre et « =… » une formule). Les dates restent des dates.
function cell(header, value) {
  if (value == null) return '';
  if (typeof value === 'string' && value !== '' && header !== 'Date') return "'" + value;
  return value;
}

// Ajoute des lignes (objets { colonne: valeur }) en un seul appel.
function appendObjects(name, objs) {
  if (!objs.length) return;
  const t = ensureTable(name);
  const data = objs.map(o => t.headers.map(h => cell(h, o[h])));
  t.sh.getRange(t.values.length + 1, 1, data.length, t.headers.length).setValues(data);
  touched(name);
}

// Modifie en un seul appel la première ligne où keyCol vaut keyVal ; false si aucune.
function updateRowByKey(name, keyCol, keyVal, updates) {
  const t = ensureTable(name);
  const i = t.objects.findIndex(o => String(o[keyCol]) === String(keyVal));
  if (i === -1) return false;
  const keys = Object.keys(updates).filter(h => t.headers.indexOf(h) !== -1);
  if (!keys.length) return true;
  const cols = keys.map(h => t.headers.indexOf(h));
  const from = Math.min.apply(null, cols), to = Math.max.apply(null, cols);
  const row = t.values[i + 1].slice(from, to + 1).map((v, j) => cell(t.headers[from + j], v));
  keys.forEach(h => { row[t.headers.indexOf(h) - from] = cell(h, updates[h]); });
  t.sh.getRange(i + 2, from + 1, 1, row.length).setValues([row]);
  touched(name);
  return true;
}

function updateBookingById(name, id, updates) {
  if (!updateRowByKey(name, 'ID', id, updates)) throw new Error('Réservation introuvable.');
}

// Supprime les lignes où colName vaut value, par blocs de lignes consécutives (du bas vers le haut).
function removeRowsByValue(name, colName, value) {
  const t = table(name);
  if (!t.sh) return;
  const idx = [];
  t.objects.forEach((o, i) => { if (String(o[colName]) === String(value)) idx.push(i + 2); });
  if (!idx.length) return;
  let j = idx.length - 1;
  while (j >= 0) {
    const end = idx[j];
    let start = end;
    while (j > 0 && idx[j - 1] === start - 1) { j--; start = idx[j]; }
    t.sh.deleteRows(start, end - start + 1);
    j--;
  }
  touched(name);
}

// ---------- Mémoire de l'état public ----------

// Renvoie l'état public en JSON : depuis la mémoire si elle est à jour, sinon relu dans la feuille.
// La mémoire est rangée sous une « version » qui change à chaque écriture : un état lu
// pendant une écriture n'est donc jamais resservi.
// since : etag connu de la page ; s'il est toujours valable, seul { unchanged: true } est renvoyé.
// force : relit la feuille même si la mémoire est à jour (rafraichirCache).
// Si CacheService est indisponible (incident Google, quota), l'état est simplement relu dans la feuille.
function publicStateJson(since, force) {
  const answer = (json, etag) => (since && etag === since) ? JSON.stringify({ unchanged: true, etag: etag }) : json;
  let cache = null, ver = null;
  try {
    cache = CacheService.getScriptCache();
    const head = cache.getAll(['state_ver', 'state_meta']);
    ver = head.state_ver || null;
    if (ver && head.state_meta && !force) {
      const meta = JSON.parse(head.state_meta);
      if (meta.ver === ver) {
        if (since && meta.etag === since) return answer('', meta.etag);
        if (meta.json) return meta.json; // état petit : rangé avec la meta, une seule lecture
        const keys = [];
        for (let i = 0; i < meta.n; i++) keys.push('state_' + meta.etag + '_' + i);
        const parts = cache.getAll(keys);
        if (keys.every(k => parts[k] != null)) {
          const json = keys.map(k => parts[k]).join('');
          if (json.length === meta.len) return json;
        }
      }
    }
    if (!ver) {
      ver = Utilities.getUuid();
      cache.put('state_ver', ver, 21600);
    }
  } catch (err) {
    console.log('Mémoire de l\'état illisible : ' + err);
    const built = buildPublicState();
    return answer(built.json, built.etag);
  }
  // La version est lue AVANT la feuille : si une écriture a lieu entre-temps, elle change
  // la version et l'état rangé ci-dessous ne sera jamais resservi.
  const built = buildPublicState();
  storeState(cache, ver, built);
  return answer(built.json, built.etag);
}

// Range un état public sous la version ver. Petit : dans la meta elle-même. Gros : en morceaux
// rangés sous l'etag (empreinte du contenu) ; deux contenus différents n'écrivent jamais sous
// les mêmes clés, même recalculés sous la même version (rafraichirCache).
function storeState(cache, ver, built) {
  try {
    const json = built.json;
    const meta = { ver: ver, etag: built.etag, len: json.length, n: 0 };
    const entries = {};
    if (json.length <= STATE_CHUNK) {
      meta.json = json;
    } else {
      for (let i = 0; i < json.length; i += STATE_CHUNK) entries['state_' + built.etag + '_' + (meta.n++)] = json.slice(i, i + STATE_CHUNK);
    }
    entries.state_meta = JSON.stringify(meta);
    cache.putAll(entries, STATE_TTL);
  } catch (err) {
    console.log('Mise en mémoire de l\'état impossible : ' + err);
  }
}

// Déclencheur toutes les 5 minutes (voir setupDailyTrigger) : garde la mémoire prête, pour que
// presque chaque visiteur soit servi sans ouvrir la feuille. Ne fait rien la nuit.
function rafraichirCache() {
  const hour = Number(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'H'));
  if (hour < REFRESH_FROM_HOUR || hour >= REFRESH_TO_HOUR) return;
  MEMO = {};
  publicStateJson('', true);
}

// Nouvelle version de l'état (renvoyée), ou null si CacheService est indisponible.
// Ne doit jamais faire échouer une écriture déjà faite : l'erreur est seulement notée.
function stateChanged() {
  try {
    const ver = Utilities.getUuid();
    CacheService.getScriptCache().put('state_ver', ver, 21600);
    return ver;
  } catch (err) {
    console.log('Mémoire de l\'état non renouvelée : ' + err);
    return null;
  }
}

// À exécuter à la main après avoir modifié la feuille directement dans Google Sheets.
function viderCache() {
  stateChanged();
}

// ---------- Outils ----------

function checkPassword(pwd) {
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  return !!real && String(pwd) === real;
}

function isEmail(str) {
  return /\S+@\S+\.\S+/.test(String(str || ''));
}

// Nombre de personnes ou de portions envoyé par la page : entier ≥ 0, vide = 0.
// Toute autre valeur (texte, négatif, décimal) est refusée avant d'écrire quoi que ce soit.
function toCount(value) {
  if (value === '' || value == null) return 0;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new Error('Quantité invalide : indiquez un nombre entier positif.');
  return n;
}

// '2026-10-01' → 'jeudi 1er octobre 2026' (dates des emails en toutes lettres)
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function dateLongue(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  if (!m) return String(iso);
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const jour = JOURS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  return jour + ' ' + (d === 1 ? '1er' : d) + ' ' + MOIS[mo - 1] + ' ' + y;
}

// 4.95 → '4,95 €'
function euros(value) {
  return Number(value).toFixed(2).replace('.', ',') + ' €';
}

// Anti-doublon : identifiant envoyé par le formulaire (requestId), gardé 6 heures.
// Si la même réservation arrive deux fois (double clic, réponse perdue puis nouvel essai),
// la seconde n'est pas enregistrée et la page reçoit _duplicate.
function requestKey(requestId) {
  return requestId ? 'req_' + String(requestId).slice(0, 100) : null;
}
// CacheService indisponible : on accepte la réservation (un doublon est moins grave qu'un refus).
function alreadyProcessed(requestId) {
  const key = requestKey(requestId);
  if (!key) return false;
  try {
    return CacheService.getScriptCache().get(key) !== null;
  } catch (err) {
    console.log('Anti-doublon illisible : ' + err);
    return false;
  }
}
// Appelé après l'écriture : une erreur ici ne doit pas faire croire que la réservation a échoué.
function markProcessed(requestId) {
  const key = requestKey(requestId);
  if (!key) return;
  try {
    CacheService.getScriptCache().put(key, '1', 21600);
  } catch (err) {
    console.log('Anti-doublon non enregistré : ' + err);
  }
}

// Pendant une requête du site (doPost), l'e-mail est seulement mis en file : doPost l'envoie
// après avoir libéré le verrou, pour qu'une autre réservation n'attende pas cet envoi.
// Le statut renvoyé est alors complété à l'envoi (la réponse JSON est construite après).
// Hors requête (rappels de la veille), l'e-mail part tout de suite.
let MAILS = null;
function sendMailSafe(to, subject, body) {
  if (!isEmail(to)) return { sent: false, reason: 'no-email' };
  if (!MAILS) return sendMailNow(to, subject, body);
  const status = { sent: false, reason: 'pending' };
  MAILS.push({ to: to, subject: subject, body: body, status: status });
  return status;
}
function sendMailNow(to, subject, body) {
  try {
    MailApp.sendEmail(to, subject, body);
    return { sent: true };
  } catch (e) {
    console.log('Erreur envoi email: ' + e);
    return { sent: false, reason: String(e) };
  }
}
// Envoie les e-mails mis en file pendant la requête, chacun complétant son statut.
function sendQueuedMails() {
  const queue = MAILS || [];
  MAILS = null;
  queue.forEach(m => {
    const res = sendMailNow(m.to, m.subject, m.body);
    delete m.status.reason;
    Object.assign(m.status, res);
  });
}

function getConfig() {
  const cfg = {};
  rows('Config').forEach(r => cfg[r.Key] = r.Value);
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
  if (!updateRowByKey('Config', 'Key', key, { Value: value })) appendObjects('Config', [{ Key: key, Value: value }]);
}

function setConfigField(password, key, value) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  setConfigValue(key, value);
  return getState();
}

// État complet, réservations détaillées comprises : réservé au mode collègue.
function getState() {
  return Object.assign({
    r1Days: rows('R1_Days'), r1Bookings: rows('R1_Bookings'),
    r2Days: rows('R2_Days'), r2Items: rows('R2_Items'), r2Bookings: rows('R2_Bookings')
  }, getConfig());
}

function getAdminState(password) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  return getState();
}

// État public : aucune donnée personnelle. Chaque réservation est remplacée par un total
// anonyme, par jour (r1Bookings : { Date, Qte }) ou par plat (r2Bookings : { ItemID, Qte }),
// dans les mêmes champs que l'état complet : la page calcule les places restantes de la même façon.
// etag : empreinte du contenu, renvoyée par la page dans ?since= pour savoir si quelque chose a changé.
// Renvoie { etag, json, state } : le JSON n'est construit qu'une fois (empreinte et réponse).
function buildPublicState() {
  const pick = (o, keys) => { const r = {}; keys.forEach(k => { r[k] = o[k] === undefined ? '' : o[k]; }); return r; };
  const totals = (list, key) => {
    const sums = {}, order = [];
    list.forEach(b => {
      const k = String(b[key]);
      if (!(k in sums)) { sums[k] = 0; order.push(k); }
      sums[k] += Number(b.Qte) || 0;
    });
    return order.map(k => ({ [key]: k, Qte: sums[k] }));
  };
  const state = Object.assign({
    r1Days: rows('R1_Days').map(d => pick(d, ['Date', 'Capacite', 'Menu', 'Theme'])),
    r1Bookings: totals(rows('R1_Bookings'), 'Date'),
    r2Days: rows('R2_Days').map(d => pick(d, ['Date', 'Note', 'Theme'])),
    r2Items: rows('R2_Items').map(it => pick(it, ['ID', 'Date', 'Nom', 'Stock', 'Prix'])),
    r2Bookings: totals(rows('R2_Bookings'), 'ItemID')
  }, getConfig());
  const body = JSON.stringify(state);
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, body, Utilities.Charset.UTF_8);
  const etag = Utilities.base64EncodeWebSafe(digest).replace(/=+$/, '');
  return { etag: etag, json: '{"etag":' + JSON.stringify(etag) + ',' + body.slice(1), state: Object.assign({ etag: etag }, state) };
}

// Réponse des réservations faites par le public. Gardé dans LAST_PUBLIC : doPost le range
// en mémoire après l'écriture, et la lecture suivante n'a pas à rouvrir la feuille.
let LAST_PUBLIC = null;
function getPublicState() {
  LAST_PUBLIC = buildPublicState();
  return LAST_PUBLIC.state;
}

// Quantité réservée (somme de Qte) parmi les réservations qui vérifient match
function sumQte(list, match) {
  return list.reduce((s, b) => s + (match(b) ? Number(b.Qte) || 0 : 0), 0);
}

// ---------- Restaurant 1 ----------
// Les fonctions ci-dessous sont appelées par doPost, sous verrou.

function addDayR1(password, date, capacity, menu, theme, collegue) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  const exists = updateRowByKey('R1_Days', 'Date', date, { Capacite: capacity, Menu: menu, Theme: theme || '', OuvertPar: collegue || '' });
  if (!exists) {
    appendObjects('R1_Days', [{ Date: date, Capacite: capacity, Menu: menu, Theme: theme || '', OuvertPar: collegue || '' }]);
  }
  return getState();
}

function editDayR1(password, date, capacity, menu, theme) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  const used = sumQte(rows('R1_Bookings'), b => b.Date === date);
  if (Number(capacity) < used) throw new Error('Impossible : ' + used + ' couvert(s) déjà réservé(s) pour ce jour, la capacité ne peut pas être inférieure.');
  updateRowByKey('R1_Days', 'Date', date, { Capacite: capacity, Menu: menu, Theme: theme || '' });
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
  const booking = rows('R1_Bookings').find(b => b.ID === id);
  removeRowsByValue('R1_Bookings', 'ID', id);
  if (booking) {
    const cfg = getConfig();
    const body = 'Bonjour ' + booking.Nom + ',\n\n' +
      'Votre réservation a été annulée :\n' +
      '- Restaurant : ' + cfg.name1 + '\n' +
      '- Date : ' + dateLongue(booking.Date) + '\n' +
      '- Nombre de couverts : ' + booking.Qte + '\n' +
      '\nPour toute question, contactez ' + cfg.contactAnnulation + '.\n';
    sendMailSafe(booking.Contact, 'Annulation de réservation - ' + cfg.name1 + ' - ' + dateLongue(booking.Date), body);
  }
  return getState();
}

function editBookingR1(password, id, nom, contact, classe, nbEleve, nbProf, nbExt, observation) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  nbEleve = toCount(nbEleve);
  nbProf = toCount(nbProf);
  nbExt = toCount(nbExt);
  const qte = nbEleve + nbProf + nbExt;
  if (qte <= 0) throw new Error('Merci de renseigner au moins une personne.');
  const bookings = rows('R1_Bookings');
  const booking = bookings.find(b => b.ID === id);
  if (!booking) throw new Error('Réservation introuvable.');
  const day = rows('R1_Days').find(d => d.Date === booking.Date);
  if (day) {
    const usedByOthers = sumQte(bookings, b => b.Date === booking.Date && b.ID !== id);
    const remaining = Number(day.Capacite) - usedByOthers;
    if (qte > remaining) throw new Error('Il ne reste que ' + remaining + ' couvert(s) disponible(s) pour ce jour.');
  }
  const cfg = getConfig();
  const prixTotal = Math.round((nbEleve * Number(cfg.priceEleve) + nbProf * Number(cfg.priceProf) + nbExt * Number(cfg.priceExterieur)) * 100) / 100;
  updateBookingById('R1_Bookings', id, { Nom: nom, Contact: contact, Classe: classe, Qte: qte, Observation: observation || '', NbEleve: nbEleve, NbProf: nbProf, NbExt: nbExt, PrixTotal: prixTotal });
  return getState();
}

function addBookingR1(date, nom, contact, classe, nbEleve, nbProf, nbExt, observation, requestId) {
  if (alreadyProcessed(requestId)) return Object.assign(getPublicState(), { _duplicate: true });
  nbEleve = toCount(nbEleve);
  nbProf = toCount(nbProf);
  nbExt = toCount(nbExt);
  const qte = nbEleve + nbProf + nbExt;
  if (qte <= 0) throw new Error('Merci de renseigner au moins une personne.');

  const day = rows('R1_Days').find(d => d.Date === date);
  if (!day) throw new Error("Ce jour n'existe plus.");
  const used = sumQte(rows('R1_Bookings'), b => b.Date === date);
  const remaining = Number(day.Capacite) - used;
  if (qte > remaining) throw new Error('Il ne reste que ' + remaining + ' couvert(s) pour ce jour.');

  const cfg = getConfig();
  const prixTotal = (nbEleve * Number(cfg.priceEleve) + nbProf * Number(cfg.priceProf) + nbExt * Number(cfg.priceExterieur));
  const prixTotalRounded = Math.round(prixTotal * 100) / 100;

  appendObjects('R1_Bookings', [{
    ID: Utilities.getUuid(), Date: date, Nom: nom, Contact: contact, Classe: classe, Qte: qte, Timestamp: new Date(),
    Observation: observation || '', NbEleve: nbEleve, NbProf: nbProf, NbExt: nbExt, PrixTotal: prixTotalRounded
  }]);
  markProcessed(requestId);

  let detailLignes = '';
  if (nbEleve > 0) detailLignes += '- ' + nbEleve + ' élève(s) x ' + euros(cfg.priceEleve) + '\n';
  if (nbProf > 0) detailLignes += '- ' + nbProf + ' professeur(s)/personnel x ' + euros(cfg.priceProf) + '\n';
  if (nbExt > 0) detailLignes += '- ' + nbExt + ' extérieur(s) x ' + euros(cfg.priceExterieur) + '\n';

  const body = 'Bonjour ' + nom + ',\n\n' +
    'Votre réservation est confirmée :\n' +
    '- Restaurant : ' + cfg.name1 + '\n' +
    '- Date : ' + dateLongue(date) + '\n' +
    '- Nombre de couverts : ' + qte + '\n' +
    detailLignes +
    '- Total : ' + euros(prixTotalRounded) + '\n' +
    (day.Menu ? ('- Menu du jour : ' + day.Menu + '\n') : '') +
    (observation ? ('- Observation : ' + observation + '\n') : '') +
    '\nPour annuler ou modifier cette réservation, contactez ' + cfg.contactAnnulation + '.\n';
  const mailResult = sendMailSafe(contact, 'Confirmation de réservation - ' + cfg.name1 + ' - ' + dateLongue(date), body);

  const result = getPublicState();
  result._emailStatus = mailResult;
  return result;
}

// ---------- Restaurant 2 ----------

function addDayR2(password, date, note, items, theme, collegue) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  const exists = updateRowByKey('R2_Days', 'Date', date, { Note: note, Theme: theme || '', OuvertPar: collegue || '' });
  if (!exists) {
    appendObjects('R2_Days', [{ Date: date, Note: note, Theme: theme || '', OuvertPar: collegue || '' }]);
  }
  // Jour déjà ouvert : seuls les plats d'un nouveau nom sont ajoutés
  const existingNames = exists
    ? rows('R2_Items').filter(it => it.Date === date).map(it => String(it.Nom).toLowerCase())
    : [];
  const newItems = (items || [])
    .filter(it => existingNames.indexOf(String(it.name).toLowerCase()) === -1)
    .map(it => ({ ID: Utilities.getUuid(), Date: date, Nom: it.name, Stock: it.stock, Prix: it.price || '' }));
  appendObjects('R2_Items', newItems);
  return getState();
}

function addItemR2(password, date, name, stock, price) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  if (!rows('R2_Days').find(d => d.Date === date)) throw new Error("Ce jour n'est pas ouvert.");
  appendObjects('R2_Items', [{ ID: Utilities.getUuid(), Date: date, Nom: name, Stock: stock, Prix: price || '' }]);
  return getState();
}

function editItemR2(password, itemId, name, stock, price) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  if (!updateRowByKey('R2_Items', 'ID', itemId, { Nom: name, Stock: stock, Prix: price || '' })) throw new Error('Plat introuvable.');
  return getState();
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
  const booking = rows('R2_Bookings').find(b => b.ID === id);
  removeRowsByValue('R2_Bookings', 'ID', id);
  if (booking) {
    const cfg = getConfig();
    const item = rows('R2_Items').find(it => it.ID === booking.ItemID);
    const body = 'Bonjour ' + booking.Nom + ',\n\n' +
      'Votre réservation a été annulée :\n' +
      '- Restaurant : ' + cfg.name2 + '\n' +
      '- Date : ' + dateLongue(booking.Date) + '\n' +
      '- Plat : ' + (item ? item.Nom : 'plat') + '\n' +
      '- Quantité : ' + booking.Qte + '\n' +
      '\nPour toute question, contactez ' + cfg.contactAnnulation + '.\n';
    sendMailSafe(booking.Contact, 'Annulation de réservation - ' + cfg.name2 + ' - ' + dateLongue(booking.Date), body);
  }
  return getState();
}

function editBookingR2(password, id, nom, contact, classe, qte, mode, observation) {
  if (!checkPassword(password)) throw new Error('Mot de passe incorrect.');
  qte = toCount(qte);
  if (qte <= 0) throw new Error('Indiquez une quantité supérieure à 0.');
  const bookings = rows('R2_Bookings');
  const booking = bookings.find(b => b.ID === id);
  if (!booking) throw new Error('Réservation introuvable.');
  const item = rows('R2_Items').find(it => it.ID === booking.ItemID);
  if (item) {
    const usedByOthers = sumQte(bookings, b => b.ItemID === booking.ItemID && b.ID !== id);
    const remaining = Number(item.Stock) - usedByOthers;
    if (qte > remaining) throw new Error('Il ne reste que ' + remaining + ' portion(s) disponible(s) pour ce plat.');
  }
  updateBookingById('R2_Bookings', id, { Nom: nom, Contact: contact, Classe: classe, Qte: qte, Mode: mode, Observation: observation || '' });
  return getState();
}

// Ancienne réservation d'un seul plat : la page utilise addBookingR2Multi, mais l'action reste
// acceptée pour un navigateur qui aurait encore l'ancienne version de la page en cache.
function addBookingR2(date, itemId, nom, contact, classe, qte, mode) {
  qte = toCount(qte);
  if (qte <= 0) throw new Error('Indiquez une quantité supérieure à 0.');
  const item = rows('R2_Items').find(it => it.ID === itemId);
  if (!item) throw new Error("Ce plat n'existe plus.");
  const used = sumQte(rows('R2_Bookings'), b => b.ItemID === itemId);
  const remaining = Number(item.Stock) - used;
  if (qte > remaining) throw new Error('Il ne reste que ' + remaining + ' portion(s) de ce plat.');
  appendObjects('R2_Bookings', [{ ID: Utilities.getUuid(), ItemID: itemId, Date: date, Nom: nom, Contact: contact, Classe: classe, Qte: qte, Mode: mode, Timestamp: new Date() }]);

  const cfg = getConfig();
  const body = 'Bonjour ' + nom + ',\n\n' +
    'Votre réservation est confirmée :\n' +
    '- Restaurant : ' + cfg.name2 + '\n' +
    '- Date : ' + dateLongue(date) + '\n' +
    '- Plat : ' + item.Nom + '\n' +
    '- Quantité : ' + qte + '\n' +
    '- Mode : ' + (mode === 'emporter' ? 'à emporter' : 'sur place') + '\n' +
    '\nPour annuler ou modifier cette réservation, contactez ' + cfg.contactAnnulation + '.\n';
  sendMailSafe(contact, 'Confirmation de réservation - ' + cfg.name2 + ' - ' + dateLongue(date), body);

  return getPublicState();
}

function addBookingR2Multi(date, nom, contact, classe, mode, items, observation, requestId) {
  // Quantités contrôlées avant tout : une valeur invalide ne doit jamais arriver dans la feuille
  if (!Array.isArray(items)) throw new Error('Choisissez au moins un plat.');
  items = items
    .map(it => ({ itemId: it && it.itemId, qte: toCount(it && it.qte) }))
    .filter(it => it.qte > 0);
  if (alreadyProcessed(requestId)) return Object.assign(getPublicState(), { _duplicate: true });
  const allItems = rows('R2_Items');
  const bookings = rows('R2_Bookings');
  const newRows = [];
  const confirmed = [];
  const adjusted = [];
  const skipped = [];

  items.forEach(reqItem => {
    const item = allItems.find(it => it.ID === reqItem.itemId);
    if (!item) { skipped.push({ nom: '(plat supprimé)' }); return; }
    const usedBefore = sumQte(bookings, b => b.ItemID === reqItem.itemId);
    const usedThisOrder = confirmed.filter(c => c.itemId === reqItem.itemId).reduce((s, c) => s + c.qte, 0);
    const remaining = Number(item.Stock) - usedBefore - usedThisOrder;
    const qteVoulue = reqItem.qte;
    const qteAccordee = Math.max(0, Math.min(qteVoulue, remaining));
    if (qteAccordee <= 0) {
      skipped.push({ nom: item.Nom });
      return;
    }
    newRows.push({ ID: Utilities.getUuid(), ItemID: reqItem.itemId, Date: date, Nom: nom, Contact: contact, Classe: classe, Qte: qteAccordee, Mode: mode, Timestamp: new Date(), Observation: observation || '' });
    confirmed.push({ itemId: reqItem.itemId, nom: item.Nom, qte: qteAccordee, prix: item.Prix || '' });
    if (qteAccordee < qteVoulue) adjusted.push({ nom: item.Nom, demande: qteVoulue, accorde: qteAccordee });
  });
  appendObjects('R2_Bookings', newRows);
  if (confirmed.length > 0) markProcessed(requestId);

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
      '- Date : ' + dateLongue(date) + '\n' +
      '- Mode : ' + (mode === 'emporter' ? 'à emporter' : 'sur place') + '\n\n';
    confirmed.forEach(c => {
      body += '- ' + c.nom + ' x' + c.qte + (c.prix !== '' && c.prix != null ? ' (' + euros(c.prix) + ' x ' + c.qte + ')' : '') + '\n';
    });
    if (totalPrix > 0) {
      body += '\nTotal' + (hasPriceGap ? ' (hors plats sans prix indiqué)' : '') + ' : ' + euros(totalPrix) + '\n';
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
    mailResult = sendMailSafe(contact, 'Confirmation de réservation - ' + cfg.name2 + ' - ' + dateLongue(date), body);
  }

  const result = getPublicState();
  result._bookingResult = { confirmed, adjusted, skipped, totalPrix, hasPriceGap };
  result._emailStatus = mailResult;
  return result;
}

// ---------- Rappels automatiques la veille ----------

function sendReminders() {
  MEMO = {};
  const tz = Session.getScriptTimeZone();
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const tomorrow = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  const cfg = getConfig();

  const day1 = rows('R1_Days').find(dd => dd.Date === tomorrow);
  rows('R1_Bookings').filter(b => b.Date === tomorrow && isEmail(b.Contact)).forEach(b => {
    const body = 'Bonjour ' + b.Nom + ',\n\nPetit rappel : vous avez une réservation demain (' + dateLongue(tomorrow) + ') au ' + cfg.name1 +
      ' pour ' + b.Qte + ' couvert(s)' + (day1 && day1.Menu ? (' — menu : ' + day1.Menu) : '') + '.\n\n' +
      'Pour annuler, contactez ' + cfg.contactAnnulation + '.\n';
    sendMailSafe(b.Contact, 'Rappel : réservation demain - ' + cfg.name1, body);
  });

  const r2Items = rows('R2_Items');
  rows('R2_Bookings').filter(b => b.Date === tomorrow && isEmail(b.Contact)).forEach(b => {
    const item = r2Items.find(it => it.ID === b.ItemID);
    const body = 'Bonjour ' + b.Nom + ',\n\nPetit rappel : vous avez une réservation demain (' + dateLongue(tomorrow) + ') au ' + cfg.name2 +
      ' — ' + b.Qte + ' portion(s) de ' + (item ? item.Nom : 'plat') + ', ' + (b.Mode === 'emporter' ? 'à emporter' : 'sur place') + '.\n\n' +
      'Pour annuler, contactez ' + cfg.contactAnnulation + '.\n';
    sendMailSafe(b.Contact, 'Rappel : réservation demain - ' + cfg.name2, body);
  });
}

// ---------- Archivage automatique des jours passés ----------

// Déplace vers les onglets « Archive_… » les jours passés depuis plus de ARCHIVE_AFTER_DAYS jours,
// avec leurs plats et leurs réservations. Rien n'est supprimé : tout reste dans la feuille.
function archiveOldData() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    MEMO = {};
    const d = new Date();
    d.setDate(d.getDate() - ARCHIVE_AFTER_DAYS);
    const cutoff = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    ['R1_Bookings', 'R1_Days', 'R2_Bookings', 'R2_Items', 'R2_Days'].forEach(name => archiveTable(name, cutoff));
  } finally {
    stateChanged();
    lock.releaseLock();
  }
}

function archiveTable(name, cutoff) {
  const t = table(name);
  if (!t.sh) return;
  const keep = [], old = [];
  t.objects.forEach((o, i) => {
    const date = String(o.Date || '');
    (/^\d{4}-\d{2}-\d{2}$/.test(date) && date < cutoff ? old : keep).push(t.values[i + 1]);
  });
  if (!old.length) return;

  // 1. Copie dans l'onglet d'archive, colonne par colonne (les colonnes manquantes y sont ajoutées)
  const archName = 'Archive_' + name;
  const arch = ss().getSheetByName(archName) || ss().insertSheet(archName);
  const lastCol = Math.max(arch.getLastColumn(), 1);
  const archHeaders = arch.getRange(1, 1, 1, lastCol).getValues()[0].filter(h => h !== '');
  const missing = t.headers.filter(h => h !== '' && archHeaders.indexOf(h) === -1);
  if (missing.length) {
    arch.getRange(1, archHeaders.length + 1, 1, missing.length).setValues([missing]);
    missing.forEach(h => archHeaders.push(h));
  }
  const archRows = old.map(row => archHeaders.map(h => {
    const c = t.headers.indexOf(h);
    return c === -1 ? '' : cell(h, row[c]);
  }));
  arch.getRange(Math.max(arch.getLastRow(), 1) + 1, 1, archRows.length, archHeaders.length).setValues(archRows);

  // 2. Lignes gardées réécrites en haut, puis fin de l'onglet effacée
  //    (si le script s'arrêtait entre les deux, des lignes seraient en double, jamais perdues)
  const width = t.headers.length;
  if (keep.length) t.sh.getRange(2, 1, keep.length, width).setValues(keep.map(row => row.map((v, c) => cell(t.headers[c], v))));
  t.sh.getRange(2 + keep.length, 1, old.length, width).clearContent();
  touched(name);
}

// À exécuter UNE SEULE FOIS manuellement (et de nouveau après une mise à jour qui l'indique) :
// programme le rappel quotidien à 18 h, l'archivage des jours passés chaque nuit vers 3 h
// et le rafraîchissement de la mémoire de l'état toutes les 5 minutes.
function setupDailyTrigger() {
  const ours = ['sendReminders', 'archiveOldData', 'rafraichirCache'];
  ScriptApp.getProjectTriggers().forEach(t => {
    if (ours.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendReminders').timeBased().everyDays(1).atHour(18).create();
  ScriptApp.newTrigger('archiveOldData').timeBased().everyDays(1).atHour(3).create();
  ScriptApp.newTrigger('rafraichirCache').timeBased().everyMinutes(5).create();
}
