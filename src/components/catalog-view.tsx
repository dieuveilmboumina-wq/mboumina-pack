import { db } from "@/lib/db";
import { L, PageHeader, ProductCard } from "@/components/site";
import { listProducts, type CatalogFilter } from "@/modules/catalog/service";



export const FLAG_TITLES: Record<string, string> = { new: "Nouveautés", promo: "Promotions", best: "Meilleures ventes", eco: "Emballages écologiques", custom: "Produits personnalisables" };

export async function CatalogView({ locale, filter, title, intro }: { locale: string; filter: CatalogFilter; title: string; intro?: string }) {
  const [products, cats] = await Promise.all([listProducts(filter), db.category.findMany({ orderBy: { sort: "asc" } })]);
  return (
    <>
      <PageHeader title={title} intro={intro} />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[240px_1fr]">
        <aside aria-label="Filtres">
          <form className="card space-y-4 p-5" action={`/${locale}/catalogue`}>
            <div>
              <label className="label" htmlFor="f-q">Recherche</label>
              <input id="f-q" name="q" defaultValue={filter.q} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="f-cat">Catégorie</label>
              <select id="f-cat" name="category" defaultValue={filter.category ?? ""} className="select">
                <option value="">Toutes</option>
                {cats.map((c) => <option key={c.id} value={c.slug}>{c.nameFr}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-flag">Sélection</label>
              <select id="f-flag" name="flag" defaultValue={filter.flag ?? ""} className="select">
                <option value="">Tous les produits</option>
                {Object.entries(FLAG_TITLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-sort">Trier par</label>
              <select id="f-sort" name="sort" defaultValue={filter.sort ?? "recent"} className="select">
                <option value="recent">Plus récents</option>
                <option value="name">Nom</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
              </select>
            </div>
            <button className="btn btn-primary w-full">Appliquer</button>
          </form>
        </aside>
        <section aria-live="polite">
          <p className="mb-4 text-sm text-noir/70">{products.length} produit(s)</p>
          {products.length === 0 ? (
            <div className="card p-8">
              <p className="text-lg">Aucun produit ne correspond pour le moment.</p>
              <p className="mt-2 text-noir/70">Notre catalogue s'enrichit régulièrement. Décrivez-nous votre besoin : nous recherchons la solution auprès de nos fournisseurs.</p>
              <L locale={locale} href="/devis" className="btn btn-primary mt-5">Demander un devis</L>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((p) => <ProductCard key={p.id} p={p} locale={locale} />)}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

