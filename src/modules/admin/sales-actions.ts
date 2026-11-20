"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseMoney } from "@/lib/money";
import { computeTotals } from "@/modules/pricing/engine";
import { redirect } from "next/navigation";
import { changeOrderStatus, recordVerifiedPayment, createOrderFromQuote, CheckoutError } from "@/modules/orders/service";
import { orderAccessToken } from "@/modules/orders/queries";
import { sendMail } from "@/lib/mail";
import { CUSTOMIZATION_STATUS_LABELS } from "@/lib/constants";

type State = { error?: string; ok?: string } | undefined;

// ───── Commandes ─────
export async function adminOrderStatus(_: State, fd: FormData): Promise<State> {
  const to = String(fd.get("to"));
  const u = await requireStaff(["processing", "packed"].includes(to) ? "orders.pick" : to === "shipped" || to === "delivered" ? "logistics.edit" : "orders.edit");
  try {
    await changeOrderStatus(String(fd.get("orderId")), to, u.id, String(fd.get("note") ?? "") || undefined);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/admin/commandes/${fd.get("orderId")}`);
  return { ok: "Statut mis à jour." };
}

/** Rapprochement bancaire : confirme un virement après constat de réception des fonds sur le relevé. */
export async function reconcileTransfer(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("payments.reconcile");
  const p = z.object({ orderId: z.string(), amount: z.string(), bankRef: z.string().trim().min(3, "Référence du relevé bancaire obligatoire").max(100) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0]?.message };
  const order = await db.order.findUniqueOrThrow({ where: { id: p.data.orderId } });
  const amount = parseMoney(p.data.amount, order.currency);
  if (amount == null || amount <= 0 || amount > order.totalMinor - order.paidMinor) return { error: "Montant invalide (doit être ≤ reste à payer)." };
  if (await db.payment.findUnique({ where: { providerRef: `BANK:${p.data.bankRef}` } })) return { error: "Cette référence bancaire a déjà été rapprochée." };
  const pending = await db.payment.findFirst({ where: { orderId: order.id, provider: "manual_transfer", status: "pending" } });
  const pay = pending
    ? await db.payment.update({ where: { id: pending.id }, data: { amountMinor: amount, providerRef: `BANK:${p.data.bankRef}` } })
    : await db.payment.create({ data: { orderId: order.id, provider: "manual_transfer", status: "pending", amountMinor: amount, currency: order.currency, providerRef: `BANK:${p.data.bankRef}` } });
  await recordVerifiedPayment(pay.id, u.id);
  await audit(u.id, "payment.reconcile", "Order", order.id, { amount, bankRef: p.data.bankRef });
  revalidatePath(`/admin/commandes/${order.id}`);
  return { ok: "Paiement rapproché et confirmé." };
}

export async function createShipment(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("logistics.edit");
  const p = z.object({ orderId: z.string(), carrierId: z.string().optional(), trackingNumber: z.string().max(80).optional(), packages: z.coerce.number().int().min(1).default(1) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Champs invalides." };
  await db.shipment.create({ data: { orderId: p.data.orderId, carrierId: p.data.carrierId || null, trackingNumber: p.data.trackingNumber || null, packages: p.data.packages, status: "preparing" } });
  await audit(u.id, "shipment.create", "Order", p.data.orderId);
  revalidatePath(`/admin/commandes/${p.data.orderId}`);
  return { ok: "Expédition créée." };
}

export async function updateShipment(fd: FormData) {
  const u = await requireStaff("logistics.edit");
  const id = String(fd.get("id"));
  const status = z.enum(["preparing", "shipped", "in_transit", "delayed", "delivered", "damaged", "returned"]).parse(fd.get("status"));
  const s = await db.shipment.update({ where: { id }, data: { status, ...(status === "shipped" ? { shippedAt: new Date() } : {}), ...(status === "delivered" ? { deliveredAt: new Date(), recipientName: String(fd.get("recipient") ?? "") || null } : {}) }, include: { order: true } });
  await db.orderEvent.create({ data: { orderId: s.orderId, status: s.order.status, note: `Colis : ${status}${status === "delayed" ? " — nous vous tiendrons informé" : ""}`, userId: u.id } });
  await audit(u.id, "shipment.status", "Shipment", id, { status });
  revalidatePath(`/admin/commandes/${s.orderId}`);
}

// ───── Devis ─────
export async function saveQuote(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("quotes.edit");
  const id = String(fd.get("quoteId"));
  const q = await db.quote.findUniqueOrThrow({ where: { id } });
  const currency = z.enum(["XOF", "XAF", "EUR", "USD"]).parse(fd.get("currency"));
  const lines: { variantId: string | null; description: string; qty: number; unitPriceMinor: number; taxRateBp: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const description = String(fd.get(`l_desc_${i}`) ?? "").trim();
    if (!description) continue;
    const qty = Number(fd.get(`l_qty_${i}`));
    const price = parseMoney(String(fd.get(`l_price_${i}`) ?? ""), currency);
    const taxRaw = String(fd.get(`l_tax_${i}`) ?? "").trim();
    const taxRateBp = taxRaw ? Math.round(Number(taxRaw.replace(",", ".")) * 100) : 0;
    if (!Number.isInteger(qty) || qty < 1 || price == null || !Number.isFinite(taxRateBp)) return { error: `Ligne ${i + 1} invalide (quantité entière, prix, taxe).` };
    lines.push({ variantId: String(fd.get(`l_variant_${i}`) ?? "") || null, description: description.slice(0, 300), qty, unitPriceMinor: price, taxRateBp });
  }
  const shipping = parseMoney(String(fd.get("shipping") ?? "0") || "0", currency) ?? 0;
  const discount = parseMoney(String(fd.get("discount") ?? "0") || "0", currency) ?? 0;
  const t = computeTotals(lines.map((l) => ({ qty: l.qty, unitPriceMinor: l.unitPriceMinor, taxRateBp: l.taxRateBp })), { coupon: discount ? { kind: "fixed", value: discount } : null, shippingMinor: shipping });
  const validUntil = String(fd.get("validUntil") ?? "");
  await db.$transaction([
    db.quoteLine.deleteMany({ where: { quoteId: id } }),
    db.quote.update({ where: { id }, data: { currency, subtotalMinor: t.subtotalMinor, discountMinor: t.discountMinor, shippingMinor: t.shippingMinor, taxMinor: t.taxMinor, totalMinor: t.totalMinor, validUntil: validUntil ? new Date(validUntil) : null, status: q.status === "requested" ? "draft" : q.status, assignedToId: q.assignedToId ?? u.id, lines: { create: lines } } }),
  ]);
  await audit(u.id, "quote.save", "Quote", id, { total: t.totalMinor });
  revalidatePath(`/admin/devis/${id}`);
  return { ok: "Devis enregistré." };
}

const QUOTE_TRANSITIONS: Record<string, string[]> = {
  requested: ["sent"], draft: ["sent"], revised: ["sent"],
  sent: ["accepted", "rejected", "expired", "revised"],
  accepted: ["revised"], rejected: ["revised"], expired: ["revised"],
};

export async function quoteStatus(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("quotes.edit");
  const id = String(fd.get("quoteId"));
  const to = z.enum(["sent", "accepted", "rejected", "expired", "revised"]).parse(fd.get("to"));
  const q = await db.quote.findUniqueOrThrow({ where: { id }, include: { lines: true } });
  if (!QUOTE_TRANSITIONS[q.status]?.includes(to)) return { error: `Action impossible depuis le statut actuel (${q.status}).` };
  if (to === "sent") {
    if (q.lines.length === 0 || q.totalMinor <= 0) return { error: "Le devis doit contenir des lignes chiffrées avant envoi." };
    if (!q.validUntil) return { error: "Indiquez une date de validité avant envoi." };
    const r = await sendMail(q.email, `Votre devis MBOUMINA PACK ${q.number}`, `Bonjour ${q.contactName},\n\nVotre devis ${q.number} est disponible (valable jusqu'au ${q.validUntil.toLocaleDateString("fr-FR")}).\nConsultez-le depuis votre espace client ou contactez-nous pour l'accepter.\n\nMBOUMINA PACK`);
    if (!r.delivered) await audit(u.id, "quote.mail_not_delivered", "Quote", id, { number: q.number, note: "Email non remis (SMTP non configuré) — transmettre le devis manuellement." });
  }
  await db.quote.update({ where: { id }, data: { status: to, ...(to === "revised" ? { revision: { increment: 1 }, status: "draft" } : {}), ...(to === "sent" ? { lastReminderAt: new Date() } : {}) } });
  await audit(u.id, `quote.${to}`, "Quote", id);
  revalidatePath(`/admin/devis/${id}`);
  return { ok: to === "sent" ? "Devis marqué comme envoyé (email : voir configuration SMTP)." : "Statut mis à jour." };
}

/** Transforme un devis accepté en commande, puis envoie (ou trace) le lien de paiement signé au client. */
export async function convertQuoteToOrder(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("orders.edit");
  const p = z.object({
    quoteId: z.string().min(1),
    fullName: z.string().trim().min(2, "Nom du destinataire requis").max(120),
    phone: z.string().trim().min(6, "Téléphone du destinataire requis").max(30),
    line1: z.string().trim().min(3, "Adresse de livraison requise").max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2, "Ville requise").max(100),
    region: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().max(20).optional(),
    country: z.string().length(2, "Pays requis"),
    deposit: z.string().trim().optional(),
    poReference: z.string().trim().max(60).optional(),
    notes: z.string().trim().max(1000).optional(),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Champs invalides." };
  const f = p.data;
  const deposit = f.deposit ? Number(f.deposit) : null;
  if (deposit != null && !Number.isInteger(deposit)) return { error: "Acompte : nombre entier de pourcents." };
  let order;
  try {
    order = await createOrderFromQuote({
      quoteId: f.quoteId, userId: u.id, coverageVerified: fd.get("coverageVerified") === "on", depositPercent: deposit,
      address: { fullName: f.fullName, phone: f.phone, line1: f.line1, line2: f.line2 || undefined, city: f.city, region: f.region || undefined, postalCode: f.postalCode || undefined, country: f.country.toUpperCase() },
      poReference: f.poReference, notes: f.notes,
    });
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.message };
    throw e;
  }
  const link = `${process.env.APP_URL ?? "http://localhost:3000"}/fr/paiement/${order.number}?t=${orderAccessToken(order.number)}`;
  const r = await sendMail(order.email, `Votre commande MBOUMINA PACK ${order.number}`, `Bonjour,\n\nSuite à l'acceptation de votre devis, votre commande ${order.number} est enregistrée.\nRèglement${order.depositPercent ? ` (acompte de ${order.depositPercent} % possible)` : ""} et suivi : ${link}\n\nLa commande est préparée après confirmation effective du paiement.\n\nMBOUMINA PACK`);
  if (!r.delivered) await audit(u.id, "order.mail_not_delivered", "Order", order.id, { number: order.number, note: "Email non remis (SMTP non configuré) — transmettre le lien de paiement depuis la fiche commande." });
  revalidatePath(`/admin/devis/${f.quoteId}`);
  redirect(`/admin/commandes/${order.id}?depuis=devis`);
}

// ───── Personnalisation ─────
export async function updateCustomization(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("customizations.edit");
  const id = String(fd.get("id"));
  const c = await db.customizationRequest.findUniqueOrThrow({ where: { id } });
  const status = String(fd.get("status"));
  if (!(status in CUSTOMIZATION_STATUS_LABELS)) return { error: "Statut inconnu." };
  const flags = { priceConfirmed: fd.get("priceConfirmed") === "on", leadTimeConfirmed: fd.get("leadTimeConfirmed") === "on", feasibilityConfirmed: fd.get("feasibilityConfirmed") === "on" };
  const batApproved = fd.get("batApproved") === "on";
  if (["confirmed", "in_production"].includes(status) && !(flags.priceConfirmed && flags.leadTimeConfirmed && flags.feasibilityConfirmed && (batApproved || c.batApprovedAt))) {
    return { error: "Impossible de confirmer : prix, délai, faisabilité et BAT validé par le client sont tous obligatoires." };
  }
  await db.customizationRequest.update({
    where: { id },
    data: { status, partnerId: String(fd.get("partnerId") ?? "") || null, ...flags, ...(batApproved && !c.batApprovedAt ? { batApprovedAt: new Date() } : {}) },
  });
  await audit(u.id, "customization.update", "CustomizationRequest", id, { status, ...flags, batApproved });
  revalidatePath(`/admin/personnalisations`);
  return { ok: "Demande mise à jour." };
}

export async function markHandled(fd: FormData) {
  const u = await requireStaff("customers.edit");
  const kind = String(fd.get("kind"));
  const id = String(fd.get("id"));
  const status = String(fd.get("status") ?? "done");
  if (kind === "message") await db.contactMessage.update({ where: { id }, data: { status } });
  if (kind === "sample") await db.sampleRequest.update({ where: { id }, data: { status } });
  await audit(u.id, `${kind}.status`, kind, id, { status });
  revalidatePath("/admin/demandes");
}
