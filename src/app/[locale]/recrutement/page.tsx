import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ContactForm } from "@/components/contact-form";
import { PageHeader } from "@/components/site";

export const metadata: Metadata = { title: "Recrutement" };

export default async function JobsPage() {
  const jobs = await db.setting.findUnique({ where: { key: "jobs.open_positions" } });
  return (
    <>
      <PageHeader title="Recrutement" intro="Rejoignez MBOUMINA PACK : commerce, logistique, gestion des stocks, service client." />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <section className="card p-6">
          <h2 className="text-xl">Postes ouverts</h2>
          {jobs?.value ? <p className="mt-2 whitespace-pre-line">{jobs.value}</p> : <p className="mt-2 text-noir/70">Aucun poste ouvert actuellement. Vous pouvez nous adresser une candidature spontanée.</p>}
        </section>
        <ContactForm kind="recruitment" subjectLabel="Poste visé" bodyLabel="Votre parcours et votre motivation" fileLabel="CV (PDF)" />
      </div>
    </>
  );
}
