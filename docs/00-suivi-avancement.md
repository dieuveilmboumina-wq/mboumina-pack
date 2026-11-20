# Suivi d'avancement — MBOUMINA PACK

Mise à jour : 20/11/2026.
Règle : une fonctionnalité n'est marquée « vérifiée » qu'après un test automatisé ou un parcours testé dans le navigateur. Le statut détaillé des 500 fonctionnalités se trouve dans le back-office, menu **Registre des fonctionnalités** (`/admin/registre`).

## Registre des 500 fonctionnalités (20/11/2026)
| Statut | Nombre |
|---|---|
| Vérifiées | 95 |
| Codées, non testées | 133 |
| Intervention humaine requise | 14 |
| À faire | 258 |

Source des statuts : `docs/registre-statuts.json`, avec une note par fonctionnalité. Le seed les réapplique après une réinitialisation de la base, sans jamais écraser un statut modifié dans le back-office. Pour marquer une nouvelle fonctionnalité vérifiée, ajoutez une ligne dans ce fichier ou modifiez son statut dans le back-office.

## Vérifications techniques
| Contrôle | Résultat |
|---|---|
| `npm run typecheck` (TypeScript strict) | OK, aucune erreur |
| `npm test` (17 tests : tarification, coûts, devises) | 17/17 OK |
| `npm run build` (production) | OK, 58 routes |

## Parcours testés dans le navigateur (20/11/2026, base de test puis réinitialisée)
Détail dans `docs/05-rapport-de-tests.md`.

| Parcours | Résultat |
|---|---|
| Connexion fondateur, accès au back-office | OK |
| Création d'entrepôt, de produit avec 4 paliers et publication | OK |
| Entrée de stock avec lot et motif obligatoire | OK |
| Transporteur, zone et tarif ; activation de la zone | OK |
| Ouverture d'un pays refusée sans « couverture vérifiée », acceptée avec | OK |
| Panier invité : palier « Intermédiaire » appliqué à 60 unités (90 FCFA) | OK |
| Commande : livraison 500 + TVA 18 % → total 6 872 FCFA, exact | OK |
| Paiement par le simulateur de test → payée, facture FAC émise | OK |
| Réservation de stock à la commande (60) | OK |
| Préparation → emballée → expédition → expédiée ; stock 300 → 240 | OK |
| Marge brute calculée sur le coût d'achat (1 800 FCFA, 33,3 %) | OK |
| Annulation d'une commande non payée : réservation libérée | OK |
| Suivi invité par numéro + email → lien signé ; jeton falsifié refusé | OK |
| Formulaires devis, échantillons, contact ; champ anti-robot | OK |
| Personnalisation avec fichier ; faux fichier refusé ; confirmation bloquée sans les 4 validations | OK |
| Devis : refus d'envoi vide, chiffrage exact (205 600 FCFA), envoi, acceptation | OK |
| Achat en EUR : validation, réception partielle avec lot et non-conformité, coût converti en FCFA | OK |
| Fichiers clients inaccessibles aux visiteurs anonymes (403) | OK |
| Devis accepté → commande (ligne catalogue + ligne hors catalogue), acompte 30 % puis solde, facture | OK |

## Fonction ajoutée : transformer un devis accepté en commande
Où : fiche devis du back-office, panneau « Transformer en commande ». Visible seulement pour un devis accepté et non encore converti, et pour un rôle autorisé à modifier les commandes.
- **Montants :** la commande reprend les prix, taxes, remise et transport du devis, sans recalcul ni réinterprétation.
- **Lignes hors catalogue** (ex. emballage personnalisé fabriqué par un partenaire) : acceptées. Leur coût reste inconnu, d'où « coûts incomplets » sur la marge.
- **Stock :** les articles catalogue gérés en stock sont réservés. Si le stock libre est insuffisant, la conversion est refusée avec le détail par article.
- **Livraison :** si le pays n'est pas ouvert à la vente en ligne, il faut cocher « transport vérifié pour cette adresse ».
- **Acompte :** facultatif, de 1 à 99 %. Le client choisit ensuite acompte ou paiement intégral. La facture est émise au paiement complet.
- **Double conversion :** impossible (verrou en base). Le devis passe en « Converti en commande » et pointe vers la commande.
- **Lien de paiement :** signé, envoyé par email. Sans SMTP, l'échec est tracé et le lien est affiché dans la fiche commande pour être transmis à la main.
- Schéma : `OrderLine.variantId` devient facultatif.

## Défauts trouvés pendant les tests et corrigés
1. **Grave :** un employé pouvait passer une commande en « Payée » ou « Acompte reçu » à la main, sans paiement vérifié. C'est maintenant bloqué côté serveur (`changeOrderStatus`), et ces statuts n'apparaissent plus dans la liste.
2. **Confidentialité :** l'email du client apparaissait dans les URL de paiement, de confirmation et de suivi. Il est remplacé par un jeton signé (HMAC avec `APP_SECRET`). Le formulaire de suivi passe désormais en POST.
3. L'audit d'envoi de devis pointait vers une route inexistante (`/api/quotes`). Corrigé.
4. Les pays accentués (Égypte, Éthiopie…) étaient triés en fin de liste. Le tri est maintenant alphabétique français.
5. Les champs du formulaire de variante n'étaient pas associés à leur libellé (accessibilité). Corrigé.
6. « Vente en gros » passait sur deux lignes dans le menu. Corrigé.
7. **Grave :** pour un achat dans une autre devise (ex. EUR) que celle du produit (FCFA), le coût de revient était copié tel quel. 0,10 € devenait 10 FCFA au lieu de 66, ce qui faussait marges et CMP. Le coût est maintenant converti au dernier taux daté enregistré. Sans taux, la réception est refusée.
8. Les devis pouvaient être passés d'un statut à n'importe quel autre côté serveur (ex. « accepté » sans envoi). Les transitions sont désormais contrôlées.
9. Le statut d'une personnalisation n'était pas vérifié côté serveur. Il est désormais limité aux statuts connus.
10. Libellés du formulaire de chiffrage des devis non associés à leurs champs (accessibilité). Corrigé.

## Points connus, non bloquants
- Le statut d'un colis (`preparing`) n'est pas synchronisé automatiquement quand la commande passe en « Expédiée ». Il se met à jour à la main dans la fiche commande.
- Lors d'une entrée de stock par « ajustement » sans coût, le coût moyen pondéré reste vide. La marge utilise alors le prix d'achat de la variante. Le coût moyen est calculé lors des réceptions de commandes fournisseurs.

- Le projet est dans un dossier OneDrive. La synchronisation verrouille parfois le dossier `.next` (erreur 500 en développement ; il suffit de supprimer `.next` et de relancer). Il est recommandé de déplacer le projet hors de OneDrive ou d'exclure `.next` et `node_modules` de la synchronisation.
- Les compteurs anti-abus des formulaires sont stockés dans la table des paramètres sans purge automatique. Un nettoyage périodique est à prévoir.

## Non encore réalisé
- Assistant IA.
- Module RH.
- Interfaces retours et réclamations.
- Dépôt d'avis et favoris côté client.
- 2FA.
- Traductions anglaises des pages de contenu.
- Bascule PostgreSQL pour la production.

## Nécessite une intervention humaine
- **Clés marchandes** Wave, Orange Money et carte bancaire. Sans elles, ces moyens n'apparaissent pas au client.
- **Coordonnées bancaires** pour le virement (Paramètres).
- **Serveur SMTP** pour l'envoi réel des emails. En attendant, les emails non remis sont tracés dans l'historique des actions.
- **Données réelles :** produits, prix, fournisseurs, transporteurs, zones couvertes, photos, certificats. Aucune n'a été inventée.
- **Contenus juridiques** (CGV, confidentialité, mentions légales), à faire valider par un juriste.
- **Hébergement, nom de domaine et sauvegardes** de production.
