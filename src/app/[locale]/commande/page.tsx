import type { Metadata } from "next";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { pricedCart } from "@/modules/cart/service";
import { shippingOptions, sellingCountries } from "@/modules/logistics/service";
import { cartWeight } from "@/modules/orders/queries";
import { placeOrder } from "@/modules/orders/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { L, Notice, PageHeader } from "@/components/site";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Commande", robots: { index: false } };

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ pays?: string; ville?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = await currentUser();
  const cart = await pricedCart(user?.companyId);
  const countries = await sellingCountries();

  if (cart.lines.length === 0) {
    return (<><PageHeader title="Commande" /><div className="mx-auto max-w-3xl px-4 py-10"><Notice>Votre panier est vide. <L locale={locale} href="/catalogue" className="underline">Voir le catalogue</L></Notice></div></>);
  }
  if (countries.length === 0) {
    return (
      <>
        <PageHeader title="Commande" />
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
          <Notice kind="warning">La commande en ligne avec livraison n'est pas encore ouverte : les zones de livraison sont en cours de configuration avec nos transporteurs. Transmettez votre panier en demande de devis : notre équipe vous propose les conditions de livraison pour votre adresse.</Notice>
          <L locale={locale} href="/devis?depuis=panier" className="btn btn-primary">Transformer mon panier en demande de devis</L>
        </div>
      </>
    );
  }

  const country = sp.pays && countries.some((c) => c.code === sp.pays) ? sp.pays : null;
  const city = sp.ville?.slice(0, 100) ?? "";
  const weight = await cartWeight(cart.lines.map((l) => ({ variantId: l.variantId, qty: l.qty })));
  const options = country ? await shippingOptions(country, city, weight, cart.subtotalMinor, cart.currency) : [];
  const countryRow = country ? await db.country.findUnique({ where: { code: country } }) : null;
  const addr = user ? await db.address.findFirst({ where: { userId: user.id, isDefault: true } }) : null;

  return (
    <>
      <PageHeader title="Commande" intro="Adresse de livraison, mode de livraison, puis paiement." />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <form className="card grid gap-4 p-6 sm:grid-cols-[1fr_1fr_auto]" action={`/${locale}/commande`}>
            <h2 className="text-xl sm:col-span-3">1. Destination</h2>
            <div>
              <label className="label" htmlFor="pays">Pays</label>
              <select id="pays" name="pays" className="select" defaultValue={country ?? addr?.country ?? ""} required>
                <option value="" disabled>Choisir…</option>
                {countries.map((c) => <option key={c.code} value={c.code}>{locale === "en" ? c.nameEn : c.nameFr}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ville">Ville</label>
              <input id="ville" name="ville" className="input" defaultValue={city || addr?.city || ""} required />
            </div>
            <button className="btn btn-ghost self-end">Voir les livraisons</button>
            <p className="text-xs text-noir/60 sm:col-span-3">Votre pays n'apparaît pas ? <L locale={locale} href="/devis?depuis=panier" className="underline">Demandez un devis</L> : nous étudierons une solution de transport.</p>
          </form>

          {country && options.length === 0 && <Notice kind="warning">Aucune livraison n'est configurée pour {city || "cette ville"}. <L locale={locale} href="/devis?depuis=panier" className="underline">Demandez un devis</L>.</Notice>}

          {country && options.length > 0 && (
            <ActionForm action={placeOrder} className="card space-y-5 p-6">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="country" value={country} />
              <input type="hidden" name="city" value={city} />
              <h2 className="text-xl">2. Livraison</h2>
              <fieldset className="space-y-2">
                <legend className="sr-only">Mode de livraison</legend>
                {options.map((o, i) => (
                  <label key={o.rateId} className="flex cursor-pointer items-center gap-3 rounded-lg border border-beige p-3 has-[:checked]:border-vert2">
                    <input type="radio" name="rateId" value={o.rateId} defaultChecked={i === 0} required />
                    <span className="flex-1"><strong>{o.carrierName}</strong> — {o.service} · {o.minDays} à {o.maxDays} jours (estimation)</span>
                    <strong>{o.priceMinor === 0 ? "Offerte" : formatMoney(o.priceMinor, o.currency, locale)}</strong>
                  </label>
                ))}
              </fieldset>
              <h2 className="text-xl">3. Coordonnées</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <F name="fullName" label="Nom complet" def={addr?.fullName ?? user?.name} />
                <F name="email" label="Email" type="email" def={user?.email} />
                <F name="phone" label="Téléphone" type="tel" def={addr?.phone} />
                <F name="line1" label="Adresse" def={addr?.line1} />
                <F name="line2" label="Complément" req={false} def={addr?.line2} />
                <F name="region" label="Région / quartier" req={false} def={addr?.region} />
                <F name="postalCode" label="Code postal" req={false} def={addr?.postalCode} />
                <F name="coupon" label="Code promo" req={false} />
                {user?.companyId && <F name="poReference" label="Référence bon de commande" req={false} />}
              </div>
              <div>
                <label className="label" htmlFor="notes">Instructions (facultatif)</label>
                <textarea id="notes" name="notes" className="textarea" rows={3} maxLength={2000} />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="urgent" /> Commande urgente (sous réserve de faisabilité, confirmée par notre équipe)</label>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="acceptTerms" required className="mt-1" /> <span>J'accepte les <L locale={locale} href="/cgv" className="underline" target="_blank">conditions générales de vente</L> et la <L locale={locale} href="/confidentialite" className="underline" target="_blank">politique de confidentialité</L>.</span></label>
              <SubmitButton>Valider la commande et passer au paiement</SubmitButton>
            </ActionForm>
          )}
        </div>

        <aside className="card h-fit p-6">
          <h2 className="text-xl">Récapitulatif</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {cart.lines.map((l) => <li key={l.itemId} className="flex justify-between gap-2"><span>{l.qty} × {l.name}</span><span>{formatMoney(l.lineTotalMinor ?? 0, l.currency, locale)}</span></li>)}
          </ul>
          <p className="mt-4 flex justify-between border-t border-beige pt-3 font-semibold"><span>Sous-total</span><span>{formatMoney(cart.subtotalMinor, cart.currency, locale)}</span></p>
          <p className="mt-2 text-xs text-noir/60">
            {countryRow?.taxRateBp != null ? `Taxes : ${countryRow.taxLabel ?? "TVA"} ${(countryRow.taxRateBp / 100).toFixed(2)} % appliquée à la validation.` : "Taxes : calculées selon la juridiction configurée."}
            {" "}Livraison ajoutée selon l'option choisie.
          </p>
        </aside>
      </div>
    </>
  );
}

function F({ name, label, type = "text", req = true, def }: { name: string; label: string; type?: string; req?: boolean; def?: string | null }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}{req && <span aria-hidden className="text-red-700"> *</span>}</label>
      <input id={name} name={name} type={type} className="input" required={req} defaultValue={def ?? ""} autoComplete={{ fullName: "name", email: "email", phone: "tel", line1: "address-line1", line2: "address-line2", postalCode: "postal-code" }[name]} />
    </div>
  );
}
