// Réservation par le public : ouverture, envoi et formulaires.

function openBookingR1(date){
  bookingConfirmation = null; openBookingTarget = { rest:'r1', date, requestId: newRequestId() }; enterKey = 'bk-' + date; render();
  focusFirstField('#detail-r1 .booking-form');
  // si le formulaire s'ouvre dans le bas de l'écran, on le fait remonter en douceur
  const form = document.querySelector('#detail-r1 .form-reveal');
  if(form && form.getBoundingClientRect().top > window.innerHeight * 0.6) form.scrollIntoView({ block:'start' });
}
function openBookingR2Day(date){ bookingConfirmation = null; openBookingTarget = { rest:'r2', date, requestId: newRequestId() }; chosenServiceMode='emporter'; multiBookingQty = {}; enterKey = 'bk-' + date; menuAnim = 'up'; render();
  focusFirstField('#detail-r2 .booking-form');
  // la liste repliée raccourcit la page : on remonte en douceur au début de la fiche si elle est hors de vue
  const card = document.querySelector('#detail-r2 .day-card');
  if(card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ block:'start' });
}
function closeBooking(){
  const rest = openBookingTarget && openBookingTarget.rest;
  leaveThen(openBookingTarget && 'bk-' + openBookingTarget.date, ()=>{
    if(rest === 'r2') menuAnim = 'down';
    openBookingTarget = null; multiBookingQty = {}; render();
    // le focus revient sur « Réserver »
    const btn = rest && document.querySelector(`#detail-${rest} .day-actions .btn.primary`);
    if(btn) btn.focus({ preventScroll: true });
  });
}
// Premier champ d'un formulaire qui vient de s'ouvrir (sans faire défiler : le défilement est géré à part)
function focusFirstField(sel){
  const f = document.querySelector(sel);
  const el = f && f.querySelector('input:not([type="hidden"]), select, textarea');
  if(el) el.focus({ preventScroll: true });
}
function setServiceMode(mode){
  if(chosenServiceMode === mode) return;
  chosenServiceMode = mode; render(['detail-r2']); popSeg(`service-${mode}`);
}
function setMultiQty(itemId, value){
  const n = parseInt(value, 10);
  if(n > 0) multiBookingQty[itemId] = n; else delete multiBookingQty[itemId];
  const total = document.getElementById('bk-r2-total');
  if(n > 0 && total && total.classList.contains('has-error')){
    total.classList.remove('has-error');
    const next = total.nextElementSibling;
    if(next && next.classList.contains('field-error')) next.remove();
  }
}
function updateR2PriceLive(){
  const el = document.getElementById('bk-r2-total');
  if(!el) return;
  let total = 0;
  let hasGap = false;
  Object.keys(multiBookingQty).forEach(itemId => {
    const item = state.r2Items.find(it => it.ID === itemId);
    if(!item) return;
    if(item.Prix !== '' && item.Prix != null){ total += Number(item.Prix) * multiBookingQty[itemId]; }
    else { hasGap = true; }
  });
  el.textContent = total > 0 ? ('Total' + (hasGap ? ' (hors plats sans prix indiqué)' : '') + ' : ' + formatEuro(total)) : '';
}

// Anti-doublon : chaque formulaire de réservation reçoit à l'ouverture un identifiant, renvoyé
// tel quel si l'on réessaie après une erreur. Si le serveur a déjà enregistré cet envoi (réponse
// perdue en route, double clic…), il répond _duplicate au lieu d'ajouter une seconde réservation.
function newRequestId(){
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}
function handleDuplicate(res){
  if(!res._duplicate) return false;
  ['_duplicate', '_emailStatus', '_bookingResult'].forEach(k => delete res[k]);
  adoptBookingState(res);
  openBookingTarget = null; multiBookingQty = {};
  showToast('Cette réservation était déjà enregistrée : elle n\'a pas été ajoutée une seconde fois.');
  render();
  return true;
}
// Avertissement du récapitulatif quand l'email de confirmation n'a pas pu partir
function emailWarning(status){
  const failed = status && status.sent === false && status.reason !== 'no-email';
  return failed ? "L'email de confirmation n'a pas pu être envoyé. Gardez ce récapitulatif." : '';
}
async function submitBookingR1(date, btn){
  const f = readBooker(), { name, contact, classe, obs } = f;
  const { nbEleve, nbProf, nbExt } = countsR1('bk');
  const totalPersonnes = nbEleve + nbProf + nbExt;
  if(!checkFields(btn, [...bookerRules(f),
    [document.getElementById('bk-nbEleve').closest('.row3'), totalPersonnes <= 0, 'Indiquez au moins une personne.']])) return;
  const orig = setBusy(btn, 'Envoi en cours…');
  try{
    const res = await apiPost('addBookingR1', { date, nom:name, contact, classe, nbEleve, nbProf, nbExt, observation: obs, requestId: openBookingTarget && openBookingTarget.requestId });
    if(handleDuplicate(res)) return;
    const emailStatus = res._emailStatus;
    delete res._emailStatus;
    adoptBookingState(res);
    const lines = [{ label:'Nom', value:name }, { label:'Classe / service', value:classe }];
    if(nbEleve) lines.push({ label:'Élèves', value:String(nbEleve) });
    if(nbProf) lines.push({ label:'Personnels', value:String(nbProf) });
    if(nbExt) lines.push({ label:'Extérieurs', value:String(nbExt) });
    const totalPrix = priceR1(nbEleve, nbProf, nbExt);
    bookingConfirmation = {
      rest:'r1', date, lines,
      total: plural(totalPersonnes, 'couvert') + (totalPrix > 0 ? ' — ' + formatEuro(totalPrix) : ''),
      warning: emailWarning(emailStatus)
    };
    showToast('Réservation confirmée.');
    openBookingTarget = null;
    render();
  }catch(e){ showToast(e.message || 'Erreur', true); clearBusy(btn, orig); }
}
async function submitBookingR2Multi(date, btn){
  const f = readBooker(), { name, contact, classe, obs } = f;
  const items = Object.keys(multiBookingQty).map(itemId => ({ itemId, qte: multiBookingQty[itemId] }));
  if(r2OrdersClosed(date)){ openBookingTarget = null; showToast(r2ClosedMsg()); render(); return; }
  if(!checkFields(btn, [[document.getElementById('bk-r2-total'), items.length === 0, 'Choisissez au moins un plat.'], ...bookerRules(f)])) return;
  const orig = setBusy(btn, 'Envoi en cours…');
  try{
    const res = await apiPost('addBookingR2Multi', { date, nom:name, contact, classe, mode: chosenServiceMode, items, observation: obs, requestId: openBookingTarget && openBookingTarget.requestId });
    if(handleDuplicate(res)) return;
    const r = res._bookingResult || { confirmed:[], adjusted:[], skipped:[] };
    const emailStatus = res._emailStatus;
    delete res._bookingResult;
    delete res._emailStatus;
    adoptBookingState(res);
    if(r.confirmed.length === 0){
      showToast('Aucun des plats choisis n\'est disponible en quantité suffisante.', true);
    } else {
      const partial = r.adjusted.length > 0 || r.skipped.length > 0;
      const lines = [{ label:'Nom', value:name }, { label:'Classe / service', value:classe },
        { label:'Mode', value: chosenServiceMode === 'emporter' ? 'À emporter' : 'Sur place' }];
      // Quantités réellement enregistrées par le serveur (après ajustement éventuel du stock)
      r.confirmed.forEach(c => lines.push({ label: c.nom || 'Plat', value: '× ' + c.qte }));
      bookingConfirmation = {
        rest:'r2', date, lines,
        total: r.totalPrix > 0 ? formatEuro(r.totalPrix) + (r.hasPriceGap ? ' (hors plats sans prix)' : '') : '',
        warning: partial ? 'Certaines quantités ont été ajustées faute de stock. Vérifiez votre email pour le détail.'
               : emailWarning(emailStatus)
      };
      showToast('Réservation confirmée.');
    }
    openBookingTarget = null;
    multiBookingQty = {};
    render();
  }catch(e){ showToast(e.message || 'Erreur', true); clearBusy(btn, orig); }
}

// ---------- Blocs communs des formulaires ----------
// Boutons « Enregistrer / Confirmer… » + « Annuler » en bas d'un formulaire
function formActionsHtml(onSubmit, submitLabel, onCancel){
  return `<div class="day-actions">
      <button class="btn primary" onclick="${onSubmit}">${submitLabel}</button>
      <button class="btn ghost" onclick="${onCancel}">Annuler</button>
    </div>`;
}
// Réservation par le public (préfixe 'bk') : nom et prénom, email, classe ; observation
function bookerFieldsHtml(){
  return `<div class="field"><label>Nom et prénom</label><input type="text" id="bk-name" placeholder="Ex. Camille Martin" autocomplete="name"></div>
      <div class="row2">
        ${contactFieldHtml()}
        <div class="field"><label>Classe ou service</label><input type="text" id="bk-classe" placeholder="Ex. TS2 ou vie scolaire"></div>
      </div>`;
}
const BOOKER_OBS_HTML = `<div class="field"><label>Observation (optionnel)</label><input type="text" id="bk-obs" placeholder="Ex. table partagée, allergie…"></div>`;
function readBooker(){
  const v = id => document.getElementById('bk-' + id).value.trim();
  return { name: v('name'), contact: v('contact'), classe: v('classe'), obs: v('obs') };
}
function bookerRules(f){
  return [['bk-name', !f.name, 'Indiquez vos nom et prénom.'], ['bk-contact', !!emailError(f.contact), emailError(f.contact)],
    ['bk-classe', !f.classe, 'Indiquez votre classe ou votre service.']];
}
// Modification d'une réservation par un collègue (préfixe 'ebk') : nom, classe, contact ; observation
function editIdentityHtml(b){
  return `<div class="row2">
      <div class="field"><label>Nom</label><input type="text" id="ebk-nom" value="${escapeHtml(b.Nom)}"></div>
      <div class="field"><label>Classe ou service</label><input type="text" id="ebk-classe" value="${escapeHtml(b.Classe)}"></div>
    </div>`;
}
const editContactHtml = b => `<div class="field"><label>Téléphone ou email</label><input type="text" id="ebk-contact" value="${escapeHtml(b.Contact)}"></div>`;
const editObsHtml = b => `<div class="field"><label>Observation (optionnel)</label><input type="text" id="ebk-obs" value="${escapeHtml(b.Observation||'')}"></div>`;
function readEditIdentity(){
  const v = id => document.getElementById('ebk-' + id).value.trim();
  return { nom: v('nom'), contact: v('contact'), classe: v('classe'), observation: v('obs') };
}
function editIdentityRules(f){
  return [['ebk-nom', !f.nom, 'Indiquez le nom.'], ['ebk-classe', !f.classe, 'Indiquez la classe ou le service.'],
    ['ebk-contact', !f.contact, 'Indiquez un téléphone ou un email.']];
}

function editBookingFormR1Html(b){
  // anciennes réservations : pas de détail Élèves / Personnels / Extérieurs (champs laissés vides)
  const count = v => (v === '' || v == null) ? '' : Number(v);
  const hasDetail = [b.NbEleve, b.NbProf, b.NbExt].some(v => Number(v) > 0);
  return `<div class="booking-form${enterOnce('eb-' + b.ID)}" data-form="eb-${b.ID}">
    ${editIdentityHtml(b)}
    ${editContactHtml(b)}
    ${countsFieldsetR1Html('ebk', editMaxR1(b), { nbEleve: count(b.NbEleve), nbProf: count(b.NbProf), nbExt: count(b.NbExt) },
      hasDetail ? '' : `<p class="field-help">Réservation enregistrée avant les tarifs : indiquez la répartition de ses ${plural(Number(b.Qte), 'couvert')}.</p>`)}
    <p id="ebk-r1-total" class="form-total" aria-live="polite"></p>
    ${editObsHtml(b)}
    ${formActionsHtml(`submitEditBookingR1('${b.ID}', this)`, 'Enregistrer', 'closeEditBooking()')}
  </div>`;
}
function editBookingFormR2Html(b){
  return `<div class="booking-form${enterOnce('eb-' + b.ID)}" data-form="eb-${b.ID}">
    ${editIdentityHtml(b)}
    <div class="row2">
      ${editContactHtml(b)}
      <div class="field"><label>Portions</label><input type="number" min="1" id="ebk-qte" value="${Number(b.Qte)}"></div>
    </div>
    <div class="field"><label>Mode de service</label><select id="ebk-mode">
      <option value="emporter" ${b.Mode==='emporter'?'selected':''}>À emporter</option>
      <option value="surplace" ${b.Mode==='surplace'?'selected':''}>Sur place</option>
    </select></div>
    ${editObsHtml(b)}
    ${formActionsHtml(`submitEditBookingR2('${b.ID}', this)`, 'Enregistrer', 'closeEditBooking()')}
  </div>`;
}

// Restaurant pédagogique : le formulaire se déplie vers le bas depuis l'emplacement du bouton
// « Réserver » (même durée et même courbe que la liste d'Aristide), et se replie à l'annulation.
function bookingFormHtml(date, rem){
  const enter = enterOnce('bk-' + date);
  return `
    <div class="form-reveal${enter}" data-form="bk-${date}"><div class="form-reveal-inner">
    <div class="booking-form${enter}">
      ${bookerFieldsHtml()}
      ${countsFieldsetR1Html('bk', rem)}
      <p id="bk-r1-total" class="form-total" aria-live="polite">Total : 0,00 €</p>
      ${BOOKER_OBS_HTML}
      ${formActionsHtml(`submitBookingR1('${date}', this)`, 'Confirmer la réservation', 'closeBooking()')}
    </div>
    </div></div>
  `;
}
// Prix d'une réservation du restaurant 1 aux tarifs actuels (Paramètres)
function priceR1(nbEleve, nbProf, nbExt){ return nbEleve * Number(state.priceEleve) + nbProf * Number(state.priceProf) + nbExt * Number(state.priceExterieur); }
// Champs Élèves / Personnels / Extérieurs, communs à la réservation (préfixe 'bk') et à sa modification ('ebk')
const R1_COUNTS = [['nbEleve', 'Élèves', 'priceEleve'], ['nbProf', 'Personnels', 'priceProf'], ['nbExt', 'Extérieurs', 'priceExterieur']];
function countsFieldsetR1Html(prefix, max, values = {}, help = ''){
  return `<fieldset class="field-group">
      <legend>Nombre de personnes (${max} au maximum)</legend>
      ${help}
      <div class="row3">
        ${R1_COUNTS.map(([key, label, price]) => `<div class="field"><label>${label} · ${formatEuro(state[price])}</label><input type="number" min="0" id="${prefix}-${key}" value="${values[key] ?? ''}" placeholder="0" inputmode="numeric" oninput="updateR1PriceLive('${prefix}')"></div>`).join('')}
      </div>
    </fieldset>`;
}
function countsR1(prefix){
  const n = key => Math.max(0, parseInt(document.getElementById(prefix + '-' + key).value, 10) || 0);
  return { nbEleve: n('nbEleve'), nbProf: n('nbProf'), nbExt: n('nbExt') };
}
function updateR1PriceLive(prefix = 'bk'){
  const el = document.getElementById(prefix + '-r1-total');
  if(!el) return;
  const { nbEleve, nbProf, nbExt } = countsR1(prefix);
  el.textContent = plural(nbEleve + nbProf + nbExt, 'couvert') + ' · Total : ' + formatEuro(priceR1(nbEleve, nbProf, nbExt));
}
function bookingFormMultiHtml(date, items){
  const rows = items.map(item=>{
    const rem = remainingItem(item);
    if(rem <= 0) return `<div class="item-row"><span class="item-name">${escapeHtml(item.Nom)}</span><span class="item-stock">Épuisé</span></div>`;
    const qtyVal = multiBookingQty[item.ID] || '';
    return `<div class="item-row">
      <span class="item-name">${escapeHtml(item.Nom)}${item.Prix ? ' — ' + formatEuro(item.Prix) : ''}<span class="item-avail">${rem} disponible${rem > 1 ? 's' : ''}</span></span>
      <input type="number" class="qty-input" min="0" max="${rem}" value="${qtyVal}" placeholder="0" inputmode="numeric" aria-label="Quantité : ${escapeHtml(item.Nom)}" oninput="setMultiQty('${item.ID}', this.value); updateR2PriceLive()">
    </div>`;
  }).join('');
  return `
    <div class="booking-form${enterOnce('bk-' + date)}" data-form="bk-${date}">
      ${segGroup('Mode de service', [
        { key:'service-emporter', label:'À emporter', pressed: chosenServiceMode==='emporter', onclick:`setServiceMode('emporter')` },
        { key:'service-surplace', label:'Sur place', pressed: chosenServiceMode==='surplace', onclick:`setServiceMode('surplace')` }
      ], 'block mode-choice')}
      <fieldset class="field-group"><legend>Choisissez vos plats et quantités</legend>
      ${rows}
      </fieldset>
      <p id="bk-r2-total" class="form-total" aria-live="polite"></p>
      ${bookerFieldsHtml()}
      ${BOOKER_OBS_HTML}
      ${formActionsHtml(`submitBookingR2Multi('${date}', this)`, 'Confirmer la réservation', 'closeBooking()')}
    </div>
  `;
}
