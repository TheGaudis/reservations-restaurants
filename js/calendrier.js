// Calendriers et fiches du jour des deux restaurants.

function buildWeekCells(anchorISO){
  const mon = mondayOf(new Date(anchorISO+'T00:00:00'));
  const cells=[];
  for(let i=0;i<7;i++){ const d=new Date(mon); d.setDate(mon.getDate()+i); cells.push({iso:toISO(d), inMonth:true, dayNum:d.getDate()}); }
  return cells;
}
function buildMonthCells(anchorISO){
  const anchor = new Date(anchorISO+'T00:00:00');
  const year=anchor.getFullYear(), month=anchor.getMonth();
  const mon = mondayOf(new Date(year, month, 1));
  const cells=[];
  for(let i=0;i<42;i++){ const d=new Date(mon); d.setDate(mon.getDate()+i); cells.push({iso:toISO(d), inMonth: d.getMonth()===month, dayNum:d.getDate()}); }
  return cells;
}
function weekLabel(anchorISO){
  const mon = mondayOf(new Date(anchorISO+'T00:00:00'));
  const sun = new Date(mon); sun.setDate(mon.getDate()+6);
  return `${DAY_FMT.format(mon)} – ${DAY_MONTH_FMT.format(sun)} ${sun.getFullYear()}`;
}
function monthLabel(anchorISO){
  const s = MONTH_FMT.format(new Date(anchorISO+'T00:00:00'));
  return s.charAt(0).toUpperCase()+s.slice(1);
}
// Libellé affiché au-dessus du calendrier (semaine ou mois selon le mode)
const calLabel = (st, iso) => st.mode === 'week' ? weekLabel(iso) : monthLabel(iso);
// Transitions du calendrier (motifs Material 3), via les transitions de vue du navigateur :
//  - semaine / mois précédents ou suivants : axe partagé X (libellé et grille glissent ensemble) ;
//  - Semaine <-> Mois : axe partagé Z (zoom avant vers la semaine, arrière vers le mois).
// Sans prise en charge, ou si l'utilisateur réduit les animations : changement instantané
// (le libellé garde alors son ancien glissement d'entrée, st.slide).
const canViewTransition = () => !!document.startViewTransition && !reduceMotion.matches;
// (le focus sur ‹ ›, Semaine, Mois… est rendu par render() / restoreUi)
function calTransition(rest, anim, update){
  if(!canViewTransition()){ update(); return; }
  const root = document.documentElement;
  root.dataset.calAnim = anim; root.dataset.calRest = rest; // seul ce calendrier-là s'anime
  const vt = document.startViewTransition(update);
  vt.ready.catch(() => {}); // clics enchaînés : la transition précédente est abandonnée, ce n'est pas une erreur
  vt.finished.finally(() => { delete root.dataset.calAnim; delete root.dataset.calRest; });
}
// Seul le champ Date est réaffiché (sans render) : on rend le focus au bouton ‹ › qui l'avait
function keepFocus(update){
  const a = document.activeElement;
  const key = a && (a.dataset.nav ? `[data-nav="${a.dataset.nav}"]` : a.dataset.seg ? `[data-seg="${a.dataset.seg}"]` : null);
  update();
  const el = key && document.querySelector(key);
  if(el) el.focus({ preventScroll: true });
}
function setCalMode(rest, mode){
  if(calState[rest].mode === mode) return;
  calTransition(rest, mode === 'month' ? 'zoom-out' : 'zoom-in', () => {
    calState[rest].mode = mode; render(['cal-' + rest]); popSeg(`cal-${rest}-${mode}`);
  });
}
function navCal(rest, dir){
  const st = calState[rest];
  const d = new Date(st.anchor + 'T00:00:00');
  if(st.mode === 'week'){ d.setDate(d.getDate() + dir*7); }
  else { d.setDate(1); d.setMonth(d.getMonth() + dir); }
  calTransition(rest, dir > 0 ? 'next' : 'prev', () => {
    st.anchor = toISO(d);
    if(!canViewTransition()) st.slide = dir;
    render(['cal-' + rest]);
  });
}
function jumpToday(rest){
  const st = calState[rest], t = todayISO();
  const dir = calLabel(st, t) === calLabel(st, st.anchor) ? 0 : (t > st.anchor ? 1 : -1);
  const update = () => { if(dir && !canViewTransition()) st.slide = dir; st.anchor = t; st.selected = t; render(restParts(rest)); };
  if(dir) calTransition(rest, dir > 0 ? 'next' : 'prev', update); else update();
}
function selectDate(rest, iso){ const parts = restParts(rest); calState[rest].selected = iso; dateChoice[rest] = null; openBookingTarget = null; bookingConfirmation = null; render(parts); }

function renderCalendar(rest, containerId, statusFn){
  const cs = calState[rest];
  const cells = cs.mode==='week' ? buildWeekCells(cs.anchor) : buildMonthCells(cs.anchor);
  const today = todayISO();
  const label = calLabel(cs, cs.anchor);
  // Initiales pour l'œil ; les lecteurs d'écran entendent la date complète sur chaque case
  const weekdayHeader = WEEKDAY_INITIALS.map(l=>`<div class="wd-label" aria-hidden="true">${l}</div>`).join('');
  // Le jour sélectionné est le seul atteignable par Tab (s'il est affiché, sinon le 1er jour visible) ;
  // les flèches déplacent ensuite la sélection (voir calKey).
  const focusIso = cells.some(c => c.iso === cs.selected) ? cs.selected : cells[0].iso;
  const cellsHtml = cells.map(c=>{
    const status = statusFn(c.iso);
    const classes = ['cal-cell'];
    if(!c.inMonth) classes.push('cal-dim');
    if(c.iso < today) classes.push('cal-past');
    if(c.iso===today) classes.push('cal-today');
    if(c.iso===cs.selected) classes.push('cal-selected');
    const dotHtml = status ? `<span class="cal-dot dot-${status}" aria-hidden="true"></span>` : '';
    const label = formatDate(c.iso) + ', ' + (CAL_STATUS_WORD[status] || 'aucun service') + (c.iso < today ? ', passé' : '');
    return `<button type="button" class="${classes.join(' ')}" data-iso="${c.iso}" aria-label="${label}"`
      + ` aria-pressed="${c.iso===cs.selected}"${c.iso===today ? ' aria-current="date"' : ''} tabindex="${c.iso===focusIso ? 0 : -1}"`
      + ` onclick="pickDate('${rest}','${c.iso}',true)"><span class="cal-num" aria-hidden="true">${c.dayNum}</span>${dotHtml}</button>`;
  }).join('');
  // glissement du libellé uniquement juste après une navigation
  const slideClass = cs.slide > 0 ? 'axis-next' : cs.slide < 0 ? 'axis-prev' : '';
  cs.slide = 0;
  const unit = cs.mode==='week' ? 'Semaine' : 'Mois';
  document.getElementById(containerId).innerHTML = `
    <div class="cal-header">
      <button class="icon-btn tonal" data-nav="${rest}-prev" onclick="navCal('${rest}',-1)" aria-label="${unit} précédent${cs.mode==='week'?'e':''}">${CHEVRON_PREV}</button>
      <div class="cal-label" aria-live="polite"><span class="${slideClass}">${label}</span></div>
      <button class="icon-btn tonal" data-nav="${rest}-next" onclick="navCal('${rest}',1)" aria-label="${unit} suivant${cs.mode==='week'?'e':''}">${CHEVRON_NEXT}</button>
    </div>
    <div class="cal-toggle">
      ${segGroup('Affichage du calendrier', [
        { key:`cal-${rest}-week`, label:'Semaine', pressed: cs.mode==='week', onclick:`setCalMode('${rest}','week')` },
        { key:`cal-${rest}-month`, label:'Mois', pressed: cs.mode==='month', onclick:`setCalMode('${rest}','month')` }
      ], 'small')}
      <button class="btn ghost small" data-nav="${rest}-today" onclick="jumpToday('${rest}')">Aujourd'hui</button>
    </div>
    <div class="cal-grid" role="group" aria-label="Jours ${cs.mode==='week' ? 'de la semaine' : 'du mois'} — flèches pour changer de jour" onkeydown="calKey(event,'${rest}')">${weekdayHeader}${cellsHtml}</div>
  `;
}
// Disponibilité en toutes lettres (la pastille de couleur seule ne suffit pas)
const CAL_STATUS_WORD = { 'cap-ok':'places disponibles', 'cap-low':'bientôt complet', 'cap-full':'complet' };
// Clavier (modèle Material 3 / ARIA d'un sélecteur de date) :
// ← → un jour, ↑ ↓ une semaine, Début / Fin : lundi / dimanche, Page ↑ / ↓ : mois précédent / suivant.
// Jour visé par une touche depuis `iso` (calendrier et sélecteur de date), ou null
function keyTargetIso(key, iso){
  const d = new Date(iso + 'T00:00:00');
  const dow = (d.getDay() + 6) % 7; // lundi = 0
  const moves = { ArrowLeft:-1, ArrowRight:1, ArrowUp:-7, ArrowDown:7, Home:-dow, End:6-dow };
  if(key in moves) return addDaysISO(iso, moves[key]);
  if(key === 'PageUp' || key === 'PageDown'){ d.setMonth(d.getMonth() + (key === 'PageUp' ? -1 : 1)); return toISO(d); }
  return null;
}
function calKey(e, rest){
  const cell = e.target.closest('.cal-cell');
  if(!cell) return;
  const target = keyTargetIso(e.key, cell.dataset.iso);
  if(!target) return;
  e.preventDefault();
  const st = calState[rest];
  if(calLabel(st, target) !== calLabel(st, st.anchor)) st.anchor = target; // pas de glissement du libellé au clavier
  // au clavier on enchaîne vite : la fiche change sans animation d'entrée
  lastCard[rest] = cardKey(target);
  pickDate(rest, target);
}
// Sélection d'un jour (clic, Entrée, Espace ou flèches) : le calendrier est réaffiché,
// le focus est replacé sur la case choisie pour ne pas perdre sa place au clavier.
// Au clic (animate), la fiche du jour change selon l'axe partagé X de Material 3 : elle arrive
// du côté du jour choisi (plus tard : de la droite). Au clavier, pas d'animation.
function pickDate(rest, iso, animate = false){
  const from = calState[rest].selected;
  const update = () => {
    selectDate(rest, iso);
    const cell = document.querySelector(`#cal-${rest} .cal-cell[data-iso="${iso}"]`);
    if(cell) cell.focus({ preventScroll: true });
  };
  if(!animate || iso === from || !canViewTransition()){ update(); return; }
  lastCard[rest] = cardKey(iso); // la transition remplace l'animation d'entrée de la fiche
  calTransition(rest, iso > from ? 'day-next' : 'day-prev', update);
}

// Fiche d'un jour sans service, commune aux deux restaurants
function emptyDayCardHtml(rest, iso){
  const msg = isAdmin ? 'Aucun jour ouvert. Utilisez le formulaire « Ouvrir un jour » pour en créer un à cette date.' : 'Aucune réservation possible ce jour-là.';
  return `<div class="day-card${iso < todayISO() ? ' is-past' : ''}${cardEnter(rest, iso)}"><div class="day-date">${formatDate(iso)}</div><p class="empty">${msg}</p></div>`;
}
// Bloc « Thème du jour », « Menu du jour » ou « Note » d'une fiche
function menuBlockHtml(label, text){
  return `<div class="menu-block"><span class="kicker">${label}</span><div class="menu-text">${escapeHtml(text)}</div></div>`;
}
// Ligne d'une réservation (mode collègue) : nom, classe, quantité, prix, mode, contact, observation.
// Les champs vides sont omis, pour ne jamais afficher de tirets qui se suivent.
function bookingLine(b, qty, price, mode){
  const parts = [b.Nom ? `<b>${escapeHtml(b.Nom)}</b>` : '', escapeHtml(b.Classe), qty, price, mode, escapeHtml(b.Contact),
    b.Observation ? `<i>${escapeHtml(b.Observation)}</i>` : ''];
  return parts.filter(Boolean).join(' — ');
}
function renderDetailR1(){
  const iso = calState.r1.selected;
  const day = idx().r1Days.get(iso);
  const today = todayISO();
  const isPast = iso < today;
  const el = document.getElementById('detail-r1');
  if(!day){ el.innerHTML = emptyDayCardHtml('r1', iso); return; }
  const rem = remainingR1(day);
  const capClass = capacityClass(rem, day.Capacite);
  const bookingsForDay = state.r1Bookings.filter(b=>b.Date===day.Date);
  const isOpenForm = openBookingTarget && openBookingTarget.rest==='r1' && openBookingTarget.date===day.Date;
  let adminHtml='';
  if(isAdmin){
    const editDayForm = editDayR1Open === day.Date ? `
      <div class="booking-form${enterOnce('day-' + day.Date)}" data-form="day-${day.Date}">
        <div class="row2">
          <div class="field"><label>Nombre de couverts disponibles</label><input type="number" min="1" id="edd-cap" value="${day.Capacite}"></div>
          <div class="field"><label>Thème du jour (optionnel)</label><input type="text" id="edd-theme" value="${escapeHtml(day.Theme||'')}"></div>
        </div>
        <div class="field"><label>Menu du jour (optionnel)</label><input type="text" id="edd-menu" value="${escapeHtml(day.Menu||'')}"></div>
        ${formActionsHtml(`submitEditDayR1('${day.Date}', this)`, 'Enregistrer', 'closeEditDayR1()')}
      </div>` : '';
    adminHtml = `
      <div class="bookings-list">
        ${bookingsForDay.length===0 ? '<p class="empty compact">Aucune réservation.</p>' :
          bookingsForDay.map(b=>`<div class="booking-row"><span>${bookingLine(b, plural(Number(b.Qte), 'couvert'), b.PrixTotal ? formatEuro(b.PrixTotal) : '')}</span>${bookingActions('r1', b)}</div>${bookingEditForm('r1', b)}`).join('')}
      </div>
      <div class="day-actions">
        ${rem > 0 ? addBookingButtonHtml('r1', day.Date) : ''}
        <button class="btn small" onclick="openEditDayR1('${day.Date}')">Modifier ce jour</button>
        <button class="btn small" onclick="printDayR1('${day.Date}')">${ICONS.print} Imprimer la liste</button>
        <button class="btn danger small" onclick="deleteDayR1('${day.Date}', this)">Supprimer ce jour</button>
      </div>
      ${addBookingFormR1Html(day)}
      ${editDayForm}
    `;
  }
  el.innerHTML = `
    ${confirmationHtml('r1')}
    <div class="day-card${isPast ? ' is-past' : ''}${cardEnter('r1', iso)}">
      <div class="day-top">
        <div class="day-date">${formatDate(day.Date)}</div>
        <span class="capacity-pill ${capClass}" style="${gaugeStyle(rem, Number(day.Capacite))}">${rem} / ${day.Capacite} couverts</span>
      </div>
      ${day.Theme ? menuBlockHtml('Thème du jour', day.Theme) : ''}
      ${day.Menu ? menuBlockHtml('Menu du jour', day.Menu) : ''}
      ${isAdmin && day.OuvertPar ? `<p class="day-meta">Ouvert par ${escapeHtml(day.OuvertPar)}</p>` : ''}
      ${!isAdmin && !isOpenForm && rem>0 && !isPast ? reserveButtonHtml(`openBookingR1('${day.Date}')`) : ''}
      ${!isAdmin && isOpenForm ? bookingFormHtml(day.Date, rem) : ''}
      ${adminHtml}
    </div>
  `;
}

// Liste des plats d'Aristide. Pendant une commande, le formulaire reprend déjà chaque plat
// (prix, quantité disponible) : la liste se replie vers le haut au clic sur « Réserver »,
// puis se redéploie si l'on annule. Hors de ces deux moments, elle est simplement absente.
let menuAnim = null; // 'up' juste après « Réserver », 'down' juste après « Annuler »
function menuListHtml(itemsHtml, isMultiOpen){
  const anim = menuAnim; menuAnim = null;
  if(isMultiOpen && anim !== 'up') return '';
  const cls = isMultiOpen ? ' collapsing' : (anim === 'down' ? ' expanding' : '');
  return `<div class="menu-list${cls}"${isMultiOpen ? ' inert aria-hidden="true"' : ''}><div class="menu-list-inner">${itemsHtml}</div></div>`;
}
function renderDetailR2(){
  const iso = calState.r2.selected;
  const day = idx().r2Days.get(iso);
  const today = todayISO();
  const isPast = iso < today;
  const el = document.getElementById('detail-r2');
  if(!day){ el.innerHTML = emptyDayCardHtml('r2', iso); return; }
  const items = itemsR2(iso);
  const isClosed = r2OrdersClosed(iso);
  const isMultiOpen = !isClosed && openBookingTarget && openBookingTarget.rest==='r2' && openBookingTarget.date===iso;
  const anyAvailable = items.some(it => remainingItem(it) > 0);
  const closedNote = !isAdmin && !isPast && isClosed ? `<p class="note-warning closed-note">${escapeHtml(r2ClosedMsg())}</p>` : '';
  const itemsHtml = items.map(item=>{
    const rem = remainingItem(item);
    const capClass = capacityClass(rem, item.Stock);
    const bookingsForItem = state.r2Bookings.filter(b => b.ItemID===item.ID);
    let adminBookings = '';
    let adminItemActions = '';
    let editItemForm = '';
    if(isAdmin){
      adminItemActions = `<div class="item-actions">
        ${rem > 0 ? addBookingButtonHtml('r2', item.ID) : ''}
        <button class="btn small" onclick="openEditItem('${item.ID}')">Modifier ce plat</button>
        <button class="btn danger small" onclick="deleteItemR2('${item.ID}', this)">Supprimer ce plat</button>
      </div>`;
      if(editItemTarget === item.ID){
        editItemForm = itemFormHtml('ei-' + item.ID, 'eit', item, `submitEditItemR2('${item.ID}', this)`, 'Enregistrer', 'closeEditItem()');
      }
      adminBookings = `<div class="bookings-list">
        ${bookingsForItem.length===0 ? '<p class="empty compact">Aucune réservation.</p>' :
          bookingsForItem.map(b=>`<div class="booking-row"><span>${bookingLine(b, plural(Number(b.Qte), 'portion'), item.Prix ? formatEuro(item.Prix * b.Qte) : '', b.Mode==='emporter'?'à emporter':'sur place')}</span>${bookingActions('r2', b)}</div>${bookingEditForm('r2', b)}`).join('')}
      </div>`;
    }
    return `<div class="item-row stacked">
      <div class="item-row-head">
        <span class="item-name">${escapeHtml(item.Nom)}${item.Prix ? ' — ' + formatEuro(item.Prix) : ''}</span>
        <span class="capacity-pill ${capClass}" style="${gaugeStyle(rem, Number(item.Stock))}">${rem} / ${item.Stock}</span>
      </div>
      ${adminItemActions}
      ${isAdmin ? addBookingFormR2Html(item) : ''}
      ${editItemForm}
      ${adminBookings}
    </div>`;
  }).join('');
  const addItemHtml = isAdmin ? (
    addItemFormOpen === iso ?
      itemFormHtml('ai-' + iso, 'nit', null, `submitAddItemR2('${iso}', this)`, 'Ajouter ce plat', 'closeAddItemForm()') :
      `<div class="day-actions"><button class="btn small" onclick="openAddItemForm('${iso}')">+ Ajouter un plat à ce jour</button></div>`
  ) : '';
  el.innerHTML = `
    ${confirmationHtml('r2')}
    <div class="day-card${isPast ? ' is-past' : ''}${cardEnter('r2', iso)}">
      <div class="day-top"><div class="day-date">${formatDate(day.Date)}</div></div>
      ${day.Theme ? menuBlockHtml('Thème du jour', day.Theme) : ''}
      ${day.Note ? menuBlockHtml('Note', day.Note) : ''}
      ${isAdmin && day.OuvertPar ? `<p class="day-meta">Ouvert par ${escapeHtml(day.OuvertPar)}</p>` : ''}
      ${menuListHtml(itemsHtml, isMultiOpen)}
      ${addItemHtml}
      ${closedNote}
      ${!isAdmin && !isMultiOpen && anyAvailable && !isClosed ? reserveButtonHtml(`openBookingR2Day('${iso}')`) : ''}
      ${!isAdmin && isMultiOpen ? bookingFormMultiHtml(iso, items) : ''}
      ${isAdmin ? `<div class="day-actions"><button class="btn small" onclick="printDayR2('${day.Date}')">${ICONS.print} Imprimer la liste</button><button class="btn danger small" onclick="deleteDayR2('${day.Date}', this)">Supprimer ce jour</button></div>` : ''}
    </div>
  `;
}
