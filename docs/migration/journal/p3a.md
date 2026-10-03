# Journal de la session P3 (a) — Boutons, retours, bascules

*3 octobre 2026. Branche locale `claude/p3a-boutons`, partie de la pointe de l'intégration (`62bd2b5` : P0, P1 (a1, a2, b), P2 (a), P3 (0) et P3 (b) intégrées). P2 (b1) et P2 (c) tournaient dans d'autres worktrees.*

## Fait

- `ui/button/Button.tsx` : `Button` de Base UI, variantes `neutral`, `primary`, `ghost`, `danger` en `data-variant`, tailles en `data-size`, état occupé (`busy`, `busyLabel`, « Envoi en cours… » par défaut) : `aria-busy`, `disabled` + `focusableWhenDisabled` (focus gardé, clics ignorés).
- `ui/button/IconButton.tsx` : bouton rond de 40 px, cible de 48 px, `aria-label: string` obligatoire dans le type, variante `tonal`, icônes au trait à 20 px.
- `ui/button/ConfirmButton.tsx` : suppression en deux clics de `06` § 5.2 (voir décisions 3 à 5).
- `ui/toggle/ViewToggle.tsx` : `ToggleGroup` + `Toggle`, valeur vide ignorée, coche animée sur `[data-pressed]`, rebond `seg-pop` du segment choisi, taille compacte, pleine largeur, `aria-controls` et `aria-expanded` par segment (« Collègue », `06` § 1.1), `--segment-min-width` réglable par le parent.
- `ui/feedback/toast.ts` (`toastManager`, `showToast(message, kind)`, `ToastKind`) et `Toaster.tsx` (`<Toast.Provider toastManager limit={1} timeout={3500}>`, zone « Notifications »).
- `ui/feedback/Alert.tsx` (encadré `box` avec action, note `note`, bandeau `banner`), `CapacityPill.tsx`, `Skeleton.tsx`. `Spinner` (P3 (0)) inchangé.
- `SubmitButton` délègue à `Button` (`type="submit"`, `variant="primary"`, `busy`) ; l'œil de `PasswordField` à `IconButton`. API et tests de P3 (b) inchangés ; `SubmitButton.module.css` et la règle `.toggle` de `PasswordField.module.css` supprimés.
- Messages : `ui.confirm.label` (« Confirmer ? », `00` § 2.1), `ui.confirm.armedAnnouncement`, `ui.toast.viewport` (annexe F), `public.dayCard.status.almostFull` et `.full` (annexe F, D-02). `ui.submitButton.pending` vit désormais dans `Button.tsx`, même id.
- Jetons ajoutés à `tokens.css` : `--icon-size-stroke`, `--check-size-small`, `--capacity-pill-min-width`, `--skeleton-line`, `--skeleton-card`, `--dur-toast-enter`, `--dur-shimmer` (valeurs de `legacy/`).
- Stories CSF Next : 10 pour `Button`, 4 `IconButton`, 4 `ConfirmButton`, 5 `ViewToggle`, 3 `Toaster`, 5 `Alert`, 5 `CapacityPill`, 2 `Skeleton`.
- Tests navigateur : 9 fichiers, 59 tests (`src/ui/button`, `src/ui/toggle`, `src/ui/feedback`, `src/ui/reduced-motion.test.tsx`).

## Preuves

- `pnpm check` : 79 fichiers, 1117 tests (stories comprises), knip propre dans les deux modes.
- `pnpm test:browser src/ui/button src/ui/toggle src/ui/feedback` et `pnpm test --project=storybook` : verts, axe en `error` sur chaque story.
- `grep -rnE "#[0-9a-fA-F]{3,6}|[0-9]+px" src/ui --include=*.module.css` : vide. `grep -rn "@base-ui" src --include=*.tsx --include=*.ts | grep -v src/ui` : vide. Aucun `useEffect`, `useLayoutEffect`, `useMemo` ni `forwardRef` dans `src/ui`.
- `08` § 1-5 mesurés dans Chromium : boutons 40 px, petits 32 px ; écran tactile émulé (`Emulation.setTouchEmulationEnabled` par `cdp()`) : 44 px, petits 36 px et cible `::after` à −6 px ; anneau de focus 3 px à 2 px après Tab ; opacité 0,38 inactif et occupé ; `user-select: none` ; `prefers-reduced-motion: reduce` émulé (`Emulation.setEmulatedMedia`) : aucune animation ni transition sur tous les éléments et pseudo-éléments de `ConfirmButton` armé, `ViewToggle`, `CapacityPill`, `Skeleton` et d'un toast, alors qu'il y en a sans l'émulation.
- `ConfirmButton` avec faux minuteurs (`vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })`) : armé, largeur figée, `aria-label` et `title`, toujours armé à 3 999 ms, au repos à 4 000 ms, réarmement rapide gardé 4 s pleines (a-19), minuteur nettoyé au démontage (`vi.getTimerCount()` à 0).
- Sans `useCallback` sur la ref callback, trois tests de `ConfirmButton` échouent (« goes back to rest », a-19, démontage) : React appelle le nettoyage à chaque nouvelle fonction de ref, donc à chaque rendu ; remis, 8 sur 8.
- Violation axe trouvée puis corrigée : `aria-hidden-focus` sur la story `Error` du `Toaster` (décision 8).
- `pnpm build-storybook` vert ; `pnpm build:e2e` puis `git diff --exit-code src/routeTree.gen.ts translations/fr.json` : vide ; `pnpm test:e2e --project=react-only` (ports 4590/4591) : 5 réussis. Aucun scénario de régression ne vise encore ces composants côté `react`.
- Storybook construit, servi sur le port 6090 et photographié dans Chromium (15 stories : boutons, note D-21, toasts, encadré, bandeau, jauge, squelette, bascules) : rendu conforme à `08` § 4 ; aucune requête hors de 127.0.0.1 ; serveur arrêté.

## Décisions

1. **`Button` occupé** : même procédé que P3 (b) (`disabled` + `focusableWhenDisabled`, donc `aria-disabled`). L'`aria-labelledby` vers le libellé que posait `SubmitButton` est retiré : il l'emporterait sur l'`aria-label` de `ConfirmButton` armé, et le nom calculé depuis le contenu donne le même texte.
2. **`className` accepté** sur `Button`, `IconButton`, `ViewToggle`, ajouté après la classe du module : la mise en page vient du parent, couleurs et tailles restent dans `ui/`.
3. **`ConfirmButton`, second clic** : désarme et appelle `onConfirm`. Pendant l'envoi, le parent passe `busy` : le bouton reste « Confirmer ? » (`06` § 5.2), rouge, occupé (E-04), avec le détail en `aria-label`. À la fin de `busy` (erreur), il revient au repos. Aucun état dérivé de `busy` dans le composant.
4. **Ref callback stable** (`useCallback(…, [])`, commenté) : seule exception au « pas de `useCallback` » de `CLAUDE.md`, prouvée ci-dessus ; le React Compiler ne tourne pas dans Vitest ni Storybook.
5. **Annonce armée** dans un `<output>` masqué (rôle `status`) toujours présent, vide au repos : `jsx-a11y/prefer-tag-over-role` refuse `role="status"` sur un `span`. Note D-21 : `showDetail` affiche `detail` sous le bouton, `aria-hidden` puisque le nom du bouton porte déjà ce texte.
6. **`ViewToggle`, rebond** : `useState` du dernier segment choisi par l'utilisateur (`data-pop`), donc aucune animation quand la valeur change par l'URL (Retour) ou au montage.
7. **Un seul toast** : `showToast` ferme les toasts affichés puis ajoute le nouveau. `limit={1}` seul garde l'ancien dans le DOM (`data-limited`) jusqu'à sa propre échéance : la zone lirait deux textes. L'ancien s'efface en 0,2 s sous le nouveau (même cellule de grille).
8. **Racine du toast hors tabulation** (`tabIndex={-1}`) : Base UI rend un toast d'erreur `role="alertdialog"` `aria-hidden="true"` (une `role="alert"` séparée l'annonce) avec `tabIndex={0}`, ce qu'axe refuse (`aria-hidden-focus`). Un toast ne contient rien à activer ; F6 atteint toujours la zone.
9. **Zone des toasts en `pointer-events: none`** comme le `.toast` de l'ancien site : un toast ne prend jamais un clic destiné à la page. Effet de bord : le survol ne met plus en pause le minuteur de Base UI (3,5 s fixes, comme avant).
10. **Titre du toast en `<p>`** (`render={<p />}`) : Base UI rend un `<h2>`, qui ajouterait un titre de niveau 2 à la page (le page object `columnTitle` compte les `h2`).
11. **Toast neutre en vert** : `04` § 9 (« vert avec coche (succès/neutre) ») ; `data-type="neutral"`.
12. **`CapacityPill`** : mot d'état rendu par le composant avec les ids de l'annexe F (`public.dayCard.status.*`, zone `public` imposée par l'annexe) ; `fullLabel` pour « Épuisé » d'un plat (D-02). Remplissage par la largeur d'un `span` (`width: {percent}%`) au lieu de `--pct` : `style={{ "--pct": … }}` demande une assertion de type ou une augmentation de `CSSProperties`, refusées par oxlint (`no-unsafe-type-assertion`, `no-empty-interface`).
13. **`Alert`** : le rôle (`alert` ou `status`) est posé sur le texte seul, comme `#loadErrorText` de l'ancien site, pour que l'action ne soit pas annoncée ; « ⚠ » du bandeau en `WarningIcon` dans la ligne du texte.
14. **`Skeleton`** : formes `line`, `title`, `circle`, `cell`, `card`, `still` pour l'échec de chargement. `features/page/PageSkeleton.tsx` (P0 (b)) garde son propre CSS : P4 (a) peut le réécrire avec `Skeleton`.

## Contradictions et remarques

- **`ViewToggle` et le clavier** : `ToggleGroup` de Base UI est un composite à tabulation itinérante (un seul arrêt de Tab, flèches entre segments). L'ancien `segGroup` met chaque segment dans l'ordre de tabulation. Le PLAN § 3.5 choisit `ToggleGroup` sans écart listé au § 4.2. Proposition : « E-51 Bascules Semaine / Mois et Client / Collègue : un arrêt de Tab, flèches » (scénario n/a ou REG-09), ou `ToggleGroup` remplacé par des `Toggle` seuls si l'orchestrateur veut la parité stricte (facile à défaire : `ViewToggle.tsx` seul).
- **Rôle des toasts** : l'ancien `#toast` est un `role="status"` ; Base UI rend une région « Notifications » `aria-live="polite"` contenant des `dialog` (succès, neutre) ou `alertdialog` masqués (erreur), plus une `role="alert"` hors de la région pour l'erreur. Couvert par E-02 (« erreurs en annonce prioritaire »).
- **« Tout réaffichage recrée le bouton désarmé »** (`06` § 5.2) : avec React, un `ConfirmButton` armé le reste pendant une actualisation (E-08) et ne se désarme qu'au bout de 4 s ou au démontage. Écart visible seulement si l'actualisation de 3 min tombe dans les 4 s ; non listé.
- **Page object `toastKind` (P1 (b), `e2e/pages/home.ts`)** : il lit `toast(page).getByRole("dialog").last()`. Un toast d'erreur est un `alertdialog` `aria-hidden`, que `getByRole("dialog")` ne trouve pas ; pendant un remplacement, `.last()` désigne le toast qui part (le plus récent est le premier). À changer côté `react` : `toast(page).locator('[role="dialog"], [role="alertdialog"]').first().getAttribute("data-type")`. `toast(page)` (la région) et ses `toHaveText` restent justes : Playwright réessaie le temps que l'ancien toast parte.

## Versions

Aucune version changée, aucun paquet ajouté.

## Overrides oxlint

Aucun. Corrections du code : `<output>` au lieu de `role="status"` (`prefer-tag-over-role`), `Number(…replace(/px$/u, ""))` (`prefer-number-coercion`), `dataset` (`prefer-dom-node-dataset`), paramètres de `it.each` en objet (`max-params`), largeur au lieu de `--pct` (décision 12).

## Reste à faire

- P4 (a) : monter `<Toaster/>` une fois dans `routes/__root.tsx` (PLAN § 3.2) ; `PageSkeleton` peut reprendre `Skeleton`.
- P4 (a), P5 (a) : `ModeSwitch` règle `--segment-min-width` (108 px de `08` § 4.5, jeton à créer) et passe `aria-controls` / `aria-expanded` sur « Collègue ».
- P4 (b) : `CapacityPill` avec `gaugePercent` et `capacityClass` de `domain/` ; `fullLabel` « Épuisé » pour un plat (id de `04` § 5.3).
- P2 (c), P4, P5 : `showToast(message, "success" | "neutral" | "error")` depuis `ui/feedback/toast.ts`.
- P5 : `ConfirmButton` avec `busy={mutation.isPending}`, `showDetail` pour D-21, `size="small"` dans les listes.
- P4 (côté `react`) : `toastKind` du page object (contradictions).
- Orchestrateur : trancher E-51 (contradictions).
- P7 (a) : retirer `"!src/ui/**!"` de `knip.json` (P3 (0)).

## Pour la PR

Titre : « P3 (a) : boutons, bascules, toasts, encadrés, jauge, squelette ».

- Composants que P4 à P6 utiliseront seuls : `Button`, `IconButton`, `ConfirmButton`, `ViewToggle`, `toast.ts` + `Toaster`, `Alert`, `CapacityPill`, `Skeleton`.
- `SubmitButton` et l'œil de `PasswordField` (P3 (b)) délèguent à `Button` et `IconButton`.
- Jetons ajoutés à `tokens.css` ; textes `ui.*` et D-02.
- Page object `toastKind` à adapter et écart E-51 à trancher : voir le journal.
- Aucune action humaine.
