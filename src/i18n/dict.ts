export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}

const fr = {
  tagline: "Votre partenaire en solutions d'emballage alimentaire.",
  nav: { catalogue: "Catalogue", solutions: "Solutions", custom: "Personnalisation", wholesale: "Vente en gros", pro: "Espace pro", about: "À propos", contact: "Contact", quote: "Demander un devis", cart: "Panier", account: "Mon compte", login: "Connexion", search: "Rechercher un emballage…", menu: "Menu", blog: "Blog" },
  home: {
    heroTitle: "Les emballages alimentaires qu'il vous faut, livrés là où vous êtes.",
    heroText: "MBOUMINA PACK sélectionne et distribue des emballages pour restaurants, boulangeries, hôtels, traiteurs, supermarchés et industriels — au détail comme en gros, avec personnalisation par des partenaires spécialisés.",
    ctaCatalogue: "Voir le catalogue",
    ctaQuote: "Demander un devis",
    categories: "Nos familles d'emballages",
    featured: "Produits mis en avant",
    services: "Ce que nous faisons pour vous",
    sectors: "Une solution par métier",
    emptyCatalogue: "Le catalogue est en cours de constitution. Décrivez votre besoin : notre équipe vous répond avec une proposition.",
    watch: "Voir la présentation",
    presentationKicker: "Présentation",
    presentationTitle: "Découvrez MBOUMINA PACK en une minute",
    howTitle: "Comment ça marche",
    steps: [
      ["Choisissez", "Parcourez le catalogue ou décrivez votre besoin dans une demande de devis."],
      ["Commandez", "Panier en ligne, prix par paliers de quantité, devis transformé en commande."],
      ["Payez", "Moyens de paiement disponibles affichés à la commande, paiement confirmé seulement après vérification, acompte possible sur devis."],
      ["Recevez", "Préparation, expédition et suivi de commande depuis votre espace."],
    ] as [string, string][],
    servicesList: [
      ["Vente au détail", "Commandez au paquet ou au carton, directement en ligne."],
      ["Vente en gros", "Prix par paliers de quantité et tarifs négociés pour les volumes."],
      ["Personnalisation", "Vos emballages à vos couleurs, réalisés par nos partenaires après validation du BAT."],
      ["Espace professionnel", "Comptes entreprise, bons de commande, validation interne, factures."],
    ] as [string, string][],
    ctaTitle: "Un projet, un volume, une question ?",
    ctaText: "Décrivez votre besoin : notre équipe commerciale vous répond avec une proposition chiffrée.",
    ctaSamples: "Demander des échantillons",
    onRequest: "Sur demande",
    products: "produit(s)",
  },
  illustration: "Illustration",
  product: { addToCart: "Ajouter au panier", onQuote: "Prix sur devis", from: "À partir de", qty: "Quantité", moq: "Quantité minimale", tiers: "Prix par quantité", inStock: "En stock", onOrder: "Sur commande", unavailable: "Disponibilité à confirmer", technical: "Caractéristiques techniques", documents: "Documents", similar: "Produits similaires", reviews: "Avis clients", requestQuote: "Demander un devis pour ce produit" },
  cart: { title: "Votre panier", empty: "Votre panier est vide.", subtotal: "Sous-total", checkout: "Passer commande", remove: "Retirer", update: "Mettre à jour" },
  common: { send: "Envoyer", save: "Enregistrer", required: "obligatoire", back: "Retour", yes: "Oui", no: "Non" },
};

type Dict = typeof fr;

const en: Dict = {
  tagline: "Your partner in food packaging solutions.",
  nav: { catalogue: "Catalogue", solutions: "Solutions", custom: "Customisation", wholesale: "Wholesale", pro: "Business space", about: "About", contact: "Contact", quote: "Request a quote", cart: "Cart", account: "My account", login: "Sign in", search: "Search packaging…", menu: "Menu", blog: "Blog" },
  home: {
    heroTitle: "The food packaging you need, delivered where you are.",
    heroText: "MBOUMINA PACK selects and distributes packaging for restaurants, bakeries, hotels, caterers, supermarkets and manufacturers — retail or wholesale, with customisation by specialised partners.",
    ctaCatalogue: "Browse the catalogue",
    ctaQuote: "Request a quote",
    categories: "Our packaging families",
    featured: "Featured products",
    services: "What we do for you",
    sectors: "A solution for every trade",
    emptyCatalogue: "Our catalogue is being built. Tell us what you need and our team will reply with a proposal.",
    watch: "Watch the presentation",
    presentationKicker: "Presentation",
    presentationTitle: "Discover MBOUMINA PACK in one minute",
    howTitle: "How it works",
    steps: [
      ["Choose", "Browse the catalogue or describe your needs in a quote request."],
      ["Order", "Online cart, volume pricing tiers, quotes converted into orders."],
      ["Pay", "Available payment methods shown at checkout, payment confirmed only after verification, deposit possible on quotes."],
      ["Receive", "Preparation, shipping and order tracking from your account."],
    ],
    servicesList: [
      ["Retail", "Order by the pack or by the carton, directly online."],
      ["Wholesale", "Volume pricing tiers and negotiated rates for large orders."],
      ["Customisation", "Your packaging in your colours, made by our partners after proof approval."],
      ["Business space", "Company accounts, purchase orders, internal approval, invoices."],
    ],
    ctaTitle: "A project, a volume, a question?",
    ctaText: "Describe your needs: our sales team will reply with a priced proposal.",
    ctaSamples: "Request samples",
    onRequest: "On request",
    products: "product(s)",
  },
  illustration: "Illustration",
  product: { addToCart: "Add to cart", onQuote: "Price on request", from: "From", qty: "Quantity", moq: "Minimum order", tiers: "Volume pricing", inStock: "In stock", onOrder: "Made to order", unavailable: "Availability to be confirmed", technical: "Technical specifications", documents: "Documents", similar: "Similar products", reviews: "Customer reviews", requestQuote: "Request a quote for this product" },
  cart: { title: "Your cart", empty: "Your cart is empty.", subtotal: "Subtotal", checkout: "Checkout", remove: "Remove", update: "Update" },
  common: { send: "Send", save: "Save", required: "required", back: "Back", yes: "Yes", no: "No" },
};

export function t(locale: string): Dict {
  return locale === "en" ? en : fr;
}

/** Choisit le champ localisé d'un objet (nameFr / nameEn). */
export function loc<T extends Record<string, unknown>>(obj: T, base: string, locale: string): string {
  const v = obj[`${base}${locale === "en" ? "En" : "Fr"}`] as string | undefined;
  return v || (obj[`${base}Fr`] as string) || "";
}
