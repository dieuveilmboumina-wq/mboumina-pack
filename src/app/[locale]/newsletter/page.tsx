import type { Metadata } from "next";
import { L, Notice, PageHeader } from "@/components/site";

export const metadata: Metadata = { title: "Newsletter", robots: { index: false } };

export default async function NewsletterPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ statut?: string }> }) {
  const { locale } = await params;
  const { statut } = await searchParams;
  return (
    <>
      <PageHeader title="Newsletter" />
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        {statut === "ok" ? <Notice kind="success">Inscription enregistrée. Vous pourrez vous désinscrire à tout moment.</Notice>
          : <Notice kind="error">Inscription impossible : vérifiez votre email et cochez la case de consentement.</Notice>}
        <L locale={locale} href="/" className="btn btn-ghost">Retour à l'accueil</L>
      </div>
    </>
  );
}
