import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { CONTENT_PAGES } from "@/content/pages";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const statics = ["", "/catalogue", "/nouveautes", "/promotions", "/meilleures-ventes", "/solutions", "/personnalisation", "/devis", "/echantillons", "/contact", "/partenariat", "/recrutement", "/pro", "/blog", "/actualites", "/fondateur", "/suivi", ...Object.keys(CONTENT_PAGES).map((s) => `/${s}`)];
  const [cats, products, posts] = await Promise.all([
    db.category.findMany(),
    db.product.findMany({ where: { status: "active" }, select: { slug: true, updatedAt: true } }),
    db.blogPost.findMany({ where: { publishedAt: { not: null, lte: new Date() } }, select: { slug: true, updatedAt: true } }),
  ]);
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of ["fr", "en"]) {
    for (const s of statics) entries.push({ url: `${base}/${locale}${s}` });
    for (const c of cats) entries.push({ url: `${base}/${locale}/categorie/${c.slug}` });
    for (const p of products) entries.push({ url: `${base}/${locale}/produit/${p.slug}`, lastModified: p.updatedAt });
    for (const p of posts) entries.push({ url: `${base}/${locale}/blog/${p.slug}`, lastModified: p.updatedAt });
  }
  return entries;
}
