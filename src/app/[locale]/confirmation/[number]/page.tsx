import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findOrderForViewer } from "@/modules/orders/queries";
import { OrderDetail } from "@/components/order-detail";
import { L, Notice, PageHeader } from "@/components/site";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Confirmation de commande", robots: { index: false } };

export default async function ConfirmationPage({ params, searchParams }: { params: Promise<{ locale: string; number: string }>; searchParams: Promise<{ t?: string }> }) {
  const { locale, number } = await params;
  const { t } = await searchParams;
  const order = await findOrderForViewer(number, { token: t });
  if (!order) notFound();
  const pendingTransfer = order.payments.some((p) => p.provider === "manual_transfer" && p.status === "pending");
  const bank = pendingTransfer ? await db.setting.findUnique({ where: { key: "payment.bank_details" } }) : null;
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  return (
    <>
      <PageHeader title="Merci pour votre commande" intro={`Référence : ${order.number}. Un récapitulatif est disponible ci-dessous et dans votre espace client.`} />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        {order.status === "paid" && <Notice kind="success">Paiement confirmé. Votre commande passe en préparation.</Notice>}
        {pendingTransfer && bank && (
          <Notice kind="warning">
            <strong>Virement en attente.</strong> Effectuez le virement en indiquant la référence <strong>{order.number}</strong>. La commande sera traitée dès réception effective des fonds.
            <pre className="mt-2 whitespace-pre-wrap font-sans">{bank.value}</pre>
          </Notice>
        )}
        {["pending_payment", "partially_paid"].includes(order.status) && !pendingTransfer && <Notice>Paiement en attente. <L locale={locale} href={`/paiement/${order.number}${q}`} className="underline">Procéder au paiement</L></Notice>}
        <OrderDetail order={order} locale={locale} />
        <div className="flex gap-3">
          <L locale={locale} href="/catalogue" className="btn btn-ghost">Continuer mes achats</L>
          <L locale={locale} href={`/suivi?numero=${order.number}${t ? `&t=${encodeURIComponent(t)}` : ""}`} className="btn btn-primary">Suivre ma commande</L>
        </div>
      </div>
    </>
  );
}
