import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { decimalsOf, formatMoney } from "@/lib/money";
import { AdminTitle, Panel } from "@/components/admin-ui";
import { AdminProductForm } from "@/components/admin-product-form";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Notice } from "@/components/site";
import { saveVariant, setProductStatus, addProductMedia, addProductDocument, verifyDocument } from "@/modules/admin/catalog-actions";

const toInput = (minor: number | null | undefined, cur: string) => (minor == null ? "" : (minor / 10 ** decimalsOf(cur)).toFixed(decimalsOf(cur)));
const toDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
const DEFAULT_TIER_LABELS = ["Détail", "Intermédiaire", "Professionnel", "Grossiste", "", ""];

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const u = await requireStaff("catalog.view");
  const { id } = await params;
  const { ok } = await searchParams;
  const p = await db.product.findUnique({ where: { id }, include: { variants: { include: { tiers: { orderBy: { minQty: "asc" } }, stockLevels: { include: { warehouse: true } } } }, media: { orderBy: { sort: "asc" } }, documents: true } });
  if (!p) notFound();
  const showCost = can(u.role, "purchase_cost.view");
  const canPrice = can(u.role, "pricing.edit");
  const missing = [
    p.variants.every((v) => v.priceMinor == null && v.tiers.length === 0) && "aucun prix défini (le produit s'affichera « sur devis »)",
    p.media.length === 0 && "aucune photo",
    !p.descCommercialFr && "pas de description commerciale",
  ].filter(Boolean);

  return (
    <>
      <AdminTitle title={`${p.nameFr} — ${p.sku}`}>
        <span className="badge self-center !text-sm">{{ draft: "Brouillon", active: "En ligne", archived: "Archivé" }[p.status]}</span>
        {can(u.role, "catalog.edit") && (["active", "draft", "archived"] as const).filter((s) => s !== p.status).map((s) => (
          <form key={s} action={setProductStatus}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value={s} />
            <button className={`btn ${s === "active" ? "btn-primary" : "btn-ghost"}`}>{{ active: "Publier", draft: "Repasser en brouillon", archived: "Archiver" }[s]}</button></form>
        ))}
        {p.status === "active" && <Link href={`/fr/produit/${p.slug}`} className="btn btn-ghost" target="_blank">Voir sur le site</Link>}
      </AdminTitle>
      <div className="space-y-6">
        {ok && <Notice kind="success">Produit enregistré.</Notice>}
        {missing.length > 0 && <Notice kind="warning">À compléter : {missing.join(", ")}.</Notice>}

        {p.variants.map((v) => {
          const marginBp = v.priceMinor && v.purchaseCostMinor != null ? Math.round(((v.priceMinor - v.purchaseCostMinor) * 10000) / v.priceMinor) : null;
          return (
            <Panel key={v.id} title={`Variante : ${v.label} (${v.sku})`}>
              <VariantForm productId={p.id} v={v} showCost={showCost} disabled={!canPrice} />
              {showCost && marginBp != null && <p className="mt-2 text-sm">Marge brute au prix détail : <strong>{formatMoney(v.priceMinor! - v.purchaseCostMinor!, v.currency)} ({(marginBp / 100).toFixed(1)} %)</strong></p>}
              <p className="mt-3 text-sm">Stock : {v.stockLevels.length === 0 ? "aucun mouvement enregistré" : v.stockLevels.map((l) => `${l.warehouse.name} : ${l.onHand} en main, ${l.reserved} réservé(s), ${l.blocked} bloqué(s)`).join(" · ")} — <Link className="underline" href="/admin/stocks">gérer</Link></p>
            </Panel>
          );
        })}
        {canPrice && (
          <details className="card p-5">
            <summary className="cursor-pointer font-bold">Ajouter une variante (taille, couleur, matériau…)</summary>
            <div className="mt-4"><VariantForm productId={p.id} showCost={showCost} /></div>
          </details>
        )}

        <Panel title="Fiche produit"><AdminProductForm product={p} /></Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Photos">
            <div className="mb-3 grid grid-cols-4 gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.media.map((m) => <img key={m.id} src={m.url} alt={m.alt} className="aspect-square rounded object-cover" />)}
            </div>
            <ActionForm action={addProductMedia} className="space-y-2">
              <input type="hidden" name="productId" value={p.id} />
              <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className="input" required aria-label="Image" />
              <input name="alt" className="input" placeholder="Texte alternatif (description de l'image)" aria-label="Texte alternatif" />
              <SubmitButton>Ajouter la photo</SubmitButton>
              <p className="text-xs text-noir/60">Utilisez uniquement des photos réelles des produits distribués.</p>
            </ActionForm>
          </Panel>
          <Panel title="Documents techniques et de conformité">
            <ul className="mb-3 space-y-2 text-sm">
              {p.documents.map((d) => (
                <li key={d.id} className="rounded border border-beige p-2">
                  <a className="underline" href={`/api/files/${d.fileId}`}>{d.title}</a> ({d.kind}) {d.issuer && `— ${d.issuer}`}
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="badge">{d.verifiedAt ? `Vérifié le ${d.verifiedAt.toLocaleDateString("fr-FR")}` : "Non vérifié"}</span>
                    <span className="badge">{d.isPublic ? "Public" : "Interne"}</span>
                    {(d.verifiedAt ? ["unverify", d.isPublic ? "unpublish" : "publish"] : ["verify"]).map((a) => (
                      <form key={a} action={verifyDocument}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="action" value={a} /><button className="text-xs underline">{{ verify: "Marquer vérifié", unverify: "Retirer la vérification", publish: "Publier", unpublish: "Dépublier" }[a]}</button></form>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <ActionForm action={addProductDocument} className="grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="productId" value={p.id} />
              <select name="kind" className="select" aria-label="Type">
                <option value="datasheet">Fiche technique</option><option value="declaration">Déclaration de conformité</option><option value="certificate">Certificat</option>
                <option value="material">Information matériaux</option><option value="test_report">Rapport d'essai</option><option value="migration">Essai de migration</option>
              </select>
              <input name="title" className="input" placeholder="Titre" required aria-label="Titre" />
              <input name="issuer" className="input" placeholder="Émetteur" aria-label="Émetteur" />
              <input name="country" className="input" placeholder="Juridiction / pays" aria-label="Juridiction" />
              <input name="validUntil" type="date" className="input" aria-label="Valable jusqu'au" />
              <input name="file" type="file" accept="application/pdf,image/png,image/jpeg" className="input" required aria-label="Fichier" />
              <div className="sm:col-span-2"><SubmitButton>Ajouter le document</SubmitButton></div>
            </ActionForm>
            <p className="mt-2 text-xs text-noir/60">Un document n'apparaît sur le site qu'après vérification puis publication. Ne jamais publier de certification non authentifiée.</p>
          </Panel>
        </div>
      </div>
    </>
  );
}

type V = { id: string; label: string; sku: string; currency: string; priceMinor: number | null; purchaseCostMinor: number | null; promoPriceMinor: number | null; promoStartsAt: Date | null; promoEndsAt: Date | null; taxRateBp: number | null; active: boolean; tiers: { minQty: number; label: string; unitPriceMinor: number | null; negotiable: boolean }[] };

function VariantForm({ productId, v, showCost, disabled = false }: { productId: string; v?: V; showCost: boolean; disabled?: boolean }) {
  const cur = v?.currency ?? "XOF";
  const rows = Array.from({ length: 6 }, (_, i) => v?.tiers[i]);
  return (
    <ActionForm action={saveVariant} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      {v && <input type="hidden" name="variantId" value={v.id} />}
      <fieldset disabled={disabled} className="grid gap-3 md:grid-cols-4">
        <label className="block"><span className="label">Libellé</span><input name="label" defaultValue={v?.label ?? ""} className="input" required /></label>
        <label className="block"><span className="label">SKU</span><input name="sku" defaultValue={v?.sku ?? ""} className="input" required /></label>
        <label className="block"><span className="label">Devise</span><select name="currency" defaultValue={cur} className="select"><option value="XOF">FCFA (XOF)</option><option value="XAF">FCFA (XAF)</option><option value="EUR">EUR</option><option value="USD">USD</option></select></label>
        <label className="block"><span className="label">Taxe spécifique (%)</span><input name="taxRate" defaultValue={v?.taxRateBp != null ? (v.taxRateBp / 100).toString() : ""} className="input" placeholder="vide = taux du pays" /></label>
        {showCost && <label className="block"><span className="label">Prix d'achat unitaire</span><input name="cost" defaultValue={toInput(v?.purchaseCostMinor, cur)} className="input" inputMode="decimal" /></label>}
        <label className="block"><span className="label">Prix de vente unitaire (détail)</span><input name="price" defaultValue={toInput(v?.priceMinor, cur)} className="input" inputMode="decimal" placeholder="vide = sur devis" /></label>
        <label className="block"><span className="label">Prix promotionnel</span><input name="promoPrice" defaultValue={toInput(v?.promoPriceMinor, cur)} className="input" inputMode="decimal" /></label>
        <div className="grid grid-cols-2 gap-2"><label className="block"><span className="label">Promo du</span><input type="date" name="promoStartsAt" defaultValue={toDate(v?.promoStartsAt ?? null)} className="input" /></label><label className="block"><span className="label">au</span><input type="date" name="promoEndsAt" defaultValue={toDate(v?.promoEndsAt ?? null)} className="input" /></label></div>
      </fieldset>
      <fieldset disabled={disabled}>
        <legend className="label">Paliers tarifaires (prix unitaire selon la quantité)</legend>
        <table className="table">
          <thead><tr><th>À partir de (qté)</th><th>Nom du tarif</th><th>Prix unitaire</th><th>Négociable (sur devis)</th></tr></thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={i}>
                <td><input name={`tier_min_${i}`} type="number" min={1} defaultValue={t?.minQty ?? ""} className="input !py-1" aria-label={`Quantité minimale palier ${i + 1}`} /></td>
                <td><input name={`tier_label_${i}`} defaultValue={t?.label ?? DEFAULT_TIER_LABELS[i]} className="input !py-1" aria-label={`Nom palier ${i + 1}`} /></td>
                <td><input name={`tier_price_${i}`} defaultValue={toInput(t?.unitPriceMinor, cur)} className="input !py-1" inputMode="decimal" aria-label={`Prix palier ${i + 1}`} /></td>
                <td><input name={`tier_neg_${i}`} type="checkbox" defaultChecked={t?.negotiable} aria-label={`Négociable palier ${i + 1}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1 text-xs text-noir/60">Laissez la quantité vide pour ignorer une ligne. Aucun prix n'est pré-rempli : saisissez vos tarifs réels.</p>
      </fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={v?.active ?? true} disabled={disabled} /> Variante active</label>
      {!disabled && <SubmitButton>{v ? "Enregistrer la variante et les tarifs" : "Ajouter la variante"}</SubmitButton>}
    </ActionForm>
  );
}
