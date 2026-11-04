# Journal — rejets non gérés des transitions de vue (job `browser` de la CI)

*4 octobre 2026. Branche locale `claude/fix-view-transition-ci`, partie de `0ef1479` (pointe de l'intégration). Pas de push : l'orchestrateur fusionne.*

## Symptôme

Depuis P4 (b) (`c758adf`, `54e712f`), le job `browser` de la CI sort en échec : tous les tests passent, mais Vitest relève deux `Unhandled Rejection` « TimeoutError: Transition was aborted because of timeout in DOM update », attribuées à `RestaurantCalendar.test.tsx` (« closes the open form of its restaurant on a click on the selected day », « moves the week with ‹ › (replace) without changing the selection »).

## Cause

1. `RouterCore.startViewTransition` (`@tanstack/router-core` 1.171.34, `src/router.ts`) appelle `document.startViewTransition({ update, types })` et ne rend au routeur que `updateCallbackDone`. Personne n'attache de gestionnaire à `ready` ni à `finished`.
2. Le navigateur rejette `ready` chaque fois qu'il saute une transition : une autre démarre (`AbortError`), l'onglet est caché (`InvalidStateError`), la page ne se rend pas dans les 4 s (`TimeoutError`). La navigation a lieu quand même.
3. Dans les tests, deux tests se terminent sur un clic qui lance une transition sans attendre le rendu : « selects a day on click (push)… » (dernier clic sur un jour R2, type `r2-day-prev`) et « keeps the month shown… » (`r1-day-next`). Le nettoyage démonte la page ; la fonction `update` du routeur attend un rendu React qui ne vient plus ; Chromium abandonne au bout de 4 s, pendant le test suivant, celui que Vitest nomme.
4. Chromium 141 (`/opt/pw-browsers/chromium` des sessions) marque ces rejets comme gérés : aucune trace en local. Chromium 153, installé par Playwright 1.63 en CI, les laisse non gérés, comme le prévoit la spécification (seul l'échec de la fonction `update` marque `ready` comme géré) : la CI le montre. En production, un visiteur qui clique vite deux fois sur ‹ › obtient « Uncaught (in promise) AbortError: Transition was skipped » dans la console (preuve sur le site construit ci-dessous).

## Correction

- `features/calendar/view-transition.ts` : `startViewTransition(update, transition)` démarre la transition avec les types de `page-search.ts`, attache un gestionnaire à `ready` et à `finished`, et rend `updateCallbackDone` au routeur. Sans types (`false`, absent), la mise à jour part tout de suite, sans transition.
- `router.tsx` remplace `router.startViewTransition` (propriété publique de `RouterCore`, appelée par `load-client.ts`) par cette fonction ; comme le routeur, il remet `shouldViewTransition` à zéro après lecture (précédent / suivant sans transition), avec `false` : `exactOptionalPropertyTypes` refuse `undefined`. Les navigations gardent leur ordre : chargement, puis capture, puis rendu.
- `features/calendar/view-transition.test.ts` (5 tests) : types actifs pendant la mise à jour, mise à jour immédiate sans transition, transition remplacée sans rejet non géré.

Le routeur n'offre aucune option pour ces promesses. Démarrer la transition dans `usePageNavigate`, autour de `navigate`, aurait repoussé l'écriture de l'URL d'une image : les assertions `urlParams` qui suivent un clic dans `RestaurantCalendar.test.tsx` ne tiendraient plus.

## Reproduction locale

Chromium 141 masque l'erreur. Pour voir ce que voit la CI, ajouter temporairement à `src/test/setup-browser.ts` un enrobage de `Document.prototype.startViewTransition` qui remplace `ready` et `finished` par des promesses miroirs non gérées (non commité) :

```ts
const nativeStart = Document.prototype.startViewTransition;
function mirror<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    promise.then(resolve, reject);
  });
}
Document.prototype.startViewTransition = function (this: Document, arg?: never) {
  const transition = nativeStart.call(this, arg);
  Object.defineProperty(transition, "ready", { value: mirror(transition.ready) });
  Object.defineProperty(transition, "finished", { value: mirror(transition.finished) });
  return transition;
} as typeof nativeStart;
```

## Preuves

Chromium de `/opt/pw-browsers/chromium` (141), ports 63360 / 4760 / 4761.

| Commande | Résultat |
| --- | --- |
| Avant, avec l'enrobage : `pnpm test:browser src/features/calendar/RestaurantCalendar.test.tsx` | 13 tests verts, 2 `Unhandled Rejection` `TimeoutError`, mêmes tests nommés qu'en CI, sortie 1 |
| Avant, avec l'enrobage : `pnpm test:browser` | 51 fichiers, 387 tests verts, 2 erreurs, sortie 1 |
| Sonde : clic synchrone sur un jour puis fin du test | `ready` rejeté par `TimeoutError` 4 005 ms après le démarrage |
| Après, avec l'enrobage : `vitest run --project browser` ×17 | 17 passes à 392 tests verts, 0 rejet, sortie 0 ; une 18e passe s'est figée (moteur de rendu à 100 % CPU, aucune sortie, arrêtée au bout de 10 min), non reproduite ensuite (voir « Reste ») |
| Après, code commité seul : `vitest run --project browser` ×10 | 10 passes à 392 tests verts, 0 rejet, sortie 0 |
| Après, sans `settle(started.ready)`, avec l'enrobage : `view-transition.test.ts` | le test de la transition remplacée échoue (`AbortError` non géré) |
| Site construit (`build:e2e`), spec temporaire `react-only` : enrobage, puis quatre clics sur « Semaine suivante » à `setTimeout(0)` d'écart | sans la correction : 3 `pageerror` « AbortError: Transition was skipped » ; avec : 0, et 5 transitions de type `r1-next` démarrées |
| `pnpm check` | sortie 0 ; Vitest 155 fichiers, 2 093 tests verts ; `knip` et `knip --production` sans remarque |
| `pnpm build:e2e && git diff --exit-code src/routeTree.gen.ts translations/fr.json` | aucune différence |
| `pnpm test:e2e --project=react --grep "@p4\|@framework"` | 40 verts sur 40 |
| `pnpm test:e2e:legacy` | 76 verts sur 76 |

## Reste

- Une passe sur 28 du projet `browser` s'est figée, avec l'enrobage temporaire ; sortie non verbeuse, fichier en cause inconnu. Symptôme proche du blocage du fil principal noté en P4 (a) (décision 7). Pas reproduit en 27 autres passes.
- Si une session ajoute `defaultViewTransition` ou passe `true` / une fonction à `viewTransition`, compléter `startViewTransition` (ces formes naviguent aujourd'hui sans transition).
