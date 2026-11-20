import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { AdminTitle, Panel } from "@/components/admin-ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { updateCompany, setNegotiatedPrice } from "@/modules/admin/config-actions";

const paid = ["paid", "processing", "packed", "shipped", "delivered", "completed"];

export default async function AdminClients() {
  const u = await requireStaff("customers.view");
  const [companies, customers, sales, variants, totals] = await Promise.all([
    db.company.findMany({ orderBy: { createdAt: "desc" }, include: { users: true, prices: { include: { variant: true } } } }),
    db.user.findMany({ where: { role: "customer", companyId: null, disabledAt: null }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.user.findMany({ where: { role: { in: ["sales", "admin", "founder"] } } }),
    db.productVariant.findMany({ include: { product: true }, orderBy: { sku: "asc" } }),
    db.order.groupBy({ by: ["userId", "currency"], where: { status: { in: paid } }, _sum: { totalMinor: true }, _count: true }),
  ]);
  const edit = can(u.role, "customers.edit");
  const totalOf = (userIds: string[]) => totals.filter((t) => t.userId && userIds.includes(t.userId)).map((t) => `${formatMoney(t._sum.totalMinor ?? 0, t.currency)} (${t._count} cmd)`).join(" · ") || "—";
  return (
    <>
      <AdminTitle title="Clients et entreprises" />
      <div className="space-y-6">
        <Panel title={`Entreprises (${companies.length})`}>
          {companies.length === 0 ? <p className="text-sm text-noir/60">Aucune entreprise.</p> : companies.map((c) => (
            <details key={c.id} className="mb-3 rounded border border-beige p-3">
              <summary className="cursor-pointer"><strong>{c.name}</strong> — {c.country} · {c.sector ?? "secteur ?"} · <span className="badge">{{ pending: "À vérifier", verified: "Vérifiée", rejected: "Refusée" }[c.status]}</span> · CA : {totalOf(c.users.map((x) => x.id))}</summary>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <div className="text-sm">
                  <p>Identifiant légal : {c.legalId ?? "non fourni"} · TVA : {c.vatNumber ?? "—"}</p>
                  <p>Utilisateurs : {c.users.map((x) => `${x.name} <${x.email}> (${x.companyRole})`).join(", ")}</p>
                  <p>Tarifs négociés : {c.prices.length === 0 ? "aucun" : c.prices.map((p) => `${p.variant.sku} ${formatMoney(p.unitPriceMinor, p.currency)}`).join(", ")}</p>
                </div>
                {edit && (
                  <ActionForm action={updateCompany} className="grid gap-2 sm:grid-cols-2">
                    <input type="hidden" name="id" value={c.id} />
                    <label className="text-sm">Statut<select name="status" defaultValue={c.status} className="select" disabled={!can(u.role, "companies.verify")}><option value="pending">À vérifier</option><option value="verified">Vérifiée</option><option value="rejected">Refusée</option></select></label>
                    <label className="text-sm">Commercial dédié<select name="salesRepId" defaultValue={c.salesRepId ?? ""} className="select"><option value="">—</option>{sales.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                    <label className="text-sm">Validation interne au-delà de (FCFA)<input name="approvalThreshold" defaultValue={c.approvalThreshold ?? ""} className="input" /></label>
                    <label className="text-sm">Délai de paiement (jours) — fondateur<input name="paymentTermsDays" defaultValue={c.paymentTermsDays ?? ""} className="input" disabled={!can(u.role, "credit.authorize")} /></label>
                    <label className="text-sm">Plafond de crédit (FCFA) — fondateur<input name="creditLimit" defaultValue={c.creditLimit ?? ""} className="input" disabled={!can(u.role, "credit.authorize")} /></label>
                    <div className="self-end"><SubmitButton>Enregistrer</SubmitButton></div>
                  </ActionForm>
                )}
              </div>
              {can(u.role, "pricing.edit") && variants.length > 0 && (
                <ActionForm action={setNegotiatedPrice} className="mt-3 grid gap-2 sm:grid-cols-5">
                  <input type="hidden" name="companyId" value={c.id} />
                  <select name="variantId" className="select sm:col-span-2" aria-label="Article">{variants.map((v) => <option key={v.id} value={v.id}>{v.sku} — {v.product.nameFr}</option>)}</select>
                  <input name="price" className="input" placeholder="Prix négocié" required aria-label="Prix" />
                  <select name="currency" className="select" aria-label="Devise"><option>XOF</option><option>XAF</option><option>EUR</option><option>USD</option></select>
                  <input name="validUntil" type="date" className="input" aria-label="Valable jusqu'au" />
                  <SubmitButton>Ajouter un tarif négocié</SubmitButton>
                </ActionForm>
              )}
            </details>
          ))}
        </Panel>
        <Panel title={`Clients particuliers (${customers.length})`}>
          {customers.length === 0 ? <p className="text-sm text-noir/60">Aucun client.</p> : (
            <table className="table text-sm"><thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Inscrit le</th><th>Marketing</th><th>Achats payés</th></tr></thead>
              <tbody>{customers.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.email}</td><td>{c.phone ?? "—"}</td><td>{c.createdAt.toLocaleDateString("fr-FR")}</td><td>{c.marketingConsent ? "oui" : "non"}</td><td>{totalOf([c.id])}</td></tr>)}</tbody>
            </table>
          )}
        </Panel>
      </div>
    </>
  );
}
