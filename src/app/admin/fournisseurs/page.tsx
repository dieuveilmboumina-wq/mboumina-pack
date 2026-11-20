import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { AdminTitle, Empty, Panel } from "@/components/admin-ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { saveSupplier, saveSupplierPrice } from "@/modules/admin/supply-actions";

const KIND = { supplier: "Fournisseur", printer_partner: "Partenaire d'impression", carrier_partner: "Transporteur partenaire" } as Record<string, string>;

export default async function AdminSuppliers() {
  const u = await requireStaff("suppliers.view");
  const [suppliers, variants] = await Promise.all([
    db.supplier.findMany({ orderBy: { name: "asc" }, include: { items: { include: { variant: { include: { product: true } } } }, _count: { select: { purchaseOrders: true } } } }),
    db.productVariant.findMany({ include: { product: true, supplierItems: { include: { supplier: true } } }, orderBy: { sku: "asc" } }),
  ]);
  const edit = can(u.role, "suppliers.edit");
  const showCost = can(u.role, "purchase_cost.view");
  const compared = variants.filter((v) => v.supplierItems.length > 0);

  return (
    <>
      <AdminTitle title="Fournisseurs et partenaires" />
      <div className="space-y-6">
        {suppliers.length === 0 ? <Empty>Aucun fournisseur enregistré.</Empty> : (
          <div className="card overflow-x-auto">
            <table className="table"><thead><tr><th>Nom</th><th>Type</th><th>Pays</th><th>Contact</th><th>Paiement</th><th>Évaluation</th><th>Achats</th></tr></thead>
              <tbody>{suppliers.map((s) => <tr key={s.id}><td><strong>{s.name}</strong>{!s.active && " (inactif)"}</td><td>{KIND[s.kind]}</td><td>{s.country ?? "—"}</td><td>{[s.contactName, s.email, s.phone].filter(Boolean).join(" · ") || "—"}</td><td>{s.paymentTermsDays ? `${s.paymentTermsDays} j` : "—"}</td><td>{s.rating ? "★".repeat(s.rating) : "—"}</td><td>{s._count.purchaseOrders}</td></tr>)}</tbody>
            </table>
          </div>
        )}

        {showCost && (
          <Panel title="Comparaison des prix fournisseurs">
            {compared.length === 0 ? <p className="text-sm text-noir/60">Enregistrez les prix reçus de vos fournisseurs pour les comparer.</p> : (
              <table className="table text-sm"><thead><tr><th>Article</th><th>Offres (du moins cher au plus cher)</th></tr></thead>
                <tbody>{compared.map((v) => (
                  <tr key={v.id}><td>{v.sku} — {v.product.nameFr}</td>
                    <td>{[...v.supplierItems].sort((a, b) => a.costMinor - b.costMinor).map((s, i) => <div key={s.id} className={i === 0 ? "font-semibold text-vert" : ""}>{s.supplier.name} : {formatMoney(s.costMinor, s.currency)}{s.moq ? ` · MOQ ${s.moq}` : ""}{s.leadTimeDays != null ? ` · ${s.leadTimeDays} j` : ""} <span className="text-xs text-noir/50">(au {s.quotedAt.toLocaleDateString("fr-FR")})</span></div>)}</td></tr>
                ))}</tbody>
              </table>
            )}
          </Panel>
        )}

        {edit && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Nouveau fournisseur / partenaire">
              <ActionForm action={saveSupplier} className="grid gap-2 sm:grid-cols-2">
                <input name="name" className="input" placeholder="Raison sociale" required aria-label="Nom" />
                <select name="kind" className="select" aria-label="Type">{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <input name="country" className="input" placeholder="Pays" aria-label="Pays" />
                <input name="contactName" className="input" placeholder="Contact" aria-label="Contact" />
                <input name="email" type="email" className="input" placeholder="Email" aria-label="Email" />
                <input name="phone" className="input" placeholder="Téléphone" aria-label="Téléphone" />
                <input name="paymentTermsDays" type="number" className="input" placeholder="Délai de paiement (jours)" aria-label="Délai de paiement" />
                <input name="rating" type="number" min={1} max={5} className="input" placeholder="Évaluation 1-5" aria-label="Évaluation" />
                <textarea name="notes" className="textarea sm:col-span-2" placeholder="Notes (contrat, conditions, documents)" aria-label="Notes" />
                <div className="sm:col-span-2"><SubmitButton>Enregistrer</SubmitButton></div>
              </ActionForm>
            </Panel>
            {suppliers.length > 0 && variants.length > 0 && (
              <Panel title="Enregistrer un prix fournisseur (réponse à demande de prix)">
                <ActionForm action={saveSupplierPrice} className="grid gap-2 sm:grid-cols-2">
                  <select name="supplierId" className="select" aria-label="Fournisseur">{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                  <select name="variantId" className="select" aria-label="Article">{variants.map((v) => <option key={v.id} value={v.id}>{v.sku} — {v.product.nameFr}</option>)}</select>
                  <input name="cost" className="input" placeholder="Prix unitaire" required aria-label="Prix" />
                  <select name="currency" className="select" aria-label="Devise"><option>XOF</option><option>XAF</option><option>EUR</option><option>USD</option></select>
                  <input name="moq" type="number" className="input" placeholder="Minimum de commande" aria-label="MOQ" />
                  <input name="leadTimeDays" type="number" className="input" placeholder="Délai (jours)" aria-label="Délai" />
                  <input name="supplierSku" className="input sm:col-span-2" placeholder="Référence fournisseur" aria-label="Référence fournisseur" />
                  <div className="sm:col-span-2"><SubmitButton>Enregistrer</SubmitButton></div>
                </ActionForm>
              </Panel>
            )}
          </div>
        )}
      </div>
    </>
  );
}
