import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/password";
import { unitPrice, computeTotals } from "@/modules/pricing/engine";
import { productInclude, variantPricing, availableQty } from "@/modules/catalog/service";

const CART_COOKIE = "mp_cart";

export async function getCartToken(create: boolean): Promise<string | null> {
  const jar = await cookies();
  let token = jar.get(CART_COOKIE)?.value ?? null;
  if (!token && create) {
    token = randomToken(24);
    jar.set(CART_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60 });
  }
  return token;
}

export async function getCart(create = false) {
  const token = await getCartToken(create);
  if (!token) return null;
  const existing = await db.cart.findUnique({ where: { token } });
  if (existing || !create) return existing;
  return db.cart.create({ data: { token } });
}

export async function negotiatedPrices(companyId: string | null | undefined): Promise<Map<string, number>> {
  if (!companyId) return new Map();
  const rows = await db.negotiatedPrice.findMany({ where: { companyId, OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] } });
  return new Map(rows.map((r) => [r.variantId, r.unitPriceMinor]));
}

export type PricedLine = {
  itemId: string; variantId: string; productSlug: string; name: string; variantLabel: string; sku: string;
  qty: number; moq: number; currency: string; unitPriceMinor: number | null; lineTotalMinor: number | null;
  unitCostMinor: number | null; tierLabel?: string; onQuote: boolean; available: number; sourcingMode: string; image?: string;
};

/** Valorise le panier côté serveur (le navigateur n'envoie jamais de prix). */
export async function pricedCart(companyId?: string | null) {
  const cart = await getCart(false);
  if (!cart) return { cart: null, lines: [] as PricedLine[], currency: "XOF", subtotalMinor: 0, hasQuoteItems: false, mixedCurrency: false };
  const items = await db.cartItem.findMany({
    where: { cartId: cart.id },
    include: { variant: { include: { tiers: { orderBy: { minQty: "asc" } }, stockLevels: true, product: { include: productInclude } } } },
  });
  const neg = await negotiatedPrices(companyId);
  const lines: PricedLine[] = items.map((it) => {
    const v = it.variant;
    const p = v.product;
    const r = unitPrice(variantPricing(v as never, neg.get(v.id)), it.qty);
    const price = r.kind === "price" ? r.unitPriceMinor : null;
    return {
      itemId: it.id, variantId: v.id, productSlug: p.slug, name: p.nameFr, variantLabel: v.label, sku: v.sku,
      qty: it.qty, moq: p.moq, currency: v.currency, unitPriceMinor: price, lineTotalMinor: price == null ? null : price * it.qty,
      unitCostMinor: v.purchaseCostMinor, tierLabel: r.tierLabel, onQuote: r.kind === "on_quote",
      available: availableQty(v as never), sourcingMode: p.sourcingMode, image: p.media[0]?.url,
    };
  });
  const currencies = new Set(lines.map((l) => l.currency));
  const priced = lines.filter((l) => !l.onQuote);
  const totals = computeTotals(priced.map((l) => ({ qty: l.qty, unitPriceMinor: l.unitPriceMinor!, taxRateBp: 0 })));
  return {
    cart, lines, currency: lines[0]?.currency ?? "XOF", subtotalMinor: totals.subtotalMinor,
    hasQuoteItems: lines.some((l) => l.onQuote), mixedCurrency: currencies.size > 1,
  };
}
