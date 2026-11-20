import { db } from "@/lib/db";
import { t, isLocale } from "@/i18n/dict";
import { L, ProductCard } from "@/components/site";
import { productInclude } from "@/modules/catalog/service";
import { SECTOR_LINKS } from "@/content/pages";
import { HeroScene, CategoryArt, KraftBag, TakeawayBox, CustomPrint, Container } from "@/components/illustrations";
import { Reveal } from "@/components/motion";
import { PresentationFilm } from "@/components/presentation-film";

const STEPS: [string, string][] = [
  ["Choisissez", "Parcourez le catalogue ou décrivez votre besoin dans une demande de devis."],
  ["Commandez", "Panier en ligne, prix par paliers de quantité, devis transformé en commande."],
  ["Payez", "Moyens de paiement disponibles affichés à la commande, paiement confirmé seulement après vérification, acompte possible sur devis."],
  ["Recevez", "Préparation, expédition et suivi de commande depuis votre espace."],
];

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const d = t(locale);
  const [cats, featured, newest, activeCount, settings] = await Promise.all([
    db.category.findMany({ where: { parentId: null }, orderBy: { sort: "asc" }, include: { _count: { select: { products: { where: { status: "active" } } } } } }),
    db.product.findMany({ where: { status: "active", isFeatured: true }, include: productInclude, take: 8 }),
    db.product.findMany({ where: { status: "active", isNew: true }, include: productInclude, take: 4, orderBy: { createdAt: "desc" } }),
    db.product.count({ where: { status: "active" } }),
    db.setting.findMany({ where: { key: { in: ["home.banner", "home.video_url"] } } }),
  ]);
  const s = Object.fromEntries(settings.map((x) => [x.key, x.value]));

  return (
    <>
      {s["home.banner"] && <div className="bg-vert2 px-4 py-2 text-center text-sm text-white">{s["home.banner"]}</div>}

      <section className="hero-bg relative overflow-hidden text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="anim-fade-up mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-beige">MBOUMINA PACK</p>
            <h1 className="anim-fade-up anim-delay-1 text-4xl !text-white md:text-5xl">{d.home.heroTitle}</h1>
            <p className="anim-fade-up anim-delay-2 mt-5 text-lg text-beige/90">{d.home.heroText}</p>
            <div className="anim-fade-up anim-delay-3 mt-8 flex flex-wrap gap-3">
              <L locale={locale} href="/catalogue" className="btn btn-secondary">{d.home.ctaCatalogue}</L>
              <L locale={locale} href="/devis" className="btn border border-beige text-beige hover:bg-white/10">{d.home.ctaQuote}</L>
              <a href="#presentation" className="btn text-beige underline-offset-4 hover:underline">▶ Voir la présentation</a>
            </div>
          </div>
          <div className="hidden justify-center md:flex"><HeroScene /></div>
        </div>
        <div className="relative overflow-hidden border-t border-white/10 bg-black/10 py-3" aria-hidden>
          <div className="marquee gap-10 text-sm font-semibold uppercase tracking-[0.2em] text-beige/80">
            {[...SECTOR_LINKS, ...SECTOR_LINKS].map(([slug, label], n) => <span key={`${slug}-${n}`} className="flex items-center gap-10 whitespace-nowrap">{label}<span className="text-beige/40">✦</span></span>)}
          </div>
        </div>
      </section>

      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-14">
        <h2 data-reveal className="text-3xl">{d.home.categories}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <L key={c.id} data-reveal locale={locale} href={`/categorie/${c.slug}`} className="card lift flex items-center gap-4 p-5">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-beige/40">
                <CategoryArt slug={c.slug} className="lift-art h-16 w-16" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-lg font-semibold text-vert">{locale === "en" ? c.nameEn : c.nameFr}</span>
                <span className="text-sm text-noir/70">{c.descFr}</span>
                <span className="text-xs text-noir/50">{c._count.products > 0 ? `${c._count.products} produit(s)` : "Sur demande"}</span>
              </span>
            </L>
          ))}
        </div>
      </Reveal>

      <section id="presentation" className="scroll-mt-24 bg-white py-16">
        <Reveal className="mx-auto max-w-6xl px-4">
          <div data-reveal className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-vert2">Présentation</p>
            <h2 className="mt-2 text-3xl md:text-4xl">Découvrez MBOUMINA PACK en une minute</h2>
          </div>
          <div data-reveal>
            <PresentationFilm
              videoUrl={s["home.video_url"]}
              ctaQuote={<L locale={locale} href="/devis" className="btn btn-secondary">{d.home.ctaQuote}</L>}
              ctaCatalogue={<L locale={locale} href="/catalogue" className="btn border border-beige text-beige hover:bg-white/10">{d.home.ctaCatalogue}</L>}
            />
          </div>
        </Reveal>
      </section>

      {(featured.length > 0 || newest.length > 0) ? (
        <Reveal as="section" className="mx-auto max-w-7xl px-4 py-14">
          <h2 data-reveal className="text-3xl">{d.home.featured}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(featured.length ? featured : newest).map((p) => <div key={p.id} data-reveal><ProductCard p={p} locale={locale} /></div>)}
          </div>
        </Reveal>
      ) : activeCount === 0 ? (
        <Reveal as="section" className="mx-auto max-w-7xl px-4 py-14">
          <div data-reveal className="card flex flex-col items-start gap-4 p-8 md:flex-row md:items-center">
            <p className="flex-1 text-lg">{d.home.emptyCatalogue}</p>
            <L locale={locale} href="/devis" className="btn btn-primary">{d.home.ctaQuote}</L>
          </div>
        </Reveal>
      ) : null}

      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-14">
        <h2 data-reveal className="text-3xl">Comment ça marche</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-4">
          {STEPS.map(([title, text], n) => (
            <li key={title} data-reveal className="relative rounded-2xl border border-beige bg-white p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-vert text-lg font-bold text-beige">{n + 1}</span>
              <h3 className="mt-4 text-xl">{title}</h3>
              <p className="mt-2 text-sm text-noir/75">{text}</p>
            </li>
          ))}
        </ol>
      </Reveal>

      <section className="bg-white py-14">
        <Reveal className="mx-auto max-w-7xl px-4">
          <h2 data-reveal className="text-3xl">{d.home.services}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-4">
            {([
              ["Vente au détail", "Commandez au paquet ou au carton, directement en ligne.", "/vente-au-detail", KraftBag],
              ["Vente en gros", "Prix par paliers de quantité et tarifs négociés pour les volumes.", "/vente-en-gros", Container],
              ["Personnalisation", "Vos emballages à vos couleurs, réalisés par nos partenaires après validation du BAT.", "/personnalisation", CustomPrint],
              ["Espace professionnel", "Comptes entreprise, bons de commande, validation interne, factures.", "/pro", TakeawayBox],
            ] as const).map(([title, text, href, Art]) => (
              <L key={href} data-reveal locale={locale} href={href} className="lift rounded-xl border border-beige p-6 hover:border-vert2">
                <Art className="lift-art h-16 w-16" />
                <h3 className="mt-3 text-xl">{title}</h3>
                <p className="mt-2 text-sm text-noir/75">{text}</p>
              </L>
            ))}
          </div>
        </Reveal>
      </section>

      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-14">
        <h2 data-reveal className="text-3xl">{d.home.sectors}</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {SECTOR_LINKS.map(([slug, label]) => <L key={slug} data-reveal locale={locale} href={`/${slug}`} className="btn btn-ghost hover:bg-vert hover:text-white">{label}</L>)}
        </div>
      </Reveal>

      <section className="relative overflow-hidden bg-beige/60 py-14">
        <TakeawayBox className="anim-float pointer-events-none absolute -right-6 -top-6 h-40 w-40 opacity-30" />
        <Reveal className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 md:flex-row md:items-center">
          <div data-reveal className="flex-1">
            <h2 className="text-3xl">Un projet, un volume, une question ?</h2>
            <p className="mt-2 text-noir/80">Décrivez votre besoin : notre équipe commerciale vous répond avec une proposition chiffrée.</p>
          </div>
          <div data-reveal className="flex gap-3">
            <L locale={locale} href="/devis" className="btn btn-primary">{d.home.ctaQuote}</L>
            <L locale={locale} href="/echantillons" className="btn btn-ghost">Demander des échantillons</L>
          </div>
        </Reveal>
      </section>
    </>
  );
}
