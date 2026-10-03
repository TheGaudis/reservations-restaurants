# 07 — Documents imprimés

Sources : `js/impression.js` (intégralité). Dépendances : `state` (`r1Days`, `r1Bookings`, `r2Days`, `r2Items`, `r2Bookings`, `name1`, `name2`), `idx()`, `sumBy`, `itemPriceText`, `itemAmountText`, `r2Amounts`, `amountsText`, `isTicket` (`js/donnees.js`), `formatDate`, `formatEuro`, `plural`, `dash`, `escapeHtml`, `addDaysISO`, `todayISO`, `showToast` (`js/outils.js`), `ICONS.print` (`js/interface.js`). Les impressions ne sont accessibles **qu'en mode collègue** (elles utilisent les réservations nominatives de l'état complet).

---

## 1. Liste des documents

| Document | Déclencheur (mode collègue) | Fonction | Thème |
| --- | --- | --- | --- |
| A. Liste du jour — restaurant 1 | bouton « Imprimer la liste » (icône SVG `ICONS.print`, pas d'emoji) de la fiche R1 (tout jour ouvert, passé ou futur) | `printDayR1(date)` | vert (`r1`) |
| B. Liste du jour — restaurant 2 | bouton « Imprimer la liste » (icône `ICONS.print`) de la fiche R2 | `printDayR2(date)` | magenta (`r2`) |
| C. Résumé du lendemain — restaurant 1 | icône « Imprimer » du bloc R1 dans « Résumé pour demain » | `printTomorrowSummaryR1()` = `printDayR1(demain, true)` | vert |
| D. Résumé du lendemain — restaurant 2 | icône « Imprimer » du bloc R2 dans « Résumé pour demain » | `printTomorrowSummaryR2()` | magenta |

« Demain » = `addDaysISO(todayISO(), 1)` en **date locale** (`getTomorrowISO`).

---

## 2. Gabarit commun (`printDoc`)

### 2.1 Format

- **A4 paysage**, marges 12 mm (haut) / 14 mm (côtés) / 14 mm (bas) : `@page{size:A4 landscape;margin:12mm 14mm 14mm}`.
- Corps : police `--font-body` (Work Sans), 10 pt, interligne 1,45, couleur `--text` ; couleurs de fond imprimées (`print-color-adjust:exact`).
- À l'écran (avant/après impression) : corps centré, largeur max 269 mm, marges 10 mm × 8 mm.

### 2.2 Structure, de haut en bas

| Bloc | Contenu exact | Style |
| --- | --- | --- |
| Bandeau | barre de 4 px au dégradé tricolore `--ab-gradient` | marge basse 4 mm |
| En-tête `.pb-head` | logo (copie de `src` du logo de la page, hauteur 13 mm, `alt="Lycée Aristide Briand"`) · « Lycée professionnel Aristide Briand » / « Restaurants pédagogiques » (deux lignes) · à droite « Imprimé le {date} » | école : 7,5 pt, 600, capitales, `--text-muted` ; date : 8 pt ; filet bas 1 px `--border` |
| Titre `h1` | nom du restaurant (`name1` ou `name2`), précédé d'un trait oblique de couleur (`--p-mark`, 1,6 mm, incliné −22°) | Outfit 600, 20 pt, couleur `--p-ink` |
| Sous-titre `.pb-sub` | date (voir chaque document), première lettre en majuscule (CSS) | 11 pt, `--text-muted` |
| Informations `.pb-meta` (`<dl>`) | une colonne par information **non vide** : intitulé (`dt`) + valeur (`dd`) ; la colonne « Menu » est plus large (`pb-wide`) | cadre 1 px `--border`, rayon `--radius-sm` ; intitulés 7,5 pt capitales |
| Corps | tableau(x) ou message | voir chaque document |
| Total `.pb-total` | intitulé à gauche (capitales 7,5 pt) + valeur à droite (Outfit 600, 12 pt) | fond `--surface-alt`, filet gauche 4 px `--p-accent` ; ne part jamais seul sur une page |
| Signature `.pb-sign` (si demandée) | deux intitulés côte à côte « Nom du responsable » et « Signature », chacun suivi sur la même ligne d'un trait d'écriture (hauteur 8 mm, filet bas 1 px `--border-strong`) | capitales 7,5 pt `--text-muted` ; marge haute 8 mm |
| Pied `.pb-foot` (écran seulement) | « Lycée professionnel Aristide Briand · Restaurants pédagogiques » | masqué à l'impression (`@media print`) |

**Pied de page imprimé** (répété sur chaque page, dans la marge basse, via les boîtes de marge `@page`) :
- en bas à gauche : « Lycée professionnel Aristide Briand · Restaurants pédagogiques » (7,5 pt) ;
- en bas à droite : « Page {n} / {total} » (8 pt) ;
- police `--font-body`, couleur `--text-muted` (valeurs recopiées en dur dans la règle `@page`, car les boîtes de marge ne voient pas les variables).

Date d'impression : `Intl.DateTimeFormat('fr-FR', {day:'numeric', month:'long', year:'numeric'})`, ex. « Imprimé le 3 octobre 2026 ».

Titre de la fenêtre (`<title>`, sert de nom de fichier PDF proposé) : voir chaque document.

### 2.3 Couleurs par restaurant (`PRINT_ACCENTS`, classe `pb-r1` / `pb-r2` sur `<body>`)

| Variable | Rôle | R1 | R2 |
| --- | --- | --- | --- |
| `--p-mark` | trait oblique du titre | `--ab-green` #A9C23F | `--ab-magenta` #A3237F |
| `--p-accent` | filets (bas des en-têtes de tableau, bord du total, observation) | `--ab-green-ink` #4E6614 | `--ab-magenta` #A3237F |
| `--p-ink` | textes colorés (titres, en-têtes, couverts) | `--ab-green-deep` #3B4F0D | `--ab-magenta-ink` #86196A |

### 2.4 Tableaux (`printTable`)

- Largeur 100 %, 9,5 pt, bordures fusionnées ; en-tête répété sur chaque page (`thead{display:table-header-group}`) ; une ligne n'est jamais coupée (`tr{break-inside:avoid}`).
- En-têtes `th` : 7,5 pt, 600, capitales, interlettrage `--tracking-caps`, couleur `--p-ink`, filet bas 2 px `--p-accent`, aligné à gauche.
- Cases `td` : padding 2 mm × 2,5 mm, filet bas 1 px `--border`, alignement haut.
- Colonnes numériques (`num`) : alignées à droite, chiffres tabulaires, sans retour à la ligne. Colonnes `center` : centrées, chiffres tabulaires.
- Tableau vide : une seule ligne, case fusionnée, texte centré italique `--text-muted` (message propre à chaque tableau).
- Variante **quadrillée** `.pb-grid` (document A) : 9 pt, toutes les cases encadrées (1 px `--border-strong`), alignement vertical centré, en-têtes sur fond `--surface-alt`, ligne d'**en-têtes de groupe** (7 pt, `--text-muted`) au-dessus.

---

## 3. Document A — Liste du jour, restaurant 1 (`printDayR1(date)`)

- `<title>` : « {name1} — {date en toutes lettres} » (ex. « Restaurant Pédagogique — vendredi 9 octobre 2026 »).
- `h1` : `name1`. Sous-titre : date en toutes lettres (« Vendredi 9 octobre 2026 » après capitalisation CSS).
- Informations (dans cet ordre, omises si vides) :
  1. **Thème** : `day.Theme` ;
  2. **Menu** : `day.Menu` (colonne large) ;
  3. **Ouvert par** : `day.OuvertPar` ou « Non renseigné » ;
  4. **Places** : « {total} / {Capacite} couverts réservés ».
- Corps : tableau quadrillé. Ordre des lignes : **ordre d'enregistrement** (ordre de `state.r1Bookings`, aucun tri).

| Groupe | Colonne | Contenu | Alignement / largeur |
| --- | --- | --- | --- |
| **Client** (2) | Nom | `Nom` (gras 600) | 30 mm |
| | Classe ou service | `Classe` | 30 mm |
| **Réservation** (5, groupe centré) | Élèves | `NbEleve`, ou « – » grisé si 0/vide | centré, 14 mm |
| | Pers. | `NbProf`, ou « – » grisé | centré, 14 mm |
| | Ext. | `NbExt`, ou « – » grisé | centré, 14 mm |
| | Couverts | `Qte` (Outfit 600, 12 pt, `--p-ink`) | centré, 18 mm |
| | Prix | `formatEuro(PrixTotal)` ou vide | droite, 19 mm |
| **Informations** (2) | Contact | `Contact` | 38 mm |
| | Observation | `Observation` ; case non vide marquée : texte 500, fond `--surface-alt`, filet gauche 3 px `--p-accent` | largeur restante |
| **À remplir en salle** (2, groupe centré) | N° table | vide | centré, 16 mm |
| | Chef de rang | vide ; hauteur de ligne 11 mm pour pouvoir écrire | centré, 30 mm |

- Tableau vide : « Aucune réservation. »
- **Total** : intitulé « Total », valeur = `{n couvert(s)}` + détail + prix :
  - détail « ` · {e élève(s)}, {p personnel(s)}, {x extérieur(s)}` » (parties nulles omises), **seulement si** total > 0 et `élèves + personnels + extérieurs = total` (sinon omis, cas d'anciennes réservations sans détail) ;
  - « ` · {somme des PrixTotal}` » si la somme > 0.
  - Exemple : « 12 couverts · 8 élèves, 3 personnels, 1 extérieur · 67,80 € ».
- **Signature** : oui (« Nom du responsable » / « Signature »).

## 4. Document B — Liste du jour, restaurant 2 (`printDayR2(date)`)

- `<title>` : « {name2} — {date} ». `h1` : `name2`. Sous-titre : date.
- Informations : **Thème** (`day.Theme`), **Note** (`day.Note`), **Ouvert par** (`day.OuvertPar` ou « Non renseigné »).
- Réservations prises en compte : toutes celles dont le plat (`ItemID`) appartient aux plats du jour.

### 4.1 Regroupement par client

- Clé de regroupement : `Nom` + `Classe` + `Contact`, chacun `trim()` et en minuscules.
- Pour chaque client : lignes `{ plat, quantité, observation }` dans l'ordre des réservations, total de portions, ensemble des modes (« À emporter » si `Mode === 'emporter'`, sinon « Sur place »).
- **Tri** : par `Classe` puis par `Nom` (`localeCompare` par défaut du navigateur, sensible aux accents).

### 4.2 Corps

1. `h2` « Par client ({nombre de clients}) » puis tableau :

| Colonne | Contenu |
| --- | --- |
| Nom | `Nom` |
| Classe | `Classe` |
| Plats | une ligne par plat : « **{qte}×** {nom du plat}[ — {montant}] », suivie si besoin d'une ligne « ***{observation}*** » (gras italique) ; lignes séparées par `<br>` |
| Portions (droite) | total des portions du client |
| Prix (droite) | `amountsText(r2Amounts(lignes))` : « 7,00 € », « 2 tickets restaurant », « 7,00 € + 1 ticket restaurant » ou vide |
| Mode | **en gras** : modes joints par « + » (ex. « À emporter + Sur place ») |
| Contact | `Contact` |

   Vide : « Aucune réservation. »

2. `h2` « Récapitulatif par plat » puis tableau (ordre des plats de la feuille) :

| Colonne | Contenu |
| --- | --- |
| Plat | nom (sans la mention ticket) |
| Prix unitaire (droite) | « 3,50 € », « prix d'un ticket restaurant » ou vide |
| Portions (droite) | « {réservées} / {Stock} » |
| Montant (droite) | `itemAmountText(plat, réservées)` |

   Vide : « Aucun plat. »

- **Total** : « Total du jour » → « {n client(s)} · {m portion(s)}[ · {montants}] » (montants = euros + tickets de tous les plats ; partie omise si vide).
- **Signature** : oui.

Montants (rappel `donnees.js`) : un plat au ticket compte **un ticket par portion** dans ces totaux ; un plat sans prix ni ticket ne compte pas (`gap`).

## 5. Résumé du lendemain à l'écran (`showTomorrowSummary`, conteneur `#summary-tomorrow`)

Affiché en mode collègue seulement, largeur max 480 px, centré.

```html
<div class="panel card-top-accent summary-panel">
  <div class="summary-title">Résumé pour demain ({formatDate(demain)})</div>
  … blocs …
</div>
```

- Aucun jour ouvert demain dans les deux restaurants : `<p class="text-muted">Aucun jour ouvert pour demain.</p>`.
- **Bloc R1** (si jour R1 demain) :
  - en-tête : `<b class="summary-name accent-green">{name1}</b>` + bouton icône `ICONS.print` (`title="Imprimer"`, `aria-label="Imprimer"`) → document C ;
  - « Ouvert par {OuvertPar | (aucun)} » ;
  - « Réservés : {total} / {Capacite} couverts[ — {somme des prix}] » (prix si > 0) ;
  - s'il y a des réservations : « Clients : {Nom} ({Classe}), {Nom} ({Classe}), … ».
- **Bloc R2** (si jour R2 demain) :
  - en-tête : nom (magenta) + bouton « Imprimer » → document D ;
  - « Ouvert par {OuvertPar | (aucun)} » ;
  - pour chaque plat ayant au moins une réservation : « • {Nom}: {total} portion(s)[ — {montant}][ ({noms des clients séparés par des virgules})] » ;
  - si un montant existe : « Total {name2}[ (hors plats sans prix)] : {montants} » (en gras) ;
  - aucun plat : « Aucun plat ouvert. »

## 6. Document C — Résumé du lendemain, restaurant 1 (`printDayR1(demain, true)`)

- `<title>` : « {name1} — demain {date} ». Sous-titre : « Demain, {date} ».
- Informations : **Ouvert par**, **Places** (pas de Thème ni de Menu).
- Tableau simple (non quadrillé), ordre d'enregistrement :

| Nom | Classe | Couverts (droite) | Prix (droite) |
| --- | --- | --- | --- |

  Vide : « Aucune réservation. »
- Total : « Total » → « {n couvert(s)}[ · {prix}] » (pas de détail élèves/personnels/extérieurs).
- Pas de signature.
- Aucun jour R1 demain (cas théorique, le bouton n'existe alors pas) : corps « Aucun jour ouvert pour demain. », pas d'informations ni de total.

## 7. Document D — Résumé du lendemain, restaurant 2 (`printTomorrowSummaryR2`)

- `<title>` : « {name2} — demain {date} ». Sous-titre : « Demain, {date} ».
- Informations : **Ouvert par** uniquement (si le jour existe).
- Corps :
  - pas de jour : « Aucun jour ouvert pour demain. » ;
  - jour sans plat : « Aucun plat ouvert. » ;
  - sinon, pour chaque plat (ordre de la feuille) : un `h3` « {Nom}[ — {prix}][ l'unité] » avec, aligné à droite, « {réservées} / {Stock} » (« l'unité » seulement pour un plat avec prix en euros), puis le tableau :

| Nom | Classe | Portions (droite) | Prix (droite) |
| --- | --- | --- | --- |

    (réservations du plat dont `Date` = demain ; vide : « Aucune réservation. »).
- Total (si jour et plats) : « Total » → « {m portion(s)}[ · {montants}] ».
- Pas de signature.

---

## 8. Mécanique actuelle

1. Le document est construit en **chaîne HTML complète** (`<!DOCTYPE html>…`) par `printDoc`.
2. **Jetons recopiés** (`printTokensCss`) : la fenêtre ne charge pas `design-system.css` ; au moment d'imprimer, la page lit `getComputedStyle(document.documentElement)` pour chaque nom de `PRINT_TOKENS` et écrit `:root{--nom:valeur;…}` :
   `--ab-green, --ab-green-ink, --ab-green-deep, --ab-blue, --ab-blue-ink, --ab-magenta, --ab-magenta-ink, --ab-gradient, --text, --text-muted, --border, --border-strong, --surface-alt, --font-display, --font-body, --fw-medium, --fw-semibold, --tracking-caps, --radius-sm`.
   S'y ajoutent les règles `.pb-r1{--p-mark…}` / `.pb-r2{…}` et la règle `@page` des boîtes de marge (police et couleur en valeurs directes).
   Règle du README : tout nouveau jeton utilisé dans `PRINT_CSS` doit être ajouté à `PRINT_TOKENS`.
3. `<head>` : `<meta charset="UTF-8">`, `<title>`, lien Google Fonts (Outfit 500/600/700, Work Sans 400/500/600), `<style>` = jetons + `PRINT_CSS`.
4. **Ouverture** (`openPrint`) : `window.open('', '_blank')`.
   - Bloquée par le navigateur → toast d'erreur « Autorisez les fenêtres de ce site pour imprimer. » et arrêt.
   - Sinon `document.write(html)`, `document.close()`, `focus()`.
5. **Déclenchement** : attente de `document.fonts.ready` de la nouvelle fenêtre, **au plus 2 000 ms**, puis 100 ms, puis `w.print()`.
6. **Fermeture** : aucune ; la fenêtre (ou l'onglet) reste ouverte après la boîte d'impression, affichant le document en version écran (avec le pied `.pb-foot`).

---

## 9. Recommandations pour React

Le résultat visuel décrit aux §2 à §7 est la référence. Options techniques, à évaluer :

| Option | Principe | Avantages | Inconvénients |
| --- | --- | --- | --- |
| 1. Route dédiée `/impression/:restaurant/:date` (+ `?demain=1`) avec `@media print` et `window.print()` au montage | page React normale, styles `@page` dans une feuille dédiée | jetons CSS réels (plus besoin de `PRINT_TOKENS`), testable, lien partageable, aperçu écran | nécessite que la route ait l'état complet (mot de passe en mémoire → ouvrir dans le **même onglet** ou via `window.open` + transmission d'état ; un nouvel onglet perd la session) |
| 2. `iframe` caché + `contentWindow.print()` | rendu du composant dans un iframe (portail React ou `renderToStaticMarkup`) | pas de fenêtre surgissante bloquée, pas de perte de session | il faut injecter les styles dans l'iframe (même problème de jetons) ; support Safari iOS variable |
| 3. Conserver `window.open` + `renderToStaticMarkup` | portage direct de l'actuel | comportement identique | bloqueurs de fenêtres, styles à recopier |

Recommandation : option 2 (ou 1 en même onglet) avec une feuille d'impression commune ; composants `<DocumentImprime>`, `<TableauImprime colonnes groupes lignes vide>`, `<TotalImprime>`, `<Signature>` réutilisant les mêmes jetons. Conserver les boîtes de marge `@page` (pied « Page x / y » : pris en charge par Chromium récent ; prévoir que d'autres navigateurs l'ignorent, d'où le pied `.pb-foot` à l'écran).

---

## 10. Points d'attention

1. **Tickets restaurant comptés par portion** dans les impressions R2 et le résumé du lendemain (`r2Amounts`), alors que la commande du client coûte **un seul ticket** quel que soit le nombre de plats/portions au ticket (`orderAmounts` dans `reservation.js`, règle du README). Le total imprimé peut donc annoncer « 3 tickets restaurant » pour une seule commande.
2. **Liste R1 sans tri** (ordre d'enregistrement), alors que la liste R2 est triée par classe puis nom ; les listes du lendemain ne sont pas triées non plus.
3. Regroupement R2 par nom + classe + contact : deux commandes d'une même personne avec un contact saisi différemment (ou une faute de frappe) donnent deux clients ; deux personnes homonymes de même classe sans contact sont fusionnées.
4. Résumé à l'écran R2 : « portion(s) » (au lieu de l'accord automatique utilisé partout ailleurs) et « {Nom}: » sans espace avant les deux-points (typographie française).
5. Doublon fonctionnel : le panneau « Demain » (en haut) et le « Résumé pour demain » affichent tous deux les totaux du lendemain ; leurs chiffres peuvent différer (le panneau « Demain » compte aussi les réservations de plats supprimés, voir 06).
6. `printDayR1` affiche « Aucun jour ouvert pour demain. » même hors résumé du lendemain (texte inadapté si le jour n'existait plus au moment de l'impression).
7. La fenêtre d'impression n'est jamais refermée ; aucun retour n'est donné si l'utilisateur annule.
8. Le logo est recopié depuis l'image de la page (`.brand-logo`, data URI) ; s'il manquait, l'en-tête s'imprimerait sans logo, sans erreur.
9. La page principale n'a **aucune feuille `@media print`** : un Ctrl+P sur la page imprime toute l'interface.
