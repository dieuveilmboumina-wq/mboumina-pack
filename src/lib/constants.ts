export const ROLES = ["founder", "admin", "sales", "stock", "accountant", "picker", "logistics", "customer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  founder: "Fondateur",
  admin: "Administrateur",
  sales: "Commercial",
  stock: "Responsable des stocks",
  accountant: "Comptable",
  picker: "Préparateur de commandes",
  logistics: "Responsable logistique",
  customer: "Client",
};

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export const ORDER_STATUSES = [
  "pending_approval", "pending_payment", "partially_paid", "paid", "processing", "packed",
  "shipped", "delivered", "completed", "cancelled", "refunded",
] as const;
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_approval: "En attente de validation interne",
  pending_payment: "En attente de paiement",
  partially_paid: "Acompte reçu",
  paid: "Payée",
  processing: "En préparation",
  packed: "Emballée",
  shipped: "Expédiée",
  delivered: "Livrée",
  completed: "Terminée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};
/** Transitions autorisées de statut de commande. */
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending_approval: ["pending_payment", "cancelled"],
  pending_payment: ["partially_paid", "paid", "cancelled"],
  partially_paid: ["paid", "processing", "cancelled"],
  paid: ["processing", "refunded"],
  processing: ["packed", "cancelled"],
  packed: ["shipped"],
  shipped: ["delivered"],
  delivered: ["completed", "refunded"],
  completed: [],
  cancelled: [],
  refunded: [],
};

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  requested: "Demande reçue",
  draft: "En préparation",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
  converted: "Converti en commande",
  revised: "Révisé",
};

export const CUSTOMIZATION_STATUS_LABELS: Record<string, string> = {
  submitted: "Demande reçue",
  reviewing: "En étude",
  sent_to_partner: "Transmise au partenaire",
  mockup_sent: "Maquette envoyée",
  quoted: "Devis envoyé",
  bat_sent: "BAT envoyé",
  bat_approved: "BAT validé",
  confirmed: "Commande confirmée",
  in_production: "En réalisation chez le partenaire",
  delivered: "Livrée",
  cancelled: "Annulée",
};
