<p align="center"><img src="logo.png" alt="Logo du lycée professionnel Aristide Briand" height="96"></p>

# 🍽️ Réservations — restaurants pédagogiques

Site de réservation des deux restaurants pédagogiques du lycée professionnel Aristide Briand :

- 🟢 **Restaurant 1** (couleur verte) : réservation de couverts sur un jour de service, avec une capacité et un menu.
- 🟣 **Restaurant 2** (couleur magenta) : réservation de plats en portions limitées, sur place ou à emporter. Les commandes en ligne ferment à 10 h le jour même : le menu et les stocks restent affichés, et le site invite à venir commander sur place à partir de 12 h (10 h : `R2_CUTOFF_HOUR` dans `src/domain/constants.ts` ; 12 h : texte du message `public.r2.cutoff` dans `src/intl/common-messages.ts`).

Le site est une application React, construite par Vite (TanStack Start en mode SPA) et publiée en fichiers statiques sur GitHub Pages : https://thegaudis.github.io/reservations-restaurants/. Les données sont stockées dans une feuille Google Sheets, lue et modifiée par un script Google Apps Script (`Code.gs`) qui sert d'API.

L'ancien site (HTML, CSS et JavaScript sans compilation) reste lisible au tag `v1-final`, posé sur son dernier commit avant la bascule (`git show v1-final:js/donnees.js`) ; sa spécification complète est dans [`docs/spec/`](docs/spec/README.md) et l'historique de la migration dans [`docs/migration/`](docs/migration/PLAN.md).

## ✨ Fonctionnalités

**👥 Pour le public**

- 📅 Calendrier des jours de service, accessible au clavier (flèches, Début / Fin, Page ↑ / ↓).
- 🔢 Places ou portions restantes affichées pour chaque jour et chaque plat.
- 🔐 Aucune donnée personnelle pour le public : la lecture publique ne contient que les jours, les plats et le nombre de places prises (un total par jour ou par plat). Noms, e-mails, téléphones et observations ne sont envoyés qu'au mode collègue.
- ⚡ Affichage immédiat : à la visite suivante, le calendrier de la dernière visite s'affiche aussitôt, le temps que les places se mettent à jour. On peut déjà ouvrir et remplir un formulaire : le script recompte les places au moment d'enregistrer et refuse ce qui n'est plus disponible. La copie gardée dans le navigateur ne contient aucune donnée personnelle (ni nom, ni e-mail, ni téléphone).
- 🚀 Chargement anticipé : un petit script placé dans la page lance la lecture des données avant le code de l'application, et la connexion à Google Apps Script est préparée (`preconnect`). Les polices (Outfit, Work Sans) sont servies par le site lui-même et ne bloquent pas l'affichage.
- ⏱️ Lecture doublée si Google tarde : Google met parfois plus de 10 secondes à démarrer le script ; si la lecture n'a pas répondu après 6 secondes, une seconde part en parallèle et la première réponse arrivée l'emporte (jamais pour une écriture). Au bout de 30 secondes sans réponse, la page abandonne et propose « Réessayer ».
- 🪶 Actualisation légère : la page envoie l'empreinte (`etag`) de ce qu'elle affiche ; si rien n'a changé, le script répond en quelques octets (`{ unchanged: true }`), à l'ouverture comme lors de l'actualisation toutes les 3 minutes.
- 🛡️ Anti-doublon : chaque réservation envoie un identifiant unique (`requestId`), conservé si l'on réessaie après une erreur ; le script ignore un envoi déjà enregistré (double clic, réponse perdue) et la page affiche « Cette réservation était déjà enregistrée ».
- 📝 Formulaire de réservation avec contrôle des champs et message d'erreur sous chaque champ ; le script revérifie les quantités (nombres entiers positifs) et les places restantes avant d'écrire.
- 📧 E-mail de confirmation, puis rappel la veille, si le contact saisi est une adresse e-mail (dates en toutes lettres, montants « 12,50 € »).
- 🔗 L'adresse de la page garde le jour choisi, la vue (semaine ou mois) et le formulaire ouvert : un rechargement ou un lien copié les retrouve.

**🧑‍🍳 Pour l'équipe (« mode collègue », protégé par mot de passe)**

- 🗓️ Ouverture et suppression des jours de service, modification de la capacité et du menu.
- 🥗 Gestion des plats du restaurant 2 (ajout, modification, stock, prix). Case « Ticket restaurant » : le plat n'a pas de prix en euros et s'affiche « prix d'un ticket restaurant ». Sans modifier le script, la mention est rangée à la fin du nom du plat dans la feuille (« Bowl (ticket restaurant) ») : les e-mails de confirmation et de rappel affichent donc ce nom, sans autre changement. Un jour où au moins un plat est au ticket restaurant, le client ne peut commander que sur place (« À emporter » n'est pas proposé) ; sa commande compte un seul ticket restaurant, quels que soient le nombre de plats au ticket et leurs portions (plus les plats payés en euros).
- 📋 Consultation, modification et suppression des réservations ; au restaurant 1, le détail élèves / personnels / extérieurs est modifiable et le prix est recalculé aux tarifs en vigueur.
- ➕ Ajout manuel d'une personne : « + Ajouter une personne » sous la fiche du jour (restaurant 1) ou sous chaque plat (restaurant 2). Les places restantes sont vérifiées comme pour le public, l'adresse e-mail est facultative et, si elle est indiquée, la confirmation y est envoyée. À Aristide, l'ajout reste possible après 10 h (commande prise sur place).
- 🖨️ Impression de la liste d'un jour, et du résumé du lendemain depuis le panneau « Demain », au format A4 paysage, dans la page elle-même (aucune fenêtre ne s'ouvre) ; la liste du jour se termine par une ligne « Nom du responsable » et « Signature », chaque intitulé suivi de son trait d'écriture.
- 📋 La liste du jour du restaurant 1 est un tableau quadrillé, une colonne par information (nom, classe ou service, élèves, personnels, extérieurs, couverts, prix, contact, observation du client), suivi de deux colonnes vides à remplir en salle : « N° table » et « Chef de rang ».
- ⚙️ Réglage du nom des restaurants et du contact d'annulation.
- 🔒 Déconnexion automatique après 10 minutes d'inactivité, dès que le mot de passe est changé dans le script, et à chaque rechargement de la page : le mot de passe et les noms ne restent qu'en mémoire, jamais dans le navigateur.

## 📁 Contenu du dépôt

| Fichier ou dossier                  | Rôle                                                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Code.gs`                           | API JSON Google Apps Script (`doGet` pour lire l'état, `doPost` pour les actions).                         |
| `src/`                              | Site React : routes, composants, styles, textes (`src/intl/`), faux script de test (`src/mocks/`).         |
| `translations/fr.json`              | Textes du site, extraits du code par `pnpm i18n:extract`.                                                  |
| `public/`                           | Fichiers copiés tels quels dans le build (`mockServiceWorker.js` du faux script, retiré du build final).   |
| `e2e/`                              | Tests Playwright de bout en bout, dont la suite de régression (`e2e/regression/`).                         |
| `scripts/`                          | Finition du build, émulateur GitHub Pages (`pnpm serve`), budget de poids.                                 |
| `.github/`                          | Intégration continue et déploiement (`workflows/ci.yml`), mises à jour des dépendances (`dependabot.yml`). |
| `package.json`, `*.config.ts`, `.*` | Dépendances, scripts et réglages des outils (Vite, Vitest, Playwright, TypeScript, oxlint, oxfmt, knip).   |
| `docs/spec/`                        | Spécification de l'ancien site : comportements et textes exacts, référence du site actuel.                 |
| `docs/migration/`                   | Plan de migration, matrice de parité, procédure de bascule (`bascule.md`) et journaux des sessions.        |
| `CLAUDE.md`                         | Règles du projet pour les agents de code.                                                                  |
| `charte-graphique.pdf`              | Charte graphique : couleurs, contrastes, composants et règles d'usage.                                     |
| `logo.png`                          | Logo du lycée, affiché dans ce README.                                                                     |
| `README.md`                         | Ce document.                                                                                               |

## 🚀 Installation

### 1. 🛠️ Préparer le script Google Apps Script

1. Créer une feuille Google Sheets vide.
2. Ouvrir **Extensions > Apps Script** et coller le contenu de `Code.gs`.
3. 🔑 Définir le mot de passe du mode collègue, **sans l'écrire dans `Code.gs`** (ce fichier est public) : **Paramètres du projet** (roue dentée) > **Propriétés du script** > **Ajouter une propriété**, nom `ADMIN_PASSWORD`, valeur = un mot de passe propre à l'établissement. Sans cette propriété, la connexion au mode collègue est refusée.
4. **Déployer > Nouveau déploiement**, type **Application Web** :
   - Exécuter en tant que : _moi_ ;
   - Accès : _tout le monde_.
5. Copier l'URL du déploiement (elle se termine par `/exec`).

Les onglets de la feuille (`Config`, `R1_Days`, `R1_Bookings`, `R2_Days`, `R2_Items`, `R2_Bookings`) et leurs colonnes manquantes sont créés automatiquement à la première écriture (premier jour ouvert, premier paramètre enregistré…).

⏰ Exécuter une fois la fonction `setupDailyTrigger` depuis l'éditeur Apps Script (et de nouveau après chaque mise à jour qui ajoute un déclencheur) : elle programme les rappels de la veille chaque jour à 18 h, l'archivage chaque nuit vers 3 h et le rafraîchissement de la mémoire de l'état toutes les 5 minutes (`rafraichirCache`, de 6 h à 21 h).

🔐 Lecture publique et mode collègue : `doGet` renvoie l'état public (jours, plats, paramètres, totaux de places prises, `etag`) ; `doGet?since=<etag>` renvoie `{ unchanged: true }` si rien n'a changé. L'action `getAdminState` (mot de passe obligatoire) renvoie l'état complet ; la page l'utilise à la connexion et pour les actualisations en mode collègue. Les actions du mode collègue renvoient l'état complet, les réservations du public l'état public.

🗄️ Archivage : chaque nuit, les jours de service passés depuis plus de 60 jours (constante `ARCHIVE_AFTER_DAYS`), avec leurs plats et leurs réservations, sont déplacés vers les onglets `Archive_R1_Days`, `Archive_R1_Bookings`, `Archive_R2_Days`, `Archive_R2_Items` et `Archive_R2_Bookings`. Rien n'est supprimé, mais ces jours n'apparaissent plus sur le site.

⚡ Mémoire de l'état : la réponse publique est gardée en mémoire (`CacheService`) pendant 6 heures, renouvelée aussitôt après chaque modification faite depuis le site et recalculée toutes les 5 minutes en journée : presque tous les visiteurs sont servis sans ouvrir la feuille, y compris le soir. Une modification faite **directement dans Google Sheets** apparaît en 5 minutes au plus en journée, mais seulement vers 6 h si elle est faite le soir ; exécuter la fonction `viderCache` pour qu'elle apparaisse tout de suite.

📨 E-mails après le verrou : les réservations s'enregistrent l'une après l'autre (verrou), mais les e-mails de confirmation et d'annulation ne partent qu'une fois le verrou libéré. Une réservation n'attend donc pas l'envoi de l'e-mail de la précédente, et la page sait toujours si l'e-mail est parti.

✍️ Texte saisi : le script l'enregistre précédé d'une apostrophe, pour que Google Sheets le garde tel quel (un numéro « 0612345678 » ne devient pas un nombre, une classe « 1/2 » ne devient pas une date).

🛡️ Anti-doublon : les actions `addBookingR1` et `addBookingR2Multi` reçoivent un champ `requestId`. Le script le mémorise 6 heures (`CacheService`) ; s'il le reçoit à nouveau, il renvoie l'état avec `_duplicate: true` sans rien ajouter ni renvoyer d'e-mail.

🔄 Mise à jour du script : après avoir collé la nouvelle version, utiliser **Déployer > Gérer les déploiements > Modifier (crayon) > Version : Nouvelle version**, pour garder la même URL `/exec`.

### 2. 🔌 Brancher le site sur le script

Le site lit l'adresse du script au moment du build, dans la variable `VITE_APPS_SCRIPT_URL`. Sur GitHub, c'est une variable de dépôt :

1. **Settings > Secrets and variables > Actions**, onglet **Variables**.
2. **New repository variable** (ou le crayon si elle existe) : nom `VITE_APPS_SCRIPT_URL`, valeur = l'URL `/exec` copiée à l'étape précédente.
3. Relancer le déploiement : onglet **Actions**, workflow **CI**, bouton **Run workflow**, branche `main`.

Sans cette variable, le job `deploy` refuse de publier ; un build local sans elle affiche le bandeau « Configuration manquante ».

### 3. 🌐 Héberger sur GitHub Pages

Réglages à faire une fois, par un administrateur du dépôt :

1. **Settings > Pages**, **Build and deployment**, **Source** : « GitHub Actions ».
2. **Settings > Environments > github-pages**, **Deployment branches and tags** : « Selected branches and tags », règle `main`. Une autre branche ne peut alors rien publier.

Ensuite, chaque push sur `main` lance le workflow `CI` : si les jobs `check`, `browser` et `e2e` passent, le job `deploy` publie le dossier `dist/client` construit par `e2e`. Aucune autre branche et aucune pull request ne déploie. GitHub Pages garde chaque fichier jusqu'à 10 minutes en cache : un visiteur peut voir l'ancienne version pendant ce délai.

Le site est publié sous `/reservations-restaurants/` (site de projet). Pour un domaine propre, ajouter un fichier `public/CNAME` qui contient le domaine et passer `BASE_PATH` à `/` dans `.github/workflows/ci.yml` (étape « Production build »).

Autre hébergement : `VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/…/exec BASE_PATH=/ pnpm build`, puis publier le contenu de `dist/client` (`index.html`, `404.html`, dossier `assets/`). Le serveur doit répondre par `404.html` à une adresse inconnue (lien direct vers `/collegue`) et servir les fichiers `.js` avec le type `text/javascript`. Ouverte d'un double-clic (`file://`), la page ne fonctionne pas.

## ↩️ Retour à l'ancien site

En cas de panne grave du nouveau site, deux façons de republier l'ancien. Comptez 5 minutes de manipulation et jusqu'à 10 minutes de cache de GitHub Pages. Les visiteurs gardent leur copie locale (même format pour les deux sites) ; le script et la feuille ne changent pas.

### Première façon : servir le tag `v1-final` depuis une branche (sans toucher à `main`)

GitHub Pages ne sert pas un tag : il faut une branche qui pointe dessus.

1. Créer la branche `rollback` depuis le tag. En ligne de commande :

   ```sh
   git fetch origin --tags
   git push origin "v1-final^{commit}:refs/heads/rollback"
   ```

   Ou sur GitHub : page d'accueil du dépôt, menu des branches, onglet **Tags**, `v1-final`, puis dans le même menu taper `rollback` et choisir **Create branch rollback from v1-final**.

2. **Settings > Environments > github-pages**, **Deployment branches and tags** : **Add deployment branch or tag rule**, `rollback`. Sans cette règle, l'environnement refuse le déploiement de la branche.
3. **Settings > Pages**, **Source** : « Deploy from a branch », branche `rollback`, dossier `/ (root)`, **Save**.
4. Onglet **Actions** : attendre la fin du workflow « pages build and deployment » (1 à 2 minutes).
5. Ouvrir https://thegaudis.github.io/reservations-restaurants/ dans une fenêtre de navigation privée : l'ancien site s'affiche (au plus 10 minutes plus tard pour les autres visiteurs).
6. Tant que dure le retour arrière, ne rien pousser sur `main` : le job `deploy` tenterait de republier le nouveau site.

Pour revenir au nouveau site : **Settings > Pages**, **Source** : « GitHub Actions », puis **Actions > CI > Run workflow** sur `main`. Retirer ensuite la règle `rollback` de l'environnement et supprimer la branche.

### Seconde façon : annuler la fusion sur `main`

1. Retrouver le commit de fusion de la bascule (`git log --merges --oneline main`, ou la pull request de bascule, bouton **Revert**).
2. En ligne de commande :

   ```sh
   git switch main
   git pull
   git revert -m 1 <commit de fusion>
   git push origin main
   ```

   Avec le bouton **Revert** de la pull request : GitHub ouvre une pull request d'annulation, à fusionner.

3. **Settings > Pages**, **Source** : « Deploy from a branch », branche `main`, dossier `/ (root)`, **Save**. L'annulation retire aussi `.github/workflows/ci.yml` : plus aucun job ne déploie.
4. Vérifier comme à l'étape 5 de la première façon.

Pour revenir au nouveau site : annuler l'annulation (`git revert <commit d'annulation>`), repasser la source en « GitHub Actions », puis **Actions > CI > Run workflow** sur `main`.

Avant la bascule, répétez une des deux façons à blanc sur une fourche du dépôt qui garde le nom `reservations-restaurants` (`docs/migration/bascule.md`, partie 2).

## 🧑‍💻 Développement

### Prérequis

- Node.js 22.18 ou plus récent ; la CI utilise la version de `.node-version` (22.22.2).
- pnpm 12.8.1 : `corepack enable` (la version est lue dans `package.json`), ou `npm install -g pnpm@12.8.1`.
- Chromium pour les tests navigateur et Playwright : `pnpm exec playwright install chromium`, une fois par poste.

### Installer

```sh
pnpm install
```

pnpm installe les versions exactes de `pnpm-lock.yaml` et branche les hooks git (lefthook) : avant chaque commit, oxlint et oxfmt corrigent les fichiers indexés ; avant chaque push, `pnpm check:fast` doit passer.

### Lancer le site en développement

```sh
pnpm dev
```

Le site s'ouvre sur http://localhost:5173/reservations-restaurants/ avec un **faux script** (msw, réglé par `.env.development`) : aucune requête ne part vers Google, aucune réservation réelle n'est créée.

Le responsable du script peut essayer le site sur les vraies données : copier `.env.example` en `.env.real.local` (fichier ignoré par git), y mettre l'URL `/exec` du script, puis lancer `pnpm dev:real`. Chaque essai écrit alors dans la vraie feuille et envoie de vrais e-mails.

### Voir le site comme GitHub Pages le sert

```sh
pnpm build
pnpm serve
```

`pnpm serve` sert `dist/client` sur http://127.0.0.1:4311/reservations-restaurants/ comme le fait GitHub Pages : types MIME, `404.html` pour un lien profond comme `/collegue`. N'utilisez pas `vite preview` : avec TanStack Start, il fait du rendu côté serveur et ne montre pas ce que Pages publie. Le build lit l'adresse du script dans la variable `VITE_APPS_SCRIPT_URL` (`VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/…/exec pnpm build`) ; sans elle, le build réussit quand même et le site affiche le bandeau « Configuration manquante ».

### Vérifier

| Commande                          | Quand, et ce qu'elle fait                                                                                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check:fast`                 | Avant chaque commit : extraction des textes, format, lint, types, tests Node.                                                                         |
| `pnpm check`                      | Avant une pull request : la même chose, plus les tests dans Chromium (composants, stories) et knip.                                                   |
| `pnpm build:e2e`, `pnpm test:e2e` | Tests Playwright sur un build branché sur le faux script : suite de régression (`--project=react`) et tests propres au site (`--project=react-only`). |
| `pnpm test:e2e:production`        | Après un déploiement : vérifications en lecture seule du site publié, sur les vraies données (voir plus bas).                                         |
| `pnpm budget`                     | Après `pnpm build` : poids chargé par un visiteur, 200 kB de JavaScript et 25 kB de CSS (gzip) au plus.                                               |
| `pnpm lint:fix`                   | Corrige ce que oxlint et oxfmt savent corriger.                                                                                                       |
| `pnpm i18n:extract`               | Met à jour `translations/fr.json` après un ajout ou un changement de texte.                                                                           |
| `pnpm storybook`                  | Catalogue des composants (port 6006) sur le faux script ; `pnpm build-storybook` le construit dans `storybook-static/`.                               |

### Intégration continue

`.github/workflows/ci.yml` vérifie chaque push sur `main` et sur la branche de migration, et chaque pull request : jobs `check` (textes, format, lint, types, tests Node, knip), `browser` (tests dans Chromium) et `e2e` (Playwright, build de production, budget). Le job `e2e` publie deux artefacts sur la page du run : `playwright-report` et `dist-client`, le site construit avec la variable de dépôt `VITE_APPS_SCRIPT_URL`. Pour essayer `dist-client` sur un poste : décompresser l'archive dans `dist/client/`, puis `pnpm serve`. Sur `main`, le job `deploy` publie ensuite `dist-client` sur GitHub Pages (voir [Héberger](#3--héberger-sur-github-pages)).

Dependabot (`.github/dependabot.yml`) propose les mises à jour une semaine après leur publication, regroupées par famille de paquets.

### Vérifier le site publié

```sh
pnpm test:e2e:production
```

Ces tests ouvrent https://thegaudis.github.io/reservations-restaurants/ (ou l'adresse de `E2E_PRODUCTION_URL`) et lisent les vraies données sans rien écrire : aucun bouton d'envoi n'est cliqué, et toute requête au script autre qu'une lecture est bloquée. Ils vérifient la page publique, l'absence de données personnelles dans la lecture publique, la copie locale, les calendriers, l'ouverture d'un formulaire, le lien direct `/collegue` et `/index.html`. Le test du formulaire échoue s'il n'existe aucun jour du restaurant 1 réservable après aujourd'hui : vérifiez alors l'ouverture d'un formulaire à la main. Ni `pnpm check` ni la CI ne lancent ces tests.

## 🎨 Charte graphique

### 🏫 Logo

Le logo s'affiche en haut à gauche de l'en-tête, en 96 px de haut (64 px sur mobile). Il ne doit jamais être redessiné, recoloré ni déformé.

### 🌈 Couleurs

Les couleurs reprennent les trois teintes du logo : vert lime, bleu et magenta. Elles sont définies dans `src/styles/tokens.css`.

**Identité**

|                                                   | Jeton              | Code      | Usage                                                            |
| ------------------------------------------------- | ------------------ | --------- | ---------------------------------------------------------------- |
| ![](https://placehold.co/20x20/A9C23F/A9C23F.png) | `--ab-green`       | `#A9C23F` | Aplats, bandeau et filets du restaurant 1. Jamais pour du texte. |
| ![](https://placehold.co/20x20/4E6614/4E6614.png) | `--ab-green-ink`   | `#4E6614` | Texte et boutons du restaurant 1.                                |
| ![](https://placehold.co/20x20/3B4F0D/3B4F0D.png) | `--ab-green-deep`  | `#3B4F0D` | Survol et titres du restaurant 1.                                |
| ![](https://placehold.co/20x20/1F4E9E/1F4E9E.png) | `--ab-blue`        | `#1F4E9E` | Action principale, focus, chiffres clés.                         |
| ![](https://placehold.co/20x20/173D7D/173D7D.png) | `--ab-blue-ink`    | `#173D7D` | Survol du bleu, titres et totaux.                                |
| ![](https://placehold.co/20x20/A3237F/A3237F.png) | `--ab-magenta`     | `#A3237F` | Accent du restaurant 2 (boutons, titres).                        |
| ![](https://placehold.co/20x20/86196A/86196A.png) | `--ab-magenta-ink` | `#86196A` | Survol et titres du restaurant 2.                                |
| ![](https://placehold.co/20x20/8C8C8C/8C8C8C.png) | `--ab-grey`        | `#8C8C8C` | Repère « aujourd'hui », pastilles. Jamais pour du texte.         |

**Fonds, texte et états**

|                                                   | Jeton          | Code      | Usage                             |
| ------------------------------------------------- | -------------- | --------- | --------------------------------- |
| ![](https://placehold.co/20x20/F3F4F0/F3F4F0.png) | `--bg`         | `#F3F4F0` | Fond de page « papier ».          |
| ![](https://placehold.co/20x20/FFFFFF/FFFFFF.png) | `--surface`    | `#FFFFFF` | Cartes, panneaux, champs.         |
| ![](https://placehold.co/20x20/1F2328/1F2328.png) | `--text`       | `#1F2328` | Texte principal.                  |
| ![](https://placehold.co/20x20/646A70/646A70.png) | `--text-muted` | `#646A70` | Descriptions, libellés, notes.    |
| ![](https://placehold.co/20x20/4E7A12/4E7A12.png) | `--success`    | `#4E7A12` | Places disponibles, confirmation. |
| ![](https://placehold.co/20x20/9A600A/9A600A.png) | `--warning`    | `#9A600A` | Bientôt complet, avertissements.  |
| ![](https://placehold.co/20x20/B7372F/B7372F.png) | `--danger`     | `#B7372F` | Complet, erreurs, suppression.    |

### 📐 Règles principales

Toute l'interface s'appuie sur les jetons de `src/styles/tokens.css` et suit les bonnes pratiques Material 3 :

- Aucune couleur, taille ou rayon en dur : toujours une variable `var(--…)` (styles en CSS Modules, à côté de chaque composant).
- Bleu `--accent` pour l'action principale ; `data-accent="r1"` ou `data-accent="r2"` (ou `.accent-green`, `.accent-magenta`) sur un conteneur pour la couleur de chaque restaurant.
- `--success`, `--warning` et `--danger` réservés aux états, toujours accompagnés d'un mot.
- Contraste du texte d'au moins 4,5:1, repères graphiques d'au moins 3:1.
- Zones tactiles de 48 px, états de survol, d'appui et de focus visibles.
- Textes au vouvoiement, dates en toutes lettres, montants au format « 12,50 € ».

📄 Le détail figure dans [charte-graphique.pdf](charte-graphique.pdf).

🖨️ Les documents imprimés s'affichent dans la page elle-même (`src/ui/print/`, `src/features/print/`) avec les jetons de `src/styles/tokens.css` ; leurs tailles en points et en millimètres sont dans `src/styles/print.css`.
