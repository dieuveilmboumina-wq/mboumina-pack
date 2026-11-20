import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { landedUnitCost } from "@/modules/pricing/engine";
import { AdminTitle, Panel } from "@/components/admin-ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { poTransition, receivePurchaseOrder } from "@/modules/admin/supply-actions";

const PO_STATUS: Record<string, string> = { draft: "Brouillon", pending_approval: "À valider", approved: "Validé", sent: "Envoyé au fournisseur", partially_received: "Reçu partiellement", received: "Reçu", cancelled: "Annulé" };

export default async function PurchaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireStaff("suppliers.view");
  const { id } = await params;
  const po = await db.purchaseOrder.findUnique({ where: { id }, include: { supplier: true, warehouse: true, lines: { include: { variant: { include: { product: true } } } }, receipts: { include: { lines: true }, orderBy: { receivedAt: "desc" } } } });
  if (!po) notFound();
  const showCost = can(u.role, "purchase_cost.view");
  const extra = po.freightMinor + po.dutiesMinor + po.otherCostsMinor;
  const landed = landedUnitCost(po.lines.map((l) => ({ qty: l.qty, unitCostMinor: l.unitCostMinor })), extra);
  const goods = po.lines.reduce((s, l) => s + l.qty * l.unitCostMinor, 0);
  const actions: [string, string, boolean][] = [
    ["approved", "Valider l'achat", po.status === "pending_approval" && can(u.role, "purchases.approve")],
    ["sent", "Marquer envoyé au fournisseur", po.status === "approved" && can(u.role, "purchases.edit")],
    ["cancelled", "Annuler", ["pending_approval", "approved", "sent"].includes(po.status) && can(u.role, "purchases.edit")],
  ];
  return (
    <>
      <AdminTitle title={`Achat ${po.number}`}>
        <span className="badge self-center !text-sm">{PO_STATUS[po.status]}</span>
        {actions.filter(([, , ok]) => ok).map(([to, label]) => (
          <form key={to} action={poTransition}><input type="hidden" name="id" value={po.id} /><input type="hidden" name="to" value={to} /><button className={`btn ${to === "cancelled" ? "btn-ghost" : "btn-primary"}`}>{label}</button></form>
        ))}
      </AdminTitle>
      <div className="space-y-6">
        <Panel>
          <p className="text-sm">Fournisseur : <strong>{po.supplier.name}</strong> · Entrepôt : {po.warehouse.name} · Prévu : {po.expectedAt?.toLocaleDateString("fr-FR") ?? "—"}{po.linkedOrderId && " · Généré depuis une commande client"}</p>
          {po.status === "pending_approval" && <p className="mt-1 text-xs text-noir/60">Validation hiérarchique : l'achat doit être validé par une personne différente de son créateur (sauf fondateur).</p>}
          <table className="table mt-3"><thead><tr><th>Article</th><th>Commandé</th><th>Reçu</th><th>Refusé</th>{showCost && <><th>P.U. fournisseur</th><th>Coût de revient unitaire</th></>}</tr></thead>
            <tbody>{po.lines.map((l, i) => <tr key={l.id}><td>{l.variant.sku} — {l.variant.product.nameFr}</td><td>{l.qty}</td><td>{l.receivedQty}</td><td>{l.rejectedQty}</td>{showCost && <><td>{formatMoney(l.unitCostMinor, po.currency)}</td><td>{formatMoney(landed[i], po.currency)}</td></>}</tr>)}</tbody>
          </table>
          {showCost && <p className="mt-2 text-sm">Marchandises : {formatMoney(goods, po.currency)} · Transport : {formatMoney(po.freightMinor, po.currency)} · Douane : {formatMoney(po.dutiesMinor, po.currency)} · Autres : {formatMoney(po.otherCostsMinor, po.currency)} · <strong>Total : {formatMoney(goods + extra, po.currency)}</strong></p>}
        </Panel>

        {["approved", "sent", "partially_received"].includes(po.status) && can(u.role, "stock.edit") && (
          <Panel title="Réception et contrôle">
            <ActionForm action={receivePurchaseOrder} className="space-y-3">
              <input type="hidden" name="poId" value={po.id} />
              <table className="table"><thead><tr><th>Article</th><th>Restant</th><th>Accepté</th><th>Refusé</th><th>Lot</th><th>Non-conformité</th></tr></thead>
                <tbody>{po.lines.map((l) => {
                  const left = l.qty - l.receivedQty - l.rejectedQty;
                  return (
                    <tr key={l.id}><td>{l.variant.sku}</td><td>{left}</td>
                      <td><input name={`acc_${l.id}`} type="number" min={0} max={left} defaultValue={left} className="input !w-24" aria-label="Accepté" /></td>
                      <td><input name={`rej_${l.id}`} type="number" min={0} max={left} defaultValue={0} className="input !w-24" aria-label="Refusé" /></td>
                      <td><input name={`lot_${l.id}`} className="input !w-32" aria-label="Lot" /></td>
                      <td><input name={`nc_${l.id}`} className="input" placeholder="Décrire le défaut" aria-label="Non-conformité" /></td></tr>
                  );
                })}</tbody>
              </table>
              <fieldset className="flex flex-wrap gap-4 text-sm"><legend className="label">Contrôle à réception</legend>
                <label className="flex items-center gap-2"><input type="checkbox" name="chk_packaging" /> Colis et emballages en bon état</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="chk_labels" /> Étiquetage / références conformes</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="chk_docs" /> Documents fournisseur reçus</label>
              </fieldset>
              <textarea name="notes" className="textarea" placeholder="Observations" aria-label="Observations" />
              <SubmitButton>Enregistrer la réception</SubmitButton>
            </ActionForm>
          </Panel>
        )}

        {po.receipts.length > 0 && (
          <Panel title="Historique des réceptions">
            <ul className="text-sm">{po.receipts.map((r) => <li key={r.id}>{r.receivedAt.toLocaleString("fr-FR")} — {r.lines.reduce((s, l) => s + l.acceptedQty, 0)} accepté(s), {r.lines.reduce((s, l) => s + l.rejectedQty, 0)} refusé(s){r.lines.some((l) => l.nonConformity) && " · non-conformité signalée"}{r.notes && ` · ${r.notes}`}</li>)}</ul>
          </Panel>
        )}
      </div>
    </>
  );
}
