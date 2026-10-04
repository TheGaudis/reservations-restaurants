# Bascule vers le nouveau site

*Procédure de la phase P8 (PLAN § 7, R-04, R-05, R-29). Préparée le 4 octobre 2026 sur la branche `claude/p8-bascule`, avant la validation par les collègues (S9). Elle remplace la description de la pull request de bascule.*

Le propriétaire du dépôt (ou un administrateur) fait toutes les actions de ce document, dans l'ordre. Aucune ne revient à un agent. Comptez une heure, dont 25 minutes d'attente de la CI. Choisissez un après-midi sans service : pas avant 10 h (commandes du restaurant 2 en cours), pas pendant un service du restaurant 1.

Ce que contient la fusion : le site React à la racine du site publié, `legacy/` supprimé (l'ancien site reste au tag `v1-final`), le job `deploy` du workflow `CI` actif sur `main`, le README réécrit.

## 1. Avant le jour de la bascule

- [ ] **1.1 Le script déployé répond à `getAdminState`.** Le nouveau site n'a pas le repli `checkPassword` de l'ancien (b-10). Si la connexion collègue a marché pendant la validation (`validation.md` § 3), c'est fait. Sinon, depuis le poste du responsable, sans coller le mot de passe dans un ticket ni une PR :

  ```sh
  curl -sL -X POST -H 'Content-Type: text/plain;charset=utf-8' \
    -d '{"action":"getAdminState","password":"…"}' "https://script.google.com/macros/s/…/exec"
  ```

  La réponse doit être un état complet (`r1Days`, `r1Bookings` avec des noms…), pas `{ "error": … }`. Sinon : Apps Script, **Déployer > Gérer les déploiements**, crayon, **Version : Nouvelle version** (même URL `/exec`), puis recommencer.
- [ ] **1.2 Accord écrit des collègues (S9)** après la validation de `validation.md` ; retours traités ou reportés ; matrice de parité complète (`parite.md`) ; S1 à S8 verts (PLAN § 1.5).
- [ ] **1.3 Branche de bascule fusionnée dans l'intégration.** L'orchestrateur rebase `claude/p8-bascule` sur `claude/frontend-react-migration-lw5zfz`, la fusionne, et vérifie la CI de l'intégration : `check`, `browser`, `e2e` verts, `deploy` « skipped ».
- [ ] **1.4 Job `deploy` prêt** : `.github/workflows/ci.yml`, condition `github.ref == 'refs/heads/main'` et événement `push` ou `workflow_dispatch`. Une pull request ou une autre branche ne déploie jamais.
- [ ] **1.5 Pas de domaine propre** : **Settings > Pages** n'affiche aucun « Custom domain » ; le site reste sous `/reservations-restaurants/` (`BASE_PATH` du workflow).
- [ ] **1.6 Retour arrière répété à blanc** sur une fourche (partie 2).
- [ ] **1.7 Collègues prévenus** quelques jours avant, avec la date (message de la partie 7).

## 2. Répétition à blanc du retour arrière (sur une fourche)

But : vérifier sur un dépôt de test que la bascule et les deux retours arrière marchent et tiennent en 15 minutes, cache compris.

1. Sur la page du dépôt, **Fork**, sous un compte personnel. Gardez le nom `reservations-restaurants` (le site est construit pour `/reservations-restaurants/`) et décochez « Copy the `main` branch only ».
2. Dans la fourche, onglet **Actions** : **I understand my workflows, go ahead and enable them**.
3. **Settings > Pages**, **Source** : « Deploy from a branch », `main`, `/ (root)`. Attendez « pages build and deployment », puis ouvrez `https://<compte>.github.io/reservations-restaurants/` : l'ancien site s'affiche. Il lit les vraies données ; n'y réservez rien.
4. **Settings > Secrets and variables > Actions > Variables** : `VITE_APPS_SCRIPT_URL` = `https://script.google.com/macros/s/FAKE/exec`. Avec cette adresse factice, le nouveau site de la fourche n'atteint pas la vraie feuille : il affiche l'encadré d'erreur de chargement, ce qui suffit pour reconnaître la version servie.
5. Faites les étapes 3.1 à 3.7 de la partie 3 sur la fourche (tag, environnement, source, pull request de l'intégration vers `main` de la fourche, fusion). Notez l'heure de la fusion et celle où le nouveau site apparaît.
6. Faites la première façon de la partie 6 (branche `rollback`) en chronométrant : de la création de la branche à l'ancien site affiché en navigation privée. Revenez au nouveau site comme indiqué.
7. Faites la seconde façon (annulation de la fusion), chronométrez-la de même.
8. Notez les deux durées dans le journal ou un message à l'orchestrateur, puis supprimez la fourche (**Settings**, tout en bas, **Delete this repository**).

## 3. Bascule, dans l'ordre

- [ ] **3.1 Tag `v1-final` sur `main`** (dernier commit de l'ancien site) :

  ```sh
  git fetch origin
  git tag -a v1-final origin/main -m "Ancien site, dernier état avant la bascule"
  git push origin v1-final
  git ls-remote origin main "v1-final*"
  ```

  Les lignes `refs/heads/main` et `refs/tags/v1-final^{}` portent le même hash. Sans ligne de commande : **Releases > Draft a new release**, **Choose a tag** : `v1-final`, **Target** : `main`, **Publish release**.
- [ ] **3.2 Environnement `github-pages` : `main` autorisé.** **Settings > Environments > github-pages**, **Deployment branches and tags** : « Selected branches and tags », avec une règle `main` (**Add deployment branch or tag rule** si elle manque). Aucune autre branche.
- [ ] **3.3 Variable de dépôt `VITE_APPS_SCRIPT_URL`** = l'URL `/exec` du déploiement actuel, celle de `APPS_SCRIPT_URL` dans `index.html` de l'ancien site (`git show v1-final:index.html`), déploiement « Tout le monde ». **Settings > Secrets and variables > Actions > Variables**. Le dernier artefact `dist-client` validé par les collègues n'affichait pas « Configuration manquante » (D-05).
- [ ] **3.4 Pull request de bascule, sans fusionner.** **Pull requests > New pull request**, base `main`, compare `claude/frontend-react-migration-lw5zfz`, titre « Bascule : nouveau site React ». Attendez la CI de la PR : `check`, `browser`, `e2e` verts, `deploy` « skipped ». Si GitHub signale un conflit avec `main`, arrêtez et prévenez l'orchestrateur.
- [ ] **3.5 Source Pages « GitHub Actions », juste avant la fusion.** **Settings > Pages**, **Build and deployment**, **Source** : « GitHub Actions ». Obligatoire : en mode « branche », Jekyll ignorerait les fichiers `_*.js` du nouveau site (R-04). Les visiteurs ne voient rien changer : Pages sert le dernier déploiement du mode « branche » jusqu'au premier déploiement par Actions.
- [ ] **3.6 Fusion de l'intégration dans `main`.** Dans la PR, **Create a merge commit** (ni « Squash » ni « Rebase » : le retour arrière par `git revert -m 1` suppose un commit de fusion), puis **Confirm merge**. Notez le hash du commit de fusion.
- [ ] **3.7 Déploiement.** Onglet **Actions**, run de `CI` sur `main` : `check`, `browser`, `e2e`, puis `deploy` (20 à 25 minutes en tout). Le job `deploy` affiche l'adresse publiée. S'il échoue sur « Repository variable VITE_APPS_SCRIPT_URL set », reprenez 3.3 puis **Actions > CI > Run workflow** sur `main`. S'il est refusé par l'environnement, reprenez 3.2 et relancez de même.

## 4. Vérifications, dès que `deploy` est vert

- [ ] **4.1** En navigation privée, `https://thegaudis.github.io/reservations-restaurants/` affiche le nouveau site. GitHub Pages garde les fichiers 10 minutes en cache (`max-age=600`, R-05) : si l'ancien site apparaît encore, attendez et rechargez.
- [ ] **4.2** `…/reservations-restaurants/index.html` (adresse des anciens favoris) ramène à `…/reservations-restaurants/`.
- [ ] **4.3** `…/reservations-restaurants/collegue` affiche le site avec le panneau de connexion (GitHub sert `404.html`, puis l'appli prend le relais).
- [ ] **4.4** Dans un navigateur qui a déjà visité l'ancien site (navigation normale) : le calendrier s'affiche tout de suite, sans blocs gris prolongés. La copie `reservations-cache-v1` écrite par l'ancien site est relue ; `reservations-textes` ne sert qu'en secours.
- [ ] **4.5** Aucun service worker : l'ancien site n'en avait pas, le nouveau n'en installe aucun. La CI l'a vérifié (étape « No mock service worker in the build ») ; rien à faire.
- [ ] **4.6** Depuis un poste avec le dépôt et Chromium (README, « Développement ») : `pnpm test:e2e:production`, 6 tests verts. Le test du formulaire échoue s'il n'existe aucun jour du restaurant 1 réservable après aujourd'hui : faites alors l'ouverture d'un formulaire à la main.
- [ ] **4.7** À la main, avec votre propre adresse e-mail : une vraie réservation au restaurant 1 et une commande au restaurant 2 (e-mails de confirmation reçus) ; connexion collègue ; suppression des deux par un collègue (e-mails d'annulation reçus) ; impression d'une liste du jour et du panneau « Demain ».

Un problème bloquant (page blanche, réservation impossible, connexion collègue refusée avec le bon mot de passe, données fausses) : retour arrière, partie 6. Un détail d'affichage ne justifie pas un retour arrière : notez-le pour un correctif.

## 5. Après la bascule

- [ ] Message de confirmation aux collègues si vous l'aviez promis (partie 7).
- [ ] Orchestrateur : Statut de P8 « terminé » et plan marqué « terminé » (PLAN § 5.0, journal du plan) ; `docs/spec/` reste la référence.
- [ ] Transmettre l'annexe B du PLAN au responsable du script.
- [ ] Un mois après : retirer la lecture de secours de `reservations-textes` et supprimer cette clé au démarrage (`src/queries/local-cache.ts`, pas dans un effet).
- [ ] Dependabot (`.github/dependabot.yml`) agit désormais : une PR de mises à jour par famille, chaque semaine ; chacune passe la CI avant fusion, et sa fusion publie le site.
- [ ] Garder le tag `v1-final`. Supprimer la branche `rollback` si elle a servi.

## 6. Retour arrière pas à pas

Objectif : l'ancien site de nouveau à la racine en moins de 15 minutes, cache de 10 minutes compris. Les visiteurs gardent leur copie locale (même clé, même format, R-21) ; le script et la feuille ne changent pas. Le README (« Retour à l'ancien site ») décrit les mêmes étapes.

### Première façon : branche `rollback` depuis le tag (sans toucher à `main`)

GitHub Pages ne sert pas un tag : il faut une branche qui pointe dessus.

1. Créer la branche :

   ```sh
   git fetch origin --tags
   git push origin "v1-final^{commit}:refs/heads/rollback"
   ```

   Ou sur GitHub : menu des branches de la page d'accueil, onglet **Tags**, `v1-final`, puis taper `rollback` dans le même menu et choisir **Create branch rollback from v1-final**.
2. **Settings > Environments > github-pages**, **Add deployment branch or tag rule** : `rollback`. Sans cette règle, l'environnement refuse le déploiement de la branche.
3. **Settings > Pages**, **Source** : « Deploy from a branch », branche `rollback`, dossier `/ (root)`, **Save**.
4. Onglet **Actions** : attendre la fin de « pages build and deployment » (1 à 2 minutes).
5. En navigation privée, l'ancien site s'affiche ; les autres visiteurs le voient au plus 10 minutes plus tard.
6. Tant que dure le retour arrière, ne rien pousser sur `main` : le job `deploy` tenterait de republier le nouveau site.

Retour au nouveau site, une fois le correctif fusionné sur `main` : **Source** « GitHub Actions », **Actions > CI > Run workflow** sur `main`, puis retirer la règle `rollback` de l'environnement et supprimer la branche.

### Seconde façon : annuler la fusion sur `main`

1. Retrouver le commit de fusion (noté en 3.6, ou `git log --merges --oneline -5 main`).
2. Annuler :

   ```sh
   git switch main
   git pull
   git revert -m 1 <commit de fusion>
   git push origin main
   ```

   Ou sur GitHub : la pull request de bascule, bouton **Revert**, puis fusionner la pull request d'annulation qu'il ouvre.
3. **Settings > Pages**, **Source** : « Deploy from a branch », branche `main`, dossier `/ (root)`, **Save**. L'annulation retire aussi `.github/workflows/ci.yml` : aucun job ne déploie plus.
4. Vérifier comme à l'étape 5 de la première façon.

Retour au nouveau site : `git revert <commit d'annulation>` sur `main` (ou **Revert** de la pull request d'annulation), **Source** « GitHub Actions », puis **Actions > CI > Run workflow** sur `main`.

## 7. Message aux collègues

À envoyer quelques jours avant la bascule, en remplaçant les crochets.

```text
Objet : nouveau site de réservation des restaurants à partir du [jour et date]

Bonjour à toutes et à tous,

Le [jour et date], à partir de [heure], le site de réservation des restaurants pédagogiques change d'apparence. L'adresse ne change pas : https://thegaudis.github.io/reservations-restaurants/. Vos favoris continuent de marcher.

Pour le public, l'usage reste le même : mêmes jours, mêmes menus, mêmes e-mails de confirmation. Les réservations déjà faites sont conservées.

Ce qui change pour vous en mode collègue :
- L'impression se fait dans la page, sans ouvrir de nouvelle fenêtre : plus besoin d'autoriser les fenêtres surgissantes.
- Un seul panneau « Demain » réunit les totaux et le résumé des deux restaurants, avec ses boutons « Imprimer ».
- Les listes imprimées comptent un seul ticket restaurant par commande.
- Les compteurs ont des boutons − et +.
- L'adresse de la page garde le jour choisi et la vue (semaine ou mois) : un rechargement vous ramène au même endroit.

Ce qui ne change pas :
- Le mot de passe du mode collègue.
- Recharger la page vous déconnecte du mode collègue, comme aujourd'hui : le site vous redemande le mot de passe.
- Le site vous déconnecte après 10 minutes sans activité.

Le jour du changement :
- Une page du site restée ouverte depuis la veille garde l'ancienne version : rechargez-la (touche F5 sur ordinateur, ou tirez la page vers le bas sur tablette).
- Pendant une dizaine de minutes après le changement, certains appareils affichent encore l'ancienne version. Rechargez un peu plus tard.
- Si quelque chose ne marche pas, prévenez-moi [moyen de contact] avec l'heure, l'appareil et le texte du message affiché. Je peux remettre l'ancien site en ligne en un quart d'heure.

Merci à celles et ceux qui ont testé le nouveau site ces dernières semaines.

[Prénom Nom]
```
