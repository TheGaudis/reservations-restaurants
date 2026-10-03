# Journal de la session P1 (c) — scénarios du mode collègue

*3 octobre 2026. Branche locale `claude/p1c-scenarios-collegue`, partie de la pointe de l'intégration (`366502a` : P0, P1 (a1), (a2), (b), P2 (a), (b1), (c), P3 (0), (a), (b) intégrées). P2 (b2) et P3 (c) tournaient en parallèle.*

## Fait

- Page objects : `e2e/pages/login.ts` (`modeButton`, `passwordField`, `openLogin`, `login`, `logout`) et `e2e/pages/staff.ts` (`staffPanel`, `openDayPanel`, `openSettings`, `openDayForm`, `datePicker`, `staffCard`, `bookingRow`, `bookingLines`, `staffDish`, `openAddPerson`, `confirmDelete`) ; rôles, libellés et textes de `06`, aucune classe ni aucun id. `pageObjectSignatures` mis à jour.
- 30 tests pour REG-27 à REG-38, découpés par scénario (préfixe commun) dans neuf fichiers : `staff-access` (27, 28), `staff-session` (29 à 31), `staff-settings` (32), `staff-open-day` (33), `staff-open-day-r2` (34), `staff-r1` (35), `staff-r1-add` (36), `staff-r2` (37, 38). `staff.spec.ts` (déclarations `test.fixme`) supprimé. Aides : `e2e/regression/staff-helpers.ts`.
- Parcours de référence REG-30 : connexion → « Ouvrir un jour » le 20 octobre par le sélecteur → « + Ajouter une personne » → activité à 9 min → `fastForward` → toast d'inactivité → plus aucun nom.
- Corps vérifiés par action (`actionBodies`) : `password` présent pour les actions protégées, absent de `addBookingR1` et `addBookingR2Multi` (`toStrictEqual`), `qte` et `prixTotal` envoyés à `editBookingR1`.
- Assertions communes demandées : panneau gardé ouvert après « Ouvrir un jour » (R1 et R2) et après Paramètres ; calendrier du restaurant sur la date ouverte.
- Variantes `react` écrites d'après le plan, l'annexe F et la spec pour E-02, E-04, E-05 (REG-33, décision de l'orchestrateur), E-08, E-17, E-18, E-23, E-24, E-36 à E-40, E-48, E-50 (mode R2 collègue en radios).
- `parite.md` § 5.2 : fichiers, statuts `legacy` verts, écarts par écran.

## Mesures

- `pnpm test:e2e:legacy --grep "@p5" --repeat-each 3` : 90 réussis, 1,1 min.
- `pnpm test:e2e:legacy --repeat-each 3` (suite complète) : 201 réussis, 12 ignorés (`fixme` d'impression de P1 (d)), 3,6 min.
- `pnpm check` : 1 500 tests Vitest (102 fichiers), knip propre. `pnpm test:e2e --project=react --grep @framework` : 3 réussis.
- Vérifié par mutation : dans REG-29, un clic souris sur « Client » (au lieu du clavier) ferme le sélecteur et fait repartir l'actualisation : l'assertion `legacy` échoue (2 lectures au lieu d'1).

## Décisions

1. **Découpage** : un scénario = plusieurs tests au même préfixe ; un test porte `@parity` quand toutes ses assertions sont communes, et les `@changed:E-xx` du scénario seulement là où les variantes diffèrent. Fichiers sous 300 lignes (`max-lines`).
2. **Carte du jour en mode collègue** : `dayCard` (public) prend le panneau « Ouvrir un jour », dont le champ Date montre aussi une date longue. `staffCard` prend l'élément le plus extérieur *après* le calendrier (`xpath=following::*` combiné par `and`) qui montre une date longue.
3. **Panneaux** : `<summary>` n'a pas de rôle pour Playwright et `<details>` est un `group` sans nom ; `staffPanel` remonte du titre au plus proche ancêtre qui contient plus que lui (`<summary>` et `<button>` exclus). Ouverture : clic sur le titre (`legacy`), bouton `expanded: false` (`react`).
4. **Voile** : `veil(page)` = `progressbar` « Chargement en cours ». Tant qu'il est levé, l'ancien site a un second `role="status"` que `toast(page)` prendrait aussi : chaque scénario attend `veilGone` avant de lire le toast.
5. **REG-27, toasts superposés** : deux refus à **2 s** d'écart (et non 3 s) ; sous charge, la réponse au second envoi arrivait parfois après les 3,5 s du premier toast et le test devenait instable (1 échec sur 90). Assertion `legacy` : toast caché moins de 3 s après le second ; `react` : un seul toast, encore affiché 1,5 s après.
6. **REG-29** : « Client », la reconnexion et l'ouverture du panneau se font **au clavier**. Un `pointerdown` hors du champ Date ferme le sélecteur (06 § 3.3) et ferait disparaître a-13. Variante « écriture qui répond après la déconnexion » : `@parity` (plus aucun nom, mode client, chemin `/`) ; le cache de Query n'est pas observable depuis l'E2E (reste au test S8 de P5).
7. **REG-28 sur `legacy`** : l'ancien site n'a qu'une URL ; le « rechargement » est `page.reload()` après connexion, jour 06 et modification ouverte : retour au mode client sur aujourd'hui, aucun nom.
8. **Jours passés du sélecteur** : `aria-disabled` fait attendre Playwright ; le clic passe par `force: true`.
9. **Bouton occupé de la connexion (`react`)** : aucun libellé fixé par la spec ni l'annexe F ; l'assertion cherche `button[aria-busy="true"]` (sélecteur d'attribut).
10. **REG-38, modification au-delà du stock (`react`)** : pas de texte fixé pour le message local ; l'assertion vérifie `aria-invalid="true"` sur « Portions » et l'absence de POST.

## Contradictions et remarques

- **Focus après la connexion (REG-27)** : `06` § 1.3 (5) et `parite.md` disent « focus sur « Collègue » ». Sur l'ancien site, `focus()` part pendant que le voile rend `.wrap` inerte : le focus reste sur `body`. Assertion `legacy` = `body`, `react` = « Collègue », sous E-04 (« pas de perte de focus »).
- **Focus après une suppression (REG-35)** : `parite.md` et E-48 (« après une suppression, date de la fiche (identique) ») supposent l'ancien site sur la date. Mesuré : `body` (voile, et bouton sans clé de `focusKey`, `03` § 5.4). Assertion `legacy` = `body`, `react` = date de la fiche ; test étiqueté aussi `@changed:E-04`. À reporter dans la ligne E-48 ou E-04 du PLAN.
- **« Annuler » d'une modification (REG-35)** : `parite.md` dit « focus sur la date (`legacy`) » ; `03` § 5.4 et la mesure donnent `body` (aucune clé pour « Annuler »). Assertion `legacy` = `body`, `react` = « Modifier » (E-48).
- **Toast d'une écriture collègue qui répond après la déconnexion** : l'ancien site affiche le toast de succès (« Jour modifié. ») après « Retour au mode client. » ; le site React ne l'affichera pas (toast dans `mutate(…, { onSuccess })`, composant démonté). Aucun E-xx ne le couvre : non vérifié. À trancher par l'orchestrateur (ligne E-xx ou assertion).
- **REG-33, ligne E-05 de `parite.md` § 4** : hors de ma section ; à compléter par l'orchestrateur (« REG-09, REG-33 »).
- **`parite.md` § 1 et § 3** citent encore `staff.spec.ts` : à remplacer par `staff-{access,session,settings,open-day,open-day-r2,r1,r1-add,r2}.spec.ts` et `staff-helpers.ts` (sections hors de mon périmètre).

## Versions

Aucune version changée, aucun paquet ajouté.

## Overrides oxlint

Aucun. Corrections : `unicorn/no-await-expression-member` (résultat rangé dans une constante), export inutile retiré (knip).

## Reste à faire

- P5 : jouer les variantes `react` ; ajuster les corps `react` de `login.ts` et `staff.ts` si le DOM diffère (titres des panneaux, `staffCard`, lignes de réservation, toast), sans toucher aux assertions.
- Orchestrateur : lignes de `parite.md` § 1, § 3 et § 4 (E-05) ; décision sur le toast d'une écriture tardive ; E-04 / E-48 pour les pertes de focus de l'ancien site.

## Pour la PR

Titre : « P1 (c) : scénarios du mode collègue (REG-27 à REG-38) ».

- 30 tests verts sur `legacy` trois fois de suite ; variantes `react` écrites d'après le plan.
- Page objects `login.ts` et `staff.ts` remplis ; nouvelles fonctions listées dans `pageObjectSignatures`.
- Aucune action humaine.
