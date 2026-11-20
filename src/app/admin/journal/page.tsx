import { db } from "@/lib/db";
import { ci } from "@/lib/search";
import { requireStaff } from "@/lib/auth";
import { AdminTitle } from "@/components/admin-ui";

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff("audit.view");
  const { q } = await searchParams;
  const [logs, failed] = await Promise.all([
    db.auditLog.findMany({ where: q ? { OR: [{ action: ci(q) }, { entity: ci(q) }] } : {}, orderBy: { createdAt: "desc" }, take: 300, include: { user: { select: { name: true, email: true } } } }),
    db.loginAttempt.findMany({ where: { success: false, createdAt: { gte: new Date(Date.now() - 7 * 864e5) } }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return (
    <>
      <AdminTitle title="Historique des actions" />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} className="input max-w-xs" placeholder="Action ou entité (ex. order, payment)" aria-label="Filtre" /><button className="btn btn-ghost">Filtrer</button></form>
      <div className="card mb-6 overflow-x-auto">
        <table className="table text-xs"><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Entité</th><th>Détail</th></tr></thead>
          <tbody>{logs.map((l) => <tr key={l.id}><td className="whitespace-nowrap">{l.createdAt.toLocaleString("fr-FR")}</td><td>{l.user?.name ?? "système"}</td><td>{l.action}</td><td>{l.entity} {l.entityId?.slice(0, 10)}</td><td className="max-w-md truncate" title={l.data ?? ""}>{l.data}</td></tr>)}</tbody>
        </table>
      </div>
      <h2 className="mb-2 text-xl">Tentatives de connexion échouées (7 jours)</h2>
      <div className="card overflow-x-auto">
        <table className="table text-xs"><thead><tr><th>Date</th><th>Email</th><th>IP</th></tr></thead>
          <tbody>{failed.length === 0 ? <tr><td colSpan={3}>Aucune.</td></tr> : failed.map((f) => <tr key={f.id}><td>{f.createdAt.toLocaleString("fr-FR")}</td><td>{f.email}</td><td>{f.ip}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
