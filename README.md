<p align="center"><img src="logo.png" alt="Logo du lycée professionnel Aristide Briand" height="96"></p>

# 🍽️ Réservations — restaurants pédagogiques

Site de réservation des deux restaurants pédagogiques du lycée professionnel Aristide Briand :

- 🟢 **Restaurant 1** (couleur verte) : réservation de couverts sur un jour de service, avec une capacité et un menu.
- 🟣 **Restaurant 2** (couleur magenta) : réservation de plats en portions limitées, sur place ou à emporter. Les commandes en ligne ferment à 10 h le jour même : le menu et les stocks restent affichés, et le site invite à venir commander sur place à partir de 12 h (heures réglables par `R2_CUTOFF_HOUR` et `R2_ONSITE_HOUR` dans `js/donnees.js`).

Le site est une page statique unique, sans outil de compilation : du HTML, du CSS et quelques fichiers JavaScript chargés tels quels. Les données sont stockées dans une feuille Google Sheets, lue et modifiée par un script Google Apps Script qui sert d'API.

## ✨ Fonctionnalités

**👥 Pour le public**

- 📅 Calendrier des jours de service, accessible au clavier (flèches, Début / Fin, Page ↑ / ↓).
- 🔢 Places ou portions restantes affichées pour chaque jour et chaque plat.
- 🔐 Aucune donnée personnelle pour le public : la lecture publique ne contient que les jours, les plats et le nombre de places prises (un total par jour ou par plat). Noms, e-mails, téléphones et observations ne sont envoyés qu'au mode collègue.
- ⚡ Affichage immédiat : à la visite suivante, le calendrier de la dernière visite s'affiche aussitôt, le temps que les places se mettent à jour. On peut déjà ouvrir et remplir un formulaire : le script recompte les places au moment d'enregistrer et refuse ce qui n'est plus disponible. La copie gardée dans le navigateur ne contient aucune donnée personnelle (ni nom, ni e-mail, ni téléphone).
- 🚀 Chargement anticipé : la lecture des données part dès le début de la page, avant les polices et les styles, et la connexion à Google Apps Script est préparée (`preconnect`). Les polices Google Fonts ne bloquent pas l'affichage (police système en attendant).
- ⏱️ Lecture doublée si Google tarde : Google met parfois plus de 10 secondes à démarrer le script ; si la lecture n'a pas répondu après 6 secondes, une seconde part en parallèle et la première réponse arrivée l'emporte (jamais pour une écriture).
- 🪶 Actualisation légère : la page envoie l'empreinte (`etag`) de ce qu'elle affiche ; si rien n'a changé, le script répond en quelques octets (`{ unchanged: true }`), à l'ouverture comme lors de l'actualisation toutes les 3 minutes.
- 🛡️ Anti-doublon : chaque réservation envoie un identifiant unique (`requestId`), conservé si l'on réessaie après une erreur ; le script ignore un envoi déjà enregistré (double clic, réponse perdue) et la page affiche « Cette réservation était déjà enregistrée ».
- 📝 Formulaire de réservation avec contrôle des champs et message d'erreur sous chaque champ ; le script revérifie les quantités (nombres entiers positifs) et les places restantes avant d'écrire.
- 📧 E-mail de confirmation, puis rappel la veille, si le contact saisi est une adresse e-mail (dates en toutes lettres, montants « 12,50 € »).

**🧑‍🍳 Pour l'équipe (« mode collègue », protégé par mot de passe)**

- 🗓️ Ouverture et suppression des jours de service, modification de la capacité et du menu.
- 🥗 Gestion des plats du restaurant 2 (ajout, modification, stock, prix). Case « Ticket restaurant » : le plat n'a pas de prix en euros et s'affiche « prix d'un ticket restaurant ». Sans modifier le script, la mention est rangée à la fin du nom du plat dans la feuille (« Bowl (ticket restaurant) ») : les e-mails de confirmation et de rappel affichent donc ce nom, sans autre changement. Un jour où au moins un plat est au ticket restaurant, le client ne peut commander que sur place (« À emporter » n'est pas proposé).
- 📋 Consultation, modification et suppression des réservations ; au restaurant 1, le détail élèves / personnels / extérieurs est modifiable et le prix est recalculé aux tarifs en vigueur.
- ➕ Ajout manuel d'une personne : « + Ajouter une personne » sous la fiche du jour (restaurant 1) ou sous chaque plat (restaurant 2). Les places restantes sont vérifiées comme pour le public, l'adresse e-mail est facultative et, si elle est indiquée, la confirmation y est envoyée. À Aristide, l'ajout reste possible après 10 h (commande prise sur place).
- 🖨️ Impression de la liste d'un jour et du résumé du lendemain pour chaque restaurant, au format A4 paysage ; la liste du jour se termine par un cadre « Nom du responsable / Signature ».
- ⚙️ Réglage du nom des restaurants et du contact d'annulation.
- 🔒 Déconnexion automatique après 10 minutes d'inactivité, ou dès que le mot de passe est changé dans le script.

## 📁 Contenu du dépôt

| Fichier | Rôle |
| --- | --- |
| `index.html` | La page : structure HTML, adresse du script (`APPS_SCRIPT_URL`) et chargement des fichiers ci-dessous. |
| `design-system.css` | Jetons de la charte (couleurs, tailles, rayons, animations) et composants communs. |
| `app.css` | Styles propres à la page. |
| `js/donnees.js` | État de la page, copie locale, échanges avec Apps Script, places restantes, heures d'Aristide. |
| `js/outils.js` | Dates, messages, montants, suppression en deux clics, erreurs des champs. |
| `js/impression.js` | Documents imprimés (`PRINT_TOKENS`, `PRINT_CSS`) et résumés du lendemain. |
| `js/interface.js` | Éléments communs : récapitulatif, icônes, boutons segmentés, apparitions. |
| `js/collegue.js` | Mode collègue : connexion, déconnexion automatique, paramètres, jours, plats, modifications. |
| `js/reservation.js` | Réservation par le public et formulaires. |
| `js/calendrier.js` | Calendriers et fiches du jour. |
| `js/main.js` | Affichage de la page, démarrage et actualisation automatique. |
| `Code.gs` | API JSON Google Apps Script (`doGet` pour lire l'état, `doPost` pour les actions). |
| `charte-graphique.pdf` | Charte graphique : couleurs, contrastes, composants et règles d'usage. |
| `logo.png` | Logo du lycée, affiché dans ce README. |
| `README.md` | Ce document. |

## 🚀 Installation

### 1. 🛠️ Préparer le script Google Apps Script

1. Créer une feuille Google Sheets vide.
2. Ouvrir **Extensions > Apps Script** et coller le contenu de `Code.gs`.
3. 🔑 Définir le mot de passe du mode collègue, **sans l'écrire dans `Code.gs`** (ce fichier est public) : **Paramètres du projet** (roue dentée) > **Propriétés du script** > **Ajouter une propriété**, nom `ADMIN_PASSWORD`, valeur = un mot de passe propre à l'établissement. Sans cette propriété, la connexion au mode collègue est refusée.
4. **Déployer > Nouveau déploiement**, type **Application Web** :
   - Exécuter en tant que : *moi* ;
   - Accès : *tout le monde*.
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

### 2. 🔌 Brancher la page

Dans `index.html`, tout en haut du fichier (premier `<script>` du `<head>`), remplacer la valeur de `APPS_SCRIPT_URL` par l'URL copiée à l'étape précédente. Sans URL valide, la page affiche un bandeau « Configuration manquante ».

### 3. 🌐 Héberger

N'importe quel hébergement de fichiers statiques convient (GitHub Pages, Netlify…) : il suffit de publier `index.html`, `design-system.css`, `app.css` et le dossier `js/` en gardant cette organisation. La page doit être servie par un serveur web : ouverte d'un double-clic (`file://`), elle ne peut pas lire les données.

🔄 Après chaque mise en ligne, augmenter ensemble tous les numéros `?v=` des fichiers CSS et JavaScript dans `index.html` (même numéro partout) : les navigateurs téléchargent alors la nouvelle version complète, sans mélanger anciens et nouveaux fichiers.

🧩 Les fichiers `js/*.js` sont des scripts classiques (pas des modules) : ils partagent les mêmes variables et fonctions, et doivent rester chargés dans l'ordre indiqué dans `index.html`, `js/main.js` en dernier.

## 🎨 Charte graphique

### 🏫 Logo

Le logo s'affiche en haut à gauche de l'en-tête, en 96 px de haut (64 px sur mobile). Il ne doit jamais être redessiné, recoloré ni déformé.

### 🌈 Couleurs

Les couleurs reprennent les trois teintes du logo : vert lime, bleu et magenta. Elles sont définies dans `design-system.css`.

**Identité**

| | Jeton | Code | Usage |
| --- | --- | --- | --- |
| ![](https://placehold.co/20x20/A9C23F/A9C23F.png) | `--ab-green` | `#A9C23F` | Aplats, bandeau et filets du restaurant 1. Jamais pour du texte. |
| ![](https://placehold.co/20x20/4E6614/4E6614.png) | `--ab-green-ink` | `#4E6614` | Texte et boutons du restaurant 1. |
| ![](https://placehold.co/20x20/3B4F0D/3B4F0D.png) | `--ab-green-deep` | `#3B4F0D` | Survol et titres du restaurant 1. |
| ![](https://placehold.co/20x20/1F4E9E/1F4E9E.png) | `--ab-blue` | `#1F4E9E` | Action principale, focus, chiffres clés. |
| ![](https://placehold.co/20x20/173D7D/173D7D.png) | `--ab-blue-ink` | `#173D7D` | Survol du bleu, titres et totaux. |
| ![](https://placehold.co/20x20/A3237F/A3237F.png) | `--ab-magenta` | `#A3237F` | Accent du restaurant 2 (boutons, titres). |
| ![](https://placehold.co/20x20/86196A/86196A.png) | `--ab-magenta-ink` | `#86196A` | Survol et titres du restaurant 2. |
| ![](https://placehold.co/20x20/8C8C8C/8C8C8C.png) | `--ab-grey` | `#8C8C8C` | Repère « aujourd'hui », pastilles. Jamais pour du texte. |

**Fonds, texte et états**

| | Jeton | Code | Usage |
| --- | --- | --- | --- |
| ![](https://placehold.co/20x20/F3F4F0/F3F4F0.png) | `--bg` | `#F3F4F0` | Fond de page « papier ». |
| ![](https://placehold.co/20x20/FFFFFF/FFFFFF.png) | `--surface` | `#FFFFFF` | Cartes, panneaux, champs. |
| ![](https://placehold.co/20x20/1F2328/1F2328.png) | `--text` | `#1F2328` | Texte principal. |
| ![](https://placehold.co/20x20/646A70/646A70.png) | `--text-muted` | `#646A70` | Descriptions, libellés, notes. |
| ![](https://placehold.co/20x20/4E7A12/4E7A12.png) | `--success` | `#4E7A12` | Places disponibles, confirmation. |
| ![](https://placehold.co/20x20/9A600A/9A600A.png) | `--warning` | `#9A600A` | Bientôt complet, avertissements. |
| ![](https://placehold.co/20x20/B7372F/B7372F.png) | `--danger` | `#B7372F` | Complet, erreurs, suppression. |

### 📐 Règles principales

Toute l'interface s'appuie sur `design-system.css` et suit les bonnes pratiques Material 3 :

- Aucune couleur, taille ou rayon en dur : toujours une variable `var(--…)`.
- Bleu `--accent` pour l'action principale ; `.accent-green` et `.accent-magenta` sur un conteneur pour la couleur de chaque restaurant.
- `--success`, `--warning` et `--danger` réservés aux états, toujours accompagnés d'un mot.
- Contraste du texte d'au moins 4,5:1, repères graphiques d'au moins 3:1.
- Zones tactiles de 48 px, états de survol, d'appui et de focus visibles.
- Textes au vouvoiement, dates en toutes lettres, montants au format « 12,50 € ».

📄 Le détail figure dans [charte-graphique.pdf](charte-graphique.pdf).

🖨️ Les documents imprimés s'ouvrent dans une fenêtre sans feuille de styles : les jetons nécessaires y sont recopiés au moment d'imprimer à partir de la liste `PRINT_TOKENS` de `js/impression.js`. Tout nouveau jeton utilisé dans `PRINT_CSS` doit être ajouté à cette liste.
