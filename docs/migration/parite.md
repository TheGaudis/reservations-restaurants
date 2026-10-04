# Matrice de parité et scénarios de régression

*Créée le 3 octobre 2026 à partir de la relecture de couverture du plan. Structure posée par P1 (a1) ; chaque session de P1 remplit sa section ; la colonne `react` est mise à jour par la phase qui livre l'écran ; P7 la complète ; P8 gèle la colonne `legacy`.*

Références : [`PLAN.md`](PLAN.md) § 1.5 (S1), § 4.2 (écarts `E-xx`), P1 ; [`docs/spec/09`](../spec/09-inventaire-des-ecrans.md) (identifiants d'écran).

## 1. Conventions

- **Fichiers** : `e2e/regression/{loading,loading-reads,calendar,public-r1,public-r1-send,public-r2,public-r2-cutoff,staff,print,print-tomorrow,invariants,misc}.spec.ts` (répartition au § 3), aides communes des scénarios publics dans `e2e/regression/helpers.ts`, connexion des scénarios d'impression dans `e2e/regression/print-helpers.ts`. Deux fichiers hors scénarios : `smoke.spec.ts` (G-04 affiché depuis le faux script) et `suite.spec.ts` (étiquette `@framework` : isolation réseau, étiquettes `@changed`, signatures des page objects).
- **Étiquettes Playwright** : `test("…", { tag: [...] }, …)` avec
  - `@parity` (comportement identique attendu sur `legacy` et `react`) ou `@changed:E-xx` (écart du PLAN § 4.2 : l'assertion a une variante `legacy` et une variante `react`, choisie par `target(testInfo)`, c'est-à-dire par le nom du projet Playwright) ; un scénario peut porter plusieurs `@changed:E-xx` et garder des assertions communes ;
  - l'identifiant d'écran de `09` (`@G-01`, `@P-05`…), un par ligne de `09` citée, pour le filtre `--grep` de la CI ; `09` § 7 s'écrit `@09-7` ;
  - la phase de sortie : `@p4`, `@p5` ou `@p6` ;
  - `@legacy-only` pour un scénario non exécutable sur `react` (couvert autrement, voir la colonne « Story ou test navigateur »).
- Titres de test en anglais : nom de code ci-dessous suivi de l'identifiant, `"shellSkeletonWithStoredTitles (REG-01)"` ; un scénario découpé en plusieurs tests garde ce préfixe. Textes attendus en français, recopiés de la spec ou de l'annexe F du plan.
- `changedTagsMatchPlanGaps` (`suite.spec.ts`) compare l'ensemble des étiquettes `@changed:E-xx` de `e2e/regression/` (scénarios écrits ou encore déclarés en `test.fixme`) aux lignes du PLAN § 4.2 dont la colonne « Scénario » n'est pas « n/a » : ni plus, ni moins. Liste attendue (45) : E-01 à E-21, E-23, E-24, E-27 à E-48 ; hors suite : E-22, E-25, E-26, E-49.
- **Horloge** : `TEST_NOW` de `src/test/clock.ts` = `2026-10-05T07:30:00.000Z`, **lundi 5 octobre 2026, 9 h 30 à Paris** (`timezoneId: 'Europe/Paris'`), `TODAY = '2026-10-05'`. La fixture `pageClock` pose `page.clock.setFixedTime(fixedTime)` avant le test (date figée, minuteurs réels ; `fixedTime` vaut `TEST_NOW`, `test.use({ fixedTime: Date.parse('2026-09-30T07:00:00Z') })` pour une autre heure). Pour 10 h, minuit, l'inactivité et la lecture doublée : `test.use({ fixedTime: null })`, puis `page.clock.install({ time })` avant `goto`, puis `runFor` / `fastForward` ; `setSystemTime` pour avancer l'heure sans déclencher les minuteurs. Jamais d'horloge réelle.
- **Faux script** : une instance de `createFakeAppsScript({ seed, password })` par test (`src/mocks/apps-script.ts`), exposée aux tests par la fixture `fakeScript` (`test.use({ fakeScriptOptions: { seed } })` pour un autre jeu) ; `fakeScript.db` (tables du script, modifiables en cours de test pour jouer un autre visiteur : l'etag suit le contenu) ; `fakeScript.requests` (méthode, URL, en-têtes, corps brut et `json`) ; `hold()` retient la **prochaine** requête jusqu'à l'appel de la fonction rendue (traitée à ce moment) ; `failNext(kind, message?)` fait échouer la **prochaine** requête (appels cumulés, un par requête) : `html` = page d'erreur de Google en statut 500, rien n'est traité ; `network` = requête traitée puis connexion coupée (réponse perdue de REG-19) ; `error` = `{ error: message }` sans traitement, message du verrou par défaut ; `setPassword(p)` ; `db.mailError` = raison d'échec de MailApp pour les e-mails de confirmation. ; `db.lockBusy = true` = verrou pris : toute action POST sauf `getAdminState` et `checkPassword` répond aussitôt le message du verrou (P1 (a2)). Isolation réseau en premier (`e2e/fixtures.ts`, fixtures `isolation` : `allowed` et `blocked`) ; une requête vers le script que le faux script n'a pas traitée fait échouer le test.
- **Console stricte** : fixture `consoleLog` ; toute erreur ou tout avertissement de la console, et toute exception de la page, fait échouer le test, sauf les « Failed to load resource » d'une adresse externe (isolation, échecs demandés au faux script) et le statut 404 d'un lien profond. Une erreur provoquée par le scénario s'accepte par `consoleLog.allow(/motif/u)`. Sur `legacy`, Chromium avertit quand la feuille Google Fonts préchargée n'arrive pas (isolation) dès qu'un test dure plus de quelques secondes : les scénarios publics l'acceptent par `consoleLog.allow(BLOCKED_FONT_PRELOAD)` (`e2e/pages/home.ts`, P1 (b)).
- **Copie locale** : semée par `addInitScript` (format v1 exact de `03` § 1.1) ; `storageState` neuf par test.

## 2. Jeu de base `src/mocks/fixtures/seed.ts`

Champs du script tels quels ; dates calculées par rapport à `TODAY` (`addDays(TODAY, n)`), valeurs ci-dessous pour `TODAY = 2026-10-05`.

- Paramètres : défauts client (`Restaurant Pédagogique`, `Aristide`), `contactAnnulation` « le secrétariat », tarifs `4.95` / `6.10` / `9.90`.
- Mot de passe collègue `secret` (`SEED_PASSWORD`) ; etag initial `E1`.
- Identifiants lisibles, relatifs au jour : `r1b-d+1-ungerer` (réservation R1 de demain), `r2i-d0-lasagnes` (plat R2 d'aujourd'hui), `r2b-d+1-durand` (réservation R2 orpheline). Personnes : Cyrille Ungerer, Ariele Gsell, Noah Bernard, Léa Martin (contact téléphonique), Jean Petit, Paul Durand, Lycée Voltaire, Association des anciens. `createSeed(today)` décale tout le jeu (`pnpm dev` le date du jour réel).

Jours R1 :

| Date | Capacité | Réservés | Rôle |
| --- | --- | --- | --- |
| 2026-10-01 (J−4) | 20 | 4 | jour passé ; date du « 1er » |
| 2026-10-05 (J) | 20 | 8 | aujourd'hui, avec thème et menu |
| 2026-10-06 (J+1) | 20 | 15 | demain, bientôt complet ; réservations nominatives avec et sans détail élèves / personnels / extérieurs (dont une ancienne réservation aux compteurs vides) |
| 2026-10-09 (J+4) | 10 | 10 | complet |
| 2026-10-12 (J+7) | 150 | 120 extérieurs (`PrixTotal` 1188) | montant au-delà de 999 € |

Jours R2 :

| Date | Plats | Rôle |
| --- | --- | --- |
| 2026-10-01 (J−4) | Lasagnes | jour passé |
| 2026-10-05 (J) | Lasagnes 4.50 (stock 10, 6 réservés), Bowl (ticket restaurant) stock 10, Wrap (ticket restaurant) stock 5, Salade sans prix stock 5 | aujourd'hui, jour au ticket |
| 2026-10-06 (J+1) | Lasagnes, Bowl (ticket restaurant) | demain ; client A : 3 Bowl dans une commande ; client B : 1 Lasagnes ; une réservation orpheline (`ItemID` d'un plat supprimé, `Qte` 2) |
| 2026-10-10 (J+5) | aucun | jour sans plat, avec thème et note |
| 2026-10-11 (J+6) | plats tous épuisés | tout épuisé |
| 2026-10-13 (J+8) | Lasagnes, Salade | sans ticket, pour « À emporter » |

Le 2026-10-07 (J+2) n'a aucun jour, ni R1 ni R2 (variante « demain sans jour » de REG-39, horloge au 2026-10-06).

## 3. Scénarios REG-01 à REG-43

Fichiers : `loading.spec.ts` REG-01, REG-02, REG-04, REG-05, REG-07 ; `loading-reads.spec.ts` (horloge de la page en pause) REG-03, REG-06, REG-08 ; `calendar.spec.ts` REG-09 à REG-12 ; `public-r1.spec.ts` REG-13 à REG-15 ; `public-r1-send.spec.ts` REG-16 à REG-20 ; `public-r2.spec.ts` REG-21 à REG-24 ; `public-r2-cutoff.spec.ts` REG-25, REG-26 ; `staff-access.spec.ts`, `staff-session.spec.ts`, `staff-settings.spec.ts`, `staff-open-day.spec.ts`, `staff-open-day-r2.spec.ts`, `staff-r1.spec.ts`, `staff-r1-add.spec.ts`, `staff-r2.spec.ts` REG-27 à REG-38 (aides dans `staff-helpers.ts`) ; `print.spec.ts` REG-40, REG-41 ; `print-tomorrow.spec.ts` REG-39, REG-42 ; `invariants.spec.ts` (horloge de la page en pause) variantes de minuit de REG-25 ; `misc.spec.ts` REG-43. Chacun y est déclaré en `test.fixme` avec ses étiquettes (P1 (a1)) ; la session qui l'écrit remplace `test.fixme` par `test`.

Phases de sortie : `@p4` = REG-01 à REG-26 et REG-43 ; `@p5` = REG-27 à REG-38 ; `@p6` = REG-39 à REG-42. Sessions de P1 : (b) REG-01 à REG-26 et REG-43 ; (c) REG-27 à REG-38 ; (d) REG-39 à REG-42 et les variantes « invariants » (REG-02, REG-03, REG-25, REG-29).

| Id | Nom (code) | Lignes `09` | Étiquettes | Préconditions du faux script, déroulé, assertions | Horloge |
| --- | --- | --- | --- | --- | --- |
| REG-01 | `shellSkeletonWithStoredTitles` | G-01 → G-04 | `@parity` `@p4` | Pas de copie ; `reservations-textes` = { name1 « Resto Test » } ; GET retenu 2 s : squelette avec le titre mémorisé, puis la page | `TEST_NOW` |
| REG-02 | `localCacheFirstRender` | G-02 | `@changed:E-47` `@p4` | Copie v1 (etag `E1`, `savedAt` J−1) ; GET retenu 5 s puis `{ unchanged: true }`. Commun : contenu de la copie visible avant la réponse, « Réserver » actif, `?since=E1`, `savedAt` réécrit, aucune 2e lecture. `legacy` : aucun squelette après l'exécution des scripts ; `react` : squelette ≤ 600 ms, puis contenu, aucune erreur console | `TEST_NOW` |
| REG-03 | `hedgedReadAndRetry` | G-01, invariant 2 | `@parity` `@changed:E-45` `@p4` | (a) 1er GET sans réponse → 2e GET à 6 000 ms, pas avant ; (b) page HTML d'erreur → nouvel essai à 1 500 ms ; (c) hors ligne → aucun nouvel essai ; (d) `@changed:E-45` : aucune réponse du tout → `legacy` reste en attente, `react` abandonne chaque essai à 30 s et affiche l'encadré d'échec | `install` + `runFor` |
| REG-04 | `loadErrorOnlineRetry` | G-03 | `@parity` `@p4` | Pas de copie ; GET → page HTML 500 (×2) puis état ; « Réessayer » occupé « Nouvelle tentative… » ; texte exact de `03` § 3.1 | `TEST_NOW` |
| REG-05 | `loadErrorOfflineWithCopy` | G-03, G-02 | `@parity` `@p4` | Copie v1 ; `context.setOffline(true)` ; texte hors ligne et suffixe « copie locale » | `TEST_NOW` |
| REG-06 | `loadErrorNotReannounced` | G-03 | `@changed:E-42` `@p4` | Tous les GET échouent ; `MutationObserver` sur l'encadré : 2 réinsertions sur `legacy`, 0 sur `react` | `install` + `runFor('06:30')` |
| REG-07 | `configMissingBanner` | G-05 | `@changed:E-29` `@p4` `@legacy-only` | `legacy` : HTML réécrit par `page.route` (`COLLE_ICI`), bandeau au tutoiement. `react` : non exécutable (URL figée au build) ; couvert par la story et le test Vitest de `ConfigBanner` (texte de D-05, URL absente, invalide ou `COLLE_ICI`) | `TEST_NOW` |
| REG-08 | `refreshContinuesUnderOpenForm` | G-04, P-05, invariant 3 | `@changed:E-08` `@p4` | Formulaire R1 du 2026-10-06 ouvert, « Nom » en cours de saisie et focalisé ; à t+1 min, une réservation fait passer le restant de 5 à 3. `legacy` : pas de GET, légende « (5 au maximum) ». `react` : GET, légende « (3 au maximum) », saisie, focus et `requestId` intacts. Assertion commune : onglet caché 4 min → rattrapage au retour | `install` + `runFor('03:00')` |
| REG-09 | `calendarWeekNavigation` | P-01, P-01b | `@changed:E-05` `@changed:E-06` `@p4` | ‹ › sans changement de sélection ; « Aujourd'hui » ; `aria-label` « Semaine précédente / suivante » ; libellé « 28 – 4 oct. 2026 » (`legacy`) ou « 28 sept. – 4 oct. 2026 » (`react`) ; rôles `group` / `aria-pressed` ou `grid` / `gridcell` | 2026-09-30 09:00 |
| REG-10 | `calendarMonthView` | P-02, P-02b | `@changed:E-23` `@p4` | « Mois » : 42 cases, « Octobre 2026 », clic sur un jour hors mois sans changement de mois ; rechargement : `legacy` revient en semaine, `react` garde `r1vue=mois` | `TEST_NOW` |
| REG-11 | `calendarKeyboard` | P-01, P-02 | `@changed:E-07` `@p4` | Sélection 2027-01-29, un seul arrêt de tabulation ; ← → ↑ ↓ Début Fin ; depuis le 2027-01-31, Page ↓ : 2027-03-03 (`legacy`) ou 2027-02-28 (`react`) | `TEST_NOW` |
| REG-12 | `calendarDayAriaLabels` | P-01, P-02b, P-15 | `@changed:E-21` `@changed:E-43` `@p4` | `aria-label` « …, places disponibles / bientôt complet / complet / aucun service, passé » ; « jeudi 1 octobre » ou « jeudi 1er octobre » ; jour R2 du 2026-10-05 à 10 h 30 : « …, commandes closes » sur `react` seulement | 2026-10-05 10:30 |
| REG-13 | `columnsIndependent` | P-05, P-06, P-13 | `@changed:E-32` `@changed:E-31` `@p4` | Récapitulatif R1 affiché puis sélection d'un jour R2 (`legacy` : récapitulatif effacé ; `react` : conservé). Formulaire R1 rempli puis ouverture du formulaire R2 (`legacy` : nom et contact recopiés ; `react` : champs vides ; le formulaire R1 se ferme dans les deux) | `TEST_NOW` |
| REG-14 | `r1DayCardStates` | P-03, P-04, P-07, P-08 | `@changed:E-27` `@changed:E-21` `@p4` | Jour sans service, 05, 06, 09, 01 : textes et pastilles exacts (« 0 / 10 couverts »), pas de bouton si complet ou passé ; `react` : mots d'état et phrase « Complet. » | `TEST_NOW` |
| REG-15 | `r1FormValidation` | P-05 | `@changed:E-03` `@changed:E-19` `@changed:E-34` `@changed:E-46` `@changed:E-28` `@p4` | Ouverture (focus sur « Nom et prénom ») ; envoi vide → 4 messages exacts, focus sur le 1er ; frappe dans l'e-mail (message retiré à la 1re frappe sur `legacy`, gardé jusqu'à une valeur valide sur `react`) ; « Entrée » ; compteurs « 2,7 » et « abc » ; boutons −/+ (`react`) ; texte initial `Total : 0,00 €` (`legacy`) ; total en direct « 3 couverts · Total : 16,00␣€ » ; « Annuler » → focus sur « Réserver » | `TEST_NOW` |
| REG-16 | `r1MaxSeats` | P-05 | `@changed:E-35` `@p4` | Jour 06 (5 restants), saisie de 6. `legacy` : POST puis toast « Il ne reste que 5 couvert(s)… ». `react` : message sous la rangée, aucun POST. Variante : restant affiché 5, script 2 → `react` : erreur du script sous la rangée et légende relue | `TEST_NOW` |
| REG-17 | `r1BookingSuccess` | P-05 → P-06 | `@changed:E-12` `@changed:E-13` `@p4` | POST retenu 1 s : « Envoi en cours… », « Annuler » actif (`legacy`) ou inactif (`react`) ; corps exact (`trim`, `requestId`) ; toast ; récapitulatif (lignes, « 3 couverts — 16,00␣€ », « contactez le secrétariat. », « Fermer ») ; focus sur `body` ou sur le titre. Assertion commune : `_emailStatus.sent = false` → avertissement exact | `TEST_NOW` |
| REG-18 | `r1RetryKeepsRequestId` | P-05, invariant 3 | `@parity` `@p4` | 1er POST → `{ error: 'Le serveur est très sollicité : réessayez dans quelques secondes.' }` : toast, formulaire conservé, 2e POST avec le même `requestId` ; Annuler puis rouvrir → nouvel id | `TEST_NOW` |
| REG-19 | `duplicateAfterLostResponse` | P-06, invariant 3 | `@changed:E-10` `@changed:E-33` `@p4` | Le faux script enregistre puis coupe la connexion (`failNext('network')` après écriture) ; message brut (`legacy`) ou D-14 (`react`) ; nouvel essai → `_duplicate` : toast neutre seul (`legacy`), toast et récapitulatif « Réservation déjà enregistrée » (`react`) ; une seule ligne dans `fakeScript.db` | `TEST_NOW` |
| REG-20 | `slowWriteNeverReplayed` | P-05, invariant 2 | `@changed:E-10` `@p4` | POST retenu 25 s (`hold()`) : `react` affiche le message de D-15 à 20 s ; **un seul POST** reçu dans les deux cas ; la réponse finit par afficher le récapitulatif | `install` + `runFor('00:25')` |
| REG-21 | `r2DayCardStates` | P-10, P-11, P-12, P-16, P-17 | `@changed:E-27` `@p4` | Lignes de plat « Lasagnes␣— 4,50␣€ », « Bowl␣— prix d'un ticket restaurant », « Salade » ; pastilles « 4 / 10 » ; jours 10, 11, 01 ; `react` : « Épuisé », « Tous les plats sont épuisés. » | `TEST_NOW` |
| REG-22 | `r2OrderFormVoucherDay` | P-13 | `@changed:E-34` `@changed:E-41` `@changed:E-50` `@p4` | Jour 05 : liste repliée (`inert`), focus sur la 1re quantité, « Sur place » seul et aide ; les 4 totaux de `04` § 5.3 ; « Choisissez au moins un plat. » seule (focus inchangé sur `legacy`, sur la 1re quantité avec `aria-describedby` sur `react`) ; « Annuler » → liste redéployée, focus sur « Réserver ». Variante jour 13 : « À emporter » par défaut | `TEST_NOW` |
| REG-23 | `r2OrderAdjustedAndEmail` | P-14, invariant 5 | `@changed:E-14` `@changed:E-28` `@p4` | 3 Lasagnes (2 accordées) + 3 Bowl + 1 Wrap, e-mail en échec ; corps `mode: 'surplace'` ; récapitulatif « × 2 », total « 9,00␣€ + 1 ticket restaurant » ; 1 ou 2 avertissements ; « (hors plats sans prix) » ou « (hors plats sans prix indiqué) » avec la Salade | `TEST_NOW` |
| REG-24 | `r2ConfirmedEmpty` | P-13 | `@changed:E-11` `@p4` | `_bookingResult.confirmed = []` : formulaire fermé et saisies perdues (`legacy`) ou conservées et état relu (`react`) ; toast rouge exact | `TEST_NOW` |
| REG-25 | `r2CutoffAt10` | P-13, P-15, invariant 4 | `@changed:E-09` `@p4` | Formulaire du 05 ouvert à 09:59:30 ; `runFor` jusqu'à 10:00:01 : fermeture silencieuse (`legacy`) ou avec le toast neutre (`react`) ; note de clôture exacte ; plus de « Réserver ». Assertion commune (cut-off à l'envoi) : `setSystemTime(10:00:01)` sans déclencher les minuteurs, puis clic → toast neutre, aucun POST | 2026-10-05 09:59:30 (`install`) |
| REG-26 | `r2ParisTime` | P-12, P-15 | `@changed:E-01` `@p4` | `timezoneId: 'America/New_York'` à 10 h 30 heure de Paris : « Réserver » présent (`legacy`) ou note de clôture (`react`) | 2026-10-05T08:30:00Z |
| REG-27 | `loginPanel` | L-01, G-02, G-06, G-08 | `@changed:E-04` `@changed:E-02` `@changed:E-23` `@p5` | Avec la copie locale et le GET retenu : connexion refusée (« Les données se chargent. Réessayez dans un instant. »). Puis : œil (`aria-label`), Échap → focus sur « Client », mauvais mot de passe ×2 à 3 s d'écart (toasts qui se chevauchent sur `legacy`, un seul sur `react`), erreur réseau → « Erreur de connexion. Réessayez. », succès → « Mode collègue activé. », focus sur « Collègue » ; voile (`legacy`) ou bouton occupé (`react`) ; URL `/collegue` sur `react` | `TEST_NOW` |
| REG-28 | `staffGuardReload` | G-08 | `@changed:E-23` `@p5` | Rechargement de `/collegue?r1=2026-10-06&editResa=r1:{id}` : retour au mode client (`legacy`) ; connexion puis retour exact (`react`) | `TEST_NOW` |
| REG-29 | `logoutPurgeAndPanels` | C-30, C-02, C-05 | `@changed:E-24` `@changed:E-17` `@changed:E-08` `@changed:E-55` `@p5` | Paramètres et sélecteur ouverts, clic « Client » : toast, aucun nom dans le DOM ; une actualisation 3 min plus tard (absente sur `legacy`, a-13) ; reconnexion : panneaux rouverts (`legacy`) ou fermés (`react`) ; `localStorage` : copie sans etag (`legacy`) ou avec `E1` (`react`). Variante : déconnexion pendant une écriture collègue retenue par `hold()`, puis réponse → aucun nom dans le DOM ni dans le cache (F-02) ; toast « Jour modifié. » sur `legacy`, aucun toast sur `react` (`@changed:E-55`) | `install` + `runFor('03:00')` |
| REG-30 | `inactivityLogoutJourney` | C-04, C-12, C-30, invariant 1 | `@parity` `@p5` | Connexion → ouvrir un jour → ajouter une personne → activité à 9 min (repousse) → `fastForward('10:01')` → toast « Déconnecté du mode collègue après 10 minutes d'inactivité. », plus aucun nom | `install` + `fastForward` |
| REG-31 | `passwordChanged` | C-30 | `@parity` `@p5` | Après la connexion, `fakeScript.setPassword('autre')` ; actualisation suivante → toast d'erreur exact, mode client, GET public | `install` + `runFor('03:00')` |
| REG-32 | `settingsPanel` | C-02 | `@parity` `@changed:E-18` `@changed:E-37` `@changed:E-40` `@p5` | Aucune modification → « Aucune modification à enregistrer. » ; `name2` et `priceEleve` modifiés → 2 `setConfigField` en séquence, toast pluriel, titres et sous-titre mis à jour, `<h1>` « … et Aristide » (`legacy`) ou « … et {name2} » (`react`) ; `desc2` vidé (ignoré sur `legacy`, envoyé `""` sur `react`) ; nom vidé refusé sur `react` ; échec du 2e champ → détail sur `react` ; `reservations-textes` écrite (`legacy`) ou non (`react`) ; assertion commune : panneau resté ouvert après succès | `TEST_NOW` |
| REG-33 | `openDayR1WithPicker` | C-04, C-05, C-10 | `@parity` `@changed:E-36` `@p5` | Sélecteur : mois du champ, flèches = focus seul, jours passés `aria-disabled`, pastille « déjà ouvert », Échap. Succès sur le 2026-10-20 : corps exact, « Jour ajouté. », date conservée, autres champs vidés, panneau resté ouvert, calendrier R1 sur le 20 (assertions communes). Variantes `@changed:E-36` : défaut = jour passé sélectionné (envoyé sur `legacy`, refusé sur `react`) ; date déjà ouverte (écrasée sur `legacy`, bloquée sur `react`) | `TEST_NOW` |
| REG-34 | `openDayR2DishLines` | C-06 | `@changed:E-36` `@changed:E-39` `@p5` | 2 lignes dont 1 incomplète (ignorée en silence ou signalée) ; case ticket → prix vidé, désactivé, « Ticket » ; corps « Bowl (ticket restaurant) », `price: ""` ; prix « 0 » (accepté ou refusé) ; « + Ajouter un plat », retrait de la dernière ligne ; `datalist` triée | `TEST_NOW` |
| REG-35 | `r1StaffCard` | C-10, C-10b, C-11, C-13, C-14, G-06 | `@parity` `@changed:E-04` `@changed:E-38` `@changed:E-48` `@p5` | Ligne « **Nom** — Classe — 3 couverts — 16,00␣€ — contact — *obs* », « Ouvert par … », message collègue d'un jour sans service ; modification (contact obligatoire, maximum = restant + quantité, compteurs vides et aide « Réservation enregistrée avant les tarifs… » pour l'ancienne réservation) ; « Annuler » → focus sur la date (`legacy`) ou sur « Modifier » (`react`) ; « Modifier ce jour » sous les réservés → message du script ; suppression d'une réservation en 2 clics (« Confirmer ? », `aria-label`, désarmement à 4 s) → « Réservation supprimée. », focus sur la date ; suppression d'un jour réservé (voile ou bouton occupé ; note D-21 sur `react`) | `install` + `runFor('00:04')` |
| REG-36 | `r1StaffAddPerson` | C-12, invariant 3 | `@parity` `@p5` | « + Ajouter une personne » visible aussi pour le jour passé 01, absent si `rem = 0` ; e-mail facultatif ; « {n} couverts au maximum (places restantes ce jour-là). » ; POST sans `password`, avec `requestId` ; « Personne ajoutée. » puis nom affiché après `getAdminState` ; doublon → « Cette personne était déjà enregistrée… » | `TEST_NOW` |
| REG-37 | `r2StaffCardDishes` | C-20, C-21, C-22, C-14 | `@changed:E-36` `@changed:E-38` `@p5` | « Plat ajouté. » ; stock modifié sous le réservé (pastille négative sur `legacy`, refus sur `react`) ; suppression d'un plat réservé (note D-21 sur `react`) → « Plat supprimé. » | `TEST_NOW` |
| REG-38 | `r2StaffBookings` | C-23, C-24, invariant 4 | `@parity` `@changed:E-36` `@p5` | Ajout **après 10 h** possible (assertion commune : collègue non soumis au cut-off) ; jour au ticket : « À emporter » par défaut (`legacy`) ou « Sur place » seul (`react`), à l'ajout et à la modification ; accord partiel → « Personne ajoutée avec 1 portion seulement (stock restant). » ; modification au-delà de restant + quantité (POST puis erreur du script, ou message local) | 2026-10-05 10:30 |
| REG-39 | `tomorrowPanel` | C-01, C-03 | `@changed:E-30` `@changed:E-44` `@p6` | Demain = 06 avec l'orpheline et le client à 3 Bowl. `legacy` : deux panneaux, « Demain » qui compte l'orpheline, « portion(s) », « Bowl: », « 3 tickets restaurant ». `react` : un seul panneau `Demain ({date})`, orpheline exclue, textes de l'annexe F, « 1 ticket restaurant ». Variante : demain sans jour → « Aucun jour ouvert pour demain. » (assertion commune) | `TEST_NOW` ; variante 2026-10-06 |
| REG-40 | `printR1List` | I-01, I-00 | `@changed:E-15` `@changed:E-20` `@p6` | `legacy` : popup capturé, `print()` neutralisé ; `react` : `window.print` intercepté, contenu de `.print-root`. Assertions communes : titre « Restaurant Pédagogique — mardi 6 octobre 2026 », méta, colonnes, total du 06, signature ; total du 12 (« 1188,00␣€ » sur `legacy`, « 1 188,00␣€ » avec U+202F sur `react`). Variante `@legacy-only` (I-00) : `window.open` renvoie `null` → toast « Autorisez les fenêtres de ce site pour imprimer. » | `TEST_NOW` |
| REG-41 | `printR2List` | I-02 | `@changed:E-16` `@p6` | Regroupement par client trié par classe puis nom ; client à 3 Bowl : « 3 tickets restaurant » (`legacy`) ou « 1 ticket restaurant » (`react`) ; récapitulatif par plat ; « Total du jour » | `TEST_NOW` |
| REG-42 | `printTomorrowDocuments` | I-03, I-04 | `@changed:E-16` `@changed:E-44` `@p6` | Titres « … — demain … », sous-titre « Demain, … », tableaux simples, pas de signature ; doc. D : `h3` « Lasagnes — 4,50␣€ l'unité » ; lignes R2 du résumé selon l'annexe F sur `react` | `TEST_NOW` |
| REG-43 | `easterEgg` | `09` § 7 | `@parity` `@p4` | 5 clics sur le logo en moins de 2 s → popup vers `https://youtu.be/dQw4w9WgXcQ?list=RDdQw4w9WgXcQ`, non chargé (isolation réseau), `noopener` ; 5 clics en 3 s → rien | `install` + `runFor` |

Pour revenir sous 40 scénarios, on peut fusionner REG-03 dans REG-02, REG-06 dans REG-04 et REG-42 dans REG-41 ; les identifiants restent alors réservés (jamais réattribués).

## 4. Écarts du PLAN § 4.2 → scénarios

| Écart | Scénario(s) | Écart | Scénario(s) | Écart | Scénario(s) |
| --- | --- | --- | --- | --- | --- |
| E-01 | REG-26 | E-18 | REG-32 | E-35 | REG-16 |
| E-02 | REG-27 | E-19 | REG-15 | E-36 | REG-33, REG-34, REG-37, REG-38 |
| E-03 | REG-15 | E-20 | REG-40 | E-37 | REG-32 |
| E-04 | REG-27, REG-35 | E-21 | REG-12, REG-14 | E-38 | REG-35, REG-37 |
| E-05 | REG-09, REG-33 | E-22 | n/a | E-39 | REG-34 |
| E-06 | REG-09 | E-23 | REG-10, REG-27, REG-28 | E-40 | REG-32 |
| E-07 | REG-11 | E-24 | REG-29 | E-41 | REG-22 |
| E-08 | REG-08, REG-29 | E-25 | n/a | E-42 | REG-06 |
| E-09 | REG-25 | E-26 | n/a | E-43 | REG-12 |
| E-10 | REG-19, REG-20 | E-27 | REG-14, REG-21 | E-44 | REG-39, REG-42 |
| E-11 | REG-24 | E-28 | REG-23, REG-15 | E-45 | REG-03 |
| E-12 | REG-17 | E-29 | REG-07 (`@legacy-only`) | E-46 | REG-15 |
| E-13 | REG-17 | E-30 | REG-39 | E-47 | REG-02 |
| E-14 | REG-23 | E-31 | REG-13 | E-48 | REG-35 |
| E-15 | REG-40 | E-32 | REG-13 | E-49 | n/a |
| E-16 | REG-41, REG-42 | E-33 | REG-19 | E-50 | REG-22 |
| E-17 | REG-29 | E-34 | REG-15, REG-22 | E-54 | REG-25 |
| E-55 | REG-29 | | | | |

## 5. Matrice par identifiant de `09`

Colonnes : écran de `09` ; scénarios ; étiquette dominante ; statut sur `legacy` et sur `react` (`à faire`, `vert`, `rouge`, `sans objet`, avec phase et date) ; story ou test navigateur qui complète ; écart. Statuts initiaux : `à faire`.

### 5.1 Public (P1 (b), puis P4)

| Écran `09` | Scénario(s) | Étiquette | `legacy` | `react` | Story ou test navigateur | Écart |
| --- | --- | --- | --- | --- | --- | --- |
| G-01 | REG-01, REG-03 | `@parity` | vert (P1 (b), 3 oct.) | vert (P4 (b), 4 oct.) : REG-01 et les quatre variantes de REG-03 | stories `PageSkeleton`, tests de `Page` et `-routes.test.tsx` ; S4 (`e2e/hydration.spec.ts`) | E-45 |
| G-02 | REG-02, REG-05, REG-27 | `@changed` | vert (P1 (b), 3 oct.) ; REG-27 : P1 (c) | vert (P5 (a), 4 oct.) : REG-02, REG-05, REG-27 (connexion refusée sur la copie) | test de `useIsFromCache` ; S4 | E-47 |
| G-03 | REG-04, REG-05, REG-06 | `@parity` | vert (P1 (b), 3 oct.) | vert (P4 (b), 4 oct.) : REG-04, REG-05, REG-06 | stories et tests `LoadErrorBox` (en ligne, hors ligne, copie, « Réessayer »), stories `Page` | E-42 |
| G-04 | REG-01, REG-08 et tous les scénarios publics ; `smoke.spec.ts` | `@parity` | vert (P1 (b), 3 oct.) | vert (P4 (d), 4 oct.) : REG-01, REG-08, `smoke.spec.ts` et tous les scénarios publics `@p4` | stories de `Page` | E-08 |
| G-05 | REG-07 | `@legacy-only` | vert (P1 (b), 3 oct.) | sans objet ; variante `react` de REG-07 verte (P4 (a), 4 oct.) | stories et test Vitest de `ConfigBanner` (P4 (a)) | E-29 |
| G-07 | REG-27, REG-17 | `@changed` | vert (P1 (b), 3 oct.) ; REG-27 : P1 (c) | vert (P5 (a), 4 oct.) : REG-17, REG-27 (un seul toast, E-02) ; aucun scénario étiqueté `@G-07` | stories et tests de `Toaster` | E-02 |
| P-01 | REG-09, REG-11, REG-12 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (b), 4 oct.) : REG-09, REG-11, REG-12 | table des touches de `CalendarGrid` ; tests et stories de `RestaurantCalendar` | E-05, E-07, E-21 |
| P-01b | REG-09 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (b), 4 oct.) : REG-09 | story « semaine » ; tests de `RestaurantCalendar` | E-06 |
| P-02 | REG-10, REG-11 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (b), 4 oct.) : REG-10, REG-11 | story « mois » ; tests de `RestaurantCalendar` | E-23 |
| P-02b | REG-10, REG-12 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (b), 4 oct.) : REG-10, REG-12 | story « mois », jour hors période ; story `R2AfterTen` de `RestaurantCalendar` | E-43 |
| P-03 | REG-14 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (b), 4 oct.) : REG-14 | story `DayCardR1` `NoService` ; tests de `DayCardR1` | — |
| P-04 | REG-14 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (b), 4 oct.) : REG-14 | stories `DayCardR1` `Available`, `AlmostFull`, `CapacityPill` ; tests de `DayCardR1` | E-27 |
| P-05 | REG-15 à REG-20, REG-08, REG-13 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (d), 4 oct.) : REG-08, REG-13, REG-15 à REG-20 et la variante « midnight keeps the open form's date » de REG-25 | stories et tests de `BookingFormR1` | E-03, E-19, E-34, E-35, E-46 |
| P-06 | REG-13, REG-17, REG-19 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (d), 4 oct.) : REG-13, REG-17, REG-19 | stories et tests de `BookingSummary` | E-12, E-32, E-33 |
| P-07 | REG-14 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (b), 4 oct.) : REG-14 | story `DayCardR1` `Full` ; tests de `DayCardR1` | E-27 |
| P-08 | REG-14 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (b), 4 oct.) : REG-14 | story `DayCardR1` `Past` ; tests de `DayCardR1` | — |
| P-10 | REG-21 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (b), 4 oct.) : REG-21 | story `DayCardR2` `NoService` ; tests de `DayCardR2` | — |
| P-11 | REG-21 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (b), 4 oct.) : REG-21 | story `DayCardR2` `WithoutDishes` ; tests de `DayCardR2` | — |
| P-12 | REG-21, REG-26 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (b), 4 oct.) : REG-21, REG-26 | story `DayCardR2` `Open` ; tests de `DayCardR2` | E-01 |
| P-13 | REG-22, REG-24, REG-25, REG-13 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (d), 4 oct.) : REG-13, les deux variantes de REG-22, REG-24, REG-25 (10 h et contrôle à l'envoi) | stories et tests de `OrderFormR2` (`OrderFormR2.test.tsx`, `OrderFormR2.send.test.tsx`), tests de `order-rules.ts` | E-09, E-11, E-34, E-41, E-50 |
| P-14 | REG-23 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (d), 4 oct.) : REG-23 | stories de `BookingSummary` R2 ; tests d'envoi de `OrderFormR2` | E-14, E-28 |
| P-15 | REG-12, REG-25, REG-26 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (d), 4 oct.) : REG-12, REG-26 et les cinq variantes de REG-25 (10 h, contrôle à l'envoi, trois variantes de minuit) | tests de `background/clock.ts` (dont `syncClock` et commande en vol) ; story `DayCardR2` `ClosedAt10` ; tests de `DayCardR2` | E-01, E-09, E-43 |
| P-16 | REG-21 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (b), 4 oct.) : REG-21 | story `DayCardR2` `AllSoldOut` ; tests de `DayCardR2` | E-27 |
| P-17 | REG-21 | `@changed` | vert (P1 (b), 3 oct.) | vert (P4 (b), 4 oct.) : REG-21 | story `DayCardR2` `Past` ; tests de `DayCardR2` | — |
| `09` § 7 | REG-43 | `@parity` | vert (P1 (b), 3 oct.) | vert (P4 (a), 4 oct.) | test de `Header` | — |

### 5.2 Collègue (P1 (c), puis P5)

Fichiers (P1 (c)) : `staff-access.spec.ts` REG-27, REG-28 ; `staff-session.spec.ts` REG-29 à REG-31 ; `staff-settings.spec.ts` REG-32 ; `staff-open-day.spec.ts` REG-33 ; `staff-open-day-r2.spec.ts` REG-34 ; `staff-r1.spec.ts` REG-35 ; `staff-r1-add.spec.ts` REG-36 ; `staff-r2.spec.ts` REG-37, REG-38 ; aides communes dans `staff-helpers.ts` (connexion avec le mot de passe du jeu de base, voile, corps par action, absence de noms). Chaque scénario est découpé en tests au même préfixe ; un test porte `@parity` quand toutes ses assertions sont communes. Côté `legacy`, deux pertes de focus relevées sous le voile (focus sur `body` après la connexion et après une suppression) sont rangées sous E-04 ; « Annuler » d'une modification laisse aussi le focus sur `body` (`03` § 5.4), d'où E-48.

| Écran `09` | Scénario(s) | Étiquette | `legacy` | `react` | Story ou test navigateur | Écart |
| --- | --- | --- | --- | --- | --- | --- |
| G-06 | REG-27, REG-35 | `@changed` | vert (P1 (c), 3 oct.) | partiel (P5 (a), 4 oct.) : REG-27 vert (bouton occupé, aucun voile) ; REG-35 attend P5 (b) et (d1) | — (disparu) | E-04 |
| G-08 | REG-27, REG-28 | `@changed` | vert (P1 (c), 3 oct.) | vert (P5 (d1), 4 oct.) : REG-27 (P5 (a)) et REG-28 (rechargement de `/collegue?r1=…&editResa=…`, connexion, retour exact, formulaire rouvert) ; garde et retour exact aussi dans `e2e/staff-session.spec.ts` (`react-only`) | `routes/-collegue.test.tsx` (garde, schéma, chargeur) | E-23 |
| L-01 | REG-27 | `@parity` + `@changed` | vert (P1 (c), 3 oct.) | vert (P5 (a), 4 oct.) : les quatre tests de REG-27 | stories et tests de `ModeSwitch` | E-02, E-04 |
| C-02 | REG-32, REG-29 | `@parity` + `@changed` | vert (P1 (c), 3 oct.) | vert (P5 (e), 4 oct.) : les quatre tests de REG-32 et REG-29 (« Paramètres » ouvert puis fermé par la déconnexion, E-24) | stories `SettingsPanel` `Closed`, `Open`, `InvalidValues` ; `SettingsPanel.test.tsx`, `mutations/staff/settings.test.tsx`, `domain/settings.test.ts` | E-18, E-37, E-40 |
| C-04 | REG-33, REG-30 | `@parity` + `@changed` | vert (P1 (c), 3 oct.) | partiel (P5 (b), 4 oct.) : REG-33 « picker », « past day by default », « day already open » verts ; REG-33 « success » vert jusqu'à sa dernière assertion (« Aucune réservation. », `BookingListR1` de P5 (d1)) ; REG-30 vert (P5 (d2)) | stories `OpenDayFormR1` (`Closed`, `Open`, `DatePicker`, `Errors`) ; tests de `OpenDayFormR1` | E-36 |
| C-05 | REG-33, REG-29 | `@parity` + `@changed` | vert (P1 (c), 3 oct.) | partiel (P5 (b), 4 oct.) : REG-33 « picker » vert ; REG-29 attend P5 (d1) et (e) | stories et tests de `DatePickerPopover` ; story `OpenDayFormR1` `DatePicker` | E-05 |
| C-06 | REG-34 | `@parity` + `@changed` | vert (P1 (c), 3 oct.) | vert (P5 (b), 4 oct.) : les deux tests de REG-34 | stories `OpenDayFormR2` (`Open`, `VoucherLine`, `Errors`, `AlreadyOpen`) ; tests de `OpenDayFormR2` | E-36, E-39 |
| C-10 | REG-35, REG-33 | `@parity` + `@changed` | vert (P1 (c), 3 oct.) | partiel (P5 (d1), 4 oct.) : lignes, « Ouvert par » et jauge de REG-35 « lines and actions » vertes quand les boutons de `DayActions` existent (essai local avec des boutons provisoires, non commité) ; ce test attend « + Ajouter une personne » (P5 (d2)), « Modifier ce jour » et « Supprimer ce jour » (P5 (b)), « Imprimer la liste » (P6 (a)) ; REG-33 attend P5 (b) | story `StaffDayCardR1` `OpenDay` ; stories `BookingList` `R1Bookings`, `NoBookings` ; `BookingList.test.tsx`, `booking-line.test.ts` | E-36, E-38 |
| C-10b | REG-35 | `@parity` | vert (P1 (c), 3 oct.) | partiel (P5 (d1), 4 oct.) : message de P5 (a) vérifié contre `05` § 4.3 ; il est asserté à la fin de REG-35 « lines and actions », qui attend les boutons de P5 (b), (d2) et P6 (a) (voir C-10) | stories `StaffDayCardR1` et `StaffDayCardR2` `NoService` ; `routes/-collegue.test.tsx` | — |
| C-11 | REG-35 | `@parity` + `@changed` | vert (P1 (c), 3 oct.) | vert (P5 (d1), 4 oct.) : REG-35 « edit form checks and cancel » (`@changed:E-48`) et « edit sent » | stories `EditBookingFormR1` `Open`, `BeforePrices` ; `EditBookingFormR1.test.tsx` | E-48 |
| C-12 | REG-36, REG-30 | `@parity` | vert (P1 (c), 3 oct.) | vert (P5 (d2), 4 oct.) : REG-36 et REG-30 | stories `AddBookingFormR1` (`Open`, `Errors`) ; `AddBookingFormR1.test.tsx`, `add-booking.test.ts` | — |
| C-13 | REG-35 | `@parity` | vert (P1 (c), 3 oct.) | vert (P5 (b), 4 oct.) : REG-35 « edit the day » ; variante E-55 de REG-29 verte | stories `EditDayFormR1` (`Open`, `BelowBooked`) ; tests de `EditDayFormR1` | — |
| C-14 | REG-35, REG-37 | `@parity` + `@changed` | vert (P1 (c), 3 oct.) | vert (P5 (b), (c) et (d1), 4 oct.) : variantes jour (REG-35 « delete a day with bookings »), réservation (REG-35 « delete a booking in two clicks ») et plat (REG-37 « stock below… ») vertes | stories et tests de `ConfirmButton` ; story `BookingList` `DeleteArmed` ; `BookingList.test.tsx` ; story `DishForm` `DeleteArmed`, `DishForm.edit.test.tsx` ; stories et tests de `ConfirmButton` ; stories `DeleteDayButton` (`AtRest`, `Armed`) ; tests de `DeleteDayButton` | E-04, E-38 |
| C-20 | REG-37 | `@parity` | vert (P1 (c), 3 oct.) | vert (P5 (c), (d1), (d2), 4 oct.) : REG-37 « dish added and edited » vert (« + Ajouter une personne » en tête des actions du plat, P5 (d2)) | stories `StaffDayCardR2` `OpenDay`, `DishForm` `DishActions` | — |
| C-21 | REG-37 | `@parity` | vert (P1 (c), 3 oct.) | fait (P5 (c), 4 oct.) : vert dans REG-37 « dish added and edited » jusqu'aux emplacements de P5 (d1) et (d2) | stories `DishForm` `AddDish`, `AddDishRefused` ; `DishForm.test.tsx` | E-39 |
| C-22 | REG-37 | `@parity` + `@changed` | vert (P1 (c), 3 oct.) | vert (P5 (c), 4 oct.) : REG-37 « stock below… » ; partie modification de « dish added and edited » verte (voir C-20) | stories `DishForm` `EditVoucherDish`, `EditStockBelowBooked` ; `DishForm.edit.test.tsx` | E-36, E-38 |
| C-23 | REG-38 | `@parity` + `@changed` | vert (P1 (c), 3 oct.) | vert (P5 (d2), 4 oct.) : REG-38 « person added after 10 h » | stories `AddBookingFormR2` (`VoucherDay`, `OtherDay`) ; `AddBookingFormR2.test.tsx` | E-36 |
| C-24 | REG-38 | `@parity` + `@changed` | vert (P1 (c), 3 oct.) | vert (P5 (d1), 4 oct. ; constaté par P5 (d2) sur la pointe de l'intégration) : REG-38 « booking edited » | stories `EditBookingFormR2` `VoucherDay`, `OtherDay` ; `EditBookingFormR2.test.tsx` | E-36 |
| C-30 | REG-29, REG-30, REG-31 | `@parity` + `@changed` | vert (P1 (c), 3 oct.) | partiel (P5 (d2), 4 oct.) : REG-30 et REG-31 verts, REG-29 attend « Paramètres » (P5 (e)) ; les trois déconnexions sont vertes dans `e2e/staff-session.spec.ts` (`react-only`, P5 (a), 4 oct.) | tests S8 de `routes/-collegue.test.tsx` et `mutations/staff/write.test.tsx` (dont déconnexion pendant une écriture retenue) | E-08, E-17, E-24 |
| `09` § 6 | REG-27 (L-01), REG-33 (C-05), REG-35 (C-14) | — | vert (P1 (c), 3 oct.) | partiel (P5 (a), 4 oct.) : REG-27 vert | — | — |

### 5.3 Impression et invariants (P1 (d), puis P6)

| Écran `09` | Scénario(s) | Étiquette | `legacy` | `react` | Story ou test navigateur | Écart |
| --- | --- | --- | --- | --- | --- | --- |
| C-01 | REG-39 | `@changed` | vert (P1 (d), 3 oct.) | partiel (P5 (e), 4 oct.) : ligne de totaux verte (titre, « 15 couverts réservés », « 4 portions réservées » sans l'orpheline, un seul panneau ; variante « demain sans jour » : « 0 couvert réservé », « 0 portion réservée ») ; les deux tests échouent ensuite sur les blocs par restaurant et « Aucun jour ouvert pour demain. » (P6 (b)) | stories `TomorrowPanel` `Tomorrow`, `NoServiceTomorrow` ; `TomorrowPanel.test.tsx` | E-30 |
| C-03 | REG-39 | `@changed` | vert (P1 (d), 3 oct.) | à faire | — (fusionné dans C-01) | E-30, E-44 |
| I-00 | REG-40 (variante `@legacy-only`) | `@changed` | vert (P1 (d), 3 oct.) | sans objet | — (disparu) | E-15 |
| I-01 | REG-40 | `@changed` | vert (P1 (d), 3 oct.) | vert (P6 (a), 4 oct.) : REG-40 (06 et gala du 12, E-20) ; document seul à l'impression, titre rétabli, `.print-root` vide et focus rendu après `afterprint` (`e2e/print-pdf.spec.ts`) | stories `ListDocumentR1` (`Bookings`, `DetailedTotal`, `LongList`, `NoBookings`, `DayClosed`) ; `ListDocumentR1.test.tsx`, `PrintListButton.test.tsx`, `ui/print/print.test.ts` ; `e2e/print-pdf.spec.ts` (A4 paysage, longue liste sur plusieurs pages) | E-15, E-20 |
| I-02 | REG-41 | `@changed` | vert (P1 (d), 3 oct.) | à faire | rendu de `ListDocumentR2` | E-16 |
| I-03 | REG-42 | `@changed` | vert (P1 (d), 3 oct.) | partiel (P6 (a), 4 oct.) : document C vert jusqu'à la ligne 126 de REG-42 avec un bouton « Imprimer » provisoire dans `TomorrowPanel` (non commité) ; le bouton du bloc R1 et le document D viennent de P6 (b) | stories `TomorrowDocumentR1` (`Tomorrow`, `NoBookings`, `NoDay`) ; `TomorrowDocumentR1.test.tsx` | E-44 |
| I-04 | REG-42 | `@changed` | vert (P1 (d), 3 oct.) | à faire | rendu de `TomorrowDocumentR2` | E-16, E-44 |
| invariant 1 | REG-29, REG-30 | — | P1 (c) | partiel (P5 (d2), 4 oct.) : REG-30 vert ; REG-29 attend P5 (e) | test S8 | E-17 |
| invariant 2 | REG-02, REG-03, REG-20 | — | vert (P1 (b), 3 oct.) | vert (P4 (c), relevé en P4 (d), 4 oct.) : REG-02, REG-03, REG-20 | tests de `api/hedged-read.ts`, `early-fetch.ts` | E-45, E-47 |
| invariant 3 | REG-08, REG-18, REG-19, REG-36 | — | vert (P1 (b), 3 oct.) ; REG-36 : P1 (c) | vert (P4 (c) ; REG-36 : P5 (d2), 4 oct.) | tests de `mutations/bookings.ts`, de `BookingFormR1` et de `AddBookingFormR1` (`requestId` gardé, renouvelé à la réouverture) | — |
| invariant 4 | REG-25 (minuit compris), REG-26, REG-38 | — | vert (P1 (b) ; minuit : P1 (d), 3 oct.) ; REG-38 : P1 (c) | partiel (P4 (d), 4 oct.) : REG-25 (cinq variantes) et REG-26 verts ; REG-38 vert (P5 (d2)) | tests de `domain/cutoff.ts` et de `background/clock.ts` (10 h, minuit) | E-01, E-09 |
| invariant 5 | REG-22, REG-23, REG-38, REG-39, REG-41, REG-42 | — | vert (P1 (b), P1 (d), 3 oct.) ; REG-38 : P1 (c) | partiel (P4 (d), 4 oct.) : REG-22, REG-23 verts ; REG-38 vert (P5 (d2)) ; REG-39, REG-41, REG-42 en P6 | tests de `domain/pricing.ts`, `domain/print.ts` | E-16, E-36 |
