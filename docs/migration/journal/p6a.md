# Journal de la session P6 (a) — mécanique d'impression et documents R1

*4 octobre 2026. Branche locale `claude/p6a-impression-r1`, partie de `e6feb25` (pointe de l'intégration : P4, P5 (a), (c), (d1)). Pas de PR ni de push : l'orchestrateur fusionne la branche locale. Chromium de `/opt/pw-browsers/chromium`, ports 4820 / 4821 / 63420. P5 (b) et P5 (e) tournaient en même temps dans d'autres worktrees.*

## Commits

1. `07c66ae` Impression : mécanique dans le même document et documents R1 (07 § 2-3, § 6, PLAN § 3.8).
2. `663a547` E2E : impression R1 sur le site construit (07 § 2-3, E-15).
3. Journal et colonne `react` de `parite.md` (ce commit).

## Fait

- `ui/print/print.ts` : `printDocument(content, { title, opener })`. Rend le document dans `.print-root` (enfant de `<body>` créé au premier appel) par `flushSync`, pose `document.title`, attend `document.fonts.ready` 2 s au plus, puis appelle `window.print()`. À `afterprint` : titre rétabli, racine démontée (`.print-root` vide), focus rendu au bouton s'il est encore dans la page. Un second appel avant `afterprint` remplace le document et garde le titre de la page.
- `ui/print/PrintRoot.tsx` (fournit l'instance `intl` à la racine d'impression), `PrintLayout.tsx` (gabarit de `07` § 2.2 : bandeau, en-tête avec logo et « Imprimé le {date} », titre au trait oblique, sous-titre en majuscule CSS, informations, total, signature ; `PrintNote` ; styles `h2`, `h3` et `h3 span` prêts pour les documents R2), `PrintTable.tsx` (`07` § 2.4 : en-têtes de groupe, variante quadrillée, colonnes `center` et `end`, tons `muted` et `marked`, ligne unique d'un tableau vide).
- `styles/print.css` : jetons d'impression (`--print-*`, tailles en pt et mm de `PRINT_CSS`), couleurs par restaurant sous `[data-print-accent]` (`07` § 2.3), `.print-root` masqué à l'écran ; à l'impression, tout le reste masqué tant que `.print-root` contient un document ; page nommée `list` (A4 paysage, marges 12 / 14 / 14 mm, boîtes de marge « Lycée professionnel… » et « Page x / y », police et couleur écrites en dur).
- `domain/print.ts` : `listR1(state, iso)` (instantané : nom du restaurant, jour ou `undefined`, réservations dans l'ordre de la feuille, totaux), type `ListR1` ; tests ajoutés à `print.test.ts`.
- `features/print/ListDocumentR1.tsx` (document A, `07` § 3) et `list-r1.ts` (informations, colonnes, en-têtes de groupe, lignes, total avec le détail élèves / personnels / extérieurs) ; `TomorrowDocumentR1.tsx` (document C, `07` § 6) ; `document-texts.ts` (textes communs, « Non renseigné », « {seats} / {capacity} couverts réservés », séparateur « · ») ; `print-documents.ts` (`printListR1`, `printTomorrowR1` : instantané de l'état complet au clic, puis `import()` du document et de `ui/print/print`).
- `features/print/PrintListButton.tsx` : « Imprimer la liste » (`Button` small, `PrintIcon`) de la fiche R1, jours passés compris ; lit l'état complet par `useStaffState`. Fiche R2 : rien tant que le document B n'existe pas.
- Tests : `ui/print/print.test.ts` (5), `ListDocumentR1.test.tsx` (13), `TomorrowDocumentR1.test.tsx` (7), `PrintListButton.test.tsx` (4) ; `domain/print.test.ts` (+2). Stories sous axe : `ListDocumentR1` (`Bookings`, `DetailedTotal`, `LongList`, `NoBookings`, `DayClosed`), `TomorrowDocumentR1` (`Tomorrow`, `NoBookings`, `NoDay`), `PrintTable` (`Plain`, `Grid`, `Empty`), `PrintLayout` (`Complete`, `Minimal`). Données de test : `src/test/print-lists.ts` (modèle anglais).
- `e2e/print-pdf.spec.ts` (`react-only`, 2 tests) : document seul visible en média `print` (seul enfant affiché de `<body>`), titre, `page.pdf()` en A4 paysage (842 × 595 pt), retour après `afterprint` (titre, `.print-root` vide, focus sur le bouton) ; liste de 43 lignes sur plusieurs pages paysage (4 pages mesurées, assertion 3 à 5).
- Page objects : `e2e/pages/print.ts`, variante `react` de `printedDocument` : le document imprimé est le seul `article` de la page (le `body` contenait aussi la fiche du jour, d'où une violation du mode strict) ; `e2e/regression/print-helpers.ts` : `enterStaffMode` passe par `login()` de `pages/login.ts` (le lien « Collègue » de la première version de P1 (d) est devenu un segment `ViewToggle` en P5 (a)). Aucune assertion modifiée.

## Preuves

| Commande | Résultat |
| --- | --- |
| `pnpm check` | extraction, format, lint, `tsc` sans remarque ; Vitest 182 fichiers, 2 286 tests verts (node, node-ny, browser, storybook), aucun rejet non géré ; `knip` et `knip --production` sans remarque |
| `vitest run --project browser --project storybook src/ui/print src/features/print` | 8 fichiers, 42 tests verts (dont 13 stories sous axe) |
| `pnpm build:e2e && git diff --exit-code src/routeTree.gen.ts translations/fr.json` | aucune différence après commit |
| `pnpm test:e2e --project=react --grep "@I-01"` | REG-40 vert |
| `pnpm test:e2e --project=react --grep "@I-03"` avec un `TomorrowPanel` provisoire (non commité) | document C vert ; échec attendu à la ligne 126 (bloc R2, P6 (b)) |
| `pnpm test:e2e --project=react-only e2e/print-pdf.spec.ts` | 2 verts |
| `pnpm test:e2e --project=react --grep "@p4\|@framework\|@L-01\|@G-08\|@C-11\|@I-01"` | 45 verts sur 48 sous charge (moyenne 20) ; REG-03 « offline » et REG-05 verts relancés seuls ; REG-02 (seuil de 600 ms de E-47) 623 et 624 ms, rouge 2 fois sur 4 avec `--workers=1` ; même instabilité notée sur la base par p5c et p5d1 |
| `pnpm test:e2e --project=react-only` | 10 verts sur 11 sous charge ; `hydration.spec.ts` vert relancé seul (2 sur 2) |
| `pnpm test:e2e:legacy` | 76 verts sur 76 |
| `pnpm build && pnpm budget` | voir « Budget » |
| `grep -rnE "use(Layout)?Effect\(" src …` (S6) | 0 ligne |

## Décisions

1. **Racine React propre à l'impression, créée au clic** (`createRoot` sur `.print-root`), au lieu d'un `<PrintRoot/>` monté sous `/collegue` : `StaffPage.tsx` et `routes/collegue.tsx` appartiennent à P5 (a) et sont interdits à cette session. Le document reçoit ses données en props (instantané, PLAN § 3.8) et l'instance `intl` par `PrintRoot` ; il ne lit ni le routeur ni Query. Si l'orchestrateur préfère le portail du plan, `PrintRoot` peut devenir un composant monté une fois dans `StaffPage` qui lit le document d'un petit magasin : `printDocument` garde sa signature.
2. **`.print-root:not(:empty)`** dans la règle qui masque l'appli : avant toute impression et après `afterprint`, Ctrl+P imprime la page entière comme l'ancien site (`07` § 10.9).
3. **Dates longues avec « 1er »** dans les titres, sous-titres et noms de PDF (`formatLongDate`, D-03, E-21) : « Restaurant Pédagogique — jeudi 1er octobre 2026 ». E-21 parle des dates « à l'écran » ; garder une seule forme de date dans l'appli est l'option la plus facile à défaire.
4. **Date d'impression** : `Date.now()` lu dans le gestionnaire du clic (pas au rendu), formaté par `date.printedOn` (fuseau de Paris).
5. **Texte « – »** des comptes vides passé par un message (`print.r1.list.noCount`), comme tout texte affiché.
6. **Fiche R2 sans bouton** jusqu'à P6 (b) : un bouton sans document serait un bouton mort. REG-35 ne regarde que la fiche R1.
7. **`printTomorrowR1` exporté pour P6 (b)** (`@public`) : `TomorrowPanel.tsx` appartient à P5 (e) puis P6 (b). Rollup retire aujourd'hui cet export et le morceau de `TomorrowDocumentR1` du build (aucun appelant) ; ils reviendront avec le bouton.
8. **Textes des documents dans le morceau du document** : seuls les deux titres (`print.list.title`, `print.tomorrow.title`) restent dans `print-documents.ts`, donc dans le morceau `/collegue`, parce que le titre se calcule avant le chargement.
9. **En-têtes de groupe sans `scope="colgroup"`** : avec cet attribut, le moteur de rôles de Vitest les classe en `cell` ; comme `printTable`, les `th` du `thead` suffisent (Playwright les lit en `columnheader`).
10. **Échec de chargement d'un morceau** (site mis à jour pendant la session, réseau coupé) : `console.error`, page inchangée ; aucun texte de la spec ne couvre ce cas.

## Contradictions

- **PLAN § 3.8** (« `<PrintRoot/>` monté une fois sous `/collegue` ») : non suivi faute de pouvoir toucher `StaffPage.tsx` (décision 1).
- **Critère « @I-03 vert sur `react` »** : REG-42 imprime d'abord le document C par le bouton « Imprimer » du bloc R1 du panneau « Demain » (P6 (b)), puis vérifie le bloc R2 et le document D (P6 (b)). Avec un `TomorrowPanel` provisoire (région « Demain (…) », nom du restaurant, « Ouvert par », `IconButton` « Imprimer » qui appelle `printTomorrowR1`), non commité, REG-42 passe toutes les assertions du document C et échoue à la ligne 126 (`• Lasagnes : 1 portion —`, bloc R2).
- **`e2e/regression/print-helpers.ts`** cherchait un lien « Collègue » côté `react` ; P5 (a) en a fait un bouton du groupe « Mode d'accès ». Corrigé ici (aide, pas une assertion).

## Budget (S3)

`pnpm build && pnpm budget` : JS initial 176,1 kB gzip (174,9 kB sur `e6feb25` reconstruit dans un worktree temporaire), CSS 10,9 kB (10,3). Aucun module de cette session n'entre dans le chemin initial (`grep` de « Imprimer la liste », « Chef de rang », « Non renseigné » : seulement `collegue-*.js` pour le bouton, `ListDocumentR1-*.js` pour le reste). La hausse vient du découpage de Rollup : `react-dom`, `logo.png` et `intl/dates.ts`, partagés désormais avec le morceau du document, sortent dans de petits morceaux à part (perte de compression) ; `print.css` gagne ses jetons (+0,6 kB). Morceaux chargés au clic : `ListDocumentR1-*.js` (4,0 kB gzip, CSS 1,4 kB), `print-*.js` (0,75 kB).

## Overrides oxlint

Aucun.

## Versions

Aucune version changée, aucun paquet ajouté.

## Fichiers partagés modifiés

- `e2e/pages/print.ts` (variante `react` de `printedDocument`) et `e2e/regression/print-helpers.ts` (`enterStaffMode`) : page objects et aides de P1 (d), variantes `react` de la phase qui livre l'écran.
- `docs/migration/parite.md` : lignes I-01 et I-03.

## Changements souhaités dans des fichiers partagés

- `.github/workflows/ci.yml` : ajouter `|@I-01` à `E2E_REACT_GREP` (REG-40). `e2e/print-pdf.spec.ts` tourne déjà dans le projet `react-only`.
- `background/logout.ts` (P5 (a)) : vider `.print-root` à la déconnexion (S8). Sans `afterprint` (navigateur qui ne l'envoie pas), le dernier document resterait dans la page, masqué. `ui/print/print.ts` peut exporter une fonction `clearPrintedDocument()` si l'orchestrateur l'accepte.
- PLAN annexe E : « chef de rang » → `headWaiter`, « N° table » → `tableNumber`, « instantané d'une liste R1 » → `ListR1` (`listR1`).

## Reste à faire (P6 (b))

- `ListDocumentR2.tsx` et `TomorrowDocumentR2.tsx` sur `PrintLayout` (accent `r2`) et `PrintTable` ; `h2` « Par client (n) » et `h3` « {plat} — {prix} » avec `<span>` à droite sont déjà stylés par `PrintLayout.module.css`. Textes communs dans `document-texts.ts` (`documentMessages.openedBy`, `noBookings`, `noDayTomorrow`, `name`, `price`, `total`, `openedByText`, `tomorrowSubtitle`, `dotted`) ; titres par `print.list.title` et `print.tomorrow.title` de `print-documents.ts`.
- `print-documents.ts` : ajouter `printListR2` et `printTomorrowR2` sur le modèle de `printListR1` (instantané avant l'`import()`).
- `PrintListButton.tsx` : retirer le `return null` de la fiche R2 et appeler `printListR2`.
- `TomorrowPanel.tsx` : `IconButton` « Imprimer » (`aria-label` et `title`, `07` § 5) du bloc R1 qui appelle `printTomorrowR1(state, tomorrow, event.currentTarget)` ; même chose en R2.
- Vérifier `@I-01` à `@I-04`, `@C-01`, `@C-03` et la variante `@changed:E-15` de `@I-00` sur `react` (critère de sortie de P6 : `@p6`).

## Pour l'orchestrateur (PLAN.md)

- Journal du plan : « P6 (a) fusionnée : impression dans le même document (`ui/print/`, `styles/print.css`), documents A et C ; REG-40 (`@I-01`) vert sur `react`, document C vert jusqu'au bloc R2 de REG-42 ; `e2e/print-pdf.spec.ts` ; budget 176,1 kB ».
- § 3.8 : « `printDocument` crée au clic une racine React sur `.print-root` (enfant de `<body>`), démontée à `afterprint` ; `PrintRoot` fournit `intl` » ; règle de masquage sur `.print-root:not(:empty)`.
- § 3.1 (`features/print/`) : ajouter `PrintListButton`, `print-documents.ts`, `document-texts.ts`, `list-r1.ts`.
- Annexe E : voir « Changements souhaités ».
