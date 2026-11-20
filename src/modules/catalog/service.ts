import { db } from "@/lib/db";
import { ci } from "@/lib/search";
import { unitPrice, type VariantPricing } from "@/modules/pricing/engine";
import type { Prisma } from "@prisma/client";

export const productInclude = {
  category: true,
  media: { orderBy: { sort: "asc" } },
  variants: { where: { active: true }, include: { tiers: { orderBy: { minQty: "asc" } }, stockLevels: true } },
} satisfies Prisma.ProductInclude;

export type ProductFull = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
export type VariantFull = ProductFull["variants"][number];

export function variantPricing(v: VariantFull, negotiated?: number | null): VariantPricing {
  return {
    priceMinor: v.priceMinor,
    promoPriceMinor: v.promoPriceMinor,
    promoStartsAt: v.promoStartsAt,
    promoEndsAt: v.promoEndsAt,
    purchaseCostMinor: v.purchaseCostMinor,
    tiers: v.tiers.map((t) => ({ minQty: t.minQty, label: t.label, unitPriceMinor: t.unitPriceMinor, negotiable: t.negotiable })),
    negotiatedUnitPriceMinor: negotiated ?? null,
  };
}

/** Stock vendable = en main − réservé − bloqué, tous entrepôts actifs. */
export function availableQty(v: VariantFull): number {
  return v.stockLevels.reduce((s, l) => s + Math.max(0, l.onHand - l.reserved - l.blocked), 0);
}

export type Availability = "in_stock" | "on_order" | "unknown";
export function availability(p: ProductFull): Availability {
  if (p.variants.some((v) => availableQty(v) > 0)) return "in_stock";
  if (p.sourcingMode === "partner_on_order" && p.leadTimeDays != null) return "on_order";
  return "unknown";
}

/** Prix "à partir de" affiché sur les cartes produits (plus bas prix connu à la quantité minimale). */
export function displayPrice(p: ProductFull): { minor: number; currency: string; promo: boolean } | null {
  let best: { minor: number; currency: string; promo: boolean } | null = null;
  for (const v of p.variants) {
    const r = unitPrice(variantPricing(v), Math.max(1, p.moq));
    if (r.kind === "price" && (!best || r.unitPriceMinor < best.minor)) {
      best = { minor: r.unitPriceMinor, currency: v.currency, promo: r.source === "promo" };
    }
  }
  return best;
}

export type CatalogFilter = {
  q?: string;
  category?: string;
  flag?: "new" | "promo" | "best" | "eco" | "custom";
  sort?: "recent" | "name" | "price_asc" | "price_desc";
};

export async function listProducts(f: CatalogFilter) {
  const where: Prisma.ProductWhereInput = { status: "active" };
  if (f.category) where.category = { slug: f.category };
  if (f.q) {
    const q = f.q.trim().slice(0, 100);
    where.OR = [
      { nameFr: ci(q) }, { nameEn: ci(q) }, { sku: ci(q) },
      { materials: ci(q) }, { descCommercialFr: ci(q) },
    ];
  }
  if (f.flag === "new") where.isNew = true;
  if (f.flag === "eco") where.isEco = true;
  if (f.flag === "custom") where.isCustomizable = true;
  if (f.flag === "promo") where.variants = { some: { promoPriceMinor: { not: null }, OR: [{ promoEndsAt: null }, { promoEndsAt: { gte: new Date() } }] } };

  let products = await db.product.findMany({
    where, include: productInclude,
    orderBy: f.sort === "name" ? { nameFr: "asc" } : { createdAt: "desc" },
    take: 200,
  });

  if (f.flag === "best") {
    // Meilleures ventes : calculées sur les quantités réellement commandées (commandes payées ou au-delà).
    const sales = await db.orderLine.groupBy({
      by: ["variantId"], _sum: { qty: true },
      where: { order: { status: { in: ["paid", "processing", "packed", "shipped", "delivered", "completed"] } } },
    });
    const byVariant = new Map(sales.map((s) => [s.variantId, s._sum.qty ?? 0]));
    const score = (p: ProductFull) => p.variants.reduce((s, v) => s + (byVariant.get(v.id) ?? 0), 0);
    products = products.filter((p) => score(p) > 0).sort((a, b) => score(b) - score(a));
  }
  if (f.sort === "price_asc" || f.sort === "price_desc") {
    const dir = f.sort === "price_asc" ? 1 : -1;
    products.sort((a, b) => ((displayPrice(a)?.minor ?? Infinity) - (displayPrice(b)?.minor ?? Infinity)) * dir);
  }
  return products;
}

export async function getProductBySlug(slug: string) {
  return db.product.findFirst({ where: { slug, status: "active" }, include: { ...productInclude, documents: { where: { isPublic: true, verifiedAt: { not: null } } }, reviews: { where: { status: "approved" }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } } } });
}

export async function similarProducts(p: { id: string; categoryId: string }) {
  return db.product.findMany({ where: { status: "active", categoryId: p.categoryId, NOT: { id: p.id } }, include: productInclude, take: 4 });
}
