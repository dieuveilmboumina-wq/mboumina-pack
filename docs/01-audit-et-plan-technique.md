# MBOUMINA PACK — Audit initial et plan technique

_Date : 20 novembre 2026 — Fondateur : Dieuveil Flavien MBOUMINA BAKADISSA_

## 1. Audit de l'existant

| Élément | Constat |
|---|---|
| Code existant | Aucun. Projet démarré de zéro dans `Documents/mboumina-pack`. |
| Données existantes | Aucune. Rien à préserver ni à migrer. |
| Intégrations existantes | Aucune (ni paiement, ni transporteur, ni email). |
| Poste de développement | Windows 10, PowerShell 5.1. Aucun runtime au départ ; Node.js LTS et Git installés via winget (sources officielles). |
| Éléments fournis | Cahier des charges complet, palette de couleurs, photo du fondateur. |

Conséquence : aucune contrainte de compatibilité. On choisit une stack moderne et maintenable.

## 2. Stack retenue

| Couche | Choix | Raison |
|---|---|---|
| Langage | TypeScript (strict) | Un seul langage front + back, typage des calculs de prix. |
| Framework | Next.js (App Router) | Rendu serveur (SEO), API routes, i18n par segment, PWA possible. |
| Base de données | PostgreSQL en production, SQLite en développement | Relationnel, transactions ; SQLite permet de démarrer sans serveur. |
| ORM | Prisma | Schéma versionné, migrations, requêtes paramétrées (protection SQL). |
| Styles | Tailwind CSS + tokens de la charte | Cohérence visuelle, responsive. |
| Validation | Zod | Toutes les entrées API validées côté serveur. |
| Authentification | Sessions serveur (cookie httpOnly, SameSite=Lax, Secure), mots de passe hachés (scrypt), TOTP pour 2FA | Pas de jeton exposé au navigateur. |
| Montants | Entiers en unité mineure (centimes / FCFA entier) | Aucune erreur d'arrondi flottant. |
| Fichiers | Stockage local en dev, S3-compatible en prod (interface commune) | Logos clients, fiches techniques, preuves. |
| Tests | Vitest (unitaires : tarification, taxes, stocks) + Playwright (parcours complets) | |
| IA | API Claude (Anthropic) avec outils qui interrogent la base | L'IA ne répond qu'à partir des données réelles. |

## 3. Architecture modulaire

```
src/
  app/[locale]/          pages publiques, espace client, espace pro (FR/EN)
  app/admin/             back-office (contrôle d'accès par rôle)
  app/api/               API REST documentée (OpenAPI)
  modules/
    catalog/  pricing/  cart/  orders/  quotes/  payments/
    suppliers/  purchasing/  inventory/  logistics/  quality/
    crm/  b2b/  marketing/  hr/  ai/  i18n/  security/  reporting/
  lib/      db, auth, permissions, money, audit-log, files, mail
prisma/     schema.prisma, migrations, seed (référentiels uniquement)
```

Chaque module expose des services (logique métier testée) appelés par les pages et l'API. Les modules se connectent par des services, jamais par accès direct aux tables d'un autre module.

## 4. Principes métier non négociables

1. **Modèle de distribution** : aucune usine, machine ou ligne de production MBOUMINA PACK. La personnalisation est réalisée par des partenaires.
2. **Aucune donnée inventée** : prix, stocks, fournisseurs, certifications, pays desservis et délais sont saisis par l'administrateur. Le catalogue démarre vide ; seules les catégories (structure) sont pré-créées.
3. **Paiement** : une commande n'est payée qu'après confirmation serveur du prestataire (webhook signé ou API de vérification). Jamais sur une redirection navigateur ou une capture d'écran.
4. **Livraison** : un pays n'est proposé que si une zone active avec transporteur et tarif existe.
5. **Conformité** : un document n'est affiché « vérifié » qu'après validation par un utilisateur habilité, avec date et auteur.
6. **Personnalisation** : commande définitive uniquement après prix, délai, faisabilité et BAT validés.

## 5. Environnements

| Environnement | Base | Paiements | Emails |
|---|---|---|---|
| Développement | SQLite locale | Mode test / simulateur local | Affichés en console |
| Test (staging) | PostgreSQL dédiée | Clés sandbox prestataires | Boîte de test |
| Production | PostgreSQL managée + sauvegardes chiffrées | Clés live (fournies par le fondateur) | Fournisseur SMTP réel |

Les secrets sont dans des variables d'environnement (`.env`, jamais versionné). Voir `.env.example`.

## 6. Plan de développement

| Phase | Contenu | Statut |
|---|---|---|
| 1 Fondations | Identité, design, architecture, base de données, pages publiques, catalogue | En cours |
| 2 Commerce | Comptes, panier, commandes, devis, tarifs par paliers, paiements | À faire |
| 3 Distribution | Fournisseurs, achats, réceptions, stocks multi-entrepôts, logistique | À faire |
| 4 Entreprise | CRM, B2B, administration, finances, RH, rapports | À faire |
| 5 Intelligence | Assistant IA, prévisions, anomalies | À faire |
| 6 International | Langues, devises datées, pays, transport international, partenaires | À faire |
| 7 Audit final | Tests, sécurité, performance, SEO, sauvegardes, mise en production | À faire |

Le suivi détaillé des 500 fonctionnalités est dans `docs/registre-fonctionnalites.json` et dans le back-office (Paramètres → Registre). Une fonctionnalité ne passe à « terminée » qu'après vérification.

## 7. Éléments nécessitant une intervention humaine

| Élément | Pourquoi |
|---|---|
| Comptes marchands Wave, Orange Money, carte (ex. CinetPay, PayDunya, Stripe) | Contrats et clés API au nom de l'entreprise. |
| Nom de domaine, hébergement, SMTP, SMS, WhatsApp Business | Comptes à ouvrir par le fondateur. |
| Clé API Anthropic | Pour activer l'assistant IA. |
| Catalogue, prix d'achat/vente, fournisseurs, stocks | Données réelles de l'entreprise. |
| Pays desservis, transporteurs, tarifs de livraison | Contrats transporteurs. |
| Textes légaux (CGV, confidentialité, retours) | Les modèles fournis doivent être validés par un juriste (droit sénégalais / OHADA, RGPD si clients UE). |
| Mentions légales : NINEA, RCCM, adresse du siège | Informations administratives réelles. |
| Documents de conformité contact alimentaire | Fournis par les fournisseurs, vérifiés par l'entreprise. |
