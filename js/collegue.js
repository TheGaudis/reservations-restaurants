// Mode collègue : connexion, tableau de bord, paramètres, ouverture des jours, plats et modifications.

const EYE_ON = `<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-80q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>`;
const EYE_OFF = `<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-57 736 736-56 57ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Z"/></svg>`;
let loginOpen = false;
function renderModeBox(){
  const box = document.getElementById('modeBox');
  if(!box.dataset.ready){
    box.innerHTML = `
      ${segGroup("Mode d'accès", [
        { key:'mode-client', label:'Client', pressed:true, onclick:"chooseMode('client')", attrs:'id="segClient"' },
        { key:'mode-colleague', label:'Collègue', pressed:false, onclick:"chooseMode('colleague')", attrs:'id="segColleague" aria-controls="adminLogin"' }
      ], 'mode-switch')}
      <div class="admin-login" id="adminLogin">
        <div class="admin-login-inner">
          <input type="password" id="pwdInput" placeholder="Mot de passe" aria-label="Mot de passe collègue" autocomplete="current-password"
            onkeydown="if(event.key==='Enter') tryLogin(); else if(event.key==='Escape'){ chooseMode('client'); document.getElementById('segClient').focus(); }">
          <button type="button" class="icon-btn" id="pwdToggle" onclick="togglePwdVisibility()" aria-label="Afficher le mot de passe">${EYE_ON}</button>
          <button type="button" class="btn primary" onclick="tryLogin()">Valider</button>
        </div>
      </div>`;
    box.dataset.ready = '1';
  }
  const colleague = isAdmin || loginOpen;
  document.getElementById('segClient').setAttribute('aria-pressed', String(!colleague));
  document.getElementById('segColleague').setAttribute('aria-pressed', String(colleague));
  document.getElementById('segColleague').setAttribute('aria-expanded', String(loginOpen && !isAdmin));
  const login = document.getElementById('adminLogin');
  const showLogin = loginOpen && !isAdmin;
  login.classList.toggle('open', showLogin);
  login.inert = !showLogin;
  if(!showLogin){
    const input = document.getElementById('pwdInput');
    input.value = ''; input.type = 'password';
    syncPwdToggle();
  }
}
function chooseMode(mode){
  if(mode === 'client'){
    if(isAdmin){ logoutAdmin(); popSeg('mode-client'); showToast('Retour au mode client.'); return; }
    if(!loginOpen) return;
    loginOpen = false; renderModeBox(); popSeg('mode-client');
  } else {
    if(isAdmin || loginOpen) return;
    loginOpen = true; renderModeBox(); popSeg('mode-colleague');
    document.getElementById('pwdInput').focus({ preventScroll: true });
  }
}
function logoutAdmin(){ isAdmin = false; adminPassword=''; loginOpen = false; addBookingOpen = null; if(inactivityTimer) clearTimeout(inactivityTimer); render(); }
function togglePwdVisibility(){
  const input = document.getElementById('pwdInput');
  if(input) input.type = input.type === 'password' ? 'text' : 'password';
  syncPwdToggle();
}
function syncPwdToggle(){
  const input = document.getElementById('pwdInput'), btn = document.getElementById('pwdToggle');
  if(!input || !btn) return;
  const visible = input.type === 'text';
  btn.innerHTML = visible ? EYE_OFF : EYE_ON;
  btn.setAttribute('aria-label', visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
}
// Déconnexion après 10 minutes d'inactivité : les événements ne font que noter l'heure ;
// un seul minuteur vérifie à l'échéance et se réarme pour le temps restant.
const INACTIVITY_MS = 600000;
let inactivityTimer = null, lastActivity = Date.now();
function armInactivityTimer(){
  clearTimeout(inactivityTimer);
  if(!isAdmin) return;
  inactivityTimer = setTimeout(() => {
    if(!isAdmin) return;
    if(Date.now() - lastActivity < INACTIVITY_MS){ armInactivityTimer(); return; }
    logoutAdmin(); showToast('Déconnecté du mode collègue après 10 minutes d\'inactivité.');
  }, INACTIVITY_MS - (Date.now() - lastActivity));
}
['click','keydown','mousemove','touchstart'].forEach(evt => document.addEventListener(evt, () => { lastActivity = Date.now(); }, { passive: true }));
async function tryLogin(){
  // Le mode collègue agit sur les vraies données : jamais sur la copie de la dernière visite
  if(dataStale){ showToast('Les données se chargent. Réessayez dans un instant.', true); return; }
  const val = document.getElementById('pwdInput').value;
  // Une seule requête : vérifie le mot de passe et rapporte l'état complet (réservations détaillées).
  // Une lecture publique en cours au moment de la connexion est jetée par loadAll (isAdmin a changé).
  showLoader();
  try{
    state = await fetchAdminState(val);
    isAdmin = true; adminPassword = val; loginOpen = false; showToast('Mode collègue activé.'); lastActivity = Date.now(); armInactivityTimer(); if(firstLoadDone) render(); else renderModeBox();
    document.getElementById('segColleague').focus({ preventScroll: true });
  }catch(e){
    showToast(e.message === 'Mot de passe incorrect.' ? 'Mot de passe incorrect.' : 'Erreur de connexion. Réessayez.', true);
  }finally{ hideLoader(); }
}

function renderDashboard(){
  const el = document.getElementById('dashboard');
  if(!isAdmin){ el.innerHTML=''; return; }
  const tomorrow = getTomorrowISO();
  const r1Qty = sumBy(state.r1Bookings.filter(b => b.Date === tomorrow), 'Qte');
  const r2Qty = sumBy(state.r2Bookings.filter(b => b.Date === tomorrow), 'Qte');
  el.innerHTML = `
    <div class="panel">
      <h3 class="dash-title">Demain (${formatDate(tomorrow)})</h3>
      <div class="summary-row">
        <div class="summary-item">${escapeHtml(state.name1)} : <b>${r1Qty}</b> ${r1Qty > 1 ? 'couverts réservés' : 'couvert réservé'}</div>
        <div class="summary-item">${escapeHtml(state.name2)} : <b>${r2Qty}</b> ${r2Qty > 1 ? 'portions réservées' : 'portion réservée'}</div>
      </div>
    </div>
  `;
}

let settingsOpen = false;
function renderSettings(){
  const el = document.getElementById('settings');
  if(!isAdmin){ el.innerHTML=''; return; }
  el.innerHTML = `
    <details class="panel settings-panel disclosure" ${settingsOpen ? 'open' : ''} ontoggle="settingsOpen = this.open">
      <summary class="settings-summary">${ICONS.settings}<span>Paramètres</span><span class="settings-chevron" aria-hidden="true"><svg viewBox="0 -960 960 960"><path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/></svg></span></summary>
      <div class="settings-body">
        <div class="settings-grid">
          <div class="field"><label>Nom du restaurant 1</label><input type="text" id="cfg-name1" value="${escapeHtml(state.name1)}"></div>
          <div class="field"><label>Nom du restaurant 2</label><input type="text" id="cfg-name2" value="${escapeHtml(state.name2)}"></div>
          <div class="field span-all"><label>Description du restaurant 1</label><input type="text" id="cfg-desc1" value="${escapeHtml(state.desc1)}"></div>
          <div class="field span-all"><label>Description du restaurant 2</label><input type="text" id="cfg-desc2" value="${escapeHtml(state.desc2)}"></div>
          <div class="field span-all"><label>Contact à indiquer pour une annulation (affiché dans les emails)</label><input type="text" id="cfg-contact" value="${escapeHtml(state.contactAnnulation)}" placeholder="Ex. le secrétariat au 03 00 00 00 00"></div>
          <div class="field"><label>Tarif élève (€)</label><input type="number" step="0.01" min="0" id="cfg-priceEleve" value="${escapeHtml(String(state.priceEleve))}"></div>
          <div class="field"><label>Tarif professeur/personnel (€)</label><input type="number" step="0.01" min="0" id="cfg-priceProf" value="${escapeHtml(String(state.priceProf))}"></div>
          <div class="field"><label>Tarif extérieur (€)</label><input type="number" step="0.01" min="0" id="cfg-priceExterieur" value="${escapeHtml(String(state.priceExterieur))}"></div>
        </div>
        <button class="btn primary" onclick="saveSettings(this)">Enregistrer les paramètres</button>
      </div>
    </details>
  `;
}
// Seuls les champs réellement modifiés sont envoyés (une requête par champ, côté serveur
// actuel) : en général une seule requête au lieu de huit.
const SETTINGS_FIELDS = [['cfg-name1','name1'], ['cfg-name2','name2'], ['cfg-desc1','desc1'], ['cfg-desc2','desc2'],
  ['cfg-contact','contactAnnulation'], ['cfg-priceEleve','priceEleve'], ['cfg-priceProf','priceProf'], ['cfg-priceExterieur','priceExterieur']];
async function saveSettings(btn){
  const changes = SETTINGS_FIELDS
    .map(([id, key]) => [key, document.getElementById(id).value.trim()])
    .filter(([key, value]) => value !== '' && value !== String(state[key] ?? '').trim());
  if(changes.length === 0){ showToast('Aucune modification à enregistrer.'); return; }
  const orig = setBusy(btn, 'Enregistrement…');
  try{
    for(const [key, value] of changes) state = await apiPost('setConfigField', { password: adminPassword, key, value });
    showToast(changes.length > 1 ? 'Paramètres enregistrés.' : 'Paramètre enregistré.');
    render();
  }catch(e){
    showToast(e.message || 'Erreur', true);
    clearBusy(btn, orig);
  }
}

// ---------- Sélecteur de date Material 3 (« Ouvrir un jour ») ----------
// Le champ affiche la date en toutes lettres ; au clic, le calendrier du mois se déplie
// dessous. Le bouton porte l'id date-r1 / date-r2 et sa valeur ISO (.value), comme l'ancien
// <input type="date">. Jours passés grisés, jours déjà ouverts signalés.
// Clavier : flèches (jour / semaine), Début / Fin, Page ↑ / ↓ (mois), Entrée ou Espace pour choisir, Échap pour fermer.
const datePicker = { rest:null, month:null };   // calendrier déplié et mois affiché (1er du mois, ISO)
const dateChoice = { r1:null, r2:null };        // date choisie ; sinon, le jour sélectionné du calendrier
const CAL_ICON = `<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z"/></svg>`;
// Chevrons ‹ › du calendrier et du sélecteur de date ; initiales des jours (lundi en premier)
const CHEVRON_PREV = `<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"/></svg>`;
const CHEVRON_NEXT = `<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>`;
const WEEKDAY_INITIALS = ['L','M','M','J','V','S','D'];
const firstOfMonth = iso => iso.slice(0, 8) + '01';
function formDate(rest){ return dateChoice[rest] || calState[rest].selected; }
function dateFieldHtml(rest){
  const iso = formDate(rest), open = datePicker.rest === rest;
  return `<div class="field date-field">
    <label for="date-${rest}">Date</label>
    <button type="button" class="date-trigger" id="date-${rest}" value="${iso}" aria-haspopup="dialog" aria-expanded="${open}"
      onclick="toggleDatePicker('${rest}')"><span>${formatDate(iso)}</span>${CAL_ICON}</button>
    ${open ? datePickerHtml(rest, iso) : ''}
  </div>`;
}
function datePickerHtml(rest, selected){
  const month = datePicker.month, today = todayISO();
  const statusFn = rest === 'r1' ? dayStatusR1 : dayStatusR2;
  const cells = buildMonthCells(month);
  const focusIso = cells.some(c => c.inMonth && c.iso === selected) ? selected
    : (cells.find(c => c.inMonth && c.iso >= today) || cells.find(c => c.inMonth)).iso;
  const wd = WEEKDAY_INITIALS.map(l => `<span class="dp-wd" aria-hidden="true">${l}</span>`).join('');
  const days = cells.map(c => {
    if(!c.inMonth) return '<span aria-hidden="true"></span>';
    const past = c.iso < today, open = !!statusFn(c.iso);
    const cls = 'dp-day' + (c.iso === today ? ' dp-today' : '');
    const label = formatDate(c.iso) + (open ? ', déjà ouvert' : '') + (past ? ', passé' : '');
    return `<button type="button" class="${cls}" data-iso="${c.iso}" aria-label="${label}" aria-pressed="${c.iso === selected}"`
      + `${past ? ' aria-disabled="true"' : ''}${c.iso === today ? ' aria-current="date"' : ''} tabindex="${c.iso === focusIso ? 0 : -1}"`
      + ` onclick="pickFormDate('${rest}','${c.iso}')">${c.dayNum}${open ? '<span class="dp-dot" aria-hidden="true"></span>' : ''}</button>`;
  }).join('');
  return `<div class="date-picker" role="dialog" aria-label="Choisir la date" onkeydown="dpKey(event,'${rest}')">
    <div class="dp-head">
      <button type="button" class="icon-btn" data-nav="dp-${rest}-prev" onclick="dpMonth('${rest}',-1)" aria-label="Mois précédent">${CHEVRON_PREV}</button>
      <span class="dp-label" aria-live="polite">${monthLabel(month)}</span>
      <button type="button" class="icon-btn" data-nav="dp-${rest}-next" onclick="dpMonth('${rest}',1)" aria-label="Mois suivant">${CHEVRON_NEXT}</button>
    </div>
    <div class="dp-grid">${wd}${days}</div>
    <p class="dp-legend"><span class="dp-dot" aria-hidden="true"></span> déjà ouvert</p>
  </div>`;
}
// Seul le champ Date est réaffiché : le reste du formulaire garde ce qui a été saisi
function refreshDateField(rest){
  const f = document.getElementById('date-' + rest);
  if(f) f.closest('.date-field').outerHTML = dateFieldHtml(rest);
}
function focusDp(rest, iso){
  const el = document.querySelector(`#admin-${rest} .dp-day[data-iso="${iso}"]`) || document.querySelector(`#admin-${rest} .dp-day[tabindex="0"]`);
  if(el) el.focus({ preventScroll: true });
}
function toggleDatePicker(rest){
  if(datePicker.rest === rest){ closeDatePicker(); return; }
  if(datePicker.rest) closeDatePicker(false);
  datePicker.rest = rest; datePicker.month = firstOfMonth(formDate(rest));
  refreshDateField(rest); focusDp(rest, formDate(rest));
}
function closeDatePicker(refocus = true){
  const rest = datePicker.rest; if(!rest) return;
  datePicker.rest = null; refreshDateField(rest);
  const t = document.getElementById('date-' + rest); if(t && refocus) t.focus({ preventScroll: true });
}
function pickFormDate(rest, iso){
  if(iso < todayISO()) return; // jour passé : non sélectionnable
  dateChoice[rest] = iso;
  const field = document.getElementById('date-' + rest).closest('.field');
  if(field) clearFieldErrors(field);
  closeDatePicker();
}
function dpMonth(rest, dir){
  const d = new Date(datePicker.month + 'T00:00:00'); d.setMonth(d.getMonth() + dir);
  datePicker.month = toISO(d);
  keepFocus(() => refreshDateField(rest));
}
function dpKey(e, rest){
  if(e.key === 'Escape'){ e.preventDefault(); closeDatePicker(); return; }
  const cell = e.target.closest('.dp-day'); if(!cell) return;
  const target = keyTargetIso(e.key, cell.dataset.iso);
  if(!target) return;
  e.preventDefault();
  // Les flèches déplacent seulement le focus (M3) ; Entrée ou Espace choisit le jour
  if(firstOfMonth(target) !== datePicker.month){ datePicker.month = firstOfMonth(target); refreshDateField(rest); }
  document.querySelectorAll(`#admin-${rest} .dp-day`).forEach(b => b.tabIndex = (b.dataset.iso === target ? 0 : -1));
  focusDp(rest, target);
}
// Clic en dehors du calendrier déplié : il se referme
document.addEventListener('pointerdown', e => {
  if(datePicker.rest && !e.target.closest('.date-field')) closeDatePicker(false);
});
function renderAdminFormR1(){
  const el = document.getElementById('admin-r1');
  el.className = isAdmin ? 'panel add-day' : '';
  if(!isAdmin){ el.innerHTML = ''; return; }
  el.innerHTML = `<details class="disclosure" ${addDayOpen.r1 ? 'open' : ''} ontoggle="addDayOpen.r1 = this.open">
    <summary class="add-day-summary"><span class="add-day-plus" aria-hidden="true">+</span>Ouvrir un jour</summary>
    <div class="add-day-body">
    ${dateFieldHtml('r1')}
    <div class="field"><label>Votre nom (collègue qui ouvre ce jour)</label><input type="text" id="collegue-r1" placeholder="Ex. M. Dupont" autocomplete="name"></div>
    <div class="field"><label>Nombre de couverts disponibles</label><input type="number" min="1" id="cap-r1" placeholder="Ex. 20"></div>
    <div class="field"><label>Thème du jour (optionnel)</label><input type="text" id="theme-r1" placeholder="Ex. cuisine italienne"></div>
    <div class="field"><label>Menu du jour (optionnel)</label><input type="text" id="note-r1" placeholder="Ex. menu gastronomique, classe TS2"></div>
    <button class="btn primary" onclick="addDayR1(this)">Ouvrir ce jour</button>
    </div>
  </details>`;
}
async function addDayR1(btn){
  const dateVal = document.getElementById('date-r1').value;
  const capVal = parseInt(document.getElementById('cap-r1').value, 10);
  const noteVal = document.getElementById('note-r1').value.trim();
  const themeVal = document.getElementById('theme-r1').value.trim();
  const collegueVal = document.getElementById('collegue-r1').value.trim();
  if(!checkFields(btn, [['date-r1', !dateVal, 'Choisissez une date.'],
    ['cap-r1', !capVal || capVal <= 0, 'Indiquez un nombre de couverts supérieur à 0.']])) return;
  const orig = setBusy(btn, 'Ouverture en cours…');
  try{
    state = await apiPost('addDayR1', { password: adminPassword, date: dateVal, capacity: capVal, menu: noteVal, theme: themeVal, collegue: collegueVal });
    showToast('Jour ajouté.');
    resetFields('collegue-r1', 'cap-r1', 'theme-r1', 'note-r1');
    calState.r1.selected = dateVal; calState.r1.anchor = dateVal;
    render();
  }catch(e){ showToast(e.message || 'Erreur', true); clearBusy(btn, orig); }
}

function renderAdminFormR2(){
  const el = document.getElementById('admin-r2');
  el.className = isAdmin ? 'panel add-day' : '';
  if(!isAdmin){ el.innerHTML = ''; return; }
  // Une ligne par plat : les en-têtes de colonnes sont visibles au-dessus,
  // chaque champ porte en plus un nom complet pour les lecteurs d'écran.
  const itemsHtml = draftItems.map((it, i) => `
    <div class="draft-item-row">
      <input type="text" placeholder="Ex. salade César" aria-label="Plat ${i+1} : nom" value="${escapeHtml(it.name)}" oninput="updateDraftItem(${i}, 'name', this.value)">
      <input type="number" min="1" placeholder="10" aria-label="Plat ${i+1} : stock" value="${it.stock}" oninput="updateDraftItem(${i}, 'stock', this.value)">
      <input type="number" step="0.01" min="0" placeholder="3,50" aria-label="Plat ${i+1} : prix en euros (optionnel)" value="${it.price||''}" list="price-suggestions" oninput="updateDraftItem(${i}, 'price', this.value)">
      <button class="icon-btn" onclick="removeDraftItem(${i})" type="button" aria-label="Retirer le plat ${i+1}"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg></button>
    </div>
  `).join('');
  el.innerHTML = `<details class="disclosure" ${addDayOpen.r2 ? 'open' : ''} ontoggle="addDayOpen.r2 = this.open">
    <summary class="add-day-summary"><span class="add-day-plus" aria-hidden="true">+</span>Ouvrir un jour</summary>
    <div class="add-day-body">
    ${dateFieldHtml('r2')}
    <div class="field"><label>Votre nom (collègue qui ouvre ce jour)</label><input type="text" id="collegue-r2" placeholder="Ex. Cyrille Ungerer" autocomplete="name"></div>
    <div class="field"><label>Note (optionnel)</label><input type="text" id="note-r2" placeholder="Ex. semaine du menu bistrot"></div>
    <div class="field"><label>Thème du jour (optionnel)</label><input type="text" id="theme-r2" placeholder="Ex. semaine italienne"></div>
    <fieldset class="field-group">
      <legend>Plats disponibles ce jour-là</legend>
      <div class="draft-item-row draft-head" aria-hidden="true"><span>Plat</span><span>Stock</span><span>Prix (optionnel)</span><span></span></div>
      ${itemsHtml}
      <button class="btn ghost small" onclick="addDraftItemRow()" type="button">+ Ajouter un plat</button>
    </fieldset>
    <div class="form-submit"><button class="btn primary" onclick="addDayR2(this)">Ouvrir ce jour</button></div>
    </div>
  </details>`;
}
function updateDraftItem(i, field, value){ draftItems[i][field] = value; }
function addDraftItemRow(){ draftItems.push({name:'', stock:'', price:''}); render(['admin-r2']); }
function removeDraftItem(i){ draftItems.splice(i,1); if(draftItems.length===0) draftItems.push({name:'',stock:'',price:''}); render(['admin-r2']); }

async function addDayR2(btn){
  const dateVal = document.getElementById('date-r2').value;
  const noteVal = document.getElementById('note-r2').value.trim();
  const themeVal = document.getElementById('theme-r2').value.trim();
  const collegueVal = document.getElementById('collegue-r2').value.trim();
  const items = draftItems
    .filter(it => it.name.trim() && parseInt(it.stock,10) > 0)
    .map(it => ({ name: it.name.trim(), stock: parseInt(it.stock,10), price: it.price ? parseFloat(it.price) : '' }));
  const lastRow = [...btn.closest('.add-day').querySelectorAll('.draft-item-row')].pop();
  if(!checkFields(btn, [['date-r2', !dateVal, 'Choisissez une date.'],
    [lastRow, items.length === 0, 'Ajoutez au moins un plat avec un nom et un stock.']])) return;
  const orig = setBusy(btn, 'Ouverture en cours…');
  try{
    state = await apiPost('addDayR2', { password: adminPassword, date: dateVal, note: noteVal, items, theme: themeVal, collegue: collegueVal });
    showToast('Jour ajouté.');
    resetFields('collegue-r2', 'note-r2', 'theme-r2');
    draftItems = [{name:'',stock:'',price:''}];
    calState.r2.selected = dateVal; calState.r2.anchor = dateVal;
    render();
  }catch(e){ showToast(e.message || 'Erreur', true); clearBusy(btn, orig); }
}

// Suppression (mode collègue) en deux clics : voir confirmClick
async function adminDelete(btn, confirmMsg, action, payload, okMsg){
  if(!confirmClick(btn, confirmMsg)) return;
  try{ state = await apiPost(action, { password: adminPassword, ...payload }); showToast(okMsg); render(); }
  catch(e){ disarm(btn); showToast(e.message || 'Erreur', true); }
}
const DELETE_DAY_MSG = 'Confirmer la suppression du jour et de toutes ses réservations';
const DELETE_BOOKING_MSG = 'Confirmer la suppression de cette réservation';
const deleteDayR1 = (date, btn) => adminDelete(btn, DELETE_DAY_MSG, 'deleteDayR1', { date }, 'Jour supprimé.');
const deleteDayR2 = (date, btn) => adminDelete(btn, DELETE_DAY_MSG, 'deleteDayR2', { date }, 'Jour supprimé.');
const deleteBookingR1 = (id, btn) => adminDelete(btn, DELETE_BOOKING_MSG, 'deleteBookingR1', { id }, 'Réservation supprimée.');
const deleteBookingR2 = (id, btn) => adminDelete(btn, DELETE_BOOKING_MSG, 'deleteBookingR2', { id }, 'Réservation supprimée.');
const deleteItemR2 = (itemId, btn) => adminDelete(btn, 'Confirmer la suppression de ce plat', 'deleteItemR2', { itemId }, 'Plat supprimé.');

function openEditBookingR1(id){ editBookingTarget = { rest:'r1', id }; enterKey = 'eb-' + id; render(); }
function openEditBookingR2(id){ editBookingTarget = { rest:'r2', id }; enterKey = 'eb-' + id; render(); }
function closeEditBooking(){ leaveThen(editBookingTarget && 'eb-' + editBookingTarget.id, ()=>{ editBookingTarget = null; render(); }); }
// Liste des réservations (mode collègue) : « Modifier » ouvre le formulaire sous la ligne
const isEditingBooking = (rest, b) => !!editBookingTarget && editBookingTarget.rest === rest && editBookingTarget.id === b.ID;
function bookingActions(rest, b){
  const R = rest.toUpperCase();
  return `<span class="booking-row-actions">
    <button class="btn small" onclick="openEditBooking${R}('${b.ID}')"${isEditingBooking(rest, b) ? ' aria-expanded="true"' : ''}>Modifier</button>
    <button class="btn danger small" onclick="deleteBooking${R}('${b.ID}', this)">Supprimer</button>
  </span>`;
}
function bookingEditForm(rest, b){
  if(!isEditingBooking(rest, b)) return '';
  return rest === 'r1' ? editBookingFormR1Html(b) : editBookingFormR2Html(b);
}

// Ajout d'une personne par un collègue (préfixe 'abk') : au restaurant 1 sous la fiche du jour,
// à Aristide sous chaque plat. Mêmes actions que la réservation du public : le script vérifie
// les places restantes (sous verrou) et envoie la confirmation si le contact est un email.
// Pas d'heure limite à Aristide : un collègue peut enregistrer une commande prise sur place.
let addBookingOpen = null; // { rest, key (date ou ID du plat), requestId }
const isAddingBooking = (rest, key) => !!addBookingOpen && addBookingOpen.rest === rest && addBookingOpen.key === key;
function openAddBooking(rest, key){
  addBookingOpen = { rest, key, requestId: newRequestId() };
  enterKey = 'ab-' + key; render();
  focusFirstField(`[data-form="ab-${key}"]`);
}
function closeAddBooking(){ leaveThen(addBookingOpen && 'ab-' + addBookingOpen.key, ()=>{ addBookingOpen = null; render(); }); }
function addBookingButtonHtml(rest, key){
  return `<button class="btn small" onclick="openAddBooking('${rest}', '${key}')"${isAddingBooking(rest, key) ? ' aria-expanded="true"' : ''}>+ Ajouter une personne</button>`;
}
function addIdentityHtml(){
  return `<div class="row2">
      <div class="field"><label>Nom et prénom</label><input type="text" id="abk-nom" placeholder="Ex. Cyrille Ungerer"></div>
      <div class="field"><label>Classe ou service</label><input type="text" id="abk-classe" placeholder="Ex. TS2 ou vie scolaire"></div>
    </div>
    <div class="field"><label>Téléphone ou email (optionnel)</label><input type="text" id="abk-contact"><p class="field-help">Avec un email, la confirmation y est envoyée.</p></div>`;
}
const ADD_OBS_HTML = `<div class="field"><label>Observation (optionnel)</label><input type="text" id="abk-obs" placeholder="Ex. table partagée, allergie…"></div>`;
function addBookingFormR1Html(day){
  if(!isAddingBooking('r1', day.Date)) return '';
  return `<div class="booking-form${enterOnce('ab-' + day.Date)}" data-form="ab-${day.Date}">
    ${addIdentityHtml()}
    ${countsFieldsetR1Html('abk', remainingR1(day))}
    <p id="abk-r1-total" class="form-total" aria-live="polite"></p>
    ${ADD_OBS_HTML}
    ${formActionsHtml(`submitAddBookingR1('${day.Date}', this)`, 'Ajouter cette personne', 'closeAddBooking()')}
  </div>`;
}
function addBookingFormR2Html(item){
  if(!isAddingBooking('r2', item.ID)) return '';
  return `<div class="booking-form${enterOnce('ab-' + item.ID)}" data-form="ab-${item.ID}">
    ${addIdentityHtml()}
    <div class="row2">
      <div class="field"><label>Portions (${remainingItem(item)} au maximum)</label><input type="number" min="1" id="abk-qte" value="1" inputmode="numeric"></div>
      <div class="field"><label>Mode de service</label><select id="abk-mode">
        <option value="emporter">À emporter</option>
        <option value="surplace">Sur place</option>
      </select></div>
    </div>
    ${ADD_OBS_HTML}
    ${formActionsHtml(`submitAddBookingR2('${item.ID}', this)`, 'Ajouter cette personne', 'closeAddBooking()')}
  </div>`;
}
function readAddIdentity(){
  const v = id => document.getElementById('abk-' + id).value.trim();
  return { nom: v('nom'), contact: v('contact'), classe: v('classe'), observation: v('obs') };
}
const addIdentityRules = f => [['abk-nom', !f.nom, 'Indiquez le nom.'], ['abk-classe', !f.classe, 'Indiquez la classe ou le service.']];
// Le script répond avec l'état public (totaux anonymes) : on relit l'état complet pour voir
// le nom dans la liste. La personne est déjà enregistrée : un échec de cette relecture n'est pas une erreur.
// Comme dans loadAll : si une autre écriture ou une déconnexion a eu lieu pendant la relecture,
// sa réponse est jetée (elle effacerait la suppression faite entre-temps, ou garderait les
// données détaillées hors du mode collègue). Mot de passe changé : adminSessionExpired a déjà
// déconnecté et relancé la lecture publique, rien à relancer ici.
async function afterAddBooking(res, okMsg){
  addBookingOpen = null;
  const mailFailed = !!emailWarning(res._emailStatus);
  showToast(res._duplicate ? 'Cette personne était déjà enregistrée : elle n\'a pas été ajoutée une seconde fois.'
    : okMsg + (mailFailed ? ' L\'email de confirmation n\'a pas pu être envoyé.' : ''), mailFailed);
  const seqAtStart = writeSeq;
  let fresh = null;
  try{ fresh = await fetchAdminState(adminPassword); }catch(e){}
  if(!isAdmin) return; // déconnecté pendant la relecture : logoutAdmin a déjà réaffiché la page
  if(fresh && seqAtStart === writeSeq) state = fresh;
  else loadAll(true); // relecture échouée ou dépassée : l'actualisation reprend l'état à jour
  render();
}
async function submitAddBookingR1(date, btn){
  const f = readAddIdentity();
  const { nbEleve, nbProf, nbExt } = countsR1('abk');
  const qte = nbEleve + nbProf + nbExt;
  const day = idx().r1Days.get(date), max = day ? remainingR1(day) : 0;
  const row3 = btn.closest('.booking-form').querySelector('.row3');
  if(!checkFields(btn, [...addIdentityRules(f), [row3, qte <= 0, 'Indiquez au moins une personne.'],
    [row3, qte > max, `${plural(max, 'couvert')} au maximum (places restantes ce jour-là).`]])) return;
  const orig = setBusy(btn, 'Ajout en cours…');
  try{
    const res = await apiPost('addBookingR1', { date, nom: f.nom, contact: f.contact, classe: f.classe, nbEleve, nbProf, nbExt,
      observation: f.observation, requestId: addBookingOpen && addBookingOpen.requestId });
    await afterAddBooking(res, 'Personne ajoutée.');
  }catch(e){ showToast(e.message || 'Erreur', true); clearBusy(btn, orig); }
}
async function submitAddBookingR2(itemId, btn){
  const f = readAddIdentity();
  const qte = parseInt(document.getElementById('abk-qte').value, 10);
  const mode = document.getElementById('abk-mode').value;
  const item = state.r2Items.find(it => it.ID === itemId), max = item ? remainingItem(item) : 0;
  if(!checkFields(btn, [...addIdentityRules(f), ['abk-qte', !(qte > 0), 'Indiquez une quantité supérieure à 0.'],
    ['abk-qte', qte > max, `${plural(max, 'portion')} au maximum (stock restant).`]])) return;
  const orig = setBusy(btn, 'Ajout en cours…');
  try{
    const res = await apiPost('addBookingR2Multi', { date: item.Date, nom: f.nom, contact: f.contact, classe: f.classe, mode,
      items: [{ itemId, qte }], observation: f.observation, requestId: addBookingOpen && addBookingOpen.requestId });
    const r = res._bookingResult;
    if(r && r.confirmed.length === 0) throw new Error('Plus assez de portions disponibles pour ce plat.');
    const got = r && r.confirmed[0] ? r.confirmed[0].qte : qte;
    await afterAddBooking(res, got < qte ? `Personne ajoutée avec ${plural(got, 'portion')} seulement (stock restant).` : 'Personne ajoutée.');
  }catch(e){ showToast(e.message || 'Erreur', true); clearBusy(btn, orig); }
}

function openEditItem(itemId){ editItemTarget = itemId; enterKey = 'ei-' + itemId; render(); }
function closeEditItem(){ leaveThen(editItemTarget && 'ei-' + editItemTarget, ()=>{ editItemTarget = null; render(); }); }
// Formulaire d'un plat d'Aristide, commun à l'ajout (préfixe 'nit') et à la modification ('eit')
function itemFormHtml(key, prefix, item, onSubmit, submitLabel, onCancel){
  return `<div class="booking-form${enterOnce(key)}" data-form="${key}">
    <div class="row2">
      <div class="field"><label>Nom du plat</label><input type="text" id="${prefix}-name" ${item ? `value="${escapeHtml(item.Nom)}"` : 'placeholder="Ex. salade César"'}></div>
      <div class="field"><label>Stock</label><input type="number" min="1" id="${prefix}-stock" ${item ? `value="${item.Stock}"` : 'placeholder="Ex. 10"'}></div>
    </div>
    <div class="field"><label>Prix (optionnel)</label><input type="number" step="0.01" min="0" id="${prefix}-price" value="${item ? item.Prix || '' : ''}" list="price-suggestions" placeholder="Ex. 3,50"></div>
    ${formActionsHtml(onSubmit, submitLabel, onCancel)}
  </div>`;
}
// Lit et vérifie ce formulaire ; null si un champ est en erreur (message affiché)
function readItemForm(prefix, btn){
  const name = document.getElementById(prefix + '-name').value.trim();
  const stock = parseInt(document.getElementById(prefix + '-stock').value, 10);
  const priceVal = document.getElementById(prefix + '-price').value.trim();
  if(!checkFields(btn, [[prefix + '-name', !name, 'Indiquez le nom du plat.'], [prefix + '-stock', !stock || stock <= 0, 'Indiquez un stock supérieur à 0.']])) return null;
  return { name, stock, price: priceVal ? parseFloat(priceVal) : '' };
}
async function submitEditItemR2(itemId, btn){
  const fields = readItemForm('eit', btn);
  if(!fields) return;
  const orig = setBusy(btn, 'Enregistrement…');
  try{
    state = await apiPost('editItemR2', { password: adminPassword, itemId, ...fields });
    showToast('Plat modifié.');
    editItemTarget = null;
    render();
  }catch(e){ showToast(e.message || 'Erreur', true); clearBusy(btn, orig); }
}
function openAddItemForm(date){ addItemFormOpen = date; enterKey = 'ai-' + date; render(); }
function closeAddItemForm(){ leaveThen(addItemFormOpen && 'ai-' + addItemFormOpen, ()=>{ addItemFormOpen = null; render(); }); }
async function submitAddItemR2(date, btn){
  const fields = readItemForm('nit', btn);
  if(!fields) return;
  const orig = setBusy(btn, 'Ajout en cours…');
  try{
    state = await apiPost('addItemR2', { password: adminPassword, date, ...fields });
    showToast('Plat ajouté.');
    addItemFormOpen = null;
    render();
  }catch(e){ showToast(e.message || 'Erreur', true); clearBusy(btn, orig); }
}

function openEditDayR1(date){ editDayR1Open = date; enterKey = 'day-' + date; render(); }
function closeEditDayR1(){ leaveThen(editDayR1Open && 'day-' + editDayR1Open, ()=>{ editDayR1Open = null; render(); }); }
async function submitEditDayR1(date, btn){
  const capacity = parseInt(document.getElementById('edd-cap').value, 10);
  const menu = document.getElementById('edd-menu').value.trim();
  const theme = document.getElementById('edd-theme').value.trim();
  if(!checkFields(btn, [['edd-cap', !capacity || capacity <= 0, 'Indiquez un nombre de couverts supérieur à 0.']])) return;
  const orig = setBusy(btn, 'Enregistrement…');
  try{
    state = await apiPost('editDayR1', { password: adminPassword, date, capacity, menu, theme });
    showToast('Jour modifié.');
    editDayR1Open = null;
    render();
  }catch(e){ showToast(e.message || 'Erreur', true); clearBusy(btn, orig); }
}

// Modification d'une réservation du restaurant 1 : détail Élèves / Personnels / Extérieurs,
// prix recalculé aux tarifs actuels, places limitées à celles restantes + celles déjà réservées.
// Si la capacité du jour a été baissée sous le total réservé, on peut toujours garder ses couverts actuels.
function editMaxR1(b){
  const day = state.r1Days.find(d => d.Date === b.Date);
  return day ? Math.max(Number(b.Qte), remainingR1(day) + Number(b.Qte)) : Number(b.Qte);
}
async function submitEditBookingR1(id, btn){
  const f = readEditIdentity(), { nom, contact, classe, observation } = f;
  const { nbEleve, nbProf, nbExt } = countsR1('ebk');
  const qte = nbEleve + nbProf + nbExt;
  const b = state.r1Bookings.find(x => x.ID === id);
  const max = b ? editMaxR1(b) : Infinity;
  const row3 = btn.closest('.booking-form').querySelector('.row3');
  if(!checkFields(btn, [...editIdentityRules(f), [row3, qte <= 0, 'Indiquez au moins une personne.'],
    [row3, qte > max, `${plural(max, 'couvert')} au maximum pour cette réservation (places restantes ce jour-là).`]])) return;
  const prixTotal = Math.round(priceR1(nbEleve, nbProf, nbExt) * 100) / 100;
  const orig = setBusy(btn, 'Enregistrement…');
  try{
    state = await apiPost('editBookingR1', { password: adminPassword, id, nom, contact, classe, qte, nbEleve, nbProf, nbExt, prixTotal, observation });
    showToast('Réservation modifiée.');
    editBookingTarget = null;
    render();
  }catch(e){ showToast(e.message || 'Erreur', true); clearBusy(btn, orig); }
}
async function submitEditBookingR2(id, btn){
  const f = readEditIdentity(), { nom, contact, classe, observation } = f;
  const qte = parseInt(document.getElementById('ebk-qte').value, 10);
  const mode = document.getElementById('ebk-mode').value;
  if(!checkFields(btn, [...editIdentityRules(f), ['ebk-qte', !qte || qte <= 0, 'Indiquez une quantité supérieure à 0.']])) return;
  const orig = setBusy(btn, 'Enregistrement…');
  try{
    state = await apiPost('editBookingR2', { password: adminPassword, id, nom, contact, classe, qte, mode, observation });
    showToast('Réservation modifiée.');
    editBookingTarget = null;
    render();
  }catch(e){ showToast(e.message || 'Erreur', true); clearBusy(btn, orig); }
}
