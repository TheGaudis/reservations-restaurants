# Journal de la session P1 (b) — scénarios publics et chargement

*3 octobre 2026. Branche locale `claude/p1b-scenarios-publics`, partie de la pointe de l'intégration (`bde7a9d`, P0, P1 (a1) et P1 (a2) intégrées). P2 (a) et P3 (0) tournaient en parallèle.*

## Fait

- Corps des page objects publics (`e2e/pages/`) : `home.ts`, `calendar.ts`, `day-card.ts`, `booking-r1.ts`, `order-r2.ts`, plus `storage.ts` (copie locale v1 de 03 § 1.1 construite depuis `fakeScript.db`, `reservations-textes`, semées par `addInitScript` au premier chargement de l'onglet seulement). Rôles, libellés et textes de la spec ; aucune classe ni aucun id. Variante choisie par `currentTarget()` (`target.ts`), qui lit `test.info()`.
- Fonctions ajoutées aux signatures de P1 (a1), et à `pageObjectSignatures` : `column`, `logo`, `retryButton`, `toastKind`, `BLOCKED_FONT_PRELOAD` (home) ; `longDate`, `selectedDay` (calendar) ; `bookingR1Field`, `bookingR1Total` (booking-r1) ; `quantityField`, `serviceModeOption`, `selectedServiceMode`, `orderR2Total` (order-r2) ; `readLocalCache`, `seedLocalCache`, `seedStoredTexts` (storage) ; `currentTarget` (target).
- 33 tests pour REG-01 à REG-26 et REG-43, tous les `test.fixme` publics remplacés : `loading.spec.ts` (REG-01, 02, 04, 05, 07), `loading-reads.spec.ts` (REG-03 en quatre tests, REG-06, REG-08), `calendar.spec.ts` (REG-09 à 12), `public-r1.spec.ts` (REG-13 à 15), `public-r1-send.spec.ts` (REG-16 en deux tests, REG-17 à 20), `public-r2.spec.ts` (REG-21, REG-22 en deux tests, REG-23, REG-24), `public-r2-cutoff.spec.ts` (REG-25 en deux tests, REG-26), `misc.spec.ts` (REG-43). Aides communes : `e2e/regression/helpers.ts`.
- Chaque `@changed:E-xx` du périmètre a son assertion `legacy` et son assertion `react` (E-01, 03, 05 à 14, 19, 21, 23, 27 à 29, 31 à 35, 41 à 43, 45 à 47) ; REG-07 reste `@legacy-only`.
- `parite.md` : répartition des fichiers (§ 1 et § 3), avertissement des polices (§ 1), section « Public » (§ 5.1) : `legacy` vert, `react` à faire.
- `.oxlintrc.json` : override `no-await-in-loop` sur `e2e/**` (voir « Overrides »), commit séparé.

## Mesures

- `pnpm test:e2e:legacy` : 37 réussis (33 publics, smoke, 3 `@framework`), 16 `fixme` (collègue, impression), 34 s sur 2 workers.
- `pnpm test:e2e:legacy --repeat-each 3` : 111 réussis, 1 min 41 s ; `--grep "@p4" --repeat-each 3` : 102 réussis, 1 min 28 s.
- Essai de charge : `--grep "@p4" --repeat-each 5 --workers=4` : 170 réussis ; fichiers sous horloge en pause `--repeat-each 6 --workers=6` : 96 réussis.
- `pnpm check` : vert (198 tests Vitest, knip propre) ; `pnpm test:e2e --project=react --grep @framework` : 3 réussis.

## Décisions

1. **Colonne** : l'ancêtre le plus proche du titre `h2` qui contient un bouton (`xpath=ancestor::*[descendant::button][1]`) ; la page publique n'a que deux `h2`. **Fiche** : l'élément le plus extérieur de la colonne qui montre une date longue sans contenir le calendrier ; elle inclut le récapitulatif. **Plat** : l'élément le plus intérieur qui contient la ligne du plat et sa pastille.
2. **Toast** : `legacy` = le `role="status"` sans bouton (le récapitulatif en a un) ; son texte reste après le fondu, les scénarios lisent donc le texte et non la visibilité. `react` = zone « Notifications » (annexe F, `ui.toast.viewport`). `toastKind` lit la classe `error` (`legacy`) ou `data-type` du dernier `dialog` de Base UI (`react`, supposé : à vérifier en P3 (a) et P4).
3. **REG-07 sur `react`** : pas de `test.skip`. Le test vérifie qu'une URL valide n'affiche aucun bandeau ; le texte de D-05 reste couvert par la story et le test Vitest de `ConfigBanner`.
4. **E-19** : les scénarios tapent « 2.7 » et non « 2,7 ». Dans un champ `type="number"` de Chromium, la virgule est ignorée : « 2,7 » devient 27. Avec « 2.7 », `parseInt` donne 2 (04 § 5.2) ; `react` doit garder un entier.
5. **E-28** : le texte initial « Total : 0,00 € » (espace ordinaire) est remplacé dans la même tâche par « 0 couvert · Total : 0,00 € ». Un `MutationObserver` posé par `addInitScript` relève le texte remplacé.
6. **Horloge** : `pauseClock` installe l'horloge une seconde avant l'instant voulu puis la met en pause (`pauseAt` refuse un instant passé). Pour « pas avant 6 s » ou « pas avant 1,5 s », le test attend 300 ms réelles (`settle`) après `runFor` ; quand un minuteur part d'un échec, le test attend la réponse 500 (`waitForResponse`) avant d'avancer l'horloge.
7. **Mouvement réduit** (`reducedMotion: "reduce"`) dans tous les fichiers publics sauf `calendar.spec.ts`, qui garde les transitions de vue (05 § 3.4). Il supprime la fermeture différée de 120 ms et rend les scénarios sous horloge déterministes.
8. **Avertissement des polices** : sur `legacy`, Chromium avertit que la feuille Google Fonts préchargée n'a pas servi, dès qu'un test dure plus de trois secondes (polices bloquées par l'isolation). Chaque fichier public l'accepte par `consoleLog.allow(BLOCKED_FONT_PRELOAD)`.
9. **REG-08** : un premier envoi refusé (`failNext("error")`) donne au formulaire son `requestId`, comparé à celui de l'envoi qui suit l'actualisation. Onglet caché : `document.hidden` et `visibilityState` redéfinis, puis `visibilitychange`.
10. **REG-06** : les annonces se comptent comme les changements de texte non vide des `role="alert"` ; `legacy` = 3 (affichage, puis 3 et 6 min), `react` = 1.
11. **REG-43** : `window.open` enveloppé par un script d'initialisation ; `noopener` se vérifie par la valeur rendue (`null`), car `popup.opener()` de Playwright rend la page d'origine même avec `noopener`. L'URL de la vidéo figure dans `isolation.blocked`.
12. **REG-24** : `confirmed` vide s'obtient par un autre visiteur qui prend tous les Wrap ; le faux script ne refuse jamais une commande R2 pour le stock (02 § 4.5).
13. **Fichiers** découpés sous 300 lignes (`max-lines`) : `loading-reads`, `public-r1-send`, `public-r2-cutoff` ; `parite.md` suit.

## Contradictions et remarques

- **REG-10 et PLAN § 3.2** : `selectDay` retire `rXperiode`, donc la vue suivrait le jour choisi ; 05 § 3.1 et REG-10 exigent qu'un clic sur un jour hors du mois garde le mois affiché. P4 doit garder (ou poser) `r1periode` dans ce cas. Après rechargement, la variante `react` vérifie la vue mois et la sélection, pas le libellé.
- **04 § 5.2** donne « Total : 0,00 € » comme texte initial : le HTML a une espace ordinaire avant « € », `formatEuro` une insécable.
- **parite.md REG-15** parle de « 2,7 » : voir la décision 4.
- **Invariants** (P1 (d)) : REG-02 (`?since=`, `{ unchanged }`, `savedAt` réécrit), REG-03 (lecture doublée à 6 s, nouvel essai à 1,5 s, hors ligne, délai de 30 s) et REG-25 (10 h, contrôle à l'envoi) sont écrits ici ; P1 (d) n'a pas à les refaire. REG-29 relève de P1 (c).

## Versions

Aucune version changée, aucun paquet ajouté.

## Overrides oxlint

- `no-await-in-loop` désactivée sur `e2e/**` (commentée dans `.oxlintrc.json`). Exemple minimal : `for (const key of keys) await page.keyboard.press(key)` ; un `Promise.all` enverrait les touches dans le désordre.
- Corrections du code pour le reste : `u` sur les expressions régulières, résultats d'`await` rangés dans une variable, `find` au lieu de `filter()[0]`, pas d'assertion non nulle, fixtures non réassignées.

## Reste à faire

- P4 : jouer les variantes `react` et ajuster les corps `react` des page objects si le DOM diffère (toast et `toastKind`, colonne, mode de service, champs numériques), sans toucher aux assertions.
- Orchestrateur, `e2e/fixtures.ts` : ignorer l'avertissement de préchargement d'une feuille externe (`was preloaded using link preload but not used`), comme les « Failed to load resource » externes ; les `consoleLog.allow(BLOCKED_FONT_PRELOAD)` des fichiers publics deviendraient inutiles.
- P7 (a), `playwright.config.ts` : exclure `@legacy-only` du projet `react` (`grepInvert`), si la branche `react` de REG-07 ne suffit pas.
- Orchestrateur : PR, CI verte sur la PR.

## Pour la PR

Titre : « P1 (b) : scénarios publics et chargement (REG-01 à REG-26, REG-43) ».

- 33 scénarios publics verts sur `legacy` trois fois de suite ; variantes `react` écrites d'après le plan.
- Page objects publics remplis ; nouvelles fonctions listées dans `pageObjectSignatures`.
- Override oxlint `no-await-in-loop` sur `e2e/**`, dans un commit à part.
- Aucune action humaine.
