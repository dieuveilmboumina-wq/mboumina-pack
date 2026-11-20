# Publier MBOUMINA PACK sur Render (aperçu privé)

Le code est prêt :
- dépôt Git local créé, avec un premier commit sans aucun secret ;
- configuration Render (`render.yaml`) ;
- base PostgreSQL et migration initiale (`prisma/postgres/`) ;
- mode aperçu privé.

Les étapes ci-dessous créent des comptes et engagent des frais : **elles sont à faire par vous**. Comptez environ 30 minutes.

> **État actuel (20/11/2026) : aperçu GRATUIT.** `render.yaml` utilise les offres gratuites de Render (aucune carte enregistrée). Le dépôt GitHub a été rendu **public** : Render n'avait pas pu être relié à GitHub. Il ne contient aucun secret.
>
> Limites de l'aperçu gratuit :
> - le site s'endort après 15 min sans visite ;
> - **la base expire 30 jours après sa création** ;
> - les fichiers envoyés par les clients sont perdus à chaque redémarrage.
>
> **Avant l'ouverture au public, revenez à la configuration de production :**
> - service et base : offres `starter` et `basic-256mb` ;
> - disque `/var/data` avec `UPLOAD_DIR=/var/data/uploads` ;
> - `preDeployCommand` pour les migrations et le seed ;
> - dépôt GitHub remis en privé, avec la connexion GitHub de Render.
>
> Les étapes ci-dessous décrivent cette configuration de production.

---

## 1. Mettre le code sur GitHub (dépôt privé)

1. Créez un compte gratuit sur https://github.com si vous n'en avez pas.
2. Installez **GitHub Desktop** : https://desktop.github.com, puis connectez-vous avec votre compte GitHub.
3. Menu **File → Add local repository…** → choisissez le dossier `Documents\mboumina-pack` (dans OneDrive) → **Add repository**.
4. Cliquez sur **Publish repository**. Laissez **« Keep this code private »** coché (important), nom `mboumina-pack`, puis **Publish**.

Le fichier `.env`, la base de test et les fichiers clients sont exclus : ils ne partent pas sur GitHub.

## 2. Créer le service sur Render

1. Créez un compte sur https://render.com. Choisissez « Sign up with GitHub » et autorisez l'accès au dépôt `mboumina-pack`.
2. Ajoutez un moyen de paiement (Account → Billing). Le disque persistant et la base PostgreSQL sont payants.
3. Cliquez sur **New → Blueprint**, puis sélectionnez le dépôt `mboumina-pack`. Render lit `render.yaml` et prépare :
   - le service web **mboumina-pack** (offre Starter, région Francfort) ;
   - la base **mboumina-db** (PostgreSQL 16) ;
   - un disque de 1 Go pour les logos et documents clients.

   Les tarifs sont affichés par Render avant validation. À titre indicatif, comptez environ 7 $ par mois pour le service et environ 6 $ pour la base, plus quelques centimes pour le disque. Vérifiez sur la page Render.
4. Render demande 4 valeurs. Saisissez-les **dans Render uniquement**, jamais dans un fichier ni dans un message :

   | Variable | Valeur |
   |---|---|
   | `APP_URL` | `https://mboumina-pack.onrender.com`. Si Render attribue une autre adresse, corrigez cette valeur après le déploiement. |
   | `PREVIEW_PASSWORD` | Un mot de passe d'aperçu que vous choisissez (16 caractères ou plus). Il protège tout le site. |
   | `FOUNDER_EMAIL` | Votre adresse email (identifiant du compte fondateur) |
   | `FOUNDER_INITIAL_PASSWORD` | Un **nouveau** mot de passe robuste (12 caractères minimum), différent de celui de test |

   `APP_SECRET` est généré automatiquement par Render. Le paiement de test est désactivé en production.
5. Cliquez sur **Apply**. Le premier déploiement prend environ 5 à 10 minutes : installation, construction, création des tables, données de référence, puis compte fondateur.

## 3. Première connexion

1. Ouvrez `https://mboumina-pack.onrender.com` (ou l'adresse affichée par Render).
2. Le navigateur demande un identifiant : saisissez **`mboumina`** et votre `PREVIEW_PASSWORD`.
3. Allez sur `/fr/connexion` et connectez-vous avec `FOUNDER_EMAIL` et `FOUNDER_INITIAL_PASSWORD`.
4. **Changez tout de suite ce mot de passe** dans « Mon compte ».
5. Dites-moi l'adresse du site. Je vérifierai les pages dans le navigateur intégré. Vous saisirez vous-même le mot de passe d'aperçu quand il sera demandé : ne le copiez pas dans la conversation.

## 4. Préparer l'ouverture au public (dans le back-office)

À faire avec vos vraies informations ; rien n'est inventé par la plateforme :
- [ ] Produits, photos, prix et paliers (Produits et tarifs)
- [ ] Entrepôt et stock initial (Stocks et entrepôts)
- [ ] Fournisseurs et partenaires d'impression réels
- [ ] Transporteurs, zones et tarifs. Ouvrez un pays seulement après avoir vérifié la couverture.
- [ ] Coordonnées bancaires pour le virement (Paramètres)
- [ ] Textes juridiques (CGV, confidentialité, mentions légales) validés par un juriste
- [ ] Serveur d'envoi d'emails (SMTP) : variables `SMTP_*`, intégration à finaliser avec moi
- [ ] Comptes marchands Wave / Orange Money / carte, si souhaité : clés à ajouter dans Render, intégration à finaliser avec moi

## 5. Ouvrir le site au public

Render → service **mboumina-pack** → **Environment** → supprimez `PREVIEW_PASSWORD` → **Save changes**. Le service redémarre : le site devient public et indexable, et le sitemap est publié.

## 6. Mettre à jour le site

Chaque modification du code est enregistrée (commit). Il suffit ensuite de cliquer sur **Push origin** dans GitHub Desktop : Render redéploie automatiquement. Les migrations de base et les données de référence sont appliquées avant la mise en ligne. Elles n'écrasent jamais vos données.

**Modification du modèle de données** (fichier `prisma/schema.prisma`) :
1. `node scripts/prisma-postgres.mjs` régénère `prisma/postgres/schema.prisma`.
2. Créez une migration dans `prisma/postgres/migrations/` avec `prisma migrate diff`.

Le build Render refuse de démarrer si l'étape 1 a été oubliée.

## 7. Nom de domaine (plus tard)

Après l'achat d'un domaine (ex. `mboumina-pack.com`) :
1. Render → service → **Settings → Custom Domains** → ajoutez le domaine.
2. Créez chez votre registraire les enregistrements DNS indiqués par Render. Le certificat HTTPS est automatique.
3. Mettez à jour `APP_URL` avec la nouvelle adresse.

## 8. Sauvegardes

- **Base de données :** consultez l'onglet **Recovery / Backups** de `mboumina-db` dans Render (options selon l'offre).
- **Disque des fichiers clients :** consultez l'onglet **Disks** du service.

Vérifiez ces réglages avant l'ouverture au public. Faites aussi un premier test de restauration.

## Ce que fait la plateforme en production
- **Aperçu privé :** tant que `PREVIEW_PASSWORD` existe, tout le site demande un identifiant et rien n'est indexé (vérifié en local). `/api/health` reste joignable pour la surveillance Render ; il ne renvoie aucune donnée.
- **Paiement de test :** impossible en production, même si `PAYMENT_TEST_MODE` est activé.
- **Fichiers clients :** stockés sur le disque persistant `/var/data/uploads`, servis uniquement à l'équipe et aux propriétaires.
- **Recherches :** insensibles à la casse en PostgreSQL.
