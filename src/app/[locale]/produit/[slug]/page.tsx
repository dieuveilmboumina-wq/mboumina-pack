import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, similarProducts, availableQty, availability, variantPricing } from "@/modules/catalog/service";
import { unitPrice } from "@/modules/pricing/engine";
import { addToCart } from "@/modules/cart/actions";
import { L, Notice, ProductCard } from "@/components/site";
import { formatMoney } from "@/lib/money";
import { t } from "@/i18n/dict";

type P = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  return { title: p.seoTitle || p.nameFr, description: p.seoDescription || p.descCommercialFr.slice(0, 160), openGraph: { images: p.media[0]?.url ? [p.media[0].url] : [] } };
}

export default async function ProductPage({ params }: P) {
  const { locale, slug } = await params;
  const d = t(locale);
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const similar = await similarProducts(p);
  const av = availability(p);
  const name = locale === "en" ? p.nameEn : p.nameFr;
  const images = p.media.filter((m) => m.kind === "image");
  const specs: [string, string | number | null | undefined][] = [
    ["Référence", p.sku], ["Catégorie", p.category.nameFr], ["Matériaux", p.materials], ["Dimensions", p.dimensions],
    ["Capacité", p.capacity], ["Couleurs", p.colors], ["Finitions", p.finishes], ["Poids", p.weightGrams ? `${p.weightGrams} g` : null],
    ["Quantité par paquet", p.unitsPerPack], ["Quantité par carton", p.unitsPerCarton], [d.product.moq, p.moq],
    ["Délai d'approvisionnement", p.leadTimeDays != null ? `${p.leadTimeDays} jours` : null],
    ["Délai d'expédition", p.shipTimeDays != null ? `${p.shipTimeDays} jours` : null],
    ["Pays d'origine", p.originCountry], ["Contact alimentaire", p.foodContact ? "Destiné au contact alimentaire (voir documents)" : "Non destiné au contact alimentaire direct"],
  ];
  const avgRating = p.reviews.length ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : null;

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name, sku: p.sku, description: p.descCommercialFr,
    image: images.map((i) => i.url), brand: { "@type": "Brand", name: "MBOUMINA PACK" },
    ...(avgRating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avgRating.toFixed(1), reviewCount: p.reviews.length } } : {}),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-6 text-sm text-noir/60" aria-label="Fil d'Ariane">
        <L locale={locale} href="/catalogue">Catalogue</L> › <L locale={locale} href={`/categorie/${p.category.slug}`}>{p.category.nameFr}</L> › {name}
      </nav>
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="card flex aspect-square items-center justify-center overflow-hidden bg-beige/30">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[0].url} alt={images[0].alt || name} className="h-full w-full object-contain" />
            ) : (
              <p className="p-6 text-center text-sm text-noir/60">Photo à venir</p>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.slice(1, 6).map((m) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={m.id} src={m.url} alt={m.alt || name} className="card aspect-square object-cover" loading="lazy" />
              ))}
            </div>
          )}
          {p.videoUrl && <a href={p.videoUrl} className="btn btn-ghost" rel="noopener noreferrer" target="_blank">Voir la vidéo</a>}
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            {p.isNew && <span className="badge">Nouveau</span>}
            {p.isEco && <span className="badge">Éco</span>}
            {p.isCustomizable && <span className="badge">Personnalisable</span>}
          </div>
          <h1 className="mt-2 text-3xl md:text-4xl">{name}</h1>
          <p className="mt-1 text-sm text-noir/60">Réf. {p.sku}</p>
          <p className="mt-4 whitespace-pre-line text-noir/85">{locale === "en" && p.descCommercialEn ? p.descCommercialEn : p.descCommercialFr}</p>

          <p className="mt-4 text-sm font-semibold">
            {av === "in_stock" ? `✓ ${d.product.inStock}` : av === "on_order" ? `${d.product.onOrder} — délai d'approvisionnement : ${p.leadTimeDays} jours` : d.product.unavailable}
          </p>

          {p.variants.map((v) => {
            const base = unitPrice(variantPricing(v), Math.max(1, p.moq));
            const pricedTiers = v.tiers.length > 0;
            return (
              <section key={v.id} className="card mt-6 p-5" aria-label={`Variante ${v.label}`}>
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-[family-name:var(--font-sans)] text-lg font-semibold">{v.label}</h2>
                  <span className="text-xs text-noir/60">SKU {v.sku} · {availableQty(v) > 0 ? `${availableQty(v)} disponibles` : "stock à confirmer"}</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-vert">
                  {base.kind === "price" ? formatMoney(base.unitPriceMinor, v.currency, locale) : d.product.onQuote}
                  {base.kind === "price" && <span className="text-sm font-normal text-noir/60"> / unité{base.source === "promo" ? " (promotion)" : ""}</span>}
                </p>
                {pricedTiers && (
                  <table className="table mt-4">
                    <caption className="sr-only">{d.product.tiers}</caption>
                    <thead><tr><th>Quantité</th><th>Tarif</th><th>Prix unitaire</th></tr></thead>
                    <tbody>
                      {v.tiers.map((tier, i) => {
                        const next = v.tiers[i + 1];
                        return (
                          <tr key={tier.id}>
                            <td>{next ? `${tier.minQty} à ${next.minQty - 1}` : `${tier.minQty} et plus`}</td>
                            <td>{tier.label}</td>
                            <td>{tier.negotiable || tier.unitPriceMinor == null ? "Sur devis" : formatMoney(tier.unitPriceMinor, v.currency, locale)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <form action={addToCart} className="mt-4 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="variantId" value={v.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <div>
                    <label className="label" htmlFor={`qty-${v.id}`}>{d.product.qty}</label>
                    <input id={`qty-${v.id}`} name="qty" type="number" min={p.moq} step={1} defaultValue={p.moq} className="input w-32" required />
                  </div>
                  <button className="btn btn-primary" disabled={base.kind !== "price" && !pricedTiers}>{d.product.addToCart}</button>
                  <L locale={locale} href={`/devis?produit=${encodeURIComponent(p.sku)}`} className="btn btn-ghost">{d.product.requestQuote}</L>
                </form>
                <p className="mt-2 text-xs text-noir/60">Le prix appliqué dépend de la quantité. Les quantités « sur devis » sont transmises à notre équipe commerciale.</p>
              </section>
            );
          })}
          {p.variants.length === 0 && <div className="mt-6"><Notice>Ce produit est disponible sur demande. <L locale={locale} href={`/devis?produit=${encodeURIComponent(p.sku)}`} className="underline">Demander un devis</L>.</Notice></div>}
          {p.isCustomizable && <L locale={locale} href={`/personnalisation?produit=${encodeURIComponent(p.sku)}`} className="btn btn-secondary mt-4">Personnaliser ce produit</L>}
        </div>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-2xl">{d.product.technical}</h2>
          <table className="table mt-4 card">
            <tbody>
              {specs.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => <tr key={k}><th className="w-1/3">{k}</th><td>{v}</td></tr>)}
            </tbody>
          </table>
          {p.descTechnicalFr && <p className="mt-4 whitespace-pre-line text-sm">{p.descTechnicalFr}</p>}
        </section>
        <section>
          <h2 className="text-2xl">{d.product.documents}</h2>
          {p.documents.length === 0 ? (
            <p className="mt-4 text-sm text-noir/70">Aucun document publié pour ce produit. Vous pouvez demander la fiche technique ou la documentation de conformité via le <L locale={locale} href="/contact" className="underline">formulaire de contact</L>.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {p.documents.map((doc) => (
                <li key={doc.id} className="card flex items-center justify-between p-3 text-sm">
                  <span>{doc.title}{doc.issuer ? ` — ${doc.issuer}` : ""} <span className="badge ml-2">Vérifié le {doc.verifiedAt!.toLocaleDateString("fr-FR")}</span></span>
                  <a className="btn btn-ghost !py-1" href={`/api/files/${doc.fileId}`}>Télécharger</a>
                </li>
              ))}
            </ul>
          )}
          <h2 className="mt-10 text-2xl">{d.product.reviews}</h2>
          {p.reviews.length === 0 ? <p className="mt-4 text-sm text-noir/70">Aucun avis pour le moment.</p> : (
            <ul className="mt-4 space-y-3">
              {p.reviews.map((r) => (
                <li key={r.id} className="card p-4 text-sm">
                  <strong>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</strong> — {r.user.name}{r.verifiedPurchase && <span className="badge ml-2">Achat vérifié</span>}
                  <p className="mt-1">{r.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {similar.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl">{d.product.similar}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{similar.map((s) => <ProductCard key={s.id} p={s} locale={locale} />)}</div>
        </section>
      )}
    </div>
  );
}
