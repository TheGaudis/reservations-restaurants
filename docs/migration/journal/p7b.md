# Journal de la session P7 (b) — accessibilité, budget, procédure de validation

*4 octobre 2026. Branche locale `claude/p7b-accessibilite`, partie de `2d3fc69` (P0 à P6). Pas de PR ni de push : l'orchestrateur fusionne la branche locale. Chromium de `/opt/pw-browsers/chromium`, ports 4860 / 4861 / 63460. P7 (a) n'est pas encore passée ; une autre session étudie REG-02, REG-03 et REG-05 (charge de la machine entre 13 et 17 pendant la session).*

## Commits

1. `a7e811a` Impression : date du document D en `h2` au-dessus des titres de plats (07 § 7, S5).
2. `5016e5f` Accessibilité : axe sur huit écrans complets et titres du panneau « Demain » (PLAN § 1.5, S5).
3. Procédure de validation, journal et matrice de parité (ce commit).

## Fait

- `e2e/a11y.spec.ts` (projet `react-only`, build de `build:e2e`) : `AxeBuilder` de `@axe-core/playwright` 4.13.0 sur G-02 (copie locale, script retenu), G-04 en semaine puis en mois (les deux colonnes), P-05 ouvert puis après un envoi vide (erreurs sous les champs), P-13, L-01, G-08 et C-02 ouvert. Toutes les règles d'axe-core actives par défaut, aucune coupée, aucune liste d'exceptions ; `reducedMotion: "reduce"` pour qu'axe ne lise pas une couleur en pleine animation. Le rapport d'échec donne une ligne par nœud (règle, impact, cible, résumé).
- Point 1 de l'orchestrateur, `TomorrowDocumentR2` : `PrintLayout` reçoit `subtitleHeading` ; la date « Demain, mardi 6 octobre 2026 » du document D devient un `h2` au rendu identique (`.document .subtitle` passe devant la règle `.document h2`). Les titres de plats restent des `h3` sous ce `h2`. Paramètre `a11y` des stories retiré ; `TomorrowDocumentR2.test.tsx` vérifie le `h2`.
- Point 2 : aucune autre règle coupée. `grep -rn "disable\|rules:\|a11y" src --include=*.stories.tsx` ne trouvait que la story ci-dessus ; `.storybook/preview.tsx` garde `a11y: { test: "error" }` sans configuration de règles ; aucune story exclue des tests (`!test`, `test: "off"`).
- Violation trouvée par `e2e/a11y.spec.ts` sur G-08 et C-02 : `heading-order` (le `h3` « Demain (…) » suivait le `h1` de la page). Titre du panneau en `h2`, noms des restaurants des blocs en `h3` (`TomorrowPanel`, `TomorrowBlocks`, police du corps et interlettrage gardés par `.blockName`). Tests et story du panneau mis à jour.
- Page object `columnTitle` (`e2e/pages/home.ts`) : écarte le `h2` « Demain (…) » pour garder les deux titres de colonnes (`nth(0)`, `nth(1)`) en mode collègue. Aucune assertion modifiée ; la variante `legacy` ne change pas (le panneau y reste un `h3`).
- `docs/migration/validation.md` : procédure pour le responsable (build local avec `.env.real.local`, ou artefact `dist-client` de la CI construit avec la variable de dépôt `VITE_APPS_SCRIPT_URL`), contrôles du build, tablettes, connexion collègue réelle, parcours, vérifications manuelles (lecteur d'écran, Safari iOS et tablettes, impression au lycée, montants au-delà de 999 € dans Chromium et WebKit), formulaire de retour, différences voulues, fin de validation. Avertissement R-30 en tête ; chaque jour de test est supprimé le jour même ; l'URL réelle n'y figure pas.
- `parite.md` : colonne « Story ou test navigateur » de G-02, G-04, P-05, P-13, L-01, G-08, C-02 (axe E2E) ; colonne `react` de C-01 et I-04 (niveaux de titres).

## Preuves

| Commande | Résultat |
| --- | --- |
| `pnpm build:e2e && pnpm test:e2e --project=react-only e2e/a11y.spec.ts --repeat-each 3` | 24 verts sur 24 (8 tests × 3), 0 violation |
| `pnpm test --project=storybook` | 56 fichiers, 185 stories vertes, axe en `error`, aucune règle coupée (`grep -rn "a11y" src --include=*.stories.tsx` : vide) |
| `pnpm check` | extraction, format, lint, `tsc` sans remarque ; Vitest 210 fichiers, 2 582 tests verts ; `knip` et `knip --production` sans remarque |
| `pnpm build:e2e && git diff --exit-code src/routeTree.gen.ts translations/fr.json` | aucune différence |
| `pnpm test:e2e:legacy` | 76 verts sur 76 |
| `pnpm test:e2e --project=react-only` | 20 verts sur 20 |
| `pnpm test:e2e --project=react --grep "@p4\|@p5\|@p6\|@framework"` | 75 verts sur 76 ; rouge : REG-02 (squelette à 1 038 ms pour 600 ms), voir « Instabilités » |
| `pnpm build && pnpm budget` | JS 180,4 kB, CSS 10,9 kB (voir « Budget ») |
| `pnpm exec vite build --mode real && node scripts/post-build.ts` (sans `.env.real.local`) | build complet, ni `mockServiceWorker.js` ni `setupWorker` ni « Données réelles » dans les fichiers JS : commande de la section 2.1 de `validation.md` vérifiée |

## Budget (S3)

`pnpm build && pnpm budget` (build de production sans `VITE_APPS_SCRIPT_URL`, comme les sessions précédentes ; gzip niveau 9), identique à P6 (b).

Chemin initial d'un visiteur de `/` : **JS 180,4 kB** (limite 200), **CSS 10,9 kB** (limite 25).

| Morceau initial (JS) | kB gzip |
| --- | --- |
| `index` (entrée : React, routeur, Query, intl, Base UI des toasts) | 113,9 |
| `toast` | 14,6 |
| `DishRow` (fiches, calendrier) | 13,0 |
| `compiler-runtime` | 9,5 |
| `routes` (route `/`) | 6,6 |
| `createBaseUIEventDetails` | 6,5 |
| `PageLayout` | 6,5 |
| `useOpenChangeComplete` | 3,6 |
| `common-messages`, `utils`, `react-dom`, `useSelector`, `dates`, `useRouter`, `logo` | 1,5 ; 1,5 ; 1,4 ; 0,9 ; 0,6 ; 0,2 ; 0,1 |

CSS initiale : `DishRow` 3,5 ; `PageLayout` 1,8 ; `tokens` 1,3 ; `routes` 1,1 ; `base` 1,0 ; `createBaseUIEventDetails` 0,8 ; `print` 0,7 ; `index` 0,6.

Morceaux chargés à la demande (JS, 111,2 kB en tout) :

| Morceau | kB gzip | Chargé |
| --- | --- | --- |
| `collegue` (page et fiches collègue) | 52,4 | à la connexion |
| `Form` (TanStack Form, champs de `ui/form`) | 36,2 | premier formulaire ouvert (public ou collègue) |
| `bookings` | 4,5 | formulaires et `/collegue` |
| `OrderFormR2` | 3,5 | « Réserver » en R2 |
| `PrintTable` | 2,5 | première impression |
| `BookingFormR1` | 1,9 | « Réserver » en R1 |
| `ListDocumentR1`, `ListDocumentR2`, `TomorrowDocumentR2`, `TomorrowDocumentR1` | 1,9 ; 1,5 ; 1,5 ; 0,9 | au clic sur « Imprimer » |
| `list-r2`, `SeatCountersR1`, `LoginPanel`, `print`, `$` (page introuvable), `booking-errors` | 1,0 ; 1,0 ; 0,9 ; 0,8 ; 0,4 ; 0,2 | à la demande |

CSS à la demande : `collegue` 2,0 ; `Form` 1,5 ; `PrintTable` 1,3 ; `OrderFormR2` 0,6 ; `SeatCountersR1` 0,5 ; `ListDocumentR1` 0,2 ; `bookings` 0,2. Les changements de cette session ne touchent que le panneau « Demain » et le document D, hors du chemin initial.

## Décisions

1. **Date du document D en `h2`** plutôt qu'un `h2` nouveau et masqué : aucun texte nouveau (annexe F inchangée), rendu imprimé identique, et REG-42 ne lit que le `h1` et les `h3`. Les documents A, B et C gardent leur paragraphe : REG-41 attend exactement deux `h2` dans le document B.
2. **Panneau « Demain » en `h2`, blocs en `h3`** : le panneau précède les colonnes dans l'ordre du document ; aucun autre niveau ne respecte `heading-order` sous le `h1` sans titre nouveau. REG-39 lit le titre par son nom, sans niveau ; seul `columnTitle` comptait les `h2`. Écart proposé ci-dessous (E-58).
3. **`columnTitle` modifié** (page object, pas une assertion) : la variante `react` d'un écran revient à la phase qui le livre (PLAN § 5.0) ; filtre par le texte « Demain ( » plutôt qu'une règle de structure, pour garder une seule définition sur les deux sites.
4. **Toutes les règles d'axe-core** dans `e2e/a11y.spec.ts` (pas de filtre `withTags`) : WCAG 2.x A et AA plus les bonnes pratiques (`heading-order`, `region`, `landmark-*`), comme le module a11y de Storybook.
5. **Build local de validation par `vite build --mode real`** : lit `.env.real.local` (PLAN § 3.11) sans l'URL dans l'historique du terminal ; en build, `DevDataBanner` et msw restent absents (`import.meta.env.DEV` faux).

## Écart proposé (PLAN § 4.2)

| Id | Sujet | Avant (spec) | Après | Raison | Scénario |
| --- | --- | --- | --- | --- | --- |
| E-58 | Niveaux de titres du panneau « Demain » et du document D | `h3` « Demain (…) » juste sous le `h1` (`06` § 2.1), nom du restaurant en `<b>` ; date du document D dans un paragraphe | `h2` « Demain (…) », noms des restaurants des blocs en `h3` ; date du document D en `h2` au-dessus des `h3` des plats (rendu identique) | S5 sans exception (axe `heading-order`, `e2e/a11y.spec.ts` et stories `TomorrowDocumentR2`) ; relevé par P7 (b) | n/a |

La colonne « Scénario » vaut « n/a » exact (`changedTagsMatchPlanGaps`) : aucun scénario de régression n'observe ces niveaux.

## Contradictions

- **`06` § 2.1 (extrait du DOM de l'ancien site : `<h3 class="dash-title">`) et `07` § 7 (titres de plats `h3` sous le `h1`) contre S5** (0 violation, sans exception) : tranché par les décisions 1 et 2, sous réserve d'E-58.
- **Lancement de P7 (b) : « P7 (a) a rendu la suite verte »** : P7 (a) n'est pas passée (adaptation de l'orchestrateur) ; critère réduit aux scénarios `@p4|@p5|@p6|@framework`.

## Instabilités (charge de la machine)

- REG-02 (`localCacheFirstRender`) rouge sous une charge de 13 à 17 : squelette affiché 733 à 1 038 ms pour un seuil de 600 ms. Même résultat sur `2d3fc69` sans cette branche (3 rouges sur 3 : 733, 988, 760 ms). Laissé à la session qui étudie REG-02.
- REG-03 hors ligne et REG-05 : verts pendant cette session.

## Reste à faire

- Orchestrateur : inscrire E-58 au PLAN § 4.2.
- `scripts/serve-pages.ts` (propriétaire P0 (b), puis P8) : option `--host` voulue par la section 2.4 de `validation.md` (tablettes et iPhone sur le réseau du lycée). Changement proposé, défaut inchangé pour l'E2E :
  - `parseArgs` : `host: { type: "string", default: "127.0.0.1" }` ;
  - `server.listen(port, values.host, …)` et le message `serving … at http://${values.host}:${port}${base}`.
  Tant que l'option manque, `pnpm serve --host 0.0.0.0` est refusé par `parseArgs` (option inconnue) et seule la validation sur le poste lui-même fonctionne.
- Vérifications manuelles et validation par les collègues (S9) : humaines, selon `validation.md`, relu par l'orchestrateur.
- Hors périmètre, non traités : exclusion knip `!src/domain/**!` (P6 (b), pour P7 (a)), REG-02, REG-03, REG-05.

## Overrides oxlint

Aucun.

## Versions

Aucune version changée, aucun paquet ajouté (`@axe-core/playwright` 4.13.0 était déjà dans `package.json`).

## Fichiers partagés modifiés

- `e2e/pages/home.ts` : `columnTitle` (décision 3).
- `src/ui/print/PrintLayout.tsx` et `.module.css` (P6 (a)) : prop `subtitleHeading`.
- `src/features/staff/TomorrowPanel.tsx`, `TomorrowBlocks.tsx`, `TomorrowPanel.module.css` (P5 (e), P6 (b)) : niveaux de titres.
- `docs/migration/parite.md` : lignes G-02, G-04, P-05, P-13, L-01, G-08, C-02, C-01, I-04.

## Pour l'orchestrateur (PLAN.md)

- Journal du plan : « P7 (b) : `e2e/a11y.spec.ts` (8 écrans, 0 violation, aucune règle coupée) ; `heading-order` rétabli dans les stories de `TomorrowDocumentR2` (date du document D en `h2`) ; panneau « Demain » en `h2` (E-58) ; budget 180,4 kB JS, 10,9 kB CSS ; `docs/migration/validation.md` à relire ».
- § 4.2 : ligne E-58 ci-dessus.
- § 3.8 : `PrintLayout` `subtitleHeading` (document D).
- § 3.11 : build de validation local par `vite build --mode real` puis `node scripts/post-build.ts` (lit `.env.real.local`).
