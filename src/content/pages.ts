/**
 * Pages de contenu éditorial. Règle : aucune affirmation non vérifiable
 * (pas de chiffres, certifications, clients ou capacités logistiques inventés).
 * Les textes légaux sont des MODÈLES à faire valider par un juriste.
 */
export type Section = { h: string; p?: string; list?: string[] };
export type ContentPage = {
  title: string;
  titleEn?: string;
  intro: string;
  sections: Section[];
  cta?: { label: string; href: string }[];
  legalDraft?: boolean;
  group: "entreprise" | "solutions" | "offre" | "qualite" | "aide" | "legal";
};

const SECTOR_CTA = [
  { label: "Demander un devis", href: "/devis" },
  { label: "Voir le catalogue", href: "/catalogue" },
];

function sector(title: string, titleEn: string, who: string, needs: string[], cats: string[]): ContentPage {
  return {
    title, titleEn, group: "solutions",
    intro: `${who} Nous vous aidons à choisir des emballages adaptés à vos produits, à vos volumes et à votre budget, puis nous organisons l'approvisionnement et la livraison.`,
    sections: [
      { h: "Vos besoins typiques", list: needs },
      { h: "Familles de produits concernées", list: cats },
      { h: "Comment nous travaillons avec vous", list: [
        "Analyse de votre besoin (produits, volumes, fréquence, contraintes de conservation).",
        "Proposition de références du catalogue ou recherche auprès de nos fournisseurs.",
        "Devis détaillé : prix par quantité, délais, frais de livraison.",
        "Commandes ponctuelles ou récurrentes, avec un interlocuteur dédié pour les comptes professionnels.",
      ] },
    ],
    cta: SECTOR_CTA,
  };
}

export const CONTENT_PAGES: Record<string, ContentPage> = {
  "a-propos": {
    title: "À propos de MBOUMINA PACK", titleEn: "About MBOUMINA PACK", group: "entreprise",
    intro: "MBOUMINA PACK est une entreprise de commercialisation et de distribution d'emballages alimentaires, tournée vers l'Afrique et l'international.",
    sections: [
      { h: "Notre métier : la distribution", p: "Nous ne fabriquons pas les emballages. Nous sélectionnons des produits auprès de fournisseurs, nous les mettons à disposition au détail et en gros, et nous coordonnons la personnalisation avec des partenaires spécialisés (impression, marquage)." },
      { h: "Ce que nous apportons", list: [
        "Un catalogue structuré par usage et par métier.",
        "Des prix clairs par quantité, du détail au volume.",
        "Un accompagnement pour choisir le bon emballage.",
        "La coordination de la personnalisation, du devis au bon à tirer.",
        "Un suivi de commande et de livraison.",
      ] },
      { h: "Notre vision", p: "Faire de MBOUMINA PACK une marque reconnue dans la commercialisation et la distribution de solutions d'emballage alimentaire en Afrique et à l'international." },
    ],
    cta: [{ label: "Notre fondateur", href: "/fondateur" }, { label: "Nos valeurs", href: "/valeurs" }],
  },
  "valeurs": {
    title: "Nos valeurs", titleEn: "Our values", group: "entreprise",
    intro: "Quatre principes guident chaque échange avec nos clients, fournisseurs et partenaires.",
    sections: [
      { h: "Transparence", p: "Des prix, des délais et des disponibilités annoncés uniquement lorsqu'ils sont confirmés." },
      { h: "Fiabilité", p: "Tenir ses engagements, et prévenir dès qu'un délai ou une disponibilité change." },
      { h: "Service", p: "Écouter le besoin réel du client avant de proposer un produit." },
      { h: "Responsabilité", p: "Documenter les produits destinés au contact alimentaire et développer une offre d'emballages plus responsables." },
    ],
  },
  "engagements": {
    title: "Nos engagements", titleEn: "Our commitments", group: "entreprise",
    intro: "Ce que vous pouvez attendre de MBOUMINA PACK.",
    sections: [
      { h: "Information exacte", list: [
        "Les caractéristiques publiées proviennent des fiches fournisseurs.",
        "Un document de conformité n'est affiché comme vérifié qu'après contrôle par notre équipe.",
        "Une livraison n'est proposée que vers les zones réellement desservies.",
      ] },
      { h: "Paiements sécurisés", p: "Une commande n'est considérée comme payée qu'après confirmation par le prestataire de paiement ou rapprochement bancaire — jamais sur la base d'une simple capture d'écran." },
      { h: "Protection de vos données", p: "Vos données sont utilisées uniquement pour traiter vos demandes et commandes. Voir notre politique de confidentialité." },
      { h: "Emballages plus responsables", p: "Nous développons progressivement une gamme d'alternatives (papier, carton, fibres) dont les caractéristiques environnementales sont documentées produit par produit." },
    ],
  },
  "solutions-restaurants": sector("Solutions pour restaurants", "Solutions for restaurants", "Restaurants, fast-foods, livraison de repas : vos emballages doivent tenir la chaleur, éviter les fuites et valoriser votre marque.", ["Boîtes repas et barquettes à emporter", "Contenants pour sauces et boissons", "Sacs de transport", "Emballages imprimés à votre logo"], ["Emballages de restauration", "Boîtes alimentaires", "Gobelets et contenants", "Sacs et sachets"]),
  "solutions-hotels": sector("Solutions pour hôtels", "Solutions for hotels", "Room service, petit-déjeuner, banquets, boutique : les hôtels ont des besoins variés et une image à soigner.", ["Contenants pour room service et vente à emporter", "Emballages pour buffets et événements", "Packaging personnalisé aux couleurs de l'établissement"], ["Boîtes alimentaires", "Gobelets et contenants", "Emballages personnalisés"]),
  "solutions-supermarches": sector("Solutions pour supermarchés", "Solutions for supermarkets", "Rayons traiteur, boulangerie, fruits et légumes, caisse : les volumes sont importants et la régularité est essentielle.", ["Barquettes et boîtes pour rayons frais", "Sachets pour boulangerie et vrac", "Sacs de caisse", "Approvisionnement récurrent"], ["Sacs et sachets", "Boîtes alimentaires", "Emballages de boulangerie"]),
  "solutions-traiteurs": sector("Solutions pour traiteurs", "Solutions for caterers", "Événements, plateaux-repas, cocktails : présentation et transport doivent être irréprochables.", ["Plateaux et boîtes de présentation", "Contenants individuels", "Emballages de transport", "Personnalisation pour événements"], ["Boîtes alimentaires", "Emballages de pâtisserie", "Emballages personnalisés"]),
  "solutions-industriels": sector("Solutions pour industriels", "Solutions for manufacturers", "Industries agroalimentaires : vous avez besoin de volumes, de spécifications précises et de documentation.", ["Emballages aux spécifications techniques définies", "Volumes importants et planification", "Documentation de conformité contact alimentaire", "Impression personnalisée via nos partenaires"], ["Emballages alimentaires", "Sacs et sachets", "Emballages personnalisés"]),
  "solutions-distributeurs": sector("Solutions pour distributeurs", "Solutions for distributors", "Grossistes, revendeurs, distributeurs régionaux : développons ensemble la distribution dans votre zone.", ["Prix de gros par paliers", "Commandes en grande quantité", "Documentation produits pour vos clients", "Programme partenaire (sur demande)"], ["Toutes les familles du catalogue"]),
  "vente-en-gros": {
    title: "Vente en gros", titleEn: "Wholesale", group: "offre",
    intro: "Pour les volumes importants, nos prix diminuent par paliers de quantité. Au-delà d'un certain volume, le tarif est négocié sur devis.",
    sections: [
      { h: "Comment fonctionnent les paliers", p: "Chaque produit peut avoir plusieurs niveaux de prix selon la quantité commandée (par exemple : détail, intermédiaire, professionnel, grossiste). Les paliers et prix sont affichés sur chaque fiche produit lorsqu'ils sont définis." },
      { h: "Avantages des comptes professionnels", list: ["Tarifs négociés", "Bons de commande", "Validation interne des achats", "Factures professionnelles", "Commandes récurrentes", "Interlocuteur commercial dédié"] },
    ],
    cta: [{ label: "Ouvrir un compte professionnel", href: "/pro" }, { label: "Demander un devis volume", href: "/devis" }],
  },
  "vente-au-detail": {
    title: "Vente au détail", titleEn: "Retail", group: "offre",
    intro: "Vous démarrez une activité ou avez besoin de petites quantités ? Commandez directement en ligne, au paquet ou au carton, sans engagement.",
    sections: [
      { h: "Comment commander", list: ["Choisissez vos produits dans le catalogue.", "Ajoutez-les au panier — le prix s'ajuste automatiquement selon la quantité.", "Validez la commande et choisissez votre mode de paiement.", "Suivez votre commande depuis votre espace client."] },
    ],
    cta: [{ label: "Voir le catalogue", href: "/catalogue" }],
  },
  "fournisseurs-partenaires": {
    title: "Nos fournisseurs et partenaires", titleEn: "Suppliers and partners", group: "qualite",
    intro: "MBOUMINA PACK s'appuie sur un réseau de fournisseurs d'emballages et de partenaires de personnalisation et de transport.",
    sections: [
      { h: "Comment nous sélectionnons nos fournisseurs", list: ["Qualité des produits et régularité.", "Disponibilité de la documentation technique et de conformité.", "Délais et capacité à servir les volumes demandés.", "Évaluation continue après chaque réception."] },
      { h: "Devenir fournisseur ou partenaire", p: "Vous êtes fabricant, imprimeur, transporteur ou distributeur ? Présentez-nous votre activité." },
    ],
    cta: [{ label: "Demande de partenariat", href: "/partenariat" }],
  },
  "garanties-qualite": {
    title: "Nos garanties qualité", titleEn: "Quality assurance", group: "qualite",
    intro: "Notre démarche qualité porte sur le choix des fournisseurs, le contrôle à réception et la traçabilité.",
    sections: [
      { h: "Contrôle à réception", p: "Chaque réception fournisseur fait l'objet d'un contrôle (quantités, état, conformité à la commande). Les non-conformités sont enregistrées et traitées avec le fournisseur." },
      { h: "Traçabilité", p: "Les lots reçus sont enregistrés, ce qui permet de retrouver l'origine d'un produit livré." },
      { h: "Réclamations", p: "Un problème avec un produit ? Signalez-le depuis votre espace client ou via le formulaire de contact : chaque réclamation est suivie jusqu'à sa résolution." },
    ],
    cta: [{ label: "Politique de retour", href: "/retours" }],
  },
  "conformite": {
    title: "Conformité et documentation", titleEn: "Compliance and documentation", group: "qualite",
    intro: "Les emballages destinés au contact alimentaire doivent respecter les exigences applicables dans le pays de commercialisation.",
    sections: [
      { h: "Documents disponibles", p: "Lorsque nos fournisseurs les fournissent, nous mettons à disposition les fiches techniques, déclarations de conformité et informations matériaux sur les fiches produits." },
      { h: "Ce que signifie « document vérifié »", p: "La mention « vérifié » indique que notre équipe a contrôlé le document (émetteur, produit concerné, date de validité). Nous n'affichons jamais une certification non vérifiée." },
      { h: "Besoin d'un document spécifique ?", p: "Contactez-nous en précisant la référence produit et le pays de commercialisation." },
    ],
    cta: [{ label: "Nous contacter", href: "/contact" }],
  },
  "faq": {
    title: "Questions fréquentes", titleEn: "FAQ", group: "aide",
    intro: "Les réponses aux questions les plus courantes.",
    sections: [
      { h: "Fabriquez-vous les emballages ?", p: "Non. MBOUMINA PACK est distributeur : nous sélectionnons les produits auprès de fournisseurs et coordonnons la personnalisation avec des partenaires spécialisés." },
      { h: "Puis-je commander en petite quantité ?", p: "Oui, dans la limite de la quantité minimale indiquée sur chaque fiche produit." },
      { h: "Comment obtenir un prix de gros ?", p: "Les prix par palier sont affichés sur les fiches produits. Pour les très gros volumes, le tarif est établi sur devis." },
      { h: "Livrez-vous dans mon pays ?", p: "Les pays et villes desservis s'affichent au moment de la commande. Si votre zone n'apparaît pas, faites une demande de devis : nous étudierons une solution de transport." },
      { h: "Quels moyens de paiement acceptez-vous ?", p: "Les moyens de paiement disponibles s'affichent à l'étape de paiement selon votre pays. Le virement bancaire est accepté ; les paiements mobiles et par carte sont activés progressivement." },
      { h: "Puis-je personnaliser mes emballages ?", p: "Oui, via notre configurateur. La commande n'est définitive qu'après validation du prix, du délai, de la faisabilité et du bon à tirer (BAT)." },
      { h: "Comment suivre ma commande ?", p: "Depuis votre espace client, ou sur la page Suivi de livraison avec votre numéro de commande et votre email." },
    ],
    cta: [{ label: "Poser une autre question", href: "/contact" }],
  },
  "cgv": {
    title: "Conditions générales de vente", titleEn: "Terms of sale", group: "legal", legalDraft: true,
    intro: "Les présentes conditions régissent les ventes conclues sur la plateforme MBOUMINA PACK.",
    sections: [
      { h: "1. Vendeur", p: "MBOUMINA PACK — [forme juridique, NINEA, RCCM, adresse du siège à compléter]." },
      { h: "2. Produits", p: "Les caractéristiques des produits sont celles indiquées sur les fiches produits, issues des informations fournisseurs. Les photographies sont non contractuelles." },
      { h: "3. Prix", p: "Les prix sont indiqués dans la devise affichée lors de la commande. Ils peuvent varier selon la quantité (paliers). Les frais de livraison et taxes applicables sont détaillés avant validation." },
      { h: "4. Commande", p: "La commande est ferme après validation par le client et confirmation du paiement (ou de l'acompte lorsqu'il est prévu). Les commandes personnalisées ne sont définitives qu'après validation du prix, du délai, de la faisabilité et du bon à tirer." },
      { h: "5. Paiement", p: "Le paiement est réputé effectué à réception effective des fonds, confirmée par le prestataire de paiement ou par rapprochement bancaire." },
      { h: "6. Livraison", p: "Les délais sont indicatifs et communiqués selon la zone et le transporteur. Le client vérifie l'état des colis à la réception et émet des réserves en cas d'anomalie." },
      { h: "7. Retours", p: "Voir la politique de retour. Les produits personnalisés ne sont ni repris ni échangés, sauf défaut." },
      { h: "8. Droit applicable", p: "[À compléter : droit sénégalais / OHADA, juridiction compétente]." },
    ],
  },
  "confidentialite": {
    title: "Politique de confidentialité", titleEn: "Privacy policy", group: "legal", legalDraft: true,
    intro: "Cette politique explique quelles données nous collectons et comment vous pouvez exercer vos droits.",
    sections: [
      { h: "Responsable du traitement", p: "MBOUMINA PACK — [adresse et contact à compléter]." },
      { h: "Données collectées", list: ["Identité et coordonnées (nom, email, téléphone, adresses).", "Informations d'entreprise pour les comptes professionnels.", "Historique de commandes, devis et échanges.", "Fichiers transmis pour la personnalisation.", "Données techniques de connexion (adresse IP, sécurité)."] },
      { h: "Finalités", list: ["Traiter commandes, devis et livraisons.", "Gérer votre compte.", "Assurer la sécurité de la plateforme.", "Vous envoyer des informations commerciales uniquement si vous y avez consenti."] },
      { h: "Partage", p: "Les données nécessaires sont transmises aux prestataires de paiement, transporteurs et partenaires de personnalisation, uniquement pour exécuter votre commande." },
      { h: "Vos droits", p: "Accès, rectification, suppression, opposition. Vous pouvez supprimer votre compte depuis votre espace client ou nous écrire via le formulaire de contact. [Mentionner l'autorité de protection compétente — au Sénégal : CDP]." },
      { h: "Cookies", p: "Le site utilise un cookie de session indispensable à la connexion et au panier. Aucun cookie publicitaire n'est déposé sans votre accord." },
    ],
  },
  "retours": {
    title: "Politique de retour", titleEn: "Returns policy", group: "legal", legalDraft: true,
    intro: "Vous pouvez demander un retour depuis votre espace client.",
    sections: [
      { h: "Délai", p: "[À définir par la direction : ex. X jours après livraison]." },
      { h: "Conditions", list: ["Produits non utilisés, dans leur emballage d'origine.", "Les produits personnalisés ne sont pas repris, sauf défaut.", "Les produits endommagés à la livraison doivent être signalés avec photos dès réception."] },
      { h: "Procédure", list: ["Demande de retour depuis l'espace client (commande concernée, motif).", "Validation par notre équipe et instructions de retour.", "Contrôle des produits retournés.", "Remboursement ou avoir, selon le cas."] },
    ],
  },
};

export const SECTOR_LINKS = [
  ["solutions-restaurants", "Restaurants"],
  ["solutions-hotels", "Hôtels"],
  ["solutions-supermarches", "Supermarchés"],
  ["solutions-traiteurs", "Traiteurs"],
  ["solutions-industriels", "Industriels"],
  ["solutions-distributeurs", "Distributeurs"],
] as const;
