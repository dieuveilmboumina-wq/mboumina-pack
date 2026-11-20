import { db } from "@/lib/db";
import { L, PageHeader } from "@/components/site";

export async function BlogList({ locale, kind, title, intro }: { locale: string; kind: "blog" | "news"; title: string; intro: string }) {
  const posts = await db.blogPost.findMany({ where: { kind, publishedAt: { not: null, lte: new Date() } }, orderBy: { publishedAt: "desc" }, take: 50 });
  return (
    <>
      <PageHeader title={title} intro={intro} />
      <div className="mx-auto max-w-5xl px-4 py-10">
        {posts.length === 0 ? <p className="card p-8 text-noir/70">Aucune publication pour le moment.</p> : (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((p) => (
              <L key={p.id} locale={locale} href={`/blog/${p.slug}`} className="card p-6 hover:shadow-lg">
                <p className="text-xs text-noir/60">{p.publishedAt!.toLocaleDateString("fr-FR")}</p>
                <h2 className="mt-1 text-2xl">{p.title}</h2>
                <p className="mt-2 text-sm text-noir/75">{p.excerpt}</p>
              </L>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
