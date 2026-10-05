# Spécification fonctionnelle de l'application actuelle

> Plan de migration du frontend vers React, qui s'appuie sur cette spec : [`docs/migration/PLAN.md`](../migration/PLAN.md).

Spécification de référence du site de réservation des restaurants pédagogiques du Lycée professionnel Aristide Briand, écrite à partir du code (`index.html`, `js/*.js`, `app.css`, `design-system.css`, `Code.gs`) avant la migration du frontend vers React. Le backend Apps Script n'est **pas** migré : la spec décrit ce que la version React doit reproduire et ce qu'elle doit savoir attendre du script.

État du code décrit : branche principale au 3 octobre 2026 (ressources en `?v=21`).

---

## 1. Index et mode de lecture

| Fichier | Contenu en une phrase |
| --- | --- |
| [`00-glossaire-et-constantes.md`](00-glossaire-et-constantes.md) | Vocabulaire du domaine (couvert, portion, ticket restaurant, cut-off…), toutes les constantes client et serveur, et les fonctions utilitaires de `outils.js` à réécrire en TypeScript. |
| [`01-modele-de-donnees.md`](01-modele-de-donnees.md) | Onglets Google Sheets et champs JSON, visibilité public / collègue / cache, règles dérivées (places restantes, seuils, prix R1, ticket restaurant, sur place, cut-off 10 h) et forme de l'état client. |
| [`02-contrat-api.md`](02-contrat-api.md) | Transport (`GET` + `?since=`, `POST` en `text/plain`), chaque action avec requête, ordre de traitement, réponse et messages d'erreur exacts, sémantique `etag` / `requestId`, tâches planifiées et e-mails du script. |
| [`03-cache-local-et-chargement.md`](03-cache-local-et-chargement.md) | Copie locale anonymisée, séquence de démarrage exacte, lecture anticipée, états d'écran (squelette, copie locale, échec, configuration manquante), voile, actualisation toutes les 3 min, bascule à 10 h, conservation des saisies et du focus. |
| [`04-parcours-public-reservation.md`](04-parcours-public-reservation.md) | Parcours du public : fiches, formulaires R1 et R2 champ par champ, validations, envoi, réponses, récapitulatif, formats d'affichage et catalogue des messages. |
| [`05-calendrier-et-fiche-du-jour.md`](05-calendrier-et-fiche-du-jour.md) | Calendriers semaine / mois, pastilles de disponibilité, clavier, transitions, ordre exact du contenu des fiches R1 et R2 et leurs états. |
| [`06-mode-collegue.md`](06-mode-collegue.md) | Connexion, session et déconnexion, panneau « Demain », Paramètres, sélecteur de date, ouverture et gestion des jours et des plats, modification et ajout manuel de réservations. |
| [`07-impression.md`](07-impression.md) | Les quatre documents imprimés (listes du jour R1 / R2, résumés du lendemain), le résumé du lendemain à l'écran et la mécanique d'impression. |
| [`08-design-system-et-ui.md`](08-design-system-et-ui.md) | Jetons, thèmes d'accent, composants CSS et JS d'interface, animations, mise en page, points de rupture, règles de la charte graphique. |
| [`09-inventaire-des-ecrans.md`](09-inventaire-des-ecrans.md) | Inventaire de tous les écrans, états et « dialogues », avec une proposition de schéma d'URL pour React. |

**Comment lire la spec**
- Pour une vue d'ensemble : ce README (§ 2), puis `09` (écrans) et `01` (données).
- Pour implémenter le public : `04` puis `05` ; pour le mode collègue : `06` ; pour les échanges avec le script : `02` et `03`.
- Les textes entre guillemets de code ou entre « » sont **exacts** (ponctuation comprise) ; `␣` désigne une espace insécable U+00A0 quand elle compte ; `{x}` est une valeur insérée.
- Chaque fichier se termine par ses « Points d'attention » ; ils sont fusionnés et classés au § 3 ci-dessous, qui fait foi pour la priorisation.
- Les renvois prennent la forme « `0X` § n ».

---

## 2. Vue d'ensemble en une page

**Deux restaurants, deux colonnes côte à côte** (empilées sous 760 px), chacune avec son calendrier et la fiche du jour sélectionné :
- **R1, « Restaurant Pédagogique »** (vert, nom réglable `name1`) : restaurant à table. Un collègue ouvre un jour avec une **capacité en couverts** (+ thème, menu). Le public réserve un nombre de personnes réparties en élèves / personnels / extérieurs, chacun à son tarif. Pas d'heure limite : réservable jusqu'à minuit le jour même.
- **R2, « Aristide »** (magenta, nom réglable `name2`) : vente de **plats** à stock limité, **à emporter ou sur place**. Une commande peut contenir plusieurs plats (une ligne de réservation par plat ; le script réduit les quantités au stock restant au lieu de refuser). Un plat peut être « au prix d'un ticket restaurant » : ce jour-là la commande est **sur place uniquement** et coûte **un seul ticket** par commande. Les commandes en ligne **ferment à 10 h** le jour même (« venez commander sur place à partir de 12 h »).

**Deux rôles**
- **Public (mode « Client »)**, sans compte : consulte les calendriers, réserve avec nom, e-mail (obligatoire), classe ou service, observation. Reçoit uniquement l'**état public** (jours, plats, paramètres et **totaux anonymes** réservés).
- **Collègue**, avec un mot de passe partagé (propriété `ADMIN_PASSWORD` du script, gardé **en mémoire** seulement) : voit les réservations nominatives, ouvre / modifie / supprime jours et plats, modifie ou ajoute des réservations (sans heure limite), règle noms, descriptions, contact d'annulation et tarifs, imprime les listes. Déconnexion après 10 min d'inactivité ou si le mot de passe change.

**Backend : Google Apps Script + Google Sheets (non migré)**
- Une URL `/exec` : `GET` (état public, `?since=etag` → `{ unchanged: true }`), `POST` `text/plain` avec `{ action, … }` ; erreurs métier dans le corps (`{ error }`), toujours en HTTP 200.
- Écritures sérialisées par un verrou (20 s), places / stocks recomptés sous verrou, anti-doublon par `requestId` (6 h), état public mis en mémoire (`CacheService`, 6 h), e-mails de confirmation, d'annulation et de rappel la veille à 18 h, archivage des jours de plus de 60 jours.
- **Limites** : démarrage lent et irrégulier (parfois > 10 s, pages d'erreur HTML passagères), aucune authentification des réservations publiques et **aucune règle métier côté serveur hormis quantités et places** (ni cut-off, ni jour passé, ni mode, ni format d'e-mail), pas d'heure serveur exposée, pas de colonne « ticket » (codé dans le nom du plat), pas de limitation des essais de mot de passe, état collègue renvoyé en entier à chaque lecture (pas d'etag).

**Les 5 invariants à préserver absolument**
1. **Aucune donnée personnelle dans le navigateur hors session collègue** : la copie locale (`localStorage`) ne contient que jours, plats, paramètres et sommes anonymes ; le mot de passe et l'état complet ne vivent qu'en mémoire, jamais dans l'URL, le stockage, un service worker ou le cache HTTP — et l'état complet doit être **purgé à la déconnexion** (ce que le code actuel ne fait pas, § 3 a-1).
2. **Affichage immédiat depuis le cache, lecture en vol avant le bundle** : premier rendu synchrone depuis `reservations-cache-v1` (même clé, même format), lecture lancée par un script inline du `<head>` avec l'etag, `?since=` à chaque lecture, lecture doublée à 6 s et 2e tentative à 1,5 s, jamais de rejeu d'écriture ; réservation possible sur données encore périmées (le serveur fait foi).
3. **Idempotence par `requestId`** : un identifiant généré à l'ouverture de chaque formulaire de réservation (public et ajout collègue), conservé pour tout nouvel essai tant que le formulaire est ouvert, renouvelé à chaque ouverture ; `_duplicate` traité sans seconde réservation.
4. **Cut-off d'Aristide à 10 h (heure locale)** : à partir de 10 h le jour J et pour tout jour passé, pas de commande publique en ligne ; message exact de clôture ; bascule automatique à 10 h pile sans rechargement (formulaire ouvert fermé) ; contrôle repris à l'envoi ; les collègues n'y sont pas soumis.
5. **Un ticket restaurant par commande** : un jour avec au moins un plat au ticket est « sur place » uniquement, et le montant d'une commande compte au plus **un** ticket, quels que soient le nombre de plats et de portions au ticket (le script, lui, n'en sait rien).

---

## 3. Points d'attention consolidés

Gravité : **bloquant** (à traiter avant ou pendant la migration), **gênant** (défaut visible ou risque réel), **cosmétique**. « Source » renvoie au fichier et au numéro du point d'attention d'origine (« PA »).

### (a) Bugs ou incohérences du frontend actuel — corrigeables dans React sans toucher au backend

| # | Point | Source | Gravité | Recommandation |
| --- | --- | --- | --- | --- |
| a-1 | Après déconnexion (bouton « Client » ou inactivité), l'état complet (noms, e-mails, observations) reste en mémoire jusqu'à la prochaine actualisation (≤ 3 min). | `06` PA 1 | bloquant | À la déconnexion, remplacer immédiatement l'état par l'état public (copie locale ou relecture `GET`). |
| a-2 | Aucun délai d'expiration sur les lectures et écritures : un envoi bloqué laisse « Envoi en cours… » indéfiniment. | `02` PA 1 | gênant | `AbortController` (ex. 30 s pour une écriture) puis message « vérifiez avant de renvoyer », le `requestId` protégeant du doublon. |
| a-3 | Messages techniques bruts en anglais (`Failed to fetch`, `Unexpected token '<'…`) affichés en toast lors d'une panne pendant une écriture. | `02` PA 2, `04` § 6.3 | gênant | Traduire les erreurs réseau / JSON en un message français distinguant hors ligne et service muet. |
| a-4 | Formulaire public ouvert = plus aucune actualisation, sans limite de durée ; rattrapage seulement si l'onglet était caché ; place restante et légende « N au maximum » non rafraîchies après une erreur. | `03` PA 1-2, `04` PA 1 | gênant | Continuer à actualiser les données sous un formulaire ouvert (l'état de formulaire étant séparé de l'état serveur) et relire après une erreur de places. |
| a-5 | Pas de contrôle client du maximum R1 (légende « N au maximum » non appliquée) ni du stock R2 (attribut `max` seul) ; l'erreur R1 n'apparaît qu'en toast. | `04` PA 1-2 | gênant | Valider côté client comme l'ajout collègue, et placer l'erreur serveur sous la rangée concernée. |
| a-6 | `confirmed` vide (aucun plat disponible) ferme le formulaire et perd les saisies, alors qu'une erreur classique les conserve. | `04` PA 3 | gênant | Garder le formulaire ouvert avec les quantités et relire l'état. |
| a-7 | À 10 h pile, un formulaire Aristide ouvert est fermé sans explication et ses saisies sont perdues. | `03` PA 7 | gênant | Fermer avec un message explicite (toast ou note dans la fiche). |
| a-8 | Toasts qui se chevauchent (minuteur non réinitialisé) ; erreurs annoncées en `polite`. | `04` PA 5, `06` PA 16 | gênant | Une file ou un minuteur réinitialisé ; `role="alert"` pour les erreurs. |
| a-9 | Focus perdu sur `body` après une réservation réussie ; erreur « Choisissez au moins un plat. » sans champ associé ni déplacement du focus. | `04` PA 6-7 | gênant | Focaliser le récapitulatif ; relier l'erreur au groupe de plats (`fieldset` + `aria-describedby`). |
| a-10 | Doublon (`_duplicate`) : toast seul, aucun récapitulatif pour l'utilisateur dont la première réponse s'est perdue. | `04` PA 10 | gênant | Afficher un récapitulatif « déjà enregistrée » reconstruit depuis les saisies. |
| a-11 | Les impressions R2 et le résumé du lendemain comptent un ticket **par portion** (« 3 tickets restaurant » pour une seule commande), contrairement à l'invariant 5. | `07` PA 1 | gênant | Agréger par client / commande avec la règle `orderAmounts` (un ticket par commande). |
| a-12 | Sélectionner un jour dans un restaurant ferme le formulaire public et le récapitulatif **de l'autre** restaurant (état unique pour la page). | `05` PA 8, `09` PA 2 | gênant | État de formulaire et de récapitulatif par restaurant (à valider, voir c-11). |
| a-13 | Déconnexion avec le sélecteur de date ouvert : `datePicker.rest` n'est pas remis à zéro et l'actualisation automatique reste bloquée. | `06` PA 2 | gênant | Réinitialiser tout l'état d'interface collègue à la déconnexion. |
| a-14 | Les autres états d'édition collègue (formulaires ouverts, brouillon de plats, Paramètres) survivent à la déconnexion et réapparaissent à la connexion suivante. | `06` PA 3 | cosmétique | Même correctif que a-13. |
| a-15 | « Ouvrir un jour » accepte une date passée (valeur par défaut = jour sélectionné, éventuellement passé) ; rouvrir un jour R1 existant écrase sa capacité sans avertissement (« déjà ouvert » non bloquant). | `06` PA 4-5 | gênant | Refuser une date passée et demander confirmation (ou proposer « Modifier ce jour ») sur un jour déjà ouvert. |
| a-16 | Lignes de plats incomplètes ignorées en silence dans « Ouvrir un jour » R2 dès qu'une ligne est valide. | `06` PA 7 | gênant | Signaler chaque ligne incomplète. |
| a-17 | Ajout manuel R2 : « À emporter » proposé par défaut même un jour au ticket ; modification R2 sans contrôle de stock côté page ; maximum de modification R1 promettant de garder ses couverts alors que le script refuse. | `06` PA 13-15 | gênant | Appliquer côté collègue la règle ticket → sur place (au moins par défaut) et les mêmes contrôles que le script. |
| a-18 | Paramètres : un champ vidé est ignoré, on ne peut donc jamais effacer un paramètre ; une requête par champ, enregistrement partiel en cas d'erreur. | `06` § 2.2 | cosmétique | Permettre d'effacer (le script accepte `""`, remplacé alors par son défaut) et afficher le détail d'un échec partiel. |
| a-19 | Suppression en deux clics : l'ancien minuteur de 4 s peut désarmer prématurément un réarmement rapide. | `06` PA 17 | cosmétique | Annuler le minuteur à chaque armement / désarmement. |
| a-20 | `Annuler` reste actif pendant l'envoi (la réservation est enregistrée quand même) ; l'avertissement d'ajustement R2 masque celui d'échec d'e-mail. | `04` PA 8, 11 | cosmétique | Désactiver « Annuler » pendant l'envoi ; cumuler les deux avertissements. |
| a-21 | Toast « Impossible de charger les données. Réessayez. » inatteignable (l'encadré n'existe que tant qu'aucun chargement n'a réussi) ; alerte d'échec réannoncée toutes les 3 min avant le premier succès. | `03` § 3.2, PA 6 | cosmétique | Supprimer le code mort ; ne réannoncer que si le message change. |
| a-22 | Copie locale sans etag après une session collègue (lecture complète à la visite suivante) ; lecture anticipée perdue si l'etag du `<head>` diffère de celui de `loadCache`. | `03` PA 3, 9 | cosmétique | Ne sauvegarder la copie qu'à partir d'un état public portant un etag. |
| a-23 | Calendrier : libellé de semaine à cheval sur deux mois ambigu (« 28 – 4 oct. 2026 ») ; Page ↑ / ↓ débordant en fin de mois ; jours hors mois cliquables sans changer de mois ; fermeture de 10 h et jour R2 sans plat non reflétés par la pastille. | `05` PA 1-2, 5, 7, 10 | cosmétique | Libellé « 28 sept. – 4 oct. 2026 », borner au dernier jour du mois, refléter la clôture dans l'`aria-label`. |
| a-24 | Impression : texte « Aucun jour ouvert pour demain. » aussi hors résumé ; résumé R2 « portion(s) » et « {Nom}: » ; fenêtre jamais refermée ; regroupement R2 par nom + classe + contact fragile ; aucune feuille `@media print` sur la page principale. | `07` PA 3-4, 6-9, `08` PA 4 | cosmétique | Corriger les textes et accords ; impression en iframe ou route dédiée (`07` § 9). |
| a-25 | `<h1>` « … et Aristide » et `<title>` codés en dur, non mis à jour par `name2` ; détection « Configuration manquante » limitée à `COLLE_ICI`. | `03` PA 4-5, `08` PA 3 | cosmétique | Dériver le titre des paramètres ; afficher le bandeau si l'URL est absente ou invalide (variable de build). |
| a-26 | Dette CSS : `.tag`, `.admin-on`, `ICONS.eye` inutilisés ; `font-size: 15px` et quelques largeurs en dur ; thème vert qui redéfinit `--text-muted`. | `08` PA 6-8 | cosmétique | Nettoyer à la migration ; transformer les valeurs en jetons. |

### (b) Limites du backend `Code.gs` — hors périmètre, à contourner côté client ou à signaler

| # | Point | Source | Gravité | Recommandation |
| --- | --- | --- | --- | --- |
| b-1 | Réservations publiques sans authentification ; le script ne contrôle ni cut-off, ni jour passé, ni mode « sur place », ni appartenance des plats à la date, ni nom / classe / format d'e-mail — seulement quantités et places. | `01` PA 6, `02` PA 3 | gênant | Garder tous les contrôles côté client et signaler le risque au responsable du script. |
| b-2 | Aucune heure serveur : « aujourd'hui », le cut-off et « jour passé » dépendent de l'horloge et du fuseau de l'appareil. | `01` PA 7 | gênant | Utiliser l'heure de Paris (`Intl` avec `timeZone: 'Europe/Paris'`) plutôt que le fuseau de l'appareil — à valider (c-12). |
| b-3 | Suppression d'un plat : ses réservations restent orphelines, sans e-mail, encore comptées dans le panneau « Demain » ; suppression d'un jour sans e-mail aux inscrits. | `01` PA 3, `02` PA 6, `06` PA 10-11 | gênant | Côté client : avertir avant de supprimer un plat / un jour qui a des réservations ; filtrer les orphelines des totaux. |
| b-4 | Restants négatifs possibles : `addDayR1` écrase la capacité, `editItemR2` / `addItemR2` ne contrôlent pas le stock. | `01` PA 4, `05` PA 9, `06` PA 4, 9 | gênant | Contrôler côté client avant envoi (capacité ≥ réservés, stock ≥ réservé). |
| b-5 | Ticket codé dans le nom du plat (« (ticket restaurant) ») ; les e-mails comptent un plat au ticket comme « sans prix » et ignorent la règle « un ticket par commande ». | `01` PA 5 | gênant | Conserver le codage à l'identique ; signaler l'incohérence des e-mails. |
| b-6 | Aucune limitation des essais de mot de passe. | `02` PA 11 | gênant | Délai progressif côté client (dissuasif seulement) ; signaler. |
| b-7 | Actualisation collègue coûteuse (état complet à chaque fois, sans etag ni mémoire) ; ajout manuel = deux allers-retours. | `02` PA 8-9 | gênant | Accepter ; éventuellement espacer l'actualisation collègue. |
| b-8 | Prix `0` enregistré comme « sans prix » (`price \|\| ''`) ; `itemPriceText` n'affiche rien pour 0. | `01` PA 9, `06` PA 8 | cosmétique | Refuser 0 côté client ou l'assimiler explicitement à « sans prix ». |
| b-9 | Regex e-mail client plus stricte que celle du script ; `Timestamp` tronqué à la date ; noms par défaut serveur (`Restaurant 1/2`) différents de ceux du client. | `01` PA 1-2, 8 | cosmétique | Garder les défauts client alignés sur la configuration réelle. |
| b-10 | `editBookingR1` ignore `qte` / `prixTotal` envoyés ; `setConfigField` sans liste blanche ; `editDayR1` sur une date inexistante réussit sans effet ; repli `checkPassword` inutile si le script est à jour. | `02` PA 4-5, 7, 10 | cosmétique | Ne plus envoyer les champs ignorés ; retirer le repli après vérification du script déployé. |
| b-11 | Rappels de la veille envoyés par ligne (une commande de 3 plats = 3 e-mails) ; modification faite à la main dans Sheets visible en 5 min le jour, seulement vers 6 h le soir. | `02` § 6.1, § 3.5 | cosmétique | Signaler ; documenter `viderCache()` pour les gestionnaires. |
| b-12 | Pas de « Modifier ce jour » pour R2 ; le script accepte pourtant `addDayR2` avec `items: []` (mise à jour de note, thème, « ouvert par »). | `06` PA 6 | gênant | Possible côté React sans toucher au script : formulaire « Modifier ce jour » R2 appelant `addDayR2` sans plats (décision c-9). |

### (c) Décisions produit à prendre par l'utilisateur avant / pendant la migration

| # | Décision | Source | Gravité | Recommandation |
| --- | --- | --- | --- | --- |
| c-1 | **Easter egg** : 5 clics en 2 s sur le logo ouvrent une vidéo YouTube (« Rickroll »), accessible au public. | `03` PA 8, `08` PA 9, `09` § 7 | gênant | Le retirer (site d'établissement scolaire), ou le garder en connaissance de cause. |
| c-2 | **Mot « complet »** : aucun texte « Complet » / « Bientôt complet » dans les fiches (couleur et chiffres seulement), alors que la charte exige un mot avec chaque couleur d'état ; aucune explication quand « Réserver » est absent (jour passé, complet, plats épuisés). | `04` PA 12, `05` PA 3-4, `08` PA 1 | gênant | Ajouter un badge « Complet » / « Bientôt complet » et une phrase d'explication. |
| c-3 | **Textes incohérents à unifier** : « (hors plats sans prix indiqué) » vs « (hors plats sans prix) » ; pastille toujours « couverts » (même 1) ; dates sans « 1er » à l'écran mais avec dans les e-mails ; « couvert(s) » des messages du script ; texte initial « Total : 0,00 € » aussitôt remplacé. | `04` PA 4 | cosmétique | Choisir une forme par cas ; les messages du script restent tels quels. |
| c-4 | **Contact à la modification** : obligatoire (« Téléphone ou email », format libre) alors que l'ajout manuel le rend facultatif (e-mail vérifié s'il est saisi) ; libellé différent du public. | `06` PA 12 | gênant | Rendre l'e-mail facultatif à la modification aussi, avec le même libellé et le même contrôle qu'à l'ajout. |
| c-5 | Bandeau « Configuration manquante » au tutoiement (toléré par la charte pour les collègues, mais visible du public). | `03` PA 5, `08` PA 2 | cosmétique | Passer au vouvoiement, ou ne l'afficher qu'en développement. |
| c-6 | Libellé de charte « Revenir en mode client » inexistant (retour par le segment « Client »). | `06` PA 18, `08` PA 5 | cosmétique | Mettre la charte à jour, ou ajouter ce bouton en mode collègue. |
| c-7 | Panneau « Demain » et « Résumé pour demain » en doublon (chiffres pouvant différer). | `07` PA 5 | cosmétique | Fusionner en un seul panneau. |
| c-8 | Tri des listes : R1 dans l'ordre d'enregistrement, R2 trié par classe puis nom, listes du lendemain non triées. | `07` PA 2 | cosmétique | Choisir un tri commun (classe puis nom ?). |
| c-9 | Ajouter « Modifier ce jour » pour R2 (voir b-12). | `06` PA 6 | gênant | Oui, sans changement de script. |
| c-10 | Report des saisies d'un restaurant à l'autre (ids partagés) : effet involontaire mais pratique. | `04` PA 9 | cosmétique | Décider de le garder volontairement (pré-remplissage) ou non. |
| c-11 | Un formulaire public / récapitulatif unique pour la page vs un par restaurant ; schéma d'URL à deux dates ou navigation par restaurant ; reprise du mode collègue après rechargement. | `05` PA 8, `09` PA 1-4 | gênant | Trancher avant de figer le routeur (proposition `09` § 1). |
| c-12 | Session collègue : mémoire seule (perdue au rechargement) ou `sessionStorage` ; fuseau de référence (appareil ou Europe/Paris). | `06` § 11, `01` PA 7 | gênant | Conserver la mémoire seule (invariant 1) ; passer à l'heure de Paris. |
| c-13 | Ajouts collègue possibles sur les jours passés ; pastille R2 agrégée (verte alors que le plat principal est épuisé). | `05` PA 6, 11 | cosmétique | Valider ces comportements ou les restreindre. |

---

## 4. Journal de vérification

### 4.1 Ce qui a été vérifié

- Lecture intégrale de tout le JavaScript (`donnees.js`, `outils.js`, `impression.js`, `interface.js`, `collegue.js`, `reservation.js`, `calendrier.js`, `main.js`), d'`index.html` et de `Code.gs`, puis des dix fichiers de spec ligne à ligne, confrontés au code.
- Citations : extraction automatique de toutes les chaînes citées (entre guillemets de code ou « ») et recherche dans le code ; chaque écart examiné à la main (la plupart sont des chaînes composées dynamiquement, correctes).
- Espaces insécables : seuls `formatEuro` et `dash` en contiennent (vérifié à l'octet) ; les autres séparateurs (« — » des lignes de réservation et du récapitulatif, « · », e-mails du script) utilisent des espaces normales.
- Constantes (délais, seuils, clés `localStorage`, heures, TTL, verrous, déclencheurs), noms d'actions et de champs de l'API contre `doPost` et les fonctions de `Code.gs`, ordre des contrôles serveur, règles conditionnelles des fiches et formulaires, séquences de démarrage, d'actualisation, de bascule à 10 h et de déconnexion.
- Valeurs CSS citées (jetons, seuils d'opacité, points de rupture, durées, couleurs d'état) contrôlées par sondage dans `design-system.css` et `app.css` ; règles de la charte vérifiées dans le texte du PDF et le README.
- Points demandés explicitement, tous présents : écran « Configuration manquante » (`03` § 3), voile et délai de 350 ms (`03` § 4.2), « Réessayer » (`03` § 3.2), `navigator.onLine` (`02` § 1.5, `03` § 3.1), easter egg (`09` § 7), panneau « Demain » et résumé du lendemain (`06` § 2.1, `07` § 5), sélecteur de date (`06` § 3), `TEXTS_KEY` (`03` § 1.2), bascule à 10 h (`03` § 5.3), conservation des saisies et du focus (`03` § 5.4, ajouté), suggestion de prix (`08` § 6.4), `aria-busy` (`03` § 4.1, `03` § 5.1).
- Renvois entre fichiers (tous les « `0X` § n ») et cohérence des mêmes constantes / messages / règles d'un fichier à l'autre.

### 4.2 Corrections apportées (fichier — avant → après)

| Fichier | Avant → après |
| --- | --- |
| `01` § 3.7 | Citation inventée « À Aristide, l'ajout reste possible après 10 h » → commentaire réel de `collegue.js` ; précision : pas de message de clôture en mode collègue. |
| `01` § 2.3, § 2.6 | Contact R2 « collègue : facultatif » → facultatif à l'ajout, **obligatoire** (« Téléphone ou email », format libre) à la modification ; idem précisé pour R1. |
| `01` PA 3 | Pseudo-citation « Demain : N portions réservées » → libellé réel du panneau. |
| `03` § 3.2, `04` § 9 | Toast « Impossible de charger les données. Réessayez. » signalé inatteignable. |
| `03` PA 5 | « Tutoiement contraire à la charte » → la charte le tolère pour les collègues et admet le « ⚠ » (contradiction avec `08` levée). |
| `03` § 5.4 (nouveau) | Conservation des saisies et du focus à chaque `render()` : `captureUi` / `restoreUi`, rendus partiels `PARTS`, `resetFields`, recalcul des totaux, repli du focus. |
| `04` § 3 | `selectDate` remet aussi `dateChoice[rest]` à `null` et ferme le formulaire quel que soit le restaurant. |
| `04` § 5.4 | Focus sur la 1re erreur : ordre du DOM (pas des règles), `.date-trigger` inclus, conteneur sans champ ignoré. |
| `05` § 4.6 | Séparateur des lignes de réservation : « espace insécable avant » → espaces normales (`join(' — ')`) ; `PrixTotal` de 0 non affiché. |
| `07` § 1, § 3 | « 🖨 Imprimer la liste » (emoji supposé) → icône SVG `ICONS.print` ; `PrixTotal` de 0 laissé vide. |
| `08` § 4.10, § 6.1 | Filet « jaune » → `--warning` (ocre orangé), cohérent avec `04`. |
| `08` PA 7 | Citation « aucune taille en dur » → règle exacte du README (« Aucune couleur, taille ou rayon en dur ») ; la charte PDF ne parle que des couleurs. |
| `02` § 6 (nouveau), PA 11 | Tâches planifiées et e-mails du script (rappels de la veille, annulation, archivage) ; absence de limitation des essais de mot de passe. |
| Renvois | `00` « `01` § 3.4 » → § 3.5 ; `01` « `04` § 5.6 » (inexistant) → `04` § 4.3 / § 5.3 et `03` § 5.3 ; `02` « `03` § 4 » → `03` § 3 / § 3.1 ; renvois vagues (« spécifié ailleurs », « autre spécification », « spécification du calendrier ») remplacés par le numéro de fichier dans `00`, `01`, `02`, `04`. |

Aucune contradiction de constante n'a été trouvée entre fichiers (350 ms, 6 s, 1,5 s, 3 min, 3,5 s, 4 s, 10 min, 10 h / 12 h, 14 jours, 60 jours, 6 h, 20 s sont cités partout avec la même valeur).

### 4.3 Ce qui n'a pas pu être vérifié

- **Comportement réel dans un navigateur** : la page n'a pas été exécutée (pas d'accès au déploiement Apps Script depuis cet environnement) ; animations, transitions de vue, rendu des boîtes de marge `@page`, comportement de `inert`, de `document.fonts.ready` et des bloqueurs de fenêtres sont décrits d'après le code.
- **Script déployé** : la spec suppose que le déploiement correspond à `Code.gs` du dépôt (le repli `checkPassword` du client laisse penser qu'une version plus ancienne a pu exister) ; redirection 302, CORS et pages d'erreur HTML de Google sont décrites d'après les commentaires du code et le fonctionnement connu d'Apps Script.
- **E-mails** : contenus tirés du code ; ni l'envoi, ni le quota `MailApp`, ni le rendu dans les messageries n'ont été testés.
- **CSS** : toutes les valeurs de `08` n'ont pas été recontrôlées une à une (sondage sur les jetons, couleurs d'état, points de rupture, durées, composants principaux).
- **Charte PDF** : seule la couche texte a été lue ; les maquettes visuelles (badges, jauges) ne l'ont pas été.

### 4.4 Vérification croisée avec `original-app-spec.md`

Source : `/home/user/appresaaristide/docs/original-app-spec.md` (spécification indépendante, en anglais, écrite pour une autre réécriture). **Elle décrit une version antérieure de l'application** : un `index.html` monofichier de 1 251 lignes (correspond au commit `0fbfb0d` du 17 septembre 2026 dans l'historique de ce dépôt) et le `Code.gs` initial (`d3b81a2`, 11 septembre 2026). Depuis, le frontend a été découpé en `js/*.js` et largement réécrit, et `Code.gs` a été mis à jour trois fois (30 septembre et 1er octobre). Chaque divergence a été tranchée en relisant le code actuel ; **dans tous les cas, notre spec est conforme au code actuel** et l'autre décrit l'ancienne version.

| Sujet | `original-app-spec.md` | Code actuel / notre spec | Qui a raison |
| --- | --- | --- | --- |
| Lecture publique | `GET` renvoie l'état complet nominatif | état public anonymisé + `etag`, `?since=` ; état complet via `getAdminState` (`02` § 3, § 4.3) | notre spec |
| Connexion | `checkPassword` ; mot de passe `ResaRestos2026` en dur dans `Code.gs` | `getAdminState` (repli `checkPassword`) ; propriété de script `ADMIN_PASSWORD` (`02` § 2) | notre spec |
| Actions du script | `Code.gs` « périmé », sans `addBookingR2Multi`, `edit*`, etc. | toutes les actions utilisées sont implémentées (`02` § 4.1) | notre spec |
| Verrou | 10 s, réservations seulement | `tryLock(20000)` pour toute action sauf `checkPassword` / `getAdminState` (`02` § 1.7) | notre spec |
| Seuil « bientôt complet » | `rem <= max(2, round(cap × 0,2))` | `rem < cap × 0,5` (`01` § 3.3) | notre spec |
| Cut-off | aucun, « aujourd'hui réservable toute la journée » | 10 h pour Aristide, message 12 h, bascule automatique (`01` § 3.7) | notre spec |
| Actualisation | voile bloquant à chaque actualisation ; pause si formulaire public ou `<input>` focalisé | silencieuse ; pause aussi si `SELECT`/`TEXTAREA`, envoi en cours, onglet caché, sélecteur de date ouvert (`03` § 5.1) | notre spec |
| Échec de chargement | toast « Impossible de charger les données. Réessaie. », pas de bouton | encadré `role="alert"` + « Réessayer », message hors ligne / service muet (`03` § 3) | notre spec |
| « Demain » du résumé | `toISOString()` (UTC, bogue) | date locale `addDaysISO(todayISO(), 1)` (`07` § 1) | notre spec |
| Suppressions | `confirm()` natif | suppression en deux clics « Confirmer ? » (`06` § 5.2) | notre spec |
| Modification de réservation | code mort, aucun bouton | boutons « Modifier » reliés, formulaires détaillés (`06` § 7) | notre spec |
| Réservation par un collègue | impossible | « + Ajouter une personne » (`06` § 8) | notre spec |
| Validations | toasts « Merci de remplir… » au tutoiement | messages sous les champs, vouvoiement (`04` § 5) | notre spec |
| Formulaires publics | « Téléphone ou email (si tu veux une confirmation) », « Choisis tes plats… », « Réserver pour ce jour » | « Adresse email » obligatoire, « Choisissez vos plats et quantités », « Réserver » (`04` § 5) | notre spec |
| Succès R2 | toasts à priorité (« Réservation partielle… », « Réservation confirmée ! Total : … ») | récapitulatif + toast « Réservation confirmée. » (`04` § 6.3, § 7) | notre spec |
| Valeurs par défaut client | `Restaurant 1` / `Restaurant 2` ; sous-titre « Table côté restaurant 1 … » | `Restaurant Pédagogique` / `Aristide` (`01` § 4.1, `03` § 2.2) | notre spec |
| Bandeau de configuration | « … (tout en haut du script). » | « … (tout en haut du fichier, dans le <head>). » (`03` § 3) | notre spec |
| Mode d'accès | champ + bouton « Mode collègue », « Revenir en mode client », Entrée inopérante | segments Client / Collègue, panneau dépliant, Entrée / Échap (`06` § 1) | notre spec |
| `addDayR2` sur un jour existant | supprime et recrée les plats (réservations orphelines) | met à jour le jour et n'ajoute que les plats de nom nouveau (`02` § 4.7) | notre spec |
| Impression | Arial, `print()` après 300 ms, colonne vide R2 en `colspan="5"` | jetons de la charte, A4 paysage, `fonts.ready` ≤ 2 s + 100 ms, `colspan` = nombre de colonnes (`07`) | notre spec |
| `escapeHtml`, `<datalist>` | guillemets non échappés ; datalists en double | guillemets échappés ; un seul `<datalist id="price-suggestions">` (`00` § 3, `08` § 6.4) | notre spec |
| Design | Fraunces, thème sombre, colonnes beige / pêche, or / sauge / brique | Outfit + Work Sans, fond clair, vert / magenta, jetons `design-system.css` (`08`) | notre spec |
| Accords | « couvert(s) réservé(s) », « Chargement... » | accords automatiques (« 1 couvert réservé »), « Chargement… » (`06` § 2.1, `03` § 4.2) | notre spec |

Points communs aux deux specs et toujours vrais (confirmés dans le code) : `text/plain` pour éviter le pré-vol CORS, erreurs en HTTP 200, semaine commençant le lundi et 42 cases en vue mois, navigation sans changer la sélection, clic sur un jour hors mois sans changement de mois, minuteur de toast non annulé, Paramètres envoyés champ par champ (champ vidé ignoré), pas de « Modifier ce jour » pour R2, `<h1>` codé en dur, prix 0 traité comme « sans prix ».

**Ajouts faits à notre spec grâce à l'autre** (vérifiés dans le code actuel avant ajout) :
- `02` § 6 : e-mails de rappel de la veille (objets et corps exacts), e-mails d'annulation, déclencheurs `setupDailyTrigger` et archivage — couverts par l'autre spec pour l'ancien `Code.gs`, absents de la nôtre.
- `02` PA 11 : aucune limitation des essais de mot de passe (toujours vrai).
- `05` § 4.6 et `07` § 3 : un `PrixTotal` égal à 0 n'est pas affiché (test de vérité, toujours vrai).
