import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findOrderForViewer } from "@/modules/orders/queries";
import { startPayment } from "@/modules/orders/actions";
import { availableMethods } from "@/modules/payments/providers";
import { L, Notice, PageHeader } from "@/components/site";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

export const metadata: Metadata = { title: "Paiement", robots: { index: false } };

export default async function PaymentPage({ params, searchParams }: { params: Promise<{ locale: string; number: string }>; searchParams: Promise<{ t?: string; erreur?: string }> }) {
  const { locale, number } = await params;
  const { t, erreur } = await searchParams;
  const order = await findOrderForViewer(number, { token: t });
  if (!order) notFound();
  const methods = await availableMethods();
  const due = order.totalMinor - order.paidMinor;
  const payable = ["pending_payment", "partially_paid"].includes(order.status);

  return (
    <>
      <PageHeader title={`Paiement — commande ${order.number}`} />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        {erreur && <Notice kind="error">Le paiement n'a pas pu être initié auprès du prestataire. Aucun montant n'a été prélevé. Choisissez un autre moyen ou réessayez plus tard.</Notice>}
        <div className="card p-6">
          <p>Statut : <strong>{ORDER_STATUS_LABELS[order.status]}</strong></p>
          <dl className="mt-3 grid grid-cols-2 gap-1 text-sm">
            <dt>Sous-total</dt><dd className="text-right">{formatMoney(order.subtotalMinor, order.currency, locale)}</dd>
            {order.discountMinor > 0 && (<><dt>Remise</dt><dd className="text-right">− {formatMoney(order.discountMinor, order.currency, locale)}</dd></>)}
            <dt>Livraison</dt><dd className="text-right">{formatMoney(order.shippingMinor, order.currency, locale)}</dd>
            <dt>Taxes</dt><dd className="text-right">{formatMoney(order.taxMinor, order.currency, locale)}</dd>
            <dt className="font-bold">Total</dt><dd className="text-right font-bold">{formatMoney(order.totalMinor, order.currency, locale)}</dd>
            {order.paidMinor > 0 && (<><dt>Déjà payé</dt><dd className="text-right">{formatMoney(order.paidMinor, order.currency, locale)}</dd></>)}
            <dt className="font-bold text-vert">Reste à payer</dt><dd className="text-right font-bold text-vert">{formatMoney(due, order.currency, locale)}</dd>
          </dl>
        </div>

        {order.status === "pending_approval" && <Notice>Cette commande doit être validée par un approbateur de votre entreprise avant paiement.</Notice>}

        {payable && (methods.length === 0 ? (
          <Notice kind="warning">Le paiement en ligne n'est pas encore ouvert. Notre équipe vous contacte pour finaliser le règlement de la commande {order.number}.</Notice>
        ) : (
          <form action={startPayment} className="card space-y-3 p-6">
            <input type="hidden" name="number" value={order.number} />
            <input type="hidden" name="locale" value={locale} />
            {t && <input type="hidden" name="token" value={t} />}
            <h2 className="text-xl">Moyen de paiement</h2>
            {methods.map((m, i) => (
              <label key={m.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-beige p-3 has-[:checked]:border-vert2">
                <input type="radio" name="method" value={m.id} defaultChecked={i === 0} required className="mt-1" />
                <span><strong>{m.label}</strong><span className="block text-sm text-noir/70">{m.description}</span></span>
              </label>
            ))}
            {order.depositPercent && order.paidMinor === 0 && (
              <fieldset className="flex gap-4 text-sm">
                <legend className="label">Montant</legend>
                <label className="flex items-center gap-2"><input type="radio" name="kind" value="full" defaultChecked /> Paiement intégral</label>
                <label className="flex items-center gap-2"><input type="radio" name="kind" value="deposit" /> Acompte de {order.depositPercent} %</label>
              </fieldset>
            )}
            <button className="btn btn-primary w-full">Payer {formatMoney(due, order.currency, locale)}</button>
            <p className="text-xs text-noir/60">La commande est confirmée uniquement après validation du paiement par le prestataire ou réception effective des fonds.</p>
          </form>
        ))}
        <L locale={locale} href={`/confirmation/${order.number}${t ? `?t=${encodeURIComponent(t)}` : ""}`} className="text-sm underline">Voir le détail de la commande</L>
      </div>
    </>
  );
}
