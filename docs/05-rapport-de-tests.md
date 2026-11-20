# Rapport de tests — 20/11/2026

Environnement : Windows 10, Node.js 26.13.1, Next.js 15 en mode développement, SQLite local, `PAYMENT_TEST_MODE=true`.
Toutes les données ci-dessous étaient fictives et marquées « test ». La base a été réinitialisée après les tests : il ne reste que le seed.

## 1. Tests automatisés
- `npx tsc --noEmit` : 0 erreur.
- `npx vitest run` : 17/17 (dont la conversion EUR → FCFA d'un coût de revient). Couverture : paliers, prix négocié, palier « sur devis », promotion datée, remises réparties, taxes par ligne, transport, marge, prix depuis marge, coût de revient, CMP, arrondis FCFA.
- `npx next build` : OK (58 routes).

## 2. Parcours de bout en bout (navigateur)

### Préparation (back-office, fondateur)
| Étape | Attendu | Obtenu |
|---|---|---|
| Entrepôt TEST1 (Dakar) | créé | ✔ |
| Produit TEST-BOX-01 : achat 60, détail 100, paliers 50→90, 200→80, 500→sur devis | enregistré, publiable | ✔ |
| Entrée de stock 300, lot LOT-TEST-1 | onHand 300 | ✔ |
| Zone « Sénégal », tarif 500 FCFA (1-3 j), activation | active | ✔ |
| Ouverture du Sénégal sans case « couverture vérifiée » | refus | ✔ refusé |
| Ouverture avec la case, TVA 18 % | ouvert | ✔ |

### Client invité
| Étape | Attendu | Obtenu |
|---|---|---|
| 60 unités au panier | 90 FCFA (« Intermédiaire »), 5 400 FCFA | ✔ |
| Commande Dakar | livraison 500, TVA 972, total 6 872 | ✔ |
| Paiement « test » | commande payée, paiement `verifiedBy=test-simulator`, facture FAC-2026-000001 | ✔ |
| Stock | reserved 60 | ✔ |
| 1 unité (2ᵉ commande) | prix détail 100, total 618 | ✔ |

### Back-office
| Étape | Attendu | Obtenu |
|---|---|---|
| Payée → En préparation → Emballée | historique horodaté | ✔ |
| Création d'expédition (n° de suivi) | colis rattaché | ✔ |
| Emballée → Expédiée | onHand 240, reserved 0, mouvement `sale -60` | ✔ |
| Marge affichée | 5 400 − 3 600 = 1 800 (33,3 %) | ✔ |
| Commande non payée : statuts proposés | « Annulée » uniquement (après correctif) | ✔ |
| Annulation | réservation libérée | ✔ |

### Suivi invité
| Étape | Attendu | Obtenu |
|---|---|---|
| Numéro + email (POST) | redirection vers un lien signé, sans email dans l'URL | ✔ |
| Jeton falsifié | « Aucune commande trouvée » | ✔ |

## 2 bis. Deuxième session (20/11/2026, après-midi) : formulaires, devis, personnalisation, achats

### Formulaires publics
| Étape | Attendu | Obtenu |
|---|---|---|
| Demande de devis B2B | DEV-2026-000001 enregistré | ✔ |
| Demande d'échantillons | enregistrée | ✔ |
| Message de contact | enregistré | ✔ |
| Champ piège anti-robot rempli | « Envoi refusé » | ✔ |
| Personnalisation avec un faux PNG (texte renommé) | refusé (contrôle du contenu réel) | ✔ |
| Personnalisation avec un vrai PNG | PERSO-2026-000001, logo stocké | ✔ |

### Back-office
| Étape | Attendu | Obtenu |
|---|---|---|
| Confirmer la personnalisation avec seulement « prix confirmé » | refus (prix + délai + faisabilité + BAT obligatoires) | ✔ |
| Télécharger le logo | 200, en pièce jointe ; 403 pour un visiteur anonyme | ✔ |
| Envoyer un devis vide | refus | ✔ |
| Chiffrage 2 000 × 85 + TVA 18 % + transport 5 000 | 205 600 FCFA | ✔ |
| Envoi du devis sans SMTP | « email non remis » tracé dans l'historique | ✔ |
| Devis envoyé → accepté | historique cohérent | ✔ |
| Achat en EUR : 1 000 × 0,08 € + 20 € de transport | coût de revient 0,10 € | ✔ |
| Validation, puis envoi au fournisseur | statuts successifs | ✔ |
| Réception de 1 100 pour 1 000 commandés | bloquée | ✔ |
| Réception partielle : 800 acceptés, 50 refusés, lot, non-conformité | stock 800, statut « reçu partiellement » | ✔ |
| Coût de revient converti en FCFA | 66 FCFA (taux fixe 655,957) ; CMP 66 | ✔ (après correctif) |
| Réception du solde (150) | statut « reçu » | ✔ |

## 2 ter. Devis → commande (20/11/2026)
| Étape | Attendu | Obtenu |
|---|---|---|
| Devis : 150 × 90 (catalogue) + 500 × 150 (hors catalogue), TVA 18 %, transport 5 000 | 109 430 FCFA | ✔ |
| Conversion vers le Sénégal (non ouvert) sans « transport vérifié » | refus | ✔ |
| Conversion avec 150 demandés pour 100 en stock | refus « 100 disponibles pour 150 demandés » | ✔ |
| Révision à 50 unités, renvoi, acceptation | rév. 2, 98 810 FCFA | ✔ |
| Conversion avec acompte 30 % et BC client | CMD créée, lignes et montants identiques au devis, 50 réservés | ✔ |
| Nouvelle conversion du même devis | formulaire absent, devis « converti », lien vers la commande | ✔ |
| Paiement de l'acompte par le lien signé | 29 643 FCFA, statut « acompte reçu », pas encore de facture | ✔ |
| Paiement du solde | 69 167 FCFA, statut « payée », facture 98 810 FCFA avec la ligne hors catalogue | ✔ |
| Historique des actions | demande, chiffrages, envois, acceptations, révision, conversion, email non remis | ✔ |

## 3. Anomalies trouvées et corrigées
Voir `docs/00-suivi-avancement.md` § « Défauts trouvés pendant les tests ».

## 4. Non testé à ce stade
- Inscription entreprise et prix négociés.
- Création automatique d'achats pour les produits « sur commande partenaire ».
- Transferts entre entrepôts, blocage de stock.
- Coupons.
- Rôles non-fondateur.
- Version anglaise.
- Affichage mobile.

À couvrir lors de la prochaine session de tests.

## 5. Rejouer les vérifications
```powershell
npm run typecheck
npm test
npx tsx scripts/check-e2e.ts   # lecture seule : état des stocks, commandes, paiements, factures
```
