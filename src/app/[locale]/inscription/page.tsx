import type { Metadata } from "next";
import { register } from "@/modules/auth/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CountrySelect, Field, Honeypot } from "@/components/fields";
import { L, PageHeader } from "@/components/site";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

export default async function RegisterPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ type?: string }> }) {
  const { locale } = await params;
  const { type } = await searchParams;
  const pro = type === "pro";
  return (
    <>
      <PageHeader title={pro ? "Créer un compte professionnel" : "Créer un compte"} intro={pro ? "Tarifs négociés, bons de commande, validation interne des achats, plusieurs collaborateurs. Les informations de l'entreprise sont vérifiées par notre équipe." : undefined} />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <ActionForm action={register} className="card grid gap-4 p-6 sm:grid-cols-2">
          <Honeypot />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="accountType" value={pro ? "company" : "individual"} />
          <Field name="name" label="Nom et prénom" required autoComplete="name" />
          <Field name="email" label="Email" type="email" required autoComplete="email" />
          <Field name="phone" label="Téléphone" type="tel" autoComplete="tel" />
          <Field name="password" label="Mot de passe (10 caractères min., lettres et chiffres)" type="password" required autoComplete="new-password" />
          {pro && (
            <>
              <Field name="companyName" label="Raison sociale" required autoComplete="organization" />
              <Field name="legalId" label="NINEA / RCCM / n° d'immatriculation" />
              <CountrySelect />
              <div>
                <label className="label" htmlFor="sector">Secteur</label>
                <select id="sector" name="sector" className="select">
                  <option value="restaurant">Restaurant</option><option value="hotel">Hôtel</option><option value="supermarket">Supermarché</option>
                  <option value="caterer">Traiteur</option><option value="bakery">Boulangerie / pâtisserie</option><option value="industry">Industrie</option>
                  <option value="distributor">Distributeur / revendeur</option><option value="other">Autre</option>
                </select>
              </div>
            </>
          )}
          <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="marketing" className="mt-1" /> J'accepte de recevoir les offres de MBOUMINA PACK (facultatif).</label>
          <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="acceptTerms" required className="mt-1" /> <span>J'accepte les <L locale={locale} href="/cgv" className="underline">CGV</L> et la <L locale={locale} href="/confidentialite" className="underline">politique de confidentialité</L>.</span></label>
          <div className="sm:col-span-2"><SubmitButton className="btn btn-primary w-full">Créer mon compte</SubmitButton></div>
        </ActionForm>
      </div>
    </>
  );
}
