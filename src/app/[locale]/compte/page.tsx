import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logout, updateProfile, changePassword, saveAddress, deleteAccount } from "@/modules/auth/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CountrySelect, Field } from "@/components/fields";
import { L, Notice, PageHeader } from "@/components/site";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS, QUOTE_STATUS_LABELS, CUSTOMIZATION_STATUS_LABELS } from "@/lib/constants";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

export default async function AccountPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ bienvenue?: string }> }) {
  const { locale } = await params;
  const { bienvenue } = await searchParams;
  const u = await requireUser(`/${locale}/compte`);
  const [user, orders, quotes, customs, addresses] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: u.id }, include: { company: true } }),
    db.order.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.quote.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.customizationRequest.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.address.findMany({ where: { userId: u.id } }),
  ]);
  const ongoing = orders.filter((o) => !["completed", "cancelled", "refunded", "delivered"].includes(o.status));
  const done = orders.filter((o) => !ongoing.includes(o));

  const OrderTable = ({ list }: { list: typeof orders }) => list.length === 0 ? <p className="text-sm text-noir/60">Aucune commande.</p> : (
    <table className="table"><thead><tr><th>N°</th><th>Date</th><th>Statut</th><th className="text-right">Total</th></tr></thead>
      <tbody>{list.map((o) => <tr key={o.id}><td><L locale={locale} href={`/confirmation/${o.number}`} className="font-semibold text-vert underline">{o.number}</L></td><td>{o.createdAt.toLocaleDateString("fr-FR")}</td><td>{ORDER_STATUS_LABELS[o.status]}</td><td className="text-right">{formatMoney(o.totalMinor, o.currency, locale)}</td></tr>)}</tbody>
    </table>
  );

  return (
    <>
      <PageHeader title={`Bonjour ${user.name.split(" ")[0]}`} intro={user.company ? `Compte professionnel — ${user.company.name}` : "Votre espace client"} />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        {bienvenue && <Notice kind="success">Votre compte est créé.</Notice>}
        <nav className="flex flex-wrap gap-2 text-sm">
          {[["#commandes", "Commandes"], ["#devis", "Devis"], ["#perso", "Personnalisations"], ["#adresses", "Adresses"], ["#profil", "Profil et sécurité"]].map(([h, l]) => <a key={h} href={h} className="btn btn-ghost !py-1.5">{l}</a>)}
          {user.company && <L locale={locale} href="/pro" className="btn btn-secondary !py-1.5">Espace professionnel</L>}
          <form action={logout}><button className="btn !py-1.5 text-red-800 underline">Se déconnecter</button></form>
        </nav>

        <section id="commandes" className="card space-y-4 p-6">
          <h2 className="text-2xl">Commandes en cours</h2>
          <OrderTable list={ongoing} />
          <h2 className="pt-4 text-2xl">Commandes terminées</h2>
          <OrderTable list={done} />
        </section>

        <section id="devis" className="card p-6">
          <h2 className="text-2xl">Mes devis</h2>
          {quotes.length === 0 ? <p className="mt-2 text-sm text-noir/60">Aucun devis. <L locale={locale} href="/devis" className="underline">Faire une demande</L></p> : (
            <table className="table mt-3"><thead><tr><th>N°</th><th>Date</th><th>Statut</th><th>Validité</th><th className="text-right">Montant</th></tr></thead>
              <tbody>{quotes.map((q) => <tr key={q.id}><td>{q.number}</td><td>{q.createdAt.toLocaleDateString("fr-FR")}</td><td>{QUOTE_STATUS_LABELS[q.status]}</td><td>{q.validUntil?.toLocaleDateString("fr-FR") ?? "—"}</td><td className="text-right">{q.totalMinor > 0 ? formatMoney(q.totalMinor, q.currency, locale) : "En préparation"}</td></tr>)}</tbody>
            </table>
          )}
        </section>

        <section id="perso" className="card p-6">
          <h2 className="text-2xl">Mes demandes de personnalisation</h2>
          {customs.length === 0 ? <p className="mt-2 text-sm text-noir/60">Aucune demande. <L locale={locale} href="/personnalisation" className="underline">Configurer un emballage</L></p> : (
            <table className="table mt-3"><thead><tr><th>N°</th><th>Emballage</th><th>Quantité</th><th>Statut</th></tr></thead>
              <tbody>{customs.map((c) => <tr key={c.id}><td>{c.number}</td><td>{c.packagingType}</td><td>{c.quantity}</td><td>{CUSTOMIZATION_STATUS_LABELS[c.status]}</td></tr>)}</tbody>
            </table>
          )}
        </section>

        <section id="adresses" className="card grid gap-6 p-6 md:grid-cols-2">
          <div>
            <h2 className="text-2xl">Mes adresses</h2>
            {addresses.length === 0 ? <p className="mt-2 text-sm text-noir/60">Aucune adresse enregistrée.</p> : (
              <ul className="mt-3 space-y-2 text-sm">{addresses.map((a) => <li key={a.id} className="rounded border border-beige p-3">{a.label && <strong>{a.label} </strong>}{a.isDefault && <span className="badge">Par défaut</span>}<br />{a.fullName} — {a.phone}<br />{a.line1}, {a.city} ({a.country})</li>)}</ul>
            )}
          </div>
          <ActionForm action={saveAddress} className="grid gap-3 sm:grid-cols-2">
            <h3 className="text-lg sm:col-span-2">Ajouter une adresse</h3>
            <Field name="label" label="Libellé (Boutique, Siège…)" />
            <Field name="fullName" label="Destinataire" required def={user.name} />
            <Field name="phone" label="Téléphone" required def={user.phone} />
            <Field name="line1" label="Adresse" required />
            <Field name="city" label="Ville" required />
            <CountrySelect />
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="isDefault" /> Adresse par défaut</label>
            <div className="sm:col-span-2"><SubmitButton>Ajouter</SubmitButton></div>
          </ActionForm>
        </section>

        <section id="profil" className="card grid gap-8 p-6 md:grid-cols-2">
          <ActionForm action={updateProfile} className="space-y-3">
            <h2 className="text-2xl">Profil</h2>
            <Field name="name" label="Nom" required def={user.name} />
            <Field name="phone" label="Téléphone" def={user.phone} />
            <p className="text-sm">Email : {user.email}</p>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="marketing" defaultChecked={user.marketingConsent} /> Recevoir les offres commerciales</label>
            <SubmitButton>Enregistrer</SubmitButton>
          </ActionForm>
          <ActionForm action={changePassword} className="space-y-3">
            <h2 className="text-2xl">Mot de passe</h2>
            <Field name="current" label="Mot de passe actuel" type="password" required autoComplete="current-password" />
            <Field name="password" label="Nouveau mot de passe" type="password" required autoComplete="new-password" />
            <SubmitButton>Changer</SubmitButton>
          </ActionForm>
          <ActionForm action={deleteAccount} className="space-y-3 md:col-span-2">
            <h2 className="text-xl text-red-800">Supprimer mon compte</h2>
            <p className="text-sm">Vos données personnelles sont effacées. Les factures et commandes sont conservées de façon anonymisée pour les obligations comptables.</p>
            <Field name="confirm" label="Tapez SUPPRIMER pour confirmer" />
            <SubmitButton className="btn btn-danger">Supprimer définitivement</SubmitButton>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
