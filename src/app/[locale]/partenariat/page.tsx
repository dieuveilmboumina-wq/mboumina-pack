import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { PageHeader } from "@/components/site";

export const metadata: Metadata = { title: "Demande de partenariat" };

export default function PartnershipPage() {
  return (
    <>
      <PageHeader title="Demande de partenariat" intro="Fabricants, imprimeurs, transporteurs, distributeurs et revendeurs : construisons ensemble la distribution d'emballages alimentaires." />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ContactForm kind="partnership" subjectLabel="Type de partenariat (fournisseur, imprimeur, transporteur, distributeur…)" bodyLabel="Présentez votre activité, vos produits ou services et vos zones couvertes" fileLabel="Présentation ou catalogue (facultatif)" />
      </div>
    </>
  );
}
