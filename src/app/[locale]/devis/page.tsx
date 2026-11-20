import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { submitQuoteRequest } from "@/modules/requests/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Area, CountrySelect, Field, Honeypot } from "@/components/fields";
import { PageHeader } from "@/components/site";

export const metadata: Metadata = { title: "Demande de devis", description: "Demandez un devis pour vos emballages alimentaires : volumes, personnalisation, livraison." };

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ produit?: string; depuis?: string }> }) {
  const sp = await searchParams;
  const user = await currentUser();
  return (
    <>
      <PageHeader title="Demande de devis" intro="Volumes importants, prix négocié, livraison vers une zone non listée, personnalisation : décrivez votre besoin, nous vous répondons avec une proposition chiffrée." />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ActionForm action={submitQuoteRequest} className="card grid gap-4 p-6 sm:grid-cols-2">
          <Honeypot />
          {sp.produit && <input type="hidden" name="product" value={sp.produit} />}
          <Field name="contactName" label="Nom et prénom" required def={user?.name} autoComplete="name" />
          <Field name="email" label="Email" type="email" required def={user?.email} autoComplete="email" />
          <Field name="phone" label="Téléphone / WhatsApp" type="tel" autoComplete="tel" />
          <Field name="companyName" label="Entreprise" autoComplete="organization" />
          <CountrySelect />
          <div>
            <label className="label" htmlFor="kind">Type de demande</label>
            <select id="kind" name="kind" className="select" defaultValue="standard">
              <option value="standard">Produits du catalogue</option>
              <option value="b2b">Volume professionnel / contrat</option>
              <option value="custom">Emballage personnalisé</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Area name="request" label={sp.produit ? `Votre besoin pour le produit ${sp.produit} (quantités, fréquence, délai souhaité)` : "Votre besoin (produits, quantités, fréquence, délai souhaité, adresse de livraison)"} required rows={6} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="includeCart" defaultChecked={sp.depuis === "panier"} /> Joindre le contenu de mon panier à la demande</label>
          <div className="sm:col-span-2"><SubmitButton>Envoyer ma demande</SubmitButton></div>
        </ActionForm>
      </div>
    </>
  );
}
