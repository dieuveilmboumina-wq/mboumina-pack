import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ContactForm } from "@/components/contact-form";
import { L, PageHeader } from "@/components/site";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const keys = ["contact.phone", "contact.whatsapp", "contact.email", "contact.address", "contact.hours"];
  const rows = await db.setting.findMany({ where: { key: { in: keys } } });
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const wa = s["contact.whatsapp"]?.replace(/\D/g, "");
  return (
    <>
      <PageHeader title="Contact" intro="Une question sur un produit, une commande ou un projet ? Écrivez-nous." />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_320px]">
        <ContactForm kind="contact" />
        <aside className="card h-fit space-y-3 p-6 text-sm">
          <h2 className="text-xl">Nous joindre</h2>
          {s["contact.phone"] && <p>Téléphone : <a className="underline" href={`tel:${s["contact.phone"]}`}>{s["contact.phone"]}</a></p>}
          {wa && <p><a className="btn btn-primary w-full" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">Écrire sur WhatsApp</a></p>}
          {s["contact.email"] && <p>Email : <a className="underline" href={`mailto:${s["contact.email"]}`}>{s["contact.email"]}</a></p>}
          {s["contact.address"] && <p className="whitespace-pre-line">{s["contact.address"]}</p>}
          {s["contact.hours"] && <p>Horaires : {s["contact.hours"]}</p>}
          {Object.keys(s).length === 0 && <p className="text-noir/60">Le formulaire ci-contre est le moyen le plus rapide de nous joindre.</p>}
          <hr className="border-beige" />
          <p><L locale={locale} href="/devis" className="underline">Demande de devis</L> · <L locale={locale} href="/faq" className="underline">FAQ</L></p>
        </aside>
      </div>
    </>
  );
}
