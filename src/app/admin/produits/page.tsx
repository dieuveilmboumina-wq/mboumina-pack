import Link from "next/link";
import { db } from "@/lib/db";
import { ci } from "@/lib/search";
import { requireStaff } from "@/lib/auth";
import { AdminTitle, Empty } from "@/components/admin-ui";
import { formatMoney } from "@/lib/money";

const STATUS = { draft: "Brouillon", active: "En ligne", archived: "Archivé" } as Record<string, string>;

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ statut?: string; q?: string }> }) {
  await requireStaff("catalog.view");
  const sp = await searchParams;
  const products = await db.product.findMany({
    where: { ...(sp.statut ? { status: sp.statut } : { status: { not: "archived" } }), ...(sp.q ? { OR: [{ nameFr: ci(sp.q) }, { sku: ci(sp.q) }] } : {}) },
    include: { category: true, supplier: true, variants: { include: { stockLevels: true, tiers: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <>
      <AdminTitle title="Produits et tarifs"><Link href="/admin/produits/nouveau" className="btn btn-primary">Nouveau produit</Link></AdminTitle>
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} className="input max-w-xs" placeholder="Nom ou référence" aria-label="Recherche" />
        <select name="statut" defaultValue={sp.statut ?? ""} className="select max-w-xs" aria-label="Statut">
          <option value="">Actifs et brouillons</option><option value="active">En ligne</option><option value="draft">Brouillons</option><option value="archived">Archivés</option>
        </select>
        <button className="btn btn-ghost">Filtrer</button>
      </form>
      {products.length === 0 ? <Empty>Aucun produit. Créez votre premier produit avec ses prix et paliers réels.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Référence</th><th>Nom</th><th>Catégorie</th><th>Fournisseur</th><th>Prix détail</th><th>Paliers</th><th>Stock libre</th><th>Statut</th></tr></thead>
            <tbody>
              {products.map((p) => {
                const v = p.variants[0];
                const free = p.variants.reduce((s, x) => s + x.stockLevels.reduce((a, l) => a + l.onHand - l.reserved - l.blocked, 0), 0);
                return (
                  <tr key={p.id}>
                    <td><Link href={`/admin/produits/${p.id}`} className="font-semibold text-vert underline">{p.sku}</Link></td>
                    <td>{p.nameFr}</td><td>{p.category.nameFr}</td><td>{p.supplier?.name ?? "—"}</td>
                    <td>{v?.priceMinor != null ? formatMoney(v.priceMinor, v.currency) : <span className="text-amber-700">non défini</span>}</td>
                    <td>{p.variants.reduce((s, x) => s + x.tiers.length, 0)}</td>
                    <td>{free}</td>
                    <td><span className="badge">{STATUS[p.status]}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
