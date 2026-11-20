import { db } from "@/lib/db";
import { t, isLocale } from "@/i18n/dict";
import { L, ProductCard } from "@/components/site";
import { productInclude } from "@/modules/catalog/service";
import { SECTOR_LINKS } from "@/content/pages";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const d = t(locale);
  const [cats, featured, newest, activeCount] = await Promise.all([
    db.category.findMany({ where: { parentId: null }, orderBy: { sort: "asc" }, include: { _count: { select: { products: { where: { status: "active" } } } } } }),
    db.product.findMany({ where: { status: "active", isFeatured: true }, include: productInclude, take: 8 }),
    db.product.findMany({ where: { status: "active", isNew: true }, include: productInclude, take: 4, orderBy: { createdAt: "desc" } }),
    db.product.count({ where: { status: "active" } }),
  ]);
  const banner = await db.setting.findUnique({ where: { key: "home.banner" } });

  return (
    <>
      {banner?.value && <div className="bg-vert2 px-4 py-2 text-center text-sm text-white">{banner.value}</div>}
      <section className="relative overflow-hidden bg-vert text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-beige">MBOUMINA PACK</p>
            <h1 className="text-4xl !text-white md:text-5xl">{d.home.heroTitle}</h1>
            <p className="mt-5 text-lg text-beige/90">{d.home.heroText}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <L locale={locale} href="/catalogue" className="btn btn-secondary">{d.home.ctaCatalogue}</L>
              <L locale={locale} href="/devis" className="btn border border-beige text-beige hover:bg-white/10">{d.home.ctaQuote}</L>
            </div>
          </div>
          <div className="hidden justify-center md:flex" aria-hidden>
            <svg viewBox="0 0 64 64" className="h-80 w-80">
              <path d="M14 19 L32 31 L32 54 L14 43 Z" fill="#E7D9B8" />
              <path d="M32 31 L50 19 L50 43 L32 54 Z" fill="#C8B68E" />
              <path d="M32 28 C30 19 35 12 44 10 C44 19 39 26 32 28 Z" fill="#E7D9B8" />
            </svg>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-3xl">{d.home.categories}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <L key={c.id} locale={locale} href={`/categorie/${c.slug}`} className="card flex flex-col gap-2 p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
              <span className="text-lg font-semibold text-vert">{locale === "en" ? c.nameEn : c.nameFr}</span>
              <span className="text-sm text-noir/70">{c.descFr}</span>
              <span className="mt-auto text-xs text-noir/50">{c._count.products > 0 ? `${c._count.products} produit(s)` : "Sur demande"}</span>
            </L>
          ))}
        </div>
      </section>

      {(featured.length > 0 || newest.length > 0) ? (
        <section className="mx-auto max-w-7xl px-4 pb-14">
          <h2 className="text-3xl">{d.home.featured}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(featured.length ? featured : newest).map((p) => <ProductCard key={p.id} p={p} locale={locale} />)}
          </div>
        </section>
      ) : activeCount === 0 ? (
        <section className="mx-auto max-w-7xl px-4 pb-14">
          <div className="card flex flex-col items-start gap-4 p-8 md:flex-row md:items-center">
            <p className="flex-1 text-lg">{d.home.emptyCatalogue}</p>
            <L locale={locale} href="/devis" className="btn btn-primary">{d.home.ctaQuote}</L>
          </div>
        </section>
      ) : null}

      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl">{d.home.services}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-4">
            {[
              ["Vente au détail", "Commandez au paquet ou au carton, directement en ligne.", "/vente-au-detail"],
              ["Vente en gros", "Prix par paliers de quantité et tarifs négociés pour les volumes.", "/vente-en-gros"],
              ["Personnalisation", "Vos emballages à vos couleurs, réalisés par nos partenaires après validation du BAT.", "/personnalisation"],
              ["Espace professionnel", "Comptes entreprise, bons de commande, validation interne, factures.", "/pro"],
            ].map(([title, text, href]) => (
              <L key={href} locale={locale} href={href} className="rounded-xl border border-beige p-6 hover:border-vert2">
                <h3 className="text-xl">{title}</h3>
                <p className="mt-2 text-sm text-noir/75">{text}</p>
              </L>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-3xl">{d.home.sectors}</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {SECTOR_LINKS.map(([slug, label]) => <L key={slug} locale={locale} href={`/${slug}`} className="btn btn-ghost">{label}</L>)}
        </div>
      </section>

      <section className="bg-beige/60 py-14">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 md:flex-row md:items-center">
          <div className="flex-1">
            <h2 className="text-3xl">Un projet, un volume, une question ?</h2>
            <p className="mt-2 text-noir/80">Décrivez votre besoin : notre équipe commerciale vous répond avec une proposition chiffrée.</p>
          </div>
          <div className="flex gap-3">
            <L locale={locale} href="/devis" className="btn btn-primary">{d.home.ctaQuote}</L>
            <L locale={locale} href="/echantillons" className="btn btn-ghost">Demander des échantillons</L>
          </div>
        </div>
      </section>
    </>
  );
}
