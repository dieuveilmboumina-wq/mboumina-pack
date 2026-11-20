import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { CUSTOMIZATION_STATUS_LABELS } from "@/lib/constants";
import { AdminTitle, Empty } from "@/components/admin-ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { updateCustomization } from "@/modules/admin/sales-actions";

export default async function AdminCustomizations() {
  await requireStaff("customizations.view");
  const [items, partners] = await Promise.all([
    db.customizationRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { partner: true, product: true } }),
    db.supplier.findMany({ where: { kind: "printer_partner", active: true } }),
  ]);
  return (
    <>
      <AdminTitle title="Personnalisations" />
      {items.length === 0 ? <Empty>Aucune demande de personnalisation.</Empty> : (
        <div className="space-y-4">
          {items.map((c) => {
            const design = c.design ? (JSON.parse(c.design) as Record<string, unknown>) : null;
            return (
              <details key={c.id} className="card p-5">
                <summary className="cursor-pointer"><strong>{c.number}</strong> — {c.companyName ?? c.contactName} · {c.packagingType} · {c.quantity} ex. · <span className="badge">{CUSTOMIZATION_STATUS_LABELS[c.status]}</span></summary>
                <div className="mt-4 grid gap-6 lg:grid-cols-2">
                  <div className="space-y-1 text-sm">
                    <p>{c.contactName} · {c.email}{c.phone && ` · ${c.phone}`}</p>
                    {c.product && <p>Produit : {c.product.sku} — {c.product.nameFr}</p>}
                    <p>Dimensions : {c.dimensions ?? "—"} · Matériau : {c.material ?? "à conseiller"} · Finition : {c.finish ?? "à conseiller"} · Impression : {c.printSides ?? "—"}</p>
                    <p>Couleurs : {c.colors ?? "—"} · Texte : {c.printText ?? "—"}</p>
                    {design && <p className="text-xs text-noir/60">Configurateur : {Object.entries(design).map(([k, v]) => `${k}=${v}`).join(", ")}</p>}
                    <p className="whitespace-pre-line rounded bg-beige/40 p-2">{c.description}</p>
                    <p>Fichiers : {c.logoFileId ? <a className="underline" href={`/api/files/${c.logoFileId}`}>logo</a> : "pas de logo"}{c.artworkFileId && <> · <a className="underline" href={`/api/files/${c.artworkFileId}`}>fichier graphique</a></>}</p>
                    <p>Maquette demandée : {c.wantsMockup ? "oui" : "non"} · BAT validé : {c.batApprovedAt ? c.batApprovedAt.toLocaleString("fr-FR") : "non"}</p>
                  </div>
                  <ActionForm action={updateCustomization} className="space-y-2">
                    <input type="hidden" name="id" value={c.id} />
                    <label className="label" htmlFor={`st-${c.id}`}>Statut</label>
                    <select id={`st-${c.id}`} name="status" defaultValue={c.status} className="select">{Object.entries(CUSTOMIZATION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    <label className="label" htmlFor={`pa-${c.id}`}>Partenaire d'impression</label>
                    <select id={`pa-${c.id}`} name="partnerId" defaultValue={c.partnerId ?? ""} className="select"><option value="">—</option>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                    <fieldset className="space-y-1 text-sm">
                      <legend className="label">Conditions de validation définitive</legend>
                      <label className="flex gap-2"><input type="checkbox" name="priceConfirmed" defaultChecked={c.priceConfirmed} /> Prix confirmé</label>
                      <label className="flex gap-2"><input type="checkbox" name="leadTimeConfirmed" defaultChecked={c.leadTimeConfirmed} /> Délai confirmé</label>
                      <label className="flex gap-2"><input type="checkbox" name="feasibilityConfirmed" defaultChecked={c.feasibilityConfirmed} /> Faisabilité confirmée par le partenaire</label>
                      <label className="flex gap-2"><input type="checkbox" name="batApproved" defaultChecked={!!c.batApprovedAt} disabled={!!c.batApprovedAt} /> BAT validé par écrit par le client</label>
                    </fieldset>
                    <SubmitButton>Mettre à jour</SubmitButton>
                  </ActionForm>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}
