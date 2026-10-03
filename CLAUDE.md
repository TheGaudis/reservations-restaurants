# Réservations — restaurants pédagogiques (frontend React)

Site de réservation des deux restaurants pédagogiques du lycée Aristide Briand. Frontend React 19 + TanStack Start
(mode SPA) publié sur GitHub Pages ; backend Google Apps Script (`Code.gs`) et Google Sheets, inchangés.
Les mainteneurs sont des enseignants : code simple, explicite, documenté.

## Références

- Comportements et textes : `docs/spec/` (fait foi). Renvois « 04 § 5.2 » ; points `a-*`, `b-*`, `c-*` : `docs/spec/README.md` § 3.
- Architecture et décisions : `docs/migration/PLAN.md` (§ 3 architecture, § 4.1 décisions, § 4.2 écarts E-xx, § 6 pièges,
  annexe E glossaire, annexe F textes nouveaux).
- Justifications techniques : `docs/migration/recherche/` (propositions contraires aux arbitrages : PLAN § 6.1) ;
  configuration de référence : `docs/migration/recherche/spike-integration/`.
- Parité : `docs/migration/parite.md` (scénarios REG-xx). Sessions : `docs/migration/lancements.md`, journaux dans
  `docs/migration/journal/`.

## Commandes

- `pnpm install` : dépendances (pnpm 12, Node ≥ 22.18) et hooks git (`lefthook install`).
- `pnpm dev` : serveur de développement sur le **faux script** (msw, `.env.development`). `pnpm dev:real` (vrai script,
  `.env.real.local`, bandeau « Données réelles ») est réservé au responsable, jamais lancé par un agent.
- `pnpm build` puis `pnpm serve` : le site tel que GitHub Pages le sert (port 4311). Jamais `vite preview` (il fait du SSR).
- `pnpm check:fast` (avant chaque commit, et hook pre-push) : extraction i18n, format, lint, `tsc`, tests `node` et `node-ny`.
- `pnpm check` (avant une PR) : idem + tous les projets Vitest (navigateur, stories dès P3) et knip. Puis `pnpm build:e2e`,
  `git diff --exit-code src/routeTree.gen.ts translations/fr.json` et les E2E de ton périmètre.
- `pnpm test:node`, `pnpm test:browser`, `pnpm test`, `pnpm test:e2e` (sur le build de `pnpm build:e2e`), `pnpm test:e2e:legacy`,
  `pnpm storybook` (dès P3), `pnpm budget` (après `pnpm build`). Un projet Playwright s'écrit avec `=` :
  `pnpm test:e2e --project=react-only e2e/smoke.spec.ts`. Deux sessions en parallèle : `E2E_REACT_PORT` et `E2E_LEGACY_PORT`.
- oxlint et oxfmt passent par les scripts (`pnpm lint`, `pnpm format`, `pnpm lint:fix`), qui ajoutent `--disable-nested-config` :
  sans lui, les deux outils lisent la configuration du projet d'essai de `docs/migration/recherche/`.
- `pnpm i18n:extract` après tout ajout ou changement de message.
- CI (`.github/workflows/ci.yml`) : jobs `check`, `browser`, `e2e` sur chaque PR ; `deploy` sur un push vers `main` seulement.

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
  `PageSkeleton` tant que `useHydrated()` (`features/page/use-hydrated.ts`) vaut `false` (route `/`, essai validé en P0 (b)) ;
  jamais `pendingMinMs: 0` sans cette barrière, jamais de `onRecoverableError` pour masquer l'erreur #418.

## Où vit l'état

- URL (search params valibot + `v.fallback`) : jours, vues, formulaire ouvert, panneaux collègue.
- TanStack Query : ce que dit le script (`['state','public']`, `['state','staff', id]`).
- Zustand (`session/`, `background/clock.ts`) : session collègue et heure ; toujours lu avec un sélecteur.
- TanStack Form : les saisies (aucun `useState` pour une valeur de formulaire).
- `useState` : l'éphémère seulement (récapitulatif, `requestId`, bouton armé). Le reste se calcule avec `domain/`.

## React

- 0 à 2 `useEffect` dans toute l'appli, chacun commenté sur la ligne au-dessus (système extérieur à synchroniser ; vérifié en CI).
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
- Champs du script et de la copie locale (`Date`, `Capacite`, `Qte`, `Nom`…) seulement dans `api/schemas.ts`, `api/actions.ts`,
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
- Un test rangé dans `src/routes/` porte le préfixe `-` (`-routes.test.tsx`) : sinon le générateur le lit comme une route.

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
