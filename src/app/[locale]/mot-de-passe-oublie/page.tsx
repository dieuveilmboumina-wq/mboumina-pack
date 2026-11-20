import type { Metadata } from "next";
import { requestPasswordReset } from "@/modules/auth/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field } from "@/components/fields";
import { PageHeader } from "@/components/site";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function ForgotPage() {
  return (
    <>
      <PageHeader title="Mot de passe oublié" intro="Saisissez votre email : vous recevrez un lien pour choisir un nouveau mot de passe." />
      <div className="mx-auto max-w-md px-4 py-10">
        <ActionForm action={requestPasswordReset} className="card space-y-4 p-6">
          <Field name="email" label="Email" type="email" required autoComplete="email" />
          <SubmitButton className="btn btn-primary w-full">Envoyer le lien</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
