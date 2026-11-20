import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function cartWeight(items: { variantId: string; qty: number }[]): Promise<number> {
  const variants = await db.productVariant.findMany({ where: { id: { in: items.map((i) => i.variantId) } }, include: { product: true } });
  return items.reduce((s, i) => s + (variants.find((v) => v.id === i.variantId)?.product.weightGrams ?? 0) * i.qty, 0);
}

/**
 * Jeton d'accès signé à une commande (HMAC du numéro avec APP_SECRET).
 * Remplace l'email dans les URL : aucune donnée personnelle dans les liens, l'historique ou les journaux.
 */
export function orderAccessToken(number: string): string {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) throw new Error("APP_SECRET manquant ou trop court");
  return createHmac("sha256", secret).update(`order-access:${number}`).digest("base64url").slice(0, 32);
}

function tokenMatches(number: string, token: string): boolean {
  const expected = Buffer.from(orderAccessToken(number));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Accès à une commande : propriétaire connecté, membre de l'entreprise,
 * jeton signé (lien reçu après commande) ou numéro + email (formulaire de suivi, envoyé en POST).
 */
export async function findOrderForViewer(number: string, cred: { email?: string; token?: string } = {}) {
  const user = await currentUser();
  const order = await db.order.findUnique({
    where: { number },
    include: { lines: true, payments: true, events: { where: { visibleToCustomer: true }, orderBy: { createdAt: "asc" } }, shipments: { include: { carrier: true } }, invoices: true },
  });
  if (!order) return null;
  const owns =
    (user && (order.userId === user.id || (user.companyId && order.companyId === user.companyId))) ||
    (cred.token && tokenMatches(order.number, cred.token)) ||
    (cred.email && order.email === cred.email.trim().toLowerCase());
  return owns ? order : null;
}
