import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { decimalsOf, formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_TRANSITIONS } from "@/lib/constants";
import { AdminTitle, Panel } from "@/components/admin-ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { adminOrderStatus, reconcileTransfer, createShipment, updateShipment } from "@/modules/admin/sales-actions";
import { orderAccessToken } from "@/modules/orders/queries";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireStaff("orders.view");
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, include: { lines: true, events: { orderBy: { createdAt: "asc" } }, payments: true, shipments: { include: { carrier: true } }, invoices: true, company: true, user: true } });
  if (!o) notFound();
  const carriers = await db.carrier.findMany({ where: { active: true } });
  const [linkedPOs, sourceQuote] = await Promise.all([
    db.purchaseOrder.findMany({ where: { linkedOrderId: o.id } }),
    db.quote.findFirst({ where: { orderId: o.id }, select: { id: true, number: true } }),
  ]);
  const addr = JSON.parse(o.shippingAddress) as Record<string, string>;
  const showCost = can(u.role, "purchase_cost.view");
  const cost = o.lines.every((l) => l.unitCostMinor != null) ? o.lines.reduce((s, l) => s + l.qty * l.unitCostMinor!, 0) : null;
  const net = o.subtotalMinor - o.discountMinor;
  const due = o.totalMinor - o.paidMinor;
  // Les statuts de paiement ne sont proposés que s'ils sont justifiés par des paiements vérifiés.
  const nextStatuses = ORDER_TRANSITIONS[o.status].filter((s) => (s === "paid" ? o.paidMinor >= o.totalMinor : s === "partially_paid" ? o.paidMinor > 0 : true));

  return (
    <>
      <AdminTitle title={`Commande ${o.number}`}><span className="badge self-center !text-sm">{ORDER_STATUS_LABELS[o.status]}</span></AdminTitle>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel title="Articles">
            <table className="table">
              <thead><tr><th>Article</th><th>Qté</th><th>P.U.</th><th className="text-right">Total</th>{showCost && <th className="text-right">Coût</th>}</tr></thead>
              <tbody>{o.lines.map((l) => <tr key={l.id}><td>{l.name}<div className="text-xs">{l.sku}</div></td><td>{l.qty}</td><td>{formatMoney(l.unitPriceMinor, o.currency)}</td><td className="text-right">{formatMoney(l.lineTotalMinor, o.currency)}</td>{showCost && <td className="text-right">{l.unitCostMinor != null ? formatMoney(l.unitCostMinor * l.qty, o.currency) : "?"}</td>}</tr>)}</tbody>
            </table>
            <dl className="mt-3 grid grid-cols-2 gap-1 text-sm">
              <dt>Sous-total</dt><dd className="text-right">{formatMoney(o.subtotalMinor, o.currency)}</dd>
              <dt>Remise {o.couponCode && `(${o.couponCode})`}</dt><dd className="text-right">− {formatMoney(o.discountMinor, o.currency)}</dd>
              <dt>Livraison</dt><dd className="text-right">{formatMoney(o.shippingMinor, o.currency)}</dd>
              <dt>Taxes</dt><dd className="text-right">{formatMoney(o.taxMinor, o.currency)}</dd>
              <dt className="font-bold">Total</dt><dd className="text-right font-bold">{formatMoney(o.totalMinor, o.currency)}</dd>
              <dt>Payé</dt><dd className="text-right">{formatMoney(o.paidMinor, o.currency)}</dd>
              {showCost && <><dt>Marge brute</dt><dd className="text-right">{cost == null ? "coûts incomplets" : `${formatMoney(net - cost, o.currency)} (${net ? ((100 * (net - cost)) / net).toFixed(1) : 0} %)`}</dd></>}
            </dl>
          </Panel>

          <Panel title="Paiements">
            {o.payments.length === 0 ? <p className="text-sm text-noir/60">Aucun paiement.</p> : (
              <table className="table text-sm"><thead><tr><th>Date</th><th>Moyen</th><th>Type</th><th>Montant</th><th>Statut</th><th>Vérification</th></tr></thead>
                <tbody>{o.payments.map((p) => <tr key={p.id}><td>{p.createdAt.toLocaleString("fr-FR")}</td><td>{p.provider}</td><td>{p.kind}</td><td>{formatMoney(p.amountMinor, p.currency)}</td><td>{p.status}</td><td>{p.verifiedAt ? `${p.verifiedAt.toLocaleString("fr-FR")} (${p.verifiedBy === "test-simulator" ? "simulateur de test" : p.verifiedBy})` : p.failureReason ?? "—"}</td></tr>)}</tbody>
              </table>
            )}
            {due > 0 && can(u.role, "payments.reconcile") && ["pending_payment", "partially_paid"].includes(o.status) && (
              <ActionForm action={reconcileTransfer} className="mt-4 grid gap-2 sm:grid-cols-3">
                <input type="hidden" name="orderId" value={o.id} />
                <input name="amount" className="input" defaultValue={(due / 10 ** decimalsOf(o.currency)).toFixed(decimalsOf(o.currency))} aria-label="Montant reçu" />
                <input name="bankRef" className="input" placeholder="Référence sur le relevé bancaire" required aria-label="Référence bancaire" />
                <SubmitButton>Rapprocher le virement reçu</SubmitButton>
                <p className="text-xs text-noir/60 sm:col-span-3">À n'utiliser qu'après constat des fonds sur le relevé bancaire. Jamais sur la base d'une capture d'écran du client.</p>
              </ActionForm>
            )}
            {o.invoices.length > 0 && <p className="mt-3 text-sm">Factures : {o.invoices.map((i) => <a key={i.id} href={`/api/invoices/${i.number}`} className="mr-2 underline" target="_blank">{i.number}</a>)}</p>}
          </Panel>

          <Panel title="Expéditions">
            {o.shipments.map((s) => (
              <form key={s.id} action={updateShipment} className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="id" value={s.id} />
                <span>{s.carrier?.name ?? "Transporteur ?"} — {s.trackingNumber ?? "sans n° de suivi"} · {s.packages} colis</span>
                <select name="status" defaultValue={s.status} className="select !w-auto !py-1" aria-label="Statut colis">
                  {["preparing", "shipped", "in_transit", "delayed", "delivered", "damaged", "returned"].map((x) => <option key={x}>{x}</option>)}
                </select>
                <input name="recipient" className="input !w-40 !py-1" placeholder="Réceptionnaire" aria-label="Réceptionnaire" />
                {can(u.role, "logistics.edit") && <button className="btn btn-ghost !py-1">Mettre à jour</button>}
              </form>
            ))}
            {can(u.role, "logistics.edit") && (
              <ActionForm action={createShipment} className="mt-3 grid gap-2 sm:grid-cols-4">
                <input type="hidden" name="orderId" value={o.id} />
                <select name="carrierId" className="select" aria-label="Transporteur"><option value="">Transporteur…</option>{carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                <input name="trackingNumber" className="input" placeholder="N° de suivi" aria-label="N° de suivi" />
                <input name="packages" type="number" min={1} defaultValue={1} className="input" aria-label="Nombre de colis" />
                <SubmitButton>Créer l'expédition</SubmitButton>
              </ActionForm>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Changer le statut">
            {nextStatuses.length === 0 ? <p className="text-sm">{ORDER_TRANSITIONS[o.status].length === 0 ? "Statut final." : "En attente d'un paiement vérifié."}</p> : (
              <ActionForm action={adminOrderStatus} className="space-y-2">
                <input type="hidden" name="orderId" value={o.id} />
                <select name="to" className="select" aria-label="Nouveau statut">{nextStatuses.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}</select>
                <input name="note" className="input" placeholder="Note (visible par le client)" aria-label="Note" />
                <SubmitButton>Appliquer</SubmitButton>
                <p className="text-xs text-noir/60">Annulation : libère le stock réservé. Expédition : sortie de stock définitive.</p>
              </ActionForm>
            )}
          </Panel>
          {sourceQuote && <Panel title="Origine"><p className="text-sm">Créée depuis le devis <a className="underline" href={`/admin/devis/${sourceQuote.id}`}>{sourceQuote.number}</a>.</p></Panel>}
          {["pending_payment", "partially_paid"].includes(o.status) && (
            <Panel title="Lien de paiement client">
              <p className="break-all rounded bg-beige/40 p-2 text-xs">{`${process.env.APP_URL ?? "http://localhost:3000"}/fr/paiement/${o.number}?t=${orderAccessToken(o.number)}`}</p>
              <p className="mt-1 text-xs text-noir/60">Lien personnel et signé : à transmettre uniquement au client de cette commande.</p>
            </Panel>
          )}
          <Panel title="Client">
            <p className="text-sm">{o.user?.name ?? addr.fullName}<br />{o.email}<br />{addr.phone}{o.company && <><br />Entreprise : {o.company.name}</>}{o.poReference && <><br />BC : {o.poReference}</>}</p>
            <p className="mt-2 text-sm">Livraison : {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city} ({addr.country})<br />{o.shippingService}</p>
            {o.notes && <p className="mt-2 rounded bg-beige/40 p-2 text-sm">{o.notes}</p>}
          </Panel>
          {linkedPOs.length > 0 && <Panel title="Achats partenaires liés"><ul className="text-sm">{linkedPOs.map((p) => <li key={p.id}><a className="underline" href={`/admin/achats/${p.id}`}>{p.number}</a> — {p.status}</li>)}</ul></Panel>}
          <Panel title="Historique">
            <ol className="space-y-1 text-xs">{o.events.map((e) => <li key={e.id}><strong>{ORDER_STATUS_LABELS[e.status] ?? e.status}</strong> — {e.createdAt.toLocaleString("fr-FR")}{e.note && ` · ${e.note}`}{!e.visibleToCustomer && " (interne)"}</li>)}</ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
