# 09 — Inventaire des écrans, états et dialogues

L'application actuelle est **une seule page** (`index.html`) : tous les « écrans » ci-dessous sont des états de cette page, pilotés par des variables globales JS (`calState`, `isAdmin`, `loginOpen`, `openBookingTarget`, `bookingConfirmation`, `editBookingTarget`, `addBookingOpen`, `editItemTarget`, `addItemFormOpen`, `editDayR1Open`, `addDayOpen`, `settingsOpen`, `datePicker`, `dateChoice`, `dataStale`, `firstLoadDone`). Aucun état n'est dans l'URL aujourd'hui ; rien ne survit à un rechargement, sauf la copie locale des données publiques et des noms (`localStorage`).

Les deux restaurants sont affichés **côte à côte** et ont chacun leur jour sélectionné : un état d'URL React doit donc pouvoir porter les deux (paramètres préfixés `r1` / `r2`), ou bien la migration choisit des routes par restaurant (changement d'ergonomie à valider).

Légende « Accès » : **P** = public (mode client), **C** = collègue connecté, **P/C** = les deux.

---

## 1. Proposition de schéma d'URL

| Élément d'état | Paramètre proposé | Exemple | Remarque |
| --- | --- | --- | --- |
| Jour sélectionné R1 / R2 | `r1`, `r2` (ISO) | `?r1=2026-10-09&r2=2026-10-09` | défaut : aujourd'hui |
| Mode du calendrier | `r1vue`, `r2vue` = `semaine` \| `mois` | `&r1vue=mois` | défaut : `semaine` |
| Période affichée (si ≠ celle du jour sélectionné, après ‹ ›) | `r1periode`, `r2periode` (ISO d'ancrage) | `&r2periode=2026-11-01` | optionnel ; peut rester un état local |
| Formulaire public ouvert | `reserver=r1` \| `reserver=r2` | `?r2=2026-10-09&reserver=r2` | R2 : refusé si commandes closes |
| Récapitulatif affiché | état local (non partageable) | — | contient des données saisies |
| Mode collègue | préfixe de route `/collegue` | `/collegue?r1=…` | sans mot de passe en mémoire → redirection vers la connexion (`/?connexion=1`) |
| Panneau « Ouvrir un jour » ouvert | `ouvrir=r1` \| `ouvrir=r2` | `/collegue?ouvrir=r2` | |
| Date choisie dans « Ouvrir un jour » | `ouvrirDate` (ISO) | `&ouvrirDate=2026-10-12` | défaut : jour sélectionné |
| Paramètres ouverts | `parametres=1` | `/collegue?parametres=1` | |
| Édition d'un jour R1 | `editJour=r1` (le jour = `r1`) | `/collegue?r1=2026-10-09&editJour=r1` | |
| Édition d'une réservation | `editResa={rest}:{id}` | `&editResa=r2:8f3c…` | |
| Ajout d'une personne | `ajout=r1` (jour) ou `ajout=r2:{itemId}` | `&ajout=r2:a1b2…` | `requestId` généré à l'ouverture (état local) |
| Ajout d'un plat | `ajoutPlat=1` (jour = `r2`) | | |
| Édition d'un plat | `editPlat={itemId}` | | |
| Documents imprimés | route `/collegue/impression/{r1\|r2}/{date}` (+ `?demain=1`) | `/collegue/impression/r1/2026-10-10?demain=1` | voir 07 §9 |

Les états purement transitoires (bouton armé « Confirmer ? », bouton occupé, toast, voile, sélecteur de date déplié, segment animé) restent des états locaux.

---

## 2. Écrans et états globaux

| Id | Écran / état | Accès | Données nécessaires | Actions possibles | Écran suivant | Paramètres d'URL possibles |
| --- | --- | --- | --- | --- | --- | --- |
| G-01 | Chargement initial (squelettes dans les deux calendriers, titres mémorisés) | P | aucune (noms mémorisés `reservations-textes` si présents) | attendre | G-02 ou G-03 ou G-04 | aucun |
| G-02 | Page affichée depuis la copie locale (`dataStale`) | P | copie `reservations-cache-v1` (< 14 jours) | consulter, ouvrir/remplir un formulaire public ; la connexion collègue est refusée (« Les données se chargent. Réessayez dans un instant. ») | G-04 (données fraîches) ou G-03 | ceux de la page publique |
| G-03 | Erreur de chargement : encadré `.alert` (`role="alert"`) — « **Le service de réservation ne répond pas.** Réessayez dans un instant. Si le problème continue, prévenez l'établissement. » ou « **Vous semblez hors ligne.** Vérifiez votre connexion internet, puis réessayez. » (+ « Le calendrier affiché date de votre dernière visite : les places restantes ont pu changer depuis. » si copie locale) | P/C | — | « Réessayer » (bouton occupé « Nouvelle tentative… ») | G-04 ou G-03 | aucun |
| G-04 | Page publique (deux colonnes, calendriers + fiches) | P | état public (`r1Days`, `r2Days`, `r2Items`, totaux `r1Bookings`/`r2Bookings`, paramètres) | voir §3 | §3, L-01 | `r1`, `r2`, `r1vue`, `r2vue`, `reserver` |
| G-05 | Bandeau « Configuration manquante » | P/C | `APPS_SCRIPT_URL` contenant « COLLE_ICI » | aucune | — | — |
| G-06 | Voile de chargement (page inerte, « Chargement… » après 0,35 s) | P/C | — | aucune (attendre) | écran précédent | — |
| G-07 | Toast (succès vert / erreur rouge, 3,5 s) | P/C | message | aucune | — | — |
| G-08 | Page collègue (tableau de bord + colonnes en mode collègue) | C | état complet (`getAdminState`) + mot de passe en mémoire | voir §4 | §4 | `/collegue` + paramètres §1 |

## 3. Écrans publics

| Id | Écran / état | Accès | Données nécessaires | Actions possibles | Écran suivant | Paramètres d'URL possibles |
| --- | --- | --- | --- | --- | --- | --- |
| P-01 | Calendrier R1 — vue Semaine (défaut) | P/C | jours R1 + totaux réservés, date du jour | ‹ › (semaine), Semaine/Mois, Aujourd'hui, choisir un jour (clic, clavier) | P-01/P-02, P-03…P-08 | `r1`, `r1vue=semaine`, `r1periode` |
| P-02 | Calendrier R1 — vue Mois | P/C | idem | ‹ › (mois), Semaine/Mois, Aujourd'hui, choisir un jour | P-01/P-02, fiches | `r1vue=mois` |
| P-01b / P-02b | Calendrier R2 — Semaine / Mois | P/C | jours R2 + plats + totaux par plat | idem | fiches R2 | `r2`, `r2vue`, `r2periode` |
| P-03 | Fiche R1 — jour sans service | P | — | aucune | — | `r1` |
| P-04 | Fiche R1 — places disponibles / bientôt complet | P | jour, capacité, réservés, thème, menu | « Réserver » | P-05 | `r1` |
| P-05 | Formulaire de réservation R1 (déplié sous la fiche) | P | jour, places restantes, tarifs | saisir, « Confirmer la réservation », « Annuler » | P-06 (succès) ; P-04 (annuler) ; P-05 + erreurs | `r1`, `reserver=r1` |
| P-06 | Récapitulatif « Réservation enregistrée » (au-dessus de la fiche) | P | réponse de réservation, contact d'annulation | « Fermer », changer de jour | P-04 | état local |
| P-07 | Fiche R1 — complet (jauge rouge, sans bouton ni message) | P | idem P-04 | aucune | — | `r1` |
| P-08 | Fiche R1 — jour passé (pâlie, sans bouton) | P | idem | aucune | — | `r1` |
| P-10 | Fiche R2 — jour sans service | P | — | aucune | — | `r2` |
| P-11 | Fiche R2 — jour ouvert sans plat | P | jour (thème, note) | aucune | — | `r2` |
| P-12 | Fiche R2 — commandes ouvertes (liste des plats + « Réserver ») | P | jour, plats, restants, prix/ticket | « Réserver » | P-13 | `r2` |
| P-13 | Formulaire de commande R2 multi-plats (liste repliée) | P | plats, restants, jour au ticket ? | mode À emporter/Sur place, quantités, identité, « Confirmer la réservation », « Annuler » | P-14 ; P-12 (annuler) ; P-15 (si 10 h passe, formulaire fermé) | `r2`, `reserver=r2` |
| P-14 | Récapitulatif R2 (éventuel avertissement d'ajustement) | P | réponse `_bookingResult` | « Fermer » | P-12 | état local |
| P-15 | Fiche R2 — commandes closes à 10 h (note « Commandes en ligne clôturées à 10h. Venez au restaurant {name2} à partir de 12h pour commander sur place. ») | P | heure locale, jour = aujourd'hui | aucune | — | `r2` |
| P-16 | Fiche R2 — tous les plats épuisés (sans bouton ni message) | P | idem P-12 | aucune | — | `r2` |
| P-17 | Fiche R2 — jour passé | P | idem | aucune | — | `r2` |
| L-01 | Panneau de connexion déplié (champ mot de passe, œil, « Valider ») | P | — | saisir, Entrée/« Valider », Échap/« Client », afficher/masquer | G-08 (succès, toast « Mode collègue activé. ») ; L-01 + toast « Mot de passe incorrect. » / « Erreur de connexion. Réessayez. » ; G-04 | `?connexion=1` |

Formulaires P-05, P-13 et récapitulatifs : contenu détaillé dans `04-parcours-public-reservation.md`.

## 4. Écrans du mode collègue

| Id | Écran / état | Accès | Données nécessaires | Actions possibles | Écran suivant | Paramètres d'URL possibles |
| --- | --- | --- | --- | --- | --- | --- |
| C-01 | Panneau « Demain ({date}) » | C | réservations du lendemain (R1, R2) | — | — | — |
| C-02 | Paramètres — fermé / ouvert | C | noms, descriptions, contact d'annulation, 3 tarifs | ouvrir/fermer, modifier, « Enregistrer les paramètres » | C-02 + toast | `parametres=1` |
| C-03 | Résumé pour demain | C | jours, plats et réservations du lendemain | « Imprimer » R1, « Imprimer » R2 | I-03, I-04 | — |
| C-04 | « Ouvrir un jour » R1 — fermé / ouvert | C | jours R1 (pour « déjà ouvert ») | saisir, « Ouvrir ce jour » | C-05 (sélecteur), fiche C-10 du jour créé | `ouvrir=r1`, `ouvrirDate` |
| C-05 | Sélecteur de date déplié (`role="dialog"`, « Choisir la date ») | C | jours ouverts du restaurant | ‹ ›, flèches, Entrée/Espace, Échap, clic hors | C-04 / C-06 | état local (ou `ouvrirDate`) |
| C-06 | « Ouvrir un jour » R2 — fermé / ouvert, lignes de plats | C | jours R2, prix existants (suggestions) | saisir, « + Ajouter un plat », retirer une ligne, case ticket, « Ouvrir ce jour » | C-05, fiche C-20 du jour créé | `ouvrir=r2`, `ouvrirDate` |
| C-10 | Fiche R1 collègue (liste des réservations + actions) | C | jour + réservations nominatives | Modifier/Supprimer une réservation, « + Ajouter une personne », « Modifier ce jour », « Imprimer la liste », « Supprimer ce jour » | C-11, C-12, C-13, C-14, I-01 | `/collegue?r1=` |
| C-10b | Fiche R1 collègue — jour sans service (« Aucun jour ouvert. Utilisez le formulaire « Ouvrir un jour »… ») | C | — | aller à « Ouvrir un jour » | C-04 | `r1` |
| C-11 | Modification d'une réservation R1 (sous la ligne) | C | réservation, places restantes, tarifs | « Enregistrer », « Annuler » | C-10 + toast « Réservation modifiée. » | `editResa=r1:{id}` |
| C-12 | Ajout d'une personne R1 (sous les actions) | C | places restantes, tarifs | « Ajouter cette personne », « Annuler » | C-10 + toast | `ajout=r1` |
| C-13 | Modification du jour R1 (bas de la fiche) | C | capacité, thème, menu | « Enregistrer », « Annuler » | C-10 + toast « Jour modifié. » | `editJour=r1` |
| C-14 | Suppression armée (« Confirmer ? », 4 s) — jour, réservation ou plat | C | — | 2e clic (confirme), attendre (désarme) | fiche + toast « Jour supprimé. » / « Réservation supprimée. » / « Plat supprimé. » | état local |
| C-20 | Fiche R2 collègue (plats avec actions et réservations) | C | jour, plats, réservations nominatives | par plat : « + Ajouter une personne », « Modifier ce plat », « Supprimer ce plat », Modifier/Supprimer une réservation ; « + Ajouter un plat à ce jour » ; « Imprimer la liste » ; « Supprimer ce jour » | C-21…C-24, C-14, I-02 | `/collegue?r2=` |
| C-21 | Ajout d'un plat | C | prix existants | « Ajouter ce plat », « Annuler » | C-20 + toast « Plat ajouté. » | `ajoutPlat=1` |
| C-22 | Modification d'un plat | C | plat | « Enregistrer », « Annuler » | C-20 + toast « Plat modifié. » | `editPlat={itemId}` |
| C-23 | Ajout d'une personne R2 (sous le plat) | C | plat, restant | « Ajouter cette personne », « Annuler » | C-20 + toast | `ajout=r2:{itemId}` |
| C-24 | Modification d'une réservation R2 | C | réservation | « Enregistrer », « Annuler » | C-20 + toast | `editResa=r2:{id}` |
| C-30 | Déconnexion (segment « Client », inactivité 10 min, mot de passe changé) | C | — | — | G-04 + toast « Retour au mode client. » / « Déconnecté du mode collègue après 10 minutes d'inactivité. » / « Le mot de passe du mode collègue a changé. Reconnectez-vous. » | sortie de `/collegue` |

## 5. Documents imprimés (fenêtres séparées)

| Id | Document | Accès | Données | Actions | Suivant | Route proposée |
| --- | --- | --- | --- | --- | --- | --- |
| I-01 | Liste du jour R1 (A4 paysage, tableau quadrillé, N° table, Chef de rang, signature) | C | jour R1 + réservations | imprimer / annuler (boîte du navigateur) | fenêtre laissée ouverte | `/collegue/impression/r1/{date}` |
| I-02 | Liste du jour R2 (par client, récapitulatif par plat, signature) | C | jour R2, plats, réservations | idem | idem | `/collegue/impression/r2/{date}` |
| I-03 | Résumé du lendemain R1 | C | idem pour demain | idem | idem | `/collegue/impression/r1/{demain}?demain=1` |
| I-04 | Résumé du lendemain R2 | C | idem pour demain | idem | idem | `/collegue/impression/r2/{demain}?demain=1` |
| I-00 | Fenêtre bloquée : toast « Autorisez les fenêtres de ce site pour imprimer. » | C | — | — | écran précédent | — |

## 6. Dialogues

Il n'y a **aucune modale** dans l'application : pas de `<dialog>`, pas de `confirm()`/`alert()`, pas de `<template>` dans `index.html`. Les seuls éléments à caractère de dialogue sont :
- le sélecteur de date C-05 (`role="dialog"`, non modal, se ferme au clic extérieur ou par Échap) ;
- le panneau de connexion L-01 (dépliant, non modal) ;
- les confirmations de suppression en deux clics (C-14), dans le bouton lui-même.

## 7. Easter egg

Cinq clics sur le logo en moins de 2 secondes ouvrent `https://youtu.be/dQw4w9WgXcQ?list=RDdQw4w9WgXcQ` dans un nouvel onglet (`noopener`). Accessible à tous. À conserver ou retirer explicitement lors de la migration.

## 8. Points d'attention

1. Deux sélections de jour simultanées (R1 et R2) sur la même page : la structure d'URL doit porter deux dates ou la migration doit trancher pour une navigation par restaurant.
2. Les formulaires et récapitulatifs sont aujourd'hui **uniques pour toute la page** (`openBookingTarget`, `bookingConfirmation`) : ouvrir ou changer de jour dans un restaurant ferme ceux de l'autre. Le modèle d'URL proposé (`reserver=r1|r2`) conserve ce comportement.
3. Le mode collègue n'est pas restaurable par URL tant que le mot de passe reste en mémoire seulement : une route `/collegue` rechargée doit renvoyer vers la connexion, puis revenir sur l'état demandé.
4. Les impressions ouvertes dans un nouvel onglet ne peuvent pas relire l'état complet sans mot de passe : prévoir le passage de l'état ou une impression dans la même page (voir 07 §9).
5. Le récapitulatif P-06/P-14 contient des données personnelles saisies : ne pas le mettre dans l'URL.
