import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { getCart } from "@/modules/cart/service";
import { t, type Locale } from "@/i18n/dict";
import { SECTOR_LINKS } from "@/content/pages";
import { formatMoney } from "@/lib/money";
import { displayPrice, availability, type ProductFull } from "@/modules/catalog/service";
import { KraftBag, Cup, TakeawayBox, CategoryArt } from "@/components/illustrations";

export function L({ locale, href, ...rest }: { locale: string; href: string } & Omit<React.ComponentProps<typeof Link>, "href">) {
  return <Link href={`/${locale}${href === "/" ? "" : href}`} {...rest} />;
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/icone.svg" alt="" width={40} height={40} />
      <span className="leading-none">
        <span className={`block font-[family-name:var(--font-display)] text-xl font-bold tracking-wide ${light ? "text-white" : "text-vert"}`}>MBOUMINA</span>
        <span className={`block text-[10px] font-semibold tracking-[0.5em] ${light ? "text-beige" : "text-vert2"}`}>PACK</span>
      </span>
    </span>
  );
}

export async function Header({ locale }: { locale: Locale }) {
  const d = t(locale);
  const [user, cart] = await Promise.all([currentUser(), getCart(false)]);
  const count = cart ? (await db.cartItem.aggregate({ where: { cartId: cart.id }, _count: true }))._count : 0;
  const other = locale === "fr" ? "en" : "fr";
  return (
    <header className="sticky top-0 z-40 border-b border-beige bg-white/95 backdrop-blur">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-white focus:p-2">Aller au contenu</a>
      <div className="bg-vert text-beige text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
          <span>{d.tagline}</span>
          <span className="flex gap-4">
            <L locale={locale} href="/suivi" className="hover:text-white">{locale === "fr" ? "Suivi de commande" : "Track order"}</L>
            <L locale={locale} href="/pro" className="hover:text-white">{d.nav.pro}</L>
            <Link href={`/${other}`} className="font-semibold uppercase hover:text-white" hrefLang={other}>{other}</Link>
          </span>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <L locale={locale} href="/" aria-label="MBOUMINA PACK — accueil"><Logo /></L>
        <form action={`/${locale}/catalogue`} className="hidden flex-1 md:block" role="search">
          <label htmlFor="q" className="sr-only">{d.nav.search}</label>
          <input id="q" name="q" className="input" placeholder={d.nav.search} list="search-suggestions" />
        </form>
        <nav className="ml-auto flex items-center gap-2 text-sm font-semibold">
          {user && isStaff(user.role) && <Link href="/admin" className="btn btn-secondary !py-2">Back-office</Link>}
          <L locale={locale} href={user ? "/compte" : "/connexion"} className="px-2 py-2 hover:text-vert2">{user ? d.nav.account : d.nav.login}</L>
          <L locale={locale} href="/panier" className="btn btn-primary !py-2" aria-label={`${d.nav.cart} (${count})`}>
            {d.nav.cart} <span className="rounded-full bg-beige px-2 text-vert">{count}</span>
          </L>
        </nav>
      </div>
      <details className="border-t border-beige md:hidden">
        <summary className="cursor-pointer px-4 py-2 font-semibold">{d.nav.menu}</summary>
        <MainLinks locale={locale} vertical />
      </details>
      <div className="hidden border-t border-beige md:block"><MainLinks locale={locale} /></div>
    </header>
  );
}

function MainLinks({ locale, vertical = false }: { locale: Locale; vertical?: boolean }) {
  const d = t(locale);
  const links: [string, string][] = [
    ["/catalogue", d.nav.catalogue], ["/nouveautes", locale === "fr" ? "Nouveautés" : "New"], ["/promotions", "Promotions"],
    ["/solutions", d.nav.solutions], ["/personnalisation", d.nav.custom], ["/vente-en-gros", d.nav.wholesale],
    ["/a-propos", d.nav.about], ["/blog", d.nav.blog], ["/contact", d.nav.contact],
  ];
  return (
    <nav aria-label="Navigation principale" className={`mx-auto max-w-7xl px-4 ${vertical ? "flex flex-col pb-3" : "flex items-center gap-x-5 py-2"} text-sm`}>
      {vertical && (
        <form action={`/${locale}/catalogue`} className="py-2" role="search">
          <input name="q" className="input" placeholder={d.nav.search} aria-label={d.nav.search} />
        </form>
      )}
      {links.map(([href, label]) => (
        <L key={href} locale={locale} href={href} className="whitespace-nowrap py-1.5 hover:text-vert2">{label}</L>
      ))}
      <L locale={locale} href="/devis" className={`${vertical ? "mt-2" : "ml-auto"} btn btn-secondary whitespace-nowrap !py-1.5`}>{d.nav.quote}</L>
    </nav>
  );
}

export async function Footer({ locale }: { locale: Locale }) {
  const cats = await db.category.findMany({ where: { parentId: null }, orderBy: { sort: "asc" } });
  const col = (title: string, items: [string, string][]) => (
    <div>
      <h2 className="mb-3 font-[family-name:var(--font-sans)] text-sm font-bold uppercase tracking-wider !text-beige">{title}</h2>
      <ul className="space-y-1.5 text-sm">
        {items.map(([href, label]) => <li key={href}><L locale={locale} href={href} className="hover:text-white">{label}</L></li>)}
      </ul>
    </div>
  );
  return (
    <footer className="mt-20 bg-noir text-beige/90">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-5">
        <div className="md:col-span-1">
          <Logo light />
          <p className="mt-4 text-sm">{t(locale).tagline}</p>
          <NewsletterForm locale={locale} />
        </div>
        {col("Catalogue", cats.map((c) => [`/categorie/${c.slug}`, locale === "en" ? c.nameEn : c.nameFr]))}
        {col("Solutions", SECTOR_LINKS.map(([s, l]) => [`/${s}`, l]))}
        {col("Entreprise", [["/a-propos", "À propos"], ["/fondateur", "Notre fondateur"], ["/valeurs", "Nos valeurs"], ["/engagements", "Nos engagements"], ["/fournisseurs-partenaires", "Fournisseurs et partenaires"], ["/garanties-qualite", "Garanties qualité"], ["/conformite", "Conformité"], ["/actualites", "Actualités"], ["/recrutement", "Recrutement"], ["/partenariat", "Partenariat"]])}
        {col("Aide", [["/faq", "FAQ"], ["/contact", "Contact"], ["/suivi", "Suivi de livraison"], ["/echantillons", "Demande d'échantillons"], ["/vente-au-detail", "Vente au détail"], ["/cgv", "Conditions générales de vente"], ["/confidentialite", "Confidentialité"], ["/retours", "Politique de retour"]])}
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs">© {new Date().getFullYear()} MBOUMINA PACK — Fondateur : Dieuveil Flavien MBOUMINA BAKADISSA</div>
    </footer>
  );
}

function NewsletterForm({ locale }: { locale: string }) {
  return (
    <form action={`/api/newsletter`} method="post" className="mt-5 space-y-2">
      <input type="hidden" name="locale" value={locale} />
      <label htmlFor="nl-email" className="text-sm font-semibold text-white">Newsletter</label>
      <input id="nl-email" name="email" type="email" required className="input !text-noir" placeholder="email@exemple.com" />
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" name="consent" required className="mt-0.5" /> J'accepte de recevoir les informations commerciales de MBOUMINA PACK (désinscription à tout moment).</label>
      <button className="btn btn-secondary w-full !py-2">S'inscrire</button>
    </form>
  );
}

export function ProductCard({ p, locale }: { p: ProductFull; locale: string }) {
  const d = t(locale);
  const price = displayPrice(p);
  const av = availability(p);
  const img = p.media.find((m) => m.kind === "image");
  return (
    <L locale={locale} href={`/produit/${p.slug}`} className="card lift group flex flex-col overflow-hidden">
      <div className="flex aspect-square items-center justify-center overflow-hidden bg-beige/40">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.url} alt={img.alt || p.nameFr} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          // Pas encore de photo : pictogramme de la famille d'emballage (signalé comme illustration)
          <span className="flex flex-col items-center gap-2">
            <CategoryArt slug={p.category?.slug ?? ""} className="lift-art h-24 w-24 opacity-80" />
            <span className="text-[10px] uppercase tracking-wider text-noir/40">Illustration</span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex flex-wrap gap-1">
          {p.isNew && <span className="badge">Nouveau</span>}
          {p.isEco && <span className="badge">Éco</span>}
          {price?.promo && <span className="badge !bg-vert !text-white">Promo</span>}
        </div>
        <h3 className="font-[family-name:var(--font-sans)] text-base font-semibold text-noir group-hover:text-vert2">{locale === "en" ? p.nameEn : p.nameFr}</h3>
        <p className="text-xs text-noir/60">Réf. {p.sku}</p>
        <p className="mt-auto pt-2 font-bold text-vert">{price ? `${d.product.from} ${formatMoney(price.minor, price.currency, locale)}` : d.product.onQuote}</p>
        <p className="text-xs text-noir/70">{av === "in_stock" ? d.product.inStock : av === "on_order" ? d.product.onOrder : d.product.unavailable}</p>
      </div>
    </L>
  );
}

export function PageHeader({ title, intro, crumbs }: { title: string; intro?: string; crumbs?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-beige/50">
      <div className="pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 gap-2 opacity-40 md:flex" aria-hidden>
        <KraftBag className="anim-float h-28 w-28" />
        <Cup className="anim-float-delay mt-10 h-20 w-20" />
        <TakeawayBox className="anim-float-slow h-28 w-28" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-10">
        {crumbs && <div className="anim-fade-up mb-2 text-sm text-noir/60">{crumbs}</div>}
        <h1 className="anim-fade-up anim-delay-1 max-w-3xl text-3xl md:text-4xl">{title}</h1>
        {intro && <p className="anim-fade-up anim-delay-2 mt-3 max-w-3xl text-lg text-noir/80">{intro}</p>}
      </div>
    </div>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "success" | "error" | "warning"; children: React.ReactNode }) {
  const c = { info: "bg-beige/60 border-vert2", success: "bg-green-50 border-green-700", error: "bg-red-50 border-red-700", warning: "bg-amber-50 border-amber-600" }[kind];
  return <div role={kind === "error" ? "alert" : "status"} className={`rounded-lg border-l-4 p-4 text-sm ${c}`}>{children}</div>;
}
