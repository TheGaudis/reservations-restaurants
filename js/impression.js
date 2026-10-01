// Documents imprimés : listes du jour et résumés du lendemain.

// ---------- Documents imprimés (charte + Material 3) ----------
// Les fenêtres d'impression ne chargent pas design-system.css : on y recopie, au moment
// d'imprimer, la valeur actuelle des jetons de la charte (couleurs, polices, tailles).
// Rien n'est donc écrit en dur ici : si la charte change, les impressions suivent.
const PRINT_TOKENS = ['--ab-green','--ab-green-ink','--ab-green-deep','--ab-blue','--ab-blue-ink','--ab-magenta','--ab-magenta-ink',
  '--ab-gradient','--text','--text-muted','--border','--border-strong','--surface-alt','--font-display','--font-body',
  '--fw-medium','--fw-semibold','--tracking-caps','--radius-sm'];
// Couleur du restaurant : trait oblique (mark), filets (accent) et textes (ink, contraste AA)
const PRINT_ACCENTS = {
  r1:   { mark:'--ab-green',   accent:'--ab-green-ink',   ink:'--ab-green-deep' },
  r2:   { mark:'--ab-magenta', accent:'--ab-magenta',     ink:'--ab-magenta-ink' }
};
function printTokensCss(){
  const cs = getComputedStyle(document.documentElement);
  const vars = PRINT_TOKENS.map(t => `${t}:${cs.getPropertyValue(t).trim()};`).join('');
  const accents = Object.entries(PRINT_ACCENTS).map(([k, a]) =>
    `.pb-${k}{--p-mark:var(${a.mark});--p-accent:var(${a.accent});--p-ink:var(${a.ink});}`).join('');
  // la zone « Page x / y » ne voit pas les variables de la page : on lui donne directement les valeurs
  const boxFont = `font-family:${cs.getPropertyValue('--font-body').trim()};color:${cs.getPropertyValue('--text-muted').trim()};`;
  const pageBox = `@page{@bottom-left{${boxFont}}@bottom-right{${boxFont}}}`;
  return `:root{${vars}}${accents}${pageBox}`;
}
const PRINT_CSS = `
  /* A4 paysage : les tableaux (nom, classe, plats, contact…) ont la place de tenir sur une ligne */
  @page{size:A4 landscape;margin:12mm 14mm 14mm;
    @bottom-left{content:"Lycée professionnel Aristide Briand · Restaurants pédagogiques";font-size:7.5pt;}
    @bottom-right{content:"Page " counter(page) " / " counter(pages);font-size:8pt;}}
  /* à l'impression, le pied de page est dans la marge du bas (répété sur chaque page) */
  @media print{.pb-foot{display:none;}}
  *{box-sizing:border-box;}
  body{margin:0;font-family:var(--font-body);font-size:10pt;line-height:1.45;color:var(--text);-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  @media screen{body{max-width:269mm;margin:0 auto;padding:10mm 8mm;}}
  .pb-stripe{height:4px;background:var(--ab-gradient);margin-bottom:4mm;}
  .pb-head{display:flex;align-items:center;gap:5mm;padding-bottom:3mm;border-bottom:1px solid var(--border);}
  .pb-head img{height:13mm;width:auto;}
  .pb-school{font-size:7.5pt;font-weight:var(--fw-semibold);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--text-muted);line-height:1.5;}
  .pb-date{margin-left:auto;font-size:8pt;color:var(--text-muted);}
  h1,h2,h3{font-family:var(--font-display);font-weight:var(--fw-semibold);line-height:1.25;break-after:avoid;}
  h1{display:flex;align-items:center;gap:3mm;font-size:20pt;color:var(--p-ink);margin:5mm 0 1mm;}
  h1::before{content:"";flex:0 0 auto;width:1.6mm;height:.95em;transform:skewX(-22deg);border-radius:.5mm;background:var(--p-mark);}
  .pb-sub{margin:0 0 4mm;font-size:11pt;color:var(--text-muted);}
  .pb-sub::first-letter{text-transform:uppercase;}
  h2{display:flex;align-items:center;gap:2.5mm;font-size:13pt;color:var(--p-ink);margin:6mm 0 2mm;}
  h3{display:flex;justify-content:space-between;gap:4mm;font-size:10.5pt;color:var(--text);margin:5mm 0 1.5mm;}
  h3 span{font-family:var(--font-body);font-weight:var(--fw-medium);color:var(--text-muted);white-space:nowrap;}
  /* Informations du jour en colonnes côte à côte (le paysage offre la largeur) ; le menu, plus long, prend plus de place */
  .pb-meta{display:flex;flex-wrap:wrap;gap:2mm 8mm;margin:0 0 5mm;padding:3mm 4mm;border:1px solid var(--border);border-radius:var(--radius-sm);break-inside:avoid;}
  .pb-meta > div{flex:1 1 35mm;}
  .pb-meta > div.pb-wide{flex:3 1 90mm;}
  .pb-meta dt{font-size:7.5pt;font-weight:var(--fw-semibold);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--text-muted);margin-bottom:.8mm;}
  .pb-meta dd{margin:0;}
  /* Tableaux (M3 « data table ») : en-têtes en petites capitales, séparateurs fins, nombres à droite */
  table{width:100%;border-collapse:collapse;font-size:9.5pt;}
  thead{display:table-header-group;}
  th{text-align:left;font-size:7.5pt;font-weight:var(--fw-semibold);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--p-ink);padding:2mm 2.5mm;border-bottom:2px solid var(--p-accent);}
  td{padding:2mm 2.5mm;border-bottom:1px solid var(--border);vertical-align:top;}
  tr{break-inside:avoid;}
  .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}
  .center{text-align:center;font-variant-numeric:tabular-nums;}
  /* Tableau quadrillé (liste du restaurant 1) : une colonne par information, filets entre les cases */
  table.pb-grid{font-size:9pt;border:1px solid var(--border-strong);}
  .pb-grid th,.pb-grid td{padding:2mm;border:1px solid var(--border-strong);vertical-align:middle;}
  .pb-grid thead th{background:var(--surface-alt);border-bottom:2px solid var(--p-accent);}
  thead tr.pb-groups th{font-size:7pt;color:var(--text-muted);border-bottom:1px solid var(--border-strong);}
  /* largeur et style de chaque colonne (classe posée sur l'en-tête et les cases) */
  .pb-grid .pb-name,.pb-grid .pb-class,.pb-grid .pb-chef{width:30mm;}
  .pb-grid .pb-count{width:14mm;} .pb-grid .pb-big{width:18mm;} .pb-grid .pb-price{width:19mm;}
  .pb-grid .pb-contact{width:38mm;} .pb-grid .pb-table{width:16mm;}
  td.pb-name{font-weight:var(--fw-semibold);}
  td.pb-zero{color:var(--text-muted);}
  td.pb-big{font-family:var(--font-display);font-size:12pt;font-weight:var(--fw-semibold);color:var(--p-ink);}
  /* observation du client : case marquée pour être vue tout de suite ; lignes assez hautes pour écrire */
  td.pb-obs{font-weight:var(--fw-medium);background:var(--surface-alt);border-left:3px solid var(--p-accent);}
  td.pb-chef{height:11mm;}
  td.pb-empty{text-align:center;color:var(--text-muted);font-style:italic;}
  /* le total ne part jamais seul sur une page : il reste avec la fin du tableau */
  .pb-total{break-before:avoid;display:flex;justify-content:space-between;align-items:baseline;gap:6mm;margin:5mm 0 0;padding:3mm 4mm;background:var(--surface-alt);border-left:4px solid var(--p-accent);border-radius:var(--radius-sm);break-inside:avoid;}
  .pb-total span{font-size:7.5pt;font-weight:var(--fw-semibold);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--text-muted);}
  .pb-total b{font-family:var(--font-display);font-weight:var(--fw-semibold);font-size:12pt;font-variant-numeric:tabular-nums;}
  /* intitulé puis trait d'écriture à sa droite, sur la même ligne (gain de hauteur) */
  .pb-sign{display:grid;grid-template-columns:1fr 1fr;gap:10mm;margin-top:8mm;break-inside:avoid;}
  .pb-sign div{display:flex;align-items:flex-end;gap:3mm;white-space:nowrap;font-size:7.5pt;font-weight:var(--fw-semibold);letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--text-muted);}
  .pb-sign div::after{content:"";flex:1;height:8mm;border-bottom:1px solid var(--border-strong);}
  .pb-note{color:var(--text-muted);}
  .pb-foot{margin-top:10mm;padding-top:3mm;border-top:1px solid var(--border);font-size:7.5pt;color:var(--text-muted);text-align:center;}
`;
const PRINTED_ON_FMT = new Intl.DateTimeFormat('fr-FR', { day:'numeric', month:'long', year:'numeric' });
// Document complet : en-tête (bandeau, logo, date d'impression), titre à la couleur du restaurant, contenu, pied
function printDoc({ title, accent, heading, date, meta = [], body, total = '', signature = false }){
  const logo = document.querySelector('.brand-logo');
  const printedOn = PRINTED_ON_FMT.format(new Date());
  // chaque information dans son bloc (<div> autorisé dans <dl>) ; le menu, plus long, a une colonne large
  const metaHtml = meta.filter(m => m.value).map(m => `<div${m.label === 'Menu' ? ' class="pb-wide"' : ''}><dt>${m.label}</dt><dd>${m.value}</dd></div>`).join('');
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <style>${printTokensCss()}${PRINT_CSS}</style></head>
    <body class="pb-${accent}">
      <div class="pb-stripe"></div>
      <div class="pb-head">${logo ? `<img src="${logo.src}" alt="Lycée Aristide Briand">` : ''}
        <div class="pb-school">Lycée professionnel Aristide Briand<br>Restaurants pédagogiques</div>
        <div class="pb-date">Imprimé le ${printedOn}</div></div>
      <h1>${heading}</h1>
      <p class="pb-sub">${date}</p>
      ${metaHtml ? `<dl class="pb-meta">${metaHtml}</dl>` : ''}
      ${body}
      ${total}
      ${signature ? '<div class="pb-sign"><div>Nom du responsable</div><div>Signature</div></div>' : ''}
      <div class="pb-foot">Lycée professionnel Aristide Briand · Restaurants pédagogiques</div>
    </body></html>`;
}
// Tableau : cols = [{ label, num?, center?, cls? }] (cls posée sur l'en-tête et toutes les cases de la colonne),
// rows = tableaux de cellules (HTML, ou { html, cls } pour une classe propre à la case) ; message si vide.
// Options : cls (classe du tableau), groups = [{ label, span, center? }] pour une ligne d'en-têtes de groupe.
function printTable(cols, rows, emptyMsg, { cls, groups } = {}){
  const attr = (...names) => { const c = names.filter(Boolean).join(' '); return c ? ` class="${c}"` : ''; };
  const colAttr = cols.map(c => [c.num ? 'num' : c.center ? 'center' : '', c.cls]);
  const groupRow = groups ? `<tr class="pb-groups">${groups.map(g => `<th colspan="${g.span}"${attr(g.center && 'center')}>${g.label}</th>`).join('')}</tr>` : '';
  const head = cols.map((c, i) => `<th${attr(...colAttr[i])}>${c.label}</th>`).join('');
  const cell = (v, i) => { const o = v && typeof v === 'object' ? v : { html: v }; return `<td${attr(...colAttr[i], o.cls)}>${o.html}</td>`; };
  const body = rows.length === 0
    ? `<tr><td class="pb-empty" colspan="${cols.length}">${emptyMsg}</td></tr>`
    : rows.map(r => '<tr>' + r.map(cell).join('') + '</tr>').join('');
  return `<table${attr(cls)}><thead>${groupRow}<tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
function printTotal(label, value){ return `<div class="pb-total"><span>${label}</span><b>${value}</b></div>`; }
// Ouvre la fenêtre et lance l'impression une fois les polices de la charte chargées
function openPrint(html){
  const w = window.open('', '_blank');
  if(!w){ showToast('Autorisez les fenêtres de ce site pour imprimer.', true); return; }
  w.document.write(html); w.document.close(); w.focus();
  const ready = w.document.fonts ? w.document.fonts.ready : Promise.resolve();
  Promise.race([ready, new Promise(r => setTimeout(r, 2000))]).then(() => setTimeout(() => w.print(), 100));
}

// Liste du restaurant 1 pour un jour (« Imprimer la liste ») : tableau quadrillé, une colonne par
// information, observation du client et deux colonnes vides à remplir en salle (N° table, Chef de rang).
// Version courte pour le résumé « demain » : sans Thème, Menu, détail, Contact, Observation ni signature.
function printDayR1(date, tomorrow = false){
  const day = idx().r1Days.get(date);
  const bookings = state.r1Bookings.filter(b=>b.Date===date);
  const total = sumBy(bookings, 'Qte');
  const totalPrix = sumBy(bookings, 'PrixTotal');
  const prix = b => b.PrixTotal ? formatEuro(b.PrixTotal) : '';
  const count = v => Number(v) || { html:'–', cls:'pb-zero' };
  const table = tomorrow
    ? printTable([{label:'Nom'},{label:'Classe'},{label:'Couverts',num:true},{label:'Prix',num:true}],
        bookings.map(b=>[escapeHtml(b.Nom), escapeHtml(b.Classe), Number(b.Qte), prix(b)]),
        'Aucune réservation.')
    : printTable([
        {label:'Nom', cls:'pb-name'}, {label:'Classe ou service', cls:'pb-class'},
        {label:'Élèves', center:true, cls:'pb-count'}, {label:'Pers.', center:true, cls:'pb-count'}, {label:'Ext.', center:true, cls:'pb-count'},
        {label:'Couverts', center:true, cls:'pb-big'}, {label:'Prix', num:true, cls:'pb-price'},
        {label:'Contact', cls:'pb-contact'}, {label:'Observation'},
        {label:'N° table', center:true, cls:'pb-table'}, {label:'Chef de rang', center:true, cls:'pb-chef'}],
        bookings.map(b=>[
          escapeHtml(b.Nom), escapeHtml(b.Classe),
          count(b.NbEleve), count(b.NbProf), count(b.NbExt),
          Number(b.Qte), prix(b), escapeHtml(b.Contact),
          b.Observation ? { html: escapeHtml(b.Observation), cls:'pb-obs' } : '',
          '', '']),
        'Aucune réservation.',
        { cls:'pb-grid', groups:[{label:'Client', span:2}, {label:'Réservation', span:5, center:true},
          {label:'Informations', span:2}, {label:'À remplir en salle', span:2, center:true}] });
  // détail du total (liste complète) : élèves, personnels, extérieurs ; omis si d'anciennes
  // réservations sans détail empêchent qu'il retombe sur le total
  const e = sumBy(bookings, 'NbEleve'), p = sumBy(bookings, 'NbProf'), x = sumBy(bookings, 'NbExt');
  const detail = !tomorrow && total > 0 && e + p + x === total
    ? ' · ' + [[e,'élève'], [p,'personnel'], [x,'extérieur']].filter(([n]) => n).map(([n, word]) => plural(n, word)).join(', ') : '';
  const meta = !day ? [] : [
    ...(tomorrow ? [] : [
      { label:'Thème', value: day.Theme ? escapeHtml(day.Theme) : '' },
      { label:'Menu', value: day.Menu ? escapeHtml(day.Menu) : '' }]),
    { label:'Ouvert par', value: day.OuvertPar ? escapeHtml(day.OuvertPar) : 'Non renseigné' },
    { label:'Places', value: `${total} / ${day.Capacite} couverts réservés` }
  ];
  openPrint(printDoc({
    title: `${escapeHtml(state.name1)} — ${tomorrow ? 'demain ' : ''}${formatDate(date)}`, accent:'r1',
    heading: escapeHtml(state.name1), date: (tomorrow ? 'Demain, ' : '') + formatDate(date),
    meta,
    body: day ? table : '<p class="pb-note">Aucun jour ouvert pour demain.</p>',
    total: day ? printTotal('Total', plural(total, 'couvert') + detail + (totalPrix > 0 ? ' · ' + formatEuro(totalPrix) : '')) : '',
    signature: !tomorrow
  }));
}
function printDayR2(date){
  const day = state.r2Days.find(d=>d.Date===date);
  const items = state.r2Items.filter(it=>it.Date===date);
  const itemById = {};
  items.forEach(it=>{ itemById[it.ID] = it; });
  const bookings = state.r2Bookings.filter(b=>itemById[b.ItemID]);

  // Regroupement des plats par client (même nom + classe + contact)
  const clients = [];
  const byKey = {};
  const norm = v => (v===null || v===undefined ? '' : String(v)).trim();
  bookings.forEach(b=>{
    const key = [norm(b.Nom).toLowerCase(), norm(b.Classe).toLowerCase(), norm(b.Contact).toLowerCase()].join('|');
    let c = byKey[key];
    if(!c){
      c = byKey[key] = { Nom:b.Nom, Classe:b.Classe, Contact:b.Contact, lignes:[], qte:0, modes:{} };
      clients.push(c);
    }
    const item = itemById[b.ItemID];
    const qte = Number(b.Qte);
    c.lignes.push({ nom:item.Nom, item, qte, obs:b.Observation }); // montants : r2Amounts(c.lignes)
    c.qte += qte;
    c.modes[b.Mode==='emporter'?'À emporter':'Sur place'] = true;
  });
  clients.sort((a,b)=> String(a.Classe||'').localeCompare(String(b.Classe||'')) || String(a.Nom||'').localeCompare(String(b.Nom||'')));

  const grandTotal = amountsText(r2Amounts(clients.flatMap(c => c.lignes)));
  const totalPortions = sumBy(clients, 'qte');

  // En gras : quantité de chaque plat, commentaire du client et mode (à emporter / sur place)
  const clientTable = printTable(
    [{label:'Nom'},{label:'Classe'},{label:'Plats'},{label:'Portions',num:true},{label:'Prix',num:true},{label:'Mode'},{label:'Contact'}],
    clients.map(c=>[
      escapeHtml(c.Nom), escapeHtml(c.Classe),
      c.lignes.map(l=>`<b>${l.qte}×</b> ${escapeHtml(l.nom)}${dash(itemAmountText(l.item, l.qte))}${l.obs ? '<br><b><i>' + escapeHtml(l.obs) + '</i></b>' : ''}`).join('<br>'),
      c.qte, amountsText(r2Amounts(c.lignes)), '<b>' + Object.keys(c.modes).join(' + ') + '</b>', escapeHtml(c.Contact)
    ]),
    'Aucune réservation.');
  const recapTable = printTable(
    [{label:'Plat'},{label:'Prix unitaire',num:true},{label:'Portions',num:true},{label:'Montant',num:true}],
    items.map(item=>{
      const total = sumBy(bookings.filter(b=>b.ItemID===item.ID), 'Qte');
      return [escapeHtml(item.Nom), itemPriceText(item), `${total} / ${item.Stock}`, itemAmountText(item, total)];
    }),
    'Aucun plat.');

  openPrint(printDoc({
    title: `${escapeHtml(state.name2)} — ${formatDate(date)}`, accent:'r2',
    heading: escapeHtml(state.name2), date: formatDate(date),
    meta: [
      { label:'Thème', value: day && day.Theme ? escapeHtml(day.Theme) : '' },
      { label:'Note', value: day && day.Note ? escapeHtml(day.Note) : '' },
      { label:'Ouvert par', value: day && day.OuvertPar ? escapeHtml(day.OuvertPar) : 'Non renseigné' }
    ],
    body: `<h2>Par client (${clients.length})</h2>${clientTable}<h2>Récapitulatif par plat</h2>${recapTable}`,
    total: printTotal('Total du jour', plural(clients.length, 'client') + ' · ' + plural(totalPortions, 'portion') + dash(grandTotal, ' · ')),
    signature: true
  }));
}
// Date locale (toISOString donnerait la date UTC : « demain » = aujourd'hui entre minuit et 2 h)
function getTomorrowISO(){ return addDaysISO(todayISO(), 1); }

function showTomorrowSummary(){
  const summaryEl = document.getElementById('summary-tomorrow');
  if(!isAdmin){ summaryEl.innerHTML = ''; return; }
  const tomorrow = getTomorrowISO();
  const r1Day = state.r1Days.find(d => d.Date === tomorrow);
  const r2Day = state.r2Days.find(d => d.Date === tomorrow);
  const r1Bookings = state.r1Bookings.filter(b => b.Date === tomorrow);
  const r2Items = state.r2Items.filter(it => it.Date === tomorrow);
  const r2Bookings = state.r2Bookings.filter(b => b.Date === tomorrow);
  
  let html = `<div class="panel card-top-accent summary-panel">
    <div class="summary-title">Résumé pour demain (${formatDate(tomorrow)})</div>`;
  
  if (!r1Day && !r2Day) {
    html += '<p class="text-muted">Aucun jour ouvert pour demain.</p>';
  } else {
    if (r1Day) {
      const totalCouverts = sumBy(r1Bookings, 'Qte');
      const totalPrixR1 = sumBy(r1Bookings, 'PrixTotal');
      const collegueR1 = r1Day.OuvertPar ? escapeHtml(r1Day.OuvertPar) : '(aucun)';
      html += `<div class="summary-block">
        <div class="summary-head">
          <b class="summary-name accent-green">${escapeHtml(state.name1)}</b>
          <button class="icon-btn summary-print" onclick="printTomorrowSummaryR1()" title="Imprimer" aria-label="Imprimer">${ICONS.print}</button>
        </div>
        <div class="summary-meta">Ouvert par ${collegueR1}</div>
        <span class="text-muted">Réservés : ${totalCouverts} / ${r1Day.Capacite} couverts${totalPrixR1 > 0 ? ' — ' + formatEuro(totalPrixR1) : ''}</span>`;
      if (r1Bookings.length > 0) {
        html += '<br><span class="summary-meta">Clients : ' + 
          r1Bookings.map(b => escapeHtml(b.Nom) + ' (' + escapeHtml(b.Classe) + ')').join(', ') + '</span>';
      }
      html += '</div>';
    }
    if (r2Day) {
      const collegueR2 = r2Day.OuvertPar ? escapeHtml(r2Day.OuvertPar) : '(aucun)';
      const linesR2 = []; // { item, qte } par plat, pour le total (r2Amounts)
      html += `<div class="summary-block">
        <div class="summary-head">
          <b class="summary-name accent-magenta">${escapeHtml(state.name2)}</b>
          <button class="icon-btn summary-print" onclick="printTomorrowSummaryR2()" title="Imprimer" aria-label="Imprimer">${ICONS.print}</button>
        </div>
        <div class="summary-meta">Ouvert par ${collegueR2}</div>`;
      if (r2Items.length > 0) {
        html += '<br>';
        r2Items.forEach(item => {
          const bookings = r2Bookings.filter(b => b.ItemID === item.ID);
          const total = sumBy(bookings, 'Qte');
          linesR2.push({ item, qte: total });
          if (total > 0 || bookings.length > 0) {
            html += `<span class="summary-line">
              • ${escapeHtml(item.Nom)}: ${total} portion(s)${dash(itemAmountText(item, total))}${bookings.length > 0 ? ' (' + bookings.map(b => escapeHtml(b.Nom)).join(', ') + ')' : ''}
            </span>`;
          }
        });
        const sumR2 = r2Amounts(linesR2), amountsR2 = amountsText(sumR2);
        if (amountsR2) {
          html += `<span class="summary-line summary-total">Total ${escapeHtml(state.name2)}${sumR2.gap ? ' (hors plats sans prix)' : ''} : ${amountsR2}</span>`;
        }
      } else {
        html += '<br><span class="summary-meta">Aucun plat ouvert.</span>';
      }
      html += '</div>';
    }
  }
  html += '</div>';
  
  if (summaryEl) summaryEl.innerHTML = html;
}

// Résumés « demain » (bouton imprimer du résumé) : un document par restaurant
function printTomorrowSummaryR1(){ printDayR1(getTomorrowISO(), true); }

function printTomorrowSummaryR2(){
  const tomorrow = getTomorrowISO();
  const day = state.r2Days.find(d => d.Date === tomorrow);
  const items = state.r2Items.filter(it => it.Date === tomorrow);
  const bookings = state.r2Bookings.filter(b => b.Date === tomorrow);
  let body = '', totalPortions = 0;
  const lines = []; // { item, qte } par plat, pour le total (r2Amounts)
  if(!day) body = '<p class="pb-note">Aucun jour ouvert pour demain.</p>';
  else if(items.length === 0) body = '<p class="pb-note">Aucun plat ouvert.</p>';
  else items.forEach(item => {
    const bk = bookings.filter(b => b.ItemID === item.ID);
    const total = sumBy(bk, 'Qte');
    totalPortions += total;
    lines.push({ item, qte: total });
    body += `<h3>${escapeHtml(item.Nom)}${dash(itemPriceText(item))}${!isTicket(item) && item.Prix ? ' l\'unité' : ''}<span>${total} / ${item.Stock}</span></h3>`
      + printTable([{label:'Nom'},{label:'Classe'},{label:'Portions',num:true},{label:'Prix',num:true}],
          bk.map(b => [escapeHtml(b.Nom), escapeHtml(b.Classe), Number(b.Qte), itemAmountText(item, Number(b.Qte))]),
          'Aucune réservation.');
  });
  openPrint(printDoc({
    title: `${escapeHtml(state.name2)} — demain ${formatDate(tomorrow)}`, accent:'r2',
    heading: escapeHtml(state.name2), date: 'Demain, ' + formatDate(tomorrow),
    meta: day ? [{ label:'Ouvert par', value: day.OuvertPar ? escapeHtml(day.OuvertPar) : 'Non renseigné' }] : [],
    body,
    total: day && items.length ? printTotal('Total', plural(totalPortions, 'portion') + dash(amountsText(r2Amounts(lines)), ' · ')) : ''
  }));
}
