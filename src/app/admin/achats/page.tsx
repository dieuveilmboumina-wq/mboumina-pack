import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { AdminTitle, Empty, Panel } from "@/components/admin-ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { createPurchaseOrder } from "@/modules/admin/supply-actions";

const PO_STATUS: Record<string, string> = { draft: "Brouillon", pending_approval: "À valider", approved: "Validé", sent: "Envoyé au fournisseur", partially_received: "Reçu partiellement", received: "Reçu", cancelled: "Annulé" };

export default async function AdminPurchases() {
  const u = await requireStaff("suppliers.view");
  const [pos, suppliers, warehouses, variants] = await Promise.all([
    db.purchaseOrder.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { supplier: true, warehouse: true, lines: true } }),
    db.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.warehouse.findMany({ where: { active: true } }),
    db.productVariant.findMany({ include: { product: true }, orderBy: { sku: "asc" } }),
  ]);
  return (
    <>
      <AdminTitle title="Achats et réceptions" />
      <div className="space-y-6">
        {pos.length === 0 ? <Empty>Aucune commande fournisseur.</Empty> : (
          <div className="card overflow-x-auto">
            <table className="table"><thead><tr><th>N°</th><th>Date</th><th>Fournisseur</th><th>Entrepôt</th><th>Statut</th><th className="text-right">Montant</th><th>Origine</th></tr></thead>
              <tbody>{pos.map((p) => <tr key={p.id}><td><Link className="font-semibold text-vert underline" href={`/admin/achats/${p.id}`}>{p.number}</Link></td><td>{p.createdAt.toLocaleDateString("fr-FR")}</td><td>{p.supplier.name}</td><td>{p.warehouse.code}</td><td><span className="badge">{PO_STATUS[p.status]}</span></td><td className="text-right">{can(u.role, "purchase_cost.view") ? formatMoney(p.lines.reduce((s, l) => s + l.qty * l.unitCostMinor, 0), p.currency) : "—"}</td><td>{p.linkedOrderId ? "Commande client" : "Manuel"}</td></tr>)}</tbody>
            </table>
          </div>
        )}
        {can(u.role, "purchases.edit") && (
          suppliers.length === 0 || warehouses.length === 0 || variants.length === 0 ? <Empty>Pour créer un achat : au moins un fournisseur, un entrepôt et un produit.</Empty> : (
            <Panel title="Nouvelle commande d'approvisionnement">
              <ActionForm action={createPurchaseOrder} className="space-y-3">
                <div className="grid gap-2 md:grid-cols-4">
                  <select name="supplierId" className="select" aria-label="Fournisseur">{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                  <select name="warehouseId" className="select" aria-label="Entrepôt de réception">{warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}</select>
                  <select name="currency" className="select" aria-label="Devise"><option>XOF</option><option>XAF</option><option>EUR</option><option>USD</option></select>
                  <input name="expectedAt" type="date" className="input" aria-label="Date de livraison prévue" />
                </div>
                <table className="table"><thead><tr><th>Article</th><th>Quantité</th><th>Prix unitaire fournisseur</th></tr></thead>
                  <tbody>{Array.from({ length: 5 }, (_, i) => (
                    <tr key={i}>
                      <td><select name={`line_variant_${i}`} className="select" aria-label={`Article ligne ${i + 1}`}><option value="">—</option>{variants.map((v) => <option key={v.id} value={v.id}>{v.sku} — {v.product.nameFr}</option>)}</select></td>
                      <td><input name={`line_qty_${i}`} type="number" min={1} className="input" aria-label={`Quantité ligne ${i + 1}`} /></td>
                      <td><input name={`line_cost_${i}`} className="input" inputMode="decimal" aria-label={`Prix ligne ${i + 1}`} /></td>
                    </tr>
                  ))}</tbody>
                </table>
                <div className="grid gap-2 md:grid-cols-3">
                  <input name="freight" className="input" placeholder="Transport entrant" aria-label="Transport entrant" />
                  <input name="duties" className="input" placeholder="Droits de douane (documentés)" aria-label="Douane" />
                  <input name="other" className="input" placeholder="Autres frais d'importation" aria-label="Autres frais" />
                </div>
                <textarea name="notes" className="textarea" placeholder="Notes" aria-label="Notes" />
                <SubmitButton>Créer (soumis à validation)</SubmitButton>
              </ActionForm>
            </Panel>
          )
        )}
      </div>
    </>
  );
}
