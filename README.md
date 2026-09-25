<p align="center"><img src="logo.png" alt="Logo du lycée professionnel Aristide Briand" height="96"></p>

# 🍽️ Réservations — restaurants pédagogiques

Site de réservation des deux restaurants pédagogiques du lycée professionnel Aristide Briand :

- 🟢 **Restaurant 1** (couleur verte) : réservation de couverts sur un jour de service, avec une capacité et un menu.
- 🟣 **Restaurant 2** (couleur magenta) : réservation de plats en portions limitées, sur place ou à emporter.

Le site est une page statique unique. Les données sont stockées dans une feuille Google Sheets, lue et modifiée par un script Google Apps Script qui sert d'API.

## ✨ Fonctionnalités

**👥 Pour le public**

- 📅 Calendrier des jours de service, accessible au clavier (flèches, Début / Fin, Page ↑ / ↓).
- 🔢 Places ou portions restantes affichées pour chaque jour et chaque plat.
- 📝 Formulaire de réservation avec contrôle des champs et message d'erreur sous chaque champ.
- 📧 E-mail de confirmation, puis rappel la veille, si le contact saisi est une adresse e-mail.

**🧑‍🍳 Pour l'équipe (« mode collègue », protégé par mot de passe)**

- 🗓️ Ouverture et suppression des jours de service, modification de la capacité et du menu.
- 🥗 Gestion des plats du restaurant 2 (ajout, modification, stock, prix).
- 📋 Consultation, modification et suppression des réservations.
- 🖨️ Impression de la liste d'un jour et du résumé du lendemain pour chaque restaurant, au format A4 paysage.
- ⚙️ Réglage du nom des restaurants et du contact d'annulation.
- 🔒 Déconnexion automatique après 10 minutes d'inactivité.

## 📁 Contenu du dépôt

| Fichier | Rôle |
| --- | --- |
| `index.html` | La page : HTML, styles propres à la page et JavaScript. |
| `design-system.css` | Jetons de la charte (couleurs, tailles, rayons, animations) et composants communs. |
| `Code.gs` | API JSON Google Apps Script (`doGet` pour lire l'état, `doPost` pour les actions). |
| `charte-graphique.pdf` | Charte graphique : couleurs, contrastes, composants et règles d'usage. |
| `logo.png` | Logo du lycée, affiché dans ce README. |
| `README.md` | Ce document. |

## 🚀 Installation

### 1. 🛠️ Préparer le script Google Apps Script

1. Créer une feuille Google Sheets vide.
2. Ouvrir **Extensions > Apps Script** et coller le contenu de `Code.gs`.
3. 🔑 Remplacer la valeur de `ADMIN_PASSWORD` par un mot de passe propre à l'établissement.
4. **Déployer > Nouveau déploiement**, type **Application Web** :
   - Exécuter en tant que : *moi* ;
   - Accès : *tout le monde*.
5. Copier l'URL du déploiement (elle se termine par `/exec`).

Les onglets de la feuille (`Config`, `R1_Days`, `R1_Bookings`, `R2_Days`, `R2_Items`, `R2_Bookings`) sont créés automatiquement au premier appel.

⏰ Pour les rappels de la veille, exécuter une fois la fonction `setupDailyTrigger` depuis l'éditeur Apps Script : elle programme l'envoi chaque jour à 18 h.

### 2. 🔌 Brancher la page

Dans `index.html`, remplacer la valeur de `APPS_SCRIPT_URL` par l'URL copiée à l'étape précédente. Sans URL valide, la page affiche un bandeau « Configuration manquante ».

### 3. 🌐 Héberger

N'importe quel hébergement de fichiers statiques convient (GitHub Pages, Netlify…) : il suffit de publier `index.html` et `design-system.css` dans le même dossier.

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

🖨️ Les documents imprimés s'ouvrent dans une fenêtre sans feuille de styles : les jetons nécessaires y sont recopiés au moment d'imprimer à partir de la liste `PRINT_TOKENS` de `index.html`. Tout nouveau jeton utilisé dans `PRINT_CSS` doit être ajouté à cette liste.
