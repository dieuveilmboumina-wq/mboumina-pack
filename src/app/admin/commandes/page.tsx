import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { AdminTitle, Empty } from "@/components/admin-ui";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ statut?: string; q?: string }> }) {
  await requireStaff("orders.view");
  const sp = await searchParams;
  const orders = await db.order.findMany({
    where: { ...(sp.statut ? { status: sp.statut } : {}), ...(sp.q ? { OR: [{ number: { contains: sp.q.toUpperCase() } }, { email: { contains: sp.q.toLowerCase() } }] } : {}) },
    orderBy: [{ urgent: "desc" }, { createdAt: "desc" }], take: 200, include: { company: true },
  });
  return (
    <>
      <AdminTitle title="Commandes" />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} className="input max-w-xs" placeholder="N° ou email" aria-label="Recherche" />
        <select name="statut" defaultValue={sp.statut ?? ""} className="select max-w-xs" aria-label="Statut">
          <option value="">Tous les statuts</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn btn-ghost">Filtrer</button>
      </form>
      {orders.length === 0 ? <Empty>Aucune commande.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>N°</th><th>Date</th><th>Client</th><th>Statut</th><th className="text-right">Total</th><th className="text-right">Payé</th></tr></thead>
            <tbody>{orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/commandes/${o.id}`} className="font-semibold text-vert underline">{o.number}</Link>{o.urgent && <span className="badge ml-1 !bg-red-100 !text-red-800">Urgent</span>}</td>
                <td>{o.createdAt.toLocaleString("fr-FR")}</td>
                <td>{o.company?.name ?? o.email}</td>
                <td><span className="badge">{ORDER_STATUS_LABELS[o.status]}</span></td>
                <td className="text-right">{formatMoney(o.totalMinor, o.currency)}</td>
                <td className="text-right">{formatMoney(o.paidMinor, o.currency)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
