import type { Metadata } from "next";
import { submitSampleRequest } from "@/modules/requests/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Area, CountrySelect, Field, Honeypot } from "@/components/fields";
import { PageHeader } from "@/components/site";

export const metadata: Metadata = { title: "Demande d'échantillons" };

export default function SamplesPage() {
  return (
    <>
      <PageHeader title="Demande d'échantillons" intro="Testez nos emballages avant de commander en volume. Les échantillons disponibles et les conditions d'envoi vous sont confirmés par notre équipe." />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ActionForm action={submitSampleRequest} className="card grid gap-4 p-6 sm:grid-cols-2">
          <Honeypot />
          <Field name="contactName" label="Nom et prénom" required autoComplete="name" />
          <Field name="email" label="Email" type="email" required autoComplete="email" />
          <Field name="phone" label="Téléphone" type="tel" />
          <Field name="companyName" label="Entreprise" />
          <CountrySelect />
          <Field name="city" label="Ville" required />
          <div className="sm:col-span-2"><Area name="products" label="Produits souhaités (références ou description)" required rows={3} /></div>
          <div className="sm:col-span-2"><Area name="message" label="Votre activité et vos volumes prévus" rows={3} /></div>
          <div className="sm:col-span-2"><SubmitButton>Envoyer la demande</SubmitButton></div>
        </ActionForm>
      </div>
    </>
  );
}
