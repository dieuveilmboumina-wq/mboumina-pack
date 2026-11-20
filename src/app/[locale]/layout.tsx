import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/site";
import { isLocale } from "@/i18n/dict";

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <div lang={locale}>
      <Header locale={locale} />
      <main id="contenu">{children}</main>
      <Footer locale={locale} />
    </div>
  );
}
