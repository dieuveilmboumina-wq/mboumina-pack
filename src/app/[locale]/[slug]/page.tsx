import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CONTENT_PAGES, SECTOR_LINKS } from "@/content/pages";
import { L, Notice, PageHeader } from "@/components/site";
import { CatalogView } from "@/components/catalog-view";

const FLAG_ROUTES = {
  nouveautes: { flag: "new", title: "Nouveautés", intro: "Les derniers produits ajoutés au catalogue." },
  promotions: { flag: "promo", title: "Promotions", intro: "Les offres en cours, dans la limite de leur période de validité." },
  "meilleures-ventes": { flag: "best", title: "Meilleures ventes", intro: "Classement calculé à partir des commandes réellement passées." },
} as const;

type Params = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, locale } = await params;
  const page = CONTENT_PAGES[slug];
  if (page) return { title: locale === "en" && page.titleEn ? page.titleEn : page.title, description: page.intro, alternates: { languages: { fr: `/fr/${slug}`, en: `/en/${slug}` } } };
  if (slug in FLAG_ROUTES) return { title: FLAG_ROUTES[slug as keyof typeof FLAG_ROUTES].title };
  if (slug === "solutions") return { title: "Solutions par métier" };
  return {};
}

export default async function ContentRoute({ params }: Params) {
  const { locale, slug } = await params;

  if (slug in FLAG_ROUTES) {
    const r = FLAG_ROUTES[slug as keyof typeof FLAG_ROUTES];
    return <CatalogView locale={locale} filter={{ flag: r.flag }} title={r.title} intro={r.intro} />;
  }

  if (slug === "solutions") {
    return (
      <>
        <PageHeader title="Solutions par métier" intro="Chaque métier a ses contraintes. Choisissez le vôtre." />
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
          {SECTOR_LINKS.map(([s, label]) => (
            <L key={s} locale={locale} href={`/${s}`} className="card p-6 hover:shadow-lg">
              <h2 className="text-2xl">{label}</h2>
              <p className="mt-2 text-sm text-noir/70">{CONTENT_PAGES[s].intro.split(".")[0]}.</p>
            </L>
          ))}
        </div>
      </>
    );
  }

  const page = CONTENT_PAGES[slug];
  if (!page) notFound();
  const title = locale === "en" && page.titleEn ? page.titleEn : page.title;
  return (
    <>
      <PageHeader title={title} intro={page.intro} />
      <article className="prose-mp mx-auto max-w-3xl px-4 py-10">
        {locale === "en" && <Notice>This page is currently available in French only. An English translation is in progress.</Notice>}
        {page.legalDraft && <div className="my-4"><Notice kind="warning">Document en cours de validation juridique. Les passages entre crochets seront complétés par MBOUMINA PACK.</Notice></div>}
        {page.sections.map((s) => (
          <section key={s.h} className="mt-8">
            <h2 className="text-2xl">{s.h}</h2>
            {s.p && <p>{s.p}</p>}
            {s.list && <ul>{s.list.map((li) => <li key={li}>{li}</li>)}</ul>}
          </section>
        ))}
        {page.cta && (
          <div className="mt-10 flex flex-wrap gap-3">
            {page.cta.map((c, i) => <L key={c.href} locale={locale} href={c.href} className={`btn ${i === 0 ? "btn-primary" : "btn-ghost"}`}>{c.label}</L>)}
          </div>
        )}
      </article>
    </>
  );
}
