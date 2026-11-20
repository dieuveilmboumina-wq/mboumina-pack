import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { pricedCart } from "@/modules/cart/service";
import { updateCartItem } from "@/modules/cart/actions";
import { L, Notice, PageHeader } from "@/components/site";
import { formatMoney } from "@/lib/money";
import { t } from "@/i18n/dict";

export const metadata: Metadata = { title: "Panier", robots: { index: false } };

export default async function CartPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ ajout?: string }> }) {
  const { locale } = await params;
  const { ajout } = await searchParams;
  const d = t(locale);
  const user = await currentUser();
  const c = await pricedCart(user?.companyId);
  return (
    <>
      <PageHeader title={d.cart.title} />
      <div className="mx-auto max-w-5xl px-4 py-10">
        {ajout && <div className="mb-6"><Notice kind="success">Produit ajouté au panier.</Notice></div>}
        {c.lines.length === 0 ? (
          <div className="card p-8">
            <p>{d.cart.empty}</p>
            <L locale={locale} href="/catalogue" className="btn btn-primary mt-4">Voir le catalogue</L>
          </div>
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="table">
                <thead><tr><th>Produit</th><th>Prix unitaire</th><th>Quantité</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {c.lines.map((l) => (
                    <tr key={l.itemId}>
                      <td>
                        <L locale={locale} href={`/produit/${l.productSlug}`} className="font-semibold text-vert hover:underline">{l.name}</L>
                        <div className="text-xs text-noir/60">{l.variantLabel} · {l.sku}{l.tierLabel ? ` · tarif ${l.tierLabel}` : ""}</div>
                        {l.sourcingMode === "stock" && l.available < l.qty && <div className="text-xs text-red-700">Stock disponible : {l.available}</div>}
                      </td>
                      <td>{l.unitPriceMinor != null ? formatMoney(l.unitPriceMinor, l.currency, locale) : <span className="badge">Sur devis</span>}</td>
                      <td>
                        <form action={updateCartItem} className="flex items-center gap-2">
                          <input type="hidden" name="itemId" value={l.itemId} />
                          <input type="hidden" name="locale" value={locale} />
                          <label className="sr-only" htmlFor={`q-${l.itemId}`}>Quantité</label>
                          <input id={`q-${l.itemId}`} name="qty" type="number" min={l.moq} defaultValue={l.qty} className="input w-24 !py-1" />
                          <button className="btn btn-ghost !px-2 !py-1 text-xs">{d.cart.update}</button>
                        </form>
                        <form action={updateCartItem} className="mt-1">
                          <input type="hidden" name="itemId" value={l.itemId} />
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="qty" value="0" />
                          <button className="text-xs text-red-700 underline">{d.cart.remove}</button>
                        </form>
                      </td>
                      <td className="text-right font-semibold">{l.lineTotalMinor != null ? formatMoney(l.lineTotalMinor, l.currency, locale) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex flex-col items-end gap-3">
              <p className="text-xl">{d.cart.subtotal} : <strong className="text-vert">{formatMoney(c.subtotalMinor, c.currency, locale)}</strong></p>
              <p className="text-sm text-noir/60">Livraison et taxes calculées à l'étape suivante selon votre adresse.</p>
              {c.mixedCurrency && <Notice kind="error">Votre panier contient des produits dans des devises différentes. Passez des commandes séparées ou demandez un devis.</Notice>}
              {c.hasQuoteItems && <Notice kind="warning">Certains articles sont « sur devis » (grande quantité ou prix négociable). <L locale={locale} href="/devis?depuis=panier" className="underline">Transformer le panier en demande de devis</L>.</Notice>}
              <div className="flex gap-3">
                <L locale={locale} href="/devis?depuis=panier" className="btn btn-ghost">Demander un devis</L>
                {!c.hasQuoteItems && !c.mixedCurrency && <L locale={locale} href="/commande" className="btn btn-primary">{d.cart.checkout}</L>}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
