/**
 * Montants manipulés exclusivement en entiers (unité mineure de la devise).
 * XOF (FCFA) : 0 décimale ; EUR / USD : 2 décimales.
 */
export const CURRENCY_DECIMALS: Record<string, number> = { XOF: 0, XAF: 0, EUR: 2, USD: 2 };

export function decimalsOf(currency: string): number {
  return CURRENCY_DECIMALS[currency] ?? 2;
}

/** Arrondi bancaire "demi à l'écart de zéro" sur un entier issu d'une division. */
export function roundDiv(numerator: number, denominator: number): number {
  if (denominator === 0) throw new Error("Division par zéro");
  const q = numerator / denominator;
  return q >= 0 ? Math.floor(q + 0.5) : -Math.floor(-q + 0.5);
}

/** Applique un taux en points de base (1 % = 100 bp). */
export function applyBp(amountMinor: number, bp: number): number {
  return roundDiv(amountMinor * bp, 10_000);
}

export function formatMoney(amountMinor: number, currency: string, locale = "fr"): string {
  const d = decimalsOf(currency);
  const value = amountMinor / 10 ** d;
  const intlLocale = locale === "en" ? "en-GB" : "fr-FR";
  if (currency === "XOF" || currency === "XAF") {
    return `${new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 }).format(value)} FCFA`;
  }
  return new Intl.NumberFormat(intlLocale, { style: "currency", currency, minimumFractionDigits: d }).format(value);
}

/** Convertit une saisie utilisateur ("1 250,50") en unité mineure. Retourne null si invalide. */
export function parseMoney(input: string, currency: string): number | null {
  const cleaned = input.replace(/\s| /g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const d = decimalsOf(currency);
  const [int, frac = ""] = cleaned.split(".");
  if (frac.length > d) return null;
  return Number(int) * 10 ** d + Number((frac + "0".repeat(d)).slice(0, d) || "0");
}

/**
 * Conversion de devise à partir d'un taux daté (texte décimal).
 * Utilisé pour l'AFFICHAGE uniquement ; le paiement se fait dans la devise de la commande.
 */
export function convert(amountMinor: number, from: string, to: string, rate: string): number {
  const r = Number(rate);
  if (!Number.isFinite(r) || r <= 0) throw new Error("Taux de change invalide");
  const major = amountMinor / 10 ** decimalsOf(from);
  return Math.round(major * r * 10 ** decimalsOf(to));
}
