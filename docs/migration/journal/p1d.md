# Journal de la session P1 (d) — impression et invariants

*3 octobre 2026. Branche locale `claude/p1d-impression`, partie de la pointe de l'intégration (`d03b52e` : P0, P1 (a1), (a2), (b), P2 complète, P3 (0), (a), (b) intégrées). P1 (c) et P3 (c) tournaient en parallèle.*

## Fait

- Page object `e2e/pages/print.ts` : `stubPrint` (script d'initialisation du contexte : `print()` ne fait que compter ses appels, popups `about:blank` compris), `printedDocument` (ancien site : le popup ; nouveau site : la page elle-même, E-15 ; dans les deux cas, attend l'appel à `print()` puis passe en média d'impression), `closePrintedDocument`, `printedInfo` (valeur d'un `dt` de l'en-tête), `printedRow` (textes bruts des cases d'une ligne), `tomorrowPanel`, `tomorrowSummary`, `tomorrowBlock`, `tomorrowPrintButton`. Signatures ajoutées à `pageObjectSignatures`.
- `print.spec.ts` : REG-40 (liste R1 du 06 : titre de la fenêtre, en-tête, informations sans thème vide, 15 en-têtes de colonnes, ordre d'enregistrement, « – » des compteurs vides, prix vide d'une ancienne réservation, total sans détail, signature, pied absent de l'impression ; liste du 12 : détail « 120 extérieurs » et montant au-delà de 999 €, E-20), variante I-00 (`window.open` qui rend `null`), REG-41 (liste R2 du 06 : tri par classe puis nom, orpheline absente, observation, mode, un ticket par commande E-16, récapitulatif par plat, « Total du jour » ; liste du 05 : tri contraire à l'ordre d'enregistrement).
- `print-tomorrow.spec.ts` : REG-39 (panneau « Demain » et résumé du lendemain, E-30, E-44 ; variante sans jour le lendemain, horloge au 6 octobre) et REG-42 (documents C et D : titres « — demain », sous-titre « Demain, … », tableaux simples, pas de signature, `h3` par plat avec « l'unité » et le stock, un ticket par commande E-16, ligne R2 du résumé E-44).
- `invariants.spec.ts` : passage de minuit sans rechargement, horloge de la page en pause à 23 h 59 min 30 s (PLAN § 3.4) : « Aujourd'hui » mène au 6 octobre dans les deux colonnes, le 5 passe « passé », la commande R2 du nouveau jour reste possible avant 10 h, aucune autre lecture ; un formulaire R1 ouvert sur le 6 avant minuit reste ouvert et envoie `date: "2026-10-06"`.
- `print-helpers.ts` : `enterStaffMode` (connexion avec le mot de passe du jeu de base) et les noms des restaurants.
- `parite.md` : fichiers (§ 1 et § 3), section « Impression et invariants » (§ 5.3) : `legacy` vert pour C-01, C-03, I-00 à I-04 ; statut des invariants d'après P1 (b) et cette session, REG-29, REG-30, REG-36 et REG-38 laissés à P1 (c).

## Mesures

- `pnpm test:e2e:legacy` (après `pnpm build:e2e`) : 45 réussis, 12 `fixme` (collègue, P1 (c)), **55,6 s** sur 2 workers.
- `pnpm test:e2e:legacy --repeat-each 3` : 135 réussis, 36 `fixme`, 2 min 34 s.
- `pnpm test:e2e:legacy --grep "@p6" --repeat-each 3` : 18 réussis, 35,7 s.
- Essais de charge : `--grep "@p6" --repeat-each 8 --workers=4` : 48 réussis ; `invariants.spec.ts --repeat-each 10 --workers=4` : 20 réussis.
- `pnpm check` : vert (1 764 tests Vitest, 111 fichiers, knip propre) ; `pnpm test:e2e --project=react --grep @framework` : 3 réussis.
- Vérifié par mutation : sans le passage en média d'impression, REG-40 échoue (pied d'écran visible) ; avec 10 s au lieu de 60 s d'horloge, le scénario de minuit échoue.

## Décisions

1. **Document lu en média d'impression** (`emulateMedia({ media: "print" })`) sur les deux sites : on lit ce que reçoit l'imprimante. Sur l'ancien site, le pied `.pb-foot` disparaît (07 § 2.2) ; sur le nouveau, le reste de la page est masqué par `styles/print.css` (PLAN § 3.8) et les rôles (`heading`, `term`, `row`, `cell`) ne trouvent que le document. Aucun sélecteur `.print-root` : la règle « aucun sélecteur de classe dans e2e/ » l'emporte sur la formulation de REG-40 dans `parite.md`.
2. **`print()` neutralisé** par un compteur `window.e2ePrintCalls` posé par `context.addInitScript` ; vérifié sur le popup `about:blank` de l'ancien site (le `document.write` garde la fenêtre). Le nouveau site ne reçoit pas `afterprint` tant que `closePrintedDocument` ne l'envoie pas : le portail reste rempli pendant la lecture.
3. **Connexion** : `enterStaffMode` (`print-helpers.ts`) au lieu de `login()` de `login.ts`, que P1 (c) écrit en parallèle. Variante `react` d'après E-23 : lien « Collègue ». Elle attend le texte « Mode collègue activé. » et non `toast()` de `home.ts` (voir « Contradictions »).
4. **Minuit** : deux tests de plus sous le préfixe de REG-25 (variantes d'invariants, aucun identifiant nouveau), `@parity`, `@p4`, étiquettes d'écran P-01, P-04, P-12, P-05. Ils ne vérifient que le comportement commun (voir « Contradictions »).
5. **I-00** : étiqueté `@legacy-only` comme le dit `parite.md`, avec une branche `react` écrite comme REG-07 : `window.open` qui rend `null` n'empêche pas l'impression, aucun toast.
6. **Montants par plat d'un plat au ticket sur le nouveau site** (case « Plats » d'un client et colonne « Montant » du récapitulatif de REG-41, ligne « • Bowl : … » de REG-39) : non vérifiés côté `react`. La règle « un ticket par commande » fixe le total d'une commande, pas sa répartition entre plats. Les totaux et la case « Prix » d'un client (« 1 ticket restaurant ») sont vérifiés.
7. **Panneau fusionné du nouveau site** supposé exposé en `region` nommée par son titre `Demain ({date})` (D-07) ; les blocs par restaurant se trouvent par le nom du restaurant et le texte « Ouvert par ».
8. **Jours imprimés** : liste R1 du 06 (détail omis : 2 + 1 + 8 ≠ 15) et du 12 (détail et E-20) ; liste R2 du 06 (tickets, orpheline) et du 05 (Léa Martin, BTS1, avant Cyrille Ungerer, TS2, qui a réservé avant elle).
9. **Textes avec espaces insécables** : comparés bruts (` `, ` `) quand l'écart porte sur l'espace (E-20, cases de tableau), par `getByText` (espaces normalisées) ailleurs.

## Contradictions et remarques

- **Minuit, PLAN § 3.4 contre l'ancien site, sans écart E-xx.** Le plan veut que « les calendriers sans `r1` / `r2` dans l'URL suivent » le nouveau jour. L'ancien site fige la sélection au chargement (`calState.selected = todayISO()` au démarrage de `calendrier.js`), ne met à jour « passé » et `aria-current` qu'au rendu suivant, et une actualisation `{ unchanged }` ne rend rien (`loadAll`, `donnees.js` l. 251) : après minuit, la fiche de la veille garde « Réserver » jusqu'à la première action. Les scénarios ne vérifient que ce qui est commun (après un clic sur « Aujourd'hui »). À trancher par l'orchestrateur : un écart E-53 avec une variante `@changed` de ce scénario, ou un nouveau site qui ne suit pas.
- **`toast()` de `home.ts` sur l'ancien site** : pendant la connexion (voile G-06), le `<p role="status">` du voile perd son `aria-hidden` et devient visible ; `toast()` trouve alors deux éléments (échec en mode strict, 1 essai sur 18 de `print.spec.ts` répété 6 fois). P1 (c) rencontrera le même cas (connexion, suppressions).
- **E-44, « Ce jour n'est plus ouvert. »** (`print.r1.list.dayClosed`) : inatteignable par l'interface de l'ancien site (le bouton « Imprimer la liste » n'existe que pour un jour présent dans l'état affiché) ; aucun scénario. Reste au rendu de `ListDocumentR1` (P6 (a)).
- **REG-42 et E-44** : `parite.md` cite « lignes R2 du résumé selon l'annexe F » ; les documents C et D n'en ont pas. Le scénario vérifie la ligne du résumé à côté du bouton d'impression R2.
- `staff.ts` (P1 (c)) déclare `staffPanel(page, "Demain (…)")` : recouvre `tomorrowPanel` de `print.ts`. Les deux peuvent coexister ; une session de P5 ou P6 pourra en garder un seul.

## Versions

Aucune version changée, aucun paquet ajouté.

## Overrides oxlint

Aucun. Corrections du code : compteur de la fenêtre nommé sans tiret bas (`no-underscore-dangle`), résultats d'`await` rangés dans une variable (`no-await-expression-member`).

## Reste à faire

- Après l'intégration de P1 (c) : remplacer `enterStaffMode` par `login()` de `e2e/pages/login.ts` et supprimer `print-helpers.ts` si rien d'autre n'y reste.
- Orchestrateur : trancher l'écart de minuit ci-dessus ; corriger `toast()` de `home.ts` (proposition dans le compte rendu) ; PR, CI verte sur la PR.
- P6 (a), (b) : jouer REG-39 à REG-42 sur `react` ; ajuster les corps `react` de `print.ts` (`tomorrowPanel` en `region`, lien « Collègue ») sans toucher aux assertions ; décider de la répartition des tickets par plat (décision 6).
- P4 : jouer les deux scénarios de minuit sur `react`.

## Pour la PR

Titre : « P1 (d) : impression, panneau « Demain » et passage de minuit (REG-39 à REG-42, variantes de REG-25) ».

- Scénarios d'impression et du panneau « Demain » verts sur `legacy` trois fois de suite ; variantes `react` écrites d'après le plan (E-15, E-16, E-20, E-30, E-44).
- Deux variantes d'invariants (minuit) sous REG-25, `@parity` ; un écart de minuit sans E-xx signalé à l'orchestrateur.
- Aucune action humaine.
