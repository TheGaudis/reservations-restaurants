# Journal de la session « impression en un composant par restaurant »

*4 novembre 2026. Bookmark `claude/print-merge`, parti de `claude/frontend-react-migration-lw5zfz` (`06b15bd`). Demande de l'orchestrateur : écrire les quatre documents imprimés en JSX, un composant par restaurant avec un drapeau `tomorrow` comme `printDayR1(date, tomorrow)` de `legacy/js/impression.js`, et ramener la lecture doublée à une course de promesses sans signaux d'annulation. Le papier imprimé ne change pas.*

## Fait

### Impression (07 § 2-7)

- `features/print/PrintListR1.tsx` (documents A et C) et `features/print/PrintListR2.tsx` (documents B et D) reçoivent l'instantané (`ListR1`, `ListR2`), `tomorrow` et `printedAt`. Chacun écrit ses `<table>` en JSX, colonnes et messages sur place (`<FormattedMessage>` en ligne, `defineMessage` local pour les textes calculés).
- `features/print/PrintFrame.tsx` : cadre commun (bandeau, en-tête, titre, date, informations, signature), repris de `ui/print/PrintLayout.tsx`, et pièces imprimées par les deux restaurants : `PrintInfo`, `OpenedByInfo`, `PrintTotal`, `PrintNote`, `NoDayTomorrowNote`, `NoBookingsRow`, `dotted`, `joinParts`, messages exportés `nameColumn` et `priceColumn`. Le cadre calcule lui-même « Demain, {date} ».
- `features/print/PrintFrame.module.css` réunit `PrintLayout.module.css` et `PrintTable.module.css`, règles et ordre inchangés. `ListDocumentR1.module.css` devient `PrintListR1.module.css`, sans changement.
- Un seul `import()` : `features/print/print-day.ts` (dans le morceau `/collegue`, 17 lignes) exporte `printDay({ restaurant, state, iso, tomorrow, opener })` et charge `features/print/print-documents.tsx`, qui calcule le titre du PDF, choisit le document et appelle `printDocument`. Le build produit un morceau `print-documents` (25 kB) à la place des quatre ; `ui/print/print.ts` reste un morceau à part, partagé avec l'`import()` de `background/logout.ts`.
- Supprimés : `list-r1.ts`, `list-r2.ts`, `document-texts.ts`, `ListDocumentR1/R2`, `TomorrowDocumentR1/R2` (composants, tests, stories), `ui/print/PrintLayout` et `ui/print/PrintTable` (composants, CSS, stories). Les types `PrintColumn`, `PrintColumnGroup`, `PrintRow`, `PrintCell` et `PrintInfo` (descripteur) disparaissent.
- Gardés sans changement : `ui/print/print.ts` (impression dans le document, titre, polices, purge à la déconnexion), `ui/print/PrintRoot.tsx`, `domain/print.ts` et son test, `styles/print.css`.
- Appelants : `PrintListButton.tsx` et `features/staff/TomorrowBlocks.tsx` appellent `printDay` (import et deux appels changés dans `TomorrowBlocks`, rien d'autre) ; `background/logout.test.ts` aussi (import et un appel).
- Tests : `PrintListR1.test.tsx` (10 cas) et `PrintListR2.test.tsx` (11 cas) reprennent les cas distincts des quatre anciens fichiers. Stories : `List`, `LongList`, `NoBookings`, `DayClosed`, `Tomorrow`, `TomorrowNoDay` pour R1 ; `List`, `NoDish`, `Tomorrow`, `TomorrowNoDish`, `TomorrowNoDay` pour R2.

### Lecture doublée (02 § 1.5, E-45)

- `api/hedged-read.ts` : `hedgedRead(attempt, early?)`, 48 lignes avec la doc. Une course de promesses : seconde tentative à 6 s (le temps restant pour la lecture anticipée, `startedAt`), première réponse gagnante, échec quand toutes les tentatives lancées ont échoué, avec la dernière erreur. `capped` borne chaque tentative à 30 s par un `setTimeout` et rejette une `ServiceError` (« The read took too long. »).
- Plus aucune annulation : une tentative perdante, ou d'une requête annulée par TanStack Query, va jusqu'au bout et son résultat est ignoré.
- `api/signals.ts` et son test supprimés (seuls `hedged-read.ts` et `state.ts` s'en servaient).
- `api/state.ts` : `fetchPublicState({ since })` sans `signal`. `api/transport.ts` : `getState(since)` sans `signal`. `queries/state.ts` (`readPublicState`) ne lit plus `signal`. `fetchFullState` garde le sien (POST, annulé par TanStack Query).
- `hedged-read.test.ts` : 5 cas (doublage à 6 s, première réponse gagnante pour chaque tentative, échec des deux, plafond de 30 s, lecture anticipée). Les cas d'annulation sont retirés.

### Lignes

| Fichiers | Avant | Après | Écart |
|---|---:|---:|---:|
| Impression, code TS/TSX (`features/print/`, `ui/print/`) | 1 572 | 1 235 | −337 |
| Impression, CSS Modules | 354 | 355 | +1 |
| Impression, tests et stories | 1 008 | 648 | −360 |
| Lecture doublée, code (`hedged-read.ts`, `signals.ts`) | 136 | 48 | −88 |
| Lecture doublée, tests | 204 | 104 | −100 |
| **Total** | **3 274** | **2 390** | **−884** |

Détail après : `PrintFrame.tsx` 234, `PrintListR1.tsx` 372, `PrintListR2.tsx` 397, `print-documents.tsx` 54, `print-day.ts` 17, `PrintListButton.tsx` 40, `ui/print/print.ts` 104, `PrintRoot.tsx` 17. Hors tableau, inchangés : `domain/print.ts` (253), `domain/print.test.ts` (259), `styles/print.css` (110).

## Décisions

1. **Code de l'impression : −337 lignes au lieu des 700 à 900 attendues.** Les quelque 70 messages des documents (5 à 7 lignes chacun : id, `defaultMessage`, `description`) restent ; seules les couches de descripteurs disparaissent. Un en-tête de colonne coûte le même nombre de lignes en `<FormattedMessage>` dans un `<th>` qu'en `defineMessage` plus une entrée de colonne.
2. **`PrintRoot.tsx` gardé.** Sans lui (fournisseur `intl` passé depuis `print-documents.tsx`, ou `createElement(RawIntlProvider, …)` dans `print.ts`), Rollup découpe autrement les modules partagés et le budget initial passe de 203,7 à 204,3 ou 204,4 kB. Avec lui : 203,7 kB, contre 204,4 kB sur `06b15bd`.
3. **Deux tableaux par composant.** A et C n'ont en commun que trois en-têtes : `PrintListR1` a `ListTable` (quadrillé, groupes, classes de largeur) et `TomorrowTable` (simple), comme les deux appels de `printTable` de `printDayR1`. `PrintListR2` a `ListBody` (B) et `TomorrowBody` (D).
4. **`data-variant="plain"` retiré.** `PrintFrame.module.css` ne cible que `[data-variant="grid"]` ; les tableaux simples n'ont plus l'attribut. Le rendu ne change pas.
5. **Plafond de 30 s : `ServiceError`** au lieu d'une `DOMException` `TimeoutError`. `retryRead` la rejoue de la même façon (seule une `BusinessError` est exclue) et `errors.ts` classe déjà le délai d'une lecture parmi les `ServiceError`.
6. **Minuteur du doublage posé avant la première tentative** : avec une lecture anticipée de plus de 30 s, la seconde tentative part avant l'échec de la première au lieu de laisser la lecture échouer.
7. **`fetchPublicState({ since })` garde son objet** pour ne pas toucher `state.test.ts`.

## Vérification

- `pnpm check` : vert (168 fichiers, 1 659 tests ; knip vert).
- `pnpm build:e2e` puis `git diff --exit-code src/routeTree.gen.ts translations/fr.json` : aucun écart. `translations/fr.json` est identique octet pour octet : 337 clés avant et après, mêmes textes et descriptions.
- `pnpm test:e2e --project=react-only --project=react` : 84 sur 84.
- `pnpm test:e2e --project=legacy e2e/regression/print.spec.ts e2e/regression/print-tomorrow.spec.ts` : 6 sur 6.
- `pnpm build && pnpm budget` : vert, 203,7 kB JS (limite 240), 11,4 kB CSS (limite 25) ; 204,4 kB JS sur `06b15bd`.

## Overrides

- `.oxlintrc.json`, override sur `src/features/print/PrintListR1.tsx` : `jsx-a11y/control-has-associated-label` avec `ignoreElements: ["td"]`. Les cases « N° table » et « Chef de rang » sont vides pour être remplies à la main (07 § 3). Exemple minimal du faux positif : un composant qui rend `<table><tbody><tr><td /></tr></tbody></table>` déclenche la règle, alors qu'un `<td>` d'un `<table>` sans rôle a le rôle `cell`.

## Reste

- Glossaire (PLAN annexe E) : ajouter « cadre » (`PrintFrame`) si l'orchestrateur le juge utile.
- `background/logout.ts` cite encore `ui/print/print.ts` dans un commentaire, toujours exact.

## Pour PLAN.md et CLAUDE.md (orchestrateur)

- § 3.8 (impression) : remplacer `ListDocumentR1/R2`, `TomorrowDocumentR1/R2`, `list-r1.ts`, `list-r2.ts`, `document-texts.ts`, `PrintLayout` et `PrintTable` par `PrintListR1` et `PrintListR2` (prop `tomorrow`), `PrintFrame` et un seul `import()` (`print-day.ts` → `print-documents.tsx`). `subtitleHeading` devient `dateHeading` de `PrintFrame`.
- § 3.1 (arborescence) : `features/print/` contient `PrintFrame`, `PrintListR1`, `PrintListR2`, `PrintListButton`, `print-day.ts`, `print-documents.tsx` ; `ui/print/` ne contient plus que `print.ts` et `PrintRoot.tsx` ; `api/signals.ts` disparaît.
- § 3.3 et § annexe des tests (ligne « `02` § 1.5 (faux minuteurs) ») : « la perdante est annulée » ne tient plus ; une tentative perdante va jusqu'au bout et son résultat est ignoré ; TanStack Query n'annule plus la lecture publique (son `signal` n'est plus transmis).
- E-45 : le dépassement de 30 s rejette une `ServiceError`, la requête elle-même n'est pas interrompue.
- R-22 : `anySignal()` et `timeoutSignal()` n'existent plus ; plus aucun usage de `AbortSignal.any` ni `AbortSignal.timeout` dans le code.
- CLAUDE.md : rien à changer.
