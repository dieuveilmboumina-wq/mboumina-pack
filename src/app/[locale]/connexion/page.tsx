import type { Metadata } from "next";
import { login } from "@/modules/auth/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field } from "@/components/fields";
import { L, PageHeader } from "@/components/site";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const { locale } = await params;
  const { next } = await searchParams;
  return (
    <>
      <PageHeader title="Connexion" />
      <div className="mx-auto grid max-w-4xl gap-8 px-4 py-10 md:grid-cols-2">
        <ActionForm action={login} className="card space-y-4 p-6">
          <input type="hidden" name="locale" value={locale} />
          {next && <input type="hidden" name="next" value={next} />}
          <Field name="email" label="Email" type="email" required autoComplete="email" />
          <Field name="password" label="Mot de passe" type="password" required autoComplete="current-password" />
          <SubmitButton className="btn btn-primary w-full">Se connecter</SubmitButton>
          <L locale={locale} href="/mot-de-passe-oublie" className="block text-sm underline">Mot de passe oublié ?</L>
        </ActionForm>
        <div className="card space-y-3 p-6">
          <h2 className="text-xl">Pas encore de compte ?</h2>
          <p className="text-sm text-noir/75">Suivez vos commandes, retrouvez vos devis et factures, recommandez en un clic.</p>
          <L locale={locale} href="/inscription" className="btn btn-ghost w-full">Créer un compte</L>
          <L locale={locale} href="/inscription?type=pro" className="btn btn-secondary w-full">Créer un compte professionnel</L>
        </div>
      </div>
    </>
  );
}
