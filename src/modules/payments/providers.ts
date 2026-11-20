import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Architecture de paiement évolutive.
 * Un moyen de paiement n'est proposé que s'il est réellement configuré.
 * Règle absolue : le statut "succeeded" n'est posé QUE par
 *   - un webhook dont la signature est vérifiée, ou
 *   - une vérification serveur auprès du prestataire, ou
 *   - un rapprochement bancaire manuel par un utilisateur habilité (payments.reconcile).
 */
export type PaymentMethod = { id: string; label: string; description: string; kind: "redirect" | "manual" | "test" };

export async function availableMethods(): Promise<PaymentMethod[]> {
  const methods: PaymentMethod[] = [];
  const bank = await db.setting.findUnique({ where: { key: "payment.bank_details" } });
  if (bank?.value.trim()) {
    methods.push({ id: "manual_transfer", label: "Virement bancaire", description: "Les coordonnées bancaires vous sont communiquées après validation. La commande est traitée à réception effective des fonds.", kind: "manual" });
  }
  if (process.env.WAVE_API_KEY && process.env.WAVE_WEBHOOK_SECRET) {
    methods.push({ id: "wave", label: "Wave", description: "Paiement mobile Wave.", kind: "redirect" });
  }
  if (process.env.ORANGE_MONEY_CLIENT_ID && process.env.ORANGE_MONEY_CLIENT_SECRET) {
    methods.push({ id: "orange_money", label: "Orange Money", description: "Paiement mobile Orange Money.", kind: "redirect" });
  }
  if (process.env.CARD_PROVIDER && process.env.CARD_PROVIDER_SECRET_KEY) {
    methods.push({ id: "card", label: "Carte Visa / Mastercard", description: "Paiement sécurisé par carte.", kind: "redirect" });
  }
  if (isTestMode()) {
    methods.push({ id: "test", label: "Paiement de test (développement)", description: "Simulateur local — n'encaisse aucun argent. Désactivé en production.", kind: "test" });
  }
  return methods;
}

export function isTestMode(): boolean {
  return process.env.PAYMENT_TEST_MODE === "true" && process.env.NODE_ENV !== "production";
}

/** Vérification HMAC-SHA256 générique d'un webhook (à adapter au format exact de chaque prestataire lors de l'intégration). */
export function verifyHmacSignature(rawBody: string, signatureHex: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  let given: Buffer;
  try { given = Buffer.from(signatureHex, "hex"); } catch { return false; }
  return given.length === expected.length && timingSafeEqual(given, expected);
}
