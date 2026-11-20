import type { Metadata } from "next";
import { BlogList } from "@/components/blog-list";

export const metadata: Metadata = { title: "Blog — conseils emballage alimentaire" };

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <BlogList locale={locale} kind="blog" title="Blog" intro="Conseils pour choisir, utiliser et valoriser vos emballages alimentaires." />;
}
