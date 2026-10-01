// Données : état de la page, copie locale, voile de chargement, échanges avec Apps Script, places restantes.

// APPS_SCRIPT_URL est défini dans le <head>, avec la première lecture des données.
if (APPS_SCRIPT_URL.indexOf('COLLE_ICI') !== -1) {
  document.getElementById('setupBanner').style.display = 'block';
}

let isAdmin = false;
let adminPassword = '';
let state = { r1Days:[], r1Bookings:[], r2Days:[], r2Items:[], r2Bookings:[], name1:'Restaurant Pédagogique', name2:'Aristide', desc1:"Table réservée par nombre de couverts, avec le menu du jour.", desc2:"Plats à emporter ou sur place, chacun avec son propre stock.", contactAnnulation:"l'établissement", priceEleve:'4.95', priceProf:'6.10', priceExterieur:'9.90' };
// Titres, descriptions et sous-titre. Ils ne sont réécrits que s'ils changent,
// avec un court fondu ; au premier affichage (initial = true), sans animation.
const TEXTS_KEY = 'reservations-textes';
function renderTexts(s, initial){
  const texts = {
    'title-r1': s.name1, 'title-r2': s.name2, 'desc-r1': s.desc1, 'desc-r2': s.desc2,
    'page-subtitle': 'Table côté ' + s.name1 + ' · Plats à emporter ou sur place côté ' + s.name2
  };
  Object.entries(texts).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if(!el || !value || el.textContent === value) return;
    el.textContent = value;
    if(initial) return;
    el.classList.remove('text-updated'); void el.offsetWidth; el.classList.add('text-updated');
  });
}
function saveTexts(s){
  try{ localStorage.setItem(TEXTS_KEY, JSON.stringify({ name1:s.name1, name2:s.name2, desc1:s.desc1, desc2:s.desc2 })); }catch(e){}
}
// Copie locale des dernières données, pour afficher le calendrier dès l'ouverture de la page.
// Réduite à ce qui sert à la consultation : jours, plats, capacités et places prises par jour
// ou par plat. Aucun nom, email, téléphone ni observation n'est gardé dans le navigateur.
// Tant que les données fraîches ne sont pas arrivées (dataStale), rien ne peut être réservé.
// CACHE_KEY et CACHE_MAX_AGE : définis dans le <head> d'index.html (lecture anticipée).
const CONFIG_KEYS = ['name1', 'name2', 'desc1', 'desc2', 'contactAnnulation', 'priceEleve', 'priceProf', 'priceExterieur'];
let dataStale = false, cachedFor = null;
function saveCache(s){
  if(cachedFor === s) return;
  cachedFor = s;
  const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));
  const r1Used = {}, r2Used = {};
  s.r1Bookings.forEach(b => { r1Used[b.Date] = (r1Used[b.Date] || 0) + (Number(b.Qte) || 0); });
  s.r2Bookings.forEach(b => { r2Used[b.ItemID] = (r2Used[b.ItemID] || 0) + (Number(b.Qte) || 0); });
  // etag : présent seulement pour l'état public, dont cette copie reprend exactement le contenu.
  // Au chargement suivant, la page le renvoie (?since=) : si rien n'a changé, la réponse est minuscule.
  const snap = {
    savedAt: Date.now(), etag: s.etag, config: pick(s, CONFIG_KEYS), r1Used, r2Used,
    r1Days: s.r1Days.map(d => pick(d, ['Date', 'Capacite', 'Theme', 'Menu'])),
    r2Days: s.r2Days.map(d => pick(d, ['Date', 'Theme', 'Note'])),
    r2Items: s.r2Items.map(it => pick(it, ['ID', 'Date', 'Nom', 'Stock', 'Prix']))
  };
  try{ localStorage.setItem(CACHE_KEY, JSON.stringify(snap)); }catch(e){}
}
// Rebâtit un state affichable : les places prises deviennent des réservations anonymes
// (une par jour ou par plat), que les calculs de places restantes savent déjà additionner.
function loadCache(){
  try{
    const snap = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if(!snap || !(Date.now() - snap.savedAt < CACHE_MAX_AGE)) return null;
    return { ...snap.config, etag: snap.etag, r1Days: snap.r1Days, r2Days: snap.r2Days, r2Items: snap.r2Items,
      r1Bookings: Object.entries(snap.r1Used).map(([Date, Qte]) => ({ Date, Qte })),
      r2Bookings: Object.entries(snap.r2Used).map(([ItemID, Qte]) => ({ ItemID, Qte })) };
  }catch(e){ return null; }
}
// Bouton « Réserver » : inactif tant que les places ne sont pas à jour
function reserveButtonHtml(onclick){
  return dataStale
    ? `<div class="day-actions"><button class="btn primary" disabled>Mise à jour des places…</button></div>`
    : `<div class="day-actions"><button class="btn primary" onclick="${onclick}">Réserver</button></div>`;
}
let draftItems = [{name:'', stock:'', price:''}];
let openBookingTarget = null;
let chosenServiceMode = 'emporter';
let multiBookingQty = {};
let editBookingTarget = null;
let editItemTarget = null;
let addItemFormOpen = null;
let editDayR1Open = null;
let addDayOpen = { r1:false, r2:false };

// Voile de chargement : bloque tout de suite la souris ET le clavier (page inerte), mais ne
// s'affiche qu'après --dur-slow pour ne pas clignoter sur les actions rapides (délai en JS :
// il reste valable quand les animations sont réduites). Le focus est rendu à la fin.
// Durée d'un jeton de mouvement (« .35s ») en millisecondes
function tokenMs(token, fallback){ return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token)) * 1000 || fallback; }
let loaderCount = 0, loaderTimer = null, loaderFocus = null;
function showLoader(){
  if(loaderCount++ > 0) return;
  const l = document.getElementById('loader');
  loaderFocus = document.activeElement;
  l.classList.add('blocking'); l.removeAttribute('aria-hidden');
  document.querySelector('.wrap').inert = true;
  loaderTimer = setTimeout(() => { l.classList.add('show'); l.querySelector('p').textContent = 'Chargement…'; }, tokenMs('--dur-slow', 350));
}
function hideLoader(){
  if(loaderCount === 0 || --loaderCount > 0) return;
  const l = document.getElementById('loader');
  clearTimeout(loaderTimer);
  l.classList.remove('show', 'blocking'); l.setAttribute('aria-hidden', 'true');
  l.querySelector('p').textContent = '';
  document.querySelector('.wrap').inert = false;
  if(loaderFocus && loaderFocus.isConnected && document.activeElement === document.body) loaderFocus.focus({ preventScroll: true });
}

// Lecture : Google renvoie parfois une page d'erreur passagère (403 / 404) au lieu du JSON.
// Une seconde tentative, 1,5 s plus tard, suffit en général ; les écritures ne sont jamais rejouées.
// Une erreur renvoyée par le script lui-même (data.error) ne change pas en réessayant : pas de seconde tentative.
// since : etag de l'état affiché ; si rien n'a changé, le script répond seulement { unchanged: true }.
async function apiGet(silent, since = ''){
  if(!silent) showLoader();
  try{
    let data;
    for(let attempt = 1; ; attempt++){
      try{
        // La lecture anticipée du <head> ne sert que si elle a été faite avec le même etag
        const early = earlyGet; earlyGet = null;
        data = await ((early && earlySince === since) ? early : fetch(stateUrl(since)).then(r => r.json()));
        break;
      }catch(e){
        if(attempt >= 2 || !navigator.onLine) throw e;
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    if(data.error) throw new Error(data.error);
    return data;
  }finally{ if(!silent) hideLoader(); }
}
// Bouton en cours d'envoi : il porte lui-même le retour (libellé + aria-busy),
// le voile plein écran n'est alors pas affiché en plus.
function setBusy(btn, label){
  const orig = btn.textContent;
  btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = label;
  return orig;
}
function clearBusy(btn, orig){ btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = orig; }
async function postJson(action, payload){
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload })
  });
  const data = await res.json();
  if(data.error){
    // Mot de passe changé côté script pendant une session collègue (actualisation ou écriture)
    if(isAdmin && data.error === 'Mot de passe incorrect.') throw adminSessionExpired();
    throw new Error(data.error);
  }
  return data;
}
function adminSessionExpired(){
  const msg = 'Le mot de passe du mode collègue a changé. Reconnectez-vous.';
  logoutAdmin(); showToast(msg, true);
  loadAll(true); // état public à la place de l'état complet
  return new Error(msg);
}
let writeSeq = 0;
async function apiPost(action, payload={}){
  writeSeq++;
  const quiet = !!document.querySelector('button[aria-busy="true"]');
  if(!quiet) showLoader();
  try{ return await postJson(action, payload); }
  finally{ if(!quiet) hideLoader(); }
}
// La lecture publique ne contient que les places prises. Le mode collègue lit l'état complet
// (réservations détaillées) avec son mot de passe ; c'est aussi la vérification à la connexion.
async function fetchAdminState(password){
  try{ return await postJson('getAdminState', { password }); }
  catch(e){
    if(!/^Action inconnue/.test(e.message)) throw e;
    // Script Apps Script pas encore mis à jour : sa lecture publique contient encore tout
    const res = await postJson('checkPassword', { password });
    if(!res.ok) throw new Error('Mot de passe incorrect.');
    const data = await apiGet(true);
    if(!Array.isArray(data.r1Bookings)) throw new Error('Réponse inattendue du service.');
    return data;
  }
}
// Réponse d'une réservation publique (totaux anonymes) : si un collègue s'est connecté pendant
// l'envoi, elle ne doit pas remplacer l'état complet ; on relit celui-ci pour y voir la réservation.
function adoptBookingState(res){
  if(isAdmin){ loadAll(true); return; }
  state = res;
}

// Somme d'une colonne numérique (Qte, PrixTotal…) ; les cellules vides comptent 0
const sumBy = (list, key) => list.reduce((s, x) => s + Number(x[key] || 0), 0);

// Premier chargement : squelette affiché à la place de l'écran de chargement.
// Rafraîchissements automatiques : silencieux, sans bloquer l'écran.
let firstLoadDone = false;
async function loadAll(background){
  const seqAtStart = writeSeq, asAdmin = isAdmin;
  try{
    const data = asAdmin ? await fetchAdminState(adminPassword) : await apiGet(true, state.etag || '');
    // Une écriture, une connexion ou une déconnexion a eu lieu pendant la lecture : données à jeter.
    if(seqAtStart !== writeSeq || asAdmin !== isAdmin){ if(!firstLoadDone) return loadAll(background); return; }
    if(data.unchanged){
      // Rien n'a changé depuis l'état affiché (copie locale comprise) : il devient l'état à jour
      if(background && firstLoadDone && !dataStale) return;
    } else {
      state = data;
    }
    firstLoadDone = true;
    dataStale = false; // les boutons « Réserver » redeviennent actifs
    document.body.classList.remove('load-error');
    render();
  }catch(e){
    if(background && firstLoadDone) return;
    showLoadError();
    if(firstLoadDone) showToast("Impossible de charger les données. Réessayez.", true);
  }
}
// Encadré d'échec : le message dit la vraie cause (appareil hors ligne ou service qui
// ne répond pas). Le texte est inséré à chaque échec pour être annoncé (role="alert").
function showLoadError(){
  const box = document.getElementById('loadErrorText');
  const msg = (navigator.onLine
    ? '<b>Le service de réservation ne répond pas.</b><br>Réessayez dans un instant. Si le problème continue, prévenez l\'établissement.'
    : '<b>Vous semblez hors ligne.</b><br>Vérifiez votre connexion internet, puis réessayez.'
  ) + (dataStale ? '<br>Le calendrier affiché date de votre dernière visite : les réservations reprendront une fois les places à jour.' : '');
  document.body.classList.add('load-error');
  box.textContent = '';
  requestAnimationFrame(() => { box.innerHTML = msg; });
}
// L'encadré reste affiché pendant la nouvelle tentative : c'est le bouton qui montre l'attente.
async function retryLoad(btn){
  const orig = setBusy(btn, 'Nouvelle tentative…');
  await loadAll();
  clearBusy(btn, orig);
}

// Index des données, reconstruits seulement quand `state` est remplacé (chargement ou
// écriture : state n'est jamais modifié sur place). Le calendrier, le sélecteur de date et
// les fiches lisent ainsi les places restantes sans reparcourir toutes les réservations.
let dataIndex = null, dataIndexFor = null;
function idx(){
  if(dataIndexFor === state) return dataIndex;
  const add = (map, key, n) => map.set(key, (map.get(key) || 0) + n);
  const r1Used = new Map(), r2Used = new Map(), r2ItemsByDate = new Map();
  state.r1Bookings.forEach(b => add(r1Used, b.Date, Number(b.Qte) || 0));
  state.r2Bookings.forEach(b => add(r2Used, b.ItemID, Number(b.Qte) || 0));
  state.r2Items.forEach(it => { if(!r2ItemsByDate.has(it.Date)) r2ItemsByDate.set(it.Date, []); r2ItemsByDate.get(it.Date).push(it); });
  dataIndex = {
    r1Days: new Map(state.r1Days.map(d => [d.Date, d])), r2Days: new Map(state.r2Days.map(d => [d.Date, d])),
    r1Used, r2Used, r2ItemsByDate, status: { r1: new Map(), r2: new Map() }
  };
  dataIndexFor = state;
  return dataIndex;
}
function remainingR1(day){ return Number(day.Capacite) - (idx().r1Used.get(day.Date) || 0); }
function remainingItem(item){ return Number(item.Stock) - (idx().r2Used.get(item.ID) || 0); }
const itemsR2 = iso => idx().r2ItemsByDate.get(iso) || [];
// Aristide : les commandes en ligne ferment à 10 h le jour même ; ensuite, commande sur place à 12 h
const R2_CUTOFF_HOUR = 10, R2_ONSITE_HOUR = 12;
const r2ClosedMsg = () => `Commandes en ligne closes depuis ${R2_CUTOFF_HOUR} h. Venez au restaurant ${state.name2} à partir de ${R2_ONSITE_HOUR} h pour commander sur place.`;
function r2OrdersClosed(iso){
  const today = todayISO();
  return iso < today || (iso === today && new Date().getHours() >= R2_CUTOFF_HOUR);
}
function capacityClass(rem, cap){
  if(rem <= 0) return 'cap-full';
  if(rem < cap * 0.5) return 'cap-low'; // moins de la moitié des places restantes
  return 'cap-ok';
}
// Disponibilité d'un jour (pastille du calendrier), mémorisée jusqu'au prochain changement de données
function cachedStatus(rest, iso, compute){
  const cache = idx().status[rest];
  if(!cache.has(iso)) cache.set(iso, compute());
  return cache.get(iso);
}
function dayStatusR1(iso){
  return cachedStatus('r1', iso, () => {
    const day = idx().r1Days.get(iso);
    return day ? capacityClass(remainingR1(day), day.Capacite) : null;
  });
}
function dayStatusR2(iso){
  return cachedStatus('r2', iso, () => {
    const items = itemsR2(iso);
    if(!idx().r2Days.has(iso) || items.length === 0) return null;
    return capacityClass(items.reduce((s, it) => s + remainingItem(it), 0), sumBy(items, 'Stock'));
  });
}
