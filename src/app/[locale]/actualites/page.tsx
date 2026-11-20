import type { Metadata } from "next";
import { BlogList } from "@/components/blog-list";

export const metadata: Metadata = { title: "Actualités" };

export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <BlogList locale={locale} kind="news" title="Actualités" intro="Les nouvelles de MBOUMINA PACK : nouveaux produits, nouvelles zones, partenariats." />;
}
