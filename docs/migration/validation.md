# Valider le nouveau site avant la bascule

*Procédure de la phase P7 (PLAN § 1.5, critère S9). Rédigée le 4 octobre 2026.*

Pendant une à deux semaines, avant que le nouveau site remplace l'ancien, vous l'utilisez comme d'habitude et vous notez ce qui ne va pas. Le responsable du site prépare un poste (partie 2) ; les collègues suivent ensuite les parties 1 et 3 à 7. À la fin, le responsable donne son accord par écrit.

## 1. Avant tout : vous travaillez sur les vraies données

Le site à valider parle au même script Google et à la même feuille que le site actuel.

- Chaque réservation que vous faites est une vraie réservation. Elle apparaît aussitôt sur le site actuel, que le public consulte.
- Le script envoie de vrais e-mails : une confirmation quand le contact est une adresse e-mail, un rappel la veille du jour réservé, et un e-mail d'annulation quand un collègue supprime une réservation.
- Un jour que vous ouvrez pour tester est visible du public dès sa création : quelqu'un peut le réserver.

Pour tester sans gêner personne :

1. Mettez votre propre adresse e-mail dans le champ « Contact », jamais celle d'un élève ou d'un client.
2. Ouvrez les jours de test à une date lointaine (au moins trois semaines plus tard) et écrivez « TEST, ne pas réserver » dans le thème.
3. Supprimez chaque jour de test le jour même, réservations comprises (« Supprimer ce jour »). La suppression d'un jour n'envoie aucun e-mail.
4. Ne touchez pas au panneau « Paramètres » (noms des restaurants, contact d'annulation, tarifs) : il modifie aussi le site actuel. Si vous devez le tester, notez les valeurs avant, puis remettez-les tout de suite.
5. N'utilisez pas les jours de service réels pour vos essais de réservation. Lire leurs listes et les imprimer ne modifie rien : vous pouvez le faire.

## 2. Préparer le site (le responsable)

Le nouveau site n'est pas encore en ligne. Vous le faites tourner sur un poste, de l'une des deux façons ci-dessous. Il faut sur ce poste Node.js 22.18 ou plus récent, pnpm 12.8.1 et une copie du dépôt (README, section « Développement »).

L'adresse du script (l'URL qui se termine par `/exec`) ne s'écrit dans aucun fichier du dépôt ni dans ce document. Elle se met à un seul de ces deux endroits : le fichier `.env.real.local` de votre poste, ou la variable de dépôt `VITE_APPS_SCRIPT_URL` sur GitHub.

### 2.1 Première façon : construire le site sur le poste

1. Placez-vous sur la branche du nouveau site et récupérez la dernière version :

   ```sh
   git switch claude/frontend-react-migration-lw5zfz
   git pull
   pnpm install
   ```

2. Copiez `.env.example` en `.env.real.local` et remplacez l'exemple par l'URL `/exec` du script. Git ignore ce fichier : il reste sur votre poste. Ne l'envoyez à personne.
3. Construisez le site avec ce fichier, puis lancez le serveur :

   ```sh
   pnpm exec vite build --mode real
   node scripts/post-build.ts
   pnpm serve
   ```

4. Ouvrez `http://127.0.0.1:4311/reservations-restaurants/` dans le navigateur du poste. Le serveur tourne tant que la fenêtre de commande reste ouverte ; `Ctrl+C` l'arrête.

Après chaque `git pull`, refaites l'étape 3 pour tester la dernière version.

### 2.2 Seconde façon : télécharger le site construit par GitHub

1. Une seule fois, un administrateur du dépôt crée la variable : sur GitHub, **Settings > Secrets and variables > Actions**, onglet **Variables**, bouton **New repository variable**, nom `VITE_APPS_SCRIPT_URL`, valeur = l'URL `/exec`. La bascule (P8) utilisera la même variable.
2. Dans l'onglet **Actions**, ouvrez le workflow **CI**, puis la dernière exécution verte sur la branche `claude/frontend-react-migration-lw5zfz`. Une exécution lancée avant la création de la variable ne convient pas.
3. En bas de la page, section **Artifacts**, téléchargez `dist-client` (GitHub le garde 30 jours).
4. Dans votre copie du dépôt, videz le dossier `dist/client` (créez-le s'il manque), décompressez-y l'archive : vous devez y voir `index.html`, `404.html` et un dossier `assets`.
5. Lancez `pnpm serve` et ouvrez `http://127.0.0.1:4311/reservations-restaurants/`.

### 2.3 Contrôler le site avant de le confier aux collègues

- Aucun bandeau « Configuration manquante » en haut de la page. S'il apparaît, l'URL manquait au moment de la construction : reprenez l'étape 2 de la section 2.1, ou l'étape 2 de la section 2.2 avec une exécution plus récente.
- Aucun bandeau « Données réelles » : il signale le serveur de développement (`pnpm dev:real`), qui ne sert pas à la validation.
- Les jours et les places affichés sont ceux du site actuel, `https://thegaudis.github.io/reservations-restaurants/`.

### 2.4 Ouvrir le site depuis une tablette ou un iPhone

`pnpm serve` ne répond qu'au poste lui-même. Pour les tablettes, lancez à la place :

```sh
pnpm serve --host 0.0.0.0
```

Relevez l'adresse du poste sur le réseau (sous Windows, commande `ipconfig`, ligne « Adresse IPv4 » ; sur un Mac, **Réglages Système > Réseau**). Sur la tablette, connectée au même réseau, ouvrez `http://ADRESSE-DU-POSTE:4311/reservations-restaurants/`. Si la page ne s'ouvre pas, le pare-feu du poste ou le réseau du lycée bloque la connexion : notez-le dans un retour (partie 6), le responsable informatique du lycée peut ouvrir le port 4311.

## 3. Le mode collègue avec le vrai mot de passe

Le nouveau site utilise le mot de passe actuel du mode collègue. Vérifiez :

- [ ] « Collègue », le mot de passe, puis « Valider » : le message « Mode collègue activé. » s'affiche et l'adresse de la page se termine par `/collegue`.
- [ ] Les noms des personnes apparaissent sous les fiches du jour, comme sur le site actuel.
- [ ] Le panneau « Demain » donne les mêmes nombres de couverts et de portions que le site actuel. Seule différence attendue : le nouveau site ne compte plus les portions d'un plat supprimé.
- [ ] Un mot de passe faux affiche « Mot de passe incorrect. ».
- [ ] « Client » vous déconnecte : les noms disparaissent de la page.
- [ ] Après 10 minutes sans toucher la page, le site vous déconnecte avec le message « Déconnecté du mode collègue après 10 minutes d'inactivité. ».
- [ ] Un rechargement de la page vous déconnecte, comme aujourd'hui ; sur une page collègue, le site redemande le mot de passe puis vous ramène à la même page.

## 4. Les parcours à tester

Cochez au fur et à mesure. Les réservations se font sur vos jours de test (partie 1).

**Page publique**

- [ ] La page s'ouvre et montre les deux calendriers et les fiches du jour.
- [ ] « Semaine » et « Mois », les flèches ‹ ›, « Aujourd'hui » ; au clavier, les flèches déplacent le jour choisi dans le calendrier.
- [ ] Rechargez la page : le calendrier de la visite précédente s'affiche tout de suite, puis les places se mettent à jour.
- [ ] Restaurant 1 : « Réserver » sur un jour de test, formulaire envoyé vide (les messages s'affichent sous les champs), puis rempli. Le récapitulatif s'affiche et vous recevez l'e-mail de confirmation.
- [ ] Restaurant 2 : même chose avec une commande de plusieurs plats sur un jour de test.

**Mode collègue**

- [ ] « Ouvrir un jour » pour le restaurant 1 et pour le restaurant 2 (avec au moins un plat), à une date de test.
- [ ] Modifier ce jour, modifier un plat.
- [ ] Modifier une réservation, ajouter une personne, supprimer une réservation (vous recevez l'e-mail d'annulation).
- [ ] « Imprimer la liste » d'un jour réel des deux restaurants, et « Imprimer » dans le panneau « Demain ».
- [ ] « Supprimer ce jour » pour chaque jour de test, puis vérifiez sur le site actuel qu'ils ont disparu.

## 5. Vérifications particulières

Notez pour chacune l'appareil, le système et le navigateur utilisés.

- [ ] **Lecteur d'écran** : NVDA (Windows) ou VoiceOver (Mac, iPad, iPhone). Parcourez un calendrier : chaque case annonce la date et les places. Envoyez un formulaire incomplet : le lecteur annonce les erreurs. Après une réservation, il annonce le récapitulatif ; il lit aussi les messages passagers comme « Mode collègue activé. ».
- [ ] **Safari sur iPhone ou iPad, et les tablettes de l'établissement** (partie 2.4) : la page publique, une réservation sur un jour de test, la connexion collègue. Relevez le modèle de chaque appareil et la version du système (sur iPad : **Réglages > Général > Informations**).
- [ ] **Impression sur un poste du lycée**, avec son imprimante : une liste du jour et un résumé du lendemain, en A4 paysage. Le numéro « Page x / y » ne s'imprime qu'avec Chrome et Edge ; son absence dans un autre navigateur est attendue.
- [ ] **Montants au-delà de 999 €**, dans Chrome ou Edge, puis dans Safari : sur un jour de test du restaurant 1, ajoutez une personne avec assez d'extérieurs pour dépasser 1 000 € (laissez le contact vide : aucun e-mail ne part). Le montant s'affiche sur une ligne, avec une petite espace entre les milliers et les centaines (par exemple « 1 188,00 € ») et sans carré ni symbole bizarre, dans la liste des réservations de la fiche et sur la liste imprimée. Supprimez ensuite cette personne.

## 6. Signaler un problème

Un message par problème, envoyé au responsable du site. Copiez ce modèle :

```text
Date et heure :
Appareil, système et navigateur (exemple : iPad 9e génération, iPadOS 17.5, Safari) :
Page : publique ou collègue, restaurant, jour concerné
Ce que j'ai fait, étape par étape :
Ce que j'attendais :
Ce qui s'est passé (texte exact du message affiché, capture d'écran si possible) :
Gravité : bloquant / gênant / détail
```

Ces différences avec le site actuel sont voulues (liste complète : PLAN § 4.2) ; inutile de les signaler :

- L'impression se fait dans la page, sans ouvrir de nouvelle fenêtre.
- Un seul panneau « Demain » regroupe les totaux et le résumé des deux restaurants.
- Les impressions et les totaux comptent un seul ticket restaurant par commande.
- Les compteurs ont des boutons − et +, et la touche Entrée envoie le formulaire.
- Les dates écrivent « 1er » pour le premier du mois.
- L'adresse de la page garde le jour choisi, la vue et le formulaire ouvert : un rechargement les retrouve.
- Au chargement, des blocs gris occupent la page quelques dixièmes de seconde avant le calendrier.
- L'heure de clôture des commandes (10 h) suit l'heure de Paris, quel que soit le réglage de l'appareil.

## 7. Fin de la validation

- [ ] Tous les jours de test sont supprimés (vérifiez sur le site actuel).
- [ ] Les « Paramètres » ont leurs valeurs d'origine.
- [ ] Le responsable a reçu les retours ; chacun est corrigé ou reporté, avec une réponse à son auteur.
- [ ] Le responsable donne son accord écrit pour la bascule (critère S9) : sans cet accord, la phase P8 ne commence pas.
- [ ] Sur un poste partagé, le responsable supprime `.env.real.local` et le dossier `dist`.
