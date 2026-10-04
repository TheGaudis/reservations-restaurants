# Plan de migration du frontend vers React

*Rédigé le 3 octobre 2026. Feuille de route des sessions d'implémentation (humaines ou agents). Branche d'intégration : `claude/frontend-react-migration-lw5zfz`.*

**Journal du plan** (le plus récent en tête) :
- Exécution, 4 octobre 2026 (orchestrateur) : P5 (e) fusionnée (`409f371`), **P5 terminée** : 30 scénarios `@p5` verts sur `react` ; `E2E_REACT_GREP` = `@p4|@p5|@framework|@I-01`. Paramètres (`SettingsForm`, `domain/settings.ts`) et ligne de totaux du panneau « Demain » (`TomorrowPanel`, titre en h3 ; emplacement `TomorrowBlocks` pour P6 (b)) ; D-20 et R-36 complétés. Instabilités à root-causer en P7 : REG-05 (rouge par intermittence, y compris sur une base sans P5 (e)) et REG-02 (seuil de 600 ms).
- Exécution, 4 octobre 2026 (orchestrateur) : P5 (d2) fusionnée (`66368aa`) : ajout d'une personne en R1 et sous chaque plat R2 (`AddBookingFormR1/R2`, `AddBookingParts`, `add-booking.ts`) ; REG-30, REG-35 « lines and actions », REG-36, REG-37 « dish added and edited » et REG-38 verts sur `react` ; budget 180,0 kB. Ligne « Ajout d'une personne » du § 3.3.3 : toast et fermeture après la relecture de l'état complet (l'ancien site montrait le toast avant ; accepté, aucun scénario ne l'observe) ; relecture dès qu'une session est ouverte ; focus sur la date de la fiche si le bouton a disparu (dernières places prises). Refus de places sous les compteurs (a-5) plutôt qu'en toast (`06` § 8.5), « Sur place » seul un jour au ticket (D-19).
- Exécution, 4 octobre 2026 (orchestrateur) : P5 (b) fusionnée (`32efb0c`, rebasée deux fois par l'orchestrateur) : ouvrir, modifier et supprimer un jour (`OpenDayPanel`, `OpenDayFormR1/R2`, `DishDraftsR2` avec les termes « dish draft » / `DishLine`, `open-date.ts`, `dish-lines.ts`, `day-messages.ts`, `domain/days.ts`) ; bouton du sélecteur de date nommé « Date » par son libellé, la date en description (§ 3.5, annule la décision 9 de P3 (c)) ; messages communs des jours et des plats dans `intl/staff-messages.ts` et règle de prix unique dans `domain/dishes.ts` (stock lu comme `parseInt`, « 2.5 » → 2, dans les deux formulaires) ; focus sur la date de la fiche après toute suppression par une seule fonction (`features/calendar/card-date-focus.ts`, date `tabIndex={-1}` et `data-day-date` dans `DayCard`) ; message « Impossible : {n} couvert(s)… » de l'annexe F appliqué à « Modifier ce jour ». Budget 178,8 kB. `E2E_REACT_GREP` élargi (60 tests).
- Exécution, 4 octobre 2026 (orchestrateur) : P5 (c) fusionnée (`e6feb25`, rebasée par l'orchestrateur) : plats R2 (`DishForm`, `DishFields`, `dish-rules.ts`, `dish-focus.ts`, `price-suggestions.ts` avec `usePriceSuggestions`) ; `CheckboxField` réduit à un bouton natif nommé par son libellé (validé) ; REG-37 « stock below… » vert. P6 (a) fusionnée (`0eb411d`) : impression dans le même document, **sans `<PrintRoot/>` monté dans la page** : `printDocument` crée au clic une racine React sur `.print-root` et la démonte à `afterprint` ; l'appli n'est masquée à l'impression que si `.print-root` n'est pas vide (Ctrl+P imprime la page comme l'ancien site) ; REG-40 vert, PDF A4 paysage vérifié ; budget 176,1 kB. Écart E-57 ajouté (un seul panneau « Ouvrir un jour »). Confié à P6 (b) : vider `.print-root` à la déconnexion (invariant 1, S8). REG-02 dépasse son seuil de 600 ms sous charge (620 à 900 ms) : à traiter en P7 (mesure à vide, ou seuil revu avec preuve).
- Exécution, 4 octobre 2026 (orchestrateur) : P5 (d1) fusionnée (`a79689d`) : listes et modification des réservations (`BookingRow`, `booking-line.ts`, `EditBookingFormR1/R2`, `EditBookingFields`, `EditBookingActions`, `edit-booking.ts`) ; REG-28, `@C-11` et la suppression d'une réservation verts sur `react`. Le message des portions de l'annexe F sert aussi à la modification R2. REG-35 et REG-38 attendent les boutons de P5 (b), (c), (d2) et P6 (a). Tests instables sous la charge de trois sessions parallèles (jamais les mêmes, verts seuls) ; REG-02 dépasse son seuil de 600 ms sous charge : à rejouer à vide en P7.
- Exécution, 4 octobre 2026 (orchestrateur) : P5 (a) fusionnée (`d102547`) : connexion (panneau `LoginPanel` chargé à la demande, `load-login-panel.ts`), garde de `/collegue`, déconnexions, socle des panneaux (un composant d'emplacement par panneau, posé dans le fichier de la session qui le remplit ; tableau « Emplacements des fiches collègue » et signatures de `staffWriteOptions` dans `journal/p5a.md`, qui fait foi pour les propriétaires de ces fichiers, § 5.0) ; REG-27 vert sur `react` ; budget 174,7 kB. Reportés : `gcTime` de l'état complet (§ 3.3), ligne Connexion (§ 3.3.3), identifiants d'URL `[\w+-]{1,64}` (§ 3.2), `features/staff/` (§ 3.1). Acceptés sans changement : `adoptBookingState` invalide l'état collègue sans garde de session après un ajout (la relecture se fait avec la session en cours, aucune fuite) ; cellule E-55 → REG-29 (faite par P5 (a)).
- Exécution, 4 octobre 2026 (orchestrateur) : P4 (d) fusionnée (`b0f7a69`), **P4 terminée** : 37 scénarios `@p4` verts sur `react`, `E2E_REACT_GREP` = `@p4|@framework` (40 tests), suite `legacy` 76/76, budget JS initial 169,1 kB gzip, aucun `useEffect`. Reportés : `features/r2/` (§ 3.1), contrôle de 10 h à l'envoi (§ 3.4). Animation `rise` du formulaire R1 rétablie (marqueur oublié par P4 (c)). REG-05 a échoué une fois sous la charge de la suite `react` complète puis passé 5 fois sur 5 seul : à surveiller en P7.
- Exécution, 4 octobre 2026 (orchestrateur) : P4 (c) fusionnée (`5fbb0d1`). Ligne E-56 corrigée (colonne « Scénario » = « n/a » exact, que le test `changedTagsMatchPlanGaps` exige ; la mention d'axe passe dans la colonne « Raison ») : le job E2E était rouge depuis `c758adf`. Reportés : `focusManager` sur `document` (§ 3.3), formulaires sans `lazy()` ni `<Suspense>` (P4), briques de `features/booking/` (§ 3.1), prop `errorShownBy` de `NumberField` (§ 3.5), R-36. Décisions de P4 (c) validées : formulaire gardé pendant l'envoi, « Aujourd'hui » n'efface pas le récapitulatif (comme `jumpToday`), focus du premier champ seulement à l'ouverture par « Réserver », fermeture sans animation de sortie.
- Exécution, 4 octobre 2026 (orchestrateur) : P4 (b) fusionnée (`5fd5baf`). Écart E-56 ajouté (jour passé pâli sans perte de contraste, arbitrage de l'orchestrateur contre une exception à S5). Reportés : notifications de Query en microtâche (§ 3.3) ; `getRouter()` démarre déjà les tâches de fond dans le navigateur (horloge pour minuit et 10 h, déconnexion, inactivité) : P5 (a) n'a plus qu'à vérifier leur branchement ; ‹ ›, « Semaine / Mois », « Aujourd'hui », « Réserver » et les cases du calendrier naviguent dans leur gestionnaire de clic (`IconButton` et `Button` ne rendent pas de lien).
- Exécution, 4 octobre 2026 (orchestrateur) : P4 (a) fusionnée (`09247a6`), reprise après un redémarrage de la session. Reportés : loader de `/` qui n'attend jamais le script (§ 3.2, § 3.3.1 étape 4, § 3.9 G-03), ordre `stripSearchParams` puis `retainSearchParams` (§ 3.2), `Toaster` monté dans son propre élément après `.app-root` (prop `container`). Arbitrage sur REG-03 (d) (`@changed:E-45`) : la variante `react` clique sur « Réessayer » après l'encadré, puis attend la fiche ; la variante `legacy` ne change pas.
- Exécution, 3 octobre 2026 (orchestrateur) : P0 (b) a réussi l'essai de la barrière client-only. Sur la route `/`, `useHydrated()` fait rendre exactement `PageSkeleton` pendant l'hydratation, ce qui permet `pendingMinMs: 0` sans erreur #418 (contenu à 127 ms, 628 ms avec CPU ×6, 10 chargements sans #418). La barrière est retenue (arbitrage 16 bis). `pendingMinMs: 0` **sans** barrière reste interdit, comme `onRecoverableError`. Sections mises à jour : § 0, § 3.2, § 3.3.1, § 3.9, E-47, P4, annexe C.
- Révision du 3 octobre 2026 (relecture) : arbitrage 16 + synthèse des corrections C/F/X/faisabilité.
  - Arbitrage 16 : **TanStack Start conservé** malgré le résultat du spike R-01. Avec la copie locale, la coquille prérendue affiche le squelette environ 500 à 600 ms (`pendingMinMs` par défaut) avant le contenu ; ce délai est accepté. `pendingMinMs: 0` est interdit (erreur React #418 à chaque chargement) ; un `onRecoverableError` qui masquerait #418 est refusé. « Router seul » reste un repli documenté, seulement en cas de bogue bloquant d'hydratation (§ 1.4 invariant 2, S4, § 2.1, P0, R-01).
  - Relecture de cohérence (C-01 à C-39) : renvois, vocabulaire (`available` / `almostFull` / `full`), types du domaine écrits à la main, exceptions de `background/`, projets Vitest et Playwright, checklist de bascule, journal des arbitrages 1 à 11.
  - Relecture de couverture (F-01 à F-37) : écarts de parité numérotés `E-01` à `E-49` (§ 4.2), fuite de l'état complet après une déconnexion pendant une écriture (F-02, § 3.3.3), fiches et focus du mode collègue (P5), panneaux « Ouvrir un jour » et Paramètres gardés ouverts comme aujourd'hui (F-04), annexe F « Textes nouveaux », 43 scénarios de régression `REG-01` à `REG-43` dans [`parite.md`](parite.md).
  - Relecture d'exécutabilité (X-01 à X-41) : Chromium par `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, Node ≥ 22.18, exclusions des outils, isolation réseau et faux script par défaut en développement, `TEST_NOW`, interface du faux script, 31 sessions, politique de branches et propriétaires des fichiers partagés (§ 5.0), messages de lancement dans [`lancements.md`](lancements.md), `CLAUDE.md` réécrit (annexe C).
  - Faisabilité (projet d'essai combiné, copié dans [`recherche/spike-integration/`](recherche/spike-integration/README.md)) : messages seulement par `defineMessages` ou `<FormattedMessage>`, msw 3 (`onUnhandledFrame`, `msw init --save`), Storybook en 3e projet Vitest avec sa propre config Vite, scripts en `.ts`, configuration knip, 8 règles oxlint en conflit avec les extraits, `Toast.Provider limit={1}`, budget mesuré 166,9 kB gzip ; fichiers d'AppResaAristide copiés dans [`recherche/appresaaristide/`](recherche/appresaaristide/PROVENANCE.md).
- Révision du 3 octobre 2026 : arbitrages 12 à 15 et décisions produit.
  - Arbitrage 12 : identifiants, fichiers, dossiers, ids react-intl et commentaires en anglais ; textes affichés et documentation en français ; chemin `/collegue` et search params inchangés ; champs de `Code.gs` et de la copie locale traduits à la frontière de l'API (§ 3.1, § 3.3.6, glossaire en annexe E).
  - Arbitrage 13 : tests de composants et de routes en Vitest Browser Mode (jsdom et Testing Library retirés), Storybook dont chaque story est un test avec axe, un seul faux Apps Script msw pour les tests, Storybook et l'E2E ; E2E réduit aux parcours complets (§ 1.5, § 2, § 3.1, P0 à P7, R-28, annexe C).
  - Arbitrage 14 : nouvelle phase P1 « Régression sur l'ancien site » (suite Playwright verte contre `legacy/`, critère de sortie des phases suivantes) ; phases renumérotées P0 à P8.
  - Arbitrage 15 : bascule directe, sans préproduction `/v2/` ; validation par les collègues sur un build local ou l'artefact CI ; réglages Pages en P8 (§ 0, P0, P7, P8, § 6.2, § 7).
  - Décisions produit arrêtées : D-01 (easter egg) conservé ; D-04, D-08, D-09 et D-25 non retenues (comportement actuel conservé) ; react-day-picker exclu (calendrier maison confirmé).
- 3 octobre 2026 : première version, qui intègre les arbitrages 1 à 11 :
  1. TanStack Start en mode SPA (coquille prérendue), publié sur GitHub Pages (§ 2, § 3.11).
  2. Expérience utilisateur conservée (page à deux colonnes, mode collègue dans la même page, pas de refonte) ; état d'affichage dans l'URL (§ 1.3, § 3.2).
  3. TanStack Query pour les données du script (§ 3.3).
  4. Zustand pour la session collègue et l'horloge (§ 3.4).
  5. Base UI, TanStack Form et CSS Modules (§ 3.5, § 3.6).
  6. Outillage : TypeScript 7, oxlint type-aware, oxfmt, knip, Vitest, Playwright, lefthook (§ 2).
  7. Conventions : alias `@/`, exports nommés, pas de barrels, co-location (§ 3.1).
  8. Réutilisation d'AppResaAristide et d'element-admin (validateurs, dates, champs pré-liés, dispositif react-intl) (§ 2, P2, P3).
  9. Stratégie : réécriture complète sur une branche d'intégration, bascule en une fois (§ 0).
  10. `Code.gs` inchangé (§ 1.3, annexe B).
  11. react-intl / FormatJS pour tous les textes (fr-FR seul, pluriels ICU, format `euro`), dates longues avec « 1er » (D-03, § 3.10).

Documents de référence, à garder ouverts :
- **La spécification de l'appli actuelle** : [`docs/spec/`](../spec/README.md). Elle fait foi pour tout comportement et tout texte affiché. Les renvois « `04` § 5.2 » désignent ses fichiers ; « a-12 », « b-3 », « c-7 » désignent les points d'attention consolidés de son [README § 3](../spec/README.md#3-points-dattention-consolidés).
- **Les rapports de recherche** : [`docs/migration/recherche/`](recherche/README.md) (justifications, mesures, extraits de code), le **projet d'essai combiné** [`recherche/spike-integration/`](recherche/spike-integration/README.md) (point de départ de P0), les configurations de [`recherche/toolchain-files/`](recherche/toolchain-files/) et les fichiers repris d'AppResaAristide dans [`recherche/appresaaristide/`](recherche/appresaaristide/PROVENANCE.md).
- **La matrice de parité** [`parite.md`](parite.md) (scénarios `REG-xx`) et les **messages de lancement** des sessions [`lancements.md`](lancements.md).
- `Code.gs` : le contrat du backend. **Il ne change pas.**

Conventions de ce document : « j-p » = jour-personne ; « session » = une session d'agent d'environ une demi-journée de travail utile, CI comprise ; `␣` = espace insécable U+00A0, comme dans la spec.

---

## 0. Résumé

1. **Quoi.** Réécrire le frontend (`index.html`, `js/*.js`, `app.css`, `design-system.css`, environ 2 250 lignes) en React 19.3 avec TanStack Start 1.168 en mode SPA, publié sur GitHub Pages. Le backend Google Apps Script (`Code.gs` + Google Sheets) est conservé tel quel.
2. **Pourquoi.** Le rendu actuel reconstruit le DOM à chaque changement et doit sauver puis restaurer saisies et focus ; aucun état n'est partageable ni testable ; la spec recense 26 défauts du frontend (a-1 à a-26), dont un bloquant : les données personnelles restent en mémoire après la déconnexion (a-1).
3. **Ce qui ne change pas pour les utilisateurs.** La page publique à deux colonnes (R1 vert, R2 magenta), les calendriers semaine / mois, les fiches du jour, les formulaires dépliés sous la fiche, le mode collègue dans la même page, les textes et la charte. Les seules différences visibles sont les écarts numérotés du § 4.2.
4. **Comment.** Réécriture complète sur la branche d'intégration, **sans préproduction publiée** (arbitrage 15) : pendant tout le développement, Pages continue de servir `main` tel quel en mode « branche » (le site actuel ne bouge pas) ; la CI de la branche vérifie tout (check, build, budget, E2E) sans rien déployer ; les collègues valident sur un build local ou sur l'artefact de la CI. Bascule directe en une fois (P8) : tag `v1-final` sur `main`, source Pages passée en « GitHub Actions » juste avant la fusion ; retour arrière par la source Pages ou `git revert`.
5. **État.** L'URL porte l'état d'affichage (jours, vues, formulaire ouvert, panneaux collègue) ; TanStack Query porte les données du script ; un store Zustand en mémoire porte la session collègue ; TanStack Form porte les saisies. Objectif : 0 à 2 `useEffect` dans toute l'appli.
6. **Performance perçue.** Lecture anticipée dans la coquille HTML ; contenu affiché depuis la copie locale `reservations-cache-v1` (même clé, même format) sans attendre le réseau, après la coquille prérendue (squelette ≤ 600 ms, arbitrage 16) ; etag, lecture doublée à 6 s, un seul nouvel essai à 1,5 s.
7. **Textes et formats.** Tous les textes passent par react-intl (FormatJS) en français seul : pluriels ICU, montants et dates `Intl`, extraction `translations/fr.json` vérifiée en CI ; les textes nouveaux sont listés à l'annexe F.
8. **Qualité.** TypeScript 7 strict, oxlint type-aware pédantique, oxfmt, knip ; Vitest (projets `node` et `node-ny` pour la logique pure, **Vitest Browser Mode** dans Chromium pour les composants et les routes, projet `storybook` où chaque story est un test avec axe), un seul faux Apps Script msw partagé par les tests, Storybook et l'E2E (arbitrage 13) ; aucun test ni agent n'appelle le vrai script (isolation réseau). **La parité se prouve** : une suite Playwright de régression de 43 scénarios ([`parite.md`](parite.md)) est écrite d'abord contre l'ancien site (phase P1, arbitrage 14), puis rejouée contre le nouveau à chaque phase ; un comportement ne change que s'il figure au § 4.2 avec son identifiant `E-xx` et son scénario `@changed`.
9. **Effort.** Environ **35,5 j-p** (43 avec 20 % de marge), soit **31 sessions d'agent** réparties en 9 phases (P0 à P8), plus 1 à 2 semaines calendaires de test par les collègues.
10. **Risques principaux.** (1) Hydratation de la coquille Start avec un premier rendu issu de la copie locale : tranché par l'arbitrage 16 et l'essai réussi de P0 (b) (barrière client-only `useHydrated()` + `pendingMinMs: 0` sur `/`, contenu à environ 130 ms ; `pendingMinMs: 0` sans barrière interdit, Router seul en repli seulement si un bogue bloquant apparaît). (2) Budget JS initial (200 kB gzip ; 166,9 kB mesurés sur le projet d'essai) : formulaires publics et mode collègue chargés à la demande. (3) Outils récents ou expérimentaux (React Compiler en Rust, jsPlugins d'oxlint, oxfmt 0.x, msw 3 publié le 28 septembre 2026) : un plan B pour chacun. (4) Lenteur et pages d'erreur d'Apps Script. (5) Bascule Pages directe, sans préproduction publiée : source « GitHub Actions » à changer juste avant la fusion, Jekyll, cache de 10 min, copies locales v1 des visiteurs habituels à relire. (6) Requête de test qui partirait vers le vrai script : isolation réseau obligatoire (R-33).
11. **À valider par vous.** 27 décisions produit (§ 4.1) : D-01 (conservé), D-04, D-08, D-09 et D-25 (non retenues, comportement actuel) sont tranchées depuis le 3 octobre 2026 ; les autres ont une valeur par défaut que le plan applique sauf avis contraire ; s'y ajoutent les 49 écarts de parité numérotés (§ 4.2) et les textes nouveaux (annexe F).

---

## 1. Objectifs, périmètre, non-objectifs

### 1.1 Objectifs

- Reproduire **fonctionnellement à l'identique** l'appli décrite par `docs/spec/` (écrans de `09`, textes exacts, règles de `01`, contrat de `02`, chargement de `03`), avec un code testable et maintenable ; « à l'identique » se mesure par la suite de régression (S1) et ne souffre que les écarts du § 4.2.
- Corriger les 26 points a-* côté client (traçabilité au § 4.3) et contourner côté client les limites b-* qui peuvent l'être (b-6, b-7, b-11 et b-12 : signalement seulement, annexe B).
- Mettre l'état d'affichage dans l'URL (liens partageables, bouton Retour, rechargement), selon le schéma de `09` § 1.
- Doter le dépôt d'un outillage complet : formatage, lint typé, vérification de types, tests unitaires, d'intégration et E2E, analyse d'accessibilité, budget JS, CI et déploiement automatique.

### 1.2 Périmètre

- Tout le frontend : page publique, mode collègue, impressions, chargement et cache local.
- Le déploiement GitHub Pages (passage en source « GitHub Actions » au moment de la bascule, P8).
- La documentation du dépôt (`README.md`, `CLAUDE.md`).

### 1.3 Non-objectifs

- **Aucune modification de `Code.gs`** ni de la feuille Google Sheets, ni des e-mails envoyés par le script. Les évolutions souhaitables sont listées à l'annexe B pour le responsable du script.
- Aucune refonte ergonomique : pas de calendrier unique pour les deux restaurants, pas d'espace collègue à onglets, pas de modale de confirmation à la place de la suppression en deux clics, pas de nouvelle fonction hors § 4.
- Pas de SSR, pas de server function, pas de service worker en production, pas de traduction (français seulement), pas de session collègue persistante.

### 1.4 Les 5 invariants (repris de `docs/spec/README.md` § 2)

1. **Aucune donnée personnelle dans le navigateur hors session collègue** : la copie locale (`localStorage`) ne contient que jours, plats, paramètres et sommes anonymes ; le mot de passe et l'état complet ne vivent qu'en mémoire, jamais dans l'URL, le stockage, un service worker ou le cache HTTP — et l'état complet doit être **purgé à la déconnexion**, y compris quand une écriture collègue répond après la purge (ce que le code actuel ne fait pas, a-1).
2. **Affichage depuis le cache sans attendre le réseau, lecture en vol avant le bundle** : contenu affiché depuis la copie locale `reservations-cache-v1` (même clé, même format) sans attendre le réseau, après la coquille prérendue (squelette ≤ 600 ms, arbitrage 16) ; lecture lancée par un script inline du `<head>` avec l'etag, `?since=` à chaque lecture, lecture doublée à 6 s et 2e tentative à 1,5 s, jamais de rejeu d'écriture ; réservation possible sur données encore périmées (le serveur fait foi).
3. **Idempotence par `requestId`** : un identifiant généré à l'ouverture de chaque formulaire de réservation (public et ajout collègue), conservé pour tout nouvel essai tant que le formulaire est ouvert, renouvelé à chaque ouverture ; `_duplicate` traité sans seconde réservation.
4. **Cut-off d'Aristide à 10 h** : à partir de 10 h le jour J et pour tout jour passé, pas de commande publique en ligne ; message exact de clôture ; bascule automatique à 10 h pile sans rechargement (formulaire ouvert fermé) ; contrôle repris à l'envoi ; les collègues n'y sont pas soumis. *Écart assumé : l'heure de référence devient celle de Paris (D-12, E-01).*
5. **Un ticket restaurant par commande** : un jour avec au moins un plat au ticket est « sur place » uniquement (réservation publique, ajout et modification par un collègue), et le montant d'une commande compte au plus **un** ticket, quels que soient le nombre de plats et de portions au ticket (le script, lui, n'en sait rien).

### 1.5 Critères de réussite mesurables

| # | Critère | Mesure | Seuil | Vérifié en |
| --- | --- | --- | --- | --- |
| S1 | Parité fonctionnelle | Chaque identifiant de `09` (G-01 à G-08, P-01, P-01b, P-02, P-02b, P-03 à P-08, P-10 à P-17, L-01, C-01 à C-06, C-10, C-10b, C-11 à C-14, C-20 à C-24, C-30, I-00 à I-04, plus `09` § 6 et § 7) couvert par au moins un scénario de la suite de régression (`e2e/regression/`, scénarios `REG-xx` de [`parite.md`](parite.md)), vert contre l'ancien site (projet `legacy`) puis contre le nouveau (projet `react`) ; G-06 et I-00, qui disparaissent, par un scénario `@changed` ; G-05 côté `react` par une story et un test Vitest (F-07) ; un test compare les étiquettes `@changed:E-xx` de la suite aux identifiants du § 4.2 | 100 % des identifiants de `09` ; écarts `@changed` = ceux du § 4.2, ni plus ni moins | P1, P4 à P7 |
| S2 | Textes exacts | Tests qui comparent les chaînes rendues (via l'instance `intl`) à celles de `04` § 9, `05` (§ 2.3, § 2.5, § 4.3, § 4.4, § 4.6), `06` (§ 1 à § 8), `07`, `03` § 2 et § 3.1, `00` § 2.3, espaces insécables comprises ; un test vérifie que chaque `defaultMessage` de `translations/fr.json` figure dans `docs/spec/` ou à l'annexe F | 0 écart non listé (spec ou annexe F) | P4 à P6 |
| S3 | Budget JS initial (visiteur public, `/`) | `scripts/check-budget.ts` : somme gzip du point d'entrée, du chunk de la route `/` et de leurs imports statiques (manifeste Vite) ; mesuré sur le projet d'essai : 166,9 kB (Start, page d'essai qui charge `Dialog`, `NumberField` et un formulaire dès le départ) | ≤ 200 kB gzip ; CSS ≤ 25 kB gzip | CI dès P0 |
| S4 | Premier rendu depuis la copie locale | E2E `e2e/hydration.spec.ts` sur le build de production : `localStorage` prérempli, réponse du script retenue 5 s ; un `MutationObserver` injecté par `addInitScript` relève l'apparition du squelette et du contenu ; même test avec `reservations-textes` seul | aucune erreur console d'hydratation (#418, « Hydration ») ; contenu de la copie visible avant toute réponse du script ; squelette ≤ 600 ms ; aucun retour au squelette après le premier rendu du contenu | P0, P4, P7 |
| S5 | Accessibilité | `@storybook/addon-a11y` en mode `error` sur chaque story (projet Vitest `storybook`) ; `@axe-core/playwright` sur quelques écrans complets (P7) | 0 violation (aucune liste d'exceptions) | P3 à P7 |
| S6 | Effets | `grep -rE "use(Layout)?Effect\(" src --include=*.tsx --include=*.ts --exclude=*.test.* --exclude=*.stories.tsx --exclude-dir=test` en CI | 0 à 2 occurrences, chacune commentée | CI dès P4 |
| S7 | Qualité | `pnpm check` (extraction, format, lint, `tsc`, tests, knip) et build | vert sur chaque push et chaque PR | CI |
| S8 | Données personnelles | Tests : après déconnexion, aucune entrée `['state','staff']`, cache des mutations vide, aucun nom dans le DOM ; déconnexion pendant une écriture collègue lente : la réponse arrivée après la purge n'écrit rien dans le cache (F-02) ; mot de passe absent de `localStorage`, `sessionStorage`, de l'URL, des clés de requête et des sorties `console.*` (espion) | 0 fuite | P5 |
| S9 | Validation humaine | Build de la branche (local ou artefact CI, `pnpm serve`) utilisé par les collègues sur le vrai script avant la fusion, connexion collègue réelle comprise | accord écrit du responsable | P7 |

---

## 2. Stack arrêtée

Versions relevées le 3 octobre 2026 dans les rapports (colonne « Source ») et **installées ensemble** dans le projet d'essai combiné ([`recherche/spike-integration/`](recherche/spike-integration/README.md), `pnpm check` vert en 30 s). P0 installe exactement ces versions, épinglées (`save-exact`) ; une version ne monte que si l'installation ou un test échoue, et la session le note dans son journal.

| Paquet | Version | Rôle | Source |
| --- | --- | --- | --- |
| `pnpm` | 12.8.1 (`packageManager`) | Gestionnaire de paquets. `pnpm-workspace.yaml` : `trustPolicy: no-downgrade`, `trustPolicyExclude: [semver@6.3.1]`, `strictDepBuilds: true`, `allowBuilds: { esbuild: false, msw: false }`, `strictPeerDependencies: true`, `peerDependencyRules.allowedVersions: { eslint: "10", vite: "8", typescript: "7", msw: "3" }` ; `minimumReleaseAge` (défaut de pnpm 12) ajoute seul les versions de moins d'un jour à `minimumReleaseAgeExclude`. Si corepack échoue : `npm i -g pnpm@12.8.1` | toolchain § 6, element-admin § 1.7, spike |
| Node | `engines.node: ">=22.18"` ; `.node-version` = 22.22.2 (lu par la CI) | 22.12 suffit à msw 3 et Vite 8 ; 22.18 exécute les scripts `.ts` sans option (suppression native des types). Les sessions cloud tournent sous 22.22.0 : ni `engine-strict`, ni `devEngines` | toolchain § 6, spike |
| `react`, `react-dom` | 19.3.0 | UI ; `ref` en prop, `<ViewTransition>` stable | react-architecture § 1 |
| `@tanstack/react-start` | 1.168.60 | Coquille SPA prérendue, plugin Vite, génération des routes ; **conservé malgré le spike R-01** (arbitrage 16, § 2.1) | tanstack-start § 2, spike |
| `@tanstack/react-router` | 1.170.41 | Routage par fichiers, search params validés | tanstack-start § 4 |
| `@tanstack/react-query` | 5.104.1 | Données du script, cache, actualisation, mutations | tanstack-query § 1 |
| `@tanstack/react-form` | 1.33.5 (rester en 1.x) | Formulaires (`createFormHook`, `revalidateLogic`) ; embarque `@tanstack/devtools-event-client` (≈ 4 kB minifiés) même en production | ui-forms § 5, spike |
| `@base-ui/react` | 1.8.0 | Primitives accessibles non stylées | ui-forms § 1 |
| `zustand` | 5.0.15 | Store de session et horloge | react-architecture § 3 |
| `valibot` | 1.5.0 | Schémas des réponses, search params, formulaires (Standard Schema) | tanstack-query § 10 |
| `vite` | 8.3.2 | Build (Rolldown, Oxc), `resolve.tsconfigPaths` | tanstack-start § 1 |
| `@vitejs/plugin-react` | 6.1.1 | Fast Refresh, `compiler: true` | toolchain § 7 |
| `oxc-transform-react` | 0.145.0 (`~0.145.0`) | React Compiler en Rust (**expérimental**) ; 0.152 incompatible avec plugin-react 6.1 (qui déclare `^0.145.0`) | tanstack-start § 1, spike |
| `typescript` | 7.0.2 (`tsc`) | Vérification de types (compilateur natif) ; pas de `baseUrl` | toolchain § 1 |
| `@types/node`, `@types/react`, `@types/react-dom` | 26.6.4, 19.3.0, 19.3.0 | Types ; ceux de Node seulement pour `scripts/`, `e2e/` et les configurations (`/// <reference types="node" />`) | spike |
| `oxlint` + `oxlint-tsgolint` | 1.86.0 + 7.0.2003 (à monter ensemble) | Lint pédantique, règles typées, `typeCheck`, règles React Compiler natives | toolchain § 2-3 |
| `@tanstack/eslint-plugin-query`, `@tanstack/eslint-plugin-router` | 5.104.1, 1.162.0 | Règles TanStack chargées par `jsPlugins` (**alpha**) | toolchain § 1 |
| `oxfmt` | 0.71.0 | Formatage (tri des imports, `package.json`, Markdown, HTML, CSS, JSON : d'où les exclusions de P0) | toolchain § 4 |
| `react-intl` | 12.1.3 | Tous les textes de l'interface (`FormattedMessage`, `useIntl`, `createIntl`, `defineMessages`), pluriels et ordinaux ICU, montants et dates ; langue unique `fr-FR` (arbitrage 11) | element-admin (`src/intl.tsx`, react-intl 12.0.1) ; § 3.10 |
| `@formatjs/unplugin` | 1.2.12 | Plugin Vite : messages précompilés en AST (`ast: true`), donc pas d'analyseur ICU dans le bundle de production (−7,4 kB gzip mesurés) | element-admin (`vite.config.ts`) ; spike |
| `@formatjs/cli` | 6.16.32 | `formatjs extract` → `translations/fr.json` (versionné, contrôlé en CI) | element-admin (`i18n:extract`) |
| `eslint-plugin-formatjs` | 8.1.0 | Règles FormatJS chargées par `jsPlugins` d'oxlint (déjà en production chez element-admin, 8.0.1) ; tire `eslint` 10 en peer | element-admin (`.oxlintrc.json`) |
| `knip` | 6.39.0 | Code et dépendances morts (deux passes, configuration du § 3.1) | toolchain § 6, spike |
| `lefthook` | 2.1.16 | Hooks git (pre-commit, pre-push) | toolchain § 6 |
| `vitest`, `@vitest/coverage-v8` | 5.0.3 | Tests : projets `node` et `node-ny` (logique pure, tests dorés en `vm`), `browser` (composants, routes, tâches de fond), `storybook` (stories) ; couverture de `src/domain/` | toolchain § 6 ; arbitrage 13 ; spike |
| `@vitest/browser-playwright` | 5.0.3 | Vitest Browser Mode, fournisseur Playwright, Chromium headless ; `launchOptions.executablePath` lu dans `PLAYWRIGHT_CHROMIUM_EXECUTABLE` | arbitrage 13, spike |
| `vitest-browser-react` | 2.3.0 | `render` (asynchrone) et `page.getByRole`… dans le navigateur ; `userEvent` de `vitest/browser` | arbitrage 13 |
| `storybook`, `@storybook/react-vite`, `@storybook/addon-vitest`, `@storybook/addon-a11y` | 10.6.1 | Stories en **CSF Next** (`definePreview`, `preview.meta`, `meta.story`) de `ui/` et des fiches, formulaires et panneaux dans leurs états de `09` ; config Vite propre `.storybook/vite.config.ts` (sans le plugin Start) ; chaque story exécutée comme test par le projet Vitest `storybook` (plugin `storybookTest`) et contrôlée par axe (`a11y.test: "error"`) ; tire `prettier` en peer | arbitrage 13, spike |
| `msw-storybook-addon` | 3.0.3 | Handlers du faux script dans les stories (`addonMsw()`, `beforeEach: ({ msw }) => msw.use(…)` ; `parameters.msw` est déprécié) | arbitrage 13, spike |
| `msw` | 3.0.2 | Faux Apps Script unique (`src/mocks/apps-script.ts`) : service worker (`setupWorker`, `public/mockServiceWorker.js` créé par `pnpm exec msw init public/ --save`, versionné, retiré du build de production) dans les tests navigateur, Storybook et `pnpm dev` ; Node (`setupServer`) pour les tests de `api/`. Mode strict : `worker.start({ onUnhandledFrame: "error", quiet: true })` (l'option `onUnhandledRequest` n'existe plus ; une requête non gérée reçoit une réponse 500). Relancer `msw init` après chaque montée (postinstall bloqué par `allowBuilds`) | tanstack-query § 9 ; arbitrage 13 ; spike |
| `@playwright/test`, `playwright` | 1.63.0 | E2E sur le build servi en statique : suite de régression (projets `legacy` et `react`), E2E propres au nouveau code (projet `react-only`), production (P8) ; Chromium par `PLAYWRIGHT_CHROMIUM_EXECUTABLE` dans les sessions cloud | react-architecture § 0 ; arbitrages 13 et 14 ; spike |
| `@msw/playwright` | 0.7.0 | Mêmes handlers du faux script en E2E (`defineNetworkFixture`), contre l'ancien et le nouveau site ; compatibilité avec msw 3.0.2 vérifiée (peer `msw >=3`) | element-admin § 8, spike |
| `@axe-core/playwright` | 4.13.0 | Accessibilité E2E (`import { AxeBuilder }`, import nommé) | element-admin § 8, spike |
| `@tanstack/react-query-devtools`, `@tanstack/react-router-devtools` | 5.104.1, 1.167.2 | Développement seulement (retirés du build) | tanstack-start § 6 |
| `@fontsource-variable/outfit`, `@fontsource-variable/work-sans` | 5.3.0 | Polices auto-hébergées (D-23) | react-architecture § 9 |
| `stylelint` + `stylelint-config-standard` + `stylelint-declaration-strict-value` | à relever | Optionnel : interdire couleurs, tailles et rayons en dur | element-admin § 1.7 |

Exclus volontairement : Tailwind, ESLint (sauf en peer de `eslint-plugin-formatjs`), Prettier (sauf en peer de Storybook), zod, date-fns, Temporal et son polyfill, react-aria, react-day-picker (dépend de date-fns 4, pas de vue semaine : calendrier maison, § 3.5), l'environnement DOM simulé et la bibliothèque de tests de composants de `toolchain-files/` (remplacés par Vitest Browser Mode, arbitrage 13, § 6.1), `PersistQueryClientProvider` et les persisteurs Query, `react-to-print`, bibliothèque d'icônes, `@tanstack/router-plugin` (Start l'embarque ; il ne revient qu'avec le repli Router seul, 1.168.42).

### 2.1 Éléments expérimentaux ou jeunes, et plan B

| Élément | Statut | Signal d'abandon | Plan B |
| --- | --- | --- | --- |
| TanStack Start en mode SPA (hydratation de la coquille) | **tranché (arbitrage 16) : conservé.** Spike R-01 mesuré dans le projet d'essai (build de production, Chromium, médiane de 5 essais, copie locale présente) : réglages du plan (`pendingMinMs` par défaut, 500 ms) → contenu à **594 ms**, aucune erreur ; `pendingMinMs: 0` → contenu à 115 ms mais erreur React **#418** à chaque chargement ; `pendingMinMs` de 16 ou 50 ms → course (#418 avec CPU ×6) ; Router seul → contenu à **103 ms**, 0 erreur, **−13,5 kB gzip**. Le squelette ≤ 600 ms est accepté ; `pendingMinMs: 0` seul est interdit ; `onRecoverableError` pour masquer #418 est refusé. Mesures sur le vrai projet (P0 (b), build `build:e2e`, Chromium, copie locale, 5 essais par réglage) : réglages par défaut → contenu à 610 ms (médiane, CPU ×1) et 1 073 ms (CPU ×6), squelette visible 580 à 590 ms, aucune erreur ; `pendingMinMs: 0` sans barrière → #418 à chaque chargement ; **essai de la barrière client-only réussi** : `useHydrated()` (`features/page/use-hydrated.ts`) fait rendre exactement `PageSkeleton` pendant l'hydratation, avec `pendingMinMs: 0` sur la route `/` → contenu à 127 ms (CPU ×1) et 628 ms (CPU ×6), aucune image de squelette après le premier rendu de React, aucune #418 sur 10 chargements ; barrière retenue sur `/` (journal `p0b.md`) | bogue bloquant d'hydratation seulement : erreur d'hydratation avec les réglages par défaut, contenu faux ou perdu, régression amont de Start ; la durée du squelette (≤ 600 ms) n'est plus un signal | **Router seul**, repli documenté : `index.html` écrit à la main (script anticipé **avant** la CSS, squelette statique dans `#root`), `src/main.tsx` avec `createRoot` (pas d'hydratation), `@tanstack/router-plugin` 1.168.42 (`autoCodeSplitting`, placé avant `react()`), `createRouter({ basepath: import.meta.env.BASE_URL, defaultPendingMinMs: 0 })`, `<title>` React 19 ; `scripts/check-budget.ts` compte aussi le chunk de la route `/` (`dynamicImports` du manifeste) ; R-02, R-03 et R-12 disparaissent ; routes, Query, UI et tests inchangés. Démonstration : `recherche/spike-integration/router-only/` et `vite.router.config.ts` |
| React Compiler Rust (`react({ compiler: true })`) | marqué « experimental » ; actif dans le spike (`react.memo_cache_sentinel` présent dans les chunks) | erreur de build, comportement différent en prod | `compiler: { compilationMode: "annotation" }`, ou voie Babel `@rolldown/plugin-babel` + `reactCompilerPreset()`, ou désactivation (le code reste correct, seulement moins mémoïsé ; les règles de lint du compilateur restent actives dans oxlint) |
| `jsPlugins` d'oxlint (règles TanStack et FormatJS) | alpha, hors semver | plantage ou faux positifs après une mise à jour | retirer le plugin en cause (perte de ses règles seulement) ; `formatjs extract --throws` en CI garde le contrôle des messages ; les règles typées des plugins sont déjà inactives |
| `@formatjs/unplugin` (`ast: true`) | 1.x, récent (oxc-parser) ; ne précompile que les messages qu'il reconnaît (§ 3.10) | message mal transformé, espaces modifiées | garder l'analyseur ICU (sans l'alias `no-parser`, +7,4 kB gzip) ou précompiler avec `formatjs compile --ast` et charger `translations/compiled/fr.json` comme element-admin |
| `oxfmt` 0.x | bêta | régression de formatage | Prettier 3.8 avec la même config (oxfmt est compatible) |
| `options.typeCheck` d'oxlint | récent | divergence avec `tsc` | `tsc --noEmit` reste en CI de toute façon |
| msw 3 (3.0.0 du 28 septembre 2026, 3.0.2 du 3 octobre) et `@msw/playwright` 0.7 | très jeunes ; chaîne vérifiée par le projet d'essai (Vitest navigateur, Storybook, Playwright contre l'ancien site) | échec d'installation ou d'interception après une mise à jour | rester sur les versions du § 2 ; en E2E, `page.route('https://script.google.com/macros/s/*/exec')` natif de Playwright avec le même faux script |
| Storybook 10.6 + `addon-vitest` + Vitest 5 | vérifié par le projet d'essai (3e projet Vitest, config Vite propre) | `addon-vitest` refuse une montée de Vitest | stories rendues par `composeStories` dans des tests Vitest Browser Mode, axe appelé par `axe-core` dans ces tests |
| Chromium des sessions cloud | révision 1194 (Playwright 1.56.1) alors que Playwright 1.63 attend la 1243 : `PLAYWRIGHT_BROWSERS_PATH` seul ne suffit pas | Playwright 1.63 refuse ce Chromium (protocole) | `executablePath` lu dans `PLAYWRIGHT_CHROMIUM_EXECUTABLE` (vérifié par le spike) ; sinon épingler `@playwright/test` et `playwright` à la version des navigateurs préinstallés, décision notée au journal |
| TypeScript 7 (pas d'API JS) | stable | un outil exige l'API JS | `@typescript/typescript6` en parallèle pour cet outil seulement |

---

## 3. Architecture cible

### 3.1 Arborescence

Alias `@/*` → `src/*` et `@translations/*` → `translations/*` (`paths` du `tsconfig.json`, sans `baseUrl`, et `resolve.tsconfigPaths: true`). Noms de fichiers : composants en `PascalCase.tsx`, modules en `kebab-case.ts`, routes selon la convention TanStack. Pas de fichier `index.ts` de réexport.

**Langue du code (arbitrage 12, comme AppResaAristide)** :
- **Anglais seulement** pour tout ce qui est du code : identifiants (variables, fonctions, types, composants, hooks, clés de requête et de mutation, valeurs d'énumération comme `SessionEnd`), noms de fichiers et de dossiers sous `src/`, `e2e/` et `scripts/`, ids des messages react-intl et noms de leurs placeholders, noms de formats, classes CSS et noms de page `@page` nouveaux, commentaires. Le vocabulaire métier suit le glossaire de l'annexe E (couvert → `seat`, plat → `dish`, réservation → `booking`, commande R2 → `order`, ticket restaurant → `voucher`, collègue → `staff`…) ; un terme absent du glossaire y est ajouté avant d'être utilisé.
- **Français** pour tout ce que voit l'utilisateur : `defaultMessage` react-intl recopiés de la spec, textes des toasts, libellés, `aria-label`.
- **Français** pour la documentation et l'historique : ce plan, `docs/spec/`, `docs/migration/`, `README.md`, la prose de `CLAUDE.md` (dont les noms de fichiers de documentation, comme `docs/migration/parite.md`), les messages de commit et les descriptions de PR.
- **Exceptions, parce qu'elles sont visibles de l'utilisateur ou imposées par un contrat extérieur** : le chemin d'URL `/collegue` (cité dans `09` ; le fichier de route reste donc `routes/collegue.tsx`, puisque TanStack Router déduit le chemin du nom de fichier) ; les noms et valeurs des search params (`r1`, `r2`, `r1vue`, `r2vue`, `r1periode`, `r2periode`, `semaine`, `mois`, `reserver`, `connexion`, `retour`, `ouvrir`, `ouvrirDate`, `parametres`, `editJour`, `editResa`, `ajout`, `ajoutPlat`, `editPlat`) ; les champs de l'API de `Code.gs` (`Date`, `Capacite`, `Qte`, `Nom`, `ItemID`, `nbEleve`, `mode: 'surplace'`…) et ceux de la copie locale `reservations-cache-v1`, qui n'apparaissent **que** dans `src/api/schemas.ts`, `src/api/staff-schemas.ts`, `src/api/actions.ts`, `src/queries/local-cache.ts`, `src/api/early-fetch.ts` (`etag` et `savedAt` de la copie), `src/mocks/**` (faux script et fixtures) et leurs tests (traduction à la frontière, § 3.3.6) ; les clés `localStorage` existantes ; les noms des anciens fichiers et fonctions cités comme sources (`legacy/js/donnees.js`, `loadCache`).

```
reservations-restaurants/
├── .github/
│   ├── workflows/ci.yml        jobs parallèles, SANS déploiement sur la branche d'intégration et les PR : `check` (i18n:extract + git diff
│   │                           translations/fr.json → format:check → oxlint → tsc → tests node → knip → grep des effets S6), `browser` (tests
│   │                           navigateur et stories), `e2e` (build:e2e + git diff src/routeTree.gen.ts → E2E → build de production avec la
│   │                           variable de dépôt → budget → upload-artifact de dist/client) ; job `deploy` (upload-pages-artifact → deploy-pages)
│   │                           limité au push sur main, actif à partir de la bascule (P8) ; actions épinglées par SHA
│   └── dependabot.yml          mises à jour groupées (tanstack, vite, react, types, storybook, formatjs) avec délai de 7 jours
├── .editorconfig .gitignore .node-version .npmrc     repris de recherche/spike-integration ; .gitignore OBLIGATOIRE (node_modules, dist, .output, coverage,
│                                                     .tanstack, playwright-report, test-results, storybook-static, *.local)
├── .oxlintrc.json .oxfmtrc.json knip.json            repris de recherche/spike-integration (alias @/, § 6.1) ; exclusions identiques (P0)
├── .env.development            VITE_MOCK_API=1 et VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/FAKE/exec : `pnpm dev` tourne sur le faux script
├── .env.test                   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/FAKE/exec (Vitest, Storybook, build:e2e), versionné
├── .env.example                commenté : `.env.real.local` (non versionné) porte l'URL réelle pour `pnpm dev:real`, chez le responsable seulement
├── .vscode/                    extensions et réglages recommandés (oxc, TypeScript 7)
├── .storybook/                 main.ts (framework react-vite avec builder.viteConfigPath → .storybook/vite.config.ts ; addons a11y, vitest, msw),
│                               vite.config.ts (react + formatjs + tsconfigPaths, SANS le plugin Start), preview.tsx (CSF Next : definePreview,
│                               addonA11y, addonMsw, beforeEach msw.use(handlers d'une instance neuve du faux script), RawIntlProvider, QueryClient
│                               neuf, accent, a11y.test: "error")
├── lefthook.yml                pre-commit : oxlint --fix puis oxfmt sur les fichiers indexés ; pre-push : pnpm check:fast
├── package.json                scripts (liste ci-dessous), packageManager, engines, msw.workerDirectory (écrit par `msw init --save`)
├── pnpm-workspace.yaml         politique de sécurité de la chaîne d'approvisionnement (§ 2)
├── tsconfig.json               strict TS 7 (types: ["vite/client"], noUncheckedIndexedAccess, exactOptionalPropertyTypes…) ;
│                               include: src, e2e, scripts, .storybook/**/*, *.config.ts
├── vite.config.ts              Start SPA, base via BASE_PATH, React Compiler, FormatJS (§ 3.11)
├── vitest.config.ts            sans le plugin Start, alias @/, @formatjs/unplugin, optimizeDeps.include (Base UI, react-intl, TanStack Form, Query,
│                               valibot, msw/browser) ; projets `node` (TZ Europe/Paris : domain/, intl/, api/, queries/, session/, mocks/, tests
│                               dorés), `node-ny` (TZ America/New_York : domain/ et intl/), `browser` (Chromium : background/, ui/, features/, routes/,
│                               mutations/ ; locale fr-FR, timezoneId Europe/Paris), `storybook` (plugin storybookTest, sans setupFiles) ;
│                               une fabrique browser() par projet ; executablePath = $PLAYWRIGHT_CHROMIUM_EXECUTABLE s'il est défini
├── playwright.config.ts        Chromium (même règle executablePath), fr-FR, Europe/Paris, webServer = serve:legacy (port 4310) et serve (4311),
│                               base /reservations-restaurants/ ; projets `legacy` (e2e/regression sur legacy/), `react` (e2e/regression sur dist/client,
│                               filtré par étiquettes jusqu'à P7), `react-only` (e2e/*.spec.ts propres au nouveau code, dès P0), `production`
│                               (smoke-production.spec.ts sur l'URL publique, P8, lancé à la main)
├── CLAUDE.md                   règles du projet pour les agents (annexe C)
├── README.md                   présentation, installation Apps Script (inchangée), développement, déploiement
├── Code.gs                     backend, INCHANGÉ
├── charte-graphique.pdf logo.png                     inchangés (logo.png sert au README)
├── docs/spec/                  spécification de l'appli actuelle (référence fonctionnelle)
├── docs/migration/             ce plan, parite.md (créée en P1, complétée en P7), lancements.md, journal/ (un fichier par session), validation.md (P7),
│                               recherche/ (rapports, spike-integration/, toolchain-files/, appresaaristide/)
├── translations/fr.json        messages extraits par `formatjs extract` (id → defaultMessage + description) ; versionné, contrôlé en CI, non chargé à l'exécution
├── legacy/                     BRANCHE D'INTÉGRATION SEULEMENT : index.html, app.css, design-system.css, js/ (git mv, inchangés) ; jamais publié ;
│                               sert aux tests dorés (loadCache, formatEuro) et au projet Playwright `legacy` ; libère la racine pour Vite ; supprimé en P8
├── public/                     fichiers copiés tels quels (logo de l'en-tête si non inliné, CNAME éventuel) ; mockServiceWorker.js (msw init --save,
│                               versionné, retiré de dist/client par post-build)
├── scripts/                    TypeScript exécuté par `node scripts/x.ts` (Node ≥ 22.18), `/// <reference types="node" />`
│   ├── post-build.ts           copie dist/client/index.html en 404.html ; retire mockServiceWorker.js de dist/client
│   ├── serve-pages.ts          émulateur GitHub Pages avec types MIME (`--root`, `--base`, `--port` ; dossier → index.html, sinon 404.html en statut 404)
│   │                           pour l'E2E (legacy/ et dist/client), la prévisualisation et la validation par les collègues
│   └── check-budget.ts         budget JS/CSS initial à partir du manifeste Vite (échec au-delà du seuil)
├── e2e/
│   ├── fixtures.ts             isolation réseau EN PREMIER (tout ce qui n'est pas localhost ou 127.0.0.1 est avorté, polices Google comprises), puis
│   │                           handlers d'une instance de createFakeAppsScript via @msw/playwright (passthrough de localhost) ; console stricte
│   │                           (échec sur toute erreur, dont #418 et FORMAT_ERROR de @formatjs/intl) ; horloge à TEST_NOW ; storageState neuf par test
│   ├── pages/                  page objects sémantiques (rôles, libellés, textes de la spec ; jamais de classe ni d'id) ; utilitaire target(testInfo)
│   ├── regression/*.spec.ts    suite de régression (arbitrage 14) : 43 scénarios REG-01 à REG-43 (parite.md), étiquettes @parity, @changed:E-xx,
│   │                           identifiant d'écran (@P-05), phase de sortie (@p4…), @legacy-only ; jouée sur les projets legacy et react
│   ├── smoke.spec.ts           (react-only, dès P0) racine, lien profond /collegue, /index.html redirigé, aucune erreur console
│   ├── hydration.spec.ts       (react-only) S4 : premier rendu depuis la copie locale, puis avec reservations-textes seul
│   ├── print-pdf.spec.ts       (react-only, P6) ; a11y.spec.ts (react-only, P7)
│   └── smoke-production.spec.ts (production, P8) lecture seule
└── src/
    ├── router.tsx              getRouter() : QueryClient, restauration de la copie locale, routeur, abonnement de session, tâches de fond
    ├── client.tsx              point d'entrée client : celui de Start, plus le démarrage du worker msw quand `pnpm dev` tourne sur le faux script
    │                           (code éliminé du build de production) ; aucun onRecoverableError (arbitrage 16)
    ├── routeTree.gen.ts        GÉNÉRÉ par le plugin Start, commité, ignoré par oxlint, oxfmt et knip
    ├── config.ts               APPS_SCRIPT_URL (import.meta.env.VITE_APPS_SCRIPT_URL), isConfigMissing(), USE_MOCK_API (DEV et VITE_MOCK_API=1)
    ├── routes/
    │   ├── __root.tsx          shellComponent (html, head, ScriptOnce de lecture anticipée, body), head(), contexte typé ; AUCUN loader ni beforeLoad
    │   ├── index.tsx           page publique : validateSearch, loader (état public), composant < 40 lignes
    │   ├── collegue.tsx        mode collègue (nom imposé par l'URL /collegue) : validateSearch, beforeLoad (garde), loader (état complet), composant < 40 lignes
    │   ├── index[.]html.tsx    redirection des anciens favoris …/index.html vers /
    │   └── $.tsx               attrape-tout « Page introuvable » (limite aussi l'issue #8473)
    ├── domain/                 PUR : ni React, ni DOM, ni fetch ; testé par tables de cas ; ne connaît que le modèle anglais (§ 3.3.6)
    │   ├── constants.ts        valeurs de 00 § 2.1 (14 j, 6 s, 1,5 s, 3 min, 10 h, 12 h, 4 s, 10 min, seuils)
    │   ├── types.ts            IsoDate, Restaurant ('r1' | 'r2'), ServiceMode ('dineIn' | 'takeaway'), modèle de domaine (ServiceDayR1, Dish, BookingR1…)
    │   │                       et entrées des actions, DÉCLARÉS À LA MAIN (source de vérité) ; api/schemas.ts les produit
    │   ├── dates.ts            arithmétique ISO en UTC : addDays, mondayOf, weekCells, monthCells, addMonthsClamped, keyTargetIso
    │   ├── paris.ts            parisDate(ms), parisHour(ms) (repris de recherche/appresaaristide/convex/model/dates.ts)
    │   ├── gauge.ts            pourcentage de jauge (gaugeStyle) ; aucun formatage de texte dans domain/
    │   ├── vouchers.ts         VOUCHER_MARK, VOUCHER_MARK_RE, plainName, withVoucherMark, hasVoucherMark, dayHasVoucher, serviceMode
    │   ├── capacity.ts         index de l'état (WeakMap), remainingSeats, remainingStock, dishesForDay, capacityClass ('available' | 'almostFull' | 'full'),
    │   │                       dayStatusR1/R2
    │   ├── pricing.ts          priceR1 (r1Total), r2Amounts, orderAmounts (un ticket) : des nombres, le texte est fait par intl/
    │   ├── cutoff.ts           isR2OrderingClosed(iso, now), isPast(iso, today)
    │   ├── navigation.ts       CALENDAR_KEYS et transformations pures des search params : selectDay, shiftPeriod, goToToday, publicSearch
    │   ├── validation.ts       validateurs (repris de recherche/appresaaristide/src/lib/validators.ts), parseAmount, parseCount, stepCount (money.ts)
    │   │                       et règles des formulaires
    │   ├── bookings.ts         entrées des actions de réservation (modèle anglais), résumés R1/R2 (booking summary), lecture du résultat d'une écriture
    │   └── print.ts            regroupement R2 par client (Order), tris, totaux imprimés (un ticket par commande)
    ├── intl/                   textes et formats (react-intl, fr-FR seul) : § 3.10
    │   ├── intl.ts             instance unique createIntl (locale et defaultLocale fr-FR, formats, defaultRichTextElements, onError → console.error) ;
    │   │                       sert au provider ET hors composants
    │   ├── formats.ts          formats nommés (`as const`, sans `satisfies`) : number.euro, date.weekday, date.month, date.year, date.dayMonth,
    │   │                       date.monthYear, date.printedOn
    │   ├── common-messages.ts  defineMessages des textes partagés (Annuler, Fermer, Réserver, Enregistrer, Confirmer ?, message de clôture R2…)
    │   ├── dates.ts            formatLongDate (« jeudi 1er octobre 2026 »), libellés de période du calendrier
    │   ├── amounts.ts          textes de montants (euros + tickets, « hors plats sans prix indiqué »), prix d'un plat
    │   └── types.d.ts          augmentation FormatjsIntl : ids typés d'après `@translations/fr.json`, formats typés
    ├── api/                    sans React ni Query ; testable seul ; SEUL endroit (avec queries/local-cache.ts et src/mocks/) où vivent les champs du script
    │   ├── errors.ts           BusinessError, PasswordRejectedError, ServiceError, errorMessage()
    │   ├── schemas.ts          schémas valibot (DishSchema, PublicStateSchema, FullStateSchema, ReadResponseSchema, WriteResponseSchema…) qui valident
    │   │                       les réponses du script ET les traduisent vers les types de domain/types.ts (v.pipe + v.transform annoté) ; § 3.3.6
    │   ├── transport.ts        readJson, getState(since, signal), postAction(action, payload, { signal })
    │   ├── signals.ts          anySignal(...signals) et timeoutSignal(ms) : repli de AbortSignal.any / timeout (Safari < 17.4)
    │   ├── hedged-read.ts      hedgedRead() : seconde lecture à 6 s, la première réponse gagne, la perdante est annulée
    │   ├── early-fetch.ts      earlyFetchScript (texte du script inline ; vide quand USE_MOCK_API) et takeEarlyFetch(since)
    │   ├── state.ts            fetchPublicState({ since, signal }), fetchFullState(password, signal)
    │   ├── actions.ts          une fonction typée par action POST de 02 § 4 (jamais addBookingR2 ni checkPassword) : entrée en modèle anglais,
    │   │                       corps recomposé avec exactement les champs de 02 § 4.4, § 4.5 et § 4.7 (qte et prixTotal d'editBookingR1 compris)
    │   └── request-id.ts       newRequestId() : requestId (crypto.randomUUID, repli de 02 § 5.3)
    ├── queries/
    │   ├── client.ts           createQueryClient() : défauts, QueryCache/MutationCache onError (mot de passe changé)
    │   ├── state.ts            stateKeys, publicStateOptions (queryFn etag), staffStateOptions(id, password) (mot de passe dans la fermeture de la queryFn, jamais dans la clé ; gcTime: 0)
    │   ├── local-cache.ts      LocalCacheV1 (schéma du format v1, champs tels quels), restoreLocalCache, persistLocalCache, readFallbackTexts,
    │   │                       conversions v1 ↔ PublicState dans les deux sens
    │   ├── use-app-state.ts    useAppState(select), useIsFromCache(), APP_START
    │   ├── AutoRefresh.tsx     <AutoRefresh/> (seul observateur avec refetchInterval)
    │   └── purge.ts            purgeStaffSession(queryClient)
    ├── mutations/
    │   ├── bookings.ts         useBookR1, useOrderR2 (public et ajout collègue)
    │   ├── login.ts            useLogin (importé par ModeSwitch, donc dans le chunk public)
    │   └── staff/              write.ts (fabrique mutationOptions commune, garde de session F-02), days.ts, dishes.ts, bookings.ts, settings.ts
    ├── session/session.ts      store Zustand non persisté (password, id, endReason, open, close)
    ├── background/
    │   ├── start.ts            startBackgroundTasks({ queryClient, router }) : idempotent, arrête l'instance précédente (HMR, tests)
    │   ├── logout.ts           afterLogout({ router, queryClient }) : étapes 2 à 6 du § 3.3.4
    │   ├── inactivity.ts       activité notée sans rendu, minuteur unique, revérification au retour (10 min)
    │   └── clock.ts            store useClock (tic aligné sur la minute), useToday(), useIsR2OrderingClosed(iso), fermeture du formulaire R2 à 10 h
    ├── ui/                     Base UI enveloppé une seule fois, sans métier (tableau § 3.5) ; feedback/toast.ts = gestionnaire global sans composant
    ├── features/
    │   ├── page/               Page (deux colonnes), PublicPage et StaffPage (assemblage par mode), Column, Header,
    │   │                       ModeSwitch (Client/Collègue + connexion), Footer, ConfigBanner, DevDataBanner (« Données réelles », dev:real seulement),
    │   │                       LoadErrorBox, LoadErrorPage, PageSkeleton
    │   ├── calendar/           RestaurantCalendar (en-tête, vues, grille, navigation par l'URL), search.ts (schéma CalendarSearch partagé)
    │   ├── r1/                 DayCardR1, BookingFormR1 (chargé à la demande), SeatCountersR1
    │   ├── r2/                 DayCardR2, DishRow, OrderFormR2 (chargé à la demande par load-order-form.ts et useSyncExternalStore,
    │   │                       sans lazy()), OrderFormR2Slot, DishQuantitiesR2, DishFieldsetR2 (withFieldGroup sur portions), order-rules.ts
    │   ├── booking/            BookingSummary, ColumnSummary, BookingColumnsProvider, IdentityFields (withFieldGroup), ObservationField,
    │   │                       use-request-id, use-slow-write, SlowWriteNotice
    │   ├── staff/              StaffDayCardR1/R2 et StaffDayCard (cadres des fiches collègue, emplacements, « Ouvert par », jour sans
    │   │                       service), use-staff-state.ts, DeleteDayButton, TomorrowPanel, SettingsPanel, OpenDayFormR1/R2, OpenDatePicker, EditDayFormR1, DishForm,
    │   │                       BookingList, BookingRow, EditBookingFormR1/R2, AddBookingFormR1/R2, PriceSuggestions
    │   └── print/              ListDocumentR1, ListDocumentR2, TomorrowDocumentR1, TomorrowDocumentR2 (chargés au clic)
    ├── styles/
    │   ├── tokens.css          § 1-2 de design-system.css : jetons :root, thèmes .accent-green / .accent-magenta (+ [data-accent])
    │   ├── base.css            § 3 et 5 : base, :focus-visible, keyframes partagées, prefers-reduced-motion, cibles tactiles
    │   └── print.css           @media print, page nommée « list » (A4 paysage), masquage de l'appli
    ├── mocks/                  apps-script.ts : faux Apps Script UNIQUE, module isomorphe (ni DOM ni node:*) ; createFakeAppsScript({ seed?, password? })
    │                           → { handlers, db, requests, setPassword, failNext, hold }, une instance par test ou par story ; GET ?since, toutes les
    │                           actions POST de 02 § 4, erreurs exactes de Code.gs, unchanged, _duplicate, ajustements R2, verrou, mot de passe changé,
    │                           réponse retenue, page HTML d'erreur ; handlers sur https://script.google.com/macros/s/:deploymentId/exec pour tout
    │                           identifiant ; fixtures/ : JSON des exemples de 02 et 03 § 1.1 et seed.ts (jeu de base daté par rapport à TODAY,
    │                           parite.md) ; browser.ts (setupWorker), node.ts (setupServer)
    ├── test/                   clock.ts (TEST_NOW = 2026-10-05T07:30:00.000Z, lundi 5 octobre 2026 à 9 h 30 à Paris ; TODAY = '2026-10-05'),
    │                           setup-browser.ts (worker msw, onUnhandledFrame: "error"), render.tsx (async renderWithProviders : QueryClient +
    │                           RawIntlProvider ; renderRoute avec createMemoryHistory), fabriques d'états
    └── vite-env.d.ts           ImportMetaEnv : VITE_APPS_SCRIPT_URL, VITE_MOCK_API
```

Scripts de `package.json` (pas de `preview`) : `dev` (faux script), `dev:real` (`vite dev --mode real`, URL réelle de `.env.real.local`, bandeau « Données réelles »), `build` (`vite build && node scripts/post-build.ts`), `build:e2e` (même chose en mode `test`, URL factice de `.env.test`), `serve` (`dist/client`, port 4311), `serve:legacy` (`legacy/`, port 4310), `typecheck` (`tsc`), `lint`, `lint:fix` (`oxlint --fix && oxfmt`), `format`, `format:check`, `i18n:extract` (§ 3.10), `test`, `test:node`, `test:browser`, `test:e2e` (suppose `dist/client` construit par `build:e2e`), `test:e2e:legacy`, `storybook`, `build-storybook`, `budget`, `knip` (`knip && knip --production`), `check:fast` (extraction, `format:check`, `lint`, `typecheck`, `test:node`), `check` (idem + `test` complet et `knip`), `prepare`.

`knip.json` (vérifié dans les deux modes par le projet d'essai) : `{ "entry": ["scripts/*.ts"], "project": ["src/**/*.{ts,tsx}!", "!src/mocks/**!", "!src/test/**!", "e2e/**/*.ts", "scripts/*.ts", ".storybook/*.{ts,tsx}"] }` ; les plugins de knip détectent seuls Vite, Vitest, Storybook, Playwright et les routes TanStack ; aucun `ignore` pour `routeTree.gen.ts` (inutile). Liste `ignoreDependencies` temporaire, chaque entrée commentée « retirer en Px ».

Règles de dépendance (vérifiées par `import/no-cycle` et en revue) : `domain` n'importe rien d'autre ; `intl` n'importe que `domain` ; `api` n'importe que `domain` et `config` ; `queries`, `mutations`, `session`, `background` n'importent ni `features` ni `ui`, **sauf** le gestionnaire global de toasts `ui/feedback/toast.ts` (module sans composant), que `mutations` et `background` peuvent appeler ; `ui` n'importe ni `api` ni `queries` ; `features` assemble ; `routes` déclarent et délèguent. Le code du mode collègue n'est importé que depuis `routes/collegue.tsx` (découpage automatique ; `mutations/login.ts` est la seule mutation collègue du chunk public), les formulaires publics et l'impression par `lazy()` / `import()` explicites.

Projets Vitest : `node` pour `domain/`, `intl/`, `api/`, `queries/`, `session/`, `mocks/` et les tests dorés ; `node-ny` pour `domain/` et `intl/` sous un autre fuseau ; `browser` pour `background/` (écouteurs du DOM), `ui/`, `features/`, `routes/`, `mutations/` ; `storybook` pour les stories.

### 3.2 Routes et search params

| Route | Fichier | Rôle |
| --- | --- | --- |
| racine | `routes/__root.tsx` | Document HTML (`shellComponent`), `head()`, `<ScriptOnce>`, `<Toaster/>` (le `RawIntlProvider` est posé par le `Wrap` du routeur). Neutre vis-à-vis de l'URL (pas de lien actif, pas de titre selon la route). Aucun loader : il s'exécuterait au build. |
| `/` | `routes/index.tsx` | Page publique (G-01 à G-05, G-07, P-01 à P-17 avec P-01b et P-02b, panneau de connexion L-01). |
| `/collegue` | `routes/collegue.tsx` | Même page en mode collègue (G-06, G-08, L-01 connecté, C-01 à C-06, C-10, C-10b, C-11 à C-14, C-20 à C-24, C-30, I-00 à I-04). `beforeLoad` : sans mot de passe en mémoire, `redirect({ to: '/', search: { ...publicSearch(search), connexion: true, retour: location.href } })`. |
| `/index.html` | `routes/index[.]html.tsx` | `redirect({ to: '/', replace: true })`. |
| `*` | `routes/$.tsx` | « Page introuvable » avec un lien vers l'accueil. |

Les deux pages partagent `features/page/Page.tsx` ; la route fournit les blocs propres à son mode (fiches publiques ou fiches collègue, panneaux collègue), ce qui garde le code collègue hors du chunk public.

**Schéma commun `CalendarSearch`** (les deux routes) et paramètres propres. `IsoDate = v.pipe(v.string(), v.isoDate())`. Tous les paramètres sont facultatifs et protégés par `v.fallback` : une URL abîmée n'affiche jamais d'erreur.

| Paramètre | Route | Type valibot | Défaut | Fallback | Écrit par | Remarques |
| --- | --- | --- | --- | --- | --- | --- |
| `r1`, `r2` | les deux | `v.fallback(v.optional(IsoDate), undefined)` | absent = aujourd'hui à Paris, **résolu dans le composant** (horloge), jamais dans `validateSearch` (qui doit rester pur) | `undefined` | clic sur un jour (push) ; flèches du clavier (`replace`) ; « Aujourd'hui » (retire le paramètre, `replace`) ; « Réserver » (écrit la date explicitement, pour ne pas changer de jour à minuit) | `05` § 1, `09` § 1 |
| `r1vue`, `r2vue` | les deux | `v.fallback(v.optional(v.picklist(['semaine', 'mois']), 'semaine'), 'semaine')` | `semaine` | `semaine` | segments Semaine / Mois (`replace`) | retiré de l'URL s'il vaut `semaine` (`stripSearchParams`) ; l'ancre est conservée (`05` § 3.1) |
| `r1periode`, `r2periode` | les deux | `v.fallback(v.optional(IsoDate), undefined)` | absent = période du jour sélectionné | `undefined` | ‹ › (`replace`) | ancre de `05` § 1 ; effacée par toute sélection de jour, par « Aujourd'hui » et par la navigation au clavier (la vue suit la sélection) ; retirée si elle tombe dans la période du jour sélectionné |
| `reserver` | `/` | `v.fallback(v.optional(v.picklist(['r1', 'r2'])), undefined)` | absent | `undefined` | « Réserver » (push) ; « Annuler » et succès (retire, `replace`) | formulaire rendu seulement si le jour est réservable (non passé, places, R2 non clos) ; un seul formulaire public à la fois (D-11) |
| `connexion` | `/` | `v.fallback(v.optional(v.boolean(), false), false)` | `false` | `false` | segment « Collègue » ; retiré par « Client », Échap, succès | panneau L-01 ; **`?connexion=1` est un nombre et tombe dans le fallback** : écrire `search={{ connexion: true }}` |
| `retour` | `/` | `v.fallback(v.optional(v.pipe(v.string(), v.startsWith('/collegue'))), undefined)` | absent | `undefined` | garde de `/collegue` | URL rouverte après connexion ; limitée à `/collegue` (pas de redirection ouverte) |
| `ouvrir` | `/collegue` | `v.fallback(v.optional(v.picklist(['r1', 'r2'])), undefined)` | absent | `undefined` | résumé « + Ouvrir un jour » | C-04, C-06 |
| `ouvrirDate` | `/collegue` | `v.fallback(v.optional(IsoDate), undefined)` | jour sélectionné du restaurant | `undefined` | sélecteur de date C-05 | retiré quand on choisit un jour dans ce restaurant (`05` § 3.3) |
| `parametres` | `/collegue` | `v.fallback(v.optional(v.boolean(), false), false)` | `false` | `false` | résumé « Paramètres » | C-02 |
| `editJour` | `/collegue` | `v.fallback(v.optional(v.picklist(['r1'])), undefined)` (R1 seulement : D-09 non retenue) | absent | `undefined` | « Modifier ce jour » | jour = `r1` de l'URL (C-13) |
| `editResa` | `/collegue` | `v.fallback(v.optional(v.pipe(v.string(), v.regex(/^r[12]:[\w+-]{1,64}$/u))), undefined)` | absent | `undefined` | « Modifier » d'une ligne | `{restaurant}:{ID}` ; ignoré si la réservation n'existe plus (C-11, C-24) |
| `ajout` | `/collegue` | `v.fallback(v.optional(v.pipe(v.string(), v.regex(/^(r1\|r2:[\w+-]{1,64})$/u))), undefined)` | absent | `undefined` | « + Ajouter une personne » | `requestId` créé au montage du formulaire (C-12, C-23) |
| `ajoutPlat` | `/collegue` | `v.fallback(v.optional(v.boolean(), false), false)` | `false` | `false` | « + Ajouter un plat à ce jour » | jour = `r2` (C-21) |
| `editPlat` | `/collegue` | `v.fallback(v.optional(v.pipe(v.string(), v.regex(/^[\w+-]{1,64}$/u))), undefined)` | absent | `undefined` | « Modifier ce plat » | C-22 |

Middlewares sur les deux routes : `retainSearchParams(['r1', 'r2', 'r1vue', 'r2vue', 'r1periode', 'r2periode'])` (on garde les calendriers en passant de `/` à `/collegue` et inversement) et `stripSearchParams` sur les valeurs par défaut, **dans l'ordre `stripSearchParams` puis `retainSearchParams`** (dans l'ordre inverse, un défaut retenu comme `r1vue=semaine` reste dans l'URL ; P4 (a)). Jamais de donnée saisie dans l'URL (nom, contact, quantités) ; le récapitulatif reste un état local (`09` PA 5).

**Transformations pures** (`domain/navigation.ts`, testées par tables) : `selectDay(search, restaurant, iso)` pose `rX`, retire `rXperiode` (sauf un clic sur un jour hors du mois affiché en vue mois : l'ancre est gardée, `05` § 3.1, REG-10 ; `clickDay` de P2 (a)), et ferme ce qui dépend du jour **dans ce restaurant seulement** (`reserver` s'il vaut ce restaurant, `ouvrirDate` si `ouvrir` vaut ce restaurant, `editJour`, `editResa` et `ajout` de ce restaurant, `ajoutPlat` et `editPlat` pour R2) : c'est la correction de a-12. `shiftPeriod(search, restaurant, ±1, view)`, `goToToday(search, restaurant)` (retire `rX` et `rXperiode`, et ferme comme `selectDay` ce qui dépend du jour dans ce restaurant, `reserver` compris : le formulaire ouvert sur une autre date ne se rouvre pas sur aujourd'hui), `publicSearch(search)` (garde seulement `CALENDAR_KEYS`, déclarées dans ce même fichier). Le récapitulatif, état local de la colonne, est effacé par le gestionnaire qui appelle `selectDay`.

Exemple (route publique) :

```tsx
// src/routes/index.tsx
import { createFileRoute, retainSearchParams, stripSearchParams } from "@tanstack/react-router";
import * as v from "valibot";

import { CALENDAR_KEYS } from "@/domain/navigation";
import { CalendarSearch } from "@/features/calendar/search";
import { PublicPage } from "@/features/page/PublicPage";
import { publicStateOptions } from "@/queries/state";

const HomeSearch = v.object({
  ...CalendarSearch.entries,
  reserver: v.fallback(v.optional(v.picklist(["r1", "r2"])), undefined),
  connexion: v.fallback(v.optional(v.boolean(), false), false),
  retour: v.fallback(v.optional(v.pipe(v.string(), v.startsWith("/collegue"))), undefined),
});

export const Route = createFileRoute("/")({
  validateSearch: HomeSearch,
  search: {
    middlewares: [
      // strip before retain: in the other order a retained default (r1vue=semaine) stays in the URL
      stripSearchParams({ r1vue: "semaine", r2vue: "semaine", connexion: false }),
      retainSearchParams(CALENDAR_KEYS),
    ],
  },
  // Never waits for the script: starts the first read once (it picks up the early fetch) and returns.
  // Page shows the skeleton, then the data or the load error box (G-01, G-03). pendingMinMs: 0 is safe only because
  // Page renders exactly PageSkeleton while hydrating (useHydrated); without that barrier, React error #418 (arbitrage 16).
  loader: ({ context: { queryClient } }) => {
    if (queryClient.getQueryState(publicStateOptions.queryKey) === undefined) {
      void queryClient.query(publicStateOptions).catch(noop);
    }
  },
  pendingMs: 0,
  pendingMinMs: 0,
  pendingComponent: PageSkeleton,
  component: PublicPage,
});
```

### 3.3 Cycle de vie des données

Clés : `['state', 'public']` (état public, seul persisté), `['state', 'staff', id]` (état complet, mémoire seulement, `id` = numéro de session), mutations `['write', domain, action]` avec `scope: { id: 'write' }` (écritures envoyées l'une après l'autre). Jamais de mot de passe ni d'empreinte dans une clé.

Réglages par défaut (`queries/client.ts`) :

| Option | Valeur | Raison |
| --- | --- | --- |
| `staleTime` (états public et complet) | `180_000` | aligné sur l'actualisation : `refetchOnWindowFocus` ne relit que si la dernière lecture date de plus de 3 min, ce qui reproduit le « rattrapage au retour » de `03` § 5.1 sans lectures en rafale |
| `gcTime` de l'état public | `Infinity` | l'état public reste en mémoire pendant une session collègue : il sert de repli immédiat à la déconnexion (a-1) |
| `gcTime` de l'état complet (`staffStateOptions`) | `0` pour les entrées lues par `staffStateOptions` ; l'entrée posée par la connexion garde le `gcTime` par défaut (Query retient le plus grand reçu) et part à la purge de la déconnexion (P5 (a)) | rien ne reste en cache dès qu'aucun composant ne l'observe ; avec la garde de session du § 3.3.3, aucune donnée nominative ne survit à une déconnexion (invariant 1, F-02) |
| `retry` (lectures) | `(n, e) => n < 1 && !(e instanceof BusinessError) && navigator.onLine` | un seul nouvel essai, jamais pour une erreur du script, pas hors ligne (`02` § 1.5) ; dans les défauts du client pour que les tests puissent le neutraliser |
| `retryDelay` | `1500` | `02` § 1.5 |
| `refetchIntervalInBackground` | `false` | pause quand l'onglet est caché |
| Retour de l'onglet | `focusManager.setEventListener` sur `document` | Query écoute `window`, qu'un `visibilitychange` sans propagation n'atteint pas (REG-08) ; P4 (c) |
| Notifications des observateurs | `notifyManager.setScheduler(queueMicrotask)` | un `setTimeout(0)` attend le prochain `runFor` d'une horloge en pause (REG-03) ; P4 (b) |
| mutations : `retry` / `networkMode` | `false` / `'always'` | jamais de rejeu ; hors ligne, erreur immédiate au lieu d'une mise en pause qui repartirait seule |
| `QueryCache` et `MutationCache` `onError` | `PasswordRejectedError` → `session.close('password-changed')` | remplace `adminSessionExpired` (`02` § 2) |

`queryFn` de l'état public (etag, `02` § 3.3 et § 5.1) :

```ts
// src/queries/state.ts (extrait)
export const publicStateOptions = queryOptions({
  queryKey: stateKeys.public(),
  queryFn: async ({ client, queryKey, signal }): Promise<PublicState> => {
    const previous = client.getQueryData<PublicState>(queryKey);
    // fetchPublicState: early fetch (same since, used once) or hedgedRead(getState),
    // each attempt capped at 30 s, response validated and translated by ReadResponse (valibot).
    const response = await fetchPublicState({ since: previous?.etag ?? "", signal });
    if (response.type === "state") return response.state;
    if (previous) return previous; // { unchanged }: same reference, no render, dataUpdatedAt refreshed
    return requireState(await fetchPublicState({ since: "", signal })); // edge case: never return undefined
  },
  staleTime: 180_000,
  gcTime: Number.POSITIVE_INFINITY,
});
```

#### 3.3.1 Démarrage, dans l'ordre

1. GitHub Pages sert `index.html` (ou `404.html` pour un lien profond) : la coquille prérendue au build contient les `<meta>` de `03` § 2.1 (charset, `viewport` avec `viewport-fit=cover`, `theme-color` `#FFFFFF`, description), le `<title>` `Réservations — Restaurants pédagogiques`, le favicon SVG en data-URI repris d'`index.html`, les `preconnect` vers `https://script.google.com` et `https://script.googleusercontent.com` avec `crossOrigin: 'anonymous'`, la CSS hachée, les `modulepreload`, et dans `<body>` le squelette (titres par défaut, calendriers `.sk` en `aria-hidden`).
2. Le `<ScriptOnce>` de lecture anticipée s'exécute (React le place après la CSS, voir R-12) : il lit `reservations-cache-v1` dans un `try/catch`, retient l'`etag` s'il est non vide et si `savedAt` a moins de 14 jours, lance `fetch(URL + (etag ? '?since=' + encodeURIComponent(etag) : ''))`, ajoute `.catch(() => {})`, et expose `window.__EARLY_FETCH__ = { since, response, startedAt: performance.now() }`. Il garde la `Response`, pas `r.json()`, pour que le traitement d'erreur soit celui des autres lectures.
3. Le bundle s'exécute. `getRouter()` (appelé aussi dans Node au build, d'où la garde `typeof window`) crée le `QueryClient`, puis côté navigateur : `restoreLocalCache()` valide la copie par `LocalCacheV1`, la convertit en `PublicState` et la pose par `setQueryData(['state','public'], state, { updatedAt: savedAt })` ; sans copie valide, `readFallbackTexts()` lit `reservations-textes` pour les titres du squelette ; `persistLocalCache()` s'abonne au cache ; le routeur est créé avec `context: { queryClient, session }` ; l'abonnement de session et les tâches de fond démarrent.
4. `router.load()` exécute le loader de `/`, qui **n'attend jamais le script** : avec la copie, il ne fait rien ; sans copie, il lance une seule fois la première lecture (`queryClient.query(publicStateOptions)`, qui reprend la lecture anticipée) et rend aussitôt. `Page` montre le squelette jusqu'à la réponse, puis les données ou l'encadré d'échec (G-01, G-03). Un loader qui attend faisait monter deux fois l'en-tête et le logo (coquille cachée sous une seconde copie du squelette) ; décision de P4 (a), journal `p4a.md` décision 1.
5. Hydratation puis rendu : le squelette de la coquille reste affiché jusqu'à la fin de l'hydratation (barrière `useHydrated()` de la route `/`, qui seule permet `pendingMinMs: 0` ; ailleurs `pendingMinMs` garde sa valeur par défaut, arbitrage 16), puis `useAppState()` renvoie la copie ; `useIsFromCache()` vaut `dataUpdatedAt < APP_START` (G-02 : « Réserver » actif, connexion collègue refusée avec le toast `Les données se chargent. Réessayez dans un instant.`).
6. `<AutoRefresh/>` se monte : la donnée restaurée est périmée (`restoreLocalCache` l'invalide aussitôt : avec `updatedAt = savedAt` et `staleTime` 180 s, une copie de moins de 3 min serait sinon jugée fraîche, P2 (b2)), la `queryFn` part ; `takeEarlyFetch(since)` rend la lecture du `<head>` si son `since` est identique (une seule fois), sinon un nouveau `fetch` part ; la lecture doublée est armée pour le **temps restant** jusqu'à 6 s depuis `startedAt` ; un nouvel essai après 1,5 s si l'échec est transitoire et que le navigateur est en ligne.
7. Réponse : `{ unchanged: true }` → même référence, la donnée redevient fraîche, la copie est réécrite avec un `savedAt` neuf ; nouvel état → validé, partage structurel (seuls les jours modifiés sont rendus de nouveau), copie réécrite ; échec → la donnée affichée est conservée et l'encadré d'échec apparaît, avec le suffixe « copie locale » si `useIsFromCache()`.

#### 3.3.2 Actualisation

- Un seul observateur porte `refetchInterval: 180_000` : `<AutoRefresh/>`, monté une fois dans `Page` (un minuteur par observateur sinon). Il observe la même source que l'écran : état public, ou état complet si une session est ouverte (`getAdminState`, sans etag, b-7).
- L'actualisation **continue** pendant une saisie ou un formulaire ouvert (a-4) : TanStack Form garde les valeurs (`defaultValues` lues au montage seulement), la réconciliation garde le focus, et les places restantes, légendes « N au maximum » et maximums de saisie se mettent à jour sous le formulaire. L'exigence de `03` § 5.4 (aucune saisie ni focus perdu) devient un test.
- Rattrapage : `refetchOnWindowFocus` (si plus de 3 min) et `refetchOnReconnect` ; plus besoin de `refreshMissed`.
- Une lecture plus ancienne qu'une écriture ne peut pas écraser sa réponse : chaque mutation fait `await queryClient.cancelQueries({ queryKey: ['state'] })` avant `setQueryData` (remplace `writeSeq`).
- Échec d'une actualisation après un premier succès : silencieux, sauf mot de passe changé. Échec répété avant tout succès : l'encadré n'est réannoncé que si son texte change (a-21).

#### 3.3.3 Écritures

| Écriture | `mutationKey` | Corps (`02` § 4) | Réponse | `useMutation({ onSuccess })` (survit au démontage) | `mutate(…, { onSuccess })` (si le composant est encore là) |
| --- | --- | --- | --- | --- | --- |
| Réservation publique R1 / R2 | `['write','booking','r1'\|'r2']` | § 4.4 / § 4.5, textes `trim()`, `requestId` du formulaire | état public + `_duplicate`, `_emailStatus`, `_bookingResult` | `cancelQueries` ; `setQueryData(['state','public'], state)` (sans les champs `_…`) ; si une session s'est ouverte pendant l'envoi : `invalidateQueries(['state','staff'])` | récapitulatif (état local), toast, fermeture du formulaire (`replace`), focus sur le titre du récapitulatif (a-9) |
| Ajout d'une personne (collègue) | mêmes clés | mêmes corps, **sans** `password` | état public | idem + `invalidateQueries(['state','staff', id])` (relecture de l'état complet, `06` § 8.5), seulement si la session de l'appel est encore ouverte (garde ci-dessous) | toast de `06` § 8.5, fermeture, focus rendu à « + Ajouter une personne » |
| Action collègue | `['write', domain, action]` | + `password` lu dans le store au moment de l'appel | état complet | **garde de session** (ci-dessous), puis `cancelQueries` ; `setQueryData(['state','staff', id], state)` ; `invalidateQueries(['state','public'], { refetchType: 'none' })` | toast de succès de `02` § 4.7 ; fermeture du formulaire (`replace`) et focus rendu au bouton qui l'a ouvert (E-48) ; **sauf** « Ouvrir un jour » : panneau gardé ouvert, champs vidés sauf la date, calendrier du restaurant positionné sur la date ouverte par `selectDay` en gardant `ouvrir` (`06` § 4.1-4.2, `collegue.js` l. 276-277) ; après une suppression, focus sur la date de la fiche (`03` § 5.4, `08` § 7.6) |
| Paramètres | `['write','settings','save']` | une requête `setConfigField` par champ modifié, **en séquence** dans une seule `mutationFn` | état complet après chaque requête | idem action collègue | toast singulier ou pluriel ; détail d'un échec partiel (D-20) ; panneau gardé ouvert (`06` § 2.2) |
| Connexion | `['login']` | `getAdminState` `{ password }` | état complet | `id = session.id + 1` ; `setQueryData(['state','staff', id], state)` **puis** `session.open(password)` (aucune suspension) | toast `Mode collègue activé.`, navigation `replace` vers `retour` ou `/collegue` en gardant les calendriers, focus sur « Collègue » ; mutation à `gcTime: 0`, `reset()` après chaque essai (P5 (a)) |

**Garde de session (F-02).** Une écriture collègue peut répondre après une déconnexion (inactivité, mot de passe changé, clic « Client ») ; sans garde, son `onSuccess` réécrirait l'état complet après la purge. Chaque `mutationFn` collègue lit le mot de passe **et** `sessionIdAtCall = session.getState().id` au moment de l'appel, et renvoie `sessionIdAtCall` avec la réponse ; chaque `useMutation({ onSuccess })` collègue (fabrique de `mutations/staff/write.ts`, ajout d'une personne) n'écrit dans le cache que si `session.getState().password !== null && session.getState().id === sessionIdAtCall` ; sinon la réponse est jetée (ni `setQueryData`, ni invalidation de `['state','staff']`). Testé en P5 (a) et par S8 (écriture retenue par `hold()` du faux script, déconnexion, puis réponse).

Règles : les réponses passent par les schémas (`_duplicate`, `_emailStatus`, `_bookingResult` deviennent `duplicate`, `emailStatus`, `bookingResult` à côté de `state`, qui seul va dans le cache, § 3.3.6) ; une écriture n'est **jamais** doublée, rejouée ni interrompue (pas de délai d'expiration : interrompre un POST n'annule pas l'écriture côté serveur ; signal de lenteur selon D-15) ; le formulaire appelle `mutateAsync` dans un `try/catch` de son `onSubmit` (TanStack Form relance l'erreur sinon) ; erreur métier → message exact du script, sous le champ concerné quand il y en a un (places R1 sous la rangée des compteurs, a-5), sinon en toast ; erreur réseau → texte de D-14 ; le `requestId` est conservé pour le nouvel essai.

#### 3.3.4 Déconnexion, dans l'ordre (corrige a-1, a-13, a-14)

Déclencheurs : segment « Client » (toast `Retour au mode client.`), inactivité de 10 min (toast `Déconnecté du mode collègue après 10 minutes d'inactivité.`), mot de passe changé (toast d'erreur `Le mot de passe du mode collègue a changé. Reconnectez-vous.`).

1. `session.close(reason)` : `password = null`, `endReason = reason`, notification synchrone.
2. L'abonné de `router.tsx` (sélecteur `s => s.password !== null`) appelle `purgeStaffSession(queryClient)` : `cancelQueries({ queryKey: ['state','staff'] })` (sans attendre), `removeQueries({ queryKey: ['state','staff'] })`, `getMutationCache().clear()` (les variables des mutations contiennent des noms et des contacts).
3. Les composants qui lisent `useAppState()` basculent sur `['state','public']`, toujours présent (`gcTime: Infinity`) : plus aucun nom n'est affiché ni gardé par Query, sans attendre le réseau.
4. `invalidateQueries({ queryKey: ['state','public'] })` : relecture avec `since`.
5. Toast selon `endReason`.
6. Si l'URL est sous `/collegue` : `router.navigate({ to: '/', search: publicSearch, replace: true })`, ce qui démonte tous les panneaux et formulaires collègue (leur état vivait dans l'URL ou dans des composants démontés) ; sinon `router.invalidate()`. La navigation directe évite que la garde rouvre le panneau de connexion après une déconnexion voulue ; la garde ne sert qu'aux accès directs (rechargement, favori, bouton Retour).
7. Le minuteur d'inactivité est désarmé (`background/inactivity.ts`, abonné au même sélecteur).

Test de référence (P5) : juste après `close()`, `queryClient.getQueryCache().findAll({ queryKey: ['state','staff'] })` est vide, le cache des mutations est vide, et après rendu aucun nom de la fixture n'est présent dans le DOM ; une écriture collègue retenue puis relâchée après `close()` n'écrit rien dans le cache (garde de session, § 3.3.3).

#### 3.3.5 Copie locale

- **Clé et format inchangés** : `reservations-cache-v1`, forme exacte de `03` § 1.1 (`savedAt`, `etag`, `config`, `r1Used`, `r2Used`, `r1Days`, `r2Days`, `r2Items` avec `Nom` sans la mention et `Ticket`), champs du script compris : ce format est un contrat extérieur, jamais renommé. Le schéma `LocalCacheV1` valide la lecture ; les clés inconnues sont retirées (aucune donnée personnelle ne peut y entrer). La conversion vers le modèle anglais se fait dans les deux sens dans `queries/local-cache.ts` (`fromLocalCacheV1`, `toLocalCacheV1`, § 3.3.6).
- **Écriture** : seulement depuis une mise à jour réussie de `['state','public']` portant un `etag` non vide (corrige a-22) ; jamais depuis l'état complet. Les sommes `r1Used` / `r2Used` sont recalculées comme dans `saveCache`.
- **Lecture** : copie de moins de 14 jours ; `etag` absent accepté (copies écrites par l'ancien site après une session collègue) ; JSON invalide ou schéma refusé → ignorée.
- **Compatibilité dans les deux sens** (même origine `thegaudis.github.io`) : après la bascule, les visiteurs habituels arrivent avec une copie écrite par l'ancien site ; après un retour arrière (§ 7), l'ancien site relirait les copies écrites par le nouveau. Le nouveau doit donc lire et écrire **exactement** le format v1 ; un test relit la copie écrite par le nouveau code avec la logique de `loadCache` de `legacy/js/donnees.js` (conservé sur la branche jusqu'en P8 pour ces tests dorés).
- `reservations-textes` : relue en secours pour les titres du squelette quand il n'y a pas de copie valide, jamais écrite ; sa lecture est retirée après la bascule (§ 7).
- Transformations idempotentes : une copie déjà normalisée repasse par le schéma (`Ticket` déjà vrai, nom déjà sans la mention).

#### 3.3.6 Frontière de l'API : champs du script ↔ modèle de domaine anglais

**Règle (arbitrage 12).** Les noms de champs de `Code.gs` (`01`, `02` : `Date`, `Capacite`, `Qte`, `Nom`, `Prix`, `Stock`, `ItemID`, `Theme`, `Menu`, `Note`, `Classe`, `Contact`, `Observation`, `PrixTotal`, `nbEleve`, `mode: 'surplace'`…) et ceux de la copie locale (`03` § 1.1 : `savedAt`, `etag`, `config`, `r1Used`, `r2Used`, `r1Days`, `r2Days`, `r2Items`, `Ticket`…) sont des **contrats extérieurs qui ne changent pas**. Ils n'apparaissent qu'à la frontière, avec leurs tests : `api/schemas.ts` (réponses → modèle), `api/actions.ts` (modèle → corps des requêtes), `queries/local-cache.ts` (copie v1 ↔ modèle, dans les deux sens), `api/early-fetch.ts` (`etag` et `savedAt` de la copie, lus par le script inline) et `src/mocks/**` (faux script et fixtures, qui imitent le script). Tout le reste (`domain/`, `queries/`, `mutations/`, `features/`, tests de composants) ne voit que le **modèle de domaine anglais en camelCase**.

**Réception.** Chaque schéma valibot valide la forme exacte du script puis la traduit (`v.pipe(schémaDuScript, v.transform(…))`) : nombres en chaîne acceptés, `''` → `null` (prix absent, compteurs des anciennes réservations ; jamais 0), mention « (ticket restaurant) » retirée du nom et `voucher` déduit (transformation idempotente, la même pour l'API et la copie), `'surplace'` / `'emporter'` → `'dineIn'` / `'takeaway'`, champs `_…` rangés à côté de l'état (`duplicate`, `emailStatus`, `bookingResult`) et jamais dans le cache. Les types du modèle sont **déclarés à la main** dans `domain/types.ts` (source de vérité, sans dépendance vers `api/`) ; chaque schéma annote sa transformation pour les produire (`v.transform((dish): Dish => …)`), et un test de types vérifie `expectTypeOf<v.InferOutput<typeof DishSchema>>().toEqualTypeOf<Dish>()` pour chaque entité.

```ts
// src/api/schemas.ts (excerpt)
import type { Dish } from "@/domain/types";

const NumberLike = v.pipe(v.union([v.number(), v.pipe(v.string(), v.nonEmpty())]), v.transform(Number), v.finite());

const ApiDish = v.object({
  ID: v.string(),
  Date: IsoDate,
  Nom: v.string(),
  Stock: NumberLike,
  Prix: v.union([NumberLike, v.literal("")]),
  Ticket: v.optional(v.boolean()), // only in the local cache (03 § 1.1)
});

export const DishSchema = v.pipe(
  ApiDish,
  v.transform((dish): Dish => ({
    id: dish.ID,
    date: dish.Date,
    name: plainName(dish.Nom),
    stock: dish.Stock,
    price: dish.Prix === "" ? null : dish.Prix, // 01 § 2.5: "" means no price in euros, never 0
    voucher: dish.Ticket === true || hasVoucherMark(dish.Nom),
  })),
);
```

| Modèle de domaine (`domain/types.ts`) | Champs du script ou de la copie | Remarques |
| --- | --- | --- |
| `Settings` = `{ name1, name2, desc1, desc2, cancellationContact, priceStudent, priceStaff, priceExternal }` | `name1`, `name2`, `desc1`, `desc2`, `contactAnnulation`, `priceEleve`, `priceProf`, `priceExterieur` (`config` dans la copie) | tarifs en `number` (`'4.95'` accepté) ; `setConfigField` reçoit la clé du script (table `SETTINGS_API_KEYS` dans `api/actions.ts`) |
| `ServiceDayR1` = `{ date, capacity, menu, theme }` ; `StaffServiceDayR1` = `ServiceDayR1 & { openedBy }` | `Date`, `Capacite`, `Menu`, `Theme`, `OuvertPar` | `openedBy` seulement dans l'état complet |
| `ServiceDayR2` = `{ date, note, theme }` ; `StaffServiceDayR2` = `ServiceDayR2 & { openedBy }` | `Date`, `Note`, `Theme`, `OuvertPar` | |
| `Dish` = `{ id, date, name, stock, price, voucher }` | `ID`, `Date`, `Nom`, `Stock`, `Prix`, `Ticket` | `price: number \| null` ; `name` sans la mention ; `voucher` déduit du nom ou de `Ticket` |
| `BookingR1` = `{ id, date, name, className, contact, seats, students, staffMembers, externals, total, observation, timestamp }` | `ID`, `Date`, `Nom`, `Classe`, `Contact`, `Qte`, `NbEleve`, `NbProf`, `NbExt`, `PrixTotal`, `Observation`, `Timestamp` | `students`, `staffMembers`, `externals`, `total` : `number \| null` (anciennes réservations) |
| `BookingR2` = `{ id, dishId, date, name, className, contact, portions, serviceMode, observation, timestamp }` | `ID`, `ItemID`, `Date`, `Nom`, `Classe`, `Contact`, `Qte`, `Mode`, `Observation`, `Timestamp` | `serviceMode: 'dineIn' \| 'takeaway'` ; une ligne par plat |
| `Order` (`domain/print.ts`) | — | regroupement par client des lignes `BookingR2` (impressions, panneau « Demain ») |
| `SeatTotal` = `{ date, seats }` ; `PortionTotal` = `{ dishId, portions }` | `r1Bookings` / `r2Bookings` publics (`{ Date, Qte }`, `{ ItemID, Qte }`) ; `r1Used` / `r2Used` de la copie | |
| `PublicState` = `{ etag, settings, r1Days, r1Booked, r2Days, dishes, r2Booked }` | état public (`02` § 3.2) ou copie v1 | `etag: string \| null` (copie écrite sans etag par l'ancien site) |
| `FullState` = `{ settings, r1Days, r1Bookings, r2Days, dishes, r2Bookings, r1Booked, r2Booked }` | état complet (`02` § 4.3) | `r1Booked` / `r2Booked` calculés à la frontière : `domain/capacity.ts` ne connaît qu'une forme |
| `WriteResponse` = `{ state, duplicate, emailStatus, bookingResult }` | état + `_duplicate`, `_emailStatus`, `_bookingResult` (`02` § 5.4) | seul `state` va dans le cache |

**Envoi.** `api/actions.ts` expose une fonction par action, qui prend une entrée en modèle anglais et recompose le corps avec les noms attendus par le script (`02` § 4.4, § 4.5, § 4.7) :

```ts
// src/api/actions.ts (excerpt)
export async function addBookingR1(input: BookingR1Input, signal?: AbortSignal): Promise<WriteResponse> {
  const json = await postAction(
    "addBookingR1",
    {
      date: input.date,
      nom: input.name,
      contact: input.contact,
      classe: input.className,
      nbEleve: input.students,
      nbProf: input.staffMembers,
      nbExt: input.externals,
      observation: input.observation,
      requestId: input.requestId,
    },
    { signal },
  );
  return v.parse(WriteResponse, json);
}
// addBookingR2Multi: mode = input.serviceMode === "dineIn" ? "surplace" : "emporter", items = [{ itemId, qte }]
// editBookingR1: qte and prixTotal sent exactly as 02 § 4.7 (the script ignores them)
// addDayR2 / addItemR2 / editItemR2: name = withVoucherMark(name, voucher), price = price ?? ""
```

**Copie locale.** `queries/local-cache.ts` lit avec `LocalCacheV1` (champs v1 tels quels) puis `fromLocalCacheV1()` → `PublicState`, et écrit avec `toLocalCacheV1(state, savedAt)`, qui produit exactement les clés et noms de champs de `03` § 1.1 (`Prix: ""` pour un prix absent, `Nom` sans la mention, `Ticket`, tarifs en chaînes).

**Coût et bénéfice.** Coût : deux fonctions de conversion par entité (réception et envoi ou écriture de la copie), à tester une fois sur les exemples JSON de `02` et `03` § 1.1 (aller-retour, corps exacts, test doré avec `loadCache` de `legacy/js/donnees.js`). Bénéfice : aucun identifiant français ni champ du script hors de la frontière (§ 3.1) ; types lisibles (`dish.price` vaut `number | null` au lieu de `Prix: number | string | ''`) ; `exactOptionalPropertyTypes` plus simple (champs toujours présents, `null` explicite plutôt que champs facultatifs ou `""`) ; un changement futur du script ne touche que la frontière.

### 3.4 Session et tâches de fond

```ts
// src/session/session.ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type SessionEnd = "logout" | "inactivity" | "password-changed";

interface SessionState {
  /** Memory only: never persisted, never in the URL or a query key. */
  readonly password: string | null;
  /** Session number: key ['state','staff', id]. */
  readonly id: number;
  /** Why the last session ended, for the toast. */
  readonly endReason: SessionEnd | null;
  readonly open: (password: string) => void;
  readonly close: (reason: SessionEnd) => void;
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set, get) => ({
    password: null,
    id: 0,
    endReason: null,
    open: (password) => set({ password, id: get().id + 1, endReason: null }),
    close: (reason) => {
      if (get().password !== null) set({ password: null, endReason: reason });
    },
  })),
);
export type SessionStore = typeof useSessionStore;
```

- Le store est injecté dans le `context` du routeur (`session: useSessionStore`) : la garde lit `context.session.getState()`, les tests passent un store neuf. Les composants lisent toujours avec un sélecteur (`useSessionStore(s => s.password !== null)`), jamais le store entier.
- **Inactivité** (`background/inactivity.ts`, `06` § 1.6) : écouteurs passifs `click`, `keydown`, `mousemove`, `touchstart` (ceux de `06` § 1.6) posés une fois sur `document` ; ils écrivent seulement une variable de module (aucun rendu). Un seul `setTimeout`, armé à l'ouverture pour le temps restant, se réarme si une activité a eu lieu, sinon `close('inactivity')`. Revérification sur `visibilitychange` (onglet visible) et `pageshow` (retour depuis le cache de navigation), car les minuteurs sont ralentis en arrière-plan. Pas de synchronisation entre onglets (D-26).
- **Horloge** (`background/clock.ts`) : `useClock = create<{ now: number }>()(…)`, mise à jour par un minuteur aligné sur chaque minute (donc à 10 h 00 et à minuit pile, à quelques millisecondes près) et sur `visibilitychange` / `pageshow`. Les composants lisent des **valeurs dérivées** (`useToday()` = `parisDate(now)`, `useIsR2OrderingClosed(iso)`), donc ne se rendent de nouveau que lorsque la valeur change. Aucun `new Date()` ni `Date.now()` pendant le rendu (règle `react/purity`).
- **10 h** : la fiche R2 passe à l'état « clos » d'elle-même (valeur dérivée) ; si un formulaire R2 est ouvert sur un jour désormais clos, la tâche de fond retire `reserver` (`replace`) et affiche le toast neutre de clôture (`Commandes en ligne clôturées à 10h. Venez au restaurant {name2} à partir de 12h pour commander sur place.`), au lieu d'une fermeture silencieuse (a-7). Le contrôle est repris à l'envoi (`04` § 5.3) : le formulaire appelle `syncClock()`, qui relit l'heure, et `watchR2Cutoff` ferme alors le formulaire avec le toast neutre ; une commande déjà envoyée garde son formulaire jusqu'à sa réponse (`isMutating` sur `bookingKeys.r2()`) (P4 (d)).
- **Minuit** : « aujourd'hui » change, les calendriers sans `r1` / `r2` dans l'URL suivent ; un formulaire ouvert garde sa date (écrite dans l'URL à l'ouverture).

### 3.5 Composants UI (`src/ui/`)

Repris du tableau de `recherche/ui-forms.md` § 9, adapté aux décisions. Chaque composant Base UI est enveloppé **une seule fois** ; le code métier n'importe jamais `@base-ui/react`. Libellés anglais surchargés, `aria-label` français obligatoires sur les boutons icônes, classe `.accent-*` posée aussi sur les portails.

| Existant (spec) | Composant cible | Base UI | Notes |
| --- | --- | --- | --- |
| `.btn`, `.primary`, `.ghost`, `.small`, `.danger` (`08` § 4.2) | `ui/button/Button.tsx` | `Button` | `data-variant`, `data-size`, `aria-busy` + libellé d'attente (« Envoi en cours… ») |
| `.icon-btn`, `.tonal` (`08` § 4.4) | `ui/button/IconButton.tsx` | `Button` | `aria-label` obligatoire dans le type des props |
| `confirmClick` / `disarm` (`00` § 3, `06` § 5.2) | `ui/button/ConfirmButton.tsx` | `Button` | 1er clic : `data-armed`, « Confirmer ? », largeur figée, `aria-label` et `title` = détail ; 2e clic dans les 4 s : action ; minuteur local armé dans le gestionnaire de clic, gardé dans une `ref`, annulé à chaque armement et désarmement (a-19) et nettoyé par la fonction de retour d'une ref callback (aucun effet) ; annonce `role="status"` masquée (texte : annexe F) ; état occupé pendant l'envoi |
| `segGroup` Semaine/Mois, Client/Collègue (`08` § 6.3) | `ui/toggle/ViewToggle.tsx` | `ToggleGroup` + `Toggle` | ignorer la valeur vide (2e clic) ; coche animée sur `[data-pressed]` |
| Mode de service (`04` § 5.3), mode d'une réservation R2 (`06` § 7.4, 8.3) | `ui/form/SegmentedRadio.tsx` | `RadioGroup` + `Radio` + `Fieldset` | une seule option un jour au ticket (`:only-of-type`) ; remplace le `<select>` collègue |
| `.field`, `label`, `.field-help`, `.field-error`, `checkFields`, `markInvalid`, `linkLabels` (`00` § 3) | `ui/form/TextField.tsx`, `PasswordField.tsx` | `Field` | `invalid`, `touched`, `dirty` venus de TanStack Form ; `Field.Error` rendu conditionnellement ; aide masquée en erreur ; jamais `required` / `pattern` natifs |
| Compteurs R1, quantités R2, stock, portions (`04` § 5.2-5.3) | `ui/form/NumberField.tsx` | `NumberField` | `locale="fr-FR"`, `aria-roledescription="champ numérique"`, boutons −/+ en français (D-17), glyphes − et + en constantes, entiers seulement ; champ vide (`null`) compté 0 dans les calculs mais **affiché vide** (compteurs `null` des anciennes réservations, `06` § 7.3) ; attributs rendus (`type`, `min`, `max`, `placeholder="0"`, `inputmode`) comparés en P3 à `04` § 5.2-5.3, chaque différence ajoutée à E-19 ; prop `errorShownBy` : le message d'erreur est porté par la rangée des trois compteurs R1 (P4 (c)) |
| Prix avec `<datalist>` (`06` § 6.1) | `ui/form/PriceField.tsx` | `Field` (contrôle texte `inputMode="decimal"`) | `NumberField` n'accepte pas de `datalist` ; virgule acceptée (`parseAmount`) |
| Case « Ticket restaurant » (`06` § 4.3) | `ui/form/CheckboxField.tsx` | `Checkbox` | le prix se désactive par `form.Subscribe` (fin de `syncTicketPrice`) |
| Formulaire (contexte, envoi) | `ui/form/app-form.ts` (`createFormHook`), `SubmitButton.tsx`, `errors.ts` | — | champs pré-liés ; `revalidateLogic({ mode: 'submit', modeAfterSubmission: 'change' })` ; `errorText()` (erreurs Standard Schema = objets) ; focus sur le premier `[aria-invalid="true"]` dans l'ordre du DOM (`04` § 5.4) ; `canSubmitWhenInvalid: true` ; après un envoi refusé, le message d'un champ reste affiché jusqu'à ce que la valeur soit valide (E-46) |
| `details.disclosure`, `.form-reveal`, liste de plats repliée (`08` § 4.11, `05` § 6.4) | `ui/disclosure/Collapsible.tsx` | `Collapsible` | `--collapsible-panel-height`, `data-starting-style` / `data-ending-style` |
| Sélecteur de date C-05 (`06` § 3) | `ui/calendar/DatePickerPopover.tsx` | `Popover` | flèches = focus seulement ; Échap, clic extérieur et retour du focus gérés |
| Calendriers (`05` § 2-3) | `ui/calendar/CalendarGrid.tsx`, `CalendarHeader.tsx` | — (maison) | voir ci-dessous |
| `showToast` (`00` § 3, `08` § 4.14) | `ui/feedback/toast.ts` (gestionnaire global) + `Toaster.tsx` | `Toast` | `Toast.createToastManager()` (sans option) dans `toast.ts`, appelable hors React (mutations, tâches de fond) ; `<Toast.Provider toastManager={…} limit={1}>` dans `Toaster.tsx` (un seul toast, a-8), 3,5 s ; types succès, neutre, erreur (`priority: 'high'`) ; viewport `aria-label="Notifications"` |
| `.alert`, `.alert.warning`, `.note-warning`, `.setup-banner` (`08` § 4.12-4.13, 4.20) | `ui/feedback/Alert.tsx` | — | `data-tone`, `role="alert"` ou `status` |
| `.capacity-pill` + `gaugeStyle` (`05` § 4.5) | `ui/feedback/CapacityPill.tsx` | — | `--pct`, classe d'état, mot d'état visible (D-02) |
| Squelette `.sk`, spinner (`08` § 4.15-4.16) | `ui/feedback/Skeleton.tsx`, `Spinner.tsx` | — | plus de voile bloquant (§ 4.2) |
| `ICONS`, chevrons, œil, calendrier, coche (`08` § 6.2) | `ui/icons.tsx` | — | SVG repris tels quels, `aria-hidden`, `currentColor` |
| Dialogues (aucun aujourd'hui, `09` § 6) | aucun | — | aucune décision ne les utilise (D-21 et § 6.1 retiennent `ConfirmButton`) : ne pas créer `ui/overlay/` |
| `printDoc`, `printTable`, `openPrint` (`07`) | `ui/print/print.ts`, `PrintRoot.tsx`, `PrintLayout.tsx`, `PrintTable.tsx` | — | § 3.8 |

**Calendrier maison** (`ui/calendar/CalendarGrid.tsx`) : `role="grid"` étiqueté par le libellé de période (`aria-live="polite"`), lignes `role="row"`, en-têtes `L M M J V S D` (`aria-hidden` ou `<abbr>`), cellules `role="gridcell"` avec `aria-selected`, chacune contenant un `<button>` (pas un `<Link>` : le routeur poserait `aria-current="page"` et écraserait `aria-current="date"`). Un seul `tabIndex=0` : le jour sélectionné s'il est affiché, sinon la première case (`05` § 2.6). `aria-label` de `05` § 2.5 (date longue désormais avec « 1er », D-03), construit par `intl.formatMessage`. Clavier exactement selon `05` § 3.2 (← → ±1 j, ↑ ↓ ±7 j, Début / Fin = lundi / dimanche, Page ↑ / ↓ = même jour du mois voisin **borné au dernier jour du mois**, a-23), la vue suit la sélection sans glissement ; Entrée / Espace = clic natif. Focus sans effet : le gestionnaire `onKeyDown` focalise la case cible si elle est déjà dans le DOM puis navigue (`replace`) ; si la période change, la nouvelle case sélectionnée reprend le focus par une ref callback « si le focus est tombé sur `body` » (`refocusIfOrphaned`). Vue semaine = une ligne, vue mois = 42 cases.

### 3.6 Styles

- `design-system.css` est conservé comme source des jetons et découpé : `styles/tokens.css` (§ 1-2 : `:root`, `.accent-green`, `.accent-magenta`, alias `[data-accent="r1"|"r2"]`), `styles/base.css` (§ 3 et 5 : base, `:focus-visible`, keyframes `rise` / `sink` / `pulse-armed`, `prefers-reduced-motion`, confort tactile), `styles/print.css`. Les valeurs des jetons ne changent pas (`08` § 1).
- `app.css` et les composants de `design-system.css` deviennent des **CSS Modules** co-localisés (`X.module.css`), qui n'utilisent que `var(--…)`. Variantes et états par attributs `data-*` (les nôtres et ceux de Base UI : `data-checked`, `data-pressed`, `data-invalid`, `data-starting-style`…). Pas de Tailwind.
- Mise en place Base UI : `isolation: isolate` sur le conteneur de l'appli, `body { position: relative }` (fonds de dialogue sur iOS), champs ≥ 16 px sur écran tactile (zoom iOS).
- Accent par restaurant par la cascade de variables ; les portails (Popover, Toast) reçoivent `className="accent-…"`.
- Dette de `08` PA 6-8 (a-26) : retirer `.tag`, `.admin-on`, `ICONS.eye` ; transformer en jetons `font-size: 15px` et les largeurs en dur (108, 170, 76, 260 px, durées 300 ms) ; la redéfinition de `--text-muted` par le thème vert est conservée (valeurs des jetons inchangées).
- Mouvement : transitions plutôt que keyframes pour ouvrir et fermer (`data-starting-style` / `data-ending-style`), fiche montée avec `key={iso}` ; transitions de vue du calendrier par l'option `viewTransition` de la navigation du routeur (types `next` / `prev` / `zoom-in` / `zoom-out` / `day-next` / `day-prev`), sans les cumuler avec `<ViewTransition>` ; tout est coupé par `prefers-reduced-motion`. Le comportement fonctionnel doit être identique sans transitions (`05` § 3.4).
- Optionnel : stylelint (`stylelint-config-standard` + `declaration-strict-value` sur couleurs, rayons, tailles de police).

### 3.7 Dates et fuseau

- Les jours métier sont des chaînes `IsoDate` (`YYYY-MM-DD`), comparées par ordre lexicographique, échangées avec le script et mises dans l'URL. Jamais `new Date('2026-10-05')` (UTC implicite) ni `toISOString()` sur une heure locale.
- Arithmétique en UTC (`Date.UTC`, `setUTCDate`) : `addDays`, `mondayOf`, `weekCells`, `monthCells` (42 cases, lundi en premier), `addMonthsClamped`, `keyTargetIso`. Reprendre `src/lib/dates.ts` d'AppResaAristide (dont `formatWeekLabel` et un `addMonths` sans débordement), en l'adaptant aux libellés de `05` § 2.3 et à la correction a-23 (« 28 sept. – 4 oct. 2026 », année du lundi affichée si elle diffère).
- Affichage : par l'instance `intl` (§ 3.10), formats nommés avec `timeZone: 'UTC'` appliqués à `Date.UTC(…)` ; date longue **avec l'ordinal** : `jeudi 1er octobre 2026` (D-03, arbitrage 11 : comme les e-mails du script) ; majuscule initiale par CSS `::first-letter` comme aujourd'hui.
- « Maintenant » : `parisDate(ms)` et `parisHour(ms)` (`Intl` avec `timeZone: 'Europe/Paris'`, repris d'AppResaAristide). `isR2OrderingClosed(iso, now) = iso < parisDate(now) || (iso === parisDate(now) && parisHour(now) >= 10)` ; `isPast(iso, today) = iso < today` ; « demain » = `addDays(parisDate(now), 1)`.
- Pas de Temporal (absent de Safari stable), pas de polyfill, pas de date-fns. Tests sous `TZ=Europe/Paris` et `TZ=America/New_York`, et autour des changements d'heure (29 mars et 25 octobre 2026).

### 3.8 Impression

- **Dans le même document** : plus de `window.open`, plus de `PRINT_TOKENS`, plus de toast « Autorisez les fenêtres de ce site pour imprimer. » (I-00 disparaît). Le module d'impression est chargé par `import()` au clic.
- Mécanique (`ui/print/print.ts` + `<PrintRoot/>` monté une fois sous `/collegue`) : `printDocument(content, title)` fait `flushSync` pour poser le document dans un portail `.print-root`, change `document.title` (nom proposé pour le PDF : titres de `07` § 3, 4, 6 et 7), attend `document.fonts.ready` au plus 2 s, puis `window.print()` ; à `afterprint`, le titre est rétabli et le portail vidé. Les données sont un instantané de l'état complet au moment du clic.
- `styles/print.css` : à l'écran `.print-root { display: none }` ; à l'impression, tout le reste masqué (`body:has(> .print-root) > :not(.print-root)`), page nommée `list` : `@page list { size: A4 landscape; margin: 12mm 14mm 14mm; @bottom-left { … } @bottom-right { content: "Page " counter(page) " / " counter(pages) } }` (valeurs de police et de couleur écrites en dur dans les boîtes de marge, seule exception à la règle des jetons), `print-color-adjust: exact`, en-têtes de tableau répétés, lignes insécables, total jamais seul en haut de page.
- Les quatre documents (`07` § 3, 4, 6, 7) sont des composants React (`ListDocumentR1`…) qui réutilisent les jetons réels et les couleurs par restaurant de `07` § 2.3 ; regroupements et totaux viennent de `domain/print.ts` (un ticket par commande, a-11 ; ordre actuel des listes conservé, D-08 non retenue ; textes corrigés de a-24).
- Limites connues : boîtes de marge (« Page x / y ») seulement dans Chromium 131+ ; le pied `.pb-foot` « écran seulement » n'a plus d'objet (le document n'est jamais visible à l'écran).

### 3.9 Erreurs et états de chargement

| Situation | Mécanisme | Rendu et texte (référence) |
| --- | --- | --- |
| Premier chargement sans copie (G-01) | coquille prérendue + `pendingComponent` | squelette des deux calendriers (`aria-hidden`), titres par défaut ou de `reservations-textes`, aucun texte « Chargement » (`03` § 3) ; avec la copie locale aussi, le squelette reste jusqu'à la fin de l'hydratation (barrière `useHydrated()`, environ 130 ms mesurés, ≤ 600 ms exigés, E-47) |
| Copie locale affichée, données pas encore confirmées (G-02) | `useIsFromCache()` | page complète interactive, « Réserver » actif ; connexion refusée : toast `Les données se chargent. Réessayez dans un instant.` |
| Échec de lecture (G-03) | encadré dans `Page` quand la dernière lecture a échoué et qu'aucune n'a réussi depuis le chargement (`errorUpdatedAt > dataUpdatedAt` et `dataUpdatedAt < APP_START`) ; `LoadErrorPage` reste le composant d'erreur par défaut du routeur (erreur de rendu, loader de `/collegue`) | `LoadErrorBox` (`role="alert"`) : textes exacts de `03` § 3.1 (en ligne / hors ligne via `navigator.onLine`, suffixe « copie locale ») ; bouton `Réessayer` occupé `Nouvelle tentative…` → `reset()` puis `router.invalidate()` ou `refetch()` ; réannonce seulement si le texte change (a-21) ; le toast inatteignable de `03` § 3.2 n'est pas recréé |
| Configuration manquante (G-05) | `isConfigMissing()` au build et à l'exécution | `ConfigBanner` si l'URL est absente, ne ressemble pas à `https://script.google.com/macros/s/…/exec` ou contient `COLLE_ICI` (a-25) ; texte selon D-05 ; couvert par une story et un test Vitest du composant (`isConfigMissing` simulé), pas par l'E2E (F-07) |
| Erreur métier d'écriture | `BusinessError` | message exact du script (`02` § 4) sous le champ ou en toast d'erreur ; formulaire et `requestId` conservés ; relecture de l'état après une erreur de places (a-4) |
| Erreur réseau, page HTML de Google, réponse illisible | `ServiceError` (et `TypeError` de `fetch`) | jamais de message anglais brut (a-3) : textes de D-14 |
| Écriture lente | rien n'est interrompu | signal de lenteur selon D-15 ; bouton occupé ; « Annuler » désactivé pendant l'envoi (a-20) |
| Mot de passe changé | `PasswordRejectedError` → `onError` global | déconnexion (§ 3.3.4) |
| Doublon (`_duplicate`) | lecture de la réponse | récapitulatif « déjà enregistrée » (D-16) |
| Chunk introuvable après un déploiement | le routeur recharge une fois la page (`isModuleNotFoundError`) ; écouteur `vite:preloadError` qui recharge une fois (garde en `sessionStorage`) | transparent |
| URL invalide | `v.fallback` partout ; `$.tsx` | aucun écran d'erreur ; « Page introuvable » pour un chemin inconnu |

Plus de voile bloquant plein écran (G-06) : connexion et suppressions utilisent un bouton occupé (§ 4.2).

### 3.10 Textes et formats (react-intl / FormatJS)

Arbitrage 11 : **tous** les textes de l'interface passent par react-intl, même sans localisation, pour une vraie gestion des pluriels, des montants et des dates. Dispositif repris d'element-admin (react-intl 12, `@formatjs/cli`, `@formatjs/unplugin`, `eslint-plugin-formatjs` via `jsPlugins`), simplifié pour une langue unique.

**Principes**
- Langue unique `fr-FR` (`locale` et `defaultLocale`). Les `defaultMessage` sont écrits **en français dans le code**, recopiés mot pour mot de la spec (guillemets de code ou « »), ponctuation et espaces comprises ; aucun fichier de traduction n'est chargé à l'exécution (react-intl ne signale pas de traduction manquante quand la langue est la langue par défaut). La spec fait foi : ne jamais reprendre un texte d'AppResaAristide (version ancienne, tutoiement) sans le vérifier.
- **Ids explicites et stables, en anglais, par domaine** (arbitrage 12) : `{area}.{screen or component}.{element}`, segments en anglais et en camelCase ; zones `public`, `staff`, `loading`, `print`, `common` (textes partagés) et `ui` (textes génériques des composants de `ui/`, par exemple `ui.confirm`) ; par exemple `public.r1.form.name.label`, `public.r2.cutoff`, `public.toast.bookingConfirmed`, `staff.settings.save`, `loading.failure.offline`, `print.r1.documentTitle`, `common.action.cancel`. Un id ne change pas quand le texte change.
- **`description` obligatoire** et littérale, qui cite la source dans la spec (`"04 § 9 — toast de succès d'une réservation"`) : traçabilité et relecture.
- Où vivent les messages : dans le fichier qui les utilise ; les textes partagés par plusieurs fichiers dans `intl/common-messages.ts`. **Le catalogue `textes.ts` centralisé n'existe plus.**
- **Deux formes seulement** : `<FormattedMessage id="…" defaultMessage="…" description="…" />` écrit littéralement dans le JSX, ou `defineMessages({ … })` (ou `defineMessage`) en tête de module, dont les descripteurs sont passés à `intl.formatMessage(messages.x)` ou `<FormattedMessage {...messages.x} />`. Un descripteur rangé dans une variable ordinaire n'est pas précompilé par `@formatjs/unplugin` : en production (alias `no-parser`), il s'affiche en ICU brut avec une erreur `FORMAT_ERROR` (mesuré par le projet d'essai), alors que `vite dev` l'affiche correctement. Contrôle : `onError` de `intl.ts` appelle `console.error`, et la fixture E2E (build de production) échoue sur toute erreur console `@formatjs/intl`.
- Pluriels et ordinaux en ICU : `{n, plural, one {# couvert} other {# couverts}}` (en français, 0 et 1 sont au singulier, comme `plural()` de `00` § 3 : `0 couvert`, `1 couvert`, `2 couverts`) ; `{n, plural, one {# ticket restaurant} other {# tickets restaurant}}` ; date longue `{weekday} {day, selectordinal, one {#er} other {#}} {month} {year}` (`intl/dates.ts`, parties fournies par `intl.formatDate` avec `timeZone: 'UTC'`) → `jeudi 1er octobre 2026`, `samedi 3 octobre 2026`.
- Valeurs insérées en placeholders nommés, en anglais (`{name2}`, `{contact}`, `{rem}`, `{capacity}`, `{name}`) ; textes du script (`{ error }`) affichés tels quels, jamais passés dans `defaultMessage`.
- Mise en forme riche par balises déclarées une fois dans `defaultRichTextElements` (`<b>`, `<i>`) ; pas de `<br>` dans un message : deux messages ou deux paragraphes (encadré d'échec de `03` § 3.1).
- Espaces insécables écrites `\u00A0` dans une chaîne JavaScript (jamais le caractère invisible) : dans `defineMessages`, ou en JSX `defaultMessage={"…\u00A0…"}` **entre accolades** ; jamais dans un attribut JSX entre guillemets, qui n'interprète pas l'échappement (la page afficherait `\u00A0`) ; contrôle CI : `! grep -F '\\u00A0' translations/fr.json`. Cas : séparateur `␣— ` devant un prix (`dash` de `00` § 3), etc. ; les séparateurs ` — ` des lignes de réservation et du récapitulatif gardent des espaces normales (`spec/README.md` § 4.1). `preserveWhitespace: true` dans le plugin et `--preserve-whitespace` à l'extraction, sinon FormatJS normalise les espaces.

**Formats partagés** (`intl/formats.ts`, passés à `createIntl({ formats })` et typés par `FormatjsIntl.Formats`) :

| Nom | Définition | Usage |
| --- | --- | --- |
| `number.euro` | `{ style: 'currency', currency: 'EUR' }` | tous les montants : `<FormattedNumber value={x} format="euro" />` ou `intl.formatNumber(x, { format: 'euro' })` → `12,50␣€`, `4,95␣€`, `0,00␣€` (mesuré sous Node 22 / ICU 77 : U+00A0 avant €, U+202F comme séparateur de milliers au-delà de 999 €) |
| `date.weekday`, `date.month`, `date.year` | `{ weekday: 'long' }`, `{ month: 'long' }`, `{ year: 'numeric' }`, `timeZone: 'UTC'` | parties de la date longue (avec ordinal) |
| `date.dayMonth` | `{ day: 'numeric', month: 'short', timeZone: 'UTC' }` | libellé de semaine (« 28 sept. – 4 oct. 2026 ») |
| `date.monthYear` | `{ month: 'long', year: 'numeric', timeZone: 'UTC' }` | libellé de mois, sélecteur de date (« Octobre 2026 », majuscule par CSS) |
| `date.printedOn` | `{ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }` | « Imprimé le 3 octobre 2026 » (`07` § 2.2) |

**Instance unique et usage hors composants** : `intl/intl.ts` exporte `intl = createIntl({ locale: 'fr-FR', defaultLocale: 'fr-FR', formats, defaultRichTextElements, onError }, createIntlCache())`. Le routeur pose `<RawIntlProvider value={intl}>` dans son `Wrap` (avec le `QueryClientProvider`) ; les composants utilisent `<FormattedMessage>`, `<FormattedNumber>` ou `useIntl()`. Hors React, le même objet sert aux toasts des mutations et des tâches de fond (déconnexion, 10 h), à `document.title` de l'impression et aux `aria-label` construits dans des fonctions. Un texte qui va dans un **attribut** (`aria-label`, `title`, `placeholder`, `alt`) passe par `intl.formatMessage(...)`, jamais par `<FormattedMessage>`.

**Extraction et contrôle** :
- `pnpm i18n:extract` = `formatjs extract 'src/**/*.{ts,tsx}' --ignore 'src/**/*.test.{ts,tsx}' --ignore 'src/**/*.stories.tsx' --ignore 'src/test/**' --throws --preserve-whitespace --out-file translations/fr.json` (format par défaut : `id → { defaultMessage, description }` ; sortie déterministe, laissée telle quelle : `translations/**` est exclu d'oxfmt et d'oxlint). `--throws` échoue sur un message invalide ou un même id avec deux textes différents. Tests et stories sont exclus de l'extraction : ils réutilisent les ids réels des composants qu'ils rendent (un id ad hoc serait refusé par `tsc`).
- CI : `pnpm i18n:extract` puis `git diff --exit-code translations/fr.json` (le fichier versionné doit être à jour) ; `pnpm check` commence par l'extraction (comme element-admin).
- Ids typés : `intl/types.d.ts` fait `import type messages from "@translations/fr.json"` et déclare `FormatjsIntl.Message['ids']` = `keyof typeof messages` (motif d'element-admin, adapté aux règles `import/no-relative-parent-imports` et `consistent-type-imports`) : un id inconnu est une erreur `tsc`. `formats.ts` s'écrit `as const`, sans `satisfies CustomFormats` (le type des formats deviendrait circulaire, TS7022).
- `translations/fr.json` sert aussi de **relecture des textes** contre la spec (P7) ; une localisation future ajouterait `formatjs compile --ast` et un chargement par langue comme element-admin.

**Build** : `@formatjs/unplugin/vite` avec `{ ast: true, preserveWhitespace: true }` précompile chaque `defaultMessage` en AST ; en production, l'alias `@formatjs/icu-messageformat-parser` → `@formatjs/icu-messageformat-parser/no-parser.js` retire l'analyseur ICU (§ 3.11). Poids mesuré (esbuild + gzip, React exclu, `IntlProvider`, `FormattedMessage`, `FormattedNumber`, `FormattedDate`, `useIntl`, `createIntl`) : **14,8 kB gzip avec l'analyseur, 7,6 kB sans** (gain de l'alias mesuré dans le projet d'essai : 7,4 kB gzip) ; s'y ajoutent les messages en AST, répartis dans les chunks qui les utilisent (quelques kB). Aucun polyfill `Intl` nécessaire sur les navigateurs ciblés.

**Lint** (`eslint-plugin-formatjs` par `jsPlugins`) : `enforce-default-message: literal`, `enforce-description: literal`, `enforce-placeholders`, `enforce-plural-rules: { one: true, other: true }`, `no-multiple-whitespaces`, `no-multiple-plurals`, `no-offset`, `prefer-pound-in-plural`, `no-missing-icu-plural-one-placeholders`, `no-complex-selectors`, `no-useless-message`, `no-literal-string-in-jsx` (y compris les props `label`, `placeholder`, `title`, `aria-label`, `alt`), `no-emoji` (le « ⚠ » du bandeau, seul symbole admis par la charte, est une icône SVG ou une exception commentée). `no-literal-string-in-jsx` est désactivée par override pour `*.stories.tsx` et les tests ; les glyphes − et + du `NumberField` sont des constantes. **Non repris d'element-admin** : `blocklist-elements: ['selectordinal']` (il nous faut l'ordinal « 1er ») et `enforce-id` par empreinte (nos ids sont explicites).

**Tests** : `renderWithProviders` (projet Vitest `browser`, `vitest-browser-react`) et le décorateur global de `.storybook/preview.tsx` enveloppent `QueryClientProvider` + `RawIntlProvider value={intl}` ; les fonctions de `intl/` se testent avec la même instance (projet `node`) ; les attentes comparent les chaînes exactes de la spec (avec `\u00A0` explicite). `vitest.config.ts` et Storybook chargent aussi `@formatjs/unplugin` (même transformation qu'en production).

**Pièges** : ids en double (même id, deux textes) → `--throws` ; apostrophe ICU (`'` suivie de `{` ou `}` ouvre une citation : écrire `''` dans ce cas) ; `{` et `}` littéraux à échapper ; HTML dans un message → balises déclarées seulement ; `<FormattedMessage>` dans un attribut (rend un objet, pas une chaîne) ; espaces normalisées si `preserveWhitespace` est oublié ; U+202F produite par `Intl` au-delà de 999 € (et, selon les moteurs, éventuellement devant €) : comparer en tests sous Node, vérifier une fois dans Chromium et WebKit (P7), ne jamais coder l'espace en dur autour d'un montant formaté ; `#` d'un pluriel formaté selon la locale.

### 3.11 Configuration de build et routeur

```ts
// vite.config.ts
import formatjs from "@formatjs/unplugin/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages project site. Custom domain: BASE_PATH=/
const base = process.env["BASE_PATH"] ?? "/reservations-restaurants/";

export default defineConfig(({ command }) => ({
  base, // Start derives the router basepath from it: never hard-code /reservations-restaurants
  resolve: {
    tsconfigPaths: true, // @/* alias from tsconfig
    // Messages are precompiled to AST by @formatjs/unplugin: every build (production and build:e2e) drops the ICU parser (-7.4 kB gzip)
    alias: command === "build"
      ? { "@formatjs/icu-messageformat-parser": "@formatjs/icu-messageformat-parser/no-parser.js" }
      : {},
  },
  build: { manifest: true, sourcemap: true }, // manifest read by scripts/check-budget.ts
  plugins: [
    tanstackStart({ spa: { enabled: true, prerender: { outputPath: "/index.html" } } }),
    react({ compiler: true }), // after tanstackStart(); requires oxc-transform-react@~0.145.0 (experimental)
    formatjs({ ast: true, preserveWhitespace: true }), // defaultMessage kept (single locale), compiled to AST
  ],
}));
```

```tsx
// src/router.tsx (extrait)
export function getRouter() {
  const queryClient = createQueryClient();
  const inBrowser = typeof window !== "undefined"; // getRouter() also runs in Node when the shell is prerendered
  if (inBrowser) {
    restoreLocalCache(queryClient); // SYNCHRONOUS, before the router: first render comes from the local cache
    persistLocalCache(queryClient);
  }
  const router = createRouter({
    routeTree,
    context: { queryClient, session: useSessionStore },
    defaultPreloadStaleTime: 0, // Query owns freshness
    defaultStructuralSharing: true,
    scrollRestoration: true,
    defaultPendingComponent: PageSkeleton,
    // defaultPendingMinMs keeps its default (500 ms): 0 triggers React error #418 on hydration (PLAN arbitrage 16)
    defaultErrorComponent: LoadErrorPage,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <RawIntlProvider value={intl}>{children}</RawIntlProvider>
      </QueryClientProvider>
    ),
  });
  if (inBrowser) {
    useSessionStore.subscribe(
      (s) => s.password !== null,
      (loggedIn) => {
        if (!loggedIn) afterLogout({ router, queryClient }); // PLAN § 3.3.4, steps 2 to 6
      },
    );
    startBackgroundTasks({ queryClient, router });
  }
  return router;
}
```

Le shell : `<html lang="fr"><head><ScriptOnce>{earlyFetchScript}</ScriptOnce><HeadContent /></head><body>{children}<Scripts /></body></html>` (`children=` en prop est refusé par `react/no-children-prop`) ; `head()` porte les `meta`, le titre, le favicon et les `preconnect` (`crossOrigin: 'anonymous'`). Aucun code de niveau module qui touche `window`, `document` ou `localStorage` dans `__root.tsx`, `router.tsx` et leurs imports (le prérendu échouerait). Le build ne prouve pas la garde `typeof window` de `getRouter()` quand la lecture du stockage est dans un `try/catch` (l'erreur est avalée) : un test Vitest `node` appelle `getRouter()` sans `window` et vérifie que `persistLocalCache` n'est pas abonné (R-02).

Point d'entrée client (`src/client.tsx`, pris en compte par Start) : celui de Start (`hydrateRoot(document, <StrictMode><StartClient /></StrictMode>)` dans un `startTransition`), précédé, seulement quand `USE_MOCK_API` est vrai (`pnpm dev`), de `await (await import("@/mocks/browser")).startDevWorker()` ; Vite élimine ce code du build de production. Aucun `onRecoverableError` (arbitrage 16). `api/early-fetch.ts` rend un script vide quand `USE_MOCK_API` est vrai, pour que la lecture anticipée ne parte pas avant le worker.

Environnements : `pnpm dev` lit `.env.development` (faux script, `VITE_MOCK_API=1`) ; `pnpm dev:real` (`--mode real`) lit `.env.real.local`, non versionné, avec l'URL réelle, et affiche le bandeau « Données réelles » (`DevDataBanner`, développement seulement) ; Vitest, Storybook et `pnpm build:e2e` (`--mode test`) lisent `.env.test` (URL factice) ; `pnpm build` en CI reçoit `VITE_APPS_SCRIPT_URL` de la variable de dépôt (artefact de validation, puis déploiement après P8) et ne contient ni msw ni `mockServiceWorker.js`.

---

## 4. Décisions produit à valider

### 4.1 Décisions (valeur par défaut appliquée sauf avis contraire)

Les textes marqués « *texte proposé* » n'existent pas dans l'appli actuelle : ils sont à relire, et chacun figure avec son id react-intl à l'annexe F. Une décision modifiée après coup se reporte ici, avec la phase concernée ; une décision qui change un comportement observable a sa ligne au § 4.2.

| # | Source | Question | Recommandation par défaut (appliquée) | Phase |
| --- | --- | --- | --- | --- |
| D-01 | c-1 | Easter egg (5 clics sur le logo → vidéo YouTube) | **Conservé**, reproduit à l'identique : 5 clics en 2 s sur le logo ouvrent la vidéo dans un nouvel onglet (`noopener`). Gestionnaire de clic sur le logo, horodatages des clics dans une ref (ni effet, ni état rendu). | P4 |
| D-02 | c-2, `08` PA 1, AppResaAristide | Mot d'état avec la couleur, explication quand « Réserver » est absent | Mot visible à côté de la jauge pour les états orange et rouge : `Bientôt complet`, `Complet` ; plat épuisé dans la liste de la fiche : `Épuisé` (mot déjà utilisé dans le formulaire). Phrase sous la fiche quand « Réserver » manque : R1 complet `Complet.` (AppResaAristide) ; R2 tous les plats épuisés *texte proposé* `Tous les plats sont épuisés.` Jour passé : pas de phrase (fiche pâlie, « passé » dans l'`aria-label`). | P4 |
| D-03 | c-3 | Textes incohérents | `(hors plats sans prix indiqué)` partout (total en direct, récapitulatif, résumé du lendemain) ; plus de texte initial `Total : 0,00 €` (le total exact est rendu d'emblée) ; pastille R1 inchangée (`{rem} / {capacity} couverts`) ; dates **avec « 1er »** à l'écran comme dans les e-mails (`jeudi 1er octobre 2026`, ordinal ICU, arbitrage 11) ; pluriels par ICU ; messages du script inchangés. | P2, P4, P6 |
| D-04 | c-4 | Contact à la modification d'une réservation | **Non retenue** : comportement actuel conservé (champ « Téléphone ou email » obligatoire, sans contrôle de format, `01` § 2.3). | P5 |
| D-05 | c-5, a-25 | Bandeau « Configuration manquante » | Vouvoiement, affiché à tous quand l'URL du script manque ou est invalide : *texte proposé* `⚠ Configuration manquante : l'adresse du service de réservation n'est pas renseignée ou n'est pas valide. Prévenez l'établissement.` Détail technique (variable `VITE_APPS_SCRIPT_URL`) dans la console et le README. | P4 |
| D-06 | c-6 | Libellé de charte « Revenir en mode client » | Aucun bouton ajouté ; signaler à l'auteur de la charte que le retour se fait par le segment « Client ». | — |
| D-07 | c-7, AppResaAristide | Panneaux « Demain » et « Résumé pour demain » en doublon | **Fusionnés** en un seul panneau `Demain ({date})` (titre existant de `06` § 2.1), à la place du panneau « Demain » actuel, en tête du mode collègue : la ligne de totaux de `06` § 2.1, puis les blocs par restaurant de `07` § 5 avec leurs boutons d'impression ; réservations de plats supprimés exclues partout (chiffres cohérents, b-3). | P5, P6 |
| D-08 | c-8 | Tri des listes | **Non retenue**, comportement actuel : aucun tri à l'écran (listes des fiches dans l'ordre de la feuille, `05` § 4.6, `06` § 7.1) ; liste imprimée R1 dans l'ordre d'enregistrement ; liste imprimée R2 par classe puis nom (`07` § 4.1) ; listes du lendemain non triées. | P5, P6 |
| D-09 | c-9, b-12 | « Modifier ce jour » pour R2 | **Non retenue** : comportement actuel conservé (pas de « Modifier ce jour » pour R2 ; `editJour` n'accepte que `r1`). | P5 |
| D-10 | c-10 | Report des saisies d'un restaurant à l'autre | **Non** : chaque formulaire part vide (effet involontaire de l'ancien code). | P4 |
| D-11 | c-11, a-12 | Formulaire public et récapitulatif ; URL ; reprise du mode collègue | Un **récapitulatif par restaurant** (état local de chaque colonne). Un seul formulaire public ouvert à la fois (`reserver=r1\|r2`), mais choisir un jour dans une colonne ne ferme jamais le formulaire ni le récapitulatif de l'autre. URL à deux dates (`r1`, `r2`), schéma de `09` § 1. `/collegue` rechargé → connexion, puis retour à l'URL demandée. *Variante possible* : deux formulaires ouverts en même temps (`r1reserver`, `r2reserver`). | P4, P5 |
| D-12 | c-12, b-2 | Session collègue ; fuseau de référence | Mémoire seulement (perdue au rechargement, invariant 1). « Aujourd'hui », jour passé et cut-off calculés à l'**heure de Paris**, quel que soit le fuseau de l'appareil. | P2, P5 |
| D-13 | c-13 | Ajouts collègue sur les jours passés ; pastille R2 agrégée | Conservés tels quels (ajout a posteriori utile ; pastille = somme des stocks). | — |
| D-14 | a-3 | Message d'une écriture qui échoue pour une raison technique | Public hors ligne : `Vous semblez hors ligne. Vérifiez votre connexion internet, puis réessayez.` (repris de `03` § 3.1). Public, service muet ou réponse illisible : *texte proposé* `Le service de réservation ne répond pas. Réessayez dans un instant : une même réservation n'est jamais enregistrée deux fois.` Collègue (ajout d'une personne compris) : *texte proposé* `Le service ne répond pas. Réessayez dans un instant.` Connexion : `Erreur de connexion. Réessayez.` (inchangé). | P4, P5 |
| D-15 | a-2 | Écriture qui ne répond pas | Aucune interruption (le script écrirait quand même). Au bout de 20 s, sous le bouton occupé, en `role="status"` : *texte proposé* `Le service met du temps à répondre. Gardez cette page ouverte : la confirmation s'affichera ici.` Même message pour les écritures collègue. | P4, P5 |
| D-16 | a-10 | Doublon (`_duplicate`) | Toast neutre inchangé **et** récapitulatif reconstruit depuis la saisie, titre *texte proposé* `Réservation déjà enregistrée`, avertissement `Cette réservation était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.` (R2 : quantités demandées, puisque les quantités accordées ne sont pas renvoyées). | P4 |
| D-17 | AppResaAristide | Boutons −/+ sur les compteurs R1 et les quantités R2 | **Oui** (cibles de 44 px, mobile) via `NumberField` ; saisie au clavier conservée ; libellés *proposés* `Retirer une portion : {name}` / `Ajouter une portion : {name}`, `Diminuer : Élèves` / `Augmenter : Élèves` (idem Personnels, Extérieurs). | P3, P4 |
| D-18 | a-5, AppResaAristide | Contrôle des maximums avant envoi (public) | **Oui.** R1 : total ≤ places restantes, message sous la rangée `{n couvert(s)} au maximum (places restantes ce jour-là).` (texte de l'ajout collègue, `06` § 8.2). R2 : quantité ≤ restant, bornée par le champ, message `{n portion(s)} au maximum (stock restant).` (`06` § 8.3). Le script reste l'arbitre ; son refus s'affiche sous la rangée et l'état est relu. | P4 |
| D-19 | a-15, a-16, a-17, b-4 | Contrôles côté collègue | Date passée refusée dans « Ouvrir un jour » (*texte proposé* `Choisissez la date d'aujourd'hui ou une date ultérieure.`) ; jour R1 déjà ouvert : envoi bloqué, *texte proposé* `Ce jour est déjà ouvert : utilisez « Modifier ce jour ».` (conséquence : « ouvert par » n'est plus modifiable en rouvrant le jour, E-36) ; jour R2 déjà ouvert : avertissement *proposé* `Ce jour est déjà ouvert : seuls les plats de nom nouveau seront ajoutés.` ; capacité ≥ couverts réservés (message du script `Impossible : {n} couvert(s) déjà réservé(s) pour ce jour, la capacité ne peut pas être inférieure.`) ; stock ≥ portions réservées (*proposé*, pluriel ICU `Impossible : {n, plural, one {# portion déjà réservée} other {# portions déjà réservées}} pour ce plat, le stock ne peut pas être inférieur.`) ; ligne de plat incomplète signalée (*proposé* `Indiquez le nom et le stock de ce plat, ou retirez la ligne.`) ; un jour au ticket, l'ajout **et la modification** d'une réservation R2 n'offrent que « Sur place » (invariant 5) ; modification R2 bornée au stock restant + quantité actuelle ; maximum de modification R1 = places restantes + quantité actuelle (comme le script). | P5 |
| D-20 | a-18 | Paramètres | Les deux noms de restaurant restent obligatoires (non vides : le script remplacerait `""` par `Restaurant 1` / `Restaurant 2`, b-9 ; *texte proposé* `Indiquez le nom du restaurant.`) ; descriptions et contact d'annulation peuvent être vidés (`""` envoyé : le script remet sa valeur par défaut) ; tarifs vérifiés (nombre ≥ 0, *texte proposé* `Indiquez un tarif positif ou nul (ex. 4,95).`) ; échec partiel détaillé : *texte proposé* `Enregistré : {saved}. Non enregistré : {failed} ({message}).`, où `{saved}` et `{failed}` sont les libellés des champs joints par « , ». | P5 Tarifs en champs numériques (pas 0,01, min 0), tarif vide refusé ; échec partiel : `SettingsPartialFailureError` porte le dernier état reçu (garde de session), le toast nomme le champ refusé et ceux qui n'ont pas été envoyés après lui (P5 (e)). |
| D-21 | b-3 | Suppression d'un jour ou d'un plat qui a des réservations | Le bouton armé affiche une note visible et un `aria-label` détaillés, en pluriel ICU : *proposés* `Confirmer la suppression du jour et de ses {n, plural, one {# réservation} other {# réservations}} (les personnes ne seront pas prévenues)` / `Confirmer la suppression de ce plat ({n, plural, one {# réservation ne sera plus affichée} other {# réservations ne seront plus affichées}}, les personnes ne seront pas prévenues)` ; sans réservation, le texte actuel de `06` § 5.2. Réservations orphelines exclues des totaux et des listes. | P5 |
| D-22 | b-8 | Prix 0 | Refusé côté client : *texte proposé* `Indiquez un prix supérieur à 0, ou laissez le champ vide.` | P5 |
| D-23 | react-architecture § 9 | Polices | **Auto-hébergées** (`@fontsource-variable/outfit` et `work-sans`, sous-ensemble latin, `font-display: swap`) : deux connexions tierces et l'envoi de l'adresse IP à Google en moins. Rendu identique. | P0, P4 |
| D-24 | a-25 | Titre de la page | `<h1>` dérivé des paramètres : `Réservations des restaurants pédagogiques et {name2}` (identique tant que `name2` vaut « Aristide ») ; `<title>` du document inchangé (prérendu). | P4 |
| D-25 | b-6 | Essais de mot de passe | **Non retenue** : comportement actuel conservé (aucun délai après des mots de passe faux). | — |
| D-26 | element-admin § 11.5 | Déconnexion propagée aux autres onglets (`BroadcastChannel`) | **Non** (parité : chaque onglet a sa propre session en mémoire). | — |
| D-27 | AppResaAristide | Lien « Prochaine ouverture » sur un jour sans service | **Non** (nouvelle fonction, hors périmètre ; facile à ajouter après la bascule). | — |

### 4.2 Écarts de parité assumés

Liste fermée : un comportement de l'ancien site ne change que s'il figure ici. Chaque écart a un identifiant stable `E-xx` (jamais renuméroté ; un écart abandonné est barré, pas supprimé) et un scénario de régression étiqueté `@changed:E-xx` (identifiants `REG-xx` de [`parite.md`](parite.md)), ou « n/a » s'il n'est pas observable par la suite. Un test de P1 compare les étiquettes `@changed:E-xx` de `e2e/regression/` à ce tableau : un écart sans scénario, ou une étiquette sans ligne, fait échouer la suite.

| Id | Sujet | Avant (spec) | Après | Raison | Scénario |
| --- | --- | --- | --- | --- | --- |
| E-01 | Heure de référence | heure locale de l'appareil (`01` § 3.7) | heure de Paris | D-12, b-2 | REG-26 |
| E-02 | Toasts | plusieurs toasts qui se chevauchent, erreurs annoncées en `polite` | un seul toast (le nouveau remplace l'ancien), erreurs en annonce prioritaire | a-8 | REG-27 |
| E-03 | Touche Entrée dans les formulaires | sans effet (pas de `<form>`, `04` § 10) | soumet le formulaire (`<form noValidate>`) | accessibilité, comportement natif | REG-15 |
| E-04 | Voile de chargement plein écran (G-06) | connexion et suppressions ; le focus tombe sur `body` sous le voile (mesuré par P1 (c) après la connexion et après une suppression) | bouton occupé (`aria-busy`, « … en cours »), page non bloquée, focus conservé ; G-06 disparaît | simplicité, pas de perte de focus | REG-27, REG-35 |
| E-05 | Calendrier et sélecteur de date C-05 | `role="group"` + boutons `aria-pressed` (aussi dans le sélecteur de `06` § 3.2) | `role="grid"`, `gridcell` `aria-selected`, boutons | lecteurs d'écran en mode navigation | REG-09, REG-33 |
| E-06 | Libellé de semaine à cheval | « 28 – 4 oct. 2026 » | « 28 sept. – 4 oct. 2026 » | a-23 | REG-09 |
| E-07 | Page ↑ / ↓ en fin de mois | débordement (`setMonth`) | borné au dernier jour du mois | a-23 | REG-11 |
| E-08 | Actualisation | suspendue pendant une saisie ou un formulaire ouvert | continue (saisies, focus et `requestId` conservés) | a-4 | REG-08, REG-29 |
| E-09 | Formulaire R2 à 10 h | fermé sans message | fermé avec le toast neutre de clôture | a-7 | REG-25 |
| E-10 | Écriture lente ou en échec technique | message anglais brut, attente sans fin | messages français (D-14) ; signal de lenteur à 20 s, public et collègue (D-15) | a-2, a-3 | REG-19, REG-20 |
| E-11 | `confirmed` vide (R2) | formulaire fermé, saisies perdues | formulaire conservé, toast d'erreur, état relu | a-6 | REG-24 |
| E-12 | Après succès | focus sur `body` | focus sur le titre du récapitulatif | a-9 (1re partie) | REG-17 |
| E-13 | Pendant l'envoi | « Annuler » actif | « Annuler » désactivé | a-20 | REG-17 |
| E-14 | Avertissements du récapitulatif R2 | ajustement masque l'échec d'e-mail | les deux cumulés | a-20 | REG-23 |
| E-15 | Impression | nouvelle fenêtre restée ouverte, toast si bloquée (I-00) | même document, rien à fermer, pied d'écran supprimé ; I-00 disparaît | a-24, `07` § 9 | REG-40 |
| E-16 | Tickets dans les impressions | un ticket par portion | un ticket par commande | a-11, invariant 5 | REG-41, REG-42 |
| E-17 | Copie locale | écrite aussi depuis l'état complet (sans etag) | écrite seulement depuis l'état public avec etag | a-22 | REG-29 |
| E-18 | `reservations-textes` | lue et écrite | lue en secours, jamais écrite | `03` § 1.2 | REG-32 |
| E-19 | Saisie des compteurs | `parseInt` (2,7 → 2, texte → 0) ; `type="number"`, `min`, `max`, `placeholder="0"`, `inputmode="numeric"` (`04` § 5.2-5.3) | entiers seulement (`NumberField`, valeur bornée) ; relevé de P3 (b) : champ `type="text"` (rôle `textbox`, `aria-roledescription="champ numérique"`) au lieu de `type="number"` (rôle `spinbutton`) ; `min` et `max` portés par un `<input type="number">` caché ; `placeholder="0"` et `inputmode="numeric"` identiques ; `autocomplete`, `autocorrect`, `spellcheck` à `off` ; « 2,7 » → 2 ; lettres refusées (champ vide, compté 0) ; valeur au-delà du maximum ramenée au maximum en quittant le champ ; Maj+↑/↓ = ±10 ; molette sans effet ; nom de la quantité R2 par un `<label>` masqué (même nom accessible) | `NumberField`, D-17 | REG-15 |
| E-20 | Montants | `formatEuro` maison : U+00A0 avant €, sans séparateur de milliers | `FormattedNumber` au format `euro` : identique jusqu'à 999,99 € (U+00A0 mesuré sous Node 22 et dans Chromium 141) ; U+202F comme séparateur de milliers au-delà | arbitrage 11 | REG-40 |
| E-21 | Dates longues à l'écran | `jeudi 1 octobre 2026` (sans « 1er ») | `jeudi 1er octobre 2026` (comme les e-mails du script) | arbitrage 11, c-3, D-03 | REG-12, REG-14 |
| E-22 | Textes | chaînes dans le JavaScript | messages ICU react-intl (mêmes textes), extraits dans `translations/fr.json` | arbitrage 11 | n/a |
| E-23 | État de l'interface | perdu au rechargement | dans l'URL (jours, vues, formulaire ouvert, panneaux collègue) ; panneau de connexion par `?connexion=true` (et non `?connexion=1`, proposé par `09` § 1 : un nombre tombe dans le fallback) | `09` § 1, R-19 | REG-10, REG-27, REG-28 |
| E-24 | Panneaux collègue après déconnexion | réapparaissent à la connexion suivante | fermés | a-13, a-14 | REG-29 |
| E-25 | Ressources | `?v=21` | noms hachés par Vite | — | n/a |
| E-26 | `Code.gs` publié | servi par Pages (mode branche) | plus publié (seul l'artefact est servi) | — | n/a |
| E-27 | Mot d'état et explication | couleur et chiffres seuls, aucune phrase quand « Réserver » manque | `Bientôt complet` / `Complet` à côté de la jauge, `Épuisé` dans la liste des plats ; phrase `Complet.` (R1) ou `Tous les plats sont épuisés.` (R2) | D-02, c-2 | REG-14, REG-21 |
| E-28 | Textes de montants | `(hors plats sans prix)` dans le récapitulatif ; texte initial `Total : 0,00 €` | `(hors plats sans prix indiqué)` partout ; total exact rendu d'emblée | D-03, c-3 | REG-23, REG-15 |
| E-29 | Bandeau de configuration | tutoiement ; détecté seulement pour `COLLE_ICI` | vouvoiement (D-05) ; affiché si l'URL est absente ou invalide | D-05, a-25 | REG-07 (`@legacy-only`) ; côté `react` : story et test Vitest (F-07) |
| E-30 | Panneaux du lendemain | deux panneaux (« Demain » et « Résumé pour demain »), orphelines comptées dans « Demain » | un seul panneau `Demain ({date})`, orphelines exclues, textes corrigés, un ticket par commande | D-07, b-3, a-11 | REG-39 |
| E-31 | Report des saisies entre restaurants | nom, contact, classe et observation recopiés d'un formulaire à l'autre | chaque formulaire part vide | D-10, c-10 | REG-13 |
| E-32 | Sélection dans une colonne | ferme le formulaire et le récapitulatif de l'autre restaurant | ne touche que sa colonne ; un récapitulatif par colonne | D-11, a-12 | REG-13 |
| E-33 | Doublon (`_duplicate`) | toast seul | toast et récapitulatif « Réservation déjà enregistrée » | D-16, a-10 | REG-19 |
| E-34 | Boutons −/+ | absents | présents sur les compteurs R1 et les quantités R2 | D-17 | REG-15, REG-22 |
| E-35 | Maximum avant envoi (public) | envoyé, refus du script en toast | bloqué côté client, message sous la rangée ; refus du script sous la rangée et état relu | D-18, a-5 | REG-16 |
| E-36 | Contrôles collègue | date passée, jour R1 déjà ouvert, ligne de plat incomplète, stock sous le réservé acceptés ; « À emporter » proposé à l'ajout et à la modification R2 un jour au ticket ; « ouvert par » modifiable en rouvrant un jour R1 | refusés ou signalés ; « Sur place » seule option un jour au ticket (ajout et modification) ; « ouvert par » non modifiable (réouverture bloquée) | D-19, a-15 à a-17, b-4, invariant 5 | REG-33, REG-34, REG-37, REG-38 |
| E-37 | Paramètres | champ vidé ignoré ; échec partiel muet | noms obligatoires ; descriptions et contact vidés envoyés `""` ; tarifs vérifiés ; échec partiel détaillé | D-20, a-18, b-9 | REG-32 |
| E-38 | Suppression d'un jour ou d'un plat qui a des réservations | `aria-label` générique | note visible et `aria-label` détaillés | D-21, b-3 | REG-35, REG-37 |
| E-39 | Prix 0 | accepté (enregistré « sans prix ») | refusé avec un message | D-22, b-8 | REG-34 |
| E-40 | `<h1>` | « … et Aristide » en dur | dérivé de `name2` | D-24, a-25 | REG-32 |
| E-41 | « Choisissez au moins un plat. » | message non relié, focus inchangé | relié au `fieldset` des plats (`aria-describedby`), focus sur la 1re quantité | a-9 (2e partie) | REG-22 |
| E-42 | Réannonce de l'encadré d'échec | toutes les 3 min avant le premier succès | seulement si le texte change | a-21 | REG-06 |
| E-43 | `aria-label` d'un jour R2 clos à 10 h | inchangé | suffixe `…, commandes closes` | a-23 | REG-12 |
| E-44 | Textes du résumé du lendemain | « portion(s) », « {Nom}: », « Aucun jour ouvert pour demain. » aussi hors résumé | accords ICU, `{name} :`, texte propre hors résumé (annexe F) | a-24 | REG-39, REG-42 |
| E-45 | Délai des lectures | aucun (`02` § 1.5) | chaque essai de lecture borné à 30 s, puis échec traité comme les autres (encadré, nouvel essai) | a-2 | REG-03 |
| E-46 | Message d'erreur d'un champ | retiré à la première frappe, même si la valeur reste invalide (`04` § 5.4) | après un envoi refusé, revalidé à chaque frappe : reste affiché (ou change) jusqu'à ce que la valeur soit valide | architecture (`revalidateLogic`), F-20 | REG-15 |
| E-47 | Squelette avec la copie locale | remplacé dès l'exécution des scripts | squelette de la coquille prérendue affiché jusqu'à la fin de l'hydratation (≤ 600 ms ; environ 130 ms avec la barrière `useHydrated()`) avant le contenu de la copie | arbitrage 16 | REG-02 |
| E-48 | Focus après la fermeture d'un formulaire collègue | focus sur la date de la fiche (`03` § 5.4) ; mesuré par P1 (c) : sur `body` après « Annuler » d'une modification et après une suppression | focus rendu au bouton qui a ouvert le formulaire (« Modifier », « + Ajouter une personne », « Modifier ce plat »…), comme « Annuler » du formulaire public (`04` § 5.1) ; après une suppression, date de la fiche | architecture, F-06 | REG-35 |
| E-49 | Lecture anticipée et CSS | script du `<head>` exécuté avant la CSS | exécuté après la CSS et les `modulepreload` (React 19 et le routeur remontent la CSS, R-12) | Start | n/a |
| E-50 | Mode de service (public R2) et mode d'une réservation R2 (collègue) | boutons `aria-pressed` dans un `role="group"` (public) ; `<select>` (collègue) | vrai groupe radio (`RadioGroup` de Base UI, `SegmentedRadio`), une seule option un jour au ticket | accessibilité, § 3.5 ; relevé par P3 (b) | REG-22 |
| E-51 | Bouton de suppression armé pendant une actualisation | recréé désarmé par le rendu complet | reste armé jusqu'à la fin de ses 4 s (React garde le composant) | architecture ; relevé par P3 (a) | n/a |
| E-52 | Copie locale sans `config` | gardée (les tarifs et noms prennent leurs valeurs par défaut) | ignorée par le schéma `LocalCacheV1` | aucune copie écrite par `saveCache` n'est dans ce cas ; relevé par P2 (b2) | n/a |
| E-53 | Sélecteur de date C-05 | inséré dans le panneau « Ouvrir un jour », pousse le formulaire vers le bas | s'ouvre en popover (Base UI `Popover`) au-dessus du formulaire ; Échap, clic extérieur et retour du focus gérés | § 3.5 ; relevé par P3 (c) | n/a |
| E-54 | Changement de jour à minuit | les calendriers gardent le jour sélectionné au chargement jusqu'au prochain rendu (une actualisation `{ unchanged }` ne rend rien) ; la fiche d'hier garde « Réserver » jusqu'au premier clic | les calendriers sans `r1` / `r2` dans l'URL passent au nouveau jour à minuit pile, sans rechargement ; un formulaire ouvert garde sa date | PLAN § 3.4 ; relevé par P1 (d) | REG-25 |
| E-55 | Écriture collègue qui répond après la déconnexion | toast de succès affiché quand même (« Jour modifié. »…) | réponse jetée par la garde de session (§ 3.3.3, F-02) : ni toast, ni écriture dans le cache | invariant 1 ; relevé par P1 (c) ; P5 (a) l'étiquette dans la variante `react` de REG-29 et remplace « n/a » par REG-29 | REG-29 |
| E-56 | Fiche d'un jour passé (`05` § 4.2) | opacité 0,55 sur toute la fiche (contraste du texte 2,3 à 3,6:1) | pâleur sans opacité : fond `--surface-alt`, textes en `--text-muted` (5,2 à 6,1:1), jauges en niveaux de gris ; « passé » reste dans l'`aria-label` de la case | charte (`08` § 8) et S5 sans exception ; relevé par P4 (b) ; vérifié par axe dans les stories P-08 et P-17 | n/a |
| E-57 | Panneaux « Ouvrir un jour » (`06` § 4) | ceux de R1 et de R2 peuvent être dépliés en même temps | un seul ouvert à la fois (paramètre d'URL `ouvrir` à une valeur) | schéma d'URL du § 3.2, comme « un seul formulaire public à la fois » (D-11) ; relevé par P5 (b) | n/a |

### 4.3 Traitement des points a-*

| Point | Traitement | Phase |
| --- | --- | --- |
| a-1 | purge synchrone à la déconnexion (§ 3.3.4), garde de session des écritures collègue et `gcTime: 0` (§ 3.3.3), test S8 | P5 |
| a-2, a-3 | D-15, D-14 ; lectures bornées à 30 s (E-45) | P2, P4, P5 |
| a-4 | actualisation continue ; relecture après une erreur de places | P4 |
| a-5 | D-18 ; erreur du script sous la rangée (`setErrorMap`) | P4 |
| a-6 | formulaire conservé, état relu | P4 |
| a-7 | toast de clôture à 10 h (§ 3.4) | P4 |
| a-8 | un toast à la fois, `priority: 'high'` pour les erreurs | P3 |
| a-9 | focus sur le récapitulatif ; erreur « Choisissez au moins un plat. » reliée au `fieldset` des plats (`aria-describedby`) et focus sur la première quantité | P4 |
| a-10 | D-16 | P4 |
| a-11 | `orderAmounts` dans les impressions et le panneau « Demain » (E-16, E-30) | P6 |
| a-12 | `selectDay` ne touche qu'un restaurant ; récapitulatif par colonne (D-11) | P4 |
| a-13, a-14 | état collègue dans l'URL de `/collegue`, quitté à la déconnexion | P5 |
| a-15, a-16, a-17 | D-19 (E-36), dont « Sur place » seule option à l'ajout et à la modification R2 un jour au ticket | P5 |
| a-18 | D-20 | P5 |
| a-19 | `ConfirmButton` annule son minuteur à chaque armement (minuteur local en `ref`, sans effet) | P3 |
| a-20 | « Annuler » désactivé pendant l'envoi ; avertissements cumulés | P4 |
| a-21 | code mort non repris ; réannonce seulement si le texte change | P4 |
| a-22 | copie écrite seulement avec etag (E-17) ; la lecture doublée est armée au temps restant depuis la lecture anticipée ; la perte de la lecture anticipée quand l'etag du `<head>` diffère de celui de la copie relue reste une limite connue | P2, P4 |
| a-23 | libellés et Page ↑ / ↓ corrigés (E-06, E-07) ; clôture de 10 h dans l'`aria-label` de la case du jour (*proposé* `…, commandes closes`, E-43) ; jours hors mois cliquables sans changer de mois et jour R2 sans plat = aucun service : conservés | P2, P3, P4 |
| a-24 | textes et accords du résumé corrigés (E-44, annexe F), impression dans le même document (E-15) | P6 |
| a-25 | D-24, D-05 | P4 |
| a-26 | nettoyage CSS et jetons (§ 3.6) | P3, P4 |

---

## 5. Phases de réalisation

### 5.0 Vue d'ensemble

```
P0 squelette ─> P1 régression sur l'ancien site ─┬─> P2 domaine, API, données ─┬─> P4 parcours public ─> P5 mode collègue ─> P6 impression ─> P7 parité finale, validation ─> P8 bascule
                                                 └─> P3 ui/ + Storybook ────────┘                          (P6 (a) démarre avec la vague 2 de P5, sur fixtures)
                 (P2 et P3 démarrent dès que P1 (a1) a livré le faux script, les fixtures et TEST_NOW ; la suite de régression sert ensuite de critère de sortie de P4 à P7)
```

| Phase | Contenu | j-p | Sessions | Parallélisable | Statut |
| --- | --- | --- | --- | --- | --- |
| P0 | squelette, outillage (dont react-intl et l'extraction en CI), fichiers actuels déplacés dans `legacy/`, coquille, vérification d'hydratation sur le vrai projet, CI sans déploiement | 3 | 3 | non ((a) → (b) → (c)) | terminé le 3 oct. : (a) `c336b2e`, (b) `8c18127`, (c) `42c89f2` ; CI à confirmer sur GitHub |
| P1 | suite Playwright de régression contre l'ancien site (isolation réseau, faux script, fixtures, page objects, 43 scénarios) | 5 | 5 | (b), (c), (d) en parallèle après (a1) et (a2) | terminé le 3 oct. : (a1) `d56570a`, (a2) `00564a4`, (b) `2f8304a`, (c) `51e414a`, (d) `48d61c7` ; suite `legacy` complète verte |
| P2 | domaine pur, client API, schémas et frontière de l'API, copie locale, session, horloge, tests dorés | 5 | 4 | avec P3 ; (b1) et (c) après le premier commit de (a) | terminé le 3 oct. : (a) `7aa65f1`, (b1) `e3acf36`, (c) `ef81bc7`, (b2) `3298501` |
| P3 | `src/ui/` (Base UI stylé, calendrier, formulaires pré-liés) et Storybook | 5 | 4 | avec P2 ; (a) et (b) après (0) | terminé le 3 oct. : (0) `554fad8`, (a) `366502a`, (b) `ad7fa45`, (c) `ff8e301` |
| P4 | parcours public complet | 5 | 4 | non ((a) → (b) → (c) → (d)) | terminé le 4 oct. : (a) `09247a6`, (b) `5fd5baf`, (c) `5fbb0d1`, (d) `b0f7a69` ; 37 scénarios `@p4` verts sur `react` |
| P5 | mode collègue | 6,5 | 6 | (b), (c), (d1), (e) après (a) ; (d2) après (d1) | terminé le 4 oct. : (a) `d102547`, (d1) `a79689d`, (c) `e6feb25`, (b) `32efb0c`, (d2) `66368aa`, (e) `409f371` ; 30 scénarios `@p5` verts sur `react` |
| P6 | impression et panneau « Demain » | 2,5 | 2 | (a) avec P5 ; (b) après P5 (e) | en cours : (a) `0eb411d` le 4 oct. |
| P7 | parité finale (suite de régression complète sur `react`), accessibilité, budget, test par les collègues sur un build local ou l'artefact CI | 2,5 (+ 1 à 2 semaines calendaires) | 2 | non | à faire |
| P8 | bascule et nettoyage | 1 | 1 | non | à faire |
| **Total** | | **35,5** (43 avec 20 % de marge) | **31** | | |

La colonne « Statut » est tenue par l'orchestrateur (à faire / en cours / terminé + date et commit), d'après les journaux des sessions. Les messages de lancement des 31 sessions, avec leurs lectures, livrables, critères, commandes et interdits, sont dans [`lancements.md`](lancements.md) ; ils précisent cette section sans la contredire.

**Règles communes à toutes les sessions** (reprises dans le bloc commun de [`lancements.md`](lancements.md)) :
1. Lire `CLAUDE.md`, ce plan (§ 0, § 1.4, § 3, § 6.2 et la phase concernée) et **les sections de la spec citées dans les critères** avant d'écrire du code. La spec fait foi pour tout texte et tout comportement, sauf décision D-xx (§ 4.1) ou écart E-xx (§ 4.2) ; ce plan fait foi pour l'architecture. Cas ambigu : l'option la plus facile à défaire, notée sous « Contradictions » dans le journal de la session, sans modifier ni la spec ni le plan.
2. Une branche courte par session, une PR vers la branche d'intégration, fusion par l'orchestrateur (politique ci-dessous). Ne jamais modifier `Code.gs`, `docs/spec/`, `docs/migration/recherche/`, `.claude/`, ni `legacy/` (sauf pour y reporter à l'identique un correctif urgent fait sur `main`, seul servi par Pages jusqu'à la bascule, par une PR dédiée).
3. `pnpm check:fast` avant chaque commit ; `pnpm check`, `pnpm build:e2e` et les E2E du périmètre avant la PR ; `git diff --exit-code src/routeTree.gen.ts translations/fr.json` après build. Tests écrits **avec** le code (tables de cas de la spec) ; pas de `useEffect` sans justification écrite (budget S6) ; aucun `useState` pour des valeurs de formulaire ; composants de route de moins de 40 lignes ; aucune fonction de plus de 80 lignes (`max-lines-per-function` d'oxlint).
4. Journal de session `docs/migration/journal/<id>.md` (fait, reste à faire, décisions, contradictions plan/spec, versions changées, overrides oxlint) ; le compte rendu final donne chaque critère avec sa preuve. Seuls l'orchestrateur et les sessions autorisées par leur message de lancement modifient `PLAN.md`.
5. Ne pas lancer `vite preview` (il fait du SSR) : `pnpm build` puis `pnpm serve`.
6. Code en anglais (identifiants, fichiers, dossiers, ids react-intl, commentaires), textes affichés, documentation et commits en français, vocabulaire de l'annexe E ; champs du script seulement à la frontière (§ 3.1, § 3.3.6). Les search params et le chemin `/collegue` restent en français (visibles dans l'URL).
7. Critère de sortie mécanique : les scénarios de régression du périmètre de la phase sont verts sur le projet `react`. Les **assertions** d'un scénario ne se modifient que pour en ajouter ou pour un écart du § 4.2 (variante `@changed:E-xx`) ; les **page objects** côté `react` changent librement à partir de P4. Un comportement de l'ancien site qui diverge sans écart listé est un défaut du nouveau code.
8. Lint : corriger le code. Faux positif prouvé par un exemple minimal : override par motif de fichiers dans `.oxlintrc.json`, commenté, noté au journal. Jamais de directive `oxlint-disable` en ligne, de catégorie abaissée ni d'option `tsconfig` assouplie (seule exception prévue : `exactOptionalPropertyTypes`, § 6.1). Pas de `TODO` dans le code (`no-warning-comments`).
9. Isolation réseau : aucun test, aucune story, aucun E2E ni aucun agent n'appelle le vrai Apps Script. Faux script de `src/mocks/apps-script.ts`, isolation de `e2e/fixtures.ts`, `.env.test`, `pnpm dev` sur le faux script ; pas de `.env.real.local` dans une session d'agent. Chromium préinstallé par `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, jamais `playwright install` en session.
10. Aucun paquet ajouté hors P0 (a) et P3 (0) sans accord de l'orchestrateur ; versions exactes du § 2.
11. Rédaction : `.claude/skills/stop-slop/SKILL.md` pour les commentaires, noms, commits, PR et docs (pas pour les textes affichés, recopiés de la spec) ; commits en français, sujet « Zone : action (section de spec) », identifiants en anglais entre backticks.

**Politique de branches et de parallélisme** :
1. Une branche par session, `claude/<id>-<sujet>` (par exemple `claude/p3b-form-fields`), créée depuis la pointe de `claude/frontend-react-migration-lw5zfz` ; une seule PR par session, vers l'intégration ; jamais de push sur `main` ni sur l'intégration.
2. Fusion par l'orchestrateur (ou le responsable), jamais par l'agent, en « Rebase and merge », CI verte (`check`, `browser`, `e2e`) et compte rendu reçu.
3. Rebase avant fusion ; fichiers générés en conflit (`src/routeTree.gen.ts`, `translations/fr.json`) : version de l'intégration, puis `pnpm build:e2e` et `pnpm i18n:extract`, commit « Fichiers générés : régénération après rebase » ; `pnpm-lock.yaml` jamais résolu à la main (reprendre celui de l'intégration, relancer `pnpm install`).
4. Les sessions qui figent une interface (P1 (a1), P2 (a), P3 (0), P4 (c), P5 (a)) ouvrent tôt une PR « socle », fusionnable avant la suite, pour débloquer les sessions qui en dépendent.
5. **Au plus trois sessions simultanées**, d'une même vague (ci-dessous), quand leurs interfaces sont fusionnées.
6. Seules P0 (a) et P3 (0) modifient les dépendances de `package.json` et `pnpm-lock.yaml` ; une autre session demande le paquet dans son compte rendu, l'orchestrateur l'ajoute par une petite PR fusionnée avant.
7. `PLAN.md` n'est modifié que par l'orchestrateur, ou par une session séquentielle autorisée dans son message (P0 (b) pour la ligne Start du § 2.1, P7 (a) et P8 pour le Statut) ; les sessions parallèles écrivent dans leur journal.
8. CI : `push` sur `main` et sur l'intégration, `pull_request` pour les branches courtes ; le job `deploy` ne tourne que sur `push` vers `main`.

| Vague | Sessions (au plus trois à la fois) | Interfaces à figer avant la vague suivante |
| --- | --- | --- |
| 0 | P0 (a) → P0 (b) → P0 (c) | configuration des outils, scripts, projets Playwright |
| 1 | P1 (a1) → P1 (a2) | `TEST_NOW`, interface de `createFakeAppsScript`, isolation réseau, signatures des page objects, liste `@changed:E-xx` validée par l'orchestrateur |
| 2 | P1 (b), P1 (c), P1 (d), P2 (a), P3 (0) | premier commit de P2 (a) : `domain/types.ts`, `constants.ts`, `paris.ts`, `vouchers.ts` ; P3 (0) : icônes, décorateurs Storybook, `src/test/render.tsx` |
| 3 | P2 (b1), P2 (c), P3 (a), P3 (b) | — |
| 4 | P2 (b2), P3 (c) | — |
| 5 à 8 | P4 (a) → P4 (b) → P4 (c) → P4 (d) | P4 (a) : emplacements de `Page`, `intl/common-messages.ts` ; P4 (c) : `IdentityFields`, `BookingSummary`, signatures de `useBookR1` et `useOrderR2` |
| 9 | P5 (a) | schéma complet de `/collegue`, emplacements de `StaffPage`, fabrique `mutations/staff/write.ts` (garde de session) |
| 10 | P5 (b), P5 (c), P5 (d1), P5 (e), P6 (a) (trois à la fois) | — |
| 11 | P5 (d2), P6 (b) | — |
| 12 | P7 (a) → P7 (b) | — |
| 13 | P8 | — |

**Propriétaires des fichiers partagés** (une session non propriétaire ne les modifie pas : elle décrit le changement voulu dans son compte rendu) :

| Fichier ou dossier | Propriétaire | Ensuite |
| --- | --- | --- |
| `package.json` (dépendances), `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.oxlintrc.json`, `.oxfmtrc.json`, `knip.json`, `tsconfig.json`, `vitest.config.ts`, `.env.*` | P0 (a) | P3 (0) pour ses paquets et le projet `storybook` ; overrides justifiés par toute session, en PR séparée si possible |
| `playwright.config.ts`, `scripts/*`, `src/client.tsx` | P0 (b) | P8 |
| `.github/` | P0 (c) | P7 (a) (filtre par étiquettes), P8 |
| `src/mocks/**`, `src/test/clock.ts`, `e2e/fixtures.ts` | P1 (a1), puis P1 (a2) pour le faux script | demandes à l'orchestrateur |
| `e2e/pages/*.ts` | P1 (a1) signatures ; corps : P1 (b) publics, P1 (c) collègue, P1 (d) impression | variantes `react` : la phase qui livre l'écran |
| `docs/migration/parite.md` | P1 (a1) structure ; chaque session de P1 sa section | colonne `react` : la phase qui livre l'écran |
| `src/domain/types.ts` | P2 (a), premier commit | ajouts demandés à l'orchestrateur |
| `src/domain/print.ts` | P2 (a) | P6 (a) puis P6 (b) |
| `src/intl/intl.ts`, `formats.ts`, `types.d.ts` | P0 (a) | — |
| `src/intl/common-messages.ts` | P4 (a) (remplissage complet depuis `04` § 9 et `06`) | ajouts demandés à l'orchestrateur |
| `ui/icons.tsx`, `ui/feedback/toast.ts`, `.storybook/`, `src/test/render.tsx` | P3 (0) (`toast.ts` : P3 (a)) | — |
| `features/page/Page.tsx`, `PublicPage.tsx` | P4 (a) | P4 (b) remplit les emplacements |
| `features/booking/*`, `mutations/bookings.ts` | P4 (c) | P4 (d) pour le corps de `useOrderR2` |
| `routes/collegue.tsx`, `features/page/StaffPage.tsx`, `features/page/ModeSwitch.tsx`, `mutations/login.ts`, `mutations/staff/write.ts` | P5 (a) | chaque session de P5 remplit son emplacement |
| `mutations/staff/{days,dishes,bookings,settings}.ts` | P5 (b), (c), (d1), (e) respectivement | P5 (d2) ne touche pas `bookings.ts` |
| `features/staff/TomorrowPanel.tsx` | P5 (e) | P6 (b) |
| `PLAN.md` | orchestrateur | sessions autorisées (règle 7 ci-dessus) |

**Ce que l'orchestrateur vérifie à chaque fusion** : compte rendu reçu, chaque critère avec sa preuve ; CI verte ; aucun fichier « Ne touche pas » modifié (`git diff --stat`) ; fichiers générés à jour ; aucun `oxlint-disable` ajouté (`git diff | grep oxlint-disable`) ; journal présent ; Statut et décisions reportés dans ce plan ; contradictions tranchées avant la vague suivante ; PR « socle » relue avant de lancer les sessions qui en dépendent.

### P0 — Squelette et outillage

- **Objectif** : un dépôt prêt à recevoir le code : outillage complet, CI verte sur la branche d'intégration (sans déploiement), coquille React servie par l'émulateur, hydratation vérifiée sur le vrai projet selon l'arbitrage 16. Pages n'est pas touché : il continue de servir `main` en mode « branche » jusqu'à la bascule (P8).
- **Point de départ** : le projet d'essai combiné [`recherche/spike-integration/`](recherche/spike-integration/README.md) (configurations qui passent ensemble, `pnpm check` vert), complété par `recherche/toolchain-files/` pour ce que le spike n'a pas (`.github/`, `lefthook.yml` déjà repris, `.vscode/`). On copie ces fichiers puis on applique **exactement** les adaptations ci-dessous, sans autre changement de règle : alias `@/*` et `@translations/*` ; `tsconfig.json` `include` du § 3.1 ; dépendances et environnement de test DOM simulé de `toolchain-files/` retirés (§ 6.1), script `preview` supprimé, versions exactes du § 2 ; workflow sur la branche d'intégration et les PR, actions épinglées par SHA ; exclusions identiques dans `.oxfmtrc.json` (`ignorePatterns`), `.oxlintrc.json` (`ignorePatterns`) et `knip.json` : `legacy/**`, `docs/**`, `.claude/**`, `translations/**` (oxfmt et oxlint ; l'extraction le reformate elle-même), `Code.gs`, `public/mockServiceWorker.js`, `src/routeTree.gen.ts`, `dist/**`, `coverage/**`, `storybook-static/**`, `playwright-report/**`, `test-results/**` ; les fichiers propres au spike (`router-only/`, `vite.router.config.ts`, `tools/`, stories et tests d'essai) ne sont pas repris.
- **Livrables** :
  - (a) `git mv index.html app.css design-system.css js legacy/` en premier commit seul (historique conservé ; `logo.png`, `charte-graphique.pdf`, `Code.gs` restent à la racine) ; configurations adaptées ci-dessus ; `.node-version` (22.22.2), `engines.node: ">=22.18"` sans `engine-strict` ; `.gitignore` (§ 3.1) ; `.npmrc` (`save-exact=true`) ; `pnpm-workspace.yaml` (§ 2 ; tout refus de pnpm : le paquet en `false` dans `allowBuilds` s'il fonctionne sans, sinon `true` justifié) ; `knip.json` (§ 3.1) ; scripts de `package.json` (§ 3.1) ; dépendances des phases P0 à P2 (Base UI, TanStack Form et Storybook en P3 (0)), liste `ignoreDependencies` commentée par phase ; overrides oxlint posés d'avance (`e2e/**` : `react/rules-of-hooks` à cause du `use` des fixtures, `import/no-nodejs-modules`, `max-lines-per-function` ; `**/*.stories.tsx` et `.storybook/**` : `import/no-default-export`, `react/only-export-components`, `formatjs/no-literal-string-in-jsx` ; tests : `formatjs/no-literal-string-in-jsx`, `typescript/no-unsafe-type-assertion`, `oxc/no-map-spread`, `typescript/strict-void-return` ; `scripts/**` : `no-console` ; `src/mocks/node.ts` : `import/no-nodejs-modules`) et réglages des 8 règles en conflit avec les extraits du plan (§ 6.2, R-14) ; **react-intl** (§ 3.10) : `src/intl/{intl,formats,common-messages,types.d}.ts`, `@formatjs/unplugin` dans `vite.config.ts`, `vitest.config.ts` et `.storybook/vite.config.ts`, script `i18n:extract`, `translations/fr.json` initial, règles `formatjs/*` et `jsPlugins: [..., "eslint-plugin-formatjs"]` ; `vitest.config.ts` (projets `node`, `node-ny`, `browser` ; `storybook` en P3 (0)) avec `executablePath` lu dans `PLAYWRIGHT_CHROMIUM_EXECUTABLE` ; `src/config.ts`, `src/vite-env.d.ts`, `.env.development`, `.env.test`, `.env.example`, `src/test/setup-browser.ts`.
  - (b) `src/router.tsx`, `src/client.tsx` (§ 3.11), `src/routes/__root.tsx` (shell, `head()`, `<ScriptOnce>` provisoire), `src/routes/index.tsx` (squelette), `src/routes/$.tsx`, `src/routes/index[.]html.tsx`, `src/routeTree.gen.ts` commité, `src/styles/{tokens,base,print}.css` (découpage de `legacy/design-system.css`, valeurs inchangées), polices auto-hébergées (D-23) ; `scripts/post-build.ts`, `scripts/serve-pages.ts`, `scripts/check-budget.ts` ; `pnpm exec msw init public/ --save` ; `playwright.config.ts` (§ 3.1 : projets `legacy`, `react`, `react-only`, `production`) ; `e2e/smoke.spec.ts` (projet `react-only`) ; **vérification d'hydratation sur le vrai projet** (X-20) et essai de la barrière client-only (ci-dessous).
  - (c) `.github/workflows/ci.yml` (§ 3.1 : jobs `check`, `browser`, `e2e` en parallèle ; `playwright install --with-deps chromium` dans les jobs `browser` et `e2e` ; cache des navigateurs ; rapport HTML en artefact ; `retries: 1` en CI seulement ; build de production avec `BASE_PATH=/reservations-restaurants/` et `VITE_APPS_SCRIPT_URL` de la variable de dépôt, qui ne doit pas échouer si la variable manque (bandeau D-05) ; `upload-artifact` de `dist/client`) ; job `deploy` (`upload-pages-artifact` → `deploy-pages`) écrit dès P0 avec `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`, donc inactif jusqu'à la fusion de P8 ; actions épinglées par SHA (relevés avec `git ls-remote` ; connu : `actions/checkout` v7.0.1 = `3d3c42e5aac5ba805825da76410c181273ba90b1`), `permissions` minimales, `persist-credentials: false`, `concurrency` ; `dependabot.yml` ; `CLAUDE.md` (annexe C) ; section « Développement » du `README.md` (installation, commandes, `.env.example`, `pnpm serve` au lieu de `vite preview`).
- **Vérification d'hydratation (R-01, arbitrage 16)** : sur le build de production, `e2e/hydration.spec.ts` (projet `react-only`) pose une copie locale factice par `addInitScript`, retient la réponse du script 5 s, injecte un `MutationObserver` qui horodate le squelette et le contenu, et relève la console. Critères : aucune erreur console d'hydratation (#418, « Hydration ») ; contenu de la copie visible avant toute réponse du script ; squelette ≤ 600 ms ; aucun retour au squelette après le premier rendu du contenu ; même test avec `reservations-textes` seul, sans copie (F-34). Réglages imposés : `pendingMs: 0`, `pendingMinMs` par défaut ; `pendingMinMs: 0` seul et `onRecoverableError` sont interdits. Le repli « Router seul » (§ 2.1) n'est appliqué que si un bogue bloquant d'hydratation apparaît : la session l'écrit alors au journal avec la table de substitution fichier par fichier et l'orchestrateur tranche.
- **Essai non bloquant** (P0 (b)) : barrière client-only autour du contenu de la page, `const hydrated = useSyncExternalStore(subscribe, () => true, () => false)` (`subscribe` qui ne notifie jamais) : pendant l'hydratation, la route rend exactement le `PageSkeleton` de la coquille, puis le contenu au rendu suivant ; l'essai combine cette barrière et `pendingMinMs: 0` sur la route publique. Il réussit si le squelette tombe à une frame, sans aucune erreur #418, y compris avec un ralentissement CPU ×6 (5 essais). Sinon on garde les 500 ms par défaut. Résultat et mesures au journal et dans la ligne Start du § 2.1 (seule modification du plan permise à P0 (b)).
- **Actions humaines (propriétaire du dépôt)** : (1) variable de dépôt `VITE_APPS_SCRIPT_URL` (valeur actuelle de `APPS_SCRIPT_URL`, `00` § 2.1) ; (2) vérifier que le script **déployé** répond à `getAdminState` (le nouveau site ne reprend pas le repli `checkPassword`, b-10) : depuis le navigateur du responsable ou par `curl -sL -X POST -H 'Content-Type: text/plain;charset=utf-8' -d '{"action":"getAdminState","password":"…"}' "$URL"`, la réponse doit être un état complet et non `{ "error": … }` d'action inconnue ; sinon le script est mis à jour avant P5. Les réglages Pages (source « GitHub Actions ») et l'environnement `github-pages` sont faits en P8.
- **Dépendances** : aucune.
- **Critères d'acceptation** :
  - `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm build` verts dans la session ; `pnpm format` ne change aucun fichier (`git status` vide) ; `git diff main --stat -M -- legacy/` ne montre que des renommages à 100 % ;
  - un test `node` (format `euro` : `12.5` → `12,50\u00A0€`), un test `browser` et un test Playwright verts **dans la session** (Chromium par `PLAYWRIGHT_CHROMIUM_EXECUTABLE`) ; un id react-intl inconnu refusé par `tsc` (`@ts-expect-error`) ; un message de la coquille extrait dans `translations/fr.json` ;
  - `dist/client/` contient `index.html`, `404.html` et des assets préfixés par la base, sans `mockServiceWorker.js` ;
  - servi par `pnpm serve` : `/reservations-restaurants/` affiche la coquille ; `/reservations-restaurants/collegue` (lien profond) sert le `404.html` et l'appli démarre ; `/reservations-restaurants/index.html` redirige vers `/reservations-restaurants/` ;
  - `pnpm dev` démarre sur le faux script (aucune requête vers `script.google.com` dans l'onglet Réseau) ;
  - vérification d'hydratation verte selon les critères ci-dessus ; résultat de l'essai noté ;
  - CI verte sur la PR (`check`, `browser`, `e2e`), job `deploy` « skipped », artefact `dist/client` téléchargeable ; si la session ne peut pas lire la CI, le critère passe à l'orchestrateur ;
  - `https://thegaudis.github.io/reservations-restaurants/` sert toujours l'ancien site depuis `main` ;
  - budget mesuré sur la coquille et noté au journal.
- **Tests attendus** : un test Vitest de rendu de route (`createMemoryHistory`) ; un test `node` de `getRouter()` sans `window` (R-02) ; `e2e/smoke.spec.ts` (racine, lien profond, `index.html`, absence d'erreur console) ; `e2e/hydration.spec.ts`.
- **Délégable à un agent** : oui, 3 sessions séquentielles : (a) dépôt, `legacy/`, outillage, intl minimal, Vitest ; (b) coquille Start, scripts, Playwright, vérification d'hydratation et essai ; (c) CI, dependabot, `CLAUDE.md`, README. Consignes : ne pas écrire de code applicatif au-delà de la coquille ; ne rien changer au contenu de `legacy/` ; ne toucher ni à `main` ni aux réglages Pages ; préparer les actions humaines dans la description de la PR.
- **Estimation** : 3 j-p, 3 sessions.
- **Risques propres** : job `deploy` déclenché par erreur depuis la branche (condition `if` vérifiée en revue) ; `oxc-transform-react` à garder en 0.145.x (`pnpm why`) ; Chromium des sessions cloud (§ 2.1) ; `msw init` sans `--save` attend une réponse au clavier et bloque la session ; cache Vite froid (`optimizeDeps.include`) ; R-13 (dossiers produits non ignorés).

### P1 — Régression sur l'ancien site

- **Objectif** (arbitrage 14) : avant toute réécriture, une suite Playwright de régression **verte contre l'ancien site**, qui sert ensuite de critère de sortie mécanique à chaque phase et de preuve de parité à la fin. Les 43 scénarios `REG-01` à `REG-43`, leurs lignes de `09`, étiquettes, écarts, préconditions et horloges sont décrits dans [`parite.md`](parite.md) ; les messages des cinq sessions sont dans [`lancements.md`](lancements.md) § 3.
- **Interfaces imposées** (P1 (a1), à la lettre) :
  - `src/test/clock.ts` : `TEST_NOW = Date.parse("2026-10-05T07:30:00.000Z")` (lundi 5 octobre 2026, 9 h 30 à Paris), `TODAY = "2026-10-05"` ; jamais d'horloge réelle dans un test ; `page.clock.setFixedTime` (date figée, minuteurs réels) pour les scénarios ordinaires, `page.clock.install` pour 10 h, minuit, l'inactivité et la lecture doublée ;
  - `src/mocks/apps-script.ts` : `createFakeAppsScript(options?: { seed?: FakeDb; password?: string })` → `{ handlers, db, requests, setPassword(p), failNext(kind: 'html' | 'network' | 'error', message?), hold(): () => void }` ; module isomorphe ; une instance par test ou par story ; handlers sur `https://script.google.com/macros/s/:deploymentId/exec` pour tout identifiant ; `requests` garde méthode, URL, en-têtes et corps ; sémantique tirée de `Code.gs` (ordre des contrôles, messages exacts), pas seulement des exemples de `02` ;
  - `src/mocks/fixtures/seed.ts` : jeu de base de [`parite.md`](parite.md), daté par rapport à `TODAY` ;
  - `e2e/fixtures.ts` : isolation réseau enregistrée en premier (abort de tout ce qui n'est pas `localhost` ou `127.0.0.1`, polices Google comprises), puis handlers du faux script par `@msw/playwright` (`passthrough()` pour `localhost`), console stricte, exposition `fakeScript` aux tests ; un test prouve l'isolation (une requête vers `https://example.com` échoue, aucune ne sort vers `script.google.com`) ;
  - `e2e/pages/` : signatures (`gotoHome(page, search?)`, `calendar.ts`, `day-card.ts`, `booking-r1.ts`, `order-r2.ts`, `login.ts`, `staff.ts`, `print.ts`) et utilitaire `target(testInfo): 'legacy' | 'react'` (nom du projet Playwright : seul mécanisme de variante) ;
  - étiquettes : `test("…", { tag: ["@parity" | "@changed:E-xx", "@<identifiant d'écran>", "@p4" | "@p5" | "@p6", "@legacy-only"?] }, …)`, titres en anglais, textes attendus en français.
- **Livrables** : `legacy/` servi par `pnpm serve:legacy` ; faux script complet (toutes les actions de `02` § 4 utilisées par le site, erreurs exactes, `unchanged`, `_duplicate`, ajustements R2, verrou, mot de passe changé, réponse retenue, page HTML d'erreur ; jamais `checkPassword` ni `addBookingR2`) et ses tests (projet `node`) ; fixtures ; `src/mocks/browser.ts`, `src/mocks/node.ts` ; `e2e/fixtures.ts` ; page objects ; `e2e/regression/*.spec.ts` (43 scénarios) ; un test qui compare les étiquettes `@changed:E-xx` de la suite aux identifiants du § 4.2 ; [`parite.md`](parite.md) tenue à jour (scénario → lignes de `09`, et l'inverse : chaque identifiant de `09` a au moins un scénario) ; côté ancien site, impression capturée dans le `popup` avec `print()` neutralisé par `addInitScript` du contexte, et URL YouTube de l'easter egg vérifiée sans être chargée.
- **Dépendances** : P0.
- **Critères d'acceptation** :
  - chaque identifiant de `09` a au moins un scénario (G-05 : `REG-07` `@legacy-only`, couvert côté `react` par une story et un test Vitest du composant, F-07) ; suite verte sur `legacy` trois fois de suite (`--repeat-each 3`), durée notée au journal ;
  - la liste des étiquettes `@changed:E-xx` est exactement celle du § 4.2 (test automatique) ; elle est validée par l'orchestrateur avant P1 (b) ;
  - le faux script passe ses tests unitaires (projet `node`) contre les exemples de `02` et les messages de `Code.gs` ;
  - aucun sélecteur de classe ou d'id dans `e2e/` (`grep -rnE "locator\('[.#]" e2e` vide) ;
  - les tests dorés des fonctions pures de l'ancien code (`loadCache`, `formatEuro`, `keyTargetIso`, `capacityClass`…) ne sont pas dans cette phase : ils restent en P2.
- **Critères de sortie des phases suivantes** (étiquettes `@p4`, `@p5`, `@p6`) : P4 → G-01 à G-05, G-07 et P-* (`REG-01` à `REG-26` et `REG-43`) ; P5 → G-06, G-08, L-01 et C-* hors C-01 et C-03 (`REG-27` à `REG-38`) ; P6 → I-00 à I-04, C-01 et C-03 (`REG-39` à `REG-42`) ; P7 → suite complète verte sur `react` ; le projet `legacy` est retiré en P8 avec `legacy/`. P4 à P6 n'écrivent plus que les E2E propres au nouveau code (projet `react-only` : hydratation, impression PDF).
- **Tests attendus** : la suite elle-même (Playwright, Chromium, `locale: 'fr-FR'`, `timezoneId: 'Europe/Paris'`, `storageState` neuf par test) ; tests unitaires du faux script ; test de l'isolation réseau ; test des étiquettes `@changed`.
- **Délégable à un agent** : oui, 5 sessions : (a1) isolation réseau, faux script (lecture et réservations publiques), fixtures, cadre de la suite, signatures, `parite.md`, liste `@changed` (à faire en premier) ; (a2) faux script : actions collègue ; puis en parallèle (b) scénarios publics et chargement, (c) scénarios du mode collègue, (d) impression et invariants. Consignes : lire `09`, `04`, `06`, `07` ; sélecteurs sémantiques seulement ; un scénario = un état ou un parcours ; les textes attendus sont ceux de la spec, et ceux de l'annexe F pour les variantes `react` ; les variantes `react` sont écrites d'après le plan, sur un DOM qui n'existe pas encore.
- **Estimation** : 5 j-p, 5 sessions.
- **Risques propres** : DOM peu sémantique de l'ancien site (calendrier `role="group"` + `aria-pressed`, pas de `<form>`) → les page objects l'abstraient, et seuls eux changent entre `legacy` et `react` ; `window.open` de l'impression côté ancien site (capturer le `popup`) ; `page.clock` installé avant `goto` ; `hold()` retient la réponse côté Node pendant que le minuteur de 6 s tourne dans la page ; même origine et donc même `localStorage` entre scénarios → `storageState` neuf par test ; URL réelle codée dans `legacy/index.html` → isolation réseau (R-33).

### P2 — Domaine pur, client API, schémas et frontière de l'API, copie locale, session

- **Objectif** : toute la logique sans interface, prouvée par des tables de cas tirées de la spec.
- **Livrables** : `src/domain/*` ; `src/intl/{dates,amounts}.ts` et leurs tests ; `src/api/*` ; `src/queries/{client,state,local-cache,purge,use-app-state}.ts` ; `src/session/session.ts` ; `src/background/{start,logout,inactivity,clock}.ts` ; conversions de la frontière de l'API (§ 3.3.6) et leurs tests sur les fixtures de `src/mocks/fixtures/` (écrites en P1 : exemples de `02` § 3.2, § 4.3, § 4.4, § 4.5, et de `03` § 1.1) ; tests co-localisés. Reprendre les fichiers d'AppResaAristide copiés dans [`recherche/appresaaristide/`](recherche/appresaaristide/PROVENANCE.md), à adapter (textes selon la spec, code en anglais, pas de Convex) : `src/lib/validators.ts` → `domain/validation.ts` ; `src/lib/money.ts` → `parseAmount`, `parseCount`, `stepCount` dans `domain/validation.ts` (`formatEuro` **non repris** : le format vient de react-intl ; il ne sert que de référence dans le test doré du format `euro`, avec celui de `legacy/js/outils.js`) ; `src/lib/dates.ts` (dont `formatWeekLabel` et un `addMonths` sans débordement) → `domain/dates.ts` et `intl/dates.ts` ; `src/lib/today.ts` (principe seulement : l'horloge est un store Zustand) ; `convex/model/dates.ts` (`parisDate`, `parisHour`) → `domain/paris.ts` ; `convex/model/pricing.ts` (`r1Total`) → `domain/pricing.ts` ; avec leurs tests.
- **Ordre imposé** : le premier commit de P2 (a), poussé et fusionné avant (b1) et (c), contient `domain/types.ts` écrit à la main (`Settings`, `ServiceDayR1`, `StaffServiceDayR1`, `ServiceDayR2`, `StaffServiceDayR2`, `Dish`, `BookingR1`, `BookingR2`, `SeatTotal`, `PortionTotal`, `PublicState`, `FullState`, `WriteResponse`, `IsoDate`, `Restaurant`, `ServiceMode`, entrées des actions `BookingR1Input`, `OrderR2Input`…), `constants.ts`, `paris.ts`, `vouchers.ts`.
- **Dépendances** : P0 ; P1 (a1) pour le faux script, les fixtures et `TEST_NOW`.
- **Critères d'acceptation** (chaque ligne = au moins une table `it.each`) :
  - `00` § 3 et `04` § 8, rendus par l'instance `intl` : `formatLongDate` (`2026-10-01` → `jeudi 1er octobre 2026`, `2026-10-03` → `samedi 3 octobre 2026`, le 1er de chaque mois), montant au format `euro` (`12.5` → `12,50\u00A0€`, `'4.95'` → `4,95\u00A0€`, `0` → `0,00\u00A0€`), pluriels ICU (0, 1, 2 couverts ; 1 et 2 tickets restaurant), séparateur `\u00A0— ` devant un prix, textes de montants R2, `emailError` (trois cas, messages exacts) ;
  - `01` § 3.1 à § 3.8 : places restantes (y compris négatives), seuils de `capacityClass` (capacité 20 : 20 à 10 `available`, 9 à 1 `almostFull`, ≤ 0 `full`), statut R2 agrégé et `null` sans plat, `priceR1`, `r2Amounts`, `orderAmounts` (un ticket), textes de montants et prix d'un plat de `intl/amounts.ts` (prix 0 non affiché), codage du ticket (idempotent), `serviceMode`, `isR2OrderingClosed` à 9 h 59 / 10 h 00 heure de Paris, en hiver et en été, sous `TZ=America/New_York` (projet `node-ny`), jour passé ;
  - `04` § 5.2 et § 5.3 : totaux en direct (`3 couverts · Total : 16,00␣€`, les quatre exemples R2) ; § 7 : lignes et totaux du récapitulatif ; § 8 : formats ;
  - `05` § 2.1, § 2.3, § 3.2 : cases semaine et mois (lundi, 42 cases), libellés (avec la correction a-23), `keyTargetIso` pour chaque touche (Page ↑ / ↓ borné) ; `selectDay` et `goToToday` ne touchent qu'un restaurant (a-12) ;
  - `02` § 1.5 (faux minuteurs) : seconde lecture à 6 000 ms et pas avant, la première réponse gagne, la perdante est annulée, échec seulement si toutes échouent, nouvel essai unique à 1 500 ms, pas de nouvel essai pour `{ error }` ni hors ligne ; délai de 30 s par essai (choix du plan, a-2, E-45) ; lecture anticipée consommée une fois et seulement si `since` est identique, doublage au temps restant ;
  - `02` § 1.3, § 1.6, § 4 : `getState` sans en-tête ; `postAction` envoie `Content-Type: text/plain;charset=utf-8` et aucun autre en-tête (lu dans `requests` du faux script) ; `{ error: 'Mot de passe incorrect.' }` → `PasswordRejectedError` ; autre `{ error }` → `BusinessError` ; HTML ou `TypeError` → `ServiceError` ; une mutation n'est jamais rejouée (`retry: false`, `networkMode: 'always'` : une erreur réseau = un seul POST, F-35) ;
  - `02` § 3.3 et § 5.1 : `unchanged` → même référence, `dataUpdatedAt` rafraîchi, `since` envoyé ; `02` § 5.4 : champs `_…` sortis de l'état (`duplicate`, `emailStatus`, `bookingResult`) avant le cache ; schémas acceptant nombres en chaînes et `''` (`''` → `null` pour le prix, jamais 0) ;
  - **frontière de l'API** (§ 3.3.6) : chaque exemple JSON de `02` (§ 3.2, § 4.3, réponses de § 4.4 et § 4.5) est traduit vers le modèle anglais ; test de types `expectTypeOf<v.InferOutput<typeof XSchema>>().toEqualTypeOf<X>()` pour chaque entité ; corps produits par `api/actions.ts` = exactement ceux de `02` § 4.4, § 4.5 et § 4.7 (`mode`, mention du ticket, `price: ""`, `qte` et `prixTotal` d'`editBookingR1` compris) ; aucun champ du script hors de la frontière (`api/schemas.ts`, `api/staff-schemas.ts`, `api/actions.ts`, `api/early-fetch.ts`, `queries/local-cache.ts`, `src/mocks/**` et leurs tests), vérifié par un test `grep` du projet `node` ;
  - `03` § 1.1 : l'exemple JSON exact relu, converti vers `PublicState` puis réécrit à l'identique par `toLocalCacheV1` (aux valeurs près : tarifs normalisés par `String(Number(…))`) ; copie de plus de 14 jours ignorée ; copie sans etag acceptée ; JSON invalide ignoré ; aucune écriture depuis l'état complet ni sans etag ; la copie écrite est relue correctement par la logique de `loadCache` de `legacy/js/donnees.js` (test doré) ;
  - session : ouverture, fermeture, `endReason` ; inactivité de 10 min (activité qui repousse, `visibilitychange`, `pageshow`), purge vérifiée sur un `QueryClient` réel (§ 3.3.4) ; horloge : tic à 10 h 00 et à minuit heure de Paris ; `getRouter()` sans `window` n'abonne pas `persistLocalCache` (R-02) ;
  - couverture de `src/domain/` ≥ 95 % des lignes (`@vitest/coverage-v8`).
- **Tests attendus** : unitaires Vitest (projets `node` et `node-ny` pour `domain`, `intl`, `api`, `queries`, `session` ; projet `browser` pour `background/`), faux minuteurs avancés explicitement, `fetch` intercepté par le faux script unique (`src/mocks/node.ts` + `createFakeAppsScript`) ; `vi.stubGlobal` seulement pour un cas que msw ne produit pas (`TypeError` de `fetch`) ; tests dorés qui exécutent les fonctions pures de `legacy/js/outils.js`, `donnees.js` et `calendrier.js` (`loadCache`, `formatEuro`, `keyTargetIso`, `capacityClass`…) dans un contexte `vm` Node avec un `document` minimal factice, ou à défaut dans une `iframe` du projet `browser` (les anciens scripts touchent le DOM au chargement ; décision au journal), sur les mêmes tables, avec la liste des écarts attendus (heure de Paris, a-23).
- **Délégable à un agent** : oui, 4 sessions : (a) `domain/` (premier commit d'abord) ; (b1) `api/` : transport, erreurs, signaux, lecture doublée, lecture anticipée, schémas ; (c) session, `background/`, `intl/dates.ts`, `intl/amounts.ts` ((b1) et (c) en parallèle après le premier commit de (a)) ; (b2) `api/actions.ts`, `queries/`, copie locale, tests dorés (après (b1)). Consignes : aucune dépendance à React dans `domain` et `api` ; chaque règle cite sa section de spec en commentaire ; `domain/` ne produit aucun texte (nombres et structures) ; les textes et formats passent par `src/intl/` (§ 3.10) ; si `purgeStaffSession` n'est pas encore fusionnée, (c) l'injecte en paramètre de `startBackgroundTasks` et teste avec un double.
- **Estimation** : 5 j-p, 4 sessions.
- **Risques propres** : `Intl` différent entre Node et navigateurs (comparer avec `\u00A0` explicite, ICU complet de Node 22 ; U+202F des grands montants), ordinal `selectordinal` mal écrit (tester le 1er de chaque mois), transformations non idempotentes du schéma, `AbortSignal.any` absent de vieux Safari (repli `anySignal()`).

### P3 — Composants `ui/` et Storybook

- **Objectif** : une bibliothèque de composants stylés aux jetons de la charte, accessibles, sans métier.
- **Livrables** : `src/ui/**` selon le tableau du § 3.5 (boutons, `ConfirmButton`, `ViewToggle`, champs pré-liés et `createFormHook`, `SegmentedRadio`, `NumberField` à boutons −/+, `PriceField`, `CheckboxField`, `PasswordField`, `SubmitButton`, `Collapsible`, `DatePickerPopover`, `CalendarGrid` et `CalendarHeader`, `Toaster` et `toast.ts`, `Alert`, `CapacityPill`, `Skeleton`, `Spinner`, `icons.tsx`) avec leurs CSS Modules ; reprise adaptée de [`recherche/appresaaristide/src/components/form/fields.tsx`](recherche/appresaaristide/PROVENANCE.md) (CSS Modules au lieu de Tailwind, `aria-busy`, `Field.Description`, textes de la spec) ; **Storybook** (arbitrage 13), configuration vérifiée par le projet d'essai : `.storybook/main.ts` (`framework.options.builder.viteConfigPath: ".storybook/vite.config.ts"`), `.storybook/vite.config.ts` (react + formatjs + `tsconfigPaths`, sans le plugin Start : sinon `storybook build` échoue sur le plugin `tanstack-start`), `.storybook/preview.tsx` en **CSF Next** (`definePreview({ addons: [addonA11y(), addonMsw()], beforeEach: ({ msw }) => msw.use(...handlers) })`, décorateur intl + Query + accent, `a11y.test: "error"`), stories en `preview.meta()` / `meta.story()` ; 3e projet Vitest `storybook` (plugin `storybookTest`, sans `setupFiles`, une fabrique `browser()` par projet : le plugin remplace `test.include` et ne peut pas partager le projet `browser`) ; scripts `storybook` et `build-storybook` ; une story par composant de `ui/` et par état utile (inactif, occupé, erreur, armé, vue semaine / mois…).
- **Dépendances** : P0, P1 (a1) pour les handlers msw des stories ; P3 (c) après P2 (a) et P2 (c) (`keyTargetIso`, libellés du calendrier) ; `CapacityPill` reçoit `percent` et `state` déjà calculés.
- **Critères d'acceptation** :
  - `08` § 1-5 : jetons seulement (aucune couleur, taille ou rayon en dur hors impression), cibles de 48 px (`::after`), anneau de focus, opacité 38 % pour l'inactif, `prefers-reduced-motion` coupe tout, `user-select: none` sur boutons et jauges ;
  - calendrier : `05` § 2.2 à § 2.6 et § 3.1 à § 3.2 (structure, `aria-label` exacts, un seul `tabIndex=0`, toutes les touches, vue qui suit la sélection, focus conservé sans effet) ;
  - `ConfirmButton` : `06` § 5.2 (armement, 4 s, largeur figée, `aria-label` et `title`, désarmement à chaque rendu neuf), a-19, minuteur sans effet ;
  - champs : `04` § 5.4 et § 10 (libellé relié, `aria-invalid`, `aria-describedby` erreur puis aide, aide masquée en erreur, message affiché jusqu'à correction de la valeur (E-46), focus sur le premier champ en erreur dans l'ordre du DOM) ;
  - `NumberField` : libellés français (`aria-roledescription`, boutons −/+), valeur vide affichée vide et comptée 0 ; attributs rendus comparés à `04` § 5.2-5.3 (`type`, `min`, `max`, `placeholder="0"`, `inputmode`), chaque différence reportée par l'orchestrateur dans E-19 ;
  - `Toaster` : un seul toast par `<Toast.Provider limit={1}>` (a-8), 3,5 s, types succès / neutre / erreur, erreurs prioritaires, appelable hors React par `toast.ts` ;
  - date picker : `06` § 3.2 et § 3.3 (flèches = focus seulement, jours passés `aria-disabled`, « déjà ouvert », Échap, clic extérieur, retour du focus) ;
  - une violation axe volontaire fait échouer le projet `storybook` (puis retirée) ; `pnpm build-storybook` passe.
- **Tests attendus** : Vitest Browser Mode (`vitest-browser-react`, `render` asynchrone, `page.getByRole`, `userEvent` de `vitest/browser`) pour chaque composant (rôles, noms accessibles, clavier réel, focus, états `data-*`) ; chaque story exécutée comme test et passée à axe ; dans un `play`, les portails Base UI se cherchent avec `screen` de `storybook/test`, pas `canvas` ; table de toutes les touches du calendrier ; faux minuteurs pour `ConfirmButton`.
- **Délégable à un agent** : oui, 4 sessions : (0) configuration Storybook et intégration Vitest, icônes, `src/test/render.tsx`, Base UI, TanStack Form (à faire en premier, seule autorisée à ajouter ses paquets) ; (a) boutons, retours (toasts, alertes, jauge, squelette), bascules ; (b) formulaires pré-liés ; (c) calendrier et sélecteur de date ; chaque session écrit les stories de ses composants. Consignes : aucun import de `api/`, `queries/` ni de données métier ; libellés métier fournis par props (déjà formatés par `intl`) ; textes génériques propres à `ui/` (« Confirmer ? », « Notifications », « champ numérique ») en messages react-intl `ui.*` ; Base UI enveloppé une seule fois ; consulter `recherche/ui-forms.md` § 2-4 et § 11.
- **Estimation** : 5 j-p, 4 sessions.
- **Risques propres** : stories qui dépendent du routeur (décorateur avec routeur en mémoire), libellés anglais de Base UI oubliés, `Field.Error` non annoncé (focus + `aria-describedby`), désélection du `ToggleGroup`, accent perdu dans les portails, `useStore` de TanStack Form déprécié (`useSelector` ou `form.Subscribe`), `optimizeDeps.include` au premier lancement du projet `storybook`.

### P4 — Parcours public

- **Objectif** : la page publique complète, identique à l'actuelle plus les écarts du § 4.2.
- **Livrables** : `routes/index.tsx` complet ; `features/page/*` (dont `DevDataBanner`) ; `features/calendar/*` (navigation par l'URL, `domain/navigation.ts`) ; `features/r1/*`, `features/r2/*`, `features/booking/*` ; `mutations/bookings.ts` ; `queries/use-app-state.ts` et `queries/AutoRefresh.tsx` ; lecture anticipée réelle ; `intl/common-messages.ts` rempli en une fois (P4 (a)) ; formulaires publics chargés à la demande (préchargés au survol ou au focus de « Réserver » et pendant l'inactivité du navigateur ; module chargé par `load-booking-form.ts` et signalé par `useSyncExternalStore`, **sans `lazy()` ni `<Suspense>`** : React dévoile une frontière suspendue après un minuteur que l'horloge en pause des scénarios ne fait jamais partir ; P4 (c)) ; écouteur `vite:preloadError` ; stories des fiches, formulaires, récapitulatifs, encadré d'échec et bandeau dans chacun de leurs états de `09` (handlers msw) ; `e2e/hydration.spec.ts` complet ; budget contrôlé en CI.
- **Dépendances** : P2, P3.
- **Critères d'acceptation** :
  - en-tête, colonnes, pied : `04` § 2, `08` § 7 (ordre de la page, points de rupture 760 / 640 / 600 / 520 px, `pointer: coarse`), textes de `03` § 2.1-2.2 et `00` § 2.3, D-24, easter egg conservé (D-01, `REG-43`) ;
  - calendriers : `05` § 2 et § 3 câblés sur l'URL (§ 3.2 de ce plan), sélection sans effet sur l'autre restaurant (a-12), « Aujourd'hui » qui ferme ce qui dépend du jour (§ 3.2) ;
  - fiches : ordre exact `05` § 5.1 et § 6.2, états `05` § 5.2 et § 6.5, jauges `05` § 4.5, jour sans service `05` § 4.3, surtitres `05` § 4.4, cut-off `01` § 3.7 et `04` § 4.3, D-02 ;
  - formulaires : `04` § 5.1 à § 5.4 (libellés, attributs, placeholders, ordre, validations et messages exacts, focus d'ouverture et défilement, retour du focus sur « Réserver » à l'annulation, repli de la liste R2, ticket → sur place et aide), D-10, D-17, D-18 ;
  - envoi : `04` § 6.1 à § 6.3 (bouton occupé, corps exacts avec `trim()`, `requestId` conservé après erreur et renouvelé à la réouverture, inchangé après une actualisation, cut-off repris à l'envoi avec toast neutre, réponses `_duplicate` / `_bookingResult` / `_emailStatus`, erreurs du script), a-6, a-20, D-14, D-15, D-16 ;
  - récapitulatif : `04` § 7 et `08` § 6.1 (lignes, total, avertissements cumulés, contact d'annulation, `Fermer`, `role="status"`, focus), affiché au-dessus de la fiche tant que le jour reste sélectionné ;
  - chargement : `03` § 2 et § 3 (squelette, copie locale, encadré d'échec et textes de § 3.1, `Réessayer`), § 5.1 et § 5.2 (actualisation, a-4 : saisie et focus intacts après une actualisation), § 5.3 (10 h, a-7), a-21, a-22, D-05 (story et test Vitest de `ConfigBanner`, F-07) ; S4 vert (`e2e/hydration.spec.ts`, avec la copie puis avec `reservations-textes` seul) ;
  - catalogue `04` § 9 et textes de `05` (§ 2.3, § 2.5, § 4.3, § 4.4) entièrement couverts par des tests ; textes nouveaux conformes à l'annexe F ; accessibilité `04` § 10 ;
  - **critère de sortie** : scénarios de régression `@p4` (G-01 à G-05, G-07, P-*, `REG-01` à `REG-26` et `REG-43`) verts sur le projet `react` ; colonne `react` de `parite.md` mise à jour ;
  - budget S3 respecté ; 0 à 2 effets (S6).
- **Tests attendus** : Vitest Browser Mode + msw en service worker (`onUnhandledFrame: 'error'`, une instance de `createFakeAppsScript` par test) par état d'écran, et stories ; routes en mémoire (`createMemoryHistory`) pour les search params (fallbacks, `?connexion=1`, `reserver` sur un jour non réservable) ; E2E propre au nouveau code seulement : `e2e/hydration.spec.ts` ; les parcours « réserver R1 » et « commander R2 avant et après 10 h » sont des scénarios de régression déjà écrits en P1.
- **Délégable à un agent** : oui, 4 sessions séquentielles : (a) page, en-tête, états de chargement, actualisation, lecture anticipée, textes communs ; (b) calendriers câblés et fiches ; (c) formulaire R1, envoi, récapitulatif, briques communes (premier commit : `IdentityFields`, `BookingSummary`, `useBookR1`, signature de `useOrderR2`) ; (d) formulaire R2. Consignes : chaque texte est un message react-intl à id explicite (`public.…`) dont le `defaultMessage` est recopié de `04` § 9 (ou de l'annexe F) et la `description` cite la section ; données lues par `useAppState(select)` dans les feuilles, pas de props sur cinq niveaux ; état du formulaire uniquement dans TanStack Form ; `requestId` par `useState(() => newRequestId())` dans le composant monté avec `key={`${restaurant}:${date}`}`.
- **Estimation** : 5 j-p, 4 sessions.
- **Risques propres** : budget JS (R-15), squelette de la coquille (arbitrage 16 : `pendingMinMs: 0` seulement sur une route dont le composant rend `PageSkeleton` tant que `useHydrated()` vaut `false`, essai validé en P0 (b)), `?reserver=1`, `handleSubmit` qui relance l'erreur, `defaultValues` lues au montage seulement (clé par jour), messages hors `defineMessages` (R-34).

### P5 — Mode collègue

- **Objectif** : tout le mode collègue, avec une session sûre.
- **Livrables** : `routes/collegue.tsx` (garde, schéma complet, loader de l'état complet) ; `features/page/ModeSwitch.tsx` (Client / Collègue, panneau de connexion `?connexion=true`, œil, Entrée, Échap) et `mutations/login.ts` ; `features/page/StaffPage.tsx` (un emplacement par panneau) ; `mutations/staff/write.ts` (fabrique commune avec la garde de session du § 3.3.3) puis `days.ts`, `dishes.ts`, `bookings.ts`, `settings.ts` ; `features/staff/*` ; branchement de `afterLogout` (§ 3.3.4) et de l'inactivité ; panneau `Demain` (totaux ; détails et impression en P6).
- **Dépendances** : P4 (page et fiches), P2 (session) ; action humaine de P0 (`getAdminState` vérifié sur le script déployé).
- **Critères d'acceptation** :
  - accès : `06` § 1.1 à § 1.8 (attributs du sélecteur, comportements, connexion refusée sur copie locale, textes d'erreur, toasts, conservation du mot de passe, déconnexions, mot de passe changé, actualisation par `getAdminState`) ; garde : rechargement de `/collegue?r1=…&editResa=…` → connexion → retour exact ;
  - **sécurité** (S8) : après chaque déconnexion, cache et DOM purgés (§ 3.3.4) ; **déconnexion pendant une écriture collègue retenue par `hold()`** : la réponse est jetée, aucune entrée `['state','staff']` ne réapparaît (garde de session, `gcTime: 0`, F-02) ; mot de passe absent de `localStorage`, `sessionStorage`, de l'URL, des clés de requête et des sorties `console.*` (espion) ; a-1, a-13, a-14 ;
  - fiches collègue : `05` § 4.3 (message collègue d'un jour sans service), § 4.6 (format des lignes, `PrixTotal` 0 masqué, mode en minuscules, aucun tri), § 5.1 (4) et § 6.2 (4) (« Ouvert par »), § 5.3 et § 6.3 (ordre des boutons, « + Ajouter une personne » si `rem > 0`, jours passés compris, `aria-expanded` sur « Modifier » et « + Ajouter une personne », aucun « Réserver » en mode collègue) ;
  - panneaux : `06` § 2.1 (D-07, première partie), § 2.2 (Paramètres, D-20 : noms obligatoires, panneau gardé ouvert après succès, toast « Aucune modification à enregistrer. », bouton « Enregistrement… »), § 3 (sélecteur de date), § 4.1 à § 4.3 (ouvrir un jour R1 et R2, lignes de plats, case ticket, D-19 ; après succès : panneau gardé ouvert, champs vidés sauf la date, calendrier du restaurant sur la date ouverte, `collegue.js` l. 276-277), § 5.1 et § 5.2 (modifier ce jour, R1 seulement : D-09 non retenue ; suppressions en deux clics, D-21), § 6 (plats, D-22, suggestions de prix triées et sans doublon), § 7 (liste et modification des réservations, contact obligatoire comme aujourd'hui : D-04 non retenue ; compteurs `null` des anciennes réservations affichés vides avec l'aide « Réservation enregistrée avant les tarifs… » ; un jour au ticket, modification R2 en « Sur place » seulement), § 8 (ajout d'une personne, `requestId`, relecture de l'état complet, toasts, ajout R2 possible après 10 h : les collègues ne sont pas soumis au cut-off) ; D-14 et D-15 pour les écritures collègue ;
  - textes de `06` § 1 à § 8 couverts par des tests ; textes nouveaux conformes à l'annexe F ;
  - focus : après une suppression, focus sur la date de la fiche (`tabIndex={-1}`, `03` § 5.4) ; après la fermeture d'un formulaire collègue (enregistrement ou « Annuler »), focus sur le bouton qui l'a ouvert (E-48) ; formulaires collègue ouverts (brouillon de plats, Paramètres, modification) intacts après une actualisation `getAdminState` (`03` § 5.4) ;
  - corps des requêtes conformes à `06` § 10 et `02` § 4.7 (champ `password` présent seulement pour les actions protégées, jamais pour `addBookingR1` / `addBookingR2Multi`) ;
  - écrans `09` G-06 (disparu), G-08, L-01, C-02, C-04 à C-06, C-10, C-10b, C-11 à C-14, C-20 à C-24, C-30.
- **Tests attendus** : Vitest Browser Mode par panneau avec le faux script (état mutable) et stories de chaque panneau dans ses états de `09` ; tests de la garde et du retour ; faux minuteurs pour l'inactivité dans un vrai rendu ; test S8, dont la déconnexion pendant une écriture ; le parcours « connexion → ouvrir un jour → ajouter une personne → déconnexion par inactivité → plus aucun nom » est le scénario `REG-30` (P1).
- **Critère de sortie** : scénarios de régression `@p5` (`REG-27` à `REG-38` : G-06, G-08, L-01, C-* hors C-01 et C-03) verts sur le projet `react`.
- **Délégable à un agent** : oui, 6 sessions : (a) session, garde, connexion, déconnexion, inactivité, mot de passe changé, socle des panneaux et fabrique des mutations (à faire en premier) ; puis en parallèle (b) ouvrir et modifier un jour, sélecteur de date ; (c) plats ; (d1) liste et modification des réservations ; (e) paramètres et totaux du panneau « Demain » ; enfin (d2) ajout d'une personne R1 et R2 (après (d1)). Consignes : le mot de passe n'est lu que dans `mutationFn` / `queryFn` via le store, jamais en prop ni en clé ; chaque panneau ouvert = un paramètre d'URL du § 3.2 ; chaque session ne touche que son emplacement de `StaffPage` et son fichier de `mutations/staff/`.
- **Estimation** : 6,5 j-p, 6 sessions.
- **Risques propres** : course entre une lecture et une écriture (`cancelQueries`), réponse d'écriture après déconnexion (garde de session), suspension au passage d'une clé à l'autre (`id` calculé avant `open`), store Zustand singleton dans les tests (réinitialiser avec `useSessionStore.setState(initial, true)`), minuteurs ralentis en arrière-plan.

### P6 — Impression et panneau « Demain »

- **Objectif** : les quatre documents imprimés et le panneau « Demain » fusionné.
- **Livrables** : `ui/print/*`, `styles/print.css`, `features/print/*`, `domain/print.ts` complété, panneau `Demain` complet (D-07), stories des documents et du panneau, `e2e/print-pdf.spec.ts` (projet `react-only`).
- **Dépendances** : P5 (a) pour l'accès ; P6 (a) travaille sur fixtures pendant la vague 2 de P5 ; P6 (b) après P5 (e) et P6 (a).
- **Critères d'acceptation** :
  - `07` § 2 (format A4 paysage et marges, structure de haut en bas, couleurs par restaurant, tableaux, total, signature, pied imprimé dans les boîtes de marge, date d'impression), § 3 (liste R1 : colonnes, N° table, Chef de rang, totaux), § 4 (liste R2 : regroupement par client trié par classe puis nom, récapitulatif par plat), § 5 (panneau à l'écran, textes corrigés de a-24 donnés à l'annexe F, D-03), § 6 et § 7 (résumés du lendemain), titres de document (nom du PDF) ;
  - un ticket par commande dans tous les totaux (a-11, invariant 5) ; ordre actuel des listes (D-08 non retenue) ; réservations orphelines exclues ;
  - impression sans nouvelle fenêtre ; rien d'autre que le document à l'impression ; après `afterprint`, titre du document rétabli, `.print-root` vide, focus rendu au bouton d'impression ;
  - **critère de sortie** : scénarios de régression `@p6` (`REG-39` à `REG-42` : I-00 à I-04, C-01, C-03) verts sur le projet `react`.
- **Tests attendus** : rendu des documents sur fixtures en Vitest Browser Mode (textes, lignes, ordre, totaux exacts) ; `e2e/print-pdf.spec.ts` (`window.print` intercepté, `page.emulateMedia({ media: 'print' })`, `page.pdf()` pour vérifier le format paysage et le nombre de pages d'une longue liste).
- **Délégable à un agent** : oui, 2 sessions : (a) mécanique et documents R1 ; (b) documents R2, panneau « Demain ». Consignes : suivre `07` ligne par ligne, y compris les colonnes vides et les cas « Aucune réservation. ».
- **Estimation** : 2,5 j-p, 2 sessions.
- **Risques propres** : boîtes de marge seulement dans Chromium, Safari iOS, polices pas encore chargées (attente ≤ 2 s), `@page` global (page nommée obligatoire), regroupement R2 par nom + classe + contact (clé actuelle conservée, a-24).

### P7 — Parité finale et validation par les collègues

- **Objectif** : prouver la parité (suite de régression complète verte sur le nouveau site), l'accessibilité et le budget, puis faire valider le nouveau site par les collègues sur le vrai script **avant la fusion**, sans préproduction publiée (arbitrage 15).
- **Livrables** : suite de régression (P1) verte en entier sur le projet `react`, étiquettes `@changed:E-xx` vérifiées contre le § 4.2 ; filtre par étiquettes du projet `react` retiré de la CI ; E2E propres au nouveau code complétés (`hydration`, `print-pdf`, `a11y`, `smoke`) ; [`parite.md`](parite.md) complétée (chaque identifiant de `09` → scénario, story ou test navigateur → statut sur `legacy` et sur `react` ; écart E-xx) ; rapport de budget (kB gzip par chunk) ; `docs/migration/validation.md` (procédure pour les collègues : servir le build local ou l'artefact CI par `pnpm serve`, URL réelle seulement dans `.env.real.local` du responsable, avertissement R-30, vérifications manuelles, formulaire de retour) ; correctifs ; « reste à faire » des journaux traités ou reportés. Le faux script et les scénarios existent depuis P1 : cette phase ne les écrit plus.
- **Dépendances** : P4, P5, P6.
- **Critères d'acceptation** :
  - S1 à S8 du § 1.5 atteints ; **critère de sortie** : suite de régression complète verte sur `react` trois fois de suite, avec les mêmes scénarios `@parity` que sur `legacy` et exactement les écarts `@changed:E-xx` du § 4.2 ; aucune assertion `@parity` modifiée depuis P1 sans ligne au journal (`git log -- e2e/regression`) ; E2E propres au nouveau code verts (S4, impression PDF paysage, smoke) ;
  - axe sans violation sur toutes les stories (`a11y.test: "error"`) ; en E2E, axe sur quelques écrans complets : G-02, G-04 (semaine et mois), P-05, P-13, L-01, G-08, C-02 ;
  - vérification manuelle : NVDA ou VoiceOver sur le calendrier et un formulaire (annonce de la case du calendrier, des erreurs, du récapitulatif, des toasts) ; Safari iOS et les tablettes de l'établissement ; impression sur un poste du lycée ; U+202F des montants au-delà de 999 € vérifiée dans Chromium et WebKit ;
  - **validation par les collègues** (S9) : pendant 1 à 2 semaines, avant la fusion, sur le build de la branche servi par `pnpm build && pnpm serve` (poste du responsable ou des collègues) ou sur l'artefact `dist/client` téléchargé depuis la CI et servi de la même façon ; le build pointe sur le vrai script (vraies réservations, vrais e-mails) ; connexion collègue réelle validée (`getAdminState`) ; retours traités ou reportés ; accord écrit.
- **Tests attendus** : Playwright + `@msw/playwright` (handlers de `src/mocks/apps-script.ts`, isolation réseau), `timezoneId: 'Europe/Paris'`, `locale: 'fr-FR'`, projets `legacy`, `react` et `react-only`.
- **Délégable à un agent** : partiellement : (a) suite de régression complète sur `react` et correctifs ; (b) axe E2E, budget, matrice, procédure de validation (2 sessions) ; vérifications manuelles, test par les collègues et validation non. Aucun agent ne lance le site contre le vrai script.
- **Estimation** : 2,5 j-p, 2 sessions, plus 1 à 2 semaines calendaires.
- **Risques propres** : comportement réel du script (302, lenteurs, pages d'erreur) différent du faux ; la validation écrit dans la vraie feuille et envoie de vrais e-mails (R-30) ; collègues peu à l'aise avec un serveur local (prévoir une démonstration, ou un poste préparé par le responsable).

### P8 — Bascule et nettoyage

- **Objectif** : le nouveau site à la racine en une fois, l'ancien retiré, retour arrière possible en moins de 15 minutes.
- **Livrables** : commit de bascule sur la branche : `legacy/` supprimé avec le projet Playwright `legacy` et le script `serve:legacy` (la suite de régression ne tourne plus que sur `react`), tests dorés supprimés (leurs tables de cas restent dans les tests `node`), colonne `legacy` de `parite.md` gelée avec la date ; job `deploy` du workflow actif sur `main` (`BASE_PATH=/reservations-restaurants/`, artefact = `dist/client`) ; README réécrit (présentation, installation du script inchangée, développement, déploiement, retour arrière) ; `CLAUDE.md` à jour ; `e2e/smoke-production.spec.ts` (projet `production`, lecture seule, aucun clic sur un bouton d'envoi) ; description de la PR = checklist du § 7 avec les actions humaines dans l'ordre ; message aux collègues prêt à envoyer.
- **Actions humaines (propriétaire du dépôt), dans l'ordre** : (1) poser le tag `v1-final` sur `main` ; (2) Settings → Environments → `github-pages` → autoriser `main` ; (3) Settings → Pages → Source « GitHub Actions » **immédiatement avant** la fusion (obligatoire : en mode « branche », Jekyll ignore les chunks `_*.js`, R-04) ; (4) fusionner la branche d'intégration dans `main` ; (5) vérifier le déploiement (§ 7).
- **Dépendances** : P7 validée.
- **Critères d'acceptation** : `pnpm check`, build et E2E `react` verts ; `dist/client` sans `mockServiceWorker.js` ni code msw ; checklist du § 7 entièrement cochée ; E2E de production vert ; retour arrière répété une fois à blanc (dépôt de test ou fourche, même procédure).
- **Tests attendus** : E2E de production (chargement, copie locale, calendriers, ouverture d'un formulaire sans envoi).
- **Délégable à un agent** : partiellement : commit de bascule, workflow et README oui (1 session) ; tag, réglages Pages, environnement, fusion dans `main` et communication non.
- **Estimation** : 1 j-p, 1 session.
- **Risques propres** : cache de 10 min de Pages (anciens onglets), chunk introuvable dans un onglet resté ouvert, oubli d'un réglage (environnement, variable de dépôt), délai entre le changement de source et le premier déploiement (Pages continue de servir le dernier déploiement du mode « branche » jusqu'au déploiement par Actions).

---

## 6. Risques et pièges

### 6.1 Points où les rapports de recherche s'écartent des arbitrages

Les arbitrages de ce plan s'appliquent ; ces écarts sont signalés pour qu'aucune session ne reprenne par erreur la proposition d'un rapport.

| Rapport | Proposition du rapport | Arbitrage retenu |
| --- | --- | --- |
| `tanstack-start.md` § 4 | routes par restaurant (`/r1/$jour`, `/collegue/r1/$jour`), `?mois=` | page unique à deux colonnes, paramètres `r1`, `r2`, `r1vue`… (§ 3.2) |
| `tanstack-start.md` § 4, `react-architecture.md` § 2, `element-admin-reference.md` § 11.5 | copie locale lue dans un effet, un composant client ou un persisteur expérimental ; lecture anticipée jugée inutile | restauration **synchrone** avant le routeur et `<ScriptOnce>` conservé ; risque d'hydratation traité par le spike de P0 (R-01) |
| `react-architecture.md` § 10 | préproduction publiée sous `/v2/` (ancien et nouveau site assemblés par le workflow) ; retour arrière en relançant le workflow sur `v1-final` | arbitrage 15 : bascule directe sans préproduction, validation sur un build local ou l'artefact CI ; retour arrière par la source Pages (branche `rollback`) ou `git revert` (§ 7) |
| `tanstack-query.md` § 3.2 | nouveau format `{ v, savedAt, data }` et nouvelle clé `-v2` | même clé et même format `reservations-cache-v1` (invariant 2, compatibilité avec les copies des visiteurs habituels et avec un retour arrière) |
| `tanstack-query.md` § 8 | store de session en module simple (`useSyncExternalStore`) | Zustand 5 avec `subscribeWithSelector`, sans `persist` |
| `tanstack-query.md` § 2.4 | `staleTime: 30_000` | `180_000` (rattrapage au retour sans lectures en rafale, § 3.3) |
| `react-architecture.md` § 5 | Zod 4 classique | Valibot (poids, déjà choisi par element-admin) |
| `react-architecture.md` § 2 (i) et § 8 | impression dans une fenêtre ouverte au clic | impression dans le même document (§ 3.8) |
| `react-architecture.md` § 2 (d) | modification d'une réservation en état local | paramètre d'URL `editResa` (schéma de `09` § 1) |
| `react-architecture.md` § 7 | l'ancien `formatEuro` mettrait une espace normale ; textes inline et `textes.ts` par fonctionnalité | l'ancien code met bien U+00A0 (vérifié à l'octet, `spec/README.md` § 4.1) ; arbitrage 11 : `FormattedNumber` (`Intl`, U+00A0 avant €, U+202F au-delà de 999 €) et tous les textes en messages react-intl |
| `element-admin-reference.md` § 10 | react-intl, formatjs et Localazy « à écarter » (pas de localisation) | arbitrage 11 : react-intl / FormatJS **repris** pour les pluriels, montants et dates, langue unique, sans Localazy |
| element-admin (clone) | ids générés par empreinte (`enforce-id`), `selectordinal` interdit, traductions compilées chargées à l'exécution, extraction au format Crowdin | ids explicites par domaine, `selectordinal` autorisé (« 1er »), `defaultMessage` compilés en AST par le plugin (aucun fichier chargé), format d'extraction par défaut |
| `element-admin-reference.md` § 1.1 et § 10 | pas de `tsc` séparé (`typeCheck` d'oxlint suffit) | `tsc` **aussi** en CI (angles morts croisés mesurés dans `toolchain.md` § 2) |
| `element-admin-reference.md` § 11.5 | déconnexion propagée aux autres onglets, horloge en heure locale (`setHours`) | pas de propagation (D-26) ; horloge en heure de Paris |
| `element-admin-reference.md` § 8 | E2E servi par `vite preview` | serveur statique `scripts/serve-pages.ts` (`pnpm serve`) (`vite preview` fait du SSR avec Start) |
| `toolchain.md` § 5, `toolchain-files/` | alias `#/*` | alias `@/*` (element-admin, AppResaAristide ; motif interne par défaut d'oxfmt) |
| `toolchain-files/` (`vitest.config.ts`, `package.json`, `.github/workflows/ci.yml`) | `environment: "jsdom"` et un seul projet Vitest, jsdom et Testing Library en dépendances, script `preview`, versions en `^`, CI déclenchée sur `main` seulement et actions non épinglées | arbitrages 13 et 15, `save-exact` : P0 part de `spike-integration/` et applique la liste d'adaptations de P0 |
| `spike-integration/README.md` (conclusion du spike R-01) | repli « Router seul » recommandé (contenu à 103 ms, −13,5 kB gzip) ; à défaut, `defaultPendingMinMs: 0` et `onRecoverableError` qui ignore #418 | arbitrage 16 : Start conservé avec `pendingMinMs` par défaut (squelette ≤ 600 ms) ; `pendingMinMs: 0` seul interdit, `onRecoverableError` refusé ; Router seul en repli seulement si un bogue bloquant d'hydratation apparaît |
| `executabilite` (relecture) : `CHROMIUM_EXECUTABLE`, `.env.test` avec `TEST_DEPLOYMENT_ID` ; `faisabilite` : `createToastManager` | noms provisoires | `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, `https://script.google.com/macros/s/FAKE/exec`, `Toast.Provider limit={1}` (§ 2, § 3.1, § 3.5) |
| `ui-forms.md` § 3.2 | `useLayoutEffect` pour le focus du calendrier | focus dans le gestionnaire clavier + ref callback (0 effet) |
| `ui-forms.md` § 2.8 et § 6 | `AlertDialog` pour « Supprimer ce jour » | suppression en deux clics (`ConfirmButton`), note détaillée (D-21) |
| `appresaaristide-reference.md` § 5 | espace collègue à onglets, calendrier unique, « Ouvrir ce jour » dans la carte (sans sélecteur de date) | page et sélecteur de date conservés (pas de refonte) |
| `react-architecture.md`, `tanstack-query.md`, `tanstack-start.md`, `appresaaristide-reference.md` (extraits de code) | identifiants et chemins en français (`src/domaine/`, `useEtat`, `motDePasse`, `couverts`…) ; champs du script utilisés tels quels dans les composants | arbitrage 12 : code en anglais (glossaire de l'annexe E), champs du script traduits à la frontière de l'API (§ 3.3.6) |
| `react-architecture.md` § 8, `appresaaristide-reference.md` § 6 | composants testés avec Testing Library + jsdom (Vitest Browser Mode cité en option) ; pas de Storybook | arbitrage 13 : Vitest Browser Mode (Chromium), Storybook dont chaque story est un test avec axe, faux script msw unique |
| `react-architecture.md` § 8 | tests de caractérisation limités aux fonctions pures de l'ancien code (dans jsdom) | arbitrage 14 : en plus des tests dorés des fonctions pures (P2), une suite Playwright de régression écrite contre l'ancien site avant la réécriture (P1) |
| `toolchain.md` § 5 | `exactOptionalPropertyTypes: true` (AppResaAristide et element-admin le désactivent) | `true` au départ ; passer à `false` seulement si les types de Base UI ou TanStack Form l'imposent, décision notée dans `CLAUDE.md` |

### 6.2 Risques consolidés et parades

| # | Risque ou piège | Parade | Phase |
| --- | --- | --- | --- |
| R-01 | **Hydratation de la coquille Start** : la coquille prérendue contient le squelette, alors que le premier rendu client peut sortir de la copie locale. Mesuré par le spike (§ 2.1) : avec `pendingMinMs` par défaut, contenu à 594 ms, aucune erreur ; avec `pendingMinMs: 0`, erreur React #418 à chaque chargement (issues #8473, #6455), DOM prérendu jeté. | **Tranché (arbitrage 16)** : `pendingMinMs` par défaut, squelette ≤ 600 ms accepté (E-47) ; `pendingMinMs: 0` seul interdit ; aucun `onRecoverableError` ; racine neutre (aucun lien actif, rien qui dépende de l'URL), route `$.tsx` ; `e2e/hydration.spec.ts` (S4) sur chaque build ; essai non bloquant de barrière client-only en P0 ; repli « Router seul » (§ 2.1) seulement en cas de bogue bloquant d'hydratation. | P0, P4, P7 |
| R-02 | Le `loader`, le `beforeLoad` et le code de niveau module de la racine, de `router.tsx` et de leurs imports s'exécutent **au build** dans Node : `localStorage` au niveau module fait échouer le prérendu (`ReferenceError: window is not defined`, mesuré) ; une donnée chargée là serait figée dans la coquille ; une lecture du stockage dans un `try/catch` avale l'erreur, donc le build ne prouve pas la garde. | Garde `typeof window` dans `getRouter()` et test `node` de `getRouter()` sans `window` ; aucun loader à la racine ; garde de session sur `/collegue` seulement ; aucun appel au script pendant le build. | P0 |
| R-03 | `vite preview` d'un projet Start fait du **vrai SSR** : il ne reflète pas Pages. | `scripts/serve-pages.ts` (`pnpm serve`) pour la prévisualisation et l'E2E ; consigne dans `CLAUDE.md`. | P0 |
| R-04 | En mode « branche », **Jekyll** ignore les fichiers commençant par `_` (chunks `_app-xxxx.js`) ; `upload-pages-artifact` v4+ exclut les fichiers cachés. | Source Pages « GitHub Actions » (pas de Jekyll), passée juste avant la fusion de P8 et obligatoire ; `.nojekyll` inoffensif en plus ; aucun fichier caché nécessaire dans l'artefact. | P8 |
| R-05 | Pages sert tout avec `Cache-Control: max-age=600`, non réglable : un `index.html` ancien peut rester 10 min. | Assets hachés ; prévoir 15 min dans la checklist ; pas de service worker. | P8 |
| R-06 | Après un déploiement, un onglet ouvert demande un chunk disparu (il reçoit le HTML de la 404). | Rechargement automatique unique du routeur (`lazyRouteComponent`) et écouteur `vite:preloadError` (garde en `sessionStorage`) pour les `import()` manuels. | P4 |
| R-07 | **CORS d'Apps Script** : tout en-tête non simple déclenche un pré-vol `OPTIONS` que le script ne gère pas. | `GET` sans en-tête ; `POST` en `Content-Type: text/plain;charset=utf-8` ; jamais `application/json`, `redirect: 'manual'` ni `mode: 'no-cors'` ; test unitaire sur les en-têtes envoyés. | P2 |
| R-08 | Le script répond `302` (le navigateur suit en `GET`) ; un déploiement réglé sur « compte Google » redirige vers une page de connexion (erreur CORS permanente). | `redirect: 'follow'` (défaut) ; `preconnect` vers `script.googleusercontent.com` ; README : déploiement « Tout le monde ». | P2, P8 |
| R-09 | Pages d'erreur HTML de Google : sans CORS → `TypeError` (indiscernable d'une coupure) ; avec CORS → `SyntaxError` au `json()`. | Les deux deviennent `ServiceError` ; message selon `navigator.onLine` ; nouvel essai pour les lectures seulement. | P2 |
| R-10 | Lenteur du script (démarrage à froid parfois > 10 s), pas d'heure serveur. | Lecture anticipée, copie locale, lecture doublée, délai de 30 s par lecture ; heure de Paris côté client ; D-15 pour les écritures. | P2, P4 |
| R-11 | Interrompre un `POST` n'annule pas l'écriture ; un rejeu automatique créerait des doublons. | Mutations `retry: false`, `networkMode: 'always'`, aucun délai d'expiration ; `requestId` conservé pour le nouvel essai manuel. | P2, P4 |
| R-12 | React 19 et le routeur remontent la CSS (`precedence`) et les `modulepreload` **avant** le script inline (confirmé par le spike) : la lecture anticipée attend la CSS (inverse de l'ordre actuel, E-49). Un `preconnect` sans `crossorigin` ouvre une connexion inutile pour un `fetch` CORS. | Accepté (CSS hachée en cache aux visites suivantes, lecture toujours partie avant le bundle) ; `crossOrigin: 'anonymous'` ; option mesurée seulement si besoin : `<link rel="preload" as="fetch">` (sans `since`). Avec le repli Router seul, le script repasse avant la CSS dans `index.html`. | P4 |
| R-13 | **Dossier produit non ignoré** : sans `.gitignore`, oxlint et tsgolint analysent `node_modules` (processus tué après 60 s) ; confirmé par le spike : un dossier de builds non ignoré (`out/`, 70 fichiers) a fait tuer oxlint et échouer `oxfmt --check`. | `.gitignore` livré dès le premier commit de P0 ; tout dossier produit (`dist/`, `storybook-static/`, `playwright-report/`, `test-results/`, `coverage/`) à la fois dans `.gitignore` et dans les `ignorePatterns` d'oxlint et d'oxfmt. | P0 |
| R-14 | Règles `jsPlugins` qui exigent les types **silencieusement inactives** (`@tanstack/query/no-void-query-fn`) ; `plugins` remplace la liste par défaut ; `react/rules-of-hooks` est en `pedantic` ; `no-unnecessary-condition` et `prefer-optional-chain` en `nursery`. **8 règles en conflit avec les extraits de ce plan** (mesuré) : `unicorn/max-nested-calls` (schémas `v.fallback(v.optional(v.picklist(…)))`), `eslint/no-redeclare` (constante et type de même nom), `eslint/curly` (`if (x) return x;`), `typescript/promise-function-async` (loader), `typescript/only-throw-error` (`throw redirect(…)`), `react/no-children-prop` (`<ScriptOnce children>`), `eslint/no-underscore-dangle` (`_duplicate`, `_emailStatus`, `_bookingResult`, `__EARLY_FETCH__`), `eslint/require-unicode-regexp` (regex des search params). | Configuration de `spike-integration/` : `max-nested-calls` et `no-redeclare` désactivées (tsc vérifie), `curly: ["error", "multi-line"]`, `no-underscore-dangle` avec `allow` des 4 noms, `only-throw-error` avec `allow` de `Redirect` et `NotFoundError` de `@tanstack/router-core` ; extraits corrigés (`async` sur le loader, regex en `/u`, `<ScriptOnce>{…}</ScriptOnce>`, schémas nommés `XSchema`) ; overrides par motif de fichiers (P0) ; monter `oxlint` et `oxlint-tsgolint` ensemble ; `typescript/no-deprecated` en erreur (attrape `ensureQueryData`, `FormEvent`, `useStore`) ; règles `formatjs/*` non typées, donc actives (observées dans le spike). | P0 |
| R-15 | **Budget JS** : chemin initial mesuré à 166,9 kB gzip sur le projet d'essai (Start, page d'essai qui charge `Dialog`, `NumberField` et un formulaire dès le départ) ; Start coûte ≈ 13,5 kB gzip (seroval, hydratation) ; TanStack Form embarque `@tanstack/devtools-event-client` en production ; une page unique n'est pas découpée par route ; `validateSearch` reste dans le chunk d'entrée. | Mesure en CI dès P0 (S3) ; formulaires publics, mode collègue et impression chargés à la demande ; valibot (pas zod) ; imports Base UI par composant ; alias `no-parser` de FormatJS (−7,4 kB) ; si dépassement : `rollup-plugin-visualizer`, report du `NumberField` ou du `Collapsible` hors du chemin initial. | P0, P4 |
| R-16 | **Base UI** : libellés anglais codés en dur (`Increase`, `Decrease`, `Number field`), portails qui perdent l'accent, `Field.Error` non annoncé, `ToggleGroup` qui se désélectionne, `NumberField` qui renvoie `null` et refuse les `datalist`, `Form` de Base UI qui ignore le prop `invalid`, portails sous iOS. | Enveloppes uniques de `ui/` (libellés français, `className` d'accent sur les portails, focus sur le premier champ invalide, valeur vide ignorée, `null` → 0, `PriceField` texte) ; pas de `Form` Base UI ; `isolation: isolate`, `body { position: relative }`, champs ≥ 16 px. | P3 |
| R-17 | **TanStack Form** : `handleSubmit` relance l'erreur d'`onSubmit` ; erreurs Standard Schema = objets ; `defaultValues` lues au montage seulement ; envoi arrêté avant la validation des champs non touchés ; erreur croisée affichée au 2e envoi seulement ; `useStore` déprécié ; `children=` en prop. | `try/catch` dans `onSubmit` ; `errorText()` ; formulaire monté avec une `key` (jour, ouverture) ; `canSubmitWhenInvalid: true` et `form.validate('change')` avant `handleSubmit()` (AppResaAristide) ; `useSelector` ou `form.Subscribe` avec sélecteur ; enfant en JSX. | P3, P4 |
| R-18 | **TanStack Query** : un minuteur par observateur (`refetchInterval` partagé = lectures en double) ; `retry` dans `queryOptions` passe avant les défauts de test ; `queryClient.query()` force `retry: false` si `retry` n'est pas défini ; `ensureQueryData`, `prefetchQuery`, `fetchQuery` dépréciés ; `queryFn` qui renvoie `undefined` ; `select` qui renvoie des `Map` ; secret dans une clé ; variables de mutations (noms) gardées 5 min ; mutations mises en pause hors ligne. | `<AutoRefresh/>` unique ; `retry` dans les défauts du client ; `query()` dans les loaders ; `no-deprecated` ; relecture sans `since` dans le cas limite ; résultats en objets et tableaux, index en `WeakMap` ; `id` de session dans la clé ; `getMutationCache().clear()` à la déconnexion ; `networkMode: 'always'`. | P2, P4, P5 |
| R-19 | **Search params** : `?reserver=1` ou `?connexion=1` sont des nombres (format « JSON d'abord ») ; « aujourd'hui » comme valeur par défaut rendrait `validateSearch` impur ; `location.pathname` est sans basepath ; un `<Link>` actif reçoit `aria-current="page"`. | Liens écrits avec `search={{ … }}` et `v.fallback` ; « aujourd'hui » résolu dans le composant ; jamais de base en dur (`Link`, `to`, `import.meta.env.BASE_URL`) ; cases du calendrier en `<button>`. | P4 |
| R-20 | **Dates et formats** : `Intl.NumberFormat` met U+202F et U+00A0 ; Temporal absent de Safari stable ; `new Date('YYYY-MM-DD')` est en UTC ; changements d'heure ; ICU variable selon les moteurs. | format `euro` partagé, jamais d'espace codée en dur autour d'un montant ; chaînes ISO + arithmétique UTC ; `parisDate` / `parisHour` ; tests autour des changements d'heure et sous deux fuseaux ; comparaisons avec `\u00A0` explicite. | P2 |
| R-21 | **Compatibilité du format v1** : les visiteurs qui reviennent après la bascule ont une copie `reservations-cache-v1` écrite par l'ancien site (parfois sans etag, après une session collègue) ; un retour arrière ferait relire à l'ancien site les copies écrites par le nouveau. | Format v1 lu et écrit à l'identique, conversion vers le modèle anglais seulement en mémoire (§ 3.3.6) ; test doré avec `loadCache` ; lecture tolérante (etag facultatif) ; aucune nouvelle clé ; `reservations-textes` jamais écrite par le nouveau site. | P2, P8 |
| R-22 | Navigateurs anciens (tablettes, vieux iPad) : `AbortSignal.any` / `timeout` (Safari 17.4), `crypto.randomUUID` (Safari 15.4), `:has()` (Safari 15.4) ; cible de build Vite par défaut `safari16.4`. | `anySignal()` et `timeoutSignal()` maison ; `newRequestId()` avec repli de `02` § 5.3 ; inventaire des appareils de l'établissement en P7 ; `build.target` abaissé si nécessaire. | P2, P7 |
| R-23 | React Compiler Rust expérimental ; `oxc-transform-react` 0.152 incompatible avec plugin-react 6.1. | Épingler `~0.145.0` ; plan B du § 2.1 ; les règles du compilateur (oxlint) restent actives dans tous les cas. | P0 |
| R-24 | TypeScript 7 : `baseUrl` supprimé, `types` vaut `[]` par défaut, pas d'API JS ; `@types/react` 19.3 déprécie `FormEvent`. | `paths` sans `baseUrl`, `types: ["vite/client"]` ; `SubmitEvent` / `ChangeEvent` ; `@typescript/typescript6` seulement pour un outil qui l'exigerait. | P0 |
| R-25 | Zustand : store singleton abonné plusieurs fois (tests, HMR) ; composant abonné au store entier ; `set` à chaque `pointermove`. | `startBackgroundTasks` idempotent (arrête l'instance précédente) et désabonnement gardé ; sélecteur obligatoire (revue) ; activité notée dans une variable de module. | P2 |
| R-26 | Minuteurs ralentis ou gelés (onglet caché, veille, retour par le cache de navigation) : déconnexion tardive, cut-off ou minuit manqués. | Comparaison d'horodatages + revérification sur `visibilitychange` et `pageshow` ; horloge recalculée au retour. | P2 |
| R-27 | Impression : boîtes de marge `@page` seulement dans Chromium 131+, `@page` global, polices pas encore chargées, Safari iOS. | Page nommée `list` ; attente de `document.fonts.ready` ≤ 2 s ; essai sur les postes du lycée (P7) ; « Page x / y » absent hors Chromium, accepté. | P6 |
| R-28 | Outils de test : navigateur nécessaire aux tests de composants (Vitest Browser Mode), à Storybook et à l'E2E ; Chromium des sessions cloud (r1194) différent de celui de Playwright 1.63 (r1243) ; `mockServiceWorker.js` qui partirait en production ; msw 3 : l'option `onUnhandledRequest` n'existe plus (`onUnhandledFrame`), `msw init` sans `--save` bloque, peer `msw ^2` de `@vitest/mocker`, `setTimeout` plus modifié (avancer les faux minuteurs) ; plugin `storybookTest` qui remplace `test.include` ; Vitest et Storybook ne doivent pas charger le plugin Start ; `routeTree.gen.ts` absent fait échouer `tsc`. | `executablePath` lu dans `PLAYWRIGHT_CHROMIUM_EXECUTABLE` par `vitest.config.ts` et `playwright.config.ts`, jamais `playwright install` en session ; CI : `pnpm exec playwright install --with-deps chromium` ; `mockServiceWorker.js` retiré de `dist/client` et vérifié (§ 7) ; `worker.start({ onUnhandledFrame: "error" })`, `msw init public/ --save`, `msw: "3"` dans `allowedVersions` ; projet Vitest `storybook` séparé ; `vitest.config.ts` et `.storybook/vite.config.ts` sans Start ; `routeTree.gen.ts` commité et contrôlé (`git diff --exit-code` après build). | P0, P3, P7 |
| R-29 | Pages : passer la source en « GitHub Actions » arrête le déploiement par branche de `main` ; l'environnement `github-pages` peut refuser le déploiement de `main` s'il n'est pas autorisé ; un déploiement depuis la branche d'intégration publierait le nouveau site trop tôt. | Aucun réglage Pages avant P8 ; job `deploy` limité à `main` ; en P8, environnement autorisé puis source changée **juste avant** la fusion, vérifications du § 7 aussitôt ; `main` gelé pour l'ancien site pendant la migration (correctif urgent : sur `main`, reporté dans `legacy/`). | P0, P8 |
| R-30 | La validation par les collègues (build local ou artefact CI pointé sur le vrai script) écrit dans la **vraie** feuille et envoie de vrais e-mails. | Le dire aux collègues ; utiliser des jours de test supprimés ensuite, ou des réservations réelles assumées. | P7 |
| R-31 | Code collègue ou formulaires chargés à la demande : bref écran d'attente à la première ouverture. | Préchargement au survol, au focus et pendant l'inactivité du navigateur ; `pendingComponent` discret. | P4, P5 |
| R-32 | **react-intl / FormatJS** : ids en double, apostrophes et accolades ICU, `<FormattedMessage>` dans un attribut, HTML dans un message, espaces normalisées (dont U+00A0) si `preserveWhitespace` manque, `translations/fr.json` pas à jour, « ⚠ » refusé par `no-emoji`. | `formatjs extract --throws` + `git diff --exit-code` en CI ; ids typés (`FormatjsIntl`) ; `intl.formatMessage` pour les attributs ; balises de `defaultRichTextElements` seulement ; `preserveWhitespace: true` partout ; tests de chaînes exactes ; icône SVG pour « ⚠ » (§ 3.10). | P0, P2 |
| R-33 | **Requête de test vers le vrai script** : `legacy/index.html` contient l'URL `/exec` réelle ; une requête oubliée par les handlers (nouvelle action, redirection vers `script.googleusercontent.com`) écrirait dans la vraie feuille et enverrait de vrais e-mails ; un agent qui veut « voir la page » mettrait l'URL réelle dans un `.env`. | Isolation réseau en premier dans `e2e/fixtures.ts` (tout ce qui n'est pas `localhost` est avorté, polices Google comprises) ; handlers sur `…/macros/s/*/exec` pour tout identifiant ; msw en mode strict (`onUnhandledFrame: "error"`) dans Vitest et Storybook ; `.env.test` et build E2E sur l'URL factice ; `pnpm dev` sur le faux script ; URL réelle seulement dans `.env.real.local` du responsable. | P0, P1 |
| R-34 | **Messages non précompilés** : un descripteur de message rangé dans une variable ordinaire s'affiche en ICU brut en production (alias `no-parser`) alors que `vite dev` l'affiche bien ; `\u00A0` dans un attribut JSX entre guillemets n'est pas interprété. | Deux formes seulement (`<FormattedMessage>` littéral, `defineMessages`) ; `onError` → `console.error` ; console stricte en E2E sur le build de production ; `defaultMessage={"…"}` entre accolades ; `! grep -F '\\u00A0' translations/fr.json` en CI (§ 3.10). | P0, P4 |
| R-35 | **Sessions parallèles** : deux sessions qui modifient le même fichier partagé, le lockfile ou un fichier généré entrent en conflit à chaque fusion ; une interface non figée produit deux implémentations incompatibles. | Politique de branches, propriétaires des fichiers partagés, vagues et interfaces à figer (§ 5.0) ; fichiers générés régénérés, jamais fusionnés à la main ; au plus trois sessions simultanées. | P1 à P6 |
| R-36 | **Tests de composants qui focalisent un champ** : un `<input>` focalisé dans une page rendue par `renderRoute` (coquille complète dans un conteneur de test) bloque l'onglet Vitest ; un `setTimeout(0)` ou un minuteur de dévoilement de `<Suspense>` attend une horloge en pause dans l'E2E. Même blocage avec une page `renderRoute` qui contient des champs déjà remplis (P5 (e)). | Tests de formulaires avec `src/test/column-page.tsx` ; notifications de Query en microtâche ; formulaires sans `lazy()` (§ 3.3, P4) ; relevés par P4 (b) et P4 (c). | P4, P5 |

---

## 7. Checklist de bascule GitHub Pages

Reprise et complétée de `recherche/react-architecture.md` § 10, **sans** sa préproduction publiée ni son retour arrière par relance du workflow (arbitrage 15, § 6.1). À cocher dans la PR de bascule.

**Avant (fin de P7)**
- [ ] Accord écrit des collègues après validation sur un build local ou l'artefact CI (S9) ; matrice de parité complète ; S1 à S8 verts.
- [ ] Job `deploy` du workflow prêt sur la branche (déclenché par un `push` sur `main` seulement).
- [ ] Variable de dépôt `VITE_APPS_SCRIPT_URL` = URL `/exec` du déploiement actuel (même déploiement, déploiement « Tout le monde ») ; bandeau D-05 absent du build validé par les collègues.
- [ ] Pas de `CNAME` (site de projet) : `BASE_PATH=/reservations-restaurants/` ; si un domaine arrive, `public/CNAME` et `BASE_PATH=/`.
- [ ] Procédure de retour arrière écrite dans le README et répétée à blanc.
- [ ] Prévenir les collègues (date, « même usage, nouveau rendu », session collègue toujours perdue au rechargement).

**Bascule (P8, actions humaines dans l'ordre)**
- [ ] (1) Tag `v1-final` posé sur `main` (dernier commit de l'ancien site).
- [ ] (2) Environnement `github-pages` : `main` autorisé.
- [ ] (3) Source Pages passée en « GitHub Actions » **immédiatement avant** la fusion (obligatoire : Jekyll et chunks `_*.js`, R-04).
- [ ] (4) Fusion de la branche d'intégration dans `main` (commit de bascule compris : `legacy/` supprimé, job `deploy` actif) ; artefact = `dist/client` (`index.html` + `404.html` + `assets/`).
- [ ] (5) Déploiement vert ; `https://thegaudis.github.io/reservations-restaurants/` sert le nouveau site après au plus 10 min de cache (`max-age=600`) ; `…/index.html` redirige vers `/` ; un lien profond (`…/collegue`) sert `404.html` puis l'appli.
- [ ] `localStorage` : une copie `reservations-cache-v1` écrite par l'ancien site est relue au premier affichage (affichage immédiat pour les visiteurs habituels) ; `reservations-textes` lue en secours seulement.
- [ ] Aucun service worker n'existait : rien à désinscrire ; n'en ajouter aucun (`mockServiceWorker.js` de msw absent de `dist/client`, aucun code msw dans les chunks : `grep -rl "setupWorker\|mockServiceWorker" dist/client` vide).
- [ ] E2E de production en lecture seule vert (`e2e/smoke-production.spec.ts`).
- [ ] Vérification manuelle : une vraie réservation R1 et une commande R2 (puis suppression par un collègue), connexion collègue, impression.

**Après**
- [ ] README à jour (installation : `pnpm install`, `pnpm build`, workflow Pages ; section Apps Script inchangée ; retour arrière).
- [ ] `CLAUDE.md` à jour ; ce plan marqué « terminé » ; `docs/spec/` conservée comme référence.
- [ ] Un mois après : retirer la lecture de secours de `reservations-textes` et supprimer cette clé au démarrage (dans `queries/local-cache.ts`, pas dans un effet).
- [ ] Transmettre l'annexe B au responsable du script.

**Retour arrière (moins de 15 min, cache compris)** : repasser la source Pages en mode « branche » (« Deploy from a branch », racine) sur une branche `rollback` créée depuis le tag `v1-final` (Pages ne sert pas un tag directement), ou faire `git revert -m 1` de la fusion sur `main` puis repasser la source en mode « branche » sur `main` (le revert retire aussi le workflow, qui ne déploierait plus rien) ; l'ancien site est republié à la racine ; la copie locale reste compatible (même format) ; aucune action côté script.

---

## 8. Annexes

### Annexe A — Correspondance fichiers actuels → modules cibles

| Actuel | Fonctions principales (`00` § 3 et § 4) | Modules cibles |
| --- | --- | --- |
| `index.html` (script du `<head>`) | `APPS_SCRIPT_URL`, `CACHE_KEY`, `CACHE_MAX_AGE`, `earlySince`, `stateUrl`, `earlyGet` | `config.ts` (`VITE_APPS_SCRIPT_URL`), `domain/constants.ts`, `api/early-fetch.ts`, `routes/__root.tsx` (`<ScriptOnce>`, `head()`, `preconnect`) |
| `index.html` (corps) | en-tête, colonnes, pied, `#toast`, `#loader`, squelettes | `features/page/*`, `ui/feedback/*` ; le voile disparaît (§ 4.2) |
| `js/donnees.js` | `state`, `saveCache` / `loadCache`, `renderTexts` / `saveTexts` | cache Query `['state', …]`, `queries/local-cache.ts`, `features/page/Header.tsx` |
| | `hedgedRead`, `apiGet`, `postJson`, `apiPost`, `fetchAdminState`, `adminSessionExpired`, `writeSeq`, `adoptBookingState` | `api/transport.ts`, `api/hedged-read.ts`, `api/state.ts`, `api/actions.ts`, `queries/state.ts`, `queries/client.ts` (`onError`), `mutations/*` (`cancelQueries` + `setQueryData`) |
| | `withTicketFlags`, `plainName`, `withTicketMark`, `isTicket`, `flagTicket` | `api/schemas.ts` (traduction vers le modèle anglais, `voucher` déduit, transformation idempotente), `api/actions.ts` (`withVoucherMark` à l'envoi), `queries/local-cache.ts` (`Ticket` dans la copie v1), `domain/vouchers.ts` |
| | `remainingR1`, `remainingItem`, `itemsR2`, `idx`, `capacityClass`, `dayStatusR1/R2`, `sumBy` | `domain/capacity.ts` |
| | `r2Amounts`, `amountsText`, `itemAmountText`, `itemPriceText`, `ticketsText` | `domain/pricing.ts` (nombres) + `intl/amounts.ts` (textes) |
| | `dayHasTicket`, `serviceMode`, `r2OrdersClosed`, `r2ClosedMsg`, `R2_CUTOFF_HOUR` | `domain/vouchers.ts`, `domain/cutoff.ts`, `intl/common-messages.ts` (message de clôture) |
| | `loadAll`, `showLoadError`, `retryLoad`, `setBusy` / `clearBusy`, `showLoader` / `hideLoader` | `routes/*` (`loader`, `errorComponent`), `features/page/LoadErrorBox.tsx`, `ui/form/SubmitButton.tsx`, `ui/button/*` (`aria-busy`) |
| `js/outils.js` | `toISO`, `todayISO`, `addDaysISO`, `mondayOf`, `calState` | `domain/dates.ts`, `domain/paris.ts`, `background/clock.ts`, URL (`r1`, `r2`, `r1vue`…) |
| | `formatDate`, `formatEuro`, `plural`, `dash`, `gaugeStyle` | `intl/dates.ts`, format `euro`, pluriels ICU, messages (`intl/`), `domain/gauge.ts` |
| | `showToast` | `ui/feedback/toast.ts` (gestionnaire global) + `ui/feedback/Toaster.tsx` |
| | `confirmClick`, `disarm` | `ui/button/ConfirmButton.tsx` |
| | `checkFields`, `fieldError`, `blockError`, `markInvalid`, `linkLabels`, `focusFirstError`, `emailError`, `contactFieldHtml` | `ui/form/*` (Base UI `Field` + TanStack Form), `domain/validation.ts` |
| `js/calendrier.js` | `buildWeekCells`, `buildMonthCells`, `weekLabel`, `monthLabel`, `keyTargetIso`, `calKey` | `domain/dates.ts`, `intl/dates.ts`, `ui/calendar/CalendarGrid.tsx` |
| | `navCal`, `setCalMode`, `jumpToday`, `selectDate`, `pickDate`, `calTransition` | `domain/navigation.ts`, `features/calendar/RestaurantCalendar.tsx`, option `viewTransition` du routeur |
| | `renderDetailR1`, `renderDetailR2`, `emptyDayCardHtml`, `menuBlockHtml`, `menuListHtml`, `bookingLine` | `features/r1/DayCardR1.tsx`, `features/r2/DayCardR2.tsx`, `features/r2/DishRow.tsx`, `features/staff/BookingRow.tsx` |
| `js/reservation.js` | `openBookingR1`, `openBookingR2Day`, `closeBooking`, `bookingFormHtml`, `bookingFormMultiHtml`, `countsFieldsetR1Html`, `updateR1PriceLive`, `updateR2PriceLive`, `setServiceMode`, `setMultiQty` | `features/r1/BookingFormR1.tsx`, `features/r1/SeatCountersR1.tsx`, `features/r2/OrderFormR2.tsx` (totaux par `form.Subscribe`) |
| | `submitBookingR1`, `submitBookingR2Multi`, `handleDuplicate`, `emailWarning`, `newRequestId`, `orderAmounts`, `priceR1` | `mutations/bookings.ts`, `domain/bookings.ts`, `domain/pricing.ts`, `api/request-id.ts` |
| | `editBookingFormR1Html`, `editBookingFormR2Html`, `readEditIdentity`, `editIdentityRules` | `features/staff/EditBookingFormR1/R2.tsx`, `features/booking/IdentityFields.tsx` |
| `js/collegue.js` | `renderModeBox`, `chooseMode`, `tryLogin`, `togglePwdVisibility`, `logoutAdmin`, `armInactivityTimer` | `features/page/ModeSwitch.tsx`, `mutations/login.ts` (`useLogin`), `session/session.ts`, `background/inactivity.ts`, `background/logout.ts`, `queries/purge.ts` |
| | `renderDashboard`, `renderSettings`, `saveSettings` | `features/staff/TomorrowPanel.tsx`, `features/staff/SettingsPanel.tsx` |
| | `dateFieldHtml`, `datePickerHtml`, `dpKey`, `renderAdminFormR1/R2`, `addDayR1/R2`, `draftItems`, `syncTicketPrice` | `features/staff/OpenDatePicker.tsx` (`ui/calendar/DatePickerPopover.tsx`), `features/staff/OpenDayFormR1/R2.tsx` (tableau de TanStack Form) |
| | `openEditDayR1`, `submitEditDayR1`, `adminDelete`, `deleteDay…`, `deleteBooking…`, `deleteItemR2`, `itemFormHtml`, `submitAddItemR2`, `submitEditItemR2`, `openAddBooking`, `submitAddBookingR1/R2`, `afterAddBooking`, `editMaxR1` | `features/staff/*`, `mutations/staff/*`, `mutations/bookings.ts` |
| `js/impression.js` | `printDoc`, `printTable`, `printTotal`, `openPrint`, `PRINT_TOKENS`, `PRINT_CSS`, `printDayR1/R2`, `printTomorrowSummaryR1/R2`, `showTomorrowSummary`, `getTomorrowISO` | `ui/print/*`, `styles/print.css`, `features/print/*`, `domain/print.ts`, `features/staff/TomorrowPanel.tsx` ; `PRINT_TOKENS` supprimé |
| `js/interface.js` | `confirmationHtml`, `closeConfirmation`, `ICONS`, `segGroup`, `renderPriceSuggestions`, `enterOnce`, `leaveThen`, `cardEnter`, `popSeg` | `features/booking/BookingSummary.tsx`, `ui/icons.tsx`, `ui/toggle/ViewToggle.tsx`, `features/staff/PriceSuggestions.tsx` ; animations par CSS (`data-starting-style`, `key`) |
| `js/main.js` | `render`, `renderAll`, `captureUi`, `restoreUi`, `PARTS`, `resetFields`, `autoRefresh`, `scheduleR2Cutoff`, easter egg | supprimés (React) ; `<AutoRefresh/>` ; `background/clock.ts` ; easter egg conservé dans `features/page/Header.tsx` (D-01) ; démarrage dans `router.tsx` |
| `design-system.css` | jetons, thèmes, composants | `styles/tokens.css`, `styles/base.css`, CSS Modules de `ui/` |
| `app.css` | mise en page, calendrier, fiches, formulaires | CSS Modules de `features/` et `ui/calendar/` |
| `Code.gs` | backend | **inchangé** |

### Annexe B — À signaler au responsable de `Code.gs`

Aucune de ces évolutions n'est nécessaire à la migration : le nouveau frontend contourne côté client les limites qui peuvent l'être (b-1 à b-5, b-8 à b-10) ; b-6, b-7, b-11 et b-12 sont seulement signalés. Elles renforceraient la sécurité ou la cohérence.

| # | Constat | Contournement côté client | Évolution suggérée du script |
| --- | --- | --- | --- |
| b-1 | Réservations publiques sans authentification ; seuls quantités et places sont contrôlées (ni cut-off, ni jour passé, ni mode « sur place », ni appartenance des plats à la date, ni nom, classe ou e-mail). | Tous les contrôles dans les formulaires. | Revérifier sous verrou le cut-off de 10 h et le jour passé (fuseau du script), le mode « sur place » les jours de ticket, l'appartenance des plats à la date, la présence du nom, de la classe et d'un e-mail valide. |
| b-2 | Aucune heure serveur exposée. | Heure de Paris côté client (D-12). | Renvoyer `serverTime` (ou la date du jour) dans l'état public. |
| b-3 | Supprimer un plat laisse ses réservations orphelines, sans e-mail ; supprimer un jour n'avertit personne. | Note détaillée avant suppression, orphelines filtrées (D-21). | Supprimer ou archiver les réservations du plat ; envoyer les e-mails d'annulation lors des suppressions de jour et de plat. |
| b-4 | Restants négatifs possibles (`addDayR1` écrase la capacité ; `addItemR2` / `editItemR2` ne contrôlent pas le stock). | Contrôles avant envoi (D-19). | Refuser une capacité ou un stock inférieur au déjà réservé, comme `editDayR1`. |
| b-5 | Ticket codé dans le nom du plat ; les e-mails comptent un plat au ticket comme « sans prix » et ignorent « un ticket par commande ». | Codage conservé à l'identique. | Colonne `Ticket` dans `R2_Items` ; totaux des e-mails alignés sur la règle « un ticket par commande ». |
| b-6 | Aucune limitation des essais de mot de passe. | Aucun (D-25 non retenue : signalement seulement). | Compteur d'échecs dans `CacheService` et attente croissante côté script. |
| b-7 | État complet renvoyé à chaque lecture collègue (sans etag) ; ajout manuel = deux allers-retours. | Accepté (actualisation toutes les 3 min seulement). | Etag pour `getAdminState` ; état complet renvoyé par `addBookingR1` / `addBookingR2Multi` quand un mot de passe valide est fourni. |
| b-8 | Prix `0` enregistré comme « sans prix » (`price \|\| ''`). | Prix 0 refusé (D-22). | Distinguer `0` et vide. |
| b-9 | Regex e-mail plus permissive que celle du client ; `Timestamp` tronqué à la date ; noms par défaut `Restaurant 1/2` différents de ceux du client. | Défauts client alignés sur la configuration réelle. | Même regex ; heure de réservation transmise ; défauts serveur `Restaurant Pédagogique` / `Aristide`. |
| b-10 | `editBookingR1` ignore `qte` / `prixTotal` ; `setConfigField` sans liste blanche ; `editDayR1` sur une date absente réussit sans effet ; repli `checkPassword` (ancien script). | Corps identiques à l'ancien site (`qte` et `prixTotal` envoyés à `editBookingR1`, ignorés par le script, `02` § 4.7) ; repli `checkPassword` non repris : P0 vérifie que le script déployé répond à `getAdminState` (action humaine), sinon le script est mis à jour avant P5. | Liste blanche des clés ; erreur « Ce jour n'existe plus. » dans `editDayR1` ; retirer `checkPassword` et `addBookingR2` (obsolète). |
| b-11 | Rappels envoyés par ligne (une commande de 3 plats = 3 e-mails) ; modification manuelle dans Sheets visible vers 6 h si faite le soir. | — | Regrouper les rappels par contact et par jour ; documenter `viderCache()` pour les gestionnaires. |
| b-12 | Pas de « Modifier ce jour » pour R2, mais `addDayR2` avec `items: []` met à jour note, thème et « ouvert par ». | Aucun (D-09 non retenue : signalement seulement). | Action `editDayR2` explicite. |
| — | Les dates des e-mails ont « 1er », désormais aussi à l'écran (arbitrage 11). | — | Aucune (cohérent). |

### Annexe C — `CLAUDE.md` du futur projet

Version validée après la relecture d'exécutabilité ; P0 (c) la recopie telle quelle, en complétant seulement les commandes réelles. Environ 130 lignes : au-delà de 150, les agents survolent.

````markdown
# Réservations — restaurants pédagogiques (frontend React)

Site de réservation des deux restaurants pédagogiques du lycée Aristide Briand. Frontend React 19 + TanStack Start
(mode SPA) publié sur GitHub Pages ; backend Google Apps Script (`Code.gs`) et Google Sheets, inchangés.
Les mainteneurs sont des enseignants : code simple, explicite, documenté.

## Références
- Comportements et textes : `docs/spec/` (fait foi). Renvois « 04 § 5.2 » ; points a-*, b-*, c-* : `docs/spec/README.md` § 3.
- Architecture et décisions : `docs/migration/PLAN.md` (§ 3 architecture, § 4.1 décisions, § 4.2 écarts E-xx, § 6 pièges,
  annexe E glossaire, annexe F textes nouveaux).
- Justifications techniques : `docs/migration/recherche/` (propositions contraires aux arbitrages : PLAN § 6.1) ;
  configuration de référence : `docs/migration/recherche/spike-integration/`.
- Parité : `docs/migration/parite.md` (scénarios REG-xx). Sessions : `docs/migration/lancements.md`, journaux dans
  `docs/migration/journal/`.

## Commandes
- `pnpm dev` : serveur de développement sur le **faux script** (msw, `.env.development`). `pnpm dev:real` (vrai script,
  `.env.real.local`, bandeau « Données réelles ») est réservé au responsable, jamais lancé par un agent.
- `pnpm build` puis `pnpm serve` : le site tel que GitHub Pages le sert (port 4311). Jamais `vite preview` (il fait du SSR).
- `pnpm check:fast` (avant chaque commit) : extraction i18n, format, lint, `tsc`, tests `node`.
- `pnpm check` (avant une PR) : idem + tests navigateur, stories et knip. Puis `pnpm build:e2e` et les E2E de ton périmètre.
- `pnpm test:node`, `pnpm test:browser`, `pnpm test`, `pnpm test:e2e` (après `pnpm build:e2e`), `pnpm test:e2e:legacy`,
  `pnpm storybook`, `pnpm budget`.
- `pnpm lint:fix` = `oxlint --fix && oxfmt` ; `pnpm i18n:extract` après tout ajout ou changement de message.

## Environnement
- Navigateurs : dans les sessions cloud, Chromium préinstallé désigné par `PLAYWRIGHT_CHROMIUM_EXECUTABLE`
  (`/opt/pw-browsers/chromium`), lu par `vitest.config.ts` et `playwright.config.ts`. Ne jamais lancer `playwright install`
  en session ; la CI l'installe elle-même.
- Le vrai Apps Script n'est jamais appelé par un test, une story, l'E2E ni un agent. Faux script : `src/mocks/apps-script.ts`
  (`createFakeAppsScript`, une instance par test) ; isolation réseau : `e2e/fixtures.ts` (tout ce qui n'est pas localhost
  est avorté) ; Vitest, Storybook et `build:e2e` : `.env.test` (URL factice). Ne crée jamais de `.env.real.local`.
- Date de référence des tests : `TEST_NOW` de `src/test/clock.ts` (lundi 5 octobre 2026, 9 h 30 à Paris).

## Règles absolues
- Ne jamais modifier `Code.gs`, `legacy/`, `docs/spec/`, `docs/migration/recherche/`, `.claude/`. Contrat d'API : `docs/spec/02-contrat-api.md`.
- Un comportement de l'ancien site ne change que s'il figure au PLAN § 4.2 (identifiant E-xx) avec son scénario
  `@changed:E-xx` dans `e2e/regression/`. Les assertions des scénarios ne se modifient pas pour faire passer un test.
- Aucune donnée personnelle dans le navigateur hors session collègue : mot de passe et état complet en mémoire seulement ;
  jamais dans l'URL, `localStorage`, `sessionStorage`, une clé de requête ou un log ; purge complète à la déconnexion ;
  une écriture collègue qui répond après la déconnexion n'écrit rien (garde de session de `mutations/staff/write.ts`).
- Copie locale : clé `reservations-cache-v1`, format de `03` § 1.1, écrite seulement depuis l'état public avec etag.
- Écritures jamais doublées, rejouées ni interrompues ; `requestId` créé au montage du formulaire, gardé pour un nouvel essai.
- POST en `Content-Type: text/plain;charset=utf-8`, aucun autre en-tête ; GET sans en-tête.
- Heure de référence : Europe/Paris (`domain/paris.ts`) ; jours métier = chaînes ISO ; jamais `new Date()` ni `Date.now()` au rendu.
- Hydratation (arbitrage 16) : `pendingMinMs` garde sa valeur par défaut, sauf sur une route dont le composant rend exactement
  `PageSkeleton` tant que `useHydrated()` vaut `false` (route `/`, essai validé en P0 (b)) ; jamais `pendingMinMs: 0` sans cette
  barrière, jamais de `onRecoverableError` pour masquer l'erreur #418.

## Où vit l'état
- URL (search params valibot + `v.fallback`) : jours, vues, formulaire ouvert, panneaux collègue.
- TanStack Query : ce que dit le script (`['state','public']`, `['state','staff', id]`).
- Zustand (`session/`, `background/clock.ts`) : session collègue et heure ; toujours lu avec un sélecteur.
- TanStack Form : les saisies (aucun `useState` pour une valeur de formulaire).
- `useState` : l'éphémère seulement (récapitulatif, `requestId`, bouton armé). Le reste se calcule avec `domain/`.

## React
- 0 à 2 `useEffect` dans toute l'appli, chacun commenté (système extérieur à synchroniser).
- Pas de `useMemo`, `useCallback`, `memo` par réflexe (React Compiler) ; pas de `forwardRef`.
- Minuteurs et écouteurs globaux (horloge, inactivité, actualisation) dans `background/`, au niveau module. Minuteur local d'un
  composant (`ConfirmButton`, signal de lenteur D-15) : armé dans un gestionnaire, gardé dans une `ref`, nettoyé par la fonction
  de retour d'une ref callback.
- Navigation par `<Link search={…}>`. `navigate` impératif seulement dans un gestionnaire (clavier, `onSuccess` passé à `mutate`)
  ou dans les tâches de fond de `background/` (déconnexion, 10 h) ; `background/` et `mutations/` peuvent appeler
  `ui/feedback/toast.ts` (gestionnaire sans composant), rien d'autre de `ui/`.
- Composants de route < 40 lignes ; aucune fonction > 80 lignes (oxlint).
- Mutations : cache mis à jour dans `useMutation({ onSuccess })` (`cancelQueries` puis `setQueryData`, après la garde de session
  pour le mode collègue) ; toast, fermeture et focus dans `mutate(…, { onSuccess })` ; `mutateAsync` dans un `try/catch` de `onSubmit`.

## Textes et formats (react-intl, fr-FR seul)
- Aucun texte en dur dans le JSX ni dans un attribut. Deux formes seulement : `<FormattedMessage id defaultMessage description />`
  écrit littéralement, ou `defineMessages({ … })` passé à `intl.formatMessage(messages.x)`. Un descripteur rangé dans une
  variable ordinaire n'est pas précompilé et s'affiche en ICU brut en production.
- Id explicite en anglais par zone (`public.r1.form.name.label`, `staff.settings.save`, `common.action.cancel`, `ui.confirm`),
  `defaultMessage` recopié **mot pour mot** de `docs/spec/` (ou de l'annexe F du plan pour un texte nouveau), `description`
  qui cite la section (« 04 § 9 — … »).
- Pluriels et ordinaux en ICU ; montants au format `euro` ; dates par `intl/dates.ts` ; jamais d'espace codée en dur autour d'un montant.
- Espace insécable écrite `\u00A0` dans une chaîne JavaScript : `defineMessages`, ou `defaultMessage={"…"}` entre accolades
  en JSX, jamais dans un attribut entre guillemets ; apostrophe suivie de `{` ou `}` doublée (`''`) ; attributs par `intl.formatMessage`.
- Messages du script (`{ error }`) affichés tels quels.

## Conventions de code
- Code en anglais : identifiants, fichiers, dossiers, ids de messages, clés de requête, commentaires ; glossaire : PLAN annexe E
  (un terme absent y est ajouté avant usage). Textes affichés et documentation en français.
- Restent en français car visibles dans l'URL : chemin `/collegue` (`routes/collegue.tsx`) et search params (`r1`, `r1vue`, `reserver`…).
- Champs du script et de la copie locale (`Date`, `Capacite`, `Qte`, `Nom`…) seulement dans `api/schemas.ts`, `api/staff-schemas.ts`, `api/actions.ts`,
  `api/early-fetch.ts`, `queries/local-cache.ts`, `src/mocks/**` et leurs tests ; ailleurs, le modèle de `domain/types.ts`,
  écrit à la main, que les schémas produisent.
- Exports nommés ; pas de barrels ; alias `@/` ; co-location `X.tsx`, `X.module.css`, `X.test.tsx`, `X.stories.tsx`.
- `domain/` et `api/` sans React ; `ui/` sans métier ; Base UI importé seulement dans `ui/`.
- Styles : CSS Modules + jetons `var(--…)` ; variantes en `data-*` ; aucune couleur, taille ou rayon en dur (sauf boîtes de marge d'impression).

## Tests
- Écrits avec le code. Logique pure : tables `it.each` tirées de la spec (projets `node` et `node-ny`). Composants, routes et
  tâches de fond : Vitest Browser Mode (`vitest-browser-react`, `page.getByRole`, `userEvent`). Une story CSF Next par composant
  et par état, testée avec axe (projet `storybook`).
- Un `QueryClient` neuf et une instance de faux script par test ; store de session réinitialisé (`setState(initial, true)`).
- E2E : `e2e/regression/` (projets `legacy` et `react`, page objects sémantiques de `e2e/pages/`, étiquettes `@parity` ou
  `@changed:E-xx`, identifiant d'écran, phase) ; projet `react-only` pour le nouveau code (smoke, hydratation, impression PDF,
  accessibilité) ; projet `production` en lecture seule (P8).
- Pas de `test.skip`, pas de `retries` local pour masquer un test instable : le noter au journal.

## Lint et types
- `pnpm check` doit passer. Corrige le code. Faux positif prouvé par un exemple minimal : override par motif de fichiers dans
  `.oxlintrc.json`, commenté, noté au journal. Jamais de directive `oxlint-disable` en ligne, de catégorie abaissée ni d'option
  `tsconfig` assouplie (seule exception prévue : `exactOptionalPropertyTypes`, PLAN § 6.1, décision notée ici).
- `no-warning-comments` est actif : pas de `TODO` dans le code ; ce qui reste à faire va au journal ou dans la PR.

## Travail en session
- Une branche courte par session (`claude/<id>-<sujet>`) depuis la branche d'intégration `claude/frontend-react-migration-lw5zfz` ;
  une PR vers l'intégration ; jamais de push sur `main` ni sur l'intégration ; l'orchestrateur fusionne.
- Journal `docs/migration/journal/<id>.md` : fait, reste, décisions, contradictions plan/spec, versions, overrides.
  `PLAN.md` n'est modifié que par l'orchestrateur ou une session qui en a reçu l'autorisation.
- Fichiers partagés dont tu n'es pas propriétaire (PLAN § 5.0) : décris le changement voulu dans le compte rendu.
- Fichiers générés commités : `src/routeTree.gen.ts` (régénéré par `pnpm build` ou `pnpm dev`) et `translations/fr.json`
  (`pnpm i18n:extract`). Conflit sur l'un d'eux : reprendre la version de l'intégration et régénérer.
- Aucun paquet ajouté sans accord ; versions exactes (`save-exact`), celles du PLAN § 2.
- Désaccord plan / spec : textes et comportements → spec (sauf D-xx ou E-xx), architecture → plan ; sinon option la plus
  facile à défaire, notée au journal.

## Rédaction
- Avant d'écrire commentaires, noms, messages de commit, descriptions de PR, README, ce fichier ou `docs/migration/` :
  appliquer `.claude/skills/stop-slop/SKILL.md` (pas de remplissage, voix active, noms et faits précis, pas de formules creuses).
- Ne s'applique pas aux textes affichés par l'appli (`defaultMessage`, libellés, toasts) : ils sont recopiés de `docs/spec/`.
- Les textes en français gardent la typographie française (« », espaces insécables, tirets d'incise) ; les règles de stop-slop
  sur les tirets cadratins et les mots en « Wh- » visent l'anglais.
- Commentaires : la contrainte et sa source (« 04 § 5.3 »), jamais l'historique ni les alternatives écartées.
- Commits et PR en français : sujet « Zone : action (section de spec) », par exemple « Domaine : places restantes et seuils de
  jauge (01 § 3.1-3.3) » ; identifiants en anglais entre backticks ; corps : ce qui reste à faire.
````

### Annexe D — Rapports de recherche

Voir [`recherche/README.md`](recherche/README.md) (une ligne par rapport, ce qui a été testé ou non). Ordre de lecture conseillé selon la phase :

| Phase | À lire |
| --- | --- |
| P0 | **`spike-integration/`** (README, configurations, `tools/results/`), `toolchain.md` (§ 2-6, pièges), `toolchain-files/` (`.github/`), `tanstack-start.md` (§ 2-3, pièges), `element-admin-reference.md` (§ 1, § 11.7) |
| P1 | [`parite.md`](parite.md), `spike-integration/e2e/` (fixture `@msw/playwright` contre l'ancien site), `element-admin-reference.md` (§ 8), `react-architecture.md` (§ 8), `tanstack-query.md` (§ 9) ; surtout `docs/spec/09`, `04`, `06`, `07`, `02` et `Code.gs` |
| P2 | `appresaaristide/` (fichiers repris et leur `PROVENANCE.md`), `tanstack-query.md` (§ 3-8, § 10-13), `react-architecture.md` (§ 3, § 5, § 7), `appresaaristide-reference.md` (§ 2.1, § 6) |
| P3 | `spike-integration/.storybook/` et `vitest.config.ts`, `appresaaristide/src/components/form/fields.tsx`, `ui-forms.md` (§ 1-7, § 9-11), `appresaaristide-reference.md` (§ 2.2-2.4), `react-architecture.md` (§ 8, Vitest Browser Mode) |
| P4 | `tanstack-start.md` (§ 4), `react-architecture.md` (§ 2), `ui-forms.md` (§ 5) |
| P5 | terminé le 4 oct. : (a) `d102547`, (d1) `a79689d`, (c) `e6feb25`, (b) `32efb0c`, (d2) `66368aa`, (e) `409f371` ; 30 scénarios `@p5` verts sur `react` |
| P6 | `ui-forms.md` (§ 8), `react-architecture.md` (§ 2 (i)) — en gardant l'arbitrage « même document » |
| P7 | `element-admin-reference.md` (§ 8), `react-architecture.md` (§ 8) |
| P8 | `react-architecture.md` (§ 10, sans sa préproduction ni son retour arrière par relance du workflow : § 6.1), § 7 de ce plan |

Les rapports reflètent l'état du 3 octobre 2026 ; leurs propositions contraires aux arbitrages sont listées au § 6.1.

### Annexe E — Glossaire du code

Vocabulaire imposé pour le code (arbitrage 12) : un terme métier de la spec se traduit toujours par le même identifiant anglais. Un nouveau terme est ajouté ici avant d'être utilisé. Les textes affichés gardent le terme français de la spec.

**Domaine**

| Terme de la spec | Identifiant anglais | Définition |
| --- | --- | --- |
| R1, restaurant pédagogique (service à table) | `r1`, suffixe `R1` (`DayCardR1`) | restaurant réservé par nombre de couverts |
| R2, Aristide (plats) | `r2`, suffixe `R2` (`OrderFormR2`) | restaurant où l'on commande des plats, chacun avec son stock |
| restaurant | `Restaurant` (`'r1' \| 'r2'`) | |
| jour de service, jour ouvert | service day (`ServiceDayR1`, `ServiceDayR2`) | date ouverte par un collègue dans un restaurant |
| couvert | seat (`seats`) | une personne à table en R1 |
| capacité | `capacity` | nombre de couverts d'un jour R1 |
| élèves, personnels, extérieurs | `students`, `staffMembers`, `externals` | compteurs d'une réservation R1 (`nbEleve`, `nbProf`, `nbExt` pour le script) ; `staff` a ici le sens « personnels de l'établissement », distinct du mode collègue (double acception assumée, toujours dans un nom composé) |
| tarif élève / professeur / extérieur | `priceStudent`, `priceStaff`, `priceExternal` | paramètres `priceEleve`, `priceProf`, `priceExterieur` |
| plat | dish (`Dish`) | ligne de `R2_Items` |
| portion | portion (`portions`) | quantité d'un plat dans une commande |
| stock | `stock` | portions offertes pour un plat |
| réservation | booking (`BookingR1`, `BookingR2`) | ligne de réservation (R2 : une ligne par plat) |
| commande R2 multi-plats | order (`Order`, `useOrderR2`) | ensemble des lignes R2 d'une même personne pour un jour |
| ticket restaurant | meal voucher (`voucher`) | plat payé par un ticket ; un ticket au plus par commande |
| mention « (ticket restaurant) » | voucher mark (`VOUCHER_MARK`, `withVoucherMark`, `hasVoucherMark`) | suffixe du nom dans la feuille et sur le fil |
| sur place / à emporter | `serviceMode` : `'dineIn'` / `'takeaway'` | `'surplace'` / `'emporter'` pour le script |
| clôture de 10 h, cut-off | cutoff (`isR2OrderingClosed`, `domain/cutoff.ts`) | fin des commandes R2 en ligne le jour même |
| jour passé | `isPast` | date antérieure à aujourd'hui (heure de Paris) |
| places restantes, portions restantes | remaining (`remainingSeats`, `remainingStock`) | capacité ou stock moins le déjà réservé |
| déjà réservé (agrégats publics) | `r1Booked` (`SeatTotal`), `r2Booked` (`PortionTotal`) | sommes anonymes par date ou par plat |
| places disponibles / bientôt complet / complet | `available` / `almostFull` / `full` | valeurs renvoyées par `capacityClass` (états de la jauge) ; les classes CSS `cap-ok` / `cap-low` / `cap-full` sont celles de l'ancien code (`legacy/`), non reprises |
| épuisé | `soldOut` | plat dont le stock restant est nul |
| jauge, pastille | gauge (`domain/gauge.ts`), `CapacityPill` | |
| prix, montant, total | `price`, `amount`, `total` | `Prix`, `PrixTotal` pour le script |
| classe ou service | `className` | `Classe` |
| nom et prénom | `name` | `Nom` |
| contact | `contact` | e-mail (ou téléphone pour les anciennes réservations) |
| observation | `observation` | |
| ouvert par | `openedBy` | `OuvertPar`, état complet seulement |
| note, thème, menu | `note`, `theme`, `menu` | |
| paramètres | settings (`Settings`, `SettingsPanel`) | onglet `Config` |
| contact d'annulation | `cancellationContact` | `contactAnnulation` |

**Interface et comportement**

| Terme de la spec | Identifiant anglais | Définition |
| --- | --- | --- |
| fiche du jour | day card (`DayCardR1`, `DayCardR2`) | bloc sous le calendrier pour le jour sélectionné |
| formulaire de réservation | booking form (`BookingFormR1`, `OrderFormR2`) | |
| récapitulatif | booking summary (`BookingSummary`) | confirmation affichée après une réservation |
| compteurs | seat counters (`SeatCountersR1`) | |
| ligne de plat | dish row (`DishRow`) | |
| champs d'identité | identity fields (`IdentityFields`) | nom, classe, contact, observation |
| mode collègue, collègue | staff (`StaffPage`, `features/staff/`, `useLogin`) | espace protégé par mot de passe (chemin d'URL `/collegue` conservé) |
| sélecteur Client / Collègue | mode switch (`ModeSwitch`) | |
| session collègue | staff session (`useSessionStore`, `purgeStaffSession`) | |
| déconnexion | logout (`SessionEnd` : `'logout'`, `afterLogout`) | |
| inactivité | inactivity (`background/inactivity.ts`, `'inactivity'`) | |
| mot de passe changé | `'password-changed'`, `PasswordRejectedError` | |
| ouvrir un jour | open day (`OpenDayFormR1`, `OpenDatePicker`) | |
| modifier ce jour | edit day (`EditDayFormR1`) | |
| liste, ligne de réservations | booking list (`BookingList`), booking row (`BookingRow`) | listes nominatives des fiches collègue |
| modifier une réservation | edit booking (`EditBookingFormR1`, `EditBookingFormR2` ; paramètre d'URL `editResa`) | |
| formulaire de plat | dish form (`DishForm` ; paramètres `ajoutPlat`, `editPlat`) | ajout et modification d'un plat |
| page publique, page collègue, page d'erreur | `Page`, `PublicPage`, `StaffPage`, `LoadErrorPage` | |
| sélecteur de date | date picker (`DatePickerPopover`, `OpenDatePicker`) | C-05 |
| bandeau « Données réelles » | dev data banner (`DevDataBanner`) | `pnpm dev:real` seulement |
| ajouter une personne | add booking (`AddBookingFormR1`) | |
| suggestions de prix | price suggestions (`PriceSuggestions`) | |
| panneau | panel (`TomorrowPanel`, `SettingsPanel`) | |
| résumé du lendemain, panneau « Demain » | tomorrow summary (`TomorrowPanel`, `TomorrowDocumentR1`) | |
| impression, liste imprimée | print (`features/print/`, `printDocument`, `ListDocumentR1`) | |
| en-tête, pied de page, colonne | `Header`, `Footer`, `Column` | |
| bandeau de configuration | config banner (`ConfigBanner`) | |
| encadré d'échec | load error box (`LoadErrorBox`) | |
| squelette | skeleton (`Skeleton` dans `ui/`, `PageSkeleton` pour la page) | |
| calendrier, vue semaine / mois | calendar (`RestaurantCalendar`) ; vue = valeur d'URL `semaine` / `mois`, lue telle quelle | exception d'URL (§ 3.1) |
| choisir un jour, période, aujourd'hui | `selectDay`, `shiftPeriod`, `goToToday` | |
| horloge, aujourd'hui | clock (`useClock`, `useToday`) | |

**Données et chargement**

| Terme de la spec | Identifiant anglais | Définition |
| --- | --- | --- |
| état public / état complet | public state / full state (`PublicState`, `FullState`) | |
| copie locale | local cache (`queries/local-cache.ts`, `LocalCacheV1`) | `reservations-cache-v1` |
| textes de secours | fallback texts (`readFallbackTexts`) | `reservations-textes` |
| lecture anticipée | early fetch (`api/early-fetch.ts`, `takeEarlyFetch`) | lecture lancée par le script inline du `<head>` |
| lecture doublée | hedged read (`hedgedRead`) | seconde lecture à 6 s |
| actualisation automatique | auto refresh (`AutoRefresh`) | |
| erreur métier / service muet | `BusinessError` / `ServiceError` | |
| identifiant de requête | `requestId` (`newRequestId`) | |
| doublon | `duplicate` | `_duplicate` pour le script |
| écriture | write (clé `['write', domain, action]`) | |
| tâches de fond | background tasks (`startBackgroundTasks`) | |
| état lu, copie affichée | `useAppState(select)`, `useIsFromCache()` | |
| statut d'e-mail, résultat de commande | `emailStatus`, `bookingResult` | `_emailStatus`, `_bookingResult` pour le script |
| mode de service | `ServiceMode` (`'dineIn' \| 'takeaway'`) | |
| garde de session | session guard (`sessionIdAtCall`, `mutations/staff/write.ts`) | une écriture collègue n'écrit dans le cache que si sa session est encore ouverte |
| faux script | fake Apps Script (`createFakeAppsScript`) | `src/mocks/apps-script.ts` |
| date de référence des tests | `TEST_NOW`, `TODAY` | `src/test/clock.ts` |

### Annexe F — Textes nouveaux

Liste fermée des textes affichés qui n'existent pas dans `docs/spec/`. Le test de S2 vérifie que chaque `defaultMessage` de `translations/fr.json` figure soit dans la spec, soit ici (aux placeholders près). Un texte nouveau s'ajoute ici, avec sa décision, avant d'être codé ; l'id est celui à utiliser (zones du § 3.10). Aucun texte des décisions non retenues (D-04, D-08, D-09, D-25) ne figure dans cette liste.

| Id react-intl | Texte (`defaultMessage`) | Source | Où |
| --- | --- | --- | --- |
| `public.dayCard.status.almostFull` | `Bientôt complet` | D-02 | mot d'état à côté de la jauge (R1 et R2) |
| `public.dayCard.status.full` | `Complet` | D-02 | mot d'état à côté de la jauge |
| `public.r1.dayCard.fullNote` | `Complet.` | D-02 (AppResaAristide) | phrase sous la fiche R1 complète |
| `public.r2.dayCard.allSoldOutNote` | `Tous les plats sont épuisés.` | D-02 | phrase sous la fiche R2 dont tous les plats sont épuisés |
| `public.calendar.day.r2Closed` | `commandes closes` | a-23 | suffixe de l'`aria-label` d'un jour R2 clos (`…, commandes closes`) |
| `loading.configBanner` | `⚠ Configuration manquante : l'adresse du service de réservation n'est pas renseignée ou n'est pas valide. Prévenez l'établissement.` | D-05 | bandeau `ConfigBanner` (« ⚠ » en icône SVG) |
| `public.header.title` | `Réservations des restaurants pédagogiques et {name2}` | D-24 | `<h1>` (texte de `03` § 2.1 avec placeholder) |
| `public.error.serviceUnavailable` | `Le service de réservation ne répond pas. Réessayez dans un instant : une même réservation n'est jamais enregistrée deux fois.` | D-14 | toast d'erreur d'une réservation publique (service muet, réponse illisible) |
| `staff.error.serviceUnavailable` | `Le service ne répond pas. Réessayez dans un instant.` | D-14 | toast d'erreur d'une écriture collègue, ajout d'une personne compris |
| `common.write.slow` | `Le service met du temps à répondre. Gardez cette page ouverte : la confirmation s'affichera ici.` | D-15 | sous le bouton occupé après 20 s (`role="status"`), public et collègue |
| `public.summary.duplicateTitle` | `Réservation déjà enregistrée` | D-16 | titre du récapitulatif d'un doublon |
| `public.summary.duplicateWarning` | `Cette réservation était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.` | D-16 | avertissement du récapitulatif d'un doublon |
| `public.r2.form.quantity.decrement` | `Retirer une portion : {name}` | D-17 | `aria-label` du bouton − d'une quantité R2 |
| `public.r2.form.quantity.increment` | `Ajouter une portion : {name}` | D-17 | `aria-label` du bouton + d'une quantité R2 |
| `public.r1.form.counter.decrement` | `Diminuer : {label}` | D-17 | `aria-label` du bouton − d'un compteur R1 (`Élèves`, `Personnels`, `Extérieurs`) |
| `public.r1.form.counter.increment` | `Augmenter : {label}` | D-17 | `aria-label` du bouton + d'un compteur R1 |
| `ui.numberField.roleDescription` | `champ numérique` | D-17, R-16 | `aria-roledescription` du `NumberField` (remplace « Number field » de Base UI) |
| `ui.toast.viewport` | `Notifications` | a-8 | `aria-label` de la zone des toasts |
| `ui.confirm.armedAnnouncement` | `Cliquez de nouveau pour confirmer.` | a-19, § 3.5 | annonce `role="status"` masquée quand un `ConfirmButton` s'arme |
| `staff.openDay.error.pastDate` | `Choisissez la date d'aujourd'hui ou une date ultérieure.` | D-19 | champ Date de « Ouvrir un jour » |
| `staff.openDay.r1.alreadyOpen` | `Ce jour est déjà ouvert : utilisez « Modifier ce jour ».` | D-19 | « Ouvrir un jour » R1 sur un jour déjà ouvert (envoi bloqué) |
| `staff.openDay.r2.alreadyOpen` | `Ce jour est déjà ouvert : seuls les plats de nom nouveau seront ajoutés.` | D-19 | « Ouvrir un jour » R2 sur un jour déjà ouvert (avertissement) |
| `staff.openDay.r2.incompleteLine` | `Indiquez le nom et le stock de ce plat, ou retirez la ligne.` | D-19 | ligne de plat incomplète |
| `staff.dish.error.stockBelowBooked` | `Impossible : {n, plural, one {# portion déjà réservée} other {# portions déjà réservées}} pour ce plat, le stock ne peut pas être inférieur.` | D-19 | modification ou ajout d'un plat sous le réservé |
| `staff.settings.error.nameRequired` | `Indiquez le nom du restaurant.` | D-20 | noms des restaurants vidés |
| `staff.settings.error.invalidPrice` | `Indiquez un tarif positif ou nul (ex. 4,95).` | D-20 | tarif invalide |
| `staff.settings.partialFailure` | `Enregistré : {saved}. Non enregistré : {failed} ({message}).` | D-20 | toast d'un échec partiel (`{saved}`, `{failed}` : libellés joints par « , ») |
| `staff.day.delete.confirmWithBookings` | `Confirmer la suppression du jour et de ses {n, plural, one {# réservation} other {# réservations}} (les personnes ne seront pas prévenues)` | D-21 | note et `aria-label` du bouton armé |
| `staff.dish.delete.confirmWithBookings` | `Confirmer la suppression de ce plat ({n, plural, one {# réservation ne sera plus affichée} other {# réservations ne seront plus affichées}}, les personnes ne seront pas prévenues)` | D-21 | note et `aria-label` du bouton armé |
| `staff.dish.error.zeroPrice` | `Indiquez un prix supérieur à 0, ou laissez le champ vide.` | D-22 | champ Prix |
| `print.tomorrow.r2.dishLine` | `• {name} : {n, plural, one {# portion} other {# portions}}` | a-24 | résumé R2 du lendemain (remplace « {Nom}: … portion(s) ») |
| `print.r1.list.dayClosed` | `Ce jour n'est plus ouvert.` | a-24 | liste imprimée R1 d'un jour supprimé entre-temps (remplace « Aucun jour ouvert pour demain. » hors résumé) |
| `common.notFound.title` | `Page introuvable` | § 3.2 | route `$.tsx` |
| `common.notFound.home` | `Revenir à l'accueil` | § 3.2 | lien de la route `$.tsx` |
| `dev.realDataBanner` | `Données réelles` | § 3.11 | bandeau `DevDataBanner`, rendu seulement par `pnpm dev:real` |

Textes existants réemployés hors de leur écran d'origine (pas de nouvel id de texte, mais une nouvelle place) : `Épuisé` (`04` § 5.3) dans la liste des plats de la fiche (D-02) ; `(hors plats sans prix indiqué)` (`04` § 9) partout (D-03) ; `{n couvert(s)} au maximum (places restantes ce jour-là).` et `{n portion(s)} au maximum (stock restant).` (`06` § 8.2-8.3) dans les formulaires publics, en pluriels ICU (D-18) ; message du script `Impossible : {n} couvert(s) déjà réservé(s)…` (`06` § 5.1) affiché avant l'envoi par « Ouvrir un jour » R1 (D-19) ; `Demain ({date})` (`06` § 2.1) comme titre du panneau fusionné (D-07).
