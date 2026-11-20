import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { AdminTitle, Empty, Panel } from "@/components/admin-ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { saveWarehouse, stockMovement, setStockThresholds } from "@/modules/admin/supply-actions";

export default async function AdminStocks() {
  const u = await requireStaff("stock.view");
  const [warehouses, variants, countries, movements] = await Promise.all([
    db.warehouse.findMany({ orderBy: { code: "asc" } }),
    db.productVariant.findMany({ include: { product: true, stockLevels: true }, orderBy: { sku: "asc" } }),
    db.country.findMany().then((cs) => cs.sort((a, b) => a.nameFr.localeCompare(b.nameFr, "fr"))),
    db.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { variant: true, warehouse: true } }),
  ]);
  const edit = can(u.role, "stock.edit");
  const showCost = can(u.role, "purchase_cost.view");
  const valuation = new Map<string, number>();
  for (const v of variants) for (const l of v.stockLevels) valuation.set(v.currency, (valuation.get(v.currency) ?? 0) + l.onHand * (l.avgCostMinor ?? 0));

  return (
    <>
      <AdminTitle title="Stocks et entrepôts" />
      <div className="space-y-6">
        <Panel title="Entrepôts">
          {warehouses.length === 0 ? <p className="mb-3 text-sm text-amber-800">Aucun entrepôt. Créez vos entrepôts réels avant toute entrée de stock.</p> : (
            <ul className="mb-3 flex flex-wrap gap-2 text-sm">{warehouses.map((w) => <li key={w.id} className="badge !text-sm">{w.code} — {w.name}, {w.city} ({w.country})</li>)}</ul>
          )}
          {edit && (
            <ActionForm action={saveWarehouse} className="grid gap-2 sm:grid-cols-5">
              <input name="code" className="input" placeholder="Code (ex. DKR1)" required aria-label="Code" />
              <input name="name" className="input" placeholder="Nom" required aria-label="Nom" />
              <select name="country" className="select" aria-label="Pays">{countries.map((c) => <option key={c.code} value={c.code}>{c.nameFr}</option>)}</select>
              <input name="city" className="input" placeholder="Ville" required aria-label="Ville" />
              <SubmitButton>Créer</SubmitButton>
            </ActionForm>
          )}
        </Panel>

        {showCost && valuation.size > 0 && <Panel title="Valorisation du stock (coût moyen pondéré)"><p className="text-sm">{[...valuation].map(([c, v]) => formatMoney(v, c)).join(" · ")}</p></Panel>}

        <Panel title="État des stocks">
          {variants.length === 0 || warehouses.length === 0 ? <Empty>Aucun article ou entrepôt.</Empty> : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Article</th>{warehouses.map((w) => <th key={w.id}>{w.code}<div className="text-xs font-normal">main / rés. / bloq. — seuils</div></th>)}</tr></thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.id}>
                      <td><strong>{v.sku}</strong><div className="text-xs">{v.product.nameFr} — {v.label}</div></td>
                      {warehouses.map((w) => {
                        const l = v.stockLevels.find((x) => x.warehouseId === w.id);
                        const low = l?.minLevel != null && l.onHand - l.reserved <= l.minLevel;
                        return (
                          <td key={w.id} className={low ? "bg-amber-50" : ""}>
                            {l ? `${l.onHand} / ${l.reserved} / ${l.blocked}` : "—"}
                            {edit && (
                              <form action={setStockThresholds} className="mt-1 flex gap-1">
                                <input type="hidden" name="variantId" value={v.id} /><input type="hidden" name="warehouseId" value={w.id} />
                                <input name="minLevel" defaultValue={l?.minLevel ?? ""} className="input !w-16 !px-1 !py-0.5 text-xs" placeholder="min" aria-label="Seuil minimum" />
                                <input name="maxLevel" defaultValue={l?.maxLevel ?? ""} className="input !w-16 !px-1 !py-0.5 text-xs" placeholder="max" aria-label="Seuil maximum" />
                                <button className="text-xs underline">OK</button>
                              </form>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {edit && variants.length > 0 && warehouses.length > 0 && (
          <Panel title="Mouvement manuel (inventaire, ajustement, transfert, blocage, retour)">
            <ActionForm action={stockMovement} className="grid gap-2 md:grid-cols-4">
              <select name="variantId" className="select" aria-label="Article">{variants.map((v) => <option key={v.id} value={v.id}>{v.sku} — {v.product.nameFr}</option>)}</select>
              <select name="type" className="select" aria-label="Type">
                <option value="adjustment_in">Entrée (inventaire / ajustement +)</option><option value="adjustment_out">Sortie (casse / ajustement −)</option>
                <option value="transfer">Transfert vers un autre entrepôt</option><option value="return">Retour client remis en stock</option>
                <option value="block">Bloquer (qualité)</option><option value="unblock">Débloquer</option>
              </select>
              <select name="warehouseId" className="select" aria-label="Entrepôt">{warehouses.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}</select>
              <select name="toWarehouseId" className="select" aria-label="Destination (transfert)"><option value="">Destination (transfert)</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}</select>
              <input name="qty" type="number" min={1} className="input" placeholder="Quantité" required aria-label="Quantité" />
              <input name="lot" className="input" placeholder="Lot" aria-label="Lot" />
              <input name="note" className="input md:col-span-2" placeholder="Motif (obligatoire)" required aria-label="Motif" />
              <SubmitButton>Enregistrer</SubmitButton>
            </ActionForm>
            <p className="mt-2 text-xs text-noir/60">Les entrées liées aux achats se font par la réception des commandes fournisseurs (contrôle et coût moyen pondéré).</p>
          </Panel>
        )}

        <Panel title="Derniers mouvements (traçabilité)">
          {movements.length === 0 ? <p className="text-sm text-noir/60">Aucun mouvement.</p> : (
            <table className="table text-xs"><thead><tr><th>Date</th><th>Article</th><th>Entrepôt</th><th>Type</th><th>Qté</th><th>Lot</th><th>Réf.</th><th>Note</th></tr></thead>
              <tbody>{movements.map((m) => <tr key={m.id}><td>{m.createdAt.toLocaleString("fr-FR")}</td><td>{m.variant.sku}</td><td>{m.warehouse.code}</td><td>{m.type}</td><td>{m.qty}</td><td>{m.lot ?? ""}</td><td>{m.refType ? `${m.refType}` : ""}</td><td>{m.note ?? ""}</td></tr>)}</tbody>
            </table>
          )}
        </Panel>
      </div>
    </>
  );
}
