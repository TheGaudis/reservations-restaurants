# 04 — Parcours public de réservation

Sources : `js/reservation.js` (formulaires et envoi), `js/donnees.js` (règles), `js/outils.js` (formats, erreurs de champs), `js/main.js` (rendu, conservation des saisies), et, pour le contexte d'écran, `js/calendrier.js` (fiches du jour) et `js/interface.js` (récapitulatif) — ces deux fichiers sont spécifiés en détail ailleurs.

Notation : `␣` = espace insécable U+00A0. Les textes entre guillemets de code sont **exacts** (ponctuation et espaces compris).

## 1. Vue d'ensemble

```
Accueil (2 colonnes)
 ├─ Calendrier R1 ─ clic/Entrée sur un jour ─► Fiche du jour R1 ─ « Réserver » ─► Formulaire R1 ─ « Confirmer la réservation »
 │                                                                                   ├─ erreur de champ → message sous le champ
 │                                                                                   ├─ erreur serveur → toast, formulaire conservé
 │                                                                                   └─ succès → Récapitulatif au-dessus de la fiche
 └─ Calendrier R2 ─► Fiche du jour R2 ─ « Réserver » ─► Formulaire R2 (plats, mode) ─► idem
                         └─ après 10 h / jour passé : message de clôture, pas de « Réserver »
```
Un **seul** formulaire public peut être ouvert à la fois (`openBookingTarget`), toutes colonnes confondues : en ouvrir un ferme l'autre.

## 2. Page d'accueil

- En-tête : logo, `Lycée professionnel Aristide Briand`, `<h1>Réservations des restaurants pédagogiques et Aristide</h1>`, sous-titre `Table côté {name1} · Plats à emporter ou sur place côté {name2}`, sélecteur `Client` / `Collègue` (mode collègue : autre spécification).
- Deux colonnes côte à côte (empilées sur mobile) :
  - **R1** (`.accent-green`) : titre `{name1}` (défaut `Restaurant Pédagogique`), description `{desc1}`, calendrier, fiche du jour sélectionné.
  - **R2** (`.accent-magenta`) : titre `{name2}` (défaut `Aristide`), description `{desc2}`, calendrier, fiche du jour.
- Titres/descriptions ne sont réécrits que s'ils changent, avec un court fondu (`.text-updated`), sans animation au premier affichage ; une valeur vide n'est pas appliquée.
- Pied : `Les places se mettent à jour automatiquement toutes les 3 minutes. Vous pouvez aussi actualiser la page.`

## 3. Sélection d'un jour (résumé ; détail dans la spécification du calendrier)

- Chaque calendrier démarre en vue **Semaine**, sur la semaine d'aujourd'hui, jour sélectionné = **aujourd'hui** (date locale).
- Commandes : `‹` / `›` (semaine ou mois précédent/suivant), segments `Semaine` / `Mois`, bouton `Aujourd'hui`.
- Chaque case est un bouton avec pastille de disponibilité (`cap-ok` vert, `cap-low` orange, `cap-full` rouge ; aucune si pas de service) et `aria-label` = `{formatDate(iso)}, {places disponibles|bientôt complet|complet|aucun service}[, passé]`, `aria-pressed` sur le jour sélectionné, `aria-current="date"` sur aujourd'hui.
- Clavier : ← → (jour), ↑ ↓ (semaine), Début / Fin (lundi / dimanche), Page ↑ / ↓ (mois) ; seul le jour sélectionné est atteignable par Tab.
- Sélectionner un jour (`selectDate`) : met à jour le jour sélectionné, **ferme le formulaire ouvert** (`openBookingTarget = null`) et **efface le récapitulatif** (`bookingConfirmation = null`).

## 4. Fiche du jour

### 4.1 Jour sans service (R1 et R2)

```
{formatDate(iso)}                       ← .day-date (majuscule initiale par CSS)
Aucune réservation possible ce jour-là.
```
Classe `is-past` si le jour est passé.

### 4.2 Fiche R1

| Élément | Contenu exact | Condition |
| --- | --- | --- |
| Récapitulatif | voir § 7 | si `bookingConfirmation` concerne R1 et ce jour |
| Date | `{formatDate(Date)}` | toujours |
| Pastille de capacité | `{rem} / {Capacite} couverts` (classe `cap-ok/low/full`, jauge `--pct`) | toujours ; « couverts » toujours au pluriel |
| Bloc thème | sur-titre `Thème du jour`, texte `{Theme}` | si `Theme` non vide |
| Bloc menu | sur-titre `Menu du jour`, texte `{Menu}` | si `Menu` non vide |
| Bouton `Réserver` | `<div class="day-actions"><button class="btn primary">Réserver</button></div>` | mode client, formulaire fermé, `rem > 0`, jour non passé |
| Formulaire R1 | § 5.2 | formulaire ouvert pour ce jour |

Jour complet (`rem <= 0`) : pas de bouton ni de message ; seule la pastille rouge `0 / N couverts` l'indique visuellement. R1 n'a **pas** d'heure limite : on peut réserver pour aujourd'hui à toute heure.

### 4.3 Fiche R2

| Élément | Contenu exact | Condition |
| --- | --- | --- |
| Récapitulatif | § 7 | si concerne R2 et ce jour |
| Date | `{formatDate(Date)}` | toujours |
| Bloc thème | `Thème du jour` / `{Theme}` | si non vide |
| Bloc note | `Note` / `{Note}` | si non vide |
| Liste des plats | par plat : `{Nom}{dash(itemPriceText)}` + pastille `{rem} / {Stock}` (classe de capacité) | toujours, **sauf** pendant la commande (la liste se replie vers le haut à l'ouverture, puis disparaît ; elle se redéploie à l'annulation) |
| Message de clôture | `<p class="note-warning closed-note">Commandes en ligne clôturées à 10h. Venez au restaurant {name2} à partir de 12h pour commander sur place.</p>` | mode client, jour **non passé**, commandes closes (aujourd'hui ≥ 10 h) |
| Bouton `Réserver` | idem R1 | mode client, formulaire fermé, au moins un plat avec `rem > 0`, commandes ouvertes |
| Formulaire R2 | § 5.3 | formulaire ouvert, commandes ouvertes |

Exemples de ligne de plat : `Lasagnes␣— 4,50␣€`, `Bowl␣— prix d'un ticket restaurant`, `Salade` (sans prix).
Après 10 h : menu, prix et stocks restent affichés ; seul le bouton disparaît et le message apparaît. Jour passé : ni bouton ni message.

## 5. Formulaires

### 5.1 Ouverture, fermeture

**Ouvrir R1** (`openBookingR1(date)`) : efface le récapitulatif ; `openBookingTarget = { rest:'r1', date, requestId: newRequestId() }` ; animation d'entrée (le formulaire se déplie vers le bas depuis l'emplacement du bouton) ; focus sur le premier champ (`Nom et prénom`) sans défilement ; si le haut du formulaire est situé à plus de 60 % de la hauteur de la fenêtre, `scrollIntoView({ block: 'start' })`.

**Ouvrir R2** (`openBookingR2Day(date)`) : efface le récapitulatif ; `openBookingTarget = { rest:'r2', date, requestId }` ; `chosenServiceMode = 'emporter'` ; `multiBookingQty = {}` ; animation de repli de la liste des plats ; focus sur le premier champ de saisie (la première quantité) ; si le haut de la fiche est au-dessus de la fenêtre (`top < 0`), `scrollIntoView({ block: 'start' })` sur la fiche.

**Annuler** (`closeBooking()`) : animation de sortie (120 ms, immédiate si mouvement réduit ; un double clic ne ferme qu'une fois), puis `openBookingTarget = null`, `multiBookingQty = {}`, rendu, **focus rendu au bouton `Réserver`** de la fiche. Pour R2, la liste des plats se redéploie.

**Conservation des saisies** : chaque rendu complet (actualisation, autre action) mémorise la valeur des champs ayant un `id` (sauf mots de passe) et le focus, puis les restaure. Les quantités R2 sont dans `multiBookingQty` et réaffichées à chaque rendu.

### 5.2 Formulaire R1 (préfixe `bk`)

Structure (ordre DOM = ordre de tabulation) :

| # | Champ | Libellé exact | Attributs | Règle |
| --- | --- | --- | --- | --- |
| 1 | `#bk-name` | `Nom et prénom` | `type="text"`, `placeholder="Ex. Cyrille Ungerer"`, `autocomplete="name"` | obligatoire (après `trim`) |
| 2 | `#bk-contact` | `Adresse email` | `type="email"`, `placeholder="Ex. Ariele.gsell@exemple.fr"`, `autocomplete="email"`, `inputmode="email"`, `spellcheck="false"` ; aide `Pour vous envoyer la confirmation.` | obligatoire, format e-mail |
| 3 | `#bk-classe` | `Classe ou service` | `type="text"`, `placeholder="Ex. TS2 ou vie scolaire"` | obligatoire |
| — | groupe | `<fieldset>` légende `Nombre de personnes ({rem} au maximum)` | | |
| 4 | `#bk-nbEleve` | `Élèves · {formatEuro(priceEleve)}` → `Élèves · 4,95␣€` | `type="number" min="0" placeholder="0" inputmode="numeric"` | entier ≥ 0 |
| 5 | `#bk-nbProf` | `Personnels · 6,10␣€` | idem | entier ≥ 0 |
| 6 | `#bk-nbExt` | `Extérieurs · 9,90␣€` | idem | entier ≥ 0 |
| — | `#bk-r1-total` | total en direct (`aria-live="polite"`) | | |
| 7 | `#bk-obs` | `Observation (optionnel)` | `type="text"`, `placeholder="Ex. table partagée, allergie…"` | facultatif |
| 8 | bouton | `Confirmer la réservation` | `.btn.primary` | |
| 9 | bouton | `Annuler` | `.btn.ghost` | |

Disposition : `Adresse email` et `Classe ou service` sur une même ligne (`.row2`) ; les trois compteurs sur une ligne (`.row3`).

**Lecture des compteurs** : `max(0, parseInt(valeur, 10) || 0)` — vide, texte ou négatif → 0 ; décimal tronqué (`2.7` → 2).

**Total en direct** (`updateR1PriceLive('bk')`, à chaque saisie dans un compteur et après chaque rendu) :
```
{plural(total, 'couvert')} · Total : {formatEuro(priceR1(nbEleve, nbProf, nbExt))}
```
Exemples : `0 couvert · Total : 0,00␣€` (affichage initial effectif), `1 couvert · Total : 4,95␣€`, `3 couverts · Total : 16,00␣€` (2 élèves + 1 personnel).

**Validation à l'envoi** (dans cet ordre ; tous les messages sont affichés ensemble, focus sur le premier champ en erreur) :

| Cible | Condition | Message exact |
| --- | --- | --- |
| `#bk-name` | vide | `Indiquez vos nom et prénom.` |
| `#bk-contact` | vide | `Indiquez votre adresse email.` |
| `#bk-contact` | ne vérifie pas `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | `Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr).` |
| `#bk-classe` | vide | `Indiquez votre classe ou votre service.` |
| rangée des compteurs (message inséré juste après la rangée) | total ≤ 0 | `Indiquez au moins une personne.` |

Le total n'est **pas** comparé aux places restantes côté client (la légende indique le maximum, le champ n'a pas d'attribut `max`) : c'est le serveur qui refuse (§ 6.3).

### 5.3 Formulaire R2 (préfixe `bk`)

Structure (ordre DOM) :

1. **Mode de service** : groupe de boutons segmentés (`role="group"`, `aria-label="Mode de service"`, boutons `aria-pressed`) :
   - `À emporter` (absent si le jour a au moins un plat au ticket restaurant),
   - `Sur place`.
   Le segment pressé correspond à `serviceMode(date)`. Un clic sur l'autre segment change `chosenServiceMode` et ne réaffiche que la fiche R2.
   Jour avec ticket : aide `Sur place uniquement ce jour-là : repas au prix d'un ticket restaurant.` sous le groupe.
2. **Plats** : `<fieldset>` légende `Choisissez vos plats et quantités`, une ligne par plat du jour (ordre de la feuille) :
   - plat épuisé (`rem <= 0`) : `{Nom}` + `Épuisé`, sans champ ;
   - sinon : `{Nom}{dash(itemPriceText)}` + `{rem} disponible` / `{rem} disponibles` (pluriel si `rem > 1`) + champ quantité `input type="number" class="qty-input" min="0" max="{rem}" placeholder="0" inputmode="numeric" aria-label="Quantité : {Nom}"`, prérempli avec `multiBookingQty[ID]` s'il existe.
   - À chaque saisie : `n = parseInt(valeur, 10)` ; `n > 0` → `multiBookingQty[ID] = n`, sinon la clé est supprimée ; si `n > 0`, l'erreur « Choisissez au moins un plat. » est retirée ; puis total recalculé. Une quantité supérieure à `rem` n'est **pas** bloquée côté client (seul l'attribut `max` l'indique).
3. **Total** `#bk-r2-total` (`aria-live="polite"`) :
   ```
   'Total' + (gap ? ' (hors plats sans prix indiqué)' : '') + ' : ' + amountsText(orderAmounts(lignes))
   ```
   vide si `amountsText` est vide (rien de choisi, ou seulement des plats sans prix). Un seul ticket restaurant au maximum par commande. Exemples :
   - 2 × Lasagnes à 4,50 € → `Total : 9,00␣€`
   - 2 × Lasagnes + 3 × Bowl (ticket) + 1 × Wrap (ticket) → `Total : 9,00␣€ + 1 ticket restaurant`
   - 1 × Bowl (ticket) → `Total : 1 ticket restaurant`
   - 1 × Lasagnes + 1 × Salade (sans prix) → `Total (hors plats sans prix indiqué) : 4,50␣€`
4. `Nom et prénom`, `Adresse email` (+ aide), `Classe ou service` — identiques au R1.
5. `Observation (optionnel)`.
6. Boutons `Confirmer la réservation` / `Annuler`.

**Validation à l'envoi** (ordre exact) :
1. **Cut-off d'abord** : si `r2OrdersClosed(date)` → formulaire fermé (`openBookingTarget = null`), toast **neutre** (non rouge) `Commandes en ligne clôturées à 10h. Venez au restaurant {name2} à partir de 12h pour commander sur place.`, rendu, arrêt.
2. Règles de champs :

| Cible | Condition | Message exact |
| --- | --- | --- |
| paragraphe du total (message inséré juste après) | aucun plat avec quantité > 0 | `Choisissez au moins un plat.` |
| `#bk-name` | vide | `Indiquez vos nom et prénom.` |
| `#bk-contact` | vide / invalide | `Indiquez votre adresse email.` / `Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr).` |
| `#bk-classe` | vide | `Indiquez votre classe ou votre service.` |

3. `mode = serviceMode(date)` (forcé à `surplace` un jour de ticket).

### 5.4 Messages d'erreur sous les champs (comportement commun)

- Message : `<p class="field-error" id="{idChamp}-error">…</p>` ajouté à la fin du conteneur `.field` (ou juste après le bloc pour la rangée des compteurs et le total R2) ; conteneur en `.has-error`.
- Champ : `aria-invalid="true"`, `aria-describedby="{idChamp}-error {idAide}"`.
- Au nouvel envoi, toutes les erreurs du formulaire sont effacées puis recalculées.
- Dès la première frappe dans un champ en erreur, son message disparaît (écouteur global `input`).
- Focus sur le premier élément `input`/`select` situé dans un conteneur en erreur.

## 6. Envoi

### 6.1 États du bouton

1. Clic sur `Confirmer la réservation` → validation (§ 5) ; en cas d'erreur, rien n'est envoyé.
2. Bouton occupé : `disabled`, `aria-busy="true"`, libellé `Envoi en cours…`. Pas de voile plein écran (le bouton porte l'attente). L'actualisation automatique est suspendue.
3. Le double clic est neutralisé par `disabled` ; en dernier recours, le serveur ignore un second envoi portant le même `requestId`.
4. Succès : le formulaire disparaît (le bouton n'est pas restauré, il est retiré du DOM).
5. Erreur : toast rouge avec le message, bouton restauré (`Confirmer la réservation`, actif), **formulaire et saisies conservés**, **même `requestId`** pour le nouvel essai.

Le bouton `Annuler` et les champs restent actifs pendant l'envoi (voir points d'attention).

### 6.2 Requêtes

- R1 : `addBookingR1` avec `{ date, nom, contact, classe, nbEleve, nbProf, nbExt, observation, requestId }` (voir `02` § 4.4).
- R2 : `addBookingR2Multi` avec `{ date, nom, contact, classe, mode, items: [{ itemId, qte }], observation, requestId }` (voir `02` § 4.5).
Toutes les valeurs texte sont envoyées après `trim()`.

### 6.3 Réponses et effets

**Doublon** (`res._duplicate`, R1 et R2) :
1. retrait de `_duplicate`, `_emailStatus`, `_bookingResult` ;
2. adoption de l'état (`adoptBookingState`) ;
3. formulaire fermé, `multiBookingQty = {}` ;
4. toast **neutre** : `Cette réservation était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.` ;
5. **aucun récapitulatif**.

**Succès R1** :
1. adoption de l'état public reçu (`state = res`, `dataStale = false` ; en mode collègue : relecture de l'état complet) ;
2. récapitulatif (§ 7) ; 3. toast `Réservation confirmée.` ; 4. formulaire fermé ; 5. rendu (le bouton `Réserver` réapparaît sous le récapitulatif s'il reste des places).

**Succès R2** (`_bookingResult` ; à défaut `{ confirmed: [], adjusted: [], skipped: [] }`) :
- `confirmed` vide → toast **rouge** `Aucun des plats choisis n'est disponible en quantité suffisante.`, formulaire **fermé** et quantités effacées, pas de récapitulatif ;
- sinon → récapitulatif avec les quantités **réellement accordées**, toast `Réservation confirmée.`, formulaire fermé.

**Erreurs serveur possibles dans le parcours public** (affichées telles quelles en toast rouge, formulaire conservé) :

| Message | Action | Cause |
| --- | --- | --- |
| `Il ne reste que {n} couvert(s) pour ce jour.` | R1 | Plus assez de places (ex. `Il ne reste que 2 couvert(s) pour ce jour.`) |
| `Ce jour n'existe plus.` | R1 | Jour supprimé entre-temps |
| `Merci de renseigner au moins une personne.` | R1 | (ne devrait pas arriver, contrôlé côté client) |
| `Quantité invalide : indiquez un nombre entier positif.` | R1, R2 | (ne devrait pas arriver) |
| `Choisissez au moins un plat.` | R2 | `items` non tableau (ne devrait pas arriver) |
| `Le serveur est très sollicité : réessayez dans quelques secondes.` | R1, R2 | Verrou non obtenu en 20 s |
| message brut du navigateur (`Failed to fetch`, `Unexpected token…`) | R1, R2 | Réseau / page d'erreur Google |
| `Erreur` | R1, R2 | Exception sans message |

R2 ne renvoie jamais d'erreur de stock : les quantités sont réduites (`adjusted`) ou les plats écartés (`skipped`).

**Retour au formulaire après erreur** : le formulaire reste ouvert avec toutes les saisies ; l'utilisateur corrige (ex. diminue le nombre de personnes) et renvoie. L'état affiché (places restantes, légende « N au maximum ») n'est **pas** rafraîchi après l'erreur.

## 7. Récapitulatif (écran de confirmation)

Affiché en tête de la fiche du restaurant concerné, tant que ce jour reste sélectionné, au-dessus de la carte du jour. Animé une seule fois (pas à chaque actualisation).

Structure :
```html
<div class="panel card-top-accent confirm-card[ has-warning]" role="status">
  ✓ (icône)  Réservation enregistrée
             {formatDate(date)}                      ← majuscule initiale par CSS
  [<p class="note-warning">{warning}</p>]
  <ul> <li><span>{label}</span><b>{value}</b></li> … </ul>
  [Total            {total}]
  Pour annuler ou modifier, contactez {contactAnnulation || "l'établissement"}.
  [Fermer]
</div>
```

**Lignes R1** (dans cet ordre) :
| Libellé | Valeur | Condition |
| --- | --- | --- |
| `Nom` | nom saisi | toujours |
| `Classe / service` | classe saisie | toujours |
| `Élèves` | nombre | si > 0 |
| `Personnels` | nombre | si > 0 |
| `Extérieurs` | nombre | si > 0 |

Total R1 : `plural(total, 'couvert') + (prix > 0 ? ' — ' + formatEuro(prix) : '')`, prix calculé côté client avec les tarifs de l'état reçu. Ex. `3 couverts — 16,00␣€` (espaces normales autour du tiret).

**Lignes R2** :
| Libellé | Valeur |
| --- | --- |
| `Nom` | nom saisi |
| `Classe / service` | classe saisie |
| `Mode` | `À emporter` ou `Sur place` (mode envoyé) |
| `{nom du plat sans suffixe ticket}` (ou `Plat` si vide) | `× {qte accordée}` (ex. `× 2`, signe U+00D7) — une ligne par plat confirmé |

Total R2 : `amountsText(orderAmounts(confirmés)) + (gap ? ' (hors plats sans prix)' : '')` ; ligne Total absente si vide. Ex. `9,00␣€ + 1 ticket restaurant`.

L'e-mail et l'observation ne figurent pas dans le récapitulatif.

**Avertissement** (`warning`) :
| Situation | Texte exact |
| --- | --- |
| R2 : au moins un plat ajusté ou écarté | `Certaines quantités ont été ajustées faute de stock. Vérifiez votre email pour le détail.` |
| Sinon, `_emailStatus.sent === false` et `reason !== 'no-email'` | `L'email de confirmation n'a pas pu être envoyé. Gardez ce récapitulatif.` |
| Sinon | (aucun) |

La carte prend alors la classe `has-warning` (filet supérieur orange).

**Fermeture** : bouton `Fermer` (`bookingConfirmation = null`, rendu complet), ou sélection d'un autre jour, ou ouverture d'un nouveau formulaire.

**E-mail envoyé ou non** : le client ne dit jamais explicitement « e-mail envoyé » ; l'absence d'avertissement vaut succès. Le serveur envoie l'e-mail **après** l'écriture, avant de répondre (statut fiable).

## 8. Formats d'affichage

| Donnée | Fonction | Format | Exemples |
| --- | --- | --- | --- |
| Date longue | `formatDate(iso)` | `Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })` | `samedi 3 octobre 2026`, `jeudi 1 octobre 2026` (pas de « 1er »). Majuscule initiale ajoutée par CSS dans la fiche et le récapitulatif : `Samedi 3 octobre 2026`. |
| Date longue (e-mails, serveur) | `dateLongue(iso)` | tables `JOURS`/`MOIS`, « 1er » pour le 1er | `jeudi 1er octobre 2026` |
| Montant | `formatEuro(n)` | `toFixed(2)`, virgule, `␣€` | `4,95␣€`, `12,50␣€`, `0,00␣€` |
| Montant (e-mails) | `euros(v)` | idem, espace normale | `12,50 €` |
| Pluriel | `plural(n, mot)` | `s` si `n > 1` | `0 couvert`, `1 couvert`, `2 couverts` |
| Tickets | `ticketsText(n)` | `plural(n,'ticket') + ' restaurant'` | `1 ticket restaurant`, `2 tickets restaurant` |
| Prix d'un plat | `itemPriceText(item)` | | `3,50␣€`, `prix d'un ticket restaurant`, `` |
| Montant combiné | `amountsText` | parties jointes par ` + ` | `9,00␣€ + 1 ticket restaurant` |
| Séparateur libellé/valeur | `dash(text)` | `␣— ` + texte | `Lasagnes␣— 4,50␣€` |
| Disponibles | inline | `{n} disponible` + `s` si `n > 1` | `1 disponible`, `3 disponibles` |
| Pastille R1 | inline | `{rem} / {Capacite} couverts` | `12 / 20 couverts`, `1 / 20 couverts` |
| Pastille R2 | inline | `{rem} / {Stock}` | `4 / 10` |

## 9. Catalogue des messages du parcours public

| Type | Texte exact |
| --- | --- |
| Toast succès | `Réservation confirmée.` |
| Toast neutre | `Cette réservation était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.` |
| Toast neutre | `Commandes en ligne clôturées à 10h. Venez au restaurant {name2} à partir de 12h pour commander sur place.` |
| Toast erreur | `Aucun des plats choisis n'est disponible en quantité suffisante.` |
| Toast erreur | message serveur (§ 6.3) ou `Erreur` |
| Toast erreur | `Impossible de charger les données. Réessayez.` (rechargement manuel échoué, voir `03`) |
| Erreur de champ | `Indiquez vos nom et prénom.` · `Indiquez votre adresse email.` · `Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr).` · `Indiquez votre classe ou votre service.` · `Indiquez au moins une personne.` · `Choisissez au moins un plat.` |
| Note de fiche | `Commandes en ligne clôturées à 10h. Venez au restaurant {name2} à partir de 12h pour commander sur place.` |
| Fiche vide | `Aucune réservation possible ce jour-là.` |
| Aide | `Pour vous envoyer la confirmation.` · `Sur place uniquement ce jour-là : repas au prix d'un ticket restaurant.` |
| Récapitulatif | `Réservation enregistrée` · `Total` · `Pour annuler ou modifier, contactez {contact}.` · `Fermer` |
| Avertissements | `Certaines quantités ont été ajustées faute de stock. Vérifiez votre email pour le détail.` · `L'email de confirmation n'a pas pu être envoyé. Gardez ce récapitulatif.` |
| Boutons | `Réserver` · `Confirmer la réservation` · `Annuler` · `Envoi en cours…` · `À emporter` · `Sur place` |

Les toasts restent 3,5 s, en bas au centre ; vert avec coche (succès/neutre), rouge avec « ! » (erreur).

## 10. Accessibilité

| Sujet | Comportement actuel (à conserver) |
| --- | --- |
| Libellés | Chaque `<label>` d'un `.field` est relié à son champ (`for`/`id` générés). Les quantités R2 n'ont pas de `<label>` mais `aria-label="Quantité : {Nom}"`. |
| Groupes | Compteurs R1 et plats R2 dans un `<fieldset>` avec `<legend>` (la légende R1 annonce le maximum). Mode de service : `role="group"` + `aria-label`, boutons `aria-pressed`. |
| Aides | `.field-help` relié par `aria-describedby` (`{id}-aide`). |
| Erreurs | `aria-invalid="true"` + `aria-describedby` vers le message puis l'aide ; focus sur le premier champ en erreur ; message retiré dès la saisie. |
| Totaux en direct | `aria-live="polite"` sur `#bk-r1-total` et `#bk-r2-total`. |
| Bouton occupé | `disabled` + `aria-busy="true"` + libellé d'attente. |
| Annonces | Toast `role="status" aria-live="polite"` ; récapitulatif `role="status"` ; encadré d'échec `role="alert"` ; voile `role="status"` (« Chargement… ») et spinner `role="progressbar" aria-label="Chargement en cours"`. |
| Focus | Ouverture : premier champ (sans défilement brusque) ; annulation : retour sur `Réserver` ; erreur : premier champ invalide ; actualisation : focus et saisies restaurés ; si l'élément focalisé disparaît, focus sur la date de la fiche (`tabindex="-1"`) de la même zone. |
| Liste repliée R2 | `inert` + `aria-hidden="true"` pendant son repli. |
| Calendrier | Cases annonçant la date complète et la disponibilité en mots (la couleur seule ne suffit pas) ; navigation au clavier ARIA (voir spécification du calendrier). |
| Clavier dans les formulaires | Tab / Maj+Tab dans l'ordre DOM ; pas d'élément `<form>` : **Entrée ne soumet pas**, Échap ne ferme pas. |
| Mouvement réduit | `prefers-reduced-motion: reduce` : toutes les animations et transitions désactivées, fermeture immédiate. |
| Zones tactiles | 48 px minimum (charte). |

---

## Points d'attention

1. **Pas de contrôle client du maximum R1** : la légende affiche `({rem} au maximum)` mais rien n'empêche d'envoyer plus ; l'erreur serveur `Il ne reste que N couvert(s) pour ce jour.` n'apparaît qu'en toast (pas sous les champs), et l'état n'est pas rafraîchi après l'erreur (la légende peut rester fausse). L'ajout collègue, lui, vérifie ce maximum côté client.
2. **Quantités R2 au-delà du stock** non bloquées : le serveur réduit en silence, l'utilisateur ne le découvre que dans l'avertissement du récapitulatif.
3. **`confirmed` vide** : le formulaire est fermé et les saisies perdues, alors qu'une erreur serveur classique conserve le formulaire.
4. **Textes incohérents** : total en direct R2 `(hors plats sans prix indiqué)` vs récapitulatif `(hors plats sans prix)` ; texte initial `Total : 0,00 €` du R1 aussitôt remplacé par `0 couvert · Total : 0,00 €` ; pastille `1 / 20 couverts` toujours au pluriel ; dates sans « 1er » à l'écran mais avec « 1er » dans les e-mails ; `Il ne reste que 2 couvert(s)` (serveur) avec « (s) ».
5. **Toasts qui se chevauchent** : le minuteur de 3,5 s n'est pas réinitialisé ; un second toast affiché 3 s après le premier disparaît au bout de 0,5 s. Les erreurs sont annoncées en `polite` (pas `assertive`).
6. **Focus perdu après succès** : le bouton d'envoi disparaît et le focus retombe sur `body` (le récapitulatif est annoncé par `role="status"` mais n'est pas focalisé).
7. **Erreur « Choisissez au moins un plat. »** : placée après le paragraphe du total, sans champ associé ; si c'est la seule erreur, le focus ne bouge pas et le message n'est relié à aucun champ (`aria-describedby`).
8. **`Annuler` actif pendant l'envoi** : on peut fermer le formulaire pendant l'envoi ; la réservation sera tout de même enregistrée et le récapitulatif s'affichera.
9. **Report des saisies entre restaurants** : les deux formulaires utilisent les mêmes `id` (`bk-name`, `bk-contact`, `bk-classe`, `bk-obs`) ; ouvrir le formulaire R2 alors que le formulaire R1 est rempli recopie ces valeurs (effet de `captureUi`/`restoreUi`, probablement involontaire mais pratique).
10. **Doublon sans récapitulatif** : en cas de `_duplicate`, seul un toast s'affiche ; l'utilisateur dont la première réponse s'est perdue n'a pas de récapitulatif.
11. **Message d'ajustement R2** : renvoie à l'e-mail même si l'e-mail n'a pas pu partir (l'avertissement d'échec d'e-mail est alors masqué).
12. **Jour complet** : aucun texte « Complet » dans la fiche R1/R2, seulement la couleur et les chiffres de la pastille.
