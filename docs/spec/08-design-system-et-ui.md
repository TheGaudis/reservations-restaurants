# 08 — Design system et composants d'interface

Sources : `design-system.css` (jetons, thèmes, composants communs, animations, accessibilité), `app.css` (styles propres à la page), `js/interface.js` (récapitulatif, icônes, boutons segmentés, apparitions), `index.html` (structure), `charte-graphique.pdf` (édition du 1er octobre 2026, 7 pages, « les valeurs de ce document sont lues directement dans design-system.css ») et `README.md` (section « Charte graphique »).

---

## 1. Jetons (`:root` de `design-system.css`) — à conserver tels quels

### 1.1 Couleurs d'identité (logo)

| Jeton | Valeur | Contraste sur blanc (charte) | Usage |
| --- | --- | --- | --- |
| `--ab-green` | `#A9C23F` | 2,0:1 | Aplats, bandeau, filets, pastille du R1. **Jamais pour du texte.** |
| `--ab-green-ink` | `#4E6614` | 6,5:1 | Texte et boutons du R1 (accent du thème vert) |
| `--ab-green-deep` | `#3B4F0D` | 9,1:1 | Survol et titres du R1 |
| `--ab-blue` | `#1F4E9E` | 7,9:1 | Action principale, focus, chiffres clés |
| `--ab-blue-ink` | `#173D7D` | 10,5:1 | Survol du bleu, titres, totaux |
| `--ab-magenta` | `#A3237F` | 6,8:1 | Accent du R2 (boutons, titres) |
| `--ab-magenta-ink` | `#86196A` | 8,9:1 | Survol et titres du R2 |
| `--ab-grey` | `#8C8C8C` | 3,4:1 | Repère « aujourd'hui », pastilles. **Jamais pour du texte.** |
| `--ab-gradient` | `linear-gradient(100deg, var(--ab-green) 0 33.4%, var(--ab-blue) 33.4% 66.7%, var(--ab-magenta) 66.7% 100%)` | — | Bandeau tricolore (bandes nettes) |

### 1.2 Surfaces, bordures, texte

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `--bg` | `#F3F4F0` | Fond de page « papier » |
| `--surface` | `#FFFFFF` | Cartes, panneaux, champs |
| `--surface-alt` | `#F8F9F6` | Surface secondaire, survols neutres |
| `--tint` | `var(--surface-alt)` | Teinte de fond propre à un thème (redéfinie par les thèmes) |
| `--border` | `#E2E4DD` | Séparateurs, contours de carte |
| `--border-strong` | `#D6D9D1` | Contours secondaires (champs désactivés, tableaux imprimés) |
| `--border-hover` | `#C4C8BE` | Survol d'un contour neutre |
| `--outline` | `#8A8F84` | Contour porteur de sens (champs, boutons segmentés) : 3,3:1 |
| `--text` | `#1F2328` | Texte principal (15,8:1) |
| `--text-muted` | `#646A70` | Descriptions, libellés, notes (5,5:1) |
| `--text-subtle` | `#6E7378` | Placeholders (4,8:1) |
| `--text-on-accent` | `#FFFFFF` | Texte sur aplat d'accent ou d'état |

### 1.3 Accent (surchargé par les thèmes)

| Jeton | Valeur par défaut (bleu) |
| --- | --- |
| `--accent` | `var(--ab-blue)` |
| `--accent-ink` | `var(--ab-blue-ink)` |
| `--accent-soft` | `rgba(31,78,158,.08)` — survols, halos, jours ouverts |
| `--accent-container` | `rgba(31,78,158,.14)` — sélection tonale (segment actif, bouton icône tonal) |

### 1.4 États

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `--success` / `--success-soft` | `#4E7A12` (5,1:1) / `rgba(78,122,18,.12)` | Places disponibles, confirmation |
| `--warning` / `--warning-soft` | `#9A600A` (5,2:1) / `rgba(154,96,10,.12)` | Bientôt complet, avertissements |
| `--danger` / `--danger-soft` / `--danger-border` | `#B7372F` (5,8:1) / `rgba(183,55,47,.10)` / `rgba(183,55,47,.32)` | Complet, erreurs, suppression |

### 1.5 Typographie

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `--font-display` | `'Outfit', system-ui, sans-serif` | Titres (500 à 700) |
| `--font-body` | `'Work Sans', system-ui, sans-serif` | Tout le reste (400 à 600) |
| `--fs-2xs` | `.7rem` | Surtitres en capitales, jours de la semaine, badges |
| `--fs-xs` | `.76rem` | Libellés, badges, petites notes, boutons compacts |
| `--fs-sm` | `.84rem` | Boutons, descriptions, listes |
| `--fs-md` | `.88rem` | Champs, texte courant compact |
| `--fs-lg` | `.94rem` | Texte mis en avant (menu, totaux, toasts) |
| `--fs-xl` | `1.05rem` | Titres de carte (date de la fiche) |
| `--fs-2xl` | `1.3rem` | Titres de section (nom du restaurant) |
| `--fs-3xl` | `1.75rem` | Titre de page (M3 Headline Medium, 28 px) |
| `--fs-3xl-sm` | `1.5rem` | Titre de page sur mobile |
| `--fw-regular` / `--fw-medium` / `--fw-semibold` / `--fw-bold` | `400` / `500` / `600` / `700` | |
| `--lh-title` / `--lh-body` | `1.25` / `1.55` | |
| `--tracking-caps` | `.1em` | Interlettrage des capitales |

Corps de page : `font-size: 15px` (valeur en dur dans `body`), `line-height: var(--lh-body)`, lissage antialiasé. Titres `h1–h3` : `--font-display`, `letter-spacing:-.01em`, `text-wrap:balance`.

**Polices Google Fonts** : `https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Work+Sans:wght@400;500;600&display=swap`, chargées **sans bloquer l'affichage** (`<link rel="preload" as="style" onload="this.rel='stylesheet'">` + `<noscript>` de secours), avec `preconnect` vers `fonts.googleapis.com` et `fonts.gstatic.com`. Repli : `system-ui, sans-serif` en attendant.

### 1.6 Espacements, rayons, ombres

| Jeton | Valeur | | Jeton | Valeur | Usage |
| --- | --- | --- | --- | --- | --- |
| `--space-1` | 4px | | `--radius-xs` | 6px | badges, pastilles |
| `--space-2` | 8px | | `--radius-sm` | 9px | boutons, champs, cases |
| `--space-3` | 12px | | `--radius` | 14px | cartes, panneaux |
| `--space-4` | 16px | | `--radius-lg` | 18px | grands blocs (en-tête, colonnes) |
| `--space-5` | 20px | | `--radius-full` | 999px | pilules, ronds |
| `--space-6` | 24px | | | | |
| `--space-8` | 32px | | | | |
| `--space-10` | 40px | | | | |

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `--shadow` | `0 1px 2px rgba(31,40,30,.05), 0 8px 24px -12px rgba(31,40,30,.14)` | cartes, en-tête, colonnes, panneaux |
| `--shadow-pop` | `0 12px 30px -10px rgba(31,40,30,.3)` | toasts, sélecteur de date |

### 1.7 Mouvement

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `--ease` | `cubic-bezier(.2,.8,.2,1)` | survols et apparitions (courbe par défaut) |
| `--ease-standard` | `cubic-bezier(.2,0,0,1)` | ce qui reste à l'écran : couleur, icône, dépliage, axes partagés X/Z |
| `--ease-enter` | `cubic-bezier(.05,.7,.1,1)` | ce qui entre (toast, fiche, formulaire, coche) |
| `--ease-exit` | `cubic-bezier(.3,0,.8,.15)` | ce qui sort |
| `--dur-fast` | `.12s` | appui, fermetures |
| `--dur` | `.2s` | survols, sorties, changement de jour |
| `--dur-slow` | `.35s` | apparition d'une fiche, dépliage ; **aussi délai d'affichage du voile de chargement** (lu en JS par `tokenMs`) |

Durées en dur (hors jetons) : entrée du toast 0,3 s, glissement du libellé du calendrier 300 ms, indicateur circulaire 1 568 ms / 1 333 ms / 3 999 ms, squelette 1,3 s.

### 1.8 Interaction, plans, alertes

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `--touch-target` | `48px` | zone tactile minimale |
| `--state-hover` | `.08` | calque d'état au survol |
| `--state-press` | `.12` | calque d'état à l'appui et au focus |
| `--focus-width` | `3px` | anneau de focus clavier |
| `--past-opacity` | `.55` | jour passé (case et fiche) |
| `--outside-opacity` | `.35` | jour hors du mois affiché |
| `--dot-size` | `6px` | pastilles |
| `--z-toast` / `--z-loader` | `50` / `60` | plans |
| `--alert-bar` | `6px` | filet gauche des alertes et toasts |
| `--alert-icon` | `28px` | icône des alertes et toasts |
| `--alert-tint` | `9%` | part de la couleur d'état dans le fond |
| `--alert-edge` | `35%` | part de la couleur d'état dans le contour |
| `--alert-ink` | `75%` | part de la couleur d'état dans le titre (≥ 4,5:1) |
| `--note-ink` | `70%` | part de la couleur d'état dans le texte d'une note |
| `--note-bar` | `4px` | filet gauche des notes |
| `--icon-glyph` | `70%` | taille du pictogramme dans sa pastille |
| `--toast-scale` | `.96` | réduction de départ d'un toast |

---

## 2. Thèmes d'accent (à poser sur un conteneur)

| Classe | `--accent` | `--accent-ink` | `--accent-soft` | `--accent-container` | `--accent-mark` | `--tint` | `--border` | `--text-muted` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| *(aucune, bleu)* | `--ab-blue` | `--ab-blue-ink` | `rgba(31,78,158,.08)` | `rgba(31,78,158,.14)` | — | `--surface-alt` | `#E2E4DD` | `#646A70` |
| `.accent-green` (R1) | `--ab-green-ink` | `--ab-green-deep` | `rgba(169,194,63,.18)` | `rgba(169,194,63,.32)` | `--ab-green` | `#F6F9EC` | `#E4E8D6` | `#5E6653` |
| `.accent-magenta` (R2) | `--ab-magenta` | `--ab-magenta-ink` | `rgba(163,35,127,.10)` | `rgba(163,35,127,.16)` | `--ab-magenta` | `#FBF2F8` | `#EEDDE8` | `#6A5A65` |

Tout ce que contient la colonne (boutons primaires, calendrier, fiche, segments, focus, champs) prend la couleur du restaurant. L'en-tête et les panneaux du haut (Paramètres, Demain) restent bleus.

---

## 3. Base

- `* { box-sizing: border-box }`.
- `html` : `scroll-behavior: smooth`, `interpolate-size: allow-keywords` (animation de hauteur jusqu'à `auto`), `scrollbar-gutter: stable`.
- `body` : fond `--bg` + deux halos radiaux décoratifs (vert à droite en haut `rgba(169,194,63,.13)`, bleu à gauche `rgba(31,78,158,.07)`).
- **Focus visible** : `:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px }` (clavier seulement). Champs : bordure + halo (voir §4.6).
- `.kicker` : surtitre `--fs-2xs`, 600, capitales, `--tracking-caps`, `--text-muted`.
- `.text-muted`, `.num` (chiffres tabulaires).

---

## 4. Composants CSS

### 4.1 Bandeau tricolore `.ab-stripe`
Barre de 6 px au dégradé `--ab-gradient`, tout en haut de la page (`aria-hidden`).

### 4.2 Boutons `.btn`

| Variante | Apparence | Usage |
| --- | --- | --- |
| `.btn` (neutre) | fond `--surface`, bordure `--border`, texte `--text`, 500 | « Modifier ce jour », « Modifier », « Fermer »… |
| `.btn.primary` | aplat `--accent`, texte blanc, 600, ombre `0 6px 14px -8px var(--accent)` | action principale, **une par zone** (« Réserver », « Valider », « Ouvrir ce jour », « Enregistrer », « Réessayer ») |
| `.btn.ghost` | transparent, texte `--text-muted` | « Annuler », « Aujourd'hui », « + Ajouter un plat » |
| `.btn.danger` | transparent, bordure `--danger-border`, texte `--danger` | suppressions |
| `.btn.danger.armed` | aplat `--danger`, texte blanc, onde `pulse-armed` (0,35 s, une fois) | 2e clic de confirmation (« Confirmer ? ») |
| `.btn.small` | hauteur 32 px, padding 0 12 px, `--fs-xs` | actions secondaires des listes (mode collègue) |

Dimensions : `min-height: 40px`, padding 0 16 px, `--fs-sm`, rayon `--radius-sm`, `gap: 8px` (icône + texte).

États :
- **Survol** (souris seulement, `@media (hover:hover)`) : neutre → `--surface-alt` + `--border-hover` ; primary → `--accent-ink` ; ghost → `--accent-soft` + `--accent-ink` ; danger → `--danger-soft` + bordure `--danger`.
- **Appui** : `translateY(1px) scale(.985)` ; neutre/ghost → fond `--accent-soft` + bordure teintée ; primary → `--accent-ink`.
- **Focus** : anneau global.
- **Désactivé** : opacité .38, `cursor: not-allowed`, pas d'ombre ni de transformation.
- **Occupé** (JS `setBusy`) : désactivé + `aria-busy="true"` + libellé « … en cours » (« Envoi en cours… », « Enregistrement… », « Ouverture en cours… », « Ajout en cours… », « Nouvelle tentative… »).
- **Écran tactile** (`pointer:coarse`) : `.btn` ≥ 44 px ; `.btn.small` ≥ 36 px + zone invisible `::after` de 6 px au-dessus et au-dessous (≈ 48 px).

### 4.3 Calque d'état Material 3
Pour `.icon-btn`, `.seg-btn`, `.dp-day` : `::before` couleur `currentColor`, opacité 0 → `.08` au survol, `.12` au focus clavier et à l'appui (transition 0,12 s linéaire). Le composant porte `position:relative; isolation:isolate`.

### 4.4 Bouton icône `.icon-btn`
Rond de 40 px, transparent, icône `--text-muted` 24 px (`fill: currentColor`) ; zone tactile 48 px (`::after`, inset −4 px) ; survol → `--accent-ink` ; appui → icône `scale(.88)` ; désactivé .38. Variante `.tonal` : fond `--accent-container`, icône `--accent-ink` (‹ › du calendrier). Icônes au trait (`svg.icon`) : 20 px, sans remplissage. **Toujours un `aria-label`.**

### 4.5 Bouton segmenté `.seg-group` / `.seg-btn` (Material 3)
- Seul composant de choix exclusif (2 à 5 options) : « Client / Collègue », « Semaine / Mois », « À emporter / Sur place ». Une action (« Aujourd'hui ») n'entre jamais dans le groupe.
- Conteneur : `role="group"` + `aria-label`, contour 1 px `--outline`, pilule, fond `--surface`. `.block` = pleine largeur ; `.small` = 32 px (zone tactile 48 px via `::after` inset −8 px) ; `.mode-switch` (en-tête) : segments ≥ 108 px.
- Segment : hauteur 40 px, padding 0 16 px, `--fs-sm` 500, séparateur `--outline` ; arrondis à gauche du premier, à droite du dernier, pilule complète si seul (`:only-child`).
- Sélectionné (`aria-pressed="true"`) : fond `--accent-container`, texte `--accent-ink` 600, **coche** (`.seg-check`, 18 px, 16 px en `.small`) qui s'ouvre en largeur devant le libellé.
- `.seg-pop` (posée en JS sur le segment qu'on vient de choisir) : rebond `seg-select` (scale .96 → 1) + coche `seg-check-in`, 0,35 s. Pas d'animation au simple réaffichage.

### 4.6 Champs de formulaire
- `input`, `select`, `textarea` : fond `--surface`, contour 1 px `--outline`, rayon `--radius-sm`, padding 8 × 12 px, `--fs-md`, largeur 100 %, hauteur min 40 px.
- Placeholder `--text-subtle`. Survol (souris) : bordure `--text-muted`.
- **Focus** : `outline:none`, bordure `--accent`, `box-shadow: 0 0 0 1px var(--accent), 0 0 0 4px var(--accent-soft)` (effet bordure 2 px + halo).
- Désactivé : fond `--surface-alt`, bordure `--border-strong`, texte `--text-muted`, `not-allowed`.
- `label` : `--fs-xs`, 500, `--text-muted`, marge basse 4 px. Chaque `label` d'un `.field` est relié à son champ en JS (`linkLabels` : `for`/`id` générés `champ-N`).
- `.field` : marge basse 12 px. `.field-help` (aide) : `--fs-xs`, `--text-muted`, reliée par `aria-describedby`.
- `.field-group` (fieldset) : sans bordure ; `legend` en `--fs-xs` 600 `--text`.
- **Erreur** : conteneur `.has-error` → bordure `--danger` + halo `0 0 0 3px var(--danger-soft)` (prioritaire) ; l'aide est masquée ; message `.field-error` (`--fs-xs`, 500, `--danger`) précédé d'une pastille ronde rouge 15 px contenant « ! » blanc ; apparition `rise` 0,2 s. Le champ reçoit `aria-invalid="true"` et `aria-describedby="{id}-error [id-aide]"`. Saisir dans le champ retire l'erreur.
- Mobile (`pointer:coarse` ou ≤ 760 px) : police des champs 16 px (pas de zoom iOS).
- **Case à cocher** `label.check > input[type=checkbox]` : case native 18 px, `accent-color: var(--accent)`, libellé `--fs-sm` 500 cliquable, hauteur min 48 px, focus = anneau global.
- `.row2` (2 colonnes), `.row3` (3 colonnes alignées en bas) : 1 colonne sous 520 px.
- `.form-total` : 600, chiffres tabulaires ; masqué s'il est vide. Totaux publics `#bk-r1-total`, `#bk-r2-total` en `--accent-ink`.

### 4.7 Sélecteur de date `.date-field` / `.date-trigger` / `.date-picker`
Voir comportement dans `06-mode-collegue.md` §3. Champ déclencheur à l'allure d'un champ (icône calendrier 24 px à droite, `--accent-ink` quand ouvert). Calendrier : largeur max 360 px, padding 12 px, bordure `--border`, rayon `--radius`, ombre `--shadow-pop`, entrée `dp-in` (0,2 s). Jours ronds ≤ 40 px ; aujourd'hui : contour accent ; choisi : aplat accent ; passé : .38 ; pastille « déjà ouvert » `.dp-dot` 6 px accent (blanche sur le jour choisi).

### 4.8 Jauge de capacité `.capacity-pill`
`--fs-xs` 600, padding 4 × 8 px, rayon `--radius-xs`, largeur min 76 px, chiffres tabulaires, centrée. Variable `--cap` = couleur d'état (`.cap-ok` → `--success`, `.cap-low` → `--warning`, `.cap-full` → `--danger`, défaut `--text-muted`). Fond : dégradé horizontal `color-mix(--cap 20 %)` jusqu'à `--pct` puis `color-mix(--cap 6 %)` ; texte `color-mix(--cap 65 %, --text)` ; bordure `color-mix(--cap 30 %)`. Pastilles du calendrier : `.dot-cap-ok|low|full` (fond plein de la couleur d'état).

### 4.9 Badge d'état `.tag` / `.tag.admin-on`
Défini (petit badge avec pastille grise, variante bleue « admin ») mais **non utilisé** par la page.

### 4.10 Panneaux et cartes
- `.panel` : fond `--surface`, bordure `--border`, rayon `--radius`, padding 16 px, marge basse 16 px, ombre `--shadow`.
- `.card-top-accent` : filet haut 4 px `--accent` (récapitulatifs ; jaune `--warning` si `.has-warning`).
- `.day-card` (fiche du jour) : fond `--tint`, bordure `--border`, rayon `--radius`, padding 16 px.
- `.item-row` (plat) : fond `--surface`, bordure, rayon `--radius-sm`, padding 8 × 12 px.
- `.panel.add-day` (« Ouvrir un jour ») : sans padding, bordure **pointillée** `color-mix(--accent 45 %, --border)`, fond `--tint`, sans ombre ; ouvert → bordure pleine, fond `--surface`, ombre.
- `.panel.settings-panel` (Paramètres) : même logique, en neutre.

### 4.11 Panneau dépliant `details.disclosure`
Contenu (`::details-content`) animé en hauteur + fondu : ouverture 0,35 s `--ease-standard`, fermeture 0,2 s `--ease-exit`. Sans prise en charge : ouverture instantanée. Indicateur dans le `summary` : « + » dans un rond plein d'accent 24 px qui pivote de 45° (Ouvrir un jour) ou chevron qui pivote de 180° (Paramètres). Zone de 48 px. Marqueur natif masqué.

### 4.12 Encadré d'alerte `.alert` (`.alert.warning`)
Flex : icône (28 px, couleur d'état) + texte (`.alert-text`, `--fs-lg` 500, titre en `<b>` coloré à 75 %) + action. Fond `color-mix(état 9 %, --surface)`, contour `color-mix(état 35 %)`, filet gauche 6 px de la couleur d'état, rayon `--radius`, padding 16 × 20 px, sans ombre. Utilisé pour l'erreur de chargement (`.load-error-box`, visible seulement quand `body.load-error`) : icône « error », texte en `role="alert"`, bouton « Réessayer » (primary).

### 4.13 Note d'avertissement `.note-warning`
Fond `--warning-soft`, filet gauche 4 px `--warning`, texte `color-mix(--warning 70 %, --text)` 600 `--fs-md`, padding 12 × 16 px, rayon `--radius-sm`. Utilisée pour la clôture des commandes R2 et l'avertissement du récapitulatif.

### 4.14 Notification `.toast`
- Élément unique `#toast` (`role="status"`, `aria-live="polite"`), fixé en bas au centre (24 px du bas), `z-index: 50`, largeur `max-content` (max `100vw − 32px`).
- Fond teinté de la couleur d'état (9 %), contour 35 %, filet gauche 6 px, texte `--text` `--fs-lg` 500, rayon `--radius-sm`, ombre `--shadow-pop`.
- Pastille-icône ronde 28 px pleine de la couleur d'état avec pictogramme **évidé** (masque CSS) : coche (succès, `--success`) ou « ! » (`.error`, `--danger`). Décorative.
- Apparition : `.show` → opacité 1, translation 12 px → 0, échelle .96 → 1, 0,3 s `--ease-enter` ; disparition 0,2 s `--ease-exit`. Durée d'affichage : 3,5 s (JS).

### 4.15 Voile de chargement `.loader` + `.spinner`
- Plein écran, fond `color-mix(--bg 85 %, transparent)`, `z-index: 60`.
- `.blocking` : clics bloqués aussitôt (et `.wrap` inerte) ; `.show` : visible après `--dur-slow` (JS, valable même animations réduites), texte « Chargement… » inséré dans `<p role="status">`.
- Indicateur circulaire M3 multicolore 48 px, trait 4 px arrondi : rotation 1 568 ms, arc 1 333 ms, couleur vert-ink → bleu → magenta tous les 1 333 ms ; en pause quand le voile est caché. `aria-label="Chargement en cours"`.

### 4.16 Squelette `.sk`
Dégradé gris animé (`shimmer` 1,3 s). Formes : `.sk-circle` 40 px, `.sk-line` 14 px, `.sk-grid` 7 cases carrées, `.sk-card` 120 px. Placé dans `#cal-r1` / `#cal-r2` du HTML initial, remplacé au premier rendu ; animation arrêtée en cas d'erreur de chargement.

### 4.17 Signature tricolore `.brand-signature`
Texte centré `--fs-2xs` `--text-muted`, encadré de deux traits de 34 × 3 px au dégradé vert-bleu-magenta. Pied de page : « Lycée professionnel Aristide Briand · Restaurants pédagogiques ».

### 4.18 Marque oblique `.slash-mark`
`::before` : trait de 7 px × 1,05 em, incliné −22°, rayon 2 px, couleur `--accent-mark` (ou `--accent`). **Uniquement devant le nom d'un restaurant.**

### 4.19 Tableaux
Aucun tableau à l'écran : les réservations sont des lignes `.booking-row` (flex, `--fs-sm`, `--text-muted`, nom en `--text`, séparateur pointillé). Les tableaux n'existent que dans les documents imprimés (`07-impression.md`).

### 4.20 Bandeau de configuration `.setup-banner`
Aplat `--danger`, texte blanc centré `--fs-sm`. Texte : « ⚠ Configuration manquante : ouvre ce fichier et remplace APPS_SCRIPT_URL par l'URL de ton déploiement Apps Script (tout en haut du fichier, dans le &lt;head&gt;). » Affiché si `APPS_SCRIPT_URL` contient « COLLE_ICI ».

### 4.21 Classes propres à la page (app.css), récapitulatif
`.wrap`, `header.top`, `.brand*`, `.mode-box`, `.mode-switch`, `.admin-login*`, `.summary-*`, `.dash-title`, `.columns`, `.col`, `.col-head`, `.desc`, `.cal-*`, `.wd-label`, `.day-*`, `.menu-block`, `.menu-text`, `.item-*`, `.draft-item-row`, `.draft-head`, `.booking-form`, `.form-reveal*`, `.menu-list*`, `.row2`, `.row3`, `.form-total`, `.form-submit`, `.qty-input` (72 px), `.mode-choice`, `.mode-help`, `.bookings-list`, `.booking-row*`, `.empty(.compact)`, `.foot-note`, `.foot-brand`, `.add-day*`, `.settings-*`, `.setup-banner`, `.sk-*`, `.text-updated`, `.load-error-box`, `.confirm-*`, `.closed-note`.

---

## 5. Animations et apparitions

| Animation | Définition | Utilisée pour |
| --- | --- | --- |
| `rise` | de `opacity:0; translateY(6px)` vers l'état normal (pas d'étape « to ») | fiche du jour (`.day-card.enter`, 0,35 s), formulaires (`.booking-form.enter`, 0,2 s), récapitulatif (0,35 s), messages d'erreur (0,2 s) |
| `sink` | vers `opacity:0; translateY(-4px)` | fermeture d'un formulaire (`.booking-form.leaving`, 0,12 s) |
| `reveal-open` / `reveal-close` | grille `0fr ↔ 1fr` | formulaire public R1 qui se déplie depuis « Réserver » (0,35 s) / se replie (0,12 s) |
| `menu-up` / `menu-down` | grille + opacité | liste des plats R2 repliée / redéployée (0,35 s) |
| `axis-in-next` / `axis-in-prev` | ±24 px + fondu, 300 ms | libellé du calendrier sans transitions de vue |
| `seg-select`, `seg-check-in` | rebond et coche | segment choisi |
| `pulse-armed` | onde rouge 0 → 6 px | bouton de suppression armé |
| `check-pop` | `scale(.5)` → 1 | coche du récapitulatif (après 0,12 s) |
| `text-swap` | fondu | nom/description qui change (`.text-updated`, 0,35 s) |
| `dp-in` | −4 px, scaleY .96 | sélecteur de date |
| `login-unclip` | `overflow: visible` après 0,35 s | panneau de connexion (ne plus rogner les anneaux de focus) |
| `spinner-*`, `shimmer` | | chargement |
| Transitions de vue du calendrier | voir `05` §3.4 | ‹ ›, Semaine/Mois, changement de jour |

**Principe JS (interface.js)** : tout est réaffiché à chaque `render()`, donc on n'anime que ce qui vient de changer :
- `enterOnce(clé)` : renvoie `' enter'` une seule fois pour la clé posée juste avant le rendu (`enterKey`), puis l'efface. Clés : `bk-{date}` (formulaire public), `eb-{id}` (modification réservation), `ab-{clé}` (ajout personne), `ei-{id}` (modification plat), `ai-{date}` (ajout plat), `day-{date}` (modification jour R1).
- `leaveThen(clé, suite)` : ajoute `.leaving` au formulaire `[data-form="{clé}"]`, attend `--dur-fast` (120 ms), puis exécute `suite` (fermeture réelle) — sauf si la page a été réaffichée entre-temps ; immédiat si animations réduites ou formulaire absent ; double clic ignoré.
- `cardEnter(rest, iso)` / `lastCard` / `cardKey` : la fiche n'entre qu'au changement de jour ou de mode (`·a` / `·c`).
- `popSeg(clé)` : relance l'animation `seg-pop` du segment `[data-seg="{clé}"]` (retire la classe, force un reflow, la remet).
- `reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')`.

**`prefers-reduced-motion: reduce`** : toutes les animations et transitions coupées (`!important`), indicateur de chargement figé en arc visible, défilement non animé, `::details-content` sans transition, transitions de vue du calendrier désactivées en JS, fermetures immédiates.

---

## 6. Composants de `interface.js`

### 6.1 Récapitulatif de réservation (`confirmationHtml(rest)`)

Affiché au-dessus de la fiche du jour après une réservation publique réussie, **si** `bookingConfirmation.rest === rest` **et** `bookingConfirmation.date === calState[rest].selected`. Fermé par « Fermer », par la sélection d'un autre jour ou par l'ouverture d'un nouveau formulaire.

```html
<div class="panel card-top-accent confirm-card [has-warning] [enter]" role="status">
  <div class="confirm-head">
    <span class="confirm-check" aria-hidden="true">(ICONS.check)</span>
    <div><div class="confirm-title">Réservation enregistrée</div><div class="confirm-sub">{formatDate(date)}</div></div>
  </div>
  [<p class="note-warning confirm-warning">{avertissement}</p>]
  <ul class="confirm-lines"><li><span>{libellé}</span><b>{valeur}</b></li>…</ul>
  [<div class="confirm-total"><span>Total</span><b>{total}</b></div>]
  <p class="confirm-note">Pour annuler ou modifier, contactez {contactAnnulation | « l'établissement »}.</p>
  <button class="btn small">Fermer</button>
</div>
```

- Animation d'entrée une seule fois (`shown`), pas à chaque actualisation ; coche ronde verte 36 px qui apparaît après la carte.
- Avertissement → filet haut jaune (`.has-warning`).
- Contenu des lignes/total/avertissement : fourni par la réservation publique (`04-parcours-public-reservation.md`).

### 6.2 Icônes SVG inline

**Icônes au trait** (`ICONS`, viewBox 24, 16 × 16, `stroke="currentColor"`, trait 2, `aria-hidden`, classe `icon`) :

| Clé | Dessin | Utilisation |
| --- | --- | --- |
| `print` | imprimante | boutons « Imprimer la liste » et « Imprimer » du résumé |
| `settings` | curseurs de réglage | résumé « Paramètres » |
| `check` | coche | récapitulatif de réservation |
| `eye` | œil | **non utilisée** |

**Icônes pleines Material Symbols** (viewBox `0 -960 960 960`, `fill: currentColor`) :

| Constante / lieu | Symbole | Utilisation |
| --- | --- | --- |
| `EYE_ON` / `EYE_OFF` (collegue.js) | visibility / visibility_off | afficher / masquer le mot de passe |
| `CAL_ICON` (collegue.js) | calendar_today | champ Date de « Ouvrir un jour » |
| `CHEVRON_PREV` / `CHEVRON_NEXT` (collegue.js) | chevron_left / chevron_right | calendriers et sélecteur de date |
| `SEG_CHECK` (interface.js) | check | coche des segments sélectionnés |
| chevron des Paramètres (collegue.js) | expand_more | indicateur du panneau |
| croix « Retirer le plat » (collegue.js) | close | lignes de plats de « Ouvrir un jour » R2 |
| encadré d'erreur (index.html) | error | erreur de chargement |
| toast (CSS, masque data-URI) | check / priority_high | succès / erreur |

Favicon : SVG inline (traits obliques du logo vert/bleu/magenta sur carré blanc arrondi).

### 6.3 Bouton segmenté (`segGroup(ariaLabel, items, cls)`)

```js
items = [{ key, label, pressed, onclick, attrs? }]
→ <div class="seg-group {cls}" role="group" aria-label="{ariaLabel}">
     <button type="button" class="seg-btn" data-seg="{key}" aria-pressed="{pressed}" onclick="…" {attrs}>
       <span class="seg-check" aria-hidden="true">(SEG_CHECK)</span><span>{label}</span>
     </button>…
   </div>
```

Instances : « Mode d'accès » (`mode-client`, `mode-colleague`, classe `mode-switch`), « Affichage du calendrier » (`cal-r1-week`, `cal-r1-month`, … classe `small`), « Mode de service » (`service-emporter`, `service-surplace`, classes `block mode-choice`). Le sélecteur de mode est créé une fois puis seulement mis à jour (pour que les transitions jouent).

### 6.4 Suggestions de prix (`renderPriceSuggestions`)
Remplit `<datalist id="price-suggestions">` avec les prix distincts des plats R2 (non vides), triés par ordre croissant ; partagé par tous les champs Prix.

---

## 7. Layout

### 7.1 Ordre de la page (`index.html`)

1. `#setupBanner` (masqué sauf configuration manquante) ;
2. `.ab-stripe` (6 px) ;
3. `.wrap` (largeur max 1 040 px, centrée ; padding 28 px en haut, 64 px en bas, `max(20px, safe-area)` sur les côtés) :
   1. `header.top` : `.brand` (logo + textes) et `#modeBox` (sélecteur Client/Collègue + connexion) ;
   2. `#dashboard` (collègue) ;
   3. `#settings` (collègue) ;
   4. `.alert.load-error-box` (erreur de chargement) ;
   5. `#summary-tomorrow` (collègue) ;
   6. `<datalist id="price-suggestions">` ;
   7. `.columns` : `#col-r1.accent-green` et `#col-r2.accent-magenta` ;
   8. `p.foot-note` : « Les places se mettent à jour automatiquement toutes les 3 minutes. Vous pouvez aussi actualiser la page. » ;
   9. `p.brand-signature.foot-brand` ;
4. `#toast` ; `#loader`.

### 7.2 En-tête
- Carte blanche (`--surface`, bordure, `--radius-lg`, `--shadow`, padding 24 px, marge basse 24 px), filigrane de traits obliques tricolores en haut à droite (opacité .10).
- `.brand` (flex `1 1 420px`, écart 20 px) : **logo** `img.brand-logo` (PNG en data URI, `alt="Lycée Aristide Briand"`) **96 px de haut** ; `.brand-text` séparé par un filet gauche `--border` (padding 20 px) : surtitre « Lycée professionnel Aristide Briand » (`.kicker`, interlettrage .12em), `h1` « Réservations des restaurants pédagogiques et Aristide » (`--fs-3xl`, 600, max 26 ch), sous-titre `#page-subtitle` « Table côté {name1} · Plats à emporter ou sur place côté {name2} » (`--fs-md`, `--text-muted`, max 60 ch).
- `#modeBox` : aligné à droite.
- Logo : 5 clics en moins de 2 s ouvrent une vidéo YouTube dans un nouvel onglet (« easter egg » de `main.js`).

### 7.3 Grille des restaurants
- `.columns` : 2 colonnes égales, écart 24 px, alignées en haut ; **1 colonne sous 760 px**.
- `.col` : carte blanche, `--radius-lg`, padding 24/20/20 px, ombre ; liseré haut de 6 px : R1 vert (72 %) puis bleu, R2 bleu (28 %) puis magenta.
- `h2` du restaurant : `--fs-2xl`, 600, couleur `--accent-ink`, marque oblique. Description : `--fs-sm`, `--text-muted`, max 52 ch.

### 7.4 Points de rupture

| Condition | Effet |
| --- | --- |
| `max-width: 760px` | colonnes empilées ; champs à 16 px |
| `max-width: 640px` | `.wrap` padding 16/16/48 px ; en-tête padding 16 px ; marque en colonne ; **logo 64 px** ; plus de filet à côté du logo ; titre `--fs-3xl-sm` ; sélecteur de mode à gauche, pleine largeur ; champ mot de passe extensible ; colonnes padding 24/16/16 px |
| `max-width: 600px` | grille des Paramètres sur 1 colonne |
| `max-width: 520px` | `.row2`, `.row3` sur 1 colonne |
| `pointer: coarse` | champs 16 px ; boutons ≥ 44 px (small ≥ 36 + zone) ; cases du calendrier ≥ 48 px |
| `hover: hover` | survols activés uniquement à la souris |

### 7.5 Impression
- Documents imprimés : fenêtre séparée, voir `07-impression.md`.
- Page principale : **aucune règle `@media print`**.

### 7.6 Accessibilité transversale
- Annonces : toast `role="status"` (poli) ; erreur bloquante `role="alert"` ; libellés de calendrier `aria-live="polite"` ; voile `role="status"`.
- Icônes seules : `aria-label` explicite, SVG `aria-hidden`.
- Jours : date et disponibilité en toutes lettres dans l'`aria-label`.
- Focus préservé et restauré par `render()` (`captureUi`/`restoreUi`) ; si l'élément a disparu, focus sur la date de la fiche (`tabindex=-1`) ou le premier bouton de la zone.
- `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation` sur boutons et `summary` ; `user-select: none` sur boutons, jauges, badges.

---

## 8. Règles de la charte (PDF + README)

**Principes**
- Le **bleu fait agir** (`--accent`) : boutons principaux, focus, chiffres clés. **Un seul bouton principal par zone.**
- Le **vert et le magenta disent « où l'on est »** (R1 / R2), via `.accent-green` / `.accent-magenta` sur un conteneur ; jamais pour signaler un état.
- **Les couleurs d'état restent des états** (`--success`, `--warning`, `--danger`) : disponibilité, alertes, erreurs — **toujours avec un mot**.
- **Aucune couleur, taille ou rayon en dur** : toujours `var(--…)`. Seule exception : les fenêtres d'impression (et leurs boîtes de marge).
- **Contraste** : texte ≥ 4,5:1 (WCAG AA) ; repère graphique (bordure, icône, anneau) ≥ 3:1. Pour du texte sur blanc, utiliser les variantes « -ink ».
- Espacements : toujours un jeton (grille de 4 px).

**Rédaction**
- Vouvoiement pour le public ; tutoiement toléré pour les collègues.
- Libellés courts avec un verbe d'action : « Réserver », « Réessayer », « Ouvrir un jour ».
- Une erreur dit ce qui s'est passé et quoi faire.
- Dates en toutes lettres avec majuscule initiale (« Vendredi 25 septembre 2026 ») ; montants « 12,50 € » (virgule, **espace insécable** avant €, `formatEuro`). Le tiret « — » ajouté devant un prix est précédé d'une espace insécable (`dash`).
- Pas d'emoji dans l'interface ; seul « ⚠ » du bandeau de configuration est admis.

**Logo** : en haut à gauche, 96 px (64 px mobile), séparé du titre par un filet `--border` ; jamais redessiné, recoloré ni déformé ; l'emblème seul sert d'icône d'onglet.

**Interaction (Material 3)**
- Zones tactiles ≥ 44 px sur écran tactile ; petits boutons et boutons icônes : zone invisible portée à 48 px.
- Survol à la souris seulement ; appui : le bouton s'enfonce de 1 px et se teinte (seul retour sur mobile).
- Focus clavier : anneau `--accent` 3 px décalé de 2 px ; champ en saisie : bordure 2 px + halo `--accent-soft`.
- Désactivé : opacité 38 %. Jours passés et hors du mois pâlis ; aujourd'hui en contour.
- Champs : libellé relié, 40 px, exemples « Ex. … », mention « (optionnel) » ; groupes en `fieldset.field-group`.
- Erreurs : message `.field-error` sous le champ (remplace l'aide), `aria-invalid`, `aria-describedby`.
- Boutons : pendant un envoi « … en cours » + `aria-busy` ; suppression en deux clics (« Confirmer ? » à largeur figée, détail en `aria-label`) ; même libellé dans les deux restaurants ; une action principale et son « Annuler » restent à 40 px.

**Mouvement** : ce qui entre ralentit, ce qui sort accélère ; on n'anime que ce qui vient de changer ; tout est coupé avec `prefers-reduced-motion`.

---

## 9. Migration : à conserver / à simplifier

**À conserver tel quel (acquis)**
- `design-system.css` en entier comme **feuille globale** (jetons `:root`, thèmes `.accent-green` / `.accent-magenta`, composants). Les composants React doivent produire les mêmes classes (ou des modules CSS qui ne référencent que ces jetons).
- Les valeurs exactes des jetons, les seuils d'état, les tailles tactiles, l'anneau de focus, les règles `prefers-reduced-motion`.
- Les textes affichés (mot pour mot) et les formats (dates `fr-FR`, euros avec espace insécable).

**Pourrait être simplifié**
- `enterOnce` / `leaveThen` / `cardEnter` / `popSeg` : en React, les apparitions se gèrent au montage/démontage (composant de transition, `key` sur la fiche, état « en sortie »), sans clés globales.
- `captureUi` / `restoreUi` / `linkLabels` : inutiles avec des composants contrôlés, `htmlFor`/`useId` et une réconciliation qui ne détruit pas le DOM.
- Le sélecteur de mode « créé une fois puis mis à jour » : naturel en React.
- `PRINT_TOKENS` : inutile si l'impression se fait dans la même page ou un iframe recevant la feuille globale (voir 07).
- Classes non utilisées (`.tag`, `.admin-on`, `ICONS.eye`) : à retirer ou documenter comme réserve.
- `body { font-size: 15px }` et quelques valeurs en dur (`108px`, `170px`, `76px`, `260px`, durées 300 ms / 0,3 s) pourraient devenir des jetons.

---

## 10. Points d'attention

1. **Mot « complet » absent des fiches** : la charte (PDF p. 7, « Badges et jauges ») montre un badge « Complet » et exige un mot avec chaque couleur d'état, mais la jauge n'affiche que « 0 / 20 couverts ».
2. **Tutoiement** dans le bandeau « Configuration manquante » (« ouvre ce fichier… ») : toléré par la charte pour les collègues mais visible par le public si la configuration manque.
3. **Titre de page** « Réservations des restaurants pédagogiques et Aristide » écrit en dur dans `index.html`, alors que le nom du restaurant 2 est réglable (le sous-titre, lui, suit les paramètres).
4. **Pas de `@media print`** pour la page principale.
5. La charte cite « Revenir en mode client » comme libellé type : il n'existe pas dans l'interface.
6. `.tag` / `.tag.admin-on` et `ICONS.eye` sont définis mais inutilisés.
7. `font-size: 15px` du `body` et plusieurs largeurs sont en dur, contrairement à la règle « aucune taille en dur ».
8. Le thème vert redéfinit `--text-muted` (`#5E6653`) et `--border` dans la colonne R1 ; les copies de jetons pour l'impression lisent les valeurs de `:root` (non thématisées) — cohérent, mais à garder en tête si l'impression est rendue à l'intérieur d'une colonne.
9. Easter egg sur le logo (5 clics en 2 s → vidéo YouTube) : à décider (conserver ou non) lors de la migration.
