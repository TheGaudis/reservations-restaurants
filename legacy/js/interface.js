// Éléments d'interface communs : récapitulatif, icônes, boutons segmentés, apparitions.

// Récapitulatif affiché après une réservation réussie.
let bookingConfirmation = null;
function closeConfirmation(){ bookingConfirmation = null; render(); }
function confirmationHtml(rest){
  const c = bookingConfirmation;
  if(!c || c.rest !== rest || c.date !== calState[rest].selected) return '';
  const lines = c.lines.map(l => `<li><span>${escapeHtml(l.label)}</span><b>${escapeHtml(l.value)}</b></li>`).join('');
  const enter = c.shown ? '' : ' enter'; // animée une seule fois, pas à chaque actualisation
  c.shown = true;
  return `<div class="panel card-top-accent confirm-card${c.warning ? ' has-warning' : ''}${enter}" role="status">
    <div class="confirm-head">
      <span class="confirm-check" aria-hidden="true">${ICONS.check}</span>
      <div><div class="confirm-title">Réservation enregistrée</div><div class="confirm-sub">${escapeHtml(formatDate(c.date))}</div></div>
    </div>
    ${c.warning ? `<p class="note-warning confirm-warning">${escapeHtml(c.warning)}</p>` : ''}
    <ul class="confirm-lines">${lines}</ul>
    ${c.total ? `<div class="confirm-total"><span>Total</span><b>${escapeHtml(c.total)}</b></div>` : ''}
    <p class="confirm-note">Pour annuler ou modifier, contactez ${escapeHtml(state.contactAnnulation || "l'établissement")}.</p>
    <button class="btn small" onclick="closeConfirmation()">Fermer</button>
  </div>`;
}

const ICON_ATTRS ='class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const ICONS = {
  print: `<svg ${ICON_ATTRS}><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>`,
  settings: `<svg ${ICON_ATTRS}><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>`,
  check: `<svg ${ICON_ATTRS}><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  eye: `<svg ${ICON_ATTRS}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`
};
// Prix déjà utilisés, proposés dans tous les champs Prix (un seul <datalist> dans la page)
function renderPriceSuggestions(){
  const prices = [...new Set(state.r2Items.filter(it => it.Prix !== '' && it.Prix != null).map(it => Number(it.Prix)))].sort((a,b) => a-b);
  document.getElementById('price-suggestions').innerHTML = prices.map(p => `<option value="${p}">`).join('');
}

// Sélecteur de mode (bouton segmenté M3). Le balisage est créé une seule fois
// puis seulement mis à jour, pour que les transitions puissent se jouer.
const SEG_CHECK = `<span class="seg-check" aria-hidden="true"><svg viewBox="0 -960 960 960"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg></span>`;
// items : [{ key, label, pressed, onclick, attrs? }] ; key sert à popSeg()
function segGroup(ariaLabel, items, cls=''){
  return `<div class="seg-group ${cls}" role="group" aria-label="${ariaLabel}">${items.map(it =>
    `<button type="button" class="seg-btn" data-seg="${it.key}" aria-pressed="${it.pressed}" onclick="${it.onclick}" ${it.attrs||''}>${SEG_CHECK}<span>${it.label}</span></button>`
  ).join('')}</div>`;
}
// Apparition / disparition des formulaires. Tout est réaffiché à chaque render() :
// on n'anime donc que ce qui vient d'être ouvert (clé posée juste avant le render)
// ou fermé, jamais un simple réaffichage.
let enterKey = null;
function enterOnce(key){
  if(enterKey !== key) return '';
  enterKey = null;
  return ' enter';
}
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function leaveThen(key, done){
  const el = key && document.querySelector(`[data-form="${key}"]`);
  if(!el || reduceMotion.matches){ done(); return; }
  if(el.classList.contains('leaving')) return; // double clic : une seule fermeture
  el.classList.add('leaving');
  // si la page a été réaffichée entre-temps (autre formulaire ouvert…), on n'applique plus cette fermeture
  setTimeout(() => { if(el.isConnected) done(); }, tokenMs('--dur-fast', 120));
}
// La fiche du jour n'entre en animation que lorsqu'on change de jour (ou de mode)
const lastCard = { r1:null, r2:null };
const cardKey = iso => iso + (isAdmin ? '·a' : '·c'); // la fiche change aussi au passage client / collègue
function cardEnter(rest, iso){
  const key = cardKey(iso);
  if(lastCard[rest] === key) return '';
  lastCard[rest] = key;
  return ' enter';
}
// Animation de sélection, seulement sur le segment qu'on vient de cliquer
function popSeg(key){
  const btn = document.querySelector(`[data-seg="${key}"]`);
  if(!btn) return;
  btn.classList.remove('seg-pop'); void btn.offsetWidth; btn.classList.add('seg-pop');
}
