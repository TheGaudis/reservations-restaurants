# Journal — REG-02 et REG-05 instables sous charge

*4 octobre 2026. Branche locale `claude/fix-flaky-reg02-reg05`, partie de `0d8427d` (pointe de l'intégration). Pas de push : l'orchestrateur fusionne.*

Conditions : build `pnpm build:e2e` servi par `pnpm serve`, Chromium 141 (`/opt/pw-browsers/chromium`), 4 cœurs, 2 workers Playwright sauf mention contraire. Charge artificielle : N boucles shell `while :; do :; done` lancées 3 s avant Playwright (« N boucles ») ; charge moyenne relevée par `uptime`. Une session P6 (b) tournait par moments sur la machine : la charge relevée l'inclut.

## REG-05 (et REG-03 « no new attempt offline ») : lecture de rattrapage après la fin du test

### Cause

1. Les deux scénarios finissaient par `await context.setOffline(false)`, sans assertion après.
2. Le retour du réseau déclenche la lecture de rattrapage de `03` § 5.1 (`refetchOnReconnect` de TanStack Query, observateur `AutoRefresh`) : `?since=E1` pour REG-05, environ 110 ms plus tard (mesuré : 109, 115, 139 ms).
3. Le test était déjà fini. Playwright démonte `network` (`network.disable()` de `e2e/fixtures.ts`) avant de fermer le contexte, donc la page vit encore. Quand la lecture part après `network.disable()`, aucun handler msw ne la prend, l'isolation l'avorte et la fixture échoue : « requests to the script that the fake script did not answer », `https://script.google.com/macros/s/FAKE/exec?since=E1`. Sous charge, la lecture part plus tard et perd la course plus souvent.

L'appli suit la spec. Le défaut vient de la dernière ligne des deux scénarios. La note de p5e (« une lecture part avant le passage hors ligne ») ne tient pas : la lecture avortée part après la remise en ligne.

### Correction

Commit `5682e94` : la ligne `await context.setOffline(false)` disparaît de REG-05 (`loading.spec.ts`) et de REG-03 « no new attempt offline » (`loading-reads.spec.ts`). Le contexte appartient au test et Playwright le jette ensuite : la remise en ligne ne servait à rien. Aucune assertion modifiée.

### Mesures

| Scénario (projet `react`) | Avant | Après |
| --- | --- | --- |
| REG-05, 8 boucles (charge 10 à 13), `--repeat-each=20` | 6 rouges sur 20 | 20 verts sur 20, deux fois (charge 12 à 15, puis 7 à 13) |
| REG-03 « no new attempt offline », mêmes conditions | 14 rouges sur 20 | 20 verts sur 20, deux fois |
| Les deux sur `legacy`, `--repeat-each=3` | — | verts |

## REG-02 : mesure prise depuis le début de la navigation

### Cause

1. REG-02 comparait à 600 ms l'instant du premier bouton de jour compté depuis l'origine de `performance.now()`, c'est-à-dire le début de la navigation (vérifié : sous `page.clock.setFixedTime`, le `performance.now()` factice de Playwright suit le temps réel depuis cette origine).
2. Ce compte inclut des étapes où le squelette n'est pas à l'écran : le document puis les huit feuilles de styles, qui bloquent les scripts en ligne du `<head>` et donc l'analyse du `<body>`, passent par deux `context.route` (isolation et msw) traités dans le processus Node du worker Playwright ; le script d'horloge de Playwright s'exécute ensuite (16 ms de CPU dans `ClockIntl.DateTimeFormat` au repos, profil CPU), puis les scripts d'amorçage du test. Au repos, cette partie prend 140 à 250 ms ; sous charge, c'est elle qui grossit le plus (265 à 850 ms sous 8 boucles).
3. S4 (« squelette ≤ 600 ms ») et E-47 (« squelette de la coquille prérendue affiché jusqu'à la fin de l'hydratation (≤ 600 ms) ») bornent la durée d'affichage du squelette. `e2e/hydration.spec.ts`, le test de S4, la mesure déjà du premier squelette au contenu.

### Correction

Commit `4de1355` : REG-02 relève l'instant où `main[aria-busy="true"]` (squelette prérendu) entre dans le DOM et l'instant du premier bouton de jour. Il exige squelette présent, contenu après le squelette, et au plus 600 ms entre les deux. Les assertions d'ordre restent : contenu de la copie visible et réservable avant toute réponse du script, une seule lecture `?since=E1`.

Pourquoi la mesure reste fidèle à S4 sans devenir plus laxiste : elle commence à l'insertion du squelette, avant sa première peinture (style, mise en page), donc elle compte un peu plus que le temps d'affichage réel ; elle exclut seulement le temps où l'écran ne montre encore rien de l'appli, qui dépend du réseau et du banc de test. La variante `legacy` (`shownWhenParsed`) ne change pas.

### Mesures

Mesures appariées (même chargement, les deux comptes relevés ensemble) par une sonde temporaire qui reprend REG-02 à l'identique, non commitée, 40 chargements par ligne :

| Charge | Ancien compte (navigation → contenu) | Nouveau compte (squelette → contenu) | Navigation → squelette |
| --- | --- | --- | --- |
| aucune boucle (charge 7 à 9 en fin de série) | médiane 415, max 492 ; 0 sur 40 au-delà de 600 | médiane 230, max 314 ; 0 sur 40 | médiane 178, max 250 |
| 4 boucles (charge 6 à 10) | médiane 643, max 821 ; 34 sur 40 | médiane 343, max 466 ; 0 sur 40 | médiane 302, max 455 |
| 8 boucles (charge 7 à 12) | médiane 869, max 1 525 ; 40 sur 40 | médiane 419, max 760 ; 6 sur 40 | médiane 402, max 850 |
| 8 boucles et session P6 (b) (charge 18 à 21) | médiane 1 859, max 4 664 ; 40 sur 40 | médiane 647, max 2 430 ; 22 sur 40 | médiane 1 120, max 2 618 |

REG-02 lui-même, `--repeat-each=30` :

| Charge | Avant (`0d8427d`) | Après (`4de1355`) |
| --- | --- | --- |
| 4 boucles (charge 6 à 9) | 29 rouges sur 30 | 30 verts sur 30 |
| 8 boucles (charge 9 à 12) | 20 rouges sur 20 (charge 12 à 16, 935 à 2 727 ms) | 30 verts sur 30 ; 1 rouge sur 20 dans une autre série à charge 14 (603 ms) |
| 16 boucles (charge 11 à 20) | — | 6 rouges sur 30 (627, 636, 642, 647, 672, 827 ms) |

### Résiduel : la durée du squelette sous forte charge

Trace Chromium (`devtools.timeline`, fil `CrRendererMain`, durée et temps CPU des tâches) entre l'insertion du squelette et le contenu :

| Charge | Fenêtre squelette → contenu | Tâches du fil principal (durée) | Temps CPU du fil principal |
| --- | --- | --- | --- |
| repos, 1 worker (5 chargements) | 196 à 214 ms | 177 à 192 ms | 164 à 178 ms |
| 12 boucles, 1 worker (8 chargements) | 299 à 591 ms | 162 à 221 ms | 140 à 179 ms |

- Le travail de l'appli dans la fenêtre reste d'environ 165 ms de CPU quelle que soit la charge : évaluation du module d'entrée (environ 50 ms), `getRouter` et `hydrateStart` (environ 10 ms), hydratation du squelette puis rendu du contenu (environ 70 ms), mise en page. Au repos, le fil principal est occupé 90 % de la fenêtre : aucune attente évitable (minuterie, requête en série, chargement mal ordonné).
- Sous charge, la fenêtre s'allonge parce que le renderer attend le processeur entre ses tâches, et que les modules JS passent aussi par le processus Node de Playwright. Au-delà d'environ 3 fois le nombre de cœurs (12 sur 4), la fenêtre dépasse 600 ms une fois sur 5 à 7 ; vers 5 fois (20 sur 4), une fois sur 2.
- Le profil CPU ne montre aucun travail en double (pas de formateur `Intl` recréé en boucle, pas de second rendu complet) ; l'interrogation de `expect` pendant la fenêtre ne change rien de mesurable (essai apparié « attente par promesse » contre « attente par `expect` »).

Le seuil de 600 ms n'est donc pas tenable sur une machine surchargée par d'autres processus, pour une raison qui ne vient pas de l'appli. Je ne l'ai pas changé.

## Proposition pour S4 (à trancher par l'orchestrateur)

Deux formulations possibles, de la plus simple à la plus robuste :

1. **Seuil en temps réel, conditions précisées** : « squelette ≤ 600 ms, mesuré de l'insertion du squelette prérendu au premier contenu, sur une machine dont la charge reste sous 2 fois le nombre de cœurs (CI : 4 vCPU, 2 workers) ; au-delà, seul l'ordre fait foi (squelette, puis contenu de la copie, avant toute réponse du script) ». Le test ne change pas ; un rouge de REG-02 sous une charge relevée au-delà de ce seuil se note au journal sans bloquer.
2. **Budget de travail, indépendant de la charge** : « travail du fil principal entre l'insertion du squelette et le contenu ≤ 300 ms de CPU » (165 ms mesurés au repos), relevé par une trace Chromium (`browser.startTracing`, temps de thread des tâches de `CrRendererMain`) dans `e2e/hydration.spec.ts`, le seuil de 600 ms en temps réel restant vérifié en CI. Plus robuste, mais il ajoute un analyseur de trace au test.

## Fait

- Commits : `5682e94` (REG-03, REG-05), `4de1355` (REG-02), puis ce journal.
- `pnpm check` vert (206 fichiers, 2 540 tests, knip) ; `pnpm build:e2e` puis `git diff --exit-code src/routeTree.gen.ts translations/fr.json` sans écart.
- `pnpm test:e2e --project=react --grep "@p4|@p5|@framework"` : 70 verts sur 70 (charge 9 à 12).
- `pnpm test:e2e:legacy` : 76 verts sur 76.

## Reste

- Décision sur S4 (ci-dessus).
- `PLAN.md` § 1.5 (S4) et § 4.2 (E-47) disent « squelette ≤ 600 ms » sans dire d'où part la mesure : à préciser par l'orchestrateur selon sa décision.

## Versions et overrides

Aucun paquet ajouté, aucune version changée, aucun override oxlint.
