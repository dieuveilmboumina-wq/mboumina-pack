import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { AdminTitle, Panel } from "@/components/admin-ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { saveCarrier, saveZone, saveRate, toggleZone, saveCountry } from "@/modules/admin/config-actions";

export default async function AdminShipping() {
  const u = await requireStaff("logistics.view");
  const [carriers, zones, countries] = await Promise.all([
    db.carrier.findMany({ orderBy: { name: "asc" } }),
    db.shippingZone.findMany({ include: { rates: { include: { carrier: true } } }, orderBy: { name: "asc" } }),
    db.country.findMany().then((cs) => cs.sort((a, b) => a.nameFr.localeCompare(b.nameFr, "fr"))),
  ]);
  const edit = can(u.role, "logistics.edit");
  return (
    <>
      <AdminTitle title="Livraison et pays" />
      <div className="space-y-6">
        <p className="text-sm text-noir/70">Un pays n'est proposé à la commande que si : (1) une zone <strong>active</strong> le contient, (2) avec au moins un tarif actif d'un transporteur actif, (3) et que la vente y est ouverte après vérification de la couverture réelle.</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Transporteurs">
            <ul className="mb-3 text-sm">{carriers.length === 0 ? <li className="text-noir/60">Aucun.</li> : carriers.map((c) => <li key={c.id}>{c.name}{c.contractRef && ` — contrat ${c.contractRef}`}</li>)}</ul>
            {edit && (
              <ActionForm action={saveCarrier} className="grid gap-2">
                <input name="name" className="input" placeholder="Nom du transporteur" required aria-label="Nom" />
                <input name="trackingUrlTemplate" className="input" placeholder="https://…/suivi/{tracking}" aria-label="URL de suivi" />
                <input name="contractRef" className="input" placeholder="Référence du contrat" aria-label="Contrat" />
                <SubmitButton>Ajouter</SubmitButton>
              </ActionForm>
            )}
          </Panel>
          {edit && (
            <Panel title="Nouvelle zone">
              <ActionForm action={saveZone} className="grid gap-2">
                <input name="name" className="input" placeholder="Nom (ex. Dakar ville)" required aria-label="Nom" />
                <input name="countries" className="input" placeholder="Pays ISO (ex. SN ou SN, GM)" required aria-label="Pays" />
                <input name="cities" className="input" placeholder="Villes (facultatif, séparées par des virgules)" aria-label="Villes" />
                <SubmitButton>Créer la zone</SubmitButton>
              </ActionForm>
            </Panel>
          )}
        </div>

        <Panel title="Zones et tarifs">
          {zones.length === 0 ? <p className="text-sm text-noir/60">Aucune zone.</p> : zones.map((z) => (
            <div key={z.id} className="mb-4 rounded border border-beige p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p><strong>{z.name}</strong> — {z.countries}{z.cities && ` · villes : ${z.cities}`} <span className="badge">{z.active ? "Active" : "Inactive"}</span></p>
                {edit && <form action={toggleZone}><input type="hidden" name="id" value={z.id} /><button className="btn btn-ghost !py-1">{z.active ? "Désactiver" : "Activer"}</button></form>}
              </div>
              <ul className="mt-2 text-sm">{z.rates.map((r) => <li key={r.id}>{r.carrier.name} — {r.service} : {formatMoney(r.baseMinor, r.currency)}{r.perKgMinor ? ` + ${formatMoney(r.perKgMinor, r.currency)}/kg` : ""}{r.freeAboveMinor != null ? ` · offert dès ${formatMoney(r.freeAboveMinor, r.currency)}` : ""} · {r.minDays}-{r.maxDays} j</li>)}</ul>
              {edit && carriers.length > 0 && (
                <ActionForm action={saveRate} className="mt-2 grid gap-2 md:grid-cols-5">
                  <input type="hidden" name="zoneId" value={z.id} />
                  <select name="carrierId" className="select" aria-label="Transporteur">{carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  <select name="service" className="select" aria-label="Service"><option value="standard">Standard</option><option value="express">Express</option><option value="international">International</option><option value="pickup">Retrait</option></select>
                  <select name="currency" className="select" aria-label="Devise"><option>XOF</option><option>XAF</option><option>EUR</option><option>USD</option></select>
                  <input name="base" className="input" placeholder="Prix de base" required aria-label="Prix de base" />
                  <input name="perKg" className="input" placeholder="Prix / kg" aria-label="Prix par kg" />
                  <input name="freeAbove" className="input" placeholder="Offert dès (sous-total)" aria-label="Franco" />
                  <input name="minDays" type="number" className="input" placeholder="Délai min (j)" required aria-label="Délai min" />
                  <input name="maxDays" type="number" className="input" placeholder="Délai max (j)" required aria-label="Délai max" />
                  <SubmitButton>Ajouter le tarif</SubmitButton>
                </ActionForm>
              )}
            </div>
          ))}
        </Panel>

        {can(u.role, "settings.edit") && (
          <Panel title="Pays : taxes et ouverture de la vente">
            <table className="table text-sm"><thead><tr><th>Pays</th><th>Devise</th><th>Fuseau</th><th>Taxe</th><th>Vente</th></tr></thead>
              <tbody>{countries.map((c) => (
                <tr key={c.code}><td>{c.nameFr} ({c.code})</td><td>{c.currency}</td><td>{c.timezone}</td>
                  <td colSpan={2}>
                    <ActionForm action={saveCountry} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="code" value={c.code} />
                      <input name="taxLabel" defaultValue={c.taxLabel ?? ""} className="input !w-20 !py-1" placeholder="TVA" aria-label="Libellé taxe" />
                      <input name="taxRate" defaultValue={c.taxRateBp != null ? (c.taxRateBp / 100).toString() : ""} className="input !w-20 !py-1" placeholder="%" aria-label="Taux" />
                      <label className="flex items-center gap-1"><input type="checkbox" name="sellingEnabled" defaultChecked={c.sellingEnabled} /> Ouvert</label>
                      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="coverageVerified" /> Couverture vérifiée</label>
                      <button className="btn btn-ghost !py-1">OK</button>
                    </ActionForm>
                  </td></tr>
              ))}</tbody>
            </table>
          </Panel>
        )}
      </div>
    </>
  );
}
