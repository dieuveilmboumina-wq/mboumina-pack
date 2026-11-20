import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  // Aperçu privé : rien n'est indexable.
  if (process.env.PREVIEW_PASSWORD) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/fr/compte", "/en/compte", "/fr/panier", "/en/panier", "/fr/commande", "/en/commande", "/fr/paiement", "/en/paiement"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
