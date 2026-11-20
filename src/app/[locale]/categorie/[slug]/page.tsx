import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CatalogView } from "@/components/catalog-view";

type P = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const c = await db.category.findUnique({ where: { slug } });
  return c ? { title: c.nameFr, description: c.descFr ?? undefined } : {};
}

export default async function CategoryPage({ params }: P) {
  const { locale, slug } = await params;
  const c = await db.category.findUnique({ where: { slug } });
  if (!c) notFound();
  return <CatalogView locale={locale} filter={{ category: slug }} title={locale === "en" ? c.nameEn : c.nameFr} intro={c.descFr ?? undefined} />;
}
