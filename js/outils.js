// Outils communs : dates, messages, montants, suppression en deux clics, erreurs des champs.

function toISO(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function todayISO(){ return toISO(new Date()); }
function addDaysISO(iso, n){ const d = new Date(iso+'T00:00:00'); d.setDate(d.getDate()+n); return toISO(d); }
function mondayOf(dateObj){ const day=dateObj.getDay(); const diff = day===0?-6:1-day; const d=new Date(dateObj); d.setDate(d.getDate()+diff); d.setHours(0,0,0,0); return d; }

let calState = {
  r1: { mode:'week', anchor: todayISO(), selected: todayISO() },
  r2: { mode:'week', anchor: todayISO(), selected: todayISO() }
};

function showToast(msg, isError){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(()=>{ t.className = 'toast'; }, 3500);
}
// Dates en toutes lettres : un seul formateur, et chaque date n'est calculée qu'une fois
// (le calendrier en demande plus d'une centaine à chaque réaffichage).
const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
const DAY_FMT = new Intl.DateTimeFormat('fr-FR', { day:'numeric' });
const DAY_MONTH_FMT = new Intl.DateTimeFormat('fr-FR', { day:'numeric', month:'short' });
const MONTH_FMT = new Intl.DateTimeFormat('fr-FR', { month:'long', year:'numeric' });
const dateCache = new Map();
function formatDate(iso){
  let s = dateCache.get(iso);
  if(s === undefined){
    const d = new Date(iso + 'T00:00:00');
    s = isNaN(d) ? String(iso) : DATE_FMT.format(d);
    dateCache.set(iso, s);
  }
  return s;
}
// Échappe aussi les guillemets : les valeurs vont dans du texte ET dans des attributs value="…"
const HTML_ESC = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
function escapeHtml(str){ return String(str ?? '').replace(/[&<>"']/g, c => HTML_ESC[c]); }
// Espace insécable avant « € » : le montant ne se coupe jamais sur deux lignes
function formatEuro(n){ return Number(n).toFixed(2).replace('.', ',') + ' €'; }
function gaugeStyle(rem, cap){
  const pct = cap > 0 ? Math.max(0, Math.min(100, rem / cap * 100)) : 0;
  return `--pct:${pct.toFixed(1)}%;`;
}
// Suppression en deux clics : le 1er clic arme le bouton, le 2e (dans les 4 s) confirme.
// Libellé visible court (« Confirmer ? ») et largeur figée : le bouton ne change pas de taille ;
// le détail de ce qui sera supprimé est donné aux lecteurs d'écran et en infobulle.
function confirmClick(btn, detail){
  if(!btn) return true;
  if(btn.dataset.armed === '1') return true;
  btn.dataset.armed = '1';
  btn.dataset.origLabel = btn.innerHTML;
  btn.style.minWidth = btn.offsetWidth + 'px';
  btn.classList.add('armed');
  btn.textContent = 'Confirmer ?';
  if(detail){ btn.setAttribute('aria-label', detail); btn.title = detail; }
  setTimeout(()=>{ if(btn.isConnected) disarm(btn); }, 4000);
  return false;
}

function disarm(btn){
  if(!btn || btn.dataset.armed !== '1') return;
  btn.dataset.armed = '';
  btn.classList.remove('armed');
  btn.style.minWidth = '';
  btn.removeAttribute('aria-label'); btn.removeAttribute('title');
  if(btn.dataset.origLabel) btn.innerHTML = btn.dataset.origLabel;
}

// Messages d'erreur affichés sous les champs concernés.
function clearFieldErrors(scope){
  (scope || document).querySelectorAll('.field-error').forEach(e => e.remove());
  (scope || document).querySelectorAll('.has-error').forEach(e => e.classList.remove('has-error'));
  (scope || document).querySelectorAll('[aria-invalid]').forEach(unmarkInvalid);
}
// Relie le message au champ pour les lecteurs d'écran, sans perdre
// un éventuel texte d'aide (.field-help) déjà relié au champ.
function markInvalid(input, msgId){
  input.setAttribute('aria-invalid', 'true');
  const help = input.dataset.help || '';
  input.setAttribute('aria-describedby', (msgId + ' ' + help).trim());
}
function unmarkInvalid(input){
  input.removeAttribute('aria-invalid');
  if(input.dataset.help) input.setAttribute('aria-describedby', input.dataset.help);
  else input.removeAttribute('aria-describedby');
}
// Chaque <label> d'un .field est relié à son champ (clic sur le libellé,
// nom annoncé par les lecteurs d'écran). Appelé après chaque render().
let fieldSeq = 0;
function linkLabels(root){
  (root || document).querySelectorAll('.field').forEach(f => {
    const label = f.querySelector(':scope > label');
    const ctrl = f.querySelector('input, select, textarea');
    if(!label || !ctrl) return;
    if(!ctrl.id) ctrl.id = 'champ-' + (++fieldSeq);
    label.htmlFor = ctrl.id;
    const help = f.querySelector(':scope > .field-help');
    if(help){
      if(!help.id) help.id = ctrl.id + '-aide';
      ctrl.dataset.help = help.id;
      if(!ctrl.hasAttribute('aria-invalid')) ctrl.setAttribute('aria-describedby', help.id);
    }
  });
}
// Champ email des deux formulaires de réservation (obligatoire, sert à envoyer la confirmation)
function contactFieldHtml(){
  return `<div class="field"><label>Adresse email</label><input type="email" id="bk-contact" placeholder="Ex. cyrille.ungerer@exemple.fr" autocomplete="email" inputmode="email" spellcheck="false"><p class="field-help">Pour vous envoyer la confirmation.</p></div>`;
}
// Message d'erreur du champ email, ou chaîne vide s'il est correct
function emailError(v){
  if(!v) return 'Indiquez votre adresse email.';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Vérifiez votre adresse email (ex. cyrille.ungerer@exemple.fr).';
}
function plural(n, word){ return n + ' ' + word + (n > 1 ? 's' : ''); }
// « — texte » à la suite d'un libellé, ou rien si le texte est vide (prix, montants).
// Espace insécable avant le tiret : il ne commence jamais une ligne.
const dash = (text, sep = ' — ') => text ? sep + text : '';
// Vérification d'un formulaire : rules = [[cible, estInvalide, message], …].
// Cible = id d'un champ (message sous le champ) ou élément de bloc (message juste après,
// ex. la rangée Élèves / Personnels / Extérieurs). Place ensuite le focus sur la première erreur.
function checkFields(btn, rules){
  const form = btn.closest('.booking-form, .add-day, .settings-body') || document;
  clearFieldErrors(form);
  rules.forEach(([target, invalid, msg]) => {
    if(invalid) typeof target === 'string' ? fieldError(target, msg) : blockError(target, msg);
  });
  if(form.querySelector('.field-error')){ focusFirstError(form); return false; }
  return true;
}
function fieldError(inputId, msg){
  const input = document.getElementById(inputId);
  if(!input) return;
  const holder = input.closest('.field') || input.closest('.item-row') || input.parentElement;
  holder.classList.add('has-error');
  const p = document.createElement('p');
  p.className = 'field-error';
  p.id = inputId + '-error';
  p.textContent = msg;
  holder.appendChild(p);
  markInvalid(input, p.id);
}
function blockError(el, msg){
  if(!el) return;
  el.classList.add('has-error');
  const p = document.createElement('p');
  p.className = 'field-error';
  p.textContent = msg;
  el.insertAdjacentElement('afterend', p);
  if(el.id && el.matches('input, select, textarea')){ p.id = el.id + '-error'; markInvalid(el, p.id); }
}
function focusFirstError(scope){
  const first = (scope || document).querySelector('.has-error input, .has-error select, .has-error .date-trigger');
  if(first) first.focus();
}
document.addEventListener('input', e => {
  const holder = e.target.closest && e.target.closest('.has-error');
  if(!holder) return;
  holder.classList.remove('has-error');
  holder.querySelectorAll('.field-error').forEach(x => x.remove());
  holder.querySelectorAll('[aria-invalid]').forEach(unmarkInvalid);
  if(holder.matches('[aria-invalid]')) unmarkInvalid(holder);
  const next = holder.nextElementSibling;
  if(next && next.classList.contains('field-error')) next.remove();
});
