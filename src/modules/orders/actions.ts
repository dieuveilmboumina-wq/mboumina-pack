"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { pricedCart, getCart } from "@/modules/cart/service";
import { shippingOptions } from "@/modules/logistics/service";
import { createOrder, CheckoutError, recordVerifiedPayment } from "./service";
import { availableMethods, isTestMode } from "@/modules/payments/providers";
import { cartWeight, findOrderForViewer, orderAccessToken } from "./queries";

const checkoutSchema = z.object({
  locale: z.enum(["fr", "en"]),
  email: z.string().email().max(200),
  fullName: z.string().min(2).max(120),
  phone: z.string().min(6).max(30),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  region: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().length(2),
  rateId: z.string().min(1),
  coupon: z.string().max(40).optional(),
  poReference: z.string().max(60).optional(),
  notes: z.string().max(2000).optional(),
  urgent: z.string().optional(),
  acceptTerms: z.literal("on"),
});

export type ActionState = { error?: string } | undefined;

export async function placeOrder(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Formulaire incomplet : vérifiez les champs obligatoires et l'acceptation des CGV." };
  const f = parsed.data;
  const user = await currentUser();
  const cart = await pricedCart(user?.companyId);
  if (cart.lines.length === 0) return { error: "Votre panier est vide." };
  if (cart.mixedCurrency) return { error: "Devises différentes dans le panier." };

  const weight = await cartWeight(cart.lines.map((l) => ({ variantId: l.variantId, qty: l.qty })));
  const options = await shippingOptions(f.country, f.city, weight, cart.subtotalMinor, cart.currency);
  const shipping = options.find((o) => o.rateId === f.rateId);
  if (!shipping) return { error: "Option de livraison indisponible pour cette adresse." };

  let requiresApproval = false;
  if (user?.companyId) {
    const company = await db.company.findUnique({ where: { id: user.companyId } });
    requiresApproval = !!company?.approvalThreshold && cart.subtotalMinor > company.approvalThreshold && user.companyRole !== "approver" && user.companyRole !== "owner";
  }

  let number: string;
  try {
    const order = await createOrder({
      userId: user?.id ?? null, companyId: user?.companyId ?? null, email: f.email.toLowerCase(),
      address: { fullName: f.fullName, phone: f.phone, line1: f.line1, line2: f.line2, city: f.city, region: f.region, postalCode: f.postalCode, country: f.country },
      shipping, lines: cart.lines, currency: cart.currency, couponCode: f.coupon || null,
      poReference: f.poReference || null, notes: f.notes || null, urgent: f.urgent === "on", requiresApproval,
    });
    number = order.number;
    const c = await getCart(false);
    if (c) await db.cartItem.deleteMany({ where: { cartId: c.id } });
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.message };
    throw e;
  }
  redirect(`/${f.locale}/paiement/${number}?t=${orderAccessToken(number)}`);
}

/** Suivi invité : numéro + email reçus en POST, puis redirection vers un lien signé (pas d'email dans l'URL). */
export async function trackOrder(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "fr";
  const number = String(formData.get("numero") ?? "").trim().toUpperCase().slice(0, 40);
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const order = number ? await findOrderForViewer(number, { email }) : null;
  if (!order) redirect(`/${locale}/suivi?introuvable=1`);
  redirect(`/${locale}/suivi?numero=${encodeURIComponent(order.number)}&t=${orderAccessToken(order.number)}`);
}

const paySchema = z.object({ number: z.string(), token: z.string().optional(), method: z.string(), kind: z.enum(["full", "deposit"]).default("full"), locale: z.enum(["fr", "en"]) });

export async function startPayment(formData: FormData) {
  const f = paySchema.parse(Object.fromEntries(formData));
  const order = await findOrderForViewer(f.number, { token: f.token });
  if (!order || !["pending_payment", "partially_paid"].includes(order.status)) throw new Error("Commande non payable");
  const methods = await availableMethods();
  const m = methods.find((x) => x.id === f.method);
  if (!m) throw new Error("Moyen de paiement indisponible");
  const due = order.totalMinor - order.paidMinor;
  const amount = f.kind === "deposit" && order.depositPercent ? Math.ceil((order.totalMinor * order.depositPercent) / 100) : due;

  const payment = await db.payment.create({ data: { orderId: order.id, provider: m.id, kind: f.kind === "deposit" ? "deposit" : order.paidMinor > 0 ? "balance" : "full", status: m.kind === "manual" ? "pending" : "initiated", amountMinor: Math.min(amount, due), currency: order.currency } });
  const q = `?t=${orderAccessToken(order.number)}`;

  if (m.kind === "test") {
    if (!isTestMode()) throw new Error("Mode test désactivé");
    // Simulateur : équivaut à un webhook vérifié du prestataire, uniquement en développement.
    await recordVerifiedPayment(payment.id, "test-simulator");
    redirect(`/${f.locale}/confirmation/${order.number}${q}`);
  }
  if (m.kind === "manual") {
    await db.orderEvent.create({ data: { orderId: order.id, status: order.status, note: "Paiement par virement annoncé — en attente de réception des fonds" } });
    redirect(`/${f.locale}/confirmation/${order.number}${q}`);
  }
  // Prestataires à redirection : l'intégration réelle (création de session de paiement) sera branchée avec les clés marchandes.
  await db.payment.update({ where: { id: payment.id }, data: { status: "failed", failureReason: "Intégration prestataire non finalisée" } });
  redirect(`/${f.locale}/paiement/${order.number}${q}&erreur=prestataire`);
}
