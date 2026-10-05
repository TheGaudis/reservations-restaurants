# Journal de la session P5 (a) — session, garde, connexion, déconnexion, socle des panneaux

*4 octobre 2026. Branche locale `claude/p5a-session`, partie de `10eee77` (pointe de l'intégration : P4 complète et correction des transitions de vue). Pas de PR ni de push : l'orchestrateur fusionne la branche locale. Chromium de `/opt/pw-browsers/chromium`, ports 4770 / 4771 / 63370. Action humaine de P0 non traitée (consigne de l'orchestrateur) : tout tourne sur le faux script.*

## Commits

1. `3fbf5ac` Mode collègue : fabrique des écritures avec garde de session (PLAN § 3.3.3, F-02).
2. `e5abbd7` Mode collègue : connexion, garde de `/collegue`, page et emplacements (06 § 1-2, PLAN § 3.2).
3. `6ea6e4a` E2E : session collègue sur le site construit, E-55 étiqueté dans REG-29 (06 § 1.4-1.7).
4. `c3a5085` CI : scénarios `react` de P5 (a) (REG-27, `@L-01`).
5. Journal et colonne `react` de `parite.md` (ce commit).

## Fait

- `routes/collegue.tsx` : schéma complet du PLAN § 3.2 (`CalendarSearch` + `ouvrir`, `ouvrirDate`, `parametres`, `editJour`, `editResa`, `ajout`, `ajoutPlat`, `editPlat`, tous sous `v.fallback`), middlewares `stripSearchParams` puis `retainSearchParams(CALENDAR_KEYS)`, `beforeLoad` (sans mot de passe : `redirect` vers `/` avec les calendriers, `connexion: true`, `retour: location.href`, `replace`), loader qui lance la lecture de l'état complet s'il manque, composant `StaffPage`.
- `features/page/ModeSwitch.tsx` : « Client / Collègue » (`ViewToggle`, groupe « Mode d'accès », segments de 108 px), panneau `?connexion=true` (`aria-controls`, `aria-expanded`, `inert` fermé), focus dans le champ au clic sur « Collègue », Échap → mode client et focus sur « Client », « Client » pendant une session → `close("logout")`, refus sur copie locale, toasts de 06 § 1.3, navigation vers `retour` ou `/collegue` avec les calendriers, focus sur « Collègue » dans la page collègue. Le panneau (`LoginPanel.tsx` : TanStack Form, `PasswordField` avec l'œil, « Valider » occupé) est un morceau à part (`load-login-panel.ts`).
- `mutations/login.ts` : `useLogin` (`getAdminState`, état complet posé sous `id + 1` puis `session.open`, mutation à `gcTime: 0`, `reset()` après chaque essai).
- `features/page/StaffPage.tsx` : `Page` avec `ModeSwitch` et les six emplacements ; cadres `features/staff/StaffDayCardR1.tsx` et `StaffDayCardR2.tsx` (date, jauge R1, thème, menu ou note, « Ouvert par », plats R2 avec leur jauge, message collègue d'un jour sans service, jamais « Réserver », pas de note de clôture) et leurs emplacements ; `features/staff/use-staff-state.ts`.
- Emplacements vides (composants qui rendent `null`), chacun dans le fichier de la session qui le remplit : voir « Interfaces du socle ».
- `mutations/staff/write.ts` : `staffWriteOptions`, `adoptStaffState`, `staffWriteKey`, `staffErrorText` ; `days.ts`, `dishes.ts`, `bookings.ts`, `settings.ts` posés (une constante de domaine chacun).
- `queries/use-app-state.ts` : `useIsFromCache` ne suspend plus (`useQuery` désactivé) ; `@public` retiré de `useIsFromCache` et de `staffStateOptions` ; `session/session.ts` : `@public` retiré de `SessionEnd`.
- `Page` : `modeSwitch` rendu après l'hydratation seulement, `panels` seulement avec des données.
- Tâches de fond : branchement de `afterLogout` et de l'inactivité vérifié de bout en bout (déjà démarrés par `getRouter()` depuis P4 (b)) ; rien à ajouter dans `background/`.
- Tests : `mutations/login.test.tsx` (5), `mutations/staff/write.test.tsx` (10), `features/page/ModeSwitch.test.tsx` (11), `routes/-collegue.test.tsx` (10, dont S8), un test de plus dans `use-app-state.test.tsx` ; stories `ModeSwitch` (`ClientMode`, `LoginPanel`, `StaffMode`), `StaffDayCardR1` et `StaffDayCardR2` (`OpenDay`, `NoService`) ; `e2e/staff-session.spec.ts` (`react-only`, 4 tests) ; `e2e/smoke.spec.ts` (lien profond `/collegue` → panneau de connexion de la garde).
- REG-29 « write answered after the logout » : `@changed:E-55` (assertion ajoutée : toast « Jour modifié. » sur `legacy`, aucun sur `react`) ; cellule « Scénario » de E-55 au PLAN § 4.2 passée de « n/a » à « REG-29 », comme le demandait la ligne E-55.
- Store de session réinitialisé avant chaque test du projet `browser` (`src/test/setup-browser.ts`) ; `src/test/story-session.ts` (`staffSession`, `beforeEach` des stories collègue).

## Interfaces du socle (P5 (b), (c), (d1), (d2), (e), P6 (a))

Règle : chaque session ne modifie que les fichiers qui lui reviennent ci-dessous. `routes/collegue.tsx`, `StaffPage.tsx`, `StaffDayCardR1.tsx`, `StaffDayCardR2.tsx`, `StaffDayCard.tsx`, `ModeSwitch.tsx`, `LoginPanel.tsx`, `mutations/login.ts` et `mutations/staff/write.ts` restent à P5 (a) : un besoin de changement passe par l'orchestrateur. Un emplacement qui doit recevoir une prop de plus la lit plutôt par un hook (`useSelectedDay`, `useStaffState`, `usePageSearch`).

### Emplacements de `StaffPage`

| Emplacement | Composant (signature) | Fichier | Rendu | Session |
| --- | --- | --- | --- | --- |
| `tomorrow` | `TomorrowPanel()` | `features/staff/TomorrowPanel.tsx` | premier panneau, au-dessus de « Paramètres » | P5 (e), puis P6 (b) |
| `settings` | `SettingsPanel()` | `features/staff/SettingsPanel.tsx` | sous « Demain », au-dessus de l'encadré d'échec | P5 (e) |
| `openDayR1` | `OpenDayFormR1()` | `features/staff/OpenDayFormR1.tsx` | colonne R1, au-dessus du calendrier | P5 (b) |
| `openDayR2` | `OpenDayFormR2()` | `features/staff/OpenDayFormR2.tsx` | colonne R2, au-dessus du calendrier | P5 (b) |
| `dayCardR1` | `StaffDayCardR1()` (cadre) | `features/staff/StaffDayCardR1.tsx` | sous le calendrier R1, dans `DayDetail` | P5 (a) ; ses emplacements ci-dessous |
| `dayCardR2` | `StaffDayCardR2()` (cadre) | `features/staff/StaffDayCardR2.tsx` | sous le calendrier R2, dans `DayDetail` | P5 (a) ; ses emplacements ci-dessous |

### Emplacements des fiches collègue

Ordre de `05` § 5.3, § 6.2 et § 6.3. `day` : `StaffServiceDayR1` du jour choisi (état complet) ; `dish` : `Dish` ; `iso` : `IsoDate` du jour choisi ; `restaurant` : `Restaurant`. Les boutons rendus par plusieurs emplacements partagent la rangée `DayActions` (R1, R2) ou la rangée d'actions du plat (R2, masquée tant qu'elle est vide).

| Fiche | Position | Composant (props) | Fichier | Session |
| --- | --- | --- | --- | --- |
| R1 | après « Ouvert par » | `BookingListR1({ day })` | `features/staff/BookingList.tsx` | P5 (d1) |
| R1 | 1er bouton de `DayActions` (si `rem > 0`) | `AddBookingButtonR1({ day })` | `features/staff/AddBookingFormR1.tsx` | P5 (d2) |
| R1 | 2e bouton | `EditDayButtonR1({ day })` | `features/staff/EditDayFormR1.tsx` | P5 (b) |
| R1 | 3e bouton | `PrintListButton({ restaurant: "r1", iso })` | `features/print/PrintListButton.tsx` | P6 (a) |
| R1 | 4e bouton | `DeleteDayButton({ restaurant: "r1", iso })` | `features/staff/DeleteDayButton.tsx` | P5 (b) |
| R1 | sous les actions | `AddBookingFormR1({ day })` | `features/staff/AddBookingFormR1.tsx` | P5 (d2) |
| R1 | en dernier | `EditDayFormR1({ day })` | `features/staff/EditDayFormR1.tsx` | P5 (b) |
| R2, chaque plat | rangée d'actions, 1er | `AddBookingButtonR2({ dish })` | `features/staff/AddBookingFormR2.tsx` | P5 (d2) |
| R2, chaque plat | rangée d'actions, ensuite | `DishActions({ dish })` (« Modifier ce plat », « Supprimer ce plat ») | `features/staff/DishForm.tsx` | P5 (c) |
| R2, chaque plat | sous les actions | `AddBookingFormR2({ dish })` | `features/staff/AddBookingFormR2.tsx` | P5 (d2) |
| R2, chaque plat | ensuite | `EditDishForm({ dish })` | `features/staff/DishForm.tsx` | P5 (c) |
| R2, chaque plat | en dernier | `BookingListR2({ dish })` | `features/staff/BookingList.tsx` | P5 (d1) |
| R2 | sous la liste des plats | `AddDish({ iso })` (bouton ou formulaire) | `features/staff/DishForm.tsx` | P5 (c) |
| R2 | `DayActions`, 1er | `PrintListButton({ restaurant: "r2", iso })` | `features/print/PrintListButton.tsx` | P6 (a) |
| R2 | `DayActions`, 2e | `DeleteDayButton({ restaurant: "r2", iso })` | `features/staff/DeleteDayButton.tsx` | P5 (b) |

Déjà rendus par le cadre (rien à refaire en P5 (c) ni (d1)) : date longue, jauge R1 « {rem} / {capacité} couverts », thème, menu (R1) ou note (R2), « Ouvert par {nom} » (vide : rien), plats R2 avec prix et jauge (`DishRow`), message collègue d'un jour sans service (C-10b, R1 et R2), aucun « Réserver », aucune note de clôture de 10 h. Un jour passé garde ses actions (`05` § 5.3).

### Lecture de l'état et de l'URL

- `useStaffState(select)` (`features/staff/use-staff-state.ts`) : l'état complet de la session ouverte (`FullState`), même source et même actualisation que `useAppState`, aucune lecture propre. `StaffPage` ne rend plus rien du mode collègue dès que la session se ferme, avant le retour sur `/`.
- URL : `usePageSearch()` et `usePageNavigate()` (`features/calendar/page-search.ts`), type `PageSearchParams` (`domain/navigation.ts`) ; `selectDay` et `goToToday` ferment ce qui dépend du jour de leur restaurant. Valeurs : `editResa` = `r1:{id}` ou `r2:{id}`, `ajout` = `r1` ou `r2:{dish id}`, `editPlat` = `{dish id}`, identifiants en `[\w+-]{1,64}`.

### Fabrique des écritures (`mutations/staff/write.ts`)

```ts
type StaffWriteDomain = "days" | "dishes" | "bookings" | "settings";
function staffWriteKey(domain: StaffWriteDomain, action: string): readonly ["write", StaffWriteDomain, string];
interface StaffWriteResult { state: FullState; sessionIdAtCall: number }
interface StaffWriteConfig<TVariables> {
  domain: StaffWriteDomain;
  action: string;                                                   // "openR1", "editBookingR2", "save"…
  write: (password: string, variables: TVariables) => Promise<FullState>; // api/actions.ts, ou une suite d'appels
  successToast?: (variables: TVariables, state: FullState) => string;     // intl.formatMessage(…), 02 § 4.7
}
function staffWriteOptions<TVariables>(config: StaffWriteConfig<TVariables>): MutationOptions<StaffWriteResult, Error, TVariables>;
function adoptStaffState(queryClient: QueryClient, result: StaffWriteResult): Promise<boolean>;
function staffErrorText(error: unknown): string | null;
```

- `mutationFn` lit `password` et `id` dans le store au départ ; sans session : erreur, rien n'est envoyé. Clé `['write', domain, action]`, `scope: { id: 'write' }`, jamais rejouée.
- `onSuccess` : `adoptStaffState` (garde : session ouverte et `id === sessionIdAtCall`, puis `cancelQueries(['state'])`, garde de nouveau, `setQueryData(['state','staff', id])`, `invalidateQueries(['state','public'], { refetchType: 'none' })`), puis le toast de succès si la garde a laissé passer. Réponse après une déconnexion : ni cache, ni toast (E-55).
- Mot de passe refusé : le cache des mutations ferme la session (`password-changed`) ; `staffErrorText` rend alors `null` (la déconnexion l'a déjà dit). Autre erreur métier : le message du script ; panne : « Le service ne répond pas. Réessayez dans un instant. » (D-14).
- Paramètres (D-20) : un seul `write` qui enchaîne les `setConfigField` ; sur un échec partiel, l'erreur peut porter le dernier état reçu et `adoptStaffState(queryClient, { state, sessionIdAtCall })` le garde.

Exemple (P5 (b)) :

```ts
export function useEditDayR1() {
  return useMutation(
    staffWriteOptions({
      domain: "days",
      action: "editR1",
      write: editDayR1,
      successToast: () => intl.formatMessage(messages.dayEdited),
    }),
  );
}
// Dans onSubmit du formulaire :
try {
  await editDay.mutateAsync(input, { onSuccess: () => { /* fermeture (replace), focus E-48 */ } });
} catch (error) {
  const text = staffErrorText(error);
  if (text !== null) showToast(text, "error"); // ou setServerErrors sous le champ concerné
}
```

### Tests et stories

- Projet `browser` : le store de session est fermé au début de chaque test ; un test ouvre la session comme la connexion : `queryClient.setQueryData(stateKeys.staff(id + 1), await fetchFullState(SEED_PASSWORD))` puis `useSessionStore.getState().open(SEED_PASSWORD)`, ou seulement `open(SEED_PASSWORD)` (la page lit alors l'état complet sur le faux script). Formulaires : `src/test/column-page.tsx` (`renderColumn(url, restaurant, card)`) accepte une fiche collègue une fois la session ouverte ; jamais `renderRoute` pour un test qui focalise un champ (R-36).
- Stories : `beforeEach: staffSession` (`src/test/story-session.ts`), `decorators: [atUrl("/collegue?…")]`, `clockAt()` (voir `StaffDayCardR1.stories.tsx`).
- knip : `src/mutations/staff/*.ts!` est une entrée de production et `api/{actions,errors,schemas,staff-schemas,transport}` reste exclu jusqu'à la fin de la vague 10 ; les sessions parallèles ne touchent pas `knip.json`.

## Preuves

| Commande | Résultat |
| --- | --- |
| `pnpm check` | extraction, format, lint, `tsc` sans remarque ; Vitest 162 fichiers, 2 137 tests verts (node, node-ny, browser, storybook) ; `knip` et `knip --production` sans remarque |
| `pnpm test:browser` | 56 fichiers, 429 tests verts, aucun rejet non géré |
| `vitest run --project browser --project storybook src/features/page src/routes src/mutations` | tous verts (dont 7 stories collègue sous axe) |
| `pnpm build:e2e && git diff --exit-code src/routeTree.gen.ts translations/fr.json` | aucune différence |
| `pnpm test:e2e --project=react --grep "@L-01\|@G-06\|@G-08\|@C-30"` | 4 verts (les quatre tests de REG-27) ; 6 rouges hors de P5 (a) (voir « Contradictions ») |
| `pnpm test:e2e --project=react --grep "@L-01" --repeat-each=5` | 20 verts sur 20 |
| `pnpm test:e2e --project=react --grep "@p4\|@framework\|@L-01"` (nouvelle valeur de `ci.yml`) | 44 verts sur 44 (les 40 d'avant y sont) |
| `pnpm test:e2e --project=react-only` | 9 verts sur 9 (smoke, hydratation S4, `staff-session.spec.ts`) |
| `pnpm test:e2e --project=react-only e2e/staff-session.spec.ts --repeat-each=10` | 40 verts sur 40 |
| `pnpm test:e2e:legacy` | 76 verts sur 76 (dont REG-29 `@changed:E-55` et `changedTagsMatchPlanGaps`) |
| `pnpm build && pnpm budget` (S3) | JS 174,7 kB gzip (limite 200 ; 169,1 kB avant la session), CSS 10,3 kB. Morceaux à part : `collegue-*.js` (page et fiches collègue), `LoginPanel-*.js` (formulaire de connexion) ; dans le chemin initial : `ModeSwitch`, `mutations/login.ts`, `validateSearch` et `beforeLoad` de `/collegue` |
| `grep` des textes collègue dans les fichiers du chemin initial | « Aucun jour ouvert… », « Ouvert par » : seulement `collegue-*.js` ; « Mot de passe collègue » : seulement `LoginPanel-*.js` |
| `grep -rnE "use(Layout)?Effect\(" src … --exclude-dir=test` (S6) | 0 ligne |

S8 : `routes/-collegue.test.tsx` vérifie après « Client » aucune entrée `['state','staff']`, cache des mutations vide, aucun « Ouvert par » dans le DOM, retour sur `/` avec les seuls calendriers ; une écriture `editDayR1` retenue par `hold()`, déconnexion par inactivité, puis réponse : aucune entrée `['state','staff']` ; mot de passe absent de `localStorage`, `sessionStorage`, de l'URL, de l'historique, des clés de requête et des sorties `console.*` (espions). `write.test.tsx` : même garde sans page, et réponse d'une session précédente jetée quand une nouvelle est ouverte. `login.test.tsx` et `ModeSwitch.test.tsx` : aucune mutation ni clé ne garde le mot de passe après la connexion ou un refus.

## Décisions

1. **Emplacements = composants dans les fichiers des sessions** : `StaffPage` et les cadres de fiches importent un composant par emplacement, posé vide (`null`) dans le fichier de la session qui le remplit. Les sessions parallèles ne modifient ni `StaffPage.tsx` ni les cadres : aucune fusion sur un fichier commun.
2. **Cadres des fiches collègue en P5 (a)**, avec « Ouvert par » et le message d'un jour sans service (C-10b) que le lancement plaçait en P5 (d1) et (c) : sans eux, trois sessions auraient écrit dans les mêmes fichiers.
3. **Panneau de connexion dans un morceau à part** : `useAppForm` dans `ModeSwitch` faisait entrer TanStack Form et tous les champs de `ui/form/` dans le chemin initial (209,0 kB mesurés, au-dessus de 200). Chargé au clic sur « Collègue » ou dès que `?connexion=true` montre le panneau, par `useSyncExternalStore` comme `load-booking-form.ts` (sans `lazy()` ni `<Suspense>`) ; rien n'est rendu pendant les quelques millisecondes du chargement.
4. **`useIsFromCache` sans suspension** : `ModeSwitch` est dans l'en-tête, rendu aussi avant les données ; `useSuspenseQuery` y aurait lancé une lecture. Valeur `false` sans donnée (une connexion reste possible avant la première réponse, comme `dataStale` de l'ancien code).
5. **`ModeSwitch` après l'hydratation seulement** (`Page`) : la coquille prérendue n'en a pas ; le rendre pendant l'hydratation casserait la barrière de l'arbitrage 16. `panels` n'est rendu qu'avec des données.
6. **`gcTime` de l'état complet** : Query garde le plus grand `gcTime` qu'une entrée a reçu ; l'entrée posée par `setQueryData` à la connexion garde donc le `gcTime` par défaut, même observée par `staffStateOptions` (`gcTime: 0`). Essayé : `setQueryDefaults(['state','staff'], { gcTime: 0 })` dans `createQueryClient` ; l'entrée peut alors disparaître entre `setQueryData` et le premier observateur (minuteur de 0 ms) et deux tests existants échouaient. Retenu : défauts inchangés ; pendant une session, `Page` observe toujours l'état complet, et la purge de la déconnexion le retire.
7. **Loader de `/collegue` sans attente** : avec `gcTime: 0`, un état lu et attendu dans le loader serait retiré avant le montage de la page (aucun observateur), puis relu. Le loader lance la lecture si l'entrée manque ; la page suspend sur la même requête.
8. **Identifiants des search params en `[\w+-]{1,64}`** au lieu de `[\w-]` (PLAN § 3.2) : les identifiants du faux script portent « + » (`r1b-d+1-ungerer`, REG-28) ; ceux du vrai script sont des UUID.
9. **Mot de passe hors du cache des mutations** : `useLogin` à `gcTime: 0`, `reset()` après chaque essai (succès compris) ; la variable de la mutation ne survit pas à l'essai.
10. **Focus** : un focus en attente, au niveau du module, pris par une ref callback stable au montage du sélecteur suivant : « Collègue » après une connexion (`06` § 1.3 (5)), « Client » après une déconnexion par « Client ». Le champ ne prend le focus qu'à l'ouverture par « Collègue », pas par un lien ou la garde (`06` § 1.2 ; évite aussi le blocage de R-36 dans les tests de route).
11. **Navigations en `replace`** : ouverture et fermeture du panneau, navigation après la connexion, redirection de la garde. Retour arrière après une connexion : la page précédente, pas le panneau.
12. **`StaffPage` rend `PageSkeleton` quand la session se ferme**, le temps que `afterLogout` revienne sur `/` (aucun composant collègue rendu sur l'état public).
13. **« Valider » occupé affiche « Envoi en cours… »** (libellé par défaut de `SubmitButton`) : `06` n'a pas de libellé d'attente pour la connexion (voile), E-04 demande un bouton occupé.
14. **Pas de repli `checkPassword`** (`06` § 1.3 (4)) : PLAN § 3.1 exclut `checkPassword` de `api/actions.ts` ; le script déployé connaît `getAdminState`.
15. **Morceau de `/collegue` préchargé** pendant la vérification du mot de passe (`router.loadRouteChunk`, R-31).
16. **E-55** : assertion ajoutée à la variante de REG-29 (pas de modification d'assertion existante) ; la cellule du PLAN suit l'instruction écrite dans la ligne E-55.

## Contradictions

- **Critère « @G-08, @C-30 (et @G-06) verts sur `react` »** : REG-28 clique « Modifier » d'une ligne de réservation (P5 (d1)) ; REG-29 lit les noms de la fiche (d1), ouvre « Paramètres » (e), « Ouvrir un jour » et le sélecteur de date (b) ; sa variante E-55 passe par « Modifier ce jour » (b) ; REG-30 ouvre un jour (b) et ajoute une personne (d2) ; REG-31 lit les noms de la fiche (d1) ; REG-35 (`@G-06`) attend (b) et (d1). Verts sur `react` : les quatre tests de REG-27 (`@L-01`, `@G-06` connexion, `@G-08` URL). Les comportements de G-08 et C-30 que P5 (a) livre sont prouvés par `e2e/staff-session.spec.ts` (`react-only` : garde et retour exact, « Client », inactivité, mot de passe changé) et par les tests S8.
- **PLAN § 3.2** : regex des identifiants trop étroite pour le faux script (décision 8).
- **PLAN § 3.3** (« rien ne reste en cache dès qu'aucun composant ne l'observe ») : vrai pour les entrées lues par `staffStateOptions`, pas pour celle de la connexion (décision 6).
- **Lancement P5 (a)** : « Ouvert par » et C-10b faits ici au lieu de P5 (d1) et (c) (décision 2).
- **p4c, « Reste à faire » P5 (d2)** : `adoptBookingState` (`mutations/bookings.ts`) invalide `['state','staff']` dès qu'une session est ouverte à la réponse. Une invalidation relit avec le mot de passe de la session en cours et n'écrit aucune donnée de la session close : pas de fuite (F-02). Si l'orchestrateur veut la garde stricte pour l'ajout d'une personne, `mutations/bookings.ts` doit lire `useSessionStore.getState().id` dans `mutationFn` et comparer dans `onSuccess` ; P5 (d2) ne touche pas ce fichier.

## Versions

Aucune version changée, aucun paquet ajouté.

## Overrides oxlint

Aucun.

## Fichiers partagés modifiés

- `knip.json` : entrée `src/mutations/staff/*.ts!` (retirer après la vague 10), exclusion de `intl/staff-messages.ts` retirée, exclusion d'`api/` gardée (actions collègue sans importeur de production).
- `.github/workflows/ci.yml` : `E2E_REACT_GREP` = `@p4|@framework|@L-01` (commit séparé).
- `src/features/page/Page.tsx` (`modeSwitch` après l'hydratation, `panels` avec données), `PublicPage.tsx` (`modeSwitch={<ModeSwitch />}`).
- `src/queries/use-app-state.ts` (`useIsFromCache`) et son test ; `src/queries/state.ts`, `src/session/session.ts` (balises `@public`) ; `src/styles/tokens.css` (`--login-field-width`) ; `src/test/setup-browser.ts` ; `src/background/logout.test.ts` (la garde de `/collegue` exige une session ouverte).
- `e2e/smoke.spec.ts` (lien profond `/collegue`), `e2e/regression/staff-session.spec.ts` (assertion E-55 ajoutée), `docs/migration/PLAN.md` (cellule E-55), `docs/migration/parite.md`.

## Reste à faire

- P5 (b) à (e), P6 (a) : remplir les emplacements (tableaux ci-dessus) et les hooks de `mutations/staff/{days,dishes,bookings,settings}.ts` ; remplacer la constante `X_DOMAIN` de chaque fichier.
- P5 (b) : la variante `react` de REG-29 E-55 passe dès que « Modifier ce jour » existe.
- Orchestrateur, après la vague 10 : retirer l'entrée knip `src/mutations/staff/*.ts!` et l'exclusion `api/{…}` ; élargir `E2E_REACT_GREP` à `@p5`.
- P7 : animation de sortie du panneau de connexion (fermeture immédiate aujourd'hui, comme sous mouvement réduit).

## Pour l'orchestrateur (PLAN.md)

- Journal du plan : « P5 (a) fusionnée : connexion, garde, déconnexions, socle des panneaux ; REG-27 vert sur `react` (`E2E_REACT_GREP` += `@L-01`) ; budget 174,7 kB ».
- § 3.1 (`features/page/`) : « ModeSwitch (Client / Collègue), LoginPanel (morceau à part, `load-login-panel.ts`) » ; (`features/staff/`) : « StaffDayCardR1, StaffDayCardR2 (cadres des fiches collègue et leurs emplacements), StaffDayCard (« Ouvert par », jour sans service), use-staff-state.ts, DeleteDayButton » ; (`features/print/`) : « PrintListButton ».
- § 3.2, colonne « Type valibot » de `editResa`, `ajout`, `editPlat` : `[\w+-]{1,64}` (identifiants du faux script).
- § 3.3, ligne « `gcTime` de l'état complet » : « `0` pour les entrées lues par `staffStateOptions` ; l'entrée posée par la connexion garde le `gcTime` par défaut (Query retient le plus grand) et part à la purge de la déconnexion ».
- § 3.3.3, ligne « Connexion » : « mutation à `gcTime: 0`, `reset()` après chaque essai ; navigation `replace` ; focus sur « Collègue » dans la page collègue ».
- § 5.0, propriétaires : les fichiers d'emplacements posés par P5 (a) appartiennent aux sessions du tableau « Emplacements des fiches collègue » de ce journal.
