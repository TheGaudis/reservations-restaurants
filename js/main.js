// Affichage de la page, démarrage, actualisation automatique.

// render() reconstruit la page : on mémorise avant ce qui a été tapé dans les champs et
// l'élément qui a le focus, puis on les rend après. Un formulaire enregistré avec succès
// est vidé explicitement (resetFields). Les champs de mot de passe ne sont jamais mémorisés.
let fieldsToReset = new Set();
function resetFields(...ids){ ids.forEach(id => fieldsToReset.add(id)); }
function focusKey(el){
  if(!el || el === document.body || !el.isConnected) return null;
  if(el.id) return '#' + CSS.escape(el.id);
  const box = el.closest('[id]');
  for(const attr of ['data-iso', 'data-nav', 'data-seg']){
    if(el.hasAttribute(attr)) return `${box ? '#' + CSS.escape(box.id) + ' ' : ''}[${attr}="${CSS.escape(el.getAttribute(attr))}"]`;
  }
  return null;
}
function captureUi(){
  const fields = {};
  document.querySelectorAll('.wrap input[id]:not([type="password"]), .wrap select[id], .wrap textarea[id]').forEach(el => { fields[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
  const active = document.activeElement;
  const region = active && active.closest ? active.closest('#detail-r1, #detail-r2, #admin-r1, #admin-r2, #settings') : null;
  return { fields, focus: focusKey(active), region: region && region.id };
}
function restoreUi(memo){
  for(const [id, value] of Object.entries(memo.fields)){
    const el = document.getElementById(id);
    if(!el || fieldsToReset.has(id)) continue;
    if(el.type === 'checkbox') el.checked = value;
    else if(el.value !== value) el.value = value;
  }
  fieldsToReset = new Set();
  updateR1PriceLive('bk');
  updateR1PriceLive('ebk');
  updateR1PriceLive('abk');
  document.querySelectorAll('.booking-form .check input[id$="-ticket"]').forEach(syncTicketPrice); // champ Prix d'un plat au ticket
  if(document.getElementById('bk-r2-total')) updateR2PriceLive();
  if(!memo.focus || document.activeElement !== document.body) return;
  let target = document.querySelector(memo.focus);
  // l'élément a disparu (réservation supprimée, formulaire fermé…) : on reste dans la même zone
  if(!target && memo.region){
    const region = document.getElementById(memo.region);
    target = region && (region.querySelector('.day-date') || region.querySelector('summary, button, input'));
    if(target && target.classList.contains('day-date')) target.tabIndex = -1;
  }
  if(target) target.focus({ preventScroll: true });
}
// Zones d'un restaurant qu'on peut réafficher seules (clé = id du conteneur)
const PARTS = {
  'admin-r1': renderAdminFormR1, 'admin-r2': renderAdminFormR2,
  'cal-r1': () => renderCalendar('r1', 'cal-r1', dayStatusR1), 'cal-r2': () => renderCalendar('r2', 'cal-r2', dayStatusR2),
  'detail-r1': renderDetailR1, 'detail-r2': renderDetailR2
};
// render() : toute la page (données, mode, formulaires…). render(['cal-r1', …]) : seulement ces
// zones, pour les actions fréquentes qui ne touchent qu'un restaurant (jour, semaine, mois).
function render(parts){
  const memo = captureUi();
  if(parts){
    new Set(parts).forEach(id => { PARTS[id](); linkLabels(document.getElementById(id)); });
  } else renderAll();
  restoreUi(memo);
}
// Tout ce qui dépend du jour sélectionné d'un restaurant : champ Date du formulaire collègue,
// calendrier et fiche. Plus la fiche où un formulaire ou un récapitulatif va se fermer.
function restParts(rest){
  const parts = ['admin-' + rest, 'cal-' + rest, 'detail-' + rest];
  [openBookingTarget, bookingConfirmation].forEach(t => { if(t) parts.push('detail-' + t.rest); });
  return parts;
}
function renderAll(){
  renderTexts(state);
  if(firstLoadDone){ saveTexts(state); saveCache(state); } // y compris après chaque enregistrement
  renderModeBox();
  renderPriceSuggestions();
  renderDashboard();
  renderSettings();
  showTomorrowSummary();
  Object.values(PARTS).forEach(fn => fn());
  linkLabels();
}

// Noms et descriptions mémorisés à la dernière visite : affichés avant la réponse de l'API.
try{ const saved = JSON.parse(localStorage.getItem(TEXTS_KEY) || 'null'); if(saved) Object.assign(state, saved); }catch(e){}
renderTexts(state, true);
renderModeBox();
// Calendrier et fiches de la dernière visite, affichés tout de suite en consultation seule
const cached = loadCache();
if(cached){ state = cached; dataStale = true; render(); }
loadAll();
// Actualisation toutes les 3 minutes. Les saisies et le focus sont conservés par render() ;
// on attend quand même si l'on est en train de taper, si un envoi est en cours (sinon le
// bouton occupé serait remplacé et recliquable) ou si l'onglet est caché (rattrapé au retour).
let refreshMissed = false;
function autoRefresh(){
  const active = document.activeElement;
  const busy = active && ['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName);
  const writing = !!document.querySelector('button[aria-busy="true"]') || loaderCount > 0;
  if(document.hidden || busy || writing || openBookingTarget !== null || datePicker.rest){ refreshMissed = document.hidden; return; }
  loadAll(true);
}
setInterval(autoRefresh, 180000);
// À 10 h pile, la fiche d'Aristide du jour passe en « commandes closes » sans attendre un rechargement
(function scheduleR2Cutoff(){
  const now = new Date(), next = new Date(now);
  next.setHours(R2_CUTOFF_HOUR, 0, 0, 0);
  if(next <= now) next.setDate(next.getDate() + 1);
  setTimeout(() => {
    if(openBookingTarget && openBookingTarget.rest === 'r2' && r2OrdersClosed(openBookingTarget.date)) openBookingTarget = null;
    render();
    scheduleR2Cutoff();
  }, next - now);
})();
(() => {
  const logo = document.querySelector('.brand-logo');
  if(!logo) return;
  let clicks = [];
  logo.addEventListener('click', () => {
    const now = Date.now();
    clicks = clicks.filter(t => now - t < 2000).concat(now);
    if(clicks.length >= 5){
      clicks = [];
      window.open('https://youtu.be/dQw4w9WgXcQ?list=RDdQw4w9WgXcQ', '_blank', 'noopener');
    }
  });
})();
document.addEventListener('visibilitychange', () => { if(!document.hidden && refreshMissed){ refreshMissed = false; autoRefresh(); } });
