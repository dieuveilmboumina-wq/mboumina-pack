import type { Metadata } from "next";
import Image from "next/image";
import { L, PageHeader } from "@/components/site";

export const metadata: Metadata = { title: "Notre fondateur — Dieuveil Flavien MBOUMINA BAKADISSA" };

export default async function FounderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PageHeader title="Notre fondateur" />
      <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-12 md:grid-cols-[360px_1fr]">
        <figure className="card overflow-hidden">
          <Image src="/images/founder/dieuveil-mboumina.jpg" alt="Portrait de Dieuveil Flavien MBOUMINA BAKADISSA, fondateur de MBOUMINA PACK" width={720} height={1076} priority className="h-auto w-full" />
          <figcaption className="p-4 text-center">
            <strong className="block text-vert">Dieuveil Flavien MBOUMINA BAKADISSA</strong>
            <span className="text-sm text-noir/70">Fondateur de MBOUMINA PACK</span>
          </figcaption>
        </figure>
        <div className="prose-mp">
          <h2 className="text-3xl">Une ambition : rendre l'emballage alimentaire accessible et fiable</h2>
          <p>Dieuveil Flavien MBOUMINA BAKADISSA a fondé MBOUMINA PACK avec une conviction : les professionnels de l'alimentation — du restaurant de quartier à l'industriel — méritent un accès simple à des emballages adaptés, à des prix clairs et avec un service sur lequel ils peuvent compter.</p>
          <p>MBOUMINA PACK est pensée comme une entreprise de distribution : sélectionner les bons produits auprès des fournisseurs, les rendre disponibles au détail comme en gros, et coordonner la personnalisation avec des partenaires spécialisés.</p>
          <h3 className="mt-6 text-2xl">La vision</h3>
          <p>Faire de MBOUMINA PACK une marque reconnue dans la commercialisation et la distribution de solutions d'emballage alimentaire en Afrique et à l'international.</p>
          <blockquote className="mt-6 border-l-4 border-vert2 bg-white p-5 text-lg italic text-vert">« Votre partenaire en solutions d'emballage alimentaire. »</blockquote>
          <div className="mt-8 flex flex-wrap gap-3">
            <L locale={locale} href="/a-propos" className="btn btn-primary">Découvrir MBOUMINA PACK</L>
            <L locale={locale} href="/contact" className="btn btn-ghost">Nous contacter</L>
          </div>
        </div>
      </div>
    </>
  );
}
