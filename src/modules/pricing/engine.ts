import { applyBp } from "@/lib/money";

/**
 * Moteur de tarification MBOUMINA PACK.
 * Fonctions pures, sans accès base : testées unitairement (tests/pricing.test.ts).
 * Aucune valeur par défaut de prix : tout vient de la configuration administrateur.
 */

export type Tier = { minQty: number; label: string; unitPriceMinor: number | null; negotiable: boolean };

export type VariantPricing = {
  priceMinor: number | null; // prix détail unitaire
  promoPriceMinor?: number | null;
  promoStartsAt?: Date | null;
  promoEndsAt?: Date | null;
  purchaseCostMinor?: number | null;
  tiers: Tier[];
  negotiatedUnitPriceMinor?: number | null; // prix négocié entreprise (B2B)
};

export type UnitPriceResult =
  | { kind: "price"; unitPriceMinor: number; source: "negotiated" | "promo" | "tier" | "base"; tierLabel?: string }
  | { kind: "on_quote"; reason: "negotiable_tier" | "no_price" ; tierLabel?: string };

export function isPromoActive(v: VariantPricing, now: Date): boolean {
  if (v.promoPriceMinor == null) return false;
  if (v.promoStartsAt && now < v.promoStartsAt) return false;
  if (v.promoEndsAt && now > v.promoEndsAt) return false;
  return true;
}

/** Palier applicable : le plus grand minQty <= quantité. */
export function findTier(tiers: Tier[], qty: number): Tier | undefined {
  return [...tiers].sort((a, b) => b.minQty - a.minQty).find((t) => qty >= t.minQty);
}

/**
 * Prix unitaire pour une quantité donnée. Priorité :
 * 1. prix négocié de l'entreprise ;
 * 2. palier "négociable" => sur devis ;
 * 3. le plus bas entre promotion active et palier ;
 * 4. prix de base.
 */
export function unitPrice(v: VariantPricing, qty: number, now = new Date()): UnitPriceResult {
  if (!Number.isInteger(qty) || qty < 1) throw new Error("Quantité invalide");
  if (v.negotiatedUnitPriceMinor != null) {
    return { kind: "price", unitPriceMinor: v.negotiatedUnitPriceMinor, source: "negotiated" };
  }
  const tier = findTier(v.tiers, qty);
  if (tier && (tier.negotiable || tier.unitPriceMinor == null)) {
    return { kind: "on_quote", reason: "negotiable_tier", tierLabel: tier.label };
  }
  const candidates: { price: number; source: "promo" | "tier" | "base"; label?: string }[] = [];
  if (tier?.unitPriceMinor != null) candidates.push({ price: tier.unitPriceMinor, source: "tier", label: tier.label });
  else if (v.priceMinor != null) candidates.push({ price: v.priceMinor, source: "base" });
  if (isPromoActive(v, now)) candidates.push({ price: v.promoPriceMinor!, source: "promo" });
  if (candidates.length === 0) return { kind: "on_quote", reason: "no_price" };
  const best = candidates.reduce((a, b) => (b.price < a.price ? b : a));
  return { kind: "price", unitPriceMinor: best.price, source: best.source, tierLabel: best.label };
}

export type Line = { qty: number; unitPriceMinor: number; unitCostMinor?: number | null; taxRateBp: number };

export type Adjustments = {
  coupon?: { kind: "percent" | "fixed"; value: number; minSubtotalMinor?: number | null } | null;
  shippingMinor?: number;
  additionalFeesMinor?: number;
};

export type Totals = {
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  feesMinor: number;
  taxMinor: number;
  totalMinor: number;
  costMinor: number | null; // null si un coût d'achat manque
  grossMarginMinor: number | null;
  grossMarginBp: number | null;
};

/**
 * Totaux d'une commande / d'un devis.
 * La remise est répartie proportionnellement sur les lignes avant calcul des taxes,
 * pour que la taxe porte sur le montant réellement facturé.
 * Le transport et les frais sont hors taxe produit (taxe transport configurable plus tard par juridiction).
 */
export function computeTotals(lines: Line[], adj: Adjustments = {}): Totals {
  const lineTotals = lines.map((l) => {
    if (!Number.isInteger(l.qty) || l.qty < 1) throw new Error("Quantité invalide");
    if (!Number.isInteger(l.unitPriceMinor) || l.unitPriceMinor < 0) throw new Error("Prix invalide");
    return l.qty * l.unitPriceMinor;
  });
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);

  let discount = 0;
  const c = adj.coupon;
  if (c && subtotal > 0 && (c.minSubtotalMinor == null || subtotal >= c.minSubtotalMinor)) {
    discount = c.kind === "percent" ? applyBp(subtotal, Math.min(c.value, 10_000)) : Math.min(c.value, subtotal);
  }

  // Répartition de la remise (méthode du plus grand reste pour que la somme soit exacte).
  const shares = lineTotals.map((t) => (subtotal === 0 ? 0 : Math.floor((t * discount) / subtotal)));
  let remainder = discount - shares.reduce((a, b) => a + b, 0);
  for (let i = 0; remainder > 0 && i < shares.length; i++, remainder--) shares[i]++;

  const tax = lines.reduce((sum, l, i) => sum + applyBp(lineTotals[i] - shares[i], l.taxRateBp), 0);
  const shipping = adj.shippingMinor ?? 0;
  const fees = adj.additionalFeesMinor ?? 0;
  const total = subtotal - discount + tax + shipping + fees;

  const hasAllCosts = lines.every((l) => l.unitCostMinor != null);
  const cost = hasAllCosts ? lines.reduce((s, l) => s + l.qty * (l.unitCostMinor as number), 0) : null;
  const netRevenue = subtotal - discount;
  const margin = cost == null ? null : netRevenue - cost;
  const marginBp = margin == null || netRevenue === 0 ? null : Math.round((margin * 10_000) / netRevenue);

  return {
    subtotalMinor: subtotal,
    discountMinor: discount,
    shippingMinor: shipping,
    feesMinor: fees,
    taxMinor: tax,
    totalMinor: total,
    costMinor: cost,
    grossMarginMinor: margin,
    grossMarginBp: marginBp,
  };
}

/** Prix de vente à partir d'un coût et d'une marge cible (taux de marge sur prix de vente). */
export function priceFromMargin(costMinor: number, targetMarginBp: number): number {
  if (targetMarginBp >= 10_000) throw new Error("Marge cible doit être < 100 %");
  return Math.ceil((costMinor * 10_000) / (10_000 - targetMarginBp));
}

/** Coût de revient unitaire d'un achat : prix fournisseur + quote-part des frais (transport entrant, douane, autres). */
export function landedUnitCost(lines: { qty: number; unitCostMinor: number }[], extraCostsMinor: number): number[] {
  const base = lines.reduce((s, l) => s + l.qty * l.unitCostMinor, 0);
  return lines.map((l) => {
    const lineBase = l.qty * l.unitCostMinor;
    const share = base === 0 ? 0 : (extraCostsMinor * lineBase) / base;
    return Math.round((lineBase + share) / l.qty);
  });
}

/** Nouveau coût moyen pondéré après une entrée en stock. */
export function weightedAverageCost(onHand: number, avgCostMinor: number | null, inQty: number, inUnitCostMinor: number): number {
  if (onHand <= 0 || avgCostMinor == null) return inUnitCostMinor;
  return Math.round((onHand * avgCostMinor + inQty * inUnitCostMinor) / (onHand + inQty));
}
