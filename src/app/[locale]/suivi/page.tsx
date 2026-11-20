import type { Metadata } from "next";
import { findOrderForViewer } from "@/modules/orders/queries";
import { trackOrder } from "@/modules/orders/actions";
import { OrderDetail } from "@/components/order-detail";
import { Notice, PageHeader } from "@/components/site";

export const metadata: Metadata = { title: "Suivi de livraison", robots: { index: false } };

export default async function TrackingPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ numero?: string; t?: string; introuvable?: string }> }) {
  const { locale } = await params;
  const { numero, t, introuvable } = await searchParams;
  // Accès par lien signé (t) ou session connectée ; l'email n'est jamais placé dans l'URL.
  const order = numero ? await findOrderForViewer(numero.trim().toUpperCase(), { token: t }) : null;
  return (
    <>
      <PageHeader title="Suivi de livraison" intro="Saisissez votre numéro de commande et l'email utilisé lors de la commande." />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <form action={trackOrder} className="card grid gap-4 p-6 sm:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="locale" value={locale} />
          <div><label className="label" htmlFor="numero">Numéro de commande</label><input id="numero" name="numero" defaultValue={numero} className="input" placeholder="CMD-2026-000001" required /></div>
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" className="input" autoComplete="email" /></div>
          <button className="btn btn-primary self-end">Rechercher</button>
        </form>
        {(introuvable || (numero && !order)) && <Notice kind="error">Aucune commande trouvée avec ces informations.</Notice>}
        {order && <OrderDetail order={order} locale={locale} />}
      </div>
    </>
  );
}
