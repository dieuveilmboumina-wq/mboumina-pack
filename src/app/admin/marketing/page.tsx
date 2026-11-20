import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { AdminTitle, Panel } from "@/components/admin-ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { saveCoupon, savePost } from "@/modules/admin/config-actions";

export default async function AdminMarketing() {
  await requireStaff("marketing.edit");
  const [coupons, posts] = await Promise.all([db.coupon.findMany({ orderBy: { code: "asc" } }), db.blogPost.findMany({ orderBy: { createdAt: "desc" } })]);
  return (
    <>
      <AdminTitle title="Coupons et blog" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Codes de réduction">
          <ul className="mb-3 text-sm">{coupons.length === 0 ? <li className="text-noir/60">Aucun coupon.</li> : coupons.map((c) => <li key={c.id}><strong>{c.code}</strong> — {c.kind === "percent" ? `${c.value / 100} %` : formatMoney(c.value, c.currency ?? "XOF")} · utilisé {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""} fois{c.endsAt && ` · jusqu'au ${c.endsAt.toLocaleDateString("fr-FR")}`}</li>)}</ul>
          <ActionForm action={saveCoupon} className="grid gap-2 sm:grid-cols-2">
            <input name="code" className="input" placeholder="CODE" required aria-label="Code" />
            <select name="kind" className="select" aria-label="Type"><option value="percent">Pourcentage</option><option value="fixed">Montant fixe</option></select>
            <input name="value" className="input" placeholder="Valeur (% ou montant)" required aria-label="Valeur" />
            <select name="currency" className="select" aria-label="Devise"><option>XOF</option><option>XAF</option><option>EUR</option><option>USD</option></select>
            <input name="minSubtotal" className="input" placeholder="Achat minimum" aria-label="Minimum" />
            <input name="maxUses" type="number" className="input" placeholder="Utilisations max" aria-label="Utilisations max" />
            <input name="startsAt" type="date" className="input" aria-label="Début" />
            <input name="endsAt" type="date" className="input" aria-label="Fin" />
            <div className="sm:col-span-2"><SubmitButton>Créer le coupon</SubmitButton></div>
          </ActionForm>
        </Panel>
        <Panel title="Blog et actualités">
          <ul className="mb-3 text-sm">{posts.length === 0 ? <li className="text-noir/60">Aucun article.</li> : posts.map((p) => <li key={p.id}>{p.title} — {p.kind} · {p.publishedAt ? `publié le ${p.publishedAt.toLocaleDateString("fr-FR")}` : "brouillon"}</li>)}</ul>
          <ActionForm action={savePost} className="space-y-2">
            <input name="title" className="input" placeholder="Titre" required aria-label="Titre" />
            <select name="kind" className="select" aria-label="Rubrique"><option value="blog">Blog</option><option value="news">Actualités</option></select>
            <input name="excerpt" className="input" placeholder="Résumé (utilisé pour le SEO)" required aria-label="Résumé" />
            <textarea name="body" rows={8} className="textarea" placeholder={"Contenu. Séparez les paragraphes par une ligne vide. Une ligne commençant par « ## » devient un intertitre."} required aria-label="Contenu" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publish" /> Publier maintenant</label>
            <SubmitButton>Enregistrer</SubmitButton>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
