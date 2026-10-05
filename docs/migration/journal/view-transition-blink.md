# Journal de la session « clignement de l'autre calendrier »

*5 octobre 2026. Branche `claude/view-transition-blink`, partie de `0dc6de5` (intégration). Signalement du responsable : quand on change de jour sur un calendrier puis sur l'autre, le calendrier qui ne bouge pas clignote en opacité, sur Safari seulement.*

## Fait

- **Cause** : le libellé, la grille et la fiche des deux restaurants portaient leur `view-transition-name` en permanence (style en ligne). À chaque transition, le restaurant qui ne bouge pas avait donc ses propres pseudo-éléments, avec le fondu enchaîné par défaut (`-ua-view-transition-fade-out` / `fade-in`, `plus-lighter`) entre deux images identiques. Chromium le rend invisible ; Safari montre une baisse d'opacité. 05 § 3.4 dit l'inverse : « seuls le libellé, la grille, la fiche et la colonne du restaurant concerné portent un `view-transition-name` ».
- **Correctif** : `CalendarHeader`, `CalendarGrid` et `DayDetail` posent `data-transition-name` au lieu du style en ligne. `view-transitions.css` en fait un `view-transition-name` sous `:root:active-view-transition-type(r1-…)` ou `(r2-…)` seulement. L'autre colonne reste dans l'image racine, qui change d'un coup.
- **Vérifié dans Chromium** (sonde sur `document.startViewTransition`, `pnpm dev`) : un clic sur un jour de R1 ne crée plus que les pseudo-éléments `r1-*` ; ‹ › (`r1-next`), « Mois » (`r2-zoom-out`) et ‹ en vue mois (`r2-prev`) gardent leurs animations, donc le nom est posé à la capture de l'image « avant ».

- **Story `OrderFormR2 › Sending` rouge en CI** (job `browser`, projet `storybook`), sans lien avec ce correctif : `closedOnSending` relit `Date.now()` à l'envoi (04 § 5.3), alors que `clockAt` ne fixait que l'horloge du site. Le 5 octobre 2026 après 10 h à Paris, la vraie date tombe sur le jour de la story et l'envoi est refusé ; à partir du 6, ce jour serait passé. `clockAt` (`src/test/story-router.tsx`) fait maintenant partir `Date.now()` de la même heure pendant la story. Projet `storybook` : 187 sur 187.

## Reste

- Vérifier sur Safari : WebKit n'est pas installé dans les sessions cloud.
- La colonne du restaurant concerné ne porte pas de nom (05 § 3.4 en cite un) : écart antérieur, non traité ici.

## Vérifications

- `pnpm check:fast` ; projet `browser` sur `src/ui/calendar`, `src/features/calendar`, `src/routes` (101 tests) ; `pnpm build:e2e`, fichiers générés inchangés ; E2E `react` de `calendar.spec.ts` et `public-r1.spec.ts` (7), `react-only` (20).
- `pnpm check` complet : un échec différent à chaque passage, chaque fois dans un fichier non touché, qui passe seul avant et après le correctif. Avec `pnpm dev` lancé à côté : `BrowserOnly.test.tsx` (« Switched to client rendering ») et `TomorrowDocumentR1.test.tsx` (iframe pas prête en 60 s). Sans : `background/start.test.ts` l. 54, horloge en avance de 5 min (1791185700000 au lieu de `TEST_NOW`) ; 3 passages seul sur 3 réussis. Tests instables sous charge, à suivre.

## Environnement

- `PLAYWRIGHT_CHROMIUM_EXECUTABLE` n'était pas défini dans la session : le projet Vitest `browser` cherchait `chromium_headless_shell-1243`. Lancé avec `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`.
- Des captures `page.screenshot` prises pendant une transition montrent une image « avant » vide dans Chromium headless : artefact de mesure. Le screencast CDP (`Page.startScreencast`) ne montre aucun clignement dans Chromium.
