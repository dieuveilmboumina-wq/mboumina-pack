import { db } from "@/lib/db";
import { audit, nextNumber } from "@/lib/audit";
import { computeTotals } from "@/modules/pricing/engine";
import { ORDER_TRANSITIONS } from "@/lib/constants";
import type { PricedLine } from "@/modules/cart/service";
import type { ShippingOption } from "@/modules/logistics/service";
import type { Prisma } from "@prisma/client";

export type CheckoutInput = {
  userId: string | null;
  companyId: string | null;
  email: string;
  address: { fullName: string; phone: string; line1: string; line2?: string; city: string; region?: string; postalCode?: string; country: string };
  shipping: ShippingOption;
  lines: PricedLine[];
  currency: string;
  couponCode?: string | null;
  poReference?: string | null;
  notes?: string | null;
  urgent?: boolean;
  requiresApproval: boolean;
};

export class CheckoutError extends Error {}

/** Crée la commande et réserve le stock dans une transaction. Les prix sont recalculés côté serveur (pricedCart). */
export async function createOrder(input: CheckoutInput) {
  if (input.lines.length === 0) throw new CheckoutError("Panier vide.");
  if (input.lines.some((l) => l.onQuote)) throw new CheckoutError("Certains articles sont sur devis : retirez-les ou demandez un devis.");
  for (const l of input.lines) {
    if (l.qty < l.moq) throw new CheckoutError(`Quantité minimale non atteinte pour ${l.name}.`);
    if (l.sourcingMode === "stock" && l.available < l.qty) throw new CheckoutError(`Stock insuffisant pour ${l.name} (${l.available} disponibles).`);
  }

  const country = await db.country.findUnique({ where: { code: input.address.country } });
  const taxRateBp = country?.taxRateBp ?? 0;

  let coupon = null;
  if (input.couponCode) {
    const c = await db.coupon.findUnique({ where: { code: input.couponCode.toUpperCase() } });
    const now = new Date();
    if (c && c.active && (!c.startsAt || c.startsAt <= now) && (!c.endsAt || c.endsAt >= now) && (c.maxUses == null || c.usedCount < c.maxUses) && (!c.currency || c.currency === input.currency)) coupon = c;
    else throw new CheckoutError("Code promo invalide ou expiré.");
  }

  const totals = computeTotals(
    input.lines.map((l) => ({ qty: l.qty, unitPriceMinor: l.unitPriceMinor!, unitCostMinor: l.unitCostMinor, taxRateBp })),
    { coupon: coupon ? { kind: coupon.kind as "percent" | "fixed", value: coupon.value, minSubtotalMinor: coupon.minSubtotalMinor } : null, shippingMinor: input.shipping.priceMinor },
  );

  const number = await nextNumber("CMD");
  return db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        number, userId: input.userId, companyId: input.companyId, email: input.email,
        status: input.requiresApproval ? "pending_approval" : "pending_payment",
        currency: input.currency, subtotalMinor: totals.subtotalMinor, discountMinor: totals.discountMinor,
        shippingMinor: totals.shippingMinor, taxMinor: totals.taxMinor, totalMinor: totals.totalMinor,
        couponCode: coupon?.code, shippingAddress: JSON.stringify(input.address), shippingRateId: input.shipping.rateId,
        shippingService: `${input.shipping.carrierName} — ${input.shipping.service} (${input.shipping.minDays}-${input.shipping.maxDays} j)`,
        poReference: input.poReference, notes: input.notes, urgent: !!input.urgent,
        lines: {
          create: input.lines.map((l) => ({
            variantId: l.variantId, sku: l.sku, name: `${l.name} — ${l.variantLabel}`, qty: l.qty,
            unitPriceMinor: l.unitPriceMinor!, unitCostMinor: l.unitCostMinor, taxRateBp, lineTotalMinor: l.lineTotalMinor!,
          })),
        },
        events: { create: { status: input.requiresApproval ? "pending_approval" : "pending_payment", note: "Commande créée" } },
      },
    });
    if (coupon) await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
    for (const l of input.lines.filter((x) => x.sourcingMode === "stock")) await reserveStock(tx, l.variantId, l.qty, order.id);
    return order;
  });
}

export type QuoteConversionInput = {
  quoteId: string;
  userId: string; // employé qui convertit
  address: { fullName: string; phone: string; line1: string; line2?: string; city: string; region?: string; postalCode?: string; country: string };
  coverageVerified: boolean; // transport vérifié pour cette adresse (obligatoire si le pays n'est pas ouvert à la vente en ligne)
  depositPercent: number | null;
  poReference?: string | null;
  notes?: string | null;
};

/**
 * Transforme un devis ACCEPTÉ en commande « en attente de paiement », aux prix, taxes, remise et transport du devis.
 * Réserve le stock des articles catalogue gérés en stock ; refuse si le stock libre est insuffisant.
 * Aucune donnée n'est inventée : coût d'achat repris seulement s'il est connu dans la devise du devis.
 */
export async function createOrderFromQuote(input: QuoteConversionInput) {
  const q = await db.quote.findUnique({ where: { id: input.quoteId }, include: { lines: true } });
  if (!q) throw new CheckoutError("Devis introuvable.");
  if (q.status !== "accepted") throw new CheckoutError("Seul un devis accepté par le client peut devenir une commande.");
  if (q.orderId) throw new CheckoutError("Ce devis a déjà été transformé en commande.");
  if (q.lines.length === 0 || q.totalMinor <= 0) throw new CheckoutError("Le devis ne contient aucune ligne chiffrée.");

  const country = await db.country.findUnique({ where: { code: input.address.country } });
  if (!country) throw new CheckoutError("Pays de livraison inconnu.");
  if (!country.sellingEnabled && !input.coverageVerified) {
    throw new CheckoutError(`La livraison vers ${country.nameFr} n'est pas ouverte en ligne : cochez « transport vérifié pour cette adresse » après confirmation avec le transporteur.`);
  }
  if (input.depositPercent != null && (input.depositPercent < 1 || input.depositPercent > 99)) throw new CheckoutError("Acompte : pourcentage entre 1 et 99.");

  const variantIds = q.lines.map((l) => l.variantId).filter((v): v is string => !!v);
  const variants = await db.productVariant.findMany({ where: { id: { in: variantIds } }, include: { product: true, stockLevels: { where: { warehouse: { active: true } } } } });
  const byId = new Map(variants.map((v) => [v.id, v]));

  // Contrôle du stock libre (articles catalogue gérés en stock), regroupé par variante.
  const need = new Map<string, number>();
  for (const l of q.lines) if (l.variantId && byId.get(l.variantId)?.product.sourcingMode === "stock") need.set(l.variantId, (need.get(l.variantId) ?? 0) + l.qty);
  const short = [...need].flatMap(([id, qty]) => {
    const v = byId.get(id)!;
    const free = v.stockLevels.reduce((s, x) => s + x.onHand - x.reserved - x.blocked, 0);
    return free < qty ? [`${v.sku} : ${free} disponibles pour ${qty} demandés`] : [];
  });
  if (short.length) throw new CheckoutError(`Stock insuffisant — ${short.join(" ; ")}. Réceptionnez le stock ou révisez le devis.`);

  const number = await nextNumber("CMD");
  return db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        number, userId: q.userId, companyId: q.companyId, email: q.email, status: "pending_payment", currency: q.currency,
        subtotalMinor: q.subtotalMinor, discountMinor: q.discountMinor, shippingMinor: q.shippingMinor, taxMinor: q.taxMinor, totalMinor: q.totalMinor,
        depositPercent: input.depositPercent, shippingAddress: JSON.stringify(input.address),
        shippingService: `Transport selon devis ${q.number}`, poReference: input.poReference || null, notes: input.notes || null,
        lines: {
          create: q.lines.map((l) => {
            const v = l.variantId ? byId.get(l.variantId) : undefined;
            return {
              variantId: v?.id ?? null, sku: v?.sku ?? "HORS-CATALOGUE", name: l.description, qty: l.qty,
              unitPriceMinor: l.unitPriceMinor, taxRateBp: l.taxRateBp, lineTotalMinor: l.unitPriceMinor * l.qty,
              unitCostMinor: v && v.currency === q.currency ? v.purchaseCostMinor : null,
            };
          }),
        },
        events: { create: [{ status: "pending_payment", note: `Commande créée depuis le devis ${q.number}`, userId: input.userId }] },
      },
    });
    for (const [variantId, qty] of need) await reserveStock(tx, variantId, qty, order.id);
    // Verrou contre la double conversion : ne met à jour que si le devis est toujours accepté et sans commande.
    const done = await tx.quote.updateMany({ where: { id: q.id, status: "accepted", orderId: null }, data: { status: "converted", orderId: order.id } });
    if (done.count !== 1) throw new CheckoutError("Ce devis vient d'être transformé par une autre personne.");
    await tx.auditLog.create({ data: { userId: input.userId, action: "quote.convert", entity: "Quote", entityId: q.id, data: JSON.stringify({ order: number }) } });
    return order;
  });
}

/** Réserve la quantité sur les entrepôts disposant de stock libre (ordre : plus grand stock d'abord). */
async function reserveStock(tx: Prisma.TransactionClient, variantId: string, qty: number, orderId: string) {
  const levels = await tx.stockLevel.findMany({ where: { variantId, warehouse: { active: true } } });
  let left = qty;
  for (const lvl of levels.sort((a, b) => (b.onHand - b.reserved - b.blocked) - (a.onHand - a.reserved - a.blocked))) {
    const free = lvl.onHand - lvl.reserved - lvl.blocked;
    if (free <= 0 || left <= 0) continue;
    const take = Math.min(free, left);
    await tx.stockLevel.update({ where: { variantId_warehouseId: { variantId, warehouseId: lvl.warehouseId } }, data: { reserved: { increment: take } } });
    await tx.stockMovement.create({ data: { variantId, warehouseId: lvl.warehouseId, type: "reserve", qty: 0, note: `Réservation ${take}`, refType: "order", refId: orderId } });
    left -= take;
  }
  if (left > 0) throw new CheckoutError("Stock insuffisant au moment de la réservation.");
}

/** Libère les réservations d'une commande (annulation). */
async function releaseStock(tx: Prisma.TransactionClient, orderId: string) {
  const reserves = await tx.stockMovement.findMany({ where: { refType: "order", refId: orderId, type: "reserve" } });
  for (const r of reserves) {
    const qty = Number(r.note?.match(/\d+/)?.[0] ?? 0);
    if (!qty) continue;
    await tx.stockLevel.update({ where: { variantId_warehouseId: { variantId: r.variantId, warehouseId: r.warehouseId } }, data: { reserved: { decrement: qty } } });
    await tx.stockMovement.create({ data: { variantId: r.variantId, warehouseId: r.warehouseId, type: "release", qty: 0, note: `Libération ${qty}`, refType: "order", refId: orderId } });
  }
}

/** Sortie de stock à l'expédition : la réservation devient une sortie réelle. */
async function shipStock(tx: Prisma.TransactionClient, orderId: string, userId: string | null) {
  const reserves = await tx.stockMovement.findMany({ where: { refType: "order", refId: orderId, type: "reserve" } });
  for (const r of reserves) {
    const qty = Number(r.note?.match(/\d+/)?.[0] ?? 0);
    if (!qty) continue;
    await tx.stockLevel.update({ where: { variantId_warehouseId: { variantId: r.variantId, warehouseId: r.warehouseId } }, data: { reserved: { decrement: qty }, onHand: { decrement: qty } } });
    await tx.stockMovement.create({ data: { variantId: r.variantId, warehouseId: r.warehouseId, type: "sale", qty: -qty, refType: "order", refId: orderId, userId } });
  }
}

export async function changeOrderStatus(orderId: string, to: string, userId: string | null, note?: string, visibleToCustomer = true) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (!ORDER_TRANSITIONS[order.status]?.includes(to)) throw new Error(`Transition interdite : ${order.status} → ${to}`);
    // Règle absolue : « payée » / « acompte reçu » ne se posent jamais à la main, seulement via un paiement vérifié.
    if (to === "paid" && order.paidMinor < order.totalMinor) throw new Error("Statut « Payée » refusé : aucun paiement vérifié ne couvre le total. Utilisez le rapprochement bancaire ou attendez la confirmation du prestataire.");
    if (to === "partially_paid" && order.paidMinor <= 0) throw new Error("Statut « Acompte reçu » refusé : aucun paiement vérifié enregistré.");
    if (to === "cancelled") await releaseStock(tx, orderId);
    if (to === "shipped") await shipStock(tx, orderId, userId);
    const updated = await tx.order.update({ where: { id: orderId }, data: { status: to } });
    await tx.orderEvent.create({ data: { orderId, status: to, note, userId, visibleToCustomer } });
    await tx.auditLog.create({ data: { userId, action: "order.status", entity: "Order", entityId: orderId, data: JSON.stringify({ from: order.status, to }) } });
    return updated;
  });
}

/**
 * Enregistre un paiement VÉRIFIÉ et met à jour la commande.
 * Appelé uniquement depuis : webhook signé, vérification API, rapprochement manuel habilité, simulateur de test (dev).
 */
export async function recordVerifiedPayment(paymentId: string, verifiedBy: string) {
  return db.$transaction(async (tx) => {
    const pay = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true } });
    if (pay.status === "succeeded") return pay; // idempotence
    await tx.payment.update({ where: { id: pay.id }, data: { status: "succeeded", verifiedAt: new Date(), verifiedBy } });
    const paid = pay.order.paidMinor + pay.amountMinor;
    const status = paid >= pay.order.totalMinor ? "paid" : "partially_paid";
    await tx.order.update({ where: { id: pay.orderId }, data: { paidMinor: paid, status } });
    await tx.orderEvent.create({ data: { orderId: pay.orderId, status, note: `Paiement confirmé (${pay.provider})` } });
    if (status === "paid") {
      const invNumber = await nextNumberTx(tx, "FAC");
      await tx.invoice.create({ data: { number: invNumber, orderId: pay.orderId, currency: pay.order.currency, totalMinor: pay.order.totalMinor, taxMinor: pay.order.taxMinor } });
      await createPartnerPurchaseOrders(tx, pay.orderId);
    }
    await tx.auditLog.create({ data: { action: "payment.verified", entity: "Payment", entityId: pay.id, data: JSON.stringify({ verifiedBy, amount: pay.amountMinor }) } });
    return pay;
  });
}

async function nextNumberTx(tx: Prisma.TransactionClient, prefix: string) {
  const year = new Date().getFullYear();
  const key = `seq:${prefix}:${year}`;
  const s = await tx.setting.findUnique({ where: { key } });
  const next = (s ? Number(s.value) : 0) + 1;
  await tx.setting.upsert({ where: { key }, create: { key, value: String(next) }, update: { value: String(next) } });
  return `${prefix}-${year}-${String(next).padStart(6, "0")}`;
}

/**
 * Modèle "achat chez le partenaire après validation de la commande client" :
 * pour les produits configurés en partner_on_order, une commande fournisseur BROUILLON est préparée
 * (validation hiérarchique requise avant envoi).
 */
async function createPartnerPurchaseOrders(tx: Prisma.TransactionClient, orderId: string) {
  const lines = await tx.orderLine.findMany({ where: { orderId }, include: { variant: { include: { product: true, supplierItems: true } } } });
  const bySupplier = new Map<string, typeof lines>();
  for (const l of lines) {
    if (!l.variant) continue; // ligne hors catalogue : achat partenaire géré manuellement
    const p = l.variant.product;
    if (p.sourcingMode !== "partner_on_order" || !p.supplierId) continue;
    bySupplier.set(p.supplierId, [...(bySupplier.get(p.supplierId) ?? []), l]);
  }
  if (bySupplier.size === 0) return;
  const wh = await tx.warehouse.findFirst({ where: { active: true } });
  if (!wh) {
    await tx.orderEvent.create({ data: { orderId, status: "paid", note: "Achat partenaire à créer manuellement : aucun entrepôt actif configuré.", visibleToCustomer: false } });
    return;
  }
  for (const [supplierId, ls] of bySupplier) {
    const number = await nextNumberTx(tx, "ACH");
    await tx.purchaseOrder.create({
      data: {
        number, supplierId, warehouseId: wh.id, status: "pending_approval", currency: ls[0].variant!.supplierItems.find((s) => s.supplierId === supplierId)?.currency ?? "XOF",
        linkedOrderId: orderId, notes: "Généré automatiquement après paiement de la commande client.",
        lines: { create: ls.map((l) => ({ variantId: l.variantId!, qty: l.qty, unitCostMinor: l.variant!.supplierItems.find((s) => s.supplierId === supplierId)?.costMinor ?? l.unitCostMinor ?? 0 })) },
      },
    });
  }
}

export { audit };
