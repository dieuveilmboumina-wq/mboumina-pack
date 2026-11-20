import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { decimalsOf, formatMoney } from "@/lib/money";
import { QUOTE_STATUS_LABELS } from "@/lib/constants";
import { AdminTitle, Panel } from "@/components/admin-ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { saveQuote, quoteStatus, convertQuoteToOrder } from "@/modules/admin/sales-actions";
import { can } from "@/lib/permissions";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

const toInput = (m: number, c: string) => (m / 10 ** decimalsOf(c)).toFixed(decimalsOf(c));

export default async function AdminQuoteDetail({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireStaff("quotes.view");
  const { id } = await params;
  const q = await db.quote.findUnique({ where: { id }, include: { lines: true } });
  if (!q) notFound();
  const variants = await db.productVariant.findMany({ include: { product: true }, orderBy: { sku: "asc" } });
  const rows = Array.from({ length: Math.max(6, q.lines.length + 2) }, (_, i) => q.lines[i]);
  const editable = ["requested", "draft", "revised"].includes(q.status);
  const canConvert = q.status === "accepted" && !q.orderId && can(u.role, "orders.edit");
  const countries = canConvert ? await db.country.findMany().then((cs) => cs.sort((a, b) => a.nameFr.localeCompare(b.nameFr, "fr"))) : [];
  const linkedOrder = q.orderId ? await db.order.findUnique({ where: { id: q.orderId }, select: { id: true, number: true, status: true } }) : null;
  return (
    <>
      <AdminTitle title={`Devis ${q.number} (rév. ${q.revision})`}><span className="badge self-center !text-sm">{QUOTE_STATUS_LABELS[q.status]}</span></AdminTitle>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel title="Demande du client">
            <p className="text-sm">{q.contactName}{q.companyName && ` — ${q.companyName}`} · {q.email}{q.phone && ` · ${q.phone}`} · {q.country}</p>
            <p className="mt-2 whitespace-pre-line rounded bg-beige/40 p-3 text-sm">{q.request}</p>
          </Panel>
          <Panel title="Chiffrage">
            <ActionForm action={saveQuote} className="space-y-3">
              <input type="hidden" name="quoteId" value={q.id} />
              <fieldset disabled={!editable} className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-4">
                  <label className="block"><span className="label">Devise</span><select name="currency" defaultValue={q.currency} className="select"><option>XOF</option><option>XAF</option><option>EUR</option><option>USD</option></select></label>
                  <label className="block"><span className="label">Validité jusqu'au</span><input type="date" name="validUntil" defaultValue={q.validUntil?.toISOString().slice(0, 10)} className="input" /></label>
                  <label className="block"><span className="label">Transport</span><input name="shipping" defaultValue={toInput(q.shippingMinor, q.currency)} className="input" /></label>
                  <label className="block"><span className="label">Remise</span><input name="discount" defaultValue={toInput(q.discountMinor, q.currency)} className="input" /></label>
                </div>
                <table className="table"><thead><tr><th>Produit catalogue</th><th>Désignation</th><th>Qté</th><th>P.U.</th><th>Taxe %</th></tr></thead>
                  <tbody>{rows.map((l, i) => (
                    <tr key={i}>
                      <td><select name={`l_variant_${i}`} defaultValue={l?.variantId ?? ""} className="select !py-1" aria-label="Produit"><option value="">Hors catalogue</option>{variants.map((v) => <option key={v.id} value={v.id}>{v.sku}</option>)}</select></td>
                      <td><input name={`l_desc_${i}`} defaultValue={l?.description} className="input !py-1" aria-label="Désignation" /></td>
                      <td><input name={`l_qty_${i}`} type="number" min={1} defaultValue={l?.qty} className="input !w-24 !py-1" aria-label="Quantité" /></td>
                      <td><input name={`l_price_${i}`} defaultValue={l ? toInput(l.unitPriceMinor, q.currency) : ""} className="input !w-28 !py-1" aria-label="Prix unitaire" /></td>
                      <td><input name={`l_tax_${i}`} defaultValue={l ? (l.taxRateBp / 100).toString() : ""} className="input !w-20 !py-1" aria-label="Taxe" /></td>
                    </tr>
                  ))}</tbody>
                </table>
                {editable && <SubmitButton>Enregistrer et recalculer</SubmitButton>}
              </fieldset>
            </ActionForm>
            <dl className="mt-4 grid grid-cols-2 gap-1 text-sm">
              <dt>Sous-total</dt><dd className="text-right">{formatMoney(q.subtotalMinor, q.currency)}</dd>
              <dt>Remise</dt><dd className="text-right">− {formatMoney(q.discountMinor, q.currency)}</dd>
              <dt>Taxes</dt><dd className="text-right">{formatMoney(q.taxMinor, q.currency)}</dd>
              <dt>Transport</dt><dd className="text-right">{formatMoney(q.shippingMinor, q.currency)}</dd>
              <dt className="font-bold">Total</dt><dd className="text-right font-bold">{formatMoney(q.totalMinor, q.currency)}</dd>
            </dl>
          </Panel>
        </div>
        <div className="space-y-6">
        {linkedOrder && (
          <Panel title="Commande">
            <p className="text-sm">Devis transformé en commande <a className="font-semibold underline" href={`/admin/commandes/${linkedOrder.id}`}>{linkedOrder.number}</a> — {ORDER_STATUS_LABELS[linkedOrder.status]}.</p>
          </Panel>
        )}
        {canConvert && (
          <Panel title="Transformer en commande">
            <p className="mb-3 text-xs text-noir/70">Reprend les prix, taxes, remise et transport du devis. Le stock des articles catalogue est réservé. La commande attend un paiement vérifié.</p>
            <ActionForm action={convertQuoteToOrder} className="space-y-2">
              <input type="hidden" name="quoteId" value={q.id} />
              <label className="block"><span className="label">Destinataire</span><input name="fullName" defaultValue={q.contactName} className="input" required /></label>
              <label className="block"><span className="label">Téléphone</span><input name="phone" type="tel" defaultValue={q.phone ?? ""} className="input" required /></label>
              <label className="block"><span className="label">Adresse</span><input name="line1" className="input" required /></label>
              <label className="block"><span className="label">Complément</span><input name="line2" className="input" /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block"><span className="label">Ville</span><input name="city" className="input" required /></label>
                <label className="block"><span className="label">Code postal</span><input name="postalCode" className="input" /></label>
              </div>
              <label className="block"><span className="label">Région / quartier</span><input name="region" className="input" /></label>
              <label className="block"><span className="label">Pays</span>
                <select name="country" defaultValue={q.country ?? ""} className="select" required><option value="">Choisir…</option>{countries.map((c) => <option key={c.code} value={c.code}>{c.nameFr}{c.sellingEnabled ? "" : " (non ouvert en ligne)"}</option>)}</select>
              </label>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="coverageVerified" className="mt-1" /> Transport vérifié pour cette adresse (obligatoire si le pays n'est pas ouvert en ligne)</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block"><span className="label">Acompte (%)</span><input name="deposit" type="number" min={1} max={99} className="input" placeholder="aucun" /></label>
                <label className="block"><span className="label">Bon de commande client</span><input name="poReference" className="input" /></label>
              </div>
              <label className="block"><span className="label">Note interne</span><textarea name="notes" rows={2} className="textarea" /></label>
              <SubmitButton>Créer la commande</SubmitButton>
            </ActionForm>
          </Panel>
        )}
        <Panel title="Suivi">
          {q.status === "converted" ? <p className="text-sm">Devis clôturé : transformé en commande.</p> : (
          <ActionForm action={quoteStatus} className="space-y-2">
            <input type="hidden" name="quoteId" value={q.id} />
            <select name="to" className="select" aria-label="Action">
              {editable && <option value="sent">Envoyer au client</option>}
              {q.status === "sent" && <><option value="accepted">Accepté par le client</option><option value="rejected">Refusé</option><option value="expired">Expiré</option><option value="revised">Réviser (nouvelle version)</option></>}
              {["accepted", "rejected", "expired"].includes(q.status) && <option value="revised">Réviser</option>}
            </select>
            <SubmitButton>Appliquer</SubmitButton>
          </ActionForm>
          )}
          <p className="mt-3 text-xs text-noir/60">Créé le {q.createdAt.toLocaleString("fr-FR")} · dernière mise à jour {q.updatedAt.toLocaleString("fr-FR")}</p>
        </Panel>
        </div>
      </div>
    </>
  );
}
