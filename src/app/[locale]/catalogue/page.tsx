import type { Metadata } from "next";
import { CatalogView, FLAG_TITLES } from "@/components/catalog-view";
import type { CatalogFilter } from "@/modules/catalog/service";

export const metadata: Metadata = { title: "Catalogue — tous les produits" };
function parse(sp: Record<string, string | string[] | undefined>): CatalogFilter {
  const s = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const flag = s("flag");
  const sort = s("sort");
  return {
    q: s("q"), category: s("category"),
    flag: flag && flag in FLAG_TITLES ? (flag as CatalogFilter["flag"]) : undefined,
    sort: sort && ["recent", "name", "price_asc", "price_desc"].includes(sort) ? (sort as CatalogFilter["sort"]) : undefined,
  };
}

export default async function CataloguePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const filter = parse(await searchParams);
  const title = filter.q ? `Résultats pour « ${filter.q} »` : filter.flag ? FLAG_TITLES[filter.flag] : "Tous les produits";
  return <CatalogView locale={locale} filter={filter} title={title} intro="Emballages alimentaires sélectionnés auprès de nos fournisseurs, au détail et en gros." />;
}
