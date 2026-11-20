import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { L, PageHeader } from "@/components/site";

type P = { params: Promise<{ locale: string; slug: string }> };

async function getPost(slug: string) {
  return db.blogPost.findFirst({ where: { slug, publishedAt: { not: null, lte: new Date() } } });
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getPost((await params).slug);
  return p ? { title: p.title, description: p.excerpt, openGraph: { type: "article", images: p.coverUrl ? [p.coverUrl] : [] } } : {};
}

export default async function PostPage({ params }: P) {
  const { locale, slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  return (
    <>
      <PageHeader title={post.title} intro={post.excerpt} crumbs={<L locale={locale} href={post.kind === "news" ? "/actualites" : "/blog"}>{post.kind === "news" ? "Actualités" : "Blog"}</L>} />
      {/* Le corps est rendu en texte (paragraphes), jamais en HTML brut : pas d'injection possible. */}
      <article className="prose-mp mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-noir/60">Publié le {post.publishedAt!.toLocaleDateString("fr-FR")}</p>
        {post.body.split(/\n{2,}/).map((para, i) => para.startsWith("## ") ? <h2 key={i} className="mt-8 text-2xl">{para.slice(3)}</h2> : <p key={i}>{para}</p>)}
      </article>
    </>
  );
}
