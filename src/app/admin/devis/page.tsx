import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { QUOTE_STATUS_LABELS } from "@/lib/constants";
import { AdminTitle, Empty } from "@/components/admin-ui";

export default async function AdminQuotes() {
  await requireStaff("quotes.view");
  const quotes = await db.quote.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const now = new Date();
  return (
    <>
      <AdminTitle title="Devis" />
      {quotes.length === 0 ? <Empty>Aucune demande de devis.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>N°</th><th>Date</th><th>Client</th><th>Type</th><th>Statut</th><th>Validité</th><th className="text-right">Montant</th></tr></thead>
            <tbody>{quotes.map((q) => (
              <tr key={q.id}>
                <td><Link href={`/admin/devis/${q.id}`} className="font-semibold text-vert underline">{q.number}</Link></td>
                <td>{q.createdAt.toLocaleDateString("fr-FR")}</td>
                <td>{q.companyName ?? q.contactName}<div className="text-xs">{q.email} · {q.country}</div></td>
                <td>{q.kind}</td>
                <td><span className="badge">{QUOTE_STATUS_LABELS[q.status]}</span>{q.status === "sent" && q.validUntil && q.validUntil < now && <span className="badge ml-1 !bg-amber-100">à relancer / expiré</span>}</td>
                <td>{q.validUntil?.toLocaleDateString("fr-FR") ?? "—"}</td>
                <td className="text-right">{q.totalMinor ? formatMoney(q.totalMinor, q.currency) : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
