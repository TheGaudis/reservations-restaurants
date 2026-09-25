# Réservations — restaurants pédagogiques

Site de réservation des deux restaurants pédagogiques du lycée professionnel Aristide Briand :

- **Restaurant 1** (couleur verte) : réservation de couverts sur un jour de service, avec une capacité et un menu.
- **Restaurant 2** (couleur magenta) : réservation de plats en portions limitées, sur place ou à emporter.

Le site est une page statique unique. Les données sont stockées dans une feuille Google Sheets, lue et modifiée par un script Google Apps Script qui sert d'API.

## Fonctionnalités

**Pour le public**

- Calendrier des jours de service, accessible au clavier (flèches, Début / Fin, Page ↑ / ↓).
- Places ou portions restantes affichées pour chaque jour et chaque plat.
- Formulaire de réservation avec contrôle des champs et message d'erreur sous chaque champ.
- E-mail de confirmation, puis rappel la veille, si le contact saisi est une adresse e-mail.

**Pour l'équipe (« mode collègue », protégé par mot de passe)**

- Ouverture et suppression des jours de service, modification de la capacité et du menu.
- Gestion des plats du restaurant 2 (ajout, modification, stock, prix).
- Consultation, modification et suppression des réservations.
- Impression de la liste d'un jour et du résumé du lendemain pour chaque restaurant.
- Réglage du nom des restaurants et du contact d'annulation.
- Déconnexion automatique après 10 minutes d'inactivité.

## Contenu du dépôt

| Fichier | Rôle |
| --- | --- |
| `index.html` | La page : HTML, styles propres à la page et JavaScript. |
| `design-system.css` | Jetons de la charte (couleurs, tailles, rayons, animations) et composants communs. |
| `Code.gs` | API JSON Google Apps Script (`doGet` pour lire l'état, `doPost` pour les actions). |
| `charte-graphique.pdf` | Charte graphique : couleurs, contrastes, composants et règles d'usage. |

## Installation

### 1. Préparer le script Google Apps Script

1. Créer une feuille Google Sheets vide.
2. Ouvrir **Extensions > Apps Script** et coller le contenu de `Code.gs`.
3. Remplacer la valeur de `ADMIN_PASSWORD` par un mot de passe propre à l'établissement.
4. **Déployer > Nouveau déploiement**, type **Application Web** :
   - Exécuter en tant que : *moi* ;
   - Accès : *tout le monde*.
5. Copier l'URL du déploiement (elle se termine par `/exec`).

Les onglets de la feuille (`Config`, `R1_Days`, `R1_Bookings`, `R2_Days`, `R2_Items`, `R2_Bookings`) sont créés automatiquement au premier appel.

Pour les rappels de la veille, exécuter une fois la fonction `setupDailyTrigger` depuis l'éditeur Apps Script : elle programme l'envoi chaque jour à 18 h.

### 2. Brancher la page

Dans `index.html`, remplacer la valeur de `APPS_SCRIPT_URL` par l'URL copiée à l'étape précédente. Sans URL valide, la page affiche un bandeau « Configuration manquante ».

### 3. Héberger

N'importe quel hébergement de fichiers statiques convient (GitHub Pages, Netlify…) : il suffit de publier `index.html` et `design-system.css` dans le même dossier.

## Charte graphique

Toute l'interface s'appuie sur `design-system.css` et suit les bonnes pratiques Material 3. Les règles principales :

- Aucune couleur, taille ou rayon en dur : toujours une variable `var(--…)`.
- Bleu `--accent` pour l'action principale ; `.accent-green` et `.accent-magenta` sur un conteneur pour la couleur de chaque restaurant.
- `--success`, `--warning` et `--danger` réservés aux états, toujours accompagnés d'un mot.
- Contraste du texte d'au moins 4,5:1, repères graphiques d'au moins 3:1.
- Zones tactiles de 48 px, états de survol, d'appui et de focus visibles.
- Textes au vouvoiement, dates en toutes lettres, montants au format « 12,50 € ».

Le détail figure dans [charte-graphique.pdf](charte-graphique.pdf).

Les documents imprimés s'ouvrent dans une fenêtre sans feuille de styles : les jetons nécessaires y sont recopiés au moment d'imprimer à partir de la liste `PRINT_TOKENS` de `index.html`. Tout nouveau jeton utilisé dans `PRINT_CSS` doit être ajouté à cette liste.
