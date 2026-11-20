import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/site";
import { isLocale } from "@/i18n/dict";
import { db } from "@/lib/db";

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  // Bouton WhatsApp : affiché uniquement si un numéro est renseigné dans Paramètres (jamais inventé).
  const wa = (await db.setting.findUnique({ where: { key: "contact.whatsapp" } }))?.value?.replace(/[^0-9]/g, "");
  return (
    <div lang={locale}>
      <Header locale={locale} />
      <main id="contenu">{children}</main>
      <Footer locale={locale} />
      {wa && wa.length >= 8 && (
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="wa-float" aria-label="Écrire à MBOUMINA PACK sur WhatsApp">
          <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden>
            <path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3Zm0 23.4c-2.1 0-4.1-.6-5.9-1.6l-.4-.3-3.8 1.2 1.2-3.7-.3-.4a10.4 10.4 0 0 1-1.7-5.7C5.1 10 10 5.2 16 5.2s10.9 4.8 10.9 10.6S22 26.4 16 26.4Zm6-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.8 5 2.2.9 3 .9 4.1.8.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z" />
          </svg>
        </a>
      )}
    </div>
  );
}
