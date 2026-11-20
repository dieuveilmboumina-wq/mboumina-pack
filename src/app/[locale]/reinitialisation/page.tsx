import type { Metadata } from "next";
import { resetPassword } from "@/modules/auth/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field } from "@/components/fields";
import { L, PageHeader } from "@/components/site";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default async function ResetPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ jeton?: string }> }) {
  const { locale } = await params;
  const { jeton } = await searchParams;
  return (
    <>
      <PageHeader title="Nouveau mot de passe" />
      <div className="mx-auto max-w-md px-4 py-10">
        <ActionForm action={resetPassword} className="card space-y-4 p-6">
          <input type="hidden" name="token" value={jeton ?? ""} />
          <Field name="password" label="Nouveau mot de passe (10 caractères min.)" type="password" required autoComplete="new-password" />
          <SubmitButton className="btn btn-primary w-full">Enregistrer</SubmitButton>
          <L locale={locale} href="/connexion" className="block text-sm underline">Aller à la connexion</L>
        </ActionForm>
      </div>
    </>
  );
}
