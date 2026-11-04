# Journal de la session P6 (b) — documents R2 et panneau « Demain » complet

*4 octobre 2026. Branche locale `claude/p6b-documents-r2`, partie de `0d8427d` (P4, P5 complète, P6 (a)). Pas de PR ni de push : l'orchestrateur fusionne la branche locale. Chromium de `/opt/pw-browsers/chromium`, ports 4840 / 4841 / 63440. Une autre session étudiait en même temps REG-02 et REG-05 (charge de la machine entre 12 et 17). La session s'est arrêtée une fois sur une limite d'usage, puis a repris sur le même worktree.*

## Commits

1. `7766b51` Impression : documents R2 et blocs du panneau « Demain » (07 § 4-7, D-07, E-16, E-44).
2. `9c3465c` Déconnexion : document imprimé retiré de la page (invariant 1, PLAN § 3.3.4).
3. `2e8b526` E2E : zone des notifications lue en média print (REG-40, I-00, E-15).
4. `fbf6918` CI : scénarios `@p6` sur le projet `react` (PLAN P6, REG-39 à REG-42).
5. Journal et colonne `react` de `parite.md` (ce commit).

## Fait

- `domain/print.ts` : `listR2(state, iso)` (instantané : nom du restaurant 2, jour ou `undefined`, commandes, plats du jour, total), type `ListR2`, `bookingAmounts(dish, portions)` (prix d'une ligne du document D, un ticket au plus) ; `Order.key` (clé de regroupement de 07 § 4.1, sert de clé React) ; `OrderLine.bookingId` ; `DishTotal.bookings` remplace `names` (clients du panneau, lignes du document D). Tests ajoutés à `print.test.ts` (projets `node` et `node-ny`).
- `features/print/list-r2.ts` : informations (« Thème », « Note » si non vides, « Ouvert par » ou « Non renseigné »), colonnes « Par client » et « Récapitulatif par plat », modes joints par « + » (textes « À emporter » / « Sur place » de `intl/common-messages.ts`), « {réservées} / {Stock} », « Total du jour » ; `r2Messages` partagés avec le document D.
- `ListDocumentR2.tsx` (document B, 07 § 4) : `h2` « Par client ({n}) », colonne « Plats » avec « **{qte}×** {plat} — {montant} » puis l'observation en gras italique, « Mode » en gras, récapitulatif par plat, total, signature.
- `TomorrowDocumentR2.tsx` (document D, 07 § 7) : « Ouvert par » seul, un `h3` par plat (« Lasagnes — 4,50 € l'unité », « {réservées} / {Stock} » à droite dans un `span`), un tableau par plat, « Aucune réservation. », « Aucun plat ouvert. », « Aucun jour ouvert pour demain. », total sans signature.
- `print-documents.ts` : `printListR2`, `printTomorrowR2` (instantané au clic, puis `import()`), `startPrinting` (gestionnaire de clic qui ne rejette jamais : échec de chargement d'un morceau → `console.error`, page inchangée, décision 10 de p6a).
- `PrintListButton` : « Imprimer la liste » de la fiche R2 imprime le document B (le `return null` de P6 (a) est retiré ; l'emplacement de P5 (a) le rendait déjà).
- `features/staff/TomorrowBlocks.tsx` : blocs de 07 § 5 sous la ligne de totaux. Nom du restaurant en `h4` à la couleur du restaurant (`data-accent` sur un `div`, pas une `section`, pour `columnOf`), `IconButton` « Imprimer » (`aria-label` et `title`) → documents C et D ; « Ouvert par {nom | (aucun)} » ; R1 : « Réservés : {n} / {capacité} couverts[ — {prix}] », « Clients : {Nom} ({Classe}), … » ; R2 : une ligne par plat réservé (« • {nom} : {n} portion(s) — {montant} ({noms}) », annexe F), « Total {name2}[ (hors plats sans prix indiqué)] : {montants} » en gras (D-03), « Aucun plat ouvert. » ; « Aucun jour ouvert pour demain. » quand aucun des deux restaurants n'a de jour. Styles de `.summary-*` (legacy/app.css) dans `TomorrowPanel.module.css`.
- `ui/print/print.ts` : `clearPrintedDocument()` (racine démontée, `.print-root` vidé, titre rétabli, impression en attente des polices annulée) ; `endPrinting` passe par la même fonction `stopPrinting`.
- `background/logout.ts` : étape 2 complétée par `clearPrintedDocument` quand `.print-root` n'est pas vide (voir décision 3).
- Tests : `ListDocumentR2.test.tsx` (8), `TomorrowDocumentR2.test.tsx` (7), `TomorrowPanel.test.tsx` (3 → 10 : blocs, « (aucun) », plat sans prix, « Aucun plat ouvert. », impression des documents C et D, focus rendu), `PrintListButton.test.tsx` (document B), `ui/print/print.test.ts` (+2), `background/logout.test.ts` (+1 : liste imprimée sans `afterprint`, déconnexion → `.print-root` vide, aucun nom ni contact de la fixture dans `document.body.textContent`, titre rétabli ; rouge sans l'appel de `logout.ts`). Stories sous axe : `ListDocumentR2` (`Bookings`, `ThemeAndNote`, `NoBookings`, `NoDish`), `TomorrowDocumentR2` (`Tomorrow`, `NoDish`, `NoDay`), `TomorrowPanel` (assertions des blocs ajoutées). Données : `src/test/print-lists.ts` (jour R2 du mardi, modèle anglais).
- `e2e/print-pdf.spec.ts` (+1, `react-only`) : document B imprimé, PDF d'une page A4 paysage, média écran rétabli sans `afterprint`, « Client » → `.print-root` vide, titre de la page, aucun nom dans le `body`.

## Preuves

| Commande | Résultat |
| --- | --- |
| `pnpm check` | extraction, format, lint, `tsc` sans remarque ; Vitest 210 fichiers, 2 582 tests verts (node, node-ny, browser, storybook), aucun rejet non géré ; `knip` et `knip --production` sans remarque |
| `pnpm build:e2e && git diff --exit-code src/routeTree.gen.ts translations/fr.json` | aucune différence |
| `pnpm test:e2e --project=react --grep "@p6"` | 6 verts sur 6 : REG-39 (deux tests), REG-40, REG-40 variante I-00, REG-41, REG-42 |
| `pnpm test:e2e --project=react --grep "@p4\|@p5\|@p6\|@framework"` | 74 verts sur 76 ; rouges REG-05 et REG-03 « no new attempt offline » (« requests to the script that the fake script did not answer »), tous deux verts relancés seuls ; voir « Instabilités » |
| `pnpm test:e2e:legacy` | 76 verts sur 76 |
| `pnpm test:e2e --project=react-only` | 12 verts sur 12, dont les 3 tests de `e2e/print-pdf.spec.ts` |
| `pnpm build && pnpm budget` | voir « Budget » |

## Décisions

1. **Montant d'une ligne de commande R2 au ticket = 1 ticket** (colonne « Plats » du document B, lignes des tableaux du document D) : `orderAmounts` d'une seule ligne. L'ancien site comptait un ticket par portion (« 3× Bowl — 3 tickets restaurant ») ; E-16 demande un ticket par commande. Une commande avec deux plats au ticket montre « 1 ticket restaurant » sur chaque ligne et dans « Prix », et compte un ticket dans les totaux. REG-41 ne lit que le début de la ligne (`^3× Bowl`). Facile à défaire (`bookingAmounts`).
2. **Ligne d'un plat du panneau et du récapitulatif** : un ticket par commande qui contient le plat (`dishTotals`, déjà écrit en P2) ; total R2 = somme des commandes (`r2DayTotals`).
3. **Purge à la déconnexion par `import()`** : `logout.ts` n'importe pas `ui/print/print.ts` statiquement, sinon le module d'impression entrerait dans le chemin initial (PLAN § 3.8, S3). `.print-root` ne contient un document qu'après un appel de `printDocument`, donc le module est déjà chargé et `import()` le retrouve sans réseau. En cas d'échec, `.print-root` est retiré du DOM. La purge part dans la même tâche que les étapes 2 à 6, après une microtâche ; le test l'attend par `vi.waitFor`.
4. **Liste R2 d'un jour absent de l'état** (supprimé entre-temps) : comportement de l'ancien site gardé (« Ouvert par : Non renseigné », tableaux vides ou plats restants) ; aucun texte de l'annexe F ne couvre ce cas en R2.
5. **Tri des clients** : `localeCompare(…, "fr")` de P2 gardé (l'ancien appelait `localeCompare` sans locale, donc la langue du navigateur, `fr` pour les collègues).
6. **Nom du restaurant d'un bloc en `h4`** (ancien `<b>`) : structure de titres sous le `h3` du panneau, sans `h2` (page object `columnTitle`).
7. **Axe `heading-order` désactivé dans les stories `TomorrowDocumentR2`** (paramètre de story, commenté) : 07 § 7 et REG-42 imposent des `h3` sous le `h1` ; le document n'est jamais affiché à l'écran.
8. **Page object `toast` (variante `react`) avec `includeHidden`** : la variante I-00 de REG-40 vérifie l'absence du toast « Autorisez » pendant que la page est en média print, où `styles/print.css` masque tout sauf le document. À l'écran, la région « Notifications » est toujours visible : aucun autre scénario ne change de comportement (76 tests rejoués).

## Contradictions

- **parite.md, I-00 « sans objet » côté `react`** contre le lancement (« variante `@changed:E-15` de @I-00 verte sur react ») : le test étiqueté `@legacy-only` a une branche `react` jouée par le projet `react` (comme REG-07) ; elle est verte, la matrice le dit maintenant.
- **07 § 5 « Total {name2} (hors plats sans prix) »** contre D-03 : « (hors plats sans prix indiqué) » appliqué (D-03 cite le résumé du lendemain).

## Instabilités (charge de la machine)

- REG-05 et REG-03 « no new attempt offline » : rouges dans la suite complète sous une charge de 15 à 17, verts relancés seuls ; même message (une lecture part avant le passage hors ligne) que celui noté par p5e et p6a. Laissé à la session qui étudie REG-02 et REG-05.

## Budget (S3)

`pnpm build && pnpm budget` : JS initial 180,4 kB gzip (180,1 kB mesurés par p5e), CSS 10,9 kB. Documents chargés au clic : `ListDocumentR2-*.js` (1,5 kB gzip), `TomorrowDocumentR2-*.js` (1,6 kB), `print-*.js` (0,8 kB). « Par client », « Récapitulatif par plat » : seulement dans `ListDocumentR2-*.js` ; les textes du panneau (« Réservés : », « Aucun plat ouvert. ») dans `collegue-*.js`. Le morceau initial ne gagne que le sélecteur `.print-root:not(:empty)` et l'appel `import()` de `logout.ts`.

## Overrides oxlint

Aucun.

## Versions

Aucune version changée, aucun paquet ajouté.

## Fichiers partagés modifiés

- `background/logout.ts` (P5 (a)) : appel de la purge, autorisé par l'orchestrateur.
- `ui/print/print.ts` (P6 (a)) : `clearPrintedDocument` seulement.
- `e2e/pages/home.ts` : `toast` de la variante `react` (décision 8).
- `.github/workflows/ci.yml` : `E2E_REACT_GREP` = `@p4|@p5|@p6|@framework`.
- `docs/migration/parite.md` : lignes C-01, C-03, I-00, I-02, I-03, I-04, invariants 1 et 5.

## Changements souhaités dans des fichiers partagés

- `knip.json` : l'exclusion `!src/domain/**!` (« retirer en P6 (b) ») ne peut pas partir ici : knip signale alors 20 exports et 8 types sans importeur de production dans `constants.ts`, `dates.ts`, `validation.ts`, `vouchers.ts`, `settings.ts`, `bookings.ts`, `types.ts` et `print.ts` (fonctions appelées seulement par `listR2` et les tests). À trancher en P7 (exports retirés ou `@internal`).

## Pour l'orchestrateur (PLAN.md)

- Journal du plan : « P6 (b) fusionnée, **P6 terminée** : documents B et D, blocs du panneau « Demain », purge du document imprimé à la déconnexion ; les 6 tests `@p6` verts sur `react` ; `E2E_REACT_GREP` = `@p4|@p5|@p6|@framework` ; budget 180,4 kB ».
- § 3.3.4, étape 2 : « … et `clearPrintedDocument()` de `ui/print/print.ts` si `.print-root` contient un document (chargé par `import()`) ».
- § 3.8 : `clearPrintedDocument` ; un ticket par commande aussi sur chaque ligne de plat au ticket (décision 1).
- § 3.1 (`features/print/`) : `list-r2.ts`, `ListDocumentR2`, `TomorrowDocumentR2` ; `features/staff/TomorrowBlocks`.
- Annexe E : « commande (R2) » → `Order` (`key`, `lines`), « instantané d'une liste R2 » → `ListR2` (`listR2`).
