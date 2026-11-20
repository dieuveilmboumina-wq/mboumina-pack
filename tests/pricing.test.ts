import { describe, it, expect } from "vitest";
import { unitPrice, computeTotals, priceFromMargin, landedUnitCost, weightedAverageCost, type VariantPricing } from "@/modules/pricing/engine";
import { formatMoney, parseMoney, convert } from "@/lib/money";

// Valeurs de TEST uniquement (aucun tarif réel).
const v: VariantPricing = {
  priceMinor: 100,
  tiers: [
    { minQty: 1, label: "détail", unitPriceMinor: 100, negotiable: false },
    { minQty: 50, label: "intermédiaire", unitPriceMinor: 90, negotiable: false },
    { minQty: 200, label: "professionnel", unitPriceMinor: 80, negotiable: false },
    { minQty: 500, label: "grossiste", unitPriceMinor: null, negotiable: true },
  ],
};

describe("paliers tarifaires", () => {
  it("applique le bon palier aux bornes", () => {
    expect(unitPrice(v, 1)).toMatchObject({ kind: "price", unitPriceMinor: 100 });
    expect(unitPrice(v, 49)).toMatchObject({ unitPriceMinor: 100 });
    expect(unitPrice(v, 50)).toMatchObject({ unitPriceMinor: 90, tierLabel: "intermédiaire" });
    expect(unitPrice(v, 199)).toMatchObject({ unitPriceMinor: 90 });
    expect(unitPrice(v, 200)).toMatchObject({ unitPriceMinor: 80 });
    expect(unitPrice(v, 499)).toMatchObject({ unitPriceMinor: 80 });
  });
  it("renvoie 'sur devis' pour le palier négociable", () => {
    expect(unitPrice(v, 500)).toEqual({ kind: "on_quote", reason: "negotiable_tier", tierLabel: "grossiste" });
  });
  it("prix négocié B2B prioritaire", () => {
    expect(unitPrice({ ...v, negotiatedUnitPriceMinor: 70 }, 600)).toMatchObject({ unitPriceMinor: 70, source: "negotiated" });
  });
  it("promotion active seulement dans sa période, et seulement si plus avantageuse", () => {
    const now = new Date("2026-06-15");
    const p = { ...v, promoPriceMinor: 85, promoStartsAt: new Date("2026-06-01"), promoEndsAt: new Date("2026-06-30") };
    expect(unitPrice(p, 10, now)).toMatchObject({ unitPriceMinor: 85, source: "promo" });
    expect(unitPrice(p, 250, now)).toMatchObject({ unitPriceMinor: 80, source: "tier" });
    expect(unitPrice(p, 10, new Date("2026-07-01"))).toMatchObject({ unitPriceMinor: 100 });
  });
  it("sans aucun prix configuré : sur devis, jamais de prix inventé", () => {
    expect(unitPrice({ priceMinor: null, tiers: [] }, 3)).toEqual({ kind: "on_quote", reason: "no_price" });
  });
  it("rejette les quantités invalides", () => {
    expect(() => unitPrice(v, 0)).toThrow();
    expect(() => unitPrice(v, 1.5)).toThrow();
  });
});

describe("totaux", () => {
  it("calcule sous-total, remise répartie, taxe, transport, marge", () => {
    const t = computeTotals(
      [
        { qty: 3, unitPriceMinor: 1000, unitCostMinor: 600, taxRateBp: 1800 },
        { qty: 1, unitPriceMinor: 1000, unitCostMinor: 700, taxRateBp: 1800 },
      ],
      { coupon: { kind: "percent", value: 1000 }, shippingMinor: 500 },
    );
    expect(t.subtotalMinor).toBe(4000);
    expect(t.discountMinor).toBe(400);
    expect(t.taxMinor).toBe(648); // 18 % de 3600
    expect(t.totalMinor).toBe(4000 - 400 + 648 + 500);
    expect(t.costMinor).toBe(2500);
    expect(t.grossMarginMinor).toBe(1100);
    expect(t.grossMarginBp).toBe(3056);
  });
  it("la remise répartie somme exactement au total de remise", () => {
    const t = computeTotals(
      [{ qty: 1, unitPriceMinor: 333, taxRateBp: 0 }, { qty: 1, unitPriceMinor: 333, taxRateBp: 0 }, { qty: 1, unitPriceMinor: 334, taxRateBp: 0 }],
      { coupon: { kind: "fixed", value: 100 } },
    );
    expect(t.totalMinor).toBe(900);
  });
  it("coupon soumis au minimum d'achat ; remise fixe plafonnée", () => {
    expect(computeTotals([{ qty: 1, unitPriceMinor: 100, taxRateBp: 0 }], { coupon: { kind: "fixed", value: 50, minSubtotalMinor: 200 } }).discountMinor).toBe(0);
    expect(computeTotals([{ qty: 1, unitPriceMinor: 100, taxRateBp: 0 }], { coupon: { kind: "fixed", value: 500 } }).totalMinor).toBe(0);
  });
  it("marge inconnue si un coût manque", () => {
    expect(computeTotals([{ qty: 1, unitPriceMinor: 100, taxRateBp: 0 }]).grossMarginMinor).toBeNull();
  });
});

describe("coûts", () => {
  it("prix depuis marge cible", () => expect(priceFromMargin(750, 2500)).toBe(1000));
  it("coût de revient avec frais répartis", () => {
    expect(landedUnitCost([{ qty: 10, unitCostMinor: 100 }, { qty: 10, unitCostMinor: 300 }], 400)).toEqual([110, 330]);
  });
  it("coût moyen pondéré", () => {
    expect(weightedAverageCost(10, 100, 10, 200)).toBe(150);
    expect(weightedAverageCost(0, null, 5, 80)).toBe(80);
  });
});

describe("monnaie", () => {
  it("formate le FCFA sans décimale", () => expect(formatMoney(15000, "XOF").replace(/\s| /g, " ")).toBe("15 000 FCFA"));
  it("parse les saisies", () => {
    expect(parseMoney("1 250,50", "EUR")).toBe(125050);
    expect(parseMoney("1250", "XOF")).toBe(1250);
    expect(parseMoney("12,5", "XOF")).toBeNull();
    expect(parseMoney("abc", "EUR")).toBeNull();
  });
  it("convertit avec un taux daté", () => expect(convert(655957, "XOF", "EUR", "0.00152449")).toBe(100000));
});

describe("achat en devise étrangère", () => {
  it("convertit le coût de revient EUR en FCFA au taux fixe (cas testé en réception)", () => {
    const [landed] = landedUnitCost([{ qty: 1000, unitCostMinor: 8 }], 2000); // 0,08 € + 20 € de transport
    expect(landed).toBe(10); // 0,10 €
    expect(convert(landed, "EUR", "XOF", "655.957")).toBe(66);  });
});
