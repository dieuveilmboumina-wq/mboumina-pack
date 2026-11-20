import { db } from "@/lib/db";

export type ShippingOption = {
  rateId: string; carrierName: string; service: string; zoneName: string;
  priceMinor: number; currency: string; minDays: number; maxDays: number;
};

/**
 * Options de livraison RÉELLEMENT configurées pour un pays (zone active + transporteur actif + tarif actif).
 * Aucune option = pays non desservi en ligne (le client est orienté vers une demande de devis).
 */
export async function shippingOptions(country: string, city: string | null, weightGrams: number, subtotalMinor: number, currency: string): Promise<ShippingOption[]> {
  const zones = await db.shippingZone.findMany({
    where: { active: true },
    include: { rates: { where: { active: true, currency, carrier: { active: true } }, include: { carrier: true } } },
  });
  const out: ShippingOption[] = [];
  for (const z of zones) {
    const countries = z.countries.split(",").map((c) => c.trim().toUpperCase());
    if (!countries.includes(country.toUpperCase())) continue;
    if (z.cities) {
      const cities = z.cities.split(",").map((c) => c.trim().toLowerCase());
      if (!city || !cities.includes(city.trim().toLowerCase())) continue;
    }
    for (const r of z.rates) {
      const kg = Math.ceil(weightGrams / 1000);
      const free = r.freeAboveMinor != null && subtotalMinor >= r.freeAboveMinor;
      out.push({
        rateId: r.id, carrierName: r.carrier.name, service: r.service, zoneName: z.name,
        priceMinor: free ? 0 : r.baseMinor + r.perKgMinor * kg, currency: r.currency, minDays: r.minDays, maxDays: r.maxDays,
      });
    }
  }
  return out.sort((a, b) => a.priceMinor - b.priceMinor);
}

export async function sellingCountries() {
  const zones = await db.shippingZone.findMany({ where: { active: true, rates: { some: { active: true } } } });
  const codes = new Set(zones.flatMap((z) => z.countries.split(",").map((c) => c.trim().toUpperCase())));
  if (codes.size === 0) return [];
  return db.country.findMany({ where: { code: { in: [...codes] }, sellingEnabled: true } }).then((cs) => cs.sort((a, b) => a.nameFr.localeCompare(b.nameFr, "fr")));
}
