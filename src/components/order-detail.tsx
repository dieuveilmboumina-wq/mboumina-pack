import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { findOrderForViewer } from "@/modules/orders/queries";

type O = NonNullable<Awaited<ReturnType<typeof findOrderForViewer>>>;

export function OrderDetail({ order, locale }: { order: O; locale: string }) {
  const addr = JSON.parse(order.shippingAddress) as Record<string, string>;
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl">Commande {order.number}</h2>
          <span className="badge !text-sm">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
        </div>
        <p className="mt-1 text-sm text-noir/60">Passée le {order.createdAt.toLocaleDateString("fr-FR")} · {order.shippingService}</p>
        <table className="table mt-4">
          <thead><tr><th>Article</th><th>Qté</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {order.lines.map((l) => <tr key={l.id}><td>{l.name}<div className="text-xs text-noir/60">{l.sku}</div></td><td>{l.qty}</td><td className="text-right">{formatMoney(l.lineTotalMinor, order.currency, locale)}</td></tr>)}
          </tbody>
          <tfoot>
            <tr><td colSpan={2}>Livraison</td><td className="text-right">{formatMoney(order.shippingMinor, order.currency, locale)}</td></tr>
            {order.discountMinor > 0 && <tr><td colSpan={2}>Remise</td><td className="text-right">− {formatMoney(order.discountMinor, order.currency, locale)}</td></tr>}
            <tr><td colSpan={2}>Taxes</td><td className="text-right">{formatMoney(order.taxMinor, order.currency, locale)}</td></tr>
            <tr><td colSpan={2}><strong>Total</strong></td><td className="text-right"><strong>{formatMoney(order.totalMinor, order.currency, locale)}</strong></td></tr>
            <tr><td colSpan={2}>Payé</td><td className="text-right">{formatMoney(order.paidMinor, order.currency, locale)}</td></tr>
          </tfoot>
        </table>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6 text-sm">
          <h3 className="text-lg">Livraison</h3>
          <p className="mt-2">{addr.fullName}<br />{addr.line1}{addr.line2 ? <><br />{addr.line2}</> : null}<br />{addr.city} {addr.postalCode} — {addr.country}<br />{addr.phone}</p>
          {order.shipments.map((s) => (
            <p key={s.id} className="mt-3">Colis : {s.carrier?.name ?? "Transporteur"} — {s.trackingNumber ?? "n° de suivi à venir"} ({s.status})
              {s.carrier?.trackingUrlTemplate && s.trackingNumber && <> · <a className="underline" target="_blank" rel="noopener noreferrer" href={s.carrier.trackingUrlTemplate.replace("{tracking}", encodeURIComponent(s.trackingNumber))}>suivre</a></>}
            </p>
          ))}
        </div>
        <div className="card p-6 text-sm">
          <h3 className="text-lg">Historique</h3>
          <ol className="mt-2 space-y-2 border-l-2 border-beige pl-4">
            {order.events.map((ev) => <li key={ev.id}><strong>{ORDER_STATUS_LABELS[ev.status] ?? ev.status}</strong> — {ev.createdAt.toLocaleString("fr-FR")}{ev.note ? <div className="text-noir/70">{ev.note}</div> : null}</li>)}
          </ol>
          {order.invoices.length > 0 && <p className="mt-3">Facture(s) : {order.invoices.map((i) => <a key={i.id} className="mr-2 underline" href={`/api/invoices/${i.number}`}>{i.number}</a>)}</p>}
        </div>
      </div>
    </div>
  );
}
