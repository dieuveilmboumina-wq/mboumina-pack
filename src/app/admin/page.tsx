import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { AdminTitle, Panel, Stat } from "@/components/admin-ui";

export default async function AdminHome() {
  const u = await requireStaff("dashboard.view");
  const since = new Date(Date.now() - 30 * 864e5);
  const paidStatuses = ["paid", "processing", "packed", "shipped", "delivered", "completed"];
  const [ordersToHandle, quotesNew, customsNew, messagesNew, activeProducts, lowStock, revenue, lines, features, poPending] = await Promise.all([
    db.order.count({ where: { status: { in: ["paid", "processing", "packed", "pending_approval"] } } }),
    db.quote.count({ where: { status: "requested" } }),
    db.customizationRequest.count({ where: { status: "submitted" } }),
    db.contactMessage.count({ where: { status: "new" } }),
    db.product.count({ where: { status: "active" } }),
    db.stockLevel.findMany({ where: { minLevel: { not: null } }, include: { variant: { include: { product: true } }, warehouse: true } }),
    db.order.groupBy({ by: ["currency"], where: { status: { in: paidStatuses }, createdAt: { gte: since } }, _sum: { totalMinor: true, subtotalMinor: true, discountMinor: true }, _count: true }),
    db.orderLine.findMany({ where: { order: { status: { in: paidStatuses }, createdAt: { gte: since } } }, select: { qty: true, unitCostMinor: true, lineTotalMinor: true, order: { select: { currency: true } } } }),
    db.feature.groupBy({ by: ["status"], _count: true }),
    db.purchaseOrder.count({ where: { status: "pending_approval" } }),
  ]);
  const alerts = lowStock.filter((l) => l.onHand - l.reserved <= (l.minLevel ?? 0));
  const fCount = (s: string) => features.find((f) => f.status === s)?._count ?? 0;
  const showFinance = can(u.role, "finance.view") || can(u.role, "reports.view");

  return (
    <>
      <AdminTitle title="Vue générale" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Commandes à traiter" value={<Link href="/admin/commandes" className="hover:underline">{ordersToHandle}</Link>} />
        <Stat label="Nouvelles demandes de devis" value={<Link href="/admin/devis" className="hover:underline">{quotesNew}</Link>} />
        <Stat label="Personnalisations à étudier" value={<Link href="/admin/personnalisations" className="hover:underline">{customsNew}</Link>} />
        <Stat label="Messages non traités" value={<Link href="/admin/demandes" className="hover:underline">{messagesNew}</Link>} />
        <Stat label="Produits en ligne" value={activeProducts} />
        <Stat label="Alertes de stock" value={alerts.length} hint="Stock libre ≤ seuil minimum" />
        <Stat label="Achats à valider" value={poPending} />
        <Stat label="Registre (500 fonctions)" value={`${fCount("done")} vérifiées`} hint={`${fCount("in_progress")} en cours · ${fCount("blocked")} bloquées · ${fCount("todo")} à faire`} />
      </div>

      {showFinance && (
        <Panel title="Ventes des 30 derniers jours (commandes payées)" className="mt-6">
          {revenue.length === 0 ? <p className="text-sm text-noir/60">Aucune vente payée sur la période.</p> : (
            <table className="table">
              <thead><tr><th>Devise</th><th>Commandes</th><th className="text-right">Chiffre d'affaires TTC</th><th className="text-right">Ventes nettes HT</th><th className="text-right">Marge brute</th></tr></thead>
              <tbody>
                {revenue.map((r) => {
                  const ls = lines.filter((l) => l.order.currency === r.currency);
                  const missingCost = ls.some((l) => l.unitCostMinor == null);
                  const cost = ls.reduce((s, l) => s + l.qty * (l.unitCostMinor ?? 0), 0);
                  const net = (r._sum.subtotalMinor ?? 0) - (r._sum.discountMinor ?? 0);
                  return (
                    <tr key={r.currency}>
                      <td>{r.currency}</td><td>{r._count}</td>
                      <td className="text-right">{formatMoney(r._sum.totalMinor ?? 0, r.currency)}</td>
                      <td className="text-right">{formatMoney(net, r.currency)}</td>
                      <td className="text-right">{missingCost ? "Coûts d'achat incomplets" : `${formatMoney(net - cost, r.currency)} (${net ? ((100 * (net - cost)) / net).toFixed(1) : 0} %)`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      {alerts.length > 0 && (
        <Panel title="Alertes de stock" className="mt-6">
          <ul className="text-sm">{alerts.map((a) => <li key={`${a.variantId}-${a.warehouseId}`}>{a.variant.product.nameFr} ({a.variant.sku}) — {a.warehouse.name} : {a.onHand - a.reserved} libre(s), seuil {a.minLevel}</li>)}</ul>
        </Panel>
      )}

      <Panel title="Démarrage : ce qui reste à configurer" className="mt-6">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li><Link className="underline" href="/admin/parametres">Paramètres</Link> : mentions légales, coordonnées, coordonnées bancaires pour les virements.</li>
          <li><Link className="underline" href="/admin/stocks">Entrepôts</Link> : créer au moins un entrepôt réel.</li>
          <li><Link className="underline" href="/admin/fournisseurs">Fournisseurs</Link> : enregistrer vos fournisseurs et partenaires d'impression.</li>
          <li><Link className="underline" href="/admin/produits">Produits</Link> : créer les fiches, prix d'achat, prix de vente et paliers, puis publier.</li>
          <li><Link className="underline" href="/admin/livraison">Livraison</Link> : transporteurs, zones, tarifs, puis activer les pays desservis.</li>
          <li>Paiements Wave / Orange Money / carte : renseigner les clés marchandes dans le fichier .env (voir documentation).</li>
        </ol>
      </Panel>
    </>
  );
}
