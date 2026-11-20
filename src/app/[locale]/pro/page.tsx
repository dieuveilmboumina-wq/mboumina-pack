import type { Metadata } from "next";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { L, Notice, PageHeader } from "@/components/site";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

export const metadata: Metadata = { title: "Espace professionnel B2B", description: "Comptes entreprise : tarifs négociés, bons de commande, validation des achats, factures professionnelles." };

export default async function ProPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ bienvenue?: string }> }) {
  const { locale } = await params;
  const { bienvenue } = await searchParams;
  const u = await currentUser();
  const company = u?.companyId ? await db.company.findUnique({ where: { id: u.companyId }, include: { users: true, prices: { include: { variant: { include: { product: true } } } } } }) : null;

  if (!company) {
    return (
      <>
        <PageHeader title="Espace professionnel" intro="Restaurants, hôtels, supermarchés, traiteurs, industriels, distributeurs : un espace dédié à vos achats." />
        <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Tarifs négociés", "Des prix adaptés à vos volumes, appliqués automatiquement à vos commandes."],
              ["Plusieurs collaborateurs", "Acheteurs et approbateurs, avec validation interne au-delà d'un montant défini."],
              ["Documents professionnels", "Bons de commande, factures, historique, commandes récurrentes."],
            ].map(([t, d]) => <div key={t} className="card p-5"><h2 className="text-xl">{t}</h2><p className="mt-2 text-sm text-noir/75">{d}</p></div>)}
          </div>
          <div className="flex flex-wrap gap-3">
            <L locale={locale} href="/inscription?type=pro" className="btn btn-primary">Créer un compte entreprise</L>
            {!u && <L locale={locale} href="/connexion?next=/fr/pro" className="btn btn-ghost">J'ai déjà un compte</L>}
            <L locale={locale} href="/devis" className="btn btn-secondary">Demander un devis volume</L>
          </div>
        </div>
      </>
    );
  }

  const orders = await db.order.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { name: true } } } });
  const statusLabel = { pending: "En cours de vérification", verified: "Vérifié", rejected: "Informations à compléter" }[company.status] ?? company.status;
  return (
    <>
      <PageHeader title={`Espace professionnel — ${company.name}`} intro={`Statut du compte : ${statusLabel}`} />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        {bienvenue && <Notice kind="success">Compte entreprise créé. Notre équipe vérifie vos informations professionnelles ; les tarifs négociés et conditions de paiement sont activés après vérification.</Notice>}
        {company.status === "pending" && !bienvenue && <Notice>Vérification de vos informations en cours.</Notice>}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-5"><h2 className="text-lg">Collaborateurs</h2><ul className="mt-2 text-sm">{company.users.map((m) => <li key={m.id}>{m.name} — {m.companyRole ?? "membre"}</li>)}</ul><p className="mt-2 text-xs text-noir/60">Pour ajouter un collaborateur, contactez votre interlocuteur commercial.</p></div>
          <div className="card p-5"><h2 className="text-lg">Conditions</h2><p className="mt-2 text-sm">Paiement : {company.paymentTermsDays ? `${company.paymentTermsDays} jours` : "comptant"}<br />Crédit : {company.creditLimit != null ? "autorisé" : "non ouvert"}<br />Validation interne : {company.approvalThreshold ? `au-delà de ${formatMoney(company.approvalThreshold, "XOF", locale)}` : "non configurée"}</p></div>
          <div className="card p-5"><h2 className="text-lg">Tarifs négociés</h2>{company.prices.length === 0 ? <p className="mt-2 text-sm text-noir/60">Aucun tarif négocié pour le moment.</p> : <ul className="mt-2 text-sm">{company.prices.map((p) => <li key={p.id}>{p.variant.product.nameFr} — {formatMoney(p.unitPriceMinor, p.currency, locale)}</li>)}</ul>}</div>
        </div>
        <section className="card p-6">
          <h2 className="text-2xl">Commandes de l'entreprise</h2>
          {orders.length === 0 ? <p className="mt-2 text-sm text-noir/60">Aucune commande.</p> : (
            <table className="table mt-3"><thead><tr><th>N°</th><th>Date</th><th>Acheteur</th><th>Réf. BC</th><th>Statut</th><th className="text-right">Total</th></tr></thead>
              <tbody>{orders.map((o) => <tr key={o.id}><td><L locale={locale} href={`/confirmation/${o.number}`} className="underline">{o.number}</L></td><td>{o.createdAt.toLocaleDateString("fr-FR")}</td><td>{o.user?.name ?? "—"}</td><td>{o.poReference ?? "—"}</td><td>{ORDER_STATUS_LABELS[o.status]}</td><td className="text-right">{formatMoney(o.totalMinor, o.currency, locale)}</td></tr>)}</tbody>
            </table>
          )}
        </section>
        <div className="flex gap-3"><L locale={locale} href="/catalogue" className="btn btn-primary">Commander</L><L locale={locale} href="/devis?kind=b2b" className="btn btn-ghost">Demander un devis</L></div>
      </div>
    </>
  );
}
