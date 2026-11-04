# AppResaAristide : ce qui est réutilisable pour la migration React + TanStack Start

Analyse en lecture seule d'AppResaAristide (clone local, non versionné ici : clone peu profond de TheGaudis/AppResaAristide, un seul commit `b999021`, « Harden seedDev… », 24/09/2026, auteur Quentin Gliech). Cible de comparaison : ce dépôt (vanilla `index.html` + `js/*.js` + `Code.gs`) et sa spec `docs/spec/00…09`.

> **À savoir avant tout** : la tentative a été écrite à partir d'une **version ancienne** de l'application d'origine : un `index.html` monofichier de 1251 lignes (« Source: …/orig/index.html (1251 lines, vanilla JS, one file) », `docs/original-app-spec.md` l. 5). Depuis, l'original a beaucoup changé : découpage en `js/*.js`, `Code.gs` à jour et versionné, tickets restaurant, cut-off 10 h, e-mail obligatoire, `requestId`, cache local et etag, suppression en deux clics, modification de réservations, ajout manuel, nouvelle charte (vert/bleu/magenta, Outfit). La plupart des « divergences » relevées au § 4 viennent donc de cette évolution, pas d'erreurs d'une spec ou de l'autre. **C'est le code vanilla actuel qui fait foi.**

---

## 1. Arborescence et cartographie

### 1.1 Racine (config)

```
.editorconfig  .env.example  .gitattributes  .gitignore  .npmrc (save-exact=true)
.oxfmtrc.json  .oxlintrc.json  tsconfig.json  vite.config.ts  vitest.config.ts
package.json (scripts, knip inline)  pnpm-workspace.yaml (trustPolicy, peer rules)
.github/workflows/check.yaml  CLAUDE.md  AGENTS.md (renvoie à CLAUDE.md)  README.md (FR)
index.html  public/logo.png  skills-lock.json  .claude/settings.json (allowlist pnpm)
```

### 1.2 `src/` (≈ 4 000 lignes TS/TSX)

| Dossier | Fichiers | Rôle |
| --- | --- | --- |
| `src/main.tsx` | 41 l. | `ConvexAuthProvider` > `QueryClientProvider` > `ToastProvider` > `PrintProvider` > `RouterProvider`. Abonnement `subscribeToday(() => router.invalidate())`. |
| `src/router.tsx` | 31 l. | `createRouter({ routeTree, context: { queryClient }, defaultPreload: "intent", defaultPreloadStaleTime: 0, defaultErrorComponent, scrollRestoration: true })`. |
| `src/routeTree.gen.ts` | généré | commité, vérifié en CI. |
| `src/index.css` | 95 l. | `@import "tailwindcss"` + `@theme` (jetons de l'ANCIENNE charte : `#2b2622`, Fraunces, sage/gold/brick) + `.theme-r1/.theme-r2/.theme-summary` qui redéfinissent les jetons, `#root{isolation:isolate}`, `body{position:relative}`, `@media print`. |
| `src/routes/` | `__root.tsx`, `index.tsx`, `table.tsx`, `plats.tsx`, `collegue.tsx`, `collegue.index.tsx`, `collegue.table.tsx`, `collegue.plats.tsx`, `collegue.demain.tsx`, `collegue.parametres.tsx`, `collegue.acces.tsx` | Routage par fichiers (convention « flat » avec points). Détail § 2.5. |
| `src/components/` | `calendar.tsx` (280), `day-card.tsx` (117), `booking-row.tsx`, `personal-fields.tsx`, `header.tsx`, `layout.tsx`, `site-page.tsx`, `sign-in-form.tsx`, `skeletons.tsx`, `tabs.tsx` | Pages et blocs partagés. |
| `src/components/form/fields.tsx` | 374 l. | **Le cœur réutilisable** : `createFormHook` TanStack Form + Base UI `Field` (`TextField`, `CountField`, `SelectField`, `Form`, `FormError`, `SubmitButton`, `focusOnMount`). |
| `src/components/ui/` | `button.tsx` (`Button`, `ButtonLink` = `createLink`), `confirm-button.tsx` (Base UI `AlertDialog`), `panel.tsx` (`Panel`, `InfoBlock`, `Separator`, `PanelSkeleton`), `pill.tsx` (`CapacityPill`), `popup.ts` (classes de transition), `spinner.tsx`, `toast.tsx` (Base UI `Toast`) | Kit UI. |
| `src/components/r1/` | `booking-form.tsx` (181), `day-fields.tsx`, `edit-day-form.tsx`, `open-day-form.tsx`, `r1-admin-card.tsx` (172), `r1-admin-page.tsx`, `r1-public-card.tsx` | Restaurant 1. |
| `src/components/r2/` | `booking-form.tsx` (222), `dish-fields.tsx`, `item-form.tsx`, `item-row.tsx`, `open-day-form.tsx`, `price-suggestions.tsx`, `r2-admin-card.tsx` (160), `r2-admin-page.tsx`, `r2-public-card.tsx` | Restaurant 2. |
| `src/components/admin/` | `colleague-area.tsx`, `access-denied.tsx`, `members-page.tsx` (198), `settings-panel.tsx` (152), `tomorrow-summary.tsx` (160) | Espace collègue. |
| `src/components/print/` | `print-provider.tsx`, `print-sheet.tsx` (194), `print-table.tsx` | Impression dans la page. |
| `src/hooks/` | `use-admin.ts` (`useMe`, `useAdminDay`), `use-days.ts` (`useCalendarDays`, `useDay`, `useNextOpenDate`, `usePriceSuggestions`), `use-settings.ts`, `use-members.ts`, `use-print.ts` (contexte + type `PrintJob`), `use-inactivity-sign-out.ts` | Lectures via `useSuspenseQuery`. |
| `src/lib/` | `calendar.ts` (210) + test, `dates.ts` (95) + test, `money.ts` + test, `validators.ts` (88) + test, `dishes.ts` + test, `capacity.ts` + test, `today.ts` + test, `totals.ts`, `strings.ts`, `errors.ts`, `toast.ts`, `queries.ts`, `query-client.ts`, `loaders.ts`, `types.ts` | Fonctions pures et plomberie. |

### 1.3 `convex/` (backend Convex, pour comprendre les règles métier)

- `schema.ts` : tables `members`, `settings` (singleton), `r1Days {date, capacity, booked (dénormalisé), menu?, theme?, openedBy?}`, `r1Bookings {dayId, date, name, contact, classe, observation?, nbEleve, nbProf, nbExt, qty, totalPrice, reminderSentAt?}`, `r2Days {date, note?, theme?, openedBy?}`, `r2Items {dayId, date, name, stock, booked, price?}`, `r2Bookings {dayId, itemId, date, …, qty, mode, unitPrice? (copie du prix au moment de la réservation)}`. **Pas de notion de ticket restaurant.**
- `model/pricing.ts` (47 l.) : `r1Total(prices, counts)` (arrondi au centime), `r2Total(lines) → {totalPrice, hasPriceGap}`, `formatEuro`.
- `model/dates.ts` (104 l.) : `parisDate(now)`, `parisHour(now)` (Intl, `timeZone: "Europe/Paris"`), `isIsoDate`, `addDays` et `daysBetween` en arithmétique UTC, `formatDateFr` (tables de jours et de mois, sans « 1er »).
- `model/validation.ts` : `cleanText` / `cleanOptional` (trim + longueur max 200/1000), `isCount` (entier, 0 à 500), `isPositiveCount`, `isPrice` (0 à 1000), `checkDate`, `checkRange` (62 jours au plus), `fail()` (ConvexError).
- `model/booking.ts` : `cleanBooker`, `remaining(limit, booked) = max(0, limit − booked)`, `checkNotPast(date, today)`.
- `model/r1.ts`, `model/r2.ts` : lecture par index ; `cleanItem`, `mergeRequestedItems` (fusionne les lignes d'un même plat).
- `model/emails.ts` : gabarits d'e-mails (confirmation, rappel, lien magique), `looksLikeEmail`, `groupByContact`. **Sans objet chez nous** : les e-mails restent dans `Code.gs`.
- `model/auth.ts`, `model/settings.ts` (`DEFAULT_SETTINGS` = valeurs serveur de l'original).
- Fonctions publiques : `r1.ts` (`book`, `openDay`, `editDay`, `deleteDay`, `deleteBooking`), `r2.ts` (`book` tout-ou-rien, `openDay`, `deleteDay`, `addItem`, `editItem`, `deleteItem`, `deleteBooking`), `calendar.ts` (`listDays {from,to}`, `getDay {date}`), `admin.ts` (`me`, `getDay`), `members.ts`, `settings.ts`, `emails.ts`, `crons.ts`, `importLegacy.ts`, `seed.ts`, `http.ts`, `staticHosting.ts`.
- Tests (`convex-test` + vitest, environnement `edge-runtime`) : `model.test.ts` (8), `r1.test.ts` (4), `r2.test.ts` (3), `calendar.test.ts` (4), `admin.test.ts` (4), `members.test.ts` (4), `emails.test.ts` (3), `importLegacy.test.ts` (2).

### 1.4 `docs/`

- `docs/architecture.md` (403 l.) : pile technique, domaine, auth, modèle de données, contrat des fonctions, conventions frontend (URL, chargement, formulaires, écritures). **Le document le plus utile à relire** : les décisions de conception y sont justifiées.
- `docs/original-app-spec.md` (869 l.) : spec fonctionnelle de l'ancienne version de l'original (textes verbatim, actions, bugs). Comparée au § 4.

---

## 2. Ce qui est DIRECTEMENT réutilisable

Qualité générale : **très bonne**. TypeScript strict (`@tsconfig/strictest`), oxlint type-aware sans contournement, commentaires qui expliquent les contraintes, 62 tests, deux `useEffect` et deux `useState` dans tout `src/`, aucun `useNavigate` dans un gestionnaire d'événement. Couplages principaux : **Tailwind** dans tous les composants (199 `className=`), **Convex** dans les hooks, les mutations et les types.

### 2.1 Fonctions métier pures

| Besoin chez nous | Où dans la tentative | Testé ? | Réutilisable ? |
| --- | --- | --- | --- |
| Prix R1 (élèves × tarif + …) | `convex/model/pricing.ts` `r1Total(prices, counts)`, arrondi au centime | oui (`model.test.ts`) | **Tel quel**. Le client actuel (`priceR1`, `js/reservation.js` l. 240) n'arrondit pas, mais l'arrondi est sans effet visible. Adapter les noms : `state.priceEleve` est une **chaîne** chez nous → `Number()`. |
| Montants R2 en euros + « hors plats sans prix » | `pricing.ts` `r2Total(lines)` ; `src/lib/totals.ts` (`r2BookingPrice`, `r2ItemTotal`, `r2DayTotal`) | `r2Total` oui | **À adapter** : il manque les tickets. Chez nous `r2Amounts` renvoie `{euros, tickets, gap}`, un plat au ticket ne compte ni en euros ni dans le « gap » (`js/donnees.js` l. 225-233). Le prix 0 vaut « prix 0 » dans `r2Total` mais « sans prix » chez nous (`Prix: price \|\| ''` dans `Code.gs` l. 617/625/631). |
| Règle « un ticket par commande » | **absente** | — | À écrire : `orderAmounts = {...r2Amounts(l), tickets: Math.min(tickets, 1)}` (`js/reservation.js` l. 48-50). |
| Ticket → sur place uniquement | **absente** | — | À écrire (`dayHasTicket`, `serviceMode`, `js/donnees.js` l. 303-306). |
| Places restantes | `convex/model/booking.ts` `remaining()` ; côté client `day.capacity - day.booked` en ligne | non | Trivial. Chez nous, `booked` n'existe pas : il faut le calculer à partir de `r1Bookings`/`r2Bookings` (somme de `Qte`). À faire dans une couche de sélection (voir § 3). |
| Classe de capacité | `src/lib/capacity.ts` `capacityClass`, `r1DayStatus`, `r2DayStatus`, `r2OpenToCustomers` | partiellement | **À adapter** : seuil de l'ANCIEN original (`rem <= max(2, round(cap*0.2))` → « low »). Le code actuel utilise `rem < cap * 0.5` (`js/donnees.js` l. 318). Libellés à reprendre de chez nous (« bientôt complet » et non « presque complet »). Les tables `capacityTextClass`/`capacityDotClass` (classes Tailwind) disparaissent. |
| Cut-off 10 h, Europe/Paris | `convex/model/dates.ts` `parisHour(now)`, `parisDate(now)` | oui (heure d'été/d'hiver) | **Tel quel**, très utile : l'original lit l'heure locale de l'appareil (`new Date().getHours() >= 10`, `js/donnees.js` l. 311-314) ; `parisHour(Date.now()) >= 10` est plus juste. La règle elle-même (`r2OrdersClosed`) reste à écrire. |
| Dates ISO locales, semaines, grilles | `src/lib/dates.ts` : `todayISO`, `addDays`, `addMonths` (borne au 1er du mois, donc pas le bug de débordement `setMonth` noté en 05 §8.2), `weekDates`, `monthGridDates` (42 cases), `sameMonth`, `dayOfMonth`, `formatLongDate`, `formatWeekLabel`, `formatMonthLabel` | `formatWeekLabel` oui | **Tel quel**. `formatWeekLabel` gère les semaines à cheval sur deux mois ou deux ans, ce que l'original ne fait pas forcément (à comparer avec `05` §1). |
| « Aujourd'hui » réactif (minuit) | `src/lib/today.ts` (`getToday`, `subscribeToday`, `useToday` via `useSyncExternalStore`, un minuteur armé pour minuit) | oui | **Tel quel**, et il évite un `useEffect`. Pour le cut-off, il faudra un équivalent « 10 h » (même principe : minuteur armé jusqu'à 10:00:00, notifier). |
| Format montant | `src/lib/money.ts` `formatEuro` (espace **normale**) | indirect | **À adapter** : chez nous `toFixed(2).replace('.', ',') + ' €'` (espace insécable, `00` §3). |
| Saisie de montants/compteurs | `money.ts` `parseAmount` (accepte la virgule), `parseCount` (vide = 0, `NaN` si non entier), `stepCount` (boutons −/+) | oui | **Tel quel**. Attention, `parseCount("2.7")` donne `NaN`, alors que l'original tronque (`parseInt` → 2, `04` §5.2). Choix à arbitrer ; le comportement strict est préférable. |
| Validateurs de champs | `src/lib/validators.ts` : `required`, `positiveInteger`, `nonNegativeInteger`, `atLeast`, `atMost`, `nonNegativeAmount` (2 décimales), `email` (même regex que chez nous : `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), `compose` | oui (7 tests) | **Tel quel** (indépendants de Convex). Les messages restent à passer en paramètre : prendre ceux de notre spec (« Indiquez vos nom et prénom. »…). |
| Plats saisis | `src/lib/dishes.ts` `emptyDish`, `isBlankDish`, `parseDish` | oui | **À adapter** : ajouter `ticket: boolean` (case « Ticket restaurant », `06` §4.3), et le suffixe ` (ticket restaurant)` à l'envoi. |
| Pluriels | **absent** : la tentative écrit « couvert(s) », « portion(s) » | — | À écrire : `plural(n, word)` (0 et 1 au singulier, `00` §3), `ticketsText`. |
| Texte optionnel | `src/lib/strings.ts` `optional()` | non | Tel quel. |
| URL ↔ calendrier | `src/lib/calendar.ts` : `parseRestaurantSearch`, `calendarFromSearch`, `calendarToSearch` (forme canonique : paramètres par défaut omis), `changeCalendar` (ferme le formulaire si le jour change), `closeForm`, `visibleDates`, `visibleRange`, `shiftPeriod`, `nextDate`, `upcomingRange` | oui (10 tests) | **À adapter, gain fort**. La logique tient pour un calendrier ; notre page en a **deux** (R1 et R2 côte à côte, `09` §1) → préfixer les paramètres (`r1`, `r1vue`, `r1periode`, idem `r2`) ou choisir une route par restaurant. |

Extrait représentatif (`convex/model/dates.ts`), réutilisable tel quel pour le cut-off :

```ts
const parisHourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23",
});
export function parisHour(now: number): number {
  return Number(part(parisHourFormat.formatToParts(new Date(now)), "hour"));
}
```

### 2.2 Composants UI Base UI et leur style

Tous stylés en **Tailwind 4** (classes utilitaires dans le JSX, jetons dans `@theme`). Conversion en CSS Modules + `design-system.css` : il faut réécrire les classes, mais la **structure, l'accessibilité et les motifs Base UI se reprennent tels quels**.

| Composant | Fichier | Base UI | Motifs notables | Conversion |
| --- | --- | --- | --- | --- |
| `TextField`, `CountField`, `SelectField` | `form/fields.tsx` | `Field.Root/Label/Control/Error` | `invalid`, `touched` passés à `Field.Root` ; style d'erreur par `data-invalid:border-brick` ; `Field.Control render={(props) => <select {...props} />}` pour un `<select>` natif ; `Field.Error match={error !== undefined}` | Remplacer `layouts.stacked/inline` par `.field`, `.field-error` de `design-system.css`, en ciblant `[data-invalid]`. |
| `CountField` (− champ +) | idem | `Field` + `Button` | boutons 44 px (`min-h-11 min-w-11`) ; `max` borne seulement « + », la saisie est validée par `atMost` | Bonne idée UX mobile, **absente de l'original** (input `number`). Ce n'est pas un `NumberField` Base UI. À garder ou remplacer par `NumberField` (`@base-ui/react/number-field`) : décision à prendre. |
| `RadioGroup` segmenté (mode de service) | `r2/booking-form.tsx` l. 123-148 | `RadioGroup` + `Radio.Root nativeButton render={(props, state) => <Button {...props} active={state.checked} />}` | navigation aux flèches, `role="radiogroup"` | **Tel quel** sur le fond. Chez nous, le mode « À emporter » est **masqué** un jour au ticket et il y a un texte d'aide ; l'original utilise `aria-pressed` (`04` §5.3). Le RadioGroup est plus juste sémantiquement. Style : `.seg-group/.seg-btn` de `design-system.css`, avec le sélecteur `[data-checked]`. |
| `ConfirmButton` | `ui/confirm-button.tsx` | `AlertDialog` (Root/Trigger `render={<Button/>}`/Portal/Backdrop/Popup/Title/Close) | `data-starting-style`/`data-ending-style` pour les transitions ; `supports-[-webkit-touch-callout:none]:absolute` pour iOS | **Écart UX** : l'original n'a **aucune modale** et confirme en deux clics, avec un libellé « Confirmer ? » pendant 4 s (`09` §6, `06` §5.2). À écarter si l'on garde le comportement d'origine ; le patron `render` reste un bon modèle. |
| `ToastProvider` + `toast()` | `ui/toast.tsx`, `lib/toast.ts` | `Toast.createToastManager()` (gestionnaire global appelable hors React), `Toast.Provider timeout={3500} limit={1}` | `limit={1}` : un nouveau toast remplace l'ancien, ce qui **corrige le bug des minuteurs qui se chevauchent** (`04` points d'attention 5) ; `priority: "high"` pour les erreurs (annonce `assertive`) ; `data-[type=error]` | **Tel quel**, style à convertir (`.toast`, `.toast.error` de `design-system.css`). Il manque le type « neutre » (« Commandes en ligne clôturées… » et doublon) : ajouter un `type: "info"`. |
| `Button` / `ButtonLink` | `ui/button.tsx` | — (`createLink` du routeur) | `ButtonLink` = `Link` du routeur à l'allure d'un bouton, `activeOptions={{ exact: true }}` ; `busy` → `cursor-wait` | **Tel quel** ; variantes → `.btn.primary/.ghost/.danger` de chez nous. Ajouter `aria-busy`. |
| `Panel`, `InfoBlock`, `Separator`, `PanelSkeleton` | `ui/panel.tsx` | — | `InfoBlock` retourne `null` si le texte est vide | Trivial à convertir. |
| `CapacityPill` | `ui/pill.tsx` | — | — | Chez nous, c'est une **jauge** (`--pct`, `gaugeStyle`, `00` §3) : à réécrire. |
| `Loading`, squelettes | `ui/spinner.tsx`, `skeletons.tsx` | — | `<output aria-label="Chargement...">` | Le principe est bon ; les classes sont à remplacer par `.sk` (`08` §4.16). |

**Patrons à reprendre** : `render={<Button …/>}` ou `render={(props, state) => …}` pour habiller les parties Base UI avec nos propres composants ; stylage par attributs `data-*` (`data-invalid`, `data-checked`, `data-starting-style`, `data-ending-style`, `data-limited`, `data-[status=active]` posé par le routeur sur les `Link` actifs) ; `#root { isolation: isolate }` et `body { position: relative }` pour les portails Base UI (commentaire de `index.css` : fond des dialogues sur iOS Safari).

### 2.3 Calendrier

`src/components/calendar.tsx` (280 l.) + `src/lib/calendar.ts`.

- **Tout est dans l'URL** : chaque contrôle (‹ ›, Semaine/Mois, Aujourd'hui, chaque jour) est un `<Link>` dont la recherche est calculée par `changeCalendar(prev, today, change)`, avec `resetScroll={false}`. Le retour arrière fonctionne, les liens sont préchargés au survol, et il n'y a ni état local ni `useEffect`.
- `aria-label` de chaque jour : `{date longue}[, aujourd'hui][, {nom} : {statut}]`. Point fin noté dans le code : le routeur pose `aria-current="page"` sur le lien du jour sélectionné, ce qui écraserait `aria-current="date"`. D'où « aujourd'hui » dans le libellé.
- Deux modes : `status` (un restaurant, pastille de capacité) ou `both` (deux pastilles colorées par restaurant, creuses si complet, avec légende).
- **Pas de navigation clavier en grille** : 7 à 42 liens à parcourir avec Tab, aucune flèche, aucun « roving tabindex ». Notre spec impose ← → ↑ ↓ Début Fin PageUp PageDown et un seul jour atteignable par Tab (`05` §2.6 et §3.2). **À compléter** : garder les liens (`<Link>` dans une grille `role="grid"`, ou cases `button` + `navigate` au clavier) et ajouter un gestionnaire `onKeyDown` qui déplace le focus puis navigue. C'est la seule navigation impérative acceptable.
- Pas de sélecteur de date en popup (le « Ouvrir un jour » se fait sur le jour sélectionné du calendrier). Notre `C-05` (sélecteur de date `role="dialog"`) n'a pas d'équivalent ; il disparaît si l'on adopte la même idée (voir § 5).

### 2.4 Formulaires TanStack Form

Architecture (`src/components/form/fields.tsx`, en-tête très documenté) :

```ts
export const { useAppForm, withFieldGroup } = createFormHook({
  fieldContext, formContext,
  fieldComponents: { TextField, SelectField, CountField },
  formComponents: { SubmitButton, FormError },
});
```

- **Valeurs = chaînes**, analysées dans `onSubmit` (`parseCount`, `parseAmount`).
- Un validateur `onChange` par champ (règles de `lib/validators.ts`) ; règles croisées dans le `validators.onChange` du formulaire, affichées par `form.FormError` (`role="alert"`) près du bouton.
- Affichage d'erreur : champ modifié **et** quitté, ou après une tentative d'envoi (`useFieldError`, l. 52-63). L'erreur disparaît dès que la valeur est correcte, comme le comportement d'origine (« dès la première frappe »).
- `canSubmitWhenInvalid: true` sur tous les formulaires. Sinon, un envoi alors qu'un champ montre déjà une erreur s'arrête avant que les champs non touchés soient vérifiés.
- `Form` appelle `form.validate("change")` puis `form.handleSubmit()`, pour que l'erreur croisée (« au moins une personne ») s'affiche dès le premier envoi en même temps que les erreurs de champ.
- **Astuce importante** : quitter un champ ne fait que `setMeta(isBlurred: true)` sans le marquer « touché ». Tant que rien n'est modifié, `useAppForm` continue de remplacer les valeurs quand `defaultValues` change : les formulaires d'édition restent synchronisés avec les données serveur (chez nous, l'actualisation toutes les 3 minutes).
- Groupes de champs `withFieldGroup` typés : `IdentityFields`, `ObservationField` (`personal-fields.tsx`), `R1DayFields` (`r1/day-fields.tsx`), `DishFields` (`r2/dish-fields.tsx`, avec `skipBlank` + `onChangeListenTo` pour ignorer une ligne vide).
- Tableau dynamique (`r2/open-day-form.tsx`) : `form.Field name="items" mode="array"`, `pushValue`, `removeValue`, `replaceValue(0, emptyDish)` pour garder au moins une ligne ; clé = index (commentaire : `DishFields` garde le `items[i]` monté).
- `SubmitButton` : désactivé et libellé `pendingLabel` pendant `isSubmitting` (le `onSubmit` attend `mutateAsync`). Il manque `aria-busy`.
- Focus au montage : `ref={focusOnMount}` (callback ref, sans `useEffect`).

Formulaires présents :

| Formulaire | Fichier | Remarques pour nous |
| --- | --- | --- |
| Réservation R1 | `r1/booking-form.tsx` | Trois `CountField` dont le « + » est borné par les places restantes (`max = remaining − chosen + self`) ; règle croisée `totalError` (≥ 1 et ≤ restant, alors que l'original ne contrôle pas le maximum côté client) ; total en direct via `useStore`, `aria-live`. **À adapter** : libellés, e-mail obligatoire, format du total (`plural · Total : …`), `requestId`, récapitulatif après succès. |
| Réservation R2 multi-plats | `r2/booking-form.tsx` | Quantités dans `quantities: Record<itemId, string>` ; `atMost(left)` par plat (l'original ne bloque pas, le serveur ajuste) ; « Épuisé » ; règle « au moins un plat ». **À adapter** : tickets, mode forcé, cut-off au moment de l'envoi, total `amountsText`. |
| Ouvrir un jour R1 / R2 | `r1/open-day-form.tsx`, `r2/open-day-form.tsx` | Pas de champ « Date » (jour sélectionné) ni « Votre nom » (`openedBy` = membre connecté). **Chez nous, `collegue` est un champ saisi** → à rajouter. R2 : ajouter la case ticket. |
| Modifier jour R1 | `r1/edit-day-form.tsx` | `atLeast(booked)` (« Impossible : N couvert(s)… ») : contrôle client que l'original n'a pas, mais que `Code.gs` fait (`editDayR1` l. 506). **Tel quel** ou presque. |
| Ajouter / modifier un plat | `r2/item-form.tsx` | Une seule `useMutation` dont `mutationFn` choisit `addItem` ou `editItem`. Datalist de prix (`PriceSuggestions`, `useId`). Ajouter la case ticket. Note : `Code.gs` ne contrôle pas `stock ≥ réservés` (06 §12.9) ; la règle client `atLeast(booked)` est un plus. |
| Paramètres | `admin/settings-panel.tsx` | N'envoie que les champs modifiés (`changedKeys` via `fieldMeta.isDirty && !isDefaultValue`), puis `formApi.reset()`. Chez nous : `setConfigField` **un appel par champ, en séquence**, et un champ vide est ignoré (`06` §2.2) ; « Aucune modification à enregistrer. » et « Paramètre(s) enregistré(s). ». La logique `changedKeys` se réutilise. |
| Connexion | `sign-in-form.tsx` | Lien par e-mail → à remplacer par le mot de passe. Le patron (mutation avec `meta: { noErrorToast: true }`, erreur dans `form.FormError`) est réutilisable. |
| Membres | `admin/members-page.tsx` | **Sans objet** (mot de passe partagé). |

**Absents** : modification d'une réservation (R1 avec recalcul de prix et maximum `editMaxR1`, R2 avec mode), « + Ajouter une personne » (e-mail facultatif, pas de cut-off, R2 un seul plat), `requestId`, récapitulatif « Réservation enregistrée », gestion de `_duplicate` et `_bookingResult` (`adjusted`/`skipped`). Tout cela est à écrire, mais avec les mêmes briques.

**Erreurs serveur** : `MutationCache.onError` global (`lib/query-client.ts`) → toast d'erreur avec `errorMessage(error)` ; on s'en exclut par `meta: { noErrorToast: true }` (enregistré par augmentation de module `Register.mutationMeta`). Les formulaires conservent leurs valeurs en cas d'erreur, puisque `handleSubmit` relance l'exception que `Form` intercepte (`.catch(() => null)`). **Le patron est réutilisable tel quel** : chez nous, un `ApiError` lancé par le client Apps Script (`{error}` → `throw new ApiError(msg)`) avec le même `errorMessage`.

**requestId** : absent. Proposition compatible avec leurs conventions : `const [requestId] = useState(() => crypto.randomUUID())` dans le composant formulaire, dont le cycle de vie est celui du formulaire ouvert (clé `key={date}`). Il est conservé si l'on réessaie après une erreur et renouvelé à chaque ouverture, comme dans l'original.

### 2.5 Routes TanStack Router

| Fichier | Chemin | `validateSearch` | `loader` | Composant |
| --- | --- | --- | --- | --- |
| `__root.tsx` | — | — | `ensureQueryData(me)` + `settings` | `Layout` ; `pendingComponent: FullPageLoading` avec `pendingMs: 0, pendingMinMs: 0` |
| `index.tsx` | `/` | `parseRestaurantSearch(search, pageForms.site, getToday())` | période affichée + 62 jours suivants (prochaine ouverture) + `getDay(date)` ; `loaderDeps: calendarSearch` | `SitePage` ; `pendingComponent: SiteSkeleton` |
| `table.tsx`, `plats.tsx` | `/table`, `/plats` | paramètres du calendrier | `beforeLoad: throw redirect({ to: "/", search, replace: true })` | — (anciens liens) |
| `collegue.tsx` | `/collegue` (layout) | — | — | `ColleagueArea` : formulaire de connexion **à la place** de `<Outlet/>` si pas connecté |
| `collegue.index.tsx` | `/collegue/` | paramètres du calendrier | redirection vers `/collegue/table` en gardant les paramètres | — |
| `collegue.table.tsx` / `collegue.plats.tsx` | | `parseRestaurantSearch(…, pageForms.r1Admin / r2Admin, …)` | `calendarDays(from,to)` + `adminDay(date)` si admin | `R1AdminPage` / `R2AdminPage` |
| `collegue.demain.tsx` | | — | `adminDay(demain)` si admin | `TomorrowSummary` |
| `collegue.parametres.tsx` | | — | — | `SettingsPanel` |
| `collegue.acces.tsx` | | — | membres si superadmin | `MembersPage` (sans objet) |

Paramètres d'URL (`docs/architecture.md` l. 326-332) : `jour` (omis si c'est aujourd'hui), `vue=mois` (omis en vue semaine), `periode` (seulement si la période affichée ne contient pas `jour`), `formulaire` (`table`, `plats`, `modifier-table`, `plat`), `plat` (id du plat édité). **Forme canonique** : `parseRestaurantSearch` renvoie toutes les clés, `undefined` si la valeur est invalide ou égale au défaut. Le routeur réécrit l'URL à chaque navigation, donc les liens vers la vue courante sont marqués actifs. Un formulaire ouvert garde `jour` dans l'URL, même si c'est aujourd'hui, pour rester sur son jour après minuit.

**Garde `/collegue`** : pas de `beforeLoad` qui redirige. Le layout affiche la connexion à la place de la page, et les loaders enfants sautent les requêtes admin (`viewerRole`). Chez nous (mot de passe en mémoire, Zustand), on peut garder ce même patron : `/collegue/*` affiche le formulaire de mot de passe tant que `useColleague(s => s.password)` est vide, puis la page demandée **sans changer d'URL** (le retour sur l'état demandé est gratuit, ce qui répond au point d'attention 3 de `09`).

**TanStack Start (mode SPA)** : l'API des routes (`createFileRoute`, `validateSearch`, `loaderDeps`, `loader`, `pendingComponent`, `getRouteApi`) est identique. Les fichiers de routes se transposent presque tels quels ; seuls `__root.tsx` (shell Start : `head`, `shellComponent`) et `router.tsx` (`getRouter()` exporté) changent. `main.tsx` disparaît au profit du point d'entrée Start.

### 2.6 Impression

`print/print-provider.tsx` + `print-sheet.tsx` + `print-table.tsx` : **impression dans la même page**, sans `window.open`.

```tsx
useEffect(() => {
  if (job === undefined) return;
  const previousTitle = document.title;
  document.title = printTitle(job.job);   // nom du PDF proposé
  window.print();
  document.title = previousTitle;
}, [job]);
// rendu : <div className="print:hidden">{children}</div><PrintSheet job={job?.job} />
```

- Une tâche typée `PrintJob` (`r1-day`, `r2-day`, `r1-tomorrow`, `r2-tomorrow`) passée par un contexte (`usePrint()`).
- Avantages pour nous : aucun bloqueur de fenêtres, **pas de perte de session** (le mot de passe reste en mémoire), et les vrais jetons CSS (plus besoin de `PRINT_TOKENS`). C'est l'option recommandée par notre `07` §9.
- **À écarter côté contenu** : la mise en page est celle de l'ancien original (Arial, tableaux simples). Il faut refaire notre gabarit (A4 paysage, bandeau tricolore, logo, `dl` d'infos, regroupement R2 par client, N° de table, chef de rang, signature, `@page`, `07` §2-7).
- **Améliorations possibles** : passer par une route `/collegue/impression/$restaurant/$date` qui appelle `window.print()` au montage (aperçu à l'écran, lien) ; ou garder le fournisseur et supprimer le `useEffect` en appelant `flushSync(() => setJob(job)); window.print()` directement dans le gestionnaire de clic, ce qui donne zéro `useEffect`.

### 2.7 Mode collègue

Ce qui reste valable avec un mot de passe partagé et Zustand :

- **Écrans** : fiche du jour collègue R1 (`r1-admin-card.tsx` : liste, Réserver, Modifier ce jour, Imprimer, Supprimer ce jour, formulaire « Ouvrir ce jour » dans la carte si le jour est fermé) ; fiche R2 (`r2-admin-card.tsx` + `item-row.tsx` : plats avec Modifier/Supprimer, réservations par plat, « + Ajouter un plat à ce jour ») ; `tomorrow-summary.tsx` (fusion des panneaux « Demain » et « Résumé pour demain ») ; `settings-panel.tsx`.
- **Ligne de réservation** `booking-row.tsx` : nom en gras, détails séparés par « — », observation en italique, bouton « Suppr. ». Elle reçoit une **référence de fonction Convex** (`deleteBooking: FunctionReference`) → à remplacer par `onDelete` ou par un `restaurant: "r1" | "r2"`. Il manque les boutons « Modifier » (`06` §7).
- **Inactivité** : `hooks/use-inactivity-sign-out.ts` (horodatage + `setInterval` de 15 s, mêmes événements que l'original). Avec Zustand, on peut **sortir du `useEffect`** : abonner une seule fois au niveau du module (`useColleague.subscribe(s => s.password, …)`) ou armer le minuteur dans l'action `login()` du store, comme le fait l'original (`06` §1.6).
- **Onglets** `tabs.tsx` : `Link` avec `data-[status=active]`, qui gardent `jour`/`vue` en changeant de restaurant.

À remplacer : `colleague-area.tsx` (`useConvexAuth`, `useAuthActions`, `useMe`), `sign-in-form.tsx`, `access-denied.tsx`, `members-page.tsx`, la route `collegue.acces.tsx`, l'affichage de l'e-mail dans l'en-tête.

### 2.8 Résumé du lendemain, bandeaux, chargement et erreur

- `admin/tomorrow-summary.tsx` : totaux (couverts, portions) + section R1 (« Ouvert par », « Réservés : n / cap couverts — € », « Clients : … ») + section R2 (par plat avec noms, total, « hors plats sans prix ») + boutons 🖨️. Structure **réutilisable** ; à corriger : pluriels, tickets (comptés par portion dans l'original, voir `07` points d'attention 1), icônes SVG à la place des émojis.
- Bandeau « nouvelle version » : `UpdateBanner` de `@convex-dev/static-hosting` → à remplacer (GitHub Pages : rien d'équivalent ; facultatif).
- **Absents** : bandeau « Configuration manquante », encadré d'échec de chargement avec « Réessayer » et « hors ligne » (`09` G-03), données affichées depuis la copie locale (`G-02`), voile de chargement des écritures.
- Chargement : `pendingComponent` en squelette par route, `pendingMs` 1 s par défaut, `pendingMinMs` 0,5 s, chargement initial plein écran. **Bon modèle**, compatible avec un `staleTime` long et un `placeholderData` venu de la copie locale.
- Erreurs : `defaultErrorComponent: ErrorPage` (message + « Recharger »).

### 2.9 Configuration et conventions

| Fichier | Contenu | Pour nous |
| --- | --- | --- |
| `.oxlintrc.json` | plugins `typescript, react, jsx-a11y, import, unicorn` ; `options.typeAware: true, typeCheck: true` ; catégories `correctness` et `suspicious` en erreur ; ~70 règles (`consistent-type-imports`, `no-non-null-assertion`, `no-explicit-any`, `unicorn/filename-case: kebabCase`, `no-array-for-each`, `no-array-reduce`, `prefer-at`…) ; surcharge `convex/**` | **À reprendre presque tel quel** (retirer la surcharge `convex/**` et l'exception `_id/_creationTime` de `no-underscore-dangle`). Ajouter `react/no-effect…` si la règle existe, pour viser zéro `useEffect`. |
| `.oxfmtrc.json` | `printWidth: 80`, `sortPackageJson: false`, ignore les fichiers générés | Tel quel. |
| `tsconfig.json` | `extends: [@tsconfig/vite-react, @tsconfig/strictest]`, `lib` explicite, `types: ["vite/client"]`, alias `@/*`, **`exactOptionalPropertyTypes: false`** (assoupli : incompatible avec des bibliothèques ou des props optionnelles) | Tel quel (TS 7 / tsgo). |
| `vite.config.ts` | `resolve: { tsconfigPaths: true }` (option native de Vite 8), `tanstackRouter()` avant `react()`, `tailwindcss()` | Remplacer par le plugin Start (`tanstackStart({ spa: { enabled: true } })`), retirer Tailwind, ajouter `base: "/<repo>/"` pour GitHub Pages. |
| `vitest.config.ts` | `environment: "edge-runtime"` (pour Convex) | Prendre `jsdom` ou `happy-dom` pour nos composants, `node` pour `lib/`. |
| `package.json` | scripts `typecheck` (`tsc --noEmit`), `lint` (`oxlint && oxfmt --check`), `fix`, `knip`, `check` (enchaîne les quatre), `test` ; `knip` configuré dans `package.json` | **Tel quel** (sans `dev:backend`, `deploy`). |
| `pnpm-workspace.yaml` | `trustPolicy: no-downgrade` + exception `semver@6.3.1`, `strictDepBuilds`, `allowBuilds: { esbuild: false }`, `strictPeerDependencies: true`, `peerDependencyRules.allowedVersions: { vite: "8", typescript: "7" }`, `minimumReleaseAgeExclude` | **Très utile** : les règles de pairs pour Vite 8 et TS 7 seront nécessaires avec Start aussi. |
| `.npmrc` | `save-exact=true` | Tel quel. |
| `.editorconfig`, `.gitattributes` | LF, UTF-8, 2 espaces ; `*.png binary` | Tel quel. |
| `.github/workflows/check.yaml` | actions épinglées par SHA (`actions/checkout@3d3c42e… # v7.0.1`, `pnpm/setup@e0ed22a… # v3.0.0`), `persist-credentials: false`, `permissions: contents: read`, `concurrency` (annule les PR obsolètes), `pnpm check`, `pnpm build`, `git diff --exit-code src/routeTree.gen.ts` | **Tel quel** + un job de déploiement GitHub Pages (`actions/upload-pages-artifact`, `deploy-pages`). |
| `CLAUDE.md` | règles : anglais pour le code, **français pour tous les textes visibles, avec la formulation d'origine** ; `pnpm check` obligatoire ; commentaires = contraintes, jamais d'historique ; navigation par `<Link>`, `navigate` impératif seulement dans le `onSuccess` passé à `mutate` ; routes fines ; pas de props `on…` pour la navigation ; `useState` seulement pour l'éphémère ; formulaires TanStack Form avec erreurs en ligne, toasts seulement pour les résultats de mutation | **À reprendre largement** (retirer la partie Convex). |

---

## 3. Points de couplage avec Convex à remplacer

| # | Point | Fichiers | Remplacement chez nous |
| --- | --- | --- | --- |
| 1 | Client et cache | `src/lib/query-client.ts` (`ConvexReactClient`, `ConvexQueryClient`, `queryKeyHashFn`/`queryFn` Convex, `connect`) | `QueryClient` simple ; `MutationCache.onError` → toast **gardé**. |
| 2 | Catalogue des requêtes | `src/lib/queries.ts` (`convexQuery(api.x.y, args)`) | `queryOptions` : `publicState` (GET `?since=etag`, `refetchInterval: 180_000`, `refetchIntervalInBackground: false`, `placeholderData` = copie locale), `adminState(password)` (`getAdminState`). **Une seule** requête d'état : jours, plats et calendriers en sont dérivés par `select`. |
| 3 | Granularité des lectures | `calendarDays(from,to)`, `day(date)`, `adminDay(date)`, `me`, `settings` | Notre API renvoie **tout l'état** d'un coup. Écrire des sélecteurs purs `selectCalendar(state, from, to)`, `selectDay(state, date)`, `selectAdminDay(state, date)`, `selectSettings(state)` qui produisent **les mêmes formes** que les types de la tentative (`R1Day {date, capacity, booked, menu?, theme?}`, `R2Day {date, note?, theme?, items[{id, name, stock, booked, price?, ticket}]}`, `R1AdminDay` avec `bookings`). Les composants se reprennent alors presque sans changement. Les hooks `useCalendarDays`, `useDay`, `useAdminDay`, `useSettings` deviennent `useSuspenseQuery({...publicState, select})`. |
| 4 | Types | `src/lib/types.ts` (`FunctionReturnType<typeof api…>`, `Doc<"r1Bookings">`, `Id<…>`) | Types écrits à la main à partir de `docs/spec/01-modele-de-donnees.md` (clés capitalisées `Date`, `Capacite`, `Qte`, `ItemID`, `Prix` (nombre ou `''`), `Mode`…) + types normalisés. Attention : nombres parfois reçus en chaînes, et `_id` → `ID`. |
| 5 | Erreurs | `src/lib/errors.ts` (`instanceof ConvexError`, `error.data`) | `ApiError` levé par le client quand la réponse vaut `{error}` ; message brut sinon, ou « Erreur ». Interception centrale de « Mot de passe incorrect. » en mode collègue (`06` §1.7). |
| 6 | Mutations | `useMutation({ mutationFn: useConvexMutation(api.r1.book) })` dans `r1/booking-form.tsx`, `r2/booking-form.tsx`, `r1/open-day-form.tsx`, `r1/edit-day-form.tsx`, `r2/open-day-form.tsx`, `r2/item-form.tsx`, `r2/item-row.tsx`, `r1/r1-admin-card.tsx`, `r2/r2-admin-card.tsx`, `booking-row.tsx`, `admin/settings-panel.tsx`, `admin/members-page.tsx` | `mutationFn: (vars) => apiPost("addBookingR1", {...})`. **Chaque réponse est l'état complet** → `onSuccess: (state) => queryClient.setQueryData(publicState.queryKey, state)` (ou l'état admin), sans invalidation ni attente. Exception : `addBookingR1/R2Multi` en mode collègue renvoie l'état public → relire `getAdminState`. |
| 7 | Arguments par id | `dayId`, `itemId`, `bookingId` (ids Convex) | Chez nous, les jours se désignent par **date** (`deleteDayR1 {password, date}`, `editDayR1 {password, date, …}`, `addItemR2 {password, date, …}`), plats et réservations par `ID`/`itemId`/`id`. Ajouter `password` à toutes les écritures collègue (depuis Zustand). |
| 8 | Résultats des réservations | `emailQueued`, `totalPrice`, `hasPriceGap`, rejet tout-ou-rien (« Il ne reste que N portion(s) de « X ». ») | `_emailStatus {sent, reason}`, `_bookingResult {confirmed, adjusted, skipped}`, `_duplicate` ; R2 **ajuste** au lieu de rejeter. Le contrôle client `atMost(left)` de la tentative réduit le cas, sans le supprimer. |
| 9 | Temps réel | « no polling, no manual refresh; rely on Convex reactivity » (`CLAUDE.md`) ; texte « Les places se mettent à jour automatiquement. » | Actualisation toutes les 3 minutes (`refetchInterval`) avec les **conditions de suspension** de l'original (onglet caché, saisie en cours, formulaire public ouvert, bouton occupé : `03`). Avec TanStack Query, on peut **ne pas suspendre** : les formulaires gardent leurs valeurs (TanStack Form + l'astuce `isBlurred`). Texte du pied de page d'origine à remettre. |
| 10 | Authentification | `main.tsx` (`ConvexAuthProvider`, `replaceURL`), `admin/colleague-area.tsx` (`useConvexAuth`, `useAuthActions().signOut`), `sign-in-form.tsx` (`signIn("email", {email, redirectTo})`), `hooks/use-inactivity-sign-out.ts`, `layout.tsx` (`useMe` pour l'inactivité), `lib/loaders.ts` (`viewerRole` via `queries.me()`), `hooks/use-admin.ts` (`useMe`), `tabs.tsx` (`me.isSuperadmin`), routes `collegue.*` (`viewerRole`) | Store Zustand `{ password: string \| null, login(pw), logout(reason) }`, **en mémoire seulement** (pas de `persist`) ; `login` = `getAdminState` ; loaders : `useColleague.getState().password` au lieu de `viewerRole`. |
| 11 | Hébergement | `@convex-dev/static-hosting` (`UpdateBanner`, `deploy`), `convex/http.ts` | GitHub Pages : `base`, repli SPA (`404.html` = shell Start), URL Apps Script dans `VITE_APPS_SCRIPT_URL`. |
| 12 | Variables d'environnement | `VITE_CONVEX_URL` (`vite-env.d.ts`) | `VITE_APPS_SCRIPT_URL` (et bandeau si absente ou si elle contient `COLLE_ICI`). |
| 13 | Données dénormalisées | `booked` maintenu par le serveur | Calculé côté client (sommes de `Qte`), mémoïsé dans le `select` (structural sharing de TanStack Query). |
| 14 | Contrôles serveur absents chez nous | `checkNotPast`, `cleanText` (longueurs), nom/classe non vides, « Un jour est déjà ouvert à cette date. » | `Code.gs` ne fait rien de cela (`addBookingR1` l. 557-579 ; `addDayR1` écrase). Ces règles deviennent **client uniquement** (validators). Garder, côté client, l'avertissement « déjà ouvert » de l'original. |

---

## 4. `docs/original-app-spec.md` (OAS) comparé à notre spec (`docs/spec/`)

Rappel : OAS décrit l'**ancienne** version de l'original. Vérification faite dans le code vanilla actuel.

### 4.1 Divergences factuelles

| # | Sujet | OAS | Notre spec | Code actuel | Qui a raison aujourd'hui |
| --- | --- | --- | --- | --- | --- |
| 1 | `Code.gs` | « The Code.gs in the repo is stale » ; n'implémente pas `getAdminState`, `addBookingR2Multi`, `editBooking*` | `Code.gs` est le contrat | `Code.gs` l. 70-91 : `getAdminState`, `editBookingR1/R2`, `addBookingR2Multi`, `requestId` présents | **Notre spec** (fichier à jour et versionné) |
| 2 | Mot de passe | codé en dur `ResaRestos2026` | propriété de script `ADMIN_PASSWORD` | `Code.gs` l. 15, l. 318 (`PropertiesService…getProperty('ADMIN_PASSWORD')`) | **Notre spec** |
| 3 | Noms par défaut (client) | `Restaurant 1` / `Restaurant 2` | `Restaurant Pédagogique` / `Aristide` (client) ; `Restaurant 1/2` (serveur) | `js/donnees.js` l. 10 | **Notre spec** (le serveur garde `Restaurant 1/2`, comme le `DEFAULT_SETTINGS` de la tentative) |
| 4 | Seuil « bientôt complet » | `rem <= max(2, round(cap*0.2))` | `rem < cap * 0.5` | `js/donnees.js` l. 318 | **Notre spec**. `src/lib/capacity.ts` est donc faux pour nous. |
| 5 | Couleurs des pastilles | sage `#8FA06B` / gold `#C9A227` / brick `#B5533C` | vert / orange / rouge de `design-system.css` | `design-system.css` | **Notre spec** |
| 6 | Charte | fond sombre `#2B2622`, Fraunces + Work Sans, R1 beige, R2 pêche | Outfit + Work Sans, `--ab-green #A9C23F`, `--ab-blue #1F4E9E`, `--ab-magenta #A3237F`, R1 vert, R2 magenta, bandeau tricolore | `design-system.css`, `index.html` | **Notre spec**. `src/index.css` est entièrement à jeter. |
| 7 | Contact (public) | « Téléphone ou email (si tu veux une confirmation) », marqué facultatif mais exigé | « Adresse email », obligatoire + format, aide « Pour vous envoyer la confirmation. » | `js/outils.js` `contactFieldHtml`, `emailError` | **Notre spec**. La tentative rend le contact facultatif (« contact is truly optional ») : **à ne pas reprendre** pour le public. Ajout collègue : facultatif chez nous aussi. |
| 8 | Registre | « tu » (« Choisis tes plats », « si tu veux ») | « vous » (« Indiquez vos nom et prénom. », « Choisissez vos plats et quantités ») | `js/reservation.js` | **Notre spec**. Tous les textes de la tentative en « tu » sont à reprendre. |
| 9 | Validation | toasts globaux « Merci de remplir tous les champs… » | erreurs sous les champs, `aria-invalid`, focus sur le premier champ en erreur | `js/outils.js` `checkFields` | **Notre spec** (la tentative fait déjà des erreurs en ligne, mais avec les anciens textes) |
| 10 | Succès d'une réservation | toast « Réservation confirmée ! » (+ total pour R2), formulaire fermé | toast « Réservation confirmée. » + **récapitulatif** « Réservation enregistrée » (lignes, total, contact d'annulation, « Fermer ») | `js/interface.js` `confirmationHtml` | **Notre spec** (récapitulatif absent de la tentative) |
| 11 | Ajustement R2 | toasts « Réservation partielle… », priorités | avertissement dans le récapitulatif « Certaines quantités ont été ajustées faute de stock… » | `js/reservation.js` | **Notre spec** |
| 12 | Tickets restaurant | absents | suffixe ` (ticket restaurant)`, sur place obligatoire, un ticket par commande, « prix d'un ticket restaurant » | `js/donnees.js` l. 210-236, `js/reservation.js` l. 46-51 | **Notre spec** |
| 13 | Heure limite | « Today is bookable and there is no cutoff time » | R2 fermé à 10 h le jour même (message « Commandes en ligne clôturées à 10h… ») ; R1 sans limite | `js/donnees.js` l. 309-315 | **Notre spec** |
| 14 | Connexion | champ mot de passe dans l'en-tête, bouton « Mode collègue », Entrée sans effet, « Revenir en mode client » | sélecteur segmenté « Client / Collègue », panneau dépliant, « Valider », Entrée et Échap, œil SVG | `js/collegue.js` `renderModeBox` | **Notre spec** (`06` §12.18 confirme que « Revenir en mode client » n'existe plus) |
| 15 | Confirmation de suppression | `confirm()` natif | deux clics, « Confirmer ? » pendant 4 s | `js/outils.js` `confirmClick` | **Notre spec** |
| 16 | Modifier une réservation | code mort | branchée (C-11, C-24) | `js/collegue.js` | **Notre spec** |
| 17 | Réservation par un collègue | « Admins cannot make bookings » | « + Ajouter une personne » (e-mail facultatif, pas de cut-off, R2 un seul plat) | `js/collegue.js`, `06` §8 | **Notre spec** |
| 18 | `addDayR2` sur une date déjà ouverte | recrée les plats avec de nouveaux UUID, réservations orphelines | met à jour le jour et **n'ajoute que les plats d'un nom nouveau** | `Code.gs` l. 605-619 | **Notre spec** |
| 19 | « Demain » du résumé | `toISOString()` (bug UTC) | `addDaysISO(todayISO(), 1)` (local) | `js/impression.js` l. 247 | **Notre spec** (bug corrigé) |
| 20 | Impression | `window.open` + `document.write`, Arial, tableaux simples, `print()` après 300 ms, émoji 🖨️ | A4 paysage, jetons recopiés, logo, signature, regroupement R2 par client, attente de `document.fonts.ready` (2 s au plus), toast si fenêtre bloquée, icône SVG | `js/impression.js` | **Notre spec** |
| 21 | Paramètres | champs vides ignorés, jusqu'à 8 appels | seuls les champs **modifiés** et non vides ; « Aucune modification à enregistrer. » ; « Paramètre enregistré. » au singulier | `js/collegue.js` `saveSettings` | **Notre spec** |
| 22 | Chargement | voile « Chargement... » à chaque GET, y compris l'actualisation | squelettes au premier chargement, actualisation silencieuse, voile après 350 ms seulement pour les écritures sans bouton occupé ; copie locale, etag, lecture doublée | `js/donnees.js`, `03` | **Notre spec** |
| 23 | Conditions de l'actualisation | formulaire public ouvert ou `<input>` focalisé | + onglet caché, `select`/`textarea`, bouton occupé, voile, sélecteur de date | `js/main.js`, `06` §1.8 | **Notre spec** |
| 24 | « Ouvrir un jour » | `<input type="date">`, « Ton nom (collègue qui ouvre ce jour) », placeholders `ex: M. Dupont` / `ex: Mme Martin` | sélecteur de date maison, « Votre nom (collègue qui ouvre ce jour) », `Ex. M. Dupont` / `Ex. Cyrille Ungerer`, case ticket, panneau repliable | `js/collegue.js` l. 256, 301 | **Notre spec** |
| 25 | Format des montants | `toFixed(2).replace('.', ',') + ' €'` (espace normale) | espace insécable U+00A0 | `js/outils.js` `formatEuro` | **Notre spec** (la tentative a l'espace normale) |
| 26 | Pluriels | « couvert(s) », « portion(s) » | `plural()` (0 et 1 au singulier) à l'écran ; « (s) » reste dans les messages serveur et les e-mails | `js/outils.js` | **Notre spec** |
| 27 | Formulaire R1 | légende « Nombre de personnes par statut (max {rem} au total) », « Élève(s) — 4,95 € », total `{n} couvert(s) — Total : …`, initial `Total : 0,00 €` | « Nombre de personnes ({rem} au maximum) », « Élèves · 4,95 € », « Personnels », « Extérieurs », `{plural} · Total : …` | `js/reservation.js` l. 240-260 | **Notre spec** |
| 28 | Formulaire R2 | « ({n} dispo) », « Réserver pour ce jour » | « {n} disponible(s) », bouton « Réserver », liste repliée pendant la commande | `js/reservation.js`, `js/calendrier.js` | **Notre spec** |
| 29 | Calendrier | flèches `←`/`→`, aucune navigation clavier | `‹`/`›`, roving tabindex, flèches, Début/Fin, PageUp/PageDown, `aria-pressed`, `aria-current="date"` | `js/calendrier.js` | **Notre spec** |
| 30 | En-tête | titre + sous-titre | + logo + « Lycée professionnel Aristide Briand » | `index.html` | **Notre spec** |
| 31 | `escapeHtml` | n'échappe pas les guillemets (injection d'attribut) | échappe `& < > " '` | `js/outils.js` | **Notre spec** (bug corrigé ; sans objet en React) |
| 32 | Panneau « Demain » | « couvert(s) réservé(s) » | accordé (« 0 couvert réservé », « 2 couverts réservés ») | `js/collegue.js` `renderDashboard` | **Notre spec** |
| 33 | Textes du voile | `Chargement...` (trois points) | `Chargement…` (points de suspension) | `index.html` | **Notre spec** |

### 4.2 Points sur lesquels les deux specs concordent (donc fiables)

Polling de 3 minutes et texte du pied de page ; inactivité de 10 minutes (mêmes événements) ; rappels à 18 h ; semaine du lundi, 42 cases en vue mois ; « Aucune réservation possible ce jour-là. » ; objets des e-mails (`Confirmation de réservation - {name} - {date}`, `Rappel : réservation demain - {name}`), corps des rappels ; `addDayR1` sur une date existante écrase sans contrôle ; prix 0 = « sans prix » (`price || ''`) ; minuteurs de toast non annulés ; R2 sans « Modifier ce jour » ; tarifs par défaut 4,95 / 6,10 / 9,90 € ; `contactAnnulation` par défaut `l'établissement` ; `Content-Type: text/plain;charset=utf-8` pour éviter le preflight CORS.

### 4.3 Ce que OAS couvre et que notre spec ne couvre pas

- **Presque rien de fonctionnel** : notre spec est plus complète sur tous les points communs.
- Utile malgré tout : la **liste des bugs historiques** (OAS §8) comme liste de non-régression : guillemets non échappés, `id` de datalist en double, `colspan` faux dans l'impression R2, toast qui masque le précédent.
- La notion d'**import des données de l'ancienne feuille** (`convex/importLegacy.ts`) : sans objet chez nous, puisque le backend et la feuille sont conservés.
- La liste des **améliorations volontaires** de la tentative (`docs/architecture.md` l. 379-387) : bonne base de discussion pour notre propre liste d'écarts assumés.

### 4.4 Ce que notre spec couvre et que OAS ne couvre pas

Tickets restaurant ; cut-off 10 h ; `requestId` et `_duplicate` ; cache local (`reservations-cache-v1`, 14 jours), `reservations-textes`, etag et `?since=`, lecture doublée après 6 s, deux tentatives ; `getAdminState` et l'état public sans données personnelles ; mot de passe changé côté script (`adminSessionExpired`) ; récapitulatif de réservation ; modification des réservations et ajout manuel ; sélecteur de date de « Ouvrir un jour » ; suppression en deux clics ; e-mails d'annulation ; archivage après 60 jours ; mémoire `CacheService` ; détail ARIA et clavier ; animations et `prefers-reduced-motion` ; design system complet (`08`) ; gabarit d'impression détaillé (`07`) ; easter egg du logo ; inventaire des écrans et schéma d'URL proposé (`09`).

---

## 5. Écarts d'UX introduits par la tentative

| Écart | Description | Compatible avec Apps Script inchangé ? | Avis |
| --- | --- | --- | --- |
| Espace collègue sous `/collegue` | Zone séparée, en-tête propre, onglets par restaurant (`/collegue/table`, `/collegue/plats`), « Demain », « Paramètres » | Oui | **Bonne idée.** Elle règle le problème des deux calendriers dans l'URL côté collègue et allège la page publique. À valider avec les utilisateurs, car c'est un vrai changement d'ergonomie (l'original montre tout sur une seule page). |
| Un seul calendrier public pour les deux restaurants | `/` : un calendrier à deux pastilles + cartes R1 et R2 du jour choisi + légende | Oui | **Bonne idée**, qui simplifie l'URL (`jour`, `vue`, `periode`). C'est un changement visible (aujourd'hui, deux colonnes et deux calendriers indépendants). À trancher : c'est la « migration par restaurant » évoquée en `09` §8.1, version mutualisée. |
| Lien « Prochaine ouverture : … » | Pour un restaurant fermé ce jour-là, lien vers le prochain jour ouvert (62 jours) | Oui (dérivé de l'état complet, qui contient tous les jours non archivés) | **Bonne idée**, peu coûteuse. |
| « Complet. » affiché | Texte en plus de la pastille | Oui | **Bonne idée** : corrige `04` points d'attention 12. |
| Contrôle client des maximums | R1 : total ≤ restant ; R2 : quantité ≤ restant par plat ; « + » borné | Oui | **Bonne idée** (`04` points d'attention 1-2). Le serveur reste l'arbitre (ajustement R2). |
| Formulaire « Ouvrir ce jour » dans la carte du jour fermé | Plus de panneau « Ouvrir un jour » ni de sélecteur de date ; le calendrier sert de sélecteur | Oui (`addDayR1/R2` prennent `date`) | **Bonne idée**, qui supprime `C-05`. Il faut garder le champ « Votre nom » (le serveur ne connaît pas l'identité) et interdire les dates passées côté client. |
| Panneaux « Demain » et « Résumé pour demain » fusionnés | Une page `/collegue/demain` | Oui | **Bonne idée** (`07` points d'attention 5). |
| Formulaires dans l'URL (`formulaire=…`, `plat=…`) | Ouvrir ou fermer un formulaire = un lien ; « Annuler » = lien sans le paramètre | Oui | **Bonne idée**, alignée sur « état maximal dans l'URL ». Ne jamais y mettre de données saisies (`09` §8.5). |
| Anciennes URL `/table`, `/plats` | Redirections | Sans objet (l'original n'a pas de routes) | À écarter. |
| Connexion par lien e-mail, rôles, page « Accès » | Convex Auth, Resend, table `members` | **Non** | **À écarter**. Remplacer par le mot de passe partagé (`getAdminState`) + Zustand en mémoire. |
| Retour sur la page demandée après connexion | `redirectTo` = URL courante | Oui, autrement | **À garder dans l'esprit** : `/collegue/...` affiche le formulaire de mot de passe à la place de la page, puis la page sans navigation. |
| Session persistante (Convex Auth) | Reste connecté au rechargement | Possible (sessionStorage) mais change la sécurité | **À écarter par défaut** (`06` §11 : mémoire seulement, sauf décision explicite). |
| Contact facultatif côté public | « contact is truly optional » | — | **À écarter** : l'original actuel exige l'e-mail. |
| R2 tout-ou-rien | Rejet si un plat dépasse le stock | **Non** (le serveur ajuste) | **À écarter** côté serveur ; le contrôle client en atténue les effets. |
| Dialogue de confirmation (AlertDialog) | Modale « Supprimer ce jour… ? » | Oui | **À arbitrer** : l'original confirme en deux clics, sans modale. Garder le deux-clics par fidélité, ou accepter la modale (plus claire, plus accessible). |
| `CountField` (− champ +) | Boutons 44 px | Oui | **Bonne idée** pour le mobile (charte : 48 px minimum). |
| Toasts limités à un seul | Le nouveau remplace l'ancien | Oui | **Bonne idée** (corrige un bug connu). |
| Impression dans la page | Pas de nouvelle fenêtre | Oui | **Bonne idée** (pas de bloqueur, pas de perte de session). |
| Le collègue peut réserver comme le public | « Réserver » dans la fiche collègue | Oui (même action, sans mot de passe) | Chez nous, cela existe déjà sous la forme « + Ajouter une personne », avec des règles propres (e-mail facultatif, R2 un seul plat, pas de cut-off). **Reprendre nos règles**, pas les siennes. |
| Pas de polling (temps réel Convex) | — | **Non** | **À écarter** : polling de 3 min + mise à jour du cache par les réponses d'écriture. |
| Paramètre « periode » distinct de « jour » | Navigation de période sans changer la sélection | Oui | **Bonne idée** (fidèle à l'original : « la sélection ne change pas en naviguant »). |

---

## 6. Verdict

### 6.1 Module par module

| Module | Verdict | Effort d'adaptation | Gain vs zéro |
| --- | --- | --- | --- |
| `src/lib/validators.ts` + test | **Reprendre tel quel** | nul (messages en paramètre) | élevé (petit mais exact, testé) |
| `src/lib/money.ts` (`parseAmount`, `parseCount`, `stepCount`) + test | **Reprendre** ; `formatEuro` → NBSP | minime | moyen |
| `src/lib/dates.ts` + test | **Reprendre tel quel** | nul | moyen à élevé (`formatWeekLabel`, `addMonths` sans débordement) |
| `convex/model/dates.ts` (`parisDate`, `parisHour`, `isIsoDate`) + tests | **Reprendre** (déplacer dans `src/lib/paris.ts`) | nul | élevé pour le cut-off |
| `convex/model/pricing.ts` `r1Total` | **Reprendre** | nul | faible (une ligne) mais testé |
| `convex/model/pricing.ts` `r2Total`, `src/lib/totals.ts` | **Adapter** (tickets, prix 0, un ticket par commande, `ItemID`) | moyen | moyen |
| `src/lib/capacity.ts` | **Adapter** (seuil 0,5, libellés, sans classes Tailwind) | faible | faible |
| `src/lib/today.ts` + test | **Reprendre tel quel** ; le dupliquer pour 10 h | nul | élevé (zéro `useEffect`, minuit et cut-off réactifs) |
| `src/lib/calendar.ts` + test | **Adapter** (deux calendriers ou route par restaurant ; nos noms de paramètres) | moyen | **très élevé** (forme canonique, `changeCalendar`, 10 tests) |
| `src/lib/dishes.ts` + test | **Adapter** (ticket) | faible | moyen |
| `src/lib/strings.ts` | Tel quel | nul | faible |
| `src/lib/errors.ts`, `query-client.ts`, `queries.ts`, `types.ts`, `loaders.ts` | **Écarter le contenu, garder la forme** (MutationCache, catalogue `queries`, loaders `ensureQueryData`) | réécriture | moyen (patrons) |
| `src/components/form/fields.tsx` | **Adapter** : logique tel quel, CSS Modules à la place de Tailwind, `aria-busy`, aide (`Field.Description`) | moyen | **très élevé** (fond du sujet TanStack Form + Base UI, avec trois pièges déjà résolus) |
| `personal-fields.tsx`, `r1/day-fields.tsx`, `r2/dish-fields.tsx` | **Adapter** (textes, champ e-mail obligatoire, champ « Votre nom », case ticket) | faible à moyen | élevé |
| `r1/booking-form.tsx`, `r2/booking-form.tsx` | **Adapter** (textes, `requestId`, récapitulatif, tickets, cut-off, réponses `_bookingResult`/`_duplicate`, API) | moyen à fort | élevé (structure, totaux en direct, contrôle des maximums) |
| `r1/open-day-form.tsx`, `r2/open-day-form.tsx`, `r1/edit-day-form.tsx`, `r2/item-form.tsx` | **Adapter** | faible à moyen | élevé |
| `admin/settings-panel.tsx` | **Adapter** (appels `setConfigField` en série, vides ignorés, messages) | faible | élevé |
| `admin/tomorrow-summary.tsx` | **Adapter** (pluriels, tickets, SVG) | faible | moyen |
| `r1-admin-card.tsx`, `r2-admin-card.tsx`, `item-row.tsx`, `booking-row.tsx` | **Adapter** (+ modifier une réservation, + ajouter une personne, suppression en deux clics) | moyen | moyen à élevé |
| `r1-public-card.tsx`, `r2-public-card.tsx`, `day-card.tsx`, `site-page.tsx`, `header.tsx` | **Adapter** selon la décision « un calendrier ou deux » ; ajouter le cut-off, les tickets, le récapitulatif | moyen | moyen |
| `calendar.tsx` | **Adapter** (+ roving tabindex et clavier, + jauge, + libellés de notre spec, CSS) | moyen | élevé (calendrier entièrement piloté par l'URL) |
| `ui/toast.tsx`, `lib/toast.ts` | **Reprendre** (+ type « neutre », CSS) | faible | élevé |
| `ui/button.tsx` (`ButtonLink`) | **Reprendre** (CSS) | faible | moyen |
| `ui/confirm-button.tsx` | **Écarter** au profit du deux-clics (ou garder si la modale est adoptée) | — | faible |
| `ui/panel.tsx`, `pill.tsx`, `spinner.tsx`, `skeletons.tsx`, `popup.ts` | **Réécrire** avec nos classes (`.panel`, jauge, `.sk`) | faible | faible |
| `print/*` | **Adapter** la mécanique (fournisseur ou route, `document.title`) ; **réécrire** les gabarits | moyen | moyen |
| `hooks/use-days.ts` (`useNextOpenDate`, `usePriceSuggestions`), `use-settings.ts`, `use-admin.ts` | **Adapter** (sélecteurs sur l'état complet) | faible | moyen |
| `hooks/use-inactivity-sign-out.ts` | **Adapter** (Zustand, sans `useEffect`) | faible | faible |
| `admin/colleague-area.tsx`, `tabs.tsx`, `layout.tsx` | **Adapter** (mot de passe, pas de `me`) | faible | moyen |
| `sign-in-form.tsx`, `access-denied.tsx`, `members-page.tsx`, `routes/collegue.acces.tsx`, `routes/table.tsx`, `routes/plats.tsx` | **Écarter** | — | — |
| `routes/*` (index, collegue.*) | **Adapter** (Start, nos paramètres, loaders sur l'état) | faible | élevé |
| `src/index.css` | **Écarter** (ancienne charte, Tailwind) | — | — |
| `convex/**` hors `model/dates.ts` et `model/pricing.ts` | **Écarter** (lecture seule pour comprendre) | — | — |
| `.oxlintrc.json`, `.oxfmtrc.json`, `tsconfig.json`, `.editorconfig`, `.npmrc`, `.gitattributes`, `pnpm-workspace.yaml`, `check.yaml`, scripts et `knip` du `package.json` | **Reprendre tel quel** (retirer Convex et Tailwind ; ajouter Start et le déploiement Pages) | faible | élevé (outillage TS 7 / Vite 8 / oxlint type-aware déjà réglé) |
| `CLAUDE.md` | **Adapter** (règles frontend tel quel, Convex en moins, Apps Script + Zustand en plus) | faible | élevé |
| `docs/architecture.md` | **S'en inspirer** pour notre propre document d'architecture | — | moyen |

**Estimation grossière** : l'outillage et la configuration sont acquis à environ 90 %. La couche de fonctions pures l'est à environ 60 % (il manque tickets, cut-off, pluriels, NBSP, seuil). L'architecture frontend (formulaires, URL, chargement, toasts, impression dans la page) l'est à environ 50-60 % en logique, mais tout le CSS est à refaire. Les écrans le sont à environ 30-40 % : les textes, la charte et les fonctionnalités récentes de l'original (récapitulatif, modification de réservation, ajout manuel, deux-clics, cache local) manquent. **Au total, reprendre ces modules plutôt que repartir de zéro économise de l'ordre de 35 à 45 % de l'effort frontend**, à condition d'écrire d'abord la couche d'adaptation état Apps Script → formes normalisées (§ 3, point 3), qui permet de garder les composants presque intacts.

### 6.2 Les 10 enseignements principaux

1. **Naviguer seulement par `<Link>`, et `navigate` seulement dans le `onSuccess` passé à `mutate`/`mutateAsync`, jamais dans `useMutation({ onSuccess })`**. Ce dernier s'exécute aussi après le démontage du composant : si l'utilisateur a changé d'onglet entre-temps, il est ramené sur la page du formulaire (`CLAUDE.md`, `docs/architecture.md` l. 225-241). Les toasts de succès, eux, vont dans `useMutation({ onSuccess })`, précisément parce qu'ils doivent survivre au démontage (par exemple après la suppression du jour affiché).
2. **TanStack Form : `canSubmitWhenInvalid: true`** partout, sinon un envoi s'arrête avant de valider les champs non touchés ; **`form.validate("change")` avant `handleSubmit()`**, sinon l'erreur croisée n'apparaît qu'au deuxième envoi (`form/fields.tsx` l. 286-302).
3. **Quitter un champ = `setMeta(isBlurred)`, pas `isTouched`**, pour que `useAppForm` continue de suivre les `defaultValues` venues du serveur tant que rien n'est modifié. C'est essentiel chez nous avec l'actualisation toutes les 3 minutes (`form/fields.tsx` l. 22-26 et 65-68).
4. **URL canonique** : `validateSearch` renvoie toutes les clés (`undefined` = supprimée), omet les valeurs par défaut (aujourd'hui, semaine), supprime `periode` si elle contient `jour`. Les liens actifs sont alors fiables (`aria-current`) et une URL nue ouvre toujours sur aujourd'hui. **Mais un formulaire ouvert garde `jour`**, pour ne pas changer de jour à minuit (`lib/calendar.ts` l. 169-209).
5. **Une seule horloge** (`lib/today.ts`) : `getToday()` dans les loaders, `useToday()` (`useSyncExternalStore`) dans les composants, et `router.invalidate()` à minuit. Les requêtes ne lisent jamais l'horloge, c'est le client qui passe `today`. Même principe à appliquer au cut-off de 10 h.
6. **`aria-current` du routeur** : un `Link` actif reçoit `aria-current="page"`, qui écrase `aria-current="date"`. Dans le calendrier, « aujourd'hui » passe donc dans le libellé (`calendar.tsx` l. 105-112). Utiliser `activeOptions={{ exact: true }}`.
7. **Piège iOS** : taille de police d'au moins 16 px dans les champs (sinon le zoom se déclenche, `form/fields.tsx` l. 41) ; `#root { isolation: isolate }` et `body { position: relative }` pour que les portails Base UI (dialogues, toasts) passent au-dessus de la page et couvrent tout le viewport (`index.css` l. 76-85).
8. **Pas de `<Suspense>` dans les composants** : chaque route déclare un `pendingComponent` (squelette à la forme de la page), et le routeur entoure la route d'une frontière Suspense. Tout passe par `useSuspenseQuery`, avec `ensureQueryData` dans les loaders et `defaultPreload: "intent"` (`docs/architecture.md` l. 349-374). Le premier chargement est en plein écran (`pendingMs: 0`).
9. **Toolchain TS 7 / Vite 8 / oxlint type-aware déjà réglée** : `peerDependencyRules` pour accepter Vite 8 et TS 7, `resolve.tsconfigPaths` natif de Vite 8, `exactOptionalPropertyTypes: false` malgré `strictest`, `oxlint-tsgolint` avec `typeAware` + `typeCheck`, `routeTree.gen.ts` commité et vérifié en CI, actions épinglées par SHA, `trustPolicy: no-downgrade`.
10. **Base de départ trompeuse** : la tentative a pris pour référence une version périmée de l'original. Résultat : charte, textes (« tu »), seuil de capacité, contact facultatif, absence des tickets et du cut-off, toasts au lieu du récapitulatif. **Pour nous, la règle de `CLAUDE.md` « every user-facing string in French, with the original app's wording » s'applique, mais en se référant à `docs/spec/` (version actuelle)**. Ne jamais copier un texte de la tentative sans le vérifier dans notre spec.

Choix motivés notables, d'après `CLAUDE.md` et `architecture.md` : valeurs de formulaire en chaînes analysées à l'envoi (accepte la virgule décimale) ; `useState` réservé à l'éphémère (2 occurrences dans tout `src/`) ; composants qui lisent leurs données par des hooks plutôt que par props, et jamais de prop `on…` pour la navigation ; une `useMutation` par composant émetteur ; impression dans la page avec `document.title` modifié pour nommer le PDF ; gestionnaire de toasts global appelable hors React ; « Annuler » = lien vers l'URL sans le formulaire ; recalcul des totaux côté serveur et copie du prix unitaire dans la réservation R2 (sans objet chez nous, `Code.gs` décide).
