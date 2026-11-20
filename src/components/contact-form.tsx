import { submitContact } from "@/modules/requests/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Area, Field, Honeypot } from "@/components/fields";

export function ContactForm({ kind, subjectLabel = "Objet", bodyLabel = "Message", fileLabel }: { kind: "contact" | "partnership" | "recruitment"; subjectLabel?: string; bodyLabel?: string; fileLabel?: string }) {
  return (
    <ActionForm action={submitContact} className="card grid gap-4 p-6 sm:grid-cols-2">
      <Honeypot />
      <input type="hidden" name="kind" value={kind} />
      <Field name="name" label="Nom et prénom" required autoComplete="name" />
      <Field name="email" label="Email" type="email" required autoComplete="email" />
      <Field name="phone" label="Téléphone / WhatsApp" type="tel" autoComplete="tel" />
      <Field name="company" label="Entreprise" autoComplete="organization" />
      <Field name="country" label="Pays" />
      <Field name="subject" label={subjectLabel} required />
      <div className="sm:col-span-2"><Area name="body" label={bodyLabel} required rows={6} /></div>
      {fileLabel && (
        <div className="sm:col-span-2">
          <label className="label" htmlFor="file">{fileLabel}</label>
          <input id="file" name="file" type="file" accept="application/pdf" className="input" />
          <p className="mt-1 text-xs text-noir/60">PDF, 10 Mo maximum.</p>
        </div>
      )}
      <p className="text-xs text-noir/60 sm:col-span-2">Vos données sont utilisées uniquement pour répondre à votre demande (voir la politique de confidentialité).</p>
      <div className="sm:col-span-2"><SubmitButton>Envoyer</SubmitButton></div>
    </ActionForm>
  );
}
